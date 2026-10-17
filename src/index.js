import { runScan, UserError, scoreChecks, grade, normalizeUrl } from "./scan.js";
import { fixFor } from "./fixes.js";
import { PAGE } from "./page.js";
import { legalPage, CONTACT } from "./legal.js";
import { GUIDES, findGuide } from "./guides.js";
import { guidesIndex, guidePage, sharePage, badgeSvg, sitemapXml } from "./site.js";
import OG_DEFAULT from "../assets/og.png";
import OG_A from "../assets/grade-A.png";
import OG_B from "../assets/grade-B.png";
import OG_C from "../assets/grade-C.png";
import OG_D from "../assets/grade-D.png";
import OG_F from "../assets/grade-F.png";

const IMAGES = { "/og.png": OG_DEFAULT, "/og/grade-A.png": OG_A, "/og/grade-B.png": OG_B, "/og/grade-C.png": OG_C, "/og/grade-D.png": OG_D, "/og/grade-F.png": OG_F };
const html = (body, status = 200) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", ...SECURITY_HEADERS } });

const TTL = 60 * 60 * 24 * 30; // keep reports 30 days
const SCANS_PER_HOUR = 10;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const SECURITY_HEADERS = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none'; form-action 'self' https://buy.stripe.com",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (url.hostname === "www.prelaunchcheck.dev") return Response.redirect("https://prelaunchcheck.dev" + p + url.search, 301);
    try {
      if (IMAGES[p]) return new Response(IMAGES[p], { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
      if (request.method === "GET" && p === "/guides") return html(guidesIndex());
      let g;
      if (request.method === "GET" && (g = p.match(/^\/guides\/([a-z0-9-]+)\/?$/))) {
        const guide = findGuide(g[1]);
        return guide ? html(guidePage(guide)) : html(guidesIndex(), 404);
      }
      if (request.method === "GET" && (g = p.match(/^\/s\/([a-f0-9]{16})$/))) {
        const pub = await env.SCANS.get("pub:" + g[1], "json");
        return pub ? html(sharePage(g[1], pub)) : new Response(null, { status: 302, headers: { location: "/" } });
      }
      if (request.method === "GET" && (g = p.match(/^\/badge\/([a-f0-9]{16})\.svg$/))) {
        const pub = await env.SCANS.get("pub:" + g[1], "json");
        if (!pub) return new Response("Not found", { status: 404 });
        return new Response(badgeSvg(pub), { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=3600" } });
      }
      if (request.method === "GET" && p === "/api/stats") return json(await readStats(env));
      if (request.method === "GET" && (p === "/" || p === "/index.html")) {
        return new Response(PAGE.replace("__PRICE__", env.PRICE_LABEL || "$7").replace("__CONTACT__", CONTACT), {
          headers: { "content-type": "text/html; charset=utf-8", ...SECURITY_HEADERS },
        });
      }
      if (request.method === "GET" && ["/terms", "/privacy", "/refunds"].includes(p)) {
        return html(legalPage(p.slice(1)));
      }
      if (p === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${url.origin}/sitemap.xml\n`, { headers: { "content-type": "text/plain" } });
      if (p === "/sitemap.xml") return new Response(sitemapXml(), { headers: { "content-type": "application/xml" } });

      if (request.method === "POST" && p === "/api/scan") return await handleScan(request, env);
      let m;
      if (request.method === "GET" && (m = p.match(/^\/api\/scan\/([a-f0-9-]{36})$/))) {
        const rec = await load(env, m[1]);
        return rec ? json(view(rec, m[1], env)) : json({ error: "This report has expired. Run a new scan." }, 404);
      }
      if (request.method === "POST" && (m = p.match(/^\/api\/verify\/([a-f0-9-]{36})$/))) return await handleVerify(env, m[1]);
      if (request.method === "GET" && (m = p.match(/^\/checkout\/([a-f0-9-]{36})$/))) {
        if (!env.STRIPE_PAYMENT_LINK) return new Response("Payments are not set up yet.", { status: 503 });
        if (!(await load(env, m[1]))) return new Response("Report not found.", { status: 404 });
        const link = new URL(env.STRIPE_PAYMENT_LINK);
        link.searchParams.set("client_reference_id", m[1]);
        return Response.redirect(link.href, 303);
      }
      if (request.method === "POST" && (m = p.match(/^\/api\/share\/([a-f0-9-]{36})$/))) return await handleShare(env, m[1], url);
      if (request.method === "GET" && p === "/paid") return await handlePaid(env, url);
      if (env.DEV_UNLOCK === "1" && request.method === "POST" && (m = p.match(/^\/api\/dev-unlock\/([a-f0-9-]{36})$/))) {
        const rec = await load(env, m[1]); if (!rec) return json({ error: "not found" }, 404);
        rec.paid = true; await save(env, m[1], rec); return json(view(rec, m[1], env));
      }
      return new Response("Not found", { status: 404 });
    } catch (e) {
      if (e instanceof UserError) return json({ error: e.message }, 400);
      console.error(e);
      return json({ error: "Something went wrong on our side. Try again in a minute." }, 500);
    }
  },
};

async function load(env, id) { return env.SCANS.get("scan:" + id, "json"); }
async function save(env, id, rec) { return env.SCANS.put("scan:" + id, JSON.stringify(rec), { expirationTtl: TTL }); }

async function handleScan(request, env) {
  let body; try { body = await request.json(); } catch { throw new UserError("Send a website address."); }
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const hour = Math.floor(Date.now() / 3_600_000);
  const rlKey = `rl:${ip}:${hour}`;
  const used = Number((await env.SCANS.get(rlKey)) || 0);
  if (used >= SCANS_PER_HOUR) return json({ error: "You've hit the limit of 10 scans an hour. Try again later." }, 429);
  await env.SCANS.put(rlKey, String(used + 1), { expirationTtl: 3700 });

  const result = await runScan(body.url, { allowLocal: env.ALLOW_LOCAL === "1" });
  const id = crypto.randomUUID();
  const token = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const rec = { result, verifyToken: "pf-" + token, paid: false, verified: false };
  await save(env, id, rec);
  await bump(env, "scans");
  return json(view(rec, id, env));
}

async function handleVerify(env, id) {
  const rec = await load(env, id);
  if (!rec) return json({ error: "This report has expired. Run a new scan." }, 404);
  const origin = new URL(rec.result.url).origin;
  normalizeUrl(origin, { allowLocal: env.ALLOW_LOCAL === "1" });
  const tok = rec.verifyToken;
  let ok = false;
  try {
    const r = await fetch(origin + "/.well-known/prelaunch-verify.txt", { redirect: "follow" });
    if (r.ok && (await r.text()).includes(tok)) ok = true;
  } catch {}
  if (!ok) {
    try {
      const r = await fetch(rec.result.url, { redirect: "follow" });
      const html = await r.text();
      const re = new RegExp(`<meta[^>]+name=["']prelaunch-verify["'][^>]+content=["']${tok}["']|<meta[^>]+content=["']${tok}["'][^>]+name=["']prelaunch-verify["']`, "i");
      if (re.test(html)) ok = true;
    } catch {}
  }
  if (!ok) return json({ error: "We couldn't find your verification code on the site yet. Deploy the change, wait a minute, and try again.", ...view(rec, id, env) }, 400);
  rec.verified = true;
  await save(env, id, rec);
  await bump(env, "verified");
  return json(view(rec, id, env));
}

async function handlePaid(env, url) {
  const sid = url.searchParams.get("session_id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid) || !env.STRIPE_SECRET_KEY) return new Response("Invalid payment link.", { status: 400 });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + sid, { headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY } });
  if (!r.ok) return new Response("We couldn't confirm that payment. Email " + CONTACT + " and we'll sort it out.", { status: 402 });
  const s = await r.json();
  const id = s.client_reference_id;
  if (s.payment_status !== "paid" || !/^[a-f0-9-]{36}$/.test(id || "")) return new Response("That payment isn't complete yet.", { status: 402 });
  const rec = await load(env, id);
  if (!rec) return new Response("Payment received, but the report expired. Email " + CONTACT + " with this code and we'll rescan for free: " + id, { status: 404 });
  const firstTime = !rec.paid;
  rec.paid = true; rec.sessionId = sid;
  await save(env, id, rec);
  if (firstTime) await bump(env, "paid");
  return Response.redirect(new URL("/?id=" + id + "#report", url).href, 303);
}

// What the browser is allowed to see.
export function view(rec, id, env = {}) {
  const { result, paid, verified } = rec;
  const visible = result.checks.filter((c) => verified || !c.sensitive);
  const score = scoreChecks(visible);
  const checks = visible.map((c) => {
    const out = { id: c.id, category: c.category, title: c.title, pass: c.pass, severity: c.severity, detail: c.detail };
    // Owners always see leaked secrets for free; the location of a leak is never shown to non-owners.
    if (c.sensitive && verified && c.findings) out.findings = c.findings;
    if (!c.sensitive && paid && c.findings) out.findings = c.findings;
    if (!c.pass && (paid || (c.sensitive && verified))) out.fix = fixFor(c.id, result.stack);
    return out;
  });
  return {
    id, url: result.url, scannedAt: result.scannedAt, stack: result.stack,
    score, grade: grade(score), paid, verified,
    hiddenSecurityChecks: verified ? 0 : result.checks.filter((c) => c.sensitive).length,
    verifyToken: rec.verifyToken,
    checkoutReady: !!env.STRIPE_PAYMENT_LINK || env.DEV_UNLOCK === "1",
    devUnlock: env.DEV_UNLOCK === "1",
    checks,
  };
}

// ---- sharing ----
async function handleShare(env, id, url) {
  const rec = await load(env, id);
  if (!rec) return json({ error: "This report has expired. Run a new scan." }, 404);
  if (!rec.pubId) {
    // A separate random ID: the share link must never open the private report.
    rec.pubId = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, "0")).join("");
    const pubChecks = rec.result.checks.filter((c) => !c.sensitive);
    const score = scoreChecks(pubChecks);
    const pub = { host: new URL(rec.result.url).host, grade: grade(score), score, total: pubChecks.length,
      passed: pubChecks.filter((c) => c.pass).length, date: rec.result.scannedAt.slice(0, 10) };
    await env.SCANS.put("pub:" + rec.pubId, JSON.stringify(pub), { expirationTtl: 60 * 60 * 24 * 365 });
    await save(env, id, rec);
    await bump(env, "shares");
  }
  const origin = url.hostname.endsWith("workers.dev") ? url.origin : "https://prelaunchcheck.dev";
  return json({ shareUrl: `${origin}/s/${rec.pubId}`, badgeUrl: `${origin}/badge/${rec.pubId}.svg` });
}

// ---- stats (aggregate counts only, no sites or people) ----
function today() { return new Date().toISOString().slice(0, 10); }
async function bump(env, field) {
  try {
    const key = "st:" + today();
    const cur = (await env.SCANS.get(key, "json")) || {};
    cur[field] = (cur[field] || 0) + 1;
    await env.SCANS.put(key, JSON.stringify(cur), { expirationTtl: 60 * 60 * 24 * 400 });
  } catch {}
}
async function readStats(env) {
  const days = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const v = (await env.SCANS.get("st:" + d, "json")) || {};
    days.push({ date: d, scans: v.scans || 0, verified: v.verified || 0, shares: v.shares || 0, paid: v.paid || 0 });
  }
  const sum = (k, n) => days.slice(0, n).reduce((a, d) => a + d[k], 0);
  return { last7: { scans: sum("scans", 7), verified: sum("verified", 7), shares: sum("shares", 7), paid: sum("paid", 7) },
    last30: { scans: sum("scans", 30), verified: sum("verified", 30), shares: sum("shares", 30), paid: sum("paid", 30) }, days };
}

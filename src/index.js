import { runScan, UserError, scoreChecks, grade, normalizeUrl } from "./scan.js";
import { fixFor } from "./fixes.js";
import { PAGE } from "./page.js";

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
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self' https://buy.stripe.com",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    try {
      if (request.method === "GET" && (p === "/" || p === "/index.html")) {
        return new Response(PAGE.replace("__PRICE__", env.PRICE_LABEL || "$7"), {
          headers: { "content-type": "text/html; charset=utf-8", ...SECURITY_HEADERS },
        });
      }
      if (p === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${url.origin}/sitemap.xml\n`, { headers: { "content-type": "text/plain" } });
      if (p === "/sitemap.xml") return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url.origin}/</loc></url></urlset>`, { headers: { "content-type": "application/xml" } });

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
    const r = await fetch(origin + "/.well-known/preflight-verify.txt", { redirect: "follow" });
    if (r.ok && (await r.text()).includes(tok)) ok = true;
  } catch {}
  if (!ok) {
    try {
      const r = await fetch(rec.result.url, { redirect: "follow" });
      const html = await r.text();
      const re = new RegExp(`<meta[^>]+name=["']preflight-verify["'][^>]+content=["']${tok}["']|<meta[^>]+content=["']${tok}["'][^>]+name=["']preflight-verify["']`, "i");
      if (re.test(html)) ok = true;
    } catch {}
  }
  if (!ok) return json({ error: "We couldn't find your verification code on the site yet. Deploy the change, wait a minute, and try again.", ...view(rec, id, env) }, 400);
  rec.verified = true;
  await save(env, id, rec);
  return json(view(rec, id, env));
}

async function handlePaid(env, url) {
  const sid = url.searchParams.get("session_id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid) || !env.STRIPE_SECRET_KEY) return new Response("Invalid payment link.", { status: 400 });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + sid, { headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY } });
  if (!r.ok) return new Response("We couldn't confirm that payment. Email us and we'll sort it out.", { status: 402 });
  const s = await r.json();
  const id = s.client_reference_id;
  if (s.payment_status !== "paid" || !/^[a-f0-9-]{36}$/.test(id || "")) return new Response("That payment isn't complete yet.", { status: 402 });
  const rec = await load(env, id);
  if (!rec) return new Response("Payment received, but the report expired. Email us with this code and we'll rescan for free: " + id, { status: 404 });
  rec.paid = true; rec.sessionId = sid;
  await save(env, id, rec);
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

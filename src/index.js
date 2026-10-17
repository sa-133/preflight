import { runScan, UserError, scoreChecks, grade, normalizeUrl } from "./scan.js";
import { fixFor } from "./fixes.js";
import { PAGE } from "./page.js";
import { legalPage, CONTACT } from "./legal.js";
import { GUIDES, findGuide } from "./guides.js";
import { guidesIndex, guidePage, sharePage, badgeSvg, sitemapXml } from "./site.js";
import { TOOLS, findTool, toolsIndex, toolPage } from "./tools.js";
import OG_DEFAULT from "../assets/og.png";
import OG_A from "../assets/grade-A.png";
import OG_B from "../assets/grade-B.png";
import OG_C from "../assets/grade-C.png";
import OG_D from "../assets/grade-D.png";
import OG_F from "../assets/grade-F.png";

const IMAGES = { "/og.png": OG_DEFAULT, "/og/grade-A.png": OG_A, "/og/grade-B.png": OG_B, "/og/grade-C.png": OG_C, "/og/grade-D.png": OG_D, "/og/grade-F.png": OG_F };
const html = (body, status = 200) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", ...SECURITY_HEADERS } });

const STATS_KEY_SHA256 = "a111a13155e39fdd7f10dbd2644cbf2f73318a6f77ac5b0f47dd824fbda3510f";
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
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none'; form-action 'self' https://buy.stripe.com",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (url.hostname === "www.prelaunchcheck.dev") return Response.redirect("https://prelaunchcheck.dev" + p + url.search, 301);
    try {
      if (IMAGES[p]) return new Response(IMAGES[p], { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
      if (request.method === "GET" && p === "/guides") return html(guidesIndex());
      if (request.method === "GET" && p === "/tools") return html(toolsIndex());
      let tm;
      if (request.method === "GET" && (tm = p.match(/^\/tools\/([a-z0-9-]+)\/?$/))) {
        const t = findTool(tm[1]);
        return t ? html(toolPage(t)) : html(toolsIndex(), 404);
      }
      if (request.method === "POST" && p === "/api/tool") return await handleTool(request, env);
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
      if (request.method === "GET" && p === "/api/stats") {
        // Private: only the weekly report knows the key. Only its SHA-256 lives in the code.
        const key = url.searchParams.get("key") || "";
        const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)))].map((b) => b.toString(16).padStart(2, "0")).join("");
        if (digest !== STATS_KEY_SHA256) return new Response("Not found", { status: 404 });
        return json(await readStats(env));
      }
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
      if (request.method === "GET" && (m = p.match(/^\/api\/subdomains\/([a-f0-9-]{36})$/))) return await handleSubList(env, m[1]);
      if (request.method === "POST" && (m = p.match(/^\/api\/subdomains\/([a-f0-9-]{36})\/scan$/))) return await handleSubScan(request, env, m[1]);
      if (request.method === "GET" && (m = p.match(/^\/checkout\/([a-f0-9-]{36})$/))) {
        if (!env.STRIPE_PAYMENT_LINK) return new Response("Payments are not set up yet.", { status: 503 });
        if (!(await load(env, m[1]))) return new Response("Report not found.", { status: 404 });
        await bump(env, "checkout");
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

async function createScan(request, env, rawUrl, statField) {
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const hour = Math.floor(Date.now() / 3_600_000);
  const rlKey = `rl:${ip}:${hour}`;
  const used = Number((await env.SCANS.get(rlKey)) || 0);
  if (used >= SCANS_PER_HOUR) return { limited: true };
  await env.SCANS.put(rlKey, String(used + 1), { expirationTtl: 3700 });
  const result = await runScan(rawUrl, { allowLocal: env.ALLOW_LOCAL === "1" });
  const id = crypto.randomUUID();
  const token = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const rec = { result, verifyToken: "pf-" + token, paid: false, verified: false };
  await save(env, id, rec);
  await bump(env, statField);
  return { id, rec };
}
const LIMITED = () => json({ error: "You've hit the limit of 10 checks an hour. Try again later." }, 429);

async function handleScan(request, env) {
  let body; try { body = await request.json(); } catch { throw new UserError("Send a website address."); }
  const r = await createScan(request, env, body.url, "scans");
  if (r.limited) return LIMITED();
  return json(view(r.rec, r.id, env));
}

async function handleTool(request, env) {
  let body; try { body = await request.json(); } catch { throw new UserError("Send a website address."); }
  const tool = findTool(String(body.tool || ""));
  if (!tool) return json({ error: "Unknown tool." }, 400);
  const r = await createScan(request, env, body.url, "toolScans");
  if (r.limited) return LIMITED();
  const byId = Object.fromEntries(r.rec.result.checks.map((c) => [c.id, c]));
  const checks = tool.checks.map((k) => byId[k]).filter(Boolean).map((c) => ({ id: c.id, title: c.title, pass: c.pass, severity: c.severity, detail: c.detail }));
  return json({ id: r.id, url: r.rec.result.url, checks, preview: tool.showCard ? (byId.og && byId.og.value) || null : null });
}

async function handleVerify(env, id) {
  const rec = await load(env, id);
  if (!rec) return json({ error: "This report has expired. Run a new scan." }, 404);
  const origin = new URL(rec.result.url).origin;
  normalizeUrl(origin, { allowLocal: env.ALLOW_LOCAL === "1" });
  const tok = rec.verifyToken;
  const re = new RegExp(`<meta[^>]+name=["']prelaunch-verify["'][^>]+content=["']${tok}["']|<meta[^>]+content=["']${tok}["'][^>]+name=["']prelaunch-verify["']`, "i");
  // "domain" = proof sits at the site root (the well-known file or the home page), which also
  // unlocks scanning its subdomains. "page" = a tag on some inner page: this report only.
  let via = null;
  try {
    const r = await fetch(origin + "/.well-known/prelaunch-verify.txt", { redirect: "follow" });
    if (r.ok && sameOrigin(r, origin) && (await r.text()).includes(tok)) via = "domain";
  } catch {}
  if (!via) {
    try {
      const r = await fetch(origin + "/", { redirect: "follow" });
      if (r.ok && sameOrigin(r, origin) && re.test(await r.text())) via = "domain";
    } catch {}
  }
  if (!via && new URL(rec.result.url).pathname !== "/") {
    try {
      const r = await fetch(rec.result.url, { redirect: "follow" });
      if (re.test(await r.text())) via = "page";
    } catch {}
  }
  if (!via) return json({ error: "We couldn't find your verification code on the site yet. Deploy the change, wait a minute, and try again.", ...view(rec, id, env) }, 400);
  rec.verified = true;
  rec.verifiedVia = via;
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
  // Before paying, show the most important non-sensitive fix in full so people can judge the quality.
  const W = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  const previewId = paid ? null : (visible.filter((c) => !c.pass && !c.sensitive).sort((a, b) => W[b.severity] - W[a.severity])[0] || {}).id;
  const checks = visible.map((c) => {
    const out = { id: c.id, category: c.category, title: c.title, pass: c.pass, severity: c.severity, detail: c.detail };
    if (c.id === previewId) { out.fix = fixFor(c.id, result.stack); out.preview = true; }
    // Owners always see leaked secrets for free; the location of a leak is never shown to non-owners.
    if (c.sensitive && verified && c.findings) out.findings = c.findings;
    if (!c.sensitive && paid && c.findings) out.findings = c.findings;
    if (!c.pass && (paid || (c.sensitive && verified))) out.fix = fixFor(c.id, result.stack);
    if (!c.pass && !out.fix) out.locked = true;
    return out;
  });
  return {
    id, url: result.url, scannedAt: result.scannedAt, stack: result.stack,
    score, grade: grade(score), paid, verified,
    hiddenSecurityChecks: verified ? 0 : result.checks.filter((c) => c.sensitive).length,
    verifyToken: rec.verifyToken,
    checkoutReady: !!env.STRIPE_PAYMENT_LINK || env.DEV_UNLOCK === "1",
    devUnlock: env.DEV_UNLOCK === "1",
    subdomainRoot: subRoot(rec),
    subScans: subRoot(rec) ? rec.subScans || {} : undefined,
    verifiedVia: rec.verifiedVia || null,
    parent: rec.parent ? { id: rec.parent.id, host: rec.parent.root } : null,
    checks,
  };
}

// ---- subdomains (owner-only) ----
// Proof at the root of a site covers the hosts below it: verifying example.com (or www.example.com)
// unlocks *.example.com; verifying app.example.com unlocks *.app.example.com only. Nothing above
// the verified host is ever reachable, so no public-suffix list is needed.
const SUB_SCANS_PER_DAY = 25;
const MAX_SUBS = 60;
function subRoot(rec) {
  if (!rec.verified || rec.verifiedVia !== "domain" || rec.parent) return null;
  return new URL(rec.result.url).hostname.toLowerCase().replace(/^www\./, "");
}
function sameOrigin(res, origin) { try { return !res.url || new URL(res.url).origin === origin; } catch { return false; } }
function inScope(host, root) { return host === root || host.endsWith("." + root); }
const HOST_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/;

async function fetchJson(url, ms = 15000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "PrelaunchCheckBot/1.0 (+site launch checker)", accept: "application/json" } });
    return r.ok ? await r.json() : null;
  } catch { return null; } finally { clearTimeout(t); }
}

// Certificate Transparency logs: every HTTPS certificate is public, so they list the hostnames
// a domain has issued certificates for. Two sources, because crt.sh is often slow.
async function discoverSubdomains(root) {
  const names = new Set();
  const addName = (n) => {
    n = String(n || "").trim().toLowerCase().replace(/^\*\./, "").replace(/\.$/, "");
    if (n && n !== root && n !== "www." + root && n.endsWith("." + root) && HOST_RE.test(n)) names.add(n);
  };
  const [crt, cs] = await Promise.all([
    fetchJson(`https://crt.sh/?q=${encodeURIComponent("%." + root)}&output=json&exclude=expired`),
    fetchJson(`https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(root)}&include_subdomains=true&expand=dns_names`),
  ]);
  for (const row of Array.isArray(crt) ? crt : []) String(row.name_value || "").split("\n").forEach(addName);
  for (const row of Array.isArray(cs) ? cs : []) (row.dns_names || []).forEach(addName);
  return { hosts: [...names].sort((a, b) => a.split(".").length - b.split(".").length || a.localeCompare(b)).slice(0, MAX_SUBS), sourcesOk: !!(crt || cs) };
}

async function handleSubList(env, id) {
  const rec = await load(env, id);
  if (!rec) return json({ error: "This report has expired. Run a new scan." }, 404);
  const root = subRoot(rec);
  if (!root) return json({ error: "Verify this site with the home page tag or the .well-known file first." }, 403);
  const cacheKey = "subs:" + root;
  let found = await env.SCANS.get(cacheKey, "json");
  if (!found) {
    found = await discoverSubdomains(root);
    if (found.sourcesOk) await env.SCANS.put(cacheKey, JSON.stringify(found), { expirationTtl: 60 * 60 * 6 });
  }
  const scanned = rec.subScans || {};
  return json({ root, hosts: found.hosts, sourcesOk: found.sourcesOk, scanned, remaining: SUB_SCANS_PER_DAY - await subUsed(env, id) });
}

async function subUsed(env, id) { return Number((await env.SCANS.get(`subq:${id}:${today()}`)) || 0); }

async function handleSubScan(request, env, id) {
  const rec = await load(env, id);
  if (!rec) return json({ error: "This report has expired. Run a new scan." }, 404);
  const root = subRoot(rec);
  if (!root) return json({ error: "Verify this site with the home page tag or the .well-known file first." }, 403);
  let body; try { body = await request.json(); } catch { throw new UserError("Send a subdomain."); }
  let host = String(body.host || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").replace(/\.$/, "");
  // Local testing only: fixtures run on ports, e.g. app.localhost:8791.
  const devPort = env.ALLOW_LOCAL === "1" && host.match(/:(\d{2,5})$/);
  if (devPort) host = host.slice(0, -devPort[0].length);
  if (!HOST_RE.test(host) || !inScope(host, root)) return json({ error: `Only hosts under ${root} can be scanned from this report.` }, 400);
  const used = await subUsed(env, id);
  if (used >= SUB_SCANS_PER_DAY) return json({ error: `You've used today's ${SUB_SCANS_PER_DAY} subdomain checks for this site. Try again tomorrow.` }, 429);
  await env.SCANS.put(`subq:${id}:${today()}`, String(used + 1), { expirationTtl: 60 * 60 * 26 });

  let result;
  try { result = await runScan(devPort ? `http://${host}${devPort[0]}` : "https://" + host, { allowLocal: env.ALLOW_LOCAL === "1" }); }
  catch (e) {
    if (!(e instanceof UserError)) throw e;
    // Certificate logs list plenty of hosts that no longer answer; remember that instead of failing.
    const miss = { host, error: e.message, at: new Date().toISOString() };
    rec.subScans = { ...(rec.subScans || {}), [host]: miss };
    await save(env, id, rec);
    return json({ ...miss, remaining: SUB_SCANS_PER_DAY - used - 1 });
  }
  const finalHost = new URL(result.url).hostname.toLowerCase();
  // A redirect off your domain lands on someone else's site, so the owner unlock can't come along.
  const verified = inScope(finalHost, root);
  const childId = crypto.randomUUID();
  const token = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const child = { result, verifyToken: "pf-" + token, paid: false, verified, verifiedVia: verified ? "parent" : undefined, parent: { id, root } };
  await save(env, childId, child);
  await bump(env, "subScans");
  const v = view(child, childId, env);
  const summary = { id: childId, host, finalHost, grade: v.grade, score: v.score, issues: v.checks.filter((c) => !c.pass).length,
    critical: v.checks.filter((c) => !c.pass && c.severity === "critical").length, verified, at: result.scannedAt };
  rec.subScans = { ...(rec.subScans || {}), [host]: summary };
  await save(env, id, rec);
  return json({ ...summary, remaining: SUB_SCANS_PER_DAY - used - 1 });
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
    days.push({ date: d, scans: v.scans || 0, toolScans: v.toolScans || 0, subScans: v.subScans || 0, verified: v.verified || 0, shares: v.shares || 0, checkout: v.checkout || 0, paid: v.paid || 0 });
  }
  const sum = (k, n) => days.slice(0, n).reduce((a, d) => a + d[k], 0);
  const keys = ["scans", "toolScans", "subScans", "verified", "shares", "checkout", "paid"];
  const tot = (n) => Object.fromEntries(keys.map((k) => [k, sum(k, n)]));
  return { last7: tot(7), last30: tot(30), days };
}

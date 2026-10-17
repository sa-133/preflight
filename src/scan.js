// Prelaunch Check scan engine. Passive checks only: it requests the page, its own
// same-origin scripts, a few well-known paths and a sample of internal links.

const UA = "PrelaunchCheckBot/1.0 (+site launch checker)";
const MAX_SCRIPTS = 8;
const MAX_SCRIPT_BYTES = 2_500_000;
const MAX_LINKS = 15;
const TIMEOUT_MS = 8000;

export const SEVERITY_WEIGHT = { critical: 30, high: 12, medium: 5, low: 2, info: 0 };

// ---------- URL safety ----------
export function normalizeUrl(input, { allowLocal = false } = {}) {
  let raw = String(input || "").trim();
  if (!raw) throw new UserError("Enter a website address.");
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  let u;
  try { u = new URL(raw); } catch { throw new UserError("That doesn't look like a website address."); }
  if (!["http:", "https:"].includes(u.protocol)) throw new UserError("Only http and https sites can be scanned.");
  if (u.username || u.password) throw new UserError("Remove the username and password from the address.");
  const host = u.hostname.toLowerCase();
  if (!allowLocal && isPrivateHost(host)) throw new UserError("Only public websites can be scanned.");
  u.hash = "";
  return u;
}

export function isPrivateHost(host) {
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (!host.includes(".") && !host.includes(":")) return true;
  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0 || a >= 224) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  if (host.startsWith("[") || host.includes(":")) {
    const h = host.replace(/^\[|\]$/g, "");
    if (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80") || h === "::") return true;
  }
  return false;
}

export class UserError extends Error {}

// ---------- fetching ----------
async function timedFetch(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout || TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: "follow", ...opts, signal: ctrl.signal, headers: { "user-agent": UA, "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "accept-language": "en-US,en;q=0.9", ...(opts.headers || {}) } });
    return { res, ms: Date.now() - started };
  } finally { clearTimeout(t); }
}

async function readText(res, limit) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { chunks.push(value.slice(0, value.byteLength - (size - limit))); try { await reader.cancel(); } catch {} break; }
    chunks.push(value);
  }
  const all = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let o = 0; for (const c of chunks) { all.set(c, o); o += c.byteLength; }
  return { text: new TextDecoder().decode(all), bytes: size };
}

async function probe(url, opts) {
  try {
    const { res, ms } = await timedFetch(url, opts);
    const { text, bytes } = await readText(res, opts?.limit || 200_000);
    return { ok: true, status: res.status, headers: res.headers, text, bytes, ms, finalUrl: res.url || url };
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "timeout" : "unreachable" };
  }
}

// ---------- HTML helpers (regex based; good enough for head tags) ----------
function attrs(tag) {
  const out = {};
  const re = /([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m; while ((m = re.exec(tag))) out[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  return out;
}
function tags(html, name) {
  const re = new RegExp(`<${name}\\b[^>]*>`, "gi");
  return (html.match(re) || []).map(attrs);
}
function metaContent(html, key) {
  for (const a of tags(html, "meta")) {
    if ((a.name || a.property || "").toLowerCase() === key) return decodeEntities((a.content || "").trim());
  }
  return null;
}
function decodeEntities(s) {
  return s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

// ---------- secret detection ----------
const SECRET_PATTERNS = [
  { id: "anthropic", name: "Anthropic API key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g, severity: "critical" },
  { id: "openai", name: "OpenAI API key", re: /\bsk-(?:proj-|svcacct-|admin-)?(?!ant-)[A-Za-z0-9_-]{32,}/g, severity: "critical" },
  { id: "stripe_live", name: "Stripe live secret key", re: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}/g, severity: "critical" },
  { id: "stripe_test", name: "Stripe test secret key", re: /\bsk_test_[A-Za-z0-9]{20,}/g, severity: "high" },
  { id: "aws", name: "AWS access key ID", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, severity: "critical" },
  { id: "github", name: "GitHub token", re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})/g, severity: "critical" },
  { id: "slack", name: "Slack token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g, severity: "critical" },
  { id: "sendgrid", name: "SendGrid API key", re: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/g, severity: "critical" },
  { id: "groq", name: "Groq API key", re: /\bgsk_[A-Za-z0-9]{40,}/g, severity: "critical" },
  { id: "xai", name: "xAI API key", re: /\bxai-[A-Za-z0-9]{40,}/g, severity: "critical" },
  { id: "replicate", name: "Replicate API token", re: /\br8_[A-Za-z0-9]{30,}/g, severity: "critical" },
  { id: "supabase_secret", name: "Supabase secret key", re: /\bsb_secret_[A-Za-z0-9_-]{20,}/g, severity: "critical" },
  { id: "private_key", name: "Private key", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, severity: "critical" },
  { id: "google", name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g, severity: "info" },
];

export function mask(s) {
  if (s.length <= 12) return s.slice(0, 3) + "…";
  return s.slice(0, 7) + "…" + s.slice(-4);
}

function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  try { return atob(s); } catch { return ""; }
}

export function findSecrets(text, where) {
  const found = [];
  for (const p of SECRET_PATTERNS) {
    p.re.lastIndex = 0;
    let m; const seen = new Set();
    while ((m = p.re.exec(text))) {
      const v = m[0];
      if (seen.has(v)) continue; seen.add(v);
      found.push({ type: p.id, name: p.name, severity: p.severity, masked: mask(v), where });
    }
  }
  // Supabase / generic JWTs: only the service_role key is dangerous in the browser.
  const jwtRe = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
  let j; const seenJ = new Set();
  while ((j = jwtRe.exec(text))) {
    if (seenJ.has(j[0])) continue; seenJ.add(j[0]);
    const payload = b64urlDecode(j[0].split(".")[1]);
    if (/"role"\s*:\s*"service_role"/.test(payload)) {
      found.push({ type: "supabase_service", name: "Supabase service_role key", severity: "critical", masked: mask(j[0]), where });
    }
  }
  return found;
}

// ---------- the scan ----------
export async function runScan(target, { allowLocal = false } = {}) {
  let url = normalizeUrl(target, { allowLocal });
  let main = await probe(url.href, { limit: 3_000_000 });
  if (!main.ok && !/^https?:\/\//i.test(String(target).trim())) {
    // No scheme given and HTTPS failed: try plain HTTP before giving up.
    const alt = new URL(url.href); alt.protocol = "http:";
    const second = await probe(alt.href, { limit: 3_000_000 });
    if (second.ok) { url = alt; main = second; }
  }
  if (!main.ok) throw new UserError(main.error === "timeout" ? "The site took too long to respond." : "Couldn't reach that site. Check the address and try again.");
  if ([401, 403, 429, 503].includes(main.status)) throw new UserError(`${url.host} blocked our check (HTTP ${main.status}). Large sites like Google often block automated tools. Your own site will almost always work, so try that.`);
  if (main.status === 404) throw new UserError(`That page wasn't found (HTTP 404). Check the address and try again.`);
  if (main.status >= 400) throw new UserError(`The site answered with an error (HTTP ${main.status}). If it's your site, check it loads in a browser, then try again.`);

  const final = new URL(main.finalUrl || url.href);
  const origin = final.origin;
  const html = main.text;
  const ctype = main.headers.get("content-type") || "";
  const checks = [];
  const add = (c) => checks.push(c);

  // --- scripts (same-origin only) ---
  const scriptSrcs = tags(html, "script").map((a) => a.src).filter(Boolean)
    .map((s) => { try { return new URL(decodeEntities(s), final); } catch { return null; } })
    .filter((u) => u && u.origin === origin).slice(0, MAX_SCRIPTS);
  const scripts = await Promise.all(scriptSrcs.map(async (u) => {
    const r = await probe(u.href, { limit: MAX_SCRIPT_BYTES });
    return { url: u.href, path: u.pathname, ...r };
  }));
  const okScripts = scripts.filter((s) => s.ok && s.status < 400);
  const jsBytes = okScripts.reduce((n, s) => n + (s.bytes || 0), 0);

  // --- secrets ---
  let secrets = findSecrets(html, "page HTML");
  for (const s of okScripts) secrets = secrets.concat(findSecrets(s.text, s.path));
  const realSecrets = secrets.filter((s) => s.severity !== "info");
  const googleKeys = secrets.filter((s) => s.severity === "info");
  add({ id: "secrets", category: "security", sensitive: true, title: "No secret keys in public code",
    pass: realSecrets.length === 0,
    severity: realSecrets.some((s) => s.severity === "critical") ? "critical" : "high",
    detail: realSecrets.length ? `${realSecrets.length} secret key${realSecrets.length > 1 ? "s" : ""} visible to anyone who opens your site.` : `Checked the page and ${okScripts.length} script file${okScripts.length === 1 ? "" : "s"}.`,
    findings: realSecrets });
  if (googleKeys.length) add({ id: "google_key", category: "security", sensitive: true, title: "Google API keys are restricted", pass: false, severity: "low",
    detail: `${googleKeys.length} Google API key${googleKeys.length > 1 ? "s" : ""} found. These are meant to be public, but only if restricted to your domain.`, findings: googleKeys });

  // --- exposed files ---
  const [env, git, robots, sitemap, favicon] = await Promise.all([
    probe(origin + "/.env", { limit: 20_000 }),
    probe(origin + "/.git/config", { limit: 20_000 }),
    probe(origin + "/robots.txt", { limit: 50_000 }),
    probe(origin + "/sitemap.xml", { limit: 50_000 }),
    probe(origin + "/favicon.ico", { limit: 50_000 }),
  ]);
  const looksLikeEnv = (r) => r.ok && r.status === 200 && !/<html|<!doctype/i.test(r.text) && /^\s*[A-Z][A-Z0-9_]{2,}\s*=/m.test(r.text);
  add({ id: "env_file", category: "security", sensitive: true, title: "Your .env file is not public", pass: !looksLikeEnv(env), severity: "critical",
    detail: looksLikeEnv(env) ? "/.env is downloadable by anyone and contains environment variables." : "/.env is not reachable." });
  const gitExposed = git.ok && git.status === 200 && /\[core\]/.test(git.text);
  add({ id: "git_exposed", category: "security", sensitive: true, title: "Your .git folder is not public", pass: !gitExposed, severity: "critical",
    detail: gitExposed ? "/.git/config is downloadable, so your source code and history can be rebuilt." : "/.git is not reachable." });

  // --- transport & headers ---
  const h = (n) => main.headers.get(n);
  add({ id: "https", category: "security", title: "Site loads over HTTPS", pass: final.protocol === "https:", severity: "high",
    detail: final.protocol === "https:" ? "Final address uses HTTPS." : "The site ended up on plain HTTP." });
  add({ id: "hsts", category: "security", title: "HTTPS is enforced (HSTS)", pass: !!h("strict-transport-security"), severity: "low",
    detail: h("strict-transport-security") ? "Strict-Transport-Security header present." : "No Strict-Transport-Security header." });
  add({ id: "csp", category: "security", title: "Content Security Policy set", pass: !!h("content-security-policy"), severity: "low",
    detail: h("content-security-policy") ? "Content-Security-Policy header present." : "No Content-Security-Policy header." });
  add({ id: "nosniff", category: "security", title: "MIME sniffing blocked", pass: (h("x-content-type-options") || "").toLowerCase().includes("nosniff"), severity: "low",
    detail: h("x-content-type-options") ? "X-Content-Type-Options: nosniff present." : "No X-Content-Type-Options header." });
  const framed = !!h("x-frame-options") || /frame-ancestors/i.test(h("content-security-policy") || "");
  add({ id: "framing", category: "security", title: "Protected from clickjacking", pass: framed, severity: "low",
    detail: framed ? "Framing is restricted." : "Other sites can embed your pages in a frame." });
  const maps = okScripts.filter((s) => /\/\/[#@]\s*sourceMappingURL=(?!data:)/.test(s.text));
  let publicMaps = 0;
  if (maps.length) {
    const r = await probe(maps[0].url + ".map", { limit: 5000 });
    if (r.ok && r.status === 200 && /"mappings"/.test(r.text)) publicMaps = maps.length;
  }
  add({ id: "sourcemaps", category: "security", title: "Source maps not public", pass: publicMaps === 0, severity: "medium",
    detail: publicMaps ? "Your original source code can be downloaded through .map files." : "No public source maps found." });

  // --- SEO & sharing ---
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleM ? decodeEntities(titleM[1].trim()) : "";
  add({ id: "title", category: "seo", title: "Page has a title", pass: title.length >= 5 && !/^(vite \+ |react app|create next app|my app|untitled)/i.test(title), severity: "medium",
    detail: title ? `Title: "${title.slice(0, 80)}"` : "No <title> tag.", value: title });
  const desc = metaContent(html, "description");
  add({ id: "description", category: "seo", title: "Meta description set", pass: !!desc && desc.length >= 50, severity: "medium",
    detail: desc ? `${desc.length} characters.` : "No meta description." });
  add({ id: "viewport", category: "seo", title: "Mobile viewport set", pass: !!metaContent(html, "viewport"), severity: "medium",
    detail: metaContent(html, "viewport") ? "Viewport meta tag present." : "No viewport tag, so phones show a zoomed-out desktop page." });
  const lang = (html.match(/<html\b[^>]*>/i) || [""])[0].match(/\blang\s*=\s*["']?([a-zA-Z-]+)/);
  add({ id: "lang", category: "seo", title: "Page language declared", pass: !!lang, severity: "low", detail: lang ? `lang="${lang[1]}"` : "No lang attribute on <html>." });
  const canonical = tags(html, "link").find((a) => (a.rel || "").toLowerCase() === "canonical");
  add({ id: "canonical", category: "seo", title: "Canonical URL set", pass: !!canonical, severity: "low", detail: canonical ? "Canonical link present." : "No canonical link." });
  const ogImage = metaContent(html, "og:image");
  const ogOk = !!metaContent(html, "og:title") && !!metaContent(html, "og:description") && !!ogImage;
  add({ id: "og", category: "seo", title: "Link previews look good", pass: ogOk, severity: "medium",
    detail: ogOk ? "og:title, og:description and og:image set." : "Missing " + ["og:title", "og:description", "og:image"].filter((k) => !metaContent(html, k)).join(", ") + ". Shared links will look bare.",
    value: { title: (metaContent(html, "og:title") || title || "").slice(0, 200), description: (metaContent(html, "og:description") || desc || "").slice(0, 300),
      image: ogImage ? (() => { try { return new URL(decodeEntities(ogImage), final).href; } catch { return ""; } })() : "", host: final.host } });
  add({ id: "twitter", category: "seo", title: "X/Twitter card set", pass: !!metaContent(html, "twitter:card"), severity: "low", detail: metaContent(html, "twitter:card") ? "twitter:card present." : "No twitter:card tag." });
  const iconTag = tags(html, "link").some((a) => /(^|\s)(icon|shortcut icon|apple-touch-icon)(\s|$)/i.test(a.rel || ""));
  const hasFavicon = iconTag || (favicon.ok && favicon.status === 200 && favicon.bytes > 0);
  add({ id: "favicon", category: "seo", title: "Favicon set", pass: hasFavicon, severity: "low", detail: hasFavicon ? "Favicon found." : "No favicon, so browser tabs show a blank icon." });
  add({ id: "h1", category: "seo", title: "Page has a main heading", pass: /<h1\b/i.test(html), severity: "low", detail: /<h1\b/i.test(html) ? "<h1> present." : "No <h1> in the initial HTML (common when content renders only in JavaScript)." });
  const robotsMeta = (metaContent(html, "robots") || "") + " " + (h("x-robots-tag") || "");
  add({ id: "noindex", category: "seo", title: "Search engines allowed", pass: !/noindex/i.test(robotsMeta), severity: "high", detail: /noindex/i.test(robotsMeta) ? "The page tells search engines not to index it." : "Indexing allowed." });
  const robotsOk = robots.ok && robots.status === 200 && !/<html/i.test(robots.text);
  const blocksAll = robotsOk && /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/im.test(robots.text);
  add({ id: "robots", category: "seo", title: "robots.txt present", pass: robotsOk && !blocksAll, severity: blocksAll ? "high" : "low",
    detail: !robotsOk ? "No robots.txt." : blocksAll ? "robots.txt blocks all crawlers." : "robots.txt found." });
  const sitemapOk = sitemap.ok && sitemap.status === 200 && /<(urlset|sitemapindex)/i.test(sitemap.text);
  add({ id: "sitemap", category: "seo", title: "Sitemap present", pass: sitemapOk, severity: "low", detail: sitemapOk ? "sitemap.xml found." : "No sitemap.xml." });
  const imgs = tags(html, "img");
  const noAlt = imgs.filter((a) => a.alt === undefined).length;
  add({ id: "alt", category: "seo", title: "Images have alt text", pass: noAlt === 0, severity: "low", detail: imgs.length ? `${imgs.length - noAlt} of ${imgs.length} images have alt text.` : "No images in the initial HTML." });

  // --- performance ---
  add({ id: "ttfb", category: "performance", title: "Server responds quickly", pass: main.ms < 1500, severity: main.ms > 3000 ? "medium" : "low", detail: `Page responded in ${main.ms} ms.`, value: main.ms });
  add({ id: "html_size", category: "performance", title: "HTML is a reasonable size", pass: main.bytes < 500_000, severity: "low", detail: `${(main.bytes / 1024).toFixed(0)} KB of HTML.`, value: main.bytes });
  add({ id: "js_size", category: "performance", title: "JavaScript bundle is lean", pass: jsBytes < 1_000_000, severity: jsBytes > 2_000_000 ? "medium" : "low",
    detail: `${(jsBytes / 1024).toFixed(0)} KB across ${okScripts.length} script${okScripts.length === 1 ? "" : "s"} (uncompressed).`, value: jsBytes });
  const compressed = /gzip|br|zstd/i.test(h("content-encoding") || "");
  add({ id: "compression", category: "performance", title: "Text is compressed", pass: compressed || main.bytes < 20_000, severity: "low", detail: compressed ? `Served with ${h("content-encoding")}.` : main.bytes < 20_000 ? "Page is small, so compression barely matters." : "No gzip or brotli compression detected." });

  // --- links ---
  const hrefs = [...new Set(tags(html, "a").map((a) => a.href).filter(Boolean)
    .map((s) => { try { return new URL(decodeEntities(s), final); } catch { return null; } })
    .filter((u) => u && u.origin === origin && /^https?:$/.test(u.protocol))
    .map((u) => (u.hash = "", u.href)))].filter((x) => x !== final.href).slice(0, MAX_LINKS);
  const linkResults = await Promise.all(hrefs.map(async (l) => {
    const r = await probe(l, { limit: 2000 });
    return { url: l, status: r.ok ? r.status : r.error };
  }));
  const broken = linkResults.filter((r) => typeof r.status !== "number" || r.status >= 400);
  add({ id: "links", category: "links", title: "Internal links work", pass: broken.length === 0, severity: broken.length > 2 ? "medium" : "low",
    detail: hrefs.length ? `${hrefs.length - broken.length} of ${hrefs.length} internal links work.` : "No internal links found in the initial HTML.",
    findings: broken.map((b) => ({ url: b.url, status: b.status })) });
  add({ id: "is_html", category: "links", title: "Page serves HTML", pass: /text\/html/i.test(ctype), severity: "low", detail: ctype || "No content type." });

  const stack = detectStack(html, main.headers, okScripts);
  const score = scoreChecks(checks);
  return { url: final.href, scannedAt: new Date().toISOString(), stack, score, grade: grade(score), checks };
}

export function detectStack(html, headers, scripts) {
  const s = [];
  const paths = scripts.map((x) => x.path).join(" ");
  if (/__NEXT_DATA__|\/_next\//.test(html + paths)) s.push("Next.js");
  if (/\/assets\/index-[A-Za-z0-9_-]+\.js/.test(paths) || /type="module" crossorigin/.test(html)) s.push("Vite");
  if (/supabase/i.test(html + scripts.map((x) => x.text.slice(0, 200000)).join(""))) s.push("Supabase");
  if (/vercel/i.test(headers.get("server") || "") || headers.get("x-vercel-id")) s.push("Vercel");
  if (/netlify/i.test(headers.get("server") || "")) s.push("Netlify");
  if (headers.get("cf-ray")) s.push("Cloudflare");
  return s;
}

export function scoreChecks(checks) {
  let score = 100;
  for (const c of checks) if (!c.pass) score -= SEVERITY_WEIGHT[c.severity] || 0;
  return Math.max(0, score);
}
export function grade(score) {
  return score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
}

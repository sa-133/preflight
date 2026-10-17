// Server-rendered secondary pages: guides, share cards, badge.
import { GUIDES } from "./guides.js";

export const SITE = "https://prelaunchcheck.dev";
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23E8590C'/%3E%3Cpath d='M9 16.5l4.5 4.5L23 11' stroke='white' stroke-width='4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

const CSS = `
:root{--bg:#EEF1F4;--panel:#fff;--ink:#0F1B2D;--muted:#566273;--line:#D3D9E1;--signal:#E8590C;--signal-ink:#fff;--code:#E3E8EE;color-scheme:light;
--display:"Archivo","Arial Black",system-ui,sans-serif;--body:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root{--bg:#0B1320;--panel:#121C2B;--ink:#E6EBF2;--muted:#93A0B3;--line:#223047;--signal:#FF7A33;--signal-ink:#0B1320;--code:#1A2638;color-scheme:dark}}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--ink);font:17px/1.65 var(--body)}
.wrap{max-width:740px;margin:0 auto;padding:32px max(16px,env(safe-area-inset-right)) 72px max(16px,env(safe-area-inset-left))}
a{color:var(--signal)}:focus-visible{outline:3px solid var(--signal);outline-offset:2px}
nav{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:28px}
.brand{font:500 13px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink);text-decoration:none;display:flex;align-items:center;gap:10px}
.brand i{width:14px;height:14px;background:var(--signal);border-radius:3px;display:inline-block}
nav .links{display:flex;gap:16px;font-size:15px}
h1{font:800 clamp(30px,6vw,46px)/1.08 var(--display);font-stretch:112%;margin:0 0 12px;text-wrap:balance}
h2{font:800 24px/1.2 var(--display);font-stretch:112%;margin:34px 0 8px}
.meta{font:500 13px var(--mono);color:var(--muted)}
.lede{font-size:19px;color:var(--muted);margin:0 0 8px}
code{font:500 .88em var(--mono);background:var(--code);padding:1px 5px;border-radius:4px}
pre{background:var(--code);padding:14px 16px;border-radius:8px;overflow-x:auto;font-size:14px;line-height:1.5}
pre code{background:none;padding:0}
li{margin:5px 0}
.cta{margin-top:40px;background:var(--panel);border:2px solid var(--signal);border-radius:12px;padding:22px;display:flex;flex-direction:column;gap:12px}
.cta h2{margin:0}.cta p{margin:0;color:var(--muted)}
.cta form{display:flex;gap:10px;flex-wrap:wrap}
.cta input{flex:1 1 240px;min-width:0;font:500 16px var(--mono);padding:13px 14px;border:2px solid var(--ink);border-radius:8px;background:var(--bg);color:var(--ink)}
.btn{font:600 16px var(--body);border:0;border-radius:8px;padding:13px 20px;cursor:pointer;background:var(--signal);color:var(--signal-ink);text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
.list{list-style:none;padding:0;margin:20px 0 0;display:flex;flex-direction:column}
.list li{border-top:1px solid var(--line);padding:16px 0;margin:0}
.list a{font-weight:600;font-size:19px;text-decoration:none;color:var(--ink)}
.list a:hover{color:var(--signal)}
.list p{margin:4px 0 0;color:var(--muted);font-size:15px}
.related{margin-top:36px}
footer{margin-top:56px;padding-top:16px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
.grade{width:140px;height:140px;border-radius:50%;border:10px solid var(--line);display:grid;place-items:center;font:800 70px var(--display);background:var(--panel)}
.g-A,.g-B{border-color:#16794A;color:#16794A}.g-C{border-color:#9A5B00;color:#9A5B00}.g-D,.g-F{border-color:#B42318;color:#B42318}
`;

export function shell({ title, description, path, body, image = "/og.png", type = "website", jsonld }) {
  const url = SITE + path;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${type}"><meta property="og:site_name" content="Prelaunch Check">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}${image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@112,800&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap">
<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : ""}
</head><body><div class="wrap">
<nav><a class="brand" href="/"><i></i>Prelaunch Check</a><div class="links"><a href="/guides">Guides</a><a href="/">Free scan</a></div></nav>
${body}
<footer>Prelaunch Check tests your live site for leaked keys, link previews, SEO and security headers. · <a href="/guides">Guides</a> · <a href="/refunds">Refunds</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></footer>
</div></body></html>`;
}

const ctaBlock = (heading = "Check your site in 10 seconds") => `
<section class="cta"><h2>${heading}</h2>
<p>Free scan for leaked API keys, exposed .env files, link previews, SEO basics and security headers.</p>
<form action="/" method="get"><label for="u" class="meta" style="flex-basis:100%">Your site's address</label><input id="u" name="url" type="text" inputmode="url" placeholder="myapp.vercel.app" required><button class="btn" type="submit">Run the check</button></form>
</section>`;

export function guidesIndex() {
  const items = GUIDES.map((g) => `<li><a href="/guides/${g.slug}">${esc(g.title)}</a><p>${esc(g.description)}</p></li>`).join("");
  return shell({
    title: "Launch guides for AI-built apps · Prelaunch Check",
    description: "Plain-English guides to shipping safely: leaked API keys, env variables, Supabase and Firebase keys, link previews, SEO and security headers.",
    path: "/guides",
    body: `<h1>Launch guides</h1><p class="lede">Short, practical answers for people shipping apps built with AI tools.</p><ul class="list">${items}</ul>${ctaBlock()}`,
  });
}

export function guidePage(g) {
  const related = GUIDES.filter((x) => x.slug !== g.slug && x.tags.some((t) => g.tags.includes(t))).slice(0, 4);
  const rel = related.length ? `<section class="related"><h2>Related guides</h2><ul class="list">${related.map((r) => `<li><a href="/guides/${r.slug}">${esc(r.title)}</a></li>`).join("")}</ul></section>` : "";
  return shell({
    title: `${g.title} · Prelaunch Check`,
    description: g.description,
    path: `/guides/${g.slug}`,
    type: "article",
    jsonld: { "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.description, datePublished: g.date, dateModified: g.date, author: { "@type": "Organization", name: "Prelaunch Check" }, mainEntityOfPage: `${SITE}/guides/${g.slug}` },
    body: `<article><p class="meta">Guide · ${esc(g.date)}</p><h1>${esc(g.title)}</h1>${g.html}</article>${ctaBlock()}${rel}`,
  });
}

export function sharePage(id, pub) {
  const host = esc(pub.host);
  const article = /^[AF]$/.test(pub.grade) ? "an" : "a";
  return shell({
    title: `${pub.host} got ${article} ${pub.grade} on launch readiness · Prelaunch Check`,
    description: `${pub.host} scored ${pub.score}/100 on Prelaunch Check's launch test for keys, link previews, SEO and security headers. Check your own site free.`,
    path: `/s/${id}`,
    image: `/og/grade-${pub.grade}.png`,
    body: `<div style="display:flex;gap:28px;align-items:center;flex-wrap:wrap">
<div class="grade g-${pub.grade}" aria-label="Grade ${pub.grade}">${pub.grade}</div>
<div style="min-width:0"><p class="meta">Launch readiness · checked ${esc(pub.date)}</p><h1 style="overflow-wrap:anywhere">${host}</h1><p class="lede">Scored ${pub.score}/100 across ${pub.total} public checks: ${pub.passed} passed.</p></div></div>
${ctaBlock("How does your site score?")}`,
  });
}

export function badgeSvg(pub) {
  const color = { A: "#16794A", B: "#16794A", C: "#9A5B00", D: "#B42318", F: "#B42318" }[pub.grade] || "#566273";
  const left = "Prelaunch Check", right = `Grade ${pub.grade}`;
  const lw = 112, rw = 70, w = lw + rw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="22" role="img" aria-label="${left}: ${right}"><title>${left}: ${right}</title>
<rect width="${w}" height="22" rx="4" fill="#0F1B2D"/><rect x="${lw}" width="${rw}" height="22" rx="4" fill="${color}"/><rect x="${lw}" width="6" height="22" fill="${color}"/>
<rect x="8" y="6" width="10" height="10" rx="2" fill="#E8590C"/>
<g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11"><text x="24" y="15">${left}</text><text x="${lw + 9}" y="15" font-weight="bold">${right}</text></g></svg>`;
}

export function sitemapXml() {
  const urls = ["/", "/guides", ...GUIDES.map((g) => `/guides/${g.slug}`), "/terms", "/privacy", "/refunds"];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${SITE}${u}</loc></url>`).join("")}</urlset>`;
}

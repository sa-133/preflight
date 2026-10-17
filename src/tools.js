// Free single-purpose checkers. Each runs the full scan behind the scenes but
// shows only the checks for its topic, then links to the full report.
import { shell, esc } from "./site.js";

export const TOOLS = [
  {
    slug: "link-preview-checker",
    name: "Link preview checker",
    title: "Link Preview Checker: see how your link looks on X, Discord and iMessage",
    description: "Free link preview checker. See your Open Graph title, description and image, find missing og: and twitter: tags, and learn how to fix a bare link preview.",
    h1: "How does your link look when shared?",
    lede: "Paste your URL to see the preview card X, Discord, Slack and iMessage will show, and which Open Graph tags are missing.",
    checks: ["og", "twitter", "title", "description", "favicon"],
    guide: "/guides/link-preview-not-showing",
    showCard: true,
  },
  {
    slug: "security-headers-checker",
    name: "Security headers checker",
    title: "Security Headers Checker: test HSTS, CSP, nosniff and clickjacking protection",
    description: "Free security headers checker. Test your site for HTTPS, HSTS, Content-Security-Policy, X-Content-Type-Options and frame protection, plus public source maps.",
    h1: "Check your site's security headers",
    lede: "Paste your URL to test HTTPS, HSTS, Content Security Policy, nosniff and clickjacking protection, and whether your source maps are public.",
    checks: ["https", "hsts", "csp", "nosniff", "framing", "sourcemaps"],
    guide: "/guides/security-headers-on-vercel-and-netlify",
  },
  {
    slug: "seo-checker",
    name: "SEO basics checker",
    title: "Free SEO Checker for New Sites: title, description, robots.txt and sitemap",
    description: "Free SEO basics checker for new sites. Test your page title, meta description, robots.txt, sitemap, canonical URL and accidental noindex in seconds.",
    h1: "Is your new site ready for Google?",
    lede: "Paste your URL to check the basics search engines need: title, description, robots.txt, sitemap, canonical URL, and no leftover noindex.",
    checks: ["noindex", "title", "description", "robots", "sitemap", "canonical", "viewport", "h1", "lang", "alt"],
    guide: "/guides/robots-txt-and-sitemap-for-a-new-site",
  },
];

export const findTool = (slug) => TOOLS.find((t) => t.slug === slug) || null;

export function toolsIndex() {
  const items = TOOLS.map((t) => `<li><a href="/tools/${t.slug}">${esc(t.name)}</a><p>${esc(t.description)}</p></li>`).join("");
  return shell({
    title: "Free website checkers · Prelaunch Check",
    description: "Free tools to check your site's link previews, security headers and SEO basics before you launch. No sign-up.",
    path: "/tools",
    body: `<h1>Free website checkers</h1><p class="lede">Single-purpose checks you can run in seconds. For everything at once, including leaked API keys, run the <a href="/">full launch check</a>.</p><ul class="list">${items}</ul>`,
  });
}

export function toolPage(t) {
  const others = TOOLS.filter((x) => x.slug !== t.slug).map((x) => `<li><a href="/tools/${x.slug}">${esc(x.name)}</a></li>`).join("");
  return shell({
    title: `${t.title} · Prelaunch Check`,
    description: t.description,
    path: `/tools/${t.slug}`,
    jsonld: { "@context": "https://schema.org", "@type": "WebApplication", name: t.name, applicationCategory: "DeveloperApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, url: `https://prelaunchcheck.dev/tools/${t.slug}` },
    body: `
<style>
.tool form{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.tool input{flex:1 1 240px;min-width:0;font:500 16px var(--mono);padding:13px 14px;border:2px solid var(--ink);border-radius:8px;background:var(--panel);color:var(--ink)}
.rows{list-style:none;padding:0;margin:20px 0 0;border-top:1px solid var(--line)}
.rows li{display:grid;grid-template-columns:26px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);margin:0}
.box{width:22px;height:22px;border-radius:5px;display:grid;place-items:center;font-weight:800;font-size:14px}
.ok{background:#E1F3E9;color:#16794A}.bad{background:#FCE8E6;color:#B42318}
@media (prefers-color-scheme:dark){.ok{background:#12291D;color:#4FD18B}.bad{background:#33171A;color:#FF7B70}}
.rows .d{color:var(--muted);font-size:15px;overflow-wrap:anywhere}
.card{margin-top:20px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--panel);max-width:520px}
.card .img{aspect-ratio:1200/630;background:var(--code);display:grid;place-items:center;color:var(--muted);font-size:14px;max-width:100%}
.card img{width:100%;height:100%;object-fit:cover;display:block}
.card .txt{padding:12px 14px}.card .h{font:500 13px var(--mono);color:var(--muted)}
.card .t{font-weight:600;margin:2px 0}.card .ds{color:var(--muted);font-size:14px}
.err{background:#FCE8E6;color:#B42318;padding:12px 14px;border-radius:8px}
.next{margin-top:22px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
</style>
<section class="tool">
<p class="meta">Free tool</p>
<h1>${esc(t.h1)}</h1>
<p class="lede">${esc(t.lede)}</p>
<form id="f"><label for="u" class="meta" style="flex-basis:100%">Your site's address</label><input id="u" type="text" inputmode="url" placeholder="myapp.vercel.app" required><button class="btn" id="b" type="submit">Check</button></form>
<div id="out" aria-live="polite"></div>
</section>
<h2>How to fix what it finds</h2>
<p>Read the <a href="${t.guide}">step-by-step guide</a>, or run the <a href="/">full launch check</a> to test everything at once, including leaked API keys and exposed .env files.</p>
<h2>More free checkers</h2><ul class="list">${others}</ul>
<script>
(function(){
  var TOOL=${JSON.stringify(t.slug)}, CARD=${t.showCard ? "true" : "false"};
  var f=document.getElementById('f'),u=document.getElementById('u'),b=document.getElementById('b'),out=document.getElementById('out');
  function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
  f.addEventListener('submit',async function(e){
    e.preventDefault();b.disabled=true;b.textContent='Checking…';out.innerHTML='';
    try{
      var r=await fetch('/api/tool',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tool:TOOL,url:u.value})});
      var d=await r.json();
      if(!r.ok){out.appendChild(el('p','err',d.error||'Check failed.'));return}
      if(CARD&&d.preview){
        var c=el('div','card'),im=el('div','img');
        if(d.preview.image){var i=document.createElement('img');i.alt='';i.src=d.preview.image;i.onerror=function(){im.textContent='Image could not be loaded'};im.appendChild(i)}else im.textContent='No og:image set';
        c.appendChild(im);var tx=el('div','txt');tx.appendChild(el('div','h',d.preview.host));tx.appendChild(el('div','t',d.preview.title||'(no title)'));tx.appendChild(el('div','ds',d.preview.description||'(no description)'));c.appendChild(tx);out.appendChild(c);
      }
      var ul=el('ul','rows'),fails=0;
      d.checks.forEach(function(k){if(!k.pass)fails++;var li=el('li');li.appendChild(el('span','box '+(k.pass?'ok':'bad'),k.pass?'✓':'✕'));var m=el('div');m.appendChild(el('div',null,k.title));m.appendChild(el('div','d',k.detail||''));li.appendChild(m);ul.appendChild(li)});
      out.appendChild(ul);
      var nx=el('div','next');var a=el('a','btn',fails?'See fixes in your full report':'See your full launch grade');a.href='/?id='+d.id+'#report';nx.appendChild(a);
      nx.appendChild(el('span','meta',fails?(fails+' to fix · full report also checks for leaked keys'):'All good here · the full report also checks for leaked keys'));out.appendChild(nx);
    }catch(_){out.appendChild(el('p','err',"Couldn't run the check. Try again in a moment."))}
    finally{b.disabled=false;b.textContent='Check'}
  });
  var q=new URLSearchParams(location.search).get('url');if(q){u.value=q;f.requestSubmit()}
})();
</script>`,
  });
}

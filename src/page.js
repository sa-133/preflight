export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preflight: check your site before you ship</title>
<meta name="description" content="Paste your site's address and get a launch checklist in seconds: leaked API keys, missing meta tags, broken links, security headers and bundle size. Built for vibe coders.">
<link rel="canonical" href="/">
<meta property="og:title" content="Preflight: check your site before you ship">
<meta property="og:description" content="Leaked API keys, missing meta tags, broken links and slow bundles, caught in one scan.">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23E8590C'/%3E%3Cpath d='M9 16.5l4.5 4.5L23 11' stroke='white' stroke-width='4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@112,800&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
/* Layout: one column. A runway-style hero with the scan field, then the result as a pilot's checklist grouped by system. */
:root{
  --bg:#EEF1F4; --panel:#FFFFFF; --ink:#0F1B2D; --muted:#566273; --line:#D3D9E1;
  --signal:#E8590C; --signal-ink:#FFFFFF; --ok:#16794A; --ok-bg:#E1F3E9; --bad:#B42318; --bad-bg:#FCE8E6; --warn:#9A5B00; --warn-bg:#FBEFD9;
  --display:"Archivo", "Arial Black", system-ui, sans-serif; --body:"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif; --mono:"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
  color-scheme:light;
}
@media (prefers-color-scheme: dark){:root{
  --bg:#0B1320; --panel:#121C2B; --ink:#E6EBF2; --muted:#93A0B3; --line:#223047;
  --signal:#FF7A33; --signal-ink:#0B1320; --ok:#4FD18B; --ok-bg:#12291D; --bad:#FF7B70; --bad-bg:#33171A; --warn:#F2B451; --warn-bg:#2E2412; color-scheme:dark }}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg);color:var(--ink);font:16px/1.55 var(--body)}
.wrap{max-width:820px;margin:0 auto;padding:40px max(16px,env(safe-area-inset-right)) 72px max(16px,env(safe-area-inset-left));display:flex;flex-direction:column;gap:32px}
a{color:var(--signal)}
:focus-visible{outline:3px solid var(--signal);outline-offset:2px}
.brand{font:500 13px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:10px}
.brand i{width:14px;height:14px;background:var(--signal);display:inline-block;border-radius:3px}
h1{font-family:var(--display);font-weight:800;font-stretch:112%;font-size:clamp(38px,8vw,68px);line-height:.98;letter-spacing:-.01em;margin:0;text-wrap:balance}
h1 em{font-style:normal;color:var(--signal)}
.lede{font-size:18px;color:var(--muted);max-width:58ch;margin:0}
form{display:flex;gap:10px;flex-wrap:wrap}
input[type=text]{flex:1 1 280px;min-width:0;font:500 17px var(--mono);padding:15px 16px;border:2px solid var(--ink);border-radius:8px;background:var(--panel);color:var(--ink)}
button,.btn{font:600 16px var(--body);border:0;border-radius:8px;padding:15px 22px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px}
.primary{background:var(--signal);color:var(--signal-ink)}
.ghost{background:transparent;color:var(--ink);border:2px solid var(--line)}
button[disabled]{opacity:.6;cursor:wait}
.covers{display:flex;flex-wrap:wrap;gap:8px 18px;font:500 13px var(--mono);color:var(--muted);list-style:none;padding:0;margin:0}
.covers li::before{content:"□ ";color:var(--signal)}
.err{background:var(--bad-bg);color:var(--bad);padding:12px 14px;border-radius:8px;margin:0}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:22px}
.summary{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center}
.grade{width:108px;height:108px;border-radius:50%;display:grid;place-items:center;border:8px solid var(--line);font:800 52px var(--display)}
.grade.A,.grade.B{border-color:var(--ok);color:var(--ok)} .grade.C{border-color:var(--warn);color:var(--warn)} .grade.D,.grade.F{border-color:var(--bad);color:var(--bad)}
.summary h2{margin:0 0 4px;font:800 26px var(--display);font-stretch:112%;overflow-wrap:anywhere}
.meta{font:500 13px var(--mono);color:var(--muted);margin:0}
.counts{display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-weight:600}
.counts span{font-variant-numeric:tabular-nums}
.group h3{font:500 12px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
.list{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.item{border-bottom:1px solid var(--line);padding:12px 0;display:grid;grid-template-columns:26px 1fr auto;gap:12px;align-items:start}
.box{width:22px;height:22px;border-radius:5px;display:grid;place-items:center;font:800 14px var(--body);margin-top:1px}
.box.ok{background:var(--ok-bg);color:var(--ok)} .box.bad{background:var(--bad-bg);color:var(--bad)}
.item .t{font-weight:600} .item .d{color:var(--muted);font-size:14px;overflow-wrap:anywhere}
.sev{font:500 11px var(--mono);letter-spacing:.08em;text-transform:uppercase;padding:3px 7px;border-radius:4px;white-space:nowrap}
.sev.critical,.sev.high{background:var(--bad-bg);color:var(--bad)} .sev.medium{background:var(--warn-bg);color:var(--warn)} .sev.low,.sev.info{background:var(--bg);color:var(--muted)}
.fix{grid-column:2/4;background:var(--bg);border-radius:8px;padding:12px 14px;font-size:14px}
.fix ol{margin:6px 0 0;padding-left:20px;white-space:pre-line} .fix p{margin:0}
.fix .tip{margin-top:8px;font-weight:600}
.find{grid-column:2/4;font:500 13px var(--mono);overflow-wrap:anywhere;color:var(--bad)}
.locked{display:flex;flex-direction:column;gap:12px;border:2px solid var(--signal)}
.locked h3,.verify h3{margin:0;font:800 22px var(--display);font-stretch:112%}
.locked p,.verify p{margin:0;color:var(--muted)}
.code{display:flex;gap:8px;align-items:stretch;flex-wrap:wrap}
.code code{flex:1 1 260px;min-width:0;font:500 13px var(--mono);background:var(--bg);padding:12px;border-radius:8px;overflow-x:auto;white-space:nowrap}
.verify{display:flex;flex-direction:column;gap:12px}
.note{font-size:14px;color:var(--muted)}
footer{font-size:13px;color:var(--muted);border-top:1px solid var(--line);padding-top:16px}
@media (max-width:520px){.summary{grid-template-columns:1fr}.item{grid-template-columns:26px 1fr}.sev{grid-column:2;justify-self:start}}
@media (prefers-reduced-motion:no-preference){.scan-anim{animation:pulse 1s ease-in-out infinite alternate}@keyframes pulse{from{opacity:.55}to{opacity:1}}}
</style>
</head>
<body>
<div class="wrap">
  <header style="display:flex;flex-direction:column;gap:18px">
    <div class="brand"><i></i>Preflight</div>
    <h1>Check your site <em>before</em> you ship it.</h1>
    <p class="lede">Built something with AI? Paste the address and get a launch checklist in about ten seconds: leaked API keys, missing link previews, broken links, security headers and bundle size.</p>
    <form id="scanForm">
      <label for="urlInput" class="meta" style="flex-basis:100%">Your site's address</label>
      <input id="urlInput" type="text" inputmode="url" autocomplete="url" placeholder="myapp.vercel.app" required>
      <button id="scanBtn" class="primary" type="submit">Run preflight</button>
    </form>
    <ul class="covers"><li>Leaked keys</li><li>Exposed .env</li><li>Link previews</li><li>SEO basics</li><li>Security headers</li><li>Broken links</li><li>Bundle size</li></ul>
    <p id="error" class="err" hidden></p>
  </header>
  <main id="report" aria-live="polite"></main>
  <footer>Preflight only reads what any visitor's browser can see. Leaked-key details are shown only to the site's verified owner, and we never charge to tell you a key is exposed.<br>Questions or refunds: __CONTACT__ · <a href="/refunds">Refunds</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></footer>
</div>
<script>
(function(){
  var PRICE="__PRICE__";
  var form=document.getElementById('scanForm'),input=document.getElementById('urlInput'),btn=document.getElementById('scanBtn'),errEl=document.getElementById('error'),out=document.getElementById('report');
  var CATS={security:"Security",seo:"Search & sharing",performance:"Performance",links:"Links"};
  var current=null;
  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
  function showErr(m){errEl.textContent=m;errEl.hidden=!m}
  async function api(path,opts){var r=await fetch(path,opts);var d=await r.json().catch(function(){return{error:"Unexpected response."}});return{ok:r.ok,data:d}}

  form.addEventListener('submit',async function(e){
    e.preventDefault();showErr("");btn.disabled=true;btn.textContent="Scanning…";btn.classList.add('scan-anim');
    try{
      var r=await api('/api/scan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:input.value})});
      if(!r.ok){showErr(r.data.error||"Scan failed.");return}
      render(r.data);history.replaceState(null,"","/?id="+r.data.id);out.scrollIntoView({behavior:'smooth'});
    }catch(_){showErr("Couldn't reach Preflight. Check your connection and try again.")}
    finally{btn.disabled=false;btn.textContent="Run preflight";btn.classList.remove('scan-anim')}
  });

  function render(d){
    current=d;out.innerHTML="";
    var wrapAll=el('div');wrapAll.style.cssText="display:flex;flex-direction:column;gap:24px";
    // summary
    var s=el('section','panel summary');
    var g=el('div','grade '+d.grade,d.grade);g.setAttribute('aria-label','Grade '+d.grade);
    var info=el('div');
    info.appendChild(el('h2',null,new URL(d.url).host));
    info.appendChild(el('p','meta',"Score "+d.score+"/100 · scanned "+new Date(d.scannedAt).toLocaleString()+(d.stack.length?" · "+d.stack.join(", "):"")));
    var fails=d.checks.filter(function(c){return !c.pass});
    var counts=el('div','counts');
    counts.appendChild(el('span',null,(d.checks.length-fails.length)+" passed"));
    counts.appendChild(el('span',null,fails.length+" to fix"));
    if(d.hiddenSecurityChecks)counts.appendChild(el('span',null,d.hiddenSecurityChecks+" owner-only checks"));
    info.appendChild(counts);s.appendChild(g);s.appendChild(info);wrapAll.appendChild(s);

    if(d.hiddenSecurityChecks) wrapAll.appendChild(verifyPanel(d));
    if(!d.paid && fails.length) wrapAll.appendChild(lockPanel(d,fails.length));

    Object.keys(CATS).forEach(function(cat){
      var items=d.checks.filter(function(c){return c.category===cat});
      if(!items.length)return;
      items.sort(function(a,b){return (a.pass-b.pass)});
      var sec=el('section','group');sec.appendChild(el('h3',null,CATS[cat]));
      var ul=el('ul','list');
      items.forEach(function(c){
        var li=el('li','item');
        li.appendChild(el('span','box '+(c.pass?'ok':'bad'),c.pass?'✓':'✕'));
        var mid=el('div');mid.appendChild(el('div','t',c.title));mid.appendChild(el('div','d',c.detail||''));li.appendChild(mid);
        li.appendChild(c.pass?el('span'):el('span','sev '+c.severity,c.severity));
        (c.findings||[]).forEach(function(f){li.appendChild(el('div','find',f.masked?(f.name+": "+f.masked+" in "+f.where):(f.url+" → "+f.status)))});
        if(c.fix){var fx=el('div','fix');fx.appendChild(el('p',null,c.fix.why));var ol=el('ol');c.fix.steps.forEach(function(st){ol.appendChild(el('li',null,st))});fx.appendChild(ol);(c.fix.tips||[]).forEach(function(t){fx.appendChild(el('p','tip',t.stack+": "+t.tip))});li.appendChild(fx)}
        ul.appendChild(li);
      });
      sec.appendChild(ul);wrapAll.appendChild(sec);
    });
    out.appendChild(wrapAll);
  }

  function lockPanel(d,n){
    var p=el('section','panel locked');
    p.appendChild(el('h3',null,"Get the fix for all "+n+" issue"+(n>1?"s":"")));
    p.appendChild(el('p',null,"Step-by-step fixes written for your stack, the list of every broken link, and a report you can re-open for 30 days. One payment of "+PRICE+", no subscription."));
    if(d.devUnlock){var b=el('button','primary',"Unlock (test mode)");b.type='button';b.onclick=async function(){var r=await api('/api/dev-unlock/'+d.id,{method:'POST'});if(r.ok)render(r.data)};p.appendChild(b)}
    else if(d.checkoutReady){var a=el('a','btn primary',"Unlock fixes for "+PRICE);a.href='/checkout/'+d.id;p.appendChild(a)}
    else p.appendChild(el('p','note',"Paid reports are coming soon."));
    return p;
  }

  function verifyPanel(d){
    var p=el('section','panel verify');
    p.appendChild(el('h3',null,"Is this your site? Unlock the leaked-key checks"));
    p.appendChild(el('p',null,d.hiddenSecurityChecks+" checks look for API keys in your code, a public .env file and an exposed .git folder. To keep attackers from using Preflight to find targets, we only show these to the owner. It's free."));
    p.appendChild(el('p','note',"Add this tag inside <head> on your home page and deploy:"));
    var tag='<meta name="preflight-verify" content="'+d.verifyToken+'">';
    var row=el('div','code');var code=el('code',null,tag);row.appendChild(code);
    var copy=el('button','ghost',"Copy");copy.type='button';
    copy.onclick=function(){navigator.clipboard.writeText(tag).then(function(){copy.textContent="Copied"},function(){var r=document.createRange();r.selectNodeContents(code);var s=getSelection();s.removeAllRanges();s.addRange(r)})};
    row.appendChild(copy);p.appendChild(row);
    p.appendChild(el('p','note',"Or upload a file at /.well-known/preflight-verify.txt containing "+d.verifyToken+"."));
    var chk=el('button','primary',"I've deployed it, check now");chk.type='button';
    var msg=el('p','err');msg.hidden=true;
    chk.onclick=async function(){chk.disabled=true;chk.textContent="Checking…";var r=await api('/api/verify/'+d.id,{method:'POST'});chk.disabled=false;chk.textContent="I've deployed it, check now";if(r.ok){render(r.data)}else{msg.textContent=r.data.error;msg.hidden=false}};
    p.appendChild(chk);p.appendChild(msg);
    return p;
  }

  var id=new URLSearchParams(location.search).get('id');
  if(id&&/^[a-f0-9-]{36}$/.test(id)){api('/api/scan/'+id).then(function(r){if(r.ok){render(r.data);input.value=new URL(r.data.url).host;if(location.hash==='#report')out.scrollIntoView()}else showErr(r.data.error)})}
})();
</script>
</body>
</html>`;

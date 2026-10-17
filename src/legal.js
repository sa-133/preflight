export const CONTACT = "thompson.stephen.austin@gmail.com";
const UPDATED = "October 16, 2026";

const PAGES = {
  refunds: {
    title: "Refund policy",
    body: `
<p>If the full report didn't help you, email <b>${CONTACT}</b> within 14 days of buying and we'll refund the $7 in full. No forms and no questions about why.</p>
<p>Include the address of the site you scanned or the email on your receipt so we can find the payment. Refunds go back to the card you paid with and usually arrive within 5–10 business days.</p>
<p>If you paid and your report didn't unlock, email us and we'll unlock it or refund you, whichever you prefer.</p>`,
  },
  terms: {
    title: "Terms of service",
    body: `
<p>Preflight is a website checker run by Austin Thompson. By using it you agree to these terms.</p>
<h2>What Preflight does</h2>
<p>Preflight requests a site's public pages, its own script files, a few well-known paths (like robots.txt, sitemap.xml, /.env and /.git/config) and a sample of its internal links, then reports what it finds. It only reads what any visitor's browser could request. It never logs in, submits forms, or tries to break anything.</p>
<h2>Fair use</h2>
<ul>
<li>Scans are limited to 10 per hour per visitor.</li>
<li>Don't use Preflight to harass, overload or attack a site, or try to get around its limits.</li>
<li>Results about leaked keys and exposed files are only shown to a site's verified owner. Don't attempt to verify a site you don't control.</li>
</ul>
<h2>Paid reports</h2>
<p>The full report is a one-time $7 payment, not a subscription, and stays available for 30 days. Payments are processed by Stripe. See the <a href="/refunds">refund policy</a>.</p>
<h2>No guarantees</h2>
<p>Preflight catches common problems, but it can't find every issue and isn't a substitute for a professional security review. Reports are provided as-is. We're not liable for losses from issues Preflight did or didn't report. Our total liability is limited to what you paid us.</p>
<h2>Changes</h2>
<p>We may update these terms; the date below shows the latest version. Questions: <b>${CONTACT}</b>.</p>`,
  },
  privacy: {
    title: "Privacy policy",
    body: `
<p>Preflight collects as little as it can.</p>
<h2>What we store</h2>
<ul>
<li><b>Scan reports:</b> the address you scanned and the results, kept for 30 days so you can re-open your report, then deleted automatically. Leaked keys are stored only in masked form (first and last few characters).</li>
<li><b>Your IP address:</b> used only to enforce the hourly scan limit, kept for about an hour.</li>
<li><b>Payments:</b> handled entirely by Stripe. We never see or store your card details. Stripe tells us whether a payment for a report succeeded.</li>
</ul>
<h2>What we don't do</h2>
<p>No accounts, no tracking cookies, no ad trackers, and we don't sell or share your data.</p>
<h2>Service providers</h2>
<p>Preflight runs on Cloudflare and takes payments through Stripe. Each handles data under its own privacy policy.</p>
<h2>Contact</h2>
<p>To ask about or delete your data, email <b>${CONTACT}</b>.</p>`,
  },
};

export function legalPage(slug) {
  const pg = PAGES[slug];
  if (!pg) return null;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pg.title} · Preflight</title><meta name="description" content="Preflight ${pg.title.toLowerCase()}.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23E8590C'/%3E%3Cpath d='M9 16.5l4.5 4.5L23 11' stroke='white' stroke-width='4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<style>
:root{--bg:#EEF1F4;--panel:#fff;--ink:#0F1B2D;--muted:#566273;--line:#D3D9E1;--signal:#E8590C;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0B1320;--panel:#121C2B;--ink:#E6EBF2;--muted:#93A0B3;--line:#223047;--signal:#FF7A33;color-scheme:dark}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:680px;margin:0 auto;padding:40px max(16px,env(safe-area-inset-right)) 64px max(16px,env(safe-area-inset-left))}
a{color:var(--signal)} h1{font-size:34px;line-height:1.1;margin:18px 0 6px} h2{font-size:19px;margin:28px 0 6px}
.back{font:500 13px ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;text-decoration:none}
.upd{color:var(--muted);margin:0 0 20px;font-size:14px} li{margin:4px 0}
</style></head><body><main>
<a class="back" href="/">← Preflight</a>
<h1>${pg.title}</h1><p class="upd">Last updated ${UPDATED}</p>
${pg.body}
</main></body></html>`;
}

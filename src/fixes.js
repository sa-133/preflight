// Step-by-step fixes, unlocked in the full report. `stack` lets a fix add a
// tip for the framework the site was built with.

export const FIXES = {
  secrets: {
    why: "Anyone can open your site's JavaScript and copy these keys, then run up charges or read your data on your account.",
    steps: [
      "Revoke (rotate) every listed key in that provider's dashboard right now. Deleting it from your code is not enough, because it is already public.",
      "Move the API call to a server: an API route, serverless function or edge function. Call your own endpoint from the browser instead.",
      "Keep the new key in a server-only environment variable and never import it into client code.",
      "Redeploy, then run Prelaunch Check again to confirm the keys are gone.",
    ],
    stack: {
      "Next.js": "Only variables starting with NEXT_PUBLIC_ reach the browser. Rename the secret without that prefix and use it only inside app/api routes or server components.",
      "Vite": "Every VITE_ variable is bundled into public JavaScript. Secrets cannot live in a Vite app; put the call behind a serverless function.",
      "Supabase": "The service_role key bypasses all security rules. The browser should only ever have the anon key, with Row Level Security turned on for every table.",
    },
  },
  google_key: {
    why: "Google browser keys are public by design, but an unrestricted one can be used by anyone, on your bill.",
    steps: [
      "Open Google Cloud Console → APIs & Services → Credentials.",
      "Edit the key and set Application restrictions to HTTP referrers, with your domain only.",
      "Under API restrictions, allow only the APIs your site uses.",
    ],
  },
  env_file: {
    why: "Your .env usually holds every password and API key your app uses.",
    steps: [
      "Rotate every secret in that file now. Assume all of them were copied.",
      "Remove .env from the folder your host serves (often public/, dist/ or the site root).",
      "Add .env to .gitignore and set secrets in your host's environment variable settings instead.",
      "Redeploy and confirm yoursite.com/.env returns a 404.",
    ],
  },
  git_exposed: {
    why: "With your .git folder, anyone can rebuild your full source code and every past commit, including secrets you deleted later.",
    steps: [
      "Deploy only your build output folder, not the whole project folder.",
      "If your host serves the project root, block /.git with a rule in its configuration.",
      "Rotate any secret that was ever committed to the repository.",
    ],
  },
  https: { why: "Without HTTPS, browsers mark your site Not Secure and anything users type can be intercepted.", steps: ["Turn on HTTPS in your host's domain settings (free on Vercel, Netlify and Cloudflare).", "Redirect all http:// traffic to https://."] },
  hsts: { why: "HSTS stops browsers from ever loading your site over plain HTTP.", steps: ["Add the response header: Strict-Transport-Security: max-age=31536000; includeSubDomains"], stack: { "Vercel": "Add it under headers in vercel.json.", "Netlify": "Add it to the _headers file.", "Next.js": "Add it in the headers() function in next.config.js." } },
  csp: { why: "A Content Security Policy limits which scripts can run, which blunts most injection attacks.", steps: ["Start with a report-only policy: Content-Security-Policy-Report-Only: default-src 'self'", "Watch the browser console for what it would block, allow what you need, then switch to the enforcing header."] },
  nosniff: { why: "Stops browsers from guessing file types, a classic way to slip scripts in.", steps: ["Add the response header: X-Content-Type-Options: nosniff"] },
  framing: { why: "Without it, another site can load yours invisibly and trick users into clicking.", steps: ["Add the response header: X-Frame-Options: DENY (or frame-ancestors 'none' in your CSP)."] },
  sourcemaps: { why: "Public source maps hand out your original, readable source code.", steps: ["Turn off production source maps, or upload them privately to your error tracker instead."], stack: { "Vite": "Set build.sourcemap to false (or 'hidden') in vite.config.", "Next.js": "Keep productionBrowserSourceMaps set to false in next.config.js." } },
  title: { why: "The title is the blue link in Google and the name in the browser tab. Template titles like \"Vite + React\" look unfinished.", steps: ["Set a unique title of 50–60 characters: what it is, plus your brand name."], stack: { "Vite": "Edit the <title> in index.html.", "Next.js": "Export metadata = { title: '…' } from app/layout." } },
  description: { why: "This is the grey text under your link in search results.", steps: ["Add <meta name=\"description\" content=\"…\"> with 120–160 characters that say who it's for and what it does."] },
  viewport: { why: "Without it, phones render a tiny desktop page.", steps: ["Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> inside <head>."] },
  lang: { why: "Helps screen readers and search engines read your page correctly.", steps: ["Change <html> to <html lang=\"en\"> (or your language)."] },
  canonical: { why: "Tells search engines which URL is the real one, so duplicates don't split your ranking.", steps: ["Add <link rel=\"canonical\" href=\"https://yoursite.com/\"> to each page with that page's own URL."] },
  og: { why: "These tags decide how your link looks when shared on X, Discord, iMessage and LinkedIn.", steps: ["Add og:title, og:description and og:image (1200×630 PNG or JPG, absolute URL).", "Test with a link preview tool after deploying."] },
  twitter: { why: "Gives your link a large image card on X.", steps: ["Add <meta name=\"twitter:card\" content=\"summary_large_image\">."] },
  favicon: { why: "A blank tab icon makes a site look unfinished.", steps: ["Add a 32×32 favicon.ico or an SVG icon and link it: <link rel=\"icon\" href=\"/favicon.svg\">."] },
  h1: { why: "Search engines use the main heading to understand the page. If it only appears after JavaScript runs, some crawlers miss it.", steps: ["Make sure each page has one <h1>.", "If your app renders everything client-side, consider pre-rendering or server rendering your landing page."] },
  noindex: { why: "Your page is telling Google not to list it.", steps: ["Remove noindex from the robots meta tag or X-Robots-Tag header (often left over from a staging setup)."] },
  robots: { why: "robots.txt tells crawlers what they may read. Blocking everything keeps you out of search.", steps: ["Serve /robots.txt with:\nUser-agent: *\nAllow: /\nSitemap: https://yoursite.com/sitemap.xml"] },
  sitemap: { why: "A sitemap helps search engines find every page faster.", steps: ["Generate /sitemap.xml listing your pages and submit it in Google Search Console."], stack: { "Next.js": "Add app/sitemap.ts to generate it automatically." } },
  alt: { why: "Alt text is read aloud by screen readers and helps image search.", steps: ["Give every meaningful image a short alt description; use alt=\"\" for decorative ones."] },
  ttfb: { why: "Slow first responses hurt both visitors and rankings.", steps: ["Serve your landing page as static or cached HTML.", "Check for slow database calls or cold-starting functions on the home page."] },
  html_size: { why: "Very large HTML usually means inlined data or images.", steps: ["Move large inline data and base64 images out of the HTML."] },
  js_size: { why: "Big bundles make phones wait before the page responds.", steps: ["Remove unused libraries and split large routes so they load on demand.", "Check bundle contents with a bundle analyzer."] },
  compression: { why: "Compression typically cuts text transfer size by 70% or more.", steps: ["Turn on gzip or Brotli in your host settings. Vercel, Netlify and Cloudflare do this by default."] },
  links: { why: "Broken links frustrate visitors and waste crawl budget.", steps: ["Fix or remove each link listed below, or add redirects for moved pages."] },
  is_html: { why: "The page should be served as text/html.", steps: ["Check your host's content-type settings for this route."] },
};

export function fixFor(id, stack = []) {
  const f = FIXES[id];
  if (!f) return null;
  const tips = Object.entries(f.stack || {}).filter(([k]) => stack.includes(k)).map(([k, v]) => ({ stack: k, tip: v }));
  return { why: f.why, steps: f.steps, tips };
}

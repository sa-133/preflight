// Guide library. Each guide answers one question people search for, then
// points to the free check. Add new guides at the TOP of the array.
// Fields: slug, title (H1 + <title>), description (meta, 120-160 chars),
// date (YYYY-MM-DD), tags, html (body; h2/p/ul/ol/pre/code only).

export const GUIDES = [
{
  slug: "is-nuxt-runtime-config-public",
  title: "Is Nuxt runtimeConfig public? Keeping API keys out of the browser",
  description: "Anything under runtimeConfig.public in Nuxt is sent to every visitor. Here's where secret keys belong and how to call an API from a server route.",
  date: "2026-10-20",
  tags: ["nuxt","env","keys"],
  html: `
<p><b>Only part of it.</b> Keys you put directly under <code>runtimeConfig</code> in <code>nuxt.config</code> stay on the server. Keys under <code>runtimeConfig.public</code> are exposed to the client and can appear in the page payload. An API key in the <code>public</code> block is public.</p>
<h2>How the two blocks work</h2>
<pre><code>// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    openaiApiKey: "",      // server only; set with NUXT_OPENAI_API_KEY
    public: {
      apiBase: "/api",     // exposed to the client; set with NUXT_PUBLIC_API_BASE
    },
  },
});</code></pre>
<p>Nuxt can override declared runtime config keys with matching environment variables. Private runtime config uses the <code>NUXT_</code> prefix; public config uses <code>NUXT_PUBLIC_</code>. Declaring a key does not make every environment variable public: only values placed in <code>runtimeConfig.public</code> are exposed to the client.</p>
<h2>Why keys still end up in public config</h2>
<ul>
<li>The browser code needed the key, so it was moved into <code>public</code> to make an error go away.</li>
<li>A server-only value was read on the server and then passed to the page, for example through <code>useState</code> or rendered HTML.</li>
<li>The provider is called from a component instead of a server route. See <a href="/guides/never-call-ai-apis-from-the-browser">why that exposes the key</a>.</li>
</ul>
<h2>Call the provider from a server route</h2>
<p>Keep the key in the private runtime config and make the call from <code>server/api</code>:</p>
<pre><code>// server/api/chat.post.ts
export default defineEventHandler(async (event) =&gt; {
  const { openaiApiKey } = useRuntimeConfig(event);
  const { message } = await readBody(event);
  return await $fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + openaiApiKey },
    body: {
      model: "YOUR_MODEL",
      messages: [{ role: "user", content: message }],
    },
  });
});</code></pre>
<p>Your client calls <code>/api/chat</code> and never receives the key. Passing <code>event</code> to <code>useRuntimeConfig</code> ensures the server route reads the runtime value for that request.</p>
<h2>Set the variable on your host</h2>
<p>Nuxt's CLI reads <code>.env</code> during development and build commands, but the built server does not read that file at runtime. Set <code>NUXT_OPENAI_API_KEY</code> in your hosting platform's environment settings and redeploy or restart as that platform requires.</p>
<h2>Check your live site</h2>
<ol>
<li>Open your site, view the page source, and search for your key's prefix and names from the <code>public</code> block.</li>
<li>If a secret appears, rotate it first. Moving it does not un-leak it. Follow <a href="/guides/what-to-do-if-your-api-key-leaked">these steps for a leaked API key</a>.</li>
<li>Add authentication or rate limits to your server route, and set a spending limit with the provider.</li>
</ol>`,
},
{
  slug: "launch-checklist-for-ai-built-apps",
  title: "The launch checklist for AI-built apps",
  description: "Built your app with Cursor, Lovable, Bolt or Claude? Check these 12 things before you share the link: keys, env files, previews, SEO and headers.",
  date: "2026-10-16", tags: ["checklist", "security", "seo"],
  html: `
<p>AI tools get an app from idea to deployed in an afternoon. They're also very good at skipping the boring parts that make a launch go well. Run through this list before you post your link anywhere.</p>
<h2>Security: the things that cost money</h2>
<ol>
<li><b>No secret keys in the browser.</b> Open your live site, open DevTools → Sources, and search for <code>sk-</code>, <code>sk_live</code>, <code>service_role</code> and your provider's key prefix. Anything you find there is public. <a href="/guides/how-to-find-leaked-api-keys-on-your-website">How to check</a>.</li>
<li><b>Your <code>.env</code> isn't downloadable.</b> Visit <code>yoursite.com/.env</code>. It should be a 404.</li>
<li><b>Your <code>.git</code> folder isn't public.</b> Visit <code>yoursite.com/.git/config</code>. Also a 404.</li>
<li><b>Database rules are on.</b> If you use Supabase or Firebase, the browser key is public by design, so your row-level security or security rules are the only lock.</li>
<li><b>Spending limits are set</b> on every paid API you call, so a leak or a bot can't run up an unlimited bill.</li>
</ol>
<h2>Sharing and search</h2>
<ol start="6">
<li><b>A real page title</b>, not "Vite + React" or "Create Next App".</li>
<li><b>A meta description</b> of 120–160 characters.</li>
<li><b>Link preview tags</b> (<code>og:title</code>, <code>og:description</code>, <code>og:image</code>) so your link looks good on X, Discord and iMessage.</li>
<li><b>A favicon</b>, so browser tabs don't show a blank page icon.</li>
<li><b>robots.txt and a sitemap</b>, and no leftover <code>noindex</code> from staging.</li>
</ol>
<h2>Polish</h2>
<ol start="11">
<li><b>Basic security headers</b>: HSTS, <code>X-Content-Type-Options</code> and frame protection.</li>
<li><b>No broken internal links</b>, especially in your footer and nav.</li>
</ol>
<p>Every item on this list is something Prelaunch Check tests automatically.</p>`,
},
{
  slug: "is-my-supabase-key-exposed",
  title: "Is my Supabase key exposed? Anon vs service_role explained",
  description: "Your Supabase anon key is meant to be public. Your service_role key is not. Here's how to tell which one is in your site and what to do about it.",
  date: "2026-10-16", tags: ["supabase", "security", "keys"],
  html: `
<p>If you built on Supabase, your site almost certainly ships a Supabase key to the browser. That's normal. What matters is <b>which</b> key.</p>
<h2>The two kinds of key</h2>
<ul>
<li><b>Anon / publishable key</b> (older projects: a JWT whose payload says <code>"role":"anon"</code>; newer projects: starts with <code>sb_publishable_</code>). Designed to be public. It can only do what your Row Level Security (RLS) policies allow.</li>
<li><b>Service role / secret key</b> (a JWT with <code>"role":"service_role"</code>, or a key starting with <code>sb_secret_</code>). It <b>bypasses RLS entirely</b>. Anyone who has it can read, change or delete every row in every table.</li>
</ul>
<h2>How to check which one you shipped</h2>
<ol>
<li>Open your live site, then DevTools → Sources (or Network), and search for <code>eyJ</code> and <code>sb_</code>.</li>
<li>For a JWT, paste the middle section (between the two dots) into any base64 decoder. Look for <code>"role"</code>.</li>
<li>If it says <code>service_role</code>, or you find <code>sb_secret_</code>, treat it as leaked.</li>
</ol>
<h2>If the service role key leaked</h2>
<ol>
<li>Rotate it now in the Supabase dashboard under your project's API settings. Removing it from code isn't enough; it's already public.</li>
<li>Move whatever needed it into a server-side function (a Supabase Edge Function or your own API route).</li>
<li>Check your tables for data you didn't write.</li>
</ol>
<h2>If it's the anon key, you're not done yet</h2>
<p>The anon key is safe only if RLS is on for <b>every</b> table that holds user data. A table with RLS off is readable and writable by anyone with the anon key, which is everyone. In the Supabase dashboard, check that each table shows RLS enabled and has policies that match who should see what.</p>`,
},
{
  slug: "are-vite-env-variables-public",
  title: "Are Vite environment variables public?",
  description: "Every VITE_ variable is bundled into your public JavaScript. Here's what that means for API keys and how to keep secrets out of a Vite app.",
  date: "2026-10-16", tags: ["vite", "env", "keys"],
  html: `
<p><b>Yes.</b> Any variable that starts with <code>VITE_</code> and that your code reads through <code>import.meta.env</code> is written into your built JavaScript as plain text. Anyone can read it in the browser.</p>
<h2>Why this catches people</h2>
<p>The variable lives in a <code>.env</code> file, which feels private. But Vite replaces <code>import.meta.env.VITE_OPENAI_KEY</code> with the actual value at build time. The secret ends up in a file like <code>/assets/index-abc123.js</code> that every visitor downloads.</p>
<p>Variables <b>without</b> the <code>VITE_</code> prefix aren't exposed, but they also aren't available in your browser code at all. That's the point: a Vite app runs entirely in the browser, so there is no safe place in it for a secret.</p>
<h2>What's fine to put in VITE_ variables</h2>
<ul>
<li>Public URLs (your API base URL, your Supabase project URL)</li>
<li>Keys that are designed to be public: Supabase anon/publishable keys, Firebase config, Stripe publishable keys (<code>pk_</code>), browser-restricted Google Maps keys</li>
</ul>
<h2>What is never fine</h2>
<ul>
<li>OpenAI, Anthropic, Groq, Replicate or any AI provider key</li>
<li>Stripe secret keys (<code>sk_</code>)</li>
<li>Database passwords, service role keys, email API keys</li>
</ul>
<h2>The fix</h2>
<ol>
<li>Rotate any secret that was ever in a <code>VITE_</code> variable on a deployed site.</li>
<li>Move the call that needs it into a small server function: a Vercel or Netlify function, a Cloudflare Worker, or a Supabase Edge Function. Keep the key in that platform's environment settings, without the <code>VITE_</code> prefix.</li>
<li>Have your app call your function instead of the provider directly.</li>
</ol>`,
},
{
  slug: "how-to-hide-openai-api-key-nextjs",
  title: "How to hide your OpenAI API key in Next.js",
  description: "Keep your OpenAI key out of the browser in Next.js: drop the NEXT_PUBLIC_ prefix and call OpenAI from a route handler. Copy-paste example inside.",
  date: "2026-10-16", tags: ["nextjs", "openai", "keys"],
  html: `
<p>In Next.js, only environment variables starting with <code>NEXT_PUBLIC_</code> are sent to the browser. Everything else stays on the server. So the fix is two steps: rename the variable, and make the OpenAI call from server code.</p>
<h2>1. Rename the variable</h2>
<pre><code># .env.local  (and in your host's environment settings)
OPENAI_API_KEY=sk-...        # good: server only
# NEXT_PUBLIC_OPENAI_API_KEY  # bad: shipped to every visitor</code></pre>
<h2>2. Call OpenAI from a route handler</h2>
<pre><code>// app/api/chat/route.js
export async function POST(req) {
  const { message } = await req.json();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${process.env.OPENAI_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "YOUR_MODEL", // pick from OpenAI's current model list
      messages: [{ role: "user", content: message }],
    }),
  });
  return Response.json(await res.json());
}</code></pre>
<h2>3. Call your route from the browser</h2>
<pre><code>const res = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({ message }),
});</code></pre>
<h2>Don't skip these</h2>
<ul>
<li>If the key was ever public, <b>rotate it</b> in your OpenAI dashboard. Renaming doesn't un-leak it.</li>
<li>Your route is now a free proxy to OpenAI for anyone who finds it. Add a rate limit or require sign-in, and set a monthly spending limit in your OpenAI account.</li>
</ul>`,
},
{
  slug: "how-to-find-leaked-api-keys-on-your-website",
  title: "How to find leaked API keys on your own website",
  description: "A five-minute way to check whether your live site exposes API keys, using only your browser's DevTools. Includes the key prefixes to search for.",
  date: "2026-10-16", tags: ["security", "keys", "devtools"],
  html: `
<p>Your source code isn't what matters here; your <b>deployed</b> site is. Build tools inline environment variables, so a key can be in your live JavaScript even if it's never typed in a source file.</p>
<h2>Check it by hand</h2>
<ol>
<li>Open your live site in Chrome or Firefox.</li>
<li>Open DevTools and go to the <b>Sources</b> tab (Firefox: Debugger).</li>
<li>Press Ctrl+Shift+F (Cmd+Option+F on Mac) to search all files.</li>
<li>Search for each of these prefixes:</li>
</ol>
<ul>
<li><code>sk-</code> and <code>sk-proj-</code>: OpenAI</li>
<li><code>sk-ant-</code>: Anthropic</li>
<li><code>sk_live_</code> and <code>rk_live_</code>: Stripe secret keys</li>
<li><code>service_role</code> and <code>sb_secret_</code>: Supabase admin keys</li>
<li><code>AKIA</code>: AWS access keys</li>
<li><code>ghp_</code> and <code>github_pat_</code>: GitHub tokens</li>
<li><code>gsk_</code> (Groq), <code>xai-</code> (xAI), <code>r8_</code> (Replicate)</li>
</ul>
<h2>What's fine to find</h2>
<p>Some keys are meant to be public: Stripe <code>pk_</code> keys, Supabase anon or <code>sb_publishable_</code> keys, Firebase config, and Google keys starting with <code>AIza</code> (as long as they're restricted to your domain).</p>
<h2>If you find a secret</h2>
<p>Follow <a href="/guides/what-to-do-if-your-api-key-leaked">what to do if your API key leaked</a>. Start by rotating it; that's the only step that actually stops misuse.</p>`,
},
{
  slug: "what-to-do-if-your-api-key-leaked",
  title: "What to do if your API key leaked",
  description: "Leaked an OpenAI, Stripe or Supabase key? Do these steps in this order: rotate, check usage, move it server-side, and cap your spending.",
  date: "2026-10-16", tags: ["security", "keys", "incident"],
  html: `
<p>Bots scan public sites and GitHub for keys constantly, so assume a leaked key has already been copied. Work through these in order.</p>
<h2>1. Rotate the key (right now)</h2>
<p>Create a new key in the provider's dashboard and delete or revoke the old one. Deleting the key from your code does nothing for a copy someone already has.</p>
<h2>2. Check what it was used for</h2>
<ul>
<li><b>AI providers:</b> look at usage and billing for spikes you don't recognize.</li>
<li><b>Stripe:</b> check for refunds, payouts or customers you didn't create.</li>
<li><b>Databases:</b> look for changed or deleted rows and unfamiliar users.</li>
</ul>
<h2>3. Put the new key somewhere safe</h2>
<p>Keep it in server-only environment variables and call the provider from a server function. See <a href="/guides/how-to-hide-openai-api-key-nextjs">Next.js</a> and <a href="/guides/are-vite-env-variables-public">Vite</a> examples.</p>
<h2>4. Cap the damage next time</h2>
<ul>
<li>Set a monthly spending limit or budget alert with every paid API.</li>
<li>Use restricted keys with only the permissions the app needs.</li>
<li>Add a rate limit to any endpoint that calls a paid API.</li>
</ul>
<h2>5. Clean up history</h2>
<p>If the key was committed to Git, it's still in your repo history. Rotating makes the old one useless, which is what matters most.</p>`,
},
{
  slug: "is-my-env-file-public",
  title: "Is my .env file public? How to check and fix it",
  description: "If yoursite.com/.env loads, every secret in it is public. Here's the 10-second check, why it happens, and how to fix it on common hosts.",
  date: "2026-10-16", tags: ["env", "security", "hosting"],
  html: `
<h2>The 10-second check</h2>
<p>Open <code>https://yoursite.com/.env</code> in a private window. You should see a 404 or your site's not-found page. If you see lines like <code>API_KEY=...</code>, every value in that file is public.</p>
<h2>Why it happens</h2>
<ul>
<li>The whole project folder was uploaded to a static host instead of just the build output.</li>
<li>The <code>.env</code> file was placed in <code>public/</code>, whose contents are copied to your site as-is.</li>
<li>A server is configured to serve the project root.</li>
</ul>
<h2>The fix</h2>
<ol>
<li><b>Rotate every secret in the file.</b> Assume all of them were copied.</li>
<li>Delete the file from anything your host serves, and deploy only your build folder (often <code>dist/</code>, <code>build/</code> or <code>out/</code>).</li>
<li>Add <code>.env*</code> to <code>.gitignore</code>.</li>
<li>Set secrets in your host's environment variable settings instead of a file.</li>
<li>Deploy and check <code>/.env</code> again.</li>
</ol>`,
},
{
  slug: "exposed-git-folder-on-website",
  title: "Exposed .git folder: why it's dangerous and how to fix it",
  description: "A public /.git folder lets anyone download your full source code and history, including secrets you deleted. Check yours and lock it down.",
  date: "2026-10-16", tags: ["git", "security", "hosting"],
  html: `
<h2>Check</h2>
<p>Visit <code>https://yoursite.com/.git/config</code>. If you see text starting with <code>[core]</code>, your Git folder is public.</p>
<h2>Why it matters</h2>
<p>Free tools can rebuild an entire repository from a public <code>.git</code> folder: every file and every past commit. That includes any secret that was <b>ever</b> committed, even if you deleted it later.</p>
<h2>Fix</h2>
<ol>
<li>Deploy only your build output, not the project folder.</li>
<li>If your server must serve the project root, block <code>/.git</code> with a deny rule in its configuration.</li>
<li>Rotate every secret that has ever appeared in the repo's history.</li>
</ol>`,
},
{
  slug: "is-firebase-api-key-safe-to-expose",
  title: "Is it safe to expose your Firebase API key?",
  description: "Firebase config keys are meant to be public. Your Security Rules are what protect your data. Here's what to check instead of hiding the key.",
  date: "2026-10-16", tags: ["firebase", "keys", "security"],
  html: `
<p><b>Yes, the Firebase <code>apiKey</code> in your web config is meant to be public.</b> It identifies your project; it doesn't grant access on its own. Every Firebase web app ships it to the browser.</p>
<h2>What actually protects your data</h2>
<ul>
<li><b>Firestore and Realtime Database Security Rules.</b> Rules like <code>allow read, write: if true;</code> (common in tutorials and test mode) let anyone read and change everything.</li>
<li><b>Storage rules</b>, for uploaded files.</li>
<li><b>App Check</b>, which helps make sure requests come from your real app.</li>
</ul>
<h2>What to check before launch</h2>
<ol>
<li>Open your Security Rules and make sure no collection with user data allows open reads or writes.</li>
<li>Make sure test-mode rules are gone; they expire, but some people extend them.</li>
<li>In Google Cloud Console, restrict the browser key to your domains as an extra layer.</li>
</ol>
<p>The things you should never ship to the browser are service account JSON files and Admin SDK credentials. Those are full admin access.</p>`,
},
{
  slug: "restrict-google-maps-api-key",
  title: "How to restrict your Google Maps API key",
  description: "Google Maps keys live in your page, so restrict them to your domain and the APIs you use. Step-by-step in Google Cloud Console.",
  date: "2026-10-16", tags: ["google", "keys"],
  html: `
<p>Google browser keys (they start with <code>AIza</code>) have to be in your page for Maps and similar APIs to work. The protection is restricting what they can do, not hiding them. An unrestricted key can be used on anyone's site, on your bill.</p>
<h2>Steps</h2>
<ol>
<li>Open Google Cloud Console → APIs &amp; Services → Credentials.</li>
<li>Click your key.</li>
<li>Under <b>Application restrictions</b>, choose <b>Websites</b> and add your domains, for example <code>https://yoursite.com/*</code>.</li>
<li>Under <b>API restrictions</b>, choose <b>Restrict key</b> and select only the APIs your site uses.</li>
<li>Save. Changes can take a few minutes to apply.</li>
</ol>
<p>Also set a budget alert in Billing, so unexpected usage gets your attention quickly.</p>`,
},
{
  slug: "stripe-publishable-key-vs-secret-key",
  title: "Stripe publishable key vs secret key: which can be public?",
  description: "pk_ keys belong in your frontend. sk_ and rk_ keys never do. Here's the difference and what to do if a Stripe secret key ended up in your site.",
  date: "2026-10-16", tags: ["stripe", "keys", "payments"],
  html: `
<ul>
<li><b>Publishable keys</b> (<code>pk_live_</code>, <code>pk_test_</code>) are designed for the browser. They can start a checkout or collect card details but can't read your data or move money.</li>
<li><b>Secret keys</b> (<code>sk_live_</code>) can do almost anything in your account: refunds, customer data, and more. They must stay on a server.</li>
<li><b>Restricted keys</b> (<code>rk_live_</code>) are secret keys with limited permissions. Still server-only, but a leak does less damage.</li>
</ul>
<h2>If a secret key is in your site</h2>
<ol>
<li>In the Stripe Dashboard → Developers → API keys, roll the key immediately.</li>
<li>Review recent activity for refunds, payouts and customers you don't recognize.</li>
<li>Move the code that needs it to a server function.</li>
</ol>
<h2>A simpler option</h2>
<p>If you only sell a few things, Stripe Payment Links need no keys in your code at all. To confirm payments on a server, use a restricted key with only the read permissions you need.</p>`,
},
{
  slug: "source-maps-in-production",
  title: "Should you ship source maps to production?",
  description: "Public source maps hand out your original, readable code. Here's how to check for them and turn them off in Vite and Next.js.",
  date: "2026-10-16", tags: ["vite", "nextjs", "security"],
  html: `
<p>Source maps (<code>.map</code> files) translate your minified JavaScript back into the original source. Great for debugging; less great when anyone can download them and read your code, comments and internal API routes.</p>
<h2>Check</h2>
<p>Open one of your JavaScript files in the browser and scroll to the bottom. If it ends with <code>//# sourceMappingURL=something.js.map</code>, try loading that URL. If it downloads, your source is public.</p>
<h2>Turn them off</h2>
<pre><code>// vite.config.js
export default { build: { sourcemap: false } }  // or 'hidden'</code></pre>
<pre><code>// next.config.js (false is the default)
module.exports = { productionBrowserSourceMaps: false }</code></pre>
<p>If you use an error tracker, upload source maps to it privately during your build instead of serving them publicly.</p>`,
},
{
  slug: "link-preview-not-showing",
  title: "Why your link preview isn't showing on X, Discord or iMessage",
  description: "Shared your site and got a bare link? Add these Open Graph tags, use an absolute image URL at 1200×630, and clear the preview cache.",
  date: "2026-10-16", tags: ["seo", "open graph", "sharing"],
  html: `
<p>Link previews come from Open Graph tags in your page's <code>&lt;head&gt;</code>. Without them, platforms show a bare URL or guess badly.</p>
<h2>The tags you need</h2>
<pre><code>&lt;meta property="og:title" content="Your App: what it does"&gt;
&lt;meta property="og:description" content="One sentence on who it's for."&gt;
&lt;meta property="og:image" content="https://yoursite.com/og.png"&gt;
&lt;meta property="og:url" content="https://yoursite.com/"&gt;
&lt;meta name="twitter:card" content="summary_large_image"&gt;</code></pre>
<h2>Common reasons it still doesn't work</h2>
<ul>
<li><b>Relative image URL.</b> <code>/og.png</code> won't work; use the full <code>https://</code> address.</li>
<li><b>Wrong size or format.</b> Use a 1200×630 PNG or JPG under about 5 MB. SVG doesn't work on most platforms.</li>
<li><b>Tags added by JavaScript.</b> Preview bots don't run your app's JavaScript. Single-page apps need the tags in <code>index.html</code> itself.</li>
<li><b>Cached preview.</b> Platforms cache previews. Adding a query string like <code>?v=2</code> to the shared link usually forces a refresh.</li>
</ul>`,
},
{
  slug: "change-vite-react-page-title",
  title: "How to change the \"Vite + React\" page title",
  description: "Still showing \"Vite + React\" in the browser tab? Change it in index.html, and set per-page titles if you use React Router.",
  date: "2026-10-16", tags: ["vite", "react", "seo"],
  html: `
<p>"Vite + React" is the default title from the Vite template. It's what shows in the browser tab, in bookmarks and as the blue link in Google, so it's worth 30 seconds.</p>
<h2>Change the site-wide title</h2>
<p>Open <code>index.html</code> in your project root:</p>
<pre><code>&lt;title&gt;Your App: what it does in a few words&lt;/title&gt;
&lt;meta name="description" content="120-160 characters on who it's for and what it does."&gt;</code></pre>
<h2>Per-page titles</h2>
<p>With React Router, set the title when each page mounts:</p>
<pre><code>useEffect(() =&gt; { document.title = "Pricing · Your App"; }, []);</code></pre>
<p>React 19 also lets you render <code>&lt;title&gt;</code> directly inside a component. Note that search engines and preview bots read the initial HTML most reliably, so keep a good default in <code>index.html</code>.</p>
<p>While you're in <code>index.html</code>, also check the favicon link; the template points to <code>/vite.svg</code>.</p>`,
},
{
  slug: "how-to-write-a-meta-description",
  title: "How to write a meta description that gets clicks",
  description: "Your meta description is the grey text under your link in Google. Keep it 120–160 characters, say who it's for, and give a reason to click.",
  date: "2026-10-16", tags: ["seo"],
  html: `
<p>The meta description is the short text under your page's title in search results. Google sometimes rewrites it, but a good one is used most of the time.</p>
<pre><code>&lt;meta name="description" content="..."&gt;</code></pre>
<h2>A simple formula</h2>
<p><b>What it is + who it's for + why click.</b> For example: "Free invoice generator for freelancers. Make a clean PDF invoice in 30 seconds, no sign-up."</p>
<ul>
<li>Aim for 120–160 characters; longer gets cut off.</li>
<li>Write a different one for each important page.</li>
<li>Use the words people would search, naturally, once.</li>
<li>Skip filler like "Welcome to our website".</li>
</ul>`,
},
{
  slug: "robots-txt-and-sitemap-for-a-new-site",
  title: "robots.txt and sitemap.xml for a new site",
  description: "Copy-paste robots.txt and sitemap.xml for a new site, how to check you're not blocking Google, and where to submit your sitemap.",
  date: "2026-10-16", tags: ["seo"],
  html: `
<h2>robots.txt</h2>
<p>Put this at <code>https://yoursite.com/robots.txt</code>:</p>
<pre><code>User-agent: *
Allow: /
Sitemap: https://yoursite.com/sitemap.xml</code></pre>
<p>Watch out for <code>Disallow: /</code> under <code>User-agent: *</code>. That blocks all search engines and often gets left over from staging. Also check for <code>&lt;meta name="robots" content="noindex"&gt;</code> in your page head.</p>
<h2>sitemap.xml</h2>
<pre><code>&lt;?xml version="1.0" encoding="UTF-8"?&gt;
&lt;urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"&gt;
  &lt;url&gt;&lt;loc&gt;https://yoursite.com/&lt;/loc&gt;&lt;/url&gt;
  &lt;url&gt;&lt;loc&gt;https://yoursite.com/pricing&lt;/loc&gt;&lt;/url&gt;
&lt;/urlset&gt;</code></pre>
<p>List every public page. Next.js can generate this for you with an <code>app/sitemap.js</code> file.</p>
<h2>Submit it</h2>
<p>Add your site to Google Search Console, verify it, and submit the sitemap URL. Bing Webmaster Tools can import from Search Console.</p>`,
},
{
  slug: "security-headers-on-vercel-and-netlify",
  title: "How to add security headers on Vercel and Netlify",
  description: "Add HSTS, nosniff and clickjacking protection to a Vercel or Netlify site with one config file. Copy-paste examples for both.",
  date: "2026-10-16", tags: ["security", "vercel", "netlify", "headers"],
  html: `
<p>Three headers cover the basics for most sites:</p>
<ul>
<li><code>Strict-Transport-Security</code>: always use HTTPS</li>
<li><code>X-Content-Type-Options: nosniff</code>: don't guess file types</li>
<li><code>X-Frame-Options: DENY</code>: don't allow your site inside other sites' frames</li>
</ul>
<h2>Vercel: vercel.json</h2>
<pre><code>{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "DENY" }
    ]
  }]
}</code></pre>
<h2>Netlify: public/_headers</h2>
<pre><code>/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY</code></pre>
<h2>Next.js (any host)</h2>
<pre><code>// next.config.js
module.exports = {
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
    ]}];
  },
};</code></pre>
<p>Next step after these: a <a href="/guides/content-security-policy-for-beginners">Content Security Policy</a>.</p>`,
},
{
  slug: "content-security-policy-for-beginners",
  title: "Content Security Policy for beginners",
  description: "A Content Security Policy limits which scripts can run on your site. Start in report-only mode, fix what it flags, then enforce it.",
  date: "2026-10-16", tags: ["security", "headers"],
  html: `
<p>A Content Security Policy (CSP) is a response header that tells the browser which sources of scripts, styles, images and connections your site allows. If an attacker manages to inject a script, the CSP can stop it from running.</p>
<h2>Start in report-only mode</h2>
<p>A strict policy can break your site, so begin with a header that only reports:</p>
<pre><code>Content-Security-Policy-Report-Only: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'</code></pre>
<p>Open your site with DevTools → Console. Each violation tells you which source it would have blocked.</p>
<h2>Allow what you actually use</h2>
<p>Add the domains you rely on, such as your analytics, fonts, payment provider and API:</p>
<pre><code>script-src 'self' https://js.stripe.com;
connect-src 'self' https://api.yourbackend.com;
font-src https://fonts.gstatic.com;</code></pre>
<h2>Then enforce it</h2>
<p>Once the console is clean, rename the header to <code>Content-Security-Policy</code>. Add <code>frame-ancestors 'none'</code> to also block clickjacking.</p>`,
},
{
  slug: "never-call-ai-apis-from-the-browser",
  title: "Why you should never call OpenAI or Claude from the browser",
  description: "Calling an AI API straight from your frontend puts your key in every visitor's hands. Here's the safe pattern and a minimal server example.",
  date: "2026-10-16", tags: ["openai", "anthropic", "keys", "ai"],
  html: `
<p>It's the most common leak in AI-built apps: the app calls <code>api.openai.com</code> or <code>api.anthropic.com</code> directly from the browser, so the API key has to be in the browser too. Anyone can open DevTools, copy it, and use it on your bill.</p>
<h2>The safe pattern</h2>
<p>Browser → <b>your server</b> → AI provider. Your server holds the key, checks the request, and forwards it.</p>
<h2>Minimal example (Cloudflare Worker)</h2>
<pre><code>export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Not found", { status: 404 });
    const { message } = await request.json();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "YOUR_MODEL",
        max_tokens: 500,
        messages: [{ role: "user", content: message }],
      }),
    });
    return new Response(res.body, { headers: { "content-type": "application/json" } });
  },
};</code></pre>
<h2>Then protect your endpoint</h2>
<ul>
<li>Require sign-in, or at least rate-limit by IP.</li>
<li>Cap <code>max_tokens</code> and message length on the server.</li>
<li>Set a monthly spending limit in your provider's console.</li>
</ul>`,
},
{
  slug: "favicon-not-showing",
  title: "Favicon not showing? How to add one that works everywhere",
  description: "Add a favicon that shows in browser tabs, bookmarks and phone home screens: an SVG or ICO, an apple-touch-icon, and the right link tags.",
  date: "2026-10-16", tags: ["seo", "polish"],
  html: `
<p>A blank tab icon makes a site look unfinished. Here's a setup that covers modern browsers and phones.</p>
<h2>Files</h2>
<ul>
<li><code>favicon.ico</code> (32×32) in your site root, for older browsers and some tools</li>
<li><code>icon.svg</code>, which stays sharp at any size</li>
<li><code>apple-touch-icon.png</code> (180×180), for iPhone home screens</li>
</ul>
<h2>Tags in &lt;head&gt;</h2>
<pre><code>&lt;link rel="icon" href="/favicon.ico" sizes="32x32"&gt;
&lt;link rel="icon" href="/icon.svg" type="image/svg+xml"&gt;
&lt;link rel="apple-touch-icon" href="/apple-touch-icon.png"&gt;</code></pre>
<h2>Still not showing?</h2>
<ul>
<li>Browsers cache favicons hard. Try a private window.</li>
<li>Make sure the files are in your build output (in Vite, put them in <code>public/</code>).</li>
<li>Next.js App Router: put <code>icon.png</code> or <code>favicon.ico</code> in the <code>app/</code> folder and it's wired up automatically.</li>
</ul>`,
},
];

export function findGuide(slug) { return GUIDES.find((g) => g.slug === slug) || null; }

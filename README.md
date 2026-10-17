# Preflight

Check your site before you ship it. Paste a URL, get a launch checklist: leaked API keys, exposed `.env` and `.git`, link previews, SEO basics, security headers, broken links and bundle size.

- **Free:** score, grade and pass/fail for every check.
- **Owner-only (free):** leaked-key, `.env` and `.git` checks, unlocked by adding a verification tag. Non-owners never see whether a site leaks keys.
- **Paid ($7, one-time):** step-by-step fixes tailored to the detected stack (Next.js, Vite, Supabase, Vercel, Netlify) and the full list of broken links.

Runs as a single Cloudflare Worker with one KV namespace. Payments use a Stripe Payment Link.

## Deploy

1. **Cloudflare KV:** Storage & Databases → KV → Create namespace named `SCANS`. Put its ID in `wrangler.toml` (`id = "…"`).
2. **Worker:** Workers & Pages → Create → Import a repository → pick this repo. Deploy.
3. **Stripe product:** create a one-time $7 product, then a Payment Link for it.
   - After payment → "Don't show confirmation page" → redirect to
     `https://<your-worker-domain>/paid?session_id={CHECKOUT_SESSION_ID}`
   - Put the Payment Link URL in `wrangler.toml` as `STRIPE_PAYMENT_LINK`.
4. **Stripe key (secret):** create a *restricted* key with **Checkout Sessions: Read** only. In Cloudflare → your Worker → Settings → Variables and Secrets → add `STRIPE_SECRET_KEY` as a **Secret**. Never commit it or paste it in chat.

## Local development

```
npm install
npx wrangler dev        # .dev.vars sets ALLOW_LOCAL=1 and DEV_UNLOCK=1 for testing
```

`fixtures/bad` and `fixtures/good` are test sites (`python3 -m http.server 8791` / `8788`). `fixtures/bad` contains fake, randomly generated keys for testing the detector.

## Routes

| Route | What it does |
|---|---|
| `GET /` | App |
| `POST /api/scan` | `{url}` → runs a scan (10 per IP per hour) |
| `GET /api/scan/:id` | Re-open a report (kept 30 days) |
| `POST /api/verify/:id` | Checks the owner's meta tag or `/.well-known/preflight-verify.txt` |
| `GET /checkout/:id` | Redirects to Stripe with the report ID attached |
| `GET /paid?session_id=` | Confirms payment with Stripe, unlocks the report |

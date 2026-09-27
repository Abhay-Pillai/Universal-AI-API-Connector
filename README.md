# AI API Hub

A central hub for creating reusable, AI-powered API endpoints. An admin defines a
connector's name, provider/model, prompt, input fields, and output schema; the hub
then exposes it as a real HTTP endpoint (`POST /api/connectors/<slug>`), auto-generates
documentation for it, and logs every request with usage stats.

Built with Node.js + Express + SQLite (better-sqlite3), a plain HTML/CSS/JS admin
dashboard (no build step), and a provider-adapter architecture so new AI providers
can be added without touching the rest of the system.

## 1. Get free AI provider API keys

You need at least one of these (both are supported out of the box; the assignment
requires demonstrating 2+ providers, so get both):

- **Groq** (free, very fast, text models): go to https://console.groq.com/keys →
  sign up → "Create API Key". Groq's free tier gives generous daily request limits
  on models like `llama-3.3-70b-versatile`.
- **Google Gemini** (free, supports image/vision input): go to
  https://aistudio.google.com/apikey → sign in with Google → "Create API key".
  Gemini's free tier is what powers the image-based connector demo (e.g. a
  business-card/invoice scanner), since Groq's free models are text-only.

Both are genuinely free developer keys — no credit card required for the free tier
at the time of writing. Keep them secret; they only ever go in your server's `.env`
file, never in the browser or in this repo.

## 2. Local setup

Requirements: Node.js 18+ (for built-in `fetch`).

```bash
cd api-hub
npm install
```

Edit `.env`:

```
PORT=3000
JWT_SECRET=<any long random string>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<pick a real password>
GROQ_API_KEY=<your groq key>
GEMINI_API_KEY=<your gemini key>
```

Run it:

```bash
npm start
```

Open http://localhost:3000 and log in with the admin credentials from `.env`.

## 3. Creating your first two connectors (for the required demo)

**Connector A — image → structured JSON (uses Gemini, vision):**
- Provider: Gemini, model: `gemini-2.0-flash`
- Input field: `image` (type `image`, required)
- System prompt: "You are a business card extraction system. Extract the
  person's name, company, designation, phone, email and website from the
  supplied image. Return only valid JSON matching the configured output
  structure."
- Output schema: `name: string`, `company: string`, `designation: string`,
  `phone: string`, `email: string`, `website: string`

**Connector B — text → structured JSON (uses Groq, text):**
- Provider: Groq, model: `llama-3.3-70b-versatile`
- Input fields: `topic` (text, required), `word_count` (number, optional,
  default 300), `tone` (text, optional, default "professional")
- System prompt: "You are an article-writing assistant. Write a well
  structured article on the given topic, matching the requested tone and
  approximate word count. Return only valid JSON matching the configured
  output structure."
- Output schema: `title: string`, `body: string`, `word_count: number`

After saving each connector, use the **Test API** tab to try it right from the
dashboard, then check the **Documentation** tab for the ready-to-copy `curl`
example and endpoint URL, and **Stats & Logs** to see usage recorded.

## 4. Architecture (brief)

```
server.js                  Express app entry point, mounts routers, error handling
src/db.js                  SQLite schema (connectors, logs) via better-sqlite3
src/auth.js                Admin login via signed JWT cookie (admin dashboard only)
src/config/providers.js    Registry of supported AI providers + their env var + default models
src/providers/*.js         One adapter per provider (generate(), listModels()) - provider-adapter pattern
src/routes/admin.js        Admin-only API: login, connector CRUD, test-run, stats, model refresh
src/routes/connectors.js   The generated public endpoints: POST /api/connectors/:slug + public docs
src/routes/docsBuilder.js  Builds the documentation object shared by admin + public docs views
src/utils/promptBuilder.js Combines a connector's system prompt + submitted inputs + output-schema instruction
src/utils/validate.js      Input validation, output JSON parsing/repair, schema-shape checks
src/utils/cost.js          Rough per-1K-token cost estimate for the stats dashboard
public/                    Static admin dashboard (login, dashboard, editor, connector detail/test/docs/stats)
```

Design notes:
- **Provider keys never leave the server.** The admin UI only lets you pick a
  *provider name* (e.g. "Gemini") and a model; the actual API key is read from
  that provider's environment variable at request time. Keys are never stored
  in the database, never returned in any API response, and never sent to the
  browser.
- **Each connector gets its own generated `api_key`** (shown once, regenerable),
  which external callers must send as `x-api-key` to use `POST /api/connectors/:slug`.
  This is separate from the admin login and from the provider keys.
- **Adding a new AI provider** = create `src/providers/<name>.js` exporting
  `generate()` and `listModels()`, then add one entry to
  `src/config/providers.js`. Nothing else in the app needs to change.
- Failed AI calls, unparseable AI responses, timeouts (30s), and invalid input
  are all caught, logged as failed requests, and returned to the caller as a
  generic, non-leaking error message — raw stack traces are never exposed.

## 5. Security checklist

- [x] Provider API keys live only in server environment variables
- [x] Admin dashboard requires login (JWT httpOnly cookie)
- [x] Each generated endpoint requires its own `x-api-key`
- [x] Public documentation never reveals the real `x-api-key`
- [x] Uploaded images/files capped at 8MB
- [x] Generic error responses to external callers (no stack traces)
- [ ] For production beyond a class assignment, also add: rate limiting per
      API key, hashing the stored connector `api_key` instead of storing it in
      plain text, and HTTPS-only cookies (already toggled on when
      `NODE_ENV=production`).


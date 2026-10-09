# Deployment notes

The API runs on **Render Free** (testing, preview and portfolio; not a
production SLA). No paid AI provider is chosen yet (Phase 5c). The deployment
is created and started by the project owner in the Render dashboard; nothing
deploys automatically.

## Render Free: what to expect

- The service **sleeps after about 15 minutes without requests**. The first
  request after sleep wakes it up and can take up to a minute. The app shows
  "the server is waking up" and waits up to 90 seconds.
- Monthly free limits apply (instance hours, build minutes, bandwidth). One
  service fits in the free instance hours.
- No payment card is needed for the free plan. Never choose a paid plan here.
- `render.yaml` sets `autoDeployTrigger: 'off'`: a push to `main` does not
  deploy. Deploys are started manually ("Manual Deploy").
- The workspace uses `node-linker=hoisted` (needed by Expo), so the build
  installs the whole workspace; only `@ai-mentor/shared` and the API are built
  and run.

## Create the service (once, from a phone)

1. Open <https://render.com> and sign up with **GitHub**. If Render asks for a
   payment card, stop: the plan is then not free for this account.
2. Dashboard → **New** → **Blueprint** → connect the
   `ai-mentor-mobile` repository → branch `main`. Render reads `render.yaml`
   and shows one web service, `ai-mentor-api`, on the **Free** plan in
   **Frankfurt**.
3. Render asks for the values marked `sync: false`. Enter them in Render only
   (never in GitHub, never in chat):

   | Variable                    | Value                                                                    |
   | --------------------------- | ------------------------------------------------------------------------ |
   | `SUPABASE_URL`              | Supabase → Project Settings → API → Project URL                          |
   | `SUPABASE_PUBLISHABLE_KEY`  | Supabase → Project Settings → API → publishable key (`sb_publishable_…`) |
   | `GEMINI_API_KEY`            | the key from Google AI Studio (secret)                                   |
   | `AI_MODEL`                  | the model id that passed the "AI smoke test", e.g. `gemini-3.7-flash`    |
   | `AI_REAL_PROVIDER_USER_IDS` | your own user id: Supabase → Authentication → Users → your account       |

4. **Apply**. The first build takes a few minutes. When the service is live,
   copy its address (`https://ai-mentor-api-….onrender.com`).
5. GitHub → Settings → Secrets and variables → Actions → **Variables** → add
   `EXPO_PUBLIC_API_URL` = that address (a public address, not a secret).
6. GitHub → Actions → **API live check** → Run workflow. The summary must show
   HTTP **200** from `/health`.
7. GitHub → Actions → **Android preview APK** → Run workflow, then install the
   new APK. The chat now talks to the API.

Later deploys: Render → `ai-mentor-api` → **Manual Deploy** → Deploy latest
commit.

## Runtime requirements

- Node.js 22 (`NODE_VERSION` in `render.yaml`, `.nvmrc` locally).
- Build: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @ai-mentor/api build`.
  `pnpm install` also builds `@ai-mentor/shared` (its `prepare` script).
- Start: `node apps/api/dist/server.js`. The server listens on `PORT` (set by
  Render) and `HOST=0.0.0.0`.
- Health check: `GET /health` (no auth, no internal details).
- Graceful shutdown: on `SIGTERM` the server stops accepting connections and
  gives open requests up to 10 seconds.
- `TRUST_PROXY=1`: Render puts one proxy in front of the service, so client IPs
  (per-IP rate limit) are read from it correctly.
- One instance. Rate limits are kept in memory: before running more than one
  instance, move them to a shared store (for example Redis).
- Logs: JSON lines on stdout. Tokens, keys, chat messages and history are never
  logged.

## Configuration rules

- All variables from `apps/api/.env.example`. Secrets only in the Render
  dashboard and, for the manual smoke test, the `GEMINI_API_KEY` GitHub
  **secret**. Never in the mobile app, in `EXPO_PUBLIC_*` variables, in GitHub
  variables or in logs.
- `NODE_ENV=production` refuses `AI_PROVIDER=mock`.
- While the provider runs on a **free tier**, keep `AI_REAL_PROVIDER_USER_IDS`
  limited to the developers' own accounts: free-tier requests may be used and
  reviewed by the provider. Everyone else gets the mock (the app marks those
  answers as "Demo answer"). Open AI to real users only on a paid tier.
- The service role key is not needed: data is read with the user's own token
  (RLS) and usage is recorded through `record_my_ai_usage()`.

## Checklist

- [x] Provider abstraction with a real adapter (Gemini, free tier, testing only).
- [x] `subscriptions`, `usage_counters` and `plan_limits` with RLS; limits
      enforced on the server; `USAGE_LIMIT_REACHED` with quota details.
- [x] Host without a payment card: Render Free (`render.yaml`).
- [x] `EXPO_PUBLIC_API_URL` in the mobile app and the APK workflow.
- [ ] Create the Render service and pass "API live check" (owner).
- [ ] Check on a phone: real answers for your account, demo answers for a
      second account, quota, limit screen, wake-up after sleep.
- [ ] Choose the paid provider for real users after a blind quality test,
      then widen access (Phase 5c).
- [ ] When `conversations` exists, check that `conversationId` belongs to the
      user (RLS) before reading or writing messages.
- [ ] Review rate limits and timeouts against the provider's real latency.

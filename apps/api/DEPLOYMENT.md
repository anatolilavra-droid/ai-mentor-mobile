# Deployment notes (for Phase 5)

Phase 4 does not deploy the API and does not choose a hosting provider or an
AI provider. These notes list what the deployment must provide, so the choice
in Phase 5 can be checked against them.

## Runtime requirements

- Node.js 22 (`.nvmrc`), started with `pnpm --filter @ai-mentor/api build`
  then `node apps/api/dist/server.js`.
- One instance is enough at first. Rate limits are kept in memory: before
  running more than one instance, move them to a shared store (for example Redis).
- HTTPS terminated by the platform. Set `TRUST_PROXY` to the number of proxies
  in front of the server so client IPs are read correctly; leave it at `0`
  otherwise.
- Region close to the Supabase project (Frankfurt, eu-central-1).
- Health check: `GET /health` (no auth, no internal details).
- Logs: JSON lines on stdout. Keep the platform's log retention short.
- Graceful shutdown: the server stops on `SIGTERM` and gives open requests up
  to 10 seconds.

## Configuration

- All variables from `apps/api/.env.example`, set in the platform's secret
  store, never committed.
- `NODE_ENV=production` refuses `AI_PROVIDER=mock`: a real provider must be
  configured before production.
- `AI_API_KEY` (added with the first real provider) lives only on the server.
  It must never appear in the mobile app, in `EXPO_PUBLIC_*` variables, in CI
  logs or in GitHub variables used by the APK build.
- Do not add the Supabase `service_role` key unless a feature truly needs it
  (for example writing usage counters); prefer `security definer` functions.

## Checklist before the first deployment

- [ ] Choose and add the real AI provider adapter behind `AIProvider`
      (wrap its errors in `AIProviderError`, honour the abort signal).
- [ ] Add `subscriptions` and `usage_counters` with RLS and replace
      `noopUsageGuard` with a database-backed guard (plan from the database only).
- [ ] Decide the Free limits on the server (30 chat messages and 10 code
      reviews per month per CLAUDE.md) and return `USAGE_LIMIT_REACHED`.
- [ ] When `conversations` exists, check that `conversationId` belongs to the
      user (RLS) before reading or writing messages.
- [ ] Add `EXPO_PUBLIC_API_URL` to the mobile app and the APK workflow variables.
- [ ] Run a live smoke test against the real Supabase project: valid token,
      missing token, another user's data not readable.
- [ ] Review rate limits and timeouts against the provider's real latency.

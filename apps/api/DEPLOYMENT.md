# Deployment notes

The API is not deployed yet (Phase 5b) and no paid AI provider is chosen
(Phase 5c). These notes list what the deployment must provide, so the choices
can be checked against them.

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
- AI keys (`GEMINI_API_KEY` today) live only on the server and in the
  `GEMINI_API_KEY` GitHub **secret** used by the manual smoke test. They must
  never appear in the mobile app, in `EXPO_PUBLIC_*` variables, in logs or in
  GitHub variables.
- While the provider runs on a **free tier**, keep `AI_REAL_PROVIDER_USER_IDS`
  limited to the developers' own accounts: free-tier requests may be used and
  reviewed by the provider. Open AI to real users only on a paid tier.
- The service role key is not needed: usage is recorded through
  `record_my_ai_usage()`, which runs as the calling user.

## Checklist before the first deployment

- [x] Provider abstraction with a real adapter (Gemini, free tier, testing only).
- [x] `subscriptions`, `usage_counters` and `plan_limits` with RLS; limits
      enforced on the server; `USAGE_LIMIT_REACHED` with quota details.
- [ ] Choose a host that needs no payment card, or add payment (Phase 5b).
- [ ] Choose the paid provider for real users after a blind quality test,
      then widen access (Phase 5c).
- [ ] When `conversations` exists, check that `conversationId` belongs to the
      user (RLS) before reading or writing messages.
- [ ] Add `EXPO_PUBLIC_API_URL` to the mobile app and the APK workflow variables.
- [ ] Run a live smoke test against the real Supabase project: valid token,
      missing token, another user's data not readable.
- [ ] Review rate limits and timeouts against the provider's real latency.

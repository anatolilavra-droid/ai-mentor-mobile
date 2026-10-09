# AI Mentor API

The backend for AI Mentor Mobile. It verifies the user's Supabase session,
validates every request with Zod, checks usage, builds a versioned prompt,
calls an AI provider and validates the answer before returning it.

Phase 4 runs with a **mock AI provider** only: no external AI API is called
and no AI key exists anywhere. A real provider and hosting arrive in Phase 5
(see [`DEPLOYMENT.md`](DEPLOYMENT.md)).

## Run locally

```bash
cp apps/api/.env.example apps/api/.env   # fill SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
pnpm install
pnpm api                                 # = pnpm --filter @ai-mentor/api dev
```

Other scripts (from the repository root):

```bash
pnpm --filter @ai-mentor/api test        # Vitest + Supertest, no network needed
pnpm --filter @ai-mentor/api typecheck
pnpm --filter @ai-mentor/api lint
pnpm --filter @ai-mentor/api build       # compiles to apps/api/dist
pnpm --filter @ai-mentor/api start       # runs the compiled server
```

`.env` is ignored by Git. Never put the Supabase `service_role` key, the JWT
secret or a real AI key in `.env.example` or in code.

## Endpoints

| Method | Path           | Auth | Description                                    |
| ------ | -------------- | ---- | ---------------------------------------------- |
| GET    | `/health`      | no   | Liveness: `{ status, version, uptimeSeconds }` |
| GET    | `/api/me`      | yes  | The signed-in user's own profile (via RLS)     |
| POST   | `/api/ai/chat` | yes  | AI mentor answer (mock provider in Phase 4)    |

Authenticated requests send `Authorization: Bearer <Supabase access token>`.

### POST /api/ai/chat

Request:

```json
{
  "message": "What is a closure?",
  "conversationId": "optional UUID",
  "context": { "technology": "javascript", "level": "junior", "learningGoal": "learn_javascript" }
}
```

- `message`: 1 to 10 000 characters after trimming.
- `context` fields are optional hints for this answer only (enums and a
  technology slug). Missing fields come from the profile. They never affect
  plan, limits or access.
- Unknown fields are rejected.

Response:

```json
{
  "answer": "…",
  "provider": "mock",
  "promptVersion": "chat/v1",
  "requestId": "…",
  "usage": { "inputTokens": 120, "outputTokens": 40, "quota": null }
}
```

`usage.quota` stays `null` until usage counters exist (Phase 5).

### Errors

Every error has the same shape and carries the request id (also returned in
the `X-Request-Id` header):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "The request is invalid.", "requestId": "…" } }
```

`details` (field path and message) is added only for `VALIDATION_ERROR`.

| Code                     | HTTP |
| ------------------------ | ---- |
| `VALIDATION_ERROR`       | 400  |
| `UNAUTHORIZED`           | 401  |
| `FORBIDDEN`              | 403  |
| `NOT_FOUND`              | 404  |
| `PROFILE_NOT_FOUND`      | 404  |
| `PAYLOAD_TOO_LARGE`      | 413  |
| `UNSUPPORTED_MEDIA_TYPE` | 415  |
| `RATE_LIMITED`           | 429  |
| `USAGE_LIMIT_REACHED`    | 429  |
| `INTERNAL_ERROR`         | 500  |
| `AI_PROVIDER_ERROR`      | 502  |
| `AI_INVALID_RESPONSE`    | 502  |
| `SERVICE_UNAVAILABLE`    | 503  |
| `TIMEOUT`                | 504  |

## How it works

```
helmet → request id + log → abort signal → request timeout → per-IP limit → JSON body (64 KB)
→ auth (Supabase JWT via JWKS) → per-user AI limit → Zod validation
→ usage check → learner context (profile via RLS) → prompt (chat/v1)
→ AI provider (with AI timeout) → Zod check of the answer → usage record → response
```

- **Auth**: tokens are verified locally against the project's public JWKS
  (`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`). Only ES256 (the project's
  ECC P-256 key), issuer `<SUPABASE_URL>/auth/v1`, audience `authenticated`,
  role `authenticated`. No JWT secret or service key is used. A token stays
  valid until it expires (about an hour) even after sign-out.
- **Data access**: `/api/me` and the chat context read `profiles` with a
  per-request Supabase client that uses the publishable key and the user's
  own token, so Row Level Security applies. The client never sends a user id.
- **Request id**: a well-formed incoming `X-Request-Id` is reused; otherwise a
  UUID is created. It appears in the response header, error bodies and logs.
- **Logs**: JSON lines from pino (pretty in development). Headers, bodies,
  tokens, chat messages and code are never logged.
- **Rate limits**: a generous per-IP limit on every route and a strict
  per-user limit on AI routes. Both are in memory (one instance).
- **Timeouts**: JWKS and Supabase 5 s, AI call `AI_TIMEOUT_MS`, whole request
  `REQUEST_TIMEOUT_MS`. A timeout or a client disconnect aborts the AI call.
- **Prompts**: `src/prompts/<feature>/v<N>.ts`. A published version is never
  edited: changes go into a new version and `src/prompts/registry.ts` points to
  it. User text is passed as delimited data, never inside the system prompt.
- **No code execution**: user code is data only. ESLint forbids `eval`,
  `new Function`, `vm`, `child_process` and `worker_threads`.

## Environment

See [`.env.example`](.env.example). The environment is validated at start-up;
the server exits and names the invalid variables (never their values).
`EXPO_PUBLIC_*` variables are refused, and the mock provider is refused when
`NODE_ENV=production`.

## Structure

```
src/
  server.ts      start-up, graceful shutdown
  app.ts         createApp(deps): every dependency injected (tests need no network)
  config/        environment schema
  auth/          TokenVerifier + JWKS verifier
  middleware/    request id, logging, abort signal, timeout, auth, rate limits, validation, errors
  lib/           logger, typed routes, per-user Supabase client
  routes/        route definitions
  controllers/   HTTP ↔ service mapping
  services/      profile, usage guard, AI service and providers
  prompts/       versioned prompts
  schemas/       Zod contracts
test/            Vitest + Supertest, with a local JWKS and an RLS-emulating Supabase fake
```

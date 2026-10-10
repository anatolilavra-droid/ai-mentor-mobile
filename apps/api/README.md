# AI Mentor API

The backend for AI Mentor Mobile. It verifies the user's Supabase session,
validates every request with Zod, checks usage, builds a versioned prompt,
calls an AI provider and validates the answer before returning it.

The default provider is a **mock**: no external AI API is called and no key
is needed. **Gemini** (free tier) can be switched on for testing only: it
answers only the user ids in `AI_REAL_PROVIDER_USER_IDS`, everyone else keeps
the mock, because free-tier requests may be used by Google. A paid provider
and hosting come later (see [`DEPLOYMENT.md`](DEPLOYMENT.md)).

Monthly AI limits (Free / Pro) are enforced on the server from the database.

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

| Method | Path                  | Auth | Description                                          |
| ------ | --------------------- | ---- | ---------------------------------------------------- |
| GET    | `/health`             | no   | Liveness: `{ status, version, uptimeSeconds }`       |
| GET    | `/api/me`             | yes  | The signed-in user's own profile (via RLS)           |
| GET    | `/api/usage`          | yes  | Own plan, period and monthly usage per feature       |
| GET    | `/api/subscription`   | yes  | Own plan and status (no row means Free)              |
| POST   | `/api/ai/chat`        | yes  | AI mentor answer (mock, or Gemini for allowed users) |
| POST   | `/api/ai/code-review` | yes  | Structured review of pasted code (never executed)    |

Authenticated requests send `Authorization: Bearer <Supabase access token>`.

### POST /api/ai/chat

Request:

```json
{
  "message": "Explain it simpler",
  "history": [
    { "role": "user", "content": "What is a closure?" },
    { "role": "assistant", "content": "A closure keeps variables alive…" }
  ],
  "conversationId": "optional UUID (not used yet)",
  "context": { "technology": "javascript", "level": "junior", "learningGoal": "learn_javascript" }
}
```

- `message`: 1 to 10 000 characters after trimming.
- `history`: optional earlier turns of the current conversation (at most 40
  items and 60 000 characters). The server keeps only the most recent ones
  that fit the configured limits (see Conversation memory). Nothing is stored.
- `context` fields are optional hints for this answer only (enums and a
  technology catalog id). Missing fields come from the profile and onboarding.
  They never affect plan, limits or access.
- Unknown fields are rejected. All contracts live in `@ai-mentor/shared`.

Response:

```json
{
  "answer": "…",
  "provider": "mock",
  "promptVersion": "chat/v2",
  "requestId": "…",
  "usage": {
    "inputTokens": 120,
    "outputTokens": 40,
    "quota": { "used": 3, "limit": 30, "period": "month" }
  },
  "context": { "historyUsed": 2, "historyDropped": 0 }
}
```

`provider` is `"gemini"` for users in `AI_REAL_PROVIDER_USER_IDS` when Gemini is on.
`usage.quota` is the monthly quota after this answer. Only successful answers
are counted.

### POST /api/ai/code-review

Request:

```json
{ "language": "javascript", "action": "fix", "code": "function add(a, b) {\n  a + b;\n}" }
```

- `language`: `javascript`, `typescript`, `html`, `css`, `python`, `json`.
- `action`: `explain` (step by step), `review` (find problems), `fix`
  (corrected code), `improve` (cleaner code, same behaviour).
- `code`: line endings are normalized to `\n`; it is rejected when it is empty,
  longer than `MAX_CODE_REVIEW_CHARS` (8 000) characters, longer than
  `MAX_CODE_REVIEW_LINES` (400) lines, or contains a NUL character.
  `checkCodeInput()` from `@ai-mentor/shared` is the single check, used by the
  app (live counters, disabled button) and by this schema (source of truth).
  Each failed rule becomes a `details` item `{ "path": "code", "message": "tooManyLines" }`
  with a stable key: `empty`, `tooManyChars`, `tooManyLines`, `invalidCharacters`.

Response (prompt `code-review/v2`, validated with Zod, then normalized by
`finalizeReview()`: issues ordered error → warning → info, line numbers
outside the code dropped, only the parts the action uses kept):

```json
{
  "review": {
    "summary": "…",
    "steps": ["explain only"],
    "issues": [
      {
        "severity": "error",
        "category": "bug",
        "line": 2,
        "title": "…",
        "explanation": "…",
        "suggestion": "…"
      }
    ],
    "fixedCode": "fix / improve only",
    "changes": ["…"],
    "nextStep": "…",
    "confidence": "high"
  },
  "provider": "gemini",
  "promptVersion": "code-review/v2",
  "requestId": "…",
  "input": { "language": "javascript", "action": "fix", "chars": 34, "lines": 3 },
  "usage": {
    "inputTokens": 400,
    "outputTokens": 300,
    "quota": { "used": 4, "limit": 10, "period": "month" }
  }
}
```

The code itself is never returned or logged (logs keep language, action,
chars and lines). Only successful reviews count against the monthly
`code_review` quota.

### GET /api/usage

```json
{
  "plan": "free",
  "period": { "start": "2026-10-01", "end": "2026-11-01" },
  "features": { "chat": { "used": 3, "limit": 30 }, "code_review": { "used": 0, "limit": 10 } }
}
```

### GET /api/subscription

```json
{ "plan": "free", "status": "active" }
```

A canceled subscription reports `plan: "free"`, the limits it actually gets.

### Errors

Every error has the same shape and carries the request id (also returned in
the `X-Request-Id` header):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "The request is invalid.", "requestId": "…" } }
```

`details` (field path and message) is added only for `VALIDATION_ERROR`.
`USAGE_LIMIT_REACHED` adds `quota`:
`{ "feature": "chat", "used": 30, "limit": 30, "resetsAt": "2026-11-01T00:00:00.000Z" }`.

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
- **Timeouts**: JWKS and Supabase 5 s; AI call `AI_TIMEOUT_MS` (chat, 30 s) or
  `CODE_REVIEW_AI_TIMEOUT_MS` (code review, 50 s); whole request
  `REQUEST_TIMEOUT_MS` (60 s, must be greater than both AI timeouts). A
  timeout or a client disconnect aborts the provider request (504 `TIMEOUT`),
  and nothing is counted against the quota.
- **Usage and plans**: before an AI call the API reads the caller's quota with
  `get_my_ai_quotas()`; after a successful answer it calls
  `record_my_ai_usage()`. Both run as the user (no service key) and touch only
  that user's counters. If the quota cannot be read, the request fails with
  503 instead of allowing unlimited use. Concurrent requests from one user can
  exceed the limit by one or two (bounded by the per-user rate limit).
- **Providers**: `src/services/ai/providers/`. `mock` needs nothing; `gemini`
  uses the official `@google/genai` SDK with the key from the environment, no
  automatic retries, and maps errors to provider-neutral kinds. Users outside
  `AI_REAL_PROVIDER_USER_IDS` always get the mock.
- **Conversation memory** (`src/services/ai/chatContext.ts`):
  `buildChatContext()` combines the learner context (level, goal, answer
  language, daily minutes and onboarding technologies — never the name or the
  free-text goal details) with the trimmed history.
  `trimConversationHistory()` (from `@ai-mentor/shared`, also used by the app)
  keeps the last `CHAT_HISTORY_MAX_MESSAGES` (12) messages within
  `CHAT_CONTEXT_MAX_CHARS` (24 000), shortens older messages longer than
  `CHAT_HISTORY_MESSAGE_MAX_CHARS` (4 000) and never starts with a mentor
  turn. `estimateContextSize()` logs the approximate token count. The system
  prompt and learner context are always kept; history is never placed in the
  system prompt. A summary of dropped messages may come later.
- **Prompts**: `src/prompts/<feature>/v<N>.ts`. A published version is never
  edited: changes go into a new version and `src/prompts/registry.ts` points to
  it. User text is passed as delimited data, never inside the system prompt.
  Chat uses `chat/v2` (history + onboarding context); `chat/v1` stays unchanged.
  Code review uses `code-review/v2` (four actions, categories, steps, changes,
  confidence; the code is sent in `<learner_code language="…">` with any
  closing tag inside it neutralized); `code-review/v1` stays unchanged.
- **No code execution**: user code is data only. ESLint forbids `eval`,
  `new Function`, `vm`, `child_process` and `worker_threads`.

## Environment

See [`.env.example`](.env.example). The environment is validated at start-up;
the server exits and names the invalid variables (never their values).
`EXPO_PUBLIC_*` variables are refused, and the mock provider is refused when
`NODE_ENV=production`. `AI_PROVIDER=gemini` requires `GEMINI_API_KEY` and `AI_MODEL`.

## AI smoke test (from a phone)

GitHub → Actions → **AI smoke test** → Run workflow:

1. Once: add the repository **secret** `GEMINI_API_KEY` (Settings → Secrets
   and variables → Actions → Secrets). Never a variable, never in chat.
2. Run with an empty `model`: the run summary lists the model ids the key can use.
3. Run again with one id: the summary shows a real answer to a fixed question
   and a schema-checked code review for each action (explain, review, fix,
   improve) of one fixed sample, with latency and token counts.

Only fixed sample content is sent. The key is never printed.

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

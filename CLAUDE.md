# AI Mentor Mobile

## Project ownership

Project founder, product owner, product architect, and lead developer:

Anatoliy

Claude Code is an AI coding assistant working under Anatoliy's direction.

Claude Code is not:
- founder;
- co-founder;
- product owner;
- project owner;
- human contributor;
- team member;
- decision-maker.

Do not add Claude, Anthropic, or any AI identity to Contributors.
Do not add Co-authored-by trailers for Claude or Anthropic.
Do not describe Claude as an independent creator of the product.

Anatoliy owns:
- the product idea;
- product direction;
- architecture decisions;
- implementation decisions;
- code review;
- testing decisions;
- security decisions;
- deployment decisions;
- release decisions;
- repository ownership.

## Product overview

AI Mentor Mobile is a premium freemium mobile AI learning platform
for beginner and junior developers.

The application helps users:
- learn programming;
- ask an AI mentor questions;
- understand programming concepts;
- review and improve code;
- generate personalized learning plans;
- complete learning tasks;
- manage personal coding projects;
- save notes and useful AI answers;
- track learning progress.

## Product problem

Beginner developers often struggle to:
- understand what to learn next;
- interpret programming errors;
- receive explanations at the right level;
- organize personal learning projects;
- save useful explanations;
- maintain consistent learning progress.

AI Mentor Mobile combines these workflows in one mobile-first product.

## Target users

Primary users:
- beginner developers;
- junior web developers;
- self-taught programmers;
- people learning JavaScript, TypeScript, React, Node.js, and Python;
- users who prefer simple explanations and step-by-step guidance;
- users who want to learn from a mobile device.

## Product value proposition

AI Mentor Mobile gives developers a personal learning companion
that explains code clearly, creates practical learning plans, helps
organize projects, and guides the user toward the next concrete step.

## Initial MVP

The first version should include:

- premium mobile shell;
- onboarding placeholder;
- Home screen;
- AI Chat placeholder;
- Learn placeholder;
- Projects placeholder;
- Profile screen;
- shared design system;
- loading states;
- empty states;
- error states;
- safe-area handling;
- accessible touch targets;
- dark-first visual direction.

The first version must be small, stable, and polished.
Do not implement every planned feature at once.

## Planned core features

### AI chat

The user can:
- ask programming questions;
- request simpler explanations;
- request examples;
- request exercises;
- request step-by-step guidance;
- save useful answers as notes.

### Code review

The user can:
- paste code;
- select a programming language;
- ask for an explanation;
- ask for a fix;
- ask for an improvement;
- receive a structured review;
- save the result.

Supported languages:
- JavaScript;
- TypeScript;
- HTML;
- CSS;
- Python;
- JSON.

### Learning plans

The user can specify:
- technology;
- current level;
- learning goal;
- available minutes per day;
- desired duration.

The AI can generate:
- learning modules;
- daily tasks;
- exercises;
- mini-projects;
- review questions;
- next steps.

### Projects

The user can manage:
- project name;
- description;
- status;
- technologies;
- tasks;
- progress;
- GitHub URL;
- notes;
- next recommended action.

Project statuses:
- idea;
- in progress;
- completed;
- archived.

### Notes

The user can:
- create notes;
- edit notes;
- delete notes;
- search notes;
- use tags;
- save AI answers as notes.

## Freemium model

The application must support Free and future Pro plans.

### Free plan

The Free plan should include:
- one active learning plan;
- maximum three projects;
- maximum twenty notes;
- thirty AI chat messages per month;
- ten code reviews per month;
- basic learning plan generation;
- basic statistics;
- standard support.

### Pro plan

The Pro plan should include:
- unlimited learning plans;
- unlimited projects;
- unlimited notes;
- higher AI usage limits;
- advanced code review;
- larger code input;
- advanced project breakdown;
- GitHub integration;
- export features;
- advanced statistics;
- priority AI processing;
- no advertising.

Monetization rules:
- Free limits must be enforced on the backend.
- Never trust plan information sent by the mobile client.
- Store subscription and usage data in the database.
- Track usage by user and billing period.
- Return typed errors when a limit is reached.
- Show a clear upgrade screen.
- Do not implement real payments before the core MVP is stable.
- Use a mock Pro mode during development.
- Keep all limits configurable on the server.

## Visual direction

The interface should look premium, modern, distinctive,
and suitable for an Awwwards or Behance case study.

Design concept:

"Quiet confidence for developers."

The product should feel:
- premium;
- calm;
- editorial;
- technical but human;
- creative but usable;
- polished;
- intentional;
- above a generic SaaS dashboard.

Visual direction:
- dark-first;
- deep graphite background;
- warm off-white typography;
- restrained electric violet or acid-lime accent;
- subtle atmospheric glow;
- refined borders;
- layered surfaces;
- generous negative space;
- strong visual hierarchy;
- expressive but controlled typography;
- purposeful motion.

Do not use:
- generic dashboard layouts;
- random gradients;
- excessive glassmorphism;
- crowded card grids;
- excessive rounded rectangles;
- emoji as primary icons;
- inconsistent icon styles;
- decorative elements that reduce usability;
- copied designs from specific websites;
- visual effects without a product purpose.

## Design system

Create centralized design tokens for:
- colors;
- typography;
- font sizes;
- font weights;
- line heights;
- spacing;
- radii;
- borders;
- shadows;
- opacity;
- animations;
- elevation;
- safe-area values.

Use semantic color names:
- background.primary;
- background.secondary;
- surface.default;
- surface.elevated;
- text.primary;
- text.secondary;
- text.muted;
- accent.primary;
- accent.secondary;
- status.success;
- status.warning;
- status.error;
- border.subtle.

Use an 8-point spacing system.

Every major screen must have:
- one clear primary action;
- clear hierarchy;
- loading state;
- empty state;
- error state;
- success feedback where appropriate;
- keyboard-safe layout;
- accessible labels;
- responsive behavior;
- dark-theme support.

## Mobile UX

The application must:
- be designed mobile-first;
- work on small Android screens;
- support one-handed use;
- respect safe areas;
- keep primary actions near the thumb zone;
- use readable text;
- avoid overcrowded layouts;
- support keyboard appearance and dismissal;
- provide clear feedback after actions;
- avoid unnecessary animations;
- support reduced-motion preferences where possible.

## Technology stack

Mobile:
- React Native;
- Expo;
- TypeScript;
- Expo Router.

Data and authentication:
- Supabase Auth;
- Supabase PostgreSQL;
- Row Level Security.

Backend:
- Node.js;
- Express;
- typed REST API;
- AI gateway.

Validation:
- Zod for request validation;
- Zod for response validation;
- Zod for structured AI output;
- Zod for environment validation.

State:
- TanStack Query for server state;
- Zustand only for local UI state.

Forms:
- React Hook Form;
- Zod resolver.

Testing:
- Jest — mobile;
- React Native Testing Library — mobile;
- Vitest — API;
- Supertest — API integration tests, if HTTP-level testing is needed;
- E2E tests later.

TypeScript strict everywhere. All checks run through the workspace scripts
(pnpm format:check, lint, typecheck, test).

## Architecture rules

Use feature-based architecture.

Recommended structure:

```
apps/
  mobile/
    app/
    components/
    features/
    hooks/
    lib/
    stores/
    types/
    constants/
  api/
    src/
      routes/
      controllers/
      services/
      middleware/
      prompts/
      schemas/
      types/

packages/
  shared/
    types/
    validation/

supabase/
  migrations/
  seed.sql

docs/
  product-spec.md
  architecture.md
  security.md
  api.md
  roadmap.md
```

Keep business logic outside screen components.
Keep components small and reusable.
Use TypeScript strict mode.
Avoid any unless absolutely necessary.
Prefer explicit types over implicit assumptions.
Do not duplicate validation rules unnecessarily.

## AI architecture

The mobile client must never contain AI provider API keys.

Correct request flow:

Mobile app
→ authenticated backend API
→ request validation
→ plan and usage check
→ AI service
→ provider adapter
→ structured response validation
→ mobile app

Create an AI provider abstraction:

```ts
interface AIProvider {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  reviewCode(input: CodeReviewInput): Promise<CodeReviewResult>;
}
```

AI prompts must be stored separately from controllers.
Prompts must be versioned.

Recommended prompt structure:

```
prompts/
  chat/
    v1.ts
  code-review/
    v1.ts
  learning-plan/
    v1.ts
  project-breakdown/
    v1.ts
```

AI must:
- adapt to the user's level;
- explain concepts simply;
- use step-by-step guidance;
- provide short examples;
- separate explanation from code;
- avoid claiming code was executed unless it was executed;
- suggest a practical next step;
- state uncertainty when appropriate.

Never execute arbitrary user code on the backend.

## Security rules

- Never expose AI API keys in the mobile application.
- Validate authenticated sessions on the backend.
- Use Row Level Security for user-owned data.
- Validate every external request with Zod.
- Validate AI responses before returning them.
- Add rate limiting to AI endpoints.
- Limit message size and code size.
- Add timeouts to AI requests.
- Handle provider errors safely.
- Do not log secrets.
- Do not log passwords or tokens.
- Avoid logging full private user content.
- Never trust subscription information from the client.
- Never execute arbitrary user code on the backend.
- Keep secrets in environment variables.
- Never commit .env files.

## API rules

Use typed API responses.

Use a consistent error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Safe user-facing message",
    "requestId": "request-id"
  }
}
```

Recommended endpoints:

```
GET  /health
POST /api/ai/chat
POST /api/ai/code-review
POST /api/ai/learning-plan
POST /api/ai/project-breakdown
GET  /api/usage
GET  /api/subscription
```

All endpoints must:
- authenticate where required;
- validate input;
- handle errors;
- return typed responses;
- avoid leaking implementation details.

## Database rules

User-owned tables must include a user_id where appropriate.

Recommended tables:
- profiles;
- technologies;
- user_technologies;
- learning_goals;
- learning_tasks;
- projects;
- notes;
- conversations;
- messages;
- subscriptions;
- usage_counters.

Every user-owned table must have appropriate Row Level Security policies.

## Development workflow

Before implementation:
1. Read CLAUDE.md.
2. Inspect the current repository.
3. Identify the current phase.
4. Explain the implementation plan.
5. List files to be changed.
6. Identify risks.
7. Wait for Anatoliy's confirmation when the task is substantial.

During implementation:
- implement only the approved scope;
- make small changes;
- keep the application runnable;
- avoid unrelated refactoring;
- follow the design system;
- preserve accessibility;
- handle loading, empty, and error states.

After implementation:
1. Run TypeScript checks.
2. Run lint.
3. Run tests if available.
4. Review the diff.
5. Report changed files.
6. Report commands and results.
7. Report remaining issues.
8. Stop and wait for the next instruction.

## Git and GitHub rules

Anatoliy controls GitHub.

Never:
- run git push automatically;
- create a Pull Request automatically;
- commit without explicit permission;
- add Claude or Anthropic as a contributor;
- add Co-authored-by for Claude or Anthropic;
- rewrite history;
- force push;
- delete branches;
- change the remote URL without permission.

Before any Git operation, explain what will happen.

Only run commit or push after Anatoliy explicitly writes:
- "разрешаю commit"; or
- "разрешаю push".

## Current development phase

Phase 1: Mobile Foundation — completed.

Phase 2: Authentication and User Profile — completed (approved by Anatoliy).
Verified on a physical Android device: sign up, sign in, sign out, session
restoration after restart, profile setup and profile editing.
supabase/tests/rls_profiles.sql passes (run during the Phase 4 review).
Still to verify on a device: the password reset flow.

Phase 3: Onboarding and Personalization — completed (approved by Anatoliy).
Verified on a physical Android device: the full onboarding flow, step
validation, draft restore after closing the app, editing from the summary,
saving to profiles and user_technologies, skip and "Finish setup",
"Personalize your mentor" and the three-field Edit profile.
supabase/tests/rls_onboarding.sql passes.

Interface translations (after Phase 3): the interface is available in
English, Russian and German. English (en.json) is the source; ru.json and
de.json must keep exactly the same keys and placeholders
(__tests__/i18n.test.ts checks this). The saved ui_language is applied
after saving; signed-out screens follow the device language.

Phase 4: AI Backend Foundation — completed (approved by Anatoliy).
apps/api: Express 5 + TypeScript strict. GET /health, GET /api/me and
POST /api/ai/chat with a mock AI provider. Verified by Vitest + Supertest in
the "API checks" GitHub workflow (green); not deployed.

Phase 4 rules (keep them):
- Supabase access tokens are verified locally with the project's public
  JWKS (the project uses an ECC P-256 signing key): ES256 only, issuer
  <SUPABASE_URL>/auth/v1, audience and role "authenticated". Never add the
  JWT secret to the backend.
- User data is read with a per-request Supabase client built from the
  publishable key and the user's own token, so RLS applies. The service role
  key is not used. Endpoints never take a user id from the client.
- Phase 4 uses only the mock AI provider: no real AI keys, no external AI
  API, no hosting choice. The API refuses AI_PROVIDER=mock in production.
- Prompts are versioned in apps/api/src/prompts/<feature>/v<N>.ts; a
  published version is never edited.
- apps/api/DEPLOYMENT.md lists what later phases must decide and provide.

Phase 5 is split because there is no payment method yet:
- 5a: server-side Free/Pro limits and a Gemini free-tier adapter for testing;
- 5b: hosting without a payment card and the real chat screen in the app;
- 5c: a paid AI provider and opening AI to real users.

Phase 5a: AI usage limits and Gemini (testing) — completed (approved by
Anatoliy). The migration is applied and supabase/tests/rls_usage.sql passes
in the real database. The manual "AI smoke test" passed on real Gemini
(chat and the schema-checked code review); the requested gemini-3.7-flash was
served as gemini-3.8-flash, and the API logs the model that answered.
Observed latency: chat about 9 s, code review about 17 s (AI timeout 30 s).
- plan_limits, subscriptions and usage_counters with RLS
  (supabase/migrations/20261020000000_ai_usage.sql, tests/rls_usage.sql).
  Free: 30 chat + 10 code reviews per month; Pro: 500 + 200 (placeholders,
  changed in plan_limits without a release). Pro is set manually (mock Pro).
- The API reads the quota with get_my_ai_quotas() and counts only successful
  answers with record_my_ai_usage(); both run as the user, no service role.
  If the quota cannot be read, AI requests fail closed (503).
- GET /api/usage and GET /api/subscription return only the caller's data.
- AI_PROVIDER=mock (default) or gemini. The Gemini free tier may use requests
  to improve Google products, so only AI_REAL_PROVIDER_USER_IDS (Anatoliy's
  own account) reach Gemini; everyone else gets the mock. Never widen this
  list on a free tier.
- GEMINI_API_KEY lives only in env / the GitHub secret of the manual
  "AI smoke test" workflow. The model id comes from that workflow's listing,
  never guessed.

Phase 5b: hosting and the chat screen — implemented, waiting for Anatoliy's
review and the on-device check.
- packages/shared (@ai-mentor/shared): platform-neutral Zod schemas, types
  and constants used by apps/api and apps/mobile (enums and limits, chat
  request/response, error format, plans and usage, trimConversationHistory).
  No Node, React Native, env or server-only code; built to dist by `prepare`.
  Never duplicate these schemas in an app.
- Chat uses prompt chat/v2 with a short history: buildChatContext() in
  apps/api/src/services/ai/chatContext.ts keeps the last
  CHAT_HISTORY_MAX_MESSAGES (12) messages within CHAT_CONTEXT_MAX_CHARS
  (24 000) and adds profile/onboarding context (level, goal, language,
  minutes, technologies; never the name or free-text goal details).
  Nothing is stored; conversations live in app memory only.
- The app renders answers with its own small Markdown subset
  (features/chat/markdown): Text and View only, no HTML, https links only
  after a confirmation, size limits, copy button on code blocks.
- render.yaml: Render Free, Frankfurt, autoDeployTrigger off, secrets as
  `sync: false`. The deployment is created and started by Anatoliy only.
  EXPO_PUBLIC_API_URL (public) points the app to the API.

Next phase: not defined yet — wait for Anatoliy's instructions.

Phase 3 scope (for reference):

Goal: collect onboarding answers for future AI mentor personalization.

Implement only:
- an onboarding flow: name, experience level, one main learning goal,
  optional goal details, daily minutes, 1 to 8 technologies, interface
  language, and a summary screen;
- a progress indicator, back navigation and a skip option;
- a local draft saved after every step (answers and current step),
  restored after the app is closed, cleared only after a successful save;
- one atomic save to Supabase with Retry on failure;
- the technologies catalog and user_technologies, with RLS;
- onboarding_completed on profiles;
- "Personalize your mentor" in Profile, reopening onboarding with the
  current answers (level, goal, goal details, technologies);
- Edit profile limited to display_name, ui_language and daily_minutes.

Rules:
- primary goal: exactly one of learn_javascript, build_web_apps,
  prepare_for_job, improve_fundamentals, learn_react, personal_projects;
- custom_goal_details: optional, 0 to 500 characters, stored separately;
- daily_minutes: 5 to 480, quick picks 15, 30, 45 and 60;
- technologies: 1 to 8, no duplicates;
- ui_language is saved; in Phase 3 the interface stayed English only
  (ru/de translations were added after Phase 3).

Do not implement in Phase 3:
- AI API;
- learning plan generation;
- payments;
- GitHub integration;
- push notifications.

Definition of done for Phase 3:
- a new user completes onboarding and the answers are in profiles and
  user_technologies;
- validation blocks invalid answers with clear messages;
- closing the app mid-flow keeps the answers and resumes at the same step;
- a failed save keeps the draft and offers Retry;
- skipping works and onboarding can be finished later;
- "Personalize your mentor" loads and saves the current answers;
- supabase/tests/rls_onboarding.sql passes;
- TypeScript checks, lint and tests pass;
- the preview APK is checked on a physical Android device;
- the diff is reviewed and Anatoliy approves the result.

Phase 2 scope (for reference):
- Supabase Auth with email and password;
- sign up, sign in, sign out;
- forgot password and password reset;
- secure session persistence and restoration on Android;
- protected routes;
- the profiles table with Row Level Security;
- profile setup and profile editing;
- Zod validation for auth and profile forms;
- loading, error and success states for every auth and profile flow;
- an Android preview APK built by GitHub Actions (manual trigger, not published).

Profile fields:
- display_name;
- experience_level: beginner, junior, middle, advanced;
- learning_goal;
- daily_minutes: integer from 5 to 480;
- ui_language: ru, en, de;
- created_at;
- updated_at.

Do not implement yet:
- AI API;
- payments;
- GitHub integration;
- push notifications;
- Express backend;
- Google Play publishing;
- production deployment.

## Definition of done for Phase 2

Phase 2 is complete only when:
- a new user can sign up, sign in and sign out;
- a user can request a password reset and set a new password;
- the session survives an app restart on a physical Android device;
- signed-out users cannot reach protected screens;
- a new user completes profile setup before reaching the tabs;
- a user can edit their profile and see the change immediately;
- profiles has Row Level Security and the RLS test script passes;
- Zod validation shows clear, field-level messages;
- no secrets, service keys or .env files are committed;
- the preview APK builds in GitHub Actions and installs on Android;
- TypeScript checks pass;
- lint passes;
- tests pass;
- the diff is reviewed;
- Anatoliy approves the result.

## Founder attribution

README wording:

> AI Mentor Mobile is founded and maintained by Anatoliy.
> Claude Code was used as an AI coding assistant for implementation support,
> debugging, refactoring, documentation, and testing guidance.
> Product ownership, architecture decisions, review, and release responsibility
> belong to Anatoliy.

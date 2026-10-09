# @ai-mentor/shared

Platform-neutral schemas, types and constants used by both `apps/api` and
`apps/mobile`: profile and onboarding enums and limits, the chat contract
(request, response, history trimming), the API error format, plans and usage.

Rules:

- No Node, React Native, Expo, Supabase or provider code; no environment access.
- No secrets and nothing server-only (HTTP statuses, database rows, prompts stay
  in `apps/api`; forms and translated messages stay in `apps/mobile`).
- Compiled to `dist/` by `tsc` on `pnpm install` (`prepare`) and `pnpm build`.

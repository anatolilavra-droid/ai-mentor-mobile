# AI Mentor Mobile

A premium, dark-first mobile AI mentor for beginner and junior developers:
learn programming, understand errors, review code, follow a personal
learning plan, and keep projects and useful answers in one place.

> **Status:** Phase 1 — Mobile Foundation. The app shell, navigation and
> design system are in place. AI, accounts, data sync and payments are
> intentionally not implemented yet.

## Tech stack

- React Native + Expo (SDK 57) + TypeScript (strict)
- Expo Router (file-based navigation, custom bottom tab bar)
- Reanimated (purposeful motion, respects reduced motion)
- i18next (English UI, ready for more languages)
- Zustand (local UI state only)
- Jest + React Native Testing Library

## Repository structure

```
apps/
  mobile/
    app/          routes only (Expo Router)
    components/   ui primitives, layout, states, feedback, navigation
    constants/    design tokens, theme, fonts, tab config
    features/     home, learn, chat, projects, profile
    hooks/        shared hooks
    lib/          i18n, theme provider, haptics, helpers
    stores/       Zustand stores (local UI state)
    types/        shared types
    __tests__/    unit and screen tests
```

## Requirements

- Node.js 22 (see `.nvmrc`)
- pnpm (enable with `corepack enable`)
- Expo Go on an Android phone (Google Play), updated to the latest version

## Getting started

```bash
corepack enable
pnpm install
pnpm mobile
```

Scan the QR code with Expo Go. Phone and computer must be on the same Wi-Fi.

Other connection options:

```bash
# Different networks / restricted Wi-Fi
pnpm --filter @ai-mentor/mobile start --tunnel

# USB (Android, USB debugging enabled)
adb reverse tcp:8081 tcp:8081
pnpm --filter @ai-mentor/mobile start --localhost  # then press "a"
```

## Quality checks

```bash
pnpm typecheck      # TypeScript
pnpm lint           # ESLint (expo lint)
pnpm test           # Jest
pnpm format:check   # Prettier
pnpm check          # all of the above
```

## Design system

All visual values live in `apps/mobile/constants/tokens/` — colors
(semantic names), typography, 8-point spacing, radii, borders, shadows,
opacity, motion, elevation and safe-area values. Components never use
hard-coded colors or sizes.

## Ownership

AI Mentor Mobile is founded and maintained by Anatoliy.
Claude Code was used as an AI coding assistant for implementation support,
debugging, refactoring, documentation, and testing guidance.
Product ownership, architecture decisions, review, and release responsibility
belong to Anatoliy.

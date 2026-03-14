# AGENTS.md

## Project

Forex chart history analysis app — React + TypeScript + Vite.

## Stack

- React 19, TypeScript, Vite
- TanStack Router / React Query
- Zustand (state management)
- lightweight-charts (charting)
- Tailwind CSS v4
- Biome (lint + format)

## Conventions

- Biome handles all linting and formatting. No ESLint/Prettier.
- Run `npm run lint:fix` to auto-fix. Run `npm run lint` to check.
- a11y rules (noSvgWithoutTitle, noStaticElementInteractions, useKeyWithClickEvents) are disabled in biome.json — this is a personal-use app, no accessibility requirements.
- Do NOT use `biome-ignore` inline suppressions. If a rule is noisy, disable it in biome.json under `linter.rules`.
- Do NOT add aria attributes unless explicitly asked.
- Single quotes, no semicolons, 2-space indent, 100 char line width.
- Path alias `@/` maps to `src/`.
- Auto-generated files: `src/routeTree.gen.ts` — do not edit or lint.

## Data Fetching

- Yahoo Finance API via proxy (`/api/yahoo` in dev).
- Fetch data only when a currency pair is selected, not all pairs at once.
- React Query handles caching and polling (30s interval).

## Structure

```
src/
  components/    # React components (chart/, layout/, sidebar/)
  config/        # Static config (pairs, constants)
  hooks/         # Custom React hooks
  lib/           # Pure utility functions (indicators, yahoo-finance)
  routes/        # TanStack Router file-based routes
  store/         # Zustand stores
  types/         # TypeScript type definitions
```

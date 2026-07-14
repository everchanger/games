# games

First playable web POC for the candy-factory duel in this repository.

Scope and rules source of truth:
- `/GAME_DESIGN_DOCUMENT.md`
- `/plan.md`
- `/RULES_SPEC_V1.md`
- `/GAME_TEST_PLAN.md`

## Stack
- Vite + React + TypeScript
- Framework-agnostic gameplay domain in `src/game`
- Local persistence in `src/data`

## Local development
```bash
npm install
npm run dev
```

## Tests
Gameplay/domain tests run with Vitest and are required in CI:
```bash
npm test
```

## Lint
```bash
npm run lint
```

## Build
```bash
npm run build
```

## Deployment
GitHub Pages workflow: `.github/workflows/pages.yml`

Behavior:
1. install dependencies
2. lint
3. run gameplay tests
4. build
5. deploy only on `main` push if verification passes

For GitHub Pages repo site path, Vite base is configured to `/games/` in Actions.

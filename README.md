# Async System Duel POC

This repository contains a playable first web prototype for the async two-player game described in [`GAME_DESIGN_DOCUMENT.md`](/GAME_DESIGN_DOCUMENT.md).

## What the POC includes

- compact shared four-stage system
- builder vs saboteur roles with asymmetric action budgets
- hidden action submission and delayed resolution
- deterministic symptom-based resolution summaries
- local browser persistence so multiple matches can be mocked for playtesting
- GitHub Pages deployment workflow

## How to run locally

Requirements:

- Node.js 22+
- npm 10+

Install and start the app:

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run lint
npm run build
npm run preview
```

## How the prototype works

- Builder acts first each exchange with a budget of 4.
- Saboteur responds with a budget of 3.
- Exact hidden actions are not revealed to the other side.
- Once both sides have acted, the system resolves and only outcome symptoms are shown.
- Builder wins at 100 output.
- Saboteur wins at 0 output.

Use the **View as Builder / View as Saboteur** toggle to test both sides locally.

## Persistence choice

This first slice intentionally uses `localStorage` only.

Why:

- works on GitHub Pages with no backend setup
- keeps iteration fast for the gameplay loop
- is enough to validate the hidden-turn structure and resolution model

To support real async playtests later, replace the local storage layer with a hosted match store plus authentication/session identity. Firebase, Supabase, or a similar managed backend would fit well because the app is already structured around serializable match state and discrete turn submission.

## GitHub Pages deployment

The repository includes a workflow at `.github/workflows/deploy-pages.yml`.

Suggested setup:

1. Enable **GitHub Pages** for the repository.
2. Set the source to **GitHub Actions**.
3. Push to `main` (or run the workflow manually).

The Vite base path is configured automatically for the `everchanger/games` Pages path.

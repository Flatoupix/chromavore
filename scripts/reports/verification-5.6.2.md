# v5.6.2 — Singularity test streak

Verified on 2026-10-04 in an isolated Chromium profile; all nonlocal requests were intercepted.

During active play, **F3** adds 50 to the current kill streak. At ×200, the game enters its existing five-second Singularity introduction and full-board destruction wave, then starts the usual ×64 form. F3 marks the run as a test so it cannot update personal records or submit a leaderboard result. Held or repeated keydown events do not repeat the boost.

Validation: `npm test` passed all 24 personal-record and discovery checks, and `npm run build` passed TypeScript and Vite. Focused browser checks exercise both modes, increments below and at the threshold, the actual cinematic, pause handling, destruction and kill accounting, record exclusion, and the desktop and mobile guide.

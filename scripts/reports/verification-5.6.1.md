# v5.6.1 — Singularity shortcut verification

Verified on 2026-10-04 in an isolated Chromium profile, with all nonlocal requests intercepted.

Press **F3** during active gameplay in either mode to start a 30-second ×64 Singularity. The shortcut reuses the existing debug action and marks the run as a test, excluding its final score from personal records and leaderboard submissions. Repeated or held presses cannot cancel or extend an active Singularity.

- `npm test`: 24 existing personal-record and discovery checks passed.
- `npm run build`: TypeScript and production build passed.
- `git diff --check`: passed.
- Browser verification: 30 checks passed, with no runtime errors.

Browser checks covered both game modes, repeat/held keys, release and reactivation, inactive game states, spell sequences, cleanup waves, cinematic introductions, modals, text fields, modified shortcuts, input suppression, paused duration, expiry through the real update loop, and exclusion from records and leaderboard submission. The game loop was advanced explicitly for deterministic timer checks; keyboard events used Playwright's keyboard API.

The new guide card was inspected on desktop and at 375 × 667, with no overflow in its text or the mobile page. The Singularity discovery card also explains F3 and the test-run behavior. Test artifacts remain under the ignored `output/playwright/` directory.

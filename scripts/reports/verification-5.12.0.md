# v5.12.0 — Arcade HUD

Verified on 2026-10-05 in an isolated Chromium session. Browser fixtures intercepted every nonlocal request and did not access the user's profile.

The chosen HUD is implemented directly in Canvas: bitmap gold score, cyan stage badge, streak and lives, segmented Singularity gauge, outlined spell tiles with real availability and cooldowns, Chrono and Dash controls, and a magenta progression footer. Score values below one million use full numbers; larger scores use the existing compact formatter. Chrono capacity includes Chromamancer's tank upgrades.

Chromavore displays EMP and Nitro with no mana or XP. Chromamancer displays all five sequence spells with mana availability/costs and account level, XP and skill points. Rendering does not spend resources or change cooldowns, game time or saved profile data. The arena stays 21×22 or 39×22 cells of 28 pixels; reserved header/footer space makes the canvas 588×844 or 1092×844. Viewport scaling remains uniform. The bonus arena reserves the command deck space while keeping its phase/countdown header; boss health and temporary-effect indicators retain their existing displays.

- `npm run build`: TypeScript and Vite production build passed.
- `npm test`: all 27 existing checks passed (10 personal records, 17 discovery/input/persistence checks).
- Browser: 19 checks passed. Covered both arena dimensions, two/five spell lists, absence of arcade mana/XP, real cooldowns and Singularity progress, no rendering side effects, low mana, active Singularity, extra lives, locked thresholds, whole-canvas fitting and uniform scaling at 1024×768, 1440×810, 375×667 and 844×390, pause/resume, double-Shift arcade EMP without mana cost, discovery library access, no runtime errors, text bounds with large career counts and boss health visibility.
- `git diff --check`: passed.

Screenshots were visually inspected for compact/wide play, Chromamancer, mobile portrait/landscape, Instructions, the bonus arena and the boss. The touch controls were enabled for an additional mobile layout screenshot. These local artifacts are in the ignored `output/playwright/` directory; physical touch hardware and gamepads were not exercised.

The deterministic browser fixture freezes automatic game updates, uses a profile at 420 career kills for compact play and 2,140 for wide play, then advances the real update explicitly for pause/resume. Spell entry is exercised through actual keyboard events. Saved profile, resources, time and cooldown values are compared before/after repeated HUD rendering. Canvas text measurements are checked against the actual canvas bounds for both modes and up to one million career kills.

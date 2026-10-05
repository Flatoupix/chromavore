# v5.12.1 — God Mode pellets and matching spell cards

Verified on 2026-10-05 using an isolated Chromium profile with all nonlocal requests intercepted.

The command deck replaces the large Chrono gauge with God Mode progress. It reads the actual combo counter, using the game's existing 120/210 thresholds for compact/wide arenas. Power pellets keep their existing four-point contribution. During x32 God Mode the gauge shows its remaining 15-second countdown; Singularity remains a separate gauge above the arena. Chrono remains functional and appears as a small Shift energy/state readout. No collection, combo expiry, activation or spell rules changed.

Double-Shift entry now shares the gameplay deck's panel fill, borders, vector icons, colours and short spell names. The sequence slots, remaining entry time, prefix/alternate hints, cooldowns, mana costs and unknown/locked states are retained. Two arcade cards or five Chromamancer cards fit in the arena; compact Chromamancer uses two card rows. The stage bitmap is positioned using its rendered width rather than the width reserved for it, and is vertically centered within its frame.

- `npm run build`: TypeScript and production build passed.
- `npm test`: 27 existing checks passed (10 personal-record and 17 discovery/input/persistence checks).
- Browser: 23 checks passed with no runtime errors. Verified real pellet collection, power-pellet contribution, God Mode activation at both thresholds, combo expiry/reset, separate Singularity display, small Chrono display, exact stage bitmap centering at stages 01/04/10, rendering without save/resource mutations, double-Shift freeze and alternate EMP casting without arcade mana cost, two/five cards, Chromamancer costs, cooldown/low-mana/unknown cards, and whole-canvas/card fitting at 1024×768, 1440×810, 375×667 and 844×390.
- `git diff --check`: passed.

Visual screenshots of normal/God Mode HUDs and the arcade/Chromamancer sequence layouts were inspected. Local screenshots and the deterministic fixture are under ignored `output/playwright/`. Tests freeze automatic game updates, call the real collection/update methods explicitly and exercise double Shift with real keyboard events. Physical touch hardware and gamepads were not exercised.

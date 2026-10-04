# v5.7.0 — Discovery frequency and shared spell entry

Verified on 2026-10-04. Browser checks used an isolated Chromium profile and intercepted every nonlocal request.

Automatic discoveries now cover first encounters only. Variant V2/V3/etc. and skill ranks above 1 never queue an automatic card. Shared skill families recognize previous discoveries in either mode, including old bare combo IDs and already-viewed upgrades. Existing save keys and card IDs are preserved; stale pending upgrades and duplicate families are removed. New cards adapt to the active mode when they share the same unlock.

Instructions now contains a Discovery Cards button, also opened with D or gamepad X. Unlocked variants and ranks remain available for manual review. Reviewing a previously unseen card records its shared history, so it will not later interrupt gameplay.

Both modes enter spells through double Shift: hold the second press, enter four directions and release to cast, or finish the four-second entry window. Chromavore has EMP and Nitro without mana costs; Chromamancer retains five spells and mana costs. The guide shows only the current mode's spell list. Ordinary movement does not cast spells. Single-hold Chrono is preserved; touch and controller spell entry reuse their existing Chrono input. The same entry method works in the bonus arena with its existing EMP/Nitro effects.

- `npm test`: 27 checks passed (10 personal-record, 17 discovery/input/persistence checks); all 108 unlock/rank card descriptions remain valid.
- Browser: 19 checks passed, with no runtime errors. Covered legacy history, stale queues, upgrade suppression, shared mode history, pointer/keyboard library access, manual variant review, mobile overflow, spell-entry pause, ordinary movement, arcade casting, Chromamancer mana spending, cooldown rejection and the two/five spell lists.
- `npm run build`: TypeScript and Vite production build passed.
- `git diff --check`: passed.

The browser mana fixture removes nearby dots so EMP collection cannot replenish the tested spell cost. Gameplay updates were advanced explicitly for deterministic pause checks. Desktop sequence and mobile guide screenshots are stored under the ignored `output/playwright/` directory. Physical touch hardware and controllers were not exercised.

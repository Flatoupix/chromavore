# v5.6.0 verification — 3 October 2026

## Delivered behavior

- Nickname entry appears only when the final score strictly exceeds the previous personal record for the completed run's mode. The comparison precedes every record write. Known names are prefilled; laboratory and debug-assisted runs do not qualify. Kill-based leaderboard eligibility and ordering are preserved independently.
- One discovery composition covers career abilities and variants, all purchased Chromamancer ranks, basic pickups, bonus-arena capsules, and combo transformations. Each card has a game sprite, effect description, isolated animated scene, mode-correct controls, relevant costs/recharge, and immediate dismissal.
- The queue persists in the existing profile under `pendingDiscoveries`. Presented IDs retain the existing `discoveredSkills` storage and include mode/rank. Old bare combo IDs remain readable, including by the sequence guide. No save keys or skill IDs were renamed.
- Discoveries open at frame boundaries, after level-up cleanup and cinematic transitions. Chained cards keep input blocked continuously. Closing preserves the prior game state and waits for held keyboard/controller inputs to release.
- Arsenal cards replay their explanations. The **D / Pad X** button opens a selector covering unlocked discoveries and skill ranks. Arcade item cards retain **Try in Lab**. Reading an explanation again does not save or mutate progression.
- Player-facing French remnants were translated in HUD, locked-mode labels, transitions, item feedback, and dynamic statistics. Controls and stale skill descriptions were checked against current gameplay. Arcade Wiggle/Nitro movement recognition was restored; Shift sequences remain specific to Chromamancer.

## Verification results

| Check | Result |
| --- | --- |
| Production TypeScript/Vite build | Passed |
| Personal-record regression checks | 10 passed |
| Discovery/input/persistence contracts | 14 passed |
| Chromium interaction checks | 33 passed |
| Canvas copy audit | 377 distinct rendered labels; no French matches; no horizontal canvas overflow in audited screens |
| Visual review | Desktop card, 375 × 667 mobile card, reduced-motion before/result card, 15 effect-family scenes |
| Runtime errors in browser interaction suite | None |

The browser suite verifies real final-score handling, profile reload, an actual career kill crossing a threshold, keyboard skill purchases and rank upgrades, ordered queue behavior, cleanup-wave deferral, bonus-arena suspension, Arsenal replay, Lab access, input focus, held-key/controller suppression, small-screen fit, and reduced motion.

During an open card, snapshots of live player/enemy positions, effects, cooldowns, score, mana, Chrono energy, profile data and local storage remain identical while the preview canvas changes. Bonus-arena timers, ghosts, items and scores are checked separately. Replay is verified to leave both profile and pending queue unchanged.

All checks use isolated in-memory profiles or a named Playwright browser profile. Browser tests intercept every nonlocal request before loading the game; no test scores or profiles are sent to Firebase. Controller checks use simulated Gamepad API input; viewport checks run in Chromium rather than on physical devices.

## Preview-to-mechanic correspondence

| Scene | Gameplay implementation / demonstrated result |
| --- | --- |
| Wiggle EMP | `Game.executeSkillCombo` and arcade `input.checkKombos` callback: nearby ghosts are eliminated and dots collected. The current implementation is destructive, so the preview does not claim a surviving stun. |
| Nova | `SuperItemManager.activate`: maze-wide purge; basic/bonus capsules retain their separately described local radius. |
| Offensive Dash / Titan Breaker | `Player.triggerDash`: only intersected ghosts disappear; Titans freeze at lower skill ranks and are eliminated at rank 3; Dash V5 breaks interior walls. |
| Nitro | `InputManager.startSkillCooldown`, `updateCooldowns`, and `Game.update`: faster travel with a burning trail; only targets reached by the trail disappear. |
| Lasers | `SuperItemManager.update` and `Game.executeSkillCombo`: cardinal beams; diagonal beams only for the arcade laser V2 scene. Unhit ghosts remain. |
| Cryo | `SuperItemManager.activate/update` and `Game.checkCollisions`: ghosts freeze, then ordinary ghosts can shatter on contact. V2 extends freeze duration; no nonexistent delayed explosion is taught. |
| Force Field / Magnetic Core | `Game.update` suction logic: dots and vulnerable ghosts are collected; active ghosts remain alive and dangerous. |
| Aegis / Kinetic Bastion | `Game.checkCollisions`: barrier interaction freezes ghosts while they remain visible. No invented kill occurs. |
| Vortex / Black Hole | `SuperItemManager.update`: attraction followed by consumption at the center. Dot collection is shown only for the upgraded arcade black hole. |
| Power Pellet / Super Pellet | `PowerupManager.triggerPredator` and enemy spawn logic: existing ghosts flee; the super variant also frightens the later reinforcement. |
| Chrono / Time Warp | `Game.update` / `EnemyManager.update`: visible normal movement followed by slower movement; no ghost disappears. |
| Phase | `Player.triggerDash` / `Game.checkCollisions`: translucent protection while passing ghosts; rank 3 crosses a thin wall without depicting destruction. |
| Harvest / combo grace | `Game.onCollectDot` and experience getters: normal collection with persistent feedback; no invented magnetic pull or ghost removal. |
| God Mode / Singularity | `Game.triggerComboStep`, `triggerSingularitySequence`, collision/suction logic: contact devouring or nearby attraction; the separate Nova action shows its actual N/X control. |
| Bonus capsules | `Game.updateBonusStage`: local Nova, persistent black hole, cross beams, or a horizontal clearing wave, each with its own discovery ID. |

The preview uses only immutable card data, its own `requestAnimationFrame` time, the sprite atlas, and the existing static Chromavore drawing function. It never constructs a live player/enemy or invokes gameplay, sound, collection, achievement or persistence methods. Reduced-motion mode draws a static before/result pair. Dismissal never waits for an animation cycle.

## Reproduce

```sh
npm test
npm run build
```

For browser verification, start the development server at `http://127.0.0.1:5173`, then use a dedicated Playwright CLI session:

```sh
npx @playwright/cli --session discovery-verification open about:blank
npx @playwright/cli --session discovery-verification run-code "$(cat scripts/browser-discoveries.check.js)"
```

The browser suite creates screenshots in `output/playwright/`. Run it only in its dedicated session: it deliberately resets that session's local game profile. The production workflow now runs the isolated contract checks before building and deploying.

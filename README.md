# ⚡ CHROMAVORE

> **Devour the Light. Outrun the Shadows.**  
> Jeu d'arcade rétro-néon ultra-nerveux, moderne et addictif inspiré de Pac-Man.

[![Jouer en ligne](https://img.shields.io/badge/🎮%20JOUER%20EN%20LIGNE-GitHub%20Pages-00ffcc?style=for-the-badge)](https://flatoupix.github.io/chromavore/)
[![Architecture](https://img.shields.io/badge/Stack-Vite%20%2B%20TypeScript-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Version](https://img.shields.io/badge/Release-5.12.1-ff007f?style=for-the-badge)](https://github.com/Flatoupix/chromavore)

👉 **Accès direct au jeu :** **[https://flatoupix.github.io/chromavore/](https://flatoupix.github.io/chromavore/)**

---

## v5.12.1 — God Mode pellets and matching spell cards

The main resource gauge now tracks combo pellets towards God Mode: 120 on the compact arena and 210 on the wide arena. During God Mode it shows the remaining invincibility time. Singularity keeps its separate gauge; Chrono is reduced to a small Shift readout.

Double-Shift spell entry uses the gameplay HUD's panels, icons, colours and short spell names, with sequence hints and real cooldown/mana states. Stage numbers are centered using their actual bitmap width.

See the [verification report](scripts/reports/verification-5.12.1.md) for results.

## v5.12.0 — Arcade HUD

The approved neon HUD is now in the game: bitmap score, stage badge, kill streak, lives and a segmented Singularity gauge above the arena. Below it, spell tiles show availability and cooldowns alongside Chrono, Dash and progression towards the next unlock.

The compact 21×22 and wide 39×22 arenas retain square cells. Chromavore shows two spells without mana; Chromamancer shows five spells with mana costs and an account XP footer. Desktop 4:3 and 16:9 screens, mobile layouts, pause, bonus and boss displays were checked.

See the [verification report](scripts/reports/verification-5.12.0.md) for results.

## v5.7.0 — Fewer discovery interruptions and shared spell controls

Discovery pop-ups appear only for the first encounter with a skill family, shared between Chromavore and Chromamancer. Variants and higher ranks remain available for manual review. Existing discovery history is preserved.

Open **Instructions → Discovery Cards** (D or gamepad X) to browse unlocked cards, including upgrades. Both modes use **double-tap Shift**, hold the second press, enter four directions and release to cast. Chromavore offers EMP and Nitro without mana; Chromamancer offers five spells with mana costs. Ordinary movement no longer casts spells.

See the [verification report](scripts/reports/verification-5.7.0.md) for coverage and results.

## v5.6.2 — Singularity test progression

Press **F3** during gameplay to add 50 to your kill streak. At ×200, the normal Singularity introduction and destruction wave begin. This starts a test run, which is excluded from personal records and leaderboard submissions. Holding F3 or pressing it again while Singularity is active has no effect.

See the [verification report](scripts/reports/verification-5.6.2.md) for the browser checks and regression results.

## v5.6.1 — Direct Singularity shortcut

Press **F3** during gameplay to activate ×64 Singularity immediately for 30 seconds. This starts a test run, which is excluded from personal records and leaderboard submissions. Holding F3 or pressing it again while Singularity is active does not reset or cancel the effect.

## v5.6.0 — Discoveries and personal records

Mode-specific personal records, animated discovery cards, Arsenal replays, and English player-facing copy. See the [verification report](scripts/reports/verification-5.6.0.md) for coverage and reproduction steps. Run `npm test` for the isolated regression checks.

## 🏗️ Architecture Moderne (Vite + TypeScript)

Le projet a été entièrement modularisé et typé sous une architecture professionnelle découplée :

```text
chromavore/
├── index.html                 # Point d'entrée HTML5 responsive
├── package.json               # Scripts de build & dépendances
├── tsconfig.json              # Typage strict TypeScript ESNext
├── vite.config.ts             # Configuration du bundler pour GitHub Pages
├── .github/workflows/         # Déploiement continu CI/CD automatique
│   └── deploy.yml
└── src/
    ├── main.ts                # Orchestrateur du jeu & GameLoop
    ├── config/
    │   └── constants.ts       # Dimensions, couleurs néon, timings
    ├── audio/
    │   └── SoundManager.ts    # Synthétiseur procédural Web Audio
    ├── levels/
    │   └── levels.ts          # 10 labyrinthes, BFS pathfinding & cache offscreen
    ├── entities/
    │   ├── Player.ts          # Pac-Man, dash offensif, interpolation
    │   ├── Enemy.ts           # IA des fantômes (Stalker, Rusher, Orbiter, Phaser, Titan)
    │   └── Powerups.ts        # Power-ups, chrono & Relique du Vide
    ├── systems/
    │   ├── SuperItems.ts      # 5 Super-items avec protection anti-cumul
    │   ├── ParticleSystem.ts  # Système de particules bridé (anti-lag), popups & splats
    │   └── BadgeSystem.ts     # Succès & records en localStorage
    ├── graphics/
    │   └── Renderer.ts        # Pipeline de rendu Canvas & HUD
    └── ui/
        └── TouchDeck.ts       # D-Pad arcade, boutons tactiles & overlay mobile paysage
```

---

## 🌟 Modes de Jeu

### 1. 🕹️ Mode Classique (Survie Stratégique Multi-Niveaux)
- **10 labyrinthes distincts** avec leurs propres palettes néon, tunnels et topologies.
- **Progression linéaire :** Départ systématique au Niveau 1. Chaque vague terminée déclenche une transition vers le niveau suivant ; après le niveau 10, une nouvelle boucle accélère le jeu.

### 2. ⚡ Mode MADNESS (Chroma-Frenzy Carnage & Combat Rapide)
- **Pac-Man Mortel & Vulnérable :** Vous n'êtes PAS invincible ! Toucher une ombre sans attaquer vous coûte **1 vie et -4.0s sur le chrono**.
- **Le Dash Tranchant (Arme d'attaque offensive) :** Débloqué à **10 spectres de carrière**, il traverse et atomise une ligne de fantômes. Son cooldown en Madness est de **0.6s**.
- **Vitesse progressive :** Le mode Madness accélère avec l'éveil chromatique et l'arène 16:9.
- **Kombos Gestuels (Mouvements de combat arcade) :**
  - ⚡ **Wiggle (double Shift, maintenir le deuxième appui, `← → ← →`, relâcher Shift) :** Déclenche un **EMP Shockwave** qui désintègre les fantômes environnants et aspire tous les orbes à 5.5 cases !
  - 🔥 **Nitro Jet (double Shift, maintenir le deuxième appui, `↑ ↓ ↑ ↓`, relâcher Shift) :** Allume un propulseur de flammes derrière Pac-Man qui brûle toute ombre traversant son sillage.
- **Enjeu Critique — La Relique du Vide (`☠️ VOID CORE`) :**
  - Des cœurs d'ombre apparaissent régulièrement sur la carte avec alerte radar.
  - **Si un fantôme l'attrape :** Il mute en **Titan du Vide** et vous inflige **-6s de pénalité de temps** s'il vous percute !
  - **Si Pac-Man l'intercepte avant eux :** Vous pulvérisez la relique, gagnez **+5,000 pts**, **+6.0s de temps** et activez un **Super-Aimant** géant !
- **Aimants Ultra-Jus & Pluie de Power-ups :** Les aimants apparaissent fréquemment et aspirent les orbes sur un rayon colossal (chaque orbe prolonge le chrono).
- **Nuées Infinies & Progression de Monde Automatique :**
- 35 Kills -> Téléportation vers le niveau 2 (+8s)
- 80 Kills -> Téléportation vers le niveau 3 (+8s)
- 140 Kills -> Téléportation vers le niveau 4 (+8s)
- **Super-items sur le plateau :** Nova, Overdrive, Vortex, Lasers, Cryo et Tsunami se débloquent par la progression de carrière, apparaissent directement sur la carte et s'activent immédiatement au ramassage. Il n'y a pas d'inventaire ni de réserve d'item.

---

## 🎮 Commandes

| Action | Clavier | Manette (Gamepad) | Mobile / Tactile |
| :--- | :--- | :--- | :--- |
| **Déplacement** | Flèches ou `WASD` / `ZQSD` | Stick gauche ou D-Pad | D-Pad arcade tactile ou Swipe |
| **Dash Tranchant (Attaque & Déplacement)** | **`Espace`** — débloqué à 10 spectres | Touche `A`, `X` ou Gâchettes | Bouton arcade `⚡DASH` ou Double-Tap |
| **Kombo Wiggle (EMP Blast)** | Double Shift, maintenir, `← → ← →`, relâcher | Double LB/LT, maintenir, séquence, relâcher | Double Chrono, maintenir, séquence, relâcher |
| **Kombo Nitro (Flammes)** | Double Shift, maintenir, `↑ ↓ ↑ ↓`, relâcher | Double LB/LT, maintenir, séquence, relâcher | Double Chrono, maintenir, séquence, relâcher |
| **Super-Item** | Activation automatique au contact | Activation automatique au contact | Activation automatique au contact |
| **Chrono Shift** | **`Shift`** — débloqué à 180 spectres | — | Bouton `CHRONO` après déblocage |
| **Changer de Mode (Menu)** | `1` = Madness, `2` = Classique | D-Pad sur Menu | Boutons interactifs sur l'écran d'accueil |
| **Pause** | **`P`** ou **`Échap`** | Bouton Start / Menu | Bouton `⏸ PAUSE` |
| **Couper / Activer Son** | **`M`** | — | Bouton `🔊 AUDIO` |
| **Démarrer / Rejouer** | `Espace` ou `Entrée` | Touche `A` | Tape sur l'écran ou bouton Dash |

---

## 💻 Développement Local

1. Clonez le projet :
   ```bash
   git clone git@github.com:Flatoupix/chromavore.git
   cd chromavore
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez le serveur de développement avec rechargement à chaud :
   ```bash
   npm run dev
   ```
4. Construisez la version de production optimisée :
   ```bash
   npm run build
   ```

### Calibration headless (Monte Carlo)

Le simulateur lance des campagnes reproductibles sans rendu et exporte un rapport
JSON ainsi qu'un CSV pour comparer les résultats dans un tableur. Les scénarios
partagent les mêmes seeds entre variantes afin de réduire le bruit de comparaison.

```bash
npm run simulate:headless -- --games 100 --replicates 3
```

Exemple de comparaison du plafond XP des kills, des compétences et de la courbe :

```bash
npm run simulate:headless -- --games 100 --replicates 5 \
  --bots collector --skills none,balanced \
  --ghost-caps 16,64 --xp-curves 0.9,1,1.1 \
  --out scripts/reports/progression-candidates.json
```

Pour isoler rapidement l'effet du plafond de combo sans attendre un streak de
200 fantômes, `--singularity-kills 20` peut servir à un test accéléré. Cette
valeur est un outil de diagnostic uniquement ; le jeu conserve son seuil réel
de x200 kills consécutifs (avec remise à zéro après 2 secondes sans kill).

Le rapport donne les moyennes, médianes, écarts-types, min/max entre répétitions,
les taux d'atteinte des niveaux cibles, l'XP par minute simulée, les kills, la
survie et les cartes terminées. Le simulateur suit les transitions de cartes,
les +400 XP par clear et la vitesse croissante des boucles. Les limites du
modèle (pilotage/IA simplifiés, items/Vortex/badges/Titans non simulés, achats de
skills automatisés au level-up) sont inscrites dans chaque rapport : les
résultats orientent les réglages, mais ne remplacent pas des sessions humaines.

---

## Déploiement GitHub Pages et itch.io

Chaque push sur `main` compile une seule fois le jeu, puis déploie le même
contenu de `dist/` sur GitHub Pages et `flatoupix/chromavore:html5` avec butler.
La version itch.io provient de `package.json`. Le workflow peut aussi être
relancé manuellement depuis GitHub Actions sur `main`.

Configuration initiale :

1. Obtenir une clé butler via `butler login` ([documentation officielle](https://itch.io/docs/butler/login.html)).
2. Dans GitHub → Settings → Secrets and variables → Actions, ajouter un secret
   de dépôt nommé `BUTLER_API_KEY`. Ne jamais placer la clé dans le code ou les logs.
3. Relancer le workflow. Sans ce secret, le job itch.io échoue explicitement,
   mais le déploiement GitHub Pages reste indépendant.
4. Après le premier envoi, dans la page d'édition itch.io, cocher
   « This file will be played in the browser » pour le nouveau canal `html5`
   à la place de l'ancienne archive manuelle, puis sauvegarder.
   Les envois suivants actualisent ce même canal automatiquement.

Ce workflow ne change ni la couverture, ni la description, ni la visibilité
du projet : un brouillon reste un brouillon. Si la description mentionne une
version précise, ce texte doit être actualisé séparément.

## 📄 Licence
Projet sous licence MIT.

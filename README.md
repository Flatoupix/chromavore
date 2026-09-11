# ⚡ CHROMAVORE

> **Devour the Light. Outrun the Shadows.**  
> Jeu d'arcade rétro-néon ultra-nerveux, moderne et addictif inspiré de Pac-Man.

[![Jouer en ligne](https://img.shields.io/badge/🎮%20JOUER%20EN%20LIGNE-GitHub%20Pages-00ffcc?style=for-the-badge)](https://flatoupix.github.io/chromavore/)
[![Architecture](https://img.shields.io/badge/Stack-Vite%20%2B%20TypeScript-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Version](https://img.shields.io/badge/Release-3.8.0-ff007f?style=for-the-badge)](https://github.com/Flatoupix/chromavore)

👉 **Accès direct au jeu :** **[https://flatoupix.github.io/chromavore/](https://flatoupix.github.io/chromavore/)**

---

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
  - ⚡ **Wiggle (Gauche-Droite-Gauche-Droite / `← → ← →` ou `A D A D`) :** Déclenche un **EMP Shockwave** qui désintègre les fantômes environnants et aspire tous les orbes à 5.5 cases !
  - 🔥 **Nitro Jet (Haut-Bas-Haut-Bas / `↑ ↓ ↑ ↓` ou `W S W S`) :** Allume un propulseur de flammes derrière Pac-Man qui brûle toute ombre traversant son sillage.
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
| **Kombo Wiggle (EMP Blast)** | `← → ← →` ou `A D A D` | D-Pad Gauche/Droite rapide | Wiggle rapide sur D-Pad |
| **Kombo Nitro (Flammes)** | `↑ ↓ ↑ ↓` ou `W S W S` | D-Pad Haut/Bas rapide | Wiggle vertical sur D-Pad |
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

---

## 📄 Licence
Projet sous licence MIT.

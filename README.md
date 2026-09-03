# ⚡ CHROMAVORE

> **Devour the Light. Outrun the Shadows.**  
> Un jeu d'arcade rétro-néon nerveux et moderne, inspiré de Pac-Man, jouable directement dans le navigateur sans aucune dépendance.

[![Jouer en ligne](https://img.shields.io/badge/🎮%20JOUER%20EN%20LIGNE-GitHub%20Pages-00ffcc?style=for-the-badge)](https://flatoupix.github.io/chromavore/)
[![Version](https://img.shields.io/badge/Release-2.2-ff007f?style=for-the-badge)](https://github.com/Flatoupix/chromavore)

👉 **Accès direct au jeu :** **[https://flatoupix.github.io/chromavore/](https://flatoupix.github.io/chromavore/)**

---

## 🌟 Modes de Jeu

### 1. 🕹️ Mode Classique (Survie Stratégique Multi-Niveaux)
- **4 Labyrinthes distincts** avec leurs propres palettes de couleurs néon et spécificités :
  - **Niveau 1 — The Circuit (Cyber Cyan) :** Longs couloirs parfaits pour enchaîner de gros combos, 2 tunnels horizontaux.
  - **Niveau 2 — The Crucible (Synthwave Sunset) :** Arène centrale ouverte où convergent les fantômes et les power-ups.
  - **Niveau 3 — The Matrix (Toxic Matrix) :** Couloirs denses avec **4 tunnels de téléportation** (horizontaux + verticaux).
  - **Niveau 4 — The Core (Solar Flare) :** Architecture asymétrique pour les experts, vitesse accrue et ombres en meute.
- **Progression linéaire :** Départ systématique au Niveau 1. Chaque vague terminée déclenche la dissolution et la reconstruction cinématique vers le niveau suivant.

### 2. ⚡ Mode MADNESS (Chroma-Frenzy Carnage & Combat Rapide)
- **Pac-Man Mortel & Vulnérable :** Vous n'êtes PAS invincible ! Toucher une ombre sans attaquer vous coûte **1 vie et -4.0s sur le chrono**.
- **Le Dash Tranchant (Arme d'attaque offensive) :** Avec un cooldown réduit à **0.6s**, le Dash permet de trancher et d'atomiser toute ligne de fantômes sur sa trajectoire !
- **Pac-Man Hyper-Sonique :** Vitesse de base multipliée par près de **3x** (`14.5` vs `5.5`) !
- **Kombos Gestuels (Mouvements de combat arcade) :**
  - ⚡ **Wiggle (Gauche-Droite-Gauche-Droite / `← → ← →` ou `A D A D`) :** Déclenche un **EMP Shockwave** qui désintègre les fantômes environnants et aspire tous les orbes à 5.5 cases !
  - 🔥 **Nitro Jet (Haut-Bas-Haut-Bas / `↑ ↓ ↑ ↓` ou `W S W S`) :** Allume un propulseur de flammes derrière Pac-Man qui brûle toute ombre traversant son sillage.
- **Enjeu Critique — La Relique du Vide (`☠️ VOID CORE`) :**
  - Des cœurs d'ombre apparaissent régulièrement sur la carte avec alerte radar.
  - **Si un fantôme l'attrape :** Il mute en **Titan du Vide** et vous inflige **-5s de pénalité de temps** s'il vous percute !
  - **Si Pac-Man l'intercepte avant eux :** Vous pulvérisez la relique, gagnez **+5,000 pts**, **+6.0s de temps** et activez un **Super-Aimant** géant !
- **Aimants Ultra-Jus & Pluie de Power-ups :** Les aimants apparaissent fréquemment et aspirent les orbes sur un rayon colossal (chaque orbe prolonge le chrono).
- **Nuées Infinies & Progression de Monde Automatique :**
  - 35 Kills -> Téléportation vers **The Crucible** (+8s)
  - 80 Kills -> Téléportation vers **The Matrix** (+8s)
  - 140 Kills -> Téléportation vers **The Core** (+8s)
- **5 Super-Items Utilisables Débloqués par Streaks (`E` / `Shift` / Bouton `💣`) :**
  - 💣 **15 Kills — MEGA NOVA :** Onde de choc 360° atomisant tous les fantômes de l'écran.
  - 🕳️ **35 Kills — BLACK HOLE (VORTEX) :** Singularité gravitationnelle aspirant tous les fantômes au centre.
  - ⚡ **60 Kills — HYPER BEAMS :** 4 faisceaux lasers continus en croix pulvérisant tout sur les 4 axes.
  - ❄️ **100 Kills — CRYO SHATTER :** Gèle tous les fantômes en blocs de cristal brisables au contact.
  - 👑 **150+ Kills — LIGHT TSUNAMI :** Tsunami de lumière pure balayant tout le labyrinthe et rechargeant le chrono.

---

## 🎮 Commandes

| Action | Clavier | Manette (Gamepad) | Mobile / Tactile |
| :--- | :--- | :--- | :--- |
| **Déplacement** | Flèches ou `WASD` / `ZQSD` | Stick gauche ou D-Pad | D-Pad arcade tactile ou Swipe |
| **Dash Tranchant (Attaque & Déplacement)** | **`Espace`** | Touche `A`, `X` ou Gâchettes | Bouton arcade `⚡DASH` ou Double-Tap |
| **Kombo Wiggle (EMP Blast)** | `← → ← →` ou `A D A D` | D-Pad Gauche/Droite rapide | Wiggle rapide sur D-Pad |
| **Kombo Nitro (Flammes)** | `↑ ↓ ↑ ↓` ou `W S W S` | D-Pad Haut/Bas rapide | Wiggle vertical sur D-Pad |
| **Utiliser Super-Item (Madness)** | **`E`**, `Shift`, `Q`, `F` | Touche `B`, `Y` | Bouton arcade tactile `💣 ITEM` |
| **Changer de Mode (Menu)** | Touches `1`, `2` | D-Pad sur Menu | Boutons interactifs sur l'écran d'accueil |
| **Pause** | **`P`** ou **`Échap`** | Bouton Start / Menu | Bouton `⏸ PAUSE` |
| **Couper / Activer Son** | **`M`** | — | Bouton `🔊 AUDIO` |
| **Démarrer / Rejouer** | `Espace` ou `Entrée` | Touche `A` | Tape sur l'écran ou bouton Dash |

---

## 🚀 Jouer en Local

Aucune installation ni dépendance requise :
1. Clonez le dépôt :
   ```bash
   git clone git@github.com:Flatoupix/chromavore.git
   ```
2. Ouvrez `index.html` dans votre navigateur :
   ```bash
   open index.html
   ```

---

## 🛠️ Stack Technique

- **Architecture :** Fichier unique autonome (`index.html`) contenant le HTML, CSS et JavaScript.
- **Rendu :** HTML5 Canvas 2D avec pré-rendu offscreen dynamique selon les palettes de chaque niveau.
- **Audio :** Synthèse procédurale complète Web Audio API (aucun asset externe).
- **Entrées :** Clavier, Gamepad API, Pointer Events et Touch Events réactifs.

---

## 📄 Licence
Projet sous licence MIT.

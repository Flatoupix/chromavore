# ⚡ CHROMAVORE

> **Devour the Light. Outrun the Shadows.**  
> Un jeu d'arcade rétro-néon nerveux et moderne, inspiré de Pac-Man, jouable directement dans le navigateur sans aucune dépendance.

---

## 🌟 Modes de Jeu

### 1. 🕹️ Mode Classique (Survie Stratégique Multi-Niveaux)
- **4 Labyrinthes distincts** avec leurs propres palettes de couleurs néon et spécificités :
  - **Niveau 1 — The Circuit (Cyber Cyan) :** Longs couloirs parfaits pour enchaîner de gros combos, 2 tunnels horizontaux.
  - **Niveau 2 — The Crucible (Synthwave Sunset) :** Arène centrale ouverte où convergent les fantômes et les power-ups.
  - **Niveau 3 — The Matrix (Toxic Matrix) :** Couloirs denses avec **4 tunnels de téléportation** (horizontaux + verticaux).
  - **Niveau 4 — The Core (Solar Flare) :** Architecture asymétrique pour les experts, vitesse accrue et ombres en meute.
- **Progression cinématique :** Dissolution et reconstruction lumineuse des murs lors du passage au niveau suivant.
- **Sélecteur de Niveau :** Choisissez votre monde de départ directement sur l'écran d'accueil (`◄ NIVEAU ►`).

### 2. ⚡ Mode MADNESS (Chroma-Frenzy Carnage)
- **Pac-Man Divin Invincible :** Vous êtes invincible et auréolé d'une lumière arc-en-ciel.
- **Super-Dash en Rafale :** Cooldown réduit à **0.6s** pour fendre les lignes de fantômes à vitesse supersonique.
- **Nuées Infinies :** Les fantômes jaillissent sans discontinuer depuis le centre et les tunnels et se ruent droit sur vous.
- **Chrono Overdrive :** Vous commencez avec 30 secondes. Chaque fantôme écrasé ajoute **+0.35s** au chronomètre.
- **5 Super-Items Utilisables Débloqués par Streaks :**
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
| **Dash (Fonce en avant)** | **`Espace`** | Touche `A`, `X` ou Gâchettes | Bouton arcade `⚡DASH` ou Double-Tap |
| **Utiliser Super-Item (Madness)** | **`E`**, `Shift`, `Q`, `F` | Touche `B`, `Y` | Bouton arcade tactile `💣 ITEM` |
| **Changer de Mode / Niveau** | Touches `1`, `2` / Flèches sur Menu | D-Pad sur Menu | Boutons interactifs sur l'écran d'accueil |
| **Pause** | **`P`** ou **`Échap`** | Bouton Start / Menu | Bouton `⏸ PAUSE` |
| **Couper / Activer Son** | **`M`** | — | Bouton `🔊 AUDIO` |
| **Démarrer / Rejouer** | `Espace` ou `Entrée` | Touche `A` | Tape sur l'écran ou bouton Dash |

---

## 🚀 Lancer le jeu

Aucune installation ni dépendance requise :
1. Clonez le dépôt :
   ```bash
   git clone git@github.com:Flatoupix/chromavore.git
   ```
2. Ouvrez `index.html` dans n'importe quel navigateur moderne :
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

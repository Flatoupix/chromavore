# ⚡ CHROMAVORE

> **Devour the Light. Outrun the Shadows.**  
> Un jeu d'arcade rétro-néon nerveux et moderne, inspiré de Pac-Man, jouable directement dans le navigateur sans aucune dépendance.

---

## 🌟 Présentation

**CHROMAVORE** réinvente la formule légendaire des jeux de labyrinthe d'arcade avec une esthétique cyberpunk néon, un *game feel* ultra-satisfaisant et des mécaniques contemporaines :

- ⚡ **Compétence de Dash (Touche Espace / Bouton Tactile) :** Foncez de 3 cases d'un coup avec une traînée laser cyan et un bref temps d'invulnérabilité pour esquiver les fantômes.
- ⛓️ **Combo Chaining (x1 à x16) :** Enchaînez les orbes sans interruption pour démultiplier votre score avant l'expiration du sillage.
- 🎶 **Musique de Tension Procédurale :** Pulsation de basse synthétisée en temps réel via la Web Audio API, accélérant au rythme de vos combos et de la menace.
- 👻 **4 IAs Ennemies Uniques :**
  - **Stalker (Rouge) :** Poursuite directe calculée par algorithme BFS.
  - **Orbiter (Cyan) :** Patrouilleur périodique qui accélère à votre approche.
  - **Rusher (Orange) :** Charge en trombe en ligne droite dès qu'il vous repère.
  - **Phaser (Violet) :** Traverse les murs du labyrinthe pour vous prendre en embuscade.
- 🌀 **5 Power-ups Déterminants :**
  - 🔴 **Predator Mode :** Inversez la chasse et dévorez les fantômes pour des millions de points.
  - 🔵 **Phase Shift :** Traversez tous les murs du labyrinthe.
  - 🟡 **Nova Burst :** Explosion circulaire éliminant les ennemis et aspirant les points.
  - 🟢 **Time Warp :** Ralentit les ennemis de 65%.
  - 🟣 **Magnet :** Aspire physiquement les orbes à distance.
- 💥 **Juice & Game Feel :** Hitlag de 60ms sur les kills, squash & stretch organique, secousses d'écran (*screen shake*), particules réactives, et bonus *Near Miss* pour le jeu à haut risque.
- 🏆 **Système d'Achievements :** 6 trophées d'arcade sauvegardés en `localStorage`.
- 📱 **100% Mobile Ready :** D-Pad tactile arcade dédié, bouton Dash grand format, glissement libre (*swipe*), déverrouillage audio iOS et retours haptiques (vibrations).

---

## 🎮 Commandes

| Action | Clavier | Manette (Gamepad) | Mobile / Écran Tactile |
| :--- | :--- | :--- | :--- |
| **Déplacement** | Flèches ou `WASD` / `ZQSD` | Stick gauche ou D-Pad | D-Pad arcade tactile ou Swipe |
| **Dash (Fonce en avant)** | **`Espace`** | Touche `A`, `X` ou Gâchettes | Bouton arcade `⚡DASH` ou Double-Tap |
| **Pause** | **`P`** ou **`Échap`** | Bouton Start / Menu | Bouton `⏸ PAUSE` |
| **Couper / Activer Son** | **`M`** | — | Bouton `🔊 AUDIO` |
| **Démarrer / Rejouer** | `Espace` ou `Entrée` | Touche `A` | Tape sur l'écran ou bouton Dash |

---

## 🚀 Lancer le jeu

Aucune installation, aucun bundler ni serveur requis !

1. Clonez le dépôt :
   ```bash
   git clone git@github.com:Flatoupix/chromavore.git
   ```
2. Ouvrez simplement `index.html` dans n'importe quel navigateur moderne (Chrome, Firefox, Safari, Edge) :
   ```bash
   open index.html
   ```

Le jeu est également immédiatement hébergeable sur **GitHub Pages** (Settings > Pages > Branch: `main` > `/root`).

---

## 🛠️ Stack Technique

- **Architecture :** Fichier unique autonome (`index.html`) contenant le HTML, CSS et JavaScript.
- **Rendu :** HTML5 Canvas 2D avec pré-rendu offscreen pour les murs néon et bloom dynamique.
- **Audio :** Synthèse procédurale complète avec la Web Audio API (aucun fichier audio externe à charger).
- **Entrées :** Clavier, Gamepad API standard, Pointer Events et Touch Events.

---

## 📄 Licence

Projet sous licence MIT.

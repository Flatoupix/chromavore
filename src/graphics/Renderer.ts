// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — CANVAS RENDERER & VISUAL PIPELINE
// ═══════════════════════════════════════════════════════════════

import { CW, CH, HUD_H, T, ROWS, COLS, HALF, PI2, C_BG, C_GLOW, C_PLAYER, C_DOT, PC, DASH_BTN, CC, COMBO_DECAY, getComboTier } from '../config/constants';
import { LEVELS, MazeManager } from '../levels/levels';
import { Player } from '../entities/Player';
import { EnemyManager } from '../entities/Enemy';
import { PowerupManager } from '../entities/Powerups';
import { SuperItemManager } from '../systems/SuperItems';
import { ParticleSystem } from '../systems/ParticleSystem';
import { BadgeManager } from '../systems/BadgeSystem';
import { sounds } from '../audio/SoundManager';
import { settingsManager, PAUSE_BUTTONS } from '../systems/SettingsManager';

export class Renderer {
  public ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = CW;
    canvas.height = CH;
    this.ctx = canvas.getContext('2d')!;
  }

  public clear(lvlIndex: number) {
    const lvl = LEVELS[lvlIndex % LEVELS.length];
    this.ctx.clearRect(0, 0, CW, CH);
    this.ctx.fillStyle = lvl.bg;
    this.ctx.fillRect(0, 0, CW, CH);
  }

  public drawDots(maze: MazeManager, time: number) {
    const lvl = LEVELS[maze.currentLevel];
    const c = this.ctx;
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        const d = maze.dotMap[r][col];
        if (!d) continue;
        const px = col * T + HALF, py = r * T + HALF;
        if (d === 2) {
          c.fillStyle = lvl.dotColor;
          c.beginPath();
          c.arc(px, py, 2.5, 0, PI2);
          c.fill();
        } else if (d === 3) {
          const p = 1 + Math.sin(time * 4) * 0.3;
          c.fillStyle = lvl.pelletColor;
          c.shadowColor = lvl.pelletColor;
          c.shadowBlur = 12;
          c.beginPath();
          c.arc(px, py, 5 * p, 0, PI2);
          c.fill();
          c.shadowBlur = 0;
        }
      }
    }
  }

  public drawNitroTrail(trail: { x: number; y: number; life: number; maxLife: number }[]) {
    const c = this.ctx;
    for (const t of trail) {
      const a = t.life / t.maxLife;
      c.save();
      c.globalAlpha = a * 0.65;
      c.fillStyle = '#ff6600';
      c.shadowColor = '#ff3300';
      c.shadowBlur = 14;
      c.beginPath();
      c.arc(t.x, t.y, 8 * a, 0, PI2);
      c.fill();
      c.restore();
    }
  }

  public drawOverlays(fx: { phase: number; timewarp: number; magnet: number }, flsh: { a: number; c: string }, plPos: { x: number; y: number }, time: number) {
    const c = this.ctx;
    if (fx.phase > 0) {
      c.globalAlpha = 0.08 + Math.sin(time * 6) * 0.04;
      c.fillStyle = PC.phase;
      c.fillRect(0, 0, CW, ROWS * T);
      c.globalAlpha = 1;
    }
    if (fx.timewarp > 0) {
      c.globalAlpha = 0.06 + Math.sin(time * 3) * 0.03;
      c.fillStyle = PC.timewarp;
      c.fillRect(0, 0, CW, ROWS * T);
      c.globalAlpha = 1;
    }
    if (fx.magnet > 0) {
      const r = T * 4.5;
      c.globalAlpha = 0.1 + Math.sin(time * 5) * 0.05;
      const gr = c.createRadialGradient(plPos.x, plPos.y, 0, plPos.x, plPos.y, r);
      gr.addColorStop(0, PC.magnet);
      gr.addColorStop(1, 'transparent');
      c.fillStyle = gr;
      c.beginPath();
      c.arc(plPos.x, plPos.y, r, 0, PI2);
      c.fill();
      c.globalAlpha = 1;
    }
    if (flsh.a > 0) {
      c.globalAlpha = flsh.a;
      c.fillStyle = flsh.c;
      c.fillRect(0, 0, CW, ROWS * T);
      c.globalAlpha = 1;
    }
  }

  public drawHUD(
    isMadness: boolean,
    score: number,
    dScore: number,
    lives: number,
    madnessKills: number,
    madnessStreak: number,
    madnessTimer: number,
    bestMadnessKills: number,
    superItems: SuperItemManager,
    time: number,
    dashCd: number,
    currentLevel: number,
    wave: number,
    combo: { n: number; t: number; m: number },
    hi: number
  ) {
    const c = this.ctx;
    c.fillStyle = '#0a0a12';
    c.fillRect(0, 0, CW, HUD_H);

    if (isMadness) {
      // Madness HUD
      c.font = 'bold 12px monospace'; c.fillStyle = '#8899aa'; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText('PURGÉS', 12, 15);
      c.font = 'bold 20px monospace'; c.fillStyle = '#ffd700';
      c.fillText(madnessKills.toString(), 12, 36);
      c.font = 'bold 11px monospace'; c.fillStyle = '#ff5533';
      c.fillText('🔥 x' + madnessStreak, 68, 36);

      // Timer in Center
      const tRatio = Math.min(1, madnessTimer / 30);
      const tCol = madnessTimer < 8 ? (Math.sin(time * 12) > 0 ? '#ff2244' : '#ffffff') : '#00ffff';
      c.font = 'bold 12px monospace'; c.fillStyle = '#888'; c.textAlign = 'center';
      c.fillText('OVERDRIVE TIMER', CW / 2, 14);
      c.font = 'bold 18px monospace'; c.fillStyle = tCol; c.shadowColor = tCol; c.shadowBlur = 8;
      c.fillText('⏱️ ' + madnessTimer.toFixed(1) + 's', CW / 2, 33); c.shadowBlur = 0;
      c.fillStyle = '#222'; c.fillRect(CW / 2 - 50, 44, 100, 4);
      c.fillStyle = tCol; c.fillRect(CW / 2 - 50, 44, 100 * tRatio, 4);

      // Active Item status
      c.textAlign = 'right';
      if (superItems.isRunning()) {
        c.font = 'bold 11px monospace'; c.fillStyle = '#00ffff'; c.shadowColor = '#00ffff'; c.shadowBlur = 10;
        c.fillText('⚡ ITEM EN ACTION !', CW - 14, 20); c.shadowBlur = 0;
        c.font = '9px monospace'; c.fillStyle = '#ffbb00';
        c.fillText('UN SEUL ITEM À LA FOIS', CW - 14, 36);
      } else if (superItems.activeSlot && superItems.activeSlot.ready) {
        const itmPulse = 1 + Math.sin(time * 8) * 0.08;
        c.font = `bold ${13 * itmPulse}px monospace`; c.fillStyle = '#ffd700'; c.shadowColor = '#ffd700'; c.shadowBlur = 12;
        c.fillText(superItems.activeSlot.icon + ' ' + superItems.activeSlot.name + ' [E]', CW - 14, 20); c.shadowBlur = 0;
        c.font = '9px monospace'; c.fillStyle = '#00ffff';
        c.fillText('PRESS [E] OU TAP 💣', CW - 14, 36);
      } else {
        const nextKills = madnessStreak < 15 ? 15 - madnessStreak : madnessStreak < 35 ? 35 - madnessStreak : madnessStreak < 60 ? 60 - madnessStreak : madnessStreak < 100 ? 100 - madnessStreak : 150 - madnessStreak;
        c.font = '10px monospace'; c.fillStyle = '#667788';
        c.fillText(nextKills > 0 ? 'ITEM DANS : ' + nextKills + ' KILLS' : 'ITEM : PRÊT', CW - 14, 24);
        c.font = 'bold 9px monospace'; c.fillStyle = '#ffd700';
        c.fillText('RECORD KILLS : ' + bestMadnessKills, CW - 14, 40);
      }

      // Lives in Madness
      c.textAlign = 'right';
      for (let i = 0; i < lives; i++) {
        c.fillStyle = C_PLAYER; c.beginPath();
        c.arc(CW - 16 - i * 18, 52, 5, 0.3, PI2 - 0.3);
        c.lineTo(CW - 16 - i * 18, 52); c.fill();
      }

      // Audio status
      c.font = '9px monospace'; c.fillStyle = sounds.isMuted() ? '#ff4444' : '#44aa77'; c.textAlign = 'left';
      c.fillText(sounds.isMuted() ? '🔇[M]' : '🔊[M]', CW - 35, HUD_H - 6);
      return;
    }

    // Classic HUD
    c.font = 'bold 18px monospace'; c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText('SCORE', 12, 16);
    c.font = 'bold 22px monospace'; c.fillStyle = '#ffd700';
    c.fillText(Math.round(dScore).toString().padStart(7, '0'), 12, 38);

    // Dash Gauge
    const dX = 134, dY = 14, dW = 90, dH = 18;
    const isReady = dashCd <= 0;
    const cdProg = isReady ? 1 : Math.max(0, 1 - dashCd / 2.8);
    c.fillStyle = '#0c1322';
    c.strokeStyle = isReady ? '#00ffff' : '#223350';
    c.lineWidth = 1.5;
    c.shadowColor = isReady ? '#00ffff' : 'transparent';
    c.shadowBlur = isReady ? 8 : 0;
    c.strokeRect(dX, dY, dW, dH);
    c.fillRect(dX, dY, dW, dH);
    if (cdProg > 0) {
      c.fillStyle = isReady ? '#00e5ff' : '#0077aa';
      c.fillRect(dX + 2, dY + 2, (dW - 4) * cdProg, dH - 4);
    }
    c.shadowBlur = 0;
    c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = isReady ? '#050a14' : '#ffffff';
    c.fillText(isReady ? '⚡ DASH [SPACE]' : 'DASH ' + dashCd.toFixed(1) + 's', dX + dW / 2, dY + dH / 2);

    // Hi-Score & Level
    c.font = '11px monospace'; c.fillStyle = '#666'; c.textAlign = 'center';
    c.fillText('HI-SCORE: ' + hi.toString().padStart(6, '0'), CW / 2, 14);
    const lvl = LEVELS[currentLevel];
    c.font = 'bold 12px monospace'; c.fillStyle = lvl.glowColor; c.shadowColor = lvl.glowColor; c.shadowBlur = 8;
    c.fillText('LVL ' + (currentLevel + 1) + ': ' + lvl.name, CW / 2, 30); c.shadowBlur = 0;
    c.font = 'bold 11px monospace'; c.fillStyle = '#aaa';
    c.fillText('WAVE ' + wave, CW / 2, 46);

    // Lives
    c.textAlign = 'right';
    for (let i = 0; i < lives; i++) {
      c.fillStyle = C_PLAYER; c.beginPath();
      c.arc(CW - 20 - i * 24, 20, 8, 0.3, PI2 - 0.3);
      c.lineTo(CW - 20 - i * 24, 20); c.fill();
    }

    // Multiplier & Combo Gauge
    if (combo.m > 1) {
      const tier = getComboTier(combo.n);
      const pulse = 1 + Math.sin(time * 8) * 0.1;
      const sz = (16 + tier * 3) * pulse;
      c.font = `bold ${sz}px monospace`;
      c.fillStyle = CC[tier];
      c.shadowColor = CC[tier];
      c.shadowBlur = 10;
      c.textAlign = 'right';
      c.fillText('x' + combo.m, CW - 15, 46);
      c.shadowBlur = 0;

      // Decay Progress Bar
      const bW = 60, bX = CW - 15 - bW, bY = 51;
      c.fillStyle = '#222233';
      c.fillRect(bX, bY, bW, 3);
      c.fillStyle = CC[tier];
      const prog = Math.max(0, Math.min(1, combo.t / COMBO_DECAY));
      c.fillRect(bX, bY, bW * prog, 3);
    }

    // Audio status
    c.font = '9px monospace'; c.fillStyle = sounds.isMuted() ? '#ff4444' : '#44aa77'; c.textAlign = 'left';
    c.fillText(sounds.isMuted() ? '🔇[M]' : '🔊[M]', CW - 35, HUD_H - 6);
  }

  public drawMenu(gameMode: string, time: number, hi: number, bestMadnessKills: number) {
    const c = this.ctx;
    c.fillStyle = C_BG; c.fillRect(0, 0, CW, CH);
    c.strokeStyle = '#111'; c.lineWidth = 0.5;
    for (let x = 0; x < CW; x += T) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, CH); c.stroke(); }
    for (let y = 0; y < CH; y += T) { c.beginPath(); c.moveTo(0, y); c.lineTo(CW, y); c.stroke(); }

    const ty = CH * 0.22, p = 1 + Math.sin(time * 2) * 0.05;
    c.shadowColor = C_GLOW; c.shadowBlur = 30; c.font = `bold ${40 * p}px monospace`; c.fillStyle = C_GLOW;
    c.textAlign = 'center'; c.fillText('CHROMAVORE', CW / 2, ty); c.shadowBlur = 0;
    c.font = '12px monospace'; c.fillStyle = '#667799'; c.fillText('DEVOUR THE LIGHT • OUTRUN THE SHADOWS', CW / 2, ty + 26);

    // Pac-Man Preview
    c.fillStyle = C_PLAYER; c.shadowColor = C_PLAYER; c.shadowBlur = 15;
    const ma = Math.abs(Math.sin(time * 4)) * 0.6;
    c.beginPath(); c.arc(CW / 2, CH * 0.35, 18, ma, PI2 - ma); c.lineTo(CW / 2, CH * 0.35); c.fill(); c.shadowBlur = 0;
    for (let i = 0; i < 4; i++) {
      c.fillStyle = C_DOT; c.beginPath(); c.arc(CW / 2 + 32 + i * 16, CH * 0.35, 3, 0, PI2); c.fill();
    }

    // Tabs
    const my = CH * 0.48;
    const isCl = gameMode === 'classic';
    c.fillStyle = isCl ? '#0c1e34' : '#080d16';
    c.strokeStyle = isCl ? '#00d4ff' : '#223348';
    c.lineWidth = isCl ? 2 : 1;
    c.shadowColor = isCl ? '#00d4ff' : 'transparent'; c.shadowBlur = isCl ? 12 : 0;
    c.beginPath(); c.roundRect(CW / 2 - 140, my, 130, 34, 6); c.fill(); c.stroke(); c.shadowBlur = 0;
    c.font = 'bold 11px monospace'; c.fillStyle = isCl ? '#00ffff' : '#8899aa'; c.fillText('[1] CLASSIQUE', CW / 2 - 75, my + 21);

    const isMad = gameMode === 'madness';
    c.fillStyle = isMad ? '#34081c' : '#120810';
    c.strokeStyle = isMad ? '#ff0055' : '#442030';
    c.lineWidth = isMad ? 2 : 1;
    c.shadowColor = isMad ? '#ff0055' : 'transparent'; c.shadowBlur = isMad ? 14 : 0;
    c.beginPath(); c.roundRect(CW / 2 + 10, my, 130, 34, 6); c.fill(); c.stroke(); c.shadowBlur = 0;
    c.font = 'bold 11px monospace'; c.fillStyle = isMad ? '#ff3377' : '#8899aa'; c.fillText('[2] MADNESS ⚡', CW / 2 + 75, my + 21);

    // Progression banner
    const ly = CH * 0.57;
    c.font = 'bold 11px monospace'; c.fillStyle = '#00d4ff'; c.textAlign = 'center';
    c.fillText('4 MONDES NÉON : DÉPART NIVEAU 1 → PROGRESSION AUTOMATIQUE', CW / 2, ly + 12);
    c.font = '10px monospace'; c.fillStyle = '#667788';
    c.fillText('1. The Circuit  ►  2. The Crucible  ►  3. The Matrix  ►  4. The Core', CW / 2, ly + 28);

    // Subtitle
    c.font = '11px monospace'; c.fillStyle = '#ffaa00';
    if (isMad) {
      c.fillText('PAC-MAN VULNÉRABLE • DASH TRANCHANT • GAUCHE-DROITE [EMP] • 3X SPEED', CW / 2, CH * 0.66);
    } else {
      c.fillText('SURVIE TACTIQUE • 204 ORBES • 4 LABYRINTHES NÉON • DASH & COMBOS', CW / 2, CH * 0.66);
    }

    // Start prompt
    c.font = '14px monospace'; c.fillStyle = '#fff';
    if (Math.sin(time * 4) > 0) c.fillText('PRESS SPACE OU TAP POUR COMMENCER', CW / 2, CH * 0.72);

    // Controls guide
    c.font = '11px monospace'; c.fillStyle = '#667788';
    c.fillText('Flèches / WASD : Déplacement  |  SPACE : Dash Offensif', CW / 2, CH * 0.77);
    if (isMad) {
      c.fillText('Kombos : ← → ← → (Wiggle EMP)  |  ↑ ↓ ↑ ↓ (Nitro Jet)', CW / 2, CH * 0.81);
      c.fillText('E / SHIFT / Bouton 💣 : Déclencher Super-Item', CW / 2, CH * 0.85);
    } else {
      c.fillText('P : Pause  |  M : Son On/Off', CW / 2, CH * 0.81);
    }

    // Records
    c.font = 'bold 12px monospace'; c.fillStyle = '#ffd700';
    if (isMad) {
      c.fillText('RECORD MADNESS : ' + bestMadnessKills + ' FANTÔMES PURGÉS', CW / 2, CH * 0.90);
    } else {
      c.fillText('RECORD CLASSIQUE : ' + hi + ' PTS', CW / 2, CH * 0.90);
    }
  }

  public drawGameOver(isMadness: boolean, score: number, hi: boolean, madnessKills: number, madnessStreak: number, bestMadnessKills: number, badgesUnlocked: number, time: number) {
    const c = this.ctx;
    c.fillStyle = 'rgba(5,5,10,0.85)'; c.fillRect(0, 0, CW, CH);
    const cy = CH * 0.30;
    c.font = 'bold 36px monospace'; c.fillStyle = '#ff3344'; c.shadowColor = '#ff3344'; c.shadowBlur = 20;
    c.textAlign = 'center'; c.fillText(isMadness ? 'FRENZY OVER' : 'GAME OVER', CW / 2, cy); c.shadowBlur = 0;

    if (isMadness) {
      c.font = 'bold 22px monospace'; c.fillStyle = '#ffd700'; c.fillText('FANTÔMES PURGÉS : ' + madnessKills, CW / 2, cy + 48);
      c.font = 'bold 16px monospace'; c.fillStyle = '#ff5533'; c.fillText('MAX STREAK : x' + madnessStreak, CW / 2, cy + 78);
      c.font = '14px monospace'; c.fillStyle = '#888'; c.fillText('RECORD KILLS : ' + bestMadnessKills, CW / 2, cy + 106);
    } else {
      c.font = 'bold 20px monospace'; c.fillStyle = '#ffd700'; c.fillText('SCORE : ' + score, CW / 2, cy + 48);
      if (hi) {
        c.font = 'bold 16px monospace'; c.fillStyle = '#ff44ff'; c.shadowColor = '#ff44ff'; c.shadowBlur = 10;
        if (Math.sin(time * 6) > 0) c.fillText('★ NOUVEAU RECORD ! ★', CW / 2, cy + 76); c.shadowBlur = 0;
      }
    }

    c.fillStyle = '#ffd700'; c.font = '12px monospace';
    c.fillText('🏆 Badges: ' + badgesUnlocked + '/6 Débloqués', CW / 2, cy + 134);
    c.font = '14px monospace'; c.fillStyle = '#aaa';
    if (Math.sin(time * 3) > 0) c.fillText('PRESS SPACE TO REPLAY', CW / 2, cy + 174);
  }

  public drawPause(isMadness: boolean, kills: number, streak: number, time: number = 0) {
    const c = this.ctx;
    // Dark blur backdrop
    c.fillStyle = 'rgba(5, 7, 14, 0.88)';
    c.fillRect(0, 0, CW, CH);

    // Modal Card
    const cardX = 44, cardY = 90, cardW = 500, cardH = 435;
    c.save();
    c.fillStyle = 'rgba(10, 15, 28, 0.96)';
    c.strokeStyle = '#00d4ff';
    c.lineWidth = 2;
    c.shadowColor = '#00d4ff';
    c.shadowBlur = 18;
    c.beginPath();
    c.roundRect(cardX, cardY, cardW, cardH, 12);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // Header Title
    c.font = 'bold 22px monospace';
    c.fillStyle = '#00ffff';
    c.textAlign = 'center';
    c.fillText('⏸ PAUSE — PARAMÈTRES VISUELS', CW / 2, cardY + 36);

    c.font = '10px monospace';
    c.fillStyle = '#667799';
    c.fillText('CLIQUEZ SUR UNE OPTION OU UTILISEZ LES TOUCHES [1] À [5] / [M]', CW / 2, cardY + 58);

    const s = settingsManager.settings;

    const items = [
      {
        btn: PAUSE_BUTTONS[0],
        key: '[1]',
        label: 'FREEZE FRAME (HIT-STOP IMPACT)',
        state: s.freezeFrame ? 'ACTIVÉ ⚡' : 'COUPÉ ❌',
        active: s.freezeFrame
      },
      {
        btn: PAUSE_BUTTONS[1],
        key: '[2]',
        label: 'SECOUSSES D\'ÉCRAN (SCREEN SHAKE)',
        state: s.screenShake ? 'ACTIVÉ 📳' : 'COUPÉ ❌',
        active: s.screenShake
      },
      {
        btn: PAUSE_BUTTONS[2],
        key: '[3]',
        label: 'ÉCLAIRS PLEIN ÉCRAN (FLASHES)',
        state: s.screenFlash ? 'ACTIVÉ ⚡' : 'COUPÉ ❌',
        active: s.screenFlash
      },
      {
        btn: PAUSE_BUTTONS[3],
        key: '[4]',
        label: 'FLAQUES DE PEINTURE NÉON',
        state: s.paintSplats ? 'ACTIVÉ 🎨' : 'COUPÉ ❌',
        active: s.paintSplats
      },
      {
        btn: PAUSE_BUTTONS[4],
        key: '[5]',
        label: 'DENSITÉ DES PARTICULES',
        state: s.particleDensity === 'max' ? 'MAX (1000) ✨' : 'ÉCO (350) 🍃',
        active: s.particleDensity === 'max'
      },
      {
        btn: PAUSE_BUTTONS[5],
        key: '[M]',
        label: 'AUDIO & MUSIQUE PROCÉDURALE',
        state: sounds.isMuted() ? 'COUPÉ 🔇' : 'ACTIF 🔊',
        active: !sounds.isMuted()
      }
    ];

    for (const it of items) {
      const b = it.btn;
      c.fillStyle = it.active ? 'rgba(0, 212, 255, 0.12)' : 'rgba(20, 26, 40, 0.6)';
      c.strokeStyle = it.active ? '#00d4ff' : '#334460';
      c.lineWidth = it.active ? 1.5 : 1;
      c.beginPath();
      c.roundRect(b.x, b.y, b.w, b.h, 6);
      c.fill();
      c.stroke();

      // Key & Label
      c.textAlign = 'left';
      c.font = 'bold 11px monospace';
      c.fillStyle = it.active ? '#ffffff' : '#8899aa';
      c.fillText(`${it.key} ${it.label}`, b.x + 14, b.y + 22);

      // State pill
      c.textAlign = 'right';
      c.font = 'bold 11px monospace';
      c.fillStyle = it.active ? '#00ffff' : '#ff4466';
      c.fillText(it.state, b.x + b.w - 14, b.y + 22);
    }

    // Resume button
    const resBtn = PAUSE_BUTTONS[6];
    const pulse = 1 + Math.sin(time * 6) * 0.03;
    c.fillStyle = '#0c243a';
    c.strokeStyle = '#00ffff';
    c.lineWidth = 2;
    c.shadowColor = '#00ffff';
    c.shadowBlur = 12;
    c.beginPath();
    c.roundRect(resBtn.x, resBtn.y, resBtn.w, resBtn.h, 8);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    c.font = `bold ${13 * pulse}px monospace`;
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.fillText('▶ REPRENDRE LE JEU [ESPACE / P]', CW / 2, resBtn.y + 27);

    // Footer stats if in madness
    if (isMadness) {
      c.font = '10px monospace';
      c.fillStyle = '#ffd700';
      c.fillText(`MODE MADNESS • Kills : ${kills} • Streak : x${streak}`, CW / 2, cardY + cardH - 12);
    }

    c.restore();
  }

  public drawWaveTrans(currentLevel: number, wave: number) {
    const c = this.ctx;
    const lvl = LEVELS[currentLevel % LEVELS.length];
    c.font = 'bold 36px monospace'; c.fillStyle = lvl.glowColor; c.shadowColor = lvl.glowColor; c.shadowBlur = 25;
    c.textAlign = 'center'; c.fillText('NIVEAU ' + (currentLevel + 1), CW / 2, CH / 2 - 10); c.shadowBlur = 0;
    c.font = 'bold 18px monospace'; c.fillStyle = '#ffffff'; c.fillText(lvl.name, CW / 2, CH / 2 + 24);
    c.font = '13px monospace'; c.fillStyle = '#888'; c.fillText('+' + (1000 * (wave - 1)) + ' WAVE BONUS', CW / 2, CH / 2 + 50);
  }

  public drawDangerVignette(madnessTimer: number, time: number) {
    if (madnessTimer >= 8.0) return;
    const c = this.ctx;
    const vAlpha = (0.28 + Math.sin(time * 14) * 0.22) * (1 - madnessTimer / 8.0);
    c.save();
    c.fillStyle = `rgba(255,0,50,${vAlpha})`;
    c.fillRect(0, 0, CW, 8); c.fillRect(0, CH - 8, CW, 8);
    c.fillRect(0, 0, 8, CH); c.fillRect(CW - 8, 0, 8, CH);
    c.restore();
  }

  public drawTouchDashButton(dashCd: number, maxCd: number) {
    const c = this.ctx;
    const isReady = dashCd <= 0;
    c.save();
    c.globalAlpha = isReady ? 0.8 : 0.35;
    c.fillStyle = isReady ? '#003444' : '#111622';
    c.strokeStyle = isReady ? '#00ffff' : '#445566';
    c.lineWidth = 2;
    c.shadowColor = isReady ? '#00ffff' : 'transparent';
    c.shadowBlur = isReady ? 10 : 0;
    c.beginPath();
    c.arc(DASH_BTN.x, DASH_BTN.y, DASH_BTN.r, 0, PI2);
    c.fill(); c.stroke();
    if (!isReady) {
      c.strokeStyle = '#00ffff'; c.lineWidth = 3;
      c.beginPath();
      c.arc(DASH_BTN.x, DASH_BTN.y, DASH_BTN.r, -Math.PI / 2, -Math.PI / 2 + (1 - dashCd / maxCd) * PI2);
      c.stroke();
    }
    c.shadowBlur = 0;
    c.font = 'bold 9px monospace';
    c.fillStyle = isReady ? '#ffffff' : '#8899aa';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('⚡DASH', DASH_BTN.x, DASH_BTN.y);
    c.restore();
  }
}

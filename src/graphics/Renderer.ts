// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — CANVAS RENDERER & VISUAL PIPELINE
// ═══════════════════════════════════════════════════════════════

import { CW, CH, HUD_H, T, ROWS, COLS, HALF, PI2, C_BG, C_GLOW, C_PLAYER, C_DOT, PC, DASH_BTN, CC, COMBO_DECAY, getComboTier, GAME_VERSION } from '../config/constants';
import { LEVELS, MADNESS_LEVELS, MazeManager } from '../levels/levels';
import { Player } from '../entities/Player';
import { EnemyManager } from '../entities/Enemy';
import { PowerupManager } from '../entities/Powerups';
import { SuperItemManager } from '../systems/SuperItems';
import { ParticleSystem } from '../systems/ParticleSystem';
import { BadgeManager, badges, BADGES } from '../systems/BadgeSystem';
import { sounds } from '../audio/SoundManager';
import { settingsManager, PAUSE_BUTTONS } from '../systems/SettingsManager';
import { progression, SKILL_TREE } from '../systems/ProgressionSystem';
import { profileManager } from '../systems/ProfileManager';

export class Renderer {
  public ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = CW;
    canvas.height = CH;
    this.ctx = canvas.getContext('2d')!;
  }

  public clear(lvlIndex: number, time: number = 0, isMadness: boolean = false) {
    const list = isMadness ? MADNESS_LEVELS : LEVELS;
    const lvl = list[lvlIndex % list.length];
    const c = this.ctx;
    c.clearRect(0, 0, CW, CH);

    // Deep Outrun Dusk Gradient
    const bgGrad = c.createLinearGradient(0, 0, 0, CH);
    bgGrad.addColorStop(0, '#090117');
    bgGrad.addColorStop(0.5, lvl.bg);
    bgGrad.addColorStop(1, '#1d002e');
    c.fillStyle = bgGrad;
    c.fillRect(0, 0, CW, CH);

    // Synthwave Wireframe Grid in background
    if (settingsManager.settings.synthwaveGrid) {
      c.save();
      c.strokeStyle = 'rgba(255, 0, 128, 0.06)';
      c.lineWidth = 1;
      const scrollY = (time * 28) % T;
      for (let y = scrollY; y < CH; y += T) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(CW, y); c.stroke();
      }
      for (let x = 0; x < CW; x += T) {
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, CH); c.stroke();
      }
      c.restore();
    }
  }

  public drawDots(maze: MazeManager, time: number) {
    const lvl = maze.getLevelDef();
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
    if (flsh.a > 0) {
      c.globalAlpha = flsh.a;
      c.fillStyle = flsh.c;
      c.fillRect(0, 0, CW, ROWS * T);
      c.globalAlpha = 1;
    }

    // 80s CRT Scanlines & Phosphor Bloom
    if (settingsManager.settings.crtScanlines) {
      c.save();
      c.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < ROWS * T; y += 3) {
        c.fillRect(0, y, CW, 1.2);
      }
      const vig = c.createRadialGradient(CW / 2, (ROWS * T) / 2, (ROWS * T) * 0.35, CW / 2, (ROWS * T) / 2, (ROWS * T) * 0.78);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(15, 2, 28, 0.42)');
      c.fillStyle = vig;
      c.fillRect(0, 0, CW, ROWS * T);
      c.restore();
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
    hi: number,
    overdriveTimer: number = 0,
    loopCount: number = 0
  ) {
    const c = this.ctx;
    c.fillStyle = '#0a0a12';
    c.fillRect(0, 0, CW, HUD_H);

    if (isMadness) {
      // Madness HUD
      c.textAlign = 'left'; c.textBaseline = 'middle';

      // Live Animated Score Line
      c.font = 'bold 10px monospace'; c.fillStyle = '#8899bb';
      c.fillText('SCORE', 12, 14);
      c.font = 'bold 18px monospace'; c.fillStyle = '#ffd700';
      c.shadowColor = '#ffd700'; c.shadowBlur = 8;
      c.fillText(Math.round(dScore).toString().padStart(7, '0'), 54, 14);
      c.shadowBlur = 0;

      // Kills & Streak
      c.font = 'bold 13px monospace'; c.fillStyle = '#00f0ff';
      c.fillText('💀 ' + madnessKills + ' KILLS', 12, 34);
      c.font = 'bold 11px monospace'; c.fillStyle = '#ff5533';
      c.fillText('🔥 x' + madnessStreak, 115, 34);

      if (overdriveTimer > 0) {
        c.font = 'bold 10px monospace'; c.fillStyle = '#00ffcc';
        c.shadowColor = '#00ffcc'; c.shadowBlur = 8;
        c.fillText(`⚡ NO-CD (${overdriveTimer.toFixed(1)}s)`, 12, 50);
        c.shadowBlur = 0;
      } else if (combo.m >= 32) {
        c.font = 'bold 10px monospace'; c.fillStyle = '#00ffff';
        c.shadowColor = '#00ffff'; c.shadowBlur = 10;
        c.fillText('⚡ x32 INVINCIBLE ⚡', 12, 50);
        c.shadowBlur = 0;
      } else if (combo.m > 1) {
        c.font = 'bold 10px monospace'; c.fillStyle = '#ff00ff';
        c.fillText('COMBO x' + combo.m, 12, 50);
      } else {
        c.font = '9px monospace'; c.fillStyle = '#556677';
        c.fillText('RECORD: ' + bestMadnessKills + ' KILLS', 12, 50);
      }

      // Timer in Center
      const tRatio = Math.min(1, madnessTimer / 30);
      const tCol = madnessTimer < 8 ? (Math.sin(time * 12) > 0 ? '#ff2244' : '#ffffff') : '#00ffff';
      const mDef = MADNESS_LEVELS[currentLevel % MADNESS_LEVELS.length];
      c.font = 'bold 10px monospace'; c.fillStyle = loopCount > 0 ? '#ffd700' : '#8899bb'; c.textAlign = 'center';
      c.fillText(loopCount > 0 ? `LVL ${currentLevel + 1}/${MADNESS_LEVELS.length} • B.${loopCount + 1} (+${loopCount * 10}%)` : `LVL ${currentLevel + 1}/${MADNESS_LEVELS.length} : ${mDef.name}`, CW / 2, 14);
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
    c.font = 'bold 12px monospace'; c.fillStyle = '#8899bb'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText('SCORE', 12, 16);
    c.font = 'bold 22px monospace'; c.fillStyle = '#ffd700';
    c.shadowColor = '#ffd700'; c.shadowBlur = 10;
    c.fillText(Math.round(dScore).toString().padStart(7, '0'), 12, 38);
    c.shadowBlur = 0;

    // Dash Gauge
    const dX = 134, dY = 14, dW = 90, dH = 18;
    const isOverdrive = overdriveTimer > 0;
    const isReady = dashCd <= 0 || isOverdrive;
    const cdProg = isReady ? 1 : Math.max(0, 1 - dashCd / 2.8);
    c.fillStyle = isOverdrive ? '#003828' : '#0c1322';
    c.strokeStyle = isOverdrive ? '#00ffcc' : (isReady ? '#00ffff' : '#223350');
    c.lineWidth = isOverdrive ? 2 : 1.5;
    c.shadowColor = isOverdrive ? '#00ffcc' : (isReady ? '#00ffff' : 'transparent');
    c.shadowBlur = isOverdrive ? 14 : (isReady ? 8 : 0);
    c.strokeRect(dX, dY, dW, dH);
    c.fillRect(dX, dY, dW, dH);
    if (cdProg > 0) {
      c.fillStyle = isOverdrive ? '#00ffcc' : (isReady ? '#00e5ff' : '#0077aa');
      c.fillRect(dX + 2, dY + 2, (dW - 4) * cdProg, dH - 4);
    }
    c.shadowBlur = 0;
    c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = isReady ? '#050a14' : '#ffffff';
    c.fillText(isOverdrive ? `⚡ NO-CD (${overdriveTimer.toFixed(1)}s)` : (isReady ? '⚡ DASH [SPACE]' : 'DASH ' + dashCd.toFixed(1) + 's'), dX + dW / 2, dY + dH / 2);

    // Hi-Score & Level
    c.font = '11px monospace'; c.fillStyle = '#666'; c.textAlign = 'center';
    c.fillText('HI-SCORE: ' + hi.toString().padStart(6, '0'), CW / 2, 14);
    const list = isMadness ? MADNESS_LEVELS : LEVELS;
    const lvl = list[currentLevel % list.length];
    c.font = 'bold 12px monospace'; c.fillStyle = lvl.glowColor; c.shadowColor = lvl.glowColor; c.shadowBlur = 8;
    c.fillText('LVL ' + (currentLevel + 1) + '/' + list.length + ': ' + lvl.name, CW / 2, 30); c.shadowBlur = 0;
    c.font = 'bold 11px monospace'; c.fillStyle = loopCount > 0 ? '#ffd700' : '#aaa';
    c.fillText(loopCount > 0 ? `WAVE ${wave} • BOUCLE ${loopCount + 1} (+${loopCount * 10}%)` : 'WAVE ' + wave, CW / 2, 46);

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
      const isGod = combo.m >= 32;
      const pulse = 1 + Math.sin(time * (isGod ? 14 : 8)) * (isGod ? 0.18 : 0.1);
      const sz = (16 + tier * 2.5) * pulse;
      c.font = `bold ${sz}px monospace`;
      c.fillStyle = isGod ? (Math.sin(time * 16) > 0 ? '#00ffff' : '#ffd700') : CC[tier];
      c.shadowColor = isGod ? '#00ffff' : CC[tier];
      c.shadowBlur = isGod ? 18 : 10;
      c.textAlign = 'right';
      c.fillText(isGod ? '⚡ x32 INVINCIBLE ⚡' : 'x' + combo.m, CW - 15, 46);
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
    c.fillStyle = '#080114';
    c.fillRect(0, 0, CW, CH);
    c.textAlign = 'center';

    // Perspective Synthwave Grid on horizon
    const horizonY = CH * 0.44;
    c.save();
    c.strokeStyle = 'rgba(255, 0, 128, 0.16)';
    c.lineWidth = 1.2;

    // Horizontal perspective lines
    for (let i = 1; i <= 14; i++) {
      const lineY = horizonY + Math.pow(i / 14, 2.2) * (CH - horizonY);
      c.beginPath();
      c.moveTo(0, lineY);
      c.lineTo(CW, lineY);
      c.stroke();
    }

    // Converging vertical perspective grid lines
    const vpX = CW / 2;
    for (let x = -CW * 0.5; x <= CW * 1.5; x += 40) {
      c.beginPath();
      c.moveTo(vpX, horizonY);
      c.lineTo(x, CH);
      c.stroke();
    }

    // 80s Outrun Striped Sunset Sun
    const sunX = CW / 2, sunY = horizonY - 18, sunR = 56;
    const sunGrad = c.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
    sunGrad.addColorStop(0, '#ffee00');
    sunGrad.addColorStop(0.45, '#ff4400');
    sunGrad.addColorStop(1, '#ff007f');

    c.save();
    c.beginPath();
    c.arc(sunX, sunY, sunR, 0, Math.PI, true);
    c.closePath();
    c.fillStyle = sunGrad;
    c.shadowColor = '#ff007f';
    c.shadowBlur = 24;
    c.fill();
    c.shadowBlur = 0;

    // Horizontal slice gaps through the sun
    c.fillStyle = '#080114';
    for (let s = 1; s <= 6; s++) {
      const sliceY = sunY - sunR * 0.75 + s * 10;
      const sliceH = 1 + s * 0.8;
      c.fillRect(sunX - sunR - 4, sliceY, (sunR + 4) * 2, sliceH);
    }
    c.restore();
    c.restore();

    // Title: 80s Chrome & Sunset Gradient
    const ty = CH * 0.16, p = 1 + Math.sin(time * 2) * 0.04;
    c.save();
    c.font = `bold ${42 * p}px monospace`;
    c.textAlign = 'center';

    // Deep Magenta Neon Glow
    c.shadowColor = '#ff007f';
    c.shadowBlur = 28;

    const titleGrad = c.createLinearGradient(CW / 2, ty - 26, CW / 2, ty + 12);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(0.35, '#00f0ff');
    titleGrad.addColorStop(0.65, '#ff00aa');
    titleGrad.addColorStop(1, '#ffd700');
    c.fillStyle = titleGrad;
    c.fillText('CHROMAVORE', CW / 2, ty);
    c.shadowBlur = 0;

    // Subtitle
    c.font = 'bold 11px monospace';
    c.fillStyle = '#00f0ff';
    c.shadowColor = '#00f0ff';
    c.shadowBlur = 8;
    c.fillText('⚡ RETRO SYNTHWAVE EDITION • OUTRUN THE SHADOWS ⚡', CW / 2, ty + 24);
    c.shadowBlur = 0;

    // Version Tag
    c.font = 'bold 9.5px monospace';
    c.fillStyle = 'rgba(255, 255, 255, 0.6)';
    c.fillText(GAME_VERSION, CW / 2, ty + 39);
    c.restore();
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';

    // Pac-Man & Dots Preview
    c.fillStyle = C_PLAYER;
    c.shadowColor = '#ff007f';
    c.shadowBlur = 15;
    const ma = Math.abs(Math.sin(time * 4)) * 0.6;
    c.beginPath(); c.arc(CW / 2 - 36, CH * 0.32, 17, ma, PI2 - ma); c.lineTo(CW / 2 - 36, CH * 0.32); c.fill(); c.shadowBlur = 0;
    for (let i = 0; i < 4; i++) {
      c.fillStyle = C_DOT; c.shadowColor = C_DOT; c.shadowBlur = 8;
      c.beginPath(); c.arc(CW / 2 - 4 + i * 18, CH * 0.32, 3.5, 0, PI2); c.fill(); c.shadowBlur = 0;
    }

    // Tabs
    const my = CH * 0.44;
    const isCl = gameMode === 'classic';
    c.fillStyle = isCl ? 'rgba(0, 240, 255, 0.15)' : 'rgba(15, 20, 35, 0.7)';
    c.strokeStyle = isCl ? '#00f0ff' : '#223348';
    c.lineWidth = isCl ? 2 : 1;
    c.shadowColor = isCl ? '#00f0ff' : 'transparent'; c.shadowBlur = isCl ? 14 : 0;
    c.beginPath(); c.roundRect(CW / 2 - 145, my, 135, 34, 6); c.fill(); c.stroke(); c.shadowBlur = 0;
    c.font = 'bold 11px monospace'; c.fillStyle = isCl ? '#00f0ff' : '#8899aa'; c.fillText('[1] CLASSIQUE', CW / 2 - 78, my + 21);

    const isMad = gameMode === 'madness';
    c.fillStyle = isMad ? 'rgba(255, 0, 127, 0.2)' : 'rgba(25, 10, 25, 0.7)';
    c.strokeStyle = isMad ? '#ff007f' : '#442030';
    c.lineWidth = isMad ? 2 : 1;
    c.shadowColor = isMad ? '#ff007f' : 'transparent'; c.shadowBlur = isMad ? 16 : 0;
    c.beginPath(); c.roundRect(CW / 2 + 10, my, 135, 34, 6); c.fill(); c.stroke(); c.shadowBlur = 0;
    c.font = 'bold 11px monospace'; c.fillStyle = isMad ? '#ff007f' : '#8899aa'; c.fillText('[2] MADNESS ⚡', CW / 2 + 78, my + 21);



    // Subtitle description
    c.font = '11px monospace'; c.fillStyle = '#ffaa00';
    if (isMad) {
      c.fillText('PAC-MAN VULNÉRABLE • DASH TRANCHANT • GAUCHE-DROITE [EMP] • 3X SPEED', CW / 2, CH * 0.63);
    } else {
      c.fillText('SURVIE TACTIQUE • 204 ORBES • 4 LABYRINTHES NÉON • DASH & COMBOS', CW / 2, CH * 0.63);
    }

    // Start prompt
    c.font = 'bold 14px monospace'; c.fillStyle = '#fff';
    c.shadowColor = '#00f0ff'; c.shadowBlur = 10;
    if (Math.sin(time * 4) > 0) c.fillText('PRESS SPACE OU TAP POUR COMMENCER', CW / 2, CH * 0.70);
    c.shadowBlur = 0;

    // Controls guide
    c.font = '11px monospace'; c.fillStyle = '#8899bb';
    c.fillText('Flèches / ZQSD : Déplacement  |  SPACE : Dash Offensif', CW / 2, CH * 0.76);
    if (isMad) {
      c.fillText('Kombos : ← → ← → (Wiggle EMP)  |  ↑ ↓ ↑ ↓ (Nitro Jet)', CW / 2, CH * 0.80);
      c.fillText('E / SHIFT / Bouton 💣 : Déclencher Super-Item', CW / 2, CH * 0.84);
    } else {
      c.fillText('P : Pause & Réglages FX  |  M : Audio Synthwave', CW / 2, CH * 0.80);
    }

    // CRT Scanlines on menu too
    if (settingsManager.settings.crtScanlines) {
      c.save();
      c.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let y = 0; y < CH; y += 3) c.fillRect(0, y, CW, 1);
      c.restore();
    }

    // Records
    c.font = 'bold 12px monospace'; c.fillStyle = '#ffd700';
    if (isMad) {
      c.fillText('RECORD MADNESS : ' + bestMadnessKills + ' FANTÔMES PURGÉS', CW / 2, CH * 0.88);
    } else {
      c.fillText('RECORD CLASSIQUE : ' + hi + ' PTS', CW / 2, CH * 0.88);
    }

    // Player Profile & Sync ID Card
    const unlockedCount = SKILL_TREE.filter(s => progression.isSkillUnlocked(s.id)).length;
    c.font = 'bold 11px monospace';
    c.fillStyle = '#ffffff';
    c.fillText(`👤 ${profileManager.profile.pseudo}  •  CODE ID : ${profileManager.profile.syncCode}`, CW / 2, CH * 0.92);

    // Navigation Links
    c.font = 'bold 10px monospace';
    c.fillStyle = '#00f0ff';
    c.shadowColor = '#00f0ff';
    c.shadowBlur = 8;
    const unlockedBadges = badges.getUnlockedCount();
    const totalBadges = badges.getTotalCount();
    c.fillText(`⚡ [C] ARSENAL (${unlockedCount}/18)  |  🏆 [B] SUCCÈS (${unlockedBadges}/${totalBadges})  |  📊 [L] SCORES  |  📲 [K] REPRENDRE`, CW / 2, CH * 0.96);
    c.shadowBlur = 0;
  }

  public drawGameOver(isMadness: boolean, score: number, hi: boolean, madnessKills: number, madnessStreak: number, bestMadnessKills: number, badgesUnlocked: number, time: number, loopCount: number = 0) {
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
      if (loopCount > 0) {
        c.font = 'bold 13px monospace'; c.fillStyle = '#00ffcc'; c.fillText(`BOUCLE ATTEINTE : ${loopCount + 1} (+${loopCount * 10}% VIT)`, CW / 2, cy + 74);
      }
      if (hi) {
        c.font = 'bold 16px monospace'; c.fillStyle = '#ff44ff'; c.shadowColor = '#ff44ff'; c.shadowBlur = 10;
        if (Math.sin(time * 6) > 0) c.fillText('★ NOUVEAU RECORD ! ★', CW / 2, cy + (loopCount > 0 ? 98 : 76)); c.shadowBlur = 0;
      }
    }

    c.fillStyle = '#ffd700'; c.font = '12px monospace';
    c.fillText('🏆 Badges & Succès : ' + badgesUnlocked + '/' + badges.getTotalCount() + ' Débloqués', CW / 2, cy + 130);

    // Career Progression Bar
    const nxt = progression.getNextUnlock();
    const barW = 320, barH = 10;
    const barX = CW / 2 - barW / 2, barY = cy + 158;
    c.fillStyle = 'rgba(15, 20, 35, 0.85)';
    c.strokeStyle = '#00ffff';
    c.lineWidth = 1.5;
    c.beginPath();
    c.roundRect(barX, barY, barW, barH, 4);
    c.fill();
    c.stroke();

    const fillW = Math.max(0, Math.min(barW, barW * nxt.progress));
    c.fillStyle = '#00ffcc';
    c.shadowColor = '#00ffcc';
    c.shadowBlur = 8;
    c.beginPath();
    c.roundRect(barX, barY, fillW, barH, 4);
    c.fill();
    c.shadowBlur = 0;

    c.font = 'bold 10px monospace';
    c.fillStyle = '#ffffff';
    if (nxt.skill) {
      c.fillText(`👻 CARRIÈRE : ${progression.totalGhosts} ➔ PROCHAIN : ${nxt.skill.name} (${nxt.remaining} 👻)`, CW / 2, barY - 6);
    } else {
      c.fillText(`👑 CARRIÈRE MAXIMALE : ${progression.totalGhosts} 👻 (TOUT DÉBLOQUÉ)`, CW / 2, barY - 6);
    }

    c.font = '13px monospace'; c.fillStyle = '#aaa';
    if (Math.sin(time * 3) > 0) c.fillText('PRESS SPACE TO REPLAY', CW / 2, cy + 195);

    // Leaderboard link
    c.font = 'bold 11px monospace'; c.fillStyle = '#ff007f';
    c.shadowColor = '#ff007f'; c.shadowBlur = 8;
    if (Math.sin(time * 2.5) > 0) c.fillText('[ L ] CLASSEMENT  |  [ C ] ARSENAL & SKILLS', CW / 2, cy + 220);
    c.shadowBlur = 0;

    // Version Tag
    c.font = '8.5px monospace';
    c.fillStyle = 'rgba(255, 255, 255, 0.35)';
    c.textAlign = 'center';
    c.fillText(GAME_VERSION, CW / 2, CH - 8);
  }

  public drawLeaderboard(
    entries: import('../systems/Leaderboard').LeaderboardEntry[],
    mode: 'classic' | 'madness',
    time: number,
    playerRank: number = 0,
    playerDate: string = ''
  ) {
    const c = this.ctx;
    c.fillStyle = '#06010f';
    c.fillRect(0, 0, CW, CH);

    // Background grid
    c.strokeStyle = 'rgba(255, 0, 127, 0.08)';
    c.lineWidth = 1;
    for (let x = 0; x < CW; x += 30) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, CH); c.stroke(); }
    for (let y = 0; y < CH; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(CW, y); c.stroke(); }

    // Title
    const titleGrad = c.createLinearGradient(CW / 2, 20, CW / 2, 60);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(0.5, '#00f0ff');
    titleGrad.addColorStop(1, '#ff007f');
    c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.fillStyle = titleGrad;
    c.shadowColor = '#00f0ff'; c.shadowBlur = 16;
    c.fillText('🏆 LEADERBOARD', CW / 2, 42); c.shadowBlur = 0;

    // Mode tab
    const modeLabel = mode === 'madness' ? '⚡ MADNESS — KILLS' : '🎮 CLASSIQUE — SCORE';
    c.font = 'bold 11px monospace'; c.fillStyle = mode === 'madness' ? '#ff007f' : '#00f0ff';
    c.fillText(modeLabel, CW / 2, 62);

    // Column headers
    const startY = 86;
    c.font = 'bold 9px monospace'; c.fillStyle = '#445566'; c.textAlign = 'center';
    c.fillText('#', 34, startY);
    c.textAlign = 'left';
    c.fillText('PSEUDO', 64, startY);
    c.textAlign = 'right';
    c.fillText(mode === 'madness' ? 'KILLS & SCORE' : 'SCORE', CW - 28, startY);

    // Separator
    c.strokeStyle = '#1a2840'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(20, startY + 6); c.lineTo(CW - 20, startY + 6); c.stroke();

    // Entries
    const rowH = 36;

    for (let i = 0; i < Math.min(entries.length, 12); i++) {
      const e = entries[i];
      const y = startY + 16 + i * rowH;
      const isPlayer = e.date === playerDate;
      const rank = i + 1;

      // Row highlight
      if (isPlayer) {
        const pulse = 0.14 + Math.sin(time * 5) * 0.06;
        c.fillStyle = `rgba(255, 0, 127, ${pulse})`;
        c.fillRect(18, y - 14, CW - 36, rowH - 2);
        c.strokeStyle = '#ff007f'; c.lineWidth = 1.5;
        c.strokeRect(18, y - 14, CW - 36, rowH - 2);
      } else if (i % 2 === 0) {
        c.fillStyle = 'rgba(255,255,255,0.025)';
        c.fillRect(18, y - 14, CW - 36, rowH - 2);
      }

      // Rank Badge
      c.textAlign = 'center';
      if (rank === 1) {
        c.font = 'bold 12px monospace';
        c.fillStyle = '#ffd700';
        c.shadowColor = '#ffd700';
        c.shadowBlur = 10;
        c.fillText('🥇 1', 34, y);
        c.shadowBlur = 0;
      } else if (rank === 2) {
        c.font = 'bold 12px monospace';
        c.fillStyle = '#e2e8f0';
        c.shadowColor = '#e2e8f0';
        c.shadowBlur = 8;
        c.fillText('🥈 2', 34, y);
        c.shadowBlur = 0;
      } else if (rank === 3) {
        c.font = 'bold 12px monospace';
        c.fillStyle = '#ff9944';
        c.shadowColor = '#ff9944';
        c.shadowBlur = 8;
        c.fillText('🥉 3', 34, y);
        c.shadowBlur = 0;
      } else {
        c.font = 'bold 11px monospace';
        c.fillStyle = isPlayer ? '#ffd700' : '#556677';
        c.fillText(rank + '.', 34, y);
      }

      // Pseudo
      c.textAlign = 'left';
      c.font = isPlayer ? 'bold 12px monospace' : '11px monospace';
      c.fillStyle = isPlayer ? '#ffd700' : (rank <= 3 ? '#ffffff' : '#aabbcc');
      if (isPlayer) { c.shadowColor = '#ffd700'; c.shadowBlur = 8; }
      c.fillText(e.pseudo.toUpperCase().slice(0, 12), 64, y - 2);
      c.shadowBlur = 0;

      // Date under pseudo
      c.font = '8px monospace'; c.fillStyle = '#445566';
      c.fillText(e.date ? e.date.slice(0, 10) : '', 64, y + 11);

      // Score and Kills on right
      c.textAlign = 'right';
      if (mode === 'madness') {
        // Line 1: Kills
        c.font = 'bold 12px monospace';
        c.fillStyle = rank === 1 ? '#ffd700' : (isPlayer ? '#ff007f' : '#00f0ff');
        if (rank === 1) { c.shadowColor = '#ffd700'; c.shadowBlur = 8; }
        c.fillText(`${e.kills ?? 0} KILLS`, CW - 28, y - 2);
        c.shadowBlur = 0;

        // Line 2: Score underneath Kills
        c.font = 'bold 9px monospace';
        c.fillStyle = isPlayer ? '#ffd700' : '#ffaa00';
        c.fillText(`${(e.score || 0).toLocaleString()} PTS`, CW - 28, y + 11);
      } else {
        // Classic: Score
        c.font = 'bold 12px monospace';
        c.fillStyle = rank === 1 ? '#ffd700' : (isPlayer ? '#ff007f' : '#00f0ff');
        if (rank === 1) { c.shadowColor = '#ffd700'; c.shadowBlur = 8; }
        c.fillText(e.score.toString().padStart(7, '0'), CW - 28, y);
        c.shadowBlur = 0;
      }
    }

    if (entries.length === 0) {
      c.font = '13px monospace'; c.fillStyle = '#445566'; c.textAlign = 'center';
      c.fillText('Aucun score enregistré...', CW / 2, CH * 0.5);
      c.font = '11px monospace'; c.fillStyle = '#334455';
      c.fillText('Jouez une partie et entrez votre pseudo !', CW / 2, CH * 0.5 + 24);
    }

    // Footer
    c.font = 'bold 10px monospace'; c.fillStyle = '#334466'; c.textAlign = 'center';
    c.fillText('[ ESPACE / ECHAP ] RETOUR  •  [ 1 ] CLASSIQUE  •  [ 2 ] MADNESS', CW / 2, CH - 14);
  }

  public drawCodex(time: number, tab: 'skills' | 'badges' = 'skills', page: number = 0) {
    const c = this.ctx;
    c.fillStyle = '#06010f';
    c.fillRect(0, 0, CW, CH);

    const isSkills = tab === 'skills';
    const unlockedSkills = SKILL_TREE.filter(s => progression.isSkillUnlocked(s.id)).length;
    const unlockedBadges = badges.getUnlockedCount();
    const totalBadges = badges.getTotalCount();

    // Title
    c.save();
    c.textAlign = 'center';
    c.font = 'bold 18px monospace';
    const grad = c.createLinearGradient(0, 15, 0, 45);
    grad.addColorStop(0, '#00ffff');
    grad.addColorStop(0.5, '#ff00aa');
    grad.addColorStop(1, '#ffd700');
    c.fillStyle = grad;
    c.shadowColor = isSkills ? '#00ffff' : '#ffd700';
    c.shadowBlur = 10;
    c.fillText(isSkills ? '⚡ ARSENAL & ARBRE DES COMPÉTENCES ⚡' : '🏆 SUCCÈS & TROPHÉES DE CARRIÈRE 🏆', CW / 2, 26);
    c.shadowBlur = 0;
    c.restore();

    // Tab Switcher Bar at top (y: 36, h: 26)
    const tabW = 200, tabH = 24, tabY = 36;

    // Tab 1: Skills
    c.fillStyle = isSkills ? 'rgba(0, 240, 255, 0.22)' : 'rgba(15, 20, 35, 0.7)';
    c.strokeStyle = isSkills ? '#00f0ff' : '#223348';
    c.lineWidth = isSkills ? 1.8 : 1;
    c.shadowColor = isSkills ? '#00f0ff' : 'transparent';
    c.shadowBlur = isSkills ? 8 : 0;
    c.beginPath();
    c.roundRect(CW / 2 - tabW - 8, tabY, tabW, tabH, 5);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    c.font = 'bold 10px monospace';
    c.fillStyle = isSkills ? '#00f0ff' : '#8899aa';
    c.textAlign = 'center';
    c.fillText(`[1] ⚡ ARSENAL (${unlockedSkills}/18)`, CW / 2 - tabW / 2 - 8, tabY + 16);

    // Tab 2: Badges
    const isBadges = tab === 'badges';
    c.fillStyle = isBadges ? 'rgba(255, 215, 0, 0.22)' : 'rgba(15, 20, 35, 0.7)';
    c.strokeStyle = isBadges ? '#ffd700' : '#223348';
    c.lineWidth = isBadges ? 1.8 : 1;
    c.shadowColor = isBadges ? '#ffd700' : 'transparent';
    c.shadowBlur = isBadges ? 8 : 0;
    c.beginPath();
    c.roundRect(CW / 2 + 8, tabY, tabW, tabH, 5);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    c.font = 'bold 10px monospace';
    c.fillStyle = isBadges ? '#ffd700' : '#8899aa';
    c.fillText(`[2] 🏆 SUCCÈS (${unlockedBadges}/${totalBadges})`, CW / 2 + tabW / 2 + 8, tabY + 16);

    if (isSkills) {
      // Career Progress Bar Header
      const nxt = progression.getNextUnlock();
      const barW = 460, barH = 8;
      const barX = CW / 2 - barW / 2, barY = 76;
      c.fillStyle = 'rgba(15, 20, 35, 0.9)';
      c.strokeStyle = '#00ffff';
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(barX, barY, barW, barH, 4);
      c.fill();
      c.stroke();

      const fillW = Math.max(0, Math.min(barW, barW * nxt.progress));
      c.fillStyle = '#00ffcc';
      c.shadowColor = '#00ffcc';
      c.shadowBlur = 8;
      c.beginPath();
      c.roundRect(barX, barY, fillW, barH, 4);
      c.fill();
      c.shadowBlur = 0;

      c.font = 'bold 9.5px monospace';
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      if (nxt.skill) {
        c.fillText(`👻 TOTAL CARRIÈRE : ${progression.totalGhosts.toLocaleString()} ➔ PROCHAIN : ${nxt.skill.name} (${nxt.remaining.toLocaleString()} 👻)`, CW / 2, 70);
      } else {
        c.fillText(`👑 TOTAL CARRIÈRE : ${progression.totalGhosts.toLocaleString()} 👻 (ARSENAL MAÎTRISÉ À 100% !)`, CW / 2, 70);
      }

      // 2 Columns of 9 skills each:
      const v1Skills = SKILL_TREE.filter(s => s.version === 1);
      const v2Skills = SKILL_TREE.filter(s => s.version === 2);

      const colW = 265, cardH = 49;
      const col1X = 24, col2X = 299;
      const startY = 92, gapY = 54;

      for (let i = 0; i < v1Skills.length; i++) {
        const s = v1Skills[i];
        const y = startY + i * gapY;
        this.drawSkillCard(c, s, col1X, y, colW, cardH);
      }
      for (let i = 0; i < v2Skills.length; i++) {
        const s = v2Skills[i];
        const y = startY + i * gapY;
        this.drawSkillCard(c, s, col2X, y, colW, cardH);
      }

      // Footer
      c.font = 'bold 10.5px monospace';
      c.fillStyle = '#00ffff';
      c.textAlign = 'center';
      c.shadowColor = '#00ffff';
      c.shadowBlur = 6;
      c.fillText('[1] ARSENAL  •  [2] SUCCÈS  •  [TAB] BASCULER  •  [ECHAP / C] RETOUR', CW / 2, CH - 14);
      c.shadowBlur = 0;
    } else {
      // BADGES & ACHIEVEMENTS GALLERY
      const allBadges = Object.values(BADGES);
      const pageSize = 14;
      const maxPages = Math.ceil(allBadges.length / pageSize);
      const curPage = Math.max(0, Math.min(page, maxPages - 1));
      const pageBadges = allBadges.slice(curPage * pageSize, (curPage + 1) * pageSize);

      // Progress bar header for badges
      const ratio = unlockedBadges / allBadges.length;
      const barW = 460, barH = 8;
      const barX = CW / 2 - barW / 2, barY = 76;
      c.fillStyle = 'rgba(15, 20, 35, 0.9)';
      c.strokeStyle = '#ffd700';
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(barX, barY, barW, barH, 4);
      c.fill();
      c.stroke();

      const fillW = Math.max(0, Math.min(barW, barW * ratio));
      c.fillStyle = '#ffd700';
      c.shadowColor = '#ffd700';
      c.shadowBlur = 8;
      c.beginPath();
      c.roundRect(barX, barY, fillW, barH, 4);
      c.fill();
      c.shadowBlur = 0;

      c.font = 'bold 9.5px monospace';
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.fillText(`🏆 SUCCÈS ACCOMPLIS : ${unlockedBadges} / ${allBadges.length} (${Math.round(ratio * 100)}%)`, CW / 2, 70);

      // Draw 2 Columns of 7 cards
      const colW = 265, cardH = 64;
      const col1X = 24, col2X = 299;
      const startY = 92, gapY = 70;

      for (let i = 0; i < pageBadges.length; i++) {
        const b = pageBadges[i];
        const isCol2 = i >= 7;
        const colX = isCol2 ? col2X : col1X;
        const rowIdx = isCol2 ? i - 7 : i;
        const y = startY + rowIdx * gapY;
        this.drawBadgeCard(c, b, colX, y, colW, cardH);
      }

      // Footer
      c.font = 'bold 10.5px monospace';
      c.fillStyle = '#ffd700';
      c.textAlign = 'center';
      c.shadowColor = '#ffd700';
      c.shadowBlur = 6;
      c.fillText(`[1] ARSENAL  •  [2] SUCCÈS  •  [PAGE ${curPage + 1}/${maxPages} • FLÈCHES ← / →]  •  [ECHAP / B] RETOUR`, CW / 2, CH - 14);
      c.shadowBlur = 0;
    }
  }

  private drawBadgeCard(c: CanvasRenderingContext2D, b: import('../systems/BadgeSystem').BadgeDef, x: number, y: number, w: number, h: number) {
    const unlocked = badges.isUnlocked(b.id);
    c.save();

    c.fillStyle = unlocked ? 'rgba(255, 215, 0, 0.09)' : 'rgba(15, 20, 35, 0.7)';
    c.strokeStyle = unlocked ? '#ffd700' : '#223348';
    c.lineWidth = unlocked ? 1.5 : 1;
    if (unlocked) {
      c.shadowColor = '#ffd700';
      c.shadowBlur = 8;
    }
    c.beginPath();
    c.roundRect(x, y, w, h, 6);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // Icon
    c.font = '16px monospace';
    c.textAlign = 'left';
    c.fillText(b.icon, x + 8, y + 20);

    // Name
    c.font = 'bold 10px monospace';
    c.fillStyle = unlocked ? '#ffd700' : '#8899aa';
    c.fillText(b.name, x + 30, y + 17);

    // Status tag
    c.textAlign = 'right';
    c.font = 'bold 8.5px monospace';
    if (unlocked) {
      c.fillStyle = '#00ffcc';
      c.fillText('✅ OBTENU', x + w - 8, y + 17);
    } else {
      c.fillStyle = '#667788';
      c.fillText(b.killsRequired ? `🔒 ${b.killsRequired.toLocaleString()} 👻` : '🔒 DÉFI', x + w - 8, y + 17);
    }

    // Description
    c.textAlign = 'left';
    c.font = '8.5px monospace';
    c.fillStyle = unlocked ? '#dddddd' : '#556677';
    c.fillText(b.desc.slice(0, 48), x + 8, y + 36);

    // Progress bar for kill badges if locked
    if (!unlocked && b.killsRequired) {
      const pRatio = Math.max(0, Math.min(1, progression.totalGhosts / b.killsRequired));
      const pbW = w - 16, pbH = 4, pbX = x + 8, pbY = y + 46;
      c.fillStyle = 'rgba(255, 255, 255, 0.08)';
      c.fillRect(pbX, pbY, pbW, pbH);
      c.fillStyle = '#00ffff';
      c.fillRect(pbX, pbY, pbW * pRatio, pbH);
      c.font = '7.5px monospace';
      c.fillStyle = '#00ffff';
      c.textAlign = 'right';
      c.fillText(`${progression.totalGhosts.toLocaleString()} / ${b.killsRequired.toLocaleString()} 👻`, pbX + pbW, pbY + 11);
    } else if (unlocked) {
      c.font = '7.5px monospace';
      c.fillStyle = '#ffaa00';
      c.fillText('🏆 Trophée enregistré au profil cloud', x + 8, y + 54);
    }

    c.restore();
  }

  private drawSkillCard(c: CanvasRenderingContext2D, s: import('../systems/ProgressionSystem').SkillDef, x: number, y: number, w: number, h: number) {
    const state = progression.getSkillState(s.id);
    const unlocked = state.unlocked;
    const isNext = state.isNext;
    const hidden = state.hidden;
    const isV2 = s.version === 2;

    if (unlocked) {
      c.fillStyle = isV2 ? 'rgba(0, 255, 230, 0.08)' : 'rgba(255, 215, 0, 0.07)';
      c.strokeStyle = isV2 ? '#00e5ff' : '#ffd700';
      c.lineWidth = 1.5;
      c.shadowColor = isV2 ? '#00e5ff' : '#ffd700';
      c.shadowBlur = 6;
    } else if (isNext) {
      c.fillStyle = 'rgba(255, 170, 0, 0.08)';
      c.strokeStyle = '#ffaa00';
      c.lineWidth = 1.4;
      c.shadowColor = '#ffaa00';
      c.shadowBlur = 5;
    } else {
      c.fillStyle = 'rgba(10, 14, 24, 0.65)';
      c.strokeStyle = '#1e2838';
      c.lineWidth = 1;
      c.shadowBlur = 0;
    }

    c.beginPath();
    c.roundRect(x, y, w, h, 6);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // Header: Icon + Version + Name
    c.textAlign = 'left';
    c.font = 'bold 11px monospace';

    if (unlocked) {
      c.fillStyle = isV2 ? '#00ffff' : '#ffd700';
      c.fillText(`${s.icon} [V${s.version}] ${s.name}`, x + 8, y + 16);
    } else if (isNext) {
      c.fillStyle = '#ffcc00';
      c.fillText(`${s.icon} [V${s.version}] ${s.name}`, x + 8, y + 16);
    } else {
      // Hidden / classified: name is hidden!
      c.fillStyle = '#4a5a70';
      c.fillText(`🔒 [V${s.version}] ??? [CLASSIFIÉ]`, x + 8, y + 16);
    }

    // Status pill
    c.textAlign = 'right';
    c.font = 'bold 10px monospace';
    if (unlocked) {
      c.fillStyle = '#00ffaa';
      c.fillText('ACTIF ✅', x + w - 8, y + 16);
    } else if (isNext) {
      c.fillStyle = '#ffd700';
      c.fillText(`🎯 ${s.threshold.toLocaleString()} 👻`, x + w - 8, y + 16);
    } else {
      c.fillStyle = '#6a7888';
      c.fillText(`🔒 ${s.threshold.toLocaleString()} 👻`, x + w - 8, y + 16);
    }

    // Command
    c.textAlign = 'left';
    c.font = '9px monospace';
    if (unlocked) {
      c.fillStyle = '#ffffff';
      c.fillText(s.command, x + 8, y + 30);
    } else if (isNext) {
      c.fillStyle = '#ffdd88';
      c.fillText(s.command, x + 8, y + 30);
    } else {
      c.fillStyle = '#334455';
      c.fillText('🔒 COMMANDE CHIFFRÉE', x + 8, y + 30);
    }

    // Effect summary
    c.font = '8.5px monospace';
    if (unlocked) {
      c.fillStyle = isV2 ? '#aaffff' : '#ddd';
      c.fillText(s.desc.slice(0, 44), x + 8, y + 43);
    } else if (isNext) {
      c.fillStyle = '#eeddcc';
      c.fillText(s.desc.slice(0, 44), x + 8, y + 43);
    } else {
      c.fillStyle = '#2a3848';
      c.fillText('Atteignez le palier précédent pour décoder.', x + 8, y + 43);
    }
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
        label: 'LIGNES CRT SCANLINES (80s TV)',
        state: s.crtScanlines ? 'ACTIVÉ 📺' : 'COUPÉ ❌',
        active: s.crtScanlines
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
        label: 'AUDIO & SYNTHWAVE BGM',
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

    // Wipe Data button
    const wipeBtn = PAUSE_BUTTONS[6];
    c.fillStyle = 'rgba(255, 0, 85, 0.12)';
    c.strokeStyle = '#ff0055';
    c.lineWidth = 1.5;
    c.beginPath();
    c.roundRect(wipeBtn.x, wipeBtn.y, wipeBtn.w, wipeBtn.h, 6);
    c.fill();
    c.stroke();
    c.font = 'bold 11px monospace';
    c.fillStyle = '#ff0055';
    c.textAlign = 'center';
    c.fillText('🗑️ RÉINITIALISER MA PROGRESSION & PROFIL', wipeBtn.x + wipeBtn.w / 2, wipeBtn.y + 21);

    // Resume button
    const resBtn = PAUSE_BUTTONS[7];
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
    c.font = `bold ${12 * pulse}px monospace`;
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.fillText('▶ REPRENDRE [P]', resBtn.x + resBtn.w / 2, resBtn.y + 26);

    // Restart button
    const rstBtn = PAUSE_BUTTONS[8];
    c.fillStyle = '#20180a';
    c.strokeStyle = '#ffaa00';
    c.lineWidth = 2;
    c.shadowColor = '#ffaa00';
    c.shadowBlur = 10;
    c.beginPath();
    c.roundRect(rstBtn.x, rstBtn.y, rstBtn.w, rstBtn.h, 8);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    c.font = 'bold 12px monospace';
    c.fillStyle = '#ffaa00';
    c.textAlign = 'center';
    c.fillText('🔄 REJOUER [R]', rstBtn.x + rstBtn.w / 2, rstBtn.y + 26);

    // Home button
    const homeBtn = PAUSE_BUTTONS[9];
    c.fillStyle = '#1a0a20';
    c.strokeStyle = '#ff007f';
    c.lineWidth = 2;
    c.shadowColor = '#ff007f';
    c.shadowBlur = 10;
    c.beginPath();
    c.roundRect(homeBtn.x, homeBtn.y, homeBtn.w, homeBtn.h, 8);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    c.font = 'bold 12px monospace';
    c.fillStyle = '#ff007f';
    c.textAlign = 'center';
    c.fillText('🏠 ACCUEIL', homeBtn.x + homeBtn.w / 2, homeBtn.y + 26);

    // Footer stats if in madness
    if (isMadness) {
      c.font = '10px monospace';
      c.fillStyle = '#ffd700';
      c.fillText(`MODE MADNESS • Kills : ${kills} • Streak : x${streak}`, CW / 2, cardY + cardH - 12);
    }

    c.font = '8.5px monospace';
    c.fillStyle = 'rgba(255, 255, 255, 0.35)';
    c.textAlign = 'center';
    c.fillText(GAME_VERSION, CW / 2, cardY + cardH + 18);

    c.restore();
  }

  public drawWaveTrans(currentLevel: number, wave: number, loopCount: number = 0, isMadness: boolean = false) {
    const c = this.ctx;
    const list = isMadness ? MADNESS_LEVELS : LEVELS;
    const lvl = list[currentLevel % list.length];
    c.font = 'bold 36px monospace'; c.fillStyle = lvl.glowColor; c.shadowColor = lvl.glowColor; c.shadowBlur = 25;
    c.textAlign = 'center'; c.fillText('NIVEAU ' + (currentLevel + 1), CW / 2, CH / 2 - 12); c.shadowBlur = 0;
    c.font = 'bold 18px monospace'; c.fillStyle = '#ffffff'; c.fillText(lvl.name, CW / 2, CH / 2 + 20);
    c.font = '13px monospace'; c.fillStyle = '#888'; c.fillText('+' + (1000 * (wave - 1)) + ' WAVE BONUS', CW / 2, CH / 2 + 46);
    if (loopCount > 0) {
      c.font = 'bold 15px monospace'; c.fillStyle = '#ffd700'; c.shadowColor = '#ffd700'; c.shadowBlur = 10;
      c.fillText(`🌀 BOUCLE ${loopCount + 1} : VITESSE +${loopCount * 10}% !`, CW / 2, CH / 2 + 72);
      c.shadowBlur = 0;
    }
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

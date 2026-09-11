// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — CANVAS RENDERER & VISUAL PIPELINE
// ═══════════════════════════════════════════════════════════════

import { CW, CH, HUD_H, T, ROWS, COLS, HALF, PI2, C_BG, C_GLOW, C_PLAYER, C_DOT, PC, DASH_BTN, CC, COMBO_DECAY, GOD_MODE_DURATION, getComboTier, GAME_VERSION, BONUS_DURATION, BONUS_ARENA_W, BONUS_ARENA_H, BONUS_FORCE_FIELD_BASE_RAD, BONUS_FORCE_FIELD_MAX_RAD, MADNESS_UNLOCK_KILLS, ChromaTier, CHROMA_BG, CHROMA_DOT, CHROMA_WALL, CHROMA_PELLET } from '../config/constants';
import { LEVELS, MADNESS_LEVELS, MazeManager } from '../levels/levels';
import { Player } from '../entities/Player';
import { EnemyManager } from '../entities/Enemy';
import { PowerupManager } from '../entities/Powerups';
import { SuperItemManager } from '../systems/SuperItems';
import { ParticleSystem, particles } from '../systems/ParticleSystem';
import { BadgeManager, badges, BADGES } from '../systems/BadgeSystem';
import { sounds } from '../audio/SoundManager';
import { settingsManager, PAUSE_BUTTONS, updatePauseButtonPositions } from '../systems/SettingsManager';
import { progression, SKILL_TREE } from '../systems/ProgressionSystem';
import { profileManager } from '../systems/ProfileManager';
import { spriteAtlas } from './SpriteAtlas';

export interface EffectTimer {
  label: string;
  timer: number;
  maxTimer: number;
  color: string;
  icon: string;
}

export class Renderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public cw: number = CW;
  public ch: number = CH;
  public chromaTier: ChromaTier = 0; // Chroma Awakening — mis à jour par main.ts chaque frame
  public menuLinks: { id: string; label: string; x: number; y: number; w: number }[] = [];
  private ghostStamps: Map<string, HTMLCanvasElement[]> = new Map();

  /** Retourne une couleur adaptée au tier chromatique (monochrome/grayscale au tier 0, progressive ensuite) */
  public getChromaAccent(baseColor: string, fallbackGray: string = '#888888'): string {
    if (this.chromaTier === 0) return fallbackGray;
    if (this.chromaTier === 1) return '#8899aa';
    if (this.chromaTier === 2) return '#66aacc';
    return baseColor;
  }

  /** Retourne un niveau de flou / ombre selon le tier chromatique (aucun glow au tier 0) */
  public getChromaBlur(baseBlur: number = 10): number {
    if (this.chromaTier === 0) return 0;
    if (this.chromaTier === 1) return Math.min(2, Math.floor(baseBlur * 0.25));
    if (this.chromaTier === 2) return Math.min(5, Math.floor(baseBlur * 0.5));
    return baseBlur;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = this.cw;
    canvas.height = this.ch;
    this.ctx = canvas.getContext('2d')!;
    this.initGhostStamps();
  }

  public updateCanvasSize(cols: number, rows: number) {
    this.cw = cols * T;
    this.ch = rows * T + HUD_H;
    if (this.canvas.width !== this.cw || this.canvas.height !== this.ch) {
      this.canvas.width = this.cw;
      this.canvas.height = this.ch;
      updatePauseButtonPositions(this.cw);
    }
  }

  private initGhostStamps() {
    const colors = ['#00f0ff', '#ff007f', '#ffd700', '#00ffaa', '#b000ff', '#ff6600'];
    const r = 8;
    for (const col of colors) {
      const frames: HTMLCanvasElement[] = [];
      for (let f = 0; f < 2; f++) {
        const sc = document.createElement('canvas');
        sc.width = 36;
        sc.height = 36;
        const sctx = sc.getContext('2d')!;
        sctx.translate(18, 18);

        // Precalculated Neon Glow Aura
        sctx.fillStyle = col;
        sctx.shadowColor = col;
        sctx.shadowBlur = 8;

        // Ghost body path with animated scallop
        sctx.beginPath();
        sctx.arc(0, -2, r, Math.PI, 0, false);
        sctx.lineTo(r, r);
        const wave = f === 0 ? 2.5 : -2.5;
        sctx.lineTo(r * 0.33, r - 2 + wave);
        sctx.lineTo(0, r - wave);
        sctx.lineTo(-r * 0.33, r - 2 + wave);
        sctx.lineTo(-r, r);
        sctx.closePath();
        sctx.fill();
        sctx.shadowBlur = 0;

        // Outer white eyes
        sctx.fillStyle = '#ffffff';
        sctx.beginPath();
        sctx.arc(-3, -3, 2.6, 0, PI2);
        sctx.arc(3, -3, 2.6, 0, PI2);
        sctx.fill();

        // Dark pupils oriented toward center
        sctx.fillStyle = '#0a0224';
        sctx.beginPath();
        sctx.arc(-2.8, -3, 1.4, 0, PI2);
        sctx.arc(3.2, -3, 1.4, 0, PI2);
        sctx.fill();

        frames.push(sc);
      }
      this.ghostStamps.set(col, frames);
    }
  }

  public clear(lvlIndex: number, time: number = 0, isMadness: boolean = false) {
    const list = isMadness ? MADNESS_LEVELS : LEVELS;
    const lvl = list[lvlIndex % list.length];
    const c = this.ctx;
    const tier = this.chromaTier;
    c.clearRect(0, 0, this.cw, CH);

    // Fond : monochrome noir au tier 0, néon progressif ensuite
    const bgTop = tier === 0 ? '#000000' : (tier === 1 ? '#050510' : '#090117');
    const bgMid = tier <= 1 ? CHROMA_BG[tier] : lvl.bg;
    const bgBot = tier <= 1 ? '#000000' : '#1d002e';

    const bgGrad = c.createLinearGradient(0, 0, 0, CH);
    bgGrad.addColorStop(0, bgTop);
    bgGrad.addColorStop(0.5, bgMid);
    bgGrad.addColorStop(1, bgBot);
    c.fillStyle = bgGrad;
    c.fillRect(0, 0, this.cw, CH);

    // Grille synthwave : désactivée au tier 0 (trop stylisée pour le début)
    if (tier >= 1 && settingsManager.settings.synthwaveGrid) {
      c.save();
      c.strokeStyle = 'rgba(255, 0, 128, 0.06)';
      c.lineWidth = 1;
      const scrollY = (time * 28) % T;
      for (let y = scrollY; y < CH; y += T) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(this.cw, y); c.stroke();
      }
      for (let x = 0; x < this.cw; x += T) {
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, CH); c.stroke();
      }
      c.restore();
    }
  }


  public drawDots(maze: MazeManager, time: number) {
    const lvl = maze.getLevelDef();
    const c = this.ctx;
    const tier = this.chromaTier;
    // Couleurs progressives : monochrome au début, néon complet au tier 5
    const dotCol    = tier <= 4 ? CHROMA_DOT[tier]    : lvl.dotColor;
    const pelletCol = tier <= 4 ? CHROMA_PELLET[tier] : lvl.pelletColor;
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < maze.cols; col++) {
        const d = maze.dotMap[r][col];
        if (!d) continue;
        const px = col * T + HALF, py = r * T + HALF;
        if (d === 2) {
          c.fillStyle = dotCol;
          c.beginPath();
          c.arc(px, py, 2.5, 0, PI2);
          c.fill();
        } else if (d === 3) {
          const p = 1 + Math.sin(time * 4) * 0.3;
          c.fillStyle = pelletCol;
          c.shadowColor = pelletCol;
          c.shadowBlur = tier <= 1 ? 4 : 12;
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

  public drawOverlays(fx: { phase: number; timewarp: number; magnet: number }, flsh: { a: number; c: string }, plPos: { x: number; y: number }, time: number, isChronoActive: boolean = false) {
    const c = this.ctx;
    if (fx.phase > 0) {
      c.globalAlpha = 0.08 + Math.sin(time * 6) * 0.04;
      c.fillStyle = PC.phase;
      c.fillRect(0, 0, this.cw, ROWS * T);
      c.globalAlpha = 1;
    }
    if (fx.timewarp > 0) {
      c.globalAlpha = 0.06 + Math.sin(time * 3) * 0.03;
      c.fillStyle = PC.timewarp;
      c.fillRect(0, 0, this.cw, ROWS * T);
      c.globalAlpha = 1;
    }
    if (isChronoActive) {
      c.save();
      const maxH = ROWS * T;

      // 1. Full-screen chronal matrix tint & pulsating time-warp wash
      const p = Math.sin(time * 10) * 0.03;
      c.fillStyle = `rgba(0, 240, 255, ${0.14 + p})`;
      c.fillRect(0, 0, this.cw, maxH);

      // 2. High-Tech Sweeping Chronal Scan-beam
      const scanY = (time * 150) % maxH;
      const scanGrad = c.createLinearGradient(0, scanY - 35, 0, scanY + 35);
      scanGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
      scanGrad.addColorStop(0.5, 'rgba(0, 255, 255, 0.32)');
      scanGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      c.fillStyle = scanGrad;
      c.fillRect(0, scanY - 35, this.cw, 70);

      // Fine temporal grid lines
      c.fillStyle = 'rgba(0, 240, 255, 0.08)';
      for (let y = 0; y < maxH; y += 4) {
        c.fillRect(0, y, this.cw, 1);
      }

      // 3. Deep Neon Cyan/Ice-Blue Chromatic Vignette
      const vig = c.createRadialGradient(
        this.cw / 2, maxH / 2, maxH * 0.18,
        this.cw / 2, maxH / 2, maxH * 0.76
      );
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(0.55, 'rgba(0, 190, 255, 0.18)');
      vig.addColorStop(1, 'rgba(0, 240, 255, 0.58)');
      c.fillStyle = vig;
      c.fillRect(0, 0, this.cw, maxH);

      // 4. Expanding Refractive Spacetime Waves radiating from Player
      for (let i = 0; i < 3; i++) {
        const ringRad = ((time * 110 + i * 45) % 130);
        const ringAlpha = Math.max(0, 1 - ringRad / 130) * 0.65;
        c.strokeStyle = `rgba(0, 255, 255, ${ringAlpha})`;
        c.lineWidth = 2.5;
        c.shadowColor = '#00ffff';
        c.shadowBlur = 12;
        c.beginPath();
        c.arc(plPos.x, plPos.y, ringRad, 0, Math.PI * 2);
        c.stroke();
      }

      // 5. Cybernetic HUD Brackets & Status Readout
      c.strokeStyle = '#00f0ff';
      c.lineWidth = 2;
      c.shadowColor = '#00f0ff';
      c.shadowBlur = 8;
      const bMargin = 12;
      const bLen = 22;

      // Top-Left Corner Bracket
      c.beginPath();
      c.moveTo(bMargin, bMargin + bLen);
      c.lineTo(bMargin, bMargin);
      c.lineTo(bMargin + bLen, bMargin);
      c.stroke();

      // Top-Right Corner Bracket
      c.beginPath();
      c.moveTo(this.cw - bMargin - bLen, bMargin);
      c.lineTo(this.cw - bMargin, bMargin);
      c.lineTo(this.cw - bMargin, bMargin + bLen);
      c.stroke();

      // Bottom-Left Corner Bracket
      c.beginPath();
      c.moveTo(bMargin, maxH - bMargin - bLen);
      c.lineTo(bMargin, maxH - bMargin);
      c.lineTo(bMargin + bLen, maxH - bMargin);
      c.stroke();

      // Bottom-Right Corner Bracket
      c.beginPath();
      c.moveTo(this.cw - bMargin - bLen, maxH - bMargin);
      c.lineTo(this.cw - bMargin, maxH - bMargin);
      c.lineTo(this.cw - bMargin, maxH - bMargin - bLen);
      c.stroke();

      // Glowing Top Cyber Readout
      c.font = 'bold 9.5px monospace';
      c.fillStyle = '#00ffff';
      c.textAlign = 'center';
      c.fillText('<< DILATATION TEMPORELLE // CHRONO-SHIFT >>', this.cw / 2, 22);

      c.restore();
    }
    if (flsh.a > 0) {
      c.globalAlpha = flsh.a;
      c.fillStyle = flsh.c;
      c.fillRect(0, 0, this.cw, ROWS * T);
      c.globalAlpha = 1;
    }

    // 80s CRT Scanlines & Phosphor Bloom
    if (settingsManager.settings.crtScanlines) {
      c.save();
      c.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < ROWS * T; y += 3) {
        c.fillRect(0, y, this.cw, 1.2);
      }
      const vig = c.createRadialGradient(this.cw / 2, (ROWS * T) / 2, (ROWS * T) * 0.35, this.cw / 2, (ROWS * T) / 2, (ROWS * T) * 0.78);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(15, 2, 28, 0.42)');
      c.fillStyle = vig;
      c.fillRect(0, 0, this.cw, ROWS * T);
      c.restore();
    }
  }

  public drawEffectTimers(effects: EffectTimer[]) {
    const visible = effects.filter(effect => effect.timer > 0);
    if (visible.length === 0) return;

    const c = this.ctx;
    const badgeR = 10;
    const spacing = 28;
    const rightMargin = 16;
    const cy = HUD_H + 15;

    c.save();
    for (let i = 0; i < visible.length; i++) {
      const effect = visible[i];
      const cx = this.cw - rightMargin - i * spacing;
      const ratio = Math.max(0, Math.min(1, effect.timer / Math.max(effect.maxTimer, 0.01)));
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + PI2 * ratio;

      // Dark translucent circular backdrop chip
      c.fillStyle = 'rgba(6, 12, 24, 0.85)';
      c.beginPath();
      c.arc(cx, cy, badgeR + 2, 0, PI2);
      c.fill();

      // Depleting radial progress ring
      c.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      c.lineWidth = 1.8;
      c.beginPath();
      c.arc(cx, cy, badgeR, 0, PI2);
      c.stroke();

      c.strokeStyle = effect.color;
      c.shadowColor = effect.color;
      c.shadowBlur = 6;
      c.lineWidth = 2.0;
      c.beginPath();
      c.arc(cx, cy, badgeR, startAngle, endAngle);
      c.stroke();
      c.shadowBlur = 0;

      // Leading edge spark
      if (ratio > 0.05) {
        const sx = cx + Math.cos(endAngle) * badgeR;
        const sy = cy + Math.sin(endAngle) * badgeR;
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(sx, sy, 1.4, 0, PI2);
        c.fill();
      }

      // Crisp pixel-art icon in the center
      spriteAtlas.drawIcon(c, effect.icon, cx, cy, 13);

      // Micro countdown timer text below chip
      c.font = 'bold 7px monospace';
      c.textAlign = 'center';
      c.textBaseline = 'top';
      c.fillStyle = effect.color;
      c.fillText(`${effect.timer.toFixed(1)}s`, cx, cy + badgeR + 3);
    }
    c.restore();
  }

  public drawOnboardingHint(careerKills: number, time: number) {
    let hint = '';
    if (careerKills < 1) hint = 'OBJECTIF : MANGE UNE SUPER PASTILLE';
    else if (careerKills < 10) hint = `FANTÔMES EFFRAYÉS = FRAGS • DASH ${careerKills}/10`;
    else if (careerKills < 75) hint = 'DASH : ESPACE • PROCHAIN SUPER-ITEM À 75 FRAGS';
    if (!hint) return;

    const c = this.ctx;
    const alpha = 0.7 + Math.sin(time * 3) * 0.2;
    c.save();
    c.font = 'bold 10px monospace';
    c.textAlign = 'center';
    c.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    c.shadowColor = '#ffd700';
    c.shadowBlur = 8;
    c.fillText(hint, this.cw / 2, HUD_H + 19);
    c.restore();
  }

  public drawHUD(
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
    loopCount: number = 0,
    isPredator: boolean = false,
    predTimer: number = 0,
    predMaxTimer: number = 7.0,
    isWarn: boolean = false,
    chronoEnergy: number = 100,
    isChronoActive: boolean = false,
    chronoLevel: number = 1
  ) {
    const isMadness = true;
    const c = this.ctx;
    c.fillStyle = '#0a0a12';
    c.fillRect(0, 0, this.cw, HUD_H);

    if (isMadness) {
      // Madness HUD
      const isWide = this.cw >= 450;
      c.textAlign = 'left'; c.textBaseline = 'middle';

      // 1. Live Animated Score Line
      c.font = 'bold 9px monospace'; c.fillStyle = '#8899bb';
      c.fillText('SCORE', 10, 13);
      c.font = 'bold 16px monospace'; c.fillStyle = '#ffd700';
      c.shadowColor = '#ffd700'; c.shadowBlur = 8;
      c.fillText(Math.round(dScore).toString().padStart(6, '0'), isWide ? 52 : 46, 13);
      c.shadowBlur = 0;

      // 2. Kills & Streak
      spriteAtlas.drawIcon(c, 'skull', 16, 27, 13);
      c.font = 'bold 11px monospace'; c.fillStyle = '#00f0ff';
      c.fillText(madnessKills.toString(), 26, 27);

      const stX = isWide ? 76 : 60;
      spriteAtlas.drawIcon(c, 'flame', stX, 27, 13);
      c.font = 'bold 10px monospace'; c.fillStyle = '#ff5533';
      c.fillText('x' + madnessStreak, stX + 10, 27);

      // 3. Status / Combo / Predator
      if (combo.m >= 32) {
        const pProg = Math.max(0, Math.min(1, combo.t / GOD_MODE_DURATION));
        spriteAtlas.drawIcon(c, 'lightning', 15, 41, 11);
        c.font = 'bold 9px monospace'; c.fillStyle = '#ffd700';
        c.shadowColor = '#ffd700'; c.shadowBlur = 8;
        c.fillText(`x32 (${combo.t.toFixed(1)}s)`, 24, 41);
        c.shadowBlur = 0;
        c.fillStyle = '#222'; c.fillRect(10, 46, isWide ? 85 : 62, 3);
        c.fillStyle = '#ffd700'; c.fillRect(10, 46, (isWide ? 85 : 62) * pProg, 3);
      } else if (isPredator && predTimer > 0) {
        const pProg = Math.max(0, Math.min(1, predTimer / (predMaxTimer || 7.0)));
        spriteAtlas.drawIcon(c, 'lightning', 15, 41, 11);
        c.font = 'bold 8.5px monospace'; c.fillStyle = '#00ffff';
        c.shadowColor = '#00ffff'; c.shadowBlur = 8;
        c.fillText(isWide ? `PROIE EFFRAYÉE (${predTimer.toFixed(1)}s)` : `EFFRAYÉ ${predTimer.toFixed(1)}s`, 24, 41);
        c.shadowBlur = 0;
        c.fillStyle = '#222'; c.fillRect(10, 46, isWide ? 85 : 62, 3);
        c.fillStyle = '#00ffff'; c.fillRect(10, 46, (isWide ? 85 : 62) * pProg, 3);
      } else if (overdriveTimer > 0) {
        spriteAtlas.drawIcon(c, 'overdrive', 15, 41, 11);
        c.font = 'bold 8.5px monospace'; c.fillStyle = '#00ffcc';
        c.shadowColor = '#00ffcc'; c.shadowBlur = 8;
        c.fillText(`NO-CD (${overdriveTimer.toFixed(1)}s)`, 24, 41);
        c.shadowBlur = 0;
      } else if (combo.m > 1) {
        c.font = 'bold 9px monospace'; c.fillStyle = '#ff00ff';
        c.fillText('COMBO x' + combo.m, 10, 41);
      } else {
        const dashThreshold = SKILL_TREE.find(s => s.id === 'dash_v1')?.threshold ?? 10;
        const dashLevel = progression.getSkillLevel('dash');
        c.font = 'bold 8px monospace';
        c.fillStyle = dashLevel > 0 ? '#00ffff' : '#ffaa00';
        c.fillText(dashLevel > 0 ? 'DASH [ESPACE]' : `DASH ${progression.totalGhosts}/${dashThreshold}`, 10, 41);
      }

      // 4. Timer in Center
      const tmX = isWide ? Math.round(this.cw * 0.50) : 130;
      const tmBarW = isWide ? 90 : 46;
      const tRatio = Math.min(1, madnessTimer / 30);
      const tCol = madnessTimer < 8 ? (Math.sin(time * 12) > 0 ? '#ff2244' : '#ffffff') : '#00ffff';
      const mDef = MADNESS_LEVELS[currentLevel % MADNESS_LEVELS.length];
      c.font = isWide ? 'bold 10px monospace' : 'bold 8px monospace';
      c.fillStyle = loopCount > 0 ? '#ffd700' : '#8899bb';
      c.textAlign = 'center';
      c.fillText(
        loopCount > 0
          ? (isWide ? `LVL ${currentLevel + 1}/${MADNESS_LEVELS.length} • B.${loopCount + 1} (+${loopCount * 10}%)` : `L.${currentLevel + 1} B.${loopCount + 1}`)
          : (isWide ? `LVL ${currentLevel + 1}/${MADNESS_LEVELS.length} : ${mDef.name}` : `LVL ${currentLevel + 1}/${MADNESS_LEVELS.length}`),
        tmX,
        13
      );
      c.font = isWide ? 'bold 17px monospace' : 'bold 13px monospace';
      c.fillStyle = tCol;
      c.shadowColor = tCol;
      c.shadowBlur = 8;
      spriteAtlas.drawIcon(c, 'chrono', tmX - (isWide ? 44 : 34), 27, 14);
      c.fillText(madnessTimer.toFixed(1) + 's', tmX + 6, 27);
      c.shadowBlur = 0;
      c.fillStyle = '#222';
      c.fillRect(tmX - tmBarW / 2, 40, tmBarW, 3);
      c.fillStyle = tCol;
      c.fillRect(tmX - tmBarW / 2, 40, tmBarW * tRatio, 3);

      // 5. Chrono-Shift (Bullet Time) Gauge
      const chW = isWide ? 68 : 48;
      const chH = isWide ? 6 : 5;
      const chCenter = isWide ? Math.round(this.cw * 0.28) : 192;
      const chX = Math.round(chCenter - chW / 2);
      const chY = 24;
      const maxChrono = chronoLevel === 2 ? 150 : 100;
      const chRatio = Math.max(0, Math.min(1, chronoEnergy / maxChrono));

      c.textAlign = 'center';
      c.font = isWide ? 'bold 8px monospace' : 'bold 7px monospace';
      if (chronoLevel === 0) {
        const chronoRequirement = SKILL_TREE.find(skill => skill.id === 'chrono_v1')?.threshold ?? 180;
        c.fillStyle = '#556677';
        spriteAtlas.drawIcon(c, 'lock', chCenter - (isWide ? 34 : 24), 13, 10);
        c.fillText(isWide ? `CHRONO : ${chronoRequirement} FRAGS` : `${chronoRequirement} FRAGS`, chCenter + 6, 13);
        c.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        c.lineWidth = 1;
        c.strokeRect(chX, chY, chW, chH);
        c.fillStyle = 'rgba(8, 16, 28, 0.6)';
        c.fillRect(chX, chY, chW, chH);
      } else if (isChronoActive) {
        c.fillStyle = '#ffffff';
        c.shadowColor = '#00f0ff';
        c.shadowBlur = 10;
        spriteAtlas.drawIcon(c, 'chrono', chCenter - (isWide ? 34 : 26), 13, 11);
        c.fillText(chronoLevel === 2 ? 'SLOW 12%' : 'SLOW 18%', chCenter + 6, 13);
        c.shadowBlur = 0;
      } else {
        c.fillStyle = chronoEnergy >= 25 ? '#00e5ff' : '#ff4466';
        spriteAtlas.drawIcon(c, 'chrono', chCenter - (isWide ? 36 : 24), 13, 11);
        c.fillText(isWide ? `CHRONO ${Math.round(chronoEnergy)}%` : `${Math.round(chronoEnergy)}%`, chCenter + 6, 13);
      }

      if (chronoLevel > 0) {
        c.fillStyle = 'rgba(8, 16, 28, 0.9)';
        c.strokeStyle = isChronoActive ? '#ffffff' : (chronoEnergy >= 25 ? '#00f0ff' : '#ff4466');
        c.lineWidth = isChronoActive ? 1.5 : 1;
        if (isChronoActive) {
          c.shadowColor = '#00f0ff';
          c.shadowBlur = 10;
        }
        c.strokeRect(chX, chY, chW, chH);
        c.fillRect(chX, chY, chW, chH);
        c.shadowBlur = 0;

        if (chRatio > 0) {
          const fillW = Math.max(2, (chW - 2) * chRatio);
          const grad = c.createLinearGradient(chX, chY, chX + fillW, chY);
          if (isChronoActive) {
            grad.addColorStop(0, '#00f0ff');
            grad.addColorStop(1, '#ffffff');
          } else {
            grad.addColorStop(0, '#0088cc');
            grad.addColorStop(1, chronoLevel === 2 ? '#00ffea' : '#00f0ff');
          }
          c.fillStyle = grad;
          if (isChronoActive) {
            c.shadowColor = '#00f0ff';
            c.shadowBlur = 8;
          }
          c.fillRect(chX + 1, chY + 1, fillW, chH - 2);
          c.shadowBlur = 0;
        }
        c.font = '7px monospace';
        c.fillStyle = isChronoActive ? '#00f0ff' : '#667788';
        c.fillText('[SHIFT]', chCenter, 41);
      }

      // 6. Active Item / Arsenal status
      c.textAlign = 'right';
      const rightPad = isWide ? 14 : 10;
      if (superItems.isRunning()) {
        c.font = 'bold 10px monospace'; c.fillStyle = '#00ffff'; c.shadowColor = '#00ffff'; c.shadowBlur = 10;
        c.fillText('ITEM EN ACTION !', this.cw - rightPad, 18); c.shadowBlur = 0;
        c.font = '8px monospace'; c.fillStyle = '#ffbb00';
        c.fillText('UN SEUL ITEM À LA FOIS', this.cw - rightPad, 34);
      } else if (superItems.boardDrop) {
        c.font = isWide ? 'bold 9px monospace' : 'bold 8px monospace';
        c.fillStyle = '#ffd700'; c.shadowColor = '#ffd700'; c.shadowBlur = 10;
        c.fillText(`${superItems.boardDrop.item.name} SUR LE PLATEAU`, this.cw - rightPad, 18);
        c.shadowBlur = 0;
        c.font = '8px monospace'; c.fillStyle = '#00ffff';
        c.fillText(`À RAMASSER • ${superItems.boardDrop.timer.toFixed(1)}s`, this.cw - rightPad, 34);
      } else {
        const unlockedItems = progression.getUnlockedSuperItems();
        if (unlockedItems.length === 0) {
          const novaRequirement = SKILL_TREE.find(s => s.id === 'nova_v1')?.threshold ?? 150;
          const killsLeft = Math.max(0, novaRequirement - progression.totalGhosts);
          c.font = isWide ? 'bold 9px monospace' : 'bold 8px monospace';
          c.fillStyle = '#8899aa';
          const nText = `NOVA : ${progression.totalGhosts}/${novaRequirement}`;
          const ntw = c.measureText(nText).width;
          spriteAtlas.drawIcon(c, 'nova', this.cw - rightPad - ntw - 10, 16, 12);
          c.fillText(nText, this.cw - rightPad, 16);
          c.font = '7.5px monospace';
          c.fillStyle = '#ff007f';
          c.fillText(`ENCORE ${killsLeft} KILLS`, this.cw - rightPad, 32);
        } else {
          c.font = isWide ? 'bold 10px monospace' : 'bold 8.5px monospace';
          c.fillStyle = '#ffd700';
          c.shadowColor = '#ffd700';
          c.shadowBlur = 8;
          c.fillText('SUPER-ITEMS SUR LE PLATEAU', this.cw - rightPad, 16);
          c.shadowBlur = 0;
          c.font = '8px monospace';
          c.fillStyle = '#00ffff';
          c.fillText(`PROCHAINE APPARITION : ${Math.max(0, superItems.spawnTimer).toFixed(1)}s`, this.cw - rightPad, 34);
        }
      }

      // Lives: mini Chromavores
      for (let i = 0; i < lives; i++) {
        c.save();
        c.translate(this.cw - 16 - i * 18, 51);
        Player.drawChromavore(c, 5.5, time, 0.2, false, false, 1);
        c.restore();
      }

      // Audio status
      c.font = '9px monospace'; c.fillStyle = sounds.isMuted() ? '#ff4444' : '#44aa77'; c.textAlign = 'left';
      spriteAtlas.drawIcon(c, sounds.isMuted() ? 'audio_off' : 'audio_on', this.cw - 30, HUD_H - 6, 12);
      c.fillText('[M]', this.cw - 18, HUD_H - 6);
      return;
    }

    // Compact HUD fallback
    c.font = 'bold 12px monospace'; c.fillStyle = '#8899bb'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText('SCORE', 12, 16);
    c.font = 'bold 22px monospace'; c.fillStyle = '#ffd700';
    c.shadowColor = '#ffd700'; c.shadowBlur = 10;
    c.fillText(Math.round(dScore).toString().padStart(7, '0'), 12, 38);
    c.shadowBlur = 0;

    // Dash / Predator Invincible Gauge
    const dX = 134, dY = 14, dW = 100, dH = 18;
    if (combo.m >= 32) {
      const pProg = Math.max(0, Math.min(1, combo.t / GOD_MODE_DURATION));
      const pCol = '#00ffff';
      c.fillStyle = '#0e1828';
      c.strokeStyle = '#ffd700';
      c.lineWidth = 1.8;
      c.shadowColor = '#00ffff';
      c.shadowBlur = 12;
      c.strokeRect(dX, dY, dW, dH);
      c.fillRect(dX, dY, dW, dH);
      c.fillStyle = pCol;
      c.fillRect(dX + 2, dY + 2, (dW - 4) * pProg, dH - 4);
      c.shadowBlur = 0;
      c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#050a14';
      c.fillText(`x32 ${combo.t.toFixed(1)}s`, dX + dW / 2, dY + dH / 2);
    } else if (isPredator && predTimer > 0) {
      const pProg = Math.max(0, Math.min(1, predTimer / (predMaxTimer || 7.0)));
      const pCol = '#00ffff';
      c.fillStyle = '#0e1828';
      c.strokeStyle = '#00ffff';
      c.lineWidth = 1.5;
      c.strokeRect(dX, dY, dW, dH);
      c.fillRect(dX, dY, dW, dH);
      c.fillStyle = pCol;
      c.fillRect(dX + 2, dY + 2, (dW - 4) * pProg, dH - 4);
      c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#050a14';
      c.fillText(`PROIE ${predTimer.toFixed(1)}s`, dX + dW / 2, dY + dH / 2);
    } else if (isMadness) {
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
      c.fillText(isOverdrive ? `NO-CD (${overdriveTimer.toFixed(1)}s)` : (isReady ? 'DASH [SPACE]' : 'DASH ' + dashCd.toFixed(1) + 's'), dX + dW / 2, dY + dH / 2);
    }

    // Hi-Score & Level
    c.font = '11px monospace'; c.fillStyle = '#666'; c.textAlign = 'center';
    c.fillText('HI-SCORE: ' + hi.toString().padStart(6, '0'), this.cw / 2, 14);
    const list = isMadness ? MADNESS_LEVELS : LEVELS;
    const lvl = list[currentLevel % list.length];
    c.font = 'bold 12px monospace'; c.fillStyle = lvl.glowColor; c.shadowColor = lvl.glowColor; c.shadowBlur = 8;
    c.fillText('LVL ' + (currentLevel + 1) + '/' + list.length + ': ' + lvl.name, this.cw / 2, 30); c.shadowBlur = 0;
    c.font = 'bold 11px monospace'; c.fillStyle = loopCount > 0 ? '#ffd700' : '#aaa';
    c.fillText(loopCount > 0 ? `WAVE ${wave} • BOUCLE ${loopCount + 1} (+${loopCount * 10}%)` : 'WAVE ' + wave, this.cw / 2, 46);

    // Lives
    c.textAlign = 'right';
    for (let i = 0; i < lives; i++) {
      c.fillStyle = C_PLAYER; c.beginPath();
      c.arc(this.cw - 20 - i * 24, 20, 8, 0.3, PI2 - 0.3);
      c.lineTo(this.cw - 20 - i * 24, 20); c.fill();
    }

    // Multiplier & Combo Gauge
    if (combo.m > 1) {
      const tier = getComboTier(combo.n);
      const isGod = combo.m >= 32;
      const sz = 16 + tier * 2;
      c.font = `bold ${sz}px monospace`;
      const maxT = isGod ? GOD_MODE_DURATION : COMBO_DECAY;
      c.fillStyle = isGod ? '#ffd700' : CC[tier];
      c.shadowColor = isGod ? '#ffd700' : CC[tier];
      c.shadowBlur = isGod ? 12 : 8;
      c.textAlign = 'right';
      c.fillText(isGod ? `COMBO x32 (${combo.t.toFixed(1)}s)` : 'x' + combo.m, this.cw - 15, 46);
      c.shadowBlur = 0;

      // Decay Progress Bar
      const bW = 60, bX = this.cw - 15 - bW, bY = 51;
      c.fillStyle = '#222233';
      c.fillRect(bX, bY, bW, 3);
      c.fillStyle = CC[tier];
      const prog = Math.max(0, Math.min(1, combo.t / maxT));
      c.fillRect(bX, bY, bW * prog, 3);
    }

    // Audio status
    c.font = '9px monospace'; c.fillStyle = sounds.isMuted() ? '#ff4444' : '#44aa77'; c.textAlign = 'left';
    spriteAtlas.drawIcon(c, sounds.isMuted() ? 'audio_off' : 'audio_on', this.cw - 30, HUD_H - 6, 12);
    c.fillText('[M]', this.cw - 18, HUD_H - 6);
  }

  public drawMenu(time: number, bestMadnessKills: number) {
    const c = this.ctx;
    const tier = this.chromaTier;

    // Fond selon le tier
    c.fillStyle = tier === 0 ? '#050505' : tier === 1 ? '#060610' : '#080114';
    c.fillRect(0, 0, this.cw, CH);
    c.textAlign = 'center';

    // Grille perspective Synthwave — masquée au tier 0, atténuée ensuite
    if (tier >= 1) {
      const horizonY = 245;
      c.save();
      const gridAlpha = tier === 1 ? 0.04 : tier === 2 ? 0.08 : 0.14;
      const gridColor = tier <= 2 ? `rgba(180,180,200,${gridAlpha})` : `rgba(255,0,128,${gridAlpha})`;
      c.strokeStyle = gridColor;
      c.lineWidth = 1.2;

      for (let i = 1; i <= 12; i++) {
        const lineY = horizonY + Math.pow(i / 12, 2.2) * (CH - horizonY);
        c.beginPath();
        c.moveTo(0, lineY);
        c.lineTo(this.cw, lineY);
        c.stroke();
      }
      const vpX = this.cw / 2;
      for (let x = -this.cw * 0.5; x <= this.cw * 1.5; x += 40) {
        c.beginPath();
        c.moveTo(vpX, horizonY);
        c.lineTo(x, CH);
        c.stroke();
      }
      c.restore();
    }

    // Soleil Outrun — gris au tier 0–1, coloré ensuite
    const sunX = this.cw / 2, sunY = 245, sunR = 48;
    c.save();
    if (tier <= 1) {
      const sunGrad = c.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
      sunGrad.addColorStop(0, tier === 0 ? '#555555' : '#888899');
      sunGrad.addColorStop(1, tier === 0 ? '#222222' : '#444455');
      c.fillStyle = sunGrad;
      c.shadowBlur = 0;
    } else {
      const sunGrad = c.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
      sunGrad.addColorStop(0, '#ffee00');
      sunGrad.addColorStop(0.45, '#ff4400');
      sunGrad.addColorStop(1, '#ff007f');
      c.fillStyle = sunGrad;
      c.shadowColor = '#ff007f';
      c.shadowBlur = tier <= 3 ? 8 : 20;
    }
    c.beginPath();
    c.arc(sunX, sunY, sunR, 0, Math.PI, true);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;

    const bgSlice = tier === 0 ? '#050505' : tier === 1 ? '#060610' : '#080114';
    c.fillStyle = bgSlice;
    for (let s = 1; s <= 5; s++) {
      const sliceY = sunY - sunR * 0.7 + s * 8;
      const sliceH = 1 + s * 0.7;
      c.fillRect(sunX - sunR - 4, sliceY, (sunR + 4) * 2, sliceH);
    }
    c.restore();

    // Titre CHROMAVORE — monochrome → néon selon le tier
    const ty = 105, p = 1 + Math.sin(time * 2) * 0.03;
    c.save();
    c.font = `bold ${38 * p}px monospace`;
    c.textAlign = 'center';

    if (tier === 0) {
      c.fillStyle = '#cccccc';
      c.shadowBlur = 0;
      c.fillText('CHROMAVORE', this.cw / 2, ty);
    } else if (tier <= 2) {
      c.fillStyle = tier === 1 ? '#aaaacc' : '#ddeeff';
      c.shadowColor = tier === 1 ? '#446688' : '#6688aa';
      c.shadowBlur = tier * 6;
      c.fillText('CHROMAVORE', this.cw / 2, ty);
      c.shadowBlur = 0;
    } else {
      c.shadowColor = '#ff007f';
      c.shadowBlur = 24;
      const titleGrad = c.createLinearGradient(this.cw / 2, ty - 24, this.cw / 2, ty + 10);
      titleGrad.addColorStop(0, '#ffffff');
      titleGrad.addColorStop(0.35, '#00f0ff');
      titleGrad.addColorStop(0.65, '#ff00aa');
      titleGrad.addColorStop(1, '#ffd700');
      c.fillStyle = titleGrad;
      c.fillText('CHROMAVORE', this.cw / 2, ty);
      c.shadowBlur = 0;
    }

    // Version Tag
    c.font = 'bold 9px monospace';
    c.fillStyle = 'rgba(255, 255, 255, 0.35)';
    c.fillText(GAME_VERSION, this.cw / 2, ty + 22);
    c.restore();
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';

    // Hero & Dots Preview — Chromavore sur l'horizon du soleil
    const ma = Math.abs(Math.sin(time * 4)) * 0.6;
    c.save();
    c.translate(this.cw / 2 - 34, 240);
    Player.drawChromavore(c, 13, time, ma, false, false, 1, this.chromaTier);
    c.restore();
    for (let i = 0; i < 4; i++) {
      const dotC = CHROMA_DOT[this.chromaTier] || C_DOT;
      c.fillStyle = dotC; c.shadowColor = dotC; c.shadowBlur = 8;
      c.beginPath(); c.arc(this.cw / 2 - 4 + i * 16, 240, 3, 0, PI2); c.fill(); c.shadowBlur = 0;
    }

    // --- CARTE ÉPURÉE : LET'S HUNT (Centrée verticalement) ---
    const madW = 340, madH = 68;
    const madX = this.cw / 2 - madW / 2;
    const madY = 310;

    c.save();
    const cardBg = this.chromaTier === 0
      ? 'rgba(255, 255, 255, 0.04)'
      : (this.chromaTier <= 2 ? 'rgba(80, 140, 200, 0.12)' : 'rgba(255, 0, 127, 0.22)');
    const cardBorder = this.chromaTier === 0
      ? '#555555'
      : (this.chromaTier <= 2 ? '#5588aa' : '#ff007f');
    c.fillStyle = cardBg;
    c.strokeStyle = cardBorder;
    c.lineWidth = 2;
    c.shadowColor = this.chromaTier === 0 ? 'transparent' : cardBorder;
    c.shadowBlur = this.getChromaBlur(14);
    c.beginPath();
    c.roundRect(madX, madY, madW, madH, 8);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // Header : LET'S HUNT
    c.textAlign = 'center';
    c.font = 'bold 16px monospace';
    c.fillStyle = '#ffffff';
    c.shadowColor = cardBorder;
    c.shadowBlur = this.getChromaBlur(10);
    c.fillText("LET'S HUNT", this.cw / 2, madY + 27);
    c.shadowBlur = 0;

    // Prompt à l'intérieur de la carte avec pulsation
    const playPulse = 0.55 + 0.45 * Math.sin(time * 3.5);
    c.font = 'bold 11px monospace';
    c.fillStyle = this.chromaTier === 0 ? `rgba(210, 210, 210, ${playPulse})` : `rgba(255, 255, 255, ${playPulse})`;
    c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#ff007f';
    c.shadowBlur = this.getChromaBlur(8 * playPulse);
    c.fillText('▶ APPUYER SUR ESPACE POUR JOUER ◀', this.cw / 2, madY + 50);
    c.shadowBlur = 0;
    c.restore();

    // CRT Scanlines
    if (settingsManager.settings.crtScanlines) {
      c.save();
      c.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let y = 0; y < CH; y += 3) c.fillRect(0, y, this.cw, 1);
      c.restore();
    }

    // Player Profile & Sync ID Card (JOUEUR au lieu de PILOTE)
    c.font = 'bold 11px monospace';
    c.fillStyle = this.chromaTier === 0 ? '#777777' : '#e0f4ff';
    c.textAlign = 'center';
    c.fillText(`JOUEUR : ${profileManager.profile.pseudo}   •   CODE ID : ${profileManager.profile.syncCode}`, this.cw / 2, 480);

    // Liens de navigation débloqués progressivement
    const unlockedCount = SKILL_TREE.filter(s => progression.isSkillUnlocked(s.id)).length;
    const unlockedBadges = badges.getUnlockedCount();
    const totalBadges = badges.getTotalCount();

    interface MenuLinkItem {
      id: string;
      label: string;
    }

    const availableLinks: MenuLinkItem[] = [
      { id: 'help', label: '[I] AIDE' },
    ];

    // ARSENAL n'apparaît que si au moins un skill ou frag est acquis
    if (unlockedCount > 0 || progression.totalGhosts > 0) {
      availableLinks.push({ id: 'arsenal', label: `[C] ARSENAL (${unlockedCount}/${SKILL_TREE.length})` });
    }

    availableLinks.push({ id: 'settings', label: '[O] PARAMÈTRES' });

    // SUCCÈS n'apparaît que si au moins un succès est débloqué
    if (unlockedBadges > 0) {
      availableLinks.push({ id: 'badges', label: `[B] SUCCÈS (${unlockedBadges}/${totalBadges})` });
    }

    availableLinks.push({ id: 'scores', label: '[L] SCORES' });
    availableLinks.push({ id: 'sync', label: '[K] SYNC' });

    this.menuLinks = [];
    c.font = 'bold 11px monospace';
    c.fillStyle = this.getChromaAccent('#00f0ff', '#777777');
    c.shadowColor = c.fillStyle;
    c.shadowBlur = this.getChromaBlur(6);

    if (availableLinks.length <= 4) {
      // 1 seule ligne centrée
      const rowY = 545;
      const totalWidth = availableLinks.reduce((sum, l) => sum + c.measureText(l.label).width, 0) + (availableLinks.length - 1) * 28;
      let curX = this.cw / 2 - totalWidth / 2;
      for (let i = 0; i < availableLinks.length; i++) {
        const item = availableLinks[i];
        const w = c.measureText(item.label).width;
        c.fillText(item.label, curX + w / 2, rowY);
        this.menuLinks.push({ id: item.id, label: item.label, x: curX + w / 2, y: rowY, w });
        curX += w;
        if (i < availableLinks.length - 1) {
          c.fillText('•', curX + 14, rowY);
          curX += 28;
        }
      }
    } else {
      // 2 lignes centrées
      const half = Math.ceil(availableLinks.length / 2);
      const row1 = availableLinks.slice(0, half);
      const row2 = availableLinks.slice(half);

      const renderRow = (rowItems: MenuLinkItem[], rowY: number) => {
        const totalW = rowItems.reduce((sum, l) => sum + c.measureText(l.label).width, 0) + (rowItems.length - 1) * 24;
        let curX = this.cw / 2 - totalW / 2;
        for (let i = 0; i < rowItems.length; i++) {
          const item = rowItems[i];
          const w = c.measureText(item.label).width;
          c.fillText(item.label, curX + w / 2, rowY);
          this.menuLinks.push({ id: item.id, label: item.label, x: curX + w / 2, y: rowY, w });
          curX += w;
          if (i < rowItems.length - 1) {
            c.fillText('•', curX + 12, rowY);
            curX += 24;
          }
        }
      };

      renderRow(row1, 532);
      renderRow(row2, 560);
    }
    c.shadowBlur = 0;
  }

  public drawInstructions(time: number) {
    const c = this.ctx;
    c.fillStyle = this.chromaTier === 0 ? '#050505' : '#06010f';
    c.fillRect(0, 0, this.cw, CH);

    // Background synthwave grid (désactivé au tier 0)
    if (this.chromaTier >= 1) {
      c.strokeStyle = this.chromaTier <= 2 ? 'rgba(100, 150, 220, 0.04)' : 'rgba(0, 240, 255, 0.07)';
      c.lineWidth = 1;
      for (let x = 0; x < this.cw; x += 30) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, CH); c.stroke(); }
      for (let y = 0; y < CH; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(this.cw, y); c.stroke(); }
    }

    // Header Title
    c.save();
    c.textAlign = 'center';
    if (this.chromaTier === 0) {
      c.font = 'bold 22px monospace';
      c.fillStyle = '#ffffff';
      c.shadowBlur = 0;
    } else {
      const titleGrad = c.createLinearGradient(this.cw / 2, 16, this.cw / 2, 48);
      titleGrad.addColorStop(0, '#ffffff');
      titleGrad.addColorStop(0.5, '#00f0ff');
      titleGrad.addColorStop(1, '#ff007f');
      c.font = 'bold 22px monospace';
      c.fillStyle = titleGrad;
      c.shadowColor = '#00f0ff';
      c.shadowBlur = 16;
    }
    c.fillText('GUIDE & INSTRUCTIONS', this.cw / 2, 32);
    c.shadowBlur = 0;
    c.restore();

    c.font = 'bold 9.5px monospace';
    c.fillStyle = this.chromaTier === 0 ? '#666666' : '#8899bb';
    c.textAlign = 'center';
    c.fillText('TOUT CE QU\'IL FAUT SAVOIR POUR DOMINER LE LABYRINTHE', this.cw / 2, 47);

    const cardW = this.cw - 44;
    const cardX = 22;

    // Card 1: CONTRÔLES DE BASE (y: 58, h: 112)
    this.drawInstructionCard(c, cardX, 58, cardW, 112, '#00f0ff', 'CONTRÔLES DE BASE', [
      { badge: 'FLÈCHES / ZQSD', desc: 'Virages anticipés fluides et demi-tours immédiats' },
      { badge: 'ESPACE / DASH', desc: 'Déverrouillé à 10 frags : téléporte et taillade' },
      { badge: 'SHIFT / CHRONO', desc: 'Déverrouillé à 180 frags : ralentit le monde' },
      { badge: 'P / ÉCHAP', desc: 'Pause du jeu, réglages audio & scanlines CRT' }
    ]);

    // Card 2: KOMBOS DE DÉPLACEMENT SECRETS (y: 180, h: 76)
    this.drawInstructionCard(c, cardX, 180, cardW, 76, '#ffd700', 'KOMBOS DE DÉPLACEMENT SECRETS', [
      { badge: '← → ← →', desc: 'Wiggle EMP : onde radiale qui étourdit et repousse' },
      { badge: '↑ ↓ ↑ ↓', desc: 'Nitro Jet : turbo vitesse + traînée de feu au sol' }
    ]);

    // Card 3: SUPER-ITEMS ON THE BOARD (y: 266, h: 76)
    this.drawInstructionCard(c, cardX, 266, cardW, 76, '#ff007f', 'SUPER-ITEMS SUR LE PLATEAU', [
      { badge: 'RAMASSAGE AUTO', desc: 'Touchez le Super-Item pour l\'activer immédiatement' },
      { badge: 'APPARITION', desc: 'Méga Nova, Trou Noir, Lasers 8-Axes, Cryo, Vague...' }
    ]);

    // Card 4: CHROMAVORE & ÉVEIL CHROMATIQUE (y: 352, h: 148)
    this.drawInstructionCard(c, cardX, 352, cardW, 148, '#a855f7', 'CHROMAVORE & ÉVEIL CHROMATIQUE', [
      {
        badge: 'ÉVEIL CHROMATIQUE',
        desc: [
          'Le monde commence en monochrome absolu.',
          'Dévorez les spectres pour réveiller couleurs et compétences !'
        ]
      },
      {
        badge: 'LET\'S HUNT',
        desc: [
          'Arènes dynamiques & chrono Overdrive.',
          'Dévorez toutes les orbes et purgez les fantômes pour vaincre.'
        ]
      },
      {
        badge: 'BOUCLE COSMIQUE',
        desc: 'Terminez le Niveau 10 pour boucler (+10% vitesse/tour).'
      }
    ]);

    // Return prompt pill container
    const promptPulse = 0.65 + 0.35 * Math.sin(time * 3.5);
    const pillW = 440, pillH = 32;
    const pillX = this.cw / 2 - pillW / 2;
    const pillY = 518;

    c.save();
    c.fillStyle = this.chromaTier === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 240, 255, 0.08)';
    const pStroke = this.chromaTier === 0 ? `rgba(120, 120, 120, ${promptPulse})` : `rgba(0, 240, 255, ${promptPulse})`;
    c.strokeStyle = pStroke;
    c.lineWidth = 1.2;
    c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#00f0ff';
    c.shadowBlur = this.getChromaBlur(10 * promptPulse);
    c.beginPath();
    c.roundRect(pillX, pillY, pillW, pillH, 16);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    c.font = 'bold 11.5px monospace';
    c.fillStyle = this.chromaTier === 0 ? `rgba(220, 220, 220, ${promptPulse})` : `rgba(255, 255, 255, ${promptPulse})`;
    c.textAlign = 'center';
    c.fillText('▶ PRESS [ESPACE], [I] OU CLIQUEZ POUR RETOURNER ◀', this.cw / 2, pillY + 20);
    c.restore();

    // CRT Scanlines
    if (settingsManager.settings.crtScanlines) {
      c.save();
      c.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let y = 0; y < CH; y += 3) c.fillRect(0, y, this.cw, 1);
      c.restore();
    }

    // Version footer
    c.font = '9px monospace';
    c.fillStyle = 'rgba(255, 255, 255, 0.3)';
    c.textAlign = 'center';
    c.fillText(GAME_VERSION + '  •  SYNTHWAVE ARCADE', this.cw / 2, 648);
  }

  private wrapText(c: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (c.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  private drawInstructionCard(
    c: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    accent: string, title: string,
    items: { badge: string; desc: string | string[]; badgeW?: number }[]
  ) {
    const effectiveAccent = this.getChromaAccent(accent, '#777777');
    c.save();
    c.fillStyle = this.chromaTier === 0 ? '#0d0d0d' : 'rgba(12, 16, 28, 0.88)';
    c.strokeStyle = effectiveAccent;
    c.lineWidth = 1.2;
    c.shadowColor = this.chromaTier === 0 ? 'transparent' : effectiveAccent;
    c.shadowBlur = this.getChromaBlur(8);
    c.beginPath();
    c.roundRect(x, y, w, h, 8);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // Header badge
    c.font = 'bold 11.5px monospace';
    c.fillStyle = effectiveAccent;
    c.textAlign = 'left';
    c.fillText(title, x + 14, y + 18);

    // Separator line
    c.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x + 10, y + 24);
    c.lineTo(x + w - 10, y + 24);
    c.stroke();

    // Content rows
    let ly = y + 41;
    for (const item of items) {
      const badgeW = item.badgeW || 120;
      const descX = x + 14 + badgeW + 12;
      const maxDescW = (x + w - 14) - descX; // Absolute strict border safety

      // Draw Key Badge Pill
      if (item.badge) {
        c.fillStyle = 'rgba(255, 255, 255, 0.05)';
        c.strokeStyle = effectiveAccent;
        c.lineWidth = 0.9;
        c.beginPath();
        c.roundRect(x + 14, ly - 10, badgeW, 15, 3);
        c.fill();
        c.stroke();

        c.font = 'bold 9px monospace';
        c.fillStyle = effectiveAccent;
        c.textAlign = 'center';
        c.fillText(item.badge, x + 14 + badgeW / 2, ly + 1);
      }

      // Format description (single or multi-string, auto-wrapped)
      c.font = '10px monospace';
      c.fillStyle = this.chromaTier === 0 ? '#aaaaaa' : '#b8c8d8';
      c.textAlign = 'left';

      const descArray = Array.isArray(item.desc) ? item.desc : [item.desc];
      const allLines: string[] = [];
      for (const d of descArray) {
        const wrapped = this.wrapText(c, d, maxDescW);
        allLines.push(...wrapped);
      }

      let textY = ly + 1;
      for (const line of allLines) {
        c.fillText(line, descX, textY);
        textY += 13;
      }

      ly += Math.max(18, allLines.length * 13 + 4);
    }
    c.restore();
  }

  public drawGameOver(score: number, hi: boolean, madnessKills: number, madnessStreak: number, bestMadnessKills: number, badgesUnlocked: number, time: number, loopCount: number = 0) {
    const isMadness = true;
    const c = this.ctx;
    c.fillStyle = this.chromaTier === 0 ? 'rgba(0,0,0,0.92)' : 'rgba(5,5,10,0.85)';
    c.fillRect(0, 0, this.cw, CH);
    const cy = CH * 0.30;

    const overCol = this.getChromaAccent('#ff3344', '#ffffff');
    c.font = 'bold 36px monospace';
    c.fillStyle = overCol;
    c.shadowColor = this.chromaTier === 0 ? 'transparent' : overCol;
    c.shadowBlur = this.getChromaBlur(20);
    c.textAlign = 'center';
    c.fillText(isMadness ? 'FRENZY OVER' : 'GAME OVER', this.cw / 2, cy);
    c.shadowBlur = 0;

    if (isMadness) {
      c.font = 'bold 22px monospace';
      c.fillStyle = this.getChromaAccent('#ffd700', '#ffffff');
      c.fillText('FANTÔMES PURGÉS : ' + madnessKills, this.cw / 2, cy + 48);
      c.font = 'bold 16px monospace';
      c.fillStyle = this.getChromaAccent('#ff5533', '#cccccc');
      c.fillText('MAX STREAK : x' + madnessStreak, this.cw / 2, cy + 78);
      c.font = '14px monospace';
      c.fillStyle = '#888';
      c.fillText('RECORD KILLS : ' + bestMadnessKills, this.cw / 2, cy + 106);
    } else {
      c.font = 'bold 20px monospace';
      c.fillStyle = this.getChromaAccent('#ffd700', '#ffffff');
      c.fillText('SCORE : ' + score, this.cw / 2, cy + 48);
      if (loopCount > 0) {
        c.font = 'bold 13px monospace';
        c.fillStyle = this.getChromaAccent('#00ffcc', '#aaaaaa');
        c.fillText(`BOUCLE ATTEINTE : ${loopCount + 1} (+${loopCount * 10}% VIT)`, this.cw / 2, cy + 74);
      }
      if (hi) {
        c.font = 'bold 16px monospace';
        c.fillStyle = this.getChromaAccent('#ff44ff', '#ffffff');
        c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#ff44ff';
        c.shadowBlur = this.getChromaBlur(10);
        if (Math.sin(time * 6) > 0) c.fillText('NOUVEAU RECORD !', this.cw / 2, cy + (loopCount > 0 ? 98 : 76));
        c.shadowBlur = 0;
      }
    }

    c.fillStyle = this.getChromaAccent('#ffd700', '#888888');
    c.font = '12px monospace';
    const bTxt = 'Badges & Succès : ' + badgesUnlocked + '/' + badges.getTotalCount() + ' Débloqués';
    const btw = c.measureText(bTxt).width;
    spriteAtlas.drawIcon(c, 'trophy', this.cw / 2 - btw / 2 - 12, cy + 130, 14);
    c.fillText(bTxt, this.cw / 2 + 8, cy + 130);

    // Career Progression Bar
    const nxt = progression.getNextUnlock();
    const barW = 320, barH = 10;
    const barX = this.cw / 2 - barW / 2, barY = cy + 158;
    c.fillStyle = this.chromaTier === 0 ? 'rgba(20, 20, 20, 0.9)' : 'rgba(15, 20, 35, 0.85)';
    c.strokeStyle = this.getChromaAccent('#00ffff', '#555555');
    c.lineWidth = 1.5;
    c.beginPath();
    c.roundRect(barX, barY, barW, barH, 4);
    c.fill();
    c.stroke();

    const fillW = Math.max(0, Math.min(barW, barW * nxt.progress));
    const fillCol = this.getChromaAccent('#00ffcc', '#888888');
    c.fillStyle = fillCol;
    c.shadowColor = this.chromaTier === 0 ? 'transparent' : fillCol;
    c.shadowBlur = this.getChromaBlur(8);
    c.beginPath();
    c.roundRect(barX, barY, fillW, barH, 4);
    c.fill();
    c.shadowBlur = 0;

    c.font = 'bold 10px monospace';
    c.fillStyle = '#ffffff';
    if (nxt.skill) {
      c.fillText(`CARRIÈRE : ${progression.totalGhosts} FRAGS >> PROCHAIN : ${nxt.skill.name} (${nxt.remaining} FRAGS)`, this.cw / 2, barY - 6);
    } else {
      c.fillText(`CARRIÈRE MAXIMALE : ${progression.totalGhosts} FRAGS (TOUT DÉBLOQUÉ)`, this.cw / 2, barY - 6);
    }

    c.font = '13px monospace';
    c.fillStyle = '#aaa';
    if (Math.sin(time * 3) > 0) c.fillText('PRESS SPACE TO REPLAY', this.cw / 2, cy + 195);

    // Leaderboard link
    c.font = 'bold 11px monospace';
    c.fillStyle = this.getChromaAccent('#ff007f', '#777777');
    c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#ff007f';
    c.shadowBlur = this.getChromaBlur(8);
    if (Math.sin(time * 2.5) > 0) c.fillText('[ L ] CLASSEMENT  |  [ C ] ARSENAL & SKILLS', this.cw / 2, cy + 220);
    c.shadowBlur = 0;

    // Version Tag
    c.font = '8.5px monospace';
    c.fillStyle = 'rgba(255, 255, 255, 0.35)';
    c.textAlign = 'center';
    c.fillText(GAME_VERSION, this.cw / 2, CH - 8);
  }

  public drawLeaderboard(
    entries: import('../systems/Leaderboard').LeaderboardEntry[],
    time: number,
    playerRank: number = 0,
    playerDate: string = ''
  ) {
    const c = this.ctx;
    c.fillStyle = this.chromaTier === 0 ? '#050505' : '#06010f';
    c.fillRect(0, 0, this.cw, CH);

    // Background grid (désactivé au tier 0)
    if (this.chromaTier >= 1) {
      c.strokeStyle = this.chromaTier <= 2 ? 'rgba(100, 150, 220, 0.04)' : 'rgba(255, 0, 127, 0.08)';
      c.lineWidth = 1;
      for (let x = 0; x < this.cw; x += 30) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, CH); c.stroke(); }
      for (let y = 0; y < CH; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(this.cw, y); c.stroke(); }
    }

    // Title
    c.save();
    c.textAlign = 'center';
    if (this.chromaTier === 0) {
      c.font = 'bold 22px monospace';
      c.fillStyle = '#ffffff';
      c.shadowBlur = 0;
    } else {
      const titleGrad = c.createLinearGradient(this.cw / 2, 20, this.cw / 2, 60);
      titleGrad.addColorStop(0, '#ffffff');
      titleGrad.addColorStop(0.5, '#00f0ff');
      titleGrad.addColorStop(1, '#ff007f');
      c.font = 'bold 22px monospace';
      c.fillStyle = titleGrad;
      c.shadowColor = '#00f0ff';
      c.shadowBlur = 16;
    }
    spriteAtlas.drawIcon(c, 'trophy', this.cw / 2 - 100, 42, 18);
    c.fillText('LEADERBOARD', this.cw / 2 + 10, 42);
    c.shadowBlur = 0;
    c.restore();

    // Mode tab
    const modeLabel = 'LET\'S HUNT — CLASSEMENT FRAGS';
    c.font = 'bold 11px monospace';
    c.fillStyle = this.chromaTier === 0 ? '#888888' : '#ff007f';
    c.fillText(modeLabel, this.cw / 2, 62);

    // Column headers
    const startY = 86;
    c.font = 'bold 9px monospace';
    c.fillStyle = this.chromaTier === 0 ? '#555555' : '#445566';
    c.textAlign = 'center';
    c.fillText('#', 34, startY);
    c.textAlign = 'left';
    c.fillText('PSEUDO', 64, startY);
    c.textAlign = 'right';
    c.fillText('KILLS & SCORE', this.cw - 28, startY);

    // Separator
    c.strokeStyle = this.chromaTier === 0 ? '#222222' : '#1a2840';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(20, startY + 6); c.lineTo(this.cw - 20, startY + 6); c.stroke();

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
        c.fillStyle = this.chromaTier === 0 ? `rgba(255, 255, 255, ${pulse})` : `rgba(255, 0, 127, ${pulse})`;
        c.fillRect(18, y - 14, this.cw - 36, rowH - 2);
        c.strokeStyle = this.getChromaAccent('#ff007f', '#777777');
        c.lineWidth = 1.5;
        c.strokeRect(18, y - 14, this.cw - 36, rowH - 2);
      } else if (i % 2 === 0) {
        c.fillStyle = 'rgba(255,255,255,0.025)';
        c.fillRect(18, y - 14, this.cw - 36, rowH - 2);
      }

      // Rank Badge
      c.textAlign = 'center';
      if (rank === 1) {
        spriteAtlas.drawIcon(c, 'crown', 24, y, 14);
        c.font = 'bold 12px monospace';
        c.fillStyle = this.getChromaAccent('#ffd700', '#ffffff');
        c.shadowColor = c.fillStyle;
        c.shadowBlur = this.getChromaBlur(10);
        c.fillText('1', 38, y);
        c.shadowBlur = 0;
      } else if (rank === 2) {
        c.font = 'bold 12px monospace';
        c.fillStyle = this.getChromaAccent('#e2e8f0', '#cccccc');
        c.shadowColor = c.fillStyle;
        c.shadowBlur = this.getChromaBlur(8);
        c.fillText('2', 34, y);
        c.shadowBlur = 0;
      } else if (rank === 3) {
        c.font = 'bold 12px monospace';
        c.fillStyle = this.getChromaAccent('#ff9944', '#aaaaaa');
        c.shadowColor = c.fillStyle;
        c.shadowBlur = this.getChromaBlur(8);
        c.fillText('3', 34, y);
        c.shadowBlur = 0;
      } else {
        c.font = 'bold 11px monospace';
        c.fillStyle = isPlayer ? this.getChromaAccent('#ffd700', '#ffffff') : (this.chromaTier === 0 ? '#666666' : '#556677');
        c.fillText(rank + '.', 34, y);
      }

      // Pseudo
      c.textAlign = 'left';
      c.font = isPlayer ? 'bold 12px monospace' : '11px monospace';
      c.fillStyle = isPlayer ? this.getChromaAccent('#ffd700', '#ffffff') : (rank <= 3 ? '#ffffff' : (this.chromaTier === 0 ? '#aaaaaa' : '#aabbcc'));
      if (isPlayer) {
        c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#ffd700';
        c.shadowBlur = this.getChromaBlur(8);
      }
      c.fillText(e.pseudo.toUpperCase().slice(0, 12), 64, y - 2);
      c.shadowBlur = 0;

      // Date under pseudo
      c.font = '8px monospace';
      c.fillStyle = this.chromaTier === 0 ? '#555555' : '#445566';
      c.fillText(e.date ? e.date.slice(0, 10) : '', 64, y + 11);

      // Score and Kills on right
      c.textAlign = 'right';
      c.font = 'bold 12px monospace';
      c.fillStyle = rank === 1 ? this.getChromaAccent('#ffd700', '#ffffff') : (isPlayer ? this.getChromaAccent('#ff007f', '#ffffff') : this.getChromaAccent('#00f0ff', '#cccccc'));
      if (rank === 1) {
        c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#ffd700';
        c.shadowBlur = this.getChromaBlur(8);
      }
      c.fillText(`${e.kills ?? 0} KILLS`, this.cw - 28, y - 2);
      c.shadowBlur = 0;

      // Line 2: Score underneath Kills
      c.font = 'bold 9px monospace';
      c.fillStyle = isPlayer ? this.getChromaAccent('#ffd700', '#aaaaaa') : this.getChromaAccent('#ffaa00', '#888888');
      c.fillText(`${(e.score || 0).toLocaleString()} PTS`, this.cw - 28, y + 11);
    }

    if (entries.length === 0) {
      c.font = '13px monospace';
      c.fillStyle = this.chromaTier === 0 ? '#666666' : '#445566';
      c.textAlign = 'center';
      c.fillText('Aucun score enregistré...', this.cw / 2, CH * 0.5);
      c.font = '11px monospace';
      c.fillStyle = this.chromaTier === 0 ? '#444444' : '#334455';
      c.fillText('Jouez une partie et entrez votre pseudo !', this.cw / 2, CH * 0.5 + 24);
    }

    // Footer
    c.font = 'bold 10px monospace';
    c.fillStyle = this.chromaTier === 0 ? '#555555' : '#334466';
    c.textAlign = 'center';
    c.fillText('[ ESPACE / ECHAP ] RETOUR AU MENU', this.cw / 2, CH - 14);
  }

  public drawCodex(time: number, tab: 'skills' | 'badges' = 'skills', page: number = 0) {
    const c = this.ctx;
    c.fillStyle = this.chromaTier === 0 ? '#050505' : '#06010f';
    c.fillRect(0, 0, this.cw, CH);

    const isSkills = tab === 'skills';
    const unlockedSkills = SKILL_TREE.filter(s => progression.isSkillUnlocked(s.id)).length;
    const unlockedBadges = badges.getUnlockedCount();
    const totalBadges = badges.getTotalCount();

    // Title
    c.save();
    c.textAlign = 'center';
    c.font = 'bold 18px monospace';
    if (this.chromaTier === 0) {
      c.fillStyle = '#ffffff';
      c.shadowBlur = 0;
    } else {
      const grad = c.createLinearGradient(0, 15, 0, 45);
      grad.addColorStop(0, '#00ffff');
      grad.addColorStop(0.5, '#ff00aa');
      grad.addColorStop(1, '#ffd700');
      c.fillStyle = grad;
      c.shadowColor = isSkills ? '#00ffff' : '#ffd700';
      c.shadowBlur = 10;
    }
    const titleText = isSkills ? 'ARSENAL & ARBRE DES COMPÉTENCES' : 'SUCCÈS & TROPHÉES DE CARRIÈRE';
    const tIcon = isSkills ? 'lightning' : 'trophy';
    const tw = c.measureText(titleText).width;
    spriteAtlas.drawIcon(c, tIcon, this.cw / 2 - tw / 2 - 14, 26, 16);
    spriteAtlas.drawIcon(c, tIcon, this.cw / 2 + tw / 2 + 14, 26, 16);
    c.fillText(titleText, this.cw / 2, 26);
    c.shadowBlur = 0;
    c.restore();

    // Tab Switcher Bar at top (y: 36, h: 26)
    const tabW = 200, tabH = 24, tabY = 36;

    // Tab 1: Skills
    c.fillStyle = isSkills
      ? (this.chromaTier === 0 ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 240, 255, 0.22)')
      : (this.chromaTier === 0 ? 'rgba(20, 20, 20, 0.7)' : 'rgba(15, 20, 35, 0.7)');
    c.strokeStyle = isSkills
      ? this.getChromaAccent('#00f0ff', '#777777')
      : (this.chromaTier === 0 ? '#333333' : '#223348');
    c.lineWidth = isSkills ? 1.8 : 1;
    c.shadowColor = isSkills ? this.getChromaAccent('#00f0ff', 'transparent') : 'transparent';
    c.shadowBlur = isSkills ? this.getChromaBlur(8) : 0;
    c.beginPath();
    c.roundRect(this.cw / 2 - tabW - 8, tabY, tabW, tabH, 5);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    c.font = 'bold 10px monospace';
    c.fillStyle = isSkills
      ? this.getChromaAccent('#00f0ff', '#ffffff')
      : (this.chromaTier === 0 ? '#666666' : '#8899aa');
    c.textAlign = 'center';
    const tab1Text = `[1] ARSENAL (${unlockedSkills}/${SKILL_TREE.length})`;
    const t1w = c.measureText(tab1Text).width;
    spriteAtlas.drawIcon(c, 'lightning', this.cw / 2 - tabW / 2 - 8 - t1w / 2 - 10, tabY + 16, 12);
    c.fillText(tab1Text, this.cw / 2 - tabW / 2 - 8 + 6, tabY + 16);

    // Tab 2: Badges
    const isBadges = tab === 'badges';
    c.fillStyle = isBadges
      ? (this.chromaTier === 0 ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 215, 0, 0.22)')
      : (this.chromaTier === 0 ? 'rgba(20, 20, 20, 0.7)' : 'rgba(15, 20, 35, 0.7)');
    c.strokeStyle = isBadges
      ? this.getChromaAccent('#ffd700', '#777777')
      : (this.chromaTier === 0 ? '#333333' : '#223348');
    c.lineWidth = isBadges ? 1.8 : 1;
    c.shadowColor = isBadges ? this.getChromaAccent('#ffd700', 'transparent') : 'transparent';
    c.shadowBlur = isBadges ? this.getChromaBlur(8) : 0;
    c.beginPath();
    c.roundRect(this.cw / 2 + 8, tabY, tabW, tabH, 5);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    c.font = 'bold 10px monospace';
    c.fillStyle = isBadges
      ? this.getChromaAccent('#ffd700', '#ffffff')
      : (this.chromaTier === 0 ? '#666666' : '#8899aa');
    const tab2Text = `[2] SUCCÈS (${unlockedBadges}/${totalBadges})`;
    const t2w = c.measureText(tab2Text).width;
    spriteAtlas.drawIcon(c, 'trophy', this.cw / 2 + tabW / 2 + 8 - t2w / 2 - 10, tabY + 16, 12);
    c.fillText(tab2Text, this.cw / 2 + tabW / 2 + 8 + 6, tabY + 16);

    // Dynamically center 2 columns of cards across any arena width
    const isWide = this.cw >= 750;
    const colW = isWide ? Math.min(460, Math.floor((this.cw - 80) / 2)) : 265;
    const gapX = isWide ? 24 : 10;
    const totalGridW = colW * 2 + gapX;
    const startX = Math.round((this.cw - totalGridW) / 2);
    const col1X = startX;
    const col2X = startX + colW + gapX;

    if (isSkills) {
      // Career Progress Bar Header
      const nxt = progression.getNextUnlock();
      const barW = Math.min(totalGridW, isWide ? 620 : 460), barH = 8;
      const barX = this.cw / 2 - barW / 2, barY = 76;
      c.fillStyle = this.chromaTier === 0 ? 'rgba(20, 20, 20, 0.9)' : 'rgba(15, 20, 35, 0.9)';
      c.strokeStyle = this.getChromaAccent('#00ffff', '#555555');
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(barX, barY, barW, barH, 4);
      c.fill();
      c.stroke();

      const fillW = Math.max(0, Math.min(barW, barW * nxt.progress));
      const fillCol = this.getChromaAccent('#00ffcc', '#888888');
      c.fillStyle = fillCol;
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : fillCol;
      c.shadowBlur = this.getChromaBlur(8);
      c.beginPath();
      c.roundRect(barX, barY, fillW, barH, 4);
      c.fill();
      c.shadowBlur = 0;

      c.font = 'bold 9.5px monospace';
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      if (nxt.skill) {
        c.fillText(`TOTAL CARRIÈRE : ${progression.totalGhosts.toLocaleString()} FRAGS >> PROCHAIN : ${nxt.skill.name} (${nxt.remaining.toLocaleString()} FRAGS)`, this.cw / 2, 70);
      } else {
        c.fillText(`TOTAL CARRIÈRE : ${progression.totalGhosts.toLocaleString()} FRAGS (ARSENAL MAÎTRISÉ À 100% !)`, this.cw / 2, 70);
      }

      // Base and odd-numbered upgrades on the left; advanced even-numbered upgrades on the right.
      const leftSkills = SKILL_TREE.filter(s => s.version === 1 || s.version === 3 || s.version === 5);
      const rightSkills = SKILL_TREE.filter(s => s.version === 2 || s.version === 4);
      const maxCol = Math.max(leftSkills.length, rightSkills.length);
      const compactGrid = maxCol > 10;
      const cardH = compactGrid ? 39 : 45;
      const startY = 85, gapY = compactGrid ? 42 : 49;

      for (let i = 0; i < leftSkills.length; i++) {
        const s = leftSkills[i];
        const y = startY + i * gapY;
        this.drawSkillCard(c, s, col1X, y, colW, cardH);
      }
      for (let i = 0; i < rightSkills.length; i++) {
        const s = rightSkills[i];
        const y = startY + i * gapY;
        this.drawSkillCard(c, s, col2X, y, colW, cardH);
      }

      // Footer
      c.font = 'bold 10.5px monospace';
      c.fillStyle = this.getChromaAccent('#00ffff', '#777777');
      c.textAlign = 'center';
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#00ffff';
      c.shadowBlur = this.getChromaBlur(6);
      c.fillText('[1] ARSENAL  •  [2] SUCCÈS  •  [TAB] BASCULER  •  [ECHAP / C] RETOUR', this.cw / 2, CH - 14);
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
      const barW = Math.min(totalGridW, isWide ? 620 : 460), barH = 8;
      const barX = this.cw / 2 - barW / 2, barY = 76;
      c.fillStyle = this.chromaTier === 0 ? 'rgba(20, 20, 20, 0.9)' : 'rgba(15, 20, 35, 0.9)';
      c.strokeStyle = this.getChromaAccent('#ffd700', '#555555');
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(barX, barY, barW, barH, 4);
      c.fill();
      c.stroke();

      const fillW = Math.max(0, Math.min(barW, barW * ratio));
      const fillCol = this.getChromaAccent('#ffd700', '#888888');
      c.fillStyle = fillCol;
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : fillCol;
      c.shadowBlur = this.getChromaBlur(8);
      c.beginPath();
      c.roundRect(barX, barY, fillW, barH, 4);
      c.fill();
      c.shadowBlur = 0;

      c.font = 'bold 9.5px monospace';
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.fillText(`SUCCÈS ACCOMPLIS : ${unlockedBadges} / ${allBadges.length} (${Math.round(ratio * 100)}%)`, this.cw / 2, 70);

      // Draw 2 Columns of cards (balanced across columns when fewer than 7)
      const cardH = 64;
      const startY = 92, gapY = 70;
      const col1Count = pageBadges.length > 7 ? 7 : Math.ceil(pageBadges.length / 2);

      for (let i = 0; i < pageBadges.length; i++) {
        const b = pageBadges[i];
        const isCol2 = i >= col1Count;
        const colX = isCol2 ? col2X : col1X;
        const rowIdx = isCol2 ? i - col1Count : i;
        const y = startY + rowIdx * gapY;
        this.drawBadgeCard(c, b, colX, y, colW, cardH);
      }

      // Footer
      c.font = 'bold 10.5px monospace';
      c.fillStyle = this.getChromaAccent('#ffd700', '#777777');
      c.textAlign = 'center';
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#ffd700';
      c.shadowBlur = this.getChromaBlur(6);
      c.fillText(`[1] ARSENAL  •  [2] SUCCÈS  •  [PAGE ${curPage + 1}/${maxPages} • FLÈCHES ← / →]  •  [ECHAP / B] RETOUR`, this.cw / 2, CH - 14);
      c.shadowBlur = 0;
    }
  }

  private drawBadgeCard(c: CanvasRenderingContext2D, b: import('../systems/BadgeSystem').BadgeDef, x: number, y: number, w: number, h: number) {
    const unlocked = badges.isUnlocked(b.id);
    c.save();

    c.fillStyle = unlocked
      ? (this.chromaTier === 0 ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 215, 0, 0.09)')
      : (this.chromaTier === 0 ? 'rgba(20, 20, 20, 0.65)' : 'rgba(15, 20, 35, 0.7)');
    c.strokeStyle = unlocked
      ? this.getChromaAccent('#ffd700', '#777777')
      : (this.chromaTier === 0 ? '#333333' : '#223348');
    c.lineWidth = unlocked ? 1.5 : 1;
    if (unlocked && this.chromaTier >= 1) {
      c.shadowColor = '#ffd700';
      c.shadowBlur = this.getChromaBlur(8);
    }
    c.beginPath();
    c.roundRect(x, y, w, h, 6);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // Icon
    spriteAtlas.drawIcon(c, b.icon, x + 16, y + 18, 16);

    // Name
    c.font = 'bold 10px monospace';
    c.fillStyle = unlocked
      ? this.getChromaAccent('#ffd700', '#ffffff')
      : (this.chromaTier === 0 ? '#777777' : '#8899aa');
    c.textAlign = 'left';
    c.fillText(b.name, x + 30, y + 17);

    // Status tag
    c.textAlign = 'right';
    c.font = 'bold 8.5px monospace';
    if (unlocked) {
      c.fillStyle = this.getChromaAccent('#00ffcc', '#cccccc');
      const statusText = 'OBTENU';
      const tw = c.measureText(statusText).width;
      spriteAtlas.drawIcon(c, 'check', x + w - 8 - tw - 8, y + 17, 10);
      c.fillText(statusText, x + w - 8, y + 17);
    } else {
      c.fillStyle = this.chromaTier === 0 ? '#555555' : '#667788';
      const reqText = b.killsRequired ? `${b.killsRequired.toLocaleString()} FRAGS` : 'DÉFI';
      const tw = c.measureText(reqText).width;
      spriteAtlas.drawIcon(c, 'lock', x + w - 8 - tw - 8, y + 17, 10);
      c.fillText(reqText, x + w - 8, y + 17);
    }

    // Description
    c.textAlign = 'left';
    c.font = '8.5px monospace';
    c.fillStyle = unlocked
      ? (this.chromaTier === 0 ? '#cccccc' : '#dddddd')
      : (this.chromaTier === 0 ? '#666666' : '#556677');
    const maxBadgeChars = Math.floor((w - 16) / 5.5);
    const badgeDesc = b.desc.length > maxBadgeChars ? b.desc.slice(0, maxBadgeChars - 1) + '…' : b.desc;
    c.fillText(badgeDesc, x + 8, y + 36);

    // Progress bar for kill badges if locked
    if (!unlocked && b.killsRequired) {
      const pRatio = Math.max(0, Math.min(1, progression.totalGhosts / b.killsRequired));
      const pbW = w - 16, pbH = 4, pbX = x + 8, pbY = y + 46;
      c.fillStyle = 'rgba(255, 255, 255, 0.08)';
      c.fillRect(pbX, pbY, pbW, pbH);
      c.fillStyle = this.getChromaAccent('#00ffff', '#888888');
      c.fillRect(pbX, pbY, pbW * pRatio, pbH);
      c.font = '7.5px monospace';
      c.fillStyle = this.getChromaAccent('#00ffff', '#888888');
      c.textAlign = 'right';
      c.fillText(`${progression.totalGhosts.toLocaleString()} / ${b.killsRequired.toLocaleString()} FRAGS`, pbX + pbW, pbY + 11);
    } else if (unlocked) {
      c.font = '7.5px monospace';
      c.fillStyle = this.getChromaAccent('#ffaa00', '#aaaaaa');
      spriteAtlas.drawIcon(c, 'trophy', x + 14, y + 54, 10);
      c.fillText('Trophée enregistré au profil cloud', x + 24, y + 54);
    }

    c.restore();
  }

  private drawSkillCard(c: CanvasRenderingContext2D, s: import('../systems/ProgressionSystem').SkillDef, x: number, y: number, w: number, h: number) {
    const state = progression.getSkillState(s.id);
    const unlocked = state.unlocked;
    const isNext = state.isNext;
    const isV2 = s.version >= 2;

    if (unlocked) {
      c.fillStyle = this.chromaTier === 0
        ? 'rgba(255, 255, 255, 0.06)'
        : (isV2 ? 'rgba(0, 255, 230, 0.08)' : 'rgba(255, 215, 0, 0.07)');
      c.strokeStyle = this.getChromaAccent(isV2 ? '#00e5ff' : '#ffd700', '#777777');
      c.lineWidth = 1.5;
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : (isV2 ? '#00e5ff' : '#ffd700');
      c.shadowBlur = this.getChromaBlur(6);
    } else if (isNext) {
      c.fillStyle = this.chromaTier === 0 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 170, 0, 0.08)';
      c.strokeStyle = this.getChromaAccent('#ffaa00', '#555555');
      c.lineWidth = 1.4;
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#ffaa00';
      c.shadowBlur = this.getChromaBlur(5);
    } else {
      c.fillStyle = this.chromaTier === 0 ? 'rgba(15, 15, 15, 0.65)' : 'rgba(10, 14, 24, 0.65)';
      c.strokeStyle = this.chromaTier === 0 ? '#2a2a2a' : '#1e2838';
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
      c.fillStyle = this.getChromaAccent(isV2 ? '#00ffff' : '#ffd700', '#ffffff');
      spriteAtlas.drawIcon(c, s.icon, x + 16, y + 14, 14);
      c.fillText(`[V${s.version}] ${s.name}`, x + 28, y + 14);
    } else if (isNext) {
      c.fillStyle = this.getChromaAccent('#ffcc00', '#cccccc');
      spriteAtlas.drawIcon(c, s.icon, x + 16, y + 14, 14);
      c.fillText(`[V${s.version}] ${s.name}`, x + 28, y + 14);
    } else {
      // Hidden / classified: name is hidden!
      c.fillStyle = this.chromaTier === 0 ? '#444444' : '#4a5a70';
      spriteAtlas.drawIcon(c, 'lock', x + 16, y + 14, 12);
      c.fillText(`[V${s.version}] ??? [CLASSIFIÉ]`, x + 28, y + 14);
    }

    // Status pill
    c.textAlign = 'right';
    c.font = 'bold 10px monospace';
    if (unlocked) {
      c.fillStyle = this.getChromaAccent('#00ffaa', '#cccccc');
      const statusText = 'ACTIF';
      const tw = c.measureText(statusText).width;
      spriteAtlas.drawIcon(c, 'check', x + w - 8 - tw - 8, y + 14, 10);
      c.fillText(statusText, x + w - 8, y + 14);
    } else if (isNext) {
      c.fillStyle = this.getChromaAccent('#ffd700', '#aaaaaa');
      c.fillText(`OBJ: ${s.threshold.toLocaleString()} FRAGS`, x + w - 8, y + 14);
    } else {
      c.fillStyle = this.chromaTier === 0 ? '#444444' : '#6a7888';
      const reqText = `${s.threshold.toLocaleString()} FRAGS`;
      const tw = c.measureText(reqText).width;
      spriteAtlas.drawIcon(c, 'lock', x + w - 8 - tw - 8, y + 14, 10);
      c.fillText(reqText, x + w - 8, y + 14);
    }

    // Command
    c.textAlign = 'left';
    c.font = '9px monospace';
    if (unlocked) {
      c.fillStyle = '#ffffff';
      c.fillText(s.command, x + 8, y + 26);
    } else if (isNext) {
      c.fillStyle = this.chromaTier === 0 ? '#cccccc' : '#ffdd88';
      c.fillText(s.command, x + 8, y + 26);
    } else {
      c.fillStyle = this.chromaTier === 0 ? '#333333' : '#334455';
      c.fillText('COMMANDE CHIFFRÉE', x + 8, y + 26);
    }

    // Effect summary
    c.font = '8.5px monospace';
    const maxChars = Math.floor((w - 16) / 5.5);
    const descText = s.desc.length > maxChars ? s.desc.slice(0, maxChars - 1) + '…' : s.desc;
    if (unlocked) {
      c.fillStyle = this.chromaTier === 0 ? '#aaaaaa' : (isV2 ? '#aaffff' : '#ddd');
      c.fillText(descText, x + 8, y + 37);
    } else if (isNext) {
      c.fillStyle = this.chromaTier === 0 ? '#888888' : '#eeddcc';
      c.fillText(descText, x + 8, y + 37);
    } else {
      c.fillStyle = this.chromaTier === 0 ? '#222222' : '#2a3848';
      c.fillText('Atteignez le palier précédent pour décoder.', x + 8, y + 37);
    }
  }

  public drawPause(isMadness: boolean, kills: number, streak: number, time: number = 0, isFromMenu: boolean = false) {
    updatePauseButtonPositions(this.cw, isFromMenu);
    const c = this.ctx;
    // Dark blur backdrop
    c.fillStyle = this.chromaTier === 0 ? 'rgba(0, 0, 0, 0.92)' : 'rgba(5, 7, 14, 0.88)';
    c.fillRect(0, 0, this.cw, CH);

    // Modal Card (dynamically centered horizontally for every arena width)
    const cardW = Math.min(500, this.cw - 20), cardH = 435;
    const cardX = Math.floor((this.cw - cardW) / 2), cardY = 90;
    c.save();
    c.fillStyle = this.chromaTier === 0 ? '#0e0e0e' : 'rgba(10, 15, 28, 0.96)';
    const cardStroke = this.getChromaAccent('#00d4ff', '#555555');
    c.strokeStyle = cardStroke;
    c.lineWidth = 2;
    c.shadowColor = this.chromaTier === 0 ? 'transparent' : cardStroke;
    c.shadowBlur = this.getChromaBlur(18);
    c.beginPath();
    c.roundRect(cardX, cardY, cardW, cardH, 12);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // Header Title
    c.font = 'bold 22px monospace';
    c.fillStyle = this.getChromaAccent('#00ffff', '#ffffff');
    c.textAlign = 'center';
    if (isFromMenu) {
      c.fillText('PARAMÈTRES & ACCESSIBILITÉ', this.cw / 2, cardY + 36);
      c.font = '10px monospace';
      c.fillStyle = this.chromaTier === 0 ? '#666666' : '#667799';
      c.fillText('OPTIONS VISUELLES • FLUIDITÉ • PROFIL DU JOUEUR', this.cw / 2, cardY + 58);
    } else {
      c.fillText('PAUSE — PARAMÈTRES VISUELS', this.cw / 2, cardY + 36);
      c.font = '10px monospace';
      c.fillStyle = this.chromaTier === 0 ? '#666666' : '#667799';
      c.fillText('CLIQUEZ SUR UNE OPTION OU UTILISEZ LES TOUCHES [1] À [5] / [M]', this.cw / 2, cardY + 58);
    }

    const s = settingsManager.settings;

    const items = [
      {
        btn: PAUSE_BUTTONS[0],
        key: '[1]',
        label: 'FREEZE FRAME (HIT-STOP IMPACT)',
        state: s.freezeFrame ? 'ACTIVÉ' : 'COUPÉ',
        active: s.freezeFrame
      },
      {
        btn: PAUSE_BUTTONS[1],
        key: '[2]',
        label: 'SECOUSSES D\'ÉCRAN (SCREEN SHAKE)',
        state: s.screenShake ? 'ACTIVÉ' : 'COUPÉ',
        active: s.screenShake
      },
      {
        btn: PAUSE_BUTTONS[2],
        key: '[3]',
        label: 'ÉCLAIRS PLEIN ÉCRAN (FLASHES)',
        state: s.screenFlash ? 'ACTIVÉ' : 'COUPÉ',
        active: s.screenFlash
      },
      {
        btn: PAUSE_BUTTONS[3],
        key: '[4]',
        label: 'LIGNES CRT SCANLINES (80s TV)',
        state: s.crtScanlines ? 'ACTIVÉ' : 'COUPÉ',
        active: s.crtScanlines
      },
      {
        btn: PAUSE_BUTTONS[4],
        key: '[5]',
        label: 'DENSITÉ DES PARTICULES',
        state: s.particleDensity === 'max' ? 'MAX (1000)' : 'ÉCO (350)',
        active: s.particleDensity === 'max'
      },
      {
        btn: PAUSE_BUTTONS[5],
        key: '[M]',
        label: 'AUDIO & SYNTHWAVE BGM',
        state: sounds.isMuted() ? 'COUPÉ' : 'ACTIF',
        active: !sounds.isMuted()
      }
    ];

    for (const it of items) {
      const b = it.btn;
      c.fillStyle = it.active
        ? (this.chromaTier === 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 212, 255, 0.12)')
        : (this.chromaTier === 0 ? 'rgba(20, 20, 20, 0.6)' : 'rgba(20, 26, 40, 0.6)');
      c.strokeStyle = it.active
        ? this.getChromaAccent('#00d4ff', '#777777')
        : (this.chromaTier === 0 ? '#333333' : '#334460');
      c.lineWidth = it.active ? 1.5 : 1;
      c.beginPath();
      c.roundRect(b.x, b.y, b.w, b.h, 6);
      c.fill();
      c.stroke();

      // Key & Label
      c.textAlign = 'left';
      c.font = 'bold 11px monospace';
      c.fillStyle = it.active ? '#ffffff' : (this.chromaTier === 0 ? '#777777' : '#8899aa');
      c.fillText(`${it.key} ${it.label}`, b.x + 14, b.y + 22);

      // State pill
      c.textAlign = 'right';
      c.font = 'bold 11px monospace';
      c.fillStyle = it.active
        ? this.getChromaAccent('#00ffff', '#cccccc')
        : (this.chromaTier === 0 ? '#555555' : '#ff4466');
      c.fillText(it.state, b.x + b.w - 14, b.y + 22);
    }

    // Wipe Data button
    const wipeBtn = PAUSE_BUTTONS[6];
    c.fillStyle = this.chromaTier === 0 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 0, 85, 0.12)';
    c.strokeStyle = this.getChromaAccent('#ff0055', '#555555');
    c.lineWidth = 1.5;
    c.beginPath();
    c.roundRect(wipeBtn.x, wipeBtn.y, wipeBtn.w, wipeBtn.h, 6);
    c.fill();
    c.stroke();
    c.font = 'bold 11px monospace';
    c.fillStyle = this.getChromaAccent('#ff0055', '#888888');
    c.textAlign = 'center';
    c.fillText('RÉINITIALISER MA PROGRESSION & PROFIL', wipeBtn.x + wipeBtn.w / 2, wipeBtn.y + 21);

    if (isFromMenu) {
      // Home / Return button (spans full width)
      const homeBtn = PAUSE_BUTTONS[9];
      const hBorder = this.getChromaAccent('#00ffff', '#666666');
      c.fillStyle = this.chromaTier === 0 ? '#181818' : '#0c243a';
      c.strokeStyle = hBorder;
      c.lineWidth = 2;
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : hBorder;
      c.shadowBlur = this.getChromaBlur(12);
      c.beginPath();
      c.roundRect(homeBtn.x, homeBtn.y, homeBtn.w, homeBtn.h, 8);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;
      c.font = 'bold 13px monospace';
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.fillText('◀ RETOUR AU MENU [ECHAP / O]', homeBtn.x + homeBtn.w / 2, homeBtn.y + 26);
    } else {
      // Resume button
      const resBtn = PAUSE_BUTTONS[7];
      const pulse = 1 + Math.sin(time * 6) * 0.03;
      const resBorder = this.getChromaAccent('#00ffff', '#666666');
      c.fillStyle = this.chromaTier === 0 ? '#181818' : '#0c243a';
      c.strokeStyle = resBorder;
      c.lineWidth = 2;
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : resBorder;
      c.shadowBlur = this.getChromaBlur(12);
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
      const rstBorder = this.getChromaAccent('#ffaa00', '#555555');
      c.fillStyle = this.chromaTier === 0 ? '#181818' : '#20180a';
      c.strokeStyle = rstBorder;
      c.lineWidth = 2;
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : rstBorder;
      c.shadowBlur = this.getChromaBlur(10);
      c.beginPath();
      c.roundRect(rstBtn.x, rstBtn.y, rstBtn.w, rstBtn.h, 8);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;
      c.font = 'bold 12px monospace';
      c.fillStyle = this.getChromaAccent('#ffaa00', '#aaaaaa');
      c.textAlign = 'center';
      c.fillText('REJOUER [R]', rstBtn.x + rstBtn.w / 2, rstBtn.y + 26);

      // Home button
      const homeBtn = PAUSE_BUTTONS[9];
      const homeBorder = this.getChromaAccent('#ff007f', '#555555');
      c.fillStyle = this.chromaTier === 0 ? '#181818' : '#1a0a20';
      c.strokeStyle = homeBorder;
      c.lineWidth = 2;
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : homeBorder;
      c.shadowBlur = this.getChromaBlur(10);
      c.beginPath();
      c.roundRect(homeBtn.x, homeBtn.y, homeBtn.w, homeBtn.h, 8);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;
      c.font = 'bold 12px monospace';
      c.fillStyle = this.getChromaAccent('#ff007f', '#aaaaaa');
      c.textAlign = 'center';
      c.fillText('ACCUEIL', homeBtn.x + homeBtn.w / 2, homeBtn.y + 26);
    }

    // Footer stats if in madness
    if (isMadness) {
      c.font = '10px monospace';
      c.fillStyle = this.getChromaAccent('#ffd700', '#666666');
      c.fillText(`MODE CHROMAVORE • Kills : ${kills} • Streak : x${streak}`, this.cw / 2, cardY + cardH - 12);
    }

    c.font = '8.5px monospace';
    c.fillStyle = 'rgba(255, 255, 255, 0.35)';
    c.textAlign = 'center';
    c.fillText(GAME_VERSION, this.cw / 2, cardY + cardH + 18);

    c.restore();
  }

  public drawWaveTrans(currentLevel: number, wave: number, loopCount: number = 0, isMadness: boolean = false) {
    const c = this.ctx;
    const list = isMadness ? MADNESS_LEVELS : LEVELS;
    const lvl = list[currentLevel % list.length];
    c.font = 'bold 36px monospace'; c.fillStyle = lvl.glowColor; c.shadowColor = lvl.glowColor; c.shadowBlur = 25;
    c.textAlign = 'center'; c.fillText('NIVEAU ' + (currentLevel + 1), this.cw / 2, CH / 2 - 12); c.shadowBlur = 0;
    c.font = 'bold 18px monospace'; c.fillStyle = '#ffffff'; c.fillText(lvl.name, this.cw / 2, CH / 2 + 20);
    c.font = '13px monospace'; c.fillStyle = '#888'; c.fillText('+' + (1000 * (wave - 1)) + ' WAVE BONUS', this.cw / 2, CH / 2 + 46);
    if (loopCount > 0) {
      c.font = 'bold 15px monospace'; c.fillStyle = '#ffd700'; c.shadowColor = '#ffd700'; c.shadowBlur = 10;
      c.fillText(`BOUCLE ${loopCount + 1} : VITESSE +${loopCount * 10}% !`, this.cw / 2, CH / 2 + 72);
      c.shadowBlur = 0;
    }
  }

  public drawDangerVignette(madnessTimer: number, _time: number) {
    if (madnessTimer >= 8.0) return;
    const c = this.ctx;
    const vAlpha = 0.22 * (1 - madnessTimer / 8.0);
    c.save();
    c.fillStyle = `rgba(255,0,50,${vAlpha})`;
    c.fillRect(0, 0, this.cw, 8); c.fillRect(0, CH - 8, this.cw, 8);
    c.fillRect(0, 0, 8, CH); c.fillRect(this.cw - 8, 0, 8, CH);
    c.restore();
  }

  public drawMaze32xSupercharge(_mOff: HTMLCanvasElement, time: number) {
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = 'source-atop';
    // Deep vibrant electrified cyan & golden energy flowing through maze walls
    const pulse = 0.40 + 0.12 * Math.sin(time * 6);
    c.fillStyle = `rgba(0, 240, 255, ${pulse})`;
    c.fillRect(0, 0, this.cw, ROWS * T);
    c.restore();
  }

  public draw32xVignette(_time?: number, _timer?: number, _maxTimer?: number) {
    // Removed per user feedback: eliminates intrusive blue screen tint and long overlay
  }

  public drawDualSpawnMarkers(time: number, isMadness: boolean) {
    if (!isMadness || this.cw <= 588) return;
    const c = this.ctx;
    const cols = Math.floor(this.cw / T);
    const leftX = Math.round(cols * 0.24) * T + HALF;
    const rightX = Math.round(cols * 0.76) * T + HALF;
    const y = 10 * T + HALF;

    const pulse = 1 + Math.sin(time * 4) * 0.12;
    const r = (T * 0.42) * pulse;

    c.save();
    c.lineWidth = 1.2;
    for (const sx of [leftX, rightX]) {
      c.strokeStyle = 'rgba(255, 0, 127, 0.45)';
      c.fillStyle = 'rgba(255, 0, 127, 0.08)';
      c.beginPath();
      c.arc(sx, y, r, 0, PI2);
      c.fill();
      c.stroke();

      c.font = 'bold 9px monospace';
      c.fillStyle = 'rgba(255, 50, 150, 0.65)';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('◈', sx, y);
    }
    c.restore();
  }

  public drawPredatorMazeGlow(_mOff: HTMLCanvasElement, _time: number, _isWarn: boolean) {
    // Replaced by drawMaze32xSupercharge
  }

  public drawPredatorVignette(_time: number, _predTimer: number, _isWarn: boolean) {
    // Replaced by draw32xVignette
  }


  public drawBonusStage(
    playerPos: { x: number; y: number },
    playerAngle: number,
    dashStreaks: { x1: number; y1: number; x2: number; y2: number; life: number; maxLife: number }[],
    swarmGhosts: { x: number; y: number; vx: number; vy: number; color: string; alive: boolean }[],
    bonusTimer: number,
    bonusKills: number,
    bonusScore: number,
    score: number,
    dScore: number,
    forceFieldRad: number,
    time: number,
    player: Player,
    ghostCount: number = swarmGhosts.length,
    shockwaveRadius: number = 0,
    burstBanner: { text: string; subtext: string; col: string; life: number } | null = null
  ) {
    const c = this.ctx;
    c.clearRect(0, 0, this.cw, CH);

    // Deep cosmic arena background with intensity scaling with timer climax
    const isClimax = bonusTimer < 3.0;
    const bgGrad = c.createLinearGradient(0, 0, 0, CH);
    bgGrad.addColorStop(0, '#050012');
    bgGrad.addColorStop(0.5, isClimax ? '#1a0033' : '#0a0224');
    bgGrad.addColorStop(1, isClimax ? '#28003a' : '#18002a');
    c.fillStyle = bgGrad;
    c.fillRect(0, 0, this.cw, CH);

    // Save context for scaled zoomed-out arena (viewed from afar)
    c.save();
    c.beginPath();
    c.rect(0, HUD_H, this.cw, CH - HUD_H);
    c.clip();

    const scale = this.cw / BONUS_ARENA_W; // ~0.52x zoom out!
    c.translate(0, HUD_H);
    c.scale(scale, scale);

    // Cosmic Grid Floor (accelerates near climax)
    const gridSpeed = isClimax ? 60 : 25;
    c.strokeStyle = isClimax ? 'rgba(217, 70, 239, 0.16)' : 'rgba(0, 240, 255, 0.08)';
    c.lineWidth = 1;
    const gridStep = 40;
    const offset = (time * gridSpeed) % gridStep;
    for (let x = 0; x < BONUS_ARENA_W; x += gridStep) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, BONUS_ARENA_H); c.stroke();
    }
    for (let y = offset; y < BONUS_ARENA_H; y += gridStep) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(BONUS_ARENA_W, y); c.stroke();
    }

    // Glowing Neon Perimeter Barrier
    const pulse = 1 + Math.sin(time * (isClimax ? 14 : 6)) * (isClimax ? 0.22 : 0.12);
    c.strokeStyle = isClimax ? '#ff0055' : '#d946ef';
    c.shadowColor = isClimax ? '#ff0055' : '#d946ef';
    c.shadowBlur = 18 * pulse;
    c.lineWidth = 4;
    c.strokeRect(8, 8, BONUS_ARENA_W - 16, BONUS_ARENA_H - 16);

    c.strokeStyle = '#00ffff';
    c.shadowColor = '#00ffff';
    c.shadowBlur = 10;
    c.lineWidth = 1.8;
    c.strokeRect(14, 14, BONUS_ARENA_W - 28, BONUS_ARENA_H - 28);
    c.shadowBlur = 0;

    // Dash streaks in arena coords
    for (const s of dashStreaks) {
      const a = s.life / s.maxLife;
      c.save();
      c.globalAlpha = a * 0.9;
      c.strokeStyle = '#00ffff';
      c.lineWidth = 12 * a;
      c.shadowColor = '#00ffff';
      c.shadowBlur = 16;
      c.beginPath();
      c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2);
      c.stroke();
      c.restore();
    }

    // High-performance batch ghost rendering using precomputed texture stamps
    const animFrame = ((time * 7) | 0) & 1;
    const maxDraw = Math.min(ghostCount, swarmGhosts.length);
    for (let i = 0; i < maxDraw; i++) {
      const g = swarmGhosts[i];
      if (!g.alive) continue;
      const stampFrames = this.ghostStamps.get(g.color);
      if (stampFrames) {
        c.drawImage(stampFrames[animFrame], (g.x - 18) | 0, (g.y - 18) | 0);
      }
    }

    // Draw Particles in Arena space
    particles.draw(c);

    // Draw Terminal Shockwave when timer expires
    if (shockwaveRadius > 0) {
      c.save();
      c.strokeStyle = '#ffffff';
      c.shadowColor = '#00ffff';
      c.shadowBlur = 24;
      c.lineWidth = 12;
      c.beginPath();
      c.arc(playerPos.x, playerPos.y, shockwaveRadius, 0, PI2);
      c.stroke();

      c.strokeStyle = '#ff007f';
      c.lineWidth = 5;
      c.beginPath();
      c.arc(playerPos.x, playerPos.y, Math.max(0, shockwaveRadius - 15), 0, PI2);
      c.stroke();
      c.restore();
    }

    // Draw Pac-Man (incandescent, high-contrast predatory signature)
    player.drawBonusPacman(c, playerPos.x, playerPos.y, time, playerAngle);

    // Multikill Burst Banner (floating above Pac-Man in arena space)
    if (burstBanner && burstBanner.life > 0) {
      c.save();
      const bAlpha = Math.min(1, burstBanner.life * 2);
      c.globalAlpha = bAlpha;
      c.font = 'bold 20px monospace';
      c.fillStyle = burstBanner.col;
      c.shadowColor = burstBanner.col;
      c.shadowBlur = 14;
      c.textAlign = 'center';
      const by = playerPos.y - 26;
      c.fillText(burstBanner.text, playerPos.x, by);

      if (burstBanner.subtext) {
        c.font = 'bold 12px monospace';
        c.fillStyle = '#ffffff';
        c.shadowColor = '#ffffff';
        c.shadowBlur = 6;
        c.fillText(burstBanner.subtext, playerPos.x, by + 16);
      }
      c.restore();
    }

    c.restore();

    // Special Bonus HUD at normal scale (on top of canvas)
    c.save();
    // HUD Header background bar
    const hudGrad = c.createLinearGradient(0, 0, 0, HUD_H);
    hudGrad.addColorStop(0, '#100224');
    hudGrad.addColorStop(1, '#050012');
    c.fillStyle = hudGrad;
    c.fillRect(0, 0, this.cw, HUD_H);

    // Neon divider line
    c.strokeStyle = isClimax ? '#ff0055' : '#d946ef';
    c.shadowColor = isClimax ? '#ff0055' : '#d946ef';
    c.shadowBlur = 8;
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, HUD_H); c.lineTo(this.cw, HUD_H); c.stroke();
    c.shadowBlur = 0;

    // Phase Title & Escalation State
    let phaseTitle = 'PHASE I : ÉVEIL DU VORTEX';
    let phaseCol = '#00f0ff';
    if (bonusTimer <= 2.5) {
      phaseTitle = 'PHASE IV : SINGULARITÉ TOTALE';
      phaseCol = Math.sin(time * 16) > 0 ? '#ff0055' : '#ffffff';
    } else if (bonusTimer <= 7.0) {
      phaseTitle = 'PHASE III : CATACLYSME COSMIQUE';
      phaseCol = '#ffd700';
    } else if (bonusTimer <= 12.0) {
      phaseTitle = 'PHASE II : SURGE EXPONENTIELLE';
      phaseCol = '#d946ef';
    }

    c.font = 'bold 9.5px monospace';
    c.fillStyle = phaseCol;
    c.shadowColor = phaseCol;
    c.shadowBlur = 6;
    c.textAlign = 'center';
    c.fillText(phaseTitle, this.cw / 2, 14);
    c.shadowBlur = 0;

    // Big Countdown Timer in Center
    const tCol = isClimax ? (Math.sin(time * 16) > 0 ? '#ff2244' : '#ffffff') : '#00ffff';
    c.font = 'bold 20px monospace';
    c.fillStyle = tCol;
    c.shadowColor = tCol;
    c.shadowBlur = 12;
    spriteAtlas.drawIcon(c, 'chrono', this.cw / 2 - 40, 36, 16);
    c.fillText(Math.max(0, bonusTimer).toFixed(1) + 's', this.cw / 2 + 10, 36);
    c.shadowBlur = 0;

    // Timer bar
    const bProg = Math.max(0, bonusTimer / BONUS_DURATION);
    c.fillStyle = '#221133';
    c.fillRect(this.cw / 2 - 50, 44, 100, 4);
    c.fillStyle = tCol;
    c.fillRect(this.cw / 2 - 50, 44, 100 * bProg, 4);

    // Left: Kills, Swarm Population & Dynamic Shield Size
    c.font = 'bold 11px monospace';
    c.fillStyle = '#ffd700';
    c.shadowColor = '#ffd700';
    c.shadowBlur = 8;
    c.textAlign = 'left';
    spriteAtlas.drawIcon(c, 'skull', 20, 32, 12);
    c.fillText(bonusKills + ' PULVÉRISÉS', 30, 32);
    c.shadowBlur = 0;
    c.font = 'bold 9px monospace';
    c.fillStyle = '#00ffff';
    spriteAtlas.drawIcon(c, 'spectre', 20, 48, 11);
    c.fillText(`${maxDraw} ENNEMIS EN ARÈNE`, 30, 48);

    // Right: Real-time Player Score & Bonus Accumulator
    c.font = 'bold 13px monospace';
    c.fillStyle = '#00ffff';
    c.shadowColor = '#00ffff';
    c.shadowBlur = 8;
    c.textAlign = 'right';
    c.fillText('SCORE: ' + Math.round(dScore), this.cw - 12, 32);
    c.shadowBlur = 0;
    c.font = 'bold 10px monospace';
    c.fillStyle = '#ffd700';
    c.fillText('+' + bonusScore.toLocaleString('fr-FR') + ' BONUS', this.cw - 12, 48);
    c.shadowBlur = 0;

    // Bottom Controls Hint
    c.font = 'bold 9px monospace';
    c.fillStyle = 'rgba(255, 255, 255, 0.7)';
    c.textAlign = 'center';
    c.fillText('ABSORBEZ LES HORDES AVEC LE FORCE FIELD • [ESPACE] DASH', this.cw / 2, CH - 14);

    c.restore();
  }

  public drawBonusTally(bonusKills: number, bonusScore: number, time: number) {
    const c = this.ctx;
    c.save();

    // Dark backdrop overlay
    c.fillStyle = 'rgba(5, 0, 16, 0.82)';
    c.fillRect(0, HUD_H, this.cw, CH - HUD_H);

    const bx = this.cw / 2 - 160, by = CH / 2 - 90, bw = 320, bh = 180;
    const pulse = 1 + Math.sin(time * 8) * 0.05;

    // Card frame
    c.fillStyle = '#0c021c';
    c.strokeStyle = '#d946ef';
    c.shadowColor = '#d946ef';
    c.shadowBlur = 24 * pulse;
    c.lineWidth = 2.5;
    c.strokeRect(bx, by, bw, bh);
    c.fillRect(bx, by, bw, bh);
    c.shadowBlur = 0;

    // Title
    c.font = 'bold 16px monospace';
    c.fillStyle = '#ffd700';
    c.shadowColor = '#ffd700';
    c.shadowBlur = 14;
    c.textAlign = 'center';
    spriteAtlas.drawIcon(c, 'vortex', this.cw / 2 - 130, by + 34, 18);
    spriteAtlas.drawIcon(c, 'vortex', this.cw / 2 + 130, by + 34, 18);
    c.fillText('RAMPAGE DU VORTEX TERMINÉ !', this.cw / 2, by + 34);
    c.shadowBlur = 0;

    // Kills line
    c.font = 'bold 14px monospace';
    c.fillStyle = '#ffffff';
    spriteAtlas.drawIcon(c, 'skull', this.cw / 2 - 90, by + 74, 16);
    c.fillText(`${bonusKills} SPECTRES DÉTRUITS`, this.cw / 2 + 8, by + 74);

    // Score line
    c.font = 'bold 18px monospace';
    c.fillStyle = '#00ffff';
    c.shadowColor = '#00ffff';
    c.shadowBlur = 12;
    c.fillText(`+${bonusScore.toLocaleString('fr-FR')} POINTS !`, this.cw / 2, by + 112);
    c.shadowBlur = 0;

    // Subtitle
    c.font = '9px monospace';
    c.fillStyle = '#a855f7';
    c.fillText('RETOUR AU LABYRINTHE...', this.cw / 2, by + 150);

    c.restore();
  }
}

// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — CANVAS RENDERER & VISUAL PIPELINE
// ═══════════════════════════════════════════════════════════════

import { CW, CH, HUD_H, BOTTOM_BAR_H, T, ROWS, COLS, HALF, PI2, C_BG, C_GLOW, C_PLAYER, C_DOT, PC, DASH_BTN, CC, COMBO_DECAY, GOD_MODE_DURATION, KILL_STREAK_DECAY_WINDOW, getComboTier, GAME_VERSION, BONUS_DURATION, BONUS_ARENA_W, BONUS_ARENA_H, BONUS_FORCE_FIELD_BASE_RAD, BONUS_FORCE_FIELD_MAX_RAD, MADNESS_UNLOCK_KILLS, ChromaTier, CHROMA_BG, CHROMA_DOT, CHROMA_WALL, CHROMA_PELLET, CHROMA_TIERS } from '../config/constants';
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
import { experienceSystem, SKILL_NODES, SKILL_TREE_BRANCHES } from '../systems/ExperienceSystem';
import { profileManager } from '../systems/ProfileManager';
import { spriteAtlas } from './SpriteAtlas';
import { formatScoreCompact } from '../utils/format';
import { SKILL_COMBOS } from '../core/InputManager';

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
  public selectedSkillId: string = 'dash_reflex';
  public skillNodeBounds: Map<string, { x: number; y: number; w: number; h: number }> = new Map();
  public inspectorUpgradeBtnBounds: { x: number; y: number; w: number; h: number } | null = null;
  public treeRespecBtnBounds: { x: number; y: number; w: number; h: number } | null = null;
  public treeSwitchModeBtnBounds: { x: number; y: number; w: number; h: number } | null = null;
  public codexLabBtnBounds: { x: number; y: number; w: number; h: number } | null = null;
  public skillCardBounds: Map<string, { x: number; y: number; w: number; h: number }> = new Map();
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
    this.ch = rows * T + HUD_H + BOTTOM_BAR_H;
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

  public drawNitroTrail(trail: { x: number; y: number; life: number; maxLife: number }[], isSingularity: boolean = false) {
    const c = this.ctx;
    for (const t of trail) {
      const a = t.life / t.maxLife;
      c.save();
      if (isSingularity) {
        // Cosmic Singularity Hyper-Nitro: Incandescent golden/magenta plasma trail
        c.globalAlpha = a * 0.9;
        c.fillStyle = '#ffd700';
        c.shadowColor = '#ff0055';
        c.shadowBlur = 28;
        c.beginPath();
        c.arc(t.x, t.y, 24 * a, 0, PI2);
        c.fill();

        // Inner white-hot stellar core
        c.fillStyle = '#ffffff';
        c.shadowColor = '#ffd700';
        c.shadowBlur = 16;
        c.beginPath();
        c.arc(t.x, t.y, 10 * a, 0, PI2);
        c.fill();
      } else {
        c.globalAlpha = a * 0.65;
        c.fillStyle = '#ff6600';
        c.shadowColor = '#ff3300';
        c.shadowBlur = 14;
        c.beginPath();
        c.arc(t.x, t.y, 8 * a, 0, PI2);
        c.fill();
      }
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

  public drawSequenceModeOverlay(input: import('../core/InputManager').InputManager, time: number) {
    if (profileManager.gameMode !== 'custom' || !input.isSequenceMode || input.sequenceStatus === 'executed') return;
    const c = this.ctx;
    c.save();

    const isExec = false;
    const isInvalid = input.sequenceStatus === 'invalid' || input.sequenceStatus === 'cooldown';
    const isValid = input.sequenceStatus === 'valid';

    if (input.isSequenceMode) {
      c.fillStyle = 'rgba(3, 5, 14, 0.66)';
      c.fillRect(0, HUD_H, this.cw, ROWS * T);
    }

    const panelW = Math.min(380, this.cw - 32);
    const panelH = 112;
    const panelX = this.cw / 2 - panelW / 2;
    const panelY = HUD_H + (ROWS * T - panelH) / 2;

    const borderColor = isExec ? '#00ffaa' : (isInvalid ? '#ff0055' : (isValid ? '#ffd700' : '#00f0ff'));
    c.fillStyle = 'rgba(8, 12, 25, 0.98)';
    c.strokeStyle = borderColor;
    c.lineWidth = 1.8;
    c.shadowColor = borderColor;
    c.shadowBlur = 12;
    c.beginPath();
    c.roundRect(panelX, panelY, panelW, panelH, 8);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    c.font = 'bold 14px monospace';
    c.textAlign = 'center';
    c.fillStyle = borderColor;
    const headerTitle = isExec ? 'SKILL ACTIVATED' : (isValid ? 'SEQUENCE READY' : 'SEQUENCE');
    c.fillText(headerTitle, this.cw / 2, panelY + 25);

    if (input.isSequenceMode) {
      c.font = 'bold 19px monospace';
      c.fillStyle = '#ffffff';
      c.textAlign = 'right';
      c.fillText(Math.ceil(input.sequenceTimeLeft).toString(), panelX + panelW - 17, panelY + 26);
    }

    // Sequence Slots
    const maxSlots = 4;
    const slotW = 34, slotH = 30, slotGap = 10;
    const totalSlotsW = maxSlots * slotW + (maxSlots - 1) * slotGap;
    const startX = this.cw / 2 - totalSlotsW / 2;
    const slotY = panelY + 38;

    const arrowSymbols: Record<string, string> = {
      up: '▲',
      down: '▼',
      left: '◄',
      right: '►'
    };

    for (let i = 0; i < maxSlots; i++) {
      const sx = startX + i * (slotW + slotGap);
      const dirKey = input.sequenceBuffer[i];

      c.fillStyle = dirKey ? 'rgba(0, 240, 255, 0.22)' : 'rgba(255, 255, 255, 0.05)';
      c.strokeStyle = dirKey ? borderColor : 'rgba(255, 255, 255, 0.2)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.roundRect(sx, slotY, slotW, slotH, 4);
      c.fill();
      c.stroke();

      if (dirKey) {
        c.font = 'bold 17px monospace';
        c.fillStyle = '#ffffff';
        c.textAlign = 'center';
        c.fillText(arrowSymbols[dirKey] || dirKey, sx + slotW / 2, slotY + 21);
      } else {
        c.fillStyle = 'rgba(255, 255, 255, 0.3)';
        c.beginPath();
        c.arc(sx + slotW / 2, slotY + slotH / 2, 2.5, 0, Math.PI * 2);
        c.fill();
      }
    }

    if (input.isSequenceMode) {
      c.fillStyle = 'rgba(255, 255, 255, 0.12)';
      c.fillRect(panelX + 18, panelY + 77, panelW - 36, 3);
      c.fillStyle = borderColor;
      c.fillRect(panelX + 18, panelY + 77, (panelW - 36) * input.sequenceTimeLeft / input.SEQUENCE_DURATION, 3);
    }

    c.font = 'bold 8.5px monospace';
    c.fillStyle = isExec ? '#00ffaa' : (isInvalid ? '#ff7799' : (isValid ? '#ffd700' : '#b9eaf3'));
    c.textAlign = 'center';
    c.fillText(input.sequenceFeedback || 'ENTER 4 DIRECTIONS', this.cw / 2, panelY + 99, panelW - 24);

    // ─── DYNAMIC COMBO HELPER GUIDE WITH PREFIX FILTERING ───
    const buf = input.sequenceBuffer;
    const isWide = this.cw >= 680;

    const cardsData = SKILL_COMBOS.map(combo => {
      const isDiscovered = profileManager.isSkillDiscovered(combo.id);
      const av = input.getSkillAvailability(combo.id);
      const seq = combo.sequence;
      const altSeq = combo.altSequence;

      let matchedSeq: string[] = seq;
      let isPrefix = false;
      let isCompleted = false;

      if (!isDiscovered) {
        return {
          combo,
          av,
          matchedSeq,
          status: 'locked' as const,
          isCompleted: false,
          isPrefix: false,
          isDiscovered: false
        };
      }

      if (buf.length === 0) {
        isPrefix = true;
        matchedSeq = seq;
      } else {
        const matchesPrimary = buf.every((dir, idx) => seq[idx] === dir);
        const matchesAlt = altSeq ? buf.every((dir, idx) => altSeq[idx] === dir) : false;
        if (matchesPrimary) {
          isPrefix = true;
          matchedSeq = seq;
          if (buf.length === seq.length) isCompleted = true;
        } else if (matchesAlt && altSeq) {
          isPrefix = true;
          matchedSeq = altSeq;
          if (buf.length === altSeq.length) isCompleted = true;
        }
      }

      let status: 'completed' | 'matching' | 'ready' | 'cooldown' | 'no_mana' | 'locked' | 'dimmed';
      if (!av.unlocked) {
        status = 'locked';
      } else if (av.cd > 0) {
        status = 'cooldown';
      } else if (!av.hasMana) {
        status = 'no_mana';
      } else if (isCompleted) {
        status = 'completed';
      } else if (isPrefix && buf.length > 0) {
        status = 'matching';
      } else if (!isPrefix && buf.length > 0) {
        status = 'dimmed';
      } else {
        status = 'ready';
      }

      return { combo, av, matchedSeq, status, isCompleted, isPrefix, isDiscovered: true };
    });

    const drawComboCard = (item: typeof cardsData[0], x: number, y: number, w: number, h: number) => {
      if (!item.isDiscovered) {
        c.save();
        c.fillStyle = 'rgba(6, 9, 18, 0.75)';
        c.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        c.lineWidth = 1;
        c.beginPath();
        c.roundRect(x, y, w, h, 5);
        c.fill();
        c.stroke();

        // Icon ?
        c.font = 'bold 12px monospace';
        c.fillStyle = '#556677';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('?', x + 12, y + h / 2);

        // Title UNKNOWN SKILL
        c.textAlign = 'left';
        c.font = 'bold 8.5px monospace';
        c.fillStyle = '#445566';
        c.fillText('UNKNOWN SKILL', x + 24, y + h / 2);

        // Right side badge
        c.textAlign = 'right';
        c.font = 'bold 8px monospace';
        c.fillStyle = '#334455';
        c.fillText('LOCKED', x + w - 6, y + h / 2);

        c.restore();
        return;
      }

      const isDimmed = item.status === 'dimmed';
      const isCompl = item.status === 'completed';
      const isMatch = item.status === 'matching';
      const isCd = item.status === 'cooldown';
      const isNoMana = item.status === 'no_mana';
      const isLock = item.status === 'locked';

      c.save();
      if (isDimmed) c.globalAlpha = 0.28;

      let border = 'rgba(0, 240, 255, 0.3)';
      let bg = 'rgba(8, 14, 28, 0.92)';
      if (isCompl) {
        border = '#ffd700';
        bg = 'rgba(40, 32, 5, 0.95)';
        c.shadowColor = '#ffd700';
        c.shadowBlur = 10;
      } else if (isMatch) {
        border = '#00ffff';
        bg = 'rgba(5, 25, 35, 0.95)';
        c.shadowColor = '#00ffff';
        c.shadowBlur = 6;
      } else if (isCd) {
        border = 'rgba(255, 100, 50, 0.4)';
      } else if (isNoMana) {
        border = 'rgba(217, 70, 239, 0.4)';
      } else if (isLock) {
        border = 'rgba(255, 255, 255, 0.12)';
        bg = 'rgba(5, 5, 12, 0.7)';
      }

      c.fillStyle = bg;
      c.strokeStyle = border;
      c.lineWidth = isCompl || isMatch ? 1.6 : 1;
      c.beginPath();
      c.roundRect(x, y, w, h, 5);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;

      // Icon & Name
      const icon = item.combo.id === 'wiggle' ? 'wiggle' :
        item.combo.id === 'nitro' ? 'nitro' :
        item.combo.id === 'quantum_laser' ? 'laser' :
        item.combo.id === 'kinetic_bastion' ? 'shield' : 'nova';
      spriteAtlas.drawIcon(c, icon, x + 6, y + h / 2 - 6, 12);

      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.font = 'bold 8.5px monospace';
      c.fillStyle = isCompl ? '#ffd700' : (isLock ? '#667788' : '#ffffff');
      const shortName = item.combo.name.replace(' MATRIX', '').replace(' TRANSCENDENCE', '').replace(' SHIELD', '').replace(' JET', '').replace(' SHOCKWAVE', '');
      c.fillText(shortName, x + 22, y + 9);

      // Sequence arrows
      const arrowStartX = x + 22;
      const arrowY = y + h - 8;
      item.matchedSeq.forEach((dir, idx) => {
        const isArrowMatched = (isCompl || isMatch) && idx < buf.length;
        c.font = isArrowMatched ? 'bold 10px monospace' : '9px monospace';
        c.fillStyle = isArrowMatched ? '#ffd700' : (isLock ? '#556677' : '#00ffff');
        c.fillText(arrowSymbols[dir] || dir, arrowStartX + idx * 11, arrowY);
      });

      // Right-side badge (Status / Cost)
      c.textAlign = 'right';
      c.font = 'bold 8px monospace';
      if (isCompl) {
        c.fillStyle = '#ffd700';
        c.fillText('RELEASE SHIFT!', x + w - 6, y + h / 2);
      } else if (isCd) {
        c.fillStyle = '#ff7744';
        c.fillText(`${item.av.cd.toFixed(1)}s CD`, x + w - 6, y + h / 2);
      } else if (isNoMana) {
        c.fillStyle = '#d946ef';
        c.fillText(`${item.av.manaCost} MP`, x + w - 6, y + h / 2);
      } else if (isLock) {
        c.fillStyle = '#667788';
        c.fillText('LOCKED', x + w - 6, y + h / 2);
      } else {
        c.fillStyle = '#00ffcc';
        c.fillText(`${item.av.manaCost} MP`, x + w - 6, y + h / 2);
      }

      c.restore();
    };

    if (isWide) {
      // 2 columns flanking the central sequence panel
      const colW = 160;
      const cardH = 32;
      const gapY = 6;
      const leftCards = [cardsData[0], cardsData[1], cardsData[2]];
      const rightCards = [cardsData[3], cardsData[4]];

      const leftX = panelX - colW - 14;
      leftCards.forEach((card, idx) => {
        if (leftX >= 10) {
          drawComboCard(card, leftX, panelY + idx * (cardH + gapY), colW, cardH);
        }
      });

      const rightX = panelX + panelW + 14;
      rightCards.forEach((card, idx) => {
        if (rightX + colW <= this.cw - 10) {
          drawComboCard(card, rightX, panelY + idx * (cardH + gapY), colW, cardH);
        }
      });
    } else {
      // Compact 2-column grid placed below the sequence box
      const gridW = panelW;
      const cardW = (gridW - 8) / 2;
      const cardH = 28;
      const startCardY = panelY + panelH + 8;

      cardsData.forEach((card, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cardX = panelX + col * (cardW + 8);
        const cardY = startCardY + row * (cardH + 5);
        if (cardY + cardH <= CH - 30) {
          drawComboCard(card, cardX, cardY, cardW, cardH);
        }
      });
    }

    c.restore();
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
    const c = this.ctx;
    const nextUnlock = progression.getNextUnlock();

    c.save();
    const cx = this.cw / 2;
    const bannerY = HUD_H + 15;

    if (!nextUnlock.skill) {
      // Everything in the Arsenal / Skill tree is unlocked!
      const alpha = 0.8 + Math.sin(time * 3) * 0.2;
      c.font = 'bold 9px monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = `rgba(0, 255, 234, ${alpha})`;
      c.shadowColor = '#00f0ff';
      c.shadowBlur = 6;
      c.fillText('★ ARSENAL FULLY UNLOCKED ★', cx, bannerY);
      c.restore();
      return;
    }

    const skill = nextUnlock.skill;
    const killsRemaining = nextUnlock.remaining;
    const span = skill.threshold - nextUnlock.prevThreshold;
    const currentInSpan = careerKills - nextUnlock.prevThreshold;
    const progress = Math.max(0, Math.min(1, nextUnlock.progress));

    // Badge / Pill dimensions
    const barW = Math.min(190, this.cw * 0.45);
    const barH = 4;
    const pillW = barW + 80;
    const pillH = 26;
    const pillX = cx - pillW / 2;
    const pillY = bannerY - pillH / 2 + 2;

    // Semi-transparent dark pill container
    c.fillStyle = 'rgba(6, 10, 22, 0.75)';
    c.strokeStyle = 'rgba(0, 240, 255, 0.22)';
    c.lineWidth = 1;
    c.beginPath();
    c.roundRect(pillX, pillY, pillW, pillH, 5);
    c.fill();
    c.stroke();

    // Icon of next skill
    const iconX = pillX + 16;
    const iconY = bannerY + 2;
    spriteAtlas.drawIcon(c, skill.icon, iconX, iconY, 13);

    // Text label above/beside bar
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.font = 'bold 8px monospace';
    c.fillStyle = '#88aacc';
    c.fillText('NEXT:', iconX + 11, bannerY - 3);

    c.font = 'bold 8.5px monospace';
    c.fillStyle = '#00ffff';
    c.shadowColor = '#00ffff';
    c.shadowBlur = 4;
    c.fillText(skill.name, iconX + 40, bannerY - 3);
    c.shadowBlur = 0;

    // Kills counter / remaining on right side
    c.textAlign = 'right';
    c.font = 'bold 7.5px monospace';
    c.fillStyle = '#ffd700';
    c.fillText(`${careerKills}/${skill.threshold} (${killsRemaining} left)`, pillX + pillW - 10, bannerY - 3);

    // Progress bar
    const bx = iconX + 11;
    const by = bannerY + 6;
    const bTotalW = pillX + pillW - 10 - bx;

    // Bar background
    c.fillStyle = 'rgba(255, 255, 255, 0.1)';
    c.beginPath();
    c.roundRect(bx, by, bTotalW, barH, 2);
    c.fill();

    // Bar filled
    if (progress > 0) {
      const fillW = Math.max(3, bTotalW * progress);
      const grad = c.createLinearGradient(bx, by, bx + fillW, by);
      grad.addColorStop(0, '#0088ff');
      grad.addColorStop(0.7, '#00ffff');
      grad.addColorStop(1, '#ffd700');

      c.fillStyle = grad;
      c.shadowColor = '#00ffff';
      c.shadowBlur = 6;
      c.beginPath();
      c.roundRect(bx, by, fillW, barH, 2);
      c.fill();
      c.shadowBlur = 0;

      // Glow pulse on tip
      const tipX = bx + fillW;
      const pulse = (Math.sin(time * 6) + 1) * 0.5;
      c.fillStyle = '#ffffff';
      c.shadowColor = '#ffd700';
      c.shadowBlur = 4 + pulse * 4;
      c.beginPath();
      c.arc(tipX, by + barH / 2, 1.6 + pulse * 0.8, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
    }

    c.restore();
  }

  public drawHUD(
    score: number,
    dScore: number,
    lives: number,
    madnessKills: number,
    madnessStreak: number,
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
    chronoLevel: number = 1,
    dotStreak: number = 0,
    dotStreakTimer: number = 0,
    killStreakTimer: number = 0,
    dashCharges: number = 1,
    dashMaxCharges: number = 1,
    currentMana: number = 100,
    maxMana: number = 100
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
      c.fillText(formatScoreCompact(Math.round(dScore)), isWide ? 52 : 46, 13);
      c.shadowBlur = 0;

      // 2. Ghost Kill Streak (with active decay timer gauge between ghost kills)
      const stX = isWide ? 38 : 30;
      const streakActive = madnessStreak > 0 && killStreakTimer > 0;
      if (streakActive) {
        // Growth every 10 kills (smooth sub-linear step: +1.2px per 10 kills, capped at 18px)
        const streakTier = Math.floor(madnessStreak / 10);
        const streakFontSize = Math.min(18, 10.5 + streakTier * 1.2);
        const streakIconSize = Math.min(18, 13 + streakTier * 1.0);

        spriteAtlas.drawIcon(c, 'flame', stX - 16, 27, streakIconSize);
        c.font = `bold ${streakFontSize}px monospace`;
        c.fillStyle = streakTier >= 5 ? '#ffd700' : (streakTier >= 2 ? '#ff7733' : '#ff5533');
        c.shadowColor = c.fillStyle;
        c.shadowBlur = Math.min(12, 6 + streakTier * 1.2);
        c.fillText('x' + madnessStreak, stX - 4, 27);
        c.shadowBlur = 0;

        // Kill streak timer gauge (countdown between ghost kills)
        const sProg = Math.max(0, Math.min(1, killStreakTimer / (KILL_STREAK_DECAY_WINDOW + experienceSystem.getKillStreakGraceBonus())));
        const sBarW = isWide ? 44 : 34;
        c.fillStyle = 'rgba(255, 255, 255, 0.15)';
        c.fillRect(stX - 18, 33, sBarW, 2.5);
        c.fillStyle = c.fillStyle;
        c.shadowColor = c.fillStyle;
        c.shadowBlur = 4;
        c.fillRect(stX - 18, 33, sBarW * sProg, 2.5);
        c.shadowBlur = 0;
      }

      // 3. Status / Combo / Predator
      if (combo.m >= 64) {
        // Mode Singularity x64 (30s)
        const sProg = Math.max(0, Math.min(1, combo.t / 30.0));
        spriteAtlas.drawIcon(c, 'crown', 15, 41, 12);
        c.font = 'bold 9.5px monospace'; c.fillStyle = '#ffd700';
        c.shadowColor = '#ffd700'; c.shadowBlur = 10;
        c.fillText(`x64 SINGULARITY (${combo.t.toFixed(1)}s)`, 24, 41);
        c.shadowBlur = 0;
        c.fillStyle = '#222'; c.fillRect(10, 46, isWide ? 85 : 62, 3);
        c.fillStyle = '#ffd700'; c.fillRect(10, 46, (isWide ? 85 : 62) * sProg, 3);
      } else if (combo.m >= 32) {
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
        c.fillText(isWide ? `SCARED PREY (${predTimer.toFixed(1)}s)` : `SCARED ${predTimer.toFixed(1)}s`, 24, 41);
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
        const dashText = dashLevel > 0
          ? (dashMaxCharges > 1 ? `DASH (${dashCharges}/${dashMaxCharges})` : 'DASH [SPACE]')
          : `DASH ${progression.totalGhosts}/${dashThreshold}`;
        c.fillText(dashText, 10, 41);
      }

      // 4. Level & Account XP in Center
      const tmX = isWide ? Math.round(this.cw * 0.50) : 130;
      const mDef = MADNESS_LEVELS[currentLevel % MADNESS_LEVELS.length];
      c.font = isWide ? 'bold 10px monospace' : 'bold 8px monospace';
      c.fillStyle = loopCount > 0 ? '#ffd700' : '#8899bb';
      c.textAlign = 'center';
      c.fillText(
        loopCount > 0
          ? (isWide ? `LVL ${currentLevel + 1}/${MADNESS_LEVELS.length} • LOOP ${loopCount + 1} (+${loopCount * 10}%)` : `L.${currentLevel + 1} LOOP ${loopCount + 1}`)
          : (isWide ? `LVL ${currentLevel + 1}/${MADNESS_LEVELS.length} : ${mDef.name}` : `LVL ${currentLevel + 1}/${MADNESS_LEVELS.length}`),
        tmX,
        21
      );

      // Biological Host Vital Telemetry (Heart rate & ECG monitor)
      if (isWide) {
        this.drawHostVitalTelemetry(c, Math.round(this.cw * 0.385), 28, currentLevel, time, loopCount, isWide);
      }

      // Center HUD: account XP in Chromamancer, Singularity ghost streak in Arcade.
      const isCustomMode = profileManager.gameMode === 'custom';
      const singularityTarget = experienceSystem.getSingularityStreakTarget();
      const xpW = isWide ? 96 : 70;
      const xpH = 3.5;
      const xpX = tmX - xpW / 2;
      const xpY = 32;

      if (isCustomMode) {
        const accLvl = experienceSystem.accountLevel;
        const curXp = experienceSystem.accountXp;
        const reqXp = experienceSystem.getXpRequiredForLevel(accLvl);
        const xpRatio = reqXp === Infinity ? 1 : Math.max(0, Math.min(1, curXp / reqXp));

        c.fillStyle = 'rgba(255, 255, 255, 0.12)';
        c.fillRect(xpX, xpY, xpW, xpH);
        c.fillStyle = experienceSystem.consecutiveLevelUpsInLife > 1 ? '#ffd700' : '#00ffaa';
        c.fillRect(xpX, xpY, xpW * xpRatio, xpH);

        c.font = 'bold 7.5px monospace';
        c.fillStyle = experienceSystem.consecutiveLevelUpsInLife > 1 ? '#ffd700' : '#88ffcc';
        const surgeTag = experienceSystem.consecutiveLevelUpsInLife > 1 ? ` (SURGE 2x!)` : '';
        c.fillText(`LVL ${accLvl}${surgeTag} • [CHROMAMANCER]`, tmX, 44);
      } else {
        const killProgress = Math.max(0, Math.min(1, madnessStreak / singularityTarget));

        c.fillStyle = 'rgba(255, 255, 255, 0.12)';
        c.fillRect(xpX, xpY, xpW, xpH);
        c.fillStyle = '#ffd700';
        c.fillRect(xpX, xpY, xpW * killProgress, xpH);

        c.font = 'bold 7.5px monospace';
        c.fillStyle = '#ffd700';
        c.fillText(`STREAK x${madnessStreak}/${singularityTarget}`, tmX, 44);
      }

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
        c.fillText(isWide ? `CHRONO: ${chronoRequirement} KILLS` : `${chronoRequirement} KILLS`, chCenter + 6, 13);
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

      // 6. Real-time Skill & Arsenal Unlock Progression / Active Item Status
      c.textAlign = 'right';
      const rightPad = isWide ? 14 : 10;
      if (superItems.isRunning()) {
        c.font = 'bold 10px monospace'; c.fillStyle = '#00ffff'; c.shadowColor = '#00ffff'; c.shadowBlur = 10;
        c.fillText('ITEM ACTIVE!', this.cw - rightPad, 18); c.shadowBlur = 0;
        c.font = '8px monospace'; c.fillStyle = '#ffbb00';
        c.fillText('ONE ITEM AT A TIME', this.cw - rightPad, 34);
      } else if (superItems.boardDrop) {
        c.font = isWide ? 'bold 9px monospace' : 'bold 8px monospace';
        c.fillStyle = '#ffd700'; c.shadowColor = '#ffd700'; c.shadowBlur = 10;
        c.fillText(`DROP: ${superItems.boardDrop.item.name}`, this.cw - rightPad, 18);
        c.shadowBlur = 0;
        c.font = '8px monospace'; c.fillStyle = '#00ffff';
        c.fillText(`READY TO COLLECT • ${superItems.boardDrop.timer.toFixed(1)}s`, this.cw - rightPad, 34);
      } else if (isCustomMode) {
        // Chromamancer Mana bar and Singularity streak
        const manaRatio = Math.max(0, Math.min(1, currentMana / maxMana));
        const barW = isWide ? 84 : 64;
        const barH = 5;
        const barX = this.cw - rightPad - barW;
        const barY = 19;

        c.font = isWide ? 'bold 8.5px monospace' : 'bold 7.5px monospace';
        c.fillStyle = '#f472b6';
        c.shadowColor = '#d946ef';
        c.shadowBlur = 6;
        c.fillText(`MANA ${Math.floor(currentMana)}/${maxMana}`, this.cw - rightPad, 12);
        c.shadowBlur = 0;

        c.fillStyle = 'rgba(25, 10, 35, 0.85)';
        c.strokeStyle = '#a855f7';
        c.lineWidth = 1;
        c.strokeRect(barX, barY, barW, barH);
        c.fillRect(barX, barY, barW, barH);

        if (manaRatio > 0) {
          const fillW = Math.max(2, (barW - 2) * manaRatio);
          const grad = c.createLinearGradient(barX, barY, barX + fillW, barY);
          grad.addColorStop(0, '#9333ea');
          grad.addColorStop(0.5, '#c084fc');
          grad.addColorStop(1, '#f472b6');
          c.fillStyle = grad;
          c.shadowColor = '#d946ef';
          c.shadowBlur = 6;
          c.fillRect(barX + 1, barY + 1, fillW, barH - 2);
          c.shadowBlur = 0;
        }

        const runProgress = Math.max(0, Math.min(1, madnessStreak / singularityTarget));
        c.font = '7.5px monospace';
        c.fillStyle = '#ffd700';
        c.fillText(`STREAK x${madnessStreak}/${singularityTarget}`, this.cw - rightPad, 33);
        c.fillStyle = 'rgba(255, 255, 255, 0.12)';
        c.fillRect(this.cw - rightPad - barW, 37, barW, 2.5);
        c.fillStyle = '#ffd700';
        c.fillRect(this.cw - rightPad - barW, 37, barW * runProgress, 2.5);
      } else {
        const nextUnlock = progression.getNextUnlock();
        if (nextUnlock.skill) {
          const sk = nextUnlock.skill;
          const kLeft = nextUnlock.remaining;
          const prog = Math.max(0, Math.min(1, nextUnlock.progress));

          c.font = isWide ? 'bold 9px monospace' : 'bold 8px monospace';
          c.fillStyle = '#00f0ff';
          c.shadowColor = '#00f0ff';
          c.shadowBlur = 4;
          const labelText = `${sk.name} : ${progression.totalGhosts}/${sk.threshold}`;
          const ltw = c.measureText(labelText).width;
          spriteAtlas.drawIcon(c, sk.icon, this.cw - rightPad - ltw - 10, 16, 12);
          c.fillText(labelText, this.cw - rightPad, 16);
          c.shadowBlur = 0;

          // Mini progress gauge and kills left
          const barW = isWide ? 80 : 60;
          const barH = 3;
          const bx = this.cw - rightPad - barW;
          const by = 26;

          c.fillStyle = 'rgba(255, 255, 255, 0.12)';
          c.fillRect(bx, by, barW, barH);

          if (prog > 0) {
            const fillW = Math.max(2, barW * prog);
            const grad = c.createLinearGradient(bx, by, bx + fillW, by);
            grad.addColorStop(0, '#0088ff');
            grad.addColorStop(1, '#00ffff');
            c.fillStyle = grad;
            c.shadowColor = '#00ffff';
            c.shadowBlur = 4;
            c.fillRect(bx, by, fillW, barH);
            c.shadowBlur = 0;
          }

          c.font = '7.5px monospace';
          c.fillStyle = '#ffd700';
          c.fillText(`${kLeft} KILLS LEFT`, this.cw - rightPad, 38);
        } else {
          // All skills/arsenal unlocked
          c.font = isWide ? 'bold 9.5px monospace' : 'bold 8.5px monospace';
          c.fillStyle = '#00f0ff';
          c.shadowColor = '#00f0ff';
          c.shadowBlur = 8;
          c.fillText('★ ARSENAL MAXED ★', this.cw - rightPad, 18);
          c.shadowBlur = 0;
          c.font = '8px monospace';
          c.fillStyle = '#ffd700';
          c.fillText(`ALL POWERS UNLOCKED`, this.cw - rightPad, 34);
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
      c.fillText(`PREY ${predTimer.toFixed(1)}s`, dX + dW / 2, dY + dH / 2);
    } else if (isMadness) {
      const isOverdrive = overdriveTimer > 0;
      const isReady = dashCharges > 0 || dashCd <= 0 || isOverdrive;
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
      const label = isOverdrive
        ? `NO-CD (${overdriveTimer.toFixed(1)}s)`
        : (isReady
          ? (dashMaxCharges > 1 ? `DASH (${dashCharges}/${dashMaxCharges})` : 'DASH [SPACE]')
          : 'DASH ' + dashCd.toFixed(1) + 's');
      c.fillText(label, dX + dW / 2, dY + dH / 2);
    }

    // Hi-Score & Level
    c.font = '11px monospace'; c.fillStyle = '#666'; c.textAlign = 'center';
    c.fillText('HI-SCORE: ' + hi.toString().padStart(6, '0'), this.cw / 2, 14);
    const list = isMadness ? MADNESS_LEVELS : LEVELS;
    const lvl = list[currentLevel % list.length];
    c.font = 'bold 12px monospace'; c.fillStyle = lvl.glowColor; c.shadowColor = lvl.glowColor; c.shadowBlur = 8;
    c.fillText('LVL ' + (currentLevel + 1) + '/' + list.length + ': ' + lvl.name, this.cw / 2, 30); c.shadowBlur = 0;
    c.font = 'bold 11px monospace'; c.fillStyle = loopCount > 0 ? '#ffd700' : '#aaa';
    c.fillText(loopCount > 0 ? `WAVE ${wave} • LOOP ${loopCount + 1} (+${loopCount * 10}%)` : 'WAVE ' + wave, this.cw / 2, 46);

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

  public drawBottomExpBar(time: number) {
    const c = this.ctx;
    const isCustom = profileManager.gameMode === 'custom';
    const barH = BOTTOM_BAR_H;
    const barY = this.ch - barH;

    c.save();

    if (isCustom) {
      // ═══════════════════════════════════════════════════════════════
      //  CHROMAMANCER — PROMINENT EXP BAR
      // ═══════════════════════════════════════════════════════════════
      const accLvl = experienceSystem.accountLevel;
      const curXp = experienceSystem.accountXp;
      const reqXp = experienceSystem.getXpRequiredForLevel(accLvl);
      const isMax = accLvl >= 100;
      const xpRatio = isMax ? 1 : Math.max(0, Math.min(1, curXp / reqXp));
      const sp = experienceSystem.skillPoints;
      const isSurge = experienceSystem.consecutiveLevelUpsInLife > 1;

      // 1. Dark Glass Background
      c.fillStyle = 'rgba(7, 2, 16, 0.94)';
      c.fillRect(0, barY, this.cw, barH);

      // 2. XP Fill Bar
      const fillW = Math.round(this.cw * xpRatio);
      if (fillW > 0) {
        const grad = c.createLinearGradient(0, barY, Math.max(10, fillW), barY);
        if (isSurge) {
          grad.addColorStop(0, '#ff8800');
          grad.addColorStop(0.7, '#ffd700');
          grad.addColorStop(1, '#ffffff');
        } else if (isMax) {
          grad.addColorStop(0, '#ffd700');
          grad.addColorStop(0.5, '#00ffff');
          grad.addColorStop(1, '#ff00aa');
        } else {
          grad.addColorStop(0, '#8800cc');
          grad.addColorStop(0.45, '#ff007f');
          grad.addColorStop(0.85, '#00ffaa');
          grad.addColorStop(1, '#00ffff');
        }
        c.fillStyle = grad;
        c.fillRect(0, barY + 1, fillW, barH - 1);

        // Leading edge pulse line
        if (!isMax && fillW < this.cw - 2) {
          c.fillStyle = '#ffffff';
          c.shadowColor = isSurge ? '#ffd700' : '#00ffff';
          c.shadowBlur = 6;
          c.fillRect(fillW - 2, barY + 1, 2, barH - 1);
          c.shadowBlur = 0;
        }
      }

      // 3. Top Glowing Border
      c.strokeStyle = isSurge ? '#ffd700' : (isMax ? '#00ffff' : '#ff007f');
      c.lineWidth = 1;
      c.shadowColor = isSurge ? '#ffd700' : '#ff007f';
      c.shadowBlur = 4;
      c.beginPath();
      c.moveTo(0, barY);
      c.lineTo(this.cw, barY);
      c.stroke();
      c.shadowBlur = 0;

      // 4. Content Text
      c.textBaseline = 'middle';
      const textY = barY + barH / 2 + 0.5;

      // Left: Level Badge
      c.textAlign = 'left';
      c.font = 'bold 9.5px monospace';
      c.fillStyle = isSurge ? '#ffd700' : '#ffffff';
      c.shadowColor = isSurge ? '#ffd700' : '#00ffaa';
      c.shadowBlur = 4;
      c.fillText(`★ LVL ${accLvl} / 100`, 10, textY);
      c.shadowBlur = 0;

      // Center: XP Numbers
      c.textAlign = 'center';
      c.font = 'bold 8.5px monospace';
      c.fillStyle = '#ffffff';
      if (isMax) {
        c.fillText('MAX LEVEL 100  •  ASCENDED CHROMAMANCER', this.cw / 2, textY);
      } else {
        const pct = (xpRatio * 100).toFixed(1);
        c.fillText(`EXP: ${curXp.toLocaleString()} / ${reqXp.toLocaleString()} PTS  (${pct}%)`, this.cw / 2, textY);
      }

      // Right: Skill Points or Surge or Next Level
      c.textAlign = 'right';
      c.font = 'bold 8.5px monospace';
      if (sp > 0) {
        const pulse = Math.sin(time * 6) > 0;
        c.fillStyle = pulse ? '#ffd700' : '#00ffaa';
        c.shadowColor = pulse ? '#ffd700' : '#00ffaa';
        c.shadowBlur = 6;
        c.fillText(`✦ +${sp} SKILL POINT${sp > 1 ? 'S' : ''} DISPO !`, this.cw - 10, textY);
        c.shadowBlur = 0;
      } else if (isSurge) {
        c.fillStyle = '#ffd700';
        c.fillText('⚡ SURGE 2x XP !', this.cw - 10, textY);
      } else {
        c.fillStyle = 'rgba(255, 255, 255, 0.85)';
        c.fillText(`NEXT: LVL ${accLvl + 1}`, this.cw - 10, textY);
      }

    } else {
      // ═══════════════════════════════════════════════════════════════
      //  CHROMAVORE (ARCADE) — KILLS PROGRESSION (INTERMEDIATE POWERS)
      // ═══════════════════════════════════════════════════════════════
      const careerGhosts = profileManager.profile.careerGhosts || 0;
      const nxt = progression.getNextUnlock();
      const upcoming = progression.getUpcomingUnlocks(2);

      // 1. Dark Glass Background
      c.fillStyle = 'rgba(4, 8, 16, 0.94)';
      c.fillRect(0, barY, this.cw, barH);

      c.textBaseline = 'middle';
      const textY = barY + barH / 2 + 0.5;

      if (nxt.skill) {
        const fillW = Math.round(this.cw * nxt.progress);
        if (fillW > 0) {
          const grad = c.createLinearGradient(0, barY, Math.max(10, fillW), barY);
          grad.addColorStop(0, '#003355');
          grad.addColorStop(0.65, '#0099bb');
          grad.addColorStop(1, '#00ffff');
          c.fillStyle = grad;
          c.fillRect(0, barY + 1, fillW, barH - 1);

          // Leading edge pulse line
          if (fillW < this.cw - 2) {
            c.fillStyle = '#ffffff';
            c.shadowColor = '#00ffff';
            c.shadowBlur = 6;
            c.fillRect(fillW - 2, barY + 1, 2, barH - 1);
            c.shadowBlur = 0;
          }
        }

        // Top Border
        c.strokeStyle = '#00f0ff';
        c.lineWidth = 1;
        c.shadowColor = '#00f0ff';
        c.shadowBlur = 4;
        c.beginPath();
        c.moveTo(0, barY);
        c.lineTo(this.cw, barY);
        c.stroke();
        c.shadowBlur = 0;

        // Left: Next power icon + name
        c.textAlign = 'left';
        c.font = 'bold 8.5px monospace';
        c.fillStyle = '#00ffff';
        spriteAtlas.drawIcon(c, nxt.skill.icon, 10, barY + barH / 2 - 6, 12);
        const nextLabel = nxt.skill.threshold === 500
          ? `NEXT: ${nxt.skill.name} (+ 16:9 ARENA)`
          : `NEXT: ${nxt.skill.name}`;
        c.fillText(nextLabel, 26, textY);

        // Center: Career ghosts progress
        c.textAlign = 'center';
        c.font = 'bold 8.5px monospace';
        c.fillStyle = '#ffffff';
        const pct = (nxt.progress * 100).toFixed(0);
        c.fillText(`CAREER: ${careerGhosts.toLocaleString()} / ${nxt.skill.threshold.toLocaleString()} GHOSTS (${pct}%)`, this.cw / 2, textY);

        // Right: Remaining ghosts + next milestone hint
        c.textAlign = 'right';
        c.font = 'bold 8.5px monospace';
        c.fillStyle = '#ffd700';
        const rightText = upcoming.length > 0 && this.cw >= 600
          ? `${nxt.remaining.toLocaleString()} LEFT (THEN: ${upcoming[0].name.slice(0, 11)})`
          : `${nxt.remaining.toLocaleString()} GHOSTS LEFT`;
        c.fillText(rightText, this.cw - 10, textY);

      } else {
        // All powers unlocked in SKILL_TREE
        c.strokeStyle = '#ffd700';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, barY);
        c.lineTo(this.cw, barY);
        c.stroke();

        c.textAlign = 'center';
        c.font = 'bold 8.5px monospace';
        c.fillStyle = '#ffd700';
        c.fillText(`CAREER: ${careerGhosts.toLocaleString()} GHOSTS  •  ARSENAL MASTERED  •  16:9 HYPER-ARENA ACTIVE`, this.cw / 2, textY);
      }
    }

    c.restore();
  }

  public drawMenu(time: number, _bestMadnessKills: number) {
    const c = this.ctx;
    const tier = this.chromaTier;
    const isCustom = profileManager.gameMode === 'custom';

    // 1. Background
    if (isCustom) {
      c.fillStyle = '#090014';
      c.fillRect(0, 0, this.cw, CH);
      // Magenta cosmic glow
      const radGrad = c.createRadialGradient(this.cw / 2, 245, 10, this.cw / 2, 245, 300);
      radGrad.addColorStop(0, 'rgba(217, 70, 239, 0.16)');
      radGrad.addColorStop(0.5, 'rgba(255, 0, 127, 0.06)');
      radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      c.fillStyle = radGrad;
      c.fillRect(0, 0, this.cw, CH);
    } else {
      c.fillStyle = tier === 0 ? '#050505' : tier === 1 ? '#060610' : '#080114';
      c.fillRect(0, 0, this.cw, CH);
    }
    c.textAlign = 'center';

    // 2. Perspective synthwave grid
    const horizonY = 245;
    c.save();
    if (isCustom) {
      c.strokeStyle = 'rgba(255, 0, 127, 0.16)';
      c.lineWidth = 1.2;
      for (let i = 1; i <= 12; i++) {
        const lineY = horizonY + Math.pow(i / 12, 2.2) * (CH - horizonY);
        c.beginPath(); c.moveTo(0, lineY); c.lineTo(this.cw, lineY); c.stroke();
      }
      const vpX = this.cw / 2;
      for (let x = -this.cw * 0.5; x <= this.cw * 1.5; x += 40) {
        c.beginPath(); c.moveTo(vpX, horizonY); c.lineTo(x, CH); c.stroke();
      }
    } else if (tier >= 1) {
      const gridAlpha = tier === 1 ? 0.04 : tier === 2 ? 0.08 : 0.14;
      const gridColor = tier <= 2 ? `rgba(180,180,200,${gridAlpha})` : `rgba(0, 240, 255, ${gridAlpha})`;
      c.strokeStyle = gridColor;
      c.lineWidth = 1.2;
      for (let i = 1; i <= 12; i++) {
        const lineY = horizonY + Math.pow(i / 12, 2.2) * (CH - horizonY);
        c.beginPath(); c.moveTo(0, lineY); c.lineTo(this.cw, lineY); c.stroke();
      }
      const vpX = this.cw / 2;
      for (let x = -this.cw * 0.5; x <= this.cw * 1.5; x += 40) {
        c.beginPath(); c.moveTo(vpX, horizonY); c.lineTo(x, CH); c.stroke();
      }
    }
    c.restore();

    // 3. OutRun Sun on horizon
    const sunX = this.cw / 2, sunY = 245, sunR = 48;
    c.save();
    if (isCustom) {
      const sunGrad = c.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
      sunGrad.addColorStop(0, '#ffffff');
      sunGrad.addColorStop(0.3, '#ff00aa');
      sunGrad.addColorStop(0.7, '#d946ef');
      sunGrad.addColorStop(1, '#5500aa');
      c.fillStyle = sunGrad;
      c.shadowColor = '#ff00aa';
      c.shadowBlur = 24;
    } else if (tier <= 1) {
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

    const bgSlice = isCustom ? '#090014' : (tier === 0 ? '#050505' : tier === 1 ? '#060610' : '#080114');
    c.fillStyle = bgSlice;
    for (let s = 1; s <= 5; s++) {
      const sliceY = sunY - sunR * 0.7 + s * 8;
      const sliceH = 1 + s * 0.7;
      c.fillRect(sunX - sunR - 4, sliceY, (sunR + 4) * 2, sliceH);
    }
    c.restore();

    // 4. Title: CHROMAVORE vs CHROMAMANCER
    const ty = 105, p = 1 + Math.sin(time * 2) * 0.03;
    c.save();
    c.textAlign = 'center';

    if (isCustom) {
      c.font = `bold ${35 * p}px monospace`;
      c.shadowColor = '#ff007f';
      c.shadowBlur = 24;
      const titleGrad = c.createLinearGradient(this.cw / 2, ty - 24, this.cw / 2, ty + 10);
      titleGrad.addColorStop(0, '#ffffff');
      titleGrad.addColorStop(0.35, '#ff00aa');
      titleGrad.addColorStop(0.7, '#d946ef');
      titleGrad.addColorStop(1, '#ffd700');
      c.fillStyle = titleGrad;
      c.fillText('CHROMAMANCER', this.cw / 2, ty);
    } else if (tier === 0) {
      c.font = `bold ${38 * p}px monospace`;
      c.fillStyle = '#cccccc';
      c.shadowBlur = 0;
      c.fillText('CHROMAVORE', this.cw / 2, ty);
    } else if (tier <= 2) {
      c.font = `bold ${38 * p}px monospace`;
      c.fillStyle = tier === 1 ? '#aaaacc' : '#ddeeff';
      c.shadowColor = tier === 1 ? '#446688' : '#6688aa';
      c.shadowBlur = tier * 6;
      c.fillText('CHROMAVORE', this.cw / 2, ty);
    } else {
      c.font = `bold ${38 * p}px monospace`;
      c.shadowColor = '#00f0ff';
      c.shadowBlur = 24;
      const titleGrad = c.createLinearGradient(this.cw / 2, ty - 24, this.cw / 2, ty + 10);
      titleGrad.addColorStop(0, '#ffffff');
      titleGrad.addColorStop(0.35, '#00f0ff');
      titleGrad.addColorStop(0.65, '#ff00aa');
      titleGrad.addColorStop(1, '#ffd700');
      c.fillStyle = titleGrad;
      c.fillText('CHROMAVORE', this.cw / 2, ty);
    }
    c.shadowBlur = 0;

    // Subtitle & Version
    c.font = 'bold 9px monospace';
    c.fillStyle = isCustom ? 'rgba(255, 100, 200, 0.75)' : 'rgba(0, 240, 255, 0.75)';
    const subText = isCustom
      ? `ROGUELITE  •  PERSISTENT XP & SKILLS  •  ${GAME_VERSION}`
      : `ARCADE RUN  •  KILL UNLOCKS  •  ${GAME_VERSION}`;
    c.fillText(subText, this.cw / 2, ty + 22);
    c.restore();

    // 5. Hero & Dots Preview on horizon
    const ma = Math.abs(Math.sin(time * 4)) * 0.6;
    c.save();
    c.translate(this.cw / 2 - 34, 240);
    Player.drawChromavore(c, 13, time, ma, false, false, 1, isCustom ? 5 : this.chromaTier);
    c.restore();
    for (let i = 0; i < 4; i++) {
      const dotC = isCustom ? '#ff00aa' : (CHROMA_DOT[this.chromaTier] || C_DOT);
      c.fillStyle = dotC; c.shadowColor = dotC; c.shadowBlur = 8;
      c.beginPath(); c.arc(this.cw / 2 - 4 + i * 16, 240, 3, 0, PI2); c.fill(); c.shadowBlur = 0;
    }

    // 6. Mode Selection Cards: CHROMAVORE vs CHROMAMANCER
    const totalW = Math.min(540, this.cw - 24);
    const cardW = Math.floor((totalW - 14) / 2);
    const cardH = 76;
    const startX = this.cw / 2 - totalW / 2;
    const cardY = 306;

    // Card 1: CHROMAVORE (Arcade)
    const arcX = startX;
    const arcActive = !isCustom;
    c.save();
    c.fillStyle = arcActive ? 'rgba(0, 240, 255, 0.18)' : 'rgba(255, 255, 255, 0.03)';
    c.strokeStyle = arcActive ? '#00ffff' : 'rgba(255, 255, 255, 0.18)';
    c.lineWidth = arcActive ? 2 : 1;
    c.shadowColor = arcActive ? '#00ffff' : 'transparent';
    c.shadowBlur = arcActive ? this.getChromaBlur(12) : 0;
    c.beginPath();
    c.roundRect(arcX, cardY, cardW, cardH, 7);
    c.fill();
    c.stroke();

    c.textAlign = 'center';
    c.font = 'bold 15px monospace';
    c.fillStyle = arcActive ? '#ffffff' : '#88aacc';
    c.fillText('CHROMAVORE', arcX + cardW / 2, cardY + 25);
    c.font = 'bold 10px monospace';
    c.fillStyle = arcActive ? '#00ffff' : '#557788';
    c.fillText('ARCADE', arcX + cardW / 2, cardY + 45);
    c.font = '9px monospace';
    c.fillStyle = arcActive ? '#d9f8ff' : '#668899';
    c.fillText('KILL UNLOCKS', arcX + cardW / 2, cardY + 63);
    c.restore();

    // Card 2: CHROMAMANCER (Roguelite)
    const custX = startX + cardW + 14;
    const isUnlocked = profileManager.isChromamancerUnlocked();
    const custActive = isCustom && isUnlocked;
    c.save();
    c.fillStyle = isUnlocked
      ? (custActive ? 'rgba(255, 0, 127, 0.22)' : 'rgba(255, 255, 255, 0.03)')
      : 'rgba(25, 10, 25, 0.45)';
    c.strokeStyle = isUnlocked
      ? (custActive ? '#ff007f' : 'rgba(255, 255, 255, 0.18)')
      : 'rgba(120, 50, 90, 0.35)';
    c.lineWidth = custActive ? 2 : 1;
    c.shadowColor = custActive ? '#ff007f' : 'transparent';
    c.shadowBlur = custActive ? this.getChromaBlur(12) : 0;
    c.beginPath();
    c.roundRect(custX, cardY, cardW, cardH, 7);
    c.fill();
    c.stroke();

    c.textAlign = 'center';
    if (!isUnlocked) {
      const cg = profileManager.profile.careerGhosts || 0;
      const prog = Math.min(1, cg / MADNESS_UNLOCK_KILLS);
      c.font = 'bold 13px monospace';
      c.fillStyle = '#aa7799';
      c.fillText('🔒 CHROMAMANCER', custX + cardW / 2, cardY + 23);
      c.font = 'bold 8.5px monospace';
      c.fillStyle = '#885577';
      c.fillText('ROGUELITE (16:9 REQUIS)', custX + cardW / 2, cardY + 39);

      // Mini gauge
      const gw = cardW - 36;
      const gx = custX + 18;
      const gy = cardY + 47;
      c.fillStyle = 'rgba(255, 255, 255, 0.1)';
      c.fillRect(gx, gy, gw, 4);
      c.fillStyle = '#ff007f';
      c.fillRect(gx, gy, Math.round(gw * prog), 4);

      c.font = 'bold 8px monospace';
      c.fillStyle = '#cc88aa';
      c.fillText(`${cg.toLocaleString()} / ${MADNESS_UNLOCK_KILLS.toLocaleString()} GHOSTS`, custX + cardW / 2, cardY + 65);
    } else {
      c.font = 'bold 15px monospace';
      c.fillStyle = custActive ? '#ffffff' : '#c088a8';
      c.fillText('CHROMAMANCER', custX + cardW / 2, cardY + 25);
      c.font = 'bold 10px monospace';
      c.fillStyle = custActive ? '#ff00a0' : '#885577';
      c.fillText('ROGUELITE', custX + cardW / 2, cardY + 45);
      c.font = '9px monospace';
      c.fillStyle = custActive ? '#ffd0e8' : '#886677';
      c.fillText('XP  •  SKILL TREE', custX + cardW / 2, cardY + 63);
    }
    c.restore();

    // 7. Space to play
    c.font = 'bold 11px monospace';
    c.fillStyle = isCustom ? '#ff55aa' : (this.chromaTier === 0 ? '#c0c0c0' : '#a9bdcc');
    c.textAlign = 'center';
    c.fillText('SPACE TO PLAY', this.cw / 2, 412);

    // 8. Player Profile & Sync code
    c.font = 'bold 10.5px monospace';
    c.fillStyle = isCustom ? '#d999bb' : (this.chromaTier === 0 ? '#c0c0c0' : '#e0f4ff');
    c.fillText(`PLAYER: ${profileManager.profile.pseudo}   •   SYNC ID: ${profileManager.profile.syncCode}`, this.cw / 2, 478);

    // 9. CRT Scanlines
    if (settingsManager.settings.crtScanlines) {
      c.save();
      c.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let y = 0; y < CH; y += 3) c.fillRect(0, y, this.cw, 1);
      c.restore();
    }

    // 10. Menu Navigation Links (including SKILL TREE!)
    this.drawMenuLinks(c, isCustom);
  }

  private drawMenuLinks(c: CanvasRenderingContext2D, isCustom: boolean) {
    const unlockedBadges = badges.getUnlockedCount();

    interface MenuLinkItem {
      id: string;
      label: string;
    }

    const availableLinks: MenuLinkItem[] = [
      { id: 'help', label: 'HOW TO PLAY' },
      { id: 'arsenal', label: 'ARSENAL' },
    ];

    if (isCustom) {
      availableLinks.push({ id: 'tree', label: 'SKILL TREE' });
    }

    availableLinks.push({ id: 'settings', label: 'SETTINGS' });

    if (unlockedBadges > 0) {
      availableLinks.push({ id: 'badges', label: 'BADGES' });
    }

    availableLinks.push({ id: 'scores', label: 'SCORES' });
    availableLinks.push({ id: 'sync', label: 'SYNC' });

    this.menuLinks = [];
    c.save();
    c.font = 'bold 9.5px monospace';
    const accentCol = isCustom ? '#ff33aa' : this.getChromaAccent('#00f0ff', '#d0d0d0');
    c.fillStyle = accentCol;
    c.shadowColor = accentCol;
    c.shadowBlur = this.getChromaBlur(6);

    const rowY = 534;
    const totalWidth = availableLinks.reduce((sum, l) => sum + c.measureText(l.label).width, 0) + (availableLinks.length - 1) * 16;
    let curX = this.cw / 2 - totalWidth / 2;

    for (let i = 0; i < availableLinks.length; i++) {
      const item = availableLinks[i];
      const w = c.measureText(item.label).width;
      c.fillText(item.label, curX + w / 2, rowY);
      this.menuLinks.push({ id: item.id, label: item.label, x: curX + w / 2, y: rowY, w });
      curX += w;
      if (i < availableLinks.length - 1) {
        c.fillText('•', curX + 8, rowY);
        curX += 16;
      }
    }
    c.restore();
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
    c.fillText('EVERYTHING YOU NEED TO KNOW TO DOMINATE THE MAZE', this.cw / 2, 47);

    const cardW = this.cw - 44;
    const cardX = 22;

    // Card 1: BASIC CONTROLS (y: 58, h: 112)
    this.drawInstructionCard(c, cardX, 58, cardW, 112, '#00f0ff', 'BASIC CONTROLS', [
      { badge: 'ARROWS / WASD', desc: 'Smooth pre-turning and instant 180° reversals' },
      { badge: 'SPACE / DASH', desc: 'Unlocked at 10 kills: warp forward and slice through ghosts' },
      { badge: 'SHIFT / SLOW-MO', desc: 'Unlocked at 180 kills: bends time and slows down the world' },
      { badge: 'P / ESC', desc: 'Pause game, display & audio settings, CRT scanlines' }
    ]);

    // Card 2: explain the Shift sequence input clearly.
    this.drawInstructionCard(c, cardX, 180, cardW, 90, '#ffd700', 'SHIFT SEQUENCES • 4-SECOND FREEZE', [
      { badge: 'DOUBLE-TAP SHIFT', badgeW: 132, desc: 'The world freezes. Enter four directions; release Shift or wait for the countdown.' },
      { badge: '← → ← → / ↑ ↓ ↑ ↓', badgeW: 132, desc: 'Wiggle EMP / Nitro Jet (when unlocked).' }
    ]);

    // Card 3: SUPER-ITEMS IN THE MAZE (y: 266, h: 76)
    this.drawInstructionCard(c, cardX, 280, cardW, 76, '#ff007f', 'SUPER-ITEMS IN THE MAZE', [
      { badge: 'AUTO-COLLECT', desc: 'Touch super-items to trigger their ultimate power instantly' },
      { badge: 'SPAWNS', desc: 'Mega Nova, Black Hole, 8-Axis Lasers, Cryo Blizzard, Shockwave...' }
    ]);

    // Card 4: distinct progression tracks for each game mode.
    this.drawInstructionCard(c, cardX, 366, cardW, 148, '#a855f7', 'TWO MODES • TWO PROGRESSION TRACKS', [
      {
        badge: 'CHROMAVORE • ARCADE',
        badgeW: 132,
        desc: 'Unlock arcade powers by reaching ghost-kill milestones. No account XP or Skill Points.'
      },
      {
        badge: 'CHROMAMANCER',
        badgeW: 132,
        desc: 'Earn persistent XP, gain Skill Points at level-ups, and build your loadout in the Skill Tree.'
      },
      {
        badge: 'CHROMA AWAKENING',
        badgeW: 132,
        desc: 'In Chromavore, ghost kills awaken the world’s color, sound, and combat effects.'
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
    c.fillText('▶ PRESS [SPACE], [I] OR TAP TO RETURN ◀', this.cw / 2, pillY + 20);
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

  public drawGameOver(score: number, hi: boolean, madnessKills: number, madnessStreak: number, bestMadnessKills: number, badgesUnlocked: number, time: number, loopCount: number = 0, currentLevel: number = 0) {
    const isMadness = true;
    const c = this.ctx;
    c.fillStyle = this.chromaTier === 0 ? 'rgba(0,0,0,0.92)' : 'rgba(5,5,10,0.85)';
    c.fillRect(0, 0, this.cw, CH);
    const cy = CH * 0.16;

    const overCol = this.getChromaAccent('#ff3344', '#ffffff');
    c.font = 'bold 36px monospace';
    c.fillStyle = overCol;
    c.shadowColor = this.chromaTier === 0 ? 'transparent' : overCol;
    c.shadowBlur = this.getChromaBlur(20);
    c.textAlign = 'center';
    c.fillText(isMadness ? 'FRENZY OVER' : 'GAME OVER', this.cw / 2, cy);
    c.shadowBlur = 0;

    if (isMadness) {
      c.font = 'bold 20px monospace';
      c.fillStyle = this.getChromaAccent('#ffd700', '#ffffff');
      c.fillText('GHOSTS PURGED: ' + madnessKills, this.cw / 2, cy + 42);
      c.font = 'bold 15px monospace';
      c.fillStyle = this.getChromaAccent('#ff5533', '#cccccc');
      c.fillText('MAX STREAK: x' + madnessStreak, this.cw / 2, cy + 68);
      c.font = '13px monospace';
      c.fillStyle = '#888';
      c.fillText('CAREER BEST KILLS: ' + bestMadnessKills, this.cw / 2, cy + 92);
    } else {
      c.font = 'bold 20px monospace';
      c.fillStyle = this.getChromaAccent('#ffd700', '#ffffff');
      c.fillText('SCORE: ' + formatScoreCompact(score), this.cw / 2, cy + 42);
      if (loopCount > 0) {
        c.font = 'bold 13px monospace';
        c.fillStyle = this.getChromaAccent('#00ffcc', '#aaaaaa');
        c.fillText(`LOOP REACHED: ${loopCount + 1} (+${loopCount * 10}% SPEED)`, this.cw / 2, cy + 68);
      }
      if (hi) {
        c.font = 'bold 16px monospace';
        c.fillStyle = this.getChromaAccent('#ff44ff', '#ffffff');
        c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#ff44ff';
        c.shadowBlur = this.getChromaBlur(10);
        if (Math.sin(time * 6) > 0) c.fillText('NEW HIGH SCORE!', this.cw / 2, cy + (loopCount > 0 ? 92 : 68));
        c.shadowBlur = 0;
      }
    }

    c.fillStyle = this.getChromaAccent('#ffd700', '#888888');
    c.font = '11.5px monospace';
    const bTxt = 'Badges & Achievements: ' + badgesUnlocked + '/' + badges.getTotalCount() + ' Unlocked';
    const btw = c.measureText(bTxt).width;
    spriteAtlas.drawIcon(c, 'trophy', this.cw / 2 - btw / 2 - 12, cy + 114, 14);
    c.fillText(bTxt, this.cw / 2 + 8, cy + 114);

    // Career Progression Bar
    const nxt = progression.getNextUnlock();
    const barW = 320, barH = 10;
    const barX = this.cw / 2 - barW / 2, barY = cy + 138;
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

    c.font = 'bold 9.5px monospace';
    c.fillStyle = '#ffffff';
    if (nxt.skill) {
      c.fillText(`CAREER: ${progression.totalGhosts.toLocaleString()} KILLS >> NEXT: ${nxt.skill.name} (${nxt.remaining.toLocaleString()} KILLS)`, this.cw / 2, barY - 6);
    } else {
      c.fillText(`MAX CAREER: ${progression.totalGhosts.toLocaleString()} KILLS (ALL UNLOCKED)`, this.cw / 2, barY - 6);
    }

    // ═══════════════════════════════════════════════════════════════
    //  CLINICAL EPILOGUE & BIOLOGICAL REVELATION DOSSIER
    // ═══════════════════════════════════════════════════════════════
    const isLevel10 = currentLevel >= 9 || loopCount > 0;
    const info = this.getInfectionData(currentLevel, loopCount);

    const dossierW = Math.min(480, this.cw - 24);
    const dossierH = isLevel10 ? 74 : 54;
    const dossierX = this.cw / 2 - dossierW / 2;
    const dossierY = cy + 162;

    c.save();
    c.fillStyle = 'rgba(6, 4, 14, 0.94)';
    c.strokeStyle = isLevel10 ? '#778899' : info.ecgColor;
    c.lineWidth = 1.4;
    c.shadowColor = isLevel10 ? '#778899' : info.ecgColor;
    c.shadowBlur = 6;
    c.beginPath();
    c.roundRect(dossierX, dossierY, dossierW, dossierH, 6);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    c.font = 'bold 9px monospace';
    c.fillStyle = isLevel10 ? '#8899aa' : info.ecgColor;
    c.textAlign = 'center';
    const statusHeader = isLevel10
      ? '☣ CLINICAL REPORT • NECROPSY RECORD #CV-84'
      : `☣ HOST SYSTEM TELEMETRY • ${info.stageCode}`;
    c.fillText(statusHeader, this.cw / 2, dossierY + 16);

    c.font = '8px monospace';
    c.fillStyle = '#b0c4de';
    if (isLevel10) {
      c.fillText('STATUS: ASYSTOLE (00 BPM)  •  IMMUNE DEFENSES COLLAPSED', this.cw / 2, dossierY + 31);
      c.font = 'italic 8.5px monospace';
      c.fillStyle = '#e2e8f0';
      c.fillText('“The specters never attacked you... they were fleeing your hunger.', this.cw / 2, dossierY + 47);
      c.fillText('  You were not the savior. You were the Gangrene.”', this.cw / 2, dossierY + 62);
    } else {
      c.fillText(`HEART RATE: ${info.bpm} BPM  •  RESPONSE: ${info.stageName}`, this.cw / 2, dossierY + 31);
      c.font = '8px monospace';
      c.fillStyle = '#94a3b8';
      c.fillText('THE HOST DEPLOYS SENTINEL DEFENDERS TO PURGE THE INFECTION...', this.cw / 2, dossierY + 44);
    }
    c.restore();

    // Interactive Action Buttons : REPLAY & RETOUR MENU
    const btnW = 160, btnH = 34;
    const btnGap = 16;
    const totalBtnW = btnW * 2 + btnGap;
    const startBtnX = this.cw / 2 - totalBtnW / 2;
    const btnY = cy + (isLevel10 ? 250 : 230);

    // 1. Bouton REPLAY
    const replayX = startBtnX;
    c.save();
    c.fillStyle = this.chromaTier === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0, 240, 255, 0.15)';
    c.strokeStyle = this.getChromaAccent('#00f0ff', '#888888');
    c.lineWidth = 1.8;
    c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#00f0ff';
    c.shadowBlur = this.getChromaBlur(8);
    c.beginPath();
    c.roundRect(replayX, btnY, btnW, btnH, 6);
    c.fill();
    c.stroke();

    c.font = 'bold 12px monospace';
    c.fillStyle = this.getChromaAccent('#00f0ff', '#ffffff');
    c.textAlign = 'center';
    c.fillText('▶ REPLAY [SPACE]', replayX + btnW / 2, btnY + 21);
    c.restore();

    // 2. Bouton MENU PRINCIPAL
    const menuX = startBtnX + btnW + btnGap;
    c.save();
    c.fillStyle = this.chromaTier === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255, 0, 127, 0.15)';
    c.strokeStyle = this.getChromaAccent('#ff007f', '#888888');
    c.lineWidth = 1.8;
    c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#ff007f';
    c.shadowBlur = this.getChromaBlur(8);
    c.beginPath();
    c.roundRect(menuX, btnY, btnW, btnH, 6);
    c.fill();
    c.stroke();

    c.font = 'bold 12px monospace';
    c.fillStyle = this.getChromaAccent('#ff007f', '#ffffff');
    c.textAlign = 'center';
    c.fillText('⌂ MAIN MENU [ESC]', menuX + btnW / 2, btnY + 21);
    c.restore();

    // Secondary Links (Leaderboard & Codex)
    c.font = 'bold 11px monospace';
    c.fillStyle = this.getChromaAccent('#ffd700', '#777777');
    c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#ffd700';
    c.shadowBlur = this.getChromaBlur(6);
    if (Math.sin(time * 2.5) > 0) c.fillText('[ L ] LEADERBOARD   •   [ C ] ARSENAL & SKILLS', this.cw / 2, btnY + 50);
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
    playerDate: string = '',
    activeMode: 'arcade' | 'custom' = 'arcade'
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
      c.font = 'bold 20px monospace';
      c.fillStyle = '#ffffff';
      c.shadowBlur = 0;
    } else {
      const titleGrad = c.createLinearGradient(this.cw / 2, 10, this.cw / 2, 42);
      titleGrad.addColorStop(0, '#ffffff');
      titleGrad.addColorStop(0.5, '#00f0ff');
      titleGrad.addColorStop(1, '#ff007f');
      c.font = 'bold 20px monospace';
      c.fillStyle = titleGrad;
      c.shadowColor = '#00f0ff';
      c.shadowBlur = 14;
    }
    spriteAtlas.drawIcon(c, 'trophy', this.cw / 2 - 95, 30, 16);
    c.fillText('LEADERBOARDS', this.cw / 2 + 10, 30);
    c.shadowBlur = 0;
    c.restore();

    // Separate scoreboards for the two game modes.
    const tabW = Math.min(180, Math.floor((this.cw - 48) / 2));
    const tabH = 26;
    const tabY = 46;
    const totalTabsW = tabW * 2 + 12;
    const tab1X = this.cw / 2 - totalTabsW / 2;
    const tab2X = tab1X + tabW + 12;

    // Tab 1: Arcade
    const isArcade = activeMode === 'arcade';
    c.save();
    c.fillStyle = isArcade ? 'rgba(0, 240, 255, 0.22)' : 'rgba(255, 255, 255, 0.04)';
    c.strokeStyle = isArcade ? '#00ffff' : 'rgba(255, 255, 255, 0.15)';
    c.lineWidth = isArcade ? 2 : 1;
    c.beginPath();
    c.roundRect(tab1X, tabY, tabW, tabH, 5);
    c.fill();
    c.stroke();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 11px monospace';
    c.fillStyle = isArcade ? '#ffffff' : '#778899';
    c.fillText('✦ CHROMAVORE', tab1X + tabW / 2, tabY + tabH / 2);
    c.restore();

    // Tab 2: Custom
    const isCustom = activeMode === 'custom';
    c.save();
    c.fillStyle = isCustom ? 'rgba(255, 0, 127, 0.22)' : 'rgba(255, 255, 255, 0.04)';
    c.strokeStyle = isCustom ? '#ff007f' : 'rgba(255, 255, 255, 0.15)';
    c.lineWidth = isCustom ? 2 : 1;
    c.beginPath();
    c.roundRect(tab2X, tabY, tabW, tabH, 5);
    c.fill();
    c.stroke();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 11px monospace';
    c.fillStyle = isCustom ? '#ffffff' : '#778899';
    c.fillText('⚡ CHROMAMANCER', tab2X + tabW / 2, tabY + tabH / 2);
    c.restore();

    // Column headers
    const startY = 88;
    c.font = 'bold 9px monospace';
    c.fillStyle = this.chromaTier === 0 ? '#555555' : '#445566';
    c.textAlign = 'center';
    c.fillText('#', 34, startY);
    c.textAlign = 'left';
    c.fillText('PLAYER', 64, startY);
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
      c.fillText(`${formatScoreCompact(e.score || 0)} PTS`, this.cw - 28, y + 11);
    }

    if (entries.length === 0) {
      c.font = '13px monospace';
      c.fillStyle = this.chromaTier === 0 ? '#666666' : '#445566';
      c.textAlign = 'center';
      c.fillText('No scores recorded yet...', this.cw / 2, CH * 0.5);
      c.font = '11px monospace';
      c.fillStyle = this.chromaTier === 0 ? '#444444' : '#334455';
      c.fillText('Play a game and set your high score!', this.cw / 2, CH * 0.5 + 24);
    }

    // Footer
    c.font = 'bold 10px monospace';
    c.fillStyle = this.chromaTier === 0 ? '#555555' : '#334466';
    c.textAlign = 'center';
    c.fillText('[ SPACE / ESC ] RETURN TO MENU', this.cw / 2, CH - 14);
  }

  public drawCodex(time: number, tab: 'skills' | 'badges' | 'tree' = 'skills', page: number = 0) {
    const c = this.ctx;
    c.fillStyle = this.chromaTier === 0 ? '#050505' : '#06010f';
    c.fillRect(0, 0, this.cw, CH);

    const isSkills = tab === 'skills';
    const isBadges = tab === 'badges';
    const isTree = (tab as string) === 'tree';
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
      c.shadowColor = isTree ? '#00ffaa' : (isSkills ? '#00ffff' : '#ffd700');
      c.shadowBlur = 10;
    }
    const titleText = isTree ? 'CHROMAMANCER — SKILL TREE' : (isSkills ? 'ARSENAL & RESEARCH' : 'BADGES & TROPHIES');
    const tIcon = isTree ? 'crown' : (isSkills ? 'lightning' : 'trophy');
    const tw = c.measureText(titleText).width;
    spriteAtlas.drawIcon(c, tIcon, this.cw / 2 - tw / 2 - 14, 24, 16);
    spriteAtlas.drawIcon(c, tIcon, this.cw / 2 + tw / 2 + 14, 24, 16);
    c.fillText(titleText, this.cw / 2, 24);
    c.shadowBlur = 0;
    c.restore();

    // Tab Switcher Bar at top (y: 34, h: 24, 3 tabs)
    const tabW = Math.min(160, Math.floor((this.cw - 60) / 3));
    const tabH = 22, tabY = 34;
    const totalTabsW = tabW * 3 + 16;
    const tabsStartX = this.cw / 2 - totalTabsW / 2;

    // Tab 1: Skills
    const t1X = tabsStartX;
    c.fillStyle = isSkills
      ? (this.chromaTier === 0 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 240, 255, 0.22)')
      : (this.chromaTier === 0 ? 'rgba(20, 20, 20, 0.7)' : 'rgba(15, 20, 35, 0.7)');
    c.strokeStyle = isSkills ? this.getChromaAccent('#00f0ff', '#777777') : '#223348';
    c.lineWidth = isSkills ? 1.8 : 1;
    c.beginPath(); c.roundRect(t1X, tabY, tabW, tabH, 5); c.fill(); c.stroke();
    c.font = 'bold 9.5px monospace';
    c.fillStyle = isSkills ? this.getChromaAccent('#00f0ff', '#ffffff') : '#8899aa';
    c.textAlign = 'center';
    c.fillText(`[1] ARSENAL`, t1X + tabW / 2, tabY + 15);

    // Tab 2: Badges
    const t2X = tabsStartX + tabW + 8;
    c.fillStyle = isBadges
      ? (this.chromaTier === 0 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 215, 0, 0.22)')
      : (this.chromaTier === 0 ? 'rgba(20, 20, 20, 0.7)' : 'rgba(15, 20, 35, 0.7)');
    c.strokeStyle = isBadges ? this.getChromaAccent('#ffd700', '#777777') : '#223348';
    c.lineWidth = isBadges ? 1.8 : 1;
    c.beginPath(); c.roundRect(t2X, tabY, tabW, tabH, 5); c.fill(); c.stroke();
    c.font = 'bold 9.5px monospace';
    c.fillStyle = isBadges ? this.getChromaAccent('#ffd700', '#ffffff') : '#8899aa';
    c.fillText(`[2] BADGES`, t2X + tabW / 2, tabY + 15);

    // Tab 3: Tree
    const t3X = tabsStartX + (tabW + 8) * 2;
    c.fillStyle = isTree
      ? (this.chromaTier === 0 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 255, 170, 0.22)')
      : (this.chromaTier === 0 ? 'rgba(20, 20, 20, 0.7)' : 'rgba(15, 20, 35, 0.7)');
    c.strokeStyle = isTree ? this.getChromaAccent('#00ffaa', '#777777') : '#223348';
    c.lineWidth = isTree ? 1.8 : 1;
    c.beginPath(); c.roundRect(t3X, tabY, tabW, tabH, 5); c.fill(); c.stroke();
    c.font = 'bold 9.5px monospace';
    c.fillStyle = isTree ? this.getChromaAccent('#00ffaa', '#ffffff') : '#8899aa';
    c.fillText(`[3] SKILL TREE`, t3X + tabW / 2, tabY + 15);

    // Dynamically center columns
    const isWide = this.cw >= 750;
    const colW = isWide ? Math.min(460, Math.floor((this.cw - 80) / 2)) : 265;
    const gapX = isWide ? 24 : 10;
    const totalGridW = colW * 2 + gapX;
    const startX = Math.round((this.cw - totalGridW) / 2);
    const col1X = startX;
    const col2X = startX + colW + gapX;

    if (isTree) {
      // ═══════════════════════════════════════════════════════════════
      //  CHROMAMANCER — SKILL TREE & SKILL POINTS
      // ═══════════════════════════════════════════════════════════════
      const isArcade = profileManager.gameMode !== 'custom';
      const sp = experienceSystem.skillPoints;
      const accLvl = experienceSystem.accountLevel;
      const curXp = experienceSystem.accountXp;
      const reqXp = experienceSystem.getXpRequiredForLevel(accLvl);
      const xpRatio = reqXp === Infinity ? 1 : Math.max(0, Math.min(1, curXp / reqXp));

      // Header Banner with Level, XP Bar & Available SP
      const barW = Math.min(this.cw - 60, 680), barH = 10;
      const barX = this.cw / 2 - barW / 2, barY = 80;

      c.fillStyle = 'rgba(15, 20, 35, 0.9)';
      c.strokeStyle = isArcade ? '#ff007f' : '#00ffaa';
      c.lineWidth = 1;
      c.beginPath(); c.roundRect(barX, barY, barW, barH, 4); c.fill(); c.stroke();

      c.fillStyle = isArcade ? '#ff007f' : '#00ffaa';
      c.shadowColor = isArcade ? '#ff007f' : '#00ffaa';
      c.shadowBlur = 8;
      c.beginPath(); c.roundRect(barX, barY, barW * xpRatio, barH, 4); c.fill();
      c.shadowBlur = 0;

      c.font = 'bold 11px monospace';
      c.fillStyle = '#ffffff';
      c.textAlign = 'left';
      c.fillText(`LEVEL: ${accLvl} / 100`, barX, 72);
      c.textAlign = 'right';
      c.fillText(reqXp === Infinity ? 'MAX LEVEL' : `XP: ${curXp.toLocaleString()} / ${reqXp.toLocaleString()} PTS`, barX + barW, 72);

      // SP Pill and Action/Respec Button
      c.textAlign = 'center';
      c.font = 'bold 12px monospace';
      c.fillStyle = isArcade ? '#ff66bb' : '#ffd700';
      c.shadowColor = isArcade ? '#ff66bb' : '#ffd700';
      c.shadowBlur = 10;
      const isWideUnlocked = profileManager.isChromamancerUnlocked();
      if (isArcade) {
        c.fillText(isWideUnlocked ? `CHROMAMANCER SKILL TREE [PREVIEW]` : `CHROMAMANCER SKILL TREE [LOCKED 16:9]`, this.cw / 2 - 80, 108);
      } else {
        c.fillText(`AVAILABLE: ${sp} SKILL POINTS`, this.cw / 2 - 80, 108);
      }
      c.shadowBlur = 0;

      if (isArcade) {
        // Switch to Chromamancer Mode Button (Clickable if unlocked!)
        const btnX = this.cw / 2 + 35, btnY = 94, btnW = 180, btnH = 22;
        this.treeSwitchModeBtnBounds = { x: btnX, y: btnY, w: btnW, h: btnH };
        c.fillStyle = isWideUnlocked ? 'rgba(255, 0, 127, 0.22)' : 'rgba(50, 20, 40, 0.35)';
        c.strokeStyle = isWideUnlocked ? '#ff007f' : '#663344';
        c.lineWidth = 1.2;
        c.beginPath(); c.roundRect(btnX, btnY, btnW, btnH, 4); c.fill(); c.stroke();
        c.font = 'bold 9px monospace';
        c.fillStyle = isWideUnlocked ? '#ff66bb' : '#885566';
        c.fillText(isWideUnlocked ? '[⚡ SWITCH TO CHROMAMANCER]' : '[🔒 LOCKED • REQUIRES 16:9]', btnX + btnW / 2, 108);
      } else {
        // Reset / Respec Pill (Clickable)
        const btnX = this.cw / 2 + 35, btnY = 94, btnW = 150, btnH = 22;
        this.treeRespecBtnBounds = { x: btnX, y: btnY, w: btnW, h: btnH };
        c.fillStyle = 'rgba(255, 0, 85, 0.2)';
        c.strokeStyle = '#ff0055';
        c.lineWidth = 1.2;
        c.beginPath(); c.roundRect(btnX, btnY, btnW, btnH, 4); c.fill(); c.stroke();
        c.font = 'bold 9.5px monospace';
        c.fillStyle = '#ff6699';
        c.fillText('[R] RESPEC (FREE)', btnX + btnW / 2, 108);
      }

      // Reset interaction bounds
      this.skillNodeBounds.clear();
      this.inspectorUpgradeBtnBounds = null;

      // Ensure valid selected node
      if (!this.selectedSkillId || !SKILL_NODES.some(n => n.id === this.selectedSkillId)) {
        this.selectedSkillId = 'dash_reflex';
      }
      const selectedNode = SKILL_NODES.find(n => n.id === this.selectedSkillId) || SKILL_NODES[0];

      // Layout split: Left Overview Grid 62% + Right Inspector Panel 35%
      const isWideLayout = this.cw >= 720;
      const gridW = isWideLayout ? Math.min(570, Math.floor((this.cw - 48) * 0.63)) : (this.cw - 40);
      const gridStartX = 20;
      const branchColW = Math.floor((gridW - 16) / 3);
      const branchGap = 8;
      const branchKeys: Array<'agility' | 'control' | 'carnage'> = ['agility', 'control', 'carnage'];

      for (let bi = 0; bi < branchKeys.length; bi++) {
        const bKey = branchKeys[bi];
        const bInfo = SKILL_TREE_BRANCHES[bKey];
        const bx = gridStartX + bi * (branchColW + branchGap);
        const by = 118;

        // Branch Header Card
        c.fillStyle = 'rgba(18, 22, 36, 0.9)';
        c.strokeStyle = bInfo.color;
        c.lineWidth = 1.4;
        c.shadowColor = bInfo.color;
        c.shadowBlur = 6;
        c.beginPath(); c.roundRect(bx, by, branchColW, 22, 4); c.fill(); c.stroke();
        c.shadowBlur = 0;

        c.font = 'bold 9px monospace';
        c.fillStyle = bInfo.color;
        c.textAlign = 'center';
        c.fillText(bInfo.name, bx + branchColW / 2, by + 15);

        // Render Nodes in this branch
        const branchNodes = SKILL_NODES.filter(n => n.branch === bKey);
        const nodeStartY = by + 28;
        const nodeH = 46;
        const nodeGap = 6;

        for (let ni = 0; ni < branchNodes.length; ni++) {
          const node = branchNodes[ni];
          const ny = nodeStartY + ni * (nodeH + nodeGap);
          this.drawSkillTreeNode(c, node, bx, ny, branchColW, nodeH, time);
          this.skillNodeBounds.set(node.id, { x: bx, y: ny, w: branchColW, h: nodeH });
        }
      }

      // Draw Persistent Right Inspector Panel
      if (isWideLayout) {
        const inspectorX = gridStartX + gridW + 16;
        const inspectorW = this.cw - 20 - inspectorX;
        const inspectorY = 118;
        const inspectorH = CH - 24 - inspectorY - 14;
        this.drawSkillTreeInspectorPanel(c, selectedNode, inspectorX, inspectorY, inspectorW, inspectorH, time);
      } else {
        const inspectorX = gridStartX;
        const inspectorW = gridW;
        const inspectorY = 118 + 28 + 6 * (46 + 6) + 4;
        const inspectorH = CH - 24 - inspectorY - 14;
        if (inspectorH >= 110) {
          this.drawSkillTreeInspectorPanel(c, selectedNode, inspectorX, inspectorY, inspectorW, inspectorH, time);
        }
      }

      // Footer
      c.font = 'bold 10px monospace';
      c.fillStyle = isArcade ? '#ff66bb' : '#00ffaa';
      c.textAlign = 'center';
      if (isArcade) {
        c.fillText('[CLICK NODE TO PREVIEW / SWITCH]  •  [1] ARSENAL  •  [2] BADGES  •  [ESC] BACK', this.cw / 2, CH - 14);
      } else {
        c.fillText('[CLICK A NODE TO UPGRADE]  •  [R] RESPEC  •  [1] ARSENAL  •  [2] BADGES  •  [ESC] BACK', this.cw / 2, CH - 14);
      }
    } else if (isSkills) {
      this.skillCardBounds.clear();

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

      // [T] TRY IN LAB Button
      const tryBtnW = 106, tryBtnH = 20;
      const tryBtnX = Math.round(barX + barW - tryBtnW);
      const tryBtnY = 54;
      this.codexLabBtnBounds = { x: tryBtnX, y: tryBtnY, w: tryBtnW, h: tryBtnH };

      c.save();
      c.fillStyle = 'rgba(0, 240, 255, 0.16)';
      c.strokeStyle = '#00ffff';
      c.lineWidth = 1.2;
      c.shadowColor = '#00ffff';
      c.shadowBlur = 6;
      c.beginPath();
      c.roundRect(tryBtnX, tryBtnY, tryBtnW, tryBtnH, 4);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;

      c.font = 'bold 9px monospace';
      c.fillStyle = '#00ffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('🧪 [T] TRY LAB', tryBtnX + tryBtnW / 2, tryBtnY + tryBtnH / 2);
      c.restore();

      c.font = 'bold 9.5px monospace';
      c.fillStyle = '#ffffff';
      c.textAlign = 'left';
      if (nxt.skill) {
        c.fillText(`CAREER: ${progression.totalGhosts.toLocaleString()} KILLS >> NEXT: ${nxt.skill.name} (${nxt.remaining.toLocaleString()} LEFT)`, barX, 68);
      } else {
        c.fillText(`CAREER: ${progression.totalGhosts.toLocaleString()} KILLS (ARSENAL MASTERED!)`, barX, 68);
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
        this.skillCardBounds.set(s.id, { x: col1X, y, w: colW, h: cardH });
        this.drawSkillCard(c, s, col1X, y, colW, cardH);
      }
      for (let i = 0; i < rightSkills.length; i++) {
        const s = rightSkills[i];
        const y = startY + i * gapY;
        this.skillCardBounds.set(s.id, { x: col2X, y, w: colW, h: cardH });
        this.drawSkillCard(c, s, col2X, y, colW, cardH);
      }

      // Footer
      c.font = 'bold 10.5px monospace';
      c.fillStyle = this.getChromaAccent('#00ffff', '#777777');
      c.textAlign = 'center';
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : '#00ffff';
      c.shadowBlur = this.getChromaBlur(6);
      c.fillText('[1] ARSENAL  •  [2] BADGES  •  [3] SKILL TREE  •  [T] TRY IN LAB  •  [ESC / C] BACK', this.cw / 2, CH - 14);
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
      c.fillText(`ACHIEVEMENTS UNLOCKED: ${unlockedBadges} / ${allBadges.length} (${Math.round(ratio * 100)}%)`, this.cw / 2, 70);

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
      c.fillText(`[1] ARSENAL  •  [2] BADGES  •  [3] SKILL TREE  •  [PAGE ${curPage + 1}/${maxPages} • ARROWS ← / →]  •  [ESC] BACK`, this.cw / 2, CH - 14);
      c.shadowBlur = 0;
    }
  }

  public getSkillEffectDetails(node: import('../config/skillTree').SkillNode, rank: number): { current: string; next: string } {
    const isMax = rank >= node.maxRank;
    switch (node.id) {
      case 'dash_reflex':
        return {
          current: rank > 0 ? `-${rank * 12}% Dash Cooldown` : 'Standard Dash Cooldown (1.0x)',
          next: isMax ? 'Maximized (-60% CD)' : `-${(rank + 1) * 12}% Dash Cooldown (Gain: -12%)`
        };
      case 'multi_dash':
        return {
          current: `${1 + rank} Dash charge(s) available`,
          next: isMax ? 'Maximized (4 charges)' : `+1 Consecutive Dash charge (${1 + rank + 1} charges)`
        };
      case 'vector_surge':
        return {
          current: rank > 0 ? `+${rank * 5}% Speed surge on double-tap (2.5s duration)` : 'Double-tap surge inactive',
          next: isMax ? 'Maximized (+20% surge)' : `+${(rank + 1) * 5}% Speed surge (Gain: +5%)`
        };
      case 'hyper_nitro':
        return {
          current: rank > 0 ? `+${rank * 10}% Nitro speed, +${(rank * 0.5).toFixed(1)}s plasma trail` : 'Standard Nitro boost',
          next: isMax ? 'Maximized (+40% speed)' : `+${(rank + 1) * 10}% Nitro speed, +${((rank + 1) * 0.5).toFixed(1)}s trail`
        };
      case 'phase_shift':
        return {
          current: rank > 0 ? `${(0.35 + (rank - 1) * 0.18).toFixed(2)}s Dash intangibility` : 'Normal Dash vulnerability',
          next: isMax ? 'Maximized (0.71s i-frames + ghost phasing)' : `${(0.35 + rank * 0.18).toFixed(2)}s Dash intangibility`
        };
      case 'quantum_laser':
        return {
          current: rank > 0 ? `${rank >= 2 ? '18s' : '24s'} Cooldown, 4-Way Cardinal Lasers` : 'Locked (Requires Phase Shift)',
          next: isMax ? 'Maximized (18s Cooldown)' : 'Cooldown reduced to 18s & pierces portals'
        };
      case 'chrono_tank':
        return {
          current: rank > 0 ? `+${rank * 20}% Chrono pool capacity${rank >= 4 ? ' (12% Bullet-Time slowdown)' : ''}` : 'Standard Chrono pool (100 units)',
          next: isMax ? 'Maximized (+100% pool)' : `+${(rank + 1) * 20}% Chrono capacity${rank + 1 >= 4 ? ' (Dilation to 12%)' : ''}`
        };
      case 'emp_overcharge':
        return {
          current: rank > 0 ? `+${rank * 25}% Wiggle EMP blast radius` : 'Standard EMP blast',
          next: isMax ? 'Maximized (+100% radius)' : `+${(rank + 1) * 25}% Blast radius (Gain: +25%)`
        };
      case 'deep_freeze':
        return {
          current: rank > 0 ? `+${(rank * 1.2).toFixed(1)}s Freeze stun${rank >= 2 ? ' & Frost Shards on devour' : ''}` : 'Base freeze duration',
          next: isMax ? 'Maximized (+3.6s stun)' : `+${((rank + 1) * 1.2).toFixed(1)}s Stun${rank + 1 >= 2 ? ' + Frost Shards on devour' : ''}`
        };
      case 'magnetic_core':
        return {
          current: rank > 0 ? `${(1.8 + (rank - 1) * 1.2).toFixed(1)} tiles pellet attraction` : 'No magnetic pull',
          next: isMax ? 'Maximized (4.2 tiles)' : `${(1.8 + rank * 1.2).toFixed(1)} tiles pellet attraction`
        };
      case 'aegis_shield':
        return {
          current: rank > 0 ? `Active: Recharges after ${rank === 3 ? 60 : (rank === 2 ? 80 : 100)} pellets` : 'No emergency barrier',
          next: isMax ? 'Maximized (60 pellets)' : `Recharge threshold reduced to ${rank + 1 === 3 ? 60 : 80} pellets`
        };
      case 'kinetic_bastion':
        return {
          current: rank > 0 ? `${rank >= 2 ? '8s' : '6s'} Kinetic dome, ${rank >= 2 ? '5.0' : '3.5'} tiles counterwave` : 'Locked (Requires Aegis Barrier)',
          next: isMax ? 'Maximized (8s dome, 5.0 tiles counterwave)' : 'Duration to 8s, Counterwave expanded to 5.0 tiles'
        };
      case 'pellet_resonance':
        return {
          current: rank > 0 ? `+${(rank * 1.4).toFixed(1)}s Ghost vulnerability${rank >= 4 ? ' & +25% XP/Score' : ''}` : 'Standard Power Pellet duration',
          next: isMax ? 'Maximized (+7.0s duration)' : `+${((rank + 1) * 1.4).toFixed(1)}s Vulnerability${rank + 1 >= 4 ? ' + 25% XP/Score' : ''}`
        };
      case 'titan_breaker':
        return {
          current: rank >= 3 ? 'Direct Dash execution (+2,500 pts)' : (rank === 2 ? 'Dash heavy stun (4.5s) & 35% Titan slow' : (rank === 1 ? 'Dash stun (3.0s) & armor break' : 'Titans immune to Dash')),
          next: isMax ? 'Maximized (Instant execution)' : (rank === 2 ? 'Direct Dash execution (+2,500 pts)' : (rank === 1 ? '35% Titan movement slow & heavy stun' : 'Stun Titans on Dash impact'))
        };
      case 'super_frequency':
        return {
          current: rank > 0 ? `+${rank * 15}% Pellet XP & Score, -${rank * 8}% Spell Cooldowns` : 'Standard XP & cooldowns',
          next: isMax ? 'Maximized (+60% XP, -32% CDs)' : `+${(rank + 1) * 15}% XP/Score, -${(rank + 1) * 8}% Spell CDs`
        };
      case 'singularity_mastery':
        return {
          current: rank > 0 ? `+${(rank * 0.4).toFixed(1)}s Combo & kill streak hold${rank >= 3 ? ', 35s Singularity' : ''}` : 'Standard combo decay window',
          next: isMax ? 'Maximized (35s Singularity)' : `+${((rank + 1) * 0.4).toFixed(1)}s Combo hold${rank + 1 >= 3 ? ', 35s Singularity duration' : ''}`
        };
      case 'singularity_nova':
        return {
          current: rank > 0 ? `${rank >= 2 ? '32s' : '40s'} Cooldown, Void Nova Transcendence` : 'Locked (Requires Void Transcendence)',
          next: isMax ? 'Maximized (32s Cooldown)' : 'Cooldown reduced from 40s to 32s'
        };
      default:
        return { current: `Rank ${rank}`, next: isMax ? 'Max rank' : `Rank ${rank + 1}` };
    }
  }

  private drawSkillTreeNode(
    c: CanvasRenderingContext2D,
    node: import('../config/skillTree').SkillNode,
    x: number,
    y: number,
    w: number,
    h: number,
    _time: number
  ) {
    const isUlt = !!node.isUltimate;
    const isRevealed = experienceSystem.isUltimateRevealed(node.id);
    const rank = experienceSystem.getSkillRank(node.id);
    const check = experienceSystem.canUpgradeSkill(node.id);
    const isMax = rank >= node.maxRank;
    const canBuy = check.can;
    const isSelected = this.selectedSkillId === node.id;

    c.save();

    if (isUlt && !isRevealed) {
      c.fillStyle = isSelected ? 'rgba(40, 15, 30, 0.95)' : 'rgba(20, 12, 22, 0.85)';
      c.strokeStyle = isSelected ? '#ff007f' : '#552238';
      c.lineWidth = isSelected ? 2 : 1;
      c.beginPath();
      c.roundRect(x, y, w, h, 6);
      c.fill();
      c.stroke();

      spriteAtlas.drawIcon(c, 'lock', x + 16, y + h / 2, 14);
      c.textAlign = 'left';
      c.font = 'bold 8.5px monospace';
      c.fillStyle = isSelected ? '#ff66aa' : '#885566';
      c.fillText('??? [SEALED]', x + 30, y + 26);

      c.textAlign = 'right';
      c.font = 'bold 8px monospace';
      c.fillStyle = '#664455';
      c.fillText(`${node.costPerRank} SP`, x + w - 8, y + 26);
      c.restore();
      return;
    }

    const bInfo = SKILL_TREE_BRANCHES[node.branch];
    const borderColor = isSelected
      ? '#00ffff'
      : (isUlt
        ? (isMax ? '#ffd700' : (canBuy ? '#ff00aa' : '#552238'))
        : (isMax ? '#00ffaa' : (canBuy ? bInfo.color : '#253045')));

    c.fillStyle = isSelected
      ? (isUlt ? 'rgba(255, 0, 170, 0.22)' : 'rgba(0, 240, 255, 0.16)')
      : (isMax
        ? 'rgba(0, 255, 170, 0.08)'
        : (canBuy ? 'rgba(0, 240, 255, 0.06)' : 'rgba(12, 16, 28, 0.75)'));

    c.strokeStyle = borderColor;
    c.lineWidth = isSelected ? 2.2 : (canBuy || isMax ? 1.4 : 1.0);

    if (isSelected) {
      c.shadowColor = '#00ffff';
      c.shadowBlur = 8;
    }
    c.beginPath();
    c.roundRect(x, y, w, h, 6);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // Selection indicator accent on left
    if (isSelected) {
      c.fillStyle = '#00ffff';
      c.beginPath();
      c.roundRect(x + 2, y + 4, 3, h - 8, 1.5);
      c.fill();
    }

    // Left Icon Container
    const iconX = x + 18;
    const iconY = y + h / 2;
    spriteAtlas.drawIcon(c, node.icon, iconX, iconY, 15);

    // Node Title (clean & legible)
    c.textAlign = 'left';
    c.font = 'bold 9px monospace';
    c.fillStyle = isUlt ? '#ffd700' : (isMax ? '#00ffaa' : (canBuy ? '#ffffff' : '#8899aa'));
    c.fillText(node.name, x + 34, y + 18);

    // Rank Pips (circles)
    const pipStartY = y + 31;
    const pipStartX = x + 34;
    const pipRadius = 2.5;
    const pipGap = 7;
    for (let r = 0; r < node.maxRank; r++) {
      const px = pipStartX + r * pipGap;
      c.fillStyle = r < rank
        ? (isUlt ? '#ffd700' : '#00ffaa')
        : 'rgba(255, 255, 255, 0.15)';
      c.beginPath();
      c.arc(px, pipStartY, pipRadius, 0, PI2);
      c.fill();
    }

    // Right Cost / Max Badge
    c.textAlign = 'right';
    c.font = 'bold 8.5px monospace';
    c.fillStyle = isMax ? '#00ffaa' : (canBuy ? '#ffd700' : '#64748b');
    const costText = isMax ? 'MAX' : `${node.costPerRank} SP`;
    c.fillText(costText, x + w - 8, y + 25);

    c.restore();
  }

  private drawSkillTreeInspectorPanel(
    c: CanvasRenderingContext2D,
    node: import('../config/skillTree').SkillNode,
    x: number,
    y: number,
    w: number,
    h: number,
    time: number
  ) {
    const bInfo = SKILL_TREE_BRANCHES[node.branch];
    const isUlt = !!node.isUltimate;
    const isRevealed = experienceSystem.isUltimateRevealed(node.id);
    const rank = experienceSystem.getSkillRank(node.id);
    const check = experienceSystem.canUpgradeSkill(node.id);
    const isMax = rank >= node.maxRank;
    const canBuy = check.can;
    const isArcade = profileManager.gameMode !== 'custom';
    const costStr = isMax ? 'MAX' : `${node.costPerRank} SP`;

    c.save();

    // 1. Panel Container Glassmorphism
    c.fillStyle = 'rgba(10, 14, 26, 0.94)';
    c.strokeStyle = isUlt ? '#ffd700' : bInfo.color;
    c.lineWidth = 1.6;
    c.shadowColor = isUlt ? '#ffd700' : bInfo.color;
    c.shadowBlur = 8;
    c.beginPath();
    c.roundRect(x, y, w, h, 8);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    const pad = 16;
    let curY = y + 16;

    // 2. Branch Tag & Ultimate Tag
    c.font = 'bold 8.5px monospace';
    c.textAlign = 'left';
    c.fillStyle = bInfo.color;
    const tagText = isUlt ? `[${bInfo.name} • ULTIMATE SPEC]` : `[${bInfo.name}]`;
    c.fillText(tagText, x + pad, curY);
    curY += 16;

    // 3. Header: Large Icon + Skill Name
    const iconBoxSize = 36;
    c.fillStyle = 'rgba(255, 255, 255, 0.05)';
    c.strokeStyle = isUlt ? '#ffd700' : (isMax ? '#00ffaa' : bInfo.color);
    c.lineWidth = 1.2;
    c.beginPath();
    c.roundRect(x + pad, curY, iconBoxSize, iconBoxSize, 6);
    c.fill();
    c.stroke();
    spriteAtlas.drawIcon(c, node.icon, x + pad + iconBoxSize / 2, curY + iconBoxSize / 2, 20);

    c.textAlign = 'left';
    c.font = 'bold 12.5px monospace';
    c.fillStyle = isUlt ? '#ffd700' : '#ffffff';
    c.fillText(node.name, x + pad + iconBoxSize + 10, curY + 16);

    c.font = 'bold 9px monospace';
    c.fillStyle = isMax ? '#00ffaa' : (canBuy ? '#00ffff' : '#94a3b8');
    c.fillText(`RANK ${rank}/${node.maxRank}   •   COST: ${costStr}`, x + pad + iconBoxSize + 10, curY + 31);
    curY += iconBoxSize + 16;

    // 4. Subtle Divider
    c.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x + pad, curY);
    c.lineTo(x + w - pad, curY);
    c.stroke();
    curY += 14;

    // 5. Core Role & Description
    c.font = 'bold 8.5px monospace';
    c.fillStyle = '#64748b';
    c.fillText('TACTICAL ROLE & PURPOSE', x + pad, curY);
    curY += 13;

    c.font = '10px monospace';
    c.fillStyle = '#e2e8f0';
    const descLines = this.wrapText(c, isUlt && !isRevealed ? 'Secret branch specialization. Master predecessor in this tree to reveal.' : node.desc, w - pad * 2);
    for (const line of descLines) {
      c.fillText(line, x + pad, curY);
      curY += 13;
    }
    curY += 6;

    // 6. Effect Breakdown (Current vs Next)
    if (isRevealed) {
      const details = this.getSkillEffectDetails(node, rank);
      
      // Current Effect Box
      c.fillStyle = 'rgba(0, 255, 170, 0.05)';
      c.strokeStyle = 'rgba(0, 255, 170, 0.2)';
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(x + pad, curY, w - pad * 2, 42, 4);
      c.fill();
      c.stroke();

      c.font = 'bold 8px monospace';
      c.fillStyle = '#00ffaa';
      c.fillText(`CURRENT EFFECT (RANK ${rank}):`, x + pad + 8, curY + 14);
      c.font = '9.5px monospace';
      c.fillStyle = '#f8fafc';
      c.fillText(details.current, x + pad + 8, curY + 29);
      curY += 48;

      // Next Rank Gain Box
      if (!isMax) {
        c.fillStyle = 'rgba(255, 215, 0, 0.05)';
        c.strokeStyle = 'rgba(255, 215, 0, 0.2)';
        c.lineWidth = 1;
        c.beginPath();
        c.roundRect(x + pad, curY, w - pad * 2, 42, 4);
        c.fill();
        c.stroke();

        c.font = 'bold 8px monospace';
        c.fillStyle = '#ffd700';
        c.fillText(`NEXT RANK GAIN (RANK ${rank + 1}):`, x + pad + 8, curY + 14);
        c.font = '9.5px monospace';
        c.fillStyle = '#fef08a';
        c.fillText(details.next, x + pad + 8, curY + 29);
        curY += 48;
      }
    }

    // 7. Active Spell Sequence (if sequence skill)
    if (node.comboHint && isRevealed) {
      c.fillStyle = 'rgba(0, 240, 255, 0.08)';
      c.strokeStyle = '#00f0ff';
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(x + pad, curY, w - pad * 2, 34, 4);
      c.fill();
      c.stroke();

      c.font = 'bold 8px monospace';
      c.fillStyle = '#00f0ff';
      c.fillText('INVOCATION SEQUENCE:', x + pad + 8, curY + 13);
      c.font = 'bold 10px monospace';
      c.fillStyle = '#ffffff';
      c.fillText(node.comboHint, x + pad + 8, curY + 26);
      curY += 40;
    }

    // 8. Tradeoff & Notes
    if (node.tradeoffDesc && isRevealed) {
      c.font = 'bold 8px monospace';
      c.fillStyle = '#f59e0b';
      c.fillText('BALANCE TRADEOFF & SYNERGY:', x + pad, curY);
      curY += 12;

      c.font = '9px monospace';
      c.fillStyle = '#fed7aa';
      const tradeLines = this.wrapText(c, node.tradeoffDesc, w - pad * 2);
      for (const line of tradeLines) {
        c.fillText(line, x + pad, curY);
        curY += 12;
      }
    }

    // 9. Tactile Upgrade Button at bottom
    const btnH = 38;
    const btnY = y + h - btnH - 14;
    const btnW = w - pad * 2;
    const btnX = x + pad;
    this.inspectorUpgradeBtnBounds = { x: btnX, y: btnY, w: btnW, h: btnH };

    if (isArcade) {
      const isWideUnlocked = profileManager.isChromamancerUnlocked();
      c.fillStyle = isWideUnlocked ? 'rgba(255, 0, 127, 0.25)' : 'rgba(50, 20, 40, 0.4)';
      c.strokeStyle = isWideUnlocked ? '#ff007f' : '#663344';
      c.lineWidth = 1.4;
      c.beginPath();
      c.roundRect(btnX, btnY, btnW, btnH, 6);
      c.fill();
      c.stroke();

      c.textAlign = 'center';
      c.font = 'bold 10px monospace';
      c.fillStyle = isWideUnlocked ? '#ff66bb' : '#885566';
      c.fillText(isWideUnlocked ? '[⚡ SWITCH TO CHROMAMANCER]' : '[🔒 REQUIRES 16:9 ARENA]', btnX + btnW / 2, btnY + 23);
    } else if (isMax) {
      c.fillStyle = 'rgba(255, 215, 0, 0.12)';
      c.strokeStyle = '#ffd700';
      c.lineWidth = 1.5;
      c.beginPath();
      c.roundRect(btnX, btnY, btnW, btnH, 6);
      c.fill();
      c.stroke();

      c.textAlign = 'center';
      c.font = 'bold 10.5px monospace';
      c.fillStyle = '#ffd700';
      c.fillText('★ FULLY MASTERED ★', btnX + btnW / 2, btnY + 23);
    } else if (canBuy) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 6);
      c.fillStyle = `rgba(0, 255, 170, ${0.18 + pulse * 0.1})`;
      c.strokeStyle = '#00ffaa';
      c.lineWidth = 1.8;
      c.shadowColor = '#00ffaa';
      c.shadowBlur = 8;
      c.beginPath();
      c.roundRect(btnX, btnY, btnW, btnH, 6);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;

      c.textAlign = 'center';
      c.font = 'bold 10.5px monospace';
      c.fillStyle = '#ffffff';
      c.fillText(`[ENTER / CLICK] UPGRADE (-${node.costPerRank} SP)`, btnX + btnW / 2, btnY + 23);
    } else {
      c.fillStyle = 'rgba(30, 41, 59, 0.4)';
      c.strokeStyle = '#475569';
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(btnX, btnY, btnW, btnH, 6);
      c.fill();
      c.stroke();

      c.textAlign = 'center';
      c.font = 'bold 9.5px monospace';
      c.fillStyle = '#94a3b8';
      let lockMsg = check.reason ? check.reason.toUpperCase() : 'LOCKED';
      if (lockMsg.length > 34) lockMsg = lockMsg.slice(0, 33) + '…';
      c.fillText(`🔒 ${lockMsg}`, btnX + btnW / 2, btnY + 23);
    }

    c.restore();
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
      const statusText = 'UNLOCKED';
      const tw = c.measureText(statusText).width;
      spriteAtlas.drawIcon(c, 'check', x + w - 8 - tw - 8, y + 17, 10);
      c.fillText(statusText, x + w - 8, y + 17);
    } else {
      c.fillStyle = this.chromaTier === 0 ? '#555555' : '#667788';
      const reqText = b.killsRequired ? `${b.killsRequired.toLocaleString()} KILLS` : 'FEAT';
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
      c.fillText(`${progression.totalGhosts.toLocaleString()} / ${b.killsRequired.toLocaleString()} KILLS`, pbX + pbW, pbY + 11);
    } else if (unlocked) {
      c.font = '7.5px monospace';
      c.fillStyle = this.getChromaAccent('#ffaa00', '#aaaaaa');
      spriteAtlas.drawIcon(c, 'trophy', x + 14, y + 54, 10);
      c.fillText('Trophy saved to cloud profile', x + 24, y + 54);
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
      c.fillText(`[V${s.version}] ??? [CLASSIFIED]`, x + 28, y + 14);
    }

    // Status pill
    c.textAlign = 'right';
    c.font = 'bold 10px monospace';
    if (unlocked) {
      c.fillStyle = this.getChromaAccent('#00ffaa', '#cccccc');
      const statusText = 'ACTIVE • [TRY]';
      const tw = c.measureText(statusText).width;
      spriteAtlas.drawIcon(c, 'check', x + w - 8 - tw - 8, y + 14, 10);
      c.fillText(statusText, x + w - 8, y + 14);
    } else if (isNext) {
      c.fillStyle = this.getChromaAccent('#ffd700', '#aaaaaa');
      c.fillText(`GOAL: ${s.threshold.toLocaleString()} KILLS`, x + w - 8, y + 14);
    } else {
      c.fillStyle = this.chromaTier === 0 ? '#444444' : '#6a7888';
      const reqText = `${s.threshold.toLocaleString()} KILLS`;
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
      c.fillText('ENCRYPTED COMMAND', x + 8, y + 26);
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
      c.fillText('Reach previous tier to decode.', x + 8, y + 37);
    }
  }

  public drawPause(
    isMadness: boolean,
    kills: number,
    streak: number,
    time: number = 0,
    isFromMenu: boolean = false,
    focusIndex: number = -1
  ) {
    updatePauseButtonPositions(this.cw, isFromMenu);
    const c = this.ctx;
    // Dark blur backdrop
    c.fillStyle = this.chromaTier === 0 ? 'rgba(0, 0, 0, 0.92)' : 'rgba(5, 7, 14, 0.90)';
    c.fillRect(0, 0, this.cw, CH);

    // Modal Card (dynamically centered horizontally for every arena width)
    const cardW = Math.min(500, this.cw - 20), cardH = 505;
    const cardX = Math.floor((this.cw - cardW) / 2), cardY = 55;
    c.save();
    c.fillStyle = this.chromaTier === 0 ? '#0e0e0e' : 'rgba(10, 15, 28, 0.97)';
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
    c.font = 'bold 20px monospace';
    c.fillStyle = this.getChromaAccent('#00ffff', '#ffffff');
    c.textAlign = 'center';
    if (isFromMenu) {
      c.fillText('SETTINGS & ACCESSIBILITY', this.cw / 2, cardY + 34);
      c.font = '9.5px monospace';
      c.fillStyle = this.chromaTier === 0 ? '#666666' : '#667799';
      c.fillText('VISUAL OPTIONS • AUDIO ENGINE • PROFILES • GAMEPAD', this.cw / 2, cardY + 52);
    } else {
      c.fillText('PAUSE — DISPLAY & AUDIO SETTINGS', this.cw / 2, cardY + 34);
      c.font = '9.5px monospace';
      c.fillStyle = this.chromaTier === 0 ? '#666666' : '#667799';
      c.fillText('ARROWS / D-PAD TO NAVIGATE • ENTER / A TO TOGGLE', this.cw / 2, cardY + 52);
    }

    const s = settingsManager.settings;

    // 1. Video & Visual Toggles (0 to 4)
    const visualItems = [
      {
        btn: PAUSE_BUTTONS[0],
        key: '[1]',
        label: 'FREEZE FRAME (HIT-STOP IMPACT)',
        state: s.freezeFrame ? 'ON' : 'OFF',
        active: s.freezeFrame
      },
      {
        btn: PAUSE_BUTTONS[1],
        key: '[2]',
        label: 'SCREEN SHAKE',
        state: s.screenShake ? 'ON' : 'OFF',
        active: s.screenShake
      },
      {
        btn: PAUSE_BUTTONS[2],
        key: '[3]',
        label: 'FULLSCREEN FLASHES',
        state: s.screenFlash ? 'ON' : 'OFF',
        active: s.screenFlash
      },
      {
        btn: PAUSE_BUTTONS[3],
        key: '[4]',
        label: 'CRT SCANLINES (80s TV)',
        state: s.crtScanlines ? 'ON' : 'OFF',
        active: s.crtScanlines
      },
      {
        btn: PAUSE_BUTTONS[4],
        key: '[5]',
        label: 'PARTICLE DENSITY',
        state: s.particleDensity === 'max' ? 'MAX (1000)' : 'ECO (350)',
        active: s.particleDensity === 'max'
      }
    ];

    for (let i = 0; i < visualItems.length; i++) {
      const it = visualItems[i];
      const b = it.btn;
      const isFocused = focusIndex === i;

      c.fillStyle = isFocused
        ? 'rgba(0, 240, 255, 0.22)'
        : (it.active
          ? (this.chromaTier === 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 212, 255, 0.12)')
          : (this.chromaTier === 0 ? 'rgba(20, 20, 20, 0.6)' : 'rgba(20, 26, 40, 0.6)'));
      c.strokeStyle = isFocused
        ? '#00ffff'
        : (it.active
          ? this.getChromaAccent('#00d4ff', '#777777')
          : (this.chromaTier === 0 ? '#333333' : '#334460'));
      c.lineWidth = isFocused ? 2 : (it.active ? 1.5 : 1);
      c.beginPath();
      c.roundRect(b.x, b.y, b.w, b.h, 6);
      c.fill();
      c.stroke();

      // Key & Label
      c.textAlign = 'left';
      c.font = 'bold 10.5px monospace';
      c.fillStyle = isFocused ? '#ffffff' : (it.active ? '#ffffff' : (this.chromaTier === 0 ? '#777777' : '#8899aa'));
      c.fillText(`${isFocused ? '▶ ' : ''}${it.key} ${it.label}`, b.x + 12, b.y + 20);

      // State pill
      c.textAlign = 'right';
      c.font = 'bold 10.5px monospace';
      c.fillStyle = it.active
        ? this.getChromaAccent('#00ffff', '#cccccc')
        : (this.chromaTier === 0 ? '#555555' : '#ff4466');
      c.fillText(it.state, b.x + b.w - 12, b.y + 20);
    }

    // 2. Volume Sliders (5 to 7)
    const volumeItems = [
      { btn: PAUSE_BUTTONS[5], key: '[6]', label: 'MASTER VOLUME', val: s.masterVolume },
      { btn: PAUSE_BUTTONS[6], key: '[7]', label: 'MUSIC BGM',     val: s.musicVolume },
      { btn: PAUSE_BUTTONS[7], key: '[8]', label: 'SFX SOUNDS',    val: s.sfxVolume }
    ];

    for (let i = 0; i < volumeItems.length; i++) {
      const it = volumeItems[i];
      const b = it.btn;
      const itemIdx = 5 + i;
      const isFocused = focusIndex === itemIdx;

      c.fillStyle = isFocused
        ? 'rgba(0, 240, 255, 0.22)'
        : (this.chromaTier === 0 ? 'rgba(255, 255, 255, 0.06)' : 'rgba(20, 26, 42, 0.7)');
      c.strokeStyle = isFocused ? '#00ffff' : (this.chromaTier === 0 ? '#444444' : '#2a3b58');
      c.lineWidth = isFocused ? 2 : 1;
      c.beginPath();
      c.roundRect(b.x, b.y, b.w, b.h, 6);
      c.fill();
      c.stroke();

      // Label
      c.textAlign = 'left';
      c.font = 'bold 10.5px monospace';
      c.fillStyle = isFocused ? '#ffffff' : '#c0d4ee';
      c.fillText(`${isFocused ? '▶ ' : ''}${it.key} ${it.label}`, b.x + 12, b.y + 20);

      // Track & Fill
      const labelW = 155;
      const trackX = b.x + labelW;
      const trackW = b.w - labelW - 60;
      const trackH = 6;
      const trackY = b.y + Math.floor((b.h - trackH) / 2);

      c.fillStyle = 'rgba(255, 255, 255, 0.12)';
      c.beginPath();
      c.roundRect(trackX, trackY, trackW, trackH, 3);
      c.fill();

      // Filled portion
      const fillW = Math.round(trackW * (it.val / 100));
      if (fillW > 0) {
        c.fillStyle = isFocused ? '#00ffff' : '#ff00aa';
        c.beginPath();
        c.roundRect(trackX, trackY, fillW, trackH, 3);
        c.fill();
      }

      // Knob indicator
      const knobX = trackX + fillW;
      c.fillStyle = '#ffffff';
      c.shadowColor = isFocused ? '#00ffff' : '#ff00aa';
      c.shadowBlur = 6;
      c.beginPath();
      c.arc(knobX, trackY + trackH / 2, 5, 0, PI2);
      c.fill();
      c.shadowBlur = 0;

      // Percentage text
      c.textAlign = 'right';
      c.font = 'bold 10.5px monospace';
      c.fillStyle = isFocused ? '#00ffff' : '#88aacc';
      c.fillText(`${it.val}%`, b.x + b.w - 12, b.y + 20);
    }

    // 3. Audio Mute Toggle (8)
    const muteBtn = PAUSE_BUTTONS[8];
    const isMuteFocused = focusIndex === 8;
    const isMuted = sounds.isMuted();
    c.fillStyle = isMuteFocused
      ? 'rgba(0, 240, 255, 0.22)'
      : (isMuted ? 'rgba(255, 0, 85, 0.12)' : 'rgba(0, 212, 255, 0.12)');
    c.strokeStyle = isMuteFocused ? '#00ffff' : (isMuted ? '#ff0055' : '#00d4ff');
    c.lineWidth = isMuteFocused ? 2 : 1.2;
    c.beginPath();
    c.roundRect(muteBtn.x, muteBtn.y, muteBtn.w, muteBtn.h, 6);
    c.fill();
    c.stroke();
    c.textAlign = 'left';
    c.font = 'bold 10.5px monospace';
    c.fillStyle = isMuteFocused ? '#ffffff' : (isMuted ? '#ff88aa' : '#ffffff');
    c.fillText(`${isMuteFocused ? '▶ ' : ''}[M] AUDIO OUTPUT / MUTE`, muteBtn.x + 12, muteBtn.y + 20);
    c.textAlign = 'right';
    c.fillStyle = isMuted ? '#ff0055' : '#00ffff';
    c.fillText(isMuted ? 'MUTED' : 'ENABLED', muteBtn.x + muteBtn.w - 12, muteBtn.y + 20);

    // 4. Wipe Data button (9)
    const wipeBtn = PAUSE_BUTTONS[9];
    const isWipeFocused = focusIndex === 9;
    c.fillStyle = isWipeFocused ? 'rgba(255, 0, 85, 0.3)' : (this.chromaTier === 0 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 0, 85, 0.12)');
    c.strokeStyle = isWipeFocused ? '#ff0055' : this.getChromaAccent('#ff0055', '#555555');
    c.lineWidth = isWipeFocused ? 2 : 1.2;
    c.beginPath();
    c.roundRect(wipeBtn.x, wipeBtn.y, wipeBtn.w, wipeBtn.h, 6);
    c.fill();
    c.stroke();
    c.font = 'bold 10.5px monospace';
    c.fillStyle = isWipeFocused ? '#ffffff' : this.getChromaAccent('#ff0055', '#888888');
    c.textAlign = 'center';
    c.fillText(`${isWipeFocused ? '▶ ' : ''}RESET ALL PROGRESS & PROFILE`, wipeBtn.x + wipeBtn.w / 2, wipeBtn.y + 20);

    if (isFromMenu) {
      // Home / Return button (spans full width)
      const homeBtn = PAUSE_BUTTONS[12];
      const isHomeFocused = focusIndex === 12;
      const hBorder = this.getChromaAccent('#00ffff', '#666666');
      c.fillStyle = isHomeFocused ? '#0c3858' : (this.chromaTier === 0 ? '#181818' : '#0c243a');
      c.strokeStyle = isHomeFocused ? '#ffffff' : hBorder;
      c.lineWidth = isHomeFocused ? 2.5 : 2;
      c.shadowColor = isHomeFocused ? '#00ffff' : (this.chromaTier === 0 ? 'transparent' : hBorder);
      c.shadowBlur = this.getChromaBlur(12);
      c.beginPath();
      c.roundRect(homeBtn.x, homeBtn.y, homeBtn.w, homeBtn.h, 8);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;
      c.font = 'bold 12.5px monospace';
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.fillText('◀ MAIN MENU [ESC / B]', homeBtn.x + homeBtn.w / 2, homeBtn.y + 25);
    } else {
      // Resume button (10)
      const resBtn = PAUSE_BUTTONS[10];
      const isResFocused = focusIndex === 10;
      const pulse = 1 + Math.sin(time * 6) * 0.03;
      const resBorder = this.getChromaAccent('#00ffff', '#666666');
      c.fillStyle = isResFocused ? '#0c3858' : (this.chromaTier === 0 ? '#181818' : '#0c243a');
      c.strokeStyle = isResFocused ? '#ffffff' : resBorder;
      c.lineWidth = isResFocused ? 2.5 : 2;
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : resBorder;
      c.shadowBlur = this.getChromaBlur(12);
      c.beginPath();
      c.roundRect(resBtn.x, resBtn.y, resBtn.w, resBtn.h, 8);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;
      c.font = `bold ${11.5 * pulse}px monospace`;
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.fillText('▶ RESUME [P/A]', resBtn.x + resBtn.w / 2, resBtn.y + 25);

      // Restart button (11)
      const rstBtn = PAUSE_BUTTONS[11];
      const isRstFocused = focusIndex === 11;
      const rstBorder = this.getChromaAccent('#ffaa00', '#555555');
      c.fillStyle = isRstFocused ? '#38280a' : (this.chromaTier === 0 ? '#181818' : '#20180a');
      c.strokeStyle = isRstFocused ? '#ffffff' : rstBorder;
      c.lineWidth = isRstFocused ? 2.5 : 2;
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : rstBorder;
      c.shadowBlur = this.getChromaBlur(10);
      c.beginPath();
      c.roundRect(rstBtn.x, rstBtn.y, rstBtn.w, rstBtn.h, 8);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;
      c.font = 'bold 11.5px monospace';
      c.fillStyle = this.getChromaAccent('#ffaa00', '#aaaaaa');
      c.textAlign = 'center';
      c.fillText('RETRY [R/X]', rstBtn.x + rstBtn.w / 2, rstBtn.y + 25);

      // Home button (12)
      const homeBtn = PAUSE_BUTTONS[12];
      const isHomeFocused = focusIndex === 12;
      const homeBorder = this.getChromaAccent('#ff007f', '#555555');
      c.fillStyle = isHomeFocused ? '#300a28' : (this.chromaTier === 0 ? '#181818' : '#1a0a20');
      c.strokeStyle = isHomeFocused ? '#ffffff' : homeBorder;
      c.lineWidth = isHomeFocused ? 2.5 : 2;
      c.shadowColor = this.chromaTier === 0 ? 'transparent' : homeBorder;
      c.shadowBlur = this.getChromaBlur(10);
      c.beginPath();
      c.roundRect(homeBtn.x, homeBtn.y, homeBtn.w, homeBtn.h, 8);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;
      c.font = 'bold 11.5px monospace';
      c.fillStyle = this.getChromaAccent('#ff007f', '#aaaaaa');
      c.textAlign = 'center';
      c.fillText('MENU [B]', homeBtn.x + homeBtn.w / 2, homeBtn.y + 25);
    }

    // Footer stats if in madness
    if (isMadness) {
      c.font = '10px monospace';
      c.fillStyle = this.getChromaAccent('#ffd700', '#666666');
      c.fillText(`RUN ${kills} KILLS • STREAK x${streak}`, this.cw / 2, cardY + cardH - 12);
    }

    c.font = '8.5px monospace';
    c.fillStyle = 'rgba(255, 255, 255, 0.35)';
    c.textAlign = 'center';
    c.fillText(GAME_VERSION, this.cw / 2, cardY + cardH + 18);

    c.restore();
  }

  public drawEpilogue(
    time: number,
    loopCount: number,
    score: number,
    kills: number,
    maxStreak: number,
    isGamepad: boolean = false
  ) {
    const c = this.ctx;
    c.save();

    // 1. Deep cellular void backdrop with dark arterial pulse
    c.fillStyle = '#06010a';
    c.fillRect(0, 0, this.cw, CH);

    const radPulse = 0.5 + Math.sin(time * 1.5) * 0.15;
    const grad = c.createRadialGradient(this.cw / 2, CH / 2, 40, this.cw / 2, CH / 2, Math.max(this.cw, CH) * 0.7);
    grad.addColorStop(0, `rgba(180, 0, 50, ${0.18 * radPulse})`);
    grad.addColorStop(0.6, 'rgba(40, 0, 20, 0.35)');
    grad.addColorStop(1, 'rgba(4, 1, 10, 0.95)');
    c.fillStyle = grad;
    c.fillRect(0, 0, this.cw, CH);

    // 2. Telemetry Header: Asystole ECG Monitor
    const ecgY = 82;
    c.font = 'bold 11px monospace';
    c.fillStyle = '#ff0055';
    c.textAlign = 'left';
    c.fillText('BIO-TELEMETRY // PATIENT ZERO HOST', 28, ecgY);
    c.textAlign = 'right';
    c.fillStyle = '#ffaa00';
    c.fillText('HEART RATE: 000 BPM • ASYSTOLE CONFIRMED', this.cw - 28, ecgY);

    // Animated ECG Flatline Line
    c.strokeStyle = '#ff0055';
    c.lineWidth = 2;
    c.shadowColor = '#ff0055';
    c.shadowBlur = 12;
    c.beginPath();
    const ecgLineY = ecgY + 16;
    c.moveTo(24, ecgLineY);
    for (let x = 24; x <= this.cw - 24; x += 4) {
      let dy = 0;
      const blipPos = ((time * 70) % (this.cw - 48)) + 24;
      const dist = Math.abs(x - blipPos);
      if (dist < 24) {
        dy = Math.sin((x - blipPos) * 0.25) * 8 * Math.exp(-dist * 0.15);
      }
      c.lineTo(x, ecgLineY + dy);
    }
    c.stroke();
    c.shadowBlur = 0;

    // 3. Central Narrative Card
    const cardW = Math.min(540, this.cw - 32);
    const cardH = 370;
    const cardX = this.cw / 2 - cardW / 2;
    const cardY = ecgLineY + 22;

    c.fillStyle = 'rgba(12, 4, 20, 0.92)';
    c.strokeStyle = 'rgba(255, 0, 85, 0.6)';
    c.lineWidth = 2;
    c.shadowColor = '#ff0055';
    c.shadowBlur = 20;
    c.beginPath();
    c.roundRect(cardX, cardY, cardW, cardH, 12);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // Main Title
    c.textAlign = 'center';
    c.font = 'bold 20px monospace';
    const titleGrad = c.createLinearGradient(this.cw / 2, cardY + 20, this.cw / 2, cardY + 50);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(0.4, '#ff0055');
    titleGrad.addColorStop(1, '#ffaa00');
    c.fillStyle = titleGrad;
    c.shadowColor = '#ff0055';
    c.shadowBlur = 16;
    c.fillText('THE REVELATION OF THE PREDATOR', this.cw / 2, cardY + 40);
    c.shadowBlur = 0;

    c.font = 'bold 9.5px monospace';
    c.fillStyle = '#ff4477';
    c.fillText('HOST SINGULARITY CORE COLLAPSED • ORGANISM SHUTDOWN: 100%', this.cw / 2, cardY + 60);

    // Narrative Revelation Prose
    const lines = [
      '"You were never the patient fighting for survival."',
      '"You are the devouring anomaly. The lethal pathogen."',
      '"The guardians patrolling these neural corridors were not invaders..."',
      '"They were the host organism\'s last leukocyte antibodies, fighting to purge you."',
      '"With the Singularity Core annihilated, cellular necrosis is irreversible."',
      '"The host has succumbed. Cellular life extinguished."'
    ];

    c.font = '11px monospace';
    let lineY = cardY + 95;
    for (let i = 0; i < lines.length; i++) {
      const alpha = Math.min(1, Math.max(0.3, 0.85 + Math.sin(time * 2 + i * 0.5) * 0.15));
      c.fillStyle = i >= 4 ? `rgba(255, 170, 0, ${alpha})` : (i === 1 ? '#00ffff' : `rgba(230, 235, 255, ${alpha})`);
      c.fillText(lines[i], this.cw / 2, lineY);
      lineY += 23;
    }

    // Performance & Stats Grid
    const statBoxY = lineY + 10;
    const statBoxW = cardW - 44;
    const statBoxX = this.cw / 2 - statBoxW / 2;
    const statBoxH = 64;

    c.fillStyle = 'rgba(255, 0, 85, 0.08)';
    c.strokeStyle = 'rgba(255, 0, 85, 0.25)';
    c.lineWidth = 1;
    c.beginPath();
    c.roundRect(statBoxX, statBoxY, statBoxW, statBoxH, 6);
    c.fill();
    c.stroke();

    c.font = 'bold 11px monospace';
    c.fillStyle = '#ffd700';
    c.textAlign = 'left';
    c.fillText(`CYCLE COMPLETED: CYCLE ${loopCount + 1}`, statBoxX + 16, statBoxY + 24);
    c.fillText(`FINAL SCORE: ${formatScoreCompact(score)} PTS`, statBoxX + 16, statBoxY + 46);

    c.textAlign = 'right';
    c.fillStyle = '#00ffff';
    c.fillText(`LEUKOCYTES PURGED: ${kills.toLocaleString()}`, statBoxX + statBoxW - 16, statBoxY + 24);
    c.fillText(`MAX DEVOUR STREAK: x${maxStreak}`, statBoxX + statBoxW - 16, statBoxY + 46);

    // Call to Action Buttons
    const ctaY = cardY + cardH + 24;
    const btnPulse = 1 + Math.sin(time * 6) * 0.03;

    // Loop Next Cycle Button
    c.textAlign = 'center';
    const loopBtnW = Math.min(480, this.cw - 48);
    const loopBtnH = 42;
    const loopBtnX = this.cw / 2 - loopBtnW / 2;

    c.fillStyle = '#180214';
    c.strokeStyle = '#00ffff';
    c.lineWidth = 2;
    c.shadowColor = '#00ffff';
    c.shadowBlur = 14;
    c.beginPath();
    c.roundRect(loopBtnX, ctaY, loopBtnW, loopBtnH, 8);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    c.font = `bold ${12 * btnPulse}px monospace`;
    c.fillStyle = '#ffffff';
    const ctaText = isGamepad
      ? '▶ [A / START] INFILTRATE NEXT HOST // CYCLE +1 (SPEED +10%)'
      : '▶ [SPACE / ENTER] INFILTRATE NEXT HOST // CYCLE +1 (SPEED +10%)';
    c.fillText(ctaText, this.cw / 2, ctaY + 26);

    // Menu Subtext
    c.font = 'bold 10px monospace';
    c.fillStyle = 'rgba(255, 255, 255, 0.65)';
    const menuPrompt = isGamepad
      ? '[B] RETURN TO ARCHIVES (MAIN MENU)'
      : '[ESC] RETURN TO ARCHIVES (MAIN MENU)';
    c.fillText(menuPrompt, this.cw / 2, ctaY + loopBtnH + 20);

    c.restore();
  }

  public drawWaveTrans(currentLevel: number, wave: number, loopCount: number = 0, isMadness: boolean = false) {
    const c = this.ctx;
    const list = isMadness ? MADNESS_LEVELS : LEVELS;
    const lvl = list[currentLevel % list.length];
    const info = this.getInfectionData(currentLevel, loopCount);

    c.save();
    // Glass card
    const cardW = Math.min(460, this.cw - 24);
    const cardH = 204;
    const cardX = this.cw / 2 - cardW / 2;
    const cardY = CH / 2 - cardH / 2;

    c.fillStyle = 'rgba(6, 3, 14, 0.94)';
    c.strokeStyle = lvl.glowColor;
    c.lineWidth = 2;
    c.shadowColor = lvl.glowColor;
    c.shadowBlur = 18;
    c.beginPath();
    c.roundRect(cardX, cardY, cardW, cardH, 10);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // Header badge
    c.textAlign = 'center';
    c.font = 'bold 11px monospace';
    c.fillStyle = '#ffd700';
    c.fillText('★ SECTOR PURIFIED ★', this.cw / 2, cardY + 28);

    // Level Title
    c.font = 'bold 28px monospace';
    c.fillStyle = lvl.glowColor;
    c.shadowColor = lvl.glowColor;
    c.shadowBlur = 14;
    c.fillText('LEVEL ' + (currentLevel + 1), this.cw / 2, cardY + 62);
    c.shadowBlur = 0;

    // Sector Name
    c.font = 'bold 15px monospace';
    c.fillStyle = '#ffffff';
    c.fillText(lvl.name, this.cw / 2, cardY + 86);

    // Biological Host Telemetry Bar inside transition
    const bioBoxW = cardW - 36;
    const bioBoxH = 32;
    const bioX = this.cw / 2 - bioBoxW / 2;
    const bioY = cardY + 102;

    c.fillStyle = 'rgba(15, 20, 32, 0.9)';
    c.strokeStyle = info.ecgColor;
    c.lineWidth = 1;
    c.beginPath();
    c.roundRect(bioX, bioY, bioBoxW, bioBoxH, 5);
    c.fill();
    c.stroke();

    c.font = 'bold 9px monospace';
    c.fillStyle = info.ecgColor;
    c.fillText(`TÉLÉMÉTRIE DU SYSTÈME HÔTE • ${info.stageCode} (${info.bpm} BPM)`, this.cw / 2, bioY + 13);
    c.font = '8px monospace';
    c.fillStyle = '#94a3b8';
    c.fillText(info.stageDetail, this.cw / 2, bioY + 24);

    // Rewards & Wave Bonus
    c.font = 'bold 11px monospace';
    c.fillStyle = '#00ffaa';
    c.fillText(`+${1000 * Math.max(1, wave - 1)} PTS WAVE BONUS  •  +400 EXP`, this.cw / 2, cardY + 156);

    if (loopCount > 0) {
      c.font = 'bold 12px monospace';
      c.fillStyle = '#ffd700';
      c.shadowColor = '#ffd700';
      c.shadowBlur = 8;
      c.fillText(`LOOP ${loopCount + 1}: SPEED +${loopCount * 10}%!`, this.cw / 2, cardY + 180);
      c.shadowBlur = 0;
    } else {
      c.font = 'bold 9.5px monospace';
      c.fillStyle = '#778899';
      c.fillText('INITIALISATION DU PROCHAIN SECTEUR...', this.cw / 2, cardY + 180);
    }

    c.restore();
  }

  public drawMaze32xSupercharge(_mOff: HTMLCanvasElement, time: number, isSingularity: boolean = false) {
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = 'source-atop';
    // Deep vibrant electrified cyan or pure incandescent gold energy in Singularity flowing through maze walls
    const pulse = 0.40 + 0.12 * Math.sin(time * 6);
    c.fillStyle = isSingularity ? `rgba(255, 215, 0, ${pulse + 0.1})` : `rgba(0, 240, 255, ${pulse})`;
    c.fillRect(0, 0, this.cw, ROWS * T);
    c.restore();
  }

  // ═══════════════════════════════════════════════════════════════
  //  BIOLOGICAL INFECTION & HOST IMMUNOLOGICAL VITAL MONITOR
  //  Chromavore est une infection pathogène qui détruit l'organisme hôte
  // ═══════════════════════════════════════════════════════════════
  public getInfectionData(currentLevel: number, loopCount: number = 0) {
    const effectiveLvl = currentLevel + 1;
    let stage: 1 | 2 | 3 | 4 = 1;
    let stageName = 'HOMEOSTASIS';
    let stageCode = 'STAGE 1';
    let stageDetail = 'ACTIVE SENTINELS • CELLULAR INTEGRITY';
    let bpm = 72;
    let ecgColor = '#00ffaa';
    let isFlatline = false;

    if (loopCount > 0 || effectiveLvl >= 10) {
      stage = 4;
      stageName = 'ASYSTOLE';
      stageCode = 'STAGE 4';
      stageDetail = 'ORGANIC COLLAPSE • CARDIAC ARREST';
      bpm = 0;
      ecgColor = '#778899';
      isFlatline = true;
    } else if (effectiveLvl >= 7) {
      stage = 3;
      stageName = 'NECROSIS';
      stageCode = 'STAGE 3';
      stageDetail = 'ARRHYTHMIA • IMMUNE BREAKDOWN';
      bpm = 148;
      ecgColor = '#ff0055';
    } else if (effectiveLvl >= 4) {
      stage = 2;
      stageName = 'INFLAMMATION';
      stageCode = 'STAGE 2';
      stageDetail = 'FEBRILE TACHYCARDIA • HOST MOBILIZATION';
      bpm = 126;
      ecgColor = '#ffaa00';
    } else {
      stage = 1;
      stageName = 'HOMEOSTASIS';
      stageCode = 'STAGE 1';
      stageDetail = 'HEALTHY SINUS RHYTHM • INTEGRITY';
      bpm = 72;
      ecgColor = '#00ffaa';
    }

    return { stage, stageName, stageCode, stageDetail, bpm, ecgColor, isFlatline, effectiveLvl };
  }

  public drawBiologicalHostPulse(time: number, currentLevel: number, loopCount: number = 0) {
    const c = this.ctx;
    const info = this.getInfectionData(currentLevel, loopCount);
    c.save();

    if (info.stage === 1) {
      // Stade 1 : Homéostasie (pulsation douce et régulière ~72 BPM)
      const pulse = 0.03 + 0.025 * Math.sin(time * (72 / 60) * Math.PI * 2);
      c.fillStyle = `rgba(0, 255, 170, ${pulse})`;
      c.fillRect(0, 0, this.cw, ROWS * T);
    } else if (info.stage === 2) {
      // Stade 2 : Réaction inflammatoire / Fièvre (~126 BPM)
      const fever = 0.06 + 0.04 * Math.sin(time * (126 / 60) * Math.PI * 2);
      c.fillStyle = `rgba(255, 90, 10, ${fever})`;
      c.fillRect(0, 0, this.cw, ROWS * T);

      // Micro-tension vasculaire en périphérie
      const capPulse = 0.08 + 0.06 * Math.sin(time * 4);
      c.strokeStyle = `rgba(255, 50, 10, ${capPulse})`;
      c.lineWidth = 1.8;
      c.strokeRect(2, 2, this.cw - 4, ROWS * T - 4);
    } else if (info.stage === 3) {
      // Stade 3 : Arythmie & Nécrose (soubresauts irréguliers et plaques violacées)
      const irregular = Math.sin(time * 7.2) * Math.sin(time * 2.8);
      const spasm = irregular > 0.3;
      const alpha = spasm ? 0.14 : 0.06;
      c.fillStyle = `rgba(140, 0, 190, ${alpha})`;
      c.fillRect(0, 0, this.cw, ROWS * T);

      // Spasme ischémique nécrotique intermittent
      if (Math.sin(time * 11) > 0.6) {
        c.fillStyle = 'rgba(25, 0, 40, 0.22)';
        c.fillRect(0, 0, this.cw, ROWS * T);
      }
    } else {
      // Stade 4 : Asystolie / Arrêt (Level 10)
      // Dévitalisé, terne, froid, aucune pulsation vitale
      c.fillStyle = 'rgba(15, 23, 42, 0.32)';
      c.fillRect(0, 0, this.cw, ROWS * T);

      // Faint mourir tremblotant
      if ((time % 3.8) < 0.15) {
        c.fillStyle = 'rgba(148, 163, 184, 0.08)';
        c.fillRect(0, 0, this.cw, ROWS * T);
      }
    }

    c.restore();
  }

  /**
   * Visualisation chirurgicale & biologique de la corruption tissulaire de l'organisme hôte.
   * L'arène n'est pas un labyrinthe mécanique, mais les cavités d'un être vivant dévoré
   * par le Chromavore (pathogène gangréneux).
   */
  public drawOrganicTissueNecrosis(maze: MazeManager, time: number, currentLevel: number, loopCount: number = 0) {
    if (!maze || !maze.map) return;
    const c = this.ctx;
    const info = this.getInfectionData(currentLevel, loopCount);
    const cols = maze.cols;
    const rows = maze.rows;
    const stage = info.stage;

    c.save();

    // ─────────────────────────────────────────────────────────────
    // 1. Dégénérescence des parois & réseaux vasculaires sur les murs
    // ─────────────────────────────────────────────────────────────
    for (let r = 0; r < rows; r++) {
      const row = maze.map[r];
      if (!row) continue;
      for (let col = 0; col < cols; col++) {
        if (row[col] !== 1) continue; // WALL

        const x = col * T;
        const y = r * T;
        // Hash déterministe par tuile pour une distribution organique stable
        const h = Math.abs(Math.sin(col * 12.9898 + r * 78.233) * 43758.5453) % 1;

        if (stage === 1) {
          // STADE 1 : Homéostasie — Noeuds bioluminescents sains (72 BPM)
          if (h > 0.72) {
            const pulse = (Math.sin(time * 7.54 + h * 6.28) + 1) * 0.5;
            const nodeR = 2.2 + pulse * 1.5;
            c.fillStyle = `rgba(0, 255, 170, ${0.35 + pulse * 0.45})`;
            c.shadowColor = '#00ffaa';
            c.shadowBlur = 6;
            c.beginPath();
            c.arc(x + T / 2, y + T / 2, nodeR, 0, PI2);
            c.fill();
            c.shadowBlur = 0;
          }
        } else if (stage === 2) {
          // STADE 2 : Inflammation / Fièvre — Capillaires gorgés de sang chaud (126 BPM)
          if (h > 0.40) {
            const febPulse = (Math.sin(time * 13.2 + h * 5.0) + 1) * 0.5;
            c.strokeStyle = `rgba(255, 60, 20, ${0.4 + febPulse * 0.45})`;
            c.lineWidth = 1.6;
            c.beginPath();
            c.moveTo(x + 2, y + T * (0.2 + h * 0.6));
            c.quadraticCurveTo(x + T * 0.5, y + T * (0.5 + (h - 0.5) * 0.4), x + T - 2, y + T * (0.3 + (1 - h) * 0.5));
            c.stroke();

            // Bourgeonnement inflammatoire
            if (h > 0.8) {
              c.fillStyle = `rgba(255, 140, 0, ${0.5 + febPulse * 0.4})`;
              c.beginPath();
              c.arc(x + T * 0.5, y + T * 0.5, 2.5, 0, PI2);
              c.fill();
            }
          }
        } else if (stage === 3) {
          // STADE 3 : Gangrène & Nécrose — Lésions noircies, fissures suintantes, arythmie
          if (h > 0.30) {
            // Lésion nécrotique purulente
            const lesionW = T * (0.4 + h * 0.45);
            const lesionH = T * (0.35 + (1 - h) * 0.4);
            const lx = x + (T - lesionW) * 0.5;
            const ly = y + (T - lesionH) * 0.5;

            c.fillStyle = h > 0.65 ? 'rgba(32, 0, 42, 0.78)' : 'rgba(56, 0, 28, 0.72)';
            c.beginPath();
            c.roundRect(lx, ly, lesionW, lesionH, 3);
            c.fill();

            // Veines thrombosées & nécrotiques violet-noir
            const arrhSpasm = Math.sin(time * 19.0 + h * 10) * Math.cos(time * 6.5);
            const veinAlpha = arrhSpasm > 0.2 ? 0.85 : 0.45;
            c.strokeStyle = `rgba(180, 0, 90, ${veinAlpha})`;
            c.lineWidth = 1.8;
            c.beginPath();
            c.moveTo(x + 1, y + 1);
            c.lineTo(x + T * 0.4, y + T * 0.6);
            c.lineTo(x + T - 1, y + T * 0.85);
            c.stroke();

            // Fissure de décomposition
            if (h > 0.75) {
              c.strokeStyle = 'rgba(255, 0, 100, 0.65)';
              c.lineWidth = 1.0;
              c.beginPath();
              c.moveTo(x + T * 0.2, y + T * 0.8);
              c.lineTo(x + T * 0.8, y + T * 0.2);
              c.stroke();
            }
          }
        } else {
          // STADE 4 : Asystolie & Mort (Lvl 10) — Momification gris cendre, fibres dévitalisées
          if (h > 0.25) {
            // Plaque de dévitalisation grisâtre
            c.fillStyle = h > 0.6 ? 'rgba(51, 65, 85, 0.55)' : 'rgba(30, 41, 59, 0.65)';
            c.fillRect(x + 2, y + 2, T - 4, T - 4);

            // Fissures cadavériques calcifiées
            c.strokeStyle = 'rgba(148, 163, 184, 0.45)';
            c.lineWidth = 1.2;
            c.beginPath();
            c.moveTo(x + T * 0.15, y + T * 0.85);
            c.lineTo(x + T * 0.5, y + T * 0.4);
            c.lineTo(x + T * 0.85, y + T * 0.15);
            c.stroke();
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Coeur biologique central (Ghost House Seed)
    // ─────────────────────────────────────────────────────────────
    const centerCol = Math.floor(cols / 2);
    const heartX = centerCol * T + T / 2;
    const heartY = 10 * T + T / 2;

    if (stage === 1) {
      // Coeur sain qui pulse à 72 BPM
      const hp = (Math.sin(time * 7.54) + 1) * 0.5;
      c.fillStyle = `rgba(0, 255, 170, ${0.12 + hp * 0.15})`;
      c.shadowColor = '#00ffaa';
      c.shadowBlur = 12;
      c.beginPath();
      c.arc(heartX, heartY, 20 + hp * 6, 0, PI2);
      c.fill();
      c.shadowBlur = 0;
    } else if (stage === 2) {
      // Coeur en tachycardie fébrile à 126 BPM
      const hp = (Math.sin(time * 13.2) + 1) * 0.5;
      c.fillStyle = `rgba(255, 80, 0, ${0.18 + hp * 0.22})`;
      c.shadowColor = '#ff4400';
      c.shadowBlur = 16;
      c.beginPath();
      c.arc(heartX, heartY, 22 + hp * 8, 0, PI2);
      c.fill();
      c.shadowBlur = 0;
    } else if (stage === 3) {
      // Coeur en arythmie, gangréné et spasmodique
      const irregular = (Math.sin(time * 18.0) * Math.sin(time * 6.0) + 1) * 0.5;
      c.fillStyle = `rgba(140, 0, 70, ${0.22 + irregular * 0.25})`;
      c.shadowColor = '#ff0055';
      c.shadowBlur = 18;
      c.beginPath();
      c.arc(heartX, heartY, 24 + irregular * 10, 0, PI2);
      c.fill();
      c.shadowBlur = 0;

      // Spasme fibrillaire
      c.strokeStyle = 'rgba(255, 0, 100, 0.6)';
      c.lineWidth = 1.5;
      c.strokeRect(heartX - 25, heartY - 18, 50, 36);
    } else {
      // Coeur en asystolie terminale : noyau froid, inerte, gris, fissuré
      c.fillStyle = 'rgba(30, 41, 59, 0.7)';
      c.strokeStyle = 'rgba(100, 116, 139, 0.6)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(heartX, heartY, 22, 0, PI2);
      c.fill();
      c.stroke();

      // Fissure de rupture cardiaque au centre
      c.strokeStyle = '#94a3b8';
      c.beginPath();
      c.moveTo(heartX - 10, heartY - 14);
      c.lineTo(heartX + 2, heartY);
      c.lineTo(heartX - 4, heartY + 12);
      c.stroke();
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Débris apoptotiques / Poussière de décomposition (Stade 4)
    // ─────────────────────────────────────────────────────────────
    if (stage === 4) {
      const flakeCount = 28;
      const arenaH = rows * T;
      c.fillStyle = 'rgba(203, 213, 225, 0.45)';
      for (let i = 0; i < flakeCount; i++) {
        const seedX = ((i * 37) % cols) * T + ((i * 19) % T);
        const speedY = 22 + (i % 5) * 8;
        const driftX = Math.sin(time * 1.5 + i) * 12;
        const flakeY = (time * speedY + i * 43) % arenaH;
        const flakeX = (seedX + driftX + cols * T) % (cols * T);
        c.beginPath();
        c.arc(flakeX, flakeY, 1.2 + (i % 3) * 0.6, 0, PI2);
        c.fill();
      }
    }

    c.restore();
  }

  public drawHostVitalTelemetry(c: CanvasRenderingContext2D, x: number, y: number, currentLevel: number, time: number, loopCount: number = 0, isWide: boolean = true) {
    const info = this.getInfectionData(currentLevel, loopCount);
    const boxW = isWide ? 66 : 52;
    const boxH = 20;
    const bx = Math.round(x - boxW / 2);
    const by = Math.round(y - boxH / 2);

    c.save();
    // Glass card
    c.fillStyle = 'rgba(6, 8, 16, 0.85)';
    c.strokeStyle = info.ecgColor;
    c.lineWidth = 1;
    c.shadowColor = info.ecgColor;
    c.shadowBlur = info.stage === 4 ? 2 : 5;
    c.beginPath();
    c.roundRect(bx, by, boxW, boxH, 4);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // Mini ECG waveform display inside the box
    const traceW = isWide ? 30 : 22;
    const traceH = 10;
    const tx = bx + 4;
    const ty = by + Math.round(boxH / 2);

    c.strokeStyle = info.ecgColor;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(tx, ty);

    if (info.stage === 4) {
      // Flatline (Asystole)
      const artifact = Math.sin(time * 3) > 0.95 ? (Math.random() - 0.5) * 1.5 : 0;
      c.lineTo(tx + traceW, ty + artifact);
    } else {
      // Pulsing sinus wave moving across traceW
      const freq = info.stage === 2 ? 8 : (info.stage === 3 ? 12 : 5);
      const phase = time * freq;
      for (let i = 0; i <= traceW; i += 2) {
        const p = (i / traceW) * Math.PI * 2 + phase;
        let dy = 0;
        const cycle = p % (Math.PI * 2);
        if (cycle > 2.0 && cycle < 2.5) {
          // Sharp QRS complex peak
          dy = -Math.sin((cycle - 2.0) * (Math.PI / 0.5)) * (traceH * 0.45);
        } else if (cycle > 3.2 && cycle < 4.0) {
          // Soft T-wave bump
          dy = -Math.sin((cycle - 3.2) * (Math.PI / 0.8)) * (traceH * 0.2);
        }
        c.lineTo(tx + i, ty + dy);
      }
    }
    c.stroke();

    // Text reading
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.font = 'bold 7px monospace';
    c.fillStyle = info.ecgColor;
    c.fillText(info.isFlatline ? '00' : `${info.bpm}`, tx + traceW + 4, by + 6);
    c.font = '6.5px monospace';
    c.fillStyle = '#8899aa';
    c.fillText('BPM', tx + traceW + 18, by + 6);

    c.font = 'bold 6.5px monospace';
    c.fillStyle = info.ecgColor;
    c.fillText(info.stageCode, tx + traceW + 4, by + 14);

    c.restore();
  }

  public drawDebugMenu(
    debugButtons: { id: string; label: string; key: string; color: string; active?: boolean; x: number; y: number; w: number; h: number }[],
    time: number
  ) {
    const c = this.ctx;
    // Dark cyber backdrop
    c.fillStyle = 'rgba(4, 2, 12, 0.88)';
    c.fillRect(0, 0, this.cw, CH);

    const cardW = Math.min(620, this.cw - 24);
    const cardH = 510;
    const cardX = Math.floor((this.cw - cardW) / 2);
    const cardY = 36;

    c.save();
    // Modal card
    c.fillStyle = 'rgba(10, 14, 26, 0.98)';
    c.strokeStyle = '#ffd700';
    c.shadowColor = '#ffd700';
    c.shadowBlur = 18;
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(cardX, cardY, cardW, cardH, 12);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // Header
    c.font = 'bold 20px monospace';
    c.fillStyle = '#ffd700';
    c.textAlign = 'center';
    c.fillText('🛠️ CHROMAVORE DEBUG SUITE & GOD CONSOLE', this.cw / 2, cardY + 34);

    c.font = '10.5px monospace';
    c.fillStyle = '#aaaaaa';
    c.fillText('PRESS [F2] / [²] TO TOGGLE DEBUG PAUSE • CLICK OR PRESS HOTKEYS', this.cw / 2, cardY + 54);

    // Section separator
    c.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cardX + 20, cardY + 68);
    c.lineTo(cardX + cardW - 20, cardY + 68);
    c.stroke();

    // Render debug buttons
    for (const b of debugButtons) {
      c.save();
      const isActive = b.active;
      c.fillStyle = isActive ? 'rgba(0, 255, 170, 0.22)' : 'rgba(25, 30, 48, 0.75)';
      c.strokeStyle = isActive ? '#00ffaa' : b.color;
      c.lineWidth = isActive ? 2 : 1.2;
      c.shadowColor = isActive ? '#00ffaa' : b.color;
      c.shadowBlur = isActive ? 10 : 4;
      c.beginPath();
      c.roundRect(b.x, b.y, b.w, b.h, 6);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;

      // Hotkey badge
      c.textAlign = 'left';
      c.font = 'bold 10px monospace';
      c.fillStyle = b.color;
      c.fillText(b.key, b.x + 8, b.y + b.h / 2 + 3);

      // Label
      c.font = 'bold 10px monospace';
      c.fillStyle = '#ffffff';
      c.fillText(b.label, b.x + 36, b.y + b.h / 2 + 3);

      if (isActive !== undefined) {
        c.textAlign = 'right';
        c.fillStyle = isActive ? '#00ffaa' : '#667788';
        c.fillText(isActive ? 'ON' : 'OFF', b.x + b.w - 10, b.y + b.h / 2 + 3);
      }
      c.restore();
    }

    // Footer tip
    c.font = '11px monospace';
    c.fillStyle = '#00ffff';
    c.textAlign = 'center';
    c.fillText('PRESS [F2] OR CLICK RESUME TO TEST LIVE GAMEPLAY', this.cw / 2, cardY + cardH - 18);
    c.restore();
  }

  public drawSingularityShockwave(px: number, py: number, radius: number, progress: number) {
    if (radius <= 0) return;
    const c = this.ctx;
    c.save();
    const alpha = Math.max(0, Math.min(1, 1 - progress));

    // Outer golden plasma wave
    c.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    c.shadowColor = '#ffd700';
    c.shadowBlur = 32;
    c.lineWidth = 14 * alpha;
    c.beginPath();
    c.arc(px, py, radius, 0, PI2);
    c.stroke();

    // Inner fiery gold deflagration ring
    c.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.9})`;
    c.lineWidth = 8 * alpha;
    c.beginPath();
    c.arc(px, py, Math.max(0, radius - 12), 0, PI2);
    c.stroke();

    c.restore();
  }

  public drawLevelUpShockwave(px: number, py: number, radius: number, progress: number, isSurge: boolean = false) {
    if (radius <= 0) return;
    const c = this.ctx;
    c.save();
    const alpha = Math.max(0, Math.min(1, (1 - progress) * 1.2));
    const mainCol = isSurge ? '#ffd700' : '#00ffff';
    const subCol = isSurge ? '#ff00aa' : '#00ffaa';

    // Expanding outer neon ring
    c.strokeStyle = mainCol;
    c.shadowColor = mainCol;
    c.shadowBlur = 24 * alpha;
    c.lineWidth = Math.max(2, 8 * (1 - progress));
    c.beginPath();
    c.arc(px, py, radius, 0, PI2);
    c.stroke();

    // Inner chromatic resonance ring
    if (radius > 10) {
      c.strokeStyle = subCol;
      c.shadowColor = subCol;
      c.shadowBlur = 12 * alpha;
      c.lineWidth = Math.max(1, 4 * (1 - progress));
      c.beginPath();
      c.arc(px, py, Math.max(0, radius - 8), 0, PI2);
      c.stroke();
    }

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
    burstBanner: { text: string; subtext: string; col: string; life: number } | null = null,
    bonusItems: { x: number; y: number; type: string; name: string; color: string; icon: string }[] = [],
    bonusActiveEffects?: {
      laserTimer: number;
      tsunamiX: number;
      vortex: { x: number; y: number; life: number; maxLife: number } | null;
      novaRing: { x: number; y: number; radius: number; life: number } | null;
    }
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

    // Save context for scaled zoomed-out arena (viewed from afar in full overview letterbox)
    c.save();
    c.beginPath();
    c.rect(0, HUD_H, this.cw, CH - HUD_H);
    c.clip();

    // Scale so entire 860x920 arena fits inside the viewport under HUD, preserving epic zoomed-out view
    const availW = this.cw;
    const availH = CH - HUD_H;
    const scale = Math.min(availW / BONUS_ARENA_W, availH / BONUS_ARENA_H);
    const offsetX = (availW - BONUS_ARENA_W * scale) / 2;
    const offsetY = HUD_H + (availH - BONUS_ARENA_H * scale) / 2;

    c.translate(offsetX, offsetY);
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

    // Draw bonus powerup capsules/items in the arena
    if (bonusItems) {
      for (const it of bonusItems) {
        c.save();
        const p = 1 + Math.sin(time * 6 + it.x) * 0.15;
        c.strokeStyle = '#ffffff';
        c.lineWidth = 2.5;
        c.shadowColor = it.color;
        c.shadowBlur = 16;
        c.fillStyle = it.color;
        c.beginPath();
        c.arc(it.x, it.y, 22 * p, 0, PI2);
        c.fill();
        c.stroke();
        c.shadowBlur = 0;

        // Rotating energy ring
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(it.x, it.y, 28 * p, time * 3, time * 3 + Math.PI);
        c.stroke();

        spriteAtlas.drawIcon(c, it.icon, it.x, it.y, 22);

        // Name tag
        c.font = 'bold 11px monospace';
        c.fillStyle = '#ffffff';
        c.shadowColor = it.color;
        c.shadowBlur = 8;
        c.textAlign = 'center';
        c.fillText(it.name, it.x, it.y - 30);
        c.restore();
      }
    }

    // Draw active super effects inside the arena
    if (bonusActiveEffects) {
      // 1. Cross Laser Beams
      if (bonusActiveEffects.laserTimer > 0) {
        c.save();
        c.strokeStyle = '#00ffff';
        c.shadowColor = '#00ffff';
        c.shadowBlur = 24;
        c.lineWidth = 16 + Math.sin(time * 25) * 5;
        c.beginPath();
        c.moveTo(0, playerPos.y); c.lineTo(BONUS_ARENA_W, playerPos.y);
        c.moveTo(playerPos.x, 0); c.lineTo(playerPos.x, BONUS_ARENA_H);
        c.stroke();
        c.strokeStyle = '#ffffff';
        c.lineWidth = 4;
        c.stroke();
        c.restore();
      }

      // 2. Black Hole Singularity
      if (bonusActiveEffects.vortex) {
        const vx = bonusActiveEffects.vortex.x;
        const vy = bonusActiveEffects.vortex.y;
        c.save();
        // Accretion disk distortion ring
        c.translate(vx, vy);
        const pulse = 1 + Math.sin(time * 8) * 0.12;
        c.strokeStyle = 'rgba(187, 68, 255, 0.45)';
        c.lineWidth = 4;
        c.beginPath();
        c.arc(0, 0, 85 * pulse, 0, PI2);
        c.stroke();

        // Swirling arms
        c.rotate(time * 12);
        c.shadowColor = '#00ffff';
        c.shadowBlur = 24;
        c.lineWidth = 3.5;
        for (let i = 0; i < 6; i++) {
          const startA = (i * PI2) / 6;
          c.strokeStyle = i % 2 === 0 ? '#ff00aa' : '#00ffff';
          c.beginPath();
          c.arc(0, 0, 20 + (i % 3) * 18, startA, startA + Math.PI * 0.85);
          c.stroke();
        }
        c.shadowBlur = 0;

        // Core Event Horizon
        c.fillStyle = '#000000';
        c.beginPath();
        c.arc(0, 0, 24, 0, PI2);
        c.fill();
        c.strokeStyle = '#ffffff';
        c.lineWidth = 2.5;
        c.shadowColor = '#bb44ff';
        c.shadowBlur = 18;
        c.beginPath();
        c.arc(0, 0, 24, 0, PI2);
        c.stroke();
        c.restore();
      }

      // 3. Cosmic Tsunami Wave
      if (bonusActiveEffects.tsunamiX >= 0) {
        const tx = bonusActiveEffects.tsunamiX;
        c.save();
        const gr = c.createLinearGradient(tx - 70, 0, tx, 0);
        gr.addColorStop(0, 'rgba(0, 240, 255, 0)');
        gr.addColorStop(0.7, 'rgba(0, 240, 255, 0.45)');
        gr.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
        c.fillStyle = gr;
        c.fillRect(tx - 70, 0, 70, BONUS_ARENA_H);
        c.strokeStyle = '#00ffff';
        c.lineWidth = 6;
        c.shadowColor = '#ffffff';
        c.shadowBlur = 22;
        c.beginPath();
        c.moveTo(tx, 0);
        c.lineTo(tx, BONUS_ARENA_H);
        c.stroke();
        c.restore();
      }

      // 4. Expanding Supernova Shockwave Ring
      if (bonusActiveEffects.novaRing && bonusActiveEffects.novaRing.life > 0) {
        const nr = bonusActiveEffects.novaRing;
        c.save();
        const a = Math.min(1, nr.life / 0.8);
        c.globalAlpha = a;
        c.strokeStyle = '#ffd700';
        c.shadowColor = '#ff0055';
        c.shadowBlur = 28;
        c.lineWidth = 14 * a;
        c.beginPath();
        c.arc(nr.x, nr.y, nr.radius, 0, PI2);
        c.stroke();

        c.strokeStyle = '#ffffff';
        c.lineWidth = 4 * a;
        c.beginPath();
        c.arc(nr.x, nr.y, nr.radius, 0, PI2);
        c.stroke();
        c.restore();
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
    let phaseTitle = 'PHASE I : VORTEX AWAKENING';
    let phaseCol = '#00f0ff';
    if (bonusTimer <= 2.5) {
      phaseTitle = 'PHASE IV : TOTAL SINGULARITY';
      phaseCol = Math.sin(time * 16) > 0 ? '#ff0055' : '#ffffff';
    } else if (bonusTimer <= 7.0) {
      phaseTitle = 'PHASE III : COSMIC CATACLYSM';
      phaseCol = '#ffd700';
    } else if (bonusTimer <= 12.0) {
      phaseTitle = 'PHASE II : EXPONENTIAL SURGE';
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
    c.fillText(bonusKills + ' OBLITERATED', 30, 32);
    c.shadowBlur = 0;
    c.font = 'bold 9px monospace';
    c.fillStyle = '#00ffff';
    spriteAtlas.drawIcon(c, 'spectre', 20, 48, 11);
    c.fillText(`${maxDraw} ENEMIES IN ARENA`, 30, 48);

    // Right: Real-time Player Score & Bonus Accumulator
    c.font = 'bold 13px monospace';
    c.fillStyle = '#00ffff';
    c.shadowColor = '#00ffff';
    c.shadowBlur = 8;
    c.textAlign = 'right';
    c.fillText('SCORE: ' + formatScoreCompact(Math.round(dScore)), this.cw - 12, 32);
    c.shadowBlur = 0;
    c.font = 'bold 10px monospace';
    c.fillStyle = '#ffd700';
    c.fillText('+' + formatScoreCompact(bonusScore) + ' BONUS', this.cw - 12, 48);
    c.shadowBlur = 0;

    // Bottom Bar / Controls Hint
    if (profileManager.gameMode === 'custom') {
      this.drawBottomExpBar(time);
    } else {
      c.font = 'bold 9px monospace';
      c.fillStyle = 'rgba(255, 255, 255, 0.7)';
      c.textAlign = 'center';
      c.fillText('ABSORB SWARMS WITH FORCE FIELD • [SPACE] DASH', this.cw / 2, CH - 14);
    }

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
    c.fillText('VORTEX RAMPAGE COMPLETE!', this.cw / 2, by + 34);
    c.shadowBlur = 0;

    // Kills line
    c.font = 'bold 14px monospace';
    c.fillStyle = '#ffffff';
    spriteAtlas.drawIcon(c, 'skull', this.cw / 2 - 90, by + 74, 16);
    c.fillText(`${bonusKills} GHOSTS DESTROYED`, this.cw / 2 + 8, by + 74);

    // Score line
    c.font = 'bold 18px monospace';
    c.fillStyle = '#00ffff';
    c.shadowColor = '#00ffff';
    c.shadowBlur = 12;
    c.fillText(`+${formatScoreCompact(bonusScore)} POINTS!`, this.cw / 2, by + 112);
    c.shadowBlur = 0;

    // Subtitle
    c.font = '9px monospace';
    c.fillStyle = '#a855f7';
    c.fillText('RETURNING TO MAZE...', this.cw / 2, by + 150);

    c.restore();
  }
}

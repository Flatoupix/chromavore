// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — MAIN GAME ORCHESTRATOR & GAMELOOP
// ═══════════════════════════════════════════════════════════════

import { CW, CH, HUD_H, T, ROWS, COLS, CLASSIC_COLS, MADNESS_COLS, HALF, DASH_CD, DASH_MADNESS_CD, HIT_DIST, NM_DIST, CM, DASH_BTN, CC, C_DOT, C_PELLET, COMBO_DECAY, getComboTier, GAME_VERSION, P_SPEED, P_MADNESS_SPEED, BONUS_DURATION, BONUS_ARENA_W, BONUS_ARENA_H, BONUS_FORCE_FIELD_BASE_RAD, BONUS_FORCE_FIELD_MAX_RAD, BONUS_SWARM_MAX, MADNESS_UNLOCK_KILLS, CHRONO_MAX, CHRONO_DRAIN, CHRONO_TIMESCALE, CHRONO_TIMESCALE_V2, CHRONO_PASSIVE_RECHARGE, CHRONO_DOT_RECHARGE, CHRONO_NM_RECHARGE } from './config/constants';
import { sounds } from './audio/SoundManager';
import { MazeManager, LEVELS, MADNESS_LEVELS, MADNESS_LEVELS_4_3, MADNESS_LEVELS_16_9 } from './levels/levels';
import { particles } from './systems/ParticleSystem';
import { input } from './core/InputManager';
import { Player } from './entities/Player';
import { EnemyManager, Ghost } from './entities/Enemy';
import { powerups } from './entities/Powerups';
import { superItems } from './systems/SuperItems';
import { badges } from './systems/BadgeSystem';
import { TouchDeckManager } from './ui/TouchDeck';
import { Renderer } from './graphics/Renderer';
import { settingsManager, PAUSE_BUTTONS } from './systems/SettingsManager';
import { leaderboard } from './systems/Leaderboard';
import { progression } from './systems/ProgressionSystem';
import { profileManager } from './systems/ProfileManager';

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private maze: MazeManager;
  private player: Player;
  private enemyManager: EnemyManager;
  private touchDeck: TouchDeckManager;

  // Game state
  public state: 'menu' | 'ready' | 'playing' | 'paused' | 'dying' | 'waveTrans' | 'gameover' | 'leaderboard' | 'codex' | 'instructions' | 'bonus' = 'menu';
  public leaderboardMode: 'classic' | 'madness' = 'classic';
  public playerRank: number = 0;
  public playerDate: string = '';
  public gameMode: 'classic' | 'madness' = 'classic';

  // Bonus Level Hyper-Swarm specific
  // Bonus Level Hyper-Swarm specific (500+ entity object-pooled architecture)
  public bonusTimer: number = BONUS_DURATION;
  public bonusKills: number = 0;
  public bonusScore: number = 0;
  public bonusTallyTimer: number = 0;
  public bonusPacPos = { x: BONUS_ARENA_W / 2, y: BONUS_ARENA_H / 2 };
  public bonusPacVel = { x: 0, y: 0 };
  public bonusPacAngle: number = 0;
  public bonusGhosts: { x: number; y: number; vx: number; vy: number; color: string; alive: boolean; speed: number; orbitFactor: number; swirlDir: number }[] = [];
  public bonusActiveCount: number = 0;
  public bonusBatchKills: number = 0;
  public bonusBatchScore: number = 0;
  public bonusBatchTimer: number = 0;
  public bonusMultikillBanner: { text: string; subtext: string; col: string; life: number } | null = null;
  public bonusShockwave: { radius: number; life: number } = { radius: 0, life: 0 };
  public score: number = 0;
  public dScore: number = 0;
  public lives: number = 3;
  public wave: number = 1;
  public time: number = 0;
  public bestCombo: number = 0;
  public nearMissCount: number = 0;
  public combo = { n: 0, t: 0, m: 1 };
  public readyT: number = 0;
  public deathT: number = 0;
  public waveT: number = 0;
  public hitlag: number = 0;
  public loopCount: number = 0;
  public codexTab: 'skills' | 'badges' = 'skills';
  public badgePage: number = 0;
  public get loopSpeedMultiplier(): number {
    return 1 + this.loopCount * 0.10;
  }

  // Madness mode specific
  public madnessTimer: number = 30.0;
  public madnessKills: number = 0;
  public madnessStreak: number = 0;
  public madnessSpawnTimer: number = 0;

  // Bullet Time (Chrono-Shift) specific
  public chronoEnergy: number = CHRONO_MAX;
  public isChronoActive: boolean = false;

  // Pending game over snapshot
  public pendingScore: number = 0;
  public pendingKills: number = 0;
  public pendingStreak: number = 0;
  public pendingMode: 'classic' | 'madness' = 'classic';

  constructor() {
    this.canvas = document.getElementById('c') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.maze = new MazeManager();
    this.player = new Player();
    this.enemyManager = new EnemyManager();
    this.touchDeck = new TouchDeckManager();

    this.setupNameModal();
    this.setupProfileModals();
    badges.syncWithProfile();
    this.gameMode = 'madness';
    this.setGameMode(this.gameMode);
    const vOverlay = document.getElementById('chv-version-overlay');
    if (vOverlay) vOverlay.textContent = GAME_VERSION;
    this.bindInputs();
    this.startLoop();
  }

  private setupNameModal() {
    const modal = document.getElementById('name-modal')!;
    const input = document.getElementById('pseudo-input') as HTMLInputElement;
    const submit = document.getElementById('pseudo-submit')!;
    const skip = document.getElementById('pseudo-skip')!;

    const save = () => {
      const savedLast = profileManager.profile.pseudo || 'PLAYER1';
      const pseudo = (input.value.trim().toUpperCase() || savedLast).slice(0, 12);
      profileManager.setPseudo(pseudo);
      const date = new Date().toISOString();
      this.playerDate = date;
      this.playerRank = leaderboard.addEntry({
        pseudo,
        score: this.pendingScore,
        mode: this.pendingMode,
        kills: this.pendingKills,
        streak: this.pendingStreak,
        date
      });
      modal.style.display = 'none';
      this.leaderboardMode = this.pendingMode;
      this.state = 'leaderboard';
      sounds.play('dot');
    };

    submit.addEventListener('click', save);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') save();
    });
    input.addEventListener('input', () => { input.value = input.value.toUpperCase(); });

    skip.addEventListener('click', () => {
      modal.style.display = 'none';
      this.state = 'gameover';
    });
  }

  private setupProfileModals() {
    // Restore Modal
    const restoreModal = document.getElementById('restore-modal')!;
    const restorePseudo = document.getElementById('restore-pseudo-input') as HTMLInputElement;
    const restoreCode = document.getElementById('restore-code-input') as HTMLInputElement;
    const restoreSubmit = document.getElementById('restore-submit')!;
    const restoreCancel = document.getElementById('restore-cancel')!;
    const restoreStatus = document.getElementById('restore-status')!;

    const doRestore = async () => {
      const p = restorePseudo.value.trim().toUpperCase();
      const c = restoreCode.value.trim().toUpperCase();
      if (!p || !c) {
        restoreStatus.style.display = 'block';
        restoreStatus.style.color = '#ff0055';
        restoreStatus.textContent = 'Veuillez remplir le pseudo et le code.';
        return;
      }
      restoreStatus.style.display = 'block';
      restoreStatus.style.color = '#ffd700';
      restoreStatus.textContent = 'Connexion à Firebase...';

      const ok = await profileManager.restoreProfile(p, c);
      if (ok) {
        restoreStatus.style.color = '#00ffaa';
        restoreStatus.textContent = `Succès ! Profil ${p} chargé (${profileManager.profile.careerGhosts} spectres)`;
        badges.hiScore = profileManager.profile.hiScore;
        badges.bestMadnessKills = profileManager.profile.bestMadnessKills;
        badges.syncWithProfile();
        setTimeout(() => {
          restoreModal.style.display = 'none';
          this.state = 'menu';
          sounds.play('badge');
        }, 1200);
      } else {
        restoreStatus.style.color = '#ff0055';
        restoreStatus.textContent = 'Pseudo ou Code ID introuvable sur le cloud.';
      }
    };

    restoreSubmit.addEventListener('click', doRestore);
    restoreCancel.addEventListener('click', () => {
      restoreModal.style.display = 'none';
    });
    restorePseudo.addEventListener('keydown', (e) => e.stopPropagation());
    restoreCode.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') doRestore();
    });

    // Wipe Modal
    const wipeModal = document.getElementById('wipe-modal')!;
    const wipeConfirm = document.getElementById('wipe-confirm')!;
    const wipeCancel = document.getElementById('wipe-cancel')!;

    wipeConfirm.addEventListener('click', () => {
      profileManager.wipeAllData();
      badges.hiScore = 0;
      badges.bestMadnessKills = 0;
      badges.unlocked = {};
      wipeModal.style.display = 'none';
      this.state = 'menu';
      particles.shake(6, 0.25);
      particles.flash('#ff0055', 0.3);
      particles.addPop(CW / 2, (ROWS * T) / 2, 'PROGRESSION RÉINITIALISÉE !', '#ff0055', 20);
      sounds.play('powerup');
    });

    wipeCancel.addEventListener('click', () => {
      wipeModal.style.display = 'none';
    });
  }

  public showRestoreModal() {
    const restoreModal = document.getElementById('restore-modal');
    const restorePseudo = document.getElementById('restore-pseudo-input') as HTMLInputElement;
    const restoreCode = document.getElementById('restore-code-input') as HTMLInputElement;
    const restoreStatus = document.getElementById('restore-status');
    if (!restoreModal) return;
    if (restorePseudo) restorePseudo.value = profileManager.profile.pseudo || '';
    if (restoreCode) restoreCode.value = '';
    if (restoreStatus) restoreStatus.style.display = 'none';
    restoreModal.style.display = 'flex';
  }

  public showWipeModal() {
    const wipeModal = document.getElementById('wipe-modal');
    if (wipeModal) wipeModal.style.display = 'flex';
  }

  private showNameModal(val: number, mode: string) {
    const modal = document.getElementById('name-modal');
    const titleEl = document.getElementById('name-modal-title');
    const scoreEl = document.getElementById('name-modal-score');
    const inputEl = document.getElementById('pseudo-input') as HTMLInputElement;
    if (!modal || !titleEl || !scoreEl || !inputEl) return;

    titleEl.textContent = 'NOUVEAU RECORD !';
    scoreEl.textContent = mode === 'madness'
      ? `${this.pendingKills} FANTÔMES PURGÉS (STREAK x${this.pendingStreak})`
      : `SCORE : ${this.pendingScore.toLocaleString()} PTS`;

    const lastPseudo = localStorage.getItem('chv_last_pseudo') || '';
    inputEl.value = lastPseudo;
    modal.style.display = 'flex';
    setTimeout(() => {
      inputEl.focus();
      if (lastPseudo) inputEl.select();
    }, 60);
  }

  private triggerGameOver() {
    this.state = 'gameover';
    this.pendingScore = this.score;
    this.pendingKills = this.madnessKills;
    this.pendingStreak = this.madnessStreak;
    this.pendingMode = this.gameMode;

    badges.saveScore(this.score);
    badges.saveMadnessKills(this.madnessKills);
    sounds.play('death');

    // Auto-save immediately if pseudo already known so record is NEVER lost
    const savedPseudo = (localStorage.getItem('chv_last_pseudo') || '').trim();
    const qualifies = this.pendingMode === 'madness' ? this.pendingKills > 0 : this.pendingScore > 0;

    if (savedPseudo && qualifies) {
      this.playerDate = new Date().toISOString();
      this.playerRank = leaderboard.addEntry({
        pseudo: savedPseudo,
        score: this.pendingScore,
        mode: this.pendingMode,
        kills: this.pendingKills,
        streak: this.pendingStreak,
        date: this.playerDate
      });
    }

    if (qualifies) {
      setTimeout(() => {
        this.showNameModal(this.pendingMode === 'madness' ? this.pendingKills : this.pendingScore, this.pendingMode);
      }, 400);
    }
  }

  private bindInputs() {
    // Click on canvas / window
    window.addEventListener('click', (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest && (e.target as HTMLElement).closest('#touch-deck')) return;
      if ((e.target as HTMLElement)?.closest && (e.target as HTMLElement).closest('#name-modal')) return;
      const rect = this.canvas.getBoundingClientRect();
      const curCw = this.renderer ? this.renderer.cw : this.canvas.width;
      const cx = (e.clientX - rect.left) * (curCw / rect.width);
      const cy = (e.clientY - rect.top) * (CH / rect.height);

      if (this.state === 'instructions') {
        this.state = 'menu';
        sounds.play('click');
        return;
      }

      if (this.state === 'menu') {
        // Navigation links click at bottom:
        // Row 1 (y: ~538): [I] COMMENT JOUER | [C] ARSENAL
        if (cy >= 522 && cy <= 552) {
          if (cx < CW / 2) {
            this.state = 'instructions';
            sounds.play('click');
            return;
          } else {
            this.state = 'codex';
            this.codexTab = 'skills';
            sounds.play('click');
            return;
          }
        }
        // Row 2 (y: ~566): [B] SUCCÈS | [L] SCORES | [K] SYNC
        if (cy > 552 && cy <= 585) {
          if (cx < CW * 0.38) {
            this.state = 'codex';
            this.codexTab = 'badges';
            sounds.play('click');
            return;
          } else if (cx < CW * 0.68) {
            this.state = 'leaderboard';
            this.leaderboardMode = this.gameMode;
            leaderboard.syncRemote();
            sounds.play('click');
            return;
          } else {
            this.showRestoreModal();
            return;
          }
        }
        // Copy sync code if tapping player line (y: 470)
        if (cy >= 455 && cy <= 485) {
          navigator.clipboard?.writeText(profileManager.profile.syncCode);
          particles.addPop(CW / 2, 470, 'CODE ID COPIÉ !', '#00ffff', 14);
          sounds.play('click');
          return;
        }

        const madW = 380, madH = 68;
        const madX = CW / 2 - madW / 2;
        const madY = 224;

        const clW = 380, clH = 46;
        const clX = CW / 2 - clW / 2;
        const clY = 302;

        // Click on Madness Card [1]
        if (cx >= madX && cx <= madX + madW && cy >= madY && cy <= madY + madH) {
          if (this.gameMode === 'madness') {
            this.startGame('madness');
          } else {
            this.setGameMode('madness');
            sounds.play('nova');
          }
          return;
        }

        // Click on Classique Card [2]
        if (cx >= clX && cx <= clX + clW && cy >= clY && cy <= clY + clH) {
          if (this.gameMode === 'classic') {
            this.startGame('classic');
          } else {
            this.setGameMode('classic');
            sounds.play('click');
          }
          return;
        }

        // Click on Play prompt area or anywhere else starts the game
        this.startGame(this.gameMode);
        return;
      }

      if (this.state === 'codex') {
        const tabW = 200, tabH = 26, tabY = 36;
        // Click Tab 1 (Skills)
        if (cy >= tabY && cy <= tabY + tabH && cx >= CW / 2 - tabW - 8 && cx <= CW / 2 - 8) {
          this.codexTab = 'skills';
          sounds.play('click');
          return;
        }
        // Click Tab 2 (Badges)
        if (cy >= tabY && cy <= tabY + tabH && cx >= CW / 2 + 8 && cx <= CW / 2 + tabW + 8) {
          this.codexTab = 'badges';
          sounds.play('click');
          return;
        }
        // If in badges and clicking bottom pagination
        if (this.codexTab === 'badges' && cy >= CH - 45) {
          if (cx > CW * 0.25 && cx < CW * 0.75) {
            this.badgePage = (this.badgePage + 1) % 2;
            sounds.play('click');
            return;
          }
        }
        this.state = 'menu';
        sounds.play('click');
        return;
      }

      if (this.state === 'gameover') {
        const cyOver = CH * 0.30;
        if (cy >= cyOver + 205 && cy <= cyOver + 235) {
          if (cx < CW / 2) {
            this.state = 'leaderboard';
            this.leaderboardMode = this.gameMode;
            leaderboard.syncRemote();
          } else {
            this.state = 'codex';
            this.codexTab = 'skills';
          }
          sounds.play('click');
          return;
        }
        this.startGame(this.gameMode);
        return;
      }

      if (this.state === 'leaderboard') {
        if (cy <= 75) {
          this.leaderboardMode = this.leaderboardMode === 'classic' ? 'madness' : 'classic';
          sounds.play('click');
          return;
        }
        this.state = 'menu';
        sounds.play('click');
        return;
      }

      if (this.state === 'paused') {
        for (const btn of PAUSE_BUTTONS) {
          if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
            switch (btn.id) {
              case 'freezeFrame':
                settingsManager.toggleFreezeFrame();
                sounds.play('click');
                return;
              case 'screenShake':
                settingsManager.toggleScreenShake();
                sounds.play('click');
                return;
              case 'screenFlash':
                settingsManager.toggleScreenFlash();
                sounds.play('click');
                return;
              case 'crtScanlines':
                settingsManager.toggleCrtScanlines();
                sounds.play('click');
                return;
              case 'particleDensity':
                settingsManager.toggleParticleDensity();
                sounds.play('click');
                return;
              case 'audio':
                sounds.toggleMute();
                return;
              case 'wipeData':
                this.showWipeModal();
                return;
              case 'resume':
                this.state = 'playing';
                sounds.play('click');
                return;
              case 'restart':
                this.startGame(this.gameMode);
                sounds.play('start');
                return;
              case 'home':
                this.state = 'menu';
                sounds.play('click');
                return;
            }
          }
        }
        // If clicking outside the cards or on resume, resume playing
        this.state = 'playing';
        return;
      }

      // Tap on-screen dash button (touch devices only)
      const btnX = this.renderer.cw - 38, btnY = ROWS * T - 26;
      if (this.touchDeck.isTouch() && Math.hypot(cx - btnX, cy - btnY) < 24 + 14) {
        if (this.state === 'playing') {
          this.player.triggerDash(
            this.maze,
            this.gameMode === 'madness',
            this.enemyManager.enemies,
            (en, x, y) => this.onKillGhost(en, x, y),
            (c, r) => this.onCollectDot(c, r),
            powerups.fx.magnet > 0,
            powerups.fx.overdrive > 0
          );
        }
      }
    });

    // Touch swipe steering & double tap dash
    let touchStart: { x: number; y: number } | null = null;
    let lastTouchTime = 0;

    window.addEventListener('touchstart', (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest && (e.target as HTMLElement).closest('#touch-deck')) return;
      if (!e.touches[0]) return;
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const now = performance.now();
      if (now - lastTouchTime < 280) {
        if (this.state === 'playing') {
          this.player.triggerDash(
            this.maze,
            this.gameMode === 'madness',
            this.enemyManager.enemies,
            (en, x, y) => this.onKillGhost(en, x, y),
            (c, r) => this.onCollectDot(c, r),
            powerups.fx.magnet > 0,
            powerups.fx.overdrive > 0
          );
        }
      }
      lastTouchTime = now;
    }, { passive: true });

    window.addEventListener('touchmove', (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest && (e.target as HTMLElement).closest('#touch-deck')) return;
      if (!touchStart || !e.touches[0]) return;
      const dx = e.touches[0].clientX - touchStart.x;
      const dy = e.touches[0].clientY - touchStart.y;
      if (Math.abs(dx) > 14 || Math.abs(dy) > 14) {
        if (Math.abs(dx) > Math.abs(dy)) {
          input.setNextDir(dx > 0 ? 1 : -1, 0);
        } else {
          input.setNextDir(0, dy > 0 ? 1 : -1);
        }
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      touchStart = null;
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.state === 'paused') {
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
          settingsManager.toggleFreezeFrame();
          sounds.play('click');
          e.preventDefault();
        } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
          settingsManager.toggleScreenShake();
          sounds.play('click');
          e.preventDefault();
        } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
          settingsManager.toggleScreenFlash();
          sounds.play('click');
          e.preventDefault();
        } else if (e.code === 'Digit4' || e.code === 'Numpad4') {
          settingsManager.toggleCrtScanlines();
          sounds.play('click');
          e.preventDefault();
        } else if (e.code === 'Digit5' || e.code === 'Numpad5') {
          settingsManager.toggleParticleDensity();
          sounds.play('click');
          e.preventDefault();
        }
      } else if (this.state === 'codex') {
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
          this.codexTab = 'skills';
          sounds.play('click');
          e.preventDefault();
        } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
          this.codexTab = 'badges';
          sounds.play('click');
          e.preventDefault();
        } else if (e.code === 'Tab') {
          this.codexTab = this.codexTab === 'skills' ? 'badges' : 'skills';
          sounds.play('click');
          e.preventDefault();
        } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
          this.badgePage = (this.badgePage + 1) % 2;
          sounds.play('click');
          e.preventDefault();
        }
      }
    });
  }

  public isWidescreenUnlocked(): boolean {
    return profileManager.profile.careerGhosts >= MADNESS_UNLOCK_KILLS;
  }

  public isMadnessUnlocked(): boolean {
    return true;
  }

  public getCurrentLevelList() {
    if (this.gameMode !== 'madness') return LEVELS;
    return this.isWidescreenUnlocked() ? MADNESS_LEVELS_16_9 : MADNESS_LEVELS_4_3;
  }

  public setGameMode(mode: 'classic' | 'madness') {
    this.gameMode = mode;
    const isWidescreen = mode === 'madness' && this.isWidescreenUnlocked();
    this.maze.cols = isWidescreen ? MADNESS_COLS : CLASSIC_COLS;
    this.renderer.updateCanvasSize(this.maze.cols, this.maze.rows);
    this.touchDeck.resize();
  }

  public startGame(mode: 'classic' | 'madness') {
    this.setGameMode(mode);
    this.score = 0;
    this.dScore = 0;
    this.lives = 3;
    this.wave = 1;
    this.time = 0;
    this.bestCombo = 0;
    this.nearMissCount = 0;
    this.combo = { n: 0, t: 0, m: 1 };

    this.madnessTimer = 30.0;
    this.madnessKills = 0;
    this.madnessStreak = 0;
    this.madnessSpawnTimer = 0;

    this.chronoEnergy = CHRONO_MAX;
    this.isChronoActive = false;
    sounds.setChronoActive(false);
    sounds.resetDotStreak();

    this.loopCount = 0;

    superItems.resetAll();
    input.resetKombos();
    input.nextDir = { x: 0, y: 0 };
    powerups.reset();
    particles.clearAll();

    // Always start at Level 1
    const isMadness = this.gameMode === 'madness';
    const isWidescreen = isMadness && this.isWidescreenUnlocked();
    this.maze.build(0, isMadness, isWidescreen);
    this.player.reset(isMadness, this.maze, this.loopSpeedMultiplier);

    if (this.gameMode === 'madness') {
      this.enemyManager.enemies = [];
      this.enemyManager.spawnMadness(8, 0, this.maze);
      this.state = 'ready';
      this.readyT = 1.5;
      sounds.play('powerup');
      particles.addPop(this.renderer.cw / 2, HUD_H + 50, '« MADNESS SWARM »', '#ffd700', 22);
    } else {
      this.enemyManager.spawnClassic(4, this.loopSpeedMultiplier, this.maze);
      this.state = 'ready';
      this.readyT = 2.0;
      sounds.play('start');
    }
  }

  private warpToLevel(lvlIndex: number) {
    sounds.resetDotStreak();
    const isMadness = this.gameMode === 'madness';
    const isWidescreen = isMadness && this.isWidescreenUnlocked();
    const list = this.getCurrentLevelList();
    this.maze.build(lvlIndex, isMadness, isWidescreen);
    this.renderer.updateCanvasSize(this.maze.cols, this.maze.rows);
    this.touchDeck.resize();

    // Reposition player only if trapped inside a wall in the new layout, preserving direction and motion!
    if (!this.maze.isWalkable(this.player.x, this.player.y, false)) {
      const safe = this.maze.findNearestWalkable(this.player.x, this.player.y, false);
      this.player.x = this.player.fx = safe.x;
      this.player.y = this.player.fy = safe.y;
      this.player.t = 1;
    } else if (!this.maze.isWalkable(this.player.fx, this.player.fy, false)) {
      this.player.fx = this.player.x;
      this.player.fy = this.player.y;
      this.player.t = 1;
    }

    // Grant 1.8s invulnerability on level warp to avoid instant collision
    this.player.invuln = Math.max(this.player.invuln, 1.8);
    this.player.speed = (isMadness ? P_MADNESS_SPEED : P_SPEED) * this.loopSpeedMultiplier;

    // Ghost management
    if (isMadness) {
      // Relocate any ghosts trapped in new layout
      for (const e of this.enemyManager.enemies) {
        if (e.st !== 'dead' && !this.maze.isWalkable(e.x, e.y, true)) {
          const safe = this.maze.findNearestWalkable(e.x, e.y, true);
          e.x = e.fx = safe.x;
          e.y = e.fy = safe.y;
          e.t = 1;
        }
      }
      if (this.enemyManager.enemies.length < 8) {
        this.enemyManager.spawnMadness(8 - this.enemyManager.enemies.length, this.madnessKills, this.maze);
      }
      this.madnessTimer = Math.min(45, this.madnessTimer + 10.0);
    } else {
      this.enemyManager.spawnClassic(4, this.loopSpeedMultiplier, this.maze);
    }

    // Wall safety: relocate any active powerup or relic trapped in new layout or inside ghost house
    if (powerups.current && (!this.maze.isWalkable(powerups.current.x, powerups.current.y, false) || this.maze.isInGhostHouse(powerups.current.x, powerups.current.y))) {
      const safe = this.maze.findNearestWalkable(powerups.current.x, powerups.current.y, false);
      powerups.current.x = safe.x;
      powerups.current.y = safe.y;
    }
    if (powerups.voidRelic && (!this.maze.isWalkable(powerups.voidRelic.x, powerups.voidRelic.y, false) || this.maze.isInGhostHouse(powerups.voidRelic.x, powerups.voidRelic.y))) {
      const safe = this.maze.findNearestWalkable(powerups.voidRelic.x, powerups.voidRelic.y, false);
      powerups.voidRelic.x = safe.x;
      powerups.voidRelic.y = safe.y;
    }
    if (powerups.forceFieldItem && (!this.maze.isWalkable(powerups.forceFieldItem.x, powerups.forceFieldItem.y, false) || this.maze.isInGhostHouse(powerups.forceFieldItem.x, powerups.forceFieldItem.y))) {
      const safe = this.maze.findNearestWalkable(powerups.forceFieldItem.x, powerups.forceFieldItem.y, false);
      powerups.forceFieldItem.x = safe.x;
      powerups.forceFieldItem.y = safe.y;
    }
    if (powerups.vortexPortal && (!this.maze.isWalkable(powerups.vortexPortal.x, powerups.vortexPortal.y, false) || this.maze.isInGhostHouse(powerups.vortexPortal.x, powerups.vortexPortal.y))) {
      const safe = this.maze.findNearestWalkable(powerups.vortexPortal.x, powerups.vortexPortal.y, false);
      powerups.vortexPortal.x = safe.x;
      powerups.vortexPortal.y = safe.y;
    }

    // If player has powerful momentum, spawn a Force Field quickly in the new level to help clear it!
    const isPowerful = (this.combo.m >= 4) || (this.madnessStreak >= 8) || (powerups.fx.magnet > 0);
    if (isPowerful) {
      powerups.forceFieldSpawnTimer = 1.0;
      powerups.spawnTimer = 1.2;
    }

    const def = this.maze.getLevelDef();
    sounds.play('wave');
    particles.flash(def.glowColor, 0.35);
    particles.emit(this.renderer.cw / 2, (ROWS * T) / 2, 50, def.glowColor, { speed: 220, size: 5, life: 0.8 });
    particles.shake(6, 0.25);
    particles.addPop(this.renderer.cw / 2, HUD_H + 35, `NIVEAU ${lvlIndex + 1}/${list.length} : ${def.name}`, def.glowColor, 22);
  }

  private checkArenaUnlock(prevCareer: number) {
    if (prevCareer < MADNESS_UNLOCK_KILLS && profileManager.profile.careerGhosts >= MADNESS_UNLOCK_KILLS) {
      badges.unlock('arena16_9');
      sounds.play('powerup');
      particles.flash('#00f0ff', 0.5);
      particles.shake(12, 0.4);
      particles.addPop(this.renderer.cw / 2, HUD_H + 60, 'ARÈNE 16:9 DÉBLOQUÉE !', '#ffd700', 26);
    }
  }

  private onKillGhost(e: Ghost, ex: number, ey: number) {
    e.st = 'return';
    e.fl = 0.15;
    powerups.pred.k++;
    badges.unlock('firstBlood');
    if (powerups.pred.k >= 4) badges.unlock('ghostHunter');

    // Progression system: count lifetime ghost kill & check unlocks
    const prevCareer = profileManager.profile.careerGhosts;
    progression.addGhostKills(1);
    this.checkArenaUnlock(prevCareer);

    if (this.gameMode === 'madness') {
      this.madnessKills++;
      this.madnessStreak++;
      this.checkRampageMilestone(this.madnessStreak);

      if (this.madnessKills >= 50) badges.unlock('madness50');
      if (this.madnessKills >= 100) badges.unlock('madness100');

      badges.saveMadnessKills(this.madnessKills);
      this.madnessTimer = Math.min(45, this.madnessTimer + 0.35);

      // Charge Super-Item Energy Gauge (+8% per ghost kill)
      const unlockedPool = progression.getUnlockedSuperItems();
      superItems.addEnergy(8.0, unlockedPool);

      // 14% chance to drop powerup on tile (with guaranteed walkable safety)
      if (Math.random() < 0.14 && !powerups.current) {
        const mx = Math.max(1, Math.min(this.maze.cols - 2, Math.round(ex / T)));
        const my = Math.max(1, Math.min(ROWS - 2, Math.round(ey / T)));
        const safe = this.maze.findNearestWalkable(mx, my, false);
        powerups.current = { x: safe.x, y: safe.y, type: Math.random() < 0.4 ? 'overdrive' : (Math.random() < 0.65 ? 'magnet' : 'nova'), timer: 8 };
      }

      const pts = 250 * Math.min(this.madnessStreak, 32);
      this.score += pts;
      particles.addPop(ex, ey - 15, '+' + pts, '#ffd700', 16);
    } else {
      const pts = 200 * Math.min(Math.pow(2, powerups.pred.k - 1), 8);
      this.score += pts;
      particles.addPop(ex, ey - 15, '+' + pts, '#00ffff', 18);
    }

    particles.emit(ex, ey, 25, '#00ffff', { speed: 130, size: 4, life: 0.5 });
    particles.shake(3, 0.12);
    if (settingsManager.settings.freezeFrame) {
      this.hitlag = Math.max(this.hitlag, 0.035);
    }
    sounds.play('kill');
  }

  private checkRampageMilestone(streak: number) {
    const milestones: Record<number, string> = {
      10: 'KILLING SPREE !',
      25: 'RAMPAGE !',
      50: 'UNSTOPPABLE !',
      80: 'GODLIKE !',
      120: 'TRANSCENDENT !',
      160: 'CHROMA-DEITY !'
    };
    if (milestones[streak]) {
      sounds.play('wave');
      particles.shake(8, 0.3);
      particles.flash('#ffd700', 0.3);
      particles.addPop(CW / 2, HUD_H + 45, milestones[streak], '#ffd700', 20);
    }
  }

  private playerDie() {
    this.state = 'dying';
    this.deathT = 1.5;
    this.lives--;
    if (this.gameMode === 'madness') {
      this.madnessTimer = Math.max(0, this.madnessTimer - 4.0);
      this.madnessStreak = 0;
    }
    const pp = this.player.getPos();
    particles.emit(pp.x, pp.y, 40, '#ffffff', { speed: 160, size: 5, life: 0.85, gravity: 80 });
    particles.emit(pp.x, pp.y, 30, '#00b4ff', { speed: 130, size: 4, life: 0.65 });
    particles.shake(10, 0.4);
    particles.flash('#ff0000', 0.5);
    sounds.play('death');

    powerups.pred.on = false;
    powerups.fx.phase = 0;
    powerups.fx.timewarp = 0;
    powerups.fx.magnet = 0;
    powerups.fx.overdrive = 0;
    this.combo = { n: 0, t: 0, m: 1 };
  }

  public enterBonusStage() {
    this.state = 'bonus';
    this.bonusTimer = BONUS_DURATION;
    this.bonusKills = 0;
    this.bonusScore = 0;
    this.bonusTallyTimer = 0;
    this.bonusPacPos = { x: BONUS_ARENA_W / 2, y: BONUS_ARENA_H / 2 };
    this.bonusPacVel = { x: 0, y: 0 };
    this.bonusPacAngle = 0;
    this.bonusBatchKills = 0;
    this.bonusBatchScore = 0;
    this.bonusBatchTimer = 0;
    this.bonusMultikillBanner = null;
    this.bonusShockwave = { radius: 0, life: 0 };

    // Initialize 600-capacity Object Pool if needed (zero runtime allocations!)
    const POOL_CAPACITY = 600;
    if (this.bonusGhosts.length < POOL_CAPACITY) {
      this.bonusGhosts = new Array(POOL_CAPACITY).fill(null).map(() => ({
        x: 0, y: 0, vx: 0, vy: 0, color: '#00f0ff', alive: false, speed: 150, orbitFactor: 1, swirlDir: 1
      }));
    }

    // Reset all pool objects
    for (let i = 0; i < POOL_CAPACITY; i++) {
      this.bonusGhosts[i].alive = false;
    }

    // Initial starting wave: 70 ghosts around perimeter
    const colors = ['#00f0ff', '#ff007f', '#ffd700', '#00ffaa', '#b000ff', '#ff6600'];
    const initialCount = 70;
    this.bonusActiveCount = initialCount;
    for (let i = 0; i < initialCount; i++) {
      const g = this.bonusGhosts[i];
      const edge = (Math.random() * 4) | 0;
      let gx = 0, gy = 0;
      if (edge === 0) { gx = Math.random() * BONUS_ARENA_W; gy = 20; }
      else if (edge === 1) { gx = Math.random() * BONUS_ARENA_W; gy = BONUS_ARENA_H - 20; }
      else if (edge === 2) { gx = 20; gy = Math.random() * BONUS_ARENA_H; }
      else { gx = BONUS_ARENA_W - 20; gy = Math.random() * BONUS_ARENA_H; }

      g.x = gx;
      g.y = gy;
      g.vx = 0;
      g.vy = 0;
      g.color = colors[(Math.random() * colors.length) | 0];
      g.alive = true;
      g.speed = 135 + Math.random() * 65;
      g.orbitFactor = 0.4 + Math.random() * 0.8;
      g.swirlDir = Math.random() < 0.5 ? 1 : -1;
    }

    sounds.play('portal');
    particles.shake(7, 0.35);
    particles.addPop(BONUS_ARENA_W / 2, BONUS_ARENA_H / 2 - 40, 'RAMPAGE DU VORTEX ! (15s)', '#d946ef', 24);
  }

  public updateBonusStage(dt: number) {
    // Terminal shockwave animation & return transition
    if (this.bonusTallyTimer > 0) {
      this.bonusTallyTimer -= dt;
      if (this.bonusShockwave.life > 0) {
        this.bonusShockwave.life -= dt;
        this.bonusShockwave.radius += 1400 * dt;
      }
      if (this.bonusTallyTimer <= 0) {
        // Safe return back to the maze with generous invulnerability
        this.state = 'playing';
        this.player.invuln = 2.2;
        sounds.play('start');
      }
      return;
    }

    this.bonusTimer -= dt;

    // Multikill burst banner decay
    if (this.bonusMultikillBanner) {
      this.bonusMultikillBanner.life -= dt;
      if (this.bonusMultikillBanner.life <= 0) {
        this.bonusMultikillBanner = null;
      }
    }

    // Batch aggregator timer
    if (this.bonusBatchTimer > 0) {
      this.bonusBatchTimer -= dt;
      if (this.bonusBatchTimer <= 0 && this.bonusBatchKills > 0) {
        this.triggerMultikillBanner();
      }
    }

    // Player controls in arena (analog/digital 2D free motion)
    const inDir = input.getVector();
    const speed = powerups.fx.overdrive > 0 ? 430 : 295;
    if (inDir.x !== 0 || inDir.y !== 0) {
      this.bonusPacVel.x = inDir.x * speed;
      this.bonusPacVel.y = inDir.y * speed;
      this.bonusPacAngle = Math.atan2(inDir.y, inDir.x);
    } else {
      this.bonusPacVel.x *= 0.85;
      this.bonusPacVel.y *= 0.85;
    }

    // Overdrive active decay in vortex
    if (powerups.fx.overdrive > 0) powerups.fx.overdrive -= dt;

    let killsThisFrame = 0;
    let frameScore = 0;

    // Dash support in arena with ghost-slicing
    if (this.player.dashCd > 0) this.player.dashCd -= dt;
    if (input.isDashRequested && (this.player.dashCd <= 0 || powerups.fx.overdrive > 0)) {
      const faceAngle = this.bonusPacAngle;
      const dDist = 145;
      const oldX = this.bonusPacPos.x, oldY = this.bonusPacPos.y;
      this.bonusPacPos.x += Math.cos(faceAngle) * dDist;
      this.bonusPacPos.y += Math.sin(faceAngle) * dDist;
      this.player.dashStreaks.push({
        x1: oldX, y1: oldY,
        x2: this.bonusPacPos.x, y2: this.bonusPacPos.y,
        life: 0.28, maxLife: 0.28
      });
      this.player.dashCd = powerups.fx.overdrive > 0 ? 0.12 : 0.65;
      sounds.play('dash');
      particles.shake(4, 0.18);

      // Dash slash: slice through swirling ghosts along trajectory!
      for (let i = 0; i < this.bonusActiveCount; i++) {
        const g = this.bonusGhosts[i];
        const l2 = (this.bonusPacPos.x - oldX) ** 2 + (this.bonusPacPos.y - oldY) ** 2;
        const tParam = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((g.x - oldX) * (this.bonusPacPos.x - oldX) + (g.y - oldY) * (this.bonusPacPos.y - oldY)) / l2));
        const projX = oldX + tParam * (this.bonusPacPos.x - oldX);
        const projY = oldY + tParam * (this.bonusPacPos.y - oldY);
        const distSq = (g.x - projX) ** 2 + (g.y - projY) ** 2;
        if (distSq < 48 * 48) {
          g.alive = false;
          killsThisFrame++;
          this.bonusKills++;
          const ghostPts = 250 + Math.min(3000, this.bonusKills * 25);
          this.bonusScore += ghostPts;
          this.score += ghostPts;
          frameScore += ghostPts;
          particles.addPop(g.x, g.y - 12, '+' + ghostPts, '#00ffff', 14);
          particles.emit(g.x, g.y, 8, '#00ffff', { speed: 150, size: 4, life: 0.5 });
          const lastIndex = this.bonusActiveCount - 1;
          if (i !== lastIndex) {
            const temp = this.bonusGhosts[i];
            this.bonusGhosts[i] = this.bonusGhosts[lastIndex];
            this.bonusGhosts[lastIndex] = temp;
          }
          this.bonusActiveCount--;
          i--;
        }
      }
    }
    input.isDashRequested = false;

    // Super-Items support in vortex arena
    if (input.isItemRequested && superItems.activeSlot && superItems.activeSlot.ready) {
      const itmType = superItems.activeSlot.type;
      const lvl = progression.getSkillLevel(itmType);
      superItems.activeSlot = null;
      superItems.energy = 0;
      const itmBtn = document.getElementById('item-btn');
      if (itmBtn) itmBtn.classList.remove('ready');

      switch (itmType) {
        case 'nova': {
          sounds.play('nova');
          particles.shake(18, 0.5);
          particles.flash('#ffd700', 0.5);
          particles.addPop(this.bonusPacPos.x, this.bonusPacPos.y - 30, lvl >= 2 ? 'SUPERNOVA VORTEX !' : 'MEGA NOVA !', '#ffd700', 26);
          const purgeCount = Math.min(this.bonusActiveCount, lvl >= 2 ? 140 : 80);
          for (let s = 0; s < purgeCount; s++) {
            const g = this.bonusGhosts[s];
            g.alive = false;
            killsThisFrame++;
            this.bonusKills++;
            const ghostPts = 300 + Math.min(3000, this.bonusKills * 25);
            this.bonusScore += ghostPts;
            this.score += ghostPts;
            frameScore += ghostPts;
            particles.emit(g.x, g.y, 6, g.color, { speed: 180, size: 4, life: 0.55 });
          }
          this.bonusGhosts.splice(0, purgeCount);
          for (let k = 0; k < purgeCount; k++) {
            this.bonusGhosts.push({ x: 0, y: 0, vx: 0, vy: 0, speed: 150, orbitFactor: 1, swirlDir: 1, color: '#00ffff', alive: false });
          }
          this.bonusActiveCount = Math.max(0, this.bonusActiveCount - purgeCount);
          break;
        }
        case 'overdrive': {
          sounds.play('powerup');
          powerups.fx.overdrive = lvl >= 2 ? 10.0 : 8.0;
          particles.shake(8, 0.25);
          particles.flash('#00ffcc', 0.4);
          particles.addPop(this.bonusPacPos.x, this.bonusPacPos.y - 25, 'DASH INFINI (8s) !', '#00ffcc', 22);
          break;
        }
        case 'vortex': {
          sounds.play('portal');
          particles.shake(10, 0.35);
          particles.flash('#b000ff', 0.4);
          particles.addPop(this.bonusPacPos.x, this.bonusPacPos.y - 25, 'SINGULARITÉ COSMIQUE !', '#d946ef', 24);
          for (let i = 0; i < this.bonusActiveCount; i++) {
            const g = this.bonusGhosts[i];
            const dist = Math.hypot(this.bonusPacPos.x - g.x, this.bonusPacPos.y - g.y);
            if (dist < 260) {
              g.alive = false;
              killsThisFrame++;
              this.bonusKills++;
              const ghostPts = 250 + Math.min(3000, this.bonusKills * 25);
              this.bonusScore += ghostPts;
              this.score += ghostPts;
              frameScore += ghostPts;
              particles.emit(g.x, g.y, 8, '#d946ef', { speed: 140, size: 3.5, life: 0.45 });
              const lastIndex = this.bonusActiveCount - 1;
              if (i !== lastIndex) {
                const temp = this.bonusGhosts[i];
                this.bonusGhosts[i] = this.bonusGhosts[lastIndex];
                this.bonusGhosts[lastIndex] = temp;
              }
              this.bonusActiveCount--;
              i--;
            }
          }
          break;
        }
        case 'laser': {
          sounds.play('dash');
          particles.shake(10, 0.3);
          particles.flash('#00ffff', 0.35);
          particles.addPop(this.bonusPacPos.x, this.bonusPacPos.y - 25, lvl >= 2 ? 'OCTO-BEAMS !' : 'HYPER BEAMS !', '#00ffff', 24);
          for (let i = 0; i < this.bonusActiveCount; i++) {
            const g = this.bonusGhosts[i];
            const dx = Math.abs(g.x - this.bonusPacPos.x);
            const dy = Math.abs(g.y - this.bonusPacPos.y);
            const hitCross = dx < 36 || dy < 36;
            const hitDiag = lvl >= 2 && Math.abs(dx - dy) < 40;
            if (hitCross || hitDiag) {
              g.alive = false;
              killsThisFrame++;
              this.bonusKills++;
              const ghostPts = 280 + Math.min(3000, this.bonusKills * 25);
              this.bonusScore += ghostPts;
              this.score += ghostPts;
              frameScore += ghostPts;
              particles.emit(g.x, g.y, 8, '#00f0ff', { speed: 160, size: 4, life: 0.5 });
              const lastIndex = this.bonusActiveCount - 1;
              if (i !== lastIndex) {
                const temp = this.bonusGhosts[i];
                this.bonusGhosts[i] = this.bonusGhosts[lastIndex];
                this.bonusGhosts[lastIndex] = temp;
              }
              this.bonusActiveCount--;
              i--;
            }
          }
          break;
        }
        case 'cryo': {
          sounds.play('powerup');
          particles.shake(8, 0.25);
          particles.flash('#aaffff', 0.35);
          particles.addPop(this.bonusPacPos.x, this.bonusPacPos.y - 25, 'BLIZZARD CRYO (GEL TOTAL) !', '#aaffff', 22);
          for (let i = 0; i < this.bonusActiveCount; i++) {
            this.bonusGhosts[i].speed *= 0.15;
            this.bonusGhosts[i].color = '#aaffff';
          }
          break;
        }
        case 'tsunami': {
          sounds.play('wave');
          this.bonusTimer = Math.min(BONUS_DURATION, this.bonusTimer + (lvl >= 2 ? 4.0 : 3.0));
          particles.shake(14, 0.45);
          particles.flash('#ffffff', 0.45);
          particles.addPop(this.bonusPacPos.x, this.bonusPacPos.y - 30, 'TSUNAMI DE LUMIÈRE (+3s) !', '#ffffff', 24);
          const killCount = Math.floor(this.bonusActiveCount * 0.65);
          for (let s = 0; s < killCount; s++) {
            const g = this.bonusGhosts[s];
            g.alive = false;
            killsThisFrame++;
            this.bonusKills++;
            const ghostPts = 320 + Math.min(3000, this.bonusKills * 25);
            this.bonusScore += ghostPts;
            this.score += ghostPts;
            frameScore += ghostPts;
            particles.emit(g.x, g.y, 6, '#ffffff', { speed: 190, size: 4, life: 0.6 });
          }
          this.bonusGhosts.splice(0, killCount);
          for (let k = 0; k < killCount; k++) {
            this.bonusGhosts.push({ x: 0, y: 0, vx: 0, vy: 0, speed: 150, orbitFactor: 1, swirlDir: 1, color: '#ffd700', alive: false });
          }
          this.bonusActiveCount = Math.max(0, this.bonusActiveCount - killCount);
          break;
        }
      }
    }
    input.isItemRequested = false;

    // Motion Kombos in vortex arena
    input.checkKombos(
      (lvl) => {
        sounds.play('powerup');
        particles.shake(6, 0.2);
        particles.addPop(this.bonusPacPos.x, this.bonusPacPos.y - 20, 'WIGGLE EMP !', '#00ffff', 20);
        for (let i = 0; i < this.bonusActiveCount; i++) {
          const g = this.bonusGhosts[i];
          if (Math.hypot(g.x - this.bonusPacPos.x, g.y - this.bonusPacPos.y) < (lvl >= 2 ? 180 : 130)) {
            g.speed *= 0.25;
            particles.emit(g.x, g.y, 4, '#00ffff', { speed: 90, size: 3, life: 0.35 });
          }
        }
      },
      () => {
        sounds.play('dash');
        particles.addPop(this.bonusPacPos.x, this.bonusPacPos.y - 20, 'NITRO JET !', '#ff6600', 20);
      }
    );
    input.updateCooldowns(dt, this.bonusPacPos);

    // Dash streaks life update
    for (let i = this.player.dashStreaks.length - 1; i >= 0; i--) {
      const s = this.player.dashStreaks[i];
      s.life -= dt;
      if (s.life <= 0) this.player.dashStreaks.splice(i, 1);
    }

    this.bonusPacPos.x += this.bonusPacVel.x * dt;
    this.bonusPacPos.y += this.bonusPacVel.y * dt;
    this.bonusPacPos.x = Math.max(35, Math.min(BONUS_ARENA_W - 35, this.bonusPacPos.x));
    this.bonusPacPos.y = Math.max(35, Math.min(BONUS_ARENA_H - 35, this.bonusPacPos.y));

    // Dynamic Swarm Target Population scaling through the 15-second narrative arc:
    // 0.0 - 0.20 (Phase I : 15s->12s): 75 - 130
    // 0.20 - 0.53 (Phase II : 12s->7s): 130 - 300
    // 0.53 - 0.83 (Phase III : 7s->2.5s): 300 - 480
    // 0.83 - 1.00 (Phase IV : 2.5s->0s): 480 - 520 (Climax Singularity!)
    const progress = Math.max(0, Math.min(1, 1 - (this.bonusTimer / BONUS_DURATION)));
    let targetPopulation = 75;
    if (progress < 0.20) {
      targetPopulation = Math.round(75 + (progress / 0.20) * 55);
    } else if (progress < 0.53) {
      const p = (progress - 0.20) / 0.33;
      targetPopulation = Math.round(130 + p * 170);
    } else if (progress < 0.83) {
      const p = (progress - 0.53) / 0.30;
      targetPopulation = Math.round(300 + p * 180);
    } else {
      const p = (progress - 0.83) / 0.17;
      targetPopulation = Math.round(480 + p * 40);
    }
    targetPopulation = Math.min(BONUS_SWARM_MAX, targetPopulation);

    // Replenish active entities up to targetPopulation using Object Pool (zero allocations!)
    const colors = ['#00f0ff', '#ff007f', '#ffd700', '#00ffaa', '#b000ff', '#ff6600'];
    const spawnBatch = Math.min(18, targetPopulation - this.bonusActiveCount);
    for (let s = 0; s < spawnBatch && this.bonusActiveCount < this.bonusGhosts.length; s++) {
      const g = this.bonusGhosts[this.bonusActiveCount];
      const edge = (Math.random() * 4) | 0;
      let gx = 0, gy = 0;
      if (edge === 0) { gx = Math.random() * BONUS_ARENA_W; gy = 15; }
      else if (edge === 1) { gx = Math.random() * BONUS_ARENA_W; gy = BONUS_ARENA_H - 15; }
      else if (edge === 2) { gx = 15; gy = Math.random() * BONUS_ARENA_H; }
      else { gx = BONUS_ARENA_W - 15; gy = Math.random() * BONUS_ARENA_H; }

      g.x = gx;
      g.y = gy;
      g.vx = 0;
      g.vy = 0;
      g.color = colors[(Math.random() * colors.length) | 0];
      g.alive = true;
      g.speed = 135 + Math.random() * 75 + (progress > 0.8 ? 35 : 0);
      g.orbitFactor = 0.4 + Math.random() * 0.8;
      g.swirlDir = Math.random() < 0.5 ? 1 : -1;
      this.bonusActiveCount++;
    }

    // Dynamic Force Field radius: starts small (28px) and expands smoothly up to 115px!
    const curRad = Math.min(BONUS_FORCE_FIELD_MAX_RAD, BONUS_FORCE_FIELD_BASE_RAD + Math.sqrt(this.bonusKills) * 3.8);
    const curRadSq = curRad * curRad;

    // Fast O(1) Swarm Simulation with Swirling Vortex Motion & Zero-Square-Root Collisions
    for (let i = 0; i < this.bonusActiveCount; i++) {
      const g = this.bonusGhosts[i];
      const dx = this.bonusPacPos.x - g.x;
      const dy = this.bonusPacPos.y - g.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= curRadSq) {
        // Ghost Obliterated!
        g.alive = false;
        killsThisFrame++;
        this.bonusKills++;

        // Real-time points on each enemy killed!
        const ghostPts = 200 + Math.min(3000, this.bonusKills * 25);
        this.bonusScore += ghostPts;
        this.score += ghostPts;
        frameScore += ghostPts;

        // Floating points popup & visual sparks directly on the killed enemy
        particles.addPop(g.x, g.y - 12, '+' + ghostPts, '#ffd700', 14);
        particles.emit(g.x, g.y, 8, g.color, { speed: 130, size: 3.5, life: 0.45 });

        // O(1) Swap-and-Pop removal from active pool
        const lastIndex = this.bonusActiveCount - 1;
        if (i !== lastIndex) {
          const temp = this.bonusGhosts[i];
          this.bonusGhosts[i] = this.bonusGhosts[lastIndex];
          this.bonusGhosts[lastIndex] = temp;
        }
        this.bonusActiveCount--;
        i--;
      } else {
        // Swirling organic vortex movement
        const dist = Math.sqrt(distSq) || 1;
        const nx = dx / dist;
        const ny = dy / dist;
        const tx = -ny * g.swirlDir;
        const ty = nx * g.swirlDir;

        // Tangential swirl is stronger at mid-distance, pure radial suction when close
        const swirlStrength = Math.max(0, Math.min(0.65, (dist - curRad) / 260)) * g.orbitFactor;
        const finalVx = (nx * (1 - swirlStrength * 0.45) + tx * swirlStrength) * g.speed;
        const finalVy = (ny * (1 - swirlStrength * 0.45) + ty * swirlStrength) * g.speed;

        g.vx = finalVx;
        g.vy = finalVy;
        g.x += finalVx * dt;
        g.y += finalVy * dt;
      }
    }

    // Process aggregated frame kills & audio feedback
    if (killsThisFrame > 0) {
      this.bonusBatchKills += killsThisFrame;
      this.bonusBatchScore += frameScore;
      this.bonusBatchTimer = 0.14; // Window to aggregate consecutive frame kills

      // Sound & VFX throttling
      sounds.play('crunch');
      particles.shake(Math.min(5, 1.2 + killsThisFrame * 0.25), 0.08);

      // Trigger instant multikill banner if large spike occurs
      if (this.bonusBatchKills >= 20) {
        this.triggerMultikillBanner();
      }
    }

    // End of 15 seconds: Cosmic Singularity Climax & Terminal Shockwave!
    if (this.bonusTimer <= 0) {
      this.bonusTimer = 0;
      this.bonusTallyTimer = 2.0;
      this.bonusShockwave = { radius: curRad, life: 1.0 };
      sounds.play('badge');
      sounds.play('portal');
      particles.shake(12, 0.45);

      // Disintegrate all remaining active ghosts in a supernova of sparks & award points for each!
      for (let i = 0; i < this.bonusActiveCount; i++) {
        const g = this.bonusGhosts[i];
        this.bonusKills++;
        const ghostPts = 200 + Math.min(3000, this.bonusKills * 25);
        this.bonusScore += ghostPts;
        this.score += ghostPts;
        particles.addPop(g.x, g.y - 12, '+' + ghostPts, '#ffd700', 14);
        particles.emit(g.x, g.y, 8, g.color, { speed: 170, size: 4, life: 0.65 });
      }
      this.bonusActiveCount = 0;

      // Vortex Kills 100:1 Ratio attribution (User requested 100 pour 1 plutôt que 10 pour 1)
      const careerBonusKills = Math.floor(this.bonusKills / 100);
      if (careerBonusKills > 0) {
        const prevCareer = profileManager.profile.careerGhosts;
        progression.addGhostKills(careerBonusKills);
        this.checkArenaUnlock(prevCareer);
        if (this.gameMode === 'madness') {
          this.madnessKills += careerBonusKills;
        }
        particles.addPop(BONUS_ARENA_W / 2, BONUS_ARENA_H / 2 - 70, `+${careerBonusKills} KILLS CARRIÈRE (100:1)`, '#ffd700', 20);
      }

      if (this.bonusKills >= 50) {
        badges.unlock('bonus50');
      }
    }
  }

  private triggerMultikillBanner() {
    if (this.bonusBatchKills <= 0) return;
    const bk = this.bonusBatchKills;
    const sc = this.bonusBatchScore;
    let title = `MULTIKILL x${bk}`;
    let col = '#00f0ff';
    if (bk >= 75) {
      title = `APOCALYPSE x${bk}`;
      col = '#ff0055';
    } else if (bk >= 40) {
      title = `CATACLYSME x${bk}`;
      col = '#ffd700';
    } else if (bk >= 20) {
      title = `OBLITÉRATION x${bk}`;
      col = '#d946ef';
    }
    this.bonusMultikillBanner = {
      text: title,
      subtext: `+${sc.toLocaleString('fr-FR')} PTS`,
      col,
      life: 0.85
    };
    this.bonusBatchKills = 0;
    this.bonusBatchScore = 0;
    this.bonusBatchTimer = 0;
  }

  private checkCollisions() {
    if (this.state !== 'playing') return;
    const pp = this.player.getPos();

    for (const e of this.enemyManager.enemies) {
      if (e.st === 'dead' || e.st === 'return' || e.st === 'spawn') continue;
      const ep = this.enemyManager.getPos(e);
      const d = Math.hypot(pp.x - ep.x, pp.y - ep.y);

      if (d < HIT_DIST) {
        if (this.player.invuln > 0) continue;
        if (e.st === 'flee' || e.frozen) {
          this.onKillGhost(e, ep.x, ep.y);
        } else if (powerups.fx.phase > 0) {
          continue;
        } else if (this.combo.m >= 32) {
          // x32 GOD MODE INVINCIBLE: Devour ghost on contact!
          this.onKillGhost(e, ep.x, ep.y);
          particles.shake(6, 0.2);
          particles.addPop(ep.x, ep.y - 15, 'x32 ANNIHILATION !', '#ffd700', 18);
          sounds.play('pellet');
        } else {
          // Pac-Man is MORTAL in Madness mode!
          this.playerDie();
          return;
        }
      } else if (d < NM_DIST && e.st === 'active') {
        if (!e.nm) {
          e.nm = true;
          this.nearMissCount++;
          if (this.nearMissCount >= 5) badges.unlock('closeCall');
          this.score += 50 * this.combo.m;
          particles.addPop(pp.x, pp.y - 20, 'CLOSE !', '#ffff00', 14);
          particles.emit(pp.x, pp.y, 4, '#ffff00', { speed: 60, size: 2, life: 0.3 });
          sounds.play('near');
          if (this.gameMode === 'madness') {
            const unlockedPool = progression.getUnlockedSuperItems();
            superItems.addEnergy(4.0, unlockedPool);
            const maxChrono = progression.getSkillLevel('chrono') === 2 ? 150 : CHRONO_MAX;
            this.chronoEnergy = Math.min(maxChrono, this.chronoEnergy + CHRONO_NM_RECHARGE);
          }
        }
      } else {
        e.nm = false;
      }
    }
  }

  private onCollectDot(c: number, r: number) {
    if (this.maze.dotMap[r][c] > 0) {
      const isPellet = this.maze.dotMap[r][c] === 3;
      this.maze.dotMap[r][c] = 0;
      this.maze.remainingDots--;
      const px = c * T + HALF, py = r * T + HALF;

      if (isPellet) {
        const pts = 50 * this.combo.m;
        this.score += pts;
        particles.addPop(px, py - 15, '+' + pts, '#ff5555', 18);
        particles.emit(px, py, 20, C_PELLET, { speed: 100, size: 4, life: 0.6 });
        powerups.triggerPredator(this.enemyManager.enemies);
        particles.shake(4, 0.2);
        sounds.play('pellet');
        this.player.addSuperPelletBoost();

        // Les grosses boules (super-pellets) font remonter le timer et progresser le combo !
        this.combo.n += 4;
        const oldM = this.combo.m;
        const tier = getComboTier(this.combo.n);
        this.combo.m = CM[tier];

        // Power pellet boosts combo timer by +1.2s (strictly capped at COMBO_DECAY = 2.0s max)
        this.combo.t = Math.min(COMBO_DECAY, this.combo.t + 1.2);
        if (this.combo.m >= 32) {
          particles.addPop(px, py - 32, '+1.2s RECHARGE x32 !', '#00ffff', 20);
        }

        if (this.gameMode === 'madness') {
          this.madnessTimer = Math.min(45, this.madnessTimer + 3.0);
          const unlockedPool = progression.getUnlockedSuperItems();
          superItems.addEnergy(12.0, unlockedPool);
          const maxChrono = progression.getSkillLevel('chrono') === 2 ? 150 : CHRONO_MAX;
          this.chronoEnergy = Math.min(maxChrono, this.chronoEnergy + 6.0);
        }

        if (this.combo.m > oldM && this.combo.m > 1) {
          this.triggerComboStep(tier, px, py);
        }
      } else {
        if (this.gameMode === 'madness') {
          this.madnessTimer = Math.min(45, this.madnessTimer + 0.04);
          const unlockedPool = progression.getUnlockedSuperItems();
          superItems.addEnergy(0.7, unlockedPool);
          const maxChrono = progression.getSkillLevel('chrono') === 2 ? 150 : CHRONO_MAX;
          this.chronoEnergy = Math.min(maxChrono, this.chronoEnergy + CHRONO_DOT_RECHARGE);
        }
        this.player.addDotSpeed();
        this.combo.n++;
        const oldM = this.combo.m;
        const tier = getComboTier(this.combo.n);
        this.combo.m = CM[tier];

        // Normal dot sustains combo timer
        this.combo.t = COMBO_DECAY;

        const pts = 10 * this.combo.m;
        this.score += pts;

        // Floating +XXX score popup above eaten dot!
        particles.addPop(px, py - 10, '+' + pts, CC[tier], 10 + tier * 2);
        particles.emit(px, py, 2 + tier * 2, C_DOT, { speed: 40 + tier * 20, size: 2 + tier, life: 0.3 + tier * 0.1 });
        sounds.play('dot');

        if (this.combo.m > oldM && this.combo.m > 1) {
          this.triggerComboStep(tier, px, py);
        }
      }

      if (this.combo.n > this.bestCombo) this.bestCombo = this.combo.n;

      if (this.maze.remainingDots <= 0 && this.state === 'playing') {
        const completedLvl = this.maze.currentLevel;
        const isMadness = this.gameMode === 'madness';
        const list = this.getCurrentLevelList();

        const bonus = 2000 + (this.wave - 1) * 500;
        this.score += bonus;
        particles.addPop(px, py - 25, `+${bonus} BONUS NIVEAU !`, '#ffd700', 22);
        sounds.play('powerup');
        particles.flash('#ffd700', 0.25);
        particles.shake(6, 0.25);

        // When completing Level 10 (last level), loop back to Level 1 and increase speed by +10%!
        if (completedLvl === list.length - 1) {
          this.loopCount++;
          badges.unlock('loop1');
          if (this.loopCount >= 2) badges.unlock('loop2');
          particles.addPop(CW / 2, HUD_H + 60, `BOUCLE ${this.loopCount + 1} ! (+${this.loopCount * 10}% VITESSE)`, '#ffd700', 24);
          particles.flash('#ffd700', 0.45);
          particles.shake(12, 0.4);
        }

        this.wave++;
        if (this.wave >= 5 || this.maze.currentLevel >= 4) badges.unlock('wave5');

        const nextLvl = (completedLvl + 1) % list.length;
        this.warpToLevel(nextLvl);
      }
    }
  }

  private triggerComboStep(tier: number, px: number, py: number) {
    const mult = CM[tier];
    const col = CC[tier];

    if (mult === 4) {
      sounds.play('powerup');
      particles.addPop(px, py - 30, 'COMBO x4 !', col, 20);
      particles.emit(px, py, 14, col, { speed: 80, size: 3.5, life: 0.4 });
    } else if (mult === 8) {
      sounds.play('powerup');
      particles.shake(4, 0.2);
      particles.addPop(px, py - 34, 'COMBO x8 !!', col, 24);
      particles.emit(px, py, 22, col, { speed: 120, size: 4.5, life: 0.5 });
      badges.unlock('combo8');
    } else if (mult === 16) {
      sounds.play('nova');
      particles.shake(6, 0.25);
      particles.flash(col, 0.2);
      particles.addPop(px, py - 38, 'COMBO x16 !!!', col, 28);
      particles.emit(px, py, 30, col, { speed: 160, size: 5.5, life: 0.6 });
      badges.unlock('combo16');
    } else if (mult >= 32) {
      sounds.play('nova');
      sounds.play('powerup');
      particles.shake(10, 0.35);
      particles.flash('#ffd700', 0.3);
      particles.addPop(px, py - 42, 'COMBO x32 !', '#ffd700', 32);
      particles.emit(px, py, 40, '#ffd700', { speed: 200, size: 5.5, life: 0.7 });
      this.combo.t = COMBO_DECAY;
      badges.unlock('combo32');
    }
  }

  private update(dt: number) {
    this.time += dt;
    input.pollGamepad();

    // Smooth animated score
    if (this.dScore < this.score) {
      this.dScore += Math.max(1, (this.score - this.dScore) * dt * 8);
      if (this.dScore > this.score) this.dScore = this.score;
    }

    // Inputs
    if (input.isAudioToggleRequested) {
      sounds.toggleMute();
      input.isAudioToggleRequested = false;
    }
    if (input.isSelectMode1Requested && this.state === 'menu') {
      this.setGameMode('madness');
      sounds.play('nova');
      input.isSelectMode1Requested = false;
    }
    if (input.isSelectMode2Requested && this.state === 'menu') {
      this.setGameMode('classic');
      sounds.play('click');
      input.isSelectMode2Requested = false;
    }
    if (input.isLeaderboardRequested) {
      if (this.state === 'menu' || this.state === 'gameover') {
        this.state = 'leaderboard';
        this.leaderboardMode = this.gameMode;
        leaderboard.syncRemote();
        sounds.play('click');
      } else if (this.state === 'leaderboard') {
        this.state = 'menu';
        sounds.play('click');
      }
      input.isLeaderboardRequested = false;
    }

    if (this.state === 'leaderboard') {
      if (input.isSelectMode1Requested) {
        this.leaderboardMode = 'madness';
        sounds.play('click');
        input.isSelectMode1Requested = false;
      }
      if (input.isSelectMode2Requested) {
        this.leaderboardMode = 'classic';
        sounds.play('click');
        input.isSelectMode2Requested = false;
      }
      if (input.isPauseRequested || input.isStartRequested) {
        this.state = 'menu';
        sounds.play('click');
        input.isPauseRequested = false;
        input.isStartRequested = false;
      }
      return;
    }

    if (input.isBadgesRequested) {
      if (this.state === 'menu' || this.state === 'gameover') {
        this.state = 'codex';
        this.codexTab = 'badges';
        sounds.play('click');
      } else if (this.state === 'codex' && this.codexTab === 'badges') {
        this.state = 'menu';
        sounds.play('click');
      } else if (this.state === 'codex' && this.codexTab === 'skills') {
        this.codexTab = 'badges';
        sounds.play('click');
      }
      input.isBadgesRequested = false;
    }

    if (input.isCodexRequested) {
      if (this.state === 'menu' || this.state === 'gameover') {
        this.state = 'codex';
        this.codexTab = 'skills';
        sounds.play('click');
      } else if (this.state === 'codex' && this.codexTab === 'skills') {
        this.state = 'menu';
        sounds.play('click');
      } else if (this.state === 'codex' && this.codexTab === 'badges') {
        this.codexTab = 'skills';
        sounds.play('click');
      }
      input.isCodexRequested = false;
    }

    if (input.isInstructionsRequested) {
      if (this.state === 'menu' || this.state === 'gameover') {
        this.state = 'instructions';
        sounds.play('click');
      } else if (this.state === 'instructions') {
        this.state = 'menu';
        sounds.play('click');
      }
      input.isInstructionsRequested = false;
    }

    if (input.isRestoreRequested) {
      if (this.state === 'menu') {
        this.showRestoreModal();
      }
      input.isRestoreRequested = false;
    }

    if (this.state === 'instructions') {
      if (input.isPauseRequested || input.isStartRequested) {
        this.state = 'menu';
        sounds.play('click');
        input.isPauseRequested = false;
        input.isStartRequested = false;
      }
      return;
    }

    if (this.state === 'codex') {
      if (input.isPauseRequested || input.isStartRequested) {
        this.state = 'menu';
        sounds.play('click');
        input.isPauseRequested = false;
        input.isStartRequested = false;
      }
      return;
    }

    if (input.isRestartRequested) {
      if (this.state === 'playing' || this.state === 'paused' || this.state === 'dying' || this.state === 'ready') {
        this.startGame(this.gameMode);
        sounds.play('start');
      }
      input.isRestartRequested = false;
    }

    if (input.isPauseRequested) {
      if (this.state === 'playing') this.state = 'paused';
      else if (this.state === 'paused') this.state = 'playing';
      input.isPauseRequested = false;
    }
    if (input.isStartRequested) {
      if (this.state === 'menu' || this.state === 'gameover') {
        this.startGame(this.gameMode);
        input.isStartRequested = false;
      }
    }

    const is32xGod = this.combo.m >= 32 || this.state === 'bonus';
    sounds.updateBGM(
      dt,
      this.state === 'playing' || this.state === 'bonus',
      is32xGod,
      this.gameMode === 'madness' || this.state === 'bonus'
    );
    badges.update(dt);
    particles.update(dt);

    if (this.hitlag > 0) {
      this.hitlag -= dt;
      return;
    }

    switch (this.state) {
      case 'ready':
        this.readyT -= dt;
        if (this.readyT <= 0) this.state = 'playing';
        break;

      case 'playing': {
        const isMadness = this.gameMode === 'madness';

        // Bullet Time (Chrono-Shift) - only in Madness Mode when unlocked (>= 50 frags)
        const chronoLevel = progression.getSkillLevel('chrono');
        const isChronoUnlocked = isMadness && chronoLevel >= 1;
        const maxChronoEnergy = chronoLevel === 2 ? 150 : CHRONO_MAX;
        const chronoPassive = chronoLevel === 2 ? CHRONO_PASSIVE_RECHARGE * 1.5 : CHRONO_PASSIVE_RECHARGE;

        if (isChronoUnlocked) {
          const wantChrono = (input.isChronoKeyHeld || input.isChronoRequested) && this.chronoEnergy > 5;
          if (wantChrono) {
            this.isChronoActive = true;
            this.chronoEnergy = Math.max(0, this.chronoEnergy - CHRONO_DRAIN * dt);
            if (this.chronoEnergy <= 0) {
              this.isChronoActive = false;
              input.isChronoRequested = false;
            }
          } else {
            this.isChronoActive = false;
            this.chronoEnergy = Math.min(maxChronoEnergy, this.chronoEnergy + chronoPassive * dt);
          }
        } else {
          this.isChronoActive = false;
          input.isChronoRequested = false;
        }
        sounds.setChronoActive(this.isChronoActive);

        // Update mobile touch deck chrono button & label
        const chBtn = document.getElementById('chrono-btn');
        if (chBtn) {
          const chWrap = chBtn.parentElement;
          if (chWrap) chWrap.style.display = isChronoUnlocked ? 'flex' : 'none';
          if (this.isChronoActive) chBtn.classList.add('active-chrono');
          else chBtn.classList.remove('active-chrono');
        }
        const chLbl = document.getElementById('chrono-label');
        if (chLbl) chLbl.innerText = isChronoUnlocked ? `${Math.round(this.chronoEnergy)}%` : 'LOCK';

        const activeChronoScale = chronoLevel === 2 ? CHRONO_TIMESCALE_V2 : CHRONO_TIMESCALE;
        const timeScale = this.isChronoActive ? activeChronoScale : 1.0;

        // Madness Swarm timer
        if (isMadness) {
          this.madnessTimer -= dt * timeScale;
          if (this.madnessTimer <= 0) {
            this.madnessTimer = 0;
            this.triggerGameOver();
            return;
          }
          this.madnessSpawnTimer -= dt * timeScale;
          if (this.madnessSpawnTimer <= 0) {
            this.madnessSpawnTimer = Math.max(0.18, 0.75 - this.madnessKills * 0.004);
            this.enemyManager.spawnMadness(1 + (this.madnessKills > 50 ? 1 : 0), this.madnessKills, this.maze);
          }
        }

        // Action inputs
        if (input.isDashRequested) {
          this.player.triggerDash(
            this.maze,
            isMadness,
            this.enemyManager.enemies,
            (e, x, y) => this.onKillGhost(e, x, y),
            (c, r) => this.onCollectDot(c, r),
            powerups.fx.magnet > 0,
            powerups.fx.overdrive > 0
          );
          input.isDashRequested = false;
        }

        if (input.isItemRequested) {
          superItems.trigger(
            this.player.getPos(),
            this.enemyManager.enemies,
            (e, x, y) => this.onKillGhost(e, x, y),
            (s) => { this.madnessTimer = Math.min(45, this.madnessTimer + s); },
            () => { powerups.fx.overdrive = 8.0; }
          );
          input.isItemRequested = false;
        }

        // Motion Kombos
        if (isMadness) {
          input.checkKombos(
            (lvl: number) => {
              // Wiggle EMP blast
              const pp = this.player.getPos();
              const isV2 = lvl >= 2;
              sounds.play('nova');
              particles.shake(isV2 ? 10 : 7, 0.25);
              particles.flash(isV2 ? '#00e5ff' : '#00ffff', 0.35);
              particles.addPop(pp.x, pp.y - 26, isV2 ? 'GIGA EMP V2 !' : 'WIGGLE EMP BLAST !', '#00ffff', 20);
              particles.emit(pp.x, pp.y, isV2 ? 35 : 16, isV2 ? '#00e5ff' : '#00ffff', { speed: isV2 ? 240 : 180, size: 5, life: 0.6 });
              const blastRad = isV2 ? T * 8.5 : T * 4.8;
              for (const e of this.enemyManager.enemies) {
                if (e.st !== 'dead' && e.st !== 'return') {
                  const ep = this.enemyManager.getPos(e);
                  if (Math.hypot(ep.x - pp.x, ep.y - pp.y) < blastRad) {
                    if (isV2) e.st = 'flee';
                    this.onKillGhost(e, ep.x, ep.y);
                  }
                }
              }
              for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < this.maze.cols; c++) {
                  if (this.maze.dotMap[r][c]) {
                    const dx = c * T + HALF - pp.x, dy = r * T + HALF - pp.y;
                    if (Math.hypot(dx, dy) < blastRad * 1.1) this.onCollectDot(c, r);
                  }
                }
              }
            },
            (lvl: number) => {
              // Nitro Flame Jet
              const isV2 = lvl >= 2;
              sounds.play('dash');
              particles.shake(isV2 ? 8 : 6, 0.22);
              particles.flash(isV2 ? '#00ffff' : '#ff7700', 0.28);
              const pp = this.player.getPos();
              particles.addPop(pp.x, pp.y - 26, isV2 ? 'PLASMA BURNER V2 !' : 'NITRO FLAME JET !', isV2 ? '#00ffff' : '#ff7700', 20);
            }
          );
        }

        input.updateCooldowns(dt, this.player.getPos());

        // Incinerate ghosts touching nitro trail
        if (input.nitroActive > 0) {
          for (const tp of input.nitroTrail) {
            for (const e of this.enemyManager.enemies) {
              if (e.st !== 'dead' && e.st !== 'return') {
                const ep = this.enemyManager.getPos(e);
                if (Math.hypot(ep.x - tp.x, ep.y - tp.y) < T * 0.95) {
                  this.onKillGhost(e, ep.x, ep.y);
                }
              }
            }
          }
        }

        // Entities update
        // Tone down x32 excessive speed (+18% max instead of +35%)
        const comboSpeedMult = this.loopSpeedMultiplier * (1 + (this.combo.m > 1 ? Math.min(0.18, Math.log2(this.combo.m) * 0.036) : 0));
        const chronoScale = this.isChronoActive ? timeScale : 1.0;
        this.player.update(
          dt,
          this.maze,
          isMadness,
          input.nitroActive > 0,
          input.nextDir,
          (c, r) => this.onCollectDot(c, r),
          comboSpeedMult,
          input.heldDirections,
          chronoScale
        );
        this.enemyManager.update(dt * timeScale, this.maze, this.player.getPos(), powerups.fx.timewarp);

        // Force Field suction (Dots & Frightened Ghosts) - ONLY in Mode Madness, scaled in 16:9 (T * 3.4 vs T * 2.2)
        if (isMadness && powerups.fx.magnet > 0) {
          const isWide = this.maze.cols > 21;
          const baseR = isWide ? T * 3.4 : T * 2.2;
          const comboBoost = this.combo.m >= 32 ? 1.25 : (this.combo.m >= 16 ? 1.15 : (this.combo.m >= 8 ? 1.08 : 1.0));
          const r = baseR * comboBoost;
          const pp = this.player.getPos();

          // Vacuum dots in immediate radius
          for (let row = 0; row < this.maze.rows; row++) {
            for (let c = 0; c < this.maze.cols; c++) {
              if (this.maze.dotMap[row][c]) {
                const dx = c * T + HALF - pp.x, dy = row * T + HALF - pp.y;
                if (Math.hypot(dx, dy) < r) this.onCollectDot(c, row);
              }
            }
          }

          // Kill frightened & frozen ghosts in close proximity
          const ghostKillR = isWide ? T * 2.6 : T * 1.8;
          for (const e of this.enemyManager.enemies) {
            if ((e.st === 'flee' || e.frozen) && e.st !== 'dead' && e.st !== 'return') {
              const ep = this.enemyManager.getPos(e);
              const dist = Math.hypot(pp.x - ep.x, pp.y - ep.y);
              if (dist < ghostKillR) {
                particles.emit(ep.x, ep.y, 18, '#ff007f', { speed: 140, size: 4, life: 0.45 });
                this.onKillGhost(e, ep.x, ep.y);
              }
            }
          }
        }

        // Overdrive: Zero cooldown & electric sparks
        if (powerups.fx.overdrive > 0) {
          this.player.dashCd = 0;
          if (Math.random() < 0.35) {
            const pp = this.player.getPos();
            particles.emit(pp.x, pp.y, 2, '#00ffcc', { speed: 90, size: 3.5, life: 0.3 });
          }
        }

        // Sync DOM dash button state
        const dBtn = document.getElementById('dash-btn');
        const dLbl = document.getElementById('dash-label');
        if (dBtn && dLbl) {
          if (powerups.fx.overdrive > 0) {
            dBtn.classList.remove('cooling');
            dLbl.textContent = 'NO-CD ' + powerups.fx.overdrive.toFixed(1) + 's';
            dLbl.style.color = '#00ffcc';
          } else if (this.player.dashCd > 0) {
            dBtn.classList.add('cooling');
            dLbl.textContent = this.player.dashCd.toFixed(1) + 's';
            dLbl.style.color = '#8899aa';
          } else {
            dBtn.classList.remove('cooling');
            dLbl.textContent = 'READY';
            dLbl.style.color = '#00ffff';
          }
        }

        // Powerups & Void relic (Pass isPowerful state for dynamic Force Field priority)
        const isPlayerPowerful = (this.combo.m >= 4) || (this.madnessStreak >= 8) || (this.player.pelletSpeedBonus >= 1.2) || (powerups.fx.overdrive > 0) || (powerups.pred.on);
        powerups.update(
          dt * chronoScale,
          isMadness,
          this.maze,
          this.player.getPos(),
          this.enemyManager.enemies,
          () => {
            // Titan transform
            sounds.play('death');
            particles.shake(12, 0.4);
            particles.flash('#ff0033', 0.5);
            this.madnessTimer = Math.max(2, this.madnessTimer - 6.0);
            particles.addPop(CW / 2, 70, 'TITAN DU VIDE CRÉÉ ! (-6s)', '#ff0033', 20);
          },
          () => {
            // Void Core intercepted
            this.score += 5000;
            this.madnessTimer = Math.min(45, this.madnessTimer + 6.0);
            sounds.play('powerup');
            particles.shake(8, 0.3);
            particles.flash('#00ffff', 0.4);
            particles.addPop(CW / 2, 70, 'CŒUR DU VIDE ANÉANTI ! (+6s & FORCE FIELD)', '#00ffff', 20);
          },
          (px, py) => {
            // Nova collection
            for (const e of this.enemyManager.enemies) {
              if (e.st !== 'dead' && e.st !== 'return') {
                const ep = this.enemyManager.getPos(e);
                if (Math.hypot(px - ep.x, py - ep.y) < T * 4) this.onKillGhost(e, ep.x, ep.y);
              }
            }
          },
          () => this.enterBonusStage(),
          isPlayerPowerful
        );

        // Super-Items update (with wall-safe gravitational suction and dot suction)
        superItems.update(
          dt * chronoScale,
          this.player.getPos(),
          this.enemyManager.enemies,
          (e, x, y) => this.onKillGhost(e, x, y),
          this.maze,
          (c, r) => this.onCollectDot(c, r)
        );

        // Combo decay
        if (this.combo.n > 0) {
          this.combo.t -= dt * chronoScale;
          if (this.combo.t <= 0) {
            const wasGod = this.combo.m >= 32;
            this.combo.n = 0;
            this.combo.m = 1;
            this.combo.t = 0;
            if (wasGod) {
              const pp = this.player.getPos();
              particles.addPop(pp.x, pp.y - 20, 'FIN DU MODE x32', '#8899aa', 14);
            }
          } else {
            const tier = getComboTier(this.combo.n);
            this.combo.m = CM[tier];
          }
        }

        this.checkCollisions();
        break;
      }

      case 'dying':
        this.deathT -= dt;
        if (this.deathT <= 0) {
          if (this.lives > 0 && (this.gameMode !== 'madness' || this.madnessTimer > 0)) {
            const spdMult = this.loopSpeedMultiplier;
            this.player.reset(this.gameMode === 'madness', this.maze, spdMult);
            if (this.gameMode === 'madness') {
              this.state = 'playing';
              this.player.invuln = 2.0;
              particles.addPop(CW / 2, HUD_H + 32, 'BOUCLIER ACTIF (2s)', '#00ffff', 14);
            } else {
              this.enemyManager.spawnClassic(4, spdMult, this.maze);
              this.state = 'ready';
              this.readyT = 1.5;
            }
          } else {
            this.triggerGameOver();
          }
        }
        break;

      case 'waveTrans':
        this.state = 'playing';
        break;

      case 'bonus':
        this.updateBonusStage(dt);
        break;
    }
  }

  private render() {
    this.renderer.clear(this.maze.currentLevel, this.time, this.gameMode === 'madness');

    if (this.state === 'bonus') {
      const curRad = Math.min(BONUS_FORCE_FIELD_MAX_RAD, BONUS_FORCE_FIELD_BASE_RAD + Math.sqrt(this.bonusKills) * 3.8);
      this.renderer.drawBonusStage(
        this.bonusPacPos,
        this.bonusPacAngle,
        this.player.dashStreaks,
        this.bonusGhosts,
        this.bonusTimer,
        this.bonusKills,
        this.bonusScore,
        this.score,
        this.dScore,
        curRad,
        this.time,
        this.player,
        this.bonusActiveCount,
        this.bonusShockwave.radius,
        this.bonusMultikillBanner
      );
      if (this.bonusTallyTimer > 0) {
        this.renderer.drawBonusTally(this.bonusKills, this.bonusScore, this.time);
      }
      return;
    }

    if (this.state === 'menu') {
      const topClassic = Math.max(badges.hiScore, leaderboard.getTopScore('classic'));
      const topMadness = Math.max(badges.bestMadnessKills, leaderboard.getTopScore('madness'));
      this.renderer.drawMenu(this.gameMode, this.time, topClassic, topMadness);
      return;
    }

    if (this.state === 'leaderboard') {
      const entries = leaderboard.getEntries(this.leaderboardMode);
      this.renderer.drawLeaderboard(entries, this.leaderboardMode, this.time, this.playerRank, this.playerDate);
      return;
    }

    if (this.state === 'codex') {
      this.renderer.drawCodex(this.time, this.codexTab, this.badgePage);
      return;
    }

    if (this.state === 'instructions') {
      this.renderer.drawInstructions(this.time);
      return;
    }

    if (this.state === 'paused') {
      this.renderer.ctx.save();
      this.renderer.ctx.translate(particles.shk.x, HUD_H + particles.shk.y);
      this.renderer.ctx.drawImage(this.maze.mOff, 0, 0);

      // Electrified supercharged maze walls in 32x God Mode
      const is32xGod = this.combo.m >= 32;
      if (is32xGod) {
        this.renderer.drawMaze32xSupercharge(this.maze.mOff, this.time);
      }

      this.renderer.drawDots(this.maze, this.time);
      if (this.gameMode === 'madness') {
        powerups.draw(this.renderer.ctx, this.time);
      }
      this.enemyManager.draw(this.renderer.ctx, this.time, powerups.pred.warn, this.isChronoActive);
      this.player.draw(
        this.renderer.ctx,
        this.time,
        this.gameMode === 'madness',
        is32xGod,
        powerups.pred.on,
        powerups.pred.t,
        powerups.pred.maxT,
        this.combo,
        this.isChronoActive
      );
      this.renderer.ctx.restore();

      this.renderer.drawHUD(
        this.gameMode === 'madness',
        this.score, this.dScore, this.lives,
        this.madnessKills, this.madnessStreak, this.madnessTimer, badges.bestMadnessKills,
        superItems, this.time, this.player.dashCd, this.maze.currentLevel, this.wave, this.combo, badges.hiScore,
        powerups.fx.overdrive,
        this.loopCount,
        powerups.pred.on,
        powerups.pred.t,
        powerups.pred.maxT,
        powerups.pred.warn,
        this.chronoEnergy,
        this.isChronoActive,
        progression.getSkillLevel('chrono')
      );
      this.renderer.drawPause(this.gameMode === 'madness', this.madnessKills, this.madnessStreak, this.time);
      return;
    }

    // Maze translation
    this.renderer.ctx.save();
    this.renderer.ctx.translate(particles.shk.x, HUD_H + particles.shk.y);
    this.renderer.ctx.drawImage(this.maze.mOff, 0, 0);

    // Electrified supercharged maze walls in 32x God Mode
    const is32xGod = this.combo.m >= 32;
    if (is32xGod) {
      this.renderer.drawMaze32xSupercharge(this.maze.mOff, this.time);
    }

    this.renderer.drawDots(this.maze, this.time);
    this.renderer.drawDualSpawnMarkers(this.time, this.gameMode === 'madness');
    if (this.gameMode === 'madness') {
      powerups.draw(this.renderer.ctx, this.time);
      this.renderer.drawNitroTrail(input.nitroTrail);
      // Super-Item visuals (Lasers, Vortex, Tsunami)
      superItems.draw(this.renderer.ctx, this.player.getPos(), this.time);
    }

    this.enemyManager.draw(this.renderer.ctx, this.time, powerups.pred.warn, this.isChronoActive);
    this.player.draw(
      this.renderer.ctx,
      this.time,
      this.gameMode === 'madness',
      is32xGod,
      powerups.pred.on,
      powerups.pred.t,
      powerups.pred.maxT,
      this.combo,
      this.isChronoActive
    );

    // Overlays
    this.renderer.drawOverlays(powerups.fx, particles.flsh, this.player.getPos(), this.time, this.isChronoActive);
    particles.draw(this.renderer.ctx);

    // Ready text
    if (this.state === 'ready') {
      const c = this.renderer.ctx;
      c.fillStyle = 'rgba(7,7,15,0.4)';
      c.fillRect(0, 0, this.renderer.cw, ROWS * T);
      const txt = this.readyT > 1 ? 'READY ?' : this.readyT > 0.5 ? 'SET' : 'GO !';
      const sz = this.readyT > 0.5 ? 36 : 48;
      c.font = `bold ${sz}px monospace`;
      c.fillStyle = this.readyT > 0.5 ? '#fff' : '#00ffff';
      c.shadowColor = this.readyT > 0.5 ? '#fff' : '#00ffff';
      c.shadowBlur = 20;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(txt, this.renderer.cw / 2, (ROWS * T) / 2);
      c.shadowBlur = 0;
    }

    this.renderer.ctx.restore();

    // Danger border vignette (Madness mode low timer)
    if (this.gameMode === 'madness' && this.state === 'playing') {
      this.renderer.drawDangerVignette(this.madnessTimer, this.time);
    }

    // Touch button on-screen (only on mobile/touch devices, never on desktop)
    if (this.state === 'playing' && this.touchDeck.isTouch()) {
      this.renderer.drawTouchDashButton(this.player.dashCd, this.gameMode === 'madness' ? DASH_MADNESS_CD : DASH_CD);
    }

    // HUD & Badges
    this.renderer.drawHUD(
      this.gameMode === 'madness',
      this.score, this.dScore, this.lives,
      this.madnessKills, this.madnessStreak, this.madnessTimer, badges.bestMadnessKills,
      superItems, this.time, this.player.dashCd, this.maze.currentLevel, this.wave, this.combo, badges.hiScore,
      powerups.fx.overdrive,
      this.loopCount,
      powerups.pred.on,
      powerups.pred.t,
      powerups.pred.maxT,
      powerups.pred.warn,
      this.chronoEnergy,
      this.isChronoActive,
      progression.getSkillLevel('chrono')
    );
    badges.drawBanner(this.renderer.ctx);

    if (this.state === 'waveTrans') {
      this.renderer.drawWaveTrans(this.maze.currentLevel, this.wave, this.loopCount, this.gameMode === 'madness');
    }

    if (this.state === 'gameover') {
      const isNewHi = this.pendingScore >= badges.hiScore && this.pendingScore > 0;
      const bCount = Object.keys(badges.unlocked).length;
      const topMadness = Math.max(badges.bestMadnessKills, leaderboard.getTopScore('madness'));
      this.renderer.drawGameOver(
        this.pendingMode === 'madness',
        this.pendingScore, isNewHi, this.pendingKills, this.pendingStreak, topMadness, bCount, this.time,
        this.loopCount
      );
    }
  }

  private startLoop() {
    let lt = performance.now();
    const loop = (ts: number) => {
      const dt = Math.min((ts - lt) / 1000, 0.1);
      lt = ts;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

function initGame() {
  if ((window as any).game) return;
  (window as any).game = new Game();
  (window as any).powerups = powerups;
  (window as any).particles = particles;
  (window as any).profileManager = profileManager;
  (window as any).badges = badges;
  (window as any).superItems = superItems;
  (window as any).progression = progression;
  (window as any).input = input;
  (window as any).sounds = sounds;
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

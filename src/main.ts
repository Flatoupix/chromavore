// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — MAIN GAME ORCHESTRATOR & GAMELOOP
// ═══════════════════════════════════════════════════════════════

import { CW, CH, HUD_H, T, ROWS, COLS, HALF, DASH_CD, DASH_MADNESS_CD, HIT_DIST, NM_DIST, CM, DASH_BTN, CC, C_DOT, C_PELLET, COMBO_DECAY, getComboTier, GAME_VERSION } from './config/constants';
import { sounds } from './audio/SoundManager';
import { MazeManager, LEVELS, MADNESS_LEVELS } from './levels/levels';
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
  public state: 'menu' | 'ready' | 'playing' | 'paused' | 'dying' | 'waveTrans' | 'gameover' | 'leaderboard' | 'codex' = 'menu';
  public leaderboardMode: 'classic' | 'madness' = 'classic';
  public playerRank: number = 0;
  public playerDate: string = '';
  public gameMode: 'classic' | 'madness' = 'classic';
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
        restoreStatus.textContent = `Succès ! Profil ${p} chargé (${profileManager.profile.careerGhosts} 👻)`;
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
      particles.addPop(CW / 2, (ROWS * T) / 2, '⚠️ PROGRESSION RÉINITIALISÉE !', '#ff0055', 20);
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

    titleEl.textContent = '🏆 NOUVEAU RECORD !';
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
      const cx = (e.clientX - rect.left) * (CW / rect.width);
      const cy = (e.clientY - rect.top) * (CH / rect.height);

      if (this.state === 'menu') {
        // Navigation links click at bottom:
        // [S] ARSENAL | [B] SUCCÈS | [L] SCORES | [K] REPRENDRE
        if (cy >= CH * 0.93) {
          if (cx < CW * 0.28) {
            this.state = 'codex';
            this.codexTab = 'skills';
            sounds.play('dot');
            return;
          } else if (cx < CW * 0.54) {
            this.state = 'codex';
            this.codexTab = 'badges';
            sounds.play('dot');
            return;
          } else if (cx < CW * 0.78) {
            this.state = 'leaderboard';
            this.leaderboardMode = this.gameMode;
            leaderboard.syncRemote();
            sounds.play('dot');
            return;
          } else {
            this.showRestoreModal();
            return;
          }
        }
        // Copy sync code if tapping player line
        if (cy >= CH * 0.90 && cy < CH * 0.93) {
          navigator.clipboard?.writeText(profileManager.profile.syncCode);
          particles.addPop(CW / 2, CH * 0.91, '📋 CODE ID COPIÉ !', '#00ffff', 14);
          sounds.play('dot');
          return;
        }

        const my = CH * 0.44;
        if (cy >= my && cy <= my + 38) {
          if (cx >= CW / 2 - 145 && cx <= CW / 2 - 10) {
            this.gameMode = 'classic';
            sounds.play('dot');
            return;
          }
          if (cx >= CW / 2 + 10 && cx <= CW / 2 + 145) {
            this.gameMode = 'madness';
            sounds.play('nova');
            return;
          }
        }
        this.startGame(this.gameMode);
        return;
      }

      if (this.state === 'codex') {
        const tabW = 200, tabH = 26, tabY = 36;
        // Click Tab 1 (Skills)
        if (cy >= tabY && cy <= tabY + tabH && cx >= CW / 2 - tabW - 8 && cx <= CW / 2 - 8) {
          this.codexTab = 'skills';
          sounds.play('dot');
          return;
        }
        // Click Tab 2 (Badges)
        if (cy >= tabY && cy <= tabY + tabH && cx >= CW / 2 + 8 && cx <= CW / 2 + tabW + 8) {
          this.codexTab = 'badges';
          sounds.play('dot');
          return;
        }
        // If in badges and clicking bottom pagination
        if (this.codexTab === 'badges' && cy >= CH - 45) {
          if (cx > CW * 0.25 && cx < CW * 0.75) {
            this.badgePage = (this.badgePage + 1) % 2;
            sounds.play('dot');
            return;
          }
        }
        this.state = 'menu';
        sounds.play('dot');
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
          sounds.play('dot');
          return;
        }
        this.startGame(this.gameMode);
        return;
      }

      if (this.state === 'leaderboard') {
        if (cy <= 75) {
          this.leaderboardMode = this.leaderboardMode === 'classic' ? 'madness' : 'classic';
          sounds.play('dot');
          return;
        }
        this.state = 'menu';
        sounds.play('dot');
        return;
      }

      if (this.state === 'paused') {
        for (const btn of PAUSE_BUTTONS) {
          if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
            switch (btn.id) {
              case 'freezeFrame':
                settingsManager.toggleFreezeFrame();
                sounds.play('dot');
                return;
              case 'screenShake':
                settingsManager.toggleScreenShake();
                sounds.play('dot');
                return;
              case 'screenFlash':
                settingsManager.toggleScreenFlash();
                sounds.play('dot');
                return;
              case 'crtScanlines':
                settingsManager.toggleCrtScanlines();
                sounds.play('dot');
                return;
              case 'particleDensity':
                settingsManager.toggleParticleDensity();
                sounds.play('dot');
                return;
              case 'audio':
                sounds.toggleMute();
                return;
              case 'wipeData':
                this.showWipeModal();
                return;
              case 'resume':
                this.state = 'playing';
                sounds.play('dot');
                return;
              case 'restart':
                this.startGame(this.gameMode);
                sounds.play('start');
                return;
              case 'home':
                this.state = 'menu';
                sounds.play('dot');
                return;
            }
          }
        }
        // If clicking outside the cards or on resume, resume playing
        this.state = 'playing';
        return;
      }

      // Tap on-screen dash button (touch devices only)
      if (this.touchDeck.isTouch() && Math.hypot(cx - DASH_BTN.x, cy - DASH_BTN.y) < DASH_BTN.r + 14) {
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
          sounds.play('dot');
          e.preventDefault();
        } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
          settingsManager.toggleScreenShake();
          sounds.play('dot');
          e.preventDefault();
        } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
          settingsManager.toggleScreenFlash();
          sounds.play('dot');
          e.preventDefault();
        } else if (e.code === 'Digit4' || e.code === 'Numpad4') {
          settingsManager.toggleCrtScanlines();
          sounds.play('dot');
          e.preventDefault();
        } else if (e.code === 'Digit5' || e.code === 'Numpad5') {
          settingsManager.toggleParticleDensity();
          sounds.play('dot');
          e.preventDefault();
        }
      } else if (this.state === 'codex') {
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
          this.codexTab = 'skills';
          sounds.play('dot');
          e.preventDefault();
        } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
          this.codexTab = 'badges';
          sounds.play('dot');
          e.preventDefault();
        } else if (e.code === 'Tab') {
          this.codexTab = this.codexTab === 'skills' ? 'badges' : 'skills';
          sounds.play('dot');
          e.preventDefault();
        } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
          this.badgePage = (this.badgePage + 1) % 2;
          sounds.play('dot');
          e.preventDefault();
        }
      }
    });
  }

  public startGame(mode: 'classic' | 'madness') {
    this.gameMode = mode;
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

    this.loopCount = 0;

    superItems.resetAll();
    input.resetKombos();
    input.nextDir = { x: 0, y: 0 };
    powerups.voidRelic = null;
    powerups.voidRelicTimer = 14.0;
    particles.paintSplats = [];

    // Always start at Level 1
    const isMadness = this.gameMode === 'madness';
    this.maze.build(0, isMadness);
    this.player.reset(isMadness, this.maze, this.loopSpeedMultiplier);

    if (this.gameMode === 'madness') {
      this.enemyManager.enemies = [];
      this.enemyManager.spawnMadness(8, 0);
      this.state = 'ready';
      this.readyT = 1.5;
      sounds.play('powerup');
      particles.addPop(CW / 2, HUD_H + 50, '⚡ MADNESS SWARM ⚡', '#ffd700', 22);
    } else {
      this.enemyManager.spawnClassic(4, this.loopSpeedMultiplier);
      this.state = 'ready';
      this.readyT = 2.0;
      sounds.play('start');
    }
  }

  private warpToLevel(lvlIndex: number) {
    const isMadness = this.gameMode === 'madness';
    this.maze.build(lvlIndex, isMadness);
    if (!this.maze.isWalkable(this.player.x, this.player.y, false)) {
      this.player.reset(isMadness, this.maze);
    }
    // Wall safety: relocate any ghosts trapped in new layout
    for (const e of this.enemyManager.enemies) {
      if (e.st !== 'dead' && !this.maze.isWalkable(e.x, e.y, true)) {
        const safe = this.maze.findNearestWalkable(e.x, e.y, true);
        e.x = e.fx = safe.x;
        e.y = e.fy = safe.y;
        e.t = 1;
      }
    }
    // Wall safety: relocate any active powerup or relic trapped in new layout
    if (powerups.current && !this.maze.isWalkable(powerups.current.x, powerups.current.y, false)) {
      const safe = this.maze.findNearestWalkable(powerups.current.x, powerups.current.y, false);
      powerups.current.x = safe.x;
      powerups.current.y = safe.y;
    }
    if (powerups.voidRelic && !this.maze.isWalkable(powerups.voidRelic.x, powerups.voidRelic.y, false)) {
      const safe = this.maze.findNearestWalkable(powerups.voidRelic.x, powerups.voidRelic.y, false);
      powerups.voidRelic.x = safe.x;
      powerups.voidRelic.y = safe.y;
    }

    const def = this.maze.getLevelDef();
    this.madnessTimer = Math.min(45, this.madnessTimer + 8.0);
    sounds.play('wave');
    particles.flash('#00ffff', 0.4);
    particles.emit(CW / 2, (ROWS * T) / 2, 60, def.glowColor, { speed: 240, size: 6, life: 0.9 });
    particles.shake(10, 0.35);
    particles.addPop(CW / 2, (ROWS * T) / 2, `🌀 WARP TO ${def.name} ! (+8s)`, '#00ffff', 22);
  }

  private onKillGhost(e: Ghost, ex: number, ey: number) {
    e.st = 'return';
    e.fl = 0.15;
    powerups.pred.k++;
    badges.unlock('firstBlood');
    if (powerups.pred.k >= 4) badges.unlock('ghostHunter');

    // Progression system: count lifetime ghost kill & check unlocks
    progression.addGhostKills(1);

    if (this.gameMode === 'madness') {
      this.madnessKills++;
      this.madnessStreak++;
      particles.addPaintSplat(ex, ey, e.isTitan ? '#ff0055' : '#00ffff');
      this.checkRampageMilestone(this.madnessStreak);

      if (this.madnessKills >= 50) badges.unlock('madness50');
      if (this.madnessKills >= 100) badges.unlock('madness100');

      badges.saveMadnessKills(this.madnessKills);
      this.madnessTimer = Math.min(45, this.madnessTimer + 0.35);

      // Streak milestones: Unlock Super-items (only if unlocked in progression!)
      const unlockedPool = progression.getUnlockedSuperItems();
      const meta: Record<string, { name: string; icon: string }> = {
        nova: { name: 'MEGA NOVA', icon: '💣' },
        overdrive: { name: 'DASH INFINI', icon: '⚡' },
        vortex: { name: 'BLACK HOLE', icon: '🕳️' },
        laser: { name: 'HYPER BEAMS', icon: '⚡' },
        cryo: { name: 'CRYO SHATTER', icon: '❄️' },
        tsunami: { name: 'LIGHT TSUNAMI', icon: '👑' }
      };

      if (this.madnessStreak === 15 && unlockedPool.includes('nova')) superItems.unlock('nova', 'MEGA NOVA', '💣');
      else if (this.madnessStreak === 30 && unlockedPool.includes('overdrive')) superItems.unlock('overdrive', 'DASH INFINI', '⚡');
      else if (this.madnessStreak === 50 && unlockedPool.includes('vortex')) superItems.unlock('vortex', 'BLACK HOLE', '🕳️');
      else if (this.madnessStreak === 75 && unlockedPool.includes('laser')) superItems.unlock('laser', 'HYPER BEAMS', '⚡');
      else if (this.madnessStreak === 110 && unlockedPool.includes('cryo')) superItems.unlock('cryo', 'CRYO SHATTER', '❄️');
      else if (this.madnessStreak === 150 && unlockedPool.includes('tsunami')) superItems.unlock('tsunami', 'LIGHT TSUNAMI', '👑');
      else if (this.madnessStreak > 15 && this.madnessStreak % 25 === 0 && unlockedPool.length > 0) {
        const it = unlockedPool[(Math.random() * unlockedPool.length) | 0];
        superItems.unlock(it, meta[it].name, meta[it].icon);
      }

      // 14% chance to drop powerup on tile (with guaranteed walkable safety)
      if (Math.random() < 0.14 && !powerups.current) {
        const mx = Math.max(1, Math.min(COLS - 2, Math.round(ex / T)));
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
    particles.flash('#00ffff', 0.12);
    if (settingsManager.settings.freezeFrame) {
      this.hitlag = Math.max(this.hitlag, 0.035);
    }
    sounds.play('kill');
  }

  private checkRampageMilestone(streak: number) {
    const milestones: Record<number, string> = {
      10: '⚡ KILLING SPREE !',
      25: '🔥 RAMPAGE !',
      50: '💥 UNSTOPPABLE !',
      80: '👑 GODLIKE !',
      120: '🌌 TRANSCENDENT !',
      160: '⚡ CHROMA-DEITY !'
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
          particles.flash('#00ffff', 0.25);
          particles.shake(6, 0.2);
          particles.addPop(ep.x, ep.y - 15, '💥 x32 ANNIHILATION !', '#00ffff', 18);
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
        particles.flash('#ff0055', 0.25);
        particles.shake(4, 0.2);
        sounds.play('pellet');
      } else {
        if (this.gameMode === 'madness') {
          this.madnessTimer = Math.min(45, this.madnessTimer + 0.04);
        }
        this.combo.n++;
        this.combo.t = COMBO_DECAY;
        const oldM = this.combo.m;
        const tier = getComboTier(this.combo.n);
        this.combo.m = CM[tier];
        const pts = 10 * this.combo.m;
        this.score += pts;

        // Floating +XXX score popup above eaten dot!
        particles.addPop(px, py - 10, '+' + pts, CC[tier], 10 + tier * 2);
        particles.emit(px, py, 2 + tier * 2, C_DOT, { speed: 40 + tier * 20, size: 2 + tier, life: 0.3 + tier * 0.1 });
        sounds.play('dot');

        if (this.combo.m > oldM && this.combo.m > 1) {
          sounds.play('combo');
          particles.addPop(px, py - 28, 'x' + this.combo.m + '!', CC[tier], 16 + tier * 3);
          particles.emit(px, py, 8 + tier * 4, CC[tier], { speed: 60 + tier * 20, size: 3, life: 0.5 });
          particles.shake(1 + tier, 0.15);
          particles.flash(CC[tier], 0.15);
          if (this.combo.m >= 8) badges.unlock('combo8');
          if (this.combo.m >= 16) badges.unlock('combo16');
          if (this.combo.m >= 32) {
            badges.unlock('combo32');
            sounds.play('powerup');
            particles.flash('#00ffff', 0.35);
            particles.shake(8, 0.25);
            particles.addPop(px, py - 36, '👑 x32 GOD MODE (INVINCIBLE) ! 👑', '#00ffff', 20);
          }
        }
      }

      if (this.combo.n > this.bestCombo) this.bestCombo = this.combo.n;

      if (this.maze.remainingDots <= 0) {
        this.state = 'waveTrans';
        this.waveT = 2.5;
        this.wave++;
        this.score += 1000 * (this.wave - 1);
        if (this.wave >= 5 || this.maze.currentLevel >= 4) badges.unlock('wave5');
        sounds.play('wave');
      }
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
      this.gameMode = 'classic';
      sounds.play('dot');
      input.isSelectMode1Requested = false;
    }
    if (input.isSelectMode2Requested && this.state === 'menu') {
      this.gameMode = 'madness';
      sounds.play('dot');
      input.isSelectMode2Requested = false;
    }
    if (input.isLeaderboardRequested) {
      if (this.state === 'menu' || this.state === 'gameover') {
        this.state = 'leaderboard';
        this.leaderboardMode = this.gameMode;
        leaderboard.syncRemote();
        sounds.play('dot');
      } else if (this.state === 'leaderboard') {
        this.state = 'menu';
        sounds.play('dot');
      }
      input.isLeaderboardRequested = false;
    }

    if (this.state === 'leaderboard') {
      if (input.isSelectMode1Requested) {
        this.leaderboardMode = 'classic';
        sounds.play('dot');
        input.isSelectMode1Requested = false;
      }
      if (input.isSelectMode2Requested) {
        this.leaderboardMode = 'madness';
        sounds.play('dot');
        input.isSelectMode2Requested = false;
      }
      if (input.isPauseRequested || input.isStartRequested) {
        this.state = 'menu';
        sounds.play('dot');
        input.isPauseRequested = false;
        input.isStartRequested = false;
      }
      return;
    }

    if (input.isBadgesRequested) {
      if (this.state === 'menu' || this.state === 'gameover') {
        this.state = 'codex';
        this.codexTab = 'badges';
        sounds.play('dot');
      } else if (this.state === 'codex' && this.codexTab === 'badges') {
        this.state = 'menu';
        sounds.play('dot');
      } else if (this.state === 'codex' && this.codexTab === 'skills') {
        this.codexTab = 'badges';
        sounds.play('dot');
      }
      input.isBadgesRequested = false;
    }

    if (input.isCodexRequested) {
      if (this.state === 'menu' || this.state === 'gameover') {
        this.state = 'codex';
        this.codexTab = 'skills';
        sounds.play('dot');
      } else if (this.state === 'codex' && this.codexTab === 'skills') {
        this.state = 'menu';
        sounds.play('dot');
      } else if (this.state === 'codex' && this.codexTab === 'badges') {
        this.codexTab = 'skills';
        sounds.play('dot');
      }
      input.isCodexRequested = false;
    }

    if (input.isRestoreRequested) {
      if (this.state === 'menu') {
        this.showRestoreModal();
      }
      input.isRestoreRequested = false;
    }

    if (this.state === 'codex') {
      if (input.isPauseRequested || input.isStartRequested) {
        this.state = 'menu';
        sounds.play('dot');
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

    sounds.updateBGM(dt, this.state === 'playing', powerups.pred.on, this.gameMode === 'madness');
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

        // Madness Swarm timer
        if (isMadness) {
          this.madnessTimer -= dt;
          if (this.madnessTimer <= 0) {
            this.madnessTimer = 0;
            this.triggerGameOver();
            return;
          }
          this.madnessSpawnTimer -= dt;
          if (this.madnessSpawnTimer <= 0) {
            this.madnessSpawnTimer = Math.max(0.18, 0.75 - this.madnessKills * 0.004);
            this.enemyManager.spawnMadness(1 + (this.madnessKills > 50 ? 1 : 0), this.madnessKills);
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
              particles.addPop(pp.x, pp.y - 26, isV2 ? '⚡ GIGA EMP V2 !' : '⚡ WIGGLE EMP BLAST !', '#00ffff', 20);
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
                for (let c = 0; c < COLS; c++) {
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
              particles.addPop(pp.x, pp.y - 26, isV2 ? '🔥 PLASMA BURNER V2 !' : '🔥 NITRO FLAME JET !', isV2 ? '#00ffff' : '#ff7700', 20);
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
        this.player.update(dt, this.maze, isMadness, input.nitroActive > 0, input.nextDir, (c, r) => this.onCollectDot(c, r));
        this.enemyManager.update(dt, this.maze, this.player.getPos(), powerups.fx.timewarp);

        // Force Field suction (Dots & Frightened Ghosts)
        if (powerups.fx.magnet > 0) {
          const r = isMadness ? T * 6.5 : T * 4.5;
          const pp = this.player.getPos();

          // Vacuum dots in radius
          for (let row = 0; row < ROWS; row++) {
            for (let c = 0; c < COLS; c++) {
              if (this.maze.dotMap[row][c]) {
                const dx = c * T + HALF - pp.x, dy = row * T + HALF - pp.y;
                if (Math.hypot(dx, dy) < r) this.onCollectDot(c, row);
              }
            }
          }

          // Kill frightened & frozen ghosts in Force Field radius
          for (const e of this.enemyManager.enemies) {
            if ((e.st === 'flee' || e.frozen) && e.st !== 'dead' && e.st !== 'return') {
              const ep = this.enemyManager.getPos(e);
              const dist = Math.hypot(pp.x - ep.x, pp.y - ep.y);
              if (dist < r) {
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

        // Powerups & Void relic
        powerups.update(
          dt,
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
            particles.addPop(CW / 2, 70, '☠️ TITAN DU VIDE CRÉÉ ! (-6s)', '#ff0033', 20);
          },
          () => {
            // Void Core intercepted
            this.score += 5000;
            this.madnessTimer = Math.min(45, this.madnessTimer + 6.0);
            sounds.play('powerup');
            particles.shake(8, 0.3);
            particles.flash('#00ffff', 0.4);
            particles.addPop(CW / 2, 70, '✨ CŒUR DU VIDE ANÉANTI ! (+6s & FORCE FIELD)', '#00ffff', 20);
          },
          (px, py) => {
            // Nova collection
            for (const e of this.enemyManager.enemies) {
              if (e.st !== 'dead' && e.st !== 'return') {
                const ep = this.enemyManager.getPos(e);
                if (Math.hypot(px - ep.x, py - ep.y) < T * 4) this.onKillGhost(e, ep.x, ep.y);
              }
            }
          }
        );

        // Super-Items update (with wall-safe gravitational suction and dot suction)
        superItems.update(
          dt,
          this.player.getPos(),
          this.enemyManager.enemies,
          (e, x, y) => this.onKillGhost(e, x, y),
          this.maze,
          (c, r) => this.onCollectDot(c, r)
        );

        // Combo decay
        if (this.combo.n > 0) {
          this.combo.t -= dt;
          if (this.combo.t <= 0) {
            this.combo.n = 0;
            this.combo.m = 1;
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
              particles.addPop(CW / 2, HUD_H + 32, '⚡ BOUCLIER ACTIF (2s)', '#00ffff', 14);
            } else {
              this.enemyManager.spawnClassic(4, spdMult);
              this.state = 'ready';
              this.readyT = 1.5;
            }
          } else {
            this.triggerGameOver();
          }
        }
        break;

      case 'waveTrans':
        this.waveT -= dt;
        if (this.waveT <= 0) {
          const completedLvl = this.maze.currentLevel;
          const isMadness = this.gameMode === 'madness';
          const list = isMadness ? MADNESS_LEVELS : LEVELS;

          // When completing Level 10 (last level), loop back to Level 1 and increase speed by +10%!
          if (completedLvl === list.length - 1) {
            this.loopCount++;
            badges.unlock('loop1');
            if (this.loopCount >= 2) badges.unlock('loop2');
            particles.addPop(CW / 2, (ROWS * T) / 2, `👑 BOUCLE ${this.loopCount + 1} ! (+${this.loopCount * 10}% VITESSE)`, '#ffd700', 24);
            particles.flash('#ffd700', 0.45);
            particles.shake(12, 0.4);
            sounds.play('powerup');
          }
          const nextLvl = (completedLvl + 1) % list.length;
          if (nextLvl >= 4) badges.unlock('wave5');
          const speedMult = this.loopSpeedMultiplier;
          this.maze.build(nextLvl, isMadness);
          if (isMadness) {
            this.enemyManager.enemies = [];
            this.enemyManager.spawnMadness(8 + Math.min(8, this.loopCount * 2), this.madnessKills);
            this.player.reset(true, this.maze, speedMult);
            this.madnessTimer = Math.min(45, this.madnessTimer + 10.0); // Reward for clearing all dots in Madness!
            sounds.play('powerup');
            particles.flash('#00ffff', 0.4);
          } else {
            this.enemyManager.spawnClassic(4, speedMult);
            this.player.reset(false, this.maze, speedMult);
          }
          this.state = 'ready';
          this.readyT = 1.8;
        }
        break;
    }
  }

  private render() {
    this.renderer.clear(this.maze.currentLevel, this.time, this.gameMode === 'madness');

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

    if (this.state === 'paused') {
      this.renderer.ctx.save();
      this.renderer.ctx.translate(particles.shk.x, HUD_H + particles.shk.y);
      this.renderer.ctx.drawImage(this.maze.mOff, 0, 0);
      particles.drawPaintSplats(this.renderer.ctx);
      this.renderer.drawDots(this.maze, this.time);
      powerups.draw(this.renderer.ctx, this.time);
      this.enemyManager.draw(this.renderer.ctx, this.time, powerups.pred.warn);
      this.player.draw(this.renderer.ctx, this.time, this.gameMode === 'madness', this.combo.m >= 32);
      this.renderer.ctx.restore();

      this.renderer.drawHUD(
        this.gameMode === 'madness',
        this.score, this.dScore, this.lives,
        this.madnessKills, this.madnessStreak, this.madnessTimer, badges.bestMadnessKills,
        superItems, this.time, this.player.dashCd, this.maze.currentLevel, this.wave, this.combo, badges.hiScore,
        powerups.fx.overdrive,
        this.loopCount
      );
      this.renderer.drawPause(this.gameMode === 'madness', this.madnessKills, this.madnessStreak, this.time);
      return;
    }

    // Maze translation
    this.renderer.ctx.save();
    this.renderer.ctx.translate(particles.shk.x, HUD_H + particles.shk.y);
    this.renderer.ctx.drawImage(this.maze.mOff, 0, 0);

    particles.drawPaintSplats(this.renderer.ctx);
    this.renderer.drawDots(this.maze, this.time);
    powerups.draw(this.renderer.ctx, this.time);
    this.renderer.drawNitroTrail(input.nitroTrail);

    // Super-Item visuals (Lasers, Vortex, Tsunami)
    superItems.draw(this.renderer.ctx, this.player.getPos(), this.time);

    this.enemyManager.draw(this.renderer.ctx, this.time, powerups.pred.warn);
    this.player.draw(this.renderer.ctx, this.time, this.gameMode === 'madness', this.combo.m >= 32);

    // Overlays
    this.renderer.drawOverlays(powerups.fx, particles.flsh, this.player.getPos(), this.time);
    particles.draw(this.renderer.ctx);

    // Ready text
    if (this.state === 'ready') {
      const c = this.renderer.ctx;
      c.fillStyle = 'rgba(7,7,15,0.4)';
      c.fillRect(0, 0, CW, ROWS * T);
      const txt = this.readyT > 1 ? 'READY ?' : this.readyT > 0.5 ? 'SET' : 'GO !';
      const sz = this.readyT > 0.5 ? 36 : 48;
      c.font = `bold ${sz}px monospace`;
      c.fillStyle = this.readyT > 0.5 ? '#fff' : '#00ffff';
      c.shadowColor = this.readyT > 0.5 ? '#fff' : '#00ffff';
      c.shadowBlur = 20;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(txt, CW / 2, (ROWS * T) / 2);
      c.shadowBlur = 0;
    }

    this.renderer.ctx.restore();

    // Danger border vignette
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
      this.loopCount
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

// Instantiate game on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});

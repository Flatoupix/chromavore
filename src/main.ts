// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — MAIN GAME ORCHESTRATOR & GAMELOOP
// ═══════════════════════════════════════════════════════════════

import { CW, CH, HUD_H, T, ROWS, COLS, BASE_COLS, MADNESS_COLS, HALF, DASH_MADNESS_CD, HIT_DIST, NM_DIST, CM, DASH_BTN, CC, C_DOT, C_PELLET, COMBO_DECAY, COMBO_DECAY_WIDE, STREAK_DECAY_WINDOW, KILL_STREAK_DECAY_WINDOW, GOD_MODE_DURATION, SINGULARITY_DURATION, SINGULARITY_TRIGGER_KILLS, getComboTier, GAME_VERSION, P_SPEED, P_MADNESS_SPEED, BONUS_DURATION, BONUS_ARENA_W, BONUS_ARENA_H, BONUS_FORCE_FIELD_BASE_RAD, BONUS_FORCE_FIELD_MAX_RAD, BONUS_SWARM_MAX, MADNESS_UNLOCK_KILLS, HD_AUDIO_UNLOCK_KILLS, CHRONO_MAX, CHRONO_DRAIN, CHRONO_TIMESCALE, CHRONO_TIMESCALE_V2, CHRONO_PASSIVE_RECHARGE, CHRONO_DOT_RECHARGE, CHRONO_NM_RECHARGE, getChromaTier } from './config/constants';
import { sounds } from './audio/SoundManager';
import { MazeManager, MADNESS_LEVELS_4_3, MADNESS_LEVELS_16_9 } from './levels/levels';
import { particles } from './systems/ParticleSystem';
import { input } from './core/InputManager';
import { setupFullscreen } from './core/Fullscreen';
import { Player } from './entities/Player';
import { EnemyManager, Ghost } from './entities/Enemy';
import { powerups } from './entities/Powerups';
import { superItems } from './systems/SuperItems';
import { badges, BADGE_MAX_PAGES } from './systems/BadgeSystem';
import { TouchDeckManager } from './ui/TouchDeck';
import { Renderer, type EffectTimer } from './graphics/Renderer';
import { settingsManager, PAUSE_BUTTONS } from './systems/SettingsManager';
import { leaderboard } from './systems/Leaderboard';
import { progression } from './systems/ProgressionSystem';
import { experienceSystem, SKILL_NODES } from './systems/ExperienceSystem';
import { profileManager } from './systems/ProfileManager';
import { wobbleBanner } from './graphics/WobbleBanner';
if (import.meta.env.DEV) {
  import('./utils/adminReset');
}
class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private maze: MazeManager;
  private player: Player;
  private enemyManager: EnemyManager;
  private touchDeck: TouchDeckManager;

  // Game state
  public state: 'menu' | 'ready' | 'playing' | 'paused' | 'dying' | 'waveTrans' | 'gameover' | 'leaderboard' | 'codex' | 'instructions' | 'bonus' | 'settings' | 'debug' = 'menu';
  public previousStateBeforeDebug: 'playing' | 'paused' | 'bonus' = 'playing';
  public playerRank: number = 0;
  public playerDate: string = '';

  // Singularity 64x cinematic intro sequence & mechanics
  public singularityIntroTimer: number = 0; // 5.0s intro
  public singularityShockwaveRadius: number = 0;
  public singularityTriggered: boolean = false;
  public singularityNovaUsed: boolean = false; // 1 Nova per Singularity

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
  public bonusItems: { x: number; y: number; type: string; name: string; color: string; icon: string; timer: number }[] = [];
  public bonusItemSpawnTimer: number = 2.0;
  public bonusLaserTimer: number = 0;
  public bonusTsunamiX: number = -1;
  public bonusVortex: { x: number; y: number; life: number; maxLife: number } | null = null;
  public bonusNovaRing: { x: number; y: number; radius: number; life: number } | null = null;
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
  public codexTab: 'skills' | 'badges' | 'tree' = 'tree';
  public badgePage: number = 0;
  public get loopSpeedMultiplier(): number {
    return 1 + this.loopCount * 0.10;
  }

  // Madness mode & Ghost Kill Streak specific
  public madnessKills: number = 0; // Total session kills
  public lifeKills: number = 0;    // Kills during current life (resets on death)
  public maxLifeKills: number = 0;
  public madnessStreak: number = 0;
  public killStreakTimer: number = 0;
  public maxMadnessStreak: number = 0;
  public madnessSpawnTimer: number = 0;

  // Dot / Pellet Eating Streak & Frequency
  public dotStreak: number = 0;
  public dotStreakTimer: number = 0;
  public maxDotStreak: number = 0;

  // Bullet Time (Chrono-Shift) specific
  public chronoEnergy: number = CHRONO_MAX;
  public isChronoActive: boolean = false;

  // Pending game over snapshot
  public pendingScore: number = 0;
  public pendingKills: number = 0;
  public pendingStreak: number = 0;

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
    this.configureArena();
    const vOverlay = document.getElementById('chv-version-overlay');
    if (vOverlay) vOverlay.textContent = GAME_VERSION;
    setupFullscreen();
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
        kills: this.pendingKills,
        streak: this.pendingStreak,
        date
      });
      modal.style.display = 'none';
      this.state = 'gameover';
      sounds.play('click');
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
        restoreStatus.textContent = 'Please enter both username and Sync ID.';
        return;
      }
      restoreStatus.style.display = 'block';
      restoreStatus.style.color = '#ffd700';
      restoreStatus.textContent = 'Connecting to cloud profile...';

      const ok = await profileManager.restoreProfile(p, c);
      if (ok) {
        restoreStatus.style.color = '#00ffaa';
        restoreStatus.textContent = `Success! Profile ${p} loaded (${profileManager.profile.careerGhosts} ghosts)`;
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
        restoreStatus.textContent = 'Username or Sync ID not found on cloud.';
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
      particles.addPop(CW / 2, (ROWS * T) / 2, 'PROGRESS RESET!', '#ff0055', 20);
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

  private showNameModal(val: number) {
    const modal = document.getElementById('name-modal');
    const titleEl = document.getElementById('name-modal-title');
    const scoreEl = document.getElementById('name-modal-score');
    const inputEl = document.getElementById('pseudo-input') as HTMLInputElement;
    if (!modal || !titleEl || !scoreEl || !inputEl) return;

    titleEl.textContent = 'NEW HIGH SCORE!';
    scoreEl.textContent = `${this.pendingKills} GHOSTS PURGED (STREAK x${this.pendingStreak})`;

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
    this.pendingStreak = this.maxMadnessStreak;

    badges.saveScore(this.score);
    badges.saveMadnessKills(this.madnessKills);
    sounds.play('death');

    // Auto-save immediately if pseudo already known so record is NEVER lost
    const savedPseudo = (localStorage.getItem('chv_last_pseudo') || '').trim();
    const qualifies = this.pendingKills > 0;

    if (savedPseudo && qualifies) {
      this.playerDate = new Date().toISOString();
      this.playerRank = leaderboard.addEntry({
        pseudo: savedPseudo,
        score: this.pendingScore,
        kills: this.pendingKills,
        streak: this.pendingStreak,
        date: this.playerDate
      });
    }

    if (qualifies) {
      setTimeout(() => {
        this.showNameModal(this.pendingKills);
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
        // Dynamic navigation links click at bottom:
        if (this.renderer?.menuLinks) {
          for (const link of this.renderer.menuLinks) {
            if (Math.abs(cy - link.y) < 16 && Math.abs(cx - link.x) < link.w / 2 + 10) {
              if (link.id === 'help') {
                this.state = 'instructions';
                sounds.play('click');
                return;
              } else if (link.id === 'arsenal') {
                this.state = 'codex';
                this.codexTab = 'skills';
                sounds.play('click');
                return;
              } else if (link.id === 'settings') {
                this.state = 'settings';
                sounds.play('click');
                return;
              } else if (link.id === 'badges') {
                this.state = 'codex';
                this.codexTab = 'badges';
                sounds.play('click');
                return;
              } else if (link.id === 'scores') {
                this.state = 'leaderboard';
                leaderboard.syncRemote();
                sounds.play('click');
                return;
              } else if (link.id === 'sync') {
                this.showRestoreModal();
                return;
              }
            }
          }
        }

        // Copy sync code if tapping player line (y: ~480)
        if (cy >= 465 && cy <= 495) {
          navigator.clipboard?.writeText(profileManager.profile.syncCode);
          particles.addPop(curCw / 2, 480, 'SYNC ID COPIED!', '#00ffff', 14);
          sounds.play('click');
          return;
        }

        const madW = 340, madH = 68;
        const madX = curCw / 2 - madW / 2;
        const madY = 310;

        // Click on the single LET'S HUNT card
        if (cx >= madX && cx <= madX + madW && cy >= madY && cy <= madY + madH) {
          this.startGame();
          sounds.play('start');
          return;
        }

        // Tap title / banner to start
        if (cy > 60 && cy < 160) {
          this.startGame();
          sounds.play('start');
          return;
        }
      }

      if (this.state === 'codex') {
        const tabW = Math.min(160, Math.floor((curCw - 60) / 3));
        const tabH = 22, tabY = 34;
        const totalTabsW = tabW * 3 + 16;
        const tabsStartX = curCw / 2 - totalTabsW / 2;

        const t1X = tabsStartX;
        const t2X = tabsStartX + tabW + 8;
        const t3X = tabsStartX + (tabW + 8) * 2;

        // Click Tab 1 (Skills / Arsenal)
        if (cy >= tabY && cy <= tabY + tabH && cx >= t1X && cx <= t1X + tabW) {
          this.codexTab = 'skills';
          sounds.play('click');
          return;
        }
        // Click Tab 2 (Badges)
        if (cy >= tabY && cy <= tabY + tabH && cx >= t2X && cx <= t2X + tabW) {
          this.codexTab = 'badges';
          sounds.play('click');
          return;
        }
        // Click Tab 3 (Skill Tree)
        if (cy >= tabY && cy <= tabY + tabH && cx >= t3X && cx <= t3X + tabW) {
          this.codexTab = 'tree';
          sounds.play('click');
          return;
        }

        // Tree interactions (Upgrade Node or Respec)
        if (this.codexTab === 'tree') {
          // Check Respec Button: cx around curCw / 2 + 35, w: 150, y: 94..116
          if (cx >= curCw / 2 + 35 && cx <= curCw / 2 + 185 && cy >= 94 && cy <= 116) {
            experienceSystem.respecSkills();
            particles.flash('#00ffaa', 0.25);
            particles.shake(4, 0.15);
            return;
          }

          // Check click on any skill node
          const branchKeys: Array<'agility' | 'control' | 'carnage'> = ['agility', 'control', 'carnage'];
          const branchColW = Math.min(270, Math.floor((curCw - 48) / 3));
          const branchGap = Math.floor((curCw - branchColW * 3) / 4);

          for (let bi = 0; bi < branchKeys.length; bi++) {
            const bKey = branchKeys[bi];
            const bx = branchGap + bi * (branchColW + branchGap);
            const by = 126;
            const branchNodes = SKILL_NODES.filter(n => n.branch === bKey);
            const nodeStartY = by + 34;
            const nodeH = 92;
            const nodeGap = 8;

            for (let ni = 0; ni < branchNodes.length; ni++) {
              const node = branchNodes[ni];
              const ny = nodeStartY + ni * (nodeH + nodeGap);
              if (cx >= bx && cx <= bx + branchColW && cy >= ny && cy <= ny + nodeH) {
                const upgraded = experienceSystem.upgradeSkill(node.id);
                if (upgraded) {
                  particles.flash('#00ffaa', 0.25);
                  particles.shake(4, 0.15);
                } else {
                  sounds.play('click');
                }
                return;
              }
            }
          }
        }

        // If in badges and clicking bottom pagination
        if (this.codexTab === 'badges' && cy >= CH - 45) {
          if (cx > curCw * 0.25 && cx < curCw * 0.75) {
            const maxPages = BADGE_MAX_PAGES;
            if (cx < curCw / 2) {
              this.badgePage = (this.badgePage - 1 + maxPages) % maxPages;
            } else {
              this.badgePage = (this.badgePage + 1) % maxPages;
            }
            sounds.play('click');
            return;
          }
        }

        this.state = 'menu';
        sounds.play('click');
        return;
      }

      if (this.state === 'gameover') {
        const madW = 380, madH = 44;
        const madX = curCw / 2 - madW / 2;
        const madY = 390;

        // Restart run
        if (cx >= madX && cx <= madX + madW && cy >= madY && cy <= madY + madH) {
          this.startGame();
          sounds.play('start');
          return;
        }

        // Bottom Navigation (Codex & Leaderboard)
        if (cy >= 496 && cy <= 526) {
          if (cx < curCw / 2) {
            this.state = 'codex';
            this.codexTab = 'badges';
            sounds.play('click');
            return;
          } else {
            this.state = 'leaderboard';
            leaderboard.syncRemote();
            sounds.play('click');
            return;
          }
        }

        this.state = 'menu';
        sounds.play('click');
        return;
      }

      if (this.state === 'leaderboard') {
        this.state = 'menu';
        sounds.play('click');
        return;
      }

      if (this.state === 'settings') {
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
              case 'home':
                this.state = 'menu';
                sounds.play('click');
                return;
            }
          }
        }
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
                this.startGame();
                sounds.play('start');
                return;
              case 'home':
                this.state = 'menu';
                sounds.play('click');
                sounds.stopBgm();
                return;
            }
          }
        }
        // Do not unpause on misclick outside buttons
        return;
      }

      if (this.state === 'debug') {
        const debugBtns = this.getDebugButtons();
        for (const b of debugBtns) {
          if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
            this.executeDebugAction(b.id);
            return;
          }
        }
        return;
      }
    });

    // Touch swipe steering & double tap dash
    let touchStart: { x: number; y: number } | null = null;
    let lastTouchTime = 0;

    window.addEventListener('touchstart', (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest && (e.target as HTMLElement).closest('.mobile-btn, #mobile-controls button, #name-modal, #confirm-wipe-modal')) return;
      if (!e.touches[0]) return;
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const now = performance.now();
      if (now - lastTouchTime < 280) {
        if (this.state === 'playing') {
          this.executeDash();
        }
      }
      lastTouchTime = now;
    }, { passive: true });

    window.addEventListener('touchmove', (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest && (e.target as HTMLElement).closest('.mobile-btn, #mobile-controls button, #name-modal, #confirm-wipe-modal')) return;
      if (!touchStart || !e.touches[0]) return;
      const dx = e.touches[0].clientX - touchStart.x;
      const dy = e.touches[0].clientY - touchStart.y;
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
        if (this.state === 'playing') {
          if (Math.abs(dx) > Math.abs(dy)) {
            input.setNextDir(dx > 0 ? 1 : -1, 0);
          } else {
            input.setNextDir(0, dy > 0 ? 1 : -1);
          }
        }
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      touchStart = null;
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Toggle Debug Mode with F2 or ² (Backquote)
      if (e.code === 'F2' || e.code === 'Backquote') {
        this.toggleDebugMode();
        e.preventDefault();
        return;
      }

      if (this.state === 'debug') {
        if (e.code === 'Escape') {
          this.toggleDebugMode();
          e.preventDefault();
          return;
        }
        // Direct Debug Hotkeys
        if (e.code === 'KeyG') this.executeDebugAction('god_mode');
        else if (e.code === 'KeyS') this.executeDebugAction('singularity');
        else if (e.code === 'KeyN') this.executeDebugAction('nitro_burst');
        else if (e.code === 'KeyE') this.executeDebugAction('emp_blast');
        else if (e.code === 'KeyV') this.executeDebugAction('enter_vortex');
        else if (e.code === 'KeyC') this.executeDebugAction('toggle_chrono');
        else if (e.code === 'KeyO') this.executeDebugAction('infinite_dash');
        else if (e.code === 'KeyL') this.executeDebugAction('add_life');
        else if (e.code === 'Digit1' || e.code === 'Numpad1') this.executeDebugAction('item_nova');
        else if (e.code === 'Digit2' || e.code === 'Numpad2') this.executeDebugAction('item_laser');
        else if (e.code === 'Digit3' || e.code === 'Numpad3') this.executeDebugAction('item_vortex');
        else if (e.code === 'Digit4' || e.code === 'Numpad4') this.executeDebugAction('item_tsunami');
        else if (e.code === 'Digit5' || e.code === 'Numpad5') this.executeDebugAction('item_cryo');
        else if (e.code === 'KeyT') this.executeDebugAction('spawn_titan');
        else if (e.code === 'KeyW') this.executeDebugAction('clear_maze_dots');
        else if (e.code === 'KeyX') this.executeDebugAction('add_xp');
        e.preventDefault();
        return;
      }

      if (this.state === 'settings') {
        if (e.code === 'Escape' || e.code === 'KeyO' || e.code === 'Enter') {
          this.state = 'menu';
          sounds.play('click');
          e.preventDefault();
          return;
        }
      }
      if (this.state === 'paused' || this.state === 'settings') {
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
        } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
          this.codexTab = 'tree';
          sounds.play('click');
          e.preventDefault();
        } else if (e.code === 'KeyR' && this.codexTab === 'tree') {
          experienceSystem.respecSkills();
          particles.flash('#00ffaa', 0.25);
          particles.shake(4, 0.15);
          e.preventDefault();
        } else if (e.code === 'Tab') {
          if (this.codexTab === 'tree') this.codexTab = 'skills';
          else if (this.codexTab === 'skills') this.codexTab = 'badges';
          else this.codexTab = 'tree';
          sounds.play('click');
          e.preventDefault();
        } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'KeyD' || e.code === 'PageDown') {
          if (this.codexTab === 'badges') {
            this.badgePage = (this.badgePage + 1) % BADGE_MAX_PAGES;
            sounds.play('click');
            e.preventDefault();
          }
        } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'KeyA' || e.code === 'KeyQ' || e.code === 'PageUp') {
          if (this.codexTab === 'badges') {
            this.badgePage = (this.badgePage - 1 + BADGE_MAX_PAGES) % BADGE_MAX_PAGES;
            sounds.play('click');
            e.preventDefault();
          }
        }
      }
    });
  }

  public isWidescreenUnlocked(): boolean {
    return profileManager.profile.careerGhosts >= MADNESS_UNLOCK_KILLS;
  }

  public getCurrentLevelList() {
    return this.isWidescreenUnlocked() ? MADNESS_LEVELS_16_9 : MADNESS_LEVELS_4_3;
  }

  public configureArena() {
    const isWidescreen = this.isWidescreenUnlocked();
    this.maze.cols = isWidescreen ? MADNESS_COLS : BASE_COLS;
    this.renderer.updateCanvasSize(this.maze.cols, this.maze.rows);
    this.touchDeck.resize();
  }

  public startGame() {
    this.configureArena();
    this.score = 0;
    this.dScore = 0;
    this.lives = 3;
    this.wave = 1;
    this.time = 0;
    this.bestCombo = 0;
    this.nearMissCount = 0;
    this.combo = { n: 0, t: 0, m: 1 };

    this.madnessKills = 0;
    this.lifeKills = 0;
    this.maxLifeKills = 0;
    this.madnessStreak = 0;
    this.killStreakTimer = 0;
    this.maxMadnessStreak = 0;
    this.dotStreak = 0;
    this.dotStreakTimer = 0;
    this.maxDotStreak = 0;
    this.madnessSpawnTimer = 0;
    this.singularityIntroTimer = 0;
    this.singularityShockwaveRadius = 0;
    this.singularityTriggered = false;
    this.singularityNovaUsed = false;
    this.bonusItems = [];
    this.bonusItemSpawnTimer = 2.0;

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
    const isWidescreen = this.isWidescreenUnlocked();
    const currentTier = getChromaTier(progression.totalGhosts);
    this.renderer.chromaTier = currentTier;
    this.maze.build(0, isWidescreen);
    // Re-rasteriser avec le tier correct (build() appelle renderOffscreen() sans tier)
    this.maze.renderOffscreen(currentTier);
    this.player.reset(this.maze, this.loopSpeedMultiplier);
    this.enemyManager.enemies = [];
    // Spawn progressif : 4 fantômes pour un nouveau joueur → 10 pour un vétéran (tous les 50 kills)
    const initialSpawn = Math.min(10, 4 + Math.floor(progression.totalGhosts / 50));
    this.enemyManager.spawnMadness(initialSpawn, 0, this.maze);
    this.state = 'ready';
    this.readyT = 1.5;
    sounds.play('powerup');
    particles.addPop(this.renderer.cw / 2, HUD_H + 50, '« LET\'S HUNT »', '#ffd700', 22);
  }

  private warpToLevel(lvlIndex: number) {
    sounds.resetDotStreak();
    this.dotStreak = 0;
    this.dotStreakTimer = 0;
    const isWidescreen = this.isWidescreenUnlocked();
    const list = this.getCurrentLevelList();
    this.maze.build(lvlIndex, isWidescreen);
    this.maze.renderOffscreen(this.renderer.chromaTier);
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
    this.player.speed = (this.maze.cols > 21 ? P_MADNESS_SPEED : P_SPEED) * this.loopSpeedMultiplier;

    // Relocate any ghosts trapped in new layout
    for (const e of this.enemyManager.enemies) {
      if (e.st !== 'dead' && !this.maze.isWalkable(e.x, e.y, true)) {
        const safe = this.maze.findNearestWalkable(e.x, e.y, true);
        e.x = e.fx = safe.x;
        e.y = e.fy = safe.y;
        e.t = 1;
      }
    }
    // Refill up to a level- and kill-scaled target so swarm pressure naturally builds up as levels advance
    const livingGhosts = this.enemyManager.enemies.filter(e => e.st !== 'dead').length;
    const careerBonus = Math.min(6, Math.floor(progression.totalGhosts / 50));
    const levelBase = 6 + lvlIndex * 3 + (this.loopCount * 4);
    const killBonus = Math.floor(this.madnessKills / 6);
    const swarmProfile = this.enemyManager.getSwarmProfile(this.madnessKills, lvlIndex);
    const targetSwarm = Math.min(
      swarmProfile.cap,
      Math.max(8 + lvlIndex * 2, levelBase + careerBonus + killBonus)
    );
    if (livingGhosts < targetSwarm) {
      this.enemyManager.spawnMadness(targetSwarm - livingGhosts, this.madnessKills, this.maze, lvlIndex);
    }
    this.madnessSpawnTimer = Math.min(this.madnessSpawnTimer, 0.8);

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
    particles.addPop(this.renderer.cw / 2, HUD_H + 35, `LEVEL ${lvlIndex + 1}/${list.length}: ${def.name}`, def.glowColor, 22);
  }

  private checkArenaUnlock(prevCareer: number) {
    if (prevCareer < MADNESS_UNLOCK_KILLS && profileManager.profile.careerGhosts >= MADNESS_UNLOCK_KILLS) {
      badges.unlock('arena16_9');
      sounds.play('powerup');
      particles.flash('#00f0ff', 0.5);
      particles.shake(12, 0.4);
    }
  }

  private onSmashWall(c: number, r: number) {
    const wx = c * T + HALF;
    const wy = r * T + HALF;
    const lvl = this.maze.getLevelDef();
    const wallCol = lvl.glowColor || '#ff0055';

    // Wall smash score bonus
    this.score += 300;

    // Explosive wall debris & sparks
    particles.emit(wx, wy, 35, wallCol, { speed: 190, size: 4.5, life: 0.65 });
    particles.emit(wx, wy, 15, '#ffffff', { speed: 230, size: 3, life: 0.4 });
    particles.shake(7, 0.22);
    particles.flash(wallCol, 0.2);
    particles.addPop(wx, wy - 14, 'WALL SMASH ! +300', '#ff007f', 18);

    // Audio crunch
    sounds.play('kill');
    sounds.play('nova');

    // Hit-stop / freeze-frame (ralenti)
    this.hitlag = Math.max(this.hitlag, 0.08);

    // Unlock achievement
    badges.unlock('wallBreaker');
  }

  private executeDash() {
    const isSingularity = this.combo.m >= 64;
    this.player.triggerDash(
      this.maze,
      this.enemyManager.enemies,
      (e, x, y) => this.onKillGhost(e, x, y),
      (c, r) => this.onCollectDot(c, r),
      powerups.fx.magnet > 0 || isSingularity,
      powerups.fx.overdrive > 0,
      (c, r) => this.onSmashWall(c, r),
      isSingularity,
      input.isChronoKeyHeld
    );
  }

  private onKillGhost(e: Ghost, ex: number, ey: number) {
    e.st = 'return';
    // A frozen ghost that has been shattered must be allowed to travel back
    // to its nest; otherwise it remains stuck in the return state forever.
    e.frozen = false;
    e.frightened = false;
    e.fl = 0.15;
    powerups.pred.k++;
    badges.unlock('firstBlood');
    if (powerups.pred.k >= 4) badges.unlock('ghostHunter');

    // Progression system: count lifetime ghost kill & check unlocks
    const prevCareer = profileManager.profile.careerGhosts;
    progression.addGhostKills(1);
    this.checkArenaUnlock(prevCareer);

    this.madnessKills++;
    this.lifeKills++;
    if (this.lifeKills > this.maxLifeKills) {
      this.maxLifeKills = this.lifeKills;
    }
    this.madnessStreak++;
    this.killStreakTimer = KILL_STREAK_DECAY_WINDOW;
    if (this.madnessStreak > this.maxMadnessStreak) {
      this.maxMadnessStreak = this.madnessStreak;
    }

    // Check Singularity Mode trigger at 200 kills (pure single-life feat or high session mastery)
    if ((this.lifeKills >= SINGULARITY_TRIGGER_KILLS || this.madnessKills >= SINGULARITY_TRIGGER_KILLS) && !this.singularityTriggered) {
      this.triggerSingularitySequence();
    }

    // Bonus de points tous les 10 spectres dans la streak !
    if (this.madnessStreak % 10 === 0) {
      const milestoneTier = (this.madnessStreak / 10);
      const ghostStreakBonus = 2500 * milestoneTier * (this.combo.m || 1);
      this.score += ghostStreakBonus;
      particles.addPop(ex, ey - 32, `KILL STREAK x${this.madnessStreak} ! +${ghostStreakBonus}`, '#ffd700', 16);
      sounds.play('streak');
    }

    this.checkRampageMilestone(this.madnessStreak);
    this.checkSwarmMilestone(this.madnessKills);

    if (this.madnessKills >= 50) badges.unlock('madness50');
    if (this.madnessKills >= 100) badges.unlock('madness100');

    badges.saveMadnessKills(this.madnessKills);

    // 14% chance to drop powerup on tile (with guaranteed walkable safety)
    if (Math.random() < 0.14 && !powerups.current) {
      const mx = Math.max(1, Math.min(this.maze.cols - 2, Math.round(ex / T)));
      const my = Math.max(1, Math.min(ROWS - 2, Math.round(ey / T)));
      const safe = this.maze.findNearestWalkable(mx, my, false);
      powerups.current = { x: safe.x, y: safe.y, type: Math.random() < 0.4 ? 'overdrive' : (Math.random() < 0.65 ? 'magnet' : 'nova'), timer: 8 };
      powerups.spawnTimer = 16.0 + Math.random() * 6.0;
    }

    const pts = 250 * Math.min(this.madnessStreak, 32);
    this.score += pts;
    particles.addPop(ex, ey - 15, '+' + pts, '#ffd700', 16);

    // Chromavore 4.0 XP Engine: +100 XP * combo (or +500 for titan)
    const xpEarned = e.isTitan ? 500 : 100 * Math.max(1, this.combo.m);
    const lvlUp = experienceSystem.addXp(xpEarned, 'ghost_kill');
    if (lvlUp) {
      this.lives = Math.min(5, this.lives + 1);
      particles.addPop(ex, ey - 35, '+1 VIE !', '#00ffaa', 22);
    }

    particles.emit(ex, ey, 25, '#00ffff', { speed: 130, size: 4, life: 0.5 });
    particles.shake(3, 0.12);
    if (settingsManager.settings.freezeFrame && this.combo.m < 64) {
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

  private checkSwarmMilestone(kills: number) {
    const milestones = [15, 35, 70, 120, 200, 350];
    if (!milestones.includes(kills)) return;
    const profile = this.enemyManager.getSwarmProfile(kills, this.maze.currentLevel);
    const pp = this.player.getPos();
    particles.addPop(pp.x, pp.y - 42, `SWARM ↑ • ${profile.cap} GHOSTS MAX`, '#ff5533', 15);
    particles.flash('#ff5533', 0.15);
  }

  private triggerSingularitySequence() {
    this.singularityTriggered = true;
    this.singularityIntroTimer = 5.0;
    this.singularityShockwaveRadius = 0;
    // Set the 64x combo for the Singularity bonus phase.
    this.combo.m = 64;
    this.combo.t = SINGULARITY_DURATION;

    // Flash screen in cosmic gold & shake
    particles.flash('#ffd700', 0.5);
    particles.shake(16, 0.6);
    sounds.play('nova');
    sounds.play('powerup');

    const pp = this.player.getPos();
    particles.addPop(pp.x, pp.y - 45, '« SINGULARITY AWAKENS »', '#ffd700', 26);
  }

  private playerDie() {
    this.state = 'dying';
    this.deathT = 1.5;
    this.lives--;
    this.lifeKills = 0;
    experienceSystem.onPlayerDeath();
    this.madnessStreak = 0;
    this.killStreakTimer = 0;
    this.dotStreak = 0;
    this.dotStreakTimer = 0;
    const pp = this.player.getPos();
    particles.emit(pp.x, pp.y, 40, '#ffffff', { speed: 160, size: 5, life: 0.85, gravity: 80 });
    particles.emit(pp.x, pp.y, 30, '#00b4ff', { speed: 130, size: 4, life: 0.65 });
    particles.shake(10, 0.4);
    particles.flash('#ff0000', 0.5);
    sounds.play('death');

    powerups.clearPredator(this.enemyManager.enemies);
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
    this.bonusItems = [];
    this.bonusItemSpawnTimer = 1.5;
    this.bonusLaserTimer = 0;
    this.bonusTsunamiX = -1;
    this.bonusVortex = null;
    this.bonusNovaRing = null;

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
    particles.addPop(BONUS_ARENA_W / 2, BONUS_ARENA_H / 2 - 40, 'VORTEX RAMPAGE! (15s)', '#d946ef', 24);
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

    // ─────────────────────────────────────────────────────────────
    // Vortex Mode Special Item Capsules Spawning & Collection
    // ─────────────────────────────────────────────────────────────
    this.bonusItemSpawnTimer -= dt;
    if (this.bonusItemSpawnTimer <= 0 && this.bonusTimer > 2.0) {
      this.bonusItemSpawnTimer = 2.4 + Math.random() * 1.2;
      const itemTypes = [
        { type: 'nova_capsule', name: 'SUPERNOVA CORE', color: '#ff0055', icon: 'nova' },
        { type: 'black_hole', name: 'SINGULARITY RIFT', color: '#b000ff', icon: 'black_hole' },
        { type: 'lightning_burst', name: 'HYPER BEAMS', color: '#00ffff', icon: 'laser' },
        { type: 'tsunami_burst', name: 'COSMIC TSUNAMI', color: '#ffffff', icon: 'tsunami' }
      ];
      const pick = itemTypes[(Math.random() * itemTypes.length) | 0];
      const margin = 100;
      this.bonusItems.push({
        x: margin + Math.random() * (BONUS_ARENA_W - margin * 2),
        y: margin + Math.random() * (BONUS_ARENA_H - margin * 2),
        type: pick.type,
        name: pick.name,
        color: pick.color,
        icon: pick.icon,
        timer: 7.0
      });
    }

    // Update and check collection of bonus items
    for (let bi = this.bonusItems.length - 1; bi >= 0; bi--) {
      const it = this.bonusItems[bi];
      it.timer -= dt;
      if (it.timer <= 0) {
        this.bonusItems.splice(bi, 1);
        continue;
      }

      const distToPac = Math.hypot(this.bonusPacPos.x - it.x, this.bonusPacPos.y - it.y);
      if (distToPac < 55) {
        // Collect Item!
        sounds.play('powerup');
        sounds.play('nova');
        particles.flash(it.color, 0.4);
        particles.shake(14, 0.45);

        let itemScore = 500000;
        let itemKills = 0;

        if (it.type === 'nova_capsule') {
          itemScore = 750000;
          sounds.play('nova');
          // Supernova Shockwave: expanding golden ring & immediate screen shake
          this.bonusNovaRing = { x: it.x, y: it.y, radius: 20, life: 0.8 };
          particles.shake(16, 0.5);
          particles.flash('#ffd700', 0.4);
          particles.emit(it.x, it.y, 100, '#ffd700', { speed: 300, size: 6, life: 0.8 });

          // Supernova: annihilate all ghosts within 420px radius!
          for (let gi = 0; gi < this.bonusActiveCount; gi++) {
            const g = this.bonusGhosts[gi];
            if (Math.hypot(g.x - it.x, g.y - it.y) < 420) {
              g.alive = false;
              itemKills++;
              this.bonusKills++;
              const pts = 500 + Math.min(3000, this.bonusKills * 25);
              this.bonusScore += pts;
              this.score += pts;
              particles.emit(g.x, g.y, 8, '#ffd700', { speed: 180, size: 4, life: 0.5 });
              const lastIdx = this.bonusActiveCount - 1;
              if (gi !== lastIdx) {
                const temp = this.bonusGhosts[gi];
                this.bonusGhosts[gi] = this.bonusGhosts[lastIdx];
                this.bonusGhosts[lastIdx] = temp;
              }
              this.bonusActiveCount--;
              gi--;
            }
          }
        } else if (it.type === 'black_hole') {
          itemScore = 1000000;
          sounds.play('powerup');
          // Spawn persistent Black Hole singularity in arena for 4.5s
          this.bonusVortex = { x: it.x, y: it.y, life: 4.5, maxLife: 4.5 };
          particles.shake(10, 0.35);
          particles.flash('#bb44ff', 0.35);
          particles.emit(it.x, it.y, 40, '#bb44ff', { speed: 200, size: 5, life: 0.6 });
        } else if (it.type === 'lightning_burst') {
          itemScore = 500000;
          sounds.play('dash');
          // Activate Cross Hyper Beams (3.5s) + Overdrive speed & 0-cd dash!
          this.bonusLaserTimer = 3.5;
          powerups.fx.overdrive = 4.0;
          this.player.dashCd = 0;
          particles.shake(10, 0.3);
          particles.flash('#00ffff', 0.35);
          particles.emit(this.bonusPacPos.x, this.bonusPacPos.y, 40, '#00ffff', { speed: 220, size: 5, life: 0.5 });
        } else if (it.type === 'tsunami_burst') {
          itemScore = 800000;
          sounds.play('wave');
          // Launch real advancing Cosmic Tsunami wave across arena from left to right
          this.bonusTsunamiX = 0;
          particles.shake(12, 0.4);
          particles.flash('#ffffff', 0.4);
          particles.emit(0, BONUS_ARENA_H / 2, 50, '#00f0ff', { speed: 220, size: 5, life: 0.6 });
        }

        this.bonusScore += itemScore;
        this.score += itemScore;
        particles.addPop(it.x, it.y - 25, `${it.name}! +${itemScore.toLocaleString('en-US')}`, it.color, 24);

        if (itemKills > 0) {
          this.bonusBatchKills += itemKills;
          this.bonusBatchScore += itemScore;
          this.triggerMultikillBanner();
        }

        this.bonusItems.splice(bi, 1);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Continuous Active Super Effects Physics & Elimination in Arena
    // ─────────────────────────────────────────────────────────────

    // 1. Cross Hyper Beams slicing ghosts continuously
    if (this.bonusLaserTimer > 0) {
      this.bonusLaserTimer -= dt;
      let laserKills = 0;
      let laserScore = 0;
      const pacX = this.bonusPacPos.x;
      const pacY = this.bonusPacPos.y;
      for (let gi = 0; gi < this.bonusActiveCount; gi++) {
        const g = this.bonusGhosts[gi];
        const hitCross = Math.abs(g.x - pacX) < 26 || Math.abs(g.y - pacY) < 26;
        if (hitCross) {
          g.alive = false;
          laserKills++;
          this.bonusKills++;
          const pts = 400 + Math.min(3000, this.bonusKills * 25);
          laserScore += pts;
          this.bonusScore += pts;
          this.score += pts;
          particles.emit(g.x, g.y, 7, '#00ffff', { speed: 170, size: 3.5, life: 0.4 });
          const lastIdx = this.bonusActiveCount - 1;
          if (gi !== lastIdx) {
            this.bonusGhosts[gi] = this.bonusGhosts[lastIdx];
            this.bonusGhosts[lastIdx] = g;
          }
          this.bonusActiveCount--;
          gi--;
        }
      }
      if (laserKills > 0) {
        this.bonusBatchKills += laserKills;
        this.bonusBatchScore += laserScore;
        this.bonusBatchTimer = 0.14;
        sounds.play('crunch');
        if (this.bonusBatchKills >= 15) this.triggerMultikillBanner();
      }
    }

    // 2. Black Hole Singularity physical gravitation & consumption
    if (this.bonusVortex) {
      this.bonusVortex.life -= dt;
      const vx = this.bonusVortex.x;
      const vy = this.bonusVortex.y;
      const suctionRadius = 260;
      const eventHorizon = 40;
      let vortexKills = 0;
      let vortexScore = 0;

      for (let gi = 0; gi < this.bonusActiveCount; gi++) {
        const g = this.bonusGhosts[gi];
        const dx = vx - g.x;
        const dy = vy - g.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= eventHorizon) {
          // Devoured into singularity!
          g.alive = false;
          vortexKills++;
          this.bonusKills++;
          const pts = 550 + Math.min(3000, this.bonusKills * 25);
          vortexScore += pts;
          this.bonusScore += pts;
          this.score += pts;
          particles.emit(g.x, g.y, 10, '#b000ff', { speed: 140, size: 4, life: 0.45 });
          const lastIdx = this.bonusActiveCount - 1;
          if (gi !== lastIdx) {
            this.bonusGhosts[gi] = this.bonusGhosts[lastIdx];
            this.bonusGhosts[lastIdx] = g;
          }
          this.bonusActiveCount--;
          gi--;
        } else if (dist < suctionRadius) {
          // Strong inward gravitational pull
          const pull = (1 - dist / suctionRadius) * 220;
          g.x += (dx / dist) * pull * dt;
          g.y += (dy / dist) * pull * dt;
        }
      }

      if (vortexKills > 0) {
        this.bonusBatchKills += vortexKills;
        this.bonusBatchScore += vortexScore;
        this.bonusBatchTimer = 0.14;
        sounds.play('pellet');
        if (this.bonusBatchKills >= 15) this.triggerMultikillBanner();
      }

      if (this.bonusVortex.life <= 0) {
        particles.emit(vx, vy, 60, '#ff00ff', { speed: 220, size: 5, life: 0.65 });
        particles.flash('#bb44ff', 0.25);
        this.bonusVortex = null;
      }
    }

    // 3. Advancing Cosmic Tsunami Wave sweeping from left to right
    if (this.bonusTsunamiX >= 0) {
      const tsunamiSpeed = BONUS_ARENA_W * 0.95; // traverses arena in ~1.05s
      this.bonusTsunamiX += tsunamiSpeed * dt;
      let tsunamiKills = 0;
      let tsunamiScore = 0;

      for (let gi = 0; gi < this.bonusActiveCount; gi++) {
        const g = this.bonusGhosts[gi];
        if (g.x <= this.bonusTsunamiX + 25) {
          g.alive = false;
          tsunamiKills++;
          this.bonusKills++;
          const pts = 500 + Math.min(3000, this.bonusKills * 25);
          tsunamiScore += pts;
          this.bonusScore += pts;
          this.score += pts;
          particles.emit(g.x, g.y, 8, '#00f0ff', { speed: 180, size: 4, life: 0.45 });
          const lastIdx = this.bonusActiveCount - 1;
          if (gi !== lastIdx) {
            this.bonusGhosts[gi] = this.bonusGhosts[lastIdx];
            this.bonusGhosts[lastIdx] = g;
          }
          this.bonusActiveCount--;
          gi--;
        }
      }

      if (tsunamiKills > 0) {
        this.bonusBatchKills += tsunamiKills;
        this.bonusBatchScore += tsunamiScore;
        this.bonusBatchTimer = 0.14;
        sounds.play('crunch');
        if (this.bonusBatchKills >= 20) this.triggerMultikillBanner();
      }

      if (this.bonusTsunamiX > BONUS_ARENA_W + 80) {
        this.bonusTsunamiX = -1;
      }
    }

    // 4. Expanding Supernova Shockwave Ring animation & expansion
    if (this.bonusNovaRing && this.bonusNovaRing.life > 0) {
      this.bonusNovaRing.life -= dt;
      this.bonusNovaRing.radius += 550 * dt;
      if (this.bonusNovaRing.life <= 0) {
        this.bonusNovaRing = null;
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
        this.madnessKills += careerBonusKills;
        particles.addPop(BONUS_ARENA_W / 2, BONUS_ARENA_H / 2 - 70, `+${careerBonusKills} CAREER KILLS (100:1)`, '#ffd700', 20);
      }

      // Vortex Mode XP attribution: 1 XP per 400 pts scored
      const vortexXp = Math.floor(this.bonusScore / 400);
      if (vortexXp > 0) {
        const lvlUpVortex = experienceSystem.addXp(vortexXp, 'vortex_score');
        if (lvlUpVortex) {
          this.lives = Math.min(5, this.lives + 1);
          particles.addPop(BONUS_ARENA_W / 2, BONUS_ARENA_H / 2 - 40, '+1 VIE !', '#00ffaa', 22);
        }
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
      title = `CATACLYSM x${bk}`;
      col = '#ffd700';
    } else if (bk >= 20) {
      title = `OBLITERATION x${bk}`;
      col = '#d946ef';
    }
    this.bonusMultikillBanner = {
      text: title,
      subtext: `+${sc.toLocaleString('en-US')} PTS`,
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
        if (powerups.fx.phase > 0) {
          continue;
        } else if (this.combo.m >= 32) {
          // x32 GOD MODE / x64 SINGULARITY: Devour any ghost including Titans on contact!
          this.onKillGhost(e, ep.x, ep.y);
          particles.shake(e.isTitan ? 12 : 6, 0.25);
          particles.flash(e.isTitan ? '#ff0033' : '#ffd700', 0.2);
          particles.addPop(ep.x, ep.y - 15, e.isTitan ? 'TITAN SLAYED !' : 'x32 ANNIHILATION !', '#ffd700', 18);
          sounds.play(e.isTitan ? 'nova' : 'pellet');
        } else if (e.isTitan) {
          // Titans are immune to normal pellets! If touched without Invincibility/Singularity, Pac-Man dies!
          particles.addPop(ep.x, ep.y - 20, 'TITAN IMMUNE TO PELLETS !', '#ff0055', 18);
          particles.flash('#ff0033', 0.4);
          this.playerDie();
          return;
        } else if (e.st === 'flee' || e.frozen) {
          this.onKillGhost(e, ep.x, ep.y);
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
          const maxChrono = progression.getSkillLevel('chrono') === 2 ? 150 : CHRONO_MAX;
          this.chronoEnergy = Math.min(maxChrono, this.chronoEnergy + CHRONO_NM_RECHARGE);
          const lvlUp = experienceSystem.addXp(60, 'near_miss');
          if (lvlUp) {
            this.lives = Math.min(5, this.lives + 1);
            particles.addPop(pp.x, pp.y - 35, '+1 VIE !', '#00ffaa', 22);
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

      const isWide = this.maze.cols > 21;
      const decayDuration = isWide ? COMBO_DECAY_WIDE : COMBO_DECAY;

      if (isPellet) {
        const isSuperPellet = progression.getSkillLevel('super_pellet') >= 1;
        const pts = 50 * this.combo.m;
        this.score += pts;
        particles.addPop(px, py - 15, '+' + pts, '#ff5555', 18);
        particles.emit(px, py, 20, C_PELLET, { speed: 100, size: 4, life: 0.6 });
        powerups.triggerPredator(this.enemyManager.enemies, isSuperPellet);
        particles.shake(4, 0.2);
        sounds.play('pellet');
        this.player.addSuperPelletBoost();

        if (isSuperPellet) {
          particles.addPop(px, py - 38, 'POWER PELLET: SCARED REINFORCEMENTS!', '#ffd700', 16);
          particles.flash('#ffd700', 0.18);
        }

        // Super-pellets progress the combo.
        this.combo.n += 4;
        const oldM = this.combo.m;
        if (oldM < 64) {
          const tier = getComboTier(this.combo.n, isWide);
          this.combo.m = CM[tier];

          if (this.combo.m >= 32) {
            if (oldM < 32) {
              this.combo.t = GOD_MODE_DURATION;
            }
          } else {
            // Power pellet sustains combo timer
            this.combo.t = decayDuration;
          }
        }

        const maxChrono = progression.getSkillLevel('chrono') === 2 ? 150 : CHRONO_MAX;
        this.chronoEnergy = Math.min(maxChrono, this.chronoEnergy + 6.0);

        const lvlUpPellet = experienceSystem.addXp(30, 'pellet');
        if (lvlUpPellet) {
          this.lives = Math.min(5, this.lives + 1);
          particles.addPop(px, py - 35, '+1 VIE !', '#00ffaa', 22);
        }

        if (this.combo.m > oldM && this.combo.m > 1) {
          const tier = getComboTier(this.combo.n, isWide);
          this.triggerComboStep(tier, px, py);
        }
      } else {
        const maxChrono = progression.getSkillLevel('chrono') === 2 ? 150 : CHRONO_MAX;
        this.chronoEnergy = Math.min(maxChrono, this.chronoEnergy + CHRONO_DOT_RECHARGE);
        this.player.addDotSpeed(this.combo.m);
        this.combo.n++;
        const oldM = this.combo.m;
        const tier = getComboTier(this.combo.n, isWide);
        if (oldM < 64) {
          this.combo.m = CM[tier];

          if (this.combo.m >= 32) {
            if (oldM < 32) {
              this.combo.t = GOD_MODE_DURATION;
            }
          } else {
            // Normal dot sustains combo timer
            this.combo.t = decayDuration;
          }
        }

        const pts = 10 * this.combo.m;
        this.score += pts;

        const lvlUpDot = experienceSystem.addXp(5, 'dot');
        if (lvlUpDot) {
          this.lives = Math.min(5, this.lives + 1);
          particles.addPop(px, py - 35, '+1 VIE !', '#00ffaa', 22);
        }

        // Floating +XXX score popup above eaten dot!
        particles.addPop(px, py - 10, '+' + pts, CC[tier], 10 + tier * 2);
        particles.emit(px, py, 2 + tier * 2, C_DOT, { speed: 40 + tier * 20, size: 2 + tier, life: 0.3 + tier * 0.1 });
        sounds.play('dot', this.combo.n);

        if (this.combo.m > oldM && this.combo.m > 1) {
          this.triggerComboStep(tier, px, py);
        }
      }

      // Dot & Pellet Eating Frequency Streak (Audio & Combo Pace)
      this.dotStreak++;
      this.dotStreakTimer = STREAK_DECAY_WINDOW;

      if (this.combo.n > this.bestCombo) this.bestCombo = this.combo.n;

      if (this.maze.remainingDots <= 0 && this.state === 'playing') {
        const completedLvl = this.maze.currentLevel;
        const list = this.getCurrentLevelList();

        // Level Clear XP: +1,500 XP
        const lvlUpClear = experienceSystem.addXp(1500, 'maze_clear');
        if (lvlUpClear) {
          this.lives = Math.min(5, this.lives + 1);
          particles.addPop(px, py - 45, '+1 VIE !', '#00ffaa', 22);
        }

        // Unlock Level Completion Badges (Levels 1 to 10 in 4:3 or 16:9)
        const lvlNum = completedLvl + 1;
        if (isWide) {
          badges.unlock(`wide_lvl${lvlNum}`);
        } else {
          badges.unlock(`clear_lvl${lvlNum}`);
        }

        const bonus = 2000 + (this.wave - 1) * 500;
        this.score += bonus;
        particles.addPop(px, py - 25, `+${bonus} LEVEL CLEAR BONUS!`, '#ffd700', 22);
        sounds.play('powerup');
        particles.flash('#ffd700', 0.25);
        particles.shake(6, 0.25);

        // When completing Level 10 (last level), loop back to Level 1 and increase speed by +10%!
        if (completedLvl === list.length - 1) {
          this.loopCount++;
          badges.unlock('loop1');
          if (this.loopCount >= 2) badges.unlock('loop2');
          particles.addPop(CW / 2, HUD_H + 60, `LOOP ${this.loopCount + 1}! (+${this.loopCount * 10}% SPEED)`, '#ffd700', 24);
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
      particles.addPop(px, py - 42, 'GOD MODE: 15s INVINCIBILITY!', '#ffd700', 32);
      particles.emit(px, py, 40, '#ffd700', { speed: 200, size: 5.5, life: 0.7 });
      this.combo.t = GOD_MODE_DURATION;
      badges.unlock('combo32');
    }
  }

  private syncTouchControls() {
    const dBtn = document.getElementById('dash-btn');
    const dLbl = document.getElementById('dash-label');
    const chBtn = document.getElementById('chrono-btn');
    const chLbl = document.getElementById('chrono-label');
    const isRunActive = this.state === 'ready' || this.state === 'playing' || this.state === 'paused' || this.state === 'dying' || this.state === 'bonus';
    const dashUnlocked = progression.getSkillLevel('dash') >= 1;
    const chronoLevel = progression.getSkillLevel('chrono');
    const chronoUnlocked = isRunActive && chronoLevel >= 1;
    const isOverdrive = powerups.fx.overdrive > 0;
    const maxCd = DASH_MADNESS_CD;

    this.touchDeck.setVisible(isRunActive);
    this.touchDeck.updateDashGauge(this.player.dashCd, maxCd, isOverdrive);

    if (dBtn && dLbl) {
      dBtn.classList.remove('cooling', 'locked', 'overdrive');

      if (!isRunActive) {
        dLbl.textContent = 'PLAY';
        dLbl.style.color = '#00ffff';
        dBtn.setAttribute('aria-label', 'Play');
      } else if (!dashUnlocked) {
        dBtn.classList.add('locked');
        dLbl.textContent = '10 KILLS';
        dLbl.style.color = '#ffaa00';
        dBtn.setAttribute('aria-label', 'Dash unlocked at 10 kills');
      } else if (isOverdrive) {
        dBtn.classList.add('overdrive');
        dLbl.textContent = 'NO-CD ' + powerups.fx.overdrive.toFixed(1) + 's';
        dLbl.style.color = '#00ffcc';
        dBtn.setAttribute('aria-label', 'Dash without cooldown');
      } else if (this.player.dashCd > 0) {
        dBtn.classList.add('cooling');
        dLbl.textContent = this.player.dashCd.toFixed(1) + 's';
        dLbl.style.color = '#8899aa';
        dBtn.setAttribute('aria-label', 'Dash cooling down');
      } else {
        dLbl.textContent = 'READY';
        dLbl.style.color = '#00ffff';
        dBtn.setAttribute('aria-label', 'Dash ready');
      }
    }

    const chWrap = document.getElementById('chrono-wrap');
    if (chWrap) {
      chWrap.style.display = chronoUnlocked ? 'flex' : 'none';
    }
    if (chBtn) {
      chBtn.classList.toggle('active-chrono', this.isChronoActive);
    }
    if (chLbl) chLbl.innerText = chronoUnlocked ? `${Math.round(this.chronoEnergy)}%` : 'LOCK';
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
    if (input.isLeaderboardRequested) {
      if (this.state === 'menu' || this.state === 'gameover') {
        this.state = 'leaderboard';
        leaderboard.syncRemote();
        sounds.play('click');
      } else if (this.state === 'leaderboard') {
        this.state = 'menu';
        sounds.play('click');
      }
      input.isLeaderboardRequested = false;
    }

    if (this.state === 'leaderboard') {
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

    if (input.isSettingsRequested) {
      if (this.state === 'menu' || this.state === 'gameover') {
        this.state = 'settings';
        sounds.play('click');
      } else if (this.state === 'settings') {
        this.state = 'menu';
        sounds.play('click');
      }
      input.isSettingsRequested = false;
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

    if (this.state === 'settings') {
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

    if (this.state === 'debug') {
      return;
    }

    if (input.isRestartRequested) {
      if (this.state === 'playing' || this.state === 'paused' || this.state === 'dying' || this.state === 'ready') {
        this.startGame();
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
        this.startGame();
        input.isStartRequested = false;
      }
    }

    const isSingularity = this.combo.m >= 64;
    const isInvincible = isSingularity || this.combo.m >= 32 || this.state === 'bonus';
    const isHDUnlocked = progression.totalGhosts >= HD_AUDIO_UNLOCK_KILLS;
    const isSingularityRising = this.singularityIntroTimer > 0;
    sounds.updateBGM(
      dt,
      this.state === 'playing' || this.state === 'bonus',
      isInvincible,
      isHDUnlocked,
      isSingularity,
      isSingularityRising
    );
    badges.update(dt);
    experienceSystem.update(dt);
    wobbleBanner.update(dt);
    particles.update(dt);
    this.syncTouchControls();

    // These deadlines must keep advancing through hit-stop and Chrono.
    // Pause still freezes them because only active play enters this block.
    if (this.state === 'playing') {
      this.killStreakTimer = Math.max(0, this.killStreakTimer - dt);
      if (this.killStreakTimer === 0) this.madnessStreak = 0;
      this.dotStreakTimer = Math.max(0, this.dotStreakTimer - dt);
      if (this.dotStreakTimer === 0) this.dotStreak = 0;
    }

    if (this.hitlag > 0 && this.singularityIntroTimer <= 0) {
      this.hitlag -= dt;
      return;
    }

    switch (this.state) {
      case 'ready':
        this.readyT -= dt;
        if (this.readyT <= 0) this.state = 'playing';
        break;

      case 'playing': {
        // Singularity 5.0s cinematic intro sequence & deflagration shockwave
        if (this.singularityIntroTimer > 0) {
          this.singularityIntroTimer -= dt;
          const introElapsed = 5.0 - this.singularityIntroTimer;
          const pp = this.player.getPos();

          // During the full 5.0 seconds intro: golden deflagration shockwave expands outward
          // Use full screen diagonal from any corner to guarantee coverage regardless of player position
          const screenW = this.renderer.cw;
          const screenH = ROWS * T;
          const maxR = Math.sqrt(screenW * screenW + screenH * screenH) * 1.1;
          const shockProgress = Math.min(1.0, introElapsed / 5.0);
          this.singularityShockwaveRadius = shockProgress * maxR;

          // Vaporize all spectres reached by the golden shockwave (without inflating kill streak)
          for (const e of this.enemyManager.enemies) {
            if (e.st !== 'dead' && e.st !== 'return') {
              const ep = this.enemyManager.getPos(e);
              const dist = Math.hypot(ep.x - pp.x, ep.y - pp.y);
              if (dist <= this.singularityShockwaveRadius) {
                particles.emit(ep.x, ep.y, 25, '#ffd700', { speed: 180, size: 5, life: 0.6 });
                particles.addPop(ep.x, ep.y - 12, 'VAPORIZED !', '#ffd700', 16);
                // Kill ghost but bypass streak inflation during intro cinematic
                const savedStreak = this.madnessStreak;
                const savedStreakTimer = this.killStreakTimer;
                this.onKillGhost(e, ep.x, ep.y);
                this.madnessStreak = savedStreak;
                this.killStreakTimer = savedStreakTimer;
              }
            }
          }

          // Continuous cinematic screen rumble
          particles.shake(Math.min(10, 3 + introElapsed * 1.6), 0.1);

          // When 5s intro completes: NOVA finale vaporizes ALL remaining ghosts, then launch Singularity!
          if (this.singularityIntroTimer <= 0) {
            this.singularityIntroTimer = 0;
            this.singularityShockwaveRadius = 0;
            this.hitlag = 0;

            // Full-screen Nova: destroy every remaining active ghost instantly
            for (const e of this.enemyManager.enemies) {
              if (e.st !== 'dead' && e.st !== 'return') {
                const ep = this.enemyManager.getPos(e);
                particles.emit(ep.x, ep.y, 30, '#ffd700', { speed: 220, size: 5, life: 0.7 });
                particles.addPop(ep.x, ep.y - 12, 'NOVA !', '#ffd700', 14);
                const savedStreak = this.madnessStreak;
                const savedStreakTimer = this.killStreakTimer;
                this.onKillGhost(e, ep.x, ep.y);
                this.madnessStreak = savedStreak;
                this.killStreakTimer = savedStreakTimer;
              }
              // Returning eyes are also removed by the full-screen finale.
              e.st = 'dead';
              e.frozen = false;
              e.frightened = false;
            }
            this.hitlag = 0;
            this.madnessSpawnTimer = this.enemyManager.getSwarmProfile(this.madnessKills).interval;

            // Reset streak cleanly before entering active Singularity
            this.madnessStreak = 0;
            this.killStreakTimer = 0;

            this.combo.m = 64;
            this.combo.t = SINGULARITY_DURATION;
            this.singularityNovaUsed = false;
            // Give player brief invincibility so no ghost can kill them right as they unfreeze
            this.player.invuln = Math.max(this.player.invuln, 1.5);
            sounds.play('nova');
            particles.shake(18, 0.5);
            particles.flash('#ffd700', 0.6);
            particles.addPop(this.renderer.cw / 2, HUD_H + 50, '« SINGULARITY OVERDRIVE »', '#ffd700', 26);
            particles.addPop(this.renderer.cw / 2, HUD_H + 74, '[N / X] SINGULARITY NOVA READY (1 USE)', '#00ffff', 16);
            // Do NOT return — game resumes this same frame
          } else {
            // Still in intro cinematic: freeze game logic
            return;
          }
        }

        // Bullet Time (Chrono-Shift), unlocked at 180 frags
        const chronoLevel = progression.getSkillLevel('chrono');
        const isChronoUnlocked = chronoLevel >= 1;
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

        const activeChronoScale = chronoLevel === 2 ? CHRONO_TIMESCALE_V2 : CHRONO_TIMESCALE;
        const timeScale = this.isChronoActive ? activeChronoScale : 1.0;

        this.madnessSpawnTimer -= dt * timeScale;
        if (this.madnessSpawnTimer <= 0) {
          const swarm = this.enemyManager.getSwarmProfile(this.madnessKills, this.maze.currentLevel);
          this.madnessSpawnTimer = swarm.interval;
          this.enemyManager.spawnMadness(swarm.burst, this.madnessKills, this.maze, this.maze.currentLevel);
        }

        // Action inputs
        if (input.isDashRequested) {
          this.executeDash();
          input.isDashRequested = false;
        }

        // Singularity Nova Trigger (Limit: 1 use per Singularity)
        if (input.isNovaRequested) {
          if (this.combo.m >= 64) {
            if (!this.singularityNovaUsed) {
              this.singularityNovaUsed = true;
              sounds.play('nova');
              particles.shake(20, 0.6);
              particles.flash('#ffd700', 0.6);
              const pp = this.player.getPos();
              particles.addPop(pp.x, pp.y - 35, '★ SINGULARITY NOVA ★', '#ffd700', 26);
              particles.emit(pp.x, pp.y, 80, '#ffd700', { speed: 300, size: 6, life: 0.9 });
              for (const e of this.enemyManager.enemies) {
                if (e.st !== 'dead' && e.st !== 'return') {
                  const ep = this.enemyManager.getPos(e);
                  this.onKillGhost(e, ep.x, ep.y);
                }
              }
            } else {
              const pp = this.player.getPos();
              particles.addPop(pp.x, pp.y - 25, 'NOVA DEPLETED (1/SINGULARITY)', '#ff4466', 14);
            }
          }
          input.isNovaRequested = false;
        }

        // Motion Kombos
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
              const isSingularity = this.combo.m >= 64;
              const isV2 = lvl >= 2;
              const pp = this.player.getPos();
              sounds.play('dash');
              if (isSingularity) {
                sounds.play('nova');
                particles.shake(16, 0.45);
                particles.flash('#ffd700', 0.45);
                particles.emit(pp.x, pp.y, 60, '#ffd700', { speed: 280, size: 6, life: 0.7 });
                particles.emit(pp.x, pp.y, 40, '#ff0055', { speed: 220, size: 5, life: 0.6 });
              } else {
                particles.shake(isV2 ? 8 : 6, 0.25);
                particles.flash(isV2 ? '#00ffff' : '#ff7700', 0.3);
              }
              particles.addPop(
                pp.x, pp.y - 26,
                isSingularity ? '★ COSMIC HYPER-NITRO ★' : (isV2 ? 'PLASMA BURNER V2 !' : 'NITRO FLAME JET !'),
                isSingularity ? '#ffd700' : (isV2 ? '#00ffff' : '#ff7700'),
                isSingularity ? 24 : 20
              );
            }
        );

        input.updateCooldowns(dt, this.player.getPos());

        // Incinerate ghosts touching nitro trail (boosted radius & cosmic deflagration in Singularity!)
        if (input.nitroActive > 0) {
          const isSingularity = this.combo.m >= 64;
          const hitRad = isSingularity ? T * 3.2 : T * 0.95;
          for (const tp of input.nitroTrail) {
            if (isSingularity && Math.random() < 0.3) {
              particles.emit(tp.x + (Math.random() - 0.5) * 20, tp.y + (Math.random() - 0.5) * 20, 1, '#ffd700', { speed: 60, size: 3.5, life: 0.3 });
            }
            for (const e of this.enemyManager.enemies) {
              if (e.st !== 'dead' && e.st !== 'return') {
                const ep = this.enemyManager.getPos(e);
                if (Math.hypot(ep.x - tp.x, ep.y - tp.y) < hitRad) {
                  if (isSingularity) {
                    particles.emit(ep.x, ep.y, 16, '#ffd700', { speed: 220, size: 5, life: 0.5 });
                    particles.flash('#ffd700', 0.15);
                  }
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
          input.nitroActive > 0,
          input.nextDir,
          (c, r) => this.onCollectDot(c, r),
          comboSpeedMult,
          input.heldDirections,
          chronoScale
        );
        this.enemyManager.update(dt * timeScale, this.maze, this.player.getPos(), powerups.fx.timewarp);

        // Force Field & Singularity suction (Dots & Ghosts), scaled in 16:9
        const isSingularityMode = this.combo.m >= 64;
        if (powerups.fx.magnet > 0 || isSingularityMode) {
          const isWide = this.maze.cols > 21;
          const baseR = isSingularityMode ? (isWide ? T * 4.6 : T * 3.4) : (isWide ? T * 3.4 : T * 2.2);
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

          // Kill frightened & frozen ghosts in close proximity, or suck ALL ghosts in Singularity mode!
          const ghostKillR = isSingularityMode ? (isWide ? T * 3.2 : T * 2.4) : (isWide ? T * 2.6 : T * 1.8);
          for (const e of this.enemyManager.enemies) {
            if (e.st !== 'dead' && e.st !== 'return') {
              const ep = this.enemyManager.getPos(e);
              const dist = Math.hypot(pp.x - ep.x, pp.y - ep.y);

              // Gravitational pull in Singularity mode
              if (isSingularityMode && dist < r * 1.5 && dist > 1) {
                const pullForce = (1 - dist / (r * 1.5)) * 140 * dt;
                const angle = Math.atan2(pp.y - ep.y, pp.x - ep.x);
                e.x += (Math.cos(angle) * pullForce) / T;
                e.y += (Math.sin(angle) * pullForce) / T;
              }

              if (isSingularityMode || e.st === 'flee' || e.frozen) {
                if (dist < ghostKillR) {
                  particles.emit(ep.x, ep.y, 18, isSingularityMode ? '#ffd700' : '#ff007f', { speed: 140, size: 4, life: 0.45 });
                  this.onKillGhost(e, ep.x, ep.y);
                }
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

        // Powerups & Void relic (Pass isPowerful state for dynamic Force Field priority)
        const isPlayerPowerful = (this.combo.m >= 4) || (this.madnessStreak >= 8) || (this.player.pelletSpeedBonus >= 1.2) || (powerups.fx.overdrive > 0) || (powerups.pred.on);
        powerups.update(
          dt * chronoScale,
          this.maze,
          this.player.getPos(),
          this.enemyManager.enemies,
          () => {
            // Titan transform
            sounds.play('death');
            particles.shake(12, 0.4);
            particles.flash('#ff0033', 0.5);
            particles.addPop(CW / 2, 70, 'VOID TITAN SPAWNED!', '#ff0033', 20);
          },
          () => {
            // Void Core intercepted
            this.score += 5000;
            sounds.play('powerup');
            particles.shake(8, 0.3);
            particles.flash('#00ffff', 0.4);
            particles.addPop(CW / 2, 70, 'VOID CORE ANNIHILATED! (FORCE FIELD)', '#00ffff', 20);
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
          (c, r) => this.onCollectDot(c, r),
          () => { powerups.fx.overdrive = progression.getSkillLevel('overdrive') >= 2 ? 10.0 : 8.0; }
        );

        // Combo decay
        if (this.combo.m >= 64) {
          this.combo.t -= dt * chronoScale;
          if (this.combo.t <= 0) {
            this.combo.n = 0;
            this.combo.m = 1;
            this.combo.t = 0;
            this.player.pelletSpeedBonus = 0;
            sounds.resetDotStreak();
            const pp = this.player.getPos();
            particles.addPop(pp.x, pp.y - 20, 'SINGULARITY EXPIRED (30s)', '#8899aa', 14);
          }
        } else if (this.combo.n > 0) {
          this.combo.t -= dt * chronoScale;
          if (this.combo.t <= 0) {
            const wasGod = this.combo.m >= 32;
            this.combo.n = 0;
            this.combo.m = 1;
            this.combo.t = 0;
            this.player.pelletSpeedBonus = 0;
            sounds.resetDotStreak();
            if (wasGod) {
              const pp = this.player.getPos();
              particles.addPop(pp.x, pp.y - 20, 'GOD MODE EXPIRED (15s)', '#8899aa', 14);
            }
          } else {
            const isWide = this.maze.cols > 21;
            const tier = getComboTier(this.combo.n, isWide);
            this.combo.m = CM[tier];
          }
        }

        this.checkCollisions();
        break;
      }

      case 'dying':
        this.deathT -= dt;
        if (this.deathT <= 0) {
          if (this.lives > 0) {
            const spdMult = this.loopSpeedMultiplier;
            this.player.reset(this.maze, spdMult);
            this.state = 'playing';
            this.player.invuln = 2.0;
            particles.addPop(CW / 2, HUD_H + 32, 'SHIELD ACTIVE (2s)', '#00ffff', 14);
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

  private getEffectTimers(): EffectTimer[] {
    const effects: EffectTimer[] = [];
    const add = (label: string, timer: number, maxTimer: number, color: string, icon: string) => {
      if (timer > 0) effects.push({ label, timer, maxTimer, color, icon });
    };

    // Every active effect gets an explicit countdown; icons stay compact over the board.
    add('SHIELD', this.player.invuln, 2.2, '#ffffff', 'phase');
    add('FRIGHTENED GHOSTS', powerups.pred.t, powerups.pred.maxT, '#00ffff', 'lightning');
    add('FORCE FIELD', powerups.fx.magnet, Math.max(9, powerups.getForceFieldStats(progression.totalGhosts).duration), '#00f0ff', 'magnet');
    add('PHASE', powerups.fx.phase, 4, '#ff00ff', 'phase');
    add('TIMEWARP', powerups.fx.timewarp, 5, '#b080ff', 'chrono');
    add('INFINITE DASH', powerups.fx.overdrive, progression.getSkillLevel('overdrive') >= 2 ? 10 : 8, '#00ffcc', 'overdrive');
    for (const effect of superItems.getActiveEffects()) {
      add(effect.label, effect.timer, effect.maxTimer, effect.color, effect.icon);
    }
    if (this.maze.cols > 21) {
      add('PELLET BOOST', this.player.superPelletBoostTimer, 3.5, '#ffd700', 'lightning');
    }

    return effects;
  }

  public getDebugButtons(): { id: string; label: string; key: string; color: string; active?: boolean; x: number; y: number; w: number; h: number }[] {
    const cardW = Math.min(620, this.renderer.cw - 24);
    const cardX = Math.floor((this.renderer.cw - cardW) / 2);
    const cardY = 36;
    const startY = cardY + 76;
    const colW = (cardW - 40 - 16) / 2;
    const rowH = 32;
    const gap = 6;

    const isSingularity = this.combo.m >= 64;
    const is32xGod = this.combo.m >= 32;

    const defs = [
      // Left Column: Powers & Modes
      { id: 'god_mode', label: 'TOGGLE x32 GOD MODE', key: '[G]', color: '#ffd700', active: is32xGod, col: 0, row: 0 },
      { id: 'singularity', label: 'TOGGLE x64 SINGULARITY', key: '[S]', color: '#ff00aa', active: isSingularity, col: 0, row: 1 },
      { id: 'nitro_burst', label: 'FIRE NITRO FLAME JET', key: '[N]', color: '#ff6600', col: 0, row: 2 },
      { id: 'emp_blast', label: 'FIRE WIGGLE EMP BLAST', key: '[E]', color: '#00ffff', col: 0, row: 3 },
      { id: 'enter_vortex', label: 'ENTER VORTEX ARENA', key: '[V]', color: '#d946ef', col: 0, row: 4 },
      { id: 'toggle_chrono', label: 'TOGGLE CHRONO BULLET-TIME', key: '[C]', color: '#00ffff', active: this.isChronoActive, col: 0, row: 5 },
      { id: 'infinite_dash', label: 'GIVE INFINITE DASH (OVERDRIVE)', key: '[O]', color: '#00ffcc', active: powerups.fx.overdrive > 0, col: 0, row: 6 },
      { id: 'add_life', label: 'HEAL PAC-MAN (+1 LIFE)', key: '[L]', color: '#ff3366', col: 0, row: 7 },

      // Right Column: Super-Items & Maze Triggers
      { id: 'item_nova', label: 'SUPER-ITEM: MEGA NOVA', key: '[1]', color: '#ffd700', col: 1, row: 0 },
      { id: 'item_laser', label: 'SUPER-ITEM: HYPER BEAMS', key: '[2]', color: '#00ffff', col: 1, row: 1 },
      { id: 'item_vortex', label: 'SUPER-ITEM: BLACK HOLE', key: '[3]', color: '#bb44ff', col: 1, row: 2 },
      { id: 'item_tsunami', label: 'SUPER-ITEM: LIGHT TSUNAMI', key: '[4]', color: '#ffffff', col: 1, row: 3 },
      { id: 'item_cryo', label: 'SUPER-ITEM: CRYO SHATTER', key: '[5]', color: '#aaffff', col: 1, row: 4 },
      { id: 'spawn_titan', label: 'SPAWN VOID TITAN GHOST', key: '[T]', color: '#ff0055', col: 1, row: 5 },
      { id: 'add_xp', label: 'GAIN +5,000 ACCOUNT XP', key: '[X]', color: '#ffd700', col: 1, row: 6 },
      { id: 'clear_maze_dots', label: 'AUTO-CLEAR DOTS (WARP)', key: '[W]', color: '#00ffaa', col: 1, row: 7 },
      { id: 'resume_play', label: '▶ RESUME GAMEPLAY', key: '[F2]', color: '#00ffaa', col: 0, row: 8 },
    ];

    return defs.map(d => ({
      id: d.id,
      label: d.label,
      key: d.key,
      color: d.color,
      active: d.active,
      x: cardX + 20 + d.col * (colW + 16),
      y: startY + d.row * (rowH + gap),
      w: colW,
      h: rowH
    }));
  }

  public executeDebugAction(actionId: string) {
    const pp = this.player.getPos();
    sounds.play('click');
    switch (actionId) {
      case 'god_mode':
        if (this.combo.m >= 32 && this.combo.m < 64) {
          this.combo.m = 1;
          this.combo.n = 0;
          this.combo.t = 0;
        } else {
          this.combo.n = 85;
          this.combo.m = 32;
          this.combo.t = GOD_MODE_DURATION;
          particles.flash('#ffd700', 0.3);
          particles.shake(8, 0.25);
          particles.addPop(pp.x, pp.y - 20, 'DEBUG: x32 GOD MODE', '#ffd700', 20);
        }
        break;
      case 'singularity':
        if (this.combo.m >= 64) {
          this.combo.m = 1;
          this.combo.n = 0;
          this.combo.t = 0;
        } else {
          this.combo.n = 150;
          this.combo.m = 64;
          this.combo.t = SINGULARITY_DURATION;
          this.singularityNovaUsed = false;
          particles.flash('#ff00aa', 0.4);
          particles.shake(14, 0.35);
          particles.addPop(pp.x, pp.y - 20, 'DEBUG: x64 SINGULARITY', '#ff00aa', 22);
        }
        break;
      case 'nitro_burst':
        input.nitroActive = 4.5;
        input.nitroCd = 0;
        const isSing = this.combo.m >= 64;
        sounds.play('dash');
        if (isSing) {
          sounds.play('nova');
          particles.shake(16, 0.45);
          particles.flash('#ffd700', 0.4);
          particles.emit(pp.x, pp.y, 60, '#ffd700', { speed: 280, size: 6, life: 0.7 });
        } else {
          particles.shake(8, 0.25);
          particles.flash('#ff7700', 0.3);
        }
        particles.addPop(pp.x, pp.y - 20, isSing ? 'DEBUG: SINGULARITY NITRO' : 'DEBUG: NITRO JET', isSing ? '#ffd700' : '#ff7700', 20);
        break;
      case 'emp_blast':
        sounds.play('nova');
        particles.shake(10, 0.3);
        particles.flash('#00ffff', 0.35);
        particles.emit(pp.x, pp.y, 35, '#00ffff', { speed: 220, size: 5, life: 0.6 });
        particles.addPop(pp.x, pp.y - 20, 'DEBUG: EMP BLAST', '#00ffff', 20);
        for (const e of this.enemyManager.enemies) {
          if (e.st !== 'dead' && e.st !== 'return') {
            const ep = this.enemyManager.getPos(e);
            this.onKillGhost(e, ep.x, ep.y);
          }
        }
        break;
      case 'enter_vortex':
        this.enterBonusStage();
        return;
      case 'toggle_chrono':
        this.isChronoActive = !this.isChronoActive;
        this.chronoEnergy = CHRONO_MAX;
        sounds.setChronoActive(this.isChronoActive);
        particles.addPop(pp.x, pp.y - 20, this.isChronoActive ? 'DEBUG: CHRONO ON' : 'DEBUG: CHRONO OFF', '#00ffff', 18);
        break;
      case 'infinite_dash':
        if (powerups.fx.overdrive > 0) {
          powerups.fx.overdrive = 0;
        } else {
          powerups.fx.overdrive = 12.0;
          this.player.dashCd = 0;
          particles.flash('#00ffcc', 0.3);
          particles.addPop(pp.x, pp.y - 20, 'DEBUG: OVERDRIVE DASH (12s)', '#00ffcc', 18);
        }
        break;
      case 'add_life':
        this.lives = Math.min(5, this.lives + 1);
        sounds.play('powerup');
        particles.addPop(pp.x, pp.y - 20, `DEBUG: LIVES = ${this.lives}`, '#ff3366', 20);
        break;
      case 'item_nova':
        superItems.triggerSuperItem('nova', pp, this.enemyManager.enemies, (e, x, y) => this.onKillGhost(e, x, y));
        break;
      case 'item_laser':
        superItems.triggerSuperItem('laser', pp, this.enemyManager.enemies, (e, x, y) => this.onKillGhost(e, x, y));
        break;
      case 'item_vortex':
        superItems.triggerSuperItem('vortex', pp, this.enemyManager.enemies, (e, x, y) => this.onKillGhost(e, x, y));
        break;
      case 'item_tsunami':
        superItems.triggerSuperItem('tsunami', pp, this.enemyManager.enemies, (e, x, y) => this.onKillGhost(e, x, y));
        break;
      case 'item_cryo':
        superItems.triggerSuperItem('cryo', pp, this.enemyManager.enemies, (e, x, y) => this.onKillGhost(e, x, y));
        break;
      case 'spawn_titan':
        this.enemyManager.spawnTitan(this.maze);
        sounds.play('nova');
        particles.flash('#ff0033', 0.3);
        particles.shake(8, 0.25);
        particles.addPop(pp.x, pp.y - 20, 'DEBUG: VOID TITAN SPAWNED', '#ff0033', 20);
        break;
      case 'clear_maze_dots': {
        const completedLvl = this.maze.currentLevel;
        const list = this.getCurrentLevelList();
        const nextLvl = (completedLvl + 1) % list.length;
        this.warpToLevel(nextLvl);
        sounds.play('powerup');
        particles.flash('#00ffaa', 0.3);
        particles.addPop(pp.x, pp.y - 20, `DEBUG: WARPED TO LEVEL ${nextLvl + 1}`, '#00ffaa', 20);
        this.state = 'playing';
        return;
      }
      case 'add_xp': {
        const lvlUp = experienceSystem.addXp(5000, 'debug');
        sounds.play('powerup');
        particles.flash('#ffd700', 0.4);
        particles.shake(8, 0.25);
        particles.addPop(pp.x, pp.y - 20, `DEBUG: +5,000 XP (LVL ${experienceSystem.accountLevel})`, '#ffd700', 20);
        if (lvlUp) this.lives = Math.min(5, this.lives + 1);
        break;
      }
      case 'resume_play':
        this.state = this.previousStateBeforeDebug;
        sounds.play('click');
        return;
    }
  }

  public toggleDebugMode() {
    if (this.state === 'debug') {
      this.state = this.previousStateBeforeDebug;
      sounds.play('click');
    } else {
      if (this.state === 'playing' || this.state === 'paused' || this.state === 'bonus' || this.state === 'ready') {
        this.previousStateBeforeDebug = this.state === 'paused' ? 'paused' : (this.state === 'bonus' ? 'bonus' : 'playing');
        this.state = 'debug';
        sounds.play('click');
      }
    }
  }

  private render() {
    // Chroma Awakening — mise à jour du tier à chaque frame
    const newTier = getChromaTier(progression.totalGhosts);
    if (newTier !== this.renderer.chromaTier) {
      this.renderer.chromaTier = newTier;
      // Re-rasteriser le labyrinthe avec les nouvelles couleurs de murs
      this.maze.renderOffscreen(newTier);
    }
    this.renderer.clear(this.maze.currentLevel, this.time, true);

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
        this.bonusMultikillBanner,
        this.bonusItems,
        {
          laserTimer: this.bonusLaserTimer,
          tsunamiX: this.bonusTsunamiX,
          vortex: this.bonusVortex,
          novaRing: this.bonusNovaRing
        }
      );
      if (this.bonusTallyTimer > 0) {
        this.renderer.drawBonusTally(this.bonusKills, this.bonusScore, this.time);
      }
      return;
    }

    if (this.state === 'menu') {
      const topKills = Math.max(badges.bestMadnessKills, leaderboard.getTopScore());
      this.renderer.drawMenu(this.time, topKills);
      return;
    }

    if (this.state === 'leaderboard') {
      const entries = leaderboard.getEntries();
      this.renderer.drawLeaderboard(entries, this.time, this.playerRank, this.playerDate);
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

    if (this.state === 'settings') {
      const topKills = Math.max(badges.bestMadnessKills, leaderboard.getTopScore());
      this.renderer.drawMenu(this.time, topKills);
      this.renderer.drawPause(false, 0, 0, this.time, true);
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
      powerups.draw(this.renderer.ctx, this.time);
      superItems.draw(this.renderer.ctx, this.player.getPos(), this.time);
      this.enemyManager.draw(this.renderer.ctx, this.time, powerups.pred.warn, this.isChronoActive, powerups.pred.t, powerups.pred.maxT);
      this.player.draw(
        this.renderer.ctx,
        this.time,
        is32xGod,
        powerups.pred.on,
        powerups.pred.t,
        powerups.pred.maxT,
        this.combo,
        this.isChronoActive,
        this.renderer.chromaTier,
        this.killStreakTimer > 0 ? this.madnessStreak : 0
      );
      this.renderer.ctx.restore();

      this.renderer.drawHUD(
        this.score, this.dScore, this.lives,
        this.madnessKills, this.madnessStreak, badges.bestMadnessKills,
        superItems, this.time, this.player.dashCd, this.maze.currentLevel, this.wave, this.combo, badges.hiScore,
        powerups.fx.overdrive,
        this.loopCount,
        powerups.pred.on,
        powerups.pred.t,
        powerups.pred.maxT,
        powerups.pred.warn,
        this.chronoEnergy,
        this.isChronoActive,
        progression.getSkillLevel('chrono'),
        this.dotStreak,
        this.dotStreakTimer,
        this.killStreakTimer
      );
      this.renderer.drawEffectTimers(this.getEffectTimers());
      // Onboarding skill progress is now directly integrated into the HUD (Section 6)
      this.renderer.drawPause(true, this.madnessKills, this.madnessStreak, this.time);
      return;
    }

    if (this.state === 'debug') {
      this.renderer.ctx.save();
      this.renderer.ctx.translate(particles.shk.x, HUD_H + particles.shk.y);
      this.renderer.ctx.drawImage(this.maze.mOff, 0, 0);

      const is32xGod = this.combo.m >= 32;
      if (is32xGod) {
        this.renderer.drawMaze32xSupercharge(this.maze.mOff, this.time);
      }

      this.renderer.drawDots(this.maze, this.time);
      powerups.draw(this.renderer.ctx, this.time);
      superItems.draw(this.renderer.ctx, this.player.getPos(), this.time);
      this.enemyManager.draw(this.renderer.ctx, this.time, powerups.pred.warn, this.isChronoActive, powerups.pred.t, powerups.pred.maxT);
      this.player.draw(
        this.renderer.ctx,
        this.time,
        is32xGod,
        powerups.pred.on,
        powerups.pred.t,
        powerups.pred.maxT,
        this.combo,
        this.isChronoActive,
        this.renderer.chromaTier,
        this.killStreakTimer > 0 ? this.madnessStreak : 0
      );
      this.renderer.ctx.restore();

      this.renderer.drawHUD(
        this.score, this.dScore, this.lives,
        this.madnessKills, this.madnessStreak, badges.bestMadnessKills,
        superItems, this.time, this.player.dashCd, this.maze.currentLevel, this.wave, this.combo, badges.hiScore,
        powerups.fx.overdrive,
        this.loopCount,
        powerups.pred.on,
        powerups.pred.t,
        powerups.pred.maxT,
        powerups.pred.warn,
        this.chronoEnergy,
        this.isChronoActive,
        progression.getSkillLevel('chrono'),
        this.dotStreak,
        this.dotStreakTimer,
        this.killStreakTimer
      );
      this.renderer.drawEffectTimers(this.getEffectTimers());
      this.renderer.drawDebugMenu(this.getDebugButtons(), this.time);
      return;
    }

    // Maze translation
    this.renderer.ctx.save();
    this.renderer.ctx.translate(particles.shk.x, HUD_H + particles.shk.y);
    this.renderer.ctx.drawImage(this.maze.mOff, 0, 0);

    // Electrified supercharged maze walls in 32x God Mode & 64x Singularity
    const isSingularity = this.combo.m >= 64;
    const is32xGod = this.combo.m >= 32;
    if (is32xGod || isSingularity) {
      this.renderer.drawMaze32xSupercharge(this.maze.mOff, this.time, isSingularity);
    }

    // Expanding Golden Deflagration Shockwave during Singularity intro
    if (this.singularityShockwaveRadius > 0) {
      const pp = this.player.getPos();
      const introElapsed = 5.0 - this.singularityIntroTimer;
      this.renderer.drawSingularityShockwave(pp.x, pp.y, this.singularityShockwaveRadius, introElapsed / 5.0);
    }

    this.renderer.drawDots(this.maze, this.time);
    this.renderer.drawDualSpawnMarkers(this.time, true);
    powerups.draw(this.renderer.ctx, this.time);
    this.renderer.drawNitroTrail(input.nitroTrail, isSingularity);
    // Super-Item visuals (Lasers, Vortex, Tsunami)
    superItems.draw(this.renderer.ctx, this.player.getPos(), this.time);

    this.enemyManager.draw(this.renderer.ctx, this.time, powerups.pred.warn, this.isChronoActive, powerups.pred.t, powerups.pred.maxT);
    this.player.draw(
      this.renderer.ctx,
      this.time,
      is32xGod,
      powerups.pred.on,
      powerups.pred.t,
      powerups.pred.maxT,
      this.combo,
      this.isChronoActive,
      this.renderer.chromaTier,
      this.state === 'playing' && this.killStreakTimer > 0 ? this.madnessStreak : 0
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

    // HUD & Badges
    this.renderer.drawHUD(
      this.score, this.dScore, this.lives,
      this.madnessKills, this.madnessStreak, badges.bestMadnessKills,
      superItems, this.time, this.player.dashCd, this.maze.currentLevel, this.wave, this.combo, badges.hiScore,
      powerups.fx.overdrive,
      this.loopCount,
      powerups.pred.on,
      powerups.pred.t,
      powerups.pred.maxT,
      powerups.pred.warn,
      this.chronoEnergy,
      this.isChronoActive,
      progression.getSkillLevel('chrono'),
      this.dotStreak,
      this.dotStreakTimer,
      this.killStreakTimer
    );
    this.renderer.drawEffectTimers(this.getEffectTimers());
    // Onboarding skill progress is now directly integrated into the HUD (Section 6)

    if (this.state === 'waveTrans') {
      this.renderer.drawWaveTrans(this.maze.currentLevel, this.wave, this.loopCount, true);
    }

    if (this.state === 'gameover') {
      const isNewHi = this.pendingScore >= badges.hiScore && this.pendingScore > 0;
      const bCount = Object.keys(badges.unlocked).length;
      const topMadness = Math.max(badges.bestMadnessKills, leaderboard.getTopScore());
      this.renderer.drawGameOver(
        this.pendingScore, isNewHi, this.pendingKills, this.pendingStreak, topMadness, bCount, this.time,
        this.loopCount
      );
    }

    wobbleBanner.draw(this.renderer.ctx, this.time);
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

// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — MAIN GAME ORCHESTRATOR & GAMELOOP
// ═══════════════════════════════════════════════════════════════

import { CW, CH, HUD_H, T, ROWS, COLS, HALF, DASH_CD, DASH_MADNESS_CD, HIT_DIST, NM_DIST, CM } from './config/constants';
import { sounds } from './audio/SoundManager';
import { MazeManager, LEVELS } from './levels/levels';
import { particles } from './systems/ParticleSystem';
import { input } from './core/InputManager';
import { Player } from './entities/Player';
import { EnemyManager, Ghost } from './entities/Enemy';
import { powerups } from './entities/Powerups';
import { superItems } from './systems/SuperItems';
import { badges } from './systems/BadgeSystem';
import { TouchDeckManager } from './ui/TouchDeck';
import { Renderer } from './graphics/Renderer';

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private maze: MazeManager;
  private player: Player;
  private enemyManager: EnemyManager;
  private touchDeck: TouchDeckManager;

  // Game state
  public state: 'menu' | 'ready' | 'playing' | 'paused' | 'dying' | 'waveTrans' | 'gameover' = 'menu';
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

  // Madness mode specific
  public madnessTimer: number = 30.0;
  public madnessKills: number = 0;
  public madnessStreak: number = 0;
  public madnessSpawnTimer: number = 0;

  constructor() {
    this.canvas = document.getElementById('c') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.maze = new MazeManager();
    this.player = new Player();
    this.enemyManager = new EnemyManager();
    this.touchDeck = new TouchDeckManager();

    this.bindInputs();
    this.startLoop();
  }

  private bindInputs() {
    // Mode toggle from menu
    window.addEventListener('click', (e) => {
      if (this.state !== 'menu') return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CW / rect.width;
      const scaleY = CH / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const my = CH * 0.48;
      if (y >= my && y <= my + 34) {
        if (x >= CW / 2 - 140 && x <= CW / 2 - 10) {
          this.gameMode = 'classic';
          sounds.play('dot');
        } else if (x >= CW / 2 + 10 && x <= CW / 2 + 140) {
          this.gameMode = 'madness';
          sounds.play('dot');
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

    superItems.resetAll();
    input.resetKombos();
    powerups.voidRelic = null;
    powerups.voidRelicTimer = 14.0;
    particles.paintSplats = [];

    // Always start at Level 1 (The Circuit)
    this.maze.build(0);
    this.player.reset(this.gameMode === 'madness');

    if (this.gameMode === 'madness') {
      this.enemyManager.enemies = [];
      this.enemyManager.spawnMadness(8, 0);
      this.state = 'ready';
      this.readyT = 1.5;
      sounds.play('powerup');
      particles.addPop(CW / 2, HUD_H + 50, '⚡ MADNESS SWARM ⚡', '#ffd700', 22);
    } else {
      this.enemyManager.spawnClassic(4);
      this.state = 'ready';
      this.readyT = 2.0;
      sounds.play('start');
    }
  }

  private warpToLevel(lvlIndex: number) {
    this.maze.build(lvlIndex);
    this.madnessTimer = Math.min(45, this.madnessTimer + 8.0);
    sounds.play('wave');
    particles.flash('#00ffff', 0.4);
    particles.shake(10, 0.35);
    particles.addPop(CW / 2, (ROWS * T) / 2, `🌀 WARP TO ${LEVELS[lvlIndex].name} ! (+8s)`, '#00ffff', 22);
  }

  private onKillGhost(e: Ghost, ex: number, ey: number) {
    e.st = 'return';
    e.fl = 0.15;
    powerups.pred.k++;
    badges.unlock('firstBlood');
    if (powerups.pred.k >= 4) badges.unlock('ghostHunter');

    if (this.gameMode === 'madness') {
      this.madnessKills++;
      this.madnessStreak++;
      particles.addPaintSplat(ex, ey, e.isTitan ? '#ff0055' : '#00ffff');
      this.checkRampageMilestone(this.madnessStreak);

      // Automatic level progression in Madness mode!
      if (this.madnessKills === 35 && this.maze.currentLevel === 0) this.warpToLevel(1);
      else if (this.madnessKills === 80 && this.maze.currentLevel === 1) this.warpToLevel(2);
      else if (this.madnessKills === 140 && this.maze.currentLevel === 2) this.warpToLevel(3);

      badges.saveMadnessKills(this.madnessKills);
      this.madnessTimer = Math.min(45, this.madnessTimer + 0.35);

      // Streak milestones: Unlock Super-items
      if (this.madnessStreak === 15) superItems.unlock('nova', 'MEGA NOVA', '💣');
      else if (this.madnessStreak === 35) superItems.unlock('vortex', 'BLACK HOLE', '🕳️');
      else if (this.madnessStreak === 60) superItems.unlock('laser', 'HYPER BEAMS', '⚡');
      else if (this.madnessStreak === 100) superItems.unlock('cryo', 'CRYO SHATTER', '❄️');
      else if (this.madnessStreak === 150) superItems.unlock('tsunami', 'LIGHT TSUNAMI', '👑');
      else if (this.madnessStreak > 150 && this.madnessStreak % 40 === 0) {
        const pool = ['nova', 'vortex', 'laser', 'cryo', 'tsunami'];
        const it = pool[(Math.random() * pool.length) | 0];
        const names: Record<string, string> = { nova: 'MEGA NOVA', vortex: 'BLACK HOLE', laser: 'HYPER BEAMS', cryo: 'CRYO SHATTER', tsunami: 'LIGHT TSUNAMI' };
        const icons: Record<string, string> = { nova: '💣', vortex: '🕳️', laser: '⚡', cryo: '❄️', tsunami: '👑' };
        superItems.unlock(it, names[it], icons[it]);
      }

      // 14% chance to drop powerup on tile
      if (Math.random() < 0.14 && !powerups.current) {
        const mx = Math.max(1, Math.min(COLS - 2, Math.round(ex / T)));
        const my = Math.max(1, Math.min(ROWS - 2, Math.round(ey / T)));
        if (this.maze.isWalkable(mx, my, false)) {
          powerups.current = { x: mx, y: my, type: Math.random() < 0.65 ? 'magnet' : 'nova', timer: 8 };
        }
      }

      const pts = 250 * Math.min(this.madnessStreak, 32);
      this.score += pts;
      particles.addPop(ex, ey - 15, '+' + pts, '#ffd700', 16);
    } else {
      const pts = 200 * Math.min(Math.pow(2, powerups.pred.k - 1), 8);
      this.score += pts;
      particles.addPop(ex, ey - 15, '+' + pts, '#00ffff', 18);
    }

    particles.emit(ex, ey, 8, '#00ffff', { speed: 100, size: 3.5, life: 0.35 });
    particles.shake(3, 0.12);
    particles.flash('#00ffff', 0.12);
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
    particles.emit(pp.x, pp.y, 18, '#ffffff', { speed: 140, size: 4, life: 0.8, gravity: 80 });
    particles.emit(pp.x, pp.y, 12, '#00b4ff', { speed: 100, size: 3, life: 0.6 });
    particles.shake(10, 0.4);
    particles.flash('#ff0000', 0.5);
    sounds.play('death');

    powerups.pred.on = false;
    powerups.fx.phase = 0;
    powerups.fx.timewarp = 0;
    powerups.fx.magnet = 0;
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

      if (isPellet) {
        this.score += 50 * this.combo.m;
        powerups.triggerPredator(this.enemyManager.enemies);
        particles.flash('#ff0055', 0.25);
        particles.shake(3, 0.15);
      } else {
        this.score += 10 * this.combo.m;
        sounds.play('dot');
        if (this.gameMode === 'madness') {
          this.madnessTimer = Math.min(45, this.madnessTimer + 0.04);
        }
      }

      this.combo.n++;
      this.combo.t = 1.8;
      const tier = this.combo.n >= 50 ? 4 : this.combo.n >= 25 ? 3 : this.combo.n >= 12 ? 2 : this.combo.n >= 5 ? 1 : 0;
      this.combo.m = CM[tier];
      if (this.combo.m >= 8) badges.unlock('combo8');
      if (this.combo.m >= 16) badges.unlock('combo16');

      if (this.maze.remainingDots <= 0 && this.gameMode === 'classic') {
        this.state = 'waveTrans';
        this.waveT = 2.5;
        this.wave++;
        this.score += 1000 * (this.wave - 1);
        if (this.wave >= 5) badges.unlock('wave5');
        sounds.play('wave');
      }
    }
  }

  private update(dt: number) {
    this.time += dt;
    input.pollGamepad();

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
            this.state = 'gameover';
            sounds.play('death');
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
            (c, r) => this.onCollectDot(c, r)
          );
          input.isDashRequested = false;
        }

        if (input.isItemRequested) {
          superItems.trigger(
            this.player.getPos(),
            (e, x, y) => this.onKillGhost(e, x, y),
            this.enemyManager.enemies,
            (s) => { this.madnessTimer = Math.min(45, this.madnessTimer + s); }
          );
          input.isItemRequested = false;
        }

        // Motion Kombos
        if (isMadness) {
          input.checkKombos(
            () => {
              // Wiggle EMP blast
              const pp = this.player.getPos();
              sounds.play('nova');
              particles.shake(7, 0.22);
              particles.flash('#00ffff', 0.3);
              particles.addPop(pp.x, pp.y - 26, '⚡ WIGGLE EMP BLAST !', '#00ffff', 20);
              particles.emit(pp.x, pp.y, 16, '#00ffff', { speed: 180, size: 4.5, life: 0.55 });
              for (const e of this.enemyManager.enemies) {
                if (e.st !== 'dead' && e.st !== 'return') {
                  const ep = this.enemyManager.getPos(e);
                  if (Math.hypot(ep.x - pp.x, ep.y - pp.y) < T * 4.8) {
                    this.onKillGhost(e, ep.x, ep.y);
                  }
                }
              }
              for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                  if (this.maze.dotMap[r][c]) {
                    const dx = c * T + HALF - pp.x, dy = r * T + HALF - pp.y;
                    if (Math.hypot(dx, dy) < T * 5.5) this.onCollectDot(c, r);
                  }
                }
              }
            },
            () => {
              // Nitro Flame Jet
              sounds.play('dash');
              particles.shake(6, 0.2);
              particles.flash('#ff7700', 0.28);
              const pp = this.player.getPos();
              particles.addPop(pp.x, pp.y - 26, '🔥 NITRO FLAME JET !', '#ff7700', 20);
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
        this.player.update(dt, this.maze, isMadness, input.nitroActive > 0, (c, r) => this.onCollectDot(c, r));
        this.enemyManager.update(dt, this.maze, this.player.getPos(), powerups.fx.timewarp);

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
            particles.addPop(CW / 2, 70, '✨ CŒUR DU VIDE ANÉANTI ! (+6s & SUPER-AIMANT)', '#00ffff', 20);
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

        // Super-Items update
        superItems.update(dt, this.player.getPos(), this.enemyManager.enemies, (e, x, y) => this.onKillGhost(e, x, y));

        // Combo decay
        if (this.combo.n > 0) {
          this.combo.t -= dt;
          if (this.combo.t <= 0) {
            this.combo.n = 0;
            this.combo.m = 1;
          }
        }

        this.checkCollisions();
        break;
      }

      case 'dying':
        this.deathT -= dt;
        if (this.deathT <= 0) {
          if (this.lives > 0 && (this.gameMode !== 'madness' || this.madnessTimer > 0)) {
            this.player.reset(this.gameMode === 'madness');
            if (this.gameMode === 'madness') {
              this.state = 'playing';
              this.player.invuln = 2.0;
              particles.addPop(CW / 2, HUD_H + 32, '⚡ BOUCLIER ACTIF (2s)', '#00ffff', 14);
            } else {
              this.enemyManager.spawnClassic(4);
              this.state = 'ready';
              this.readyT = 1.5;
            }
          } else {
            this.state = 'gameover';
            badges.saveScore(this.score);
            badges.saveMadnessKills(this.madnessKills);
            sounds.play('death');
          }
        }
        break;

      case 'waveTrans':
        this.waveT -= dt;
        if (this.waveT <= 0) {
          const nextLvl = (this.maze.currentLevel + 1) % LEVELS.length;
          this.maze.build(nextLvl);
          this.enemyManager.spawnClassic(4);
          this.player.reset(false);
          this.state = 'ready';
          this.readyT = 1.8;
        }
        break;
    }
  }

  private render() {
    this.renderer.clear(this.maze.currentLevel);

    if (this.state === 'menu') {
      this.renderer.drawMenu(this.gameMode, this.time, badges.hiScore, badges.bestMadnessKills);
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
      this.player.draw(this.renderer.ctx, this.time, this.gameMode === 'madness');
      this.renderer.ctx.restore();

      this.renderer.drawHUD(
        this.gameMode === 'madness',
        this.score, this.dScore, this.lives,
        this.madnessKills, this.madnessStreak, this.madnessTimer, badges.bestMadnessKills,
        superItems, this.time, this.player.dashCd, this.maze.currentLevel, this.wave, this.combo, badges.hiScore
      );
      this.renderer.drawPause(this.gameMode === 'madness', this.madnessKills, this.madnessStreak);
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
    this.player.draw(this.renderer.ctx, this.time, this.gameMode === 'madness');

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

    // Touch button on-screen
    if (this.state === 'playing') {
      this.renderer.drawTouchDashButton(this.player.dashCd, this.gameMode === 'madness' ? DASH_MADNESS_CD : DASH_CD);
    }

    // HUD & Badges
    this.renderer.drawHUD(
      this.gameMode === 'madness',
      this.score, this.dScore, this.lives,
      this.madnessKills, this.madnessStreak, this.madnessTimer, badges.bestMadnessKills,
      superItems, this.time, this.player.dashCd, this.maze.currentLevel, this.wave, this.combo, badges.hiScore
    );
    badges.drawBanner(this.renderer.ctx);

    if (this.state === 'waveTrans') {
      this.renderer.drawWaveTrans(this.maze.currentLevel, this.wave);
    }

    if (this.state === 'gameover') {
      const isNewHi = this.score >= badges.hiScore && this.score > 0;
      const bCount = Object.keys(badges.unlocked).length;
      this.renderer.drawGameOver(
        this.gameMode === 'madness',
        this.score, isNewHi, this.madnessKills, this.madnessStreak, badges.bestMadnessKills, bCount, this.time
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

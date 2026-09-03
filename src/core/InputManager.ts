// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — INPUT & MOTION KOMBOS MANAGER
// ═══════════════════════════════════════════════════════════════

import { particles } from '../systems/ParticleSystem';
import { progression } from '../systems/ProgressionSystem';

export interface MotionRecord {
  dir: string;
  time: number;
}

export class InputManager {
  public keys: Record<string, boolean> = {};
  public dir = { x: 0, y: 0 };
  public nextDir = { x: 0, y: 0 };
  public isDashRequested: boolean = false;
  public isItemRequested: boolean = false;
  public isPauseRequested: boolean = false;
  public isAudioToggleRequested: boolean = false;
  public isStartRequested: boolean = false;
  public isRestartRequested: boolean = false;
  public isCodexRequested: boolean = false;
  public isRestoreRequested: boolean = false;
  public isSelectMode1Requested: boolean = false;
  public isSelectMode2Requested: boolean = false;
  public isLeaderboardRequested: boolean = false;

  public motionHistory: MotionRecord[] = [];
  public wiggleCd: number = 0;
  public nitroCd: number = 0;
  public nitroActive: number = 0;
  public nitroTrail: { x: number; y: number; life: number; maxLife: number }[] = [];

  constructor() {
    this.setupKeyboard();
  }

  private setupKeyboard() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys[e.code] = true;

      // Directions
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.setNextDir(0, -1);
        e.preventDefault();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.setNextDir(0, 1);
        e.preventDefault();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.setNextDir(-1, 0);
        e.preventDefault();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.setNextDir(1, 0);
        e.preventDefault();
      }

      // Actions
      if (e.code === 'Space') {
        this.isDashRequested = true;
        this.isStartRequested = true;
        e.preventDefault();
      }
      if (e.code === 'Enter') {
        this.isStartRequested = true;
      }
      if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyQ' || e.code === 'KeyF') {
        this.isItemRequested = true;
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.isPauseRequested = true;
      }
      if (e.code === 'KeyM') {
        this.isAudioToggleRequested = true;
      }
      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        this.isSelectMode1Requested = true;
      }
      if (e.code === 'Digit2' || e.code === 'Numpad2') {
        this.isSelectMode2Requested = true;
      }
      if (e.code === 'KeyL') {
        this.isLeaderboardRequested = true;
      }
      if (e.code === 'KeyR') {
        this.isRestartRequested = true;
      }
      if (e.code === 'KeyS') {
        this.isCodexRequested = true;
      }
      if (e.code === 'KeyK') {
        this.isRestoreRequested = true;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    });
  }

  public setNextDir(dx: number, dy: number) {
    this.nextDir = { x: dx, y: dy };
    const dirKey = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up';
    this.registerMotion(dirKey);
  }

  public registerMotion(dirKey: string) {
    const now = performance.now();
    this.motionHistory.push({ dir: dirKey, time: now });
    if (this.motionHistory.length > 8) this.motionHistory.shift();
  }

  public checkKombos(onWiggle: (lvl: number) => void, onNitro: (lvl: number) => void) {
    const now = performance.now();
    const recent = this.motionHistory.filter(h => now - h.time < 750);
    if (recent.length < 4) return;
    const last4 = recent.map(r => r.dir).slice(-4).join('-');

    // Wiggle Kombo: Left-Right-Left-Right
    if ((last4 === 'left-right-left-right' || last4 === 'right-left-right-left') && this.wiggleCd <= 0) {
      const lvl = progression.getSkillLevel('wiggle');
      if (lvl >= 1) {
        this.wiggleCd = lvl >= 2 ? 3.0 : 3.5;
        this.motionHistory = [];
        onWiggle(lvl);
        return;
      }
    }

    // Nitro Kombo: Up-Down-Up-Down
    if ((last4 === 'up-down-up-down' || last4 === 'down-up-down-up') && this.nitroCd <= 0) {
      const lvl = progression.getSkillLevel('nitro');
      if (lvl >= 1) {
        this.nitroCd = lvl >= 2 ? 3.5 : 4.0;
        this.nitroActive = lvl >= 2 ? 4.5 : 3.2;
        this.motionHistory = [];
        onNitro(lvl);
        return;
      }
    }
  }

  public updateCooldowns(dt: number, plPos: { x: number; y: number }) {
    if (this.wiggleCd > 0) this.wiggleCd -= dt;
    if (this.nitroCd > 0) this.nitroCd -= dt;
    if (this.nitroActive > 0) {
      this.nitroActive -= dt;
      const isV2 = progression.getSkillLevel('nitro') >= 2;
      const tLife = isV2 ? 2.5 : 1.6;
      this.nitroTrail.push({ x: plPos.x, y: plPos.y, life: tLife, maxLife: tLife });
      particles.emit(plPos.x, plPos.y, isV2 ? 4 : 2, isV2 ? '#00ffff' : '#ff7700', { speed: 60, size: isV2 ? 4 : 3, life: 0.3 });
    }
    for (let i = this.nitroTrail.length - 1; i >= 0; i--) {
      const tp = this.nitroTrail[i];
      tp.life -= dt;
      if (tp.life <= 0) this.nitroTrail.splice(i, 1);
    }
  }

  public pollGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (!gp) continue;

      // Stick / D-Pad
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      const th = 0.35;
      if (ax < -th || (gp.buttons[14] && gp.buttons[14].pressed)) this.setNextDir(-1, 0);
      else if (ax > th || (gp.buttons[15] && gp.buttons[15].pressed)) this.setNextDir(1, 0);
      else if (ay < -th || (gp.buttons[12] && gp.buttons[12].pressed)) this.setNextDir(0, -1);
      else if (ay > th || (gp.buttons[13] && gp.buttons[13].pressed)) this.setNextDir(0, 1);

      // A / X / Triggers = Dash / Start
      if ((gp.buttons[0] && gp.buttons[0].pressed) || (gp.buttons[2] && gp.buttons[2].pressed)) {
        this.isDashRequested = true;
        this.isStartRequested = true;
      }
      // B / Y = Item
      if ((gp.buttons[1] && gp.buttons[1].pressed) || (gp.buttons[3] && gp.buttons[3].pressed)) {
        this.isItemRequested = true;
      }
      // Start = Pause
      if (gp.buttons[9] && gp.buttons[9].pressed) {
        this.isPauseRequested = true;
      }
    }
  }

  public resetKombos() {
    this.motionHistory = [];
    this.wiggleCd = 0;
    this.nitroCd = 0;
    this.nitroActive = 0;
    this.nitroTrail = [];
  }
}

export const input = new InputManager();

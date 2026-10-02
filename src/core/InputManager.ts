// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — INPUT & SHIFT SEQUENCE KOMBOS MANAGER
// ═══════════════════════════════════════════════════════════════

import { particles } from '../systems/ParticleSystem';
import { progression } from '../systems/ProgressionSystem';
import { experienceSystem } from '../systems/ExperienceSystem';
import { profileManager } from '../systems/ProfileManager';
import { sounds } from '../audio/SoundManager';
import { BASE_NITRO_CD, BASE_WIGGLE_CD } from '../config/constants';

export interface MotionRecord {
  dir: string;
  time: number;
}

export interface SkillComboDef {
  id: string;
  name: string;
  sequence: string[];
  altSequence?: string[];
  baseCd: number;
  manaCost: number;
}

export const SKILL_COMBOS: SkillComboDef[] = [
  {
    id: 'wiggle',
    name: 'WIGGLE EMP SHOCKWAVE',
    sequence: ['left', 'right', 'left', 'right'],
    altSequence: ['right', 'left', 'right', 'left'],
    baseCd: BASE_WIGGLE_CD,
    manaCost: 25,
  },
  {
    id: 'nitro',
    name: 'NITRO FLAME JET',
    sequence: ['up', 'down', 'up', 'down'],
    altSequence: ['down', 'up', 'down', 'up'],
    baseCd: BASE_NITRO_CD,
    manaCost: 20,
  },
  {
    id: 'quantum_laser',
    name: 'QUANTUM LASER MATRIX',
    sequence: ['right', 'down', 'right', 'down'],
    altSequence: ['left', 'up', 'right', 'down'],
    baseCd: 24.0,
    manaCost: 40,
  },
  {
    id: 'kinetic_bastion',
    name: 'KINETIC BASTION SHIELD',
    sequence: ['down', 'down', 'up', 'up'],
    altSequence: ['down', 'left', 'down', 'right'],
    baseCd: 26.0,
    manaCost: 35,
  },
  {
    id: 'singularity_nova',
    name: 'VOID NOVA TRANSCENDENCE',
    sequence: ['up', 'right', 'down', 'left'],
    altSequence: ['up', 'up', 'down', 'down'],
    baseCd: 40.0,
    manaCost: 50,
  }
];

export class InputManager {
  public keys: Record<string, boolean> = {};
  public dir = { x: 0, y: 0 };
  public nextDir = { x: 0, y: 0 };
  public isDashRequested: boolean = false;
  public isChronoRequested: boolean = false;
  public isChronoKeyHeld: boolean = false;
  public isPauseRequested: boolean = false;
  public isAudioToggleRequested: boolean = false;
  public isStartRequested: boolean = false;
  public isRestartRequested: boolean = false;
  public isCodexRequested: boolean = false;
  public isBadgesRequested: boolean = false;
  public isRestoreRequested: boolean = false;
  public isLeaderboardRequested: boolean = false;
  public isInstructionsRequested: boolean = false;
  public isSettingsRequested: boolean = false;
  public isNovaRequested: boolean = false;

  // ─── Gamepad Extended State & Edge Triggering ───
  public isGamepadConnected: boolean = false;
  private prevButtons: boolean[] = [];
  private prevAxes: [number, number] = [0, 0];
  public gpJustPressed: Record<string, boolean> = {
    a: false,
    b: false,
    x: false,
    y: false,
    lb: false,
    rb: false,
    select: false,
    start: false,
    up: false,
    down: false,
    left: false,
    right: false,
  };

  // ─── Shift Double-Tap Sequence Mode ───
  public isSequenceMode: boolean = false;
  public sequenceBuffer: string[] = [];
  public sequenceStatus: 'idle' | 'recording' | 'valid' | 'invalid' | 'cooldown' | 'executed' = 'idle';
  public sequenceFeedback: string = '';
  public sequenceFeedbackTimer: number = 0;
  public readonly SEQUENCE_DURATION: number = 4;
  public sequenceTimeLeft: number = 0;
  private sequenceEndTime: number = 0;
  public sequenceMatchedSkill: string | null = null;
  public lastShiftPressTime: number = 0;
  public readonly DOUBLE_TAP_WINDOW_MS: number = 300;
  public heldShiftKeys: Set<string> = new Set<string>();
  public currentMana: number = 100;

  // External execution callback wired to main.ts
  public onSkillExecuted?: (skillId: string, lvl: number, manaCost: number) => void;

  // ─── Motion & Cooldown State ───
  public motionHistory: MotionRecord[] = [];
  public wiggleCd: number = 0;
  public nitroCd: number = 0;
  public nitroActive: number = 0;
  public nitroTrail: { x: number; y: number; life: number; maxLife: number }[] = [];
  public laserCd: number = 0;
  public bastionCd: number = 0;
  public bastionActive: number = 0;
  public singularityNovaCd: number = 0;

  public heldDirections: { x: number; y: number; code: string }[] = [];

  constructor() {
    this.setupKeyboard();
  }

  public handleChronoDown() {
    const now = performance.now();
    const isDoubleTap = this.lastShiftPressTime > 0 && (now - this.lastShiftPressTime) <= this.DOUBLE_TAP_WINDOW_MS;

    if (isDoubleTap) {
      // Give the player a short, real-time window while the world is frozen.
      this.isSequenceMode = true;
      this.sequenceTimeLeft = this.SEQUENCE_DURATION;
      this.sequenceEndTime = now + this.SEQUENCE_DURATION * 1000;
      this.sequenceBuffer = [];
      this.sequenceStatus = 'recording';
      this.sequenceFeedback = 'ENTER 4 DIRECTIONS';
      this.sequenceFeedbackTimer = 0;
      this.sequenceMatchedSkill = null;
      sounds.play('sequence_step', 0);
    } else {
      // Standard single-hold Chrono bullet time
      this.isSequenceMode = false;
      this.sequenceTimeLeft = 0;
      this.sequenceEndTime = 0;
      this.sequenceBuffer = [];
      this.sequenceStatus = 'idle';
      this.sequenceFeedback = '';
    }

    this.lastShiftPressTime = now;
    this.isChronoKeyHeld = true;
  }

  public handleChronoUp() {
    this.isChronoKeyHeld = false;
    if (this.isSequenceMode) {
      this.evaluateAndTriggerSequence();
      this.isSequenceMode = false;
      this.sequenceTimeLeft = 0;
      this.sequenceEndTime = 0;
    }
    this.heldDirections = [];
  }

  public cancelChronoInput() {
    this.isChronoKeyHeld = false;
    this.lastShiftPressTime = 0;
    this.isSequenceMode = false;
    this.sequenceTimeLeft = 0;
    this.sequenceEndTime = 0;
    this.sequenceBuffer = [];
    this.sequenceStatus = 'idle';
    this.sequenceFeedback = '';
    this.sequenceFeedbackTimer = 0;
    this.heldDirections = [];
    this.heldShiftKeys.clear();
  }

  public addSequenceDirection(dirKey: string) {
    if (this.sequenceBuffer.length >= 4) return;
    this.sequenceBuffer.push(dirKey);
    sounds.play('sequence_step', this.sequenceBuffer.length);
    this.updateSequencePreview();
  }

  public updateSequenceTimer() {
    if (!this.isSequenceMode) return;
    this.sequenceTimeLeft = Math.max(0, (this.sequenceEndTime - performance.now()) / 1000);
    if (this.sequenceTimeLeft > 0) return;

    this.evaluateAndTriggerSequence();
    if (this.sequenceStatus === 'idle' || (this.sequenceStatus === 'invalid' && !this.sequenceMatchedSkill)) {
      this.sequenceStatus = 'invalid';
      this.sequenceFeedback = 'TIME UP';
      this.sequenceFeedbackTimer = 0.9;
      if (this.sequenceBuffer.length === 0) sounds.play('sequence_fail');
    }
    this.isSequenceMode = false;
    this.sequenceEndTime = 0;
    this.isChronoKeyHeld = false;
    this.isChronoRequested = false;
    this.lastShiftPressTime = 0;
    this.heldDirections = [];
  }

  private matchCombo(seq: string[]): SkillComboDef | null {
    const seqStr = seq.join('-');
    for (const combo of SKILL_COMBOS) {
      if (combo.sequence.join('-') === seqStr || (combo.altSequence && combo.altSequence.join('-') === seqStr)) {
        return combo;
      }
    }
    return null;
  }

  public getSkillAvailability(skillId: string): { unlocked: boolean; cd: number; level: number; manaCost: number; hasMana: boolean } {
    const combo = SKILL_COMBOS.find(c => c.id === skillId);
    const manaCost = combo ? combo.manaCost : 0;
    const hasMana = profileManager.gameMode !== 'custom' || this.currentMana >= manaCost;

    switch (skillId) {
      case 'wiggle': {
        const lvl = Math.max(progression.getSkillLevel('wiggle'), experienceSystem.getSkillRank('emp_overcharge') > 0 ? 1 : 0);
        return { unlocked: lvl >= 1, cd: this.wiggleCd, level: lvl, manaCost, hasMana };
      }
      case 'nitro': {
        const lvl = Math.max(progression.getSkillLevel('nitro'), experienceSystem.getSkillRank('hyper_nitro') > 0 ? 1 : 0);
        return { unlocked: lvl >= 1, cd: this.nitroCd, level: lvl, manaCost, hasMana };
      }
      case 'quantum_laser': {
        const lvl = experienceSystem.getSkillRank('quantum_laser');
        return { unlocked: lvl >= 1, cd: this.laserCd, level: lvl, manaCost, hasMana };
      }
      case 'kinetic_bastion': {
        const lvl = experienceSystem.getSkillRank('kinetic_bastion');
        return { unlocked: lvl >= 1, cd: this.bastionCd, level: lvl, manaCost, hasMana };
      }
      case 'singularity_nova': {
        const lvl = experienceSystem.getSkillRank('singularity_nova');
        return { unlocked: lvl >= 1, cd: this.singularityNovaCd, level: lvl, manaCost, hasMana };
      }
      default:
        return { unlocked: false, cd: 0, level: 0, manaCost: 0, hasMana: true };
    }
  }

  public updateSequencePreview() {
    const matched = this.matchCombo(this.sequenceBuffer);
    if (matched) {
      this.sequenceMatchedSkill = matched.id;
      const av = this.getSkillAvailability(matched.id);
      if (!av.unlocked) {
        this.sequenceStatus = 'invalid';
        this.sequenceFeedback = `${matched.name} (LOCKED IN CODEX)`;
      } else if (av.cd > 0) {
        this.sequenceStatus = 'cooldown';
        this.sequenceFeedback = `${matched.name} ON COOLDOWN (${av.cd.toFixed(1)}s)`;
      } else if (!av.hasMana) {
        this.sequenceStatus = 'invalid';
        this.sequenceFeedback = `NEED ${av.manaCost} MANA (HAVE ${Math.floor(this.currentMana)})`;
      } else {
        this.sequenceStatus = 'valid';
        this.sequenceFeedback = `READY: ${matched.name} [${av.manaCost} MP]`;
      }
      return;
    }

    // Check if current buffer is a prefix of any combo
    const curStr = this.sequenceBuffer.join('-');
    const isPrefix = SKILL_COMBOS.some(c =>
      c.sequence.join('-').startsWith(curStr) || (c.altSequence && c.altSequence.join('-').startsWith(curStr))
    );

    if (isPrefix) {
      this.sequenceStatus = 'recording';
      this.sequenceFeedback = 'ENTERING SEQUENCE...';
      this.sequenceMatchedSkill = null;
    } else {
      this.sequenceStatus = 'invalid';
      this.sequenceFeedback = 'UNKNOWN SEQUENCE';
      this.sequenceMatchedSkill = null;
    }
  }

  public evaluateAndTriggerSequence() {
    if (this.sequenceBuffer.length === 0) {
      this.sequenceStatus = 'idle';
      this.sequenceFeedback = '';
      return;
    }

    const matched = this.matchCombo(this.sequenceBuffer);
    if (!matched) {
      this.sequenceStatus = 'invalid';
      this.sequenceFeedback = 'INVALID SEQUENCE';
      this.sequenceFeedbackTimer = 0.7;
      sounds.play('sequence_fail');
      return;
    }

    const av = this.getSkillAvailability(matched.id);
    if (!av.unlocked) {
      this.sequenceStatus = 'invalid';
      this.sequenceFeedback = `${matched.name} LOCKED!`;
      this.sequenceFeedbackTimer = 1.0;
      sounds.play('sequence_fail');
      return;
    }

    if (av.cd > 0) {
      this.sequenceStatus = 'cooldown';
      this.sequenceFeedback = `${matched.name} ON COOLDOWN (${av.cd.toFixed(1)}s)`;
      this.sequenceFeedbackTimer = 1.0;
      sounds.play('sequence_fail');
      return;
    }

    if (!av.hasMana) {
      this.sequenceStatus = 'invalid';
      this.sequenceFeedback = `NOT ENOUGH MANA (${Math.floor(this.currentMana)}/${av.manaCost})`;
      this.sequenceFeedbackTimer = 1.0;
      sounds.play('sequence_fail');
      return;
    }

    // Skill is valid, unlocked, and ready: Execute ONCE!
    this.startSkillCooldown(matched.id, av.level);
    this.sequenceStatus = 'executed';
    this.sequenceFeedback = `★ ${matched.name} ACTIVATED! ★`;
    this.sequenceFeedbackTimer = 0;
    this.isSequenceMode = false;
    this.sequenceBuffer = [];
    sounds.play('sequence_success');

    if (this.onSkillExecuted) {
      this.onSkillExecuted(matched.id, av.level, av.manaCost);
    }
  }

  public startSkillCooldown(skillId: string, lvl: number) {
    const cdMult = experienceSystem.getSpellCooldownMultiplier();
    switch (skillId) {
      case 'wiggle': {
        const empRank = experienceSystem.getSkillRank('emp_overcharge');
        const baseCd = lvl >= 2 ? BASE_WIGGLE_CD * 0.75 : BASE_WIGGLE_CD;
        this.wiggleCd = Math.max(3.0, baseCd * (1.0 - empRank * 0.10) * cdMult);
        break;
      }
      case 'nitro': {
        const baseCd = lvl >= 2 ? BASE_NITRO_CD * 0.75 : BASE_NITRO_CD;
        this.nitroCd = Math.max(3.0, baseCd * cdMult);
        this.nitroActive = (lvl >= 2 ? 4.5 : 3.2) + experienceSystem.getNitroTrailBonus();
        break;
      }
      case 'quantum_laser': {
        this.laserCd = (lvl >= 2 ? 18.0 : 24.0) * cdMult;
        break;
      }
      case 'kinetic_bastion': {
        this.bastionCd = 26.0 * cdMult;
        this.bastionActive = lvl >= 2 ? 8.0 : 6.0;
        break;
      }
      case 'singularity_nova': {
        this.singularityNovaCd = (lvl >= 2 ? 32.0 : 40.0) * cdMult;
        break;
      }
    }
  }

  private setupKeyboard() {
    window.addEventListener('blur', () => this.cancelChronoInput());
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys[e.code] = true;

      const k = e.key ? e.key.toLowerCase() : '';

      // Bullet Time (Chrono-Shift) & Sequence Mode on Shift
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (!e.repeat && !this.heldShiftKeys.has(e.code)) {
          this.heldShiftKeys.add(e.code);
          if (this.heldShiftKeys.size === 1) {
            this.handleChronoDown();
          }
        }
        e.preventDefault();
        return;
      }

      // Directions: Support ZQSD (AZERTY) as primary, plus WASD and Arrow keys
      let dir: { x: number; y: number } | null = null;
      let dirKey: string = '';
      if (e.code === 'ArrowUp' || k === 'z' || k === 'w' || e.code === 'KeyW' || e.code === 'KeyZ') {
        dir = { x: 0, y: -1 };
        dirKey = 'up';
        e.preventDefault();
      } else if (e.code === 'ArrowDown' || k === 's' || e.code === 'KeyS') {
        dir = { x: 0, y: 1 };
        dirKey = 'down';
        e.preventDefault();
      } else if (e.code === 'ArrowLeft' || k === 'q' || k === 'a' || e.code === 'KeyA' || e.code === 'KeyQ') {
        dir = { x: -1, y: 0 };
        dirKey = 'left';
        e.preventDefault();
      } else if (e.code === 'ArrowRight' || k === 'd' || e.code === 'KeyD') {
        dir = { x: 1, y: 0 };
        dirKey = 'right';
        e.preventDefault();
      }

      if (dir && !e.repeat) {
        if (this.isSequenceMode) {
          // Sequence directions never steer Chromavore when play resumes.
          this.addSequenceDirection(dirKey);
        } else {
          this.heldDirections = this.heldDirections.filter(h => h.code !== e.code);
          this.heldDirections.push({ x: dir.x, y: dir.y, code: e.code });
          this.setNextDir(dir.x, dir.y);
        }
      }

      // Backspace removes last sequence step
      if (this.isSequenceMode && (e.code === 'Backspace' || e.code === 'Delete')) {
        if (this.sequenceBuffer.length > 0) {
          this.sequenceBuffer.pop();
          sounds.play('sequence_step', this.sequenceBuffer.length);
          this.updateSequencePreview();
        }
        e.preventDefault();
        return;
      }

      if (this.isSequenceMode) {
        if (e.code === 'KeyP' || e.code === 'Escape') {
          this.cancelChronoInput();
          this.isPauseRequested = e.code === 'KeyP';
        }
        e.preventDefault();
        return;
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
      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.isPauseRequested = true;
      }
      if (k === 'm' || e.code === 'KeyM') {
        this.isAudioToggleRequested = true;
      }
      if (k === 'l' || e.code === 'KeyL') {
        this.isLeaderboardRequested = true;
      }
      if (k === 'r' || e.code === 'KeyR') {
        this.isRestartRequested = true;
      }
      if (k === 'c' || e.code === 'KeyC') {
        this.isCodexRequested = true;
      }
      if (k === 'b' || e.code === 'KeyB') {
        this.isBadgesRequested = true;
      }
      if (k === 'k' || e.code === 'KeyK') {
        this.isRestoreRequested = true;
      }
      if (k === 'i' || e.code === 'KeyI') {
        this.isInstructionsRequested = true;
      }
      if (k === 'n' || e.code === 'KeyN' || k === 'x' || e.code === 'KeyX' || k === 'e' || e.code === 'KeyE') {
        this.isNovaRequested = true;
      }
      if (k === 'o' || e.code === 'KeyO') {
        this.isSettingsRequested = true;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys[e.code] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.heldShiftKeys.delete(e.code);
        if (this.heldShiftKeys.size === 0) this.handleChronoUp();
        return;
      }
      this.heldDirections = this.heldDirections.filter(h => h.code !== e.code);
      if (this.heldDirections.length > 0 && !this.isSequenceMode) {
        const top = this.heldDirections[this.heldDirections.length - 1];
        this.setNextDir(top.x, top.y);
      }
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

  /** Legacy pass-through: retained for backward compatibility */
  public checkKombos(onWiggle: (lvl: number) => void, onNitro: (lvl: number) => void) {
    // Kombos now trigger on Shift release in Sequence Mode.
  }

  public updateCooldowns(dt: number, plPos: { x: number; y: number }) {
    if (this.wiggleCd > 0) this.wiggleCd = Math.max(0, this.wiggleCd - dt);
    if (this.nitroCd > 0) this.nitroCd = Math.max(0, this.nitroCd - dt);
    if (this.laserCd > 0) this.laserCd = Math.max(0, this.laserCd - dt);
    if (this.bastionCd > 0) this.bastionCd = Math.max(0, this.bastionCd - dt);
    if (this.singularityNovaCd > 0) this.singularityNovaCd = Math.max(0, this.singularityNovaCd - dt);

    if (this.sequenceFeedbackTimer > 0) {
      this.sequenceFeedbackTimer = Math.max(0, this.sequenceFeedbackTimer - dt);
      if (this.sequenceFeedbackTimer === 0 && !this.isSequenceMode) {
        this.sequenceStatus = 'idle';
        this.sequenceFeedback = '';
        this.sequenceBuffer = [];
      }
    }

    if (this.bastionActive > 0) {
      this.bastionActive = Math.max(0, this.bastionActive - dt);
      if (Math.random() < 0.4) {
        particles.emit(plPos.x + (Math.random() - 0.5) * 24, plPos.y + (Math.random() - 0.5) * 24, 1, '#00ffff', { speed: 40, size: 3.5, life: 0.35 });
      }
    }

    if (this.nitroActive > 0) {
      this.nitroActive = Math.max(0, this.nitroActive - dt);
      const isV2 = progression.getSkillLevel('nitro') >= 2;
      const tLife = (isV2 ? 2.5 : 1.6) + experienceSystem.getNitroTrailBonus();
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
    for (const k in this.gpJustPressed) {
      this.gpJustPressed[k] = false;
    }

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp: Gamepad | null = null;
    for (const g of gamepads) {
      if (g && g.connected) {
        gp = g;
        break;
      }
    }

    this.isGamepadConnected = gp !== null;
    if (!gp) {
      this.prevButtons = [];
      this.prevAxes = [0, 0];
      return;
    }

    const ax = gp.axes[0] || 0;
    const ay = gp.axes[1] || 0;
    const th = 0.45;

    // Detect digital and analog edge triggers for navigation & spellcasting
    const stickUp = ay < -th && !(this.prevAxes[1] < -th);
    const stickDown = ay > th && !(this.prevAxes[1] > th);
    const stickLeft = ax < -th && !(this.prevAxes[0] < -th);
    const stickRight = ax > th && !(this.prevAxes[0] > th);

    const bPress = (idx: number) => Boolean(gp.buttons[idx] && gp.buttons[idx].pressed);
    const bJust = (idx: number) => Boolean(gp.buttons[idx] && gp.buttons[idx].pressed && !this.prevButtons[idx]);

    this.gpJustPressed.up = bJust(12) || stickUp;
    this.gpJustPressed.down = bJust(13) || stickDown;
    this.gpJustPressed.left = bJust(14) || stickLeft;
    this.gpJustPressed.right = bJust(15) || stickRight;
    this.gpJustPressed.a = bJust(0);
    this.gpJustPressed.b = bJust(1);
    this.gpJustPressed.x = bJust(2);
    this.gpJustPressed.y = bJust(3);
    this.gpJustPressed.lb = bJust(4);
    this.gpJustPressed.rb = bJust(5);
    this.gpJustPressed.select = bJust(8);
    this.gpJustPressed.start = bJust(9);

    // ─── Shift Sequence Mode over Gamepad ───
    if (this.isSequenceMode) {
      if (this.gpJustPressed.up) this.addSequenceDirection('up');
      else if (this.gpJustPressed.down) this.addSequenceDirection('down');
      else if (this.gpJustPressed.left) this.addSequenceDirection('left');
      else if (this.gpJustPressed.right) this.addSequenceDirection('right');

      // B or X acts as Backspace / undo
      if (this.gpJustPressed.b || this.gpJustPressed.x) {
        if (this.sequenceBuffer.length > 0) {
          this.sequenceBuffer.pop();
          sounds.play('sequence_step', this.sequenceBuffer.length);
          this.updateSequencePreview();
        }
      }

      if (this.gpJustPressed.start || this.gpJustPressed.select) {
        this.cancelChronoInput();
      }
    } else {
      // Normal continuous gameplay movement:
      const moveTh = 0.32;
      if (ax < -moveTh || bPress(14)) this.setNextDir(-1, 0);
      else if (ax > moveTh || bPress(15)) this.setNextDir(1, 0);
      else if (ay < -moveTh || bPress(12)) this.setNextDir(0, -1);
      else if (ay > moveTh || bPress(13)) this.setNextDir(0, 1);

      // Dash / Start on Button A or Button X
      if (this.gpJustPressed.a || this.gpJustPressed.x) {
        this.isDashRequested = true;
        this.isStartRequested = true;
      }

      // Pause on Start
      if (this.gpJustPressed.start) {
        this.isPauseRequested = true;
      }
    }

    // Left Bumper / Trigger = Chrono Bullet Time & Double-tap Sequence Mode
    const lbHeld = bPress(4) || bPress(6);
    const lbJust = bJust(4) || bJust(6);
    if (lbJust) {
      this.handleChronoDown();
    } else if (!lbHeld && this.isChronoKeyHeld && !this.keys['ShiftLeft'] && !this.keys['ShiftRight']) {
      this.handleChronoUp();
    }

    // Save previous state for next frame's edge detection
    for (let i = 0; i < gp.buttons.length; i++) {
      this.prevButtons[i] = Boolean(gp.buttons[i] && gp.buttons[i].pressed);
    }
    this.prevAxes = [ax, ay];
  }

  public resetKombos() {
    this.motionHistory = [];
    this.wiggleCd = 0;
    this.nitroCd = 0;
    this.nitroActive = 0;
    this.nitroTrail = [];
    this.laserCd = 0;
    this.bastionCd = 0;
    this.bastionActive = 0;
    this.singularityNovaCd = 0;
    this.isChronoKeyHeld = false;
    this.lastShiftPressTime = 0;
    this.heldShiftKeys.clear();
    this.heldDirections = [];
    this.isSequenceMode = false;
    this.sequenceTimeLeft = 0;
    this.sequenceEndTime = 0;
    this.sequenceBuffer = [];
    this.sequenceStatus = 'idle';
    this.sequenceFeedback = '';
    this.sequenceFeedbackTimer = 0;
  }

  public getVector(): { x: number; y: number } {
    let vx = 0, vy = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.keys['KeyQ']) vx -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) vx += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['KeyZ']) vy -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) vy += 1;
    if (vx !== 0 && vy !== 0) {
      const len = Math.hypot(vx, vy);
      vx /= len; vy /= len;
    }
    if (vx === 0 && vy === 0 && (this.nextDir.x !== 0 || this.nextDir.y !== 0)) {
      return { x: this.nextDir.x, y: this.nextDir.y };
    }
    return { x: vx, y: vy };
  }
}

export const input = new InputManager();

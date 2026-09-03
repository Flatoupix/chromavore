// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — PROCEDURAL WEB AUDIO SYNTHESIZER
// ═══════════════════════════════════════════════════════════════

class SoundManager {
  private actx: AudioContext | null = null;
  private muted: boolean = false;
  private bgmTime: number = 0;
  private bgmStep: number = 0;
  private lastDotFreq: number = 440;
  private lastKillSfxTime: number = 0;

  constructor() {
    this.muted = localStorage.getItem('chv_muted') === 'true';
  }

  private initCtx() {
    if (!this.actx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.actx = new AudioContextClass();
      }
    }
    if (this.actx && this.actx.state === 'suspended') {
      this.actx.resume();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('chv_muted', this.muted ? 'true' : 'false');
    } catch {}
    if (!this.muted) {
      this.play('dot');
    }
    return this.muted;
  }

  public play(type: string) {
    if (this.muted) return;
    this.initCtx();
    if (!this.actx) return;

    const t = this.actx.currentTime;

    try {
      switch (type) {
        case 'dot': {
          const osc = this.actx.createOscillator();
          const g = this.actx.createGain();
          osc.type = 'sine';
          this.lastDotFreq = this.lastDotFreq === 440 ? 520 : 440;
          osc.frequency.setValueAtTime(this.lastDotFreq, t);
          g.gain.setValueAtTime(0.06, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          osc.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + 0.05);
          break;
        }
        case 'pellet': {
          const osc = this.actx.createOscillator();
          const g = this.actx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(220, t);
          osc.frequency.exponentialRampToValueAtTime(880, t + 0.2);
          g.gain.setValueAtTime(0.12, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          osc.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + 0.25);
          break;
        }
        case 'kill': {
          const now = performance.now();
          if (now - this.lastKillSfxTime < 45) return;
          this.lastKillSfxTime = now;

          const osc = this.actx.createOscillator();
          const g = this.actx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(120, t);
          osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
          g.gain.setValueAtTime(0.2, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          osc.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + 0.2);
          break;
        }
        case 'death': {
          const osc = this.actx.createOscillator();
          const g = this.actx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, t);
          osc.frequency.exponentialRampToValueAtTime(40, t + 0.6);
          g.gain.setValueAtTime(0.25, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
          osc.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + 0.65);
          break;
        }
        case 'dash': {
          const osc = this.actx.createOscillator();
          const g = this.actx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(150, t);
          osc.frequency.exponentialRampToValueAtTime(900, t + 0.12);
          g.gain.setValueAtTime(0.18, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
          osc.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + 0.16);
          break;
        }
        case 'nova': {
          const osc = this.actx.createOscillator();
          const g = this.actx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(80, t);
          osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
          osc.frequency.exponentialRampToValueAtTime(60, t + 0.4);
          g.gain.setValueAtTime(0.3, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
          osc.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + 0.45);
          break;
        }
        case 'powerup': {
          const notes = [330, 440, 550, 660];
          notes.forEach((freq, idx) => {
            if (!this.actx) return;
            const osc = this.actx.createOscillator();
            const g = this.actx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + idx * 0.05);
            g.gain.setValueAtTime(0.12, t + idx * 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.1);
            osc.connect(g);
            g.connect(this.actx.destination);
            osc.start(t + idx * 0.05);
            osc.stop(t + idx * 0.05 + 0.1);
          });
          break;
        }
        case 'wave': {
          const chord = [220, 277, 330, 440];
          chord.forEach(freq => {
            if (!this.actx) return;
            const osc = this.actx.createOscillator();
            const g = this.actx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.5);
            g.gain.setValueAtTime(0.08, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
            osc.connect(g);
            g.connect(this.actx.destination);
            osc.start(t);
            osc.stop(t + 0.6);
          });
          break;
        }
        case 'near': {
          const osc = this.actx.createOscillator();
          const g = this.actx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, t);
          osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
          g.gain.setValueAtTime(0.1, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          osc.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + 0.1);
          break;
        }
        case 'badge': {
          const bNotes = [523, 659, 784, 1046];
          bNotes.forEach((f, i) => {
            if (!this.actx) return;
            const osc = this.actx.createOscillator();
            const g = this.actx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, t + i * 0.08);
            g.gain.setValueAtTime(0.15, t + i * 0.08);
            g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
            osc.connect(g);
            g.connect(this.actx.destination);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.2);
          });
          break;
        }
        case 'start': {
          const sNotes = [261, 329, 392, 523];
          sNotes.forEach((f, i) => {
            if (!this.actx) return;
            const osc = this.actx.createOscillator();
            const g = this.actx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(f, t + i * 0.1);
            g.gain.setValueAtTime(0.1, t + i * 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.18);
            osc.connect(g);
            g.connect(this.actx.destination);
            osc.start(t + i * 0.1);
            osc.stop(t + i * 0.1 + 0.18);
          });
          break;
        }
      }
    } catch {}
  }

  public updateBGM(dt: number, isPlaying: boolean, isPredator: boolean, isMadness: boolean) {
    if (this.muted || !isPlaying) return;
    this.initCtx();
    if (!this.actx) return;

    this.bgmTime += dt;
    const tempo = isMadness ? 0.14 : isPredator ? 0.18 : 0.26;
    if (this.bgmTime >= tempo) {
      this.bgmTime -= tempo;
      this.bgmStep = (this.bgmStep + 1) % 16;
      const bassNotes = isMadness
        ? [70, 75, 80, 85, 90, 80, 75, 70]
        : isPredator
        ? [110, 130, 150, 130]
        : [55, 65, 55, 73, 55, 65, 82, 65];
      const freq = bassNotes[this.bgmStep % bassNotes.length];
      const t = this.actx.currentTime;

      try {
        const osc = this.actx.createOscillator();
        const g = this.actx.createGain();
        osc.type = isMadness ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(isMadness ? 0.04 : 0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + tempo * 0.9);
        osc.connect(g);
        g.connect(this.actx.destination);
        osc.start(t);
        osc.stop(t + tempo * 0.9);
      } catch {}
    }
  }
}

export const sounds = new SoundManager();

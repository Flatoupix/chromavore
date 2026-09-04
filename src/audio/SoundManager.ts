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
        case 'combo': {
          const osc = this.actx.createOscillator();
          const g = this.actx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(660, t);
          osc.frequency.exponentialRampToValueAtTime(1320, t + 0.14);
          g.gain.setValueAtTime(0.12, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          osc.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + 0.15);
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
        case 'portal': {
          // Cosmic Warp / Portal entry whoosh
          const osc = this.actx.createOscillator();
          const filter = this.actx.createBiquadFilter();
          const g = this.actx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(140, t);
          osc.frequency.exponentialRampToValueAtTime(980, t + 0.45);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(300, t);
          filter.frequency.exponentialRampToValueAtTime(3200, t + 0.45);
          g.gain.setValueAtTime(0.22, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          osc.connect(filter);
          filter.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + 0.5);
          break;
        }
        case 'crunch': {
          // Satisfying Force Field vaporization crunch
          const now = performance.now();
          if (now - this.lastKillSfxTime < 35) return;
          this.lastKillSfxTime = now;
          const osc = this.actx.createOscillator();
          const g = this.actx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(380, t);
          osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);
          g.gain.setValueAtTime(0.18, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
          osc.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + 0.14);
          break;
        }
      }
    } catch {}
  }

  public updateBGM(dt: number, isPlaying: boolean, is32xGod: boolean = false, isMadness: boolean = false) {
    if (this.muted || !isPlaying) return;
    this.initCtx();
    if (!this.actx) return;

    this.bgmTime += dt;
    // Step duration:
    // Normal: 0.125s (120 BPM)
    // Madness: 0.10s (150 BPM)
    // 32x Invincible God Mode: 0.09s (166 BPM high-energy overdrive)
    const stepDuration = is32xGod ? 0.09 : (isMadness ? 0.10 : 0.125);

    if (this.bgmTime >= stepDuration) {
      this.bgmTime -= stepDuration;
      this.bgmStep = (this.bgmStep + 1) % 32;
      const t = this.actx.currentTime;

      // 80s Synthwave Bass Progression: Am -> F -> G -> Em
      const roots = [
        55, 55, 110, 55,  55, 55, 110, 55,  // Am
        43.6, 43.6, 87.3, 43.6, 43.6, 43.6, 87.3, 43.6, // F
        49, 49, 98, 49,   49, 49, 98, 49,   // G
        41.2, 41.2, 82.4, 41.2, 41.2, 41.2, 82.4, 41.2  // Em
      ];

      const madnessRoots = [
        65.4, 65.4, 130.8, 65.4, 73.4, 73.4, 146.8, 73.4,
        82.4, 82.4, 164.8, 82.4, 65.4, 65.4, 130.8, 65.4
      ];

      // 32x God Mode: Pumping Octave Overdrive Bass
      const godRoots = [
        110, 220, 110, 220, 130.8, 261.6, 130.8, 261.6,
        146.8, 293.6, 146.8, 293.6, 164.8, 329.6, 164.8, 329.6
      ];

      const bassFreq = is32xGod
        ? godRoots[this.bgmStep % godRoots.length]
        : (isMadness ? madnessRoots[this.bgmStep % madnessRoots.length] : roots[this.bgmStep % roots.length]);

      try {
        // Synthwave Bass with Resonant Lowpass Filter Envelope
        const osc = this.actx.createOscillator();
        const filter = this.actx.createBiquadFilter();
        const g = this.actx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, t);

        filter.type = 'lowpass';
        filter.Q.setValueAtTime(is32xGod ? 6.5 : (isMadness ? 6 : 4.5), t);
        filter.frequency.setValueAtTime(is32xGod ? 1600 : (isMadness ? 1200 : 850), t);
        filter.frequency.exponentialRampToValueAtTime(140, t + stepDuration * 0.85);

        const bassVol = is32xGod ? 0.055 : (isMadness ? 0.05 : 0.045);
        g.gain.setValueAtTime(bassVol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.9);

        osc.connect(filter);
        filter.connect(g);
        g.connect(this.actx.destination);

        osc.start(t);
        osc.stop(t + stepDuration * 0.9);

        // Melodic Arpeggio Synth Lead
        // 32x God Mode: Soaring bright triumphant arpeggio every 2 steps
        // Normal/Madness: Classic synthwave arpeggio every 4 steps
        const isArpStep = is32xGod ? (this.bgmStep % 2 === 0) : (this.bgmStep % 4 === 0);

        if (isArpStep) {
          const normalScale = [440, 523.25, 659.25, 783.99, 880, 1046.5];
          const godScale = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
          const scale = is32xGod ? godScale : normalScale;
          const arpFreq = scale[(this.bgmStep / (is32xGod ? 1 : 2)) % scale.length];

          const arpOsc = this.actx.createOscillator();
          const arpG = this.actx.createGain();
          arpOsc.type = is32xGod ? 'triangle' : 'sine';
          arpOsc.frequency.setValueAtTime(arpFreq, t);

          const arpVol = is32xGod ? 0.035 : 0.02;
          arpG.gain.setValueAtTime(arpVol, t);
          arpG.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * (is32xGod ? 1.2 : 1.5));

          arpOsc.connect(arpG);
          arpG.connect(this.actx.destination);

          arpOsc.start(t);
          arpOsc.stop(t + stepDuration * (is32xGod ? 1.2 : 1.5));
        }
      } catch {}
    }
  }
}

export const sounds = new SoundManager();

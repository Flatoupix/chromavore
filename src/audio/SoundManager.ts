// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — PROCEDURAL WEB AUDIO SYNTHESIZER
// ═══════════════════════════════════════════════════════════════

class SoundManager {
  private actx: AudioContext | null = null;
  private muted: boolean = false;
  private bgmTime: number = 0;
  private bgmStep: number = 0;
  private lastDotFreq: number = 440;
  private dotStreakCount: number = 0;
  private lastDotTime: number = 0;
  private isChronoActive: boolean = false;
  private lastKillSfxTime: number = 0;

  // HD Audio System (Unlocked at 3000 kills)
  private hdTracks: Record<'normal' | 'madness' | 'god', HTMLAudioElement> | null = null;
  private hdVolumes: Record<'normal' | 'madness' | 'god', number> = { normal: 0, madness: 0, god: 0 };
  private currentHdTrack: 'normal' | 'madness' | 'god' | null = null;
  private isHdInitialized: boolean = false;
  private isHdPlaying: boolean = false;
  private hdLoadFailed: boolean = false;

  constructor() {
    this.muted = localStorage.getItem('chv_muted') === 'true';
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initCtx();
        this.initHDMusic();
        if (this.isHdPlaying && !this.muted && this.currentHdTrack && this.hdTracks) {
          const a = this.hdTracks[this.currentHdTrack];
          if (a && a.paused) {
            a.play().catch(() => {});
          }
        }
      };
      ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(ev => {
        window.addEventListener(ev, unlockAudio, { passive: true });
      });
    }
  }

  public setChronoActive(active: boolean) {
    if (this.isChronoActive === active) return;
    this.isChronoActive = active;
    this.play(active ? 'chrono_on' : 'chrono_off');

    // Dynamic tape slowdown for HD tracks during bullet-time Chrono-Shift
    if (this.hdTracks) {
      Object.values(this.hdTracks).forEach(audio => {
        audio.playbackRate = active ? 0.82 : 1.0;
      });
    }
  }

  public resetDotStreak() {
    this.dotStreakCount = 0;
    this.lastDotTime = 0;
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

    if (this.hdTracks) {
      Object.values(this.hdTracks).forEach(a => {
        a.muted = this.muted;
        if (this.muted) {
          a.volume = 0;
        }
      });
    }

    if (!this.muted) {
      this.play('dot');
    }
    return this.muted;
  }

  public play(type: string, param?: number) {
    if (this.muted) return;
    this.initCtx();
    if (!this.actx) return;

    const t = this.actx.currentTime;

    try {
      switch (type) {
        case 'click': {
          const osc = this.actx.createOscillator();
          const g = this.actx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(560, t);
          osc.frequency.exponentialRampToValueAtTime(740, t + 0.035);
          g.gain.setValueAtTime(0.045, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          osc.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + 0.04);
          break;
        }
        case 'dot': {
          const now = performance.now();
          const MAX_DOT_STREAK = 180; // Extended, ultra-granular tension ramp over 180 consecutive dots (32x God Mode)
          const GRACE_PERIOD_MS = 850; // Keep full streak across corners and short empty junctions
          const DECAY_STEP_MS = 40; // Progressive decay instead of abrupt drop
          const timeFactor = this.isChronoActive ? 0.18 : 1.0;
          const effectiveGrace = GRACE_PERIOD_MS / timeFactor;
          const effectiveDecayStep = DECAY_STEP_MS / timeFactor;

          if (param !== undefined && param >= 0) {
            // Direct lock with combo counter for 100% audio-visual synchronization!
            this.dotStreakCount = Math.min(MAX_DOT_STREAK, param);
          } else {
            if (this.lastDotTime > 0) {
              const pause = now - this.lastDotTime;
              if (pause < effectiveGrace) {
                this.dotStreakCount = Math.min(MAX_DOT_STREAK, this.dotStreakCount + 1);
              } else {
                const lostSteps = Math.floor((pause - effectiveGrace) / effectiveDecayStep);
                this.dotStreakCount = Math.max(0, this.dotStreakCount - lostSteps);
                this.dotStreakCount = Math.min(MAX_DOT_STREAK, this.dotStreakCount + 1);
              }
            } else {
              this.dotStreakCount = 1;
            }
          }
          this.lastDotTime = now;

          // Smooth microtonal exponential curve from 320 Hz up to ~784 Hz (+1.28 octaves over 180 dots)
          const progress = Math.min(1.0, this.dotStreakCount / MAX_DOT_STREAK);
          const baseFreq = 320 * Math.pow(2.45, progress);

          // Subtle alternating harmonic waka-waka oscillation (~5.5% modulation)
          const altMultiplier = (this.dotStreakCount % 2 === 1) ? 1.055 : 1.0;
          let freq = baseFreq * altMultiplier;

          // Electric shimmer vibrato if at or above God Mode peak (>= 180 dots)
          if (this.dotStreakCount >= MAX_DOT_STREAK) {
            const shimmer = 1.0 + Math.sin(t * 30) * 0.022;
            freq *= shimmer;
          }

          // Slow-motion downpitching if Chrono Shift / Bullet Time is engaged
          if (this.isChronoActive) {
            freq *= 0.72;
          }

          // Equal-loudness compensation: slightly lower gain at high frequencies to maintain pleasant ear balance
          const gainVal = Math.max(0.042, 0.065 - progress * 0.020);
          const duration = this.isChronoActive ? 0.075 : 0.048;

          const osc = this.actx.createOscillator();
          const g = this.actx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(gainVal, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + duration);
          osc.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + duration);
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
          this.dotStreakCount = 0;
          this.lastDotTime = 0;
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
        case 'chrono_on': {
          // Temporal slow-motion warp pulse
          const osc = this.actx.createOscillator();
          const filter = this.actx.createBiquadFilter();
          const g = this.actx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(540, t);
          osc.frequency.exponentialRampToValueAtTime(110, t + 0.28);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1800, t);
          filter.frequency.exponentialRampToValueAtTime(220, t + 0.28);
          g.gain.setValueAtTime(0.20, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
          osc.connect(filter);
          filter.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + 0.32);
          break;
        }
        case 'chrono_off': {
          // Temporal snap resumption
          const osc = this.actx.createOscillator();
          const g = this.actx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(140, t);
          osc.frequency.exponentialRampToValueAtTime(620, t + 0.16);
          g.gain.setValueAtTime(0.15, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
          osc.connect(g);
          g.connect(this.actx.destination);
          osc.start(t);
          osc.stop(t + 0.20);
          break;
        }
      }
    } catch {}
  }

  private initHDMusic() {
    if (this.isHdInitialized || typeof window === 'undefined') return;
    this.isHdInitialized = true;

    try {
      const base = (import.meta as any).env?.BASE_URL || './';
      const cleanBase = base.endsWith('/') ? base : base + '/';

      const createTrack = (filename: string) => {
        const audio = new Audio(`${cleanBase}audio/${filename}`);
        audio.loop = true;
        audio.preload = 'auto';
        (audio as any).playsInline = true;
        audio.volume = 0;
        audio.muted = this.muted;
        audio.addEventListener('error', (e) => {
          console.warn(`[SoundManager] Could not load audio/${filename}:`, e);
          this.hdLoadFailed = true;
        });
        return audio;
      };

      this.hdTracks = {
        normal: createTrack('bgm_normal.mp3'),
        madness: createTrack('bgm_madness.mp3'),
        god: createTrack('bgm_god.mp3')
      };
    } catch (e) {
      console.warn('[SoundManager] Failed to init HD audio', e);
      this.hdLoadFailed = true;
    }
  }

  private updateHDMusic(dt: number, isPlaying: boolean, is32xGod: boolean, isPastilleMadness: boolean) {
    this.initHDMusic();
    if (!this.hdTracks || this.hdLoadFailed) return;

    if (!isPlaying || this.muted) {
      this.isHdPlaying = false;
      for (const k of ['normal', 'madness', 'god'] as const) {
        const audio = this.hdTracks[k];
        if (this.hdVolumes[k] > 0) {
          this.hdVolumes[k] = Math.max(0, this.hdVolumes[k] - dt * 3.5);
          audio.volume = this.muted ? 0 : this.hdVolumes[k];
          if (this.hdVolumes[k] === 0 && !audio.paused) {
            audio.pause();
          }
        }
      }
      return;
    }

    this.isHdPlaying = true;
    const targetTrack: 'normal' | 'madness' | 'god' = is32xGod ? 'god' : (isPastilleMadness ? 'madness' : 'normal');

    if (this.currentHdTrack !== targetTrack) {
      if (targetTrack === 'god' && this.hdTracks.god) {
        this.hdTracks.god.currentTime = 0;
      }
      if (targetTrack === 'madness' && this.hdTracks.madness) {
        this.hdTracks.madness.currentTime = 0;
      }
      this.currentHdTrack = targetTrack;
    }

    const keys: ('normal' | 'madness' | 'god')[] = ['normal', 'madness', 'god'];
    const maxVol = 0.46; // -3 dB vs 0.65 (0.65 × 10^(-3/20) ≈ 0.46) — laisse les SFX Web Audio passer au-dessus
    const fadeSpeed = dt * 4.0; // ~0.16s punchy crossfade

    for (const k of keys) {
      const audio = this.hdTracks[k];
      const isTarget = k === targetTrack;
      const targetVol = isTarget ? maxVol : 0;

      audio.playbackRate = this.isChronoActive ? 0.82 : 1.0;

      if (isTarget) {
        if (audio.paused) {
          audio.play().catch(() => {});
        }
        if (this.hdVolumes[k] < targetVol) {
          this.hdVolumes[k] = Math.min(targetVol, this.hdVolumes[k] + fadeSpeed);
        } else if (this.hdVolumes[k] > targetVol) {
          this.hdVolumes[k] = Math.max(targetVol, this.hdVolumes[k] - fadeSpeed);
        }
      } else {
        if (this.hdVolumes[k] > 0) {
          this.hdVolumes[k] = Math.max(0, this.hdVolumes[k] - fadeSpeed);
          if (this.hdVolumes[k] === 0 && !audio.paused) {
            audio.pause();
          }
        }
      }

      audio.volume = this.muted ? 0 : Math.max(0, Math.min(1, this.hdVolumes[k]));
    }
  }

  private stopHDMusic() {
    if (!this.hdTracks) return;
    this.isHdPlaying = false;
    this.currentHdTrack = null;
    for (const k of ['normal', 'madness', 'god'] as const) {
      this.hdVolumes[k] = 0;
      const a = this.hdTracks[k];
      a.volume = 0;
      a.pause();
    }
  }

  public stopBgm() {
    this.stopHDMusic();
    this.bgmStep = 0;
    this.bgmTime = 0;
  }

  public updateBGM(
    dt: number,
    isPlaying: boolean,
    is32xGod: boolean = false,
    isPastilleMadness: boolean = false,
    isHDUnlocked: boolean = false
  ) {
    if (this.muted || !isPlaying) {
      if (this.isHdPlaying) {
        this.updateHDMusic(dt, false, is32xGod, isPastilleMadness);
      }
      return;
    }
    this.initCtx();

    if (isHDUnlocked && !this.hdLoadFailed) {
      this.updateHDMusic(dt, isPlaying, is32xGod, isPastilleMadness);
      return;
    }

    if (this.isHdPlaying) {
      this.stopHDMusic();
    }

    if (!this.actx) return;

    this.bgmTime += dt;
    // Step duration:
    // Chrono-Shift: 0.36s (heavy, immersive slow-motion pulse)
    // Normal: 0.125s (120 BPM)
    // Pastille Madness: 0.10s (150 BPM)
    // 32x Invincible God Mode: 0.09s (166 BPM high-energy overdrive)
    const stepDuration = this.isChronoActive ? 0.36 : (is32xGod ? 0.09 : (isPastilleMadness ? 0.10 : 0.125));

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
        : (isPastilleMadness ? madnessRoots[this.bgmStep % madnessRoots.length] : roots[this.bgmStep % roots.length]);

      try {
        // Synthwave Bass with Resonant Lowpass Filter Envelope
        const osc = this.actx.createOscillator();
        const filter = this.actx.createBiquadFilter();
        const g = this.actx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, t);

        filter.type = 'lowpass';
        filter.Q.setValueAtTime(is32xGod ? 6.5 : (isPastilleMadness ? 6 : 4.5), t);
        filter.frequency.setValueAtTime(is32xGod ? 1600 : (this.isChronoActive ? 380 : (isPastilleMadness ? 1200 : 850)), t);
        filter.frequency.exponentialRampToValueAtTime(this.isChronoActive ? 90 : 140, t + stepDuration * 0.85);

        const bassVol = is32xGod ? 0.055 : (isPastilleMadness ? 0.05 : 0.045);
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

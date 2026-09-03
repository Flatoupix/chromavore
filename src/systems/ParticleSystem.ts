// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — PARTICLE & VISUAL EFFECTS SYSTEM
// ═══════════════════════════════════════════════════════════════

import { PI2, T, ROWS, COLS, CW } from '../config/constants';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ml: number;
  size: number;
  col: string;
  gr: number;
}

export interface Popup {
  x: number;
  y: number;
  t: string;
  col: string;
  sz: number;
  life: number;
  vy: number;
}

export interface PaintSplat {
  x: number;
  y: number;
  col: string;
  r: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  public parts: Particle[] = [];
  public pops: Popup[] = [];
  public paintSplats: PaintSplat[] = [];
  public shk = { x: 0, y: 0, i: 0, t: 0 };
  public flsh = { a: 0, c: '#fff' };

  public readonly MAX_PARTS = 1000;
  public readonly MAX_POPS = 40;
  public readonly MAX_SPLATS = 60;

  public emit(x: number, y: number, n: number, col: string, o: any = {}) {
    if (this.parts.length >= this.MAX_PARTS) return;
    const count = Math.min(n, this.MAX_PARTS - this.parts.length);
    const sp = o.speed || 80;
    const sz = o.size || 3;
    const lf = o.life || 0.6;
    const gr = o.gravity || 0;

    for (let i = 0; i < count; i++) {
      const a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread || PI2) : Math.random() * PI2;
      const s = sp * (0.3 + Math.random() * 0.7);
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: lf * (0.5 + Math.random() * 0.5),
        ml: lf,
        size: sz * (0.5 + Math.random() * 0.5),
        col,
        gr
      });
    }
  }

  public addPop(x: number, y: number, t: string, col: string, sz: number = 14) {
    if (this.pops.length >= this.MAX_POPS) this.pops.shift();
    this.pops.push({ x, y, t, col, sz, life: 1.0, vy: -55 });
  }

  public addPaintSplat(x: number, y: number, col: string) {
    if (this.paintSplats.length >= this.MAX_SPLATS) this.paintSplats.shift();
    this.paintSplats.push({
      x,
      y,
      col,
      r: 10 + Math.random() * 12,
      life: 5.0,
      maxLife: 5.0
    });
  }

  public shake(intensity: number, duration: number) {
    this.shk.i = Math.max(this.shk.i, intensity);
    this.shk.t = Math.max(this.shk.t, duration);
  }

  public flash(color: string = '#fff', alpha: number = 0.3) {
    this.flsh.c = color;
    this.flsh.a = Math.max(this.flsh.a, alpha);
  }

  public update(dt: number) {
    // Particles
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gr * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= dt;
      if (p.life <= 0) this.parts.splice(i, 1);
    }
    if (this.parts.length > this.MAX_PARTS) this.parts.length = this.MAX_PARTS;

    // Popups
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.y += p.vy * dt;
      p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) this.pops.splice(i, 1);
    }

    // Paint splats
    for (let i = this.paintSplats.length - 1; i >= 0; i--) {
      const s = this.paintSplats[i];
      s.life -= dt;
      if (s.life <= 0) this.paintSplats.splice(i, 1);
    }

    // Shake
    if (this.shk.t > 0) {
      this.shk.t -= dt;
      this.shk.x = (Math.random() - 0.5) * this.shk.i * 2;
      this.shk.y = (Math.random() - 0.5) * this.shk.i * 2;
      this.shk.i *= 0.88;
      if (this.shk.t <= 0) {
        this.shk.x = 0;
        this.shk.y = 0;
        this.shk.i = 0;
      }
    }

    // Flash
    if (this.flsh.a > 0) {
      this.flsh.a = Math.max(0, this.flsh.a - dt * 3);
    }
  }

  public draw(c: CanvasRenderingContext2D) {
    // Particles
    for (const p of this.parts) {
      const a = p.life / p.ml;
      c.globalAlpha = a;
      c.fillStyle = p.col;
      c.beginPath();
      c.arc(p.x, p.y, p.size * a, 0, PI2);
      c.fill();
    }
    c.globalAlpha = 1;

    // Popups
    for (const p of this.pops) {
      c.globalAlpha = Math.min(p.life / 0.3, 1);
      c.font = `bold ${p.sz}px monospace`;
      c.fillStyle = p.col;
      c.textAlign = 'center';
      c.fillText(p.t, p.x, p.y);
    }
    c.globalAlpha = 1;
  }

  public drawPaintSplats(c: CanvasRenderingContext2D) {
    for (const s of this.paintSplats) {
      const a = Math.min(s.life / 0.8, 1);
      c.save();
      c.globalAlpha = a * 0.35;
      c.fillStyle = s.col;
      c.beginPath();
      c.arc(s.x, s.y, s.r, 0, PI2);
      c.fill();
      c.restore();
    }
  }
}

export const particles = new ParticleSystem();

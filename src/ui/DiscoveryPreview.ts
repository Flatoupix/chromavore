import { Player } from '../entities/Player';
import { spriteAtlas } from '../graphics/SpriteAtlas';
import type { DiscoveryCard } from './DiscoveryCatalog';

const W = 440, H = 176, TAU = Math.PI * 2;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** A presentation-only renderer. Its only inputs are immutable card data and UI time.
 * It never constructs entities or calls an update, collection, sound or save method. */
export class DiscoveryPreview {
  private frame = 0;
  private startedAt = 0;
  private card: DiscoveryCard | null = null;
  private readonly motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private readonly canvas: HTMLCanvasElement, private readonly onKey: (index: number) => void = () => {}) {}

  public start(card: DiscoveryCard) {
    this.stop();
    this.card = card;
    this.startedAt = performance.now();
    this.canvas.setAttribute('aria-label', card.previewCaption);
    this.motion.addEventListener('change', this.restartMotion);
    this.paint(this.startedAt);
  }

  public stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.card = null;
    this.motion.removeEventListener('change', this.restartMotion);
    this.onKey(-1);
  }

  private restartMotion = () => {
    cancelAnimationFrame(this.frame);
    this.startedAt = performance.now();
    this.paint(this.startedAt);
  };

  private paint = (now: number) => {
    if (!this.card) return;
    const c = this.canvas.getContext('2d');
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const height = this.motion.matches ? 126 : H;
    if (this.canvas.width !== W * dpr || this.canvas.height !== height * dpr) {
      this.canvas.width = W * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.aspectRatio = `${W} / ${height}`;
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, height);
    c.imageSmoothingEnabled = false;
    if (this.motion.matches) {
      // A static before/after pair communicates the same interaction without motion.
      for (let i = 0; i < 2; i++) {
        c.save();
        c.translate(i * 224, 18);
        c.scale(0.49, 0.49);
        this.scene(c, this.card, i === 0 ? 0.6 : 2.1, true);
        c.restore();
      }
      c.font = 'bold 10px monospace'; c.fillStyle = '#aebdd9'; c.textAlign = 'center';
      c.fillText('BEFORE', 108, 13); c.fillText('RESULT', 332, 13);
      this.onKey(-1);
      return;
    }
    const t = ((now - this.startedAt) / 1000) % 4.2;
    this.scene(c, this.card, t, false);
    const keyCount = this.card.keys.length;
    this.onKey(keyCount && t >= .35 && t < 1.25 ? Math.min(keyCount - 1, Math.floor((t - .35) / .9 * keyCount)) : -1);
    this.frame = requestAnimationFrame(this.paint);
  };

  private scene(c: CanvasRenderingContext2D, card: DiscoveryCard, t: number, still: boolean) {
    const kind = card.preview;
    const active = t >= 1.25;
    const p = clamp((t - 1.25) / 1.4);
    const burst = clamp((t - 1.25) / .6);
    const frameTime = still ? .6 : t;
    c.fillStyle = '#070d20'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#14304b'; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(22, 35); c.lineTo(W - 22, 35);
    c.moveTo(22, 141); c.lineTo(W - 22, 141);
    c.stroke();
    const starts = [{ x: 236, y: 88 }, { x: 316, y: 58 }, { x: 358, y: 114 }];
    if (kind === 'laser') {
      starts[0] = { x: 256, y: 88 };
      starts[1] = { x: 156, y: 46 };
      starts[2] = { x: 221, y: 153 };
    }
    let px = 92, py = 88;
    const center = { x: 156, y: 88 };
    if (['emp', 'nova', 'laser', 'vortex', 'shield', 'field', 'magnet', 'chrono', 'mastery', 'audio'].includes(kind)) px = center.x;
    if (['dash', 'nitro', 'surge', 'phase', 'titan'].includes(kind)) {
      px = active ? 104 + 270 * clamp((t - 1.25) / (kind === 'dash' || kind === 'titan' ? .35 : 1.2)) : 80 + 24 * clamp(t / 1.25);
      if (kind === 'titan') starts[0] = { x: 262, y: 88 };
      else starts[0] = { x: 236, y: 88 };
      if (kind === 'dash' || kind === 'nitro') starts[1] = { x: 302, y: 88 };
    }
    if (kind === 'emp' && !active) px += Math.sin(t * 22) * 8;
    if (kind === 'pellet' || kind === 'super_pellet') px = 68 + Math.min(t, 1.25) * 58;
    if (kind === 'harvest' || kind === 'mastery') {
      px = 90 + clamp((t - .3) / 2.5) * 280;
      py = 117;
      if (active) this.ring(c, px, py, 20, '#ffd700', kind === 'mastery' ? .75 : .35);
    }
    if (kind === 'cryo') px = 90 + (active ? clamp((t - 1.7) / .8) * 145 : 0);
    if (kind === 'contact') {
      px = active ? 104 + 270 * p : 92;
      starts.forEach(ghost => ghost.y = py);
      if (active) this.ring(c, px, py, 23, '#ffd700', .8);
    }

    const dotKinds = ['pellet', 'super_pellet', 'field', 'magnet', 'harvest', 'mastery', 'vortex'];
    if (dotKinds.includes(kind) && !(kind === 'vortex' && card.variant < 2)) {
      const pellet = kind === 'pellet' || kind === 'super_pellet';
      for (let i = 0; i < (pellet ? 1 : 5); i++) {
        const dx = pellet ? 142 : 183 + i * 35;
        const dy = pellet ? 88 : 117;
        const attracts = kind === 'field' || kind === 'magnet' || kind === 'vortex';
        if ((active && pellet) || (active && attracts && p > .65) || ((kind === 'harvest' || kind === 'mastery') && px >= dx)) continue;
        c.fillStyle = pellet ? '#ffd700' : '#00f0ff';
        c.beginPath();
        c.arc(dx + (active && attracts ? (px - dx) * p : 0), dy + (active && attracts ? (py - dy) * p : 0), pellet ? 6 : 2.7, 0, TAU); c.fill();
      }
    }

    // Pickup-powered effects show the icon being collected before activation.
    const pickupEffect = (card.id.includes(':base:') && !['power_pellet', 'dash', 'chrono', 'god_mode', 'singularity', 'singularity_burst'].some(id => card.id.endsWith(`:${id}`))) || /:(nova|overdrive|vortex|laser|cryo|tsunami)_v\d$/.test(card.id);
    if (pickupEffect && !active) spriteAtlas.drawIcon(c, card.icon, px + 31 * (1 - t / 1.25), py, 24);

    if (active && ['emp', 'nova'].includes(kind)) {
      const color = kind === 'emp' ? '#00f0ff' : '#ffd700';
      this.ring(c, px, py, 16 + burst * 245, color, Math.max(.08, 1 - burst) * .8);
      if (burst < .95) this.ring(c, px, py, 8 + burst * 165, color, .35);
    }
    if (active && ['field', 'magnet', 'shield', 'chrono'].includes(kind)) {
      this.ring(c, px, py, kind === 'chrono' ? 32 : 75, '#00f0ff', .7);
      if (kind === 'shield') this.ring(c, px, py, 77 + 8 * Math.sin(p * Math.PI), '#aaffff', .2);
    }
    if (active && ['dash', 'nitro', 'surge', 'titan', 'phase'].includes(kind)) {
      c.save();
      c.globalAlpha = kind === 'phase' ? .3 : .65;
      c.strokeStyle = kind === 'nitro' ? '#ff8800' : '#00f0ff';
      c.lineWidth = kind === 'nitro' ? 12 : 5;
      c.beginPath(); c.moveTo(Math.max(96, px - (kind === 'nitro' ? 175 : 145)), py); c.lineTo(px, py); c.stroke();
      c.restore();
    }
    if (active && kind === 'laser') {
      c.save(); c.lineWidth = 4; c.strokeStyle = '#00f0ff'; c.shadowColor = '#00ffff'; c.shadowBlur = 8;
      c.beginPath(); c.moveTo(24, py); c.lineTo(W - 24, py); c.moveTo(px, 24); c.lineTo(px, H - 24);
      if (card.variant >= 2) {
        c.moveTo(px - 120, py - 120); c.lineTo(px + 200, py + 200);
        c.moveTo(px - 120, py + 120); c.lineTo(px + 200, py - 200);
      }
      c.stroke(); c.restore();
      starts[0] = { x: 256, y: py };
      starts[1] = { x: px, y: 46 };
      starts[2] = { x: 221, y: 153 };
    }
    if (active && kind === 'vortex') {
      for (let i = 0; i < 3; i++) this.ring(c, center.x, center.y, 20 + i * 13, '#bb44ff', .7 - i * .17);
      c.fillStyle = '#020008'; c.beginPath(); c.arc(center.x, center.y, 15, 0, TAU); c.fill();
    }
    if (active && kind === 'tsunami') {
      const waveX = 25 + burst * 390;
      c.fillStyle = '#00f0ff22'; c.fillRect(waveX - 22, 31, 22, 114);
      c.fillStyle = '#ccffff'; c.fillRect(waveX - 3, 31, 4, 114);
    }
    if (kind === 'portal') {
      this.ring(c, 230, 88, 29, '#d946ef', 1);
      this.ring(c, 230, 88, 19, '#00f0ff', .5);
      px = 83 + clamp(t / 2) * 147;
    }
    if (kind === 'audio') {
      spriteAtlas.drawIcon(c, 'music', 318, 88, 42);
      for (let i = 0; i < 3; i++) this.ring(c, px, py, 27 + i * 10, '#d946ef', .5 - i * .1);
    }

    for (let i = 0; i < 3; i++) {
      let { x, y } = starts[i];
      let gone = false, frozen = false, afraid = false, alpha = 1;
      const titan = kind === 'titan' && i === 0;
      if (!active) {
        x += Math.sin(frameTime * 2 + i) * 5;
        if (kind === 'chrono') x = starts[i].x + 26 - t * 24;
        if (kind === 'super_pellet' && i === 2) continue;
        if (kind === 'pellet' && i === 2) continue;
      }
      if (active) {
        if (kind === 'emp' || kind === 'nova') gone = burst > (i + 1) * .18;
        if (kind === 'dash' || kind === 'nitro') gone = Math.abs(y - py) < 17 && px > x;
        if (kind === 'contact') gone = px > x;
        if (kind === 'laser') gone = i < 2 || card.variant >= 2;
        if (kind === 'tsunami') gone = x < 25 + burst * 390;
        if (kind === 'cryo') { frozen = true; gone = i === 0 && px > 213; }
        if (kind === 'titan') { frozen = titan && px > 220; gone = titan && card.variant >= 3 && px > 250; }
        if (kind === 'shield') { x = Math.max(px + 66, x - p * 120); frozen = p > .3; }
        if (kind === 'pellet' || kind === 'super_pellet') {
          afraid = i < 2 || kind === 'super_pellet';
          if (i === 2 && t < 2) continue;
          x += p * 22;
        }
        if (kind === 'field' || kind === 'magnet') {
          afraid = i !== 1;
          if (i === 0) { x -= p * 74; gone = p > .6; }
        }
        if (kind === 'vortex') {
          const pull = clamp(p * 1.35);
          x += (center.x - x) * pull; y += (center.y - y) * pull;
          alpha = 1 - clamp((pull - .8) * 5); gone = pull >= 1;
        }
        if (kind === 'chrono') {
          const scale = card.id.endsWith(':timewarp') ? .45 : card.id.endsWith(':chrono_v2') ? .12 : .18;
          x = starts[i].x - 4 - (t - 1.25) * 24 * scale;
        }
        if (kind === 'surge' || kind === 'phase' || kind === 'harvest' || kind === 'audio' || kind === 'portal') x += Math.sin(frameTime * 2 + i) * 5;
      }
      if (gone) {
        if (t < 2.8 || still) this.shatter(c, x, y, '#aaffff', clamp((t - 1.35) / 1.2));
        continue;
      }
      c.save(); c.globalAlpha = alpha;
      spriteAtlas.drawGhost(c, ['stalker', 'orbiter', 'phaser'][i], afraid, -1, 0, frozen ? 0 : frameTime, x, y, afraid ? 44 : 38, titan);
      if (frozen) {
        c.fillStyle = '#aaffff33'; c.fillRect(x - 16, y - 16, 32, 32);
        c.strokeStyle = '#aaffff'; c.lineWidth = 1.5; c.strokeRect(x - 16, y - 16, 32, 32);
      }
      c.restore();
    }

    if (kind === 'dash' && card.id.endsWith(':dash_v5')) {
      c.fillStyle = '#480950'; c.strokeStyle = '#ff007f'; c.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const wx = 181 + i * 37;
        if (px > wx && active) this.shatter(c, wx, 88, '#ff007f', .5);
        else { c.fillRect(wx - 10, 68, 20, 40); c.strokeRect(wx - 10, 68, 20, 40); }
      }
    }
    if (card.id === 'custom:phase_shift:rank:3') {
      c.fillStyle = '#480950'; c.strokeStyle = '#ff007f'; c.lineWidth = 1.5;
      c.fillRect(208, 65, 16, 46); c.strokeRect(208, 65, 16, 46);
    }
    c.save();
    c.translate(px, py);
    if (kind === 'phase' && active) c.globalAlpha = .48;
    if (kind === 'portal' && t > 1.7) { const scale = Math.max(.15, 1 - (t - 1.7)); c.scale(scale, scale); }
    Player.drawChromavore(c, 13, frameTime, frameTime * 8, active && kind === 'contact', active && (kind === 'pellet' || kind === 'super_pellet'), 1, 5);
    c.restore();
  }

  private ring(c: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, opacity: number) {
    c.save(); c.globalAlpha = opacity; c.strokeStyle = color; c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, radius, 0, TAU); c.stroke(); c.restore();
  }

  private shatter(c: CanvasRenderingContext2D, x: number, y: number, color: string, progress: number) {
    c.save(); c.globalAlpha = Math.max(.1, 1 - progress); c.fillStyle = color;
    for (let n = 0; n < 7; n++) {
      const a = n * TAU / 7, radius = 6 + progress * 18;
      c.fillRect(x + Math.cos(a) * radius - 1.5, y + Math.sin(a) * radius - 1.5, 3, 3);
    }
    c.restore();
  }
}

/** The same composition is reused for first discovery and Arsenal review. */
export class DiscoveryCardView {
  private preview: DiscoveryPreview | null = null;
  private keys: HTMLElement[] = [];

  public show(card: DiscoveryCard) {
    this.stop();
    const put = (id: string, text: string) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    put('discovery-title', card.title);
    put('discovery-unlock-label', card.unlockLabel);
    put('discovery-mode', card.mode === 'custom' ? 'CHROMAMANCER' : 'CHROMAVORE');
    put('discovery-desc', card.description);
    put('discovery-usage', card.usage);
    put('discovery-preview-caption', card.previewCaption);
    put('discovery-cost', card.cost || '');
    put('discovery-cd', card.cooldown || '');
    const iconHost = document.getElementById('discovery-icon');
    if (iconHost) {
      const icon = document.createElement('canvas'); icon.width = 64; icon.height = 64;
      icon.setAttribute('aria-hidden', 'true');
      const ctx = icon.getContext('2d');
      if (ctx) spriteAtlas.drawIcon(ctx, card.icon, 32, 32, 48);
      iconHost.replaceChildren(icon);
    }
    const sequence = document.getElementById('discovery-sequence');
    this.keys = card.keys.map(key => { const el = document.createElement('kbd'); el.textContent = key; return el; });
    sequence?.replaceChildren(...this.keys);
    if (sequence) sequence.hidden = !this.keys.length;
    put('discovery-alt-sequence', card.alternateKeys?.length ? `Also: ${card.alternateKeys.join(' ')}` : '');
    const stats = document.getElementById('discovery-stats'); if (stats) stats.hidden = !card.cost && !card.cooldown;
    const cost = document.getElementById('discovery-cost-block'); if (cost) cost.hidden = !card.cost;
    const cooldown = document.getElementById('discovery-cd-block'); if (cooldown) cooldown.hidden = !card.cooldown;
    const canvas = document.getElementById('discovery-preview') as HTMLCanvasElement | null;
    if (canvas) {
      this.preview = new DiscoveryPreview(canvas, index => this.keys.forEach((el, i) => el.classList.toggle('is-active', i === index)));
      this.preview.start(card);
    }
  }

  public stop() { this.preview?.stop(); this.preview = null; this.keys = []; }
}

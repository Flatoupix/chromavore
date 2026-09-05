// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — NEON PIXEL ART SPRITE ATLAS
// ═══════════════════════════════════════════════════════════════

import { PI2 } from '../config/constants';

export type GhostArchetype = 'stalker' | 'orbiter' | 'rusher' | 'phaser' | 'titan' | 'flee';
export type SpriteDirection = 'up' | 'down' | 'left' | 'right';

export class SpriteAtlas {
  private ghostSprites: Map<string, HTMLCanvasElement> = new Map();
  private iconSprites: Map<string, HTMLCanvasElement> = new Map();

  constructor() {
    this.generateAllGhostSprites();
    this.generateAllIcons();
  }

  // ─────────────────────────────────────────────────────────────
  //  GHOST SPRITES GENERATION (24x24 Grid Pixel-Precision Canvas)
  // ─────────────────────────────────────────────────────────────

  private generateAllGhostSprites() {
    const archetypes: GhostArchetype[] = ['stalker', 'orbiter', 'rusher', 'phaser', 'titan', 'flee'];
    const directions: SpriteDirection[] = ['left', 'right', 'up', 'down'];

    for (const arch of archetypes) {
      for (const dir of directions) {
        for (let frame = 0; frame < 2; frame++) {
          const key = `${arch}_${dir}_${frame}`;
          const canvas = this.createGhostCanvas(arch, dir, frame);
          this.ghostSprites.set(key, canvas);
        }
      }
    }
  }

  private createGhostCanvas(type: GhostArchetype, dir: SpriteDirection, frame: number): HTMLCanvasElement {
    const size = 32; // 32x32 canvas for 24x24 entity with border margin
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;

    const cx = size / 2;
    const cy = size / 2;

    // Direction eye offsets in pixels
    let ex = 0, ey = 0;
    if (dir === 'left') ex = -2;
    else if (dir === 'right') ex = 2;
    else if (dir === 'up') ey = -2;
    else if (dir === 'down') ey = 2;

    switch (type) {
      case 'stalker':
        this.drawStalkerSprite(ctx, cx, cy, ex, ey, frame);
        break;
      case 'orbiter':
        this.drawOrbiterSprite(ctx, cx, cy, ex, ey, frame);
        break;
      case 'rusher':
        this.drawRusherSprite(ctx, cx, cy, ex, ey, dir, frame);
        break;
      case 'phaser':
        this.drawPhaserSprite(ctx, cx, cy, ex, ey, frame);
        break;
      case 'titan':
        this.drawTitanSprite(ctx, cx, cy, ex, ey, frame);
        break;
      case 'flee':
        this.drawFleeSprite(ctx, cx, cy, frame);
        break;
    }

    return c;
  }

  // 1. STALKER : Aggressive horned hunter silhouette (#ff0055)
  private drawStalkerSprite(ctx: CanvasRenderingContext2D, cx: number, cy: number, ex: number, ey: number, frame: number) {
    const col = '#ff0055';
    const accent = '#ff77aa';
    const dark = '#660022';

    // Outer pixel silhouette with razor-sharp demonic horns
    ctx.fillStyle = col;
    // Horns
    ctx.fillRect(cx - 9, cy - 11, 3, 4);
    ctx.fillRect(cx - 8, cy - 13, 2, 3);
    ctx.fillRect(cx + 6, cy - 11, 3, 4);
    ctx.fillRect(cx + 6, cy - 13, 2, 3);

    // Cranium
    ctx.fillRect(cx - 7, cy - 8, 14, 10);
    ctx.fillRect(cx - 8, cy - 5, 16, 8);

    // Angular serrated teeth/skirt (alternates on frame)
    if (frame === 0) {
      ctx.fillRect(cx - 8, cy + 3, 3, 5);
      ctx.fillRect(cx - 3, cy + 3, 3, 4);
      ctx.fillRect(cx + 1, cy + 3, 3, 5);
      ctx.fillRect(cx + 5, cy + 3, 3, 4);
    } else {
      ctx.fillRect(cx - 8, cy + 3, 3, 4);
      ctx.fillRect(cx - 4, cy + 3, 3, 5);
      ctx.fillRect(cx, cy + 3, 3, 4);
      ctx.fillRect(cx + 5, cy + 3, 3, 5);
    }

    // Horn highlights
    ctx.fillStyle = accent;
    ctx.fillRect(cx - 8, cy - 12, 1, 2);
    ctx.fillRect(cx + 7, cy - 12, 1, 2);
    ctx.fillRect(cx - 5, cy - 7, 10, 2);

    // Sharp predator eyes (angled red/white)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 6 + ex, cy - 4 + ey, 4, 4);
    ctx.fillRect(cx + 2 + ex, cy - 4 + ey, 4, 4);

    // Crimson slit pupils
    ctx.fillStyle = dark;
    ctx.fillRect(cx - 5 + ex, cy - 3 + ey, 2, 3);
    ctx.fillRect(cx + 3 + ex, cy - 3 + ey, 2, 3);
  }

  // 2. ORBITER : Smooth hydrodynamic circular silhouette with orbital energy nodes (#00f0ff)
  private drawOrbiterSprite(ctx: CanvasRenderingContext2D, cx: number, cy: number, ex: number, ey: number, frame: number) {
    const col = '#00f0ff';
    const accent = '#aaffff';
    const core = '#006688';

    // Rounded dome cranium
    ctx.fillStyle = col;
    ctx.fillRect(cx - 6, cy - 9, 12, 3);
    ctx.fillRect(cx - 8, cy - 6, 16, 9);
    ctx.fillRect(cx - 9, cy - 3, 18, 7);

    // Outer orbital ring particles
    const orbitOff = frame === 0 ? 0 : 1;
    ctx.fillStyle = accent;
    ctx.fillRect(cx - 11, cy - 2 + orbitOff, 2, 3);
    ctx.fillRect(cx + 9, cy - 2 - orbitOff, 2, 3);

    // Flowing undulating wave bottom
    ctx.fillStyle = col;
    if (frame === 0) {
      ctx.fillRect(cx - 8, cy + 4, 4, 4);
      ctx.fillRect(cx - 2, cy + 4, 4, 3);
      ctx.fillRect(cx + 4, cy + 4, 4, 4);
    } else {
      ctx.fillRect(cx - 8, cy + 4, 4, 3);
      ctx.fillRect(cx - 2, cy + 4, 4, 4);
      ctx.fillRect(cx + 4, cy + 4, 4, 3);
    }

    // Front energy crest
    ctx.fillStyle = accent;
    ctx.fillRect(cx - 4, cy - 8, 8, 2);

    // Calm glowing circular cyber eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 6 + ex, cy - 3 + ey, 4, 4);
    ctx.fillRect(cx + 2 + ex, cy - 3 + ey, 4, 4);

    ctx.fillStyle = core;
    ctx.fillRect(cx - 5 + ex, cy - 2 + ey, 2, 2);
    ctx.fillRect(cx + 3 + ex, cy - 2 + ey, 2, 2);
  }

  // 3. RUSHER : Sleek aerodynamic arrow dart silhouette with rocket thrusters (#ff8800)
  private drawRusherSprite(ctx: CanvasRenderingContext2D, cx: number, cy: number, ex: number, ey: number, dir: SpriteDirection, frame: number) {
    const col = '#ff8800';
    const thruster = '#ffee00';
    const deep = '#aa3300';

    // Sharp forward-angled aerodynamic cone
    ctx.fillStyle = col;
    ctx.fillRect(cx - 4, cy - 10, 8, 4);
    ctx.fillRect(cx - 7, cy - 6, 14, 6);
    ctx.fillRect(cx - 9, cy, 18, 5);

    // Swept-back winglets
    ctx.fillRect(cx - 11, cy + 1, 3, 5);
    ctx.fillRect(cx + 8, cy + 1, 3, 5);

    // Afterburner thruster flames (animated flicker)
    ctx.fillStyle = thruster;
    const flk = frame === 0 ? 3 : 5;
    ctx.fillRect(cx - 5, cy + 5, 3, flk);
    ctx.fillRect(cx + 2, cy + 5, 3, flk);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 4, cy + 5, 1, Math.max(1, flk - 2));
    ctx.fillRect(cx + 3, cy + 5, 1, Math.max(1, flk - 2));

    // Aerodynamic narrow visor eyes (slant-cut)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 6 + ex, cy - 3 + ey, 5, 3);
    ctx.fillRect(cx + 1 + ex, cy - 3 + ey, 5, 3);

    // Intense focused amber pupils
    ctx.fillStyle = deep;
    ctx.fillRect(cx - 4 + ex, cy - 3 + ey, 2, 3);
    ctx.fillRect(cx + 2 + ex, cy - 3 + ey, 2, 3);
  }

  // 4. PHASER : Glitched, asymmetrical, phasing wraith silhouette (#b000ff)
  private drawPhaserSprite(ctx: CanvasRenderingContext2D, cx: number, cy: number, ex: number, ey: number, frame: number) {
    const col = '#b000ff';
    const glitch = '#e088ff';
    const dark = '#440066';

    // Asymmetric, jagged fragmented body
    ctx.fillStyle = col;
    const gShift = frame === 0 ? 1 : -1;
    ctx.fillRect(cx - 7 + gShift, cy - 9, 13, 5);
    ctx.fillRect(cx - 9, cy - 4, 17, 8);
    ctx.fillRect(cx - 8 - gShift, cy + 2, 15, 4);

    // Spectral glitch displacement bars
    ctx.fillStyle = glitch;
    ctx.fillRect(cx - 11 + gShift * 2, cy - 3, 3, 2);
    ctx.fillRect(cx + 7 - gShift * 2, cy + 1, 3, 2);
    ctx.fillRect(cx - 5, cy - 8, 4, 1);

    // Broken wispy skirt tassels
    ctx.fillStyle = col;
    ctx.fillRect(cx - 8, cy + 6, 2, frame === 0 ? 4 : 2);
    ctx.fillRect(cx - 4, cy + 6, 3, frame === 0 ? 2 : 5);
    ctx.fillRect(cx + 1, cy + 6, 2, frame === 0 ? 5 : 3);
    ctx.fillRect(cx + 5, cy + 6, 3, frame === 0 ? 3 : 5);

    // Hollow, eerie asymmetric eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 6 + ex, cy - 4 + ey, 3, 4);
    ctx.fillRect(cx + 2 + ex, cy - 3 + ey, 4, 3);

    ctx.fillStyle = dark;
    ctx.fillRect(cx - 5 + ex, cy - 3 + ey, 1, 3);
    ctx.fillRect(cx + 3 + ex, cy - 2 + ey, 2, 2);
  }

  // 5. TITAN : Colossal armored juggernaut silhouette with neon battle-mask (#ff007f)
  private drawTitanSprite(ctx: CanvasRenderingContext2D, cx: number, cy: number, ex: number, ey: number, frame: number) {
    const col = '#ff007f';
    const armor = '#ff88bb';
    const iron = '#330018';
    const eyeRed = '#ff0033';

    // Broad armored shoulders (massive 24px wide)
    ctx.fillStyle = col;
    ctx.fillRect(cx - 11, cy - 9, 22, 14);
    ctx.fillRect(cx - 9, cy - 12, 18, 5);

    // Plated shoulder pauldrons
    ctx.fillStyle = armor;
    ctx.fillRect(cx - 12, cy - 8, 3, 7);
    ctx.fillRect(cx + 9, cy - 8, 3, 7);
    ctx.fillRect(cx - 8, cy - 12, 16, 2);

    // Armored skirt segments
    ctx.fillStyle = col;
    const pulse = frame === 0 ? 0 : 1;
    ctx.fillRect(cx - 10, cy + 5, 4, 5 + pulse);
    ctx.fillRect(cx - 4, cy + 5, 4, 4 - pulse);
    ctx.fillRect(cx + 1, cy + 5, 4, 5 + pulse);
    ctx.fillRect(cx + 6, cy + 5, 4, 4 - pulse);

    // Cyber Skull Visor Mask
    ctx.fillStyle = iron;
    ctx.fillRect(cx - 7 + ex, cy - 5 + ey, 14, 7);

    // Menacing glowing red eyes
    ctx.fillStyle = eyeRed;
    ctx.fillRect(cx - 6 + ex, cy - 4 + ey, 4, 3);
    ctx.fillRect(cx + 2 + ex, cy - 4 + ey, 4, 3);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 5 + ex, cy - 3 + ey, 2, 1);
    ctx.fillRect(cx + 3 + ex, cy - 3 + ey, 2, 1);

    // Heavy chin grill
    ctx.fillStyle = armor;
    ctx.fillRect(cx - 3 + ex, cy + 1 + ey, 6, 1);
  }

  // 6. FLEE : Terrified trembling blue silhouette with wide frantic eyes (#2563eb / #6366f1)
  private drawFleeSprite(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number) {
    const col = frame === 0 ? '#2563eb' : '#3b82f6';
    const eyeCol = '#ffff00';
    const pupil = '#ff0000';

    // Shrunken cowering rounded dome
    ctx.fillStyle = col;
    ctx.fillRect(cx - 6, cy - 7, 12, 11);
    ctx.fillRect(cx - 8, cy - 4, 16, 8);

    // Frantic shivering scalloped skirt
    if (frame === 0) {
      ctx.fillRect(cx - 8, cy + 4, 3, 3);
      ctx.fillRect(cx - 3, cy + 4, 3, 4);
      ctx.fillRect(cx + 1, cy + 4, 3, 3);
      ctx.fillRect(cx + 5, cy + 4, 3, 4);
    } else {
      ctx.fillRect(cx - 8, cy + 4, 3, 4);
      ctx.fillRect(cx - 4, cy + 4, 3, 3);
      ctx.fillRect(cx, cy + 4, 3, 4);
      ctx.fillRect(cx + 5, cy + 4, 3, 3);
    }

    // Huge panicked circular eyes
    ctx.fillStyle = eyeCol;
    ctx.fillRect(cx - 6, cy - 4, 4, 4);
    ctx.fillRect(cx + 2, cy - 4, 4, 4);

    // Terrified pinpoint red pupils
    ctx.fillStyle = pupil;
    ctx.fillRect(cx - 5, cy - 3, 2, 2);
    ctx.fillRect(cx + 3, cy - 3, 2, 2);

    // Wavy panic zig-zag mouth
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 4, cy + 1, 2, 1);
    ctx.fillRect(cx - 2, cy + 2, 2, 1);
    ctx.fillRect(cx, cy + 1, 2, 1);
    ctx.fillRect(cx + 2, cy + 2, 2, 1);
  }

  // ─────────────────────────────────────────────────────────────
  //  PIXEL ART ICONS & RELICS (Replacing generic Emojis)
  // ─────────────────────────────────────────────────────────────

  private generateAllIcons() {
    this.iconSprites.set('void_relic', this.createVoidRelicIcon());
    this.iconSprites.set('vortex_portal', this.createVortexPortalIcon());
    this.iconSprites.set('portal', this.createVortexPortalIcon());
    this.iconSprites.set('nova', this.createNovaIcon());
    this.iconSprites.set('dash', this.createDashIcon());
    this.iconSprites.set('cryo', this.createCryoIcon());
    this.iconSprites.set('laser', this.createLaserIcon());
    this.iconSprites.set('vortex_item', this.createBlackHoleIcon());
    this.iconSprites.set('vortex', this.createBlackHoleIcon());
    this.iconSprites.set('black_hole', this.createBlackHoleIcon());
    this.iconSprites.set('overdrive', this.createOverdriveIcon());
    this.iconSprites.set('tsunami', this.createTsunamiIcon());
    this.iconSprites.set('wiggle', this.createWiggleIcon());
    this.iconSprites.set('nitro', this.createNitroIcon());
    this.iconSprites.set('skull', this.createSkullIcon());
    this.iconSprites.set('kill', this.createSkullIcon());
    this.iconSprites.set('flame', this.createFlameIcon());
    this.iconSprites.set('streak', this.createFlameIcon());
    this.iconSprites.set('chrono', this.createChronoIcon());
    this.iconSprites.set('lightning', this.createDashIcon());
    this.iconSprites.set('trophy', this.createTrophyIcon());
    this.iconSprites.set('crown', this.createCrownIcon());
    this.iconSprites.set('lock', this.createLockIcon());
    this.iconSprites.set('check', this.createCheckIcon());
    this.iconSprites.set('spectre', this.createSpectreIcon());
    this.iconSprites.set('ghost', this.createSpectreIcon());
    this.iconSprites.set('magnet', this.createMagnetIcon());
    this.iconSprites.set('audio_on', this.createAudioOnIcon());
    this.iconSprites.set('audio_off', this.createAudioOffIcon());
    this.iconSprites.set('warning', this.createWarningIcon());
    this.iconSprites.set('rocket', this.createRocketIcon());
    this.iconSprites.set('shield', this.createShieldIcon());
    this.iconSprites.set('screen', this.createScreenIcon());
    this.iconSprites.set('nearmiss', this.createNearMissIcon());
  }

  // 1. Void Relic  : Dark cosmic rhomboid core with radiant crimson neon diamond pikes
  private createVoidRelicIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Dark crystal base
    ctx.fillStyle = '#ff0055';
    // Diamond pikes
    ctx.fillRect(cx - 1, cy - 12, 2, 24);
    ctx.fillRect(cx - 12, cy - 1, 24, 2);

    ctx.fillRect(cx - 4, cy - 8, 8, 16);
    ctx.fillRect(cx - 8, cy - 4, 16, 8);

    // Inverted obsidian black core
    ctx.fillStyle = '#0a0114';
    ctx.fillRect(cx - 4, cy - 4, 8, 8);

    // Blazing white energy spark at center
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 1, 2, 2);

    return c;
  }

  // 2. Vortex Portal  : Spiral cosmic singularity with cyan and magenta neon accretion arms
  private createVortexPortalIcon(): HTMLCanvasElement {
    const s = 36;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 18, cy = 18;

    // Outer spiral arms (Cyan & Magenta pixel matrix)
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(cx - 10, cy - 8, 6, 3);
    ctx.fillRect(cx + 4, cy + 6, 6, 3);
    ctx.fillRect(cx - 8, cy + 4, 3, 6);
    ctx.fillRect(cx + 6, cy - 9, 3, 6);

    ctx.fillStyle = '#d946ef';
    ctx.fillRect(cx - 6, cy - 5, 12, 10);
    ctx.fillRect(cx - 4, cy - 7, 8, 14);

    // Inner abyssal core
    ctx.fillStyle = '#060012';
    ctx.fillRect(cx - 3, cy - 3, 6, 6);

    // Singularity center point
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 1, 2, 2);

    return c;
  }

  // 3. Mega Nova  : Radiant 8-pointed golden sunburst star
  private createNovaIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    ctx.fillStyle = '#ffd700';
    // Cardinal beams
    ctx.fillRect(cx - 1, cy - 11, 2, 22);
    ctx.fillRect(cx - 11, cy - 1, 22, 2);

    // Diagonal beams
    ctx.fillRect(cx - 6, cy - 6, 3, 3);
    ctx.fillRect(cx + 3, cy - 6, 3, 3);
    ctx.fillRect(cx - 6, cy + 3, 3, 3);
    ctx.fillRect(cx + 3, cy + 3, 3, 3);

    // Blazing white center
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 4, cy - 4, 8, 8);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 1, 2, 2);

    return c;
  }

  // 4. Dash / Overdrive  : Dual beveled cyber-lightning bolt
  private createDashIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    ctx.fillStyle = '#00ffff';
    // Upper diagonal beam
    ctx.fillRect(cx - 1, cy - 11, 4, 5);
    ctx.fillRect(cx - 4, cy - 7, 5, 4);
    ctx.fillRect(cx - 7, cy - 3, 5, 4);

    // Horizontal cross-cut
    ctx.fillRect(cx - 8, cy, 14, 2);

    // Lower thrust spear
    ctx.fillRect(cx + 1, cy + 1, 4, 4);
    ctx.fillRect(cx - 2, cy + 4, 4, 4);
    ctx.fillRect(cx - 5, cy + 7, 4, 4);

    // White core highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2, cy - 6, 2, 3);
    ctx.fillRect(cx - 4, cy, 8, 1);
    ctx.fillRect(cx, cy + 2, 2, 3);

    return c;
  }

  // 5. Cryo Frost  : Hexagonal ice crystal
  private createCryoIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(cx - 1, cy - 10, 2, 20);
    ctx.fillRect(cx - 10, cy - 1, 20, 2);

    // Hex branches
    ctx.fillRect(cx - 6, cy - 6, 2, 2);
    ctx.fillRect(cx + 4, cy - 6, 2, 2);
    ctx.fillRect(cx - 6, cy + 4, 2, 2);
    ctx.fillRect(cx + 4, cy + 4, 2, 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 3, cy - 3, 6, 6);
    ctx.fillStyle = '#00aacc';
    ctx.fillRect(cx - 1, cy - 1, 2, 2);

    return c;
  }

  // 6. Laser Beams  : Triple parallel particle beam emitter
  private createLaserIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    ctx.fillStyle = '#ff0055';
    ctx.fillRect(cx - 9, cy - 5, 18, 2);
    ctx.fillRect(cx - 11, cy - 1, 22, 2);
    ctx.fillRect(cx - 9, cy + 3, 18, 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 6, cy - 1, 12, 2);

    return c;
  }

  // 7. Black Hole  : Gravitational void singularity
  private createBlackHoleIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Accretion disk rings
    ctx.fillStyle = '#b000ff';
    ctx.fillRect(cx - 10, cy - 4, 20, 8);
    ctx.fillRect(cx - 8, cy - 7, 16, 14);

    ctx.fillStyle = '#050012';
    ctx.fillRect(cx - 5, cy - 5, 10, 10);

    return c;
  }

  // 8. Cyber Skull  : Angular biomechanical skull core with glowing magenta eye sensors
  private createSkullIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Cyan/magenta cybernetic skull
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(cx - 7, cy - 8, 14, 8);
    ctx.fillRect(cx - 8, cy - 5, 16, 5);
    ctx.fillRect(cx - 6, cy + 1, 12, 3);
    ctx.fillRect(cx - 4, cy + 4, 8, 4);

    // Deep optic cavities
    ctx.fillStyle = '#050a14';
    ctx.fillRect(cx - 6, cy - 3, 4, 4);
    ctx.fillRect(cx + 2, cy - 3, 4, 4);

    // Glowing magenta sensors
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(cx - 4, cy - 2, 2, 2);
    ctx.fillRect(cx + 2, cy - 2, 2, 2);

    // Nasal cavity & teeth serration
    ctx.fillStyle = '#050a14';
    ctx.fillRect(cx - 1, cy + 1, 2, 2);
    ctx.fillRect(cx - 3, cy + 5, 1, 3);
    ctx.fillRect(cx - 1, cy + 5, 1, 3);
    ctx.fillRect(cx + 1, cy + 5, 1, 3);

    // Highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 5, cy - 7, 3, 1);

    return c;
  }

  // 9. Ion Flame  : Multi-stage plasma flame jet
  private createFlameIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Outer flame plume (#ff3300)
    ctx.fillStyle = '#ff3300';
    ctx.fillRect(cx - 6, cy - 2, 12, 10);
    ctx.fillRect(cx - 5, cy - 6, 10, 5);
    ctx.fillRect(cx - 3, cy - 9, 6, 4);
    ctx.fillRect(cx - 1, cy - 12, 2, 4);
    ctx.fillRect(cx + 1, cy - 10, 2, 3);

    // Mid heat plume (#ffd700)
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - 4, cy - 1, 8, 8);
    ctx.fillRect(cx - 3, cy - 5, 6, 5);
    ctx.fillRect(cx - 1, cy - 8, 2, 4);

    // Incandescent white core (#ffffff)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2, cy + 1, 4, 5);
    ctx.fillRect(cx - 1, cy - 2, 2, 4);

    return c;
  }

  // 10. Quantum Chrono Matrix  : Cybernetic dial with cyan bezel and analog time indicators
  private createChronoIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Top winder button
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(cx - 2, cy - 12, 4, 2);
    ctx.fillRect(cx - 3, cy - 13, 6, 1);

    // Outer bezel
    ctx.fillRect(cx - 8, cy - 8, 16, 16);
    ctx.fillRect(cx - 9, cy - 6, 18, 12);
    ctx.fillRect(cx - 6, cy - 9, 12, 18);

    // Dark dial interior
    ctx.fillStyle = '#07101e';
    ctx.fillRect(cx - 6, cy - 6, 12, 12);
    ctx.fillRect(cx - 7, cy - 4, 14, 8);
    ctx.fillRect(cx - 4, cy - 7, 8, 14);

    // Cardinal tick marks
    ctx.fillStyle = '#00aacc';
    ctx.fillRect(cx - 1, cy - 6, 2, 2);
    ctx.fillRect(cx + 4, cy - 1, 2, 2);
    ctx.fillRect(cx - 1, cy + 4, 2, 2);
    ctx.fillRect(cx - 6, cy - 1, 2, 2);

    // Hands (10:10 angle)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
    ctx.fillRect(cx - 3, cy - 4, 2, 4);
    ctx.fillRect(cx + 1, cy - 3, 3, 2);

    return c;
  }

  // 11. Overdrive Infinity  : Dual neon loop matrix
  private createOverdriveIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Left and right loops
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(cx - 11, cy - 5, 8, 10);
    ctx.fillRect(cx + 3, cy - 5, 8, 10);
    ctx.fillRect(cx - 4, cy - 2, 8, 4);

    // Interior cutouts
    ctx.fillStyle = '#0a0d18';
    ctx.fillRect(cx - 9, cy - 3, 4, 6);
    ctx.fillRect(cx + 5, cy - 3, 4, 6);

    // Bright core highlights
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 8, cy - 4, 2, 2);
    ctx.fillRect(cx + 6, cy - 4, 2, 2);
    ctx.fillRect(cx - 1, cy - 1, 2, 2);

    return c;
  }

  // 12. Light Tsunami  : Cresting solar tidal wave
  private createTsunamiIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Deep base surge
    ctx.fillStyle = '#004488';
    ctx.fillRect(cx - 10, cy + 2, 20, 7);

    // Mid tidal wave
    ctx.fillStyle = '#00b4d8';
    ctx.fillRect(cx - 10, cy - 1, 16, 5);
    ctx.fillRect(cx - 6, cy - 5, 12, 5);
    ctx.fillRect(cx - 2, cy - 9, 8, 5);

    // Crest curl
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(cx + 2, cy - 11, 6, 4);
    ctx.fillRect(cx + 5, cy - 8, 4, 4);

    // Sparkling foam spray
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + 6, cy - 12, 3, 2);
    ctx.fillRect(cx + 2, cy - 7, 2, 2);
    ctx.fillRect(cx - 8, cy + 3, 4, 2);
    ctx.fillRect(cx - 1, cy + 3, 5, 2);

    return c;
  }

  // 13. Wiggle EMP Pulse  : Concentric electromagnetic rings
  private createWiggleIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Outer dashed ring
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(cx - 10, cy - 10, 4, 2);
    ctx.fillRect(cx + 6, cy - 10, 4, 2);
    ctx.fillRect(cx - 10, cy + 8, 4, 2);
    ctx.fillRect(cx + 6, cy + 8, 4, 2);
    ctx.fillRect(cx - 12, cy - 4, 2, 8);
    ctx.fillRect(cx + 10, cy - 4, 2, 8);

    // Inner ring
    ctx.fillStyle = '#d946ef';
    ctx.fillRect(cx - 6, cy - 6, 12, 12);
    ctx.fillStyle = '#080c16';
    ctx.fillRect(cx - 4, cy - 4, 8, 8);

    // Core detonator
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2, cy - 2, 4, 4);

    return c;
  }

  // 14. Nitro Thruster  : Twin rocket exhaust nozzles
  private createNitroIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Gunmetal manifold
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - 7, cy - 11, 5, 6);
    ctx.fillRect(cx + 2, cy - 11, 5, 6);

    // Twin flame jets
    ctx.fillStyle = '#ff4400';
    ctx.fillRect(cx - 7, cy - 5, 5, 12);
    ctx.fillRect(cx + 2, cy - 5, 5, 12);
    ctx.fillRect(cx - 6, cy + 7, 3, 4);
    ctx.fillRect(cx + 3, cy + 7, 3, 4);

    // Inner fiery core
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - 6, cy - 4, 3, 8);
    ctx.fillRect(cx + 3, cy - 4, 3, 8);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 5, cy - 2, 1, 4);
    ctx.fillRect(cx + 4, cy - 2, 1, 4);

    return c;
  }

  // 15. Cyber Trophy  : Golden victory chalice with neon pedestal
  private createTrophyIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Pedestal
    ctx.fillStyle = '#946700';
    ctx.fillRect(cx - 6, cy + 9, 12, 3);
    ctx.fillRect(cx - 3, cy + 6, 6, 3);

    // Cup body
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - 5, cy + 3, 10, 3);
    ctx.fillRect(cx - 7, cy - 7, 14, 10);

    // Outer handles
    ctx.fillRect(cx - 10, cy - 5, 3, 6);
    ctx.fillRect(cx + 7, cy - 5, 3, 6);

    // Hollow cutouts
    ctx.fillStyle = '#0a0d18';
    ctx.fillRect(cx - 8, cy - 4, 1, 4);
    ctx.fillRect(cx + 7, cy - 4, 1, 4);
    ctx.fillRect(cx - 5, cy - 7, 10, 2);

    // Specular shine
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 5, cy - 5, 2, 6);
    ctx.fillRect(cx - 4, cy - 6, 4, 1);

    return c;
  }

  // 16. Apex Crown  : Tri-point golden cyber crown
  private createCrownIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Base band
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - 8, cy + 4, 16, 4);

    // Jewels on band
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(cx - 5, cy + 5, 2, 2);
    ctx.fillRect(cx + 3, cy + 5, 2, 2);
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(cx - 1, cy + 5, 2, 2);

    // Three spires
    ctx.fillStyle = '#ffd700';
    // Left spire
    ctx.fillRect(cx - 8, cy - 4, 4, 8);
    // Center spire (tallest)
    ctx.fillRect(cx - 2, cy - 8, 4, 12);
    // Right spire
    ctx.fillRect(cx + 4, cy - 4, 4, 8);

    // Spire gems
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 7, cy - 6, 2, 2);
    ctx.fillRect(cx - 1, cy - 10, 2, 2);
    ctx.fillRect(cx + 5, cy - 6, 2, 2);

    return c;
  }

  // 17. Cyber Lock  : Heavy encrypted padlock
  private createLockIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Shackle (hardened steel)
    ctx.fillStyle = '#8899aa';
    ctx.fillRect(cx - 5, cy - 9, 10, 3);
    ctx.fillRect(cx - 5, cy - 6, 3, 5);
    ctx.fillRect(cx + 2, cy - 6, 3, 5);

    // Brass / Gold chassis
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(cx - 7, cy - 2, 14, 11);

    // Bevel highlight
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - 6, cy - 1, 12, 2);

    // Keyhole
    ctx.fillStyle = '#070a14';
    ctx.fillRect(cx - 2, cy + 2, 4, 3);
    ctx.fillRect(cx - 1, cy + 5, 2, 3);

    return c;
  }

  // 18. Neon Checkmark  : Sharp pixel tick
  private createCheckIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    ctx.fillStyle = '#00ff88';
    // Short leg
    ctx.fillRect(cx - 7, cy, 3, 3);
    ctx.fillRect(cx - 5, cy + 2, 3, 3);
    ctx.fillRect(cx - 3, cy + 4, 3, 3);

    // Long leg
    ctx.fillRect(cx - 1, cy + 2, 3, 3);
    ctx.fillRect(cx + 1, cy - 1, 3, 3);
    ctx.fillRect(cx + 3, cy - 4, 3, 3);
    ctx.fillRect(cx + 5, cy - 7, 3, 3);
    ctx.fillRect(cx + 7, cy - 10, 3, 3);

    // White core
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 4, cy + 3, 2, 2);
    ctx.fillRect(cx, cy, 2, 2);
    ctx.fillRect(cx + 4, cy - 5, 2, 2);

    return c;
  }

  // 19. Cyber Spectre  : Classic 8-bit ghost silhouette with pixel eyes
  private createSpectreIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Body dome & skirt
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(cx - 6, cy - 7, 12, 11);
    ctx.fillRect(cx - 7, cy - 4, 14, 8);
    ctx.fillRect(cx - 7, cy + 4, 3, 3);
    ctx.fillRect(cx - 2, cy + 4, 4, 2);
    ctx.fillRect(cx + 4, cy + 4, 3, 3);

    // White eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 5, cy - 3, 3, 4);
    ctx.fillRect(cx + 2, cy - 3, 3, 4);

    // Blue pupils
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(cx - 4, cy - 2, 2, 2);
    ctx.fillRect(cx + 3, cy - 2, 2, 2);

    return c;
  }

  // 20. Forcefield Magnet  : Dual-pole electromagnetic confinement pincer
  private createMagnetIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Arch base
    ctx.fillStyle = '#475569';
    ctx.fillRect(cx - 7, cy - 8, 14, 4);

    // Left leg (crimson North pole)
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(cx - 7, cy - 4, 4, 9);
    // Left pole tip (silver)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 7, cy + 5, 4, 3);

    // Right leg (cyan South pole)
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(cx + 3, cy - 4, 4, 9);
    // Right pole tip (silver)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + 3, cy + 5, 4, 3);

    // Magnetic flux spark
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(cx - 1, cy + 3, 2, 2);

    return c;
  }

  // 21. Audio Active  : Cyber speaker with dual sound wave arcs
  private createAudioOnIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Speaker driver
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(cx - 8, cy - 3, 4, 6);
    ctx.fillRect(cx - 4, cy - 6, 4, 12);

    // Sound wave arcs
    ctx.fillRect(cx + 2, cy - 4, 2, 8);
    ctx.fillRect(cx + 6, cy - 7, 2, 14);

    // White highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 7, cy - 2, 2, 4);
    ctx.fillRect(cx + 2, cy - 2, 2, 4);

    return c;
  }

  // 22. Audio Muted  : Speaker with diagonal strike slash
  private createAudioOffIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Muted dark red speaker
    ctx.fillStyle = '#ff4466';
    ctx.fillRect(cx - 8, cy - 3, 4, 6);
    ctx.fillRect(cx - 4, cy - 6, 4, 12);

    // Diagonal slash
    ctx.fillStyle = '#ffffff';
    for (let i = -7; i <= 7; i++) {
      ctx.fillRect(cx + i, cy - i, 2, 2);
    }

    return c;
  }

  // 23. Hazard Warning  : Yellow danger polygon with exclamation core
  private createWarningIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Hazard triangle
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - 1, cy - 9, 2, 2);
    ctx.fillRect(cx - 3, cy - 7, 6, 3);
    ctx.fillRect(cx - 5, cy - 4, 10, 4);
    ctx.fillRect(cx - 8, cy, 16, 4);
    ctx.fillRect(cx - 10, cy + 4, 20, 4);

    // Black exclamation symbol
    ctx.fillStyle = '#050a14';
    ctx.fillRect(cx - 1, cy - 4, 2, 6);
    ctx.fillRect(cx - 1, cy + 4, 2, 2);

    return c;
  }

  // 24. Supersonic Rocket  : Slender hypersonic dart
  private createRocketIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    // Fuselage
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(cx - 2, cy - 11, 4, 14);
    ctx.fillRect(cx - 1, cy - 13, 2, 3);

    // Wings
    ctx.fillRect(cx - 6, cy - 1, 4, 4);
    ctx.fillRect(cx + 2, cy - 1, 4, 4);

    // White canopy
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 8, 2, 3);

    // Exhaust flame
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(cx - 2, cy + 3, 4, 6);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - 1, cy + 4, 2, 3);

    return c;
  }

  // 25. Energy Shield  : Hexagonal deflector matrix
  private createShieldIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(cx - 8, cy - 7, 16, 7);
    ctx.fillRect(cx - 6, cy, 12, 5);
    ctx.fillRect(cx - 4, cy + 5, 8, 4);
    ctx.fillRect(cx - 2, cy + 9, 4, 2);

    ctx.fillStyle = '#081220';
    ctx.fillRect(cx - 6, cy - 5, 12, 5);
    ctx.fillRect(cx - 4, cy, 8, 5);
    ctx.fillRect(cx - 2, cy + 5, 4, 3);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 4, 2, 8);
    ctx.fillRect(cx - 4, cy - 1, 8, 2);

    return c;
  }

  // 26. Screen Display  : 16:9 monitor frame
  private createScreenIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    ctx.fillStyle = '#00ffff';
    ctx.fillRect(cx - 10, cy - 7, 20, 11);
    ctx.fillStyle = '#050a14';
    ctx.fillRect(cx - 8, cy - 5, 16, 7);
    ctx.fillStyle = '#00ffaa';
    ctx.fillRect(cx - 6, cy - 2, 12, 1);

    ctx.fillStyle = '#00ffff';
    ctx.fillRect(cx - 2, cy + 4, 4, 3);
    ctx.fillRect(cx - 5, cy + 7, 10, 2);

    return c;
  }

  // 27. Near Miss Reticle  : Precision optical crosshair
  private createNearMissIcon(): HTMLCanvasElement {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const cx = 16, cy = 16;

    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(cx - 8, cy - 1, 16, 2);
    ctx.fillRect(cx - 1, cy - 8, 2, 16);

    ctx.fillRect(cx - 5, cy - 5, 10, 1);
    ctx.fillRect(cx - 5, cy + 4, 10, 1);
    ctx.fillRect(cx - 5, cy - 5, 1, 10);
    ctx.fillRect(cx + 4, cy - 5, 1, 10);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 1, 2, 2);

    return c;
  }

  // ─────────────────────────────────────────────────────────────
  //  PUBLIC DRAWING API
  // ─────────────────────────────────────────────────────────────

  public drawGhost(
    ctx: CanvasRenderingContext2D,
    type: string,
    isFlee: boolean,
    dx: number,
    dy: number,
    time: number,
    x: number,
    y: number,
    size: number = 24,
    isTitan: boolean = false
  ) {
    // Determine direction
    let dir: SpriteDirection = 'down';
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'right' : 'left';
    } else {
      dir = dy < 0 ? 'up' : 'down';
    }

    // Determine archetype key
    let arch: GhostArchetype = 'orbiter';
    if (isFlee) {
      arch = 'flee';
    } else if (isTitan) {
      arch = 'titan';
    } else if (type === 'stalker') {
      arch = 'stalker';
    } else if (type === 'rusher') {
      arch = 'rusher';
    } else if (type === 'phaser') {
      arch = 'phaser';
    } else {
      arch = 'orbiter';
    }

    const frame = ((time * 6) | 0) & 1;
    const key = `${arch}_${dir}_${frame}`;
    const sprite = this.ghostSprites.get(key) || this.ghostSprites.get(`${arch}_down_0`);

    if (sprite) {
      const renderSize = isTitan ? size * 1.35 : size;
      ctx.drawImage(
        sprite,
        0, 0, 32, 32,
        Math.round(x - renderSize / 2),
        Math.round(y - renderSize / 2),
        Math.round(renderSize),
        Math.round(renderSize)
      );
    }
  }

  public drawIcon(
    ctx: CanvasRenderingContext2D,
    iconId: string,
    x: number,
    y: number,
    size: number = 24
  ) {
    const icon = this.iconSprites.get(iconId);
    if (icon) {
      ctx.drawImage(
        icon,
        0, 0, icon.width, icon.height,
        Math.round(x - size / 2),
        Math.round(y - size / 2),
        Math.round(size),
        Math.round(size)
      );
    }
  }
}

export const spriteAtlas = new SpriteAtlas();

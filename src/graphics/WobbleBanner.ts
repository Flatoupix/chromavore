import { spriteAtlas } from './SpriteAtlas';

export interface WobbleItem {
  category: string;
  title: string;
  desc?: string;
  icon?: string;
  badgeCol?: string;
  duration: number;
  life: number;
}

export class WobbleBannerManager {
  private queue: WobbleItem[] = [];
  public current: WobbleItem | null = null;

  public show(
    category: string,
    title: string,
    desc?: string,
    icon?: string,
    badgeCol: string = '#ffd700',
    duration: number = 2.2
  ) {
    const item: WobbleItem = {
      category,
      title,
      desc,
      icon,
      badgeCol,
      duration,
      life: duration
    };

    if (!this.current) {
      this.current = item;
    } else {
      // Avoid duplicate spam of same title
      if (this.current.title !== title && !this.queue.some(q => q.title === title)) {
        this.queue.push(item);
      }
    }
  }

  public update(dt: number) {
    if (this.current) {
      this.current.life -= dt;
      if (this.current.life <= 0) {
        this.current = this.queue.shift() || null;
      }
    }
  }

  public draw(c: CanvasRenderingContext2D, time: number) {
    if (!this.current) return;

    const item = this.current;
    const cw = c.canvas.width;
    const progress = 1 - item.life / item.duration; // 0 -> 1

    // Enter & Exit alpha / scale
    let alpha = 1;
    let scale = 1;
    let yOffset = 0;

    // Fast pop-in (first 0.22s)
    if (progress < 0.1) {
      const enterRatio = progress / 0.1;
      scale = 0.7 + Math.sin(enterRatio * Math.PI * 0.5) * 0.35;
      alpha = Math.min(1, enterRatio * 1.5);
    }
    // Smooth fade-out (last 0.4s)
    else if (item.life < 0.4) {
      alpha = Math.max(0, item.life / 0.4);
      yOffset = (1 - alpha) * -12;
    }

    const cx = cw / 2;
    // Position comfortably in the upper-middle area below HUD
    const cy = 110 + yOffset;

    c.save();
    c.globalAlpha = alpha;
    c.translate(cx, cy);
    c.scale(scale, scale);

    // Dynamic rainbow palette for letters
    const RAINBOW = [
      '#ff0055', // Neon Pink
      '#ff5500', // Neon Orange
      '#ffd700', // Arcade Yellow
      '#00ff88', // Emerald Green
      '#00f0ff', // Cyber Cyan
      '#bb00ff', // Electric Violet
      '#ffffff'  // Pure White
    ];

    // Measure typography
    c.font = '900 22px "Press Start 2P", monospace, system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    const titleChars = Array.from(item.title);
    const charMetrics = titleChars.map(ch => c.measureText(ch).width);
    const totalTitleWidth = charMetrics.reduce((acc, w) => acc + w, 0);

    const hasIcon = !!item.icon;
    const iconSpacing = hasIcon ? 36 : 0;
    const bannerW = Math.max(340, totalTitleWidth + iconSpacing + 70);
    const bannerH = item.desc ? 68 : 52;

    // 1. Sleek semi-transparent dark backplate with glowing border
    c.fillStyle = 'rgba(6, 10, 24, 0.90)';
    c.strokeStyle = item.badgeCol || '#00f0ff';
    c.lineWidth = 2.2;
    c.shadowColor = item.badgeCol || '#00f0ff';
    c.shadowBlur = 18;

    c.beginPath();
    c.roundRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 12);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // Double neon accent line top & bottom
    c.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-bannerW / 2 + 16, -bannerH / 2 + 3);
    c.lineTo(bannerW / 2 - 16, -bannerH / 2 + 3);
    c.moveTo(-bannerW / 2 + 16, bannerH / 2 - 3);
    c.lineTo(bannerW / 2 - 16, bannerH / 2 - 3);
    c.stroke();

    // 2. Category header text (e.g. "★ POUVOIR DÉBLOQUÉ ★")
    c.font = 'bold 9px monospace';
    c.fillStyle = item.badgeCol || '#00f0ff';
    c.shadowColor = item.badgeCol || '#00f0ff';
    c.shadowBlur = 8;
    c.fillText(item.category.toUpperCase(), 0, -bannerH / 2 + 13);
    c.shadowBlur = 0;

    // 3. Optional icon on the left
    let textStartX = -totalTitleWidth / 2;
    if (hasIcon) {
      const iconX = -totalTitleWidth / 2 - 16;
      const iconY = item.desc ? -1 : 4;
      const iconPulse = 1 + Math.sin(time * 8) * 0.12;
      c.save();
      c.translate(iconX, iconY);
      c.scale(iconPulse, iconPulse);
      spriteAtlas.drawIcon(c, item.icon!, 0, 0, 24);
      c.restore();
      textStartX += 12;
    }

    // 4. MULTICOLOR WOBBLE TITLE (Each character undulating and color-cycled)
    c.font = '900 20px "Press Start 2P", monospace, system-ui, sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'middle';

    let curX = textStartX;
    const titleBaseY = item.desc ? -1 : 5;

    for (let i = 0; i < titleChars.length; i++) {
      const ch = titleChars[i];
      const charW = charMetrics[i];

      // Vertical sine-wave wobble offset
      const charY = titleBaseY + Math.sin(time * 8 + i * 0.45) * 5.0;

      // Color from rainbow palette, cycling over time
      const colIdx = Math.abs((i + Math.floor(time * 4)) % RAINBOW.length);
      const charCol = RAINBOW[colIdx];

      // Heavy black stroke for arcade clarity
      c.strokeStyle = '#050a14';
      c.lineWidth = 4.5;
      c.lineJoin = 'miter';
      c.strokeText(ch, curX, charY);

      // Neon fill with specular glow
      c.fillStyle = charCol;
      c.shadowColor = charCol;
      c.shadowBlur = 10;
      c.fillText(ch, curX, charY);
      c.shadowBlur = 0;

      curX += charW;
    }

    // 5. Subtitle / Command description below
    if (item.desc) {
      c.textAlign = 'center';
      c.font = 'bold 9px monospace';
      c.fillStyle = '#00ffff';
      c.fillText(item.desc, 0, bannerH / 2 - 11);
    }

    c.restore();
  }
}

export const wobbleBanner = new WobbleBannerManager();

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
    duration: number = 2.4
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

  /**
   * OPTION 3: Zero-Obstruction HUD Ticker
   * Positioned strictly inside the 48px top HUD bar (y: 7 to 41).
   * 0 pixels of the playable maze or ghosts are ever covered!
   */
  public draw(c: CanvasRenderingContext2D, time: number) {
    if (!this.current) return;

    const item = this.current;
    const cw = c.canvas.width;
    const progress = 1 - item.life / item.duration; // 0 -> 1

    // Smooth slide-in from top & slide-out to top
    let alpha = 1;
    let slideY = 0;

    if (progress < 0.12) {
      const enterRatio = progress / 0.12;
      slideY = -42 * (1 - Math.sin(enterRatio * Math.PI * 0.5));
      alpha = Math.min(1, enterRatio * 1.5);
    } else if (item.life < 0.35) {
      const exitRatio = 1 - item.life / 0.35;
      slideY = -42 * Math.sin(exitRatio * Math.PI * 0.5);
      alpha = Math.max(0, item.life / 0.35);
    }

    // Geometry: snug fit within the 48px top HUD bar
    const tickerW = Math.min(cw - 16, 390);
    const tickerH = 34;
    const tickerX = (cw - tickerW) / 2;
    const tickerY = 7 + slideY;

    c.save();
    c.globalAlpha = alpha;

    // 1. Sleek semi-translucent dark cyberpunk card
    c.fillStyle = 'rgba(6, 10, 24, 0.96)';
    c.strokeStyle = item.badgeCol || '#ffd700';
    c.lineWidth = 1.4;
    c.shadowColor = item.badgeCol || '#ffd700';
    c.shadowBlur = 8;

    c.beginPath();
    c.roundRect(tickerX, tickerY, tickerW, tickerH, 6);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    // 2. Icon on the left
    const iconX = tickerX + 18;
    const iconY = tickerY + tickerH / 2;
    const iconPulse = 1 + Math.sin(time * 6) * 0.08;

    c.save();
    c.translate(iconX, iconY);
    c.scale(iconPulse, iconPulse);
    spriteAtlas.drawIcon(c, item.icon || 'trophy', 0, 0, 16);
    c.restore();

    // 3. Category mini-tag (e.g. "★ SUCCÈS DÉBLOQUÉ ★")
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.font = 'bold 8px monospace';
    c.fillStyle = item.badgeCol || '#ffd700';
    c.fillText(item.category.toUpperCase(), tickerX + 34, tickerY + 12);

    // 4. Main Title
    c.font = '900 11px monospace';
    c.fillStyle = '#ffffff';
    c.shadowColor = item.badgeCol || '#ffd700';
    c.shadowBlur = 4;
    c.fillText(item.title, tickerX + 34, tickerY + 25);
    c.shadowBlur = 0;

    // 5. Right side info tag (description or "DÉBLOQUÉ !")
    c.textAlign = 'right';
    if (item.desc) {
      c.font = 'bold 8px monospace';
      c.fillStyle = '#00ffcc';
      const maxChars = Math.floor((tickerW - 190) / 6);
      const shortDesc = item.desc.length > maxChars ? item.desc.slice(0, Math.max(4, maxChars - 1)) + '…' : item.desc;
      c.fillText(shortDesc, tickerX + tickerW - 10, tickerY + 19);
    } else {
      c.font = 'bold 8px monospace';
      c.fillStyle = '#00ffcc';
      c.fillText('DÉBLOQUÉ !', tickerX + tickerW - 10, tickerY + 19);
    }

    // 6. Micro countdown timer bar at bottom edge of ticker
    const progRatio = Math.max(0, Math.min(1, item.life / item.duration));
    c.fillStyle = item.badgeCol || '#ffd700';
    c.fillRect(tickerX + 4, tickerY + tickerH - 2, (tickerW - 8) * progRatio, 2);

    c.restore();
  }
}

export const wobbleBanner = new WobbleBannerManager();


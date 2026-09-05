// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — TOUCH DECK & RESPONSIVE CONTROLS
// ═══════════════════════════════════════════════════════════════

import { CW, CH } from '../config/constants';
import { input } from '../core/InputManager';

export function isMobileOrTablet(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
         (window.innerWidth <= 1024 && (('ontouchstart' in window) || navigator.maxTouchPoints > 0));
}

export class TouchDeckManager {
  private touchDeck: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private touchActivated: boolean = false;

  constructor() {
    this.touchDeck = document.getElementById('touch-deck');
    this.canvas = document.getElementById('c') as HTMLCanvasElement;
    this.touchActivated = isMobileOrTablet();

    this.bindButtons();
    this.bindJoystick();
    this.bindTouchActivation();
    this.bindResize();
  }

  public isTouch(): boolean {
    return this.touchActivated;
  }

  private bindTouchActivation() {
    window.addEventListener('touchstart', () => {
      if (!this.touchActivated && isMobileOrTablet()) {
        this.touchActivated = true;
        this.resize();
      }
    }, { passive: true, once: true });
  }

  private bindButtons() {
    const bindBtn = (id: string, onPress: () => void) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        onPress();
      });
    };

    bindBtn('dash-btn', () => {
      input.isDashRequested = true;
      input.isStartRequested = true;
    });
    bindBtn('item-btn', () => { input.isItemRequested = true; });

    const chronoBtn = document.getElementById('chrono-btn');
    if (chronoBtn) {
      chronoBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        input.isChronoRequested = true;
        chronoBtn.classList.add('active-chrono');
      });
      const releaseChrono = (e: Event) => {
        e.preventDefault();
        input.isChronoRequested = false;
        chronoBtn.classList.remove('active-chrono');
      };
      chronoBtn.addEventListener('pointerup', releaseChrono);
      chronoBtn.addEventListener('pointercancel', releaseChrono);
      chronoBtn.addEventListener('pointerleave', releaseChrono);
    }

    bindBtn('btn-pause', () => { input.isPauseRequested = true; });
    bindBtn('btn-mute', () => { input.isAudioToggleRequested = true; });
  }

  private bindJoystick() {
    const zone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    if (!zone || !base || !knob) return;

    let activePointerId: number | null = null;
    let baseRect: DOMRect | null = null;
    let centerX = 0, centerY = 0;
    let currentDir = { x: 0, y: 0 };

    const guides = {
      up: base.querySelector('.j-up') as HTMLElement | null,
      down: base.querySelector('.j-down') as HTMLElement | null,
      left: base.querySelector('.j-left') as HTMLElement | null,
      right: base.querySelector('.j-right') as HTMLElement | null,
    };

    const clearGuides = () => {
      Object.values(guides).forEach(g => {
        if (g) {
          g.style.color = 'rgba(0, 240, 255, 0.45)';
          g.style.textShadow = 'none';
        }
      });
    };

    const highlightGuide = (dirX: number, dirY: number) => {
      clearGuides();
      let activeGuide: HTMLElement | null = null;
      if (dirY === -1) activeGuide = guides.up;
      else if (dirY === 1) activeGuide = guides.down;
      else if (dirX === -1) activeGuide = guides.left;
      else if (dirX === 1) activeGuide = guides.right;

      if (activeGuide) {
        activeGuide.style.color = '#ffd700';
        activeGuide.style.textShadow = '0 0 8px #ffd700';
      }
    };

    const resetKnob = () => {
      activePointerId = null;
      zone.classList.remove('active');
      knob.style.transform = 'translate(-50%, -50%)';
      currentDir = { x: 0, y: 0 };
      clearGuides();
    };

    const maxR = 34;
    const deadzone = 8;

    const handlePointer = (clientX: number, clientY: number) => {
      if (!baseRect) baseRect = base.getBoundingClientRect();
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      // Clamp knob travel
      const clampedDist = Math.min(dist, maxR);
      const angle = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;
      knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;

      // Direction detection
      if (dist >= deadzone) {
        let dirX = 0, dirY = 0;
        if (Math.abs(dx) > Math.abs(dy)) {
          dirX = dx > 0 ? 1 : -1;
        } else {
          dirY = dy > 0 ? 1 : -1;
        }

        if (dirX !== currentDir.x || dirY !== currentDir.y) {
          currentDir = { x: dirX, y: dirY };
          input.setNextDir(dirX, dirY);
          highlightGuide(dirX, dirY);
        }
      }
    };

    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      activePointerId = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch {}
      zone.classList.add('active');
      baseRect = base.getBoundingClientRect();
      centerX = baseRect.left + baseRect.width / 2;
      centerY = baseRect.top + baseRect.height / 2;
      handlePointer(e.clientX, e.clientY);
    });

    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();
      handlePointer(e.clientX, e.clientY);
    });

    zone.addEventListener('pointerup', (e) => {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();
      try { zone.releasePointerCapture(e.pointerId); } catch {}
      resetKnob();
    });

    zone.addEventListener('pointercancel', (e) => {
      if (e.pointerId !== activePointerId) return;
      try { zone.releasePointerCapture(e.pointerId); } catch {}
      resetKnob();
    });
  }

  private bindResize() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 100));
    this.resize();
  }

  public isMobileLandscape(): boolean {
    return window.innerWidth > window.innerHeight && window.innerHeight <= 520;
  }

  public resize() {
    if (!this.canvas) return;

    const isLandscape = this.isMobileLandscape();
    if (this.touchDeck) {
      if (this.touchActivated) {
        this.touchDeck.classList.add('active');
      } else {
        this.touchDeck.classList.remove('active');
      }
    }

    const isDeckOn = this.touchDeck && this.touchDeck.classList.contains('active');
    const deckH = (isDeckOn && !isLandscape) ? (this.touchDeck.offsetHeight || 135) : 0;
    const padW = isLandscape ? 130 : 16;
    const padH = isLandscape ? 8 : 12;

    const availW = Math.max(200, window.innerWidth - padW);
    const availH = Math.max(160, window.innerHeight - deckH - padH);
    const curCw = this.canvas.width || CW;
    const curCh = this.canvas.height || CH;
    const s = Math.min(availW / curCw, availH / curCh, 2.5);

    this.canvas.style.width = Math.round(curCw * s) + 'px';
    this.canvas.style.height = Math.round(curCh * s) + 'px';
  }
}

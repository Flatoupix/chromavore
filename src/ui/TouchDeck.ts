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

    bindBtn('btn-up', () => input.setNextDir(0, -1));
    bindBtn('btn-down', () => input.setNextDir(0, 1));
    bindBtn('btn-left', () => input.setNextDir(-1, 0));
    bindBtn('btn-right', () => input.setNextDir(1, 0));
    bindBtn('dash-btn', () => {
      input.isDashRequested = true;
      input.isStartRequested = true;
    });
    bindBtn('item-btn', () => { input.isItemRequested = true; });
    bindBtn('btn-pause', () => { input.isPauseRequested = true; });
    bindBtn('btn-mute', () => { input.isAudioToggleRequested = true; });
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
    const s = Math.min(availW / CW, availH / CH, 2.5);

    this.canvas.style.width = Math.round(CW * s) + 'px';
    this.canvas.style.height = Math.round(CH * s) + 'px';
  }
}

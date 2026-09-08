// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — MOBILE CONTROLS & RESPONSIVE FULLSCREEN (OPTION A)
// ═══════════════════════════════════════════════════════════════

import { CW, CH } from '../config/constants';
import { input } from '../core/InputManager';

export function isMobileOrTablet(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
         (window.innerWidth <= 1024 && (('ontouchstart' in window) || navigator.maxTouchPoints > 0));
}

const RING_CIRCUMFERENCE = 175.9; // 2 * Math.PI * 28

export class TouchDeckManager {
  private mobileControls: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private touchActivated: boolean = false;
  private isControlsVisible: boolean = false;
  private dashRing: SVGCircleElement | null = null;

  constructor() {
    this.mobileControls = document.getElementById('mobile-controls') || document.getElementById('touch-deck');
    this.canvas = document.getElementById('c') as HTMLCanvasElement;
    this.dashRing = document.getElementById('dash-ring-prog') as unknown as SVGCircleElement;
    this.touchActivated = isMobileOrTablet();

    this.bindButtons();
    this.bindTouchActivation();
    this.bindResize();
  }

  public isTouch(): boolean {
    return this.touchActivated;
  }

  public setVisible(show: boolean) {
    this.isControlsVisible = show;
    if (this.mobileControls) {
      if (show && this.touchActivated) {
        this.mobileControls.classList.add('active');
      } else {
        this.mobileControls.classList.remove('active');
      }
    }
  }

  public updateDashGauge(dashCd: number, maxCd: number, isOverdrive: boolean) {
    if (!this.dashRing) {
      this.dashRing = document.getElementById('dash-ring-prog') as unknown as SVGCircleElement;
    }
    if (!this.dashRing) return;

    if (isOverdrive || dashCd <= 0) {
      this.dashRing.style.strokeDashoffset = '0';
      this.dashRing.style.stroke = isOverdrive ? '#00ffcc' : '#00f0ff';
    } else {
      const prog = Math.max(0, Math.min(1, 1 - dashCd / Math.max(0.1, maxCd)));
      const offset = RING_CIRCUMFERENCE * (1 - prog);
      this.dashRing.style.strokeDashoffset = offset.toFixed(1);
      this.dashRing.style.stroke = '#ff007f';
    }
  }

  private bindTouchActivation() {
    window.addEventListener('touchstart', () => {
      if (!this.touchActivated && isMobileOrTablet()) {
        this.touchActivated = true;
        this.resize();
        if (this.isControlsVisible) {
          this.setVisible(true);
        }
      }
    }, { passive: true, once: true });
  }

  private bindButtons() {
    const bindBtn = (id: string, onPress: () => void) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onPress();
      });
    };

    bindBtn('dash-btn', () => {
      input.isDashRequested = true;
      input.isStartRequested = true;
    });

    const chronoBtn = document.getElementById('chrono-btn');
    if (chronoBtn) {
      chronoBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
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

    // In Option A, mobile controls are an overlay: 0px vertical penalty!
    const padW = isLandscape ? 32 : 12;
    const padH = 12;

    const availW = Math.max(200, window.innerWidth - padW);
    const availH = Math.max(160, window.innerHeight - padH);
    const curCw = this.canvas.width || CW;
    const curCh = this.canvas.height || CH;
    const s = Math.min(availW / curCw, availH / curCh, 2.5);

    this.canvas.style.width = Math.round(curCw * s) + 'px';
    this.canvas.style.height = Math.round(curCh * s) + 'px';
  }
}

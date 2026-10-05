import { HUD_H, BOTTOM_BAR_H, PI2, SINGULARITY_DURATION } from '../config/constants';
import { formatScoreCompact } from '../utils/format';

export interface HUDSpell {
  id: string; label: string; color: string; unlocked: boolean;
  cd: number; hasMana: boolean; manaCost: number; unlockAt?: number;
}

export interface ArcadeHUDState {
  mode: 'arcade' | 'custom'; score: number; stage: number; stages: number;
  loop: number; lives: number; streak: number; streakRatio: number;
  singularity: number; target: number; singularityTime: number;
  status: string; chrono: number; chronoMax: number; chronoUnlocked: boolean;
  chronoActive: boolean; dashUnlocked: boolean; dashCharges: number;
  dashMax: number; dashCd: number; overdrive: boolean;
  mana: number; maxMana: number; spells: HUDSpell[]; itemStatus: string;
}

export interface ArcadeProgressState {
  mode: 'arcade' | 'custom'; name: string; current: number; target: number;
  progress: number; remaining: number; accountLevel: number; skillPoints: number;
  surge: boolean;
}

const CYAN = '#00efff', GOLD = '#ffdc36', PINK = '#f553dc', WHITE = '#edf6ff';
const MUTED = '#8595b2';
const clamp = (v: number) => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
const number = (v: number) => Math.max(0, Math.floor(v)).toLocaleString('en-US');

// The score is drawn as real bitmap lettering, independent of downloaded fonts.
const GLYPHS: Record<string, string[]> = {
  '0': ['01110','11011','11011','11011','11011','11011','01110'],
  '1': ['00110','01110','00110','00110','00110','00110','11111'],
  '2': ['11110','00011','00011','01110','11000','11000','11111'],
  '3': ['11110','00011','00011','01110','00011','00011','11110'],
  '4': ['11011','11011','11011','11111','00011','00011','00011'],
  '5': ['11111','11000','11000','11110','00011','00011','11110'],
  '6': ['01111','11000','11000','11110','11011','11011','01110'],
  '7': ['11111','00011','00110','00110','01100','01100','01100'],
  '8': ['01110','11011','11011','01110','11011','11011','01110'],
  '9': ['01110','11011','11011','01111','00011','00011','11110'],
  'K': ['11011','11011','11110','11100','11110','11011','11011'],
  'M': ['10001','11011','11111','10101','10001','10001','10001'],
  'X': ['11011','11011','01110','00100','01110','11011','11011'],
  '/': ['00001','00011','00110','00100','01100','11000','10000'],
  ',': ['00000','00000','00000','00000','00110','00110','01100'],
  '.': ['00000','00000','00000','00000','00000','00110','00110'],
};

function label(c: CanvasRenderingContext2D, text: string, x: number, y: number,
  size = 11, color = WHITE, align: CanvasTextAlign = 'left', maxWidth?: number) {
  c.font = `bold ${size}px monospace`;
  c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle';
  if (maxWidth) {
    while (c.measureText(text).width > maxWidth && size > 9) {
      size--; c.font = `bold ${size}px monospace`;
    }
    if (c.measureText(text).width > maxWidth) {
      while (text.length > 1 && c.measureText(text + '…').width > maxWidth) text = text.slice(0, -1);
      text += '…';
    }
  }
  c.fillText(text, x, y);
}

function pixels(c: CanvasRenderingContext2D, text: string, x: number, y: number,
  maxWidth: number, size: number, color = GOLD) {
  const scale = Math.min(size / 7, maxWidth / Math.max(1, text.length * 6 - 1));
  c.fillStyle = color; c.shadowColor = color; c.shadowBlur = 5;
  [...text.toUpperCase()].forEach((ch, i) => {
    GLYPHS[ch]?.forEach((row, r) => [...row].forEach((bit, col) => {
      if (bit === '1') c.fillRect(x + (i * 6 + col) * scale, y + r * scale, scale, scale);
    }));
  });
  c.shadowBlur = 0;
}

function panel(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  color = '#256678') {
  c.fillStyle = '#060b17'; c.strokeStyle = color; c.lineWidth = 1;
  c.beginPath(); c.roundRect(x + .5, y + .5, w - 1, h - 1, 5); c.fill(); c.stroke();
}

function meter(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  progress: number, color: string) {
  const n = Math.max(1, Math.floor(w / 12));
  c.fillStyle = '#202735'; c.fillRect(x, y, w, h);
  for (let i = 0; i < n; i++) {
    const fill = clamp(progress * n - i);
    if (fill > 0) {
      c.fillStyle = color;
      c.fillRect(x + i * w / n + 1, y + 1, Math.max(0, (w / n - 2) * fill), h - 2);
    }
  }
}

function key(c: CanvasRenderingContext2D, text: string, x: number, y: number, w: number) {
  c.strokeStyle = '#9aaac1'; c.lineWidth = 1;
  c.strokeRect(x + .5, y + .5, w, 15);
  label(c, text, x + w / 2, y + 8, 10, WHITE, 'center');
}

function icon(c: CanvasRenderingContext2D, id: string, x: number, y: number, r: number, color: string) {
  c.save(); c.translate(x, y); c.strokeStyle = color; c.lineWidth = 2;
  c.shadowColor = color; c.shadowBlur = 5;
  c.beginPath();
  if (id === 'nitro') {
    for (const dx of [-5, 3]) { c.moveTo(dx - 4, -r); c.lineTo(dx + 4, 0); c.lineTo(dx - 4, r); }
  } else if (id === 'kinetic_bastion') {
    for (let i = 0; i <= 6; i++) {
      const a = i * PI2 / 6 - Math.PI / 2;
      i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  } else if (id === 'quantum_laser') {
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 4; c.moveTo(-Math.cos(a) * r, -Math.sin(a) * r);
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  } else if (id === 'singularity_nova') {
    for (let i = 0; i < 65; i++) {
      const a = i / 64 * PI2 * 2, rad = i / 64 * r;
      i ? c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : c.moveTo(0, 0);
    }
  } else {
    c.arc(0, 0, r, 0, PI2); c.moveTo(r * .55, 0); c.arc(0, 0, r * .55, 0, PI2);
  }
  c.stroke(); c.restore();
}

function spellTile(c: CanvasRenderingContext2D, spell: HUDSpell, x: number, y: number, w: number, h: number) {
  const status = !spell.unlocked ? (spell.unlockAt ? `${spell.unlockAt} KILLS` : 'LOCKED')
    : spell.cd > 0 ? `${spell.cd.toFixed(1)}s` : !spell.hasMana ? 'LOW MANA'
      : spell.manaCost > 0 ? `READY ${spell.manaCost}MP` : 'READY';
  const color = !spell.unlocked ? '#53617a' : spell.color;
  panel(c, x, y, w, h, color);
  icon(c, spell.id, x + w / 2, y + (h > 60 ? 22 : 12), h > 60 ? 12 : 7, color);
  if (spell.unlocked && spell.cd > 0) {
    c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath();
    c.arc(x + w - 12, y + 13, 6, -Math.PI / 2, -Math.PI / 2 + Math.min(1, spell.cd / 40) * PI2); c.stroke();
  }
  label(c, spell.label, x + w / 2, y + h - (h > 60 ? 30 : 23), 11, spell.unlocked ? WHITE : MUTED, 'center', w - 6);
  label(c, status, x + w / 2, y + h - (h > 60 ? 14 : 10), 10, spell.cd > 0 ? GOLD : color, 'center', w - 6);
}

function resources(c: CanvasRenderingContext2D, s: ArcadeHUDState, x: number, y: number, w: number, h: number) {
  panel(c, x, y, w, h);
  const custom = s.mode === 'custom';
  const leftW = custom ? w * .52 : w;
  label(c, 'CHRONO', x + 12, y + 15, 11, CYAN);
  label(c, s.chronoUnlocked ? `${Math.round(s.chrono / s.chronoMax * 100)}%` : '180 KILLS',
    x + leftW - 10, y + 15, 11, s.chronoUnlocked ? CYAN : MUTED, 'right');
  meter(c, x + 12, y + 28, leftW - 24, 9, s.chronoUnlocked ? s.chrono / s.chronoMax : 0, CYAN);
  key(c, 'SHIFT', x + 12, y + 44, 42);
  label(c, s.chronoActive ? 'SLOW TIME' : 'CHRONO', x + 63, y + 52, 10, s.chronoActive ? WHITE : MUTED);
  label(c, 'DASH', x + 12, y + 70, 11, GOLD);
  label(c, !s.dashUnlocked ? '10 KILLS' : s.overdrive ? 'NO-CD'
    : s.dashCharges > 0 ? `${s.dashCharges}/${s.dashMax}` : `${s.dashCd.toFixed(1)}s`,
    x + 67, y + 70, 11, s.dashUnlocked ? GOLD : MUTED);
  key(c, 'SPACE', x + leftW - 57, y + 62, 43);
  if (custom) {
    label(c, 'MANA', x + leftW + 10, y + 15, 11, PINK);
    label(c, `${Math.floor(s.mana)}/${s.maxMana}`, x + w - 10, y + 34, 12, PINK, 'right');
    meter(c, x + leftW + 10, y + 48, w - leftW - 20, 10, s.mana / s.maxMana, PINK);
    label(c, 'SPELL RESOURCE', x + leftW + 10, y + 70, 9, MUTED);
  }
}

export function drawArcadeHUD(c: CanvasRenderingContext2D, width: number, height: number, s: ArcadeHUDState) {
  c.save();
  c.fillStyle = '#050711'; c.fillRect(0, 0, width, HUD_H);
  panel(c, 3, 3, width - 6, 58);
  const scoreW = width * .32, stageX = width * .49, streakX = width * .72;
  label(c, s.mode === 'custom' ? 'CHROMAMANCER' : 'CHROMAVORE / COMPACT'.replace('/ COMPACT', width > 700 ? '/ WIDE' : '/ COMPACT'), 12, 12, 9, CYAN);
  label(c, 'SCORE', 12, 25, 10);
  pixels(c, s.score < 1_000_000 ? number(s.score) : formatScoreCompact(Math.round(s.score)), 12, 34, scoreW - 18, 23);
  panel(c, stageX - 64, 6, 128, 44, '#008caa');
  label(c, 'STAGE', stageX, 15, 11, CYAN, 'center');
  const stage = `${String(s.stage).padStart(2, '0')}/${String(s.stages).padStart(2, '0')}`;
  pixels(c, stage, stageX - 53, 29, 106, 19, CYAN);
  label(c, s.status || (s.loop > 0 ? `LOOP ${s.loop + 1}` : 'DEVOUR THE LIGHT'), stageX, 54, 9, MUTED, 'center', width * .29);
  label(c, 'STREAK', streakX, 15, 11, WHITE);
  pixels(c, `X${s.streak}`, streakX, 28, width * .15, 20);
  meter(c, streakX, 52, width * .14, 3, s.streakRatio, GOLD);
  const visibleLives = Math.min(3, s.lives);
  for (let i = 0; i < visibleLives; i++) {
    const x = width - 18 - i * 21;
    c.fillStyle = GOLD; c.beginPath(); c.arc(x, 40, 7, 0, PI2); c.fill();
    c.fillStyle = WHITE; c.fillRect(x - 2, 37, 2, 3); c.fillRect(x + 2, 37, 2, 3);
  }
  if (s.lives > 3) label(c, `+${s.lives - 3}`, width - 15, 55, 9, GOLD, 'right');
  panel(c, 3, 64, width - 6, HUD_H - 65, '#786126');
  label(c, 'SINGULARITY', 12, 75, 11, GOLD);
  const active = s.singularityTime > 0;
  const progress = active ? s.singularityTime / SINGULARITY_DURATION : s.singularity / Math.max(1, s.target);
  const readout = active ? `x64 · ${s.singularityTime.toFixed(1)}s`
    : `${s.singularity}/${s.target}  ${(clamp(progress) * 100).toFixed(0)}%`;
  meter(c, 115, 70, width - 275, 11, progress, GOLD);
  label(c, readout, width - 12, 75, 11, active ? WHITE : GOLD, 'right');

  c.restore();
  drawArcadeCommands(c, width, height, s);
}

export function drawArcadeCommands(c: CanvasRenderingContext2D, width: number, height: number, s: ArcadeHUDState) {
  c.save();
  const y = height - BOTTOM_BAR_H + 4, gap = 6;
  const twoRows = s.mode === 'custom' && width < 700;
  c.fillStyle = '#050711'; c.fillRect(0, height - BOTTOM_BAR_H, width, BOTTOM_BAR_H);
  if (twoRows) {
    const tileW = (width - 120 - gap * 6) / 5;
    s.spells.forEach((sp, i) => spellTile(c, sp, 4 + i * (tileW + gap), y, tileW, 50));
    const rx = width - 115;
    label(c, 'SPELLS', rx + 55, y + 12, 11, WHITE, 'center'); key(c, '2x SHIFT', rx + 10, y + 26, 88);
    label(c, `CHRONO ${Math.round(s.chrono / s.chronoMax * 100)}%`, 12, y + 68, 11, CYAN);
    label(c, `DASH ${s.dashCharges}/${s.dashMax}`, width / 2, y + 68, 11, GOLD, 'center');
    label(c, `MANA ${Math.floor(s.mana)}/${s.maxMana}`, width - 12, y + 68, 11, PINK, 'right');
  } else {
    const tileW = s.mode === 'custom' ? 76 : Math.min(92, width * .14);
    s.spells.forEach((sp, i) => spellTile(c, sp, 4 + i * (tileW + gap), y, tileW, 82));
    const rx = 4 + s.spells.length * (tileW + gap);
    const hintW = width < 700 ? 132 : 174;
    const resourceW = width - rx - hintW - 12;
    resources(c, s, rx, y, resourceW, 82);
    const hx = rx + resourceW + gap;
    panel(c, hx, y, hintW, 82);
    label(c, 'SPELLS', hx + hintW / 2, y + 15, 12, WHITE, 'center');
    key(c, '2x SHIFT', hx + (hintW - 84) / 2, y + 28, 84);
    label(c, 'HOLD · DIRECTIONS', hx + hintW / 2, y + 51, 9, MUTED, 'center', hintW - 10);
    label(c, 'RELEASE TO CAST', hx + hintW / 2, y + 61, 9, MUTED, 'center', hintW - 10);
    label(c, s.itemStatus || '[P] PAUSE  [M] AUDIO', hx + hintW / 2, y + 75, 9, s.itemStatus ? GOLD : CYAN, 'center', hintW - 10);
  }
  c.restore();
}

export function drawArcadeProgress(c: CanvasRenderingContext2D, width: number, height: number, s: ArcadeProgressState) {
  c.save();
  const y = height - 44;
  panel(c, 3, y, width - 6, 41, s.mode === 'custom' ? '#9742a7' : '#b32a9f');
  if (s.mode === 'arcade') {
    icon(c, 'singularity_nova', 22, y + 22, 10, PINK);
    label(c, s.target ? 'NEXT UNLOCK' : 'ARSENAL MASTERED', 40, y + 10, 9, CYAN);
    label(c, s.name, 40, y + 28, 14, PINK, 'left', width * .38 - 40);
    meter(c, width * .40, y + 23, width * .31, 10, s.progress, PINK);
    label(c, s.target ? `CAREER ${number(s.current)}/${number(s.target)} KILLS` : `CAREER ${number(s.current)} KILLS`,
      width - 12, y + 10, 10, WHITE, 'right');
    label(c, s.target ? `${number(s.remaining)} TO GO${s.target === 500 ? ' · WIDE ARENA' : ''}` : 'ALL POWERS UNLOCKED',
      width - 12, y + 28, 10, CYAN, 'right', width * .27 - 14);
  } else {
    label(c, `LVL ${s.accountLevel}`, 12, y + 11, 12, WHITE);
    label(c, s.target === Infinity ? 'MAX LEVEL' : `XP ${number(s.current)}/${number(s.target)}`,
      width / 2, y + 11, 11, WHITE, 'center');
    meter(c, 12, y + 26, width - 24, 9, s.progress, s.surge ? GOLD : PINK);
    label(c, s.skillPoints > 0 ? `+${s.skillPoints} SKILL POINTS` : s.surge ? 'SURGE 2x XP' : `NEXT LVL ${s.accountLevel + 1}`,
      width - 12, y + 11, 10, s.skillPoints > 0 ? GOLD : CYAN, 'right', width * .29);
  }
  c.restore();
}

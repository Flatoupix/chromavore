// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — PROGRESSION SYSTEM & EXPONENTIAL SKILLS (V1 & V2)
// ═══════════════════════════════════════════════════════════════

import { profileManager } from './ProfileManager';
import { sounds } from '../audio/SoundManager';
import { particles } from './ParticleSystem';
import { CW, ROWS, T } from '../config/constants';
import { badges } from './BadgeSystem';

export interface SkillDef {
  id: string;             // e.g. 'dash_v1', 'dash_v2'
  baseId: string;         // e.g. 'dash'
  version: 1 | 2;
  name: string;
  icon: string;
  threshold: number;      // ghosts required
  category: 'movement' | 'kombo' | 'item';
  command: string;        // e.g. 'Espace ou Double-Tap'
  desc: string;
}

export const SKILL_TREE: SkillDef[] = [
  {
    id: 'dash_v1',
    baseId: 'dash',
    version: 1,
    name: 'DASH OFFENSIF',
    icon: '⚡',
    threshold: 5,
    category: 'movement',
    command: 'ESPACE ou BOUTON ⚡',
    desc: 'Téléportation offensive de 3 cases à travers les fantômes avec taillade'
  },
  {
    id: 'wiggle_v1',
    baseId: 'wiggle',
    version: 1,
    name: 'WIGGLE EMP',
    icon: '⚡',
    threshold: 15,
    category: 'kombo',
    command: '← → ← → (Wiggle)',
    desc: 'Onde de choc EMP qui repousse et étourdit les fantômes proches pendant 2.5s'
  },
  {
    id: 'nitro_v1',
    baseId: 'nitro',
    version: 1,
    name: 'NITRO JET',
    icon: '🔥',
    threshold: 35,
    category: 'kombo',
    command: '↑ ↓ ↑ ↓ (Pompage)',
    desc: 'Vitesse turbo accrue + traînée ardente brûlant les fantômes pendant 3.2s'
  },
  {
    id: 'nova_v1',
    baseId: 'nova',
    version: 1,
    name: 'MEGA NOVA',
    icon: '💣',
    threshold: 80,
    category: 'item',
    command: 'Touche [E] ou Bouton 💣',
    desc: 'Explosion thermo-nucléaire qui purge instantanément tous les fantômes'
  },
  {
    id: 'overdrive_v1',
    baseId: 'overdrive',
    version: 1,
    name: 'DASH INFINI',
    icon: '⚡',
    threshold: 160,
    category: 'item',
    command: 'Touche [E] ou Bouton 💣',
    desc: 'Dash illimité sans aucun temps de recharge pendant 8 secondes'
  },
  {
    id: 'vortex_v1',
    baseId: 'vortex',
    version: 1,
    name: 'BLACK HOLE',
    icon: '🕳️',
    threshold: 400,
    category: 'item',
    command: 'Touche [E] ou Bouton 💣',
    desc: 'Vortex gravitationnel qui attire et désintègre tous les spectres'
  },
  {
    id: 'wiggle_v2',
    baseId: 'wiggle',
    version: 2,
    name: 'GIGA EMP V2',
    icon: '⚡',
    threshold: 700,
    category: 'kombo',
    command: '← → ← → (Wiggle)',
    desc: 'Rayon doublé (160px), étourdissement 4s et rend les fantômes vulnérables/mangeables'
  },
  {
    id: 'dash_v2',
    baseId: 'dash',
    version: 2,
    name: 'CYBER DASH V2',
    icon: '⚡',
    threshold: 1000,
    category: 'movement',
    command: 'ESPACE ou BOUTON ⚡',
    desc: 'Portée augmentée à 4 cases, recharge -25% et onde de choc étourdissante à l\'arrivée'
  },
  {
    id: 'laser_v1',
    baseId: 'laser',
    version: 1,
    name: 'HYPER BEAMS',
    icon: '⚡',
    threshold: 1500,
    category: 'item',
    command: 'Touche [E] ou Bouton 💣',
    desc: 'Canons lasers cruciformes découpant les couloirs horizontaux et verticaux'
  },
  {
    id: 'nitro_v2',
    baseId: 'nitro',
    version: 2,
    name: 'PLASMA BURNER V2',
    icon: '🔥',
    threshold: 2000,
    category: 'kombo',
    command: '↑ ↓ ↑ ↓ (Pompage)',
    desc: 'Vitesse turbo +20%, durée 4.5s et traînée de feu persistante au sol pendant 2.5s'
  },
  {
    id: 'cryo_v1',
    baseId: 'cryo',
    version: 1,
    name: 'CRYO SHATTER',
    icon: '❄️',
    threshold: 3000,
    category: 'item',
    command: 'Touche [E] ou Bouton 💣',
    desc: 'Zéro absolu : gèle tous les spectres pour les briser au moindre contact'
  },
  {
    id: 'nova_v2',
    baseId: 'nova',
    version: 2,
    name: 'SUPERNOVA V2',
    icon: '💣',
    threshold: 4500,
    category: 'item',
    command: 'Touche [E] ou Bouton 💣',
    desc: 'Purge totale + pluie d\'orbes dorées bonus et multiplicateurs instantanés'
  },
  {
    id: 'tsunami_v1',
    baseId: 'tsunami',
    version: 1,
    name: 'LIGHT TSUNAMI',
    icon: '👑',
    threshold: 6500,
    category: 'item',
    command: 'Touche [E] ou Bouton 💣',
    desc: 'Vague royale sacrée balayant tout le labyrinthe + bonus de temps de survie'
  },
  {
    id: 'overdrive_v2',
    baseId: 'overdrive',
    version: 2,
    name: 'CHRONO OVERDRIVE V2',
    icon: '⚡',
    threshold: 9500,
    category: 'item',
    command: 'Touche [E] ou Bouton 💣',
    desc: 'Dash infini + ralentit le temps des spectres de 50% pendant toute la durée'
  },
  {
    id: 'vortex_v2',
    baseId: 'vortex',
    version: 2,
    name: 'DARK MATTER V2',
    icon: '🕳️',
    threshold: 14000,
    category: 'item',
    command: 'Touche [E] ou Bouton 💣',
    desc: 'Le trou noir aspire également toutes les pastilles et orbes de la zone'
  },
  {
    id: 'laser_v2',
    baseId: 'laser',
    version: 2,
    name: 'OCTO BEAMS V2',
    icon: '⚡',
    threshold: 20000,
    category: 'item',
    command: 'Touche [E] ou Bouton 💣',
    desc: 'Lasers à 8 directions (cruciformes + 4 diagonales) rasant intégralement la carte'
  },
  {
    id: 'cryo_v2',
    baseId: 'cryo',
    version: 2,
    name: 'ABSOLUTE ZERO V2',
    icon: '❄️',
    threshold: 30000,
    category: 'item',
    command: 'Touche [E] ou Bouton 💣',
    desc: 'Gèle tous les fantômes et les fait exploser en chaîne au bout de 3 secondes'
  },
  {
    id: 'tsunami_v2',
    baseId: 'tsunami',
    version: 2,
    name: 'SOLAR ECLIPSE V2',
    icon: '👑',
    threshold: 50000,
    category: 'item',
    command: 'Touche [E] ou Bouton 💣',
    desc: 'Double vague royale aller-retour + recharge instantanée du super-item suivant'
  }
];

class ProgressionManager {
  public get totalGhosts(): number {
    return profileManager.profile.careerGhosts;
  }

  public addGhostKills(count: number): SkillDef[] {
    const prev = profileManager.profile.careerGhosts;
    const next = prev + count;
    profileManager.profile.careerGhosts = next;
    profileManager.saveProfile();

    // Check kill-based achievement badges
    badges.checkKillBadges(next);

    const newlyUnlocked: SkillDef[] = [];
    for (const s of SKILL_TREE) {
      if (prev < s.threshold && next >= s.threshold) {
        newlyUnlocked.push(s);
        sounds.play('badge');
        particles.addPop(CW / 2, (ROWS * T) / 2, `🎉 ${s.name} DÉBLOQUÉ !`, '#ffd700', 22);
        particles.flash('#ffd700', 0.4);
        particles.shake(8, 0.25);
      }
    }
    return newlyUnlocked;
  }

  public getSkillLevel(baseId: string): 0 | 1 | 2 {
    const g = this.totalGhosts;
    const v2 = SKILL_TREE.find(s => s.baseId === baseId && s.version === 2);
    if (v2 && g >= v2.threshold) return 2;
    const v1 = SKILL_TREE.find(s => s.baseId === baseId && s.version === 1);
    if (v1 && g >= v1.threshold) return 1;
    return 0;
  }

  public isSkillUnlocked(skillId: string): boolean {
    const s = SKILL_TREE.find(item => item.id === skillId);
    if (!s) return false;
    return this.totalGhosts >= s.threshold;
  }

  public getSkillState(skillId: string): { unlocked: boolean; isNext: boolean; hidden: boolean } {
    const idx = SKILL_TREE.findIndex(s => s.id === skillId);
    if (idx === -1) return { unlocked: false, isNext: false, hidden: false };

    // Find index of highest unlocked skill
    let lastUnlockedIdx = -1;
    for (let i = SKILL_TREE.length - 1; i >= 0; i--) {
      if (this.totalGhosts >= SKILL_TREE[i].threshold) {
        lastUnlockedIdx = i;
        break;
      }
    }

    if (idx <= lastUnlockedIdx) {
      return { unlocked: true, isNext: false, hidden: false };
    }

    const distance = idx - lastUnlockedIdx;
    // distance === 1: 1 après ceux débloqués -> visible (prochain déblocage)
    // distance >= 2: 2 après ceux débloqués -> caché (??? [CLASSIFIÉ])
    return {
      unlocked: false,
      isNext: distance === 1,
      hidden: distance >= 2
    };
  }

  public getNextUnlock(): { skill: SkillDef | null; remaining: number; progress: number; prevThreshold: number } {
    const g = this.totalGhosts;
    let prevThreshold = 0;
    for (const s of SKILL_TREE) {
      if (g < s.threshold) {
        const span = s.threshold - prevThreshold;
        const currentInSpan = g - prevThreshold;
        const progress = Math.max(0, Math.min(1, currentInSpan / span));
        return {
          skill: s,
          remaining: s.threshold - g,
          progress,
          prevThreshold
        };
      }
      prevThreshold = s.threshold;
    }
    return { skill: null, remaining: 0, progress: 1, prevThreshold };
  }

  public getUnlockedSuperItems(): string[] {
    const items = ['nova', 'overdrive', 'vortex', 'laser', 'cryo', 'tsunami'];
    return items.filter(id => this.getSkillLevel(id) >= 1);
  }
}

export const progression = new ProgressionManager();

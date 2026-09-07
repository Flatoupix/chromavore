// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — PROGRESSION SYSTEM & EXPONENTIAL SKILLS (V1 TO V4)
// ═══════════════════════════════════════════════════════════════

import { profileManager } from './ProfileManager';
import { sounds } from '../audio/SoundManager';
import { particles } from './ParticleSystem';
import { CW, ROWS, T } from '../config/constants';
import { badges } from './BadgeSystem';
import { wobbleBanner } from '../graphics/WobbleBanner';

export interface SkillDef {
  id: string;             // e.g. 'dash_v1' to 'dash_v4'
  baseId: string;         // e.g. 'dash'
  version: 1 | 2 | 3 | 4;
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
    icon: 'dash',
    threshold: 35,
    category: 'movement',
    command: 'ESPACE ou BOUTON DASH',
    desc: 'Téléportation offensive de 3 cases à travers les fantômes avec taillade'
  },
  {
    id: 'nova_v1',
    baseId: 'nova',
    version: 1,
    name: 'MEGA NOVA',
    icon: 'nova',
    threshold: 75,
    category: 'item',
    command: 'AUTOMATIQUE AU RAMASSAGE',
    desc: 'Explosion thermo-nucléaire qui purge instantanément tous les fantômes'
  },
  {
    id: 'wiggle_v1',
    baseId: 'wiggle',
    version: 1,
    name: 'WIGGLE EMP',
    icon: 'wiggle',
    threshold: 120,
    category: 'kombo',
    command: '← → ← → (Wiggle)',
    desc: 'Onde de choc EMP qui repousse et étourdit les fantômes proches pendant 2.5s'
  },
  {
    id: 'chrono_v1',
    baseId: 'chrono',
    version: 1,
    name: 'CHRONO SHIFT',
    icon: 'chrono',
    threshold: 180,
    category: 'movement',
    command: 'SHIFT ou BOUTON CHRONO',
    desc: 'Dilatation temporelle : ralentit le monde à 18% pour esquiver les essaims'
  },
  {
    id: 'overdrive_v1',
    baseId: 'overdrive',
    version: 1,
    name: 'DASH INFINI',
    icon: 'overdrive',
    threshold: 260,
    category: 'item',
    command: 'AUTOMATIQUE AU RAMASSAGE',
    desc: 'Dash illimité sans aucun temps de recharge pendant 8 secondes'
  },
  {
    id: 'nitro_v1',
    baseId: 'nitro',
    version: 1,
    name: 'NITRO JET',
    icon: 'nitro',
    threshold: 360,
    category: 'kombo',
    command: '↑ ↓ ↑ ↓ (Pompage)',
    desc: 'Vitesse turbo accrue + traînée ardente brûlant les fantômes pendant 3.2s'
  },
  {
    id: 'vortex_v1',
    baseId: 'vortex',
    version: 1,
    name: 'BLACK HOLE',
    icon: 'black_hole',
    threshold: 500,
    category: 'item',
    command: 'AUTOMATIQUE AU RAMASSAGE',
    desc: 'Vortex gravitationnel qui attire et désintègre tous les spectres'
  },
  {
    id: 'laser_v1',
    baseId: 'laser',
    version: 1,
    name: 'HYPER BEAMS',
    icon: 'laser',
    threshold: 700,
    category: 'item',
    command: 'AUTOMATIQUE AU RAMASSAGE',
    desc: 'Canons lasers cruciformes découpant les couloirs horizontaux et verticaux'
  },
  {
    id: 'cryo_v1',
    baseId: 'cryo',
    version: 1,
    name: 'CRYO SHATTER',
    icon: 'cryo',
    threshold: 950,
    category: 'item',
    command: 'AUTOMATIQUE AU RAMASSAGE',
    desc: 'Zéro absolu : gèle tous les spectres pour les briser au moindre contact'
  },
  {
    id: 'tsunami_v1',
    baseId: 'tsunami',
    version: 1,
    name: 'LIGHT TSUNAMI',
    icon: 'tsunami',
    threshold: 1250,
    category: 'item',
    command: 'AUTOMATIQUE AU RAMASSAGE',
    desc: 'Vague royale sacrée balayant tout le labyrinthe + bonus de temps de survie'
  },
  {
    id: 'dash_v2',
    baseId: 'dash',
    version: 2,
    name: 'CYBER DASH V2',
    icon: 'dash',
    threshold: 1600,
    category: 'movement',
    command: 'ESPACE ou BOUTON DASH',
    desc: 'Portée 4 cases, recharge -25% et déblocage de l\'Arène Widescreen 16:9 !'
  },
  {
    id: 'super_pellet_v1',
    baseId: 'super_pellet',
    version: 1,
    name: 'SUPER PASTILLE',
    icon: 'super_pellet',
    threshold: 2000,
    category: 'item',
    command: 'AUTOMATIQUE SUR SUPER PASTILLE',
    desc: 'Les renforts qui arrivent pendant la peur sont eux aussi effrayés'
  },
  {
    id: 'wiggle_v2',
    baseId: 'wiggle',
    version: 2,
    name: 'GIGA EMP V2',
    icon: 'wiggle',
    threshold: 2400,
    category: 'kombo',
    command: '← → ← → (Wiggle)',
    desc: 'Rayon doublé (160px), étourdissement 4s et rend les fantômes vulnérables/mangeables'
  },
  {
    id: 'chrono_v2',
    baseId: 'chrono',
    version: 2,
    name: 'QUANTUM DILATION V2',
    icon: 'chrono',
    threshold: 2800,
    category: 'movement',
    command: 'SHIFT ou BOUTON CHRONO',
    desc: 'Ralentissement extrême à 12%, jauge 150% et régénération passive accélérée'
  },
  {
    id: 'hd_audio',
    baseId: 'audio',
    version: 1,
    name: 'OST HD DARKSYNTH',
    icon: 'music',
    threshold: 3000,
    category: 'item',
    command: 'AUTOMATIQUE (3 000 FRAGS)',
    desc: 'Métamorphose sonore : débloque la bande-son HD Studio Dark Synthwave complète'
  },
  {
    id: 'nitro_v2',
    baseId: 'nitro',
    version: 2,
    name: 'PLASMA BURNER V2',
    icon: 'nitro',
    threshold: 3300,
    category: 'kombo',
    command: '↑ ↓ ↑ ↓ (Pompage)',
    desc: 'Vitesse turbo +20%, durée 4.5s et traînée de feu persistante au sol pendant 2.5s'
  },
  {
    id: 'nova_v2',
    baseId: 'nova',
    version: 2,
    name: 'SUPERNOVA V2',
    icon: 'nova',
    threshold: 3900,
    category: 'item',
    command: 'AUTOMATIQUE AU RAMASSAGE',
    desc: 'Purge totale + pluie d\'orbes dorées bonus et multiplicateurs instantanés'
  },
  {
    id: 'dash_v3',
    baseId: 'dash',
    version: 3,
    name: 'HYPER DASH V3',
    icon: 'dash',
    threshold: 4500,
    category: 'movement',
    command: 'ESPACE ou BOUTON DASH',
    desc: 'Portée 5 cases : traverse les longues lignes du Swarm d\'un seul éclair'
  },
  {
    id: 'overdrive_v2',
    baseId: 'overdrive',
    version: 2,
    name: 'CHRONO OVERDRIVE V2',
    icon: 'overdrive',
    threshold: 5200,
    category: 'item',
    command: 'AUTOMATIQUE AU RAMASSAGE',
    desc: 'Dash infini + invulnérabilité totale sans surchauffe pendant toute la durée'
  },
  {
    id: 'vortex_v2',
    baseId: 'vortex',
    version: 2,
    name: 'DARK MATTER V2',
    icon: 'black_hole',
    threshold: 6000,
    category: 'item',
    command: 'AUTOMATIQUE AU RAMASSAGE',
    desc: 'Le trou noir aspire également toutes les pastilles et orbes de la zone'
  },
  {
    id: 'laser_v2',
    baseId: 'laser',
    version: 2,
    name: 'OCTO BEAMS V2',
    icon: 'laser',
    threshold: 7000,
    category: 'item',
    command: 'AUTOMATIQUE AU RAMASSAGE',
    desc: 'Lasers à 8 directions (cruciformes + 4 diagonales) rasant intégralement la carte'
  },
  {
    id: 'dash_v4',
    baseId: 'dash',
    version: 4,
    name: 'QUANTUM DASH V4',
    icon: 'dash',
    threshold: 8000,
    category: 'movement',
    command: 'ESPACE ou BOUTON DASH',
    desc: 'Portée 6 cases : percée maximale à travers les essaims les plus denses'
  },
  {
    id: 'cryo_v2',
    baseId: 'cryo',
    version: 2,
    name: 'ABSOLUTE ZERO V2',
    icon: 'cryo',
    threshold: 9000,
    category: 'item',
    command: 'AUTOMATIQUE AU RAMASSAGE',
    desc: 'Gèle tous les fantômes et les fait exploser en chaîne au bout de 3 secondes'
  },
  {
    id: 'tsunami_v2',
    baseId: 'tsunami',
    version: 2,
    name: 'SOLAR ECLIPSE V2',
    icon: 'tsunami',
    threshold: 10000,
    category: 'item',
    command: 'AUTOMATIQUE AU RAMASSAGE',
    desc: 'Double vague royale aller-retour + recharge instantanée de l\'arsenal (100% Maîtrisé)'
  }
];

class ProgressionManager {
  public readonly SKILL_TREE = SKILL_TREE;

  public get totalGhosts(): number {
    return profileManager.profile.careerGhosts;
  }

  public set totalGhosts(val: number) {
    profileManager.profile.careerGhosts = val;
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
        wobbleBanner.show('★ NOUVEAU POUVOIR DÉBLOQUÉ ★', s.name, s.command, s.icon, '#00f0ff', 2.4);
        particles.flash('#00f0ff', 0.35);
        particles.shake(6, 0.2);
      }
    }
    return newlyUnlocked;
  }

  public getSkillLevel(baseId: string): 0 | 1 | 2 | 3 | 4 {
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    for (const skill of SKILL_TREE) {
      if (skill.baseId === baseId && this.totalGhosts >= skill.threshold && skill.version > level) {
        level = skill.version;
      }
    }
    return level;
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

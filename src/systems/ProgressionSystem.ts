// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — PROGRESSION SYSTEM & EXPONENTIAL SKILLS (V1 TO V4)
// ═══════════════════════════════════════════════════════════════

import { profileManager } from './ProfileManager';
import { sounds } from '../audio/SoundManager';
import { particles } from './ParticleSystem';
import { CW, ROWS, T, getChromaTier, CHROMA_FLASH } from '../config/constants';
import { badges } from './BadgeSystem';
import { wobbleBanner } from '../graphics/WobbleBanner';

export interface SkillDef {
  id: string;             // e.g. 'dash_v1' to 'dash_v4'
  baseId: string;         // e.g. 'dash'
  version: 1 | 2 | 3 | 4 | 5;
  name: string;
  icon: string;
  threshold: number;      // ghosts required
  category: 'movement' | 'kombo' | 'item';
  command: string;        // e.g. 'Espace ou Double-Tap'
  desc: string;
  dashCharges?: number;   // Available dash units granted at this tier
}

export const SKILL_TREE: SkillDef[] = [
  {
    id: 'dash_v1',
    baseId: 'dash',
    version: 1,
    name: 'OFFENSIVE DASH',
    icon: 'dash',
    threshold: 10,
    category: 'movement',
    command: 'SPACE or DASH BUTTON',
    desc: '1 Dash unit • 3-tile offensive warp slashing through ghosts',
    dashCharges: 1
  },
  {
    id: 'nova_v1',
    baseId: 'nova',
    version: 1,
    name: 'MEGA NOVA',
    icon: 'nova',
    threshold: 75,
    category: 'item',
    command: 'AUTO ON PICKUP',
    desc: 'Thermo-nuclear burst instantly vaporizing all ghosts on screen'
  },
  {
    id: 'wiggle_v1',
    baseId: 'wiggle',
    version: 1,
    name: 'WIGGLE EMP',
    icon: 'wiggle',
    threshold: 120,
    category: 'kombo',
    command: '← → ← → quickly',
    desc: 'EMP wave eliminates nearby ghosts and collects nearby dots'
  },
  {
    id: 'chrono_v1',
    baseId: 'chrono',
    version: 1,
    name: 'CHRONO SHIFT',
    icon: 'chrono',
    threshold: 180,
    category: 'movement',
    command: 'SHIFT or CHRONO BTN',
    desc: 'Time dilation: slows the world to 18% to slip through dense swarms'
  },
  {
    id: 'overdrive_v1',
    baseId: 'overdrive',
    version: 1,
    name: 'INFINITE DASH',
    icon: 'overdrive',
    threshold: 260,
    category: 'item',
    command: 'AUTO ON PICKUP',
    desc: 'Zero-cooldown infinite dash for 8 adrenaline-filled seconds'
  },
  {
    id: 'nitro_v1',
    baseId: 'nitro',
    version: 1,
    name: 'NITRO JET',
    icon: 'nitro',
    threshold: 360,
    category: 'kombo',
    command: '↑ ↓ ↑ ↓ quickly',
    desc: 'Burns ghosts along a 3.2s trail; also boosts speed in the widescreen arena'
  },
  {
    id: 'vortex_v1',
    baseId: 'vortex',
    version: 1,
    name: 'BLACK HOLE',
    icon: 'black_hole',
    threshold: 500,
    category: 'item',
    command: 'AUTO ON PICKUP',
    desc: 'Gravitational singularity pulling and crushing all spectres in range'
  },
  {
    id: 'super_pellet_v1',
    baseId: 'super_pellet',
    version: 1,
    name: 'SUPER PELLET',
    icon: 'super_pellet',
    threshold: 550,
    category: 'item',
    command: 'EAT POWER PELLET',
    desc: 'Reinforcement ghosts entering the maze are also frightened'
  },
  {
    id: 'laser_v1',
    baseId: 'laser',
    version: 1,
    name: 'HYPER BEAMS',
    icon: 'laser',
    threshold: 700,
    category: 'item',
    command: 'AUTO ON PICKUP',
    desc: 'Cross-axial laser cannons cutting through horizontal and vertical corridors'
  },
  {
    id: 'cryo_v1',
    baseId: 'cryo',
    version: 1,
    name: 'CRYO SHATTER',
    icon: 'cryo',
    threshold: 950,
    category: 'item',
    command: 'AUTO ON PICKUP',
    desc: 'Freezes ghosts for 4s; touch frozen normal ghosts to shatter them'
  },
  {
    id: 'tsunami_v1',
    baseId: 'tsunami',
    version: 1,
    name: 'LIGHT TSUNAMI',
    icon: 'tsunami',
    threshold: 1250,
    category: 'item',
    command: 'AUTO ON PICKUP',
    desc: 'A wave sweeps across the arena and eliminates ghosts in its path'
  },
  {
    id: 'dash_v2',
    baseId: 'dash',
    version: 2,
    name: 'CYBER DASH V2',
    icon: 'dash',
    threshold: 1600,
    category: 'movement',
    command: 'SPACE or DASH BUTTON',
    desc: '2 Dash units • 4-tile reach, -25% cooldown, and unlocks the 16:9 Widescreen Arena!',
    dashCharges: 2
  },
  {
    id: 'wiggle_v2',
    baseId: 'wiggle',
    version: 2,
    name: 'GIGA EMP V2',
    icon: 'wiggle',
    threshold: 2400,
    category: 'kombo',
    command: '← → ← → quickly',
    desc: 'EMP reaches 8.5 tiles instead of 4.8, with a 25% shorter cooldown'
  },
  {
    id: 'chrono_v2',
    baseId: 'chrono',
    version: 2,
    name: 'QUANTUM DILATION V2',
    icon: 'chrono',
    threshold: 2800,
    category: 'movement',
    command: 'SHIFT or CHRONO BTN',
    desc: 'Extreme slow-motion at 12%, 150% energy tank, and accelerated recharge'
  },
  {
    id: 'hd_audio',
    baseId: 'audio',
    version: 1,
    name: 'HD DARKSYNTH OST',
    icon: 'music',
    threshold: 3000,
    category: 'item',
    command: 'OPTIONS MENU [O]',
    desc: 'Audio transformation: unlocks the complete Studio HD Dark Synthwave soundtrack'
  },
  {
    id: 'nitro_v2',
    baseId: 'nitro',
    version: 2,
    name: 'PLASMA BURNER V2',
    icon: 'nitro',
    threshold: 3300,
    category: 'kombo',
    command: '↑ ↓ ↑ ↓ quickly',
    desc: 'Extends Nitro to 4.5s and its trail to 2.5s, with a 25% shorter cooldown'
  },
  {
    id: 'nova_v2',
    baseId: 'nova',
    version: 2,
    name: 'SUPERNOVA V2',
    icon: 'nova',
    threshold: 3900,
    category: 'item',
    command: 'AUTO ON PICKUP',
    desc: 'The same arena-wide purge, with a larger golden blast'
  },
  {
    id: 'dash_v3',
    baseId: 'dash',
    version: 3,
    name: 'HYPER DASH V3',
    icon: 'dash',
    threshold: 4500,
    category: 'movement',
    command: 'SPACE or DASH BUTTON',
    desc: '3 Dash units • 5-tile reach: pierce through deep swarm lines in a single flash',
    dashCharges: 3
  },
  {
    id: 'overdrive_v2',
    baseId: 'overdrive',
    version: 2,
    name: 'CHRONO DRIVE V2',
    icon: 'overdrive',
    threshold: 5200,
    category: 'item',
    command: 'AUTO ON PICKUP',
    desc: 'Extends zero-cooldown Dash from 8s to 10s; use SPACE repeatedly'
  },
  {
    id: 'vortex_v2',
    baseId: 'vortex',
    version: 2,
    name: 'DARK MATTER V2',
    icon: 'black_hole',
    threshold: 6000,
    category: 'item',
    command: 'AUTO ON PICKUP',
    desc: 'Black hole also vacuums and collects all dots and pellets in the area'
  },
  {
    id: 'laser_v2',
    baseId: 'laser',
    version: 2,
    name: 'OCTO BEAMS V2',
    icon: 'laser',
    threshold: 7000,
    category: 'item',
    command: 'AUTO ON PICKUP',
    desc: '8-directional laser star (cross + diagonals) slicing the entire arena'
  },
  {
    id: 'dash_v4',
    baseId: 'dash',
    version: 4,
    name: 'QUANTUM DASH V4',
    icon: 'dash',
    threshold: 8000,
    category: 'movement',
    command: 'SPACE or DASH BUTTON',
    desc: '4 Dash units • 6-tile reach: maximum breakthrough through the heaviest hordes',
    dashCharges: 4
  },
  {
    id: 'cryo_v2',
    baseId: 'cryo',
    version: 2,
    name: 'ABSOLUTE ZERO V2',
    icon: 'cryo',
    threshold: 9000,
    category: 'item',
    command: 'AUTO ON PICKUP',
    desc: 'Extends Cryo from 4s to 5.5s; touch frozen normal ghosts to shatter them'
  },
  {
    id: 'tsunami_v2',
    baseId: 'tsunami',
    version: 2,
    name: 'SOLAR ECLIPSE V2',
    icon: 'tsunami',
    threshold: 10000,
    category: 'item',
    command: 'AUTO ON PICKUP',
    desc: 'Solar Eclipse variant keeps the same single sweeping wave'
  },
  {
    id: 'dash_v5',
    baseId: 'dash',
    version: 5,
    name: 'QUANTUM BURST V5',
    icon: 'dash',
    threshold: 12000,
    category: 'movement',
    command: 'SPACE or DASH BUTTON',
    desc: '4 Dash units • Quantum Wall-Breaker: smashes and phases through up to 3 walls with shockwave & freeze-frame',
    dashCharges: 4
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
      }
    }

    if (newlyUnlocked.length > 0) {
      sounds.play('badge');
      particles.flash('#00f0ff', 0.35);
      particles.shake(6, 0.2);
      for (const s of newlyUnlocked) {
        wobbleBanner.show('★ NEW SKILL UNLOCKED ★', s.name, s.command, s.icon, '#00f0ff', 2.5);
      }
    }
    // Chroma Awakening — détection de franchissement de tier visuel
    const prevTier = getChromaTier(prev);
    const nextTier = getChromaTier(next);
    if (nextTier > prevTier) {
      // Flash chromatique distinct (couleur du nouveau tier) en plus du flash skills
      const flashColor = CHROMA_FLASH[nextTier] || '#00f0ff';
      particles.flash(flashColor, 0.6);
      particles.shake(12, 0.5);
      // Les badges chroma_* sont déclenchés automatiquement par checkKillBadges()
    }

    return newlyUnlocked;
  }

  public getChromaTierForKills(kills: number) {
    return getChromaTier(kills);
  }

  public getSkillLevel(baseId: string): 0 | 1 | 2 | 3 | 4 | 5 {
    let level: 0 | 1 | 2 | 3 | 4 | 5 = 0;
    for (const skill of SKILL_TREE) {
      if (skill.baseId === baseId && this.totalGhosts >= skill.threshold && skill.version > level) {
        level = skill.version;
      }
    }
    return level;
  }

  /**
   * Returns the number of dash units (charges) unlocked by career progression in Arcade mode.
   * - Level 0: 0 charges (locked until 10 kills)
   * - Level 1: 1 charge (Offensive Dash, 10 kills)
   * - Level 2: 2 charges (Cyber Dash V2, 1600 kills)
   * - Level 3: 3 charges (Hyper Dash V3, 4500 kills)
   * - Level 4+: 4 charges (Quantum Dash V4 / V5, 8000+ kills)
   */
  public getDashCharges(): number {
    const lvl = this.getSkillLevel('dash');
    if (lvl === 0) return 0;
    return Math.min(4, Math.max(1, lvl));
  }

  /** Alias to inspect available dash units in ProgressionSystem */
  public getAvailableDashCharges(): number {
    return this.getDashCharges();
  }

  /** Returns available dash units in ProgressionSystem */
  public getDashUnits(): number {
    return this.getDashCharges();
  }

  /**
   * Returns detailed metadata on available dash units, max capacity,
   * current active dash skill and next upgrade requirement.
   */
  public getDashUnitsInfo(): {
    available: number;
    max: number;
    level: number;
    currentSkill: SkillDef | null;
    nextSkill: SkillDef | null;
  } {
    const level = this.getSkillLevel('dash');
    const available = this.getDashCharges();
    const currentSkill = SKILL_TREE.find(s => s.baseId === 'dash' && s.version === level) || null;
    const nextSkill = SKILL_TREE.find(s => s.baseId === 'dash' && s.version === level + 1) || null;
    return {
      available,
      max: 4,
      level,
      currentSkill,
      nextSkill
    };
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

  public getUpcomingUnlocks(limit: number = 2): SkillDef[] {
    const g = this.totalGhosts;
    const upcoming: SkillDef[] = [];
    let skippedFirst = false;
    for (const s of SKILL_TREE) {
      if (g < s.threshold) {
        if (!skippedFirst) {
          skippedFirst = true;
        } else {
          upcoming.push(s);
          if (upcoming.length >= limit) break;
        }
      }
    }
    return upcoming;
  }

  public getUnlockedSuperItems(): string[] {
    const items = ['nova', 'overdrive', 'vortex', 'laser', 'cryo', 'tsunami'];
    return items.filter(id => this.getSkillLevel(id) >= 1);
  }
}

export const progression = new ProgressionManager();

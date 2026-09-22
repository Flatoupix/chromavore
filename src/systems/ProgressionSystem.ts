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
    desc: '3-tile offensive warp slashing through ghosts'
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
    command: '← → ← → (Wiggle)',
    desc: 'EMP shockwave knocking back and stunning nearby ghosts for 2.5s'
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
    command: '↓ ↑ ↓ ↑ (Bao Bao)',
    desc: 'Turbo speed boost leaving a burning trail that incinerates ghosts for 3.2s'
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
    id: 'laser_v1',
    baseId: 'laser',
    version: 1,
    name: 'HYPER BEAMS',
    icon: 'laser',
    threshold: 700,
    category: 'item',
    command: 'AUTO-FIRES AT 16x COMBO',
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
    desc: 'Absolute zero: freezes all ghosts to shatter them on contact'
  },
  {
    id: 'tsunami_v1',
    baseId: 'tsunami',
    version: 1,
    name: 'LIGHT TSUNAMI',
    icon: 'tsunami',
    threshold: 1250,
    category: 'item',
    command: 'AUTO-FIRES AT 32x GOD MODE',
    desc: 'Sacred royal wave clearing the entire maze with extra survival time'
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
    desc: '4-tile reach, -25% cooldown, and unlocks the 16:9 Widescreen Arena!'
  },
  {
    id: 'super_pellet_v1',
    baseId: 'super_pellet',
    version: 1,
    name: 'SUPER PELLET',
    icon: 'super_pellet',
    threshold: 2000,
    category: 'item',
    command: 'EAT POWER PELLET',
    desc: 'Reinforcement ghosts entering the maze are also frightened'
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
    desc: 'Double radius (160px), 4s stun, and turns ghosts vulnerable to consumption'
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
    command: '↓ ↑ ↓ ↑ (Bao Bao)',
    desc: '+20% turbo speed, 4.5s duration, and persistent ground plasma for 2.5s'
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
    desc: 'Full screen purge + golden bonus orb shower and instant multipliers'
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
    desc: '5-tile reach: pierce through deep swarm lines in a single flash'
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
    desc: 'Infinite dash + invulnerability with zero overheat for the entire duration'
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
    command: 'AUTO-FIRES AT 16x COMBO',
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
    desc: '6-tile reach: maximum breakthrough through the heaviest hordes'
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
    desc: 'Freezes all ghosts and triggers a chain-reaction explosion after 3s'
  },
  {
    id: 'tsunami_v2',
    baseId: 'tsunami',
    version: 2,
    name: 'SOLAR ECLIPSE V2',
    icon: 'tsunami',
    threshold: 10000,
    category: 'item',
    command: 'AUTO-FIRES AT 32x GOD MODE',
    desc: 'Dual sweeping royal wave back-and-forth + instant arsenal reload (100% Mastered)'
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
    desc: 'Quantum Wall-Breaker: smashes and phases through up to 3 walls with shockwave & freeze-frame'
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
        wobbleBanner.show('★ NEW SKILL UNLOCKED ★', s.name, s.command, s.icon, '#00f0ff', 2.4);
        particles.flash('#00f0ff', 0.35);
        particles.shake(6, 0.2);
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

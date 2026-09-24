// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE 4.0 — EXPERIENCE SYSTEM & SKILL TREE ENGINE
// ═══════════════════════════════════════════════════════════════

import { profileManager } from './ProfileManager';
import { sounds } from '../audio/SoundManager';
import { particles } from './ParticleSystem';
import { wobbleBanner } from '../graphics/WobbleBanner';

export interface LevelUpEvent {
  newLevel: number;
  skillPointsAwarded: number;
  consecutiveStreak: number;
  surgeActive: boolean;
}

export interface SkillNode {
  id: string;
  branch: 'agility' | 'control' | 'carnage';
  name: string;
  icon: string;
  maxRank: number;
  costPerRank: number;
  reqSkillId?: string;
  reqAccountLevel?: number;
  desc: string;
}

export const SKILL_TREE_BRANCHES: Record<string, { name: string; color: string; desc: string }> = {
  agility: {
    name: 'VITESSE & AGILITÉ',
    color: '#00ffff',
    desc: 'Maîtrise spatiale, cooldowns réduits, intangibilité et dashs multiples'
  },
  control: {
    name: 'CONTRÔLE & TEMPO',
    color: '#d946ef',
    desc: 'Domination temporelle, impulsions EMP, freeze prolongé et aspiration magnétique'
  },
  carnage: {
    name: 'PUISSANCE & CARNAGE',
    color: '#ff0055',
    desc: 'Durée et résonance des pastilles, brise-Titans et fenêtres de multiplicateurs'
  }
};

export const SKILL_NODES: SkillNode[] = [
  // ─── BRANCHE AGILITÉ ───
  {
    id: 'dash_reflex',
    branch: 'agility',
    name: 'REFLEX SURGE',
    icon: 'dash',
    maxRank: 5,
    costPerRank: 1,
    desc: 'Réduit le cooldown du Dash de 12% par rang (jusqu\'à -60%).'
  },
  {
    id: 'multi_dash',
    branch: 'agility',
    name: 'MULTI-DASH CHARGES',
    icon: 'overdrive',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'dash_reflex',
    desc: 'Confère +1 charge de Dash consécutive par rang.'
  },
  {
    id: 'hyper_nitro',
    branch: 'agility',
    name: 'HYPER NITRO',
    icon: 'nitro',
    maxRank: 4,
    costPerRank: 1,
    desc: 'Accroît la vitesse de pointe du Nitro (+8%/rang) et réduit son cooldown.'
  },
  {
    id: 'phase_shift',
    branch: 'agility',
    name: 'PHASE TRANSCENDENCE',
    icon: 'phase',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'multi_dash',
    desc: 'Intangibilité de 0.3s (+0.15s/rang) après chaque Dash permettant d\'esquiver les spectres.'
  },

  // ─── BRANCHE CONTRÔLE ───
  {
    id: 'chrono_tank',
    branch: 'control',
    name: 'CHRONO TANK',
    icon: 'chrono',
    maxRank: 5,
    costPerRank: 1,
    desc: 'Augmente le réservoir de Bullet-Time de +20% et accélère sa régénération.'
  },
  {
    id: 'emp_overcharge',
    branch: 'control',
    name: 'EMP OVERCHARGE',
    icon: 'wiggle',
    maxRank: 4,
    costPerRank: 1,
    desc: 'Étend le rayon de l\'onde de choc Wiggle EMP (+25%/rang) et réduit son délai de recharge.'
  },
  {
    id: 'deep_freeze',
    branch: 'control',
    name: 'DEEP FROST STUN',
    icon: 'freeze',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'emp_overcharge',
    desc: 'Prolonge la durée d\'étourdissement des fantômes affectés par l\'EMP (+1.0s/rang).'
  },
  {
    id: 'magnetic_core',
    branch: 'control',
    name: 'MAGNETIC SINGULARITY',
    icon: 'magnet',
    maxRank: 3,
    costPerRank: 2,
    desc: 'Aspire passivement les pastilles proches dans un rayon de 1 à 3 cases.'
  },

  // ─── BRANCHE CARNAGE ───
  {
    id: 'pellet_resonance',
    branch: 'carnage',
    name: 'PELLET RESONANCE',
    icon: 'super_pellet',
    maxRank: 5,
    costPerRank: 1,
    desc: 'Allonge la durée de vulnérabilité des spectres (+1.2s par rang).'
  },
  {
    id: 'titan_breaker',
    branch: 'carnage',
    name: 'TITAN BREAKER',
    icon: 'titan',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'pellet_resonance',
    desc: 'Ralentit les Titans de 15%/rang et permet de les percuter avec le Dash en leur infligeant des dégâts massifs.'
  },
  {
    id: 'super_frequency',
    branch: 'carnage',
    name: 'COSMIC DROPS',
    icon: 'nova',
    maxRank: 4,
    costPerRank: 1,
    desc: 'Augmente la fréquence d\'apparition des capsules Super-Items de +25%/rang.'
  },
  {
    id: 'singularity_mastery',
    branch: 'carnage',
    name: 'VOID TRANSCENDENCE',
    icon: 'black_hole',
    maxRank: 3,
    costPerRank: 3,
    reqSkillId: 'titan_breaker',
    desc: 'Élargit la fenêtre de maintien du multiplicateur de Combo (+0.3s/rang) et active l\'aura cosmique au niveau 100.'
  }
];

class ExperienceSystem {
  public consecutiveLevelUpsInLife: number = 0;
  public recentLevelUpBannerTimer: number = 0;
  public lastLevelUpInfo: LevelUpEvent | null = null;

  /**
   * Exponential Account Level Curve:
   * Level N requires floor(850 * N^1.38) XP
   */
  public getXpRequiredForLevel(level: number): number {
    if (level < 1) return 850;
    if (level >= 100) return Infinity; // Max level reached!
    return Math.floor(850 * Math.pow(level, 1.38));
  }

  public get accountLevel(): number {
    return profileManager.profile.accountLevel || 1;
  }

  public get accountXp(): number {
    return profileManager.profile.accountXp || 0;
  }

  public get skillPoints(): number {
    return profileManager.profile.skillPoints || 0;
  }

  public onPlayerDeath() {
    this.consecutiveLevelUpsInLife = 0;
  }

  public update(dt: number) {
    if (this.recentLevelUpBannerTimer > 0) {
      this.recentLevelUpBannerTimer -= dt;
    }
  }

  public addXp(baseAmount: number, reason: string = ''): LevelUpEvent | null {
    if (this.accountLevel >= 100) return null;

    // Apply 2x surge multiplier if leveled up consecutively in current life
    const surgeMultiplier = this.consecutiveLevelUpsInLife > 0 ? 2 : 1;
    const finalAmount = Math.round(baseAmount * surgeMultiplier);

    profileManager.profile.accountXp = (profileManager.profile.accountXp || 0) + finalAmount;

    let leveledUp = false;
    let newLevel = this.accountLevel;
    let pointsAwarded = 0;

    let req = this.getXpRequiredForLevel(newLevel);
    while (profileManager.profile.accountXp >= req && newLevel < 100) {
      profileManager.profile.accountXp -= req;
      newLevel++;
      profileManager.profile.accountLevel = newLevel;
      profileManager.profile.skillPoints = (profileManager.profile.skillPoints || 0) + 1;
      pointsAwarded++;
      leveledUp = true;
      req = this.getXpRequiredForLevel(newLevel);
    }

    profileManager.saveProfile();

    if (leveledUp) {
      this.consecutiveLevelUpsInLife++;
      const isSurge = this.consecutiveLevelUpsInLife > 1;

      this.lastLevelUpInfo = {
        newLevel,
        skillPointsAwarded: pointsAwarded,
        consecutiveStreak: this.consecutiveLevelUpsInLife,
        surgeActive: isSurge
      };
      this.recentLevelUpBannerTimer = 3.6;

      // Audiovisual spectacle
      sounds.play('powerup');
      sounds.play('nova');
      particles.flash(isSurge ? '#ffd700' : '#00ffff', 0.65);
      particles.shake(14, 0.45);

      const surgeLabel = isSurge ? ` (★ 2x XP SURGE STREAK x${this.consecutiveLevelUpsInLife}!)` : '';
      wobbleBanner.show(
        '▲ LEVEL UP ! ▲',
        `ACCOUNT LEVEL ${newLevel}${surgeLabel}`,
        `+${pointsAwarded} SKILL POINT(S) & +1 LIFE RECOVERED !`,
        'powerup',
        isSurge ? '#ffd700' : '#00f0ff',
        3.5
      );

      return this.lastLevelUpInfo;
    }

    return null;
  }

  public getSkillRank(skillId: string): number {
    return profileManager.profile.skillUpgrades?.[skillId] || 0;
  }

  public canUpgradeSkill(skillId: string): { can: boolean; reason?: string } {
    const node = SKILL_NODES.find(n => n.id === skillId);
    if (!node) return { can: false, reason: 'Compétence inconnue' };

    const currentRank = this.getSkillRank(skillId);
    if (currentRank >= node.maxRank) return { can: false, reason: 'Rang maximal atteint' };

    if (this.skillPoints < node.costPerRank) {
      return { can: false, reason: `Requis: ${node.costPerRank} Point(s)` };
    }

    if (node.reqSkillId) {
      const parentRank = this.getSkillRank(node.reqSkillId);
      if (parentRank === 0) {
        const parentNode = SKILL_NODES.find(n => n.id === node.reqSkillId);
        return { can: false, reason: `Requis: ${parentNode?.name || node.reqSkillId}` };
      }
    }

    if (node.reqAccountLevel && this.accountLevel < node.reqAccountLevel) {
      return { can: false, reason: `Niveau de compte ${node.reqAccountLevel} requis` };
    }

    return { can: true };
  }

  public upgradeSkill(skillId: string): boolean {
    const check = this.canUpgradeSkill(skillId);
    if (!check.can) return false;

    const node = SKILL_NODES.find(n => n.id === skillId)!;
    profileManager.profile.skillPoints -= node.costPerRank;
    if (!profileManager.profile.skillUpgrades) {
      profileManager.profile.skillUpgrades = {};
    }
    profileManager.profile.skillUpgrades[skillId] = (profileManager.profile.skillUpgrades[skillId] || 0) + 1;
    profileManager.saveProfile();
    sounds.play('badge');
    return true;
  }

  public respecSkills() {
    let refund = 0;
    const upgrades = profileManager.profile.skillUpgrades || {};
    for (const [id, rank] of Object.entries(upgrades)) {
      const node = SKILL_NODES.find(n => n.id === id);
      if (node) {
        refund += (rank as number) * node.costPerRank;
      }
    }
    profileManager.profile.skillPoints += refund;
    profileManager.profile.skillUpgrades = {};
    profileManager.saveProfile();
    sounds.play('powerup');
  }

  // Multiplier helper getters
  public getDashCdReduction(): number {
    return this.getSkillRank('dash_reflex') * 0.12; // up to -60%
  }

  public getDashCharges(): number {
    return 1 + this.getSkillRank('multi_dash'); // 1 to 4 charges
  }

  public getNitroSpeedBonus(): number {
    return this.getSkillRank('hyper_nitro') * 0.08; // up to +32% speed
  }

  public getPhaseIntangibilityDuration(): number {
    const rank = this.getSkillRank('phase_shift');
    return rank > 0 ? 0.3 + (rank - 1) * 0.15 : 0;
  }

  public getChronoTankMultiplier(): number {
    return 1 + this.getSkillRank('chrono_tank') * 0.20; // up to +100% capacity
  }

  public getEmpRadiusMultiplier(): number {
    return 1 + this.getSkillRank('emp_overcharge') * 0.25; // up to +100% radius
  }

  public getFreezeDurationBonus(): number {
    return this.getSkillRank('deep_freeze') * 1.0; // up to +3.0s stun
  }

  public getMagneticRadius(): number {
    return this.getSkillRank('magnetic_core'); // 0 to 3 tiles
  }

  public getPelletDurationBonus(): number {
    return this.getSkillRank('pellet_resonance') * 1.2; // up to +6.0s
  }

  public getTitanBreakerRank(): number {
    return this.getSkillRank('titan_breaker');
  }

  public getSuperItemFrequencyBonus(): number {
    return this.getSkillRank('super_frequency') * 0.25; // up to +100% spawn rate
  }

  public getComboGraceBonus(): number {
    return this.getSkillRank('singularity_mastery') * 0.3; // up to +0.9s combo hold
  }
}

export const experienceSystem = new ExperienceSystem();

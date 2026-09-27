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

export type { SkillNode } from '../config/skillTree';
export { SKILL_TREE_BRANCHES, SKILL_NODES } from '../config/skillTree';
import { SKILL_NODES } from '../config/skillTree';

class ExperienceSystem {
  public consecutiveLevelUpsInLife: number = 0;
  public recentLevelUpBannerTimer: number = 0;
  public lastLevelUpInfo: LevelUpEvent | null = null;

  /**
   * Balanced Account Level Curve (v4.0.1):
   * Early levels are fast to unlock skill points, higher levels require solid mastery.
   * Level N requires floor(420 * N^1.48) XP
   */
  public getXpRequiredForLevel(level: number): number {
    if (level < 1) return 420;
    if (level >= 100) return Infinity; // Max level reached!
    return Math.floor(420 * Math.pow(level, 1.48));
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

  public getSkillRank(skillId: string): number {
    return profileManager.profile.skillUpgrades?.[skillId] || 0;
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
    // Mode Arcade: No XP progression, purely score and intra-game kills!
    if (profileManager.gameMode !== 'custom') return null;
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
        `LEVEL ${newLevel}${surgeLabel}`,
        `+${pointsAwarded} SKILL POINT(S) & +1 LIFE RECOVERED !`,
        'powerup',
        isSurge ? '#ffd700' : '#00f0ff',
        3.5
      );

      return this.lastLevelUpInfo;
    }

    return null;
  }

  public isUltimateRevealed(skillId: string): boolean {
    const node = SKILL_NODES.find(n => n.id === skillId);
    if (!node || !node.isUltimate) return true;
    const coreNodes = SKILL_NODES.filter(n => !n.isUltimate);
    return coreNodes.every(coreNode => this.getSkillRank(coreNode.id) >= coreNode.maxRank);
  }

  public canUpgradeSkill(skillId: string): { can: boolean; reason?: string } {
    const node = SKILL_NODES.find(n => n.id === skillId);
    if (!node) return { can: false, reason: 'Compétence inconnue' };

    if (node.isUltimate && !this.isUltimateRevealed(skillId)) {
      return { can: false, reason: 'Ultime secret : complétez toutes les compétences de l’arbre' };
    }

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
      return { can: false, reason: `Niveau ${node.reqAccountLevel} requis` };
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
    return this.getSkillRank('hyper_nitro') * 0.10; // up to +40% speed
  }

  public getNitroTrailBonus(): number {
    return this.getSkillRank('hyper_nitro') * 0.5; // up to +2.0s trail life
  }

  public getPhaseIntangibilityDuration(): number {
    const rank = this.getSkillRank('phase_shift');
    return rank > 0 ? 0.35 + (rank - 1) * 0.18 : 0;
  }

  public getQuantumLaserRank(): number {
    return this.getSkillRank('quantum_laser');
  }

  public getChronoTankMultiplier(): number {
    return 1 + this.getSkillRank('chrono_tank') * 0.20; // up to +100% capacity
  }

  public getChronoDilationBonus(): number {
    const rank = this.getSkillRank('chrono_tank');
    return rank >= 4 ? 0.05 : 0; // extra slowdown for master ranks
  }

  public getEmpRadiusMultiplier(): number {
    return 1 + this.getSkillRank('emp_overcharge') * 0.25; // up to +100% radius
  }

  public getFreezeDurationBonus(): number {
    return this.getSkillRank('deep_freeze') * 1.2; // up to +3.6s stun
  }

  public getVectorSurgeMaxCran(): number {
    return this.getSkillRank('vector_surge'); // 0 to 4 crans
  }

  public getMagneticRadius(): number {
    const rank = this.getSkillRank('magnetic_core');
    if (rank === 0) return 0;
    return 1.8 + (rank - 1) * 1.2; // 1.8, 3.0, 4.2 tiles
  }

  public getAegisShieldsCount(): number {
    return this.getSkillRank('aegis_shield'); // 0 to 3 shields
  }

  public getKineticBastionRank(): number {
    return this.getSkillRank('kinetic_bastion');
  }

  public getPelletDurationBonus(): number {
    return this.getSkillRank('pellet_resonance') * 1.4; // up to +7.0s
  }

  public getGhostKillScoreMultiplier(): number {
    const rank = this.getSkillRank('pellet_resonance');
    return rank >= 4 ? 1.0 + (rank - 3) * 0.25 : 1.0;
  }

  public getTitanBreakerRank(): number {
    return this.getSkillRank('titan_breaker');
  }

  public getSuperItemFrequencyBonus(): number {
    return this.getSkillRank('super_frequency') * 0.25; // up to +100% spawn rate
  }

  public getComboGraceBonus(): number {
    return this.getSkillRank('singularity_mastery') * 0.4; // up to +1.2s combo hold
  }

  public getSingularityKillReduction(): number {
    return this.getSkillRank('singularity_mastery') * 12; // up to -36 kills (threshold 164)
  }

  public getSingularityNovaRank(): number {
    return this.getSkillRank('singularity_nova');
  }
}

export const experienceSystem = new ExperienceSystem();

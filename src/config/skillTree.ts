// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE 4.1 — SKILL TREE DEFINITIONS & NODE DATA
// ═══════════════════════════════════════════════════════════════

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
  tradeoffDesc?: string;
  isUltimate?: boolean;
  comboSequence?: string[];
  comboHint?: string;
}

export const SKILL_TREE_BRANCHES: Record<string, { name: string; color: string; desc: string }> = {
  agility: {
    name: 'SPEED & AGILITY',
    color: '#00ffff',
    desc: 'Movement, cooldowns, phase shifting, multi-dashes, and the Quantum Laser.'
  },
  control: {
    name: 'CONTROL & TEMPO',
    color: '#d946ef',
    desc: 'Chrono control, EMP pulses, longer freezes, magnetic pull, and Kinetic Bastion.'
  },
  carnage: {
    name: 'POWER & CARNAGE',
    color: '#ff0055',
    desc: 'Power Pellet duration, Titan breaking, Super-Item drops, and Singularity effects.'
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
    desc: 'Reduces Dash cooldown by 12% per rank (up to 60%).',
    tradeoffDesc: 'Ranks 4–5: +20% burst speed, but demand precise turns near walls.'
  },
  {
    id: 'multi_dash',
    branch: 'agility',
    name: 'MULTI-DASH CHARGES',
    icon: 'overdrive',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'dash_reflex',
    desc: 'Grants +1 consecutive Dash charge per rank (up to 4 charges).',
    tradeoffDesc: 'Dashes chained within 1.2s deal +25% shockwave damage, but cost 8% Chrono energy.'
  },
  {
    id: 'vector_surge',
    branch: 'agility',
    name: 'VECTOR SURGE',
    icon: 'dash',
    maxRank: 4,
    costPerRank: 2,
    reqSkillId: 'dash_reflex',
    desc: 'Double-tap current direction for a responsive speed surge (+5% per rank, up to +20%).',
    tradeoffDesc: 'Surge lasts 2.5s with a 3.5s cooldown. High velocity requires clean cornering.'
  },
  {
    id: 'hyper_nitro',
    branch: 'agility',
    name: 'HYPER NITRO',
    icon: 'nitro',
    maxRank: 4,
    costPerRank: 1,
    desc: 'Increases Nitro speed by 10% and extends its plasma trail by 0.5s per rank.',
    tradeoffDesc: 'Shift combo: [↑ ↓ ↑ ↓]. Higher speed slightly reduces control in tight turns.'
  },
  {
    id: 'phase_shift',
    branch: 'agility',
    name: 'PHASE TRANSCENDENCE',
    icon: 'phase',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'multi_dash',
    desc: 'Become intangible for 0.35s (+0.18s per rank) after each Dash.',
    tradeoffDesc: 'Rank 3 lets you phase through ghosts and briefly break interior walls.'
  },
  {
    id: 'quantum_laser',
    branch: 'agility',
    name: 'QUANTUM LASER MATRIX',
    icon: 'nova',
    maxRank: 2,
    costPerRank: 4,
    reqSkillId: 'phase_shift',
    isUltimate: true,
    comboSequence: ['right', 'down', 'right', 'down'],
    comboHint: '[DOUBLE-SHIFT] + [→ ↓ → ↓]',
    desc: 'AGILITY ULTIMATE: Fires four cardinal lasers that annihilate ghosts along their paths.',
    tradeoffDesc: '24s cooldown (18s at rank 2). Pierces portals and triples combo score.'
  },

  // ─── BRANCHE CONTRÔLE ───
  {
    id: 'chrono_tank',
    branch: 'control',
    name: 'CHRONO TANK',
    icon: 'chrono',
    maxRank: 5,
    costPerRank: 1,
    desc: 'Increases the Chrono energy pool by 20% per rank (up to 100%).',
    tradeoffDesc: 'Ranks 4–5 slow time to 12% instead of 18%, but reduce passive recharge without collecting.'
  },
  {
    id: 'emp_overcharge',
    branch: 'control',
    name: 'EMP OVERCHARGE',
    icon: 'wiggle',
    maxRank: 4,
    costPerRank: 1,
    desc: 'Increases the Wiggle EMP shockwave radius by 25% per rank and stuns ghosts.',
    tradeoffDesc: 'Shift combo: [← → ← →]. Rank 3+ turns ghost debris into magnetic orbs.'
  },
  {
    id: 'deep_freeze',
    branch: 'control',
    name: 'DEEP FROST STUN',
    icon: 'freeze',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'emp_overcharge',
    desc: 'Extends the EMP stun duration by 1.2s per rank.',
    tradeoffDesc: 'Devouring a frozen ghost releases ice shards that freeze nearby specters.'
  },
  {
    id: 'magnetic_core',
    branch: 'control',
    name: 'MAGNETIC SINGULARITY',
    icon: 'magnet',
    maxRank: 3,
    costPerRank: 2,
    desc: 'Passively attracts nearby pellets within a radius of 1.8–4.2 tiles.',
    tradeoffDesc: 'Also pulls vulnerable ghosts toward Chromavore 15% faster.'
  },
  {
    id: 'aegis_shield',
    branch: 'control',
    name: 'AEGIS ORBITAL BARRIER',
    icon: 'shield',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'deep_freeze',
    desc: 'Emergency barrier. Absorbs a fatal hit, triggers a protective shockwave, and grants 1.4s invulnerability.',
    tradeoffDesc: 'Max 1 active barrier. Recharges after collecting pellets (Rank 1: 100, Rank 2: 80, Rank 3: 60).'
  },
  {
    id: 'kinetic_bastion',
    branch: 'control',
    name: 'KINETIC BASTION SHIELD',
    icon: 'shield',
    maxRank: 2,
    costPerRank: 4,
    reqSkillId: 'aegis_shield',
    isUltimate: true,
    comboSequence: ['down', 'down', 'up', 'up'],
    comboHint: '[DOUBLE-SHIFT] + [↓ ↓ ↑ ↑]',
    desc: 'CONTROL ULTIMATE: A 6s kinetic dome. Absorbs hits with Chrono energy and triggers a counterwave.',
    tradeoffDesc: '26s cooldown. Rank 2 lasts 8s and expands the counterwave from 3.5 to 5.0 tiles.'
  },

  // ─── BRANCHE CARNAGE ───
  {
    id: 'pellet_resonance',
    branch: 'carnage',
    name: 'PELLET RESONANCE',
    icon: 'super_pellet',
    maxRank: 5,
    costPerRank: 1,
    desc: 'Extends ghost vulnerability by 1.4s per rank (up to 7s).',
    tradeoffDesc: 'Ranks 4–5: devouring vulnerable ghosts grants 25% bonus score and XP.'
  },
  {
    id: 'titan_breaker',
    branch: 'carnage',
    name: 'TITAN BREAKER',
    icon: 'titan',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'pellet_resonance',
    desc: 'Breaks Titan armor. Rank 1 stuns on Dash impact. Rank 2 slows all Titans by 35%. Rank 3 executes (+2,500 pts).',
    tradeoffDesc: 'Direct collision without Dash or Singularity remains lethal.'
  },
  {
    id: 'super_frequency',
    branch: 'carnage',
    name: 'AETHER HARVEST',
    icon: 'nova',
    maxRank: 4,
    costPerRank: 1,
    desc: 'Increases XP and score gained from pellets and streaks by +15% per rank.',
    tradeoffDesc: 'Reduces Shift sequence spell cooldowns by 8% per rank.'
  },
  {
    id: 'singularity_mastery',
    branch: 'carnage',
    name: 'VOID TRANSCENDENCE',
    icon: 'black_hole',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'titan_breaker',
    desc: 'Extends combo decay window and streak grace by +0.4s per rank. At rank 3, extends Singularity to 35s.',
    tradeoffDesc: 'Singularity triggers at x200 ghost streak or when entering God Mode.'
  },
  {
    id: 'singularity_nova',
    branch: 'carnage',
    name: 'VOID NOVA TRANSCENDENCE',
    icon: 'black_hole',
    maxRank: 2,
    costPerRank: 4,
    reqSkillId: 'singularity_mastery',
    isUltimate: true,
    comboSequence: ['up', 'right', 'down', 'left'],
    comboHint: '[DOUBLE-SHIFT] + [↑ → ↓ ←]',
    desc: 'CARNAGE ULTIMATE: Triggers a micro-Singularity that pulls in and disintegrates every ghost.',
    tradeoffDesc: '40s cooldown (32s at rank 2). Triggers an x64 multiplier surge for 8s.'
  }
];

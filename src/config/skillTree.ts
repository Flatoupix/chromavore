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
    tradeoffDesc: 'Passive upgrade: the shorter cooldown applies to every Dash.'
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
    tradeoffDesc: 'Chain within 1.2s to widen each follow-up Dash blast by 25% (up to 75%). Each follow-up costs 8 Chrono.'
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
    desc: 'Adds 10% Nitro speed and 0.5s to Nitro duration and trail lifetime per rank.',
    tradeoffDesc: 'Double-tap and hold Shift, enter ↑ ↓ ↑ ↓, then release Shift. Costs 20 mana.'
  },
  {
    id: 'phase_shift',
    branch: 'agility',
    name: 'PHASE TRANSCENDENCE',
    icon: 'phase',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'multi_dash',
    desc: 'Adds 0.35s of protection after Dash, then +0.18s per rank, up to 0.75s total.',
    tradeoffDesc: 'Rank 3 also lets a Dash cross one thin interior wall.'
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
    tradeoffDesc: '24s base cooldown (18s at rank 2). Hits along the four axes and collects dots. Costs 40 mana.'
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
    tradeoffDesc: 'Ranks 4–5 deepen the slowdown by 5 percentage points (minimum 10%) but reduce passive recharge by 15%.'
  },
  {
    id: 'emp_overcharge',
    branch: 'control',
    name: 'EMP OVERCHARGE',
    icon: 'wiggle',
    maxRank: 4,
    costPerRank: 1,
    desc: 'Unlocks Wiggle EMP and increases its ghost-clearing radius by 25% per rank.',
    tradeoffDesc: 'Double-tap and hold Shift, enter ← → ← →, then release Shift. Costs 25 mana; cooldown falls 10% per rank.'
  },
  {
    id: 'deep_freeze',
    branch: 'control',
    name: 'DEEP FROST STUN',
    icon: 'freeze',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'emp_overcharge',
    desc: 'Adds 1.2s of freeze duration per rank and enables EMP frost effects.',
    tradeoffDesc: 'From rank 2, defeating a frozen ghost freezes nearby ghosts for 2.5s.'
  },
  {
    id: 'magnetic_core',
    branch: 'control',
    name: 'MAGNETIC SINGULARITY',
    icon: 'magnet',
    maxRank: 3,
    costPerRank: 2,
    desc: 'Passively attracts nearby pellets within a radius of 1.8–4.2 tiles.',
    tradeoffDesc: 'Also automatically devours nearby frightened or frozen ghosts.'
  },
  {
    id: 'aegis_shield',
    branch: 'control',
    name: 'AEGIS ORBITAL BARRIER',
    icon: 'shield',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'deep_freeze',
    desc: 'Automatically absorbs one normal ghost hit, freezes nearby threats, and grants 1.4s protection.',
    tradeoffDesc: 'One barrier at a time. Recharge: 100 / 80 / 60 dots by rank. Power Pellets count as 5.'
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
    tradeoffDesc: 'Ghost score and XP increase by 25% at rank 4 and 50% at rank 5.'
  },
  {
    id: 'titan_breaker',
    branch: 'carnage',
    name: 'TITAN BREAKER',
    icon: 'titan',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'pellet_resonance',
    desc: 'Dash stuns Titans for 3s at rank 1 and 4.5s at rank 2. Rank 3 eliminates Titans on Dash impact.',
    tradeoffDesc: 'Rank 2 also slows all Titans by 35%. Unprotected direct contact remains lethal.'
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
    desc: 'CARNAGE ULTIMATE: Instantly clears all ghosts and activates an x64 multiplier.',
    tradeoffDesc: '40s base cooldown (32s at rank 2). x64 lasts at least 8s. Costs 50 mana.'
  }
];

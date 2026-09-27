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
    name: 'VITESSE & AGILITÉ',
    color: '#00ffff',
    desc: 'Maîtrise spatiale, cooldowns réduits, intangibilité, multi-dashs et laser quantique'
  },
  control: {
    name: 'CONTRÔLE & TEMPO',
    color: '#d946ef',
    desc: 'Domination temporelle, impulsions EMP, freeze prolongé, aspiration et bastion cinétique'
  },
  carnage: {
    name: 'PUISSANCE & CARNAGE',
    color: '#ff0055',
    desc: 'Durée et résonance des pastilles, brise-Titans, super-drops et vortex de singularité'
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
    desc: 'Réduit le cooldown du Dash de 12% par rang (jusqu\'à -60%).',
    tradeoffDesc: 'Rangs 4-5 : Vitesse de ruée +20%, mais requiert une précision chirurgicale près des murs.'
  },
  {
    id: 'multi_dash',
    branch: 'agility',
    name: 'MULTI-DASH CHARGES',
    icon: 'overdrive',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'dash_reflex',
    desc: 'Confère +1 charge de Dash consécutive par rang (jusqu\'à 4 charges).',
    tradeoffDesc: 'Les dashs en chaîne (<1.2s) infligent +25% de dégâts d\'onde de choc mais coûtent 8% d\'énergie Chrono.'
  },
  {
    id: 'vector_surge',
    branch: 'agility',
    name: 'VECTOR SURGE',
    icon: 'dash',
    maxRank: 4,
    costPerRank: 2,
    reqSkillId: 'dash_reflex',
    desc: 'Double-taper la direction actuelle active un cran de turbo instantané (+20% vitesse/cran, jusqu\'à 4 crans superposables).',
    tradeoffDesc: 'Vitesse extrême de virage : chaque cran dure 2.5s et exige une anticipation millimétrée des intersections.'
  },
  {
    id: 'hyper_nitro',
    branch: 'agility',
    name: 'HYPER NITRO',
    icon: 'nitro',
    maxRank: 4,
    costPerRank: 1,
    desc: 'Vitesse de pointe du Nitro (+10%/rang) et traînée de plasma incinératrice prolongée (+0.5s/rang).',
    tradeoffDesc: 'Combo Shift: [↑ ↓ ↑ ↓]. Vitesse extrême diminuant légèrement la maniabilité dans les virages serrés.'
  },
  {
    id: 'phase_shift',
    branch: 'agility',
    name: 'PHASE TRANSCENDENCE',
    icon: 'phase',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'multi_dash',
    desc: 'Intangibilité de 0.35s (+0.18s/rang) après chaque Dash.',
    tradeoffDesc: 'Rang 3 : Permet de traverser les spectres vivants et brise temporairement les murs intérieurs.'
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
    desc: 'ULTIME D\'AGILITÉ : Décharge un quadruple rayon laser cardinal annihilant tous les spectres dans les couloirs en ligne directe.',
    tradeoffDesc: 'Délai de 24s (18s au rang 2). Transperce les portails et multiplie les points de combo par x3.'
  },

  // ─── BRANCHE CONTRÔLE ───
  {
    id: 'chrono_tank',
    branch: 'control',
    name: 'CHRONO TANK',
    icon: 'chrono',
    maxRank: 5,
    costPerRank: 1,
    desc: 'Augmente le réservoir de Bullet-Time de +20%/rang (jusqu\'à +100%).',
    tradeoffDesc: 'Rangs 4-5 : Ralentit le temps à 12% (au lieu de 18%), mais la recharge passive est réduite sans collecte active.'
  },
  {
    id: 'emp_overcharge',
    branch: 'control',
    name: 'EMP OVERCHARGE',
    icon: 'wiggle',
    maxRank: 4,
    costPerRank: 1,
    desc: 'Étend le rayon de l\'onde de choc Wiggle EMP (+25%/rang) et étourdit les fantômes.',
    tradeoffDesc: 'Combo Shift: [← → ← →]. Rang 3+ : Convertit les débris de fantômes en orbes magnétiques.'
  },
  {
    id: 'deep_freeze',
    branch: 'control',
    name: 'DEEP FROST STUN',
    icon: 'freeze',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'emp_overcharge',
    desc: 'Prolonge la durée d\'étourdissement des fantômes touchés par l\'EMP (+1.2s/rang).',
    tradeoffDesc: 'Dévorer un fantôme gelé provoque une onde d\'éclats de glace qui gèle les spectres adjacents.'
  },
  {
    id: 'magnetic_core',
    branch: 'control',
    name: 'MAGNETIC SINGULARITY',
    icon: 'magnet',
    maxRank: 3,
    costPerRank: 2,
    desc: 'Aspire passivement les pastilles proches dans un rayon de 1.8 à 4.2 cases.',
    tradeoffDesc: 'Attire également les fantômes vulnérables 15% plus vite vers Chromavore (tension magnétique accrue).'
  },
  {
    id: 'aegis_shield',
    branch: 'control',
    name: 'AEGIS ORBITAL SHIELDS',
    icon: 'shield',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'deep_freeze',
    desc: 'Démarre chaque vie avec +1 bouclier d\'énergie orbital par rang (jusqu\'à 3 boucliers). Chaque bouclier absorbe un coup mortel et déclenche une onde de choc de dégagement.',
    tradeoffDesc: 'Boucliers consommés récupérables en collectant un Super-Item ou 80 pac-gommes consécutives.'
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
    desc: 'ULTIME DE CONTRÔLE : Dôme cinétique de 6s. Convertit tout impact mortel en onde de choc répulsive au coût de 25% Chrono au lieu d\'une vie.',
    tradeoffDesc: 'Délai de 26s. Rang 2 : Durée 8s, repousse et gèle tous les attaquants dans un rayon de 5 cases.'
  },

  // ─── BRANCHE CARNAGE ───
  {
    id: 'pellet_resonance',
    branch: 'carnage',
    name: 'PELLET RESONANCE',
    icon: 'super_pellet',
    maxRank: 5,
    costPerRank: 1,
    desc: 'Allonge la durée de vulnérabilité des spectres (+1.4s par rang, jusqu\'à +7.0s).',
    tradeoffDesc: 'Rangs 4-5 : Dévorer des fantômes vulnérables confère +25% de score et d\'XP supplémentaires.'
  },
  {
    id: 'titan_breaker',
    branch: 'carnage',
    name: 'TITAN BREAKER',
    icon: 'titan',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'pellet_resonance',
    desc: 'Contre-mesure anti-Titans : ralentit les Titans et permet de les percuter.',
    tradeoffDesc: 'Rang 1 : Dasher dans un Titan brise son armure et l\'étourdit. Rang 3 : Le pulvérise net (+2500 pts).'
  },
  {
    id: 'super_frequency',
    branch: 'carnage',
    name: 'COSMIC DROPS',
    icon: 'nova',
    maxRank: 4,
    costPerRank: 1,
    desc: 'Augmente la fréquence d\'apparition des Super-Items (+25%/rang).',
    tradeoffDesc: 'Collecter un Super-Item confère +1.8s d\'invulnérabilité et recharge instantanément 30% d\'énergie Chrono.'
  },
  {
    id: 'singularity_mastery',
    branch: 'carnage',
    name: 'VOID TRANSCENDENCE',
    icon: 'black_hole',
    maxRank: 3,
    costPerRank: 2,
    reqSkillId: 'titan_breaker',
    desc: 'Étend la fenêtre de maintien de Combo (+0.4s/rang) et réduit le seuil de Singularité de 200 à 164 kills.',
    tradeoffDesc: 'Rang 3 : Étend la durée de la Singularité cosmique à 35s au lieu de 30s.'
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
    desc: 'ULTIME DE CARNAGE : Déclenche une micro-singularité instantanée qui aspire tous les fantômes et les désintègre.',
    tradeoffDesc: 'Délai de 40s (1 utilisation par manche). Déclenche un sursaut de multiplicateur x64 pendant 8s.'
  }
];

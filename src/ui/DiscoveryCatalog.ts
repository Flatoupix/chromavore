import type { SkillDef } from '../systems/ProgressionSystem';
import { SKILL_NODES } from '../config/skillTree';

export type DiscoveryMode = 'arcade' | 'custom';
export type PreviewKind = 'pellet' | 'super_pellet' | 'dash' | 'emp' | 'nitro' | 'nova' | 'laser' | 'cryo' | 'field' | 'vortex' | 'chrono' | 'phase' | 'shield' | 'tsunami' | 'magnet' | 'surge' | 'titan' | 'harvest' | 'mastery' | 'portal' | 'audio' | 'contact';
export interface DiscoveryCard {
  /** Persist this complete id: mode and rank are deliberately part of identity. */
  id: string;
  mode: DiscoveryMode;
  title: string;
  icon: string;
  unlockLabel: string;
  description: string;
  usage: string;
  keys: string[];
  alternateKeys?: string[];
  cost?: string;
  cooldown?: string;
  preview: PreviewKind;
  variant: number;
  previewCaption: string;
}

type Content = Omit<DiscoveryCard, 'id' | 'mode' | 'title' | 'icon' | 'unlockLabel'>;
const movementKeys = ['←', '→', '←', '→'];
const nitroKeys = ['↑', '↓', '↑', '↓'];
const pickup = 'Move onto the glowing item. Its effect starts immediately.';
const passive = 'Automatic while this skill is equipped. No extra button.';
const dashUse = 'Face a direction, then press Space or the Dash button. Gamepad: A or RT.';
const sequenceUse = 'Double-tap Shift, hold the second press, enter four directions, then release Shift to cast. Touch: double-tap and hold Chrono; gamepad: LB or LT.';

export function isCareerDiscoveryAvailableInMode(skill: SkillDef, mode: DiscoveryMode): boolean {
  return mode === 'arcade' || !['nova', 'overdrive', 'vortex', 'laser', 'cryo', 'tsunami'].includes(skill.baseId);
}

function content(preview: PreviewKind, description: string, usage = passive, keys: string[] = [], variant = 1): Content {
  return { preview, description, usage, keys, variant, previewCaption: description };
}

/** Pure descriptions derived from Player.triggerDash, main.executeSkillCombo,
 * SuperItemManager.activate/update and PowerupManager.collect. No live state is read. */
export function getArcadeDiscovery(skill: SkillDef, mode: DiscoveryMode = 'arcade'): DiscoveryCard {
  const v = skill.version;
  const later = v >= 2;
  let c: Content;
  switch (skill.baseId) {
    case 'dash':
      c = content('dash', `${v + 2}-tile dash that eliminates ordinary ghosts along your path.${later ? ' An arrival shockwave clears nearby ghosts.' : ''}${v === 5 ? ' Now breaks up to three interior walls.' : ''}`, dashUse, ['Space'], v);
      c.cooldown = later ? '1.2s base recharge' : '1.6s base recharge';
      break;
    case 'wiggle':
      c = content('emp', `An EMP wave eliminates ghosts and collects dots within ${later ? '8.5' : '4.8'} tiles.`, mode === 'custom' ? sequenceUse : 'Quickly alternate left and right four times while moving. Arrow keys, direction pad or swipes work.', movementKeys, v);
      c.alternateKeys = ['→', '←', '→', '←'];
      c.cooldown = later ? '10.5s base' : '14s base';
      if (mode === 'custom') c.cost = '25 Mana';
      break;
    case 'nitro':
      c = content('nitro', `A burning trail destroys ghosts for ${later ? '4.5' : '3.2'}s; in the wide arena, movement gains 30% speed.${later ? ' Trail segments now last 2.5s instead of 1.6s.' : ''}`, mode === 'custom' ? sequenceUse : 'Quickly alternate up and down four times while moving. Arrow keys, direction pad or swipes work.', nitroKeys, v);
      c.alternateKeys = ['↓', '↑', '↓', '↑'];
      c.cooldown = later ? '6.75s base' : '9s base';
      if (mode === 'custom') c.cost = '20 Mana';
      break;
    case 'chrono':
      c = content('chrono', `Hold Chrono to slow the world to ${later ? '12%' : '18%'} speed.${later ? ' Energy capacity rises to 150 and passive recharge is 50% faster.' : ''}`, 'Hold Shift or the Chrono button; release to return to normal speed. Gamepad: LB or LT.', ['Hold Shift'], v);
      c.cost = '28 Chrono energy / second';
      c.cooldown = 'Recharges while released';
      break;
    case 'nova':
      c = content('nova', later ? 'A larger golden blast clears all ghosts, with the same full-maze effect as Mega Nova.' : 'A golden blast immediately clears every ghost in the maze.', pickup, [], v);
      break;
    case 'overdrive':
      c = content('dash', `Removes Dash cooldown for ${later ? '10' : '8'}s.${later ? ' Adds a brief Force Field pulse when collected.' : ''}`, `${pickup} Press Space or Dash repeatedly during the effect.`, ['Space'], v);
      c.cooldown = 'No Dash cooldown while active';
      break;
    case 'vortex':
      c = content('vortex', later ? 'A larger black hole lasts 5s, consumes nearby ghosts and collects surrounding dots.' : 'A black hole pulls ghosts through nearby corridors and consumes them at its center for 3.5s.', pickup, [], v);
      break;
    case 'super_pellet':
      c = content('super_pellet', 'Power Pellets now frighten arriving reinforcements too, for the remaining pellet duration.', 'Eat a large glowing pellet, then touch frightened ghosts to devour them. Titans resist pellets.', [], v);
      break;
    case 'laser':
      c = content('laser', later ? 'Eight beams add diagonal hits and last 4.5s, up from four beams for 3.2s.' : 'Four beams eliminate ghosts aligned horizontally or vertically for 3.2s.', pickup, [], v);
      break;
    case 'cryo':
      c = content('cryo', `Freezes all ghosts for ${later ? '5.5' : '4'}s. Touch frozen ordinary ghosts to shatter them.${later ? ' The upgrade extends the freeze.' : ''}`, `${pickup} Move into frozen ghosts; Titans still require a stronger attack.`, [], v);
      break;
    case 'tsunami':
      c = content('tsunami', later ? 'The Solar Eclipse variant keeps the full-maze sweep, destroying ghosts as the wave passes.' : 'A wave sweeps across the maze, destroying ghosts in its path.', pickup, [], v);
      break;
    case 'audio':
      c = content('audio', 'The Studio HD soundtrack is available in audio settings.', 'Open Options and choose the Studio HD soundtrack.', ['O'], v);
      break;
    default:
      throw new Error(`Missing discovery content for ${skill.id}`);
  }
  return { ...c, id: `${mode}:${skill.id}`, mode, title: skill.name, icon: skill.icon, unlockLabel: later ? `VARIANT ${v} UNLOCKED` : (skill.category === 'item' ? 'NEW ITEM UNLOCKED' : 'NEW ABILITY UNLOCKED') };
}

export const BASE_DISCOVERY_IDS = ['power_pellet', 'phase', 'timewarp', 'force_field', 'action_nova', 'action_overdrive', 'void_relic', 'vortex_portal', 'dash', 'chrono', 'bonus_nova', 'bonus_vortex', 'bonus_laser', 'bonus_tsunami', 'god_mode', 'singularity', 'singularity_burst'] as const;
export type BaseDiscoveryId = typeof BASE_DISCOVERY_IDS[number];

export function getBaseDiscovery(id: BaseDiscoveryId, mode: DiscoveryMode): DiscoveryCard {
  let c: Content;
  let title: string;
  let icon: string;
  switch (id) {
    case 'power_pellet':
      title = 'POWER PELLET'; icon = 'super_pellet';
      c = content('pellet', 'Frightens ordinary ghosts already in the maze for 7 seconds so you can devour them.', 'Eat the large pellet, then touch a frightened ghost. New reinforcements and Titans are unaffected.');
      break;
    case 'phase':
      title = 'PHASE SHIFT'; icon = 'phase';
      c = content('phase', 'Pass safely through ghosts for 4 seconds.', pickup);
      break;
    case 'timewarp':
      title = 'TIME WARP'; icon = 'chrono';
      c = content('chrono', 'Slows ghost movement to 45% for 5 seconds while you keep your normal speed.', pickup);
      break;
    case 'force_field':
      title = 'FORCE FIELD'; icon = 'magnet';
      c = content('field', 'Collects nearby dots and devours nearby frightened or frozen ghosts; active ghosts remain dangerous.', `${pickup} Combine it with a Power Pellet. Duration grows from 6 to 8 seconds with career progress.`);
      break;
    case 'action_nova':
      title = 'NOVA BURST'; icon = 'nova';
      c = content('nova', 'A burst eliminates nearby ghosts immediately.', pickup);
      break;
    case 'action_overdrive':
      title = 'INFINITE DASH'; icon = 'overdrive';
      c = content('dash', 'Removes Dash cooldown for 7 seconds.', `${pickup} Press Space or Dash repeatedly while it is active.`, ['Space']);
      c.cooldown = 'No Dash cooldown while active';
      break;
    case 'void_relic':
      title = 'VOID RELIC'; icon = 'void_relic';
      c = content('field', 'Intercept the relic to gain an 8-second Force Field before a ghost takes it and becomes a Titan.', 'Reach the red relic first. Collecting it activates the field immediately.');
      break;
    case 'vortex_portal':
      title = 'VORTEX RAMPAGE'; icon = 'vortex_portal';
      c = content('portal', 'The portal transports you into a timed bonus arena filled with ghosts.', 'Move into the purple portal. Use movement and Dash in the bonus arena.');
      break;
    case 'dash':
      title = 'OFFENSIVE DASH'; icon = 'dash';
      c = content('dash', 'Dash through ordinary ghosts to eliminate them and cross several tiles instantly.', dashUse, ['Space']);
      c.cooldown = '1.6s base recharge';
      break;
    case 'chrono':
      title = 'CHRONO SHIFT'; icon = 'chrono';
      c = content('chrono', 'Hold Chrono to slow the world while your Chrono energy drains.', 'Hold Shift or the Chrono button. Release to recover energy. Gamepad: LB or LT.', ['Hold Shift']);
      c.cost = '28 Chrono energy / second';
      break;
    case 'bonus_nova':
      title = 'SUPERNOVA CORE'; icon = 'nova';
      c = content('nova', 'In the bonus arena, this capsule destroys ghosts within a wide radius.', pickup);
      break;
    case 'bonus_vortex':
      title = 'SINGULARITY RIFT'; icon = 'black_hole';
      c = content('vortex', 'In the bonus arena, a black hole attracts and consumes nearby ghosts for 4.5 seconds.', pickup);
      break;
    case 'bonus_laser':
      title = 'HYPER BEAMS'; icon = 'laser';
      c = content('laser', 'In the bonus arena, cross beams destroy aligned ghosts for 3.5 seconds and Dash has no cooldown for 4 seconds.', pickup);
      break;
    case 'bonus_tsunami':
      title = 'COSMIC TSUNAMI'; icon = 'tsunami';
      c = content('tsunami', 'In the bonus arena, a wave sweeps left to right and destroys ghosts it touches.', pickup);
      break;
    case 'god_mode':
      title = 'GOD MODE'; icon = 'crown';
      c = content('contact', 'For 15 seconds, you can safely devour any ghost on contact, including Titans.', 'Reach a ×32 pellet combo. The effect activates automatically; keep moving into ghosts.');
      break;
    case 'singularity':
      title = 'SINGULARITY'; icon = 'black_hole';
      c = content('vortex', 'Your ×64 form automatically devours nearby ghosts, including Titans, and draws in dots.', 'Chain a ×200 ghost streak. The transformation starts automatically after its introduction. Press F3 during play to add 50 to your streak and reach the threshold in a test run.');
      break;
    case 'singularity_burst':
      title = 'SINGULARITY NOVA'; icon = 'nova';
      c = content('nova', 'Clear all ghosts once during each ×64 Singularity.', 'While Singularity is active, press N or X. Gamepad: X.', ['N / X']);
      c.cost = 'One use per Singularity';
      break;
  }
  return { ...c, id: `${mode}:base:${id}`, mode, title, icon, unlockLabel: 'ABILITY DISCOVERED' };
}

export function getPickupDiscovery(type: string, mode: DiscoveryMode): DiscoveryCard | null {
  const ids: Record<string, BaseDiscoveryId> = { phase: 'phase', timewarp: 'timewarp', magnet: 'force_field', force_field: 'force_field', nova: 'action_nova', overdrive: 'action_overdrive', void_relic: 'void_relic', vortex_portal: 'vortex_portal', power_pellet: 'power_pellet' };
  return ids[type] ? getBaseDiscovery(ids[type], mode) : null;
}

/** Rank-specific copy avoids promising legacy effects that are absent from gameplay. */
export function getCustomDiscovery(skillId: string, rank: number): DiscoveryCard | null {
  const node = SKILL_NODES.find(n => n.id === skillId);
  if (!node || rank < 1 || rank > node.maxRank) return null;
  let c: Content;
  switch (skillId) {
    case 'dash_reflex':
      c = content('dash', `Dash recharges ${rank * 12}% faster than its base cooldown.`, `This bonus is automatic. ${dashUse}`, ['Space'], rank);
      c.cooldown = `${(1.6 * (1 - rank * .12)).toFixed(2)}s before Dash variant bonuses`;
      break;
    case 'multi_dash':
      c = content('dash', `Store ${rank + 1} Dash charges. Dashes chained within 1.2s expand the shockwave by 25% per step, up to 75%.`, dashUse, ['Space', 'Space'], rank);
      c.cost = '8 Chrono energy per chained Dash';
      c.cooldown = '0.16s between stored charges';
      break;
    case 'vector_surge':
      c = content('surge', `Each speed surge grants +5%, with up to ${rank} surge step${rank === 1 ? '' : 's'} (+${rank * 5}%).`, 'Double-tap your current direction. A surge lasts 2.5 seconds.', ['→', '→'], rank);
      c.cooldown = '3.5s';
      break;
    case 'hyper_nitro':
      c = content('nitro', `Nitro gains +${rank * 10}% speed in the wide arena and +${(rank * .5).toFixed(1)}s of active time and trail life.`, sequenceUse, nitroKeys, rank);
      c.alternateKeys = ['↓', '↑', '↓', '↑']; c.cost = '20 Mana'; c.cooldown = '9s base; upgrades can reduce it';
      break;
    case 'phase_shift':
      c = content('phase', `Adds ${(0.35 + (rank - 1) * .18).toFixed(2)}s of protection to Dash, up to the 0.75s total protection cap.${rank === 3 ? ' Dash can now pass through one thin interior wall.' : ''}`, `Protection activates after each Dash. ${dashUse}`, ['Space'], rank);
      break;
    case 'quantum_laser':
      c = content('laser', `Four cardinal beams clear ghosts and dots along their paths.${rank === 2 ? ' Rank 2 reduces base cooldown from 24 to 18 seconds.' : ''}`, sequenceUse, ['→', '↓', '→', '↓'], 1);
      c.alternateKeys = ['←', '↑', '→', '↓']; c.cost = '40 Mana'; c.cooldown = `${rank === 2 ? 18 : 24}s base`;
      break;
    case 'chrono_tank':
      c = content('chrono', `Chrono energy capacity increases by ${rank * 20}%.${rank >= 4 ? ' Time slows further (13%, or 10% with Chrono V2); passive recharge is 15% slower.' : ''}`, 'Hold Shift or Chrono to slow time. The larger tank is automatic.', ['Hold Shift'], rank);
      c.cost = '28 Chrono energy / second';
      break;
    case 'emp_overcharge':
      c = content('emp', `Wiggle EMP gains ${rank * 25}% radius and its cooldown falls by ${rank * 10}%. The wave eliminates ghosts and collects dots.`, sequenceUse, movementKeys, rank);
      c.alternateKeys = ['→', '←', '→', '←']; c.cost = '25 Mana'; c.cooldown = `${(14 * (1 - rank * .1)).toFixed(1)}s before other upgrades`;
      break;
    case 'deep_freeze':
      c = content('cryo', `Cryo and EMP freeze duration gains ${(rank * 1.2).toFixed(1)} seconds.${rank >= 2 ? ' Shattering a frozen ghost also freezes neighbors within 3.5 tiles for 2.5s.' : ''}`, 'The bonus is automatic. Touch frozen ordinary ghosts to shatter them; EMP still eliminates its targets immediately.', [], rank);
      break;
    case 'magnetic_core':
      c = content('magnet', `Automatically collects dots within ${(1.8 + (rank - 1) * 1.2).toFixed(1)} tiles and devours nearby frightened or frozen ghosts.`, 'Keep moving near dots and vulnerable ghosts. Active ghosts still hurt you.', [], rank);
      break;
    case 'aegis_shield':
      c = content('shield', `One barrier absorbs an ordinary fatal hit, grants 1.4s protection and freezes nearby ghosts for 2.5s.`, `Automatic protection. Restore the barrier with ${120 - rank * 20} dots; a Power Pellet counts as five. Titans bypass Aegis.`, [], rank);
      c.cooldown = `${120 - rank * 20} dots to recharge`;
      break;
    case 'kinetic_bastion':
      c = content('shield', `${rank === 2 ? 'An 8' : 'A 6'}-second barrier counters hits by freezing ghosts within ${rank === 2 ? '5' : '3.5'} tiles.`, `${sequenceUse} Each hit spends 20 Chrono energy and 1.5s of barrier time.`, ['↓', '↓', '↑', '↑'], rank);
      c.alternateKeys = ['↓', '←', '↓', '→']; c.cost = '35 Mana'; c.cooldown = '26s base';
      break;
    case 'pellet_resonance':
      c = content('pellet', `Power Pellet fear lasts ${(7 + rank * 1.4).toFixed(1)} seconds.${rank >= 4 ? ` Ghost score and XP gain ${25 * (rank - 3)}%.` : ''}`, 'Eat a Power Pellet. This passive bonus extends its duration.', [], rank);
      break;
    case 'titan_breaker':
      c = content('titan', rank === 3 ? 'Your Dash now eliminates Titans.' : `Dashing through a Titan freezes it for ${rank === 2 ? '4.5' : '3'}s.${rank === 2 ? ' Titans also move 35% slower.' : ''}`, `Hit Titans with Dash. Normal collisions remain lethal. ${dashUse}`, ['Space'], rank);
      break;
    case 'super_frequency':
      c = content('harvest', `Dot and pellet score and XP increase by ${rank * 15}%; spell cooldowns drop by ${rank * 8}%.`, 'Collect dots and pellets normally. The bonus and cooldown reduction apply automatically.', [], rank);
      break;
    case 'singularity_mastery':
      c = content('mastery', `Combo and ghost-streak grace periods gain ${(rank * .4).toFixed(1)} seconds.${rank === 3 ? ' Singularity lasts 35 seconds instead of 30.' : ''}`, 'Keep collecting and chaining ghost kills. Reach a ×200 ghost streak to trigger Singularity.', [], rank);
      break;
    case 'singularity_nova':
      c = content('nova', `Instantly clears all ghosts and grants a ×64 multiplier surge for at least 8s.${rank === 2 ? ' Base cooldown drops from 40 to 32 seconds.' : ''}`, sequenceUse, ['↑', '→', '↓', '←'], rank);
      c.alternateKeys = ['↑', '↑', '↓', '↓']; c.cost = '50 Mana'; c.cooldown = `${rank === 2 ? 32 : 40}s base`;
      break;
    default: throw new Error(`Missing discovery content for ${skillId}`);
  }
  return { ...c, id: `custom:${skillId}:rank:${rank}`, mode: 'custom', title: node.name, icon: node.icon, unlockLabel: `RANK ${rank} / ${node.maxRank} ${rank === 1 ? 'UNLOCKED' : 'UPGRADED'}` };
}

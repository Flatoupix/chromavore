/** Shared history for a skill, across modes, older save formats and upgrades. */
export function discoveryFamily(id: string): string {
  const skill = id.replace(/^(arcade|custom):/, '').replace(/^base:/, '')
    .replace(/:rank:\d+$/, '').replace(/_v\d+$/, '');
  const aliases: Record<string, string> = {
    emp_overcharge: 'wiggle', hyper_nitro: 'nitro',
    dash_reflex: 'dash', multi_dash: 'dash', chrono_tank: 'chrono',
    phase_shift: 'phase', pellet_resonance: 'power_pellet', super_pellet: 'power_pellet',
    singularity_mastery: 'singularity', singularity_burst: 'singularity_nova',
    quantum_laser: 'laser', action_nova: 'nova', bonus_nova: 'nova',
    action_overdrive: 'overdrive', bonus_laser: 'laser', bonus_vortex: 'vortex', bonus_tsunami: 'tsunami'
  };
  return aliases[skill] || skill;
}

export function isDiscoveryUpgrade(id: string): boolean {
  const version = id.match(/(?:_v|:rank:)(\d+)$/);
  return !!version && Number(version[1]) > 1;
}

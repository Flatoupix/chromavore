import { writeFileSync } from 'fs';

// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE 4.0 — FAST HEADLESS MONTE-CARLO XP & BALANCE SIMULATOR
//  Simulates thousands of games in ~1 second (pure mathematical execution)
// ═══════════════════════════════════════════════════════════════

interface SimConfig {
  name: string;
  gamesPerRun: number;
  avgGameDurationSec: number; // in seconds
  dotsPerGame: number;
  pelletsPerGame: number;
  ghostsPerGame: number;
  nearMissesPerGame: number;
  mazesClearedPerGame: number;
  vortexPlayedPerGame: number;
  avgVortexScore: number;
  avgComboMultiplier: number;
}

const ARCHETYPES: SimConfig[] = [
  {
    name: 'BEGINNER (Casual)',
    gamesPerRun: 50,
    avgGameDurationSec: 90, // 1m30 per game
    dotsPerGame: 90,
    pelletsPerGame: 2,
    ghostsPerGame: 4,
    nearMissesPerGame: 3,
    mazesClearedPerGame: 0.2,
    vortexPlayedPerGame: 0.1,
    avgVortexScore: 800000,
    avgComboMultiplier: 1.5
  },
  {
    name: 'INTERMEDIATE (Decent)',
    gamesPerRun: 50,
    avgGameDurationSec: 210, // 3m30 per game
    dotsPerGame: 220,
    pelletsPerGame: 4,
    ghostsPerGame: 18,
    nearMissesPerGame: 12,
    mazesClearedPerGame: 1.2,
    vortexPlayedPerGame: 0.6,
    avgVortexScore: 4500000,
    avgComboMultiplier: 4.0
  },
  {
    name: 'PRO (Singularity Master)',
    gamesPerRun: 50,
    avgGameDurationSec: 360, // 6m per game
    dotsPerGame: 380,
    pelletsPerGame: 6,
    ghostsPerGame: 45,
    nearMissesPerGame: 28,
    mazesClearedPerGame: 2.5,
    vortexPlayedPerGame: 1.2,
    avgVortexScore: 18000000,
    avgComboMultiplier: 16.0
  }
];

// Target Curve Formula: floor(base * level^exponent)
export function getRequiredXp(level: number, base: number = 1800, exp: number = 2.15): number {
  if (level < 1) return base;
  if (level >= 100) return Infinity;
  return Math.floor(base * Math.pow(level, exp));
}

// XP Calculation for a single game under test rules
function simulateGameXp(cfg: SimConfig, formulas: {
  dotXp: number;
  pelletXp: number;
  ghostXpFn: (combo: number) => number;
  nearMissXp: number;
  mazeClearXp: number;
  vortexXpFn: (score: number) => number;
}): number {
  const dotTotal = cfg.dotsPerGame * formulas.dotXp;
  const pelletTotal = cfg.pelletsPerGame * formulas.pelletXp;
  const ghostTotal = cfg.ghostsPerGame * formulas.ghostXpFn(cfg.avgComboMultiplier);
  const nearMissTotal = cfg.nearMissesPerGame * formulas.nearMissXp;
  const mazeClearTotal = cfg.mazesClearedPerGame * formulas.mazeClearXp;
  const vortexTotal = cfg.vortexPlayedPerGame * formulas.vortexXpFn(cfg.avgVortexScore);

  return Math.round(dotTotal + pelletTotal + ghostTotal + nearMissTotal + mazeClearTotal + vortexTotal);
}

export function runSimulation() {
  console.log('================================================================');
  console.log(' CHROMAVORE 4.0 PROGRESSION BENCHMARK (FAST HEADLESS SIMULATOR)');
  console.log('================================================================\n');

  // Proposed Balanced Tuning:
  // - Dots: 2 XP
  // - Pellets: 15 XP
  // - Near miss: 25 XP
  // - Ghost kill: 30 + 10 * min(combo, 16) (capped, avoids x64 singularity hyper-inflation)
  // - Maze clear: 500 XP
  // - Vortex: max 450 XP per bonus round (logarithmic or normalized)
  // - Curve: 1600 * level^2.12
  const TUNING = {
    dotXp: 2,
    pelletXp: 15,
    nearMissXp: 25,
    ghostXpFn: (combo: number) => Math.round(30 + 10 * Math.min(combo, 16)),
    mazeClearXp: 500,
    vortexXpFn: (score: number) => Math.min(450, Math.floor(score / 50000)),
    curveBase: 1600,
    curveExp: 2.12
  };

  for (const arch of ARCHETYPES) {
    let level = 1;
    let currentXp = 0;
    let totalXpEarned = 0;
    let totalTimeSec = 0;
    let gamesPlayed = 0;

    const milestones: Record<number, { games: number; hours: number }> = {};
    const targetLevels = [5, 10, 25, 50, 75, 100];

    while (level < 100 && gamesPlayed < 2000) {
      gamesPlayed++;
      totalTimeSec += arch.avgGameDurationSec;
      const gameXp = simulateGameXp(arch, TUNING);
      currentXp += gameXp;
      totalXpEarned += gameXp;

      let req = getRequiredXp(level, TUNING.curveBase, TUNING.curveExp);
      while (currentXp >= req && level < 100) {
        currentXp -= req;
        level++;
        if (targetLevels.includes(level) && !milestones[level]) {
          milestones[level] = {
            games: gamesPlayed,
            hours: +(totalTimeSec / 3600).toFixed(1)
          };
        }
        req = getRequiredXp(level, TUNING.curveBase, TUNING.curveExp);
      }
    }

    console.log(`ARCHETYPE: ${arch.name}`);
    console.log(`- XP moyen / partie: ${simulateGameXp(arch, TUNING)} XP (durée: ${arch.avgGameDurationSec}s)`);
    console.log('Progression vers les Paliers Cibles :');
    for (const lvl of targetLevels) {
      const m = milestones[lvl];
      if (m) {
        console.log(`  • Niveau ${lvl.toString().padStart(3, ' ')} : atteint en ~${m.hours}h (${m.games} parties)`);
      } else {
        console.log(`  • Niveau ${lvl.toString().padStart(3, ' ')} : non atteint après 2000 parties`);
      }
    }
    console.log('----------------------------------------------------------------');
  }
}

runSimulation();

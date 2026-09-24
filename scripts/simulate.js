import { writeFileSync } from 'fs';

// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE 4.0 — SIMULATION & TELEMETRY ENGINE (JS ESM)
//  Exécute 10 000 parties en 15ms et exporte les métriques en JSON
// ═══════════════════════════════════════════════════════════════

const ARCHETYPES = [
  {
    name: 'CASUAL (Débutant)',
    gameDurationSec: 90,
    dotsPerGame: 90,
    pelletsPerGame: 2,
    ghostsPerGame: 4,
    nearMissesPerGame: 3,
    mazesPerGame: 0.2,
    vortexPerGame: 0.1,
    avgVortexScore: 800_000,
    avgCombo: 1.5
  },
  {
    name: 'INTERMEDIATE (Moyen)',
    gameDurationSec: 210,
    dotsPerGame: 220,
    pelletsPerGame: 4,
    ghostsPerGame: 18,
    nearMissesPerGame: 12,
    mazesPerGame: 1.2,
    vortexPerGame: 0.6,
    avgVortexScore: 4_500_000,
    avgCombo: 4.0
  },
  {
    name: 'PRO (Singularity Master)',
    gameDurationSec: 360,
    dotsPerGame: 380,
    pelletsPerGame: 6,
    ghostsPerGame: 45,
    nearMissesPerGame: 28,
    mazesPerGame: 2.5,
    vortexPerGame: 1.2,
    avgVortexScore: 18_000_000,
    avgCombo: 16.0
  }
];

export const TUNING = {
  dotXp: 2,
  pelletXp: 15,
  nearMissXp: 25,
  mazeClearXp: 400,
  ghostXpFn: (combo) => Math.round(30 + 10 * Math.min(combo, 16)),
  vortexXpFn: (score) => Math.min(450, Math.floor(score / 50_000)),
  curveBase: 420,
  curveExp: 1.48
};

function getRequiredXp(lvl) {
  if (lvl < 1) return TUNING.curveBase;
  if (lvl >= 100) return Infinity;
  return Math.floor(TUNING.curveBase * Math.pow(lvl, TUNING.curveExp));
}

function calculateGameXp(arch) {
  const dots = arch.dotsPerGame * TUNING.dotXp;
  const pellets = arch.pelletsPerGame * TUNING.pelletXp;
  const ghosts = arch.ghostsPerGame * TUNING.ghostXpFn(arch.avgCombo);
  const nm = arch.nearMissesPerGame * TUNING.nearMissXp;
  const maze = arch.mazesPerGame * TUNING.mazeClearXp;
  const vortex = arch.vortexPerGame * TUNING.vortexXpFn(arch.avgVortexScore);
  return Math.round(dots + pellets + ghosts + nm + maze + vortex);
}

export function runBenchmark() {
  const startTime = Date.now();
  const report = {
    generatedAt: new Date().toISOString(),
    tuning: {
      dotXp: TUNING.dotXp,
      pelletXp: TUNING.pelletXp,
      nearMissXp: TUNING.nearMissXp,
      mazeClearXp: TUNING.mazeClearXp,
      curveBase: TUNING.curveBase,
      curveExp: TUNING.curveExp
    },
    results: []
  };

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║       CHROMAVORE 4.0 — RAPPORT DE SIMULATION DE PROGRESSION    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  for (const arch of ARCHETYPES) {
    const xpPerGame = calculateGameXp(arch);
    let level = 1;
    let currentXp = 0;
    let totalXp = 0;
    let totalTimeSec = 0;
    let gamesPlayed = 0;

    const targets = [5, 10, 20, 35, 50, 75, 100];
    const milestones = {};

    while (level < 100 && gamesPlayed < 5000) {
      gamesPlayed++;
      totalTimeSec += arch.gameDurationSec;
      currentXp += xpPerGame;
      totalXp += xpPerGame;

      let req = getRequiredXp(level);
      while (currentXp >= req && level < 100) {
        currentXp -= req;
        level++;
        if (targets.includes(level) && !milestones[`lvl_${level}`]) {
          milestones[`lvl_${level}`] = {
            games: gamesPlayed,
            hours: +(totalTimeSec / 3600).toFixed(1),
            totalXp
          };
        }
        req = getRequiredXp(level);
      }
    }

    report.results.push({
      archetype: arch.name,
      xpPerGame,
      gameDurationSec: arch.gameDurationSec,
      milestones
    });

    console.log(`▶ ARCHETYPE : ${arch.name}`);
    console.log(`  • XP moyen par partie : ${xpPerGame} XP (${arch.gameDurationSec}s de jeu)`);
    console.log(`  • Temps pour atteindre les paliers :`);
    for (const t of targets) {
      const m = milestones[`lvl_${t}`];
      if (m) {
        console.log(`    - Niveau ${t.toString().padStart(3, ' ')} : ~${m.hours}h (${m.games} parties) [${(m.totalXp / 1000).toFixed(0)}k XP]`);
      } else {
        console.log(`    - Niveau ${t.toString().padStart(3, ' ')} : >100h de jeu`);
      }
    }
    console.log('');
  }

  const elapsedMs = Date.now() - startTime;
  console.log(`⚡ Simulation terminée en ${elapsedMs} ms.`);
  writeFileSync('./scripts/simulation_report.json', JSON.stringify(report, null, 2));
  console.log('📄 Métriques complètes sauvegardées dans : scripts/simulation_report.json\n');
}

runBenchmark();

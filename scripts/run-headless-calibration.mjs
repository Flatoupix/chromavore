#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const games = positiveInt(args.games, 100, 'games');
const replicates = positiveInt(args.replicates, 3, 'replicates');
const maxSeconds = positiveNumber(args['max-seconds'], 180, 'max-seconds');
const seed = nonNegativeInt(args.seed, 20260925, 'seed');
const bots = split(args.bots, ['collector', 'hunter']);
const skills = split(args.skills, ['none', 'balanced']);
const ghostCaps = splitNumbers(args['ghost-caps'], [16]);
const xpCurves = splitNumbers(args['xp-curves'], [1]);
const xpGains = splitNumbers(args['xp-gains'], [1]);
const singularityThresholds = splitNumbers(args['singularity-kills'], [200]);
const outputPath = resolve(repoRoot, args.out ?? `scripts/reports/headless-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}.json`);

const validBots = new Set(['cautious', 'collector', 'hunter']);
const validSkills = new Set(['none', 'pellet-focus', 'dash-focus', 'balanced']);
if (bots.some(value => !validBots.has(value))) throw new Error(`Unknown bot. Choose: ${[...validBots].join(', ')}`);
if (skills.some(value => !validSkills.has(value))) throw new Error(`Unknown skill policy. Choose: ${[...validSkills].join(', ')}`);

const scenarios = [];
for (const botStrategy of bots) {
  for (const skillPolicy of skills) {
    for (const ghostXpComboCap of ghostCaps) {
      for (const xpCurveMultiplier of xpCurves) {
        for (const xpGainMultiplier of xpGains) {
          for (const singularityTriggerKills of singularityThresholds) {
            scenarios.push({ botStrategy, skillPolicy, ghostXpComboCap, xpCurveMultiplier, xpGainMultiplier, singularityTriggerKills });
          }
        }
      }
    }
  }
}

let vite;
try {
  vite = await createServer({
    configFile: false,
    root: repoRoot,
    logLevel: 'error',
    server: { middlewareMode: true },
    appType: 'custom'
  });
  const { runHeadlessCampaign } = await vite.ssrLoadModule('/src/simulation/HeadlessSimulation.ts');
  const results = [];
  let completed = 0;
  const total = scenarios.length * replicates;

  for (const scenario of scenarios) {
    const runs = [];
    for (let replicate = 0; replicate < replicates; replicate++) {
      runs.push(runHeadlessCampaign({
        ...scenario,
        seed: (seed + replicate * games) >>> 0,
        games,
        maxSeconds
      }));
      completed++;
      process.stderr.write(`\rCalibration: ${completed}/${total} batches (${Math.round(completed / total * 100)}%)`);
    }
    results.push({ scenario, summary: summarize(runs), replicates: runs });
  }
  process.stderr.write('\n');

  for (const result of results) {
    const noSkillScenario = results.find(candidate =>
      candidate.scenario.botStrategy === result.scenario.botStrategy &&
      candidate.scenario.skillPolicy === 'none' &&
      candidate.scenario.ghostXpComboCap === result.scenario.ghostXpComboCap &&
      candidate.scenario.xpCurveMultiplier === result.scenario.xpCurveMultiplier &&
      candidate.scenario.xpGainMultiplier === result.scenario.xpGainMultiplier &&
      candidate.scenario.singularityTriggerKills === result.scenario.singularityTriggerKills
    );
    if (noSkillScenario) result.deltaVsNoSkills = pairedDelta(result, noSkillScenario);

    const baseScenario = results.find(candidate =>
      candidate.scenario.botStrategy === result.scenario.botStrategy &&
      candidate.scenario.skillPolicy === result.scenario.skillPolicy &&
      candidate.scenario.ghostXpComboCap === 16 &&
      candidate.scenario.xpCurveMultiplier === 1 &&
      candidate.scenario.xpGainMultiplier === 1 &&
      candidate.scenario.singularityTriggerKills === result.scenario.singularityTriggerKills
    );
    if (!baseScenario) continue;
    result.deltaVsReference = pairedDelta(result, baseScenario);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    version: '4.0.7',
    configuration: { gamesPerReplicate: games, replicates, maxSeconds, baseSeed: seed, scenarios },
    metricDefinitions: {
      campaignXpPerMinute: 'XP earned divided by cumulative simulated campaign minutes; meaned across independent campaign replicates.',
      timeToLevelSeconds: 'Cumulative simulated play time from the supplied starting profile until the target level.',
      dispersion: 'Replicate standard deviation, minimum, and maximum; replicates share matched seeds across scenarios.'
    },
    interpretationWarnings: results.every(result => result.summary.averageMazesCleared.mean === 0)
      ? ['No simulated bot clears a maze in this sample; use these runs to compare bot survival/XP only, not to rebalance maze-clear rewards or human campaign pacing. Improve or validate navigation before making balance decisions from long-run progression.']
      : [],
    modelScope: [
      'Uses production maze layouts and transitions, level-clear XP, loop speed scaling, movement/contact constants, XP awards for dots/pellets/ghost kills/near-misses, combo surge, career-kill dash unlocks, and level-up lives.',
      'Ghost steering and bot decision-making are approximations; the player is an automated policy, not a human skill model.',
      'Does not simulate Vortex sessions, super-item drops/effects, badge XP, or Titans.',
      'Account skills are auto-purchased at level-up using real node costs/prerequisites for Dash Reflex, Multi-Dash, Phase Shift, and Pellet Resonance; this approximates when a player opens the skill tree. Multi-Dash ranks currently have no active charge behavior in the gameplay runtime, so purchasing them is modeled as a point sink.',
      'The default ghost XP combo cap of 16 matches the current game implementation; cap 64 is available as a candidate comparison.',
      'The default Singularity threshold is the production value; overriding it is a diagnostic acceleration only, not a proposed game change.'
    ],
    results
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  const csvPath = outputPath.replace(/\.json$/i, '.csv');
  writeFileSync(csvPath, toCsv(results, games));
  process.stdout.write(`Saved ${results.length} scenarios × ${replicates} replicates (${games} games each)\nJSON: ${outputPath}\nCSV:  ${csvPath}\n`);
  for (const result of results) {
    const { scenario, summary } = result;
    const comparison = result.deltaVsReference;
    const skillComparison = result.deltaVsNoSkills;
    process.stdout.write(`${scenario.botStrategy}/${scenario.skillPolicy} cap=${scenario.ghostXpComboCap} curve=${scenario.xpCurveMultiplier} gain=${scenario.xpGainMultiplier}: ` +
      `Lv ${summary.finalLevel.mean.toFixed(1)}±${summary.finalLevel.sd.toFixed(1)}, ` +
      `${summary.campaignXpPerMinute.mean.toFixed(0)} XP/min, ` +
      `avg survival ${summary.averageRunSeconds.mean.toFixed(1)}s, ` +
      `${summary.averageMazesCleared.mean.toFixed(2)} map clears/run, ` +
      `Singularity ${(summary.singularityRunRate.mean * 100).toFixed(1)}%` +
      (comparison ? `, ΔXP/min ${comparison.campaignXpPerMinutePercent.mean >= 0 ? '+' : ''}${comparison.campaignXpPerMinutePercent.mean.toFixed(1)}% vs reference` : '') +
      (skillComparison && scenario.skillPolicy !== 'none' ? `, skills ${skillComparison.campaignXpPerMinutePercent.mean >= 0 ? '+' : ''}${skillComparison.campaignXpPerMinutePercent.mean.toFixed(1)}% XP/min` : '') + '\n');
  }
} finally {
  await vite?.close();
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') { parsed.help = true; continue; }
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const equals = token.indexOf('=');
    const key = token.slice(2, equals < 0 ? undefined : equals);
    const value = equals < 0 ? argv[++i] : token.slice(equals + 1);
    if (value === undefined) throw new Error(`Missing value for --${key}`);
    parsed[key] = value;
  }
  return parsed;
}

function positiveInt(value, fallback, label) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`--${label} must be a positive integer`);
  return number;
}

function nonNegativeInt(value, fallback, label) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(`--${label} must be a non-negative integer`);
  return number;
}

function positiveNumber(value, fallback, label) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`--${label} must be a positive number`);
  return number;
}

function split(value, fallback) {
  return value === undefined ? fallback : value.split(',').map(item => item.trim()).filter(Boolean);
}

function splitNumbers(value, fallback) {
  if (value === undefined) return fallback;
  return value.split(',').map(item => Number(item.trim())).map(number => {
    if (!Number.isFinite(number) || number <= 0) throw new Error('Tuning values must be positive numbers');
    return number;
  });
}

function describe(values) {
  if (!values.length) return { mean: 0, sd: 0, min: 0, median: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return {
    mean,
    sd: Math.sqrt(variance),
    min: sorted[0],
    median: sorted[Math.floor((sorted.length - 1) / 2)],
    max: sorted[sorted.length - 1]
  };
}

function summarize(runs) {
  const stat = key => describe(runs.map(run => run[key]));
  const targets = [5, 10, 20, 35, 50, 75, 100];
  const milestones = Object.fromEntries(targets.map(level => {
    const reached = runs.map(run => run.timeToLevelSeconds[level]).filter(value => value !== null);
    return [level, { reachedReplicates: reached.length, reachedFraction: reached.length / runs.length, seconds: describe(reached) }];
  }));
  return {
    finalLevel: describe(runs.map(run => run.finalProfile.accountLevel)),
    finalCareerGhosts: describe(runs.map(run => run.finalProfile.careerGhosts)),
    totalCampaignSeconds: stat('totalCampaignSeconds'),
    totalCampaignXp: stat('totalCampaignXp'),
    campaignXpPerMinute: stat('campaignXpPerMinute'),
    averageRunSeconds: stat('averageRunSeconds'),
    medianRunXp: stat('medianRunXp'),
    averageRunKills: stat('averageRunKills'),
    averageMazesCleared: stat('averageMazesCleared'),
    averageRunDeaths: stat('averageRunDeaths'),
    averageDotsCollected: stat('averageDotsCollected'),
    singularityRunRate: stat('singularityRunRate'),
    gameOverRate: stat('gameOverRate'),
    timeToLevel: milestones
  };
}

function pairedDelta(candidate, baseline) {
  const delta = key => describe(candidate.replicates.map((run, index) => run[key] - baseline.replicates[index][key]));
  const xpPerMinutePercent = describe(candidate.replicates.map((run, index) => {
    const base = baseline.replicates[index].campaignXpPerMinute;
    return base > 0 ? (run.campaignXpPerMinute / base - 1) * 100 : 0;
  }));
  return {
    note: 'Paired replicate differences against the matched comparison scenario; same seeds are used in each replicate.',
    finalLevel: describe(candidate.replicates.map((run, index) => run.finalProfile.accountLevel - baseline.replicates[index].finalProfile.accountLevel)),
    campaignXpPerMinutePercent: xpPerMinutePercent,
    averageRunSeconds: delta('averageRunSeconds'),
    averageMazesCleared: delta('averageMazesCleared'),
    averageRunDeaths: delta('averageRunDeaths'),
    singularityRunRate: delta('singularityRunRate')
  };
}

function toCsv(results, gamesPerReplicate) {
  const columns = [
    'botStrategy', 'skillPolicy', 'ghostXpComboCap', 'xpCurveMultiplier', 'xpGainMultiplier', 'singularityTriggerKills', 'replicate', 'games',
    'finalLevel', 'careerGhosts', 'campaignSeconds', 'campaignXp', 'campaignXpPerMinute', 'averageRunSeconds',
    'medianRunXp', 'averageRunKills', 'averageMazesCleared', 'averageRunDeaths', 'averageDotsCollected', 'singularityRunRate', 'gameOverRate',
    'deltaXpPerMinutePctVsNoSkills', 'deltaLevelVsNoSkills',
    'secondsToLevel5', 'secondsToLevel10', 'secondsToLevel20', 'secondsToLevel35', 'secondsToLevel50', 'secondsToLevel75', 'secondsToLevel100'
  ];
  const lines = [columns.join(',')];
  for (const result of results) {
    result.replicates.forEach((run, index) => {
      const row = [
        result.scenario.botStrategy, result.scenario.skillPolicy, result.scenario.ghostXpComboCap,
        result.scenario.xpCurveMultiplier, result.scenario.xpGainMultiplier, result.scenario.singularityTriggerKills, index + 1, gamesPerReplicate,
        run.finalProfile.accountLevel, run.finalProfile.careerGhosts, run.totalCampaignSeconds, run.totalCampaignXp,
        run.campaignXpPerMinute, run.averageRunSeconds, run.medianRunXp, run.averageRunKills,
        run.averageMazesCleared, run.averageRunDeaths,
        run.averageDotsCollected, run.singularityRunRate, run.gameOverRate,
        result.deltaVsNoSkills?.campaignXpPerMinutePercent.mean ?? '',
        result.deltaVsNoSkills?.finalLevel.mean ?? '',
        ...[5, 10, 20, 35, 50, 75, 100].map(level => run.timeToLevelSeconds[level] ?? '')
      ];
      lines.push(row.join(','));
    });
  }
  return `${lines.join('\n')}\n`;
}

function printHelp() {
  process.stdout.write(`CHROMAVORE headless calibration runner\n\n` +
    `npm run simulate:headless -- [options]\n\n` +
    `--games N             Games per campaign replicate (default 100)\n` +
    `--replicates N        Independent matched-seed campaigns (default 3)\n` +
    `--seed N              Base seed (default 20260925)\n` +
    `--max-seconds N       Maximum seconds per game (default 180)\n` +
    `--bots LIST           cautious,collector,hunter (default collector,hunter)\n` +
    `--skills LIST         none,pellet-focus,dash-focus,balanced (default none,balanced)\n` +
    `--ghost-caps LIST     XP combo caps to compare (default 16; try 16,64)\n` +
    `--xp-curves LIST      Required-XP multipliers (default 1)\n` +
    `--xp-gains LIST       Earned-XP multipliers (default 1)\n` +
    `--singularity-kills N Production trigger threshold (default 200; lower only for diagnostics)\n` +
    `--out PATH            JSON report path; a sibling CSV is also written\n`);
}

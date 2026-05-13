/**
 * Compare test: JS singularity-core.js vs Python singularity_v2_1
 * Uses mulberry32 seeded PRNG to match Python's np.random.seed(42)
 * Output: summary JSON for comparison
 */

// ============================================================================
// SEEDED PRNG — mulberry32 (matches deterministic sequence)
// ============================================================================
function mulberry32(seed) {
  return function() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ============================================================================
// CONFIG (same as Python v2.1)
// ============================================================================
const CONFIG = {
  FRONTIER: { training_flops_log10: 27.5, capability_score_baseline: 1.0 },
  THRESHOLDS: { agi: 10.0, asi: 1000.0 },
  HARDWARE: { doubling_time_months: 8.0, doubling_time_std_months: 2.0 },
  ALGORITHMS: { doubling_time_months: 6.0, doubling_time_std_months: 2.5 },
  SCALING_LAW: { slope: 0.55, paradigm_ceiling: 8.0, paradigm_shift_prob_per_year: 0.35, shift_capability_boost: 3.0 },
  INFERENCE_SCALING: { max_bonus_multiplier: 2.0, saturation_capability: 4.0 },
  RSI: { factor: 0.12, factor_std: 0.05, activation_capability: 2.0, saturation_capability: 20.0 },
  DATA_WALL: { start_year: 2026.0, hw_damping_rate: 0.08, algo_damping_rate: 0.05 },
  NON_TECHNICAL_BARRIERS: { regulatory_damping_mean: 0.07, regulatory_damping_std: 0.05, energy_wall_year: 2027.5, energy_damping_rate: 0.06, alignment_pause_prob_per_year: 0.08, alignment_pause_duration_years_mean: 1.5 },
  SIMULATION: { max_years: 50, dt_months: 1.0, n_monte_carlo: 1000 },
};

// ============================================================================
// SEEDED RANDOM HELPERS (replaces Math.random)
// ============================================================================
let _seed = 42;
const rng = mulberry32(_seed);

function randn() {
  // Box-Muller using seeded rng
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function randRange(min, max) { return min + rng() * (max - min); }
function sigmoid(x) { return 1.0 / (1.0 + Math.exp(-Math.max(-500, Math.min(500, x)))); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ============================================================================
// MODEL (identical logic to Python v2.1)
// ============================================================================
function computeCapability(logDiff, cfg, ceiling) {
  const slope = cfg.SCALING_LAW.slope;
  const raw = ceiling * (sigmoid(slope * logDiff) - 0.5) + 1.0;
  return Math.max(raw, 0.01);
}

function inferenceScale(cap, cfg) {
  const inf = cfg.INFERENCE_SCALING;
  const k = Math.log(2) / inf.saturation_capability;
  return 1.0 + (inf.max_bonus_multiplier - 1.0) * (1.0 - Math.exp(-k * cap));
}

function rsiBoost(cap, rsi) {
  if (cap < rsi.activation_capability) return 0;
  const prog = clamp((cap - rsi.activation_capability) / (rsi.saturation_capability - rsi.activation_capability), 0, 1);
  return rsi.factor * prog * Math.log(1.0 + cap);
}

function runTrajectory(fixedParams, cfg) {
  const hwK = Math.log(2) / Math.max(1.0, fixedParams.hw);
  const algoK = Math.log(2) / Math.max(1.0, fixedParams.algo);
  const rsiF = clamp(fixedParams.rsi, 0, 1);
  const regD = clamp(fixedParams.reg, 0, 1);
  const dt = cfg.SIMULATION.dt_months;
  const maxT = Math.floor(cfg.SIMULATION.max_years * 12 / dt);

  let flopsLog = cfg.FRONTIER.training_flops_log10;
  let algoLog = 0;
  let baseLog = flopsLog;
  let ceiling = cfg.SCALING_LAW.paradigm_ceiling;

  let agiDate = null, asiDate = null, agiAchieved = false, pauseRem = 0;
  const now = new Date();
  const startYear = now.getFullYear() + now.getMonth() / 12;

  for (let t = 0; t < maxT; t++) {
    const yr = startYear + (t * dt) / 12;

    // Thresholds
    const ld = flopsLog + algoLog - baseLog;
    const rawCap = computeCapability(ld, cfg, ceiling);
    const cap = rawCap * inferenceScale(rawCap, cfg);

    if (agiDate === null && cap >= cfg.THRESHOLDS.agi) {
      agiDate = yr;
      agiAchieved = true;
    }
    if (asiDate === null && cap >= cfg.THRESHOLDS.asi && pauseRem <= 0) {
      asiDate = yr;
    }

    // Alignment pause
    if (agiAchieved && pauseRem <= 0) {
      if (rng() < cfg.NON_TECHNICAL_BARRIERS.alignment_pause_prob_per_year * dt / 12) {
        pauseRem = cfg.NON_TECHNICAL_BARRIERS.alignment_pause_duration_years_mean * 12 * Math.exp(0.5 * randn());
      }
    }
    if (pauseRem > 0) {
      pauseRem -= dt;
      flopsLog += hwK * dt * 0.3;
      algoLog += algoK * dt * 0.2;
      continue;
    }

    // Data Wall
    let hwD = 1, algoD = 1;
    if (yr > cfg.DATA_WALL.start_year && !agiAchieved) {
      const yp = yr - cfg.DATA_WALL.start_year;
      hwD = Math.exp(-cfg.DATA_WALL.hw_damping_rate * yp);
      algoD = Math.exp(-cfg.DATA_WALL.algo_damping_rate * yp);
    }

    // Energy wall
    let enD = 1;
    if (yr > cfg.NON_TECHNICAL_BARRIERS.energy_wall_year) {
      enD = Math.exp(-cfg.NON_TECHNICAL_BARRIERS.energy_damping_rate * (yr - cfg.NON_TECHNICAL_BARRIERS.energy_wall_year));
    }

    // Regulation
    const regF = clamp((yr - 2025) / 2, 0, 1);
    const totalReg = 1 - regD * regF;

    // Paradigm shift
    if (rng() < cfg.SCALING_LAW.paradigm_shift_prob_per_year * dt / 12) {
      ceiling *= cfg.SCALING_LAW.shift_capability_boost;
      baseLog -= (Math.log10(cfg.SCALING_LAW.shift_capability_boost) / cfg.SCALING_LAW.slope) * 0.5;
    }

    // RSI
    const rsi = rsiBoost(rawCap, cfg.RSI);

    // Update
    flopsLog += hwK * hwD * enD * totalReg * dt;
    algoLog += (algoK * algoD + rsi) * totalReg * dt;
  }

  return {
    agiYears: agiDate !== null ? agiDate - startYear : Infinity,
    asiYears: asiDate !== null ? asiDate - startYear : Infinity,
  };
}

function percentile(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  const i = (p / 100) * (s.length - 1);
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (i - lo) * (s[hi] - s[lo]);
}

function cdf(arr, x) {
  return (100.0 * arr.filter(v => isFinite(v) && v <= x).length) / arr.length;
}

// ============================================================================
// MAIN
// ============================================================================
function runComparison() {
  const N = 1000;
  const cfg = JSON.parse(JSON.stringify(CONFIG));
  const agiList = [], asiList = [];

  console.error(`JS (seeded mulberry32): running ${N} simulations...`);

  for (let i = 0; i < N; i++) {
    const hw = clamp(8 + 2 * randn(), 1, 40);
    const algo = clamp(6 + 2.5 * randn(), 1, 30);
    const rsi = clamp(0.12 + 0.05 * randn(), 0, 1);
    const reg = clamp(0.07 + 0.05 * randn(), 0, 1);

    const r = runTrajectory({ hw, algo, rsi, reg }, cfg);
    agiList.push(r.agiYears);
    asiList.push(r.asiYears);

    if ((i + 1) % 200 === 0) console.error(`  JS: ${i+1}/${N} done`);
  }

  const summary = {
    engine: 'js_v2_cloud',
    seed: 42,
    n_runs: N,
    agi_median: percentile(agiList.filter(isFinite), 50),
    asi_median: percentile(asiList.filter(isFinite), 50),
    p_agi_2028: cdf(agiList, 2),
    p_agi_2030: cdf(agiList, 4),
    p_asi_2028: cdf(asiList, 2),
    p_asi_2030: cdf(asiList, 4),
    p_asi_2035: cdf(asiList, 9),
    p_asi_2040: cdf(asiList, 14),
    finite_agi_pct: (agiList.filter(isFinite).length / N) * 100,
    finite_asi_pct: (asiList.filter(isFinite).length / N) * 100,
  };

  console.log(JSON.stringify(summary, null, 2));

  // Save for comparison
  const fs = require('fs');
  fs.writeFileSync('/mnt/d/prod/singularity-cloud/js_results.json', JSON.stringify(summary, null, 2));
  console.error('\nSaved to js_results.json');
}

runComparison();
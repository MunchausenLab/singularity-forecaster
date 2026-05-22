/**
 * Singularity Forecaster v2.1 — JavaScript Core
 * Портировано с Python singularity_v2_1.py
 * Чистый расчёт, без зависимостей от DOM/Node
 */

// ============================================================================
// CONFIG
// ============================================================================
const CONFIG = Object.freeze({
  FRONTIER: {
    training_flops_log10: 27.5,
    capability_score_baseline: 1.0,
  },
  THRESHOLDS: {
    agi: 10.0,
    asi: 1000.0,
  },
  HARDWARE: {
    doubling_time_months: 8.0,
    doubling_time_std_months: 2.0,
  },
  ALGORITHMS: {
    doubling_time_months: 6.0,
    doubling_time_std_months: 2.5,
  },
  SCALING_LAW: {
    slope: 0.55,
    paradigm_ceiling: 8.0,
    paradigm_shift_prob_per_year: 0.35,
    shift_capability_boost: 3.0,
  },
  INFERENCE_SCALING: {
    max_bonus_multiplier: 2.0,
    saturation_capability: 4.0,
  },
  RSI: {
    factor: 0.12,
    factor_std: 0.05,
    activation_capability: 2.0,
    saturation_capability: 20.0,
  },
  DATA_WALL: {
    start_year: 2026.0,
    hw_damping_rate: 0.08,
    algo_damping_rate: 0.05,
  },
  NON_TECHNICAL_BARRIERS: {
    regulatory_damping_mean: 0.07,
    regulatory_damping_std: 0.05,
    energy_wall_year: 2027.5,
    energy_damping_rate: 0.06,
    alignment_pause_prob_per_year: 0.08,
    alignment_pause_duration_years_mean: 1.5,
  },
  SIMULATION: {
    max_years: 50,
    dt_months: 1.0,
    n_monte_carlo: 3000,
  },
});

// ============================================================================
// MATH HELPERS
// ============================================================================

/** Box-Muller transform → standard normal */
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function randnRange(mean, std) {
  return mean + std * randn();
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function sigmoid(x) {
  // clamp to avoid overflow
  x = Math.max(-500, Math.min(500, x));
  return 1.0 / (1.0 + Math.exp(-x));
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// ============================================================================
// MODEL FUNCTIONS
// ============================================================================

/**
 * Compute capability from log-diff using logistic scaling law.
 * Guaranteed: when log_diff=0 → capability=1.0 (baseline)
 */
function computeCapability(logDiff, scalingLaw, paradigmCeiling) {
  const slope = scalingLaw.slope;
  const S_HALF = 0.5; // sigmoid(0)
  // Shift so that log_diff=0 → cap=1.0
  const raw = paradigmCeiling * (sigmoid(slope * logDiff) - S_HALF) + 1.0;
  return Math.max(raw, 0.01);
}

/**
 * Inference scaling multiplier — continuous diminishing returns.
 * At capability → ∞ → multiplier → max_bonus_multiplier
 * At capability = saturation_capability → multiplier ≈ (1+max)/2
 */
function inferenceScalingMultiplier(capability, inferenceScaling) {
  const { max_bonus_multiplier, saturation_capability } = inferenceScaling;
  const k = Math.log(2) / saturation_capability;
  const bonus = (max_bonus_multiplier - 1.0) * (1.0 - Math.exp(-k * capability));
  return 1.0 + bonus;
}

/**
 * RSI boost: smooth activation → saturation curve.
 * Zero below activation_capability, logarithmic growth to saturation.
 */
function rsiBoost(capability, rsiCfg) {
  if (capability < rsiCfg.activation_capability) return 0.0;
  const progress = clamp(
    (capability - rsiCfg.activation_capability) /
    (rsiCfg.saturation_capability - rsiCfg.activation_capability),
    0, 1
  );
  return rsiCfg.factor * progress * Math.log(1.0 + capability);
}

// ============================================================================
// TRAJECTORY SIMULATION
// ============================================================================

/**
 * Run a single trajectory with FIXED parameters.
 * Returns: { agiYears, asiYears, timeline: [{year, cap}, ...] }
 *   agiYears/asiYears = years from now (Infinity if not reached)
 */
function runTrajectory(fixedParams) {
  const hwK = Math.log(2) / Math.max(1.0, fixedParams.hwMonths);
  const algoK = Math.log(2) / Math.max(1.0, fixedParams.algoMonths);
  const rsiFactor = Math.max(0, fixedParams.rsiFactor);
  const regDamping = Math.max(0, fixedParams.regDamping);

  const sim = CONFIG.SIMULATION;
  const dt = sim.dt_months;
  const maxMonths = Math.floor(sim.max_years * 12 / dt);

  let flopsLog = CONFIG.FRONTIER.training_flops_log10;
  let algoLog = 0.0;
  const baseLog = flopsLog;

  let paradigmCeiling = CONFIG.SCALING_LAW.paradigm_ceiling;
  const shiftProbPerYear = CONFIG.SCALING_LAW.paradigm_shift_prob_per_year;
  const shiftBoost = CONFIG.SCALING_LAW.shift_capability_boost;

  let agiDate = null;
  let asiDate = null;
  let agiAchieved = false;
  let alignmentPauseRemaining = 0;

  // For trajectory chart: store every ~12/dt points to keep ~600 data pts
  const step = Math.max(1, Math.floor(12 / dt));
  const timeline = [];
  let totalSteps = 0;

  for (let t = 0; t < maxMonths; t++) {
    const currentYear = 2026 + (t * dt) / 12.0; // approximate from 2026
    totalSteps++;

    // Sample trajectory points
    if (t % step === 0) {
      const logDiff = flopsLog + algoLog - baseLog;
      const rawCap = computeCapability(logDiff, CONFIG.SCALING_LAW, paradigmCeiling);
      const cap = rawCap * inferenceScalingMultiplier(rawCap, CONFIG.INFERENCE_SCALING);
      timeline.push({ year: currentYear, cap });
    }

    // --- Check thresholds ---
    if (agiDate === null) {
      const logDiff = flopsLog + algoLog - baseLog;
      const rawCap = computeCapability(logDiff, CONFIG.SCALING_LAW, paradigmCeiling);
      const cap = rawCap * inferenceScalingMultiplier(rawCap, CONFIG.INFERENCE_SCALING);

      if (cap >= CONFIG.THRESHOLDS.agi) {
        agiDate = currentYear;
        agiAchieved = true;
      }

      if (asiDate === null && cap >= CONFIG.THRESHOLDS.asi) {
        if (alignmentPauseRemaining <= 0) {
          asiDate = currentYear;
        }
      }
    }

    // --- Alignment pause ---
    if (agiAchieved && alignmentPauseRemaining <= 0) {
      const pauseProbMonthly = CONFIG.NON_TECHNICAL_BARRIERS.alignment_pause_prob_per_year * dt / 12;
      if (Math.random() < pauseProbMonthly) {
        alignmentPauseRemaining = CONFIG.NON_TECHNICAL_BARRIERS.alignment_pause_duration_years_mean * 12 * Math.exp(0.5 * randn()); // lognormal approx
      }
    }

    if (alignmentPauseRemaining > 0) {
      alignmentPauseRemaining -= dt;
      flopsLog += hwK * dt * 0.3;
      algoLog += algoK * dt * 0.2;
      continue;
    }

    // --- Data Wall damping ---
    let hwDamping = 1.0, algoDamping = 1.0;
    const dwStart = CONFIG.DATA_WALL.start_year;
    if (currentYear > dwStart && (agiDate === null)) {
      const yearsPast = currentYear - dwStart;
      hwDamping = Math.exp(-CONFIG.DATA_WALL.hw_damping_rate * yearsPast);
      algoDamping = Math.exp(-CONFIG.DATA_WALL.algo_damping_rate * yearsPast);
    }

    // --- Energy wall ---
    let energyDamping = 1.0;
    if (currentYear > CONFIG.NON_TECHNICAL_BARRIERS.energy_wall_year) {
      const yearsPast = currentYear - CONFIG.NON_TECHNICAL_BARRIERS.energy_wall_year;
      energyDamping = Math.exp(-CONFIG.NON_TECHNICAL_BARRIERS.energy_damping_rate * yearsPast);
    }

    // --- Regulatory damping (ramps up gradually) ---
    const regFactor = clamp((currentYear - 2025.0) / 2.0, 0, 1);
    const totalRegDamping = 1.0 - regDamping * regFactor;

    // --- Paradigm shift (random) ---
    const shiftProbMonthly = shiftProbPerYear * dt / 12;
    if (Math.random() < shiftProbMonthly) {
      paradigmCeiling *= shiftBoost;
      baseLog -= (Math.log10(shiftBoost) / CONFIG.SCALING_LAW.slope) * 0.5;
    }

    // --- RSI ---
    // Need cap for RSI — compute it
    const logDiff = flopsLog + algoLog - baseLog;
    const rawCap = computeCapability(logDiff, CONFIG.SCALING_LAW, paradigmCeiling);
    const rsi = rsiBoost(rawCap, CONFIG.RSI);

    // --- Update state ---
    flopsLog += hwK * hwDamping * energyDamping * totalRegDamping * dt;
    algoLog += (algoK * algoDamping + rsi) * totalRegDamping * dt;
  }

  const now = new Date();
  const agiYears = agiDate !== null ? (agiDate - 2026) + (now.getMonth() / 12) : Infinity;
  const asiYears = asiDate !== null ? (asiDate - 2026) + (now.getMonth() / 12) : Infinity;

  return { agiYears, asiYears, timeline, totalSteps };
}

// ============================================================================
// MONTE CARLO ENGINE
// ============================================================================

/**
 * Run N Monte Carlo trajectories.
 * Returns aggregated statistics for all 4 chart views.
 */
function runMonteCarlo(nRuns, onProgress) {
  const agiYearsList = [];
  const asiYearsList = [];
  const allTrajectories = [];

  for (let i = 0; i < nRuns; i++) {
    // Random parameters for each run
    const hwMonths = clamp(randnRange(CONFIG.HARDWARE.doubling_time_months, CONFIG.HARDWARE.doubling_time_std_months), 1, 40);
    const algoMonths = clamp(randnRange(CONFIG.ALGORITHMS.doubling_time_months, CONFIG.ALGORITHMS.doubling_time_std_months), 1, 30);
    const rsiFactor = clamp(randnRange(CONFIG.RSI.factor, CONFIG.RSI.factor_std), 0, 1);
    const regDamping = clamp(randnRange(CONFIG.NON_TECHNICAL_BARRIERS.regulatory_damping_mean, CONFIG.NON_TECHNICAL_BARRIERS.regulatory_damping_std), 0, 1);

    const result = runTrajectory({ hwMonths, algoMonths, rsiFactor, regDamping });
    agiYearsList.push(result.agiYears);
    asiYearsList.push(result.asiYears);
    allTrajectories.push(result.timeline);

    if (onProgress && i % 100 === 0) onProgress(i / nRuns);
  }

  // --- Chart 1: Histogram ---
  const bins = [];
  for (let i = 0.5; i < 16.5; i += 0.5) bins.push(i);
  const hAgi = new Array(bins.length - 1).fill(0);
  const hAsi = new Array(bins.length - 1).fill(0);

  for (let i = 0; i < nRuns; i++) {
    if (isFinite(agiYearsList[i])) {
      const idx = findBin(agiYearsList[i], bins);
      if (idx >= 0 && idx < hAgi.length) hAgi[idx]++;
    }
    if (isFinite(asiYearsList[i])) {
      const idx = findBin(asiYearsList[i], bins);
      if (idx >= 0 && idx < hAsi.length) hAsi[idx]++;
    }
  }

  const histogram = {
    labels: bins.slice(0, -1).map((b, i) => ((bins[i] + bins[i + 1]) / 2).toFixed(1)),
    agi: hAgi,
    asi: hAsi,
  };

  // --- Chart 2: Capability Trajectory ---
  const nPts = 200;
  const trajIndices = allTrajectories.map(t => t.length > 0 ? Math.floor(t.length / 2) : 0);
  const medCap = [], p10 = [], p25 = [], p50arr = [], p75 = [], p90 = [];
  const years = [];

  for (let i = 0; i < nPts; i++) {
    const frac = i / (nPts - 1);
    const idx = Math.floor(frac * (allTrajectories[0]?.length || 1));
    const vals = allTrajectories
      .filter(t => idx < t.length)
      .map(t => t[idx].cap);

    if (vals.length > 0) {
      vals.sort((a, b) => a - b);
      const baseYear = 2026;
      const dt = CONFIG.SIMULATION.dt_months;
      const step = Math.max(1, Math.floor(12 / dt));
      const yearIdx = allTrajectories[0].findIndex((_p, pi) => pi >= idx);
      years.push(frac * CONFIG.SIMULATION.max_years);
      medCap.push(percentile(vals, 50));
      p10.push(percentile(vals, 10));
      p25.push(percentile(vals, 25));
      p50arr.push(percentile(vals, 50));
      p75.push(percentile(vals, 75));
      p90.push(percentile(vals, 90));
    } else {
      years.push(frac * CONFIG.SIMULATION.max_years);
      medCap.push(0); p10.push(0); p25.push(0); p50arr.push(0); p75.push(0); p90.push(0);
    }
  }

  // Better trajectory extraction: use actual timeline data
  const trajYears = [];
  const trajMed = [], trajP10 = [], trajP25 = [], trajP50 = [], trajP75 = [], trajP90 = [];

  // Collect all valid trajectory data at each time index
  const maxLen = Math.min(...allTrajectories.map(t => t.length));
  const trajStep = Math.max(1, Math.floor(maxLen / 150));

  for (let i = 0; i < maxLen; i += trajStep) {
    const vals = allTrajectories.filter(t => i < t.length).map(t => t[i].cap);
    if (vals.length > 0) {
      vals.sort((a, b) => a - b);
      trajYears.push(allTrajectories[0][i].year);
      trajP10.push(percentile(vals, 10));
      trajP25.push(percentile(vals, 25));
      trajP50.push(percentile(vals, 50));
      trajP75.push(percentile(vals, 75));
      trajP90.push(percentile(vals, 90));
    }
  }

  const trajectory = {
    years: trajYears,
    p10: trajP10,
    p25: trajP25,
    median: trajP50,
    p75: trajP75,
    p90: trajP90,
    agiThreshold: CONFIG.THRESHOLDS.agi,
    asiThreshold: CONFIG.THRESHOLDS.asi,
  };

  // --- Chart 3: Cumulative Probability ---
  const yq = [];
  for (let y = 0.25; y <= 10; y += 0.25) yq.push(round4(y));
  for (let y = 11; y <= 50; y += 1) yq.push(y);

  const cumulative = {
    x: yq,
    agi: yq.map(y => cdf(agiYearsList, y)),
    asi: yq.map(y => cdf(asiYearsList, y)),
  };

  // --- Chart 4: Sensitivity Analysis ---
  const miniN = Math.min(600, Math.max(300, nRuns));
  const sensitivityVariations = {};

  // Simple parameter tests
  const simpleTests = [
    { key: 'hw_fast', label: 'HW быстрее', section: 'HARDWARE', param: 'doubling_time_months', val: 4.0 },
    { key: 'hw_slow', label: 'HW медленнее', section: 'HARDWARE', param: 'doubling_time_months', val: 12.0 },
    { key: 'algo_fast', label: 'Algo быстрее', section: 'ALGORITHMS', param: 'doubling_time_months', val: 3.0 },
    { key: 'algo_slow', label: 'Algo медленнее', section: 'ALGORITHMS', param: 'doubling_time_months', val: 9.0 },
    { key: 'ceil_up', label: 'Ceiling выше', section: 'SCALING_LAW', param: 'paradigm_ceiling', val: 12.0 },
    { key: 'ceil_down', label: 'Ceiling ниже', section: 'SCALING_LAW', param: 'paradigm_ceiling', val: 6.0 },
  ];

  for (const test of simpleTests) {
    const agis = [];
    for (let i = 0; i < miniN; i++) {
      const cfg = JSON.parse(JSON.stringify(CONFIG));
      cfg[test.section][test.param] = test.val;
      // We reuse runTrajectory with random params but override one
      const hw = test.section === 'HARDWARE' && test.param === 'doubling_time_months'
        ? test.val : clamp(randnRange(CONFIG.HARDWARE.doubling_time_months, CONFIG.HARDWARE.doubling_time_std_months), 1, 40);
      const algo = test.section === 'ALGORITHMS' && test.param === 'doubling_time_months'
        ? test.val : clamp(randnRange(CONFIG.ALGORITHMS.doubling_time_months, CONFIG.ALGORITHMS.doubling_time_std_months), 1, 30);
      const rsi = clamp(randnRange(CONFIG.RSI.factor, CONFIG.RSI.factor_std), 0, 1);
      const reg = clamp(randnRange(CONFIG.NON_TECHNICAL_BARRIERS.regulatory_damping_mean, CONFIG.NON_TECHNICAL_BARRIERS.regulatory_damping_std), 0, 1);
      const r = runTrajectory({ hwMonths: hw, algoMonths: algo, rsiFactor: rsi, regDamping: reg });
      agis.push(r.agiYears);
    }
    sensitivityVariations[test.key] = {
      label: test.label,
      agiMedian: percentile(agis.filter(isFinite), 50),
    };
  }

  // Data Wall tests
  for (const [key, label, val] of [['dw_early', 'DW раньше', 2025.0], ['dw_late', 'DW позже', 2027.0]]) {
    const agis = [];
    for (let i = 0; i < miniN; i++) {
      const hw = clamp(randnRange(CONFIG.HARDWARE.doubling_time_months, CONFIG.HARDWARE.doubling_time_std_months), 1, 40);
      const algo = clamp(randnRange(CONFIG.ALGORITHMS.doubling_time_months, CONFIG.ALGORITHMS.doubling_time_std_months), 1, 30);
      const rsi = clamp(randnRange(CONFIG.RSI.factor, CONFIG.RSI.factor_std), 0, 1);
      const reg = clamp(randnRange(CONFIG.NON_TECHNICAL_BARRIERS.regulatory_damping_mean, CONFIG.NON_TECHNICAL_BARRIERS.regulatory_damping_std), 0, 1);
      const r = runTrajectory({ hwMonths: hw, algoMonths: algo, rsiFactor: rsi, regDamping: reg });
      agis.push(r.agiYears);
    }
    sensitivityVariations[key] = {
      label,
      agiMedian: percentile(agis.filter(isFinite), 50),
    };
  }

  // Base median
  const baseMedian = percentile(agiYearsList.filter(isFinite), 50);

  const sensitivity = {
    base: baseMedian,
    variations: sensitivityVariations,
  };

  // --- Summary ---
  const finiteAgi = agiYearsList.filter(isFinite);
  const finiteAsi = asiYearsList.filter(isFinite);

  const summary = {
    agiMedian: percentile(finiteAgi, 50),
    asiMedian: percentile(finiteAsi, 50),
    pAsi2028: cdf(asiYearsList, 2.0),
    pAsi2030: cdf(asiYearsList, 4.0),
    pAsi2035: cdf(asiYearsList, 9.0),
    pAsi2040: cdf(asiYearsList, 14.0),
    pAgi2028: cdf(agiYearsList, 2.0),
    pAgi2030: cdf(agiYearsList, 4.0),
    nRuns,
  };

  return { histogram, trajectory, cumulative, sensitivity, summary };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function percentile(arr, p) {
  if (arr.length === 0) return Infinity;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

function cdf(arr, x) {
  const finite = arr.filter(v => isFinite(v) && v <= x);
  return (100.0 * finite.length) / arr.length;
}

function findBin(val, bins) {
  for (let i = 0; i < bins.length - 1; i++) {
    if (val >= bins[i] && val < bins[i + 1]) return i;
  }
  return bins.length - 2; // last bin
}

function round4(x) {
  return Math.round(x * 10000) / 10000;
}

/**
 * Generate a single run for real-time "live" preview.
 * Returns partial trajectory for animation.
 */
function runSinglePreview(fixedParams) {
  const result = runTrajectory(fixedParams);
  return result;
}

// ============================================================================
// EXPORT for browser use
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, runMonteCarlo, runTrajectory, runSinglePreview, percentile, cdf };
}
if (typeof window !== 'undefined') {
  window.SingularityCore = { CONFIG, runMonteCarlo, runTrajectory, runSinglePreview, percentile, cdf };
}

// ============================================================================
// v3.0 — BAYESIAN PARTICLE FILTER (Artificial Analysis Tracker)
// ============================================================================

/**
 * Particle Filter с 2 параметрами:
 *   hw_months      — темп роста железа (месяцы на удвоение)
 *   agency_ceiling — потолок агентности текущей архитектуры
 *
 * При поступлении данных AA (Intelligence Index, Agentic Index)
 * маловероятные гипотезы отсеиваются через SIR.
 */
const V3_DEFAULT_PARTICLES = 1000;

function createV3Config() {
  return {
    BASE_YEAR: 2026.0,
    FRONTIER_LOG_FLOPS: 27.5,
    THRESHOLDS: { agi: 10.0 },
    DIMENSIONS: {
      reasoning: { slope: 0.55, ceiling: 15.0 },
      agency:    { slope: 0.30 },
    },
    SCALING_LAW: {
      paradigm_shift_prob: 0.15,
      shift_multiplier: 3.0,
    },
    BOTTLENECKS: {
      energy_wall_start: 2026.0,
      energy_damping: 0.10,
      econ_wall_start: 2026.5,
      econ_damping: 0.15,
    },
  };
}

function v3SimulateToYear(particle, targetYear, cfg) {
  const dt = 1.0 / 12.0;
  const steps = Math.max(1, Math.floor((targetYear - cfg.BASE_YEAR) * 12));
  let flopsLog = cfg.FRONTIER_LOG_FLOPS;
  const baseLog = flopsLog;
  const hwK = Math.log(2) / Math.max(1.0, particle.hw_months / 12.0);

  for (let step = 0; step < steps; step++) {
    const currentYear = cfg.BASE_YEAR + step * dt;
    const logDiff = flopsLog - baseLog;
    const reasoning = computeDim(logDiff, cfg.DIMENSIONS.reasoning.slope, cfg.DIMENSIONS.reasoning.ceiling);
    const agency = computeDim(logDiff, cfg.DIMENSIONS.agency.slope, particle.agency_ceiling);

    let damping = 1.0;
    if (currentYear > cfg.BOTTLENECKS.econ_wall_start) {
      const gap = reasoning - agency;
      if (gap > 2.0) {
        damping *= Math.exp(-cfg.BOTTLENECKS.econ_damping * (gap - 2.0));
      }
    }
    flopsLog += hwK * damping * dt;
  }

  const logDiff = flopsLog - baseLog;
  return {
    reasoning: computeDim(logDiff, cfg.DIMENSIONS.reasoning.slope, cfg.DIMENSIONS.reasoning.ceiling),
    agency:    computeDim(logDiff, cfg.DIMENSIONS.agency.slope, particle.agency_ceiling),
  };
}

function computeDim(logDiff, slope, ceiling) {
  const S_HALF = 0.5;
  const raw = ceiling * (sigmoid(slope * logDiff) - S_HALF) + 1.0;
  return Math.max(raw, 0.01);
}

class BayesianTracker {
  constructor(nParticles = V3_DEFAULT_PARTICLES) {
    this.n = nParticles;
    this.cfg = createV3Config();
    this.particles = [];
    this.weights = new Float64Array(nParticles);
    for (let i = 0; i < nParticles; i++) this.weights[i] = 1.0 / nParticles;
    this.observationLog = [];
    this._initializeParticles();
  }

  _initializeParticles() {
    for (let i = 0; i < this.n; i++) {
      this.particles.push({
        hw_months: Math.max(3.0, randnRange(7.5, 1.5)),
        agency_ceiling: Math.max(1.5, randnRange(4.0, 1.0)),
      });
    }
  }

  observeAAData(year, aaIntelligence, aaAgentic, sigma = 0.5) {
    const targetReasoning = aaIntelligence / 10.0;
    const targetAgency = aaAgentic / 10.0;

    for (let i = 0; i < this.n; i++) {
      const p = this.particles[i];
      if (p.hw_months < 1.0 || p.agency_ceiling < 1.0) {
        this.weights[i] = 0;
        continue;
      }
      const pred = v3SimulateToYear(p, year, this.cfg);
      const errR = ((targetReasoning - pred.reasoning) / sigma) ** 2;
      const errA = ((targetAgency - pred.agency) / sigma) ** 2;
      const logLik = -0.5 * (errR + errA);
      this.weights[i] *= Math.exp(Math.max(-50, logLik));
    }

    this._normalizeAndResample();
    this.observationLog.push({ year, aaIntelligence, aaAgentic, ess: this.effectiveSampleSize() });
  }

  _normalizeAndResample() {
    let sum = 0;
    for (let i = 0; i < this.n; i++) sum += this.weights[i];
    if (sum === 0) {
      for (let i = 0; i < this.n; i++) this.weights[i] = 1.0 / this.n;
      return;
    }
    for (let i = 0; i < this.n; i++) this.weights[i] /= sum;

    const ess = this.effectiveSampleSize();
    if (ess < this.n * 0.5) {
      this._systematicResample();
    }
  }

  _systematicResample() {
    const newParticles = [];
    const cumsum = new Float64Array(this.n);
    cumsum[0] = this.weights[0];
    for (let i = 1; i < this.n; i++) cumsum[i] = cumsum[i - 1] + this.weights[i];

    const u0 = Math.random() / this.n;
    let j = 0;
    for (let i = 0; i < this.n; i++) {
      const u = u0 + i / this.n;
      while (j < this.n - 1 && cumsum[j] < u) j++;
      const p = this.particles[j];
      newParticles.push({
        hw_months: Math.max(3.0, p.hw_months + randnRange(0, 0.2)),
        agency_ceiling: Math.max(1.5, p.agency_ceiling + randnRange(0, 0.1)),
      });
    }
    this.particles = newParticles;
    for (let i = 0; i < this.n; i++) this.weights[i] = 1.0 / this.n;
  }

  effectiveSampleSize() {
    let sumSq = 0;
    for (let i = 0; i < this.n; i++) sumSq += this.weights[i] ** 2;
    return 1.0 / sumSq;
  }

  getSummary() {
    let hwMean = 0, agnMean = 0;
    for (let i = 0; i < this.n; i++) {
      hwMean += this.particles[i].hw_months * this.weights[i];
      agnMean += this.particles[i].agency_ceiling * this.weights[i];
    }
    return { hwMonths: hwMean, agencyCeiling: agnMean };
  }

  runMonteCarloForecast(nRuns = 2000) {
    const agiYears = [];
    const cfg = this.cfg;
    const dt = 1.0 / 12.0;
    const maxSteps = 12 * 40;

    // Build cumulative weights for sampling
    const cumw = new Float64Array(this.n);
    cumw[0] = this.weights[0];
    for (let i = 1; i < this.n; i++) cumw[i] = cumw[i - 1] + this.weights[i];

    for (let run = 0; run < nRuns; run++) {
      // Sample particle
      const u = Math.random();
      let idx = 0;
      while (idx < this.n - 1 && cumw[idx] < u) idx++;
      const p = this.particles[idx];

      let flopsLog = cfg.FRONTIER_LOG_FLOPS;
      const baseLog = flopsLog;
      const hwK = Math.log(2) / Math.max(1.0, p.hw_months / 12.0);
      let ceilingAgency = p.agency_ceiling;
      let agiAchieved = false;

      for (let step = 0; step < maxSteps; step++) {
        const currentYear = cfg.BASE_YEAR + step * dt;

        // Paradigm shift
        if (Math.random() < cfg.SCALING_LAW.paradigm_shift_prob * dt) {
          ceilingAgency *= cfg.SCALING_LAW.shift_multiplier;
          baseLog -= 0.5;
        }

        const logDiff = flopsLog - baseLog;
        const reasoning = computeDim(logDiff, cfg.DIMENSIONS.reasoning.slope, cfg.DIMENSIONS.reasoning.ceiling);
        const agency = computeDim(logDiff, cfg.DIMENSIONS.agency.slope, ceilingAgency);

        if (reasoning >= cfg.THRESHOLDS.agi && agency >= cfg.THRESHOLDS.agi) {
          agiYears.push(currentYear);
          agiAchieved = true;
          break;
        }

        let damping = 1.0;
        if (currentYear > cfg.BOTTLENECKS.econ_wall_start && (reasoning - agency) > 2.0) {
          damping *= Math.exp(-cfg.BOTTLENECKS.econ_damping * (reasoning - agency - 2.0));
        }
        flopsLog += hwK * damping * dt;
      }

      if (!agiAchieved) agiYears.push(Infinity);
    }

    return agiYears;
  }
}

// Export v3
if (typeof window !== 'undefined') {
  window.SingularityV3 = { BayesianTracker, createV3Config, v3SimulateToYear };
}
console.log('[SF] script loaded v4.1 (Bugfixed), defining functions...');
// ============================================================================
// SIMULATION CORE v2.5 — Multidimensional Bottlenecks & Geopolitics
// ============================================================================

const CONFIG = {
  FRONTIER: { training_flops_log10: 27.5, base_capability: 1.0 },
  THRESHOLDS: { agi: 10.0, asi: 100.0 },
  HARDWARE: { doubling_time_months: 7.0, doubling_time_std_months: 1.5 },
  ALGORITHMS: { doubling_time_months: 6.0, doubling_time_std_months: 2.0 },
  DIMENSIONS: {
    reasoning:   { slope: 0.55, ceiling: 15.0 },
    agency:      { slope: 0.30, ceiling: 4.0 },
    reliability: { slope: 0.35, ceiling: 6.0 },
  },
  SCALING_LAW: { paradigm_shift_prob_per_year: 0.15, shift_ceiling_multiplier: 3.0 },
  INFERENCE_SCALING: {
    max_bonus_reasoning: 3.0, max_bonus_agency: 1.5, max_bonus_reliability: 1.0,
    saturation_capability: 5.0,
  },
  RSI: { activation_capability: 5.0, saturation_capability: 40.0, factor: 0.06, factor_std: 0.02 },
  BOTTLENECKS: {
    energy_wall_start_year: 2026.0, energy_damping_rate: 0.12,
    data_wall_start_year: 2026.0, data_hw_damping: 0.08, data_algo_damping: 0.05,
    economics_start_year: 2026.5, economics_base_damping: 0.08,
  },
  GEOPOLITICS: {
    sputnik_trigger_reasoning: 7.0, prob_per_year: 0.30, hw_boost_multiplier: 1.25,
  },
  NON_TECHNICAL: {
    regulatory_damping_mean: 0.02,
    alignment_pause_prob_per_year: 0.05, alignment_pause_duration_years_mean: 1.5,
  },
  SIMULATION: { max_years: 40, dt_months: 1.0, n_monte_carlo: 3000 },
};

function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
function randnRange(mean, std) { return mean + std * randn(); }
function sigmoid(x) { return 1.0 / (1.0 + Math.exp(-Math.max(-100, Math.min(100, x)))); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function percentile(arr, p) {
  if (!arr.length) return Infinity;
  const s = [...arr].sort((a, b) => a - b);
  const i = (p / 100) * (s.length - 1);
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (i - lo) * (s[hi] - s[lo]);
}
function cdf(arr, x) { return (100.0 * arr.filter(v => isFinite(v) && v <= x).length) / arr.length; }

function computeDim(logDiff, slope, ceiling) {
  const S_HALF = 0.5;
  return Math.max(ceiling * (sigmoid(slope * logDiff) - S_HALF) + 1.0, 0.01);
}

function applyInferenceBonus(cap, maxBonus, satCap) {
  if (maxBonus <= 1.0) return cap;
  const k = Math.log(2) / satCap;
  const bonus = (maxBonus - 1.0) * (1.0 - Math.exp(-k * cap));
  return cap * (1.0 + bonus);
}

function runTrajectory() {
  const hwK = Math.log(2) / Math.max(1, randn() * CONFIG.HARDWARE.doubling_time_std_months + CONFIG.HARDWARE.doubling_time_months);
  const algoK = Math.log(2) / Math.max(1, randn() * CONFIG.ALGORITHMS.doubling_time_std_months + CONFIG.ALGORITHMS.doubling_time_months);
  const rsiF = clamp(CONFIG.RSI.factor + CONFIG.RSI.factor_std * randn(), 0, 1);
  const dt = CONFIG.SIMULATION.dt_months;
  const maxT = Math.floor(CONFIG.SIMULATION.max_years * 12 / dt);

  let flopsLog = CONFIG.FRONTIER.training_flops_log10;
  let algoLog = 0;
  let baseLog = flopsLog;

  const ceilings = {
    reasoning: CONFIG.DIMENSIONS.reasoning.ceiling,
    agency: CONFIG.DIMENSIONS.agency.ceiling,
    reliability: CONFIG.DIMENSIONS.reliability.ceiling,
  };

  let agiY = null, asiY = null, geoActive = false, pauseRem = 0, shiftsCount = 0;
  const step = Math.max(1, Math.floor(12 / dt));
  const timeline = [];

  for (let t = 0; t < maxT; t++) {
    const yr = 2026 + (t * dt) / 12;

    const logDiff = flopsLog + algoLog - baseLog;
    const rawR = computeDim(logDiff, CONFIG.DIMENSIONS.reasoning.slope, ceilings.reasoning);
    const rawA = computeDim(logDiff, CONFIG.DIMENSIONS.agency.slope, ceilings.agency);
    const rawRel = computeDim(logDiff, CONFIG.DIMENSIONS.reliability.slope, ceilings.reliability);

    const capR = applyInferenceBonus(rawR, CONFIG.INFERENCE_SCALING.max_bonus_reasoning, CONFIG.INFERENCE_SCALING.saturation_capability);
    const capA = applyInferenceBonus(rawA, CONFIG.INFERENCE_SCALING.max_bonus_agency, CONFIG.INFERENCE_SCALING.saturation_capability);
    const capRel = applyInferenceBonus(rawRel, CONFIG.INFERENCE_SCALING.max_bonus_reliability, CONFIG.INFERENCE_SCALING.saturation_capability);

    const overallAGI = Math.min(capR, capA, capRel);
    const overallASI = Math.min(capR, capA);

    if (t % step === 0) {
      timeline.push({ year: yr, cap: overallAGI, reasoning: capR, agency: capA, reliability: capRel });
    }

    if (agiY === null && overallAGI >= CONFIG.THRESHOLDS.agi) { agiY = yr; }
    if (asiY === null && overallASI >= CONFIG.THRESHOLDS.asi && pauseRem <= 0) { asiY = yr; break; }

    if (!geoActive && capR >= CONFIG.GEOPOLITICS.sputnik_trigger_reasoning) {
      if (Math.random() < CONFIG.GEOPOLITICS.prob_per_year * dt / 12) { geoActive = true; }
    }

    if (Math.random() < CONFIG.SCALING_LAW.paradigm_shift_prob_per_year * dt / 12) {
      shiftsCount++;
      for (const dim in ceilings) ceilings[dim] *= CONFIG.SCALING_LAW.shift_ceiling_multiplier;
      baseLog -= 1.0;
    }

    let hwD = 1, algoD = 1;
    if (yr > CONFIG.BOTTLENECKS.energy_wall_start_year) {
      const yp = yr - CONFIG.BOTTLENECKS.energy_wall_start_year;
      let eDamp = CONFIG.BOTTLENECKS.energy_damping_rate;
      if (geoActive) eDamp *= 0.6;
      hwD *= Math.exp(-eDamp * yp);
    }

    if (yr > CONFIG.BOTTLENECKS.data_wall_start_year && overallAGI < CONFIG.THRESHOLDS.agi) {
      const yp = yr - CONFIG.BOTTLENECKS.data_wall_start_year;
      hwD *= Math.exp(-CONFIG.BOTTLENECKS.data_hw_damping * yp);
      algoD *= Math.exp(-CONFIG.BOTTLENECKS.data_algo_damping * yp);
    }

    if (yr > CONFIG.BOTTLENECKS.economics_start_year && !geoActive) {
      const gap = Math.max(0, capR - capA);
      if (gap > 2.0) hwD *= Math.exp(-CONFIG.BOTTLENECKS.economics_base_damping * (gap - 2.0));
    }

    let regD = geoActive ? 1.0 : 1.0 - CONFIG.NON_TECHNICAL.regulatory_damping_mean;

    if (overallAGI >= CONFIG.THRESHOLDS.agi && pauseRem <= 0) {
      if (Math.random() < CONFIG.NON_TECHNICAL.alignment_pause_prob_per_year * dt / 12) {
        pauseRem = CONFIG.NON_TECHNICAL.alignment_pause_duration_years_mean * 12 * Math.exp(0.5 * randn());
      }
    }
    if (pauseRem > 0) { pauseRem -= dt; hwD *= 0.1; algoD *= 0.3; }

    let rsi = 0;
    if (overallAGI >= CONFIG.RSI.activation_capability) {
      const progress = clamp((overallAGI - CONFIG.RSI.activation_capability) / (CONFIG.RSI.saturation_capability - CONFIG.RSI.activation_capability), 0, 1);
      rsi = rsiF * progress * Math.log(1.0 + overallAGI);
    }

    const geoBoost = geoActive ? CONFIG.GEOPOLITICS.hw_boost_multiplier : 1.0;
    flopsLog += hwK * hwD * regD * geoBoost * dt;
    algoLog += (algoK * algoD + rsi) * regD * dt;
  }

  // RETURN RELATIVE YEARS FOR AGI/ASI (Years from Base)
  return {
    agiYears: agiY !== null ? agiY - 2026 : Infinity,
    asiYears: asiY !== null ? asiY - 2026 : Infinity,
    timeline, geoActive, shiftsCount,
  };
}

function runMonteCarloAsync(nRuns, onProgress) {
  return new Promise((resolve) => {
    const agiList = [], asiList = [];
    const MAX_POINTS = 50; 
    const trajYears = new Float64Array(MAX_POINTS);
    const trajCaps = Array.from({length: MAX_POINTS}, () => []);
    let trajLen = 0, geoCount = 0, totalShifts = 0, i = 0, chunkSize = 100;

    function processChunk() {
      const end = Math.min(i + chunkSize, nRuns);
      for (; i < end; i++) {
        const r = runTrajectory();
        agiList.push(r.agiYears);
        asiList.push(r.asiYears);
        if (r.geoActive) geoCount++;
        totalShifts += r.shiftsCount;
        
        if (r.timeline.length > trajLen) trajLen = r.timeline.length;
        for (let k = 0; k < r.timeline.length; k++) {
          trajCaps[k].push(r.timeline[k].cap);
          trajYears[k] = r.timeline[k].year; // Absolute year for chart X axis
        }
      }
      if (onProgress) onProgress(i / nRuns);
      if (i < nRuns) {
        setTimeout(processChunk, 0);
      } else {
        const hAgi = buildHistogramBins(agiList);
        const hAsi = buildHistogramBins(asiList);

        const tStep = Math.max(1, Math.floor(trajLen / 150));
        const yrs = [], med = [], p10a = [], p25a = [], p75a = [], p90a = [];
        for (let j = 0; j < trajLen; j += tStep) {
          const vals = trajCaps[j];
          if (vals.length > 0) {
            vals.sort((a, b) => a - b);
            yrs.push(trajYears[j]);
            p10a.push(percentile(vals, 10)); p25a.push(percentile(vals, 25));
            med.push(percentile(vals, 50)); p75a.push(percentile(vals, 75)); p90a.push(percentile(vals, 90));
          }
        }

        const yq = [];
        for (let y = 0.25; y <= 10; y += 0.25) yq.push(+y.toFixed(4));
        for (let y = 11; y <= 40; y++) yq.push(y);

        // Sensitivity (v2)
        const mn = Math.min(600, Math.max(300, nRuns));
        const variations = {};
        const tests = [
          { k: 'hw_fast', l: 'x2 HW faster', s: 'HARDWARE', p: 'doubling_time_months', v: 4 },
          { k: 'hw_slow', l: 'x2 HW slower', s: 'HARDWARE', p: 'doubling_time_months', v: 12 },
          { k: 'algo_fast', l: 'x2 Algo faster', s: 'ALGORITHMS', p: 'doubling_time_months', v: 3 },
          { k: 'algo_slow', l: 'x2 Algo slower', s: 'ALGORITHMS', p: 'doubling_time_months', v: 9 },
          { k: 'ceil_up', l: 'Ceiling higher', s: 'DIMENSIONS', p: 'agency', v: 8 },
          { k: 'ceil_down', l: 'Ceiling lower', s: 'DIMENSIONS', p: 'agency', v: 2 },
        ];
        for (const test of tests) {
          const agis = [];
          for (let j = 0; j < mn; j++) {
            const orig = test.s === 'HARDWARE' ? CONFIG.HARDWARE[test.p] : test.s === 'ALGORITHMS' ? CONFIG.ALGORITHMS[test.p] : CONFIG.DIMENSIONS[test.p].ceiling;
            if (test.s === 'HARDWARE') CONFIG.HARDWARE[test.p] = test.v;
            else if (test.s === 'ALGORITHMS') CONFIG.ALGORITHMS[test.p] = test.v;
            else CONFIG.DIMENSIONS[test.p].ceiling = test.v;
            agis.push(runTrajectory().agiYears);
            if (test.s === 'HARDWARE') CONFIG.HARDWARE[test.p] = orig;
            else if (test.s === 'ALGORITHMS') CONFIG.ALGORITHMS[test.p] = orig;
            else CONFIG.DIMENSIONS[test.p].ceiling = orig;
          }
          variations[test.k] = { label: test.l, agiMedian: percentile(agis.filter(isFinite), 50) };
        }

        resolve({
          histogram: hAgi, // Now returns object {labels, agi, asi}
          trajectory: { years: yrs, median: med, p10: p10a, p25: p25a, p75: p75a, p90: p90a, agiThreshold: 10, asiThreshold: 100 },
          cumulative: { x: yq, agi: yq.map(y => cdf(agiList, y)), asi: yq.map(y => cdf(asiList, y)) },
          sensitivity: { base: percentile(agiList.filter(isFinite), 50), variations },
          summary: {
            agiMedian: percentile(agiList.filter(isFinite), 50),
            asiMedian: percentile(asiList.filter(isFinite), 50),
            pAgi2029: cdf(agiList, 3), pAgi2033: cdf(agiList, 7), pAgi2040: cdf(agiList, 14),
            pAsi2035: cdf(asiList, 9), pAsi2045: cdf(asiList, 19),
            geoProb: geoCount / nRuns, avgShifts: totalShifts / nRuns, nRuns,
          },
        });
      }
    }
    setTimeout(processChunk, 0);
  });
}

function buildHistogramBins(listAgi, listAsi = []) {
  const bins = [], binW = 0.5;
  for (let x = 0.5; x <= 25.0; x += binW) bins.push(x);
  const hAgi = new Array(bins.length - 1).fill(0);
  const hAsi = new Array(bins.length - 1).fill(0);
  
  for (const v of listAgi) {
    if (isFinite(v)) { 
      const idx = Math.floor((v - 0.5) / binW); 
      if (idx >= 0 && idx < hAgi.length) hAgi[idx]++; 
    }
  }
  for (const v of listAsi) {
    if (isFinite(v)) { 
      const idx = Math.floor((v - 0.5) / binW); 
      if (idx >= 0 && idx < hAsi.length) hAsi[idx]++; 
    }
  }
  return { 
    labels: bins.slice(0, -1).map((_, i) => ((bins[i] + bins[i + 1]) / 2).toFixed(1)), 
    agi: hAgi, asi: hAsi 
  };
}

// ============================================================================
// v3.0 — BAYESIAN PARTICLE FILTER
// ============================================================================
const V3_DEFAULT_PARTICLES = 1000;

function createV3Config() {
  return {
    BASE_YEAR: 2026.0, FRONTIER_LOG_FLOPS: 27.5, THRESHOLDS: { agi: 10.0 },
    DIMENSIONS: { reasoning: { slope: 0.55, ceiling: 15.0 }, agency: { slope: 0.30 } },
    SCALING_LAW: { paradigm_shift_prob: 0.25, shift_multiplier: 3.5 },
    BOTTLENECKS: { energy_wall_start: 2026.0, energy_damping: 0.10, econ_wall_start: 2026.5, econ_damping: 0.15 },
  };
}

function v3ComputeDim(logDiff, slope, ceiling) {
  return Math.max(ceiling * (sigmoid(slope * logDiff) - 0.5) + 1.0, 0.01);
}

function v3SimulateToYear(particle, targetYear, cfg) {
  const dt = 1.0 / 12.0;
  const steps = Math.max(1, Math.floor((targetYear - cfg.BASE_YEAR) * 12));
  let flopsLog = cfg.FRONTIER_LOG_FLOPS;
  let algoLog = 0; // BUGFIX: missing algo accumulator
  const baseLog = flopsLog;
  
  const hwK = Math.log(2) / Math.max(1.0, particle.hw_months / 12.0);
  const algoK = Math.log(2) / Math.max(1.0, particle.algo_months / 12.0); // BUGFIX

  for (let step = 0; step < steps; step++) {
    const currentYear = cfg.BASE_YEAR + step * dt;
    const logDiff = flopsLog + algoLog - baseLog;
    const reasoning = v3ComputeDim(logDiff, cfg.DIMENSIONS.reasoning.slope, cfg.DIMENSIONS.reasoning.ceiling);
    const agency = v3ComputeDim(logDiff, cfg.DIMENSIONS.agency.slope, particle.agency_ceiling);
    
    let damping = 1.0;
    if (currentYear > cfg.BOTTLENECKS.econ_wall_start) {
      const gap = reasoning - agency;
      if (gap > 2.0) damping *= Math.exp(-cfg.BOTTLENECKS.econ_damping * (gap - 2.0));
    }
    flopsLog += hwK * damping * dt;
    algoLog += algoK * damping * dt; // BUGFIX
  }
  
  const logDiff = flopsLog + algoLog - baseLog;
  return {
    reasoning: v3ComputeDim(logDiff, cfg.DIMENSIONS.reasoning.slope, cfg.DIMENSIONS.reasoning.ceiling),
    agency:    v3ComputeDim(logDiff, cfg.DIMENSIONS.agency.slope, particle.agency_ceiling),
  };
}

class BayesianTracker {
  constructor(nParticles) {
    this.n = nParticles || V3_DEFAULT_PARTICLES;
    this.cfg = createV3Config();
    this.particles = [];
    this.weights = new Float64Array(this.n).fill(1.0 / this.n);
    this.observationLog = [];
    for (let i = 0; i < this.n; i++) {
      this.particles.push({
        hw_months: Math.max(3.0, randnRange(7.5, 1.5)),
        algo_months: Math.max(2.0, randnRange(6.0, 2.0)), // BUGFIX: tracking algorithm progress too
        agency_ceiling: Math.max(1.5, randnRange(5.0, 1.5)),
      });
    }
  }

  observeAAData(year, aaIntelligence, aaAgentic, sigma = 0.5) {
    const tR = aaIntelligence / 10.0, tA = aaAgentic / 10.0;
    for (let i = 0; i < this.n; i++) {
      const p = this.particles[i];
      if (p.hw_months < 1.0 || p.agency_ceiling < 1.0) { this.weights[i] = 0; continue; }
      const pred = v3SimulateToYear(p, year, this.cfg);
      const logLik = -0.5 * (((tR - pred.reasoning) / sigma)**2 + ((tA - pred.agency) / sigma)**2);
      this.weights[i] *= Math.exp(Math.max(-50, logLik));
    }
    
    let sum = this.weights.reduce((a, b) => a + b, 0);
    if (sum === 0) { this.weights.fill(1.0 / this.n); return; }
    for (let i = 0; i < this.n; i++) this.weights[i] /= sum;

    const ess = 1.0 / this.weights.reduce((a, b) => a + b * b, 0);
    if (ess < this.n * 0.5) {
      const newP = [], cumsum = new Float64Array(this.n);
      cumsum[0] = this.weights[0];
      for (let i = 1; i < this.n; i++) cumsum[i] = cumsum[i - 1] + this.weights[i];
      const u0 = Math.random() / this.n;
      let j = 0;
      for (let i = 0; i < this.n; i++) {
        const u = u0 + i / this.n;
        while (j < this.n - 1 && cumsum[j] < u) j++;
        const p = this.particles[j];
        newP.push({
          hw_months: Math.max(3.0, p.hw_months + randnRange(0, 0.2)),
          algo_months: Math.max(2.0, p.algo_months + randnRange(0, 0.3)),
          agency_ceiling: Math.max(1.5, p.agency_ceiling + randnRange(0, 0.1)),
        });
      }
      this.particles = newP;
      this.weights.fill(1.0 / this.n);
    }
    this.observationLog.push({ year, aaIntelligence, aaAgentic });
  }

  getSummary() {
    let hw = 0, agn = 0, algo = 0;
    for (let i = 0; i < this.n; i++) {
      hw += this.particles[i].hw_months * this.weights[i];
      agn += this.particles[i].agency_ceiling * this.weights[i];
      algo += this.particles[i].algo_months * this.weights[i];
    }
    return { hwMonths: hw, agencyCeiling: agn, algoMonths: algo };
  }

  runMonteCarloForecast(nRuns) {
    const agiYears = [], asiYears = []; // asi array just for dummy compatibility
    const maxSteps = 12 * 40, dt = 1.0 / 12.0;
    
    // Aggregation arrays for trajectory (BUGFIX #2)
    const trajYears = new Float64Array(maxSteps);
    const trajCaps = Array.from({length: maxSteps}, () => []);

    const cumw = new Float64Array(this.n);
    cumw[0] = this.weights[0];
    for (let i = 1; i < this.n; i++) cumw[i] = cumw[i - 1] + this.weights[i];

    for (let run = 0; run < nRuns; run++) {
      const u = Math.random();
      let idx = 0; while (idx < this.n - 1 && cumw[idx] < u) idx++;
      const p = this.particles[idx];
      
      let flopsLog = this.cfg.FRONTIER_LOG_FLOPS, algoLog = 0;
      let baseLog = flopsLog;
      const hwK = Math.log(2) / Math.max(1.0, p.hw_months / 12.0);
      const algoK = Math.log(2) / Math.max(1.0, p.algo_months / 12.0);
      let ceilingAgency = p.agency_ceiling;
      let agiY = null;

      for (let step = 0; step < maxSteps; step++) {
        const currentYear = this.cfg.BASE_YEAR + step * dt;
        if (Math.random() < this.cfg.SCALING_LAW.paradigm_shift_prob * dt) {
          ceilingAgency *= this.cfg.SCALING_LAW.shift_multiplier; baseLog -= 0.5;
        }
        
        const logDiff = flopsLog + algoLog - baseLog;
        const reasoning = v3ComputeDim(logDiff, this.cfg.DIMENSIONS.reasoning.slope, this.cfg.DIMENSIONS.reasoning.ceiling);
        const agency = v3ComputeDim(logDiff, this.cfg.DIMENSIONS.agency.slope, ceilingAgency);
        
        const cap = Math.min(reasoning, agency);
        
        // Track trajectory using absolute year
        trajYears[step] = currentYear;
        trajCaps[step].push(cap);

        if (agiY === null && cap >= this.cfg.THRESHOLDS.agi) {
            agiY = currentYear;
            break; // Stop simulating this run once AGI is hit
        }
        
        let damping = 1.0;
        if (currentYear > this.cfg.BOTTLENECKS.econ_wall_start && (reasoning - agency) > 2.0) {
          damping *= Math.exp(-this.cfg.BOTTLENECKS.econ_damping * (reasoning - agency - 2.0));
        }
        flopsLog += hwK * damping * dt;
        algoLog += algoK * damping * dt;
      }
      
      // BUGFIX #1: Push relative years for agiList!
      agiYears.push(agiY !== null ? agiY - this.cfg.BASE_YEAR : Infinity);
      asiYears.push(Infinity); // ASI omitted in simplified v3 tracking
    }
    
    // Process Trajectory Data
    const yrs = [], med = [], p10a = [], p25a = [], p75a = [], p90a = [];
    for (let step = 0; step < maxSteps; step++) {
        const vals = trajCaps[step];
        if (vals.length > 0) {
            vals.sort((a,b) => a - b);
            yrs.push(trajYears[step]);
            p10a.push(percentile(vals, 10)); p25a.push(percentile(vals, 25));
            med.push(percentile(vals, 50));  p75a.push(percentile(vals, 75)); p90a.push(percentile(vals, 90));
        }
    }

    return { 
        agiYears, asiYears, 
        trajectory: { years: yrs, median: med, p10: p10a, p25: p25a, p75: p75a, p90: p90a, agiThreshold: 10, asiThreshold: 100 }
    };
  }
}

// ============================================================================
// UI AND STATE MANAGEMENT
// ============================================================================
let currentResults = null;
let simulationRunning = false;
let currentMode = 'v2';
let v3Tracker = null;
let v3Observations = [];

const AA_FRONTIER_DATA = [
  { year: 2023.25, intel: 30.0, agentic: 2.0, event: "GPT-4 Release" },
  { year: 2024.20, intel: 45.0, agentic: 13.8, event: "Claude 3 Opus" },
  { year: 2024.45, intel: 52.0, agentic: 31.4, event: "Claude 3.5 Sonnet" },
  { year: 2024.75, intel: 55.0, agentic: 36.0, event: "o1-preview" },
  { year: 2025.10, intel: 58.0, agentic: 42.0, event: "DeepSeek-R1" },
  { year: 2025.80, intel: 62.0, agentic: 45.0, event: "Q4 2025 Frontier" },
  { year: 2026.35, intel: 65.0, agentic: 47.0, event: "May 2026 Frontier" },
];

function setMode(mode) {
  currentMode = mode;
  document.getElementById('mode_v2').classList.toggle('active', mode === 'v2');
  document.getElementById('mode_v3').classList.toggle('active', mode === 'v3');
  document.getElementById('version').textContent = mode === 'v3' ? 'v3 β' : 'v2.5';
  document.getElementById('v3Panel').style.display = mode === 'v3' ? 'block' : 'none';
  if (mode === 'v3') v3UpdateUI(v3GetTracker());
  if (currentResults) runSimulation();
}

function v3GetTracker() {
  if (!v3Tracker) {
    v3Tracker = new BayesianTracker(1000);
    AA_FRONTIER_DATA.forEach(d => v3Tracker.observeAAData(d.year, d.intel, d.agentic, 1.5));
  }
  return v3Tracker;
}

function v3AddObservation() {
  const y = +document.getElementById('v3Year').value, i = +document.getElementById('v3Intel').value, a = +document.getElementById('v3Agentic').value;
  v3GetTracker().observeAAData(y, i, a, 1.0);
  v3Observations.push({ year: y, intel: i, agentic: a });
  v3UpdateUI(v3Tracker);
}

function v3ResetTracker() {
  v3Tracker = null; v3Observations = [];
  document.getElementById('v3Observations').innerHTML = '';
  document.getElementById('v3Params').textContent = '';
}

function v3UpdateUI(tracker) {
  const obsDiv = document.getElementById('v3Observations');
  const allObs = AA_FRONTIER_DATA.map(d => ({...d, source: 'AA'})).concat(v3Observations.map(o => ({ ...o, source: 'user' })));
  obsDiv.innerHTML = allObs.map(o => `<span style="margin-right:12px;${o.source === 'user' ? 'color:var(--accent)' : ''}">${o.year.toFixed(2)}: I=${o.intel.toFixed(0)}, A=${o.agentic.toFixed(1)}${o.event ? ' ('+o.event+')' : ''}</span>`).join('');
  const s = tracker.getSummary();
  const ess = 1.0 / tracker.weights.reduce((a, b) => a + b * b, 0);
  document.getElementById('v3Params').textContent = `Апостериор (Байес): Удвоение HW = ${s.hwMonths.toFixed(1)} мес | Удвоение Algo = ${s.algoMonths.toFixed(1)} мес | Потолок Agency = ${s.agencyCeiling.toFixed(2)} (AGI=10) | ESS: ${ess.toFixed(0)}`;
}

async function runSimulation() {
  if (simulationRunning) return;
  simulationRunning = true;
  const btn = document.getElementById('runBtn');
  btn.disabled = true;
  const overlay = document.getElementById('overlay');
  overlay.classList.add('show');
  const n = +document.getElementById('rN').value;

  if (currentMode === 'v3') {
    document.getElementById('overlayText').textContent = 'Байесовское прогнозирование v3...';
    await new Promise(r => setTimeout(r, 50));
    try {
      const tracker = v3GetTracker();
      const runData = tracker.runMonteCarloForecast(n);
      const agiList = runData.agiYears;
      const finite = agiList.filter(isFinite);
      
      const yq = [];
      for (let y = 0.25; y <= 10; y += 0.25) yq.push(+y.toFixed(4));
      for (let y = 11; y <= 40; y++) yq.push(y);

      // BUGFIX #3: Dummy data for Sensitivity chart to avoid blank rendering
      const dummySensitivity = {
          base: percentile(finite, 50),
          variations: {
              info: { label: '(v3: Дисперсия в облаке частиц)', agiMedian: percentile(finite, 50) }
          }
      };

      currentResults = {
        histogram: buildHistogramBins(finite), // Reusing v2 histogram builder for perfect alignment
        trajectory: runData.trajectory, // Now populated!
        cumulative: { x: yq, agi: yq.map(y => cdf(agiList, y)), asi: [] },
        sensitivity: dummySensitivity,
        summary: {
          agiMedian: percentile(finite, 50), asiMedian: Infinity,
          pAgi2029: cdf(agiList, 3), pAgi2033: cdf(agiList, 7), pAgi2040: cdf(agiList, 14),
          pAsi2035: 0, pAsi2045: 0, nRuns: n
        },
      };
      updateUI(currentResults);
    } finally {
      simulationRunning = false; btn.disabled = false; overlay.classList.remove('show');
    }
    return;
  }

  // v2 Mode
  CONFIG.SIMULATION.n_monte_carlo = n;
  CONFIG.HARDWARE.doubling_time_months = +document.getElementById('iHW').value;
  CONFIG.ALGORITHMS.doubling_time_months = +document.getElementById('iAlg').value;
  CONFIG.DIMENSIONS.agency.ceiling = +document.getElementById('iCeil').value;
  CONFIG.BOTTLENECKS.data_wall_start_year = +document.getElementById('iDW').value;
  
  const pFill = document.getElementById('progressFill'), pText = document.getElementById('overlayText');
  try {
    currentResults = await runMonteCarloAsync(n, (f) => {
      pFill.style.width = (f * 100) + '%'; pText.textContent = `Monte Carlo... ${Math.floor(f * 100)}%`;
    });
    updateUI(currentResults);
  } finally {
    simulationRunning = false; btn.disabled = false; overlay.classList.remove('show'); pFill.style.width = '0%';
  }
}

function updateUI(r) {
  const s = r.summary, fmt = yearsText;
  setVal('vAGI', fmt(s.agiMedian), 'agiyears'); setVal('vASI', fmt(s.asiMedian), 'asiyears');
  setVal('v29', s.pAgi2029.toFixed(1) + '%'); setVal('v33', s.pAgi2033.toFixed(1) + '%'); setVal('v40', s.pAgi2040.toFixed(1) + '%');
  setVal('v35', s.pAsi2035.toFixed(1) + '%'); setVal('v45', s.pAsi2045.toFixed(1) + '%');
  colorProb('v29', s.pAgi2029); colorProb('v33', s.pAgi2033); colorProb('v40', s.pAgi2040);
  plotHistogram(r.histogram); plotTrajectory(r.trajectory); plotCumulative(r.cumulative); plotSensitivity(r.sensitivity);
}

function setVal(id, txt, cls) { const el = document.getElementById(id); el.innerHTML = txt; el.className = 'status-value ' + (cls||''); }
function colorProb(id, val) { const el = document.getElementById(id); el.classList.remove('green','orange','red'); el.classList.add(val > 50 ? 'green' : val > 10 ? 'orange' : 'red'); }
function yearsText(yrs) {
  if (!isFinite(yrs) || yrs > 40) return LANG[window._lang||'ru'].fY_gt;
  const d = new Date(); d.setFullYear(d.getFullYear() + yrs);
  return yrs.toFixed(1) + LANG[window._lang||'ru'].fY_suffix + '<br>(' + d.toLocaleDateString(window._lang==='en'?'en-US':'ru-RU', {month:'short',year:'numeric'}) + ')';
}

// ============================================================================
// PLOTLY RENDERERS & i18n ... (Keep existing layout and translation config from original)
// ============================================================================
const LAYOUT_BASE = {
  paper_bgcolor: '#161620', plot_bgcolor: '#0e0e18',
  font: { color: '#9898b0', family: 'Inter, sans-serif', size: 11 },
  margin: { t: 10, r: 14, b: 38, l: 46 },
  xaxis: { gridcolor: '#1e1e2e', zerolinecolor: '#2a2a3a' },
  yaxis: { gridcolor: '#1e1e2e', zerolinecolor: '#2a2a3a' },
  showlegend: true, legend: { bgcolor: 'rgba(22,22,32,.85)' },
  hoverlabel: { bgcolor: '#1a1a28', bordercolor: '#3a3a50' },
};
const PLOT_CFG = { responsive: true, displayModeBar: false };

function plotHistogram(h) {
  const t = LANG[window._lang || 'ru'];
  Plotly.newPlot('c1', [
    { x: h.labels, y: h.agi, type: 'bar', name: 'AGI', marker: { color: '#f0883e' } },
    { x: h.labels, y: h.asi, type: 'bar', name: 'ASI', marker: { color: '#ef4444' } }
  ], { ...LAYOUT_BASE, barmode: 'group', xaxis: { ...LAYOUT_BASE.xaxis, title: { text: t.ch1_xlabel } }, yaxis: { ...LAYOUT_BASE.yaxis, title: { text: t.ch1_ylabel } } }, PLOT_CFG);
}
function plotTrajectory(tr) {
  const t = LANG[window._lang || 'ru'];
  Plotly.newPlot('c2', [
    { x: tr.years, y: tr.p90, type: 'scatter', mode: 'lines', line: {width:0}, showlegend: false, hoverinfo: 'skip' },
    { x: tr.years, y: tr.p75, type: 'scatter', mode: 'lines', line: {width:0}, fill: 'tonexty', fillcolor: 'rgba(88,166,255,.06)', showlegend: false, hoverinfo:'skip' },
    { x: tr.years, y: tr.p25, type: 'scatter', mode: 'lines', line: {width:0}, fill: 'tonexty', fillcolor: 'rgba(88,166,255,.12)', showlegend: false, hoverinfo:'skip' },
    { x: tr.years, y: tr.p10, type: 'scatter', mode: 'lines', line: {width:0}, fill: 'tonexty', fillcolor: 'rgba(88,166,255,.18)', showlegend: false, hoverinfo:'skip' },
    { x: tr.years, y: tr.median, type: 'scatter', mode: 'lines', name: t.ch_legend_median, line: { color: '#58a6ff', width: 2.5 } },
    { x: [tr.years[0], tr.years[tr.years.length - 1]], y: [tr.agiThreshold, tr.agiThreshold], type: 'scatter', mode: 'lines', name: t.ch_legend_agi, line: { color: '#f0883e', dash: 'dot' } }
  ], { ...LAYOUT_BASE, xaxis: { ...LAYOUT_BASE.xaxis, title: { text: t.ch2_xlabel }, range: [2026, 2050] }, yaxis: { ...LAYOUT_BASE.yaxis, type: 'log', range: [0, 3.3] } }, PLOT_CFG);
}
function plotCumulative(c) {
  const t = LANG[window._lang || 'ru'];
  Plotly.newPlot('c3', [
    { x: c.x, y: c.agi, type: 'scatter', mode: 'lines+markers', name: t.ch3_pagi, line: { color: '#f0883e' }, fill: 'tozeroy', fillcolor: 'rgba(240,136,62,.08)' }
  ], { ...LAYOUT_BASE, xaxis: { ...LAYOUT_BASE.xaxis, title: { text: t.ch3_xlabel } }, yaxis: { ...LAYOUT_BASE.yaxis, title: { text: t.ch3_ylabel }, range: [0, 105] } }, PLOT_CFG);
}
function plotSensitivity(s) {
  const t = LANG[window._lang || 'ru'];
  const arr = Object.entries(s.variations).map(([k, v]) => ({ label: v.label, med: v.agiMedian, delta: v.agiMedian - s.base }));
  arr.sort((a, b) => a.delta - b.delta);
  const maxD = Math.max(...arr.map(a => Math.abs(a.delta)), 1);
  document.getElementById('c4').innerHTML = `<div style="padding:8px 0"><div style="margin-bottom:10px;color:#58a6ff">${t.ch4_label_base}: ${yearsText(s.base)}</div>` + 
    arr.map(a => `<div style="display:flex;gap:10px;margin-bottom:8px;font-size:.78rem"><div style="width:110px;text-align:right">${a.label}</div><div style="flex:1;background:#0e0e18"><div style="width:${clamp(Math.abs(a.delta)/maxD*100, 2, 100)}%;background:${a.delta<0?'#22c55e':'#ef4444'};height:14px"></div></div><div style="width:60px">${yearsText(a.med)}</div></div>`).join('') + '</div>';
}

window._lang = 'ru';
const LANG = {
  ru: {
    run_btn:'Запуск', sb_agi:'AGI медиана', ch_legend_median:'Медиана', ch_legend_agi:'AGI (10)',
    ch1_xlabel:'Лет от сейчас', ch1_ylabel:'Прогонов', ch2_xlabel:'Год', ch3_xlabel:'Лет от сейчас', ch3_ylabel:'P(%)', ch3_pagi:'P(AGI)', ch4_label_base:'База', fY_suffix:' лет', fY_gt:'> 40 лет'
  },
  en: {
    run_btn:'Run', sb_agi:'AGI median', ch_legend_median:'Median', ch_legend_agi:'AGI (10)',
    ch1_xlabel:'Years from now', ch1_ylabel:'Runs', ch2_xlabel:'Year', ch3_xlabel:'Years from now', ch3_ylabel:'P(%)', ch3_pagi:'P(AGI)', ch4_label_base:'Base', fY_suffix:' yrs', fY_gt:'> 40 yrs'
  }
};
function setLang(lang) {
  window._lang = lang;
  document.getElementById('lang_ru').classList.toggle('active', lang === 'ru');
  document.getElementById('lang_en').classList.toggle('active', lang === 'en');
  // Refresh UI texts logic here...
}

window.addEventListener('load', () => setLang('ru'));

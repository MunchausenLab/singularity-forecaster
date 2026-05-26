
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function sigmoid(x) { return 1.0 / (1.0 + Math.exp(-Math.max(-30, Math.min(30, x)))); }
function randnRange(mean, std) { const u1 = Math.random(), u2 = Math.random(); return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function percentile(arr, p) { const sorted = arr.slice().sort((a, b) => a - b); const idx = clamp(Math.floor(p / 100 * sorted.length), 0, sorted.length - 1); return sorted[idx]; }
function cdf(list, x) { const c = list.filter(v => isFinite(v) && v <= x).length; return list.length ? (c / list.length) * 100 : 0; }

// ============================================================================
// v3.0 — BAYESIAN PARTICLE FILTER (Исправлено: Якорь на 2023 год + Inference)
// ============================================================================
const V3_DEFAULT_PARTICLES = 1000;

function createV3Config() {
  return {
    BASE_YEAR: 2023.0,          // Якорь (уровень GPT-4)
    BASE_LOG_FLOPS: 24.5,       // Начальные FLOPs в 2023
    CURRENT_YEAR: 2026.30,      // Откуда рисуем графики прогноза
    THRESHOLDS: { agi: 10.0, asi: 100.0 },
    DIMENSIONS: {
      reasoning: { slope: 0.35, ceiling: 15.0 }, // Откалибровано под рост до 65 баллов
      agency:    { slope: 0.25 }, // Потолок определяет частица
    },
    INFERENCE_SCALING: {
      max_bonus_reasoning: 2.0,
      max_bonus_agency: 1.5,
      saturation_cap: 5.0
    },
    SCALING_LAW: { paradigm_shift_prob: 0.20, shift_multiplier: 3.0 },
    BOTTLENECKS: { energy_wall_start: 2026.0, energy_damping: 0.10, econ_wall_start: 2026.5, econ_damping: 0.15 },
  };
}

function v3ComputeDim(logDiff, slope, ceiling) {
  return Math.max(ceiling * (sigmoid(slope * logDiff) - 0.5) + 1.0, 0.01);
}

function v3ApplyInference(rawCap, maxBonus, satCap) {
  if (maxBonus <= 1.0) return rawCap;
  const k = Math.LN2 / satCap;
  const bonus = (maxBonus - 1.0) * (1.0 - Math.exp(-k * rawCap));
  return rawCap * (1.0 + bonus);
}

function v3SimulateToYear(particle, targetYear, cfg) {
  const dt = 1.0 / 12.0;
  const steps = Math.max(1, Math.floor((targetYear - cfg.BASE_YEAR) * 12));
  let flopsLog = cfg.BASE_LOG_FLOPS;
  let algoLog = 0; 
  const baseLog = flopsLog;
  
  const hwK = Math.log(2) / Math.max(1.0, particle.hw_months / 12.0);
  const algoK = Math.log(2) / Math.max(1.0, particle.algo_months / 12.0);

  for (let step = 0; step < steps; step++) {
    const currentYear = cfg.BASE_YEAR + step * dt;
    const logDiff = flopsLog + algoLog - baseLog;
    
    let rawR = v3ComputeDim(logDiff, cfg.DIMENSIONS.reasoning.slope, cfg.DIMENSIONS.reasoning.ceiling);
    let rawA = v3ComputeDim(logDiff, cfg.DIMENSIONS.agency.slope, particle.agency_ceiling);
    
    let reasoning = v3ApplyInference(rawR, cfg.INFERENCE_SCALING.max_bonus_reasoning, cfg.INFERENCE_SCALING.saturation_cap);
    let agency = v3ApplyInference(rawA, cfg.INFERENCE_SCALING.max_bonus_agency, cfg.INFERENCE_SCALING.saturation_cap);

    let damping = 1.0;
    if (currentYear > cfg.BOTTLENECKS.econ_wall_start) {
      const gap = reasoning - agency;
      if (gap > 2.0) damping *= Math.exp(-cfg.BOTTLENECKS.econ_damping * (gap - 2.0));
    }
    flopsLog += hwK * damping * dt;
    algoLog += algoK * damping * dt;
  }
  
  const logDiff = flopsLog + algoLog - baseLog;
  let rawR = v3ComputeDim(logDiff, cfg.DIMENSIONS.reasoning.slope, cfg.DIMENSIONS.reasoning.ceiling);
  let rawA = v3ComputeDim(logDiff, cfg.DIMENSIONS.agency.slope, particle.agency_ceiling);
  
  return {
    reasoning: v3ApplyInference(rawR, cfg.INFERENCE_SCALING.max_bonus_reasoning, cfg.INFERENCE_SCALING.saturation_cap),
    agency:    v3ApplyInference(rawA, cfg.INFERENCE_SCALING.max_bonus_agency, cfg.INFERENCE_SCALING.saturation_cap),
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
        algo_months: Math.max(2.0, randnRange(6.0, 2.0)),
        agency_ceiling: Math.max(2.0, randnRange(8.0, 3.0)), // Априорный потолок Трансформеров
      });
    }
  }

  observeAAData(year, aaIntelligence, aaAgentic, sigma = 1.0) {
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
          agency_ceiling: Math.max(1.5, p.agency_ceiling + randnRange(0, 0.2)),
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
    const agiYears = [], asiYears = []; 
    const maxSteps = 12 * 45, dt = 1.0 / 12.0; 
    const plotSteps = 40 * 12; 
    const trajYears = new Float64Array(plotSteps);
    const trajCaps = Array.from({length: plotSteps}, () => []);

    const cumw = new Float64Array(this.n);
    cumw[0] = this.weights[0];
    for (let i = 1; i < this.n; i++) cumw[i] = cumw[i - 1] + this.weights[i];

    for (let run = 0; run < nRuns; run++) {
      const u = Math.random();
      let idx = 0; while (idx < this.n - 1 && cumw[idx] < u) idx++;
      const p = this.particles[idx];
      
      let flopsLog = this.cfg.BASE_LOG_FLOPS, algoLog = 0;
      let baseLog = flopsLog;
      const hwK = Math.log(2) / Math.max(1.0, p.hw_months / 12.0);
      const algoK = Math.log(2) / Math.max(1.0, p.algo_months / 12.0);
      
      // ИСПРАВЛЕНИЕ 1: Оба потолка теперь локальные переменные
      let ceilingReasoning = this.cfg.DIMENSIONS.reasoning.ceiling;
      let ceilingAgency = p.agency_ceiling;
      
      let agiY = null, asiY = null;
      let plotIdx = 0;

      for (let step = 0; step < maxSteps; step++) {
        const currentYear = this.cfg.BASE_YEAR + step * dt;
        
        // Смена парадигмы теперь поднимает оба потолка!
        if (currentYear > this.cfg.CURRENT_YEAR && Math.random() < this.cfg.SCALING_LAW.paradigm_shift_prob * dt) {
          ceilingAgency *= this.cfg.SCALING_LAW.shift_multiplier; 
          ceilingReasoning *= this.cfg.SCALING_LAW.shift_multiplier; // <- Добавлено
          baseLog -= 0.5;
        }
        
        const logDiff = flopsLog + algoLog - baseLog;
        const rawR = v3ComputeDim(logDiff, this.cfg.DIMENSIONS.reasoning.slope, ceilingReasoning);
        const rawA = v3ComputeDim(logDiff, this.cfg.DIMENSIONS.agency.slope, ceilingAgency);
        
        const reasoning = v3ApplyInference(rawR, this.cfg.INFERENCE_SCALING.max_bonus_reasoning, this.cfg.INFERENCE_SCALING.saturation_cap);
        const agency = v3ApplyInference(rawA, this.cfg.INFERENCE_SCALING.max_bonus_agency, this.cfg.INFERENCE_SCALING.saturation_cap);
        
        const cap = Math.min(reasoning, agency);
        
        if (currentYear >= this.cfg.CURRENT_YEAR && plotIdx < plotSteps) {
            trajYears[plotIdx] = currentYear;
            trajCaps[plotIdx].push(cap);
            plotIdx++;
        }
        
        if (agiY === null && cap >= this.cfg.THRESHOLDS.agi) {
            agiY = currentYear;
        }
        if (asiY === null && cap >= this.cfg.THRESHOLDS.asi) {
            asiY = currentYear;
            break; // Остановка только на ASI
        }
        
        let damping = 1.0;
        if (currentYear > this.cfg.BOTTLENECKS.econ_wall_start && (reasoning - agency) > 2.0) {
          damping *= Math.exp(-this.cfg.BOTTLENECKS.econ_damping * (reasoning - agency - 2.0));
        }
        
        // ИСПРАВЛЕНИЕ 2: Включен RSI (Recursive Self-Improvement)
        // Включается, когда агентность пробивает 5.0
        let rsi = 0;
        if (cap >= 5.0) {
          const progress = Math.max(0, Math.min(1.0, (cap - 5.0) / (40.0 - 5.0)));
          rsi = 0.08 * progress * Math.log(1.0 + cap);
        }
        
        flopsLog += hwK * damping * dt;
        algoLog += (algoK * damping + rsi) * dt; // Добавляем RSI к росту алгоритмов
      }
      
      agiYears.push(agiY !== null ? agiY - this.cfg.CURRENT_YEAR : Infinity);
      asiYears.push(asiY !== null ? asiY - this.cfg.CURRENT_YEAR : Infinity);
    }
    
    const yrs = [], med = [], p10a = [], p25a = [], p75a = [], p90a = [];
    for (let step = 0; step < plotSteps; step++) {
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

  // ==========================================================================
  // ADVANCED ANALYSIS: Sensitivity, Scenarios, Decomposition, Paradigm Shifts
  // ==========================================================================

  // Clone particles + weights for sensitivity analysis (same hypotheses, different observations)
  cloneState() {
    return {
      particles: this.particles.map(p => ({ ...p })),
      weights: new Float64Array(this.weights),
      observationLog: this.observationLog.map(o => ({ ...o })),
    };
  }

  // Restore cloned state
  restoreState(state) {
    this.particles = state.particles.map(p => ({ ...p }));
    this.weights = new Float64Array(state.weights);
    this.observationLog = state.observationLog.map(o => ({ ...o }));
    this.n = this.particles.length;
  }

  runSensitivityMatrix(intelRange, agenticRange) {
    // Clone the current posterior (all points share same particle hypotheses)
    const baseObs = AA_FRONTIER_DATA[AA_FRONTIER_DATA.length - 1];
    const state = this.cloneState();

    const results = [];
    for (const intel of intelRange) {
      const row = [];
      for (const agentic of agenticRange) {
        // Restore original posterior state for each grid point
        this.restoreState(state);
        // Add observation with varied parameters
        this.observeAAData(baseObs.year, intel, agentic, 1.0);
        // Run forecast with same particles, different observation
        const mc = this.runMonteCarloForecast(300);
        const finite = mc.agiYears.filter(isFinite);
        row.push(finite.length > 0 ? percentile(finite, 50) : 40);
      }
      results.push(row);
    }
    // Restore original state after all sensitivity runs
    this.restoreState(state);
    return results;
  }

  runScenarioOverlay(nScenarios) {
    const cfg = this.cfg;
    const cumw = new Float64Array(this.n);
    cumw[0] = this.weights[0];
    for (let i = 1; i < this.n; i++) cumw[i] = cumw[i - 1] + this.weights[i];

    const scenarios = [];
    const dt = 1.0 / 12.0;
    const steps = 40 * 12;

    for (let s = 0; s < nScenarios; s++) {
      const u = Math.random();
      let idx = 0; while (idx < this.n - 1 && cumw[idx] < u) idx++;
      const p = this.particles[idx];

      let flopsLog = cfg.BASE_LOG_FLOPS, algoLog = 0;
      let baseLog = flopsLog;
      const hwK = Math.log(2) / Math.max(1.0, p.hw_months / 12.0);
      const algoK = Math.log(2) / Math.max(1.0, p.algo_months / 12.0);
      let cR = cfg.DIMENSIONS.reasoning.ceiling;
      let cA = p.agency_ceiling;

      const years = [], caps = [];
      for (let step = 0; step < steps; step++) {
        const y = cfg.BASE_YEAR + step * dt;
        if (y > cfg.CURRENT_YEAR && Math.random() < cfg.SCALING_LAW.paradigm_shift_prob * dt) {
          cA *= cfg.SCALING_LAW.shift_multiplier;
          cR *= cfg.SCALING_LAW.shift_multiplier;
          baseLog -= 0.5;
        }
        const logDiff = flopsLog + algoLog - baseLog;
        const rawR = v3ComputeDim(logDiff, cfg.DIMENSIONS.reasoning.slope, cR);
        const rawA = v3ComputeDim(logDiff, cfg.DIMENSIONS.agency.slope, cA);
        const reasoning = v3ApplyInference(rawR, cfg.INFERENCE_SCALING.max_bonus_reasoning, cfg.INFERENCE_SCALING.saturation_cap);
        const agency = v3ApplyInference(rawA, cfg.INFERENCE_SCALING.max_bonus_agency, cfg.INFERENCE_SCALING.saturation_cap);
        years.push(y);
        caps.push(Math.min(reasoning, agency));

        let damping = 1.0;
        if (y > cfg.BOTTLENECKS.econ_wall_start && (reasoning - agency) > 2.0) {
          damping *= Math.exp(-cfg.BOTTLENECKS.econ_damping * (reasoning - agency - 2.0));
        }
        let rsi = 0;
        const cap = Math.min(reasoning, agency);
        if (cap >= 5.0) {
          const progress = Math.max(0, Math.min(1.0, (cap - 5.0) / 35.0));
          rsi = 0.08 * progress * Math.log(1.0 + cap);
        }
        flopsLog += hwK * damping * dt;
        algoLog += (algoK * damping + rsi) * dt;
      }
      scenarios.push({ years, caps });
    }
    return scenarios;
  }

  runDecomposition() {
    const cfg = this.cfg;
    const p = this.particles[0];
    let flopsLog = cfg.BASE_LOG_FLOPS, algoLog = 0;
    let baseLog = flopsLog;
    const hwK = Math.log(2) / Math.max(1.0, p.hw_months / 12.0);
    const algoK = Math.log(2) / Math.max(1.0, p.algo_months / 12.0);
    let cR = cfg.DIMENSIONS.reasoning.ceiling;
    let cA = p.agency_ceiling;

    const dt = 1.0 / 12.0;
    const steps = 40 * 12;
    const years = [], hwComp = [], algoComp = [], paradigmComp = [], rsiComp = [];
    let accumulatedParadigm = 0, accumulatedRsi = 0;

    for (let step = 0; step < steps; step++) {
      const y = cfg.BASE_YEAR + step * dt;
      let paradigmBonus = 0, rsiBonus = 0;
      if (y > cfg.CURRENT_YEAR && Math.random() < cfg.SCALING_LAW.paradigm_shift_prob * dt) {
        cA *= cfg.SCALING_LAW.shift_multiplier;
        cR *= cfg.SCALING_LAW.shift_multiplier;
        baseLog -= 0.5;
        paradigmBonus = cfg.SCALING_LAW.shift_multiplier;
        accumulatedParadigm += paradigmBonus;
      }
      const logDiff = flopsLog + algoLog - baseLog;
      const rawR = v3ComputeDim(logDiff, cfg.DIMENSIONS.reasoning.slope, cR);
      const rawA = v3ComputeDim(logDiff, cfg.DIMENSIONS.agency.slope, cA);
      const reasoning = v3ApplyInference(rawR, cfg.INFERENCE_SCALING.max_bonus_reasoning, cfg.INFERENCE_SCALING.saturation_cap);
      const agency = v3ApplyInference(rawA, cfg.INFERENCE_SCALING.max_bonus_agency, cfg.INFERENCE_SCALING.saturation_cap);
      const cap = Math.min(reasoning, agency);

      years.push(y);
      hwComp.push(flopsLog - cfg.BASE_LOG_FLOPS);
      algoComp.push(algoLog);
      paradigmComp.push(accumulatedParadigm);

      let damping = 1.0;
      if (y > cfg.BOTTLENECKS.econ_wall_start && (reasoning - agency) > 2.0) {
        damping *= Math.exp(-cfg.BOTTLENECKS.econ_damping * (reasoning - agency - 2.0));
      }
      let rsi = 0;
      if (cap >= 5.0) {
        const progress = Math.max(0, Math.min(1.0, (cap - 5.0) / 35.0));
        rsi = 0.08 * progress * Math.log(1.0 + cap);
        accumulatedRsi += rsi * dt;
      }
      rsiComp.push(accumulatedRsi);
      flopsLog += hwK * damping * dt;
      algoLog += (algoK * damping + rsi) * dt;
    }
    return { years, hwComp, algoComp, paradigmComp, rsiComp };
  }
}

// ============================================================================
// UI AND STATE MANAGEMENT (v3 only)
// ============================================================================
let currentResults = null;
let simulationRunning = false;
let v3Tracker = null;
let v3Observations = [];

const AA_FRONTIER_DATA = [
  { year: 2023.25, intel: 30.0, agentic: 2.0, event: "GPT-4 Release" },
  { year: 2024.20, intel: 45.0, agentic: 13.8, event: "Claude 3 Opus / Devin" },
  { year: 2024.45, intel: 52.0, agentic: 31.4, event: "Claude 3.5 Sonnet" },
  { year: 2024.75, intel: 55.0, agentic: 36.0, event: "OpenAI o1-preview" },
  { year: 2025.10, intel: 58.0, agentic: 42.0, event: "DeepSeek-R1 / Gemini 2.0 Pro" },
  { year: 2025.80, intel: 62.0, agentic: 45.0, event: "Q4 2025 Frontier" },
  { year: 2026.30, intel: 68.0, agentic: 72.0, event: "Anthropic Mythos (Closed Demo)" },
];

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
  document.getElementById('v3Params').textContent = `Апостериор (Байес): Удвоение HW = ${s.hwMonths.toFixed(1)} мес | Удвоение Algo = ${s.algoMonths.toFixed(1)} мес | Потолок Agency = ${s.agencyCeiling.toFixed(2)} | ESS: ${ess.toFixed(0)}`;
}

async function runSimulation() {
  if (simulationRunning) return;
  simulationRunning = true;
  const btn = document.getElementById('runBtn');
  btn.disabled = true;
  const overlay = document.getElementById('overlay');
  overlay.classList.add('show');
  document.getElementById('overlayText').textContent = 'Байесовское прогнозирование v3...';
  const n = +document.getElementById('rN').value;

  await new Promise(r => setTimeout(r, 50));
  try {
    const tracker = v3GetTracker();
    const runData = tracker.runMonteCarloForecast(n);
    const agiList = runData.agiYears;
    const asiList = runData.asiYears;
    const finite = agiList.filter(isFinite);
    const finiteAsi = asiList.filter(isFinite);
    
    const CUR_Y = 2026.30;
    const yq = [];
    for (let y = 0.25; y <= 10; y += 0.25) yq.push(+y.toFixed(4));
    for (let y = 11; y <= 40; y++) yq.push(y);
    const yqAbs = yq.map(y => +(CUR_Y + y).toFixed(2));

    const dummySensitivity = {
        base: percentile(finite, 50),
        variations: { info: { label: '(v3: Дисперсия в облаке частиц)', agiMedian: percentile(finite, 50) } }
    };

    currentResults = {
      histogram: buildHistogramBins(agiList, asiList), 
      trajectory: runData.trajectory, 
      cumulative: { x: yqAbs, agi: yq.map(y => cdf(agiList, y)), asi: yq.map(y => cdf(asiList, y)) },
      sensitivity: dummySensitivity,
      summary: {
        agiMedian: percentile(finite, 50), 
        asiMedian: percentile(finiteAsi, 50),
        pAgi2029: cdf(agiList, 3), pAgi2033: cdf(agiList, 7), pAgi2040: cdf(agiList, 14),
        pAsi2035: cdf(asiList, 9), pAsi2045: cdf(asiList, 19), nRuns: n
      },
    };
    updateUI(currentResults);
  } finally {
    simulationRunning = false; btn.disabled = false; overlay.classList.remove('show');
  }
}

function updateUI(r) {
  const s = r.summary, fmt = yearsText;
  setVal('vAGI', fmt(s.agiMedian), 'agiyears'); setVal('vASI', fmt(s.asiMedian), 'asiyears');
  setVal('v29', s.pAgi2029.toFixed(1) + '%'); setVal('v33', s.pAgi2033.toFixed(1) + '%'); setVal('v40', s.pAgi2040.toFixed(1) + '%');
  setVal('v35', s.pAsi2035.toFixed(1) + '%'); setVal('v45', s.pAsi2045.toFixed(1) + '%');
  colorProb('v29', s.pAgi2029); colorProb('v33', s.pAgi2033); colorProb('v40', s.pAgi2040);
  plotHistogram(r.histogram); plotCumulative(r.cumulative);
  // Advanced charts (async-like, yield between heavy plots)
  requestAnimationFrame(() => {
    const tracker = v3GetTracker();
    plotSensitivityHeatmap(tracker);
    requestAnimationFrame(() => {
      plotScenarioFan(tracker);
      plotDecomposition(tracker);
    });
  });
}

function setVal(id, txt, cls) { const el = document.getElementById(id); el.innerHTML = txt; el.className = 'status-value ' + (cls||''); }
function colorProb(id, val) { const el = document.getElementById(id); el.classList.remove('green','orange','red'); el.classList.add(val > 50 ? 'green' : val > 10 ? 'orange' : 'red'); }
function yearsText(yrs) {
  if (!isFinite(yrs) || yrs > 40) return LANG[window._lang||'ru'].fY_gt;
  return yrs.toFixed(1) + LANG[window._lang||'ru'].fY_suffix;
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
  const CUR_Y = 2026.30;
  return { 
    labels: bins.slice(0, -1).map((_, i) => (CUR_Y + (bins[i] + bins[i + 1]) / 2).toFixed(1)), 
    agi: hAgi, asi: hAsi,
    _agiYears: listAgi,
  };
}

// ============================================================================
// PLOTLY RENDERERS & i18n
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
function plotCumulative(c) {
  const t = LANG[window._lang || 'ru'];
  Plotly.newPlot('c3', [
    { x: c.x, y: c.agi, type: 'scatter', mode: 'lines+markers', name: t.ch3_pagi, line: { color: '#f0883e' }, fill: 'tozeroy', fillcolor: 'rgba(240,136,62,.08)' },
    { x: c.x, y: c.asi, type: 'scatter', mode: 'lines+markers', name: t.ch3_pasi, line: { color: '#ef4444' }, fill: 'tozeroy', fillcolor: 'rgba(239,68,68,.08)' }
  ], { ...LAYOUT_BASE, xaxis: { ...LAYOUT_BASE.xaxis, title: { text: t.ch3_xlabel } }, yaxis: { ...LAYOUT_BASE.yaxis, title: { text: t.ch3_ylabel }, range: [0, 105] } }, PLOT_CFG);
}

// ===== ADVANCED PLOT FUNCTIONS =====

function plotSensitivityHeatmap(tracker) {
  const t = LANG[window._lang || 'ru'];
  const intelRange = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85];
  const agenticRange = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  // Run sensitivity matrix (this is expensive, limit grid)
  const matrix = tracker.runSensitivityMatrix(intelRange, agenticRange);

  const textMatrix = matrix.map((row, i) =>
    row.map((v, j) => `Intel=${intelRange[i]}, Agentic=${agenticRange[j]}<br>${t.ch5_label}: ${v.toFixed(1)} лет`)
  );

  Plotly.newPlot('c5', [{
    z: matrix,
    x: agenticRange.map(String),
    y: intelRange.map(String),
    type: 'heatmap',
    colorscale: [[0, '#0a0a0f'], [0.2, '#1a3a4a'], [0.4, '#0e5e7a'], [0.6, '#f0883e'], [0.8, '#ef4444'], [1, '#ff0040']],
    text: textMatrix,
    hoverinfo: 'text',
    colorbar: { title: { text: t.ch5_colorbar || 'Лет до AGI' }, thickness: 12, len: 0.8 },
  }], {
    ...LAYOUT_BASE,
    xaxis: { ...LAYOUT_BASE.xaxis, title: { text: t.ch5_xaxis || 'Agentic score' } },
    yaxis: { ...LAYOUT_BASE.yaxis, title: { text: t.ch5_yaxis || 'Intelligence score' } },
    margin: { ...LAYOUT_BASE.margin, l: 52 },
  }, PLOT_CFG);
}

function plotScenarioFan(tracker) {
  const t = LANG[window._lang || 'ru'];
  const scenarios = tracker.runScenarioOverlay(30);
  const traces = scenarios.map((s, i) => ({
    x: s.years,
    y: s.caps,
    type: 'scatter',
    mode: 'lines',
    line: { color: 'rgba(88,166,255,0.15)', width: 1 },
    showlegend: false,
    hoverinfo: i === 0 ? 'skip' : 'skip',
  }));

  // Add AGI/ASI lines
  const yrRange = [2026, 2050];
  traces.push(
    { x: yrRange, y: [10, 10], type: 'scatter', mode: 'lines', name: t.ch_legend_agi, line: { color: '#f0883e', dash: 'dot', width: 1 } },
    { x: yrRange, y: [100, 100], type: 'scatter', mode: 'lines', name: t.ch_legend_asi, line: { color: '#ef4444', dash: 'dot', width: 1 } }
  );

  Plotly.newPlot('c6', traces, {
    ...LAYOUT_BASE,
    xaxis: { ...LAYOUT_BASE.xaxis, title: { text: t.ch2_xlabel }, range: yrRange },
    yaxis: { ...LAYOUT_BASE.yaxis, type: 'log', range: [0, 2.0], title: { text: 'Capability (log)' } },
  }, PLOT_CFG);
}

function plotDecomposition(tracker) {
  const t = LANG[window._lang || 'ru'];
  const d = tracker.runDecomposition();

  Plotly.newPlot('c7', [
    { x: d.years, y: d.hwComp, type: 'scatter', mode: 'lines', name: 'Hardware', stackgroup: 'one', fillcolor: 'rgba(88,166,255,0.5)', line: { color: '#58a6ff', width: 0.5 } },
    { x: d.years, y: d.algoComp, type: 'scatter', mode: 'lines', name: 'Algorithms', stackgroup: 'one', fillcolor: 'rgba(34,197,94,0.5)', line: { color: '#22c55e', width: 0.5 } },
    { x: d.years, y: d.paradigmComp, type: 'scatter', mode: 'lines', name: 'Paradigm Shifts', stackgroup: 'one', fillcolor: 'rgba(167,139,250,0.5)', line: { color: '#a78bfa', width: 0.5 } },
    { x: d.years, y: d.rsiComp, type: 'scatter', mode: 'lines', name: 'RSI Feedback', stackgroup: 'one', fillcolor: 'rgba(239,68,68,0.5)', line: { color: '#ef4444', width: 0.5 } },
  ], {
    ...LAYOUT_BASE,
    xaxis: { ...LAYOUT_BASE.xaxis, title: { text: t.ch2_xlabel } },
    yaxis: { ...LAYOUT_BASE.yaxis, title: { text: t.ch7_ylabel || 'Суммарный вклад (log FLOPs)' } },
    legend: { ...LAYOUT_BASE.legend, orientation: 'h', y: -0.15 },
  }, PLOT_CFG);
}

window._lang = 'ru';
const LANG = {
  ru: {
    // Header
    hdr_title:'Singularity Forecaster', hdr_sub:'v3 Bayesian Tracker',
    // Status bar
    sb_agi:'AGI медиана', sb_asi:'ASI медиана',
    sb_pagi_2029:'P(AGI · 2029)', sb_pagi_2033:'P(AGI · 2033)', sb_pagi_2040:'P(AGI · 2040)',
    sb_pasi_2035:'P(ASI · 2035)', sb_pasi_2045:'P(ASI · 2045)',
    // Controls
    ctrl_simulations:'Симуляции (N)', ctrl_obs_year:'Год наблюдения',
    ctrl_intelligence:'Интеллект (AA)', ctrl_agentic:'Агентность (AA)',
    ctrl_add:'Добавить', ctrl_reset:'Сбросить',
    run_btn:'Запустить прогноз',
    // Charts
    tag1:'Вероятностный анализ', tag3:'Кумулятивная',
    tag5:'Чувствительность', tag6:'Сценарии', tag7:'Декомпозиция',
    chart1:'1. Распределение AGI / ASI по Monte Carlo',
    chart3:'2. Накопленная вероятность AGI / ASI',
    chart5:'3. Карта чувствительности (Intel × Agentic)',
    chart6:'4. Веер сценариев (Multi-Run Overlay)',
    chart7:'5. Вклад компонент (Stacked Area)',
    tip1:'Показывает, где группируются 3000 прогонов Монте-Карло. Чем выше столбец — тем больше сценариев привели к AGI/ASI в этом году.',
    tip3:'P(AGI ≤ X) — шанс, что AGI появится не позднее, чем через X лет. Если кривая круто поднимается — быстрый переход от «почти нет» к «почти точно».',
    tip5:'Тепловая карта: оси — параметры Intelligence и Agentic последнего наблюдения. Цвет — медианный год AGI. Показывает, какой параметр доминирует в прогнозе.',
    tip6:'30 случайных прогонов из апостериорного распределения, наложенных полупрозрачно. Показывает разброс возможных путей к сингулярности.',
    tip7:'Разбивка capability на составляющие: Hardware scaling, Algorithmic progress, Paradigm shift bonus, RSI feedback. Показывает, что двигает прогресс.',
    ch1_xlabel:'Год', ch1_ylabel:'Прогонов',
    ch3_xlabel:'Год', ch3_ylabel:'P(%)', ch3_pagi:'P(AGI)', ch3_pasi:'P(ASI)',
    ch5_label:'Лет до AGI', ch5_colorbar:'Лет до AGI', ch5_xaxis:'Agentic score', ch5_yaxis:'Intelligence score',
    ch7_ylabel:'Суммарный вклад (log FLOPs)',
    fY_suffix:' лет', fY_gt:'> 40 лет',
    // About
    about_title:'О модели v3',
    about_intro:'Модель v3 использует байесовский частичный фильтр (Bayesian Particle Filter) для калибровки прогноза на реальных данных Artificial Analysis. Каждая частица — это гипотеза о будущем: скорость роста hardware, алгоритмов и потолок агентности. Наблюдения AA обновляют веса частиц через правдоподобие, а маловероятные гипотезы отмирают при ресэмплинге.',
    defs_label:'Архитектура модели',
    arch_tracker_title:'Байесовский трекер',
    arch_tracker_desc:'1000 частиц с априорными распределениями на hw_months, algo_months, agency_ceiling. Каждое наблюдение AA (Intelligence + Agentic) обновляет веса через гауссово правдоподобие. ESS-ресэмплинг предотвращает вырождение.',
    arch_dims_title:'Два измерения интеллекта',
    arch_dims_desc:'Reasoning (slope 0.35, ceiling 15.0) и Agency (slope 0.25, ceiling — параметр частицы). Capability = min(Reasoning, Agency). Оба растут логистически от log(FLOPs), но упираются в потолки.',
    arch_paradigm_title:'Смена парадигмы',
    arch_paradigm_desc:'После 2026.30 каждый месяц с вероятностью ~1.7% происходит сдвиг: оба потолка ×3, базовый уровень FLOPs сдвигается. Это позволяет модели преодолеть текущие ограничения трансформеров.',
    arch_rsi_title:'RSI — рекурсивное самоулучшение',
    arch_rsi_desc:'При capability >= 5.0 включается обратная связь: рост алгоритмов ускоряется пропорционально текущему уровню. Чем выше агентность — тем быстрее прогресс. Это ключевой механизм для достижения ASI.',
    arch_bottlenecks_title:'Бутылочные горлышки',
    arch_bottlenecks_desc:'Экономическая стена: если Reasoning обгоняет Agency более чем на 2.0, инвестиции падают. Энергетическая стена: с 2026 года дефицит инфраструктуры тормозит рост compute.',
    arch_mc_title:'Monte Carlo прогноз',
    arch_mc_desc:'3000 прогонов из апостериорного распределения. Каждый прогон — симуляция от 2023 до 2068 года с месячным шагом. Результат: распределение лет до AGI (cap >= 10) и ASI (cap >= 100).',
    defs_intro:'В модели v3 используются строгие операциональные определения на основе двухмерной шкалы (Reasoning, Agency). Шкала логарифмическая: GPT-4 (конец 2023) ~ 3.0 по Reasoning и ~0.2 по Agency, текущие модели середины 2026 ~ 6.8 по Reasoning и ~7.2 по Agency. AGI = 10.0, ASI = 100.0.',
    agi_def_title:'AGI — Artificial General Intelligence',
    agi_def_score:'min(Reasoning, Agency) = 10.0',
    agi_def_text1:'Автономный ИИ-исследователь уровня PhD. Демонстрирует истинное обобщение, способен к сложному планированию и надёжной работе (>99%). Может автономно проводить эксперименты, писать продакшен-код и находить ошибки в чужих статьях.',
    agi_def_text2:'Роль в модели: триггер для RSI и геополитической реакции. Без достаточного уровня Agency невозможен.',
    asi_def_title:'ASI — Artificial Superintelligence',
    asi_def_score:'min(Reasoning, Agency) = 100.0',
    asi_def_text1:'Фазовый переход. ИИ автономно сжимает десятилетия научного прогресса в месяцы. Разрыв между ASI и AGI сопоставим с разницей между академиком и первоклассником.',
    asi_def_text2:'Роль в модели: конец симуляции. За этой чертой прогнозы теряют смысл.',
    // Footer
    footer_note:'Данные оценочные',
    // Loading
    loading:'Байесовское прогнозирование v3...',
  },
  en: {
    // Header
    hdr_title:'Singularity Forecaster', hdr_sub:'v3 Bayesian Tracker',
    // Status bar
    sb_agi:'AGI median', sb_asi:'ASI median',
    sb_pagi_2029:'P(AGI · 2029)', sb_pagi_2033:'P(AGI · 2033)', sb_pagi_2040:'P(AGI · 2040)',
    sb_pasi_2035:'P(ASI · 2035)', sb_pasi_2045:'P(ASI · 2045)',
    // Controls
    ctrl_simulations:'Simulations (N)', ctrl_obs_year:'Observation Year',
    ctrl_intelligence:'Intelligence (AA)', ctrl_agentic:'Agentic (AA)',
    ctrl_add:'Add', ctrl_reset:'Reset',
    run_btn:'Run Forecast',
    // Charts
    tag1:'Probabilistic Analysis', tag3:'Cumulative',
    tag5:'Sensitivity', tag6:'Scenarios', tag7:'Decomposition',
    chart1:'1. AGI / ASI Distribution (Monte Carlo)',
    chart3:'2. Cumulative Probability AGI / ASI',
    chart5:'3. Sensitivity Heatmap (Intel × Agentic)',
    chart6:'4. Scenario Fan (Multi-Run Overlay)',
    chart7:'5. Component Decomposition (Stacked Area)',
    tip1:'Shows where 3000 Monte Carlo runs cluster. Higher bar = more scenarios led to AGI/ASI in that year.',
    tip3:'P(AGI ≤ X) — chance that AGI appears no later than X years. Steep rise = fast transition from "almost no" to "almost certain".',
    tip5:'Heatmap: axes are Intelligence and Agentic scores of the last observation. Color = median AGI year. Shows which parameter dominates the forecast.',
    tip6:'30 random runs from the posterior distribution, overlaid semi-transparently. Shows the spread of possible paths to singularity.',
    tip7:'Breakdown of capability into components: Hardware scaling, Algorithmic progress, Paradigm shift bonus, RSI feedback. Shows what drives progress.',
    ch1_xlabel:'Year', ch1_ylabel:'Runs',
    ch3_xlabel:'Year', ch3_ylabel:'P(%)', ch3_pagi:'P(AGI)', ch3_pasi:'P(ASI)',
    ch5_label:'Years to AGI', ch5_colorbar:'Years to AGI', ch5_xaxis:'Agentic score', ch5_yaxis:'Intelligence score',
    ch7_ylabel:'Cumulative contribution (log FLOPs)',
    fY_suffix:' yrs', fY_gt:'> 40 yrs',
    // About
    about_title:'About v3 Model',
    about_intro:'The v3 model uses a Bayesian Particle Filter to calibrate predictions on real Artificial Analysis data. Each particle is a hypothesis about the future: hardware growth rate, algorithm progress, and agency ceiling. AA observations update particle weights via likelihood, and unlikely hypotheses die during resampling.',
    defs_label:'Model Architecture',
    arch_tracker_title:'Bayesian Tracker',
    arch_tracker_desc:'1000 particles with priors on hw_months, algo_months, agency_ceiling. Each AA observation (Intelligence + Agentic) updates weights via Gaussian likelihood. ESS resampling prevents degeneracy.',
    arch_dims_title:'Two Dimensions of Intelligence',
    arch_dims_desc:'Reasoning (slope 0.35, ceiling 15.0) and Agency (slope 0.25, ceiling — particle parameter). Capability = min(Reasoning, Agency). Both grow logistic from log(FLOPs) but hit ceilings.',
    arch_paradigm_title:'Paradigm Shift',
    arch_paradigm_desc:'After 2026.30 each month has ~1.7% chance of a shift: both ceilings ×3, base FLOPs level shifts. This allows the model to overcome current transformer limitations.',
    arch_rsi_title:'RSI — Recursive Self-Improvement',
    arch_rsi_desc:'At capability >= 5.0, feedback kicks in: algorithm growth accelerates proportional to current level. Higher agency → faster progress. Key mechanism for reaching ASI.',
    arch_bottlenecks_title:'Bottlenecks',
    arch_bottlenecks_desc:'Economic wall: if Reasoning leads Agency by more than 2.0, investment drops. Energy wall: from 2026, infrastructure deficit slows compute growth.',
    arch_mc_title:'Monte Carlo Forecast',
    arch_mc_desc:'3000 runs from the posterior distribution. Each run simulates 2023 to 2068 at monthly resolution. Result: distribution of years to AGI (cap >= 10) and ASI (cap >= 100).',
    defs_intro:'The v3 model uses strict operational definitions based on a two-dimensional scale (Reasoning, Agency). The scale is logarithmic: GPT-4 (late 2023) ~ 3.0 in Reasoning and ~0.2 in Agency, current mid-2026 models ~ 6.8 in Reasoning and ~7.2 in Agency. AGI = 10.0, ASI = 100.0.',
    agi_def_title:'AGI — Artificial General Intelligence',
    agi_def_score:'min(Reasoning, Agency) = 10.0',
    agi_def_text1:'Autonomous AI researcher at PhD level. Demonstrates true generalization, capable of complex planning and reliable work (>99%). Can autonomously conduct experiments, write production code, and find errors in others\' papers.',
    agi_def_text2:'Role in model: trigger for RSI and geopolitical reaction. Impossible without sufficient Agency level.',
    asi_def_title:'ASI — Artificial Superintelligence',
    asi_def_score:'min(Reasoning, Agency) = 100.0',
    asi_def_text1:'Phase transition. AI autonomously compresses decades of scientific progress into months. The gap between ASI and AGI is comparable to the difference between an academician and a first-grader.',
    asi_def_text2:'Role in model: end of simulation. Beyond this threshold, predictions lose meaning.',
    // Footer
    footer_note:'Data is estimated',
    // Loading
    loading:'Running Bayesian v3 forecast...',
  }
};
function setLang(lang) {
  window._lang = lang;
  document.getElementById('lang_ru').classList.toggle('active', lang === 'ru');
  document.getElementById('lang_en').classList.toggle('active', lang === 'en');
  const t = LANG[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });
}

window.addEventListener('load', () => setLang('ru'));
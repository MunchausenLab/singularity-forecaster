
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
    SCALING_LAW: { paradigm_shift_prob: 0.20, shift_multiplier: 3.0,
                   endo_base: 0.05, endo_pressure: 0.8, endo_exhaust: 0.5 },
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
    if (sum < 1e-300) { this.weights.fill(1.0 / this.n); return; }
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
        
        const logDiff = flopsLog + algoLog - baseLog;
        const rawR = v3ComputeDim(logDiff, this.cfg.DIMENSIONS.reasoning.slope, ceilingReasoning);
        const rawA = v3ComputeDim(logDiff, this.cfg.DIMENSIONS.agency.slope, ceilingAgency);

        const reasoning = v3ApplyInference(rawR, this.cfg.INFERENCE_SCALING.max_bonus_reasoning, this.cfg.INFERENCE_SCALING.saturation_cap);
        const agency = v3ApplyInference(rawA, this.cfg.INFERENCE_SCALING.max_bonus_agency, this.cfg.INFERENCE_SCALING.saturation_cap);

        const cap = Math.min(reasoning, agency);

        // Эндогенная смена парадигмы: вероятность зависит от saturation и research pressure
        if (currentYear > this.cfg.CURRENT_YEAR) {
          // Насколько текущий интеллект близок к потолку (0..1+)
          const satR = ceilingReasoning > 0 ? reasoning / ceilingReasoning : 0;
          const satA = ceilingAgency > 0 ? agency / ceilingAgency : 0;
          const saturation = Math.max(satR, satA);
          // Давление исследований: чем умнее модели, тем быще ищут новые архитектуры
          const researchPressure = Math.min(cap / 20.0, 1.0);
          // Базовая вероятность + давление от saturation, но exhaustion если давно не было прорыва
          const shiftProb = this.cfg.SCALING_LAW.endo_base
            + this.cfg.SCALING_LAW.endo_pressure * saturation * researchPressure;
          if (Math.random() < shiftProb * dt) {
            ceilingAgency *= this.cfg.SCALING_LAW.shift_multiplier;
            ceilingReasoning *= this.cfg.SCALING_LAW.shift_multiplier;
            baseLog -= 0.5; // compute overhang release
          }
        }
        
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
  v3Observations = v3Observations.filter(o => o.year < y - 0.01);
  v3Observations.push({ year: y, intel: i, agentic: a });
  v3Tracker = new BayesianTracker(1000);
  AA_FRONTIER_DATA.forEach(d => v3Tracker.observeAAData(d.year, d.intel, d.agentic, 1.5));
  v3Observations.forEach(d => v3Tracker.observeAAData(d.year, d.intel, d.agentic, 2.0));
  v3UpdateUI(v3Tracker);
}

function v3ResetTracker() {
  v3Tracker = null; v3Observations = [];
  document.getElementById('v3Observations').innerHTML = '';
  document.getElementById('v3Params').textContent = '';
}

function v3UpdateUI(tracker) {
  v3CheckWarning(tracker);
}

function v3CheckWarning(tracker) {
  const warnEl = document.getElementById('v3Warning');
  if (!warnEl) return;
  const curI = +document.getElementById('v3Intel').value;
  const curA = +document.getElementById('v3Agentic').value;
  const tR = curI / 10.0, tA = curA / 10.0;
  let minDist = Infinity;
  for (let i = 0; i < Math.min(tracker.n, 100); i++) {
    if (tracker.weights[i] < 0.001) continue;
    const pred = v3SimulateToYear(tracker.particles[i], tracker.cfg.CURRENT_YEAR, tracker.cfg);
    const dist = Math.sqrt((tR - pred.reasoning) ** 2 + (tA - pred.agency) ** 2);
    if (dist < minDist) minDist = dist;
  }
  if (minDist > 8.0) {
    warnEl.style.display = '';
    warnEl.textContent = '⚠️ Значения далеко от диапазона частиц — модель не может надёжно экстраполировать. Прогноз ближе к априорному.';
  } else {
    warnEl.style.display = 'none';
  }
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
    const currentY = +document.getElementById('v3Year').value;
    const currentI = +document.getElementById('v3Intel').value;
    const currentA = +document.getElementById('v3Agentic').value;
    v3Tracker = new BayesianTracker(1000);
    AA_FRONTIER_DATA.forEach(d => v3Tracker.observeAAData(d.year, d.intel, d.agentic, 1.5));
    v3Observations.forEach(d => v3Tracker.observeAAData(d.year, d.intel, d.agentic, 2.0));
    v3Observations = v3Observations.filter(o => o.year < currentY - 0.01);
    v3Observations.push({ year: currentY, intel: currentI, agentic: currentA });
    v3Tracker.observeAAData(currentY, currentI, currentA, 2.0);
    const tracker = v3Tracker;
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
    if (typeof liveSwarm !== 'undefined') liveSwarm.tracker = tracker;
    if (typeof swarm !== 'undefined' && swarm) swarm.tracker = tracker;
  } finally {
    simulationRunning = false; btn.disabled = false; overlay.classList.remove('show');
  }
}

function updateUI(r) {
  const s = r.summary, fmt = yearsText;
  setVal('vAGI', fmt(s.agiMedian), 'agiyears'); setVal('vASI', fmt(s.asiMedian), 'asiyears');
  const tracker = v3GetTracker();
  if (tracker) {
    const sum = tracker.getSummary();
    const ess = 1.0 / tracker.weights.reduce((a, b) => a + b * b, 0);
    setVal('vHW', sum.hwMonths.toFixed(1) + ' мес');
    setVal('vAlgo', sum.algoMonths.toFixed(1) + ' мес');
    setVal('vAgency', sum.agencyCeiling.toFixed(2));
    setVal('vESS', ess.toFixed(0));
  }
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
    sb_hw:'Удвоение HW', sb_algo:'Удвоение Algo', sb_agency:'Потолок Agency', sb_ess:'ESS',
    // Controls
    ctrl_simulations:'Симуляции (N)', ctrl_obs_year:'Год наблюдения',
    ctrl_intelligence:'Интеллект (AA)', ctrl_agentic:'Агентность (AA)',
    ctrl_add:'Добавить', ctrl_reset:'Сбросить',
    run_btn:'Запустить симуляцию',
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
    // Swarm
    swarm_title:'Анимация: «Сжатие роя»',
    swarm_desc:'Интерактивная визуализация байесовского обучения. Режим «Обучение» показывает как наблюдения убивают слабые гипотезы. Режим «Прогноз» разворачивает выжившие гипотезы в предсказания AGI/ASI.',
    swarm_play:'Запуск', swarm_reset:'Сброс', swarm_hint:'Нажмите «Запуск» или перетаскивайте ползунок',
    swarm_mode_learn:'Обучение', swarm_mode_forecast:'Прогноз',
    swarm_play_forecast:'Анимация',
    forecast_xaxis:'Год AGI', forecast_yaxis:'Удвоение HW (мес)',
    forecast_pagi:'P(AGI до 2068)', forecast_median:'Медиана AGI',
    forecast_overlay:'AGI ≤', forecast_overlay_desc:'Показаны гипотезы с AGI до',
    live_swarm_title:'Симуляция в реальном времени', live_swarm_desc:'Каждые 0.25 сек рой перерисовывается из нового прогона Monte Carlo.',
    swarm_play_forecast:'Анимация',
    // Event Horizon
    eh_title:'Визуализация: «Сфера Сингулярности»',
    eh_desc:'Каждая частица — один прогон Monte Carlo. Вылетает из центра (2026) и застывает на орбите своего года AGI. Плотные кольца = высокая вероятность. Оранжевые орбиты — AGI, красные — ASI.',
    eh_play:'Запуск', eh_reset:'Сброс',
  },
  en: {
    hdr_title:'Singularity Forecaster', hdr_sub:'v3 Bayesian Tracker',
    // Status bar
    sb_agi:'AGI median', sb_asi:'ASI median',
    sb_pagi_2029:'P(AGI · 2029)', sb_pagi_2033:'P(AGI · 2033)', sb_pagi_2040:'P(AGI · 2040)',
    sb_pasi_2035:'P(ASI · 2035)', sb_pasi_2045:'P(ASI · 2045)',
    sb_hw:'HW Doubling', sb_algo:'Algo Doubling', sb_agency:'Agency Ceiling', sb_ess:'ESS',
    // Controls
    ctrl_simulations:'Simulations (N)', ctrl_obs_year:'Observation Year',
    ctrl_intelligence:'Intelligence (AA)', ctrl_agentic:'Agentic (AA)',
    ctrl_add:'Add', ctrl_reset:'Reset',
    run_btn:'Run Simulation',
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
    // Swarm
    swarm_title:'Bayesian Particle Swarm',
    swarm_desc:'Interactive visualization of Bayesian learning. "Learning" mode shows how observations kill weak hypotheses. "Forecast" mode unfolds surviving hypotheses into AGI/ASI predictions.',
    swarm_play:'Play', swarm_reset:'Reset', swarm_hint:'Press Play or drag the slider',
    swarm_mode_learn:'Learning', swarm_mode_forecast:'Forecast',
    swarm_play_forecast:'Animate',
    forecast_xaxis:'AGI Year', forecast_yaxis:'HW Doubling (mo)',
    forecast_pagi:'P(AGI by 2068)', forecast_median:'AGI Median',
    forecast_overlay:'AGI ≤', forecast_overlay_desc:'Showing hypotheses with AGI by',
    live_swarm_title:'Real-time Simulation', live_swarm_desc:'Every 0.25s the swarm redraws from a new Monte Carlo run.',
    // Event Horizon
    eh_title:'Visualization: "Sphere of Singularity"',
    eh_desc:'Each particle is one Monte Carlo run. Flies from center (2026) and freezes at its AGI year orbit. Dense rings = high probability. Orange orbits — AGI, red — ASI.',
    eh_play:'Play', eh_reset:'Reset',
  }
};

// ===== PARTICLE SWARM ANIMATION =====
// ===== PARTICLE SWARM v3 =====
let swarm = { mode:'learn', obsIdx:0, tracker:null, particles:[], weights:[], animating:false, rafId:null, agiYears:null, asiYears:null, forecastSliderMax:0, forecastAnimating:false, forecastRafId:null, asiAnimating:false, asiRafId:null, showASI:false };

// Pre-compute AGI and ASI years using the same MC forecast as the main charts
// Returns { agiYears: [{agiYear, hw, w}], asiYears: [{asiYear, hw, w}] }
// Note: runMonteCarloForecast returns years relative to CURRENT_YEAR
function swarmComputeAGIYears(tracker) {
  const mc = tracker.runMonteCarloForecast(500);
  const cfg = tracker.cfg;
  const curYear = cfg.CURRENT_YEAR;
  const cumw = new Float64Array(tracker.n);
  cumw[0] = tracker.weights[0];
  for (let i = 1; i < tracker.n; i++) cumw[i] = cumw[i-1] + tracker.weights[i];

  const agiResults = [], asiResults = [];
  for (let run = 0; run < mc.agiYears.length; run++) {
    const u = (run + 0.5) / mc.agiYears.length;
    let idx = 0;
    while (idx < tracker.n - 1 && cumw[idx] < u) idx++;
    const p = tracker.particles[idx];
    agiResults.push({ year: mc.agiYears[run] + curYear, hw: p.hw_months, w: 1.0 / mc.agiYears.length });
    asiResults.push({ year: mc.asiYears[run] + curYear, hw: p.hw_months, w: 1.0 / mc.asiYears.length });
  }
  return { agi: agiResults, asi: asiResults };
}

function swarmBuildTracker(idx) {
  const t = new BayesianTracker(1000);
  for (let i = 0; i < idx && i < AA_FRONTIER_DATA.length; i++) {
    const d = AA_FRONTIER_DATA[i];
    t.observeAAData(d.year, d.intel, d.agentic, 1.5);
  }
  return t;
}

function swarmInit() {
  const c = document.getElementById('swarmCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  c.width = c.offsetWidth * dpr; c.height = c.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
  swarm.tracker = swarmBuildTracker(swarm.obsIdx);
  swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months }));
  swarm.weights = Array.from(swarm.tracker.weights);
  swarmDraw();
}

function swarmSetMode(m) {
  swarm.mode = m;
  document.getElementById('swarmModeLearn').classList.toggle('active', m === 'learn');
  document.getElementById('swarmModeForecast').classList.toggle('active', m === 'forecast');
  const slider = document.getElementById('swarmSlider');
  const labels = document.getElementById('swarmSliderLabels');
  if (m === 'forecast') {
    // Use the same tracker as the main forecast (v3Tracker), fallback to full AA data
    if (typeof v3Tracker !== 'undefined' && v3Tracker) {
      swarm.tracker = v3Tracker;
    } else if (typeof v3GetTracker === 'function') {
      swarm.tracker = v3GetTracker();
    } else {
      swarm.tracker = swarmBuildTracker(AA_FRONTIER_DATA.length);
    }
    swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months }));
    swarm.weights = Array.from(swarm.tracker.weights);
    swarm.agiYears = null;
    swarm.asiYears = null;
    const mcData = swarmComputeAGIYears(swarm.tracker);
    swarm.agiYears = mcData.agi;
    swarm.asiYears = mcData.asi;
    if (slider) { slider.min = 2020; slider.max = 2068; slider.step = 1; slider.value = 2068; }
    swarm.forecastSliderMax = 2068;
    if (labels) labels.innerHTML = '<span>2020</span><span></span><span>2038</span><span></span><span>2048</span><span></span><span>2058</span><span>2068</span>';
  } else {
    swarm.tracker = swarmBuildTracker(swarm.obsIdx);
    swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months }));
    swarm.weights = Array.from(swarm.tracker.weights);
    if (slider) { slider.min = 0; slider.max = AA_FRONTIER_DATA.length; slider.step = 1; slider.value = swarm.obsIdx; }
    if (labels) labels.innerHTML = '<span>2020</span><span></span><span>2024</span><span></span><span>2025</span><span></span><span>2026</span><span>2026.5</span>';
  }
  swarmDraw();
}

function swarmSetTarget(target) {
  swarm.showASI = (target === 'asi');
  document.getElementById('swarmTargetAGI').classList.toggle('active', target === 'agi');
  document.getElementById('swarmTargetASI').classList.toggle('active', target === 'asi');
  const slider = document.getElementById('swarmSlider');
  const labels = document.getElementById('swarmSliderLabels');
  if (swarm.showASI) {
    if (slider) { slider.min = 2020; slider.max = 2068; slider.value = 2068; }
    swarm.forecastSliderMax = 2068;
    if (labels) labels.innerHTML = '<span>2020</span><span></span><span>2040</span><span></span><span>2050</span><span></span><span>2060</span><span>2068</span>';
  } else {
    if (slider) { slider.min = 2020; slider.max = 2068; slider.value = 2068; }
    swarm.forecastSliderMax = 2068;
    if (labels) labels.innerHTML = '<span>2020</span><span></span><span>2038</span><span></span><span>2048</span><span></span><span>2058</span><span>2068</span>';
  }
  swarmDraw();
}

function swarmOnSlider(v) {
  v = +v;
  if (swarm.mode === 'learn') {
    swarm.obsIdx = v;
    swarm.tracker = swarmBuildTracker(v);
    swarm.weights = Array.from(swarm.tracker.weights);
    swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months }));
    swarm.agiYears = null; // invalidate cache when tracker changes
  } else {
    // forecast mode: slider = AGI year cutoff
    swarm.forecastSliderMax = v;
  }
  swarmDraw();
}

function swarmDraw() {
  const c = document.getElementById('swarmCanvas');
  if (!c || !swarm.tracker) return;
  const ctx = c.getContext('2d');
  const w = c.offsetWidth, h = c.offsetHeight;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, w, h);
  const pad = 50, pw = w - pad * 2, ph = h - pad * 2;
  ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const x = pad + (pw * i / 5); ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke();
    const y = pad + (ph * i / 5); ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }
  if (swarm.mode === 'learn') swarmDrawLearn(ctx, w, h, pad, pw, ph);
  else swarmDrawForecast(ctx, w, h, pad, pw, ph);
  swarmDrawOverlay(ctx, w, h, pad);
}

function swarmDrawLearn(ctx, w, h, pad, pw, ph) {
  const maxW = Math.max(...swarm.weights, 1e-10);
  const bins = 40;
  const binW = 20 / bins, binH = 24 / bins;
  const grid = new Float64Array(bins * bins);
  for (let i = 0; i < swarm.particles.length; i++) {
    const px = Math.min(bins - 1, Math.max(0, Math.floor((swarm.particles[i].x - 2) / binW)));
    const py = Math.min(bins - 1, Math.max(0, Math.floor((swarm.particles[i].y - 1) / binH)));
    grid[py * bins + px] += swarm.weights[i];
  }
  const maxBin = Math.max(...grid, 1e-10);
  for (let by = 0; by < bins; by++) {
    for (let bx = 0; bx < bins; bx++) {
      const d = grid[by * bins + bx] / maxBin;
      if (d < 0.01) continue;
      const alpha = Math.min(1, d * 1.5);
      const r = Math.floor(88 + d * 100), g = Math.floor(100 + d * 66), b = Math.floor(180 + d * 75);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.6})`;
      ctx.fillRect(pad + (bx / bins) * pw, h - pad - ((by + 1) / bins) * ph, pw / bins + 0.5, ph / bins + 0.5);
    }
  }
  const cx = pad + ((5 - 2) / 18) * pw, cy = h - pad - ((8 - 1) / 24) * ph;
  ctx.strokeStyle = '#f0883e'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.stroke();
  if (swarm.obsIdx > 0 && swarm.obsIdx <= AA_FRONTIER_DATA.length) {
    const obs = AA_FRONTIER_DATA[swarm.obsIdx - 1];
    const ox = pad + (((obs.intel / 10) - 2) / 18) * pw;
    const oy = h - pad - (((obs.agentic / 10) - 1) / 24) * ph;
    ctx.strokeStyle = '#ef4444'; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ox, oy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#58a6ff'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'left';
  ctx.fillText('Медиана роя', pad + 4, pad + 12);
  ctx.fillStyle = '#666680'; ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('Удвоение HW (мес)', w / 2, h - 8);
  ctx.save(); ctx.translate(12, h / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText('Потолок Agency', 0, 0); ctx.restore();
  ctx.fillStyle = '#ef4444'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'right';
  ctx.fillText('Наблюдение', w - pad - 4, pad + 12);
}

function swarmDrawForecast(ctx, w, h, pad, pw, ph) {
  if (!swarm.agiYears) {
    const mcData = swarmComputeAGIYears(swarm.tracker);
    swarm.agiYears = mcData.agi;
    swarm.asiYears = mcData.asi;
  }
  const years = swarm.showASI ? swarm.asiYears : swarm.agiYears;
  const cutoff = swarm.forecastSliderMax || 2068;
  const xMin = 2020;
  const xMax = 2068;
  const yMin = 0, yMax = 16;
  const cfg = swarm.tracker.cfg;

  function yearToX(yr) { return pad + ((yr - xMin) / (xMax - xMin)) * pw; }
  function hwToY(hw) { return h - pad - ((hw - yMin) / (yMax - yMin)) * ph; }

  // background: AGI zone highlight (cutoff line)
  ctx.strokeStyle = '#f0883e22'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  const cx = yearToX(cutoff);
  ctx.beginPath(); ctx.moveTo(cx, pad); ctx.lineTo(cx, h - pad); ctx.stroke();
  ctx.setLineDash([]);

  // grid
  for (let yr = 2020; yr <= 2065; yr += 5) {
    const x = yearToX(yr);
    ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke();
    ctx.fillStyle = yr <= cutoff ? '#666680' : '#333340';
    ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText(yr.toString(), x, h - pad + 12);
  }
  for (let hw = 0; hw <= 16; hw += 4) {
    const y = hwToY(hw);
    ctx.strokeStyle = '#1a1a2a'; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    ctx.fillStyle = '#444460'; ctx.textAlign = 'right';
    ctx.fillText(hw.toString(), pad - 4, y + 3);
  }

  // Count visible (AGI year <= cutoff) and compute median among visible
  let totalW = 0, visW = 0;
  const visPts = [];
  for (let i = 0; i < years.length; i++) {
    const pt = years[i];
    const wt = pt.w;
    totalW += wt;
    if (isFinite(pt.year) && pt.year <= cutoff) {
      visW += wt;
      visPts.push({ x: pt.year, y: pt.hw, w: wt });
    }
  }

  // color scale
  function agiColor(t) {
    if (t < 0.5) {
      const s = t * 2;
      return `rgba(${Math.floor(88+s*168)},${Math.floor(166+s*54)},${Math.floor(255-s*155)},0.85)`;
    } else {
      const s = (t - 0.5) * 2;
      return `rgba(255,${Math.floor(220-s*120)},${Math.floor(100-s*100)},0.85)`;
    }
  }

  // Draw all MC runs: visible colored, invisible grayed out
  const maxW = visPts.length > 0 ? Math.max(...visPts.map(p => p.w), 1e-10) : 1;
  for (let i = 0; i < years.length; i++) {
    const pt = years[i];
    const agiYr = pt.year;
    const r = 1 + (pt.w / maxW) * 8;
    if (isFinite(agiYr) && agiYr <= cutoff) {
      const t = Math.max(0, Math.min(1, (agiYr - xMin) / (xMax - xMin)));
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = agiColor(t);
    } else if (isFinite(agiYr)) {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#333350';
    } else {
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#222230';
    }
    ctx.beginPath(); ctx.arc(yearToX(isFinite(agiYr) ? agiYr : xMax), hwToY(pt.hw), r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // labels
  const xLabel = swarm.showASI ? 'Год ASI' : (LANG[window._lang||'ru'].forecast_xaxis || 'Год AGI');
  ctx.fillStyle = '#666680'; ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.fillText(xLabel, w / 2, h - 6);
  ctx.save(); ctx.translate(10, h / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText(LANG[window._lang||'ru'].forecast_yaxis || 'Удвоение HW (мес)', 0, 0); ctx.restore();

  // stats
  const pct = totalW > 0 ? (visW / totalW * 100) : 0;
  const pLabel = swarm.showASI ? 'P(ASI)' : (LANG[window._lang||'ru'].forecast_pagi || 'P(AGI)');
  const mLabel = swarm.showASI ? 'Медиана ASI' : (LANG[window._lang||'ru'].forecast_median || 'Медиана AGI');
  ctx.fillStyle = '#f0883e'; ctx.font = 'bold 11px JetBrains Mono, monospace'; ctx.textAlign = 'left';
  ctx.fillText(`${pLabel}: ${pct.toFixed(1)}%`, pad + 4, pad + 12);

  if (visPts.length > 0) {
    visPts.sort((a, b) => a.x - b.x);
    let cum = 0, median = xMax;
    const half = visW / 2;
    for (const p of visPts) {
      cum += p.w;
      if (cum >= half) { median = p.x; break; }
    }
    ctx.fillStyle = '#58a6ff'; ctx.textAlign = 'center';
    ctx.fillText(`${mLabel}: ${median.toFixed(1)}`, w / 2, pad + 12);
  }

  // cutoff label
  ctx.fillStyle = '#f0883e'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'center';
  ctx.fillText(`${cutoff}`, cx, pad - 4);

  // color legend
  const lx = w - pad - 120, ly = pad + 4, lw = 100, lh = 8;
  const grad = ctx.createLinearGradient(lx, 0, lx + lw, 0);
  grad.addColorStop(0, agiColor(0)); grad.addColorStop(0.5, agiColor(0.5)); grad.addColorStop(1, agiColor(1));
  ctx.fillStyle = grad; ctx.globalAlpha = 0.7; ctx.fillRect(lx, ly, lw, lh); ctx.globalAlpha = 1;
  ctx.fillStyle = '#666680'; ctx.font = '8px JetBrains Mono, monospace'; ctx.textAlign = 'left';
  ctx.fillText('2020', lx, ly + lh + 10);
  ctx.textAlign = 'right'; ctx.fillText('2065', lx + lw, ly + lh + 10);
}

function swarmDrawOverlay(ctx, w, h, pad) {
  const ess = 1.0 / swarm.weights.reduce((a, b) => a + b * b, 0);
  ctx.fillStyle = '#666680'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'left';
  ctx.fillText(`ESS: ${ess.toFixed(0)} | частиц: ${swarm.particles.length}`, pad + 4, pad - 4);
  const slider = document.getElementById('swarmSlider');
  const ov = document.getElementById('swarmOverlay');
  const leg = document.getElementById('swarmLegend');
  const playBtn = document.getElementById('swarmPlayBtn');
  const hint = document.getElementById('swarmHint');

  if (swarm.mode === 'forecast') {
    // forecast mode: slider shows AGI year cutoff
    if (slider) { slider.style.display = ''; slider.value = swarm.forecastSliderMax || 2068; }
    if (playBtn) {
      playBtn.style.display = '';
      const span = playBtn.querySelector('span');
      span.textContent = LANG[window._lang||'ru'].swarm_play_forecast || 'Анимация';
      playBtn.onclick = swarmPlay;
    }
    const targetToggle = document.getElementById('swarmTargetToggle');
    if (targetToggle) targetToggle.style.display = '';
    if (hint) hint.style.display = 'none';
    if (ov) {
      const target = swarm.showASI ? 'ASI' : 'AGI';
      const fc = swarm.forecastSliderMax || 2068;
      ov.innerHTML = `<div style="font-size:.75rem;color:#f0883e;font-weight:600">${target} ≤ ${fc}</div><div style="font-size:.68rem;color:#9898b0">Показаны гипотезы с ${target} до ${fc}</div>`;
      ov.style.opacity = '1';
    }
    if (leg) {
      if (swarm.showASI) {
        leg.innerHTML = '<span style="color:#58a6ff">●</span> ASI < 2040 &nbsp; <span style="color:#ffcc00">●</span> 2040-2055 &nbsp; <span style="color:#ef4444">●</span> > 2055 &nbsp; <span style="color:#444">◌</span> Не достигнет';
      } else {
        leg.innerHTML = '<span style="color:#58a6ff">●</span> AGI < 2040 &nbsp; <span style="color:#ffcc00">●</span> 2040-2055 &nbsp; <span style="color:#ef4444">●</span> > 2055 &nbsp; <span style="color:#444">◌</span> Не достигнет';
      }
    }
  } else {
    // learn mode: slider shows observation index
    if (slider) { slider.style.display = ''; slider.value = swarm.obsIdx; }
    if (playBtn) playBtn.style.display = '';
    const targetToggleL = document.getElementById('swarmTargetToggle');
    if (targetToggleL) targetToggleL.style.display = 'none';
    if (hint) hint.style.display = '';
    if (swarm.obsIdx > 0 && swarm.obsIdx <= AA_FRONTIER_DATA.length) {
      const obs = AA_FRONTIER_DATA[swarm.obsIdx - 1];
      if (ov) { ov.innerHTML = `<div style="font-size:.75rem;color:#f0883e;font-weight:600">${obs.year.toFixed(2)}</div><div style="font-size:.68rem;color:#9898b0">${obs.event}</div><div style="font-size:.65rem;color:#666680;margin-top:4px">I=${obs.intel.toFixed(0)} A=${obs.agentic.toFixed(1)}</div>`; ov.style.opacity = '1'; }
    } else { if (ov) ov.style.opacity = '0'; }
    if (leg) {
      leg.innerHTML = '<span style="color:#58a6ff">●</span> Плотность роя &nbsp; <span style="color:#ef4444">●</span> Наблюдение &nbsp; <span style="color:#f0883e">●</span> Медиана';
    }
  }
}

function swarmPlay() {
  if (swarm.mode === 'forecast') {
    // Forecast mode: animate AGI year slider
    if (swarm.forecastAnimating) {
      swarm.forecastAnimating = false;
      clearTimeout(swarm.forecastRafId);
      document.getElementById('swarmPlayBtn').querySelector('span').textContent = LANG[window._lang||'ru'].swarm_play_forecast || 'Анимация';
      return;
    }
    swarm.forecastAnimating = true;
    document.getElementById('swarmPlayBtn').querySelector('span').textContent = '⏸';
    // Reset ASI animation too
    if (swarm.asiAnimating) { swarm.asiAnimating = false; clearTimeout(swarm.asiRafId); }
    let year = 2020;
    const step = () => {
      if (!swarm.forecastAnimating || year > 2068) {
        swarm.forecastAnimating = false;
        document.getElementById('swarmPlayBtn').querySelector('span').textContent = LANG[window._lang||'ru'].swarm_play_forecast || 'Анимация';
        return;
      }
      swarm.forecastSliderMax = year;
      swarmDraw();
      year++;
      swarm.forecastRafId = setTimeout(step, 150);
    };
    step();
  } else {
    // Learn mode: animate observations
    if (swarm.animating) {
      swarm.animating = false;
      clearTimeout(swarm.rafId);
      document.getElementById('swarmPlayBtn').querySelector('span').textContent = LANG[window._lang||'ru'].swarm_play || 'Запуск';
      return;
    }
    if (swarm.obsIdx >= AA_FRONTIER_DATA.length) { swarm.obsIdx = 0; swarmInit(); }
    swarm.animating = true;
    document.getElementById('swarmPlayBtn').querySelector('span').textContent = '⏸';
    function step() {
      if (!swarm.animating || swarm.obsIdx >= AA_FRONTIER_DATA.length) {
        swarm.animating = false;
        document.getElementById('swarmPlayBtn').querySelector('span').textContent = LANG[window._lang||'ru'].swarm_play || 'Запуск';
        return;
      }
      swarm.obsIdx++;
      swarm.tracker = swarmBuildTracker(swarm.obsIdx);
      swarm.weights = Array.from(swarm.tracker.weights);
      swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months }));
      swarmDraw();
      swarm.rafId = setTimeout(step, 800);
    }
    step();
  }
}

function swarmReset() {
  swarm.animating = false; clearTimeout(swarm.rafId);
  swarm.forecastAnimating = false; clearTimeout(swarm.forecastRafId);
  swarm.obsIdx = 0; swarmInit();
  document.getElementById('swarmPlayBtn').innerHTML = '<span>' + (LANG[window._lang||'ru'].swarm_play||'Запуск') + '</span>';
  const playFBtn = document.getElementById('swarmPlayForecastBtn');
  if (playFBtn) playFBtn.innerHTML = '<span>' + (LANG[window._lang||'ru'].swarm_play_forecast||'Анимация') + '</span>';
  document.getElementById('swarmOverlay').style.opacity = '0';
}

// ===== LIVE SWARM: AGI (blue) + ASI (red) side by side =====
let liveSwarm = { tracker:null, timerAGI:null, timerASI:null };

function liveSwarmInit() {
  // Init both canvases
  ['liveSwarmAGI','liveSwarmASI'].forEach(id => {
    const c = document.getElementById(id);
    if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * dpr; c.height = c.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
  });

  // Use same tracker as main forecast
  if (typeof v3Tracker !== 'undefined' && v3Tracker) {
    liveSwarm.tracker = v3Tracker;
  } else if (typeof v3GetTracker === 'function') {
    liveSwarm.tracker = v3GetTracker();
  } else {
    liveSwarm.tracker = swarmBuildTracker(AA_FRONTIER_DATA.length);
  }
  liveSwarmTickAGI();
  liveSwarmTickASI();
}

function drawLiveSwarm(canvasId, statsId, yearsKey, colorMode) {
  const c = document.getElementById(canvasId);
  if (!c || !liveSwarm.tracker) return;
  const ctx = c.getContext('2d');
  const w = c.offsetWidth, h = c.offsetHeight;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, w, h);

  const pad = 40, pw = w - pad * 2, ph = h - pad * 2;

  // X range depends on AGI vs ASI
  const isASI = (colorMode === 'asi');
  const xMin = 2020;
  const xMax = 2068;
  const yMin = 0, yMax = 16;

  function yearToX(yr) { return pad + ((yr - xMin) / (xMax - xMin)) * pw; }
  function hwToY(hw) { return h - pad - ((hw - yMin) / (yMax - yMin)) * ph; }

  // Run fresh MC
  const mc = liveSwarm.tracker.runMonteCarloForecast(500);
  const cfg = liveSwarm.tracker.cfg;
  const curYear = cfg.CURRENT_YEAR;
  const n = liveSwarm.tracker.n;
  const cumw = new Float64Array(n);
  cumw[0] = liveSwarm.tracker.weights[0];
  for (let i = 1; i < n; i++) cumw[i] = cumw[i-1] + liveSwarm.tracker.weights[i];

  const yearData = isASI ? mc.asiYears : mc.agiYears;
  const pts = [];
  let totalW = 0;
  for (let run = 0; run < yearData.length; run++) {
    const u = (run + 0.5) / yearData.length;
    let idx = 0;
    while (idx < n - 1 && cumw[idx] < u) idx++;
    const p = liveSwarm.tracker.particles[idx];
    const yr = yearData[run] + curYear;
    if (isFinite(yr)) {
      pts.push({ x: yr, y: p.hw_months });
      totalW++;
    }
  }
  if (totalW === 0) return;

  // Color function: blue gradient for AGI, red gradient for ASI
  function particleColor(t) {
    if (colorMode === 'agi') {
      // Light blue -> deep blue
      const r = Math.floor(100 - t * 60);
      const g = Math.floor(180 - t * 80);
      const b = Math.floor(255 - t * 40);
      return `rgba(${r},${g},${b},0.85)`;
    } else {
      // Light red/pink -> deep red
      const r = Math.floor(255 - t * 40);
      const g = Math.floor(100 - t * 60);
      const b = Math.floor(120 - t * 80);
      return `rgba(${r},${g},${b},0.85)`;
    }
  }

  // Draw particles with jitter
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    const t = Math.max(0, Math.min(1, (pt.x - xMin) / (xMax - xMin)));
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = particleColor(t);
    const jx = (Math.random() - 0.5) * 1.5;
    const jy = (Math.random() - 0.5) * 1.5;
    ctx.beginPath();
    ctx.arc(yearToX(pt.x) + jx, hwToY(pt.y) + jy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Grid
  ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = 1;
  for (let yr = 2020; yr <= 2065; yr += 5) {
    const x = yearToX(yr);
    ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke();
    ctx.fillStyle = '#444460'; ctx.font = '8px JetBrains Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText(yr.toString(), x, h - pad + 10);
  }
  for (let hw = 0; hw <= 16; hw += 4) {
    const y = hwToY(hw);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    ctx.fillStyle = '#333350'; ctx.textAlign = 'right';
    ctx.fillText(hw.toString(), pad - 4, y + 3);
  }

  // Axis labels
  const lang = window._lang || 'ru';
  const xLabel = isASI ? (LANG[lang].forecast_xaxis.replace('AGI','ASI') || 'Год ASI') : (LANG[lang].forecast_xaxis || 'Год AGI');
  const yLabel = LANG[lang].forecast_yaxis || 'Удвоение HW (мес)';
  ctx.fillStyle = '#555570'; ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.fillText(xLabel, w / 2, h - 4);
  ctx.save(); ctx.translate(9, h / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0); ctx.restore();

  // Stats: median, P10-P90
  pts.sort((a, b) => a.x - b.x);
  const half = totalW / 2;
  let cum = 0, median = xMax;
  for (const p of pts) { cum++; if (cum >= half) { median = p.x; break; } }
  const pct10 = pts[Math.floor(totalW * 0.1)].x;
  const pct90 = pts[Math.floor(totalW * 0.9)].x;

  const statsEl = document.getElementById(statsId);
  if (statsEl) {
    const mLabel = isASI ? (LANG[lang].forecast_median.replace('AGI','ASI') || 'Медиана ASI') : (LANG[lang].forecast_median || 'Медиана AGI');
    statsEl.innerHTML = `${mLabel}: <b>${median.toFixed(1)}</b><br>P10–P90: ${pct10.toFixed(0)}–${pct90.toFixed(0)}<br>N = ${totalW}`;
  }
}

function liveSwarmTickAGI() {
  drawLiveSwarm('liveSwarmAGI', 'liveSwarmAGIStats', 'agiYears', 'agi');
  liveSwarm.timerAGI = setTimeout(liveSwarmTickAGI, 250);
}

function liveSwarmTickASI() {
  drawLiveSwarm('liveSwarmASI', 'liveSwarmASIStats', 'asiYears', 'asi');
  liveSwarm.timerASI = setTimeout(liveSwarmTickASI, 250);
}

// ===== EVENT HORIZON: Sphere of Singularity =====
const ehData = {
  particles: [],
  nTarget: 1000,
  launched: 0,
  animId: null,
  timerId: null,
  running: false,
  tracker: null,
  radii: {},
  stats: { agi: 0, asi: 0, total: 0 },
  years: [2026, 2028, 2030, 2032, 2035, 2040, 2045, 2050, 2055, 2060, 2068],
};

const EH_YEARS = [2026, 2028, 2030, 2032, 2035, 2040, 2045, 2050, 2055, 2060, 2068];

function yearToRadius(year, maxR) {
  // 2026 -> 20px (center), 2068 -> maxR
  const t = Math.max(0, Math.min(1, (year - 2026) / (2068 - 2026)));
  return 20 + t * (maxR - 20);
}

function ehInitCanvas() {
  const c = document.getElementById('eventHorizonCanvas');
  if (!c) return;
  const dpr = window.devicePixelRatio || 1;
  c.width = c.offsetWidth * dpr;
  c.height = c.offsetHeight * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
}

function ehDraw() {
  const c = document.getElementById('eventHorizonCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const w = c.offsetWidth, h = c.offsetHeight;
  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(w, h) / 2 - 20;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#06060c';
  ctx.fillRect(0, 0, w, h);

  // Draw orbit rings for each year
  const lang = window._lang || 'ru';
  const t = LANG[lang];
  for (const yr of EH_YEARS) {
    const r = yearToRadius(yr, maxR);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#1a1a2a';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Year label
    ctx.fillStyle = '#333350';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(yr.toString(), cx + r + 4, cy + 3);
  }

  // Draw particles
  for (const p of ehData.particles) {
    const angle = p.angle;
    const targetR = yearToRadius(p.targetYear, maxR);
    const r = Math.min(p.r, targetR);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    const frozen = p.r >= targetR - 1;
    if (frozen) {
      // Glow effect for settled particles
      ctx.beginPath();
      ctx.arc(x, y, p.glow, 0, Math.PI * 2);
      ctx.fillStyle = p.glowColor;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }

  // Center label
  const cl = document.getElementById('ehCenterLabel');
  if (cl) {
    cl.textContent = '2026';
  }

  // Legend & stats
  const statsEl = document.getElementById('ehStats');
  const legendEl = document.getElementById('ehLegend');
  const n = ehData.particles.length;
  const agi = ehData.particles.filter(p => p.type === 'agi').length;
  const asi = ehData.particles.filter(p => p.type === 'asi').length;
  const pending = n - agi - asi;

  if (statsEl) {
    statsEl.textContent = `N=${n} | AGI=${agi} | ASI=${asi} | ${pending > 0 ? 'in flight +' + pending : ''}`;
  }

  if (legendEl) {
    legendEl.innerHTML = `<span style="color:#f0883e">● AGI</span> достигнут &nbsp; <span style="color:#ef4444">● ASI</span> достигнут &nbsp; <span style="color:#555570">● в полёте</span>`;
  }
}

function ehStep(dt) {
  const c = document.getElementById('eventHorizonCanvas');
  if (!c) return;
  const w = c.offsetWidth, h = c.offsetHeight;
  const maxR = Math.min(w, h) / 2 - 20;

  // Move particles toward their target
  for (const p of ehData.particles) {
    if (p.r >= yearToRadius(p.targetYear, maxR) - 1) continue;
    p.r += p.speed * dt;
    // Slight spiral
    p.angle += 0.02 * dt;
  }

  // Spawn new particles
  if (ehData.launched < ehData.nTarget && ehData.spawnsLeft > 0) {
    const spawnRate = 3; // particles per frame
    for (let i = 0; i < spawnRate && ehData.launched < ehData.nTarget && ehData.spawnsLeft > 0; i++) {
      // Pick next particle from precomputed data
      const pt = ehData.spawns[ehData.spawnIdx];
      ehData.spawnIdx++;
      ehData.spawnsLeft--;

      const isASI = pt.asiYear !== Infinity && isFinite(pt.asiYear);
      const isAGI = pt.agiYear !== Infinity && isFinite(pt.agiYear);
      let targetYear, type, color, glowColor;

      if (isASI) {
        targetYear = pt.asiYear;
        type = 'asi';
        color = 'rgba(239,68,68,0.9)';
        glowColor = 'rgba(239,68,68,0.15)';
      } else if (isAGI) {
        targetYear = pt.agiYear;
        type = 'agi';
        color = 'rgba(240,136,62,0.9)';
        glowColor = 'rgba(240,136,62,0.15)';
      } else {
        // Never reached AGI -- drift to far orbit
        targetYear = 2068;
        type = 'never';
        color = 'rgba(80,80,120,0.5)';
        glowColor = 'rgba(80,80,120,0.08)';
      }

      ehData.particles.push({
        r: 0,
        angle: Math.random() * Math.PI * 2,
        speed: 8 + Math.random() * 12, // pixels per frame
        targetYear: targetYear,
        type: type,
        color: color,
        glowColor: glowColor,
        glow: 3 + Math.random() * 4,
      });
      ehData.launched++;
    }
  }

  ehDraw();
}

function ehAnimate() {
  if (!ehData.running) return;
  ehStep(1);
  ehData.animId = requestAnimationFrame(ehAnimate);
}

function eventHorizonPlay() {
  if (ehData.running) return;
  ehInitCanvas();

  // Get tracker from liveSwarm or global
  const tracker = (liveSwarm && liveSwarm.tracker) || (typeof v3Tracker !== 'undefined' ? v3Tracker : null);
  if (!tracker) {
    alert('Сначала запустите прогноз (кнопка «Запустить прогноз»)');
    return;
  }
  ehData.tracker = tracker;

  // Run MC forecast for particles
  const mc = tracker.runMonteCarloForecast(ehData.nTarget);
  const cfg = tracker.cfg;
  const curYear = cfg.CURRENT_YEAR;
  const n = tracker.n;
  const cumw = new Float64Array(n);
  cumw[0] = tracker.weights[0];
  for (let i = 1; i < n; i++) cumw[i] = cumw[i-1] + tracker.weights[i];

  ehData.spawns = [];
  for (let run = 0; run < mc.agiYears.length; run++) {
    const u = (run + 0.5) / mc.agiYears.length;
    let idx = 0;
    while (idx < n - 1 && cumw[idx] < u) idx++;
    const agiAbs = isFinite(mc.agiYears[run]) ? mc.agiYears[run] + curYear : Infinity;
    const asiAbs = isFinite(mc.asiYears[run]) ? mc.asiYears[run] + curYear : Infinity;
    ehData.spawns.push({ agiYear: agiAbs, asiYear: asiAbs, idx: idx });
  }

  ehData.spawnIdx = 0;
  ehData.spawnsLeft = ehData.spawns.length;
  ehData.particles = [];
  ehData.launched = 0;
  ehData.running = true;
  ehAnimate();
}

function eventHorizonReset() {
  ehData.running = false;
  if (ehData.animId) cancelAnimationFrame(ehData.animId);
  if (ehData.timerId) clearTimeout(ehData.timerId);
  ehData.particles = [];
  ehData.launched = 0;
  ehData.spawns = [];
  ehData.spawnIdx = 0;
  ehData.spawnsLeft = 0;
  ehDraw();
}

window.addEventListener('load', () => { setTimeout(liveSwarmInit, 300); });


window.addEventListener('load', () => { setTimeout(swarmInit, 100); });

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
window.addEventListener('load', () => { setTimeout(ehInitCanvas, 200); setTimeout(ehDraw, 250); });
window.addEventListener('load', () => {
  const tracker = v3GetTracker();
  v3UpdateUI(tracker);
});
window.addEventListener('load', () => { setTimeout(runSimulation, 800); });

function v3QuickWarning() {
  const t = v3Tracker || v3GetTracker();
  v3CheckWarning(t);
}

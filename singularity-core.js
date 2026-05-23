
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
  { year: 2026.30, intel: 68.0, agentic: 72.0, event: "Anthropic Mithos (Closed Demo)" },
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
    
    const yq = [];
    for (let y = 0.25; y <= 10; y += 0.25) yq.push(+y.toFixed(4));
    for (let y = 11; y <= 40; y++) yq.push(y);

    const dummySensitivity = {
        base: percentile(finite, 50),
        variations: { info: { label: '(v3: Дисперсия в облаке частиц)', agiMedian: percentile(finite, 50) } }
    };

    currentResults = {
      histogram: buildHistogramBins(agiList, asiList), 
      trajectory: runData.trajectory, 
      cumulative: { x: yq, agi: yq.map(y => cdf(agiList, y)), asi: yq.map(y => cdf(asiList, y)) },
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
  plotHistogram(r.histogram); plotTrajectory(r.trajectory); plotCumulative(r.cumulative); plotSensitivity(r.sensitivity);
}

function setVal(id, txt, cls) { const el = document.getElementById(id); el.innerHTML = txt; el.className = 'status-value ' + (cls||''); }
function colorProb(id, val) { const el = document.getElementById(id); el.classList.remove('green','orange','red'); el.classList.add(val > 50 ? 'green' : val > 10 ? 'orange' : 'red'); }
function yearsText(yrs) {
  if (!isFinite(yrs) || yrs > 40) return LANG[window._lang||'ru'].fY_gt;
  const d = new Date(); d.setFullYear(d.getFullYear() + yrs);
  return yrs.toFixed(1) + LANG[window._lang||'ru'].fY_suffix + '<br>(' + d.toLocaleDateString(window._lang==='en'?'en-US':'ru-RU', {month:'short',year:'numeric'}) + ')';
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
function plotTrajectory(tr) {
  const t = LANG[window._lang || 'ru'];
  Plotly.newPlot('c2', [
    { x: tr.years, y: tr.p90, type: 'scatter', mode: 'lines', line: {width:0}, showlegend: false, hoverinfo: 'skip' },
    { x: tr.years, y: tr.p75, type: 'scatter', mode: 'lines', line: {width:0}, fill: 'tonexty', fillcolor: 'rgba(88,166,255,.06)', showlegend: false, hoverinfo:'skip' },
    { x: tr.years, y: tr.p25, type: 'scatter', mode: 'lines', line: {width:0}, fill: 'tonexty', fillcolor: 'rgba(88,166,255,.12)', showlegend: false, hoverinfo:'skip' },
    { x: tr.years, y: tr.p10, type: 'scatter', mode: 'lines', line: {width:0}, fill: 'tonexty', fillcolor: 'rgba(88,166,255,.18)', showlegend: false, hoverinfo:'skip' },
    { x: tr.years, y: tr.median, type: 'scatter', mode: 'lines', name: t.ch_legend_median, line: { color: '#58a6ff', width: 2.5 } },
    { x: [tr.years[0], tr.years[tr.years.length - 1]], y: [tr.agiThreshold, tr.agiThreshold], type: 'scatter', mode: 'lines', name: t.ch_legend_agi, line: { color: '#f0883e', dash: 'dot' } },
    { x: [tr.years[0], tr.years[tr.years.length - 1]], y: [tr.asiThreshold, tr.asiThreshold], type: 'scatter', mode: 'lines', name: t.ch_legend_asi, line: { color: '#ef4444', dash: 'dot' } }
  ], { ...LAYOUT_BASE, xaxis: { ...LAYOUT_BASE.xaxis, title: { text: t.ch2_xlabel }, range: [2026, 2050] }, yaxis: { ...LAYOUT_BASE.yaxis, type: 'log', range: [0, 2.0] } }, PLOT_CFG);
}
function plotCumulative(c) {
  const t = LANG[window._lang || 'ru'];
  Plotly.newPlot('c3', [
    { x: c.x, y: c.agi, type: 'scatter', mode: 'lines+markers', name: t.ch3_pagi, line: { color: '#f0883e' }, fill: 'tozeroy', fillcolor: 'rgba(240,136,62,.08)' },
    { x: c.x, y: c.asi, type: 'scatter', mode: 'lines+markers', name: t.ch3_pasi, line: { color: '#ef4444' }, fill: 'tozeroy', fillcolor: 'rgba(239,68,68,.08)' }
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
    run_btn:'Запуск', sb_agi:'AGI медиана', sb_asi:'ASI медиана',
    ch_legend_median:'Медиана', ch_legend_agi:'AGI (10)', ch_legend_asi:'ASI (100)',
    ch1_xlabel:'Лет от сейчас', ch1_ylabel:'Прогонов', ch2_xlabel:'Год',
    ch3_xlabel:'Лет от сейчас', ch3_ylabel:'P(%)', ch3_pagi:'P(AGI)', ch3_pasi:'P(ASI)',
    ch4_label_base:'База', fY_suffix:' лет', fY_gt:'> 40 лет'
  },
  en: {
    run_btn:'Run', sb_agi:'AGI median', sb_asi:'ASI median',
    ch_legend_median:'Median', ch_legend_agi:'AGI (10)', ch_legend_asi:'ASI (100)',
    ch1_xlabel:'Years from now', ch1_ylabel:'Runs', ch2_xlabel:'Year',
    ch3_xlabel:'Years from now', ch3_ylabel:'P(%)', ch3_pagi:'P(AGI)', ch3_pasi:'P(ASI)',
    ch4_label_base:'Base', fY_suffix:' yrs', fY_gt:'> 40 yrs'
  }
};
function setLang(lang) {
  window._lang = lang;
  document.getElementById('lang_ru').classList.toggle('active', lang === 'ru');
  document.getElementById('lang_en').classList.toggle('active', lang === 'en');
}

window.addEventListener('load', () => setLang('ru'));
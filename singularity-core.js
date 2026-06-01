
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function sigmoid(x) { return 1.0 / (1.0 + Math.exp(-Math.max(-30, Math.min(30, x)))); }
function randnRange(mean, std) { const u1 = Math.random() || Number.EPSILON, u2 = Math.random(); return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function percentile(arr, p) { if (!arr || arr.length === 0) return undefined; const sorted = arr.slice().sort((a, b) => a - b); const idx = clamp(Math.floor(p / 100 * sorted.length), 0, sorted.length - 1); return sorted[idx]; }
function cdf(list, x) { const c = list.filter(v => isFinite(v) && v <= x).length; return list.length ? (c / list.length) * 100 : 0; }

// Перевод латентных переменных (reasoning, agency) в наблюдаемые бенчмарки
// reasoning и agency в масштабе модели (0..~15 для reasoning, 0..~agency_ceiling для agency)
// Нормализуем к шкале 0..10 для маппинга
function mapToObservables(r10, a10, expertCfg) {

    // toolUseVsAutonomyWeight: насколько бенчмарк реально отражает Agency
    // 0 = только reasoning, 1 = только agency, 0.6 = смесь (дефолт)
    const autonomyWeight = expertCfg ? expertCfg.toolUseVsAutonomyWeight : 0.6;
    const reasoningWeight = 1.0 - autonomyWeight;
    const blendedReasoning = r10 * reasoningWeight + a10 * autonomyWeight;

    // Откалибровано под SWE-bench Verified:
    const sweBench = 100 * sigmoid(0.55 * blendedReasoning - 2.5);

    // ARC-AGI: чистое reasoning
    const arcAgi = 100 * sigmoid(0.6 * r10 - 4.0);

    // Автономный горизонт (часы), экспоненциально от agency
    const autonomousHorizonHours = Math.min(365 * 24, 0.5 * Math.exp(0.5 * a10)); // cap at 1 year

    // Стоимость 1M токенов ($), падает с ростом reasoning
    // Калибровка: r10=0 → $19.6, r10=7 → $0.30, r10=10 → $0.05
    const costPerM = Math.max(0.005, 19.625 * Math.exp(-0.5973 * r10));

    return {
        sweBench: sweBench.toFixed(1) + '%',
        arcAgi: arcAgi.toFixed(1) + '%',
        horizon: autonomousHorizonHours > 24
            ? (autonomousHorizonHours / 24).toFixed(1) + (expertCfg && expertCfg._lang === 'en' ? ' days' : ' дней')
            : autonomousHorizonHours.toFixed(1) + (expertCfg && expertCfg._lang === 'en' ? ' hours' : ' часов'),
        cost: '$' + costPerM.toFixed(3)
    };
}

// ============================================================================
// EXPERT SANDBOX — Параметры по умолчанию (соответствуют текущему поведению)
// ============================================================================
const EXPERT_CONFIG = {
  // Категория 1: Архитектура и Парадигмы
  ceilingReasoningBase: 15.0,       // Базовый потолок Трансформеров
  hypeGracePeriod: 2.5,             // Толерантность инвесторов (лет)
  saturationThreshold: 0.7,         // Порог насыщения для прорыва (0-1)
  overhangShiftMultiplier: 0.2,     // Compute Overhang влияет на вероятность прорыва
  baseShiftMultiplier: 3.0,         // Множитель потолка при первом сдвиге
  paradigmDecayRate: 0.5,           // Насколько слабее каждый следующий сдвиг
  minShiftMultiplier: 1.2,          // Минимальный гарантированный множитель
  // Категория 2: Самоулучшение
  rsiMultiplier: 1.0,              // Множитель силы RSI
  rsiTriggerReasoning: 8.0,        // Reasoning для старта RSI (было 6.0)
  rsiTriggerAgency: 8.0,           // Agency для старта RSI (было 4.0)
  hwCoDesignBonus: 1.5,            // Аппаратный ко-дизайн
  coordinationFriction: 0.05,      // Координационное трение ансамблей ИИ
  maxPhysicalHwGrowth: 1.5,        // Физический предел роста железа (log scale)
  // Категория 3: Экономика и Риски
  bubbleBurstRisk: 0.20,           // Риск схлопывания GPU-пузыря
  alignmentCooldown: 1.5,          // Штраф за инцидент безопасности (лет)
  maxCapitalMultiplier: 2.5,       // Эластичность капитала

  // --- ПОРОГИ ЭТАПОВ СИНГУЛЯРНОСТИ (Динамические настройки) ---
  t1Threshold: 8.0,                // T1: Потеря понимания
  t2Threshold: 10.0,               // T2: Потеря предсказуемости
  t3Threshold: 25.0,               // T3: Потеря контроля
  t4Threshold: 100.0,              // T4: Потеря влияния

  // --- 5 СТЕН РЕАЛЬНОСТИ (Социотехнические барьеры) ---
  barrierAtomsLimit: 1.2,          // [Проклятие атомов] Макс. удвоений HW в год
  barrierEnergyLog: 27.5,          // [Термодинамика] Предел FLOPs
  barrierGeopoliticsRisk: 0.25,    // [Монополия на насилие] Шанс государственного шока после T2
  barrierNashFriction: 0.15,       // [Конкуренция ИИ] Координационная деградация после T3
  barrierDemandGrace: 5.0,         // [Смысловой предел] Лет на адаптацию экономики к T2

  // Категория 4: Эпистемология (World Models)
  worldModels: { cascade: 0.60, hardWall: 0.25, slowTakeoff: 0.15 },
  // Категория 5: Априорные допущения (Philosophical Priors)
  priorAgencyMean: 8.0,            // Априорное среднее agency_ceiling
  priorAgencyStd: 3.0,             // Априорный разброс
  // Категория 6: Бенчмарки
  toolUseVsAutonomyWeight: 0.6,    // Вес agency в SWE-bench (0=только reasoning, 1=только agency)
  // Категория 7: Углубленные настройки (Test-Time Compute, Штрафы, Шум)
  maxInferenceBonusReasoning: 2.0, // Макс. бонус Test-Time Compute для логики
  maxInferenceBonusAgency: 1.5,    // Макс. бонус Test-Time Compute для автономности
  inferenceSaturationCap: 5.0,     // Порог базового интеллекта, где CoT перестает давать бонус
  reasoningScalingSlope: 0.35,     // Наклон кривой масштабирования (FLOPs -> Reasoning)
  agencyScalingSlope: 0.25,        // Наклон кривой масштабирования (FLOPs -> Agency)
  dataWallPenalty: 0.5,            // Множитель скорости алгоритмов при исчерпании данных (0.5 = падение в 2 раза)
  hypeGapThreshold: 4.0,           // Разрыв между логикой и агентностью для старта Зимы ИИ
  winterDamping: 0.1,              // Строгость Зимы ИИ (множитель инвестиций и алгоритмов)
  observationNoiseSigma: 1.5,      // Уровень доверия к бенчмаркам (меньше = строже фильтр)
};

// Default values for Expert Sandbox (single source of truth)
const DEFAULT_EXPERT_CONFIG = JSON.parse(JSON.stringify(EXPERT_CONFIG));

// ============================================================================
// v3.0 — BAYESIAN PARTICLE FILTER (Исправлено: Якорь на 2023 год + Inference)
// ============================================================================
const V3_DEFAULT_PARTICLES = 1000;

function createV3Config() {
  return {
    BASE_YEAR: 2023.0,          // Якорь (уровень GPT-4)
    BASE_LOG_FLOPS: 24.5,       // Начальные FLOPs в 2023
    CURRENT_YEAR: new Date().getFullYear() + (new Date().getMonth() / 12), // Динамический текущий год
    THRESHOLDS: { t1: EXPERT_CONFIG.t1Threshold, t2: EXPERT_CONFIG.t2Threshold, t3: EXPERT_CONFIG.t3Threshold, t4: EXPERT_CONFIG.t4Threshold },
    DIMENSIONS: {
      reasoning: { slope: EXPERT_CONFIG.reasoningScalingSlope, ceiling: EXPERT_CONFIG.ceilingReasoningBase },
      agency:    { slope: EXPERT_CONFIG.agencyScalingSlope }, // Потолок определяет частица
    },
    // Глубокое копирование защищает текущую симуляцию от live-мутаций ползунков
    EXPERT: JSON.parse(JSON.stringify(EXPERT_CONFIG)),
    INFERENCE_SCALING: {
      max_bonus_reasoning: EXPERT_CONFIG.maxInferenceBonusReasoning,
      max_bonus_agency: EXPERT_CONFIG.maxInferenceBonusAgency,
      saturation_cap: EXPERT_CONFIG.inferenceSaturationCap
    },
    SCALING_LAW: { paradigm_shift_prob: 0.20, shift_multiplier: 3.0,
                   endo_base: 0.05, endo_pressure: 0.8, endo_exhaust: 0.5 },
    BOTTLENECKS: { energy_wall_start: 2026.0, energy_damping: 0.10, econ_wall_start: 2026.5, econ_damping: 0.15 },
  };
}

function v3ComputeDim(logDiff, slope, ceiling) {
  // Исправлено: при logDiff->inf сигмоида дает 1.0, формула возвращает ceiling.
  // При logDiff=0 сигмоида дает 0.5, формула возвращает 1.0.
  return Math.max(1.0 + (ceiling - 1.0) * (sigmoid(slope * logDiff) - 0.5) * 2.0, 0.01);
}

function v3ApplyInference(rawCap, maxBonus, satCap) {
  if (maxBonus <= 1.0) return rawCap;
  const k = Math.LN2 / satCap;
  const bonus = (maxBonus - 1.0) * (1.0 - Math.exp(-k * rawCap));
  return rawCap * (1.0 + bonus);
}

function v3CalculateRSI(reasoning, agency, cap, expertCfg) {
  // 1. Непрерывная активация (S-кривая). 
  // Мы сдвигаем центр сигмоиды на -2.0 пункта от порогов в UI.
  // Это значит, что при пороге 8.0, модели уровня 6.0 (сегодняшний фронтир) 
  // уже имеют 50% активации от своего текущего (небольшого) потенциала.
  const actR = sigmoid(1.2 * (reasoning - (expertCfg.rsiTriggerReasoning - 2.0)));
  const actA = sigmoid(1.2 * (agency - (expertCfg.rsiTriggerAgency - 2.0)));
  const rsiActivation = actR * actA;

  // 2. Базовый потенциал растет экспоненциально от общего интеллекта (cap).
  // При cap=6 (код-ассистенты) baseRsi ~ 0.22
  // При cap=10 (AGI) baseRsi ~ 0.47
  const baseRsi = 0.015 * Math.pow(Math.max(0, cap), 1.5) * expertCfg.rsiMultiplier;

  // 3. Координационное трение (замедление при развертывании миллиардов агентов)
  const friction = 1.0 / (1.0 + expertCfg.coordinationFriction * Math.max(0, cap - 10.0));

  // Итоговый RSI плавно нарастает от ~0.05 сейчас до 2.0 в эпоху T4
  return Math.min(2.0, baseRsi * rsiActivation * friction);
}

function v3SimulateToYear(particle, targetYear, cfg) {
  const dt = 1.0 / 12.0;
  const steps = Math.max(0, Math.floor((targetYear - cfg.BASE_YEAR) * 12));
  let flopsLog = cfg.BASE_LOG_FLOPS;
  let algoLog = 0; 
  const baseLog = flopsLog;
  
  const hwK = Math.log(2) / Math.max(1.0, particle.hw_months / 12.0);
  let algoK = Math.log(2) / Math.max(1.0, particle.algo_months / 12.0); // Теперь let!

  let ceilingR = cfg.DIMENSIONS.reasoning.ceiling;
  let ceilingA = particle.agency_ceiling;

  // ИСПРАВЛЕНО: Применяем априорные World Models до симуляции
  if (particle.world_model === 'hard_wall') {
    ceilingA = Math.min(ceilingA, 5.5);
  } else if (particle.world_model === 'slow_takeoff') {
    algoK *= 0.6;
  }

  // Paradigm shift state (deterministic — no shocks)
  let paradigmGeneration = 0;
  let lastShiftYear = cfg.BASE_YEAR;
  let algoKMult = 1.0;
  let stateIntervention = false;
  let interventionCooldown = 0;

  for (let step = 0; step < steps; step++) {
    const currentYear = cfg.BASE_YEAR + step * dt;
    const logDiff = flopsLog + algoLog - baseLog;
    
    let rawR = v3ComputeDim(logDiff, cfg.DIMENSIONS.reasoning.slope, ceilingR);
    let rawA = v3ComputeDim(logDiff, cfg.DIMENSIONS.agency.slope, ceilingA);
    
    let reasoning = v3ApplyInference(rawR, cfg.INFERENCE_SCALING.max_bonus_reasoning, cfg.INFERENCE_SCALING.saturation_cap);
    let agency = v3ApplyInference(rawA, cfg.INFERENCE_SCALING.max_bonus_agency, cfg.INFERENCE_SCALING.saturation_cap);
    const cap = Math.min(reasoning, agency);

    // Deterministic paradigm shift (same logic as MC, but no randomness — threshold-based)
    const canShift = (paradigmGeneration === 0 && currentYear > 2026.5)
                   || (paradigmGeneration > 0 && currentYear > lastShiftYear + 4.0);
    if (canShift) {
      const saturation = Math.max(reasoning / ceilingR, agency / ceilingA);
      if (saturation > cfg.EXPERT.saturationThreshold) {
        paradigmGeneration++;
        lastShiftYear = currentYear;
        let shiftMult = Math.max(
          cfg.EXPERT.minShiftMultiplier,
          cfg.EXPERT.baseShiftMultiplier - ((paradigmGeneration - 1) * cfg.EXPERT.paradigmDecayRate)
        );
        if (particle.world_model === 'slow_takeoff' && paradigmGeneration === 1) {
          shiftMult = Math.max(shiftMult, 5.0);
        }
        if (particle.world_model === 'hard_wall') {
          shiftMult = 1.001; // almost no shift
        }
        ceilingA *= shiftMult;
        ceilingR *= shiftMult;
        algoKMult = 2.0;
        // ДОБАВЛЕНО: откат логарифма при смене парадигмы, чтобы физика совпадала с Монте-Карло
        algoLog = Math.max(algoLog - (0.4 + paradigmGeneration * 0.1), -3.0);
      }
    }

    // Decay algoK multiplier
    if (algoKMult > 1.0) {
      algoKMult -= (1.0 / 4.0) * dt;
      if (algoKMult < 1.0) algoKMult = 1.0;
    }

    // Economic bottleneck
    let damping = 1.0;
    if (currentYear > cfg.BOTTLENECKS.econ_wall_start) {
      const gap = reasoning - agency;
      if (gap > 2.0) damping *= Math.exp(-cfg.BOTTLENECKS.econ_damping * (gap - 2.0));
    }

    // --- БАРЬЕР 3: Геополитика (государственный шок после T2) ---
    // Детерминированный: срабатывает при превышении порога риска (не случайно)
    if (cap >= cfg.THRESHOLDS.t2 && !stateIntervention && cfg.EXPERT.barrierGeopoliticsRisk > 0.5) {
      stateIntervention = true;
      interventionCooldown = 3.0;
    }
    if (stateIntervention) {
      interventionCooldown -= dt;
      if (interventionCooldown <= 0) stateIntervention = false;
    }

    // --- БАРЬЕР 4: Конкуренция ИИ (Эффект Черной Королевы после T3) ---
    let nashDamping = 1.0;
    if (cap >= cfg.THRESHOLDS.t3) {
      nashDamping = 1.0 / (1.0 + cfg.EXPERT.barrierNashFriction * (cap - cfg.THRESHOLDS.t3));
    }

    // --- БАРЬЕР 5: Смысловой предел (Шок спроса) ---
    let demandDamping = 1.0;
    if (cap >= cfg.THRESHOLDS.t2 && (currentYear - 2026.0) < cfg.EXPERT.barrierDemandGrace) {
      demandDamping = 0.6;
    }

    // RSI (deterministic)
    const rsi = v3CalculateRSI(reasoning, agency, cap, cfg.EXPERT);

    flopsLog += hwK * damping * nashDamping * demandDamping * dt;
    algoLog += (algoK * algoKMult * damping * nashDamping * demandDamping + rsi) * dt;
  }
  
  const logDiff = flopsLog + algoLog - baseLog;
  let rawR = v3ComputeDim(logDiff, cfg.DIMENSIONS.reasoning.slope, ceilingR);
  let rawA = v3ComputeDim(logDiff, cfg.DIMENSIONS.agency.slope, ceilingA);
  
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
      const rand = Math.random();
      const w = EXPERT_CONFIG.worldModels;
      // Normalize world model probabilities (defensive against UI drift)
      const totalWM = (w.cascade || 0) + (w.hardWall || 0) + (w.slowTakeoff || 0);
      const normC = totalWM > 0 ? (w.cascade || 0) / totalWM : 0.6;
      const normH = totalWM > 0 ? (w.hardWall || 0) / totalWM : 0.25;
      let worldModel = 'cascade';
      if (rand > normC && rand <= normC + normH) worldModel = 'hard_wall';
      else if (rand > normC + normH) worldModel = 'slow_takeoff';

      this.particles.push({
        hw_months: Math.max(3.0, randnRange(7.5, 1.5)),
        algo_months: Math.max(2.0, randnRange(6.0, 2.0)),
        agency_ceiling: Math.max(2.0, randnRange(EXPERT_CONFIG.priorAgencyMean, EXPERT_CONFIG.priorAgencyStd)),
        world_model: worldModel,
      });
    }
  }

  observeRealData(year, obs, sigmas = BENCHMARK_SIGMAS) {
    for (let i = 0; i < this.n; i++) {
      const p = this.particles[i];
      if (p.hw_months < 1.0 || p.agency_ceiling < 1.0) { this.weights[i] = 0; continue; }
      
      const pred = v3SimulateToYear(p, year, this.cfg);
      const metrics = getNumericObservables(pred.reasoning, pred.agency, this.cfg.EXPERT);
      
      let logLik = 0;
      let count = 0;
      const baseSigmaMult = this.cfg.EXPERT.observationNoiseSigma || 1.0;
      
      if (obs.sweBench !== undefined) {
        logLik -= 0.5 * ((obs.sweBench - metrics.sweBench) / (sigmas.sweBench * baseSigmaMult))**2;
        count++;
      }
      if (obs.arcAgi !== undefined) {
        logLik -= 0.5 * ((obs.arcAgi - metrics.arcAgi) / (sigmas.arcAgi * baseSigmaMult))**2;
        count++;
      }
      if (obs.arenaElo !== undefined) {
        logLik -= 0.5 * ((obs.arenaElo - metrics.arenaElo) / (sigmas.arenaElo * baseSigmaMult))**2;
        count++;
      }
      if (obs.trainingFlopsLog !== undefined) {
        logLik -= 0.5 * ((obs.trainingFlopsLog - metrics.flopsLog) / (sigmas.flopsLog * baseSigmaMult))**2;
        count++;
      }

      // Усредняем ошибку, чтобы штраф не зависел от количества доступных бенчмарков в этот год
      if (count > 0) {
        this.weights[i] *= Math.exp(Math.max(-50, logLik / count));
      }
    }

    let sum = this.weights.reduce((a, b) => a + b, 0);
    if (sum < 1e-300) { this.weights.fill(1.0 / this.n); return; }
    for (let i = 0; i < this.n; i++) this.weights[i] /= sum;

    const ess = 1.0 / this.weights.reduce((a, b) => a + b * b, 0);
    if (ess < this.n * 0.3) {
      const newP = [], cumsum = new Float64Array(this.n);
      cumsum[0] = this.weights[0];
      for (let i = 1; i < this.n; i++) cumsum[i] = cumsum[i - 1] + this.weights[i];
      cumsum[this.n - 1] = 1.0; 
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
          world_model: p.world_model || 'cascade',
        });
      }
      this.particles = newP;
      this.weights.fill(1.0 / this.n);
    }
    this.observationLog.push({ year, ...obs });
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
    const t1Years = [], t2Years = [], t3Years = [], t4Years = []; 
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
      let algoK = Math.log(2) / Math.max(1.0, p.algo_months / 12.0);
      
      // ИСПРАВЛЕНИЕ 1: Оба потолка теперь локальные переменные
      let ceilingReasoning = this.cfg.DIMENSIONS.reasoning.ceiling;
      let ceilingAgency = p.agency_ceiling;

      // --- World Models: эпистемическая неопределённость ---
      // Каждая частица верит в свою "физику мира"
      if (p.world_model === 'hard_wall') {
        // Мир "Стены": Трансформеры упираются в потолок агентности ~5.5
        ceilingAgency = Math.min(ceilingAgency, 5.5);
      } else if (p.world_model === 'slow_takeoff') {
        // Мир "Нейросимволики": медленный старт, но огромный потенциал
        algoK *= 0.6; // Алгоритмический прогресс тормозит до прорыва
      }
      // 'cascade' — каскадные парадигмы, без модификаций

      let yT1 = null, yT2 = null, yT3 = null, yT4 = null;
      let plotIdx = 0;
      let isWinter = false;
      let dataExhaustionHit = false;
      let gpuBubbleBurst = false;
      let alignmentIncidentCooldown = 0;
      let stateIntervention = false;
      let interventionCooldown = 0;

      // --- Каскадные парадигмы ---
      let paradigmGeneration = 0;    // 0 = Трансформеры, 1 = первая смена, 2 = вторая...
      let lastShiftYear = 2023.0;     // Год последнего сдвига
      let hypeGracePeriod = 0.0;
      let algoKMultiplier = 1.0;

      for (let step = 0; step < maxSteps; step++) {
        const currentYear = this.cfg.BASE_YEAR + step * dt;
        
        const logDiff = flopsLog + algoLog - baseLog;
        const rawR = v3ComputeDim(logDiff, this.cfg.DIMENSIONS.reasoning.slope, ceilingReasoning);
        const rawA = v3ComputeDim(logDiff, this.cfg.DIMENSIONS.agency.slope, ceilingAgency);

        const reasoning = v3ApplyInference(rawR, this.cfg.INFERENCE_SCALING.max_bonus_reasoning, this.cfg.INFERENCE_SCALING.saturation_cap);
        const agency = v3ApplyInference(rawA, this.cfg.INFERENCE_SCALING.max_bonus_agency, this.cfg.INFERENCE_SCALING.saturation_cap);

        const cap = Math.min(reasoning, agency);

        // Архитектурный каскад (множественные смены парадигм)
        // Первая смена — не раньше 2026.5, последующие — не чаще раза в 4 года
        const canShift = (paradigmGeneration === 0 && currentYear > 2026.5)
                       || (paradigmGeneration > 0 && currentYear > lastShiftYear + 4.0);
        if (canShift) {
            // Насколько мы уперлись в текущий потолок? (от 0.0 до 1.0+)
            const saturation = Math.max(reasoning / ceilingReasoning, agency / ceilingAgency);

            // Прорыв зависит от насыщения и от compute overhang (избыток капитал/вычисления)
            if (saturation > this.cfg.EXPERT.saturationThreshold) {
              // Вычисляем capitalMultiplier для compute overhang (полный расчёт ниже)
              const _marketUtility = reasoning * 0.3 + agency * 0.7;
              const _investorExpectations = (currentYear - 2023.0) * 1.5;
              const _capMult = Math.max(0.1, Math.min(this.cfg.EXPERT.maxCapitalMultiplier,
                  _marketUtility / Math.max(1.0, _investorExpectations)));
              const _hypeMult = (paradigmGeneration > 0 && hypeGracePeriod > 0) ? Math.max(_capMult, 2.0) : _capMult;

              // Compute Overhang: избыток капитала ускоряет брутфорс новых архитектур
              const computeOverhang = Math.max(1.0, _hypeMult);
              let shiftProb = 0.02 + (0.15 * saturation)
                + (this.cfg.EXPERT.overhangShiftMultiplier * computeOverhang);

              // World Model модификации вероятности
              if (p.world_model === 'hard_wall') {
                // В мире Стены парадигмальных сдвигов почти не бывает
                shiftProb = 0.001;
              }

              if (Math.random() < shiftProb * dt) {
                paradigmGeneration++;
                lastShiftYear = currentYear;
                hypeGracePeriod = this.cfg.EXPERT.hypeGracePeriod;

                // Настраиваемый множитель сдвига с убывающей отдачей
                let shiftMult = Math.max(
                  this.cfg.EXPERT.minShiftMultiplier,
                  this.cfg.EXPERT.baseShiftMultiplier - ((paradigmGeneration - 1) * this.cfg.EXPERT.paradigmDecayRate)
                );

                // World Model модификации множителя
                if (p.world_model === 'slow_takeoff' && paradigmGeneration === 1) {
                  // Нейросимволика: первый срыв даёт ОГРОМНЫЙ скачок
                  shiftMult = Math.max(shiftMult, 5.0);
                }
                // hard_wall: потолок агентности уже заблокирована на 5.5,
                // сдвиг почти никогда не срабатывает, но если случится — обычный shiftMult

                ceilingAgency *= shiftMult;
                ceilingReasoning *= shiftMult;

                algoLog = Math.max(algoLog - (0.4 + paradigmGeneration * 0.1), -3.0);
                algoKMultiplier = 2.0;
                dataExhaustionHit = false;
              }
            }
        }

        // Затухание эффектов текущей новой парадигмы
        if (paradigmGeneration > 0) {
          if (hypeGracePeriod > 0) hypeGracePeriod -= dt;
          if (algoKMultiplier > 1.0) {
            algoKMultiplier -= (1.0 / 4.0) * dt;
            if (algoKMultiplier < 1.0) algoKMultiplier = 1.0;
          }
        }

        // --- ШОКИ: черные лебеди и предсказуемые кризисы ---

        // Шок 1: Исчерпание качественных данных (Data Wall)
        if (!dataExhaustionHit && currentYear > 2026.5 && Math.random() < 0.15 * dt) {
          dataExhaustionHit = true;
        }

        // Шок 2: Инцидент безопасности / Регуляторный бан (Alignment Incident)
        if (alignmentIncidentCooldown <= 0 && agency > 6.0 && Math.random() < (agency * 0.01) * dt) {
          alignmentIncidentCooldown = this.cfg.EXPERT.alignmentCooldown;
        }

        // Шок 3: Схлопывание GPU-пузыря
        if (!gpuBubbleBurst && currentYear > 2027.0 && agency < 4.0 && Math.random() < this.cfg.EXPERT.bubbleBurstRisk * dt) {
          gpuBubbleBurst = true;
          flopsLog -= 0.5; // Списание устаревших капитальных вложений / банкротства
        }

        // Применение эффектов шоков
        let shockDamping = 1.0;
        if (alignmentIncidentCooldown > 0) {
          alignmentIncidentCooldown -= dt;
          shockDamping = 0.0; // Полная заморозка крупных тренировок
        }
        if (gpuBubbleBurst) {
          shockDamping *= 0.2; // Инвестиции рухнули
        }

        // --- БАРЬЕР 3: Геополитика (государственный шок после T2) ---
        if (cap >= this.cfg.THRESHOLDS.t2 && !stateIntervention && Math.random() < this.cfg.EXPERT.barrierGeopoliticsRisk * dt) {
          stateIntervention = true;
          interventionCooldown = 3.0; // 3 года жесточайшей регуляции / заморозки
        }
        if (stateIntervention) {
          interventionCooldown -= dt;
          if (interventionCooldown <= 0) stateIntervention = false;
        }

        // --- БАРЬЕР 4: Конкуренция ИИ (Эффект Черной Королевы после T3) ---
        let nashDamping = 1.0;
        if (cap >= this.cfg.THRESHOLDS.t3) {
          nashDamping = 1.0 / (1.0 + this.cfg.EXPERT.barrierNashFriction * (cap - this.cfg.THRESHOLDS.t3));
        }

        // --- БАРЬЕР 5: Смысловой предел (Шок спроса) ---
        let demandDamping = 1.0;
        if (cap >= this.cfg.THRESHOLDS.t2 && (currentYear - 2026.0) < this.cfg.EXPERT.barrierDemandGrace) {
          demandDamping = 0.6;
        }
        
        if (currentYear >= this.cfg.CURRENT_YEAR && plotIdx < plotSteps) {
            trajYears[plotIdx] = currentYear;
            trajCaps[plotIdx].push(cap);
            plotIdx++;
        }
        
                // Проверяем прохождение 4 этапов сингулярности
                if (yT1 === null && cap >= this.cfg.THRESHOLDS.t1) yT1 = currentYear;
                if (yT2 === null && cap >= this.cfg.THRESHOLDS.t2) yT2 = currentYear;
                if (yT3 === null && cap >= this.cfg.THRESHOLDS.t3) yT3 = currentYear;
                if (yT4 === null && cap >= this.cfg.THRESHOLDS.t4) { 
                    yT4 = currentYear; 
                    break; // Останавливаем симуляцию на фазовом переходе
                }
        
        let damping = 1.0;

        // Проверка на лопнувший пузырь (AI Winter)
        if (!isWinter && currentYear > 2026.5) {
          const hypeGap = reasoning - agency;
          if (hypeGap > this.cfg.EXPERT.hypeGapThreshold && Math.random() < 0.10 * dt) {
            isWinter = true;
          }
        }

        if (isWinter) {
          // Зима ИИ: инвестиции в железо падают, алгоритмы развиваются медленнее
          damping = this.cfg.EXPERT.winterDamping;
          // Выход из зимы: если RSI дотянет agency до reasoning
          if (agency >= reasoning - 1.0) {
            isWinter = false;
          }
        } else {
          // Мягкое экономическое горлышко (оригинальный код)
          if (currentYear > this.cfg.BOTTLENECKS.econ_wall_start && (reasoning - agency) > 2.0) {
            damping *= Math.exp(-this.cfg.BOTTLENECKS.econ_damping * (reasoning - agency - 2.0));
          }
        }

        // Единый расчет RSI
        const rsi = v3CalculateRSI(reasoning, agency, cap, this.cfg.EXPERT);
        
        // dataExhaustionHit обрабатывается ниже в currentAlgoK
        // Экономика исследований: динамический hwK зависит от ROI
        // capitalMultiplier уже вычислен выше для compute overhang — переиспользуем логику
        const marketUtility = reasoning * 0.3 + agency * 0.7;
        const investorExpectations = (currentYear - 2023.0) * 1.5;
        let capitalMultiplier = Math.max(0.1, Math.min(this.cfg.EXPERT.maxCapitalMultiplier,
            marketUtility / Math.max(1.0, investorExpectations)));
        // Инвесторы заливают деньги на этапе хайпа, несмотря на просадку метрик
        if (paradigmGeneration > 0 && hypeGracePeriod > 0) {
          capitalMultiplier = Math.max(capitalMultiplier, 2.0);
        }
        // Hardware co-design: непрерывное внедрение ИИ в EDA (проектирование чипов).
        // Центр сигмоиды настраиваем на reasoning=7.5 (модели уровня o1/GPT-5).
        const hwAct = sigmoid(1.0 * (reasoning - 7.5)) * sigmoid(1.0 * (agency - 5.0));
        let hardwareCoDesign = 1.0 + (this.cfg.EXPERT.hwCoDesignBonus - 1.0) * hwAct;
        let dynamicHwK = hwK * capitalMultiplier * hardwareCoDesign * damping * nashDamping * demandDamping;
        if (gpuBubbleBurst) dynamicHwK *= 0.2;

        // Физический предел роста железа (Material Cycle)
        dynamicHwK = Math.min(dynamicHwK, this.cfg.EXPERT.maxPhysicalHwGrowth);

        // Shock damping applied symmetrically to both hw and algo
        flopsLog += dynamicHwK * shockDamping * dt;

        // Algo progress: includes paradigm multiplier, data exhaustion, economic damping, nash, demand, and shock damping
        let currentAlgoK = algoK * algoKMultiplier * damping * nashDamping * demandDamping;
        if (dataExhaustionHit) currentAlgoK *= this.cfg.EXPERT.dataWallPenalty;
        algoLog += ((currentAlgoK + rsi) * shockDamping) * dt;
      }
      
      t1Years.push(yT1 !== null ? yT1 - this.cfg.CURRENT_YEAR : Infinity);
      t2Years.push(yT2 !== null ? yT2 - this.cfg.CURRENT_YEAR : Infinity);
      t3Years.push(yT3 !== null ? yT3 - this.cfg.CURRENT_YEAR : Infinity);
      t4Years.push(yT4 !== null ? yT4 - this.cfg.CURRENT_YEAR : Infinity);
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
        t1Years, t2Years, t3Years, t4Years,
        trajectory: { years: yrs, median: med, p10: p10a, p25: p25a, p75: p75a, p90: p90a }
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

  async runSensitivityMatrixAsync(arcRange, sweRange) {
    const baseObs = REAL_BENCHMARK_HISTORY[REAL_BENCHMARK_HISTORY.length - 1];
    const state = this.cloneState();

    const results = [];
    for (const arc of arcRange) {
      const row = [];
      for (const swe of sweRange) {
        this.restoreState(state);
        this.observeRealData(baseObs.year, { arcAgi: arc, sweBench: swe });
        const mc = this.runMonteCarloForecast(300);
        const finite = mc.t2Years.filter(isFinite);
        row.push(finite.length > 0 ? percentile(finite, 50) : 40);
      }
      results.push(row);
      await new Promise(r => setTimeout(r, 0));
    }
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
      let algoK = Math.log(2) / Math.max(1.0, p.algo_months / 12.0);
      let cR = cfg.DIMENSIONS.reasoning.ceiling;
      let cA = p.agency_ceiling;
      // Apply World Model constraints
      if (p.world_model === 'hard_wall') {
        cA = Math.min(cA, 5.5);
      } else if (p.world_model === 'slow_takeoff') {
        algoK *= 0.6;
      }
      let paradigmGeneration = 0;
      let dataExhaustionHit = false;
      let isWinter = false;
      let gpuBubbleBurst = false;
      const years = [], caps = [];
      for (let step = 0; step < steps; step++) {
        const y = cfg.BASE_YEAR + step * dt;

        const logDiff = flopsLog + algoLog - baseLog;
        const rawR = v3ComputeDim(logDiff, cfg.DIMENSIONS.reasoning.slope, cR);
        const rawA = v3ComputeDim(logDiff, cfg.DIMENSIONS.agency.slope, cA);
        const reasoning = v3ApplyInference(rawR, cfg.INFERENCE_SCALING.max_bonus_reasoning, cfg.INFERENCE_SCALING.saturation_cap);
        const agency = v3ApplyInference(rawA, cfg.INFERENCE_SCALING.max_bonus_agency, cfg.INFERENCE_SCALING.saturation_cap);

        // ИСПРАВЛЕНИЕ: Сдвиг только при насыщении, и делаем временный откат алгоритмов (как в MC)
        const saturation = Math.max(reasoning / cR, agency / cA);
        if (y > cfg.CURRENT_YEAR && saturation > cfg.EXPERT.saturationThreshold && Math.random() < cfg.SCALING_LAW.paradigm_shift_prob * dt) {
          cA *= cfg.SCALING_LAW.shift_multiplier;
          cR *= cfg.SCALING_LAW.shift_multiplier;
          algoLog = Math.max(algoLog - (0.4 + paradigmGeneration * 0.1), -3.0);
          paradigmGeneration++;
        }
        years.push(y);
        caps.push(Math.min(reasoning, agency));

        let damping = 1.0;

        // [PATCH] Shocks for scenario fan consistency with MC
        if (!dataExhaustionHit && y > 2026.5 && Math.random() < 0.15 * dt) dataExhaustionHit = true;
        if (!gpuBubbleBurst && y > 2027.0 && agency < 4.0 && Math.random() < cfg.EXPERT.bubbleBurstRisk * dt) {
            gpuBubbleBurst = true;
            flopsLog -= 0.5;
        }
        if (!isWinter && y > 2026.5 && (reasoning - agency) > cfg.EXPERT.hypeGapThreshold && Math.random() < 0.10 * dt) {
            isWinter = true;
        }
        if (isWinter) {
            damping = cfg.EXPERT.winterDamping;
            if (agency >= reasoning - 1.0) isWinter = false;
        } else if (y > cfg.BOTTLENECKS.econ_wall_start && (reasoning - agency) > 2.0) {
            damping *= Math.exp(-cfg.BOTTLENECKS.econ_damping * (reasoning - agency - 2.0));
        }

        const cap = Math.min(reasoning, agency);
        const rsi = v3CalculateRSI(reasoning, agency, cap, cfg.EXPERT);

        let currentAlgoK = algoK * damping;
        if (dataExhaustionHit) currentAlgoK *= cfg.EXPERT.dataWallPenalty;
        let currentHwK = hwK * damping;
        if (gpuBubbleBurst) currentHwK *= 0.2;

        flopsLog += currentHwK * dt;
        algoLog += (currentAlgoK + rsi) * dt;
      }
      scenarios.push({ years, caps });
    }
    return scenarios;
  }

  runDecomposition() {
    const cfg = this.cfg;
    // Use weighted average particle instead of particles[0] (which may have negligible weight)
    const totalW = this.weights.reduce((a, b) => a + b, 0);
    let avgHw = 0, avgAlgo = 0, avgCeiling = 0;
    if (totalW > 0) {
      for (let i = 0; i < this.n; i++) {
        const w = this.weights[i] / totalW;
        avgHw += this.particles[i].hw_months * w;
        avgAlgo += this.particles[i].algo_months * w;
        avgCeiling += this.particles[i].agency_ceiling * w;
      }
    } else {
      // Fallback: unweighted average
      for (let i = 0; i < this.n; i++) {
        avgHw += this.particles[i].hw_months;
        avgAlgo += this.particles[i].algo_months;
        avgCeiling += this.particles[i].agency_ceiling;
      }
      avgHw /= this.n;
      avgAlgo /= this.n;
      avgCeiling /= this.n;
    }
    const dt = 1.0 / 12.0;
    const steps = 40 * 12;
    const years = [], hwComp = [], algoComp = [], paradigmComp = [], rsiComp = [];
    let accumulatedParadigm = 0, accumulatedRsi = 0;
    let flopsLog = cfg.BASE_LOG_FLOPS, algoLog = 0, pureAlgoLog = 0;
    let baseLog = flopsLog;
    const hwK = Math.log(2) / Math.max(1.0, avgHw / 12.0);
    const algoK = Math.log(2) / Math.max(1.0, avgAlgo / 12.0);
    let cR = cfg.DIMENSIONS.reasoning.ceiling;
    let cA = avgCeiling;
    // Apply weighted World Model constraints to avgCeiling
    let hardWallWeight = 0, slowTakeoffWeight = 0;
    if (totalW > 0) {
      for (let i = 0; i < this.n; i++) {
        const w = this.weights[i] / totalW;
        if (this.particles[i].world_model === 'hard_wall') hardWallWeight += w;
        else if (this.particles[i].world_model === 'slow_takeoff') slowTakeoffWeight += w;
      }
    }
    // Blend: hard_wall caps agency at 5.5, slow_takeoff reduces algoK
    if (hardWallWeight > 0.5) cA = Math.min(cA, 5.5);
    const algoKMultiplier = slowTakeoffWeight > 0.5 ? 0.6 : 1.0;
    let paradigmGeneration = 0;
    for (let step = 0; step < steps; step++) {
      const y = cfg.BASE_YEAR + step * dt;
      let paradigmBonus = 0;

      const logDiff = flopsLog + algoLog - baseLog;
      const rawR = v3ComputeDim(logDiff, cfg.DIMENSIONS.reasoning.slope, cR);
      const rawA = v3ComputeDim(logDiff, cfg.DIMENSIONS.agency.slope, cA);
      const reasoning = v3ApplyInference(rawR, cfg.INFERENCE_SCALING.max_bonus_reasoning, cfg.INFERENCE_SCALING.saturation_cap);
      const agency = v3ApplyInference(rawA, cfg.INFERENCE_SCALING.max_bonus_agency, cfg.INFERENCE_SCALING.saturation_cap);
      const cap = Math.min(reasoning, agency);

      // ИСПРАВЛЕНИЕ: Логика парадигм синхронизирована
      const saturation = Math.max(reasoning / cR, agency / cA);
      if (y > cfg.CURRENT_YEAR && saturation > cfg.EXPERT.saturationThreshold && Math.random() < cfg.SCALING_LAW.paradigm_shift_prob * dt) {
        cA *= cfg.SCALING_LAW.shift_multiplier;
        cR *= cfg.SCALING_LAW.shift_multiplier;
        algoLog = Math.max(algoLog - (0.4 + paradigmGeneration * 0.1), -3.0);
        paradigmGeneration++;
        paradigmBonus = cfg.SCALING_LAW.shift_multiplier;
        accumulatedParadigm += paradigmBonus;
      }

      years.push(y);
      hwComp.push(flopsLog - cfg.BASE_LOG_FLOPS);
      algoComp.push(pureAlgoLog);
      paradigmComp.push(accumulatedParadigm);

      let damping = 1.0;
      if (y > cfg.BOTTLENECKS.econ_wall_start && (reasoning - agency) > 2.0) {
        damping *= Math.exp(-cfg.BOTTLENECKS.econ_damping * (reasoning - agency - 2.0));
      }
      const rsi = v3CalculateRSI(reasoning, agency, cap, cfg.EXPERT);
      accumulatedRsi += rsi * dt;
      rsiComp.push(accumulatedRsi);
      flopsLog += hwK * damping * dt;
      algoLog += (algoK * algoKMultiplier * damping + rsi) * dt;
      pureAlgoLog += (algoK * algoKMultiplier * damping) * dt;
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

// ============================================================================
// DATA & OBSERVABLES (Dynamic Benchmark History)
// ============================================================================

// URL вашего JSON с актуальными бенчмарками (можно заменить на GitHub Raw или ваш API)
const BENCHMARKS_API_URL = 'https://raw.githubusercontent.com/slavabelik79/ai-metrics/main/benchmarks_history.json';

// Шум (дисперсия) для каждого бенчмарка. Отражает степень доверия к тесту.
const BENCHMARK_SIGMAS = {
  arenaElo: 40.0,    // Elo (LMSYS Chatbot Arena)
  arcAgi: 8.0,       // ARC-AGI (%)
  sweBench: 10.0,    // SWE-bench Verified (%)
  flopsLog: 0.5      // log10(FLOPs)
};

let REAL_BENCHMARK_HISTORY = [];

// Фундаментальная база данных бенчмарков (Данные до 31 мая 2026 года)
// Источники: LMSYS Leaderboard, SWE-bench Official, ARC Prize Reports, Epoch AI.
const FALLBACK_BENCHMARK_HISTORY = [
  // --- РАННЯЯ ЭПОХА (Пре-Агенты) ---
  { 
    year: 2022.90, event: "ChatGPT (GPT-3.5)", 
    arenaElo: 1000, arcAgi: 3.0, sweBench: 0.0, trainingFlopsLog: 23.5,
    notes: "LMSYS base Elo = 1000. Агентность нулевая."
  },
  { 
    year: 2023.25, event: "GPT-4 Release",     
    arenaElo: 1150, arcAgi: 12.0, sweBench: 0.1, trainingFlopsLog: 25.32,
    notes: "Epoch AI: 2.1e25 FLOPs. Появление зачатков абстрактного рассуждения."
  },
  { 
    year: 2023.85, event: "GPT-4 Turbo",       
    arenaElo: 1250, arcAgi: 15.0, sweBench: 1.5, trainingFlopsLog: 25.4,
    notes: "Слабый рост reasoning, улучшенное следование инструкциям."
  },

  // --- ЭПОХА ИНСТРУМЕНТОВ И TTC ---
  { 
    year: 2024.20, event: "Claude 3 Opus", 
    arenaElo: 1255, arcAgi: 20.0, sweBench: 4.0, trainingFlopsLog: 25.5,
    notes: "Первое серьезное покушение на лидерство OpenAI в Arena."
  },
  { 
    year: 2024.45, event: "Claude 3.5 Sonnet", 
    arenaElo: 1270, arcAgi: 43.0, sweBench: 31.4, trainingFlopsLog: 25.55,
    notes: "Шок на SWE-bench (31.4%). Метод Райана Гринблатта показал 43% на ARC-AGI через сэмплирование."
  },
  { 
    year: 2024.75, event: "OpenAI o1-preview",        
    arenaElo: 1320, arcAgi: 65.0, sweBench: 36.0, trainingFlopsLog: 25.8,
    notes: "Первый масштабный Test-Time Compute. Резкий рост эффективности на сложных задачах."
  },
  { 
    year: 2024.95, event: "OpenAI o3-preview",        
    arenaElo: 1350, arcAgi: 87.5, sweBench: 45.0, trainingFlopsLog: 26.0,
    notes: "Декабрь 2024. ARC-AGI (High Compute) достигает 87.5%, демонстрируя силу RLHF в reasoning."
  },

  // --- МАССОВОЕ МАСШТАБИРОВАНИЕ 2025 ---
  { 
    year: 2025.15, event: "GPT-4.5 Preview", 
    arenaElo: 1439, arcAgi: 70.0, sweBench: 56.0, trainingFlopsLog: 26.2,
    notes: "Смещение фокуса на базовую надежность моделей (без тяжелого CoT)."
  },
  { 
    year: 2025.30, event: "o3-2025-04-16", 
    arenaElo: 1444, arcAgi: 89.0, sweBench: 62.0, trainingFlopsLog: 26.3,
    notes: "Промежуточный релиз. Улучшенная агентность в средах программирования."
  },
  { 
    year: 2025.65, event: "Gemini 2.5 Pro",      
    arenaElo: 1456, arcAgi: 82.0, sweBench: 65.0, trainingFlopsLog: 26.5,
    notes: "Август 2025. Топ-1 LMSYS на момент релиза. Преодолен барьер 1450 Elo."
  },
  { 
    year: 2025.95, event: "GPT-5-2 Thinking", 
    arenaElo: 1480, arcAgi: 78.7, sweBench: 72.0, trainingFlopsLog: 26.8,
    notes: "Декабрь 2025. Базовая стоимость reasoning упала в 10 раз ($0.52 за задачу ARC)."
  },

  // --- СОВРЕМЕННЫЙ ФРОНТИР (Первая половина 2026) ---
  { 
    year: 2026.15, event: "GPT-5.4 Web",       
    arenaElo: 1484, arcAgi: 92.0, sweBench: 78.2, trainingFlopsLog: 26.9,
    notes: "Массовое внедрение агентов браузинга."
  },
  { 
    year: 2026.30, event: "Claude Opus 4.7",     
    arenaElo: 1504, arcAgi: 94.0, sweBench: 82.0, trainingFlopsLog: 27.0,
    notes: "Апрель 2026. Пробит барьер в 1500 Elo. Насыщение оригинального SWE-bench."
  },
  { 
    year: 2026.40, event: "GPT-5.5 Pro",     
    arenaElo: 1561, arcAgi: 96.5, sweBench: 82.6, trainingFlopsLog: 27.2,
    notes: "Май 2026. Абсолютный SOTA. Эффективный предел текущих бенчмарков."
  }
];

async function loadHistoricalBenchmarks() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(BENCHMARKS_API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error('Network response was not ok');
    REAL_BENCHMARK_HISTORY = await response.json();
    console.log("Historical benchmarks loaded from API.");
  } catch (error) {
    console.warn("Failed to fetch benchmarks from API, using fallback data. Error:", error);
    REAL_BENCHMARK_HISTORY = JSON.parse(JSON.stringify(FALLBACK_BENCHMARK_HISTORY));
  }
}

// Преобразование латентных переменных трекера в численные бенчмарки
// r10, a10 — reasoning и agency в шкале модели (0..~15)
// Возвращает предсказанные значения бенчмарков + log10(FLOPs) для сопоставления с training compute
function getNumericObservables(r10, a10, expertCfg) {
    const autonomyWeight = expertCfg ? expertCfg.toolUseVsAutonomyWeight : 0.6;
    const reasoningWeight = 1.0 - autonomyWeight;
    const blendedReasoning = r10 * reasoningWeight + a10 * autonomyWeight;

    return {
        sweBench: 100 * sigmoid(0.55 * blendedReasoning - 2.5),
        arcAgi: 100 * sigmoid(0.6 * r10 - 4.0),
        arenaElo: 800 + 70 * r10,
        // Предсказанный log10(FLOPs): калибровка ~23.5 при r10≈0, растёт с reasoning
        // k ≈ 0.13: при r10=7 → ~25.5, при r10=10 → ~26.5, при r10=13 → ~27.5
        flopsLog: 23.5 + 0.3 * r10
    };
}

function v3GetTracker() {
  if (!v3Tracker) {
    v3Tracker = new BayesianTracker(1000);
    REAL_BENCHMARK_HISTORY.forEach(d => v3Tracker.observeRealData(d.year, d));
    v3Observations.forEach(d => v3Tracker.observeRealData(d.year, d));
  }
  return v3Tracker;
}

// Обратная конвертация: бенчмарки → AA Intelligence/Agentic
// ARC-AGI → reasoning, Автономность → agency
function benchmarksToAA(arcAgiPct, horizonHours) {
  // ARC-AGI = 100 * sigmoid(0.6 * r10 - 4.0)
  // Обратная: r10 = (ln(p/(100-p)) + 4.0) / 0.6
  const arc = Math.max(0.1, Math.min(99.9, arcAgiPct));
  const r10 = (Math.log(arc / (100 - arc)) + 4.0) / 0.6;

  // Автономность = 0.5 * exp(0.5 * a10) часов
  // Обратная: a10 = 2 * ln(horizon / 0.5)
  const h = Math.max(0.1, horizonHours);
  const a10 = 2.0 * Math.log(h / 0.5);

  // r10 (0..10) → intel (0..100), a10 (0..10) → agency (0..100)
  const intel = Math.max(0, Math.min(100, r10 * 10));
  const agency = Math.max(0, Math.min(100, a10 * 10));

  return { intel, agency, r10, a10 };
}

function v3AddObservation() {
  const arcVal = +document.getElementById('v3ARC').value;
  const horizonVal = +document.getElementById('v3Horizon').value;
  
  // Конвертируем horizonVal обратно в r10/a10, чтобы аппроксимировать SWE-bench
  const aa = benchmarksToAA(arcVal, horizonVal);
  const fakeMetrics = getNumericObservables(aa.r10, aa.a10, EXPERT_CONFIG);
  const sweVal = fakeMetrics.sweBench;
  const eloVal = fakeMetrics.arenaElo;

  const y = v3Tracker ? v3Tracker.cfg.CURRENT_YEAR : (new Date().getFullYear() + new Date().getMonth() / 12);
  
  v3Observations = v3Observations.filter(o => o.year < y - 0.01);
  v3Observations.push({ year: y, arcAgi: arcVal, sweBench: sweVal, arenaElo: eloVal });
  
  v3Tracker = new BayesianTracker(1000);
  REAL_BENCHMARK_HISTORY.forEach(d => v3Tracker.observeRealData(d.year, d));
  v3Observations.forEach(d => v3Tracker.observeRealData(d.year, d));
  v3UpdateUI(v3Tracker);
}

function v3ResetTracker() {
  v3Tracker = null; v3Observations = [];
  const obsEl = document.getElementById('v3Observations');
  if (obsEl) obsEl.innerHTML = '';
  const parEl = document.getElementById('v3Params');
  if (parEl) parEl.textContent = '';
}

function v3UpdateUI(tracker) {
  v3CheckWarning(tracker);
  updateObsMetrics();
}

let v3HasUserInput = false;

function v3CheckWarning(tracker) {
  const warnEl = document.getElementById('v3Warning');
  if (!warnEl) return;
  if (!v3HasUserInput) { warnEl.style.display = 'none'; return; }
  const arcVal = +document.getElementById('v3ARC').value || 0;
  const horizonVal = +document.getElementById('v3Horizon').value || 0;
  const aa = benchmarksToAA(arcVal, horizonVal);
  const testMetrics = getNumericObservables(aa.r10, aa.a10, tracker.cfg.EXPERT);

  let minDist = Infinity;
  for (let i = 0; i < tracker.n; i += 10) { 
    if (tracker.weights[i] < 1e-5) continue;
    const pred = v3SimulateToYear(tracker.particles[i], tracker.cfg.CURRENT_YEAR, tracker.cfg);
    const m = getNumericObservables(pred.reasoning, pred.agency, tracker.cfg.EXPERT);
    
    // Считаем Евклидово расстояние в пространстве нормализованных бенчмарков
    const dist = Math.sqrt(
        ((testMetrics.arcAgi - m.arcAgi)/BENCHMARK_SIGMAS.arcAgi)**2 + 
        ((testMetrics.sweBench - m.sweBench)/BENCHMARK_SIGMAS.sweBench)**2
    );
    if (dist < minDist) minDist = dist;
  }
  if (minDist > 3.0) { // 3 сигмы
    warnEl.style.display = '';
    const L = LANG[window._lang || 'ru'];
    warnEl.textContent = L.v3_warning_far || '⚠️ Значения далеко от диапазона частиц — модель не может надёжно экстраполировать. Прогноз ближе к априорному.';
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
    // Конвертируем бенчмарки в AA
    const arcVal = +document.getElementById('v3ARC').value;
    const horizonVal = +document.getElementById('v3Horizon').value;
    const aa = benchmarksToAA(arcVal, horizonVal);
    const currentY = v3Tracker ? v3Tracker.cfg.CURRENT_YEAR : (new Date().getFullYear() + new Date().getMonth() / 12);
    const fakeMetrics = getNumericObservables(aa.r10, aa.a10, EXPERT_CONFIG);
    v3Tracker = new BayesianTracker(1000);
    REAL_BENCHMARK_HISTORY.forEach(d => v3Tracker.observeRealData(d.year, d));
    
    const newObs = { year: currentY, arcAgi: arcVal, sweBench: fakeMetrics.sweBench, arenaElo: fakeMetrics.arenaElo };
    v3Observations = v3Observations.filter(o => o.year < currentY - 0.01);
    v3Observations.push(newObs);
    v3Observations.forEach(d => v3Tracker.observeRealData(d.year, d));
    const tracker = v3Tracker;
    const runData = tracker.runMonteCarloForecast(n);
    const t1List = runData.t1Years, t2List = runData.t2Years;
    const t3List = runData.t3Years, t4List = runData.t4Years;
    const finiteT1 = t1List.filter(isFinite);
    const finiteT2 = t2List.filter(isFinite);
    const finiteT3 = t3List.filter(isFinite);
    const finiteT4 = t4List.filter(isFinite);
    const finite = finiteT2;
    
    const CUR_Y = tracker.cfg.CURRENT_YEAR;
    const yq = [];
    for (let y = 0.25; y <= 10; y += 0.25) yq.push(+y.toFixed(4));
    for (let y = 11; y <= 40; y++) yq.push(y);
    const yqAbs = yq.map(y => +(CUR_Y + y).toFixed(2));

    currentResults = {
      histogram: buildHistogramBins(t1List, t2List, t3List, t4List),
      trajectory: runData.trajectory, 
      cumulative: { 
        x: yqAbs, 
        t1: yq.map(y => cdf(t1List, y)), t2: yq.map(y => cdf(t2List, y)),
        t3: yq.map(y => cdf(t3List, y)), t4: yq.map(y => cdf(t4List, y))
      },
      summary: {
        t1Median: percentile(finiteT1, 50),
        t2Median: percentile(finiteT2, 50),
        t3Median: percentile(finiteT3, 50),
        t4Median: percentile(finiteT4, 50),
        agiMedian: percentile(finiteT2, 50),
        asiMedian: percentile(finiteT4, 50),
        pAgi2029: cdf(t2List, 3), pAgi2033: cdf(t2List, 7), pAgi2040: cdf(t2List, 14),
        pAsi2035: cdf(t4List, 9), pAsi2045: cdf(t4List, 19), nRuns: n
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
  setVal('vT1', fmt(s.t1Median), 't1years');
  setVal('vT2', fmt(s.t2Median), 't2years');
  setVal('vT3', fmt(s.t3Median), 't3years');
  setVal('vT4', fmt(s.t4Median), 't4years');
  // Скрыть/показать предупреждение "AGI не достигнут"
  const noAgiEl = document.getElementById('v3NoAgi');
  if (noAgiEl) noAgiEl.style.display = isFinite(s.agiMedian) ? 'none' : '';
  plotHistogram(r.histogram); plotCumulative(r.cumulative);
  // Advanced charts (async-like, yield between heavy plots)
  requestAnimationFrame(async () => {
    const tracker = v3GetTracker();
    await plotSensitivityHeatmap(tracker);
    requestAnimationFrame(() => {
      plotScenarioFan(tracker);
      plotDecomposition(tracker);
    });
  });
}

function setVal(id, txt, cls) { const el = document.getElementById(id); if (el) { el.innerHTML = txt; el.className = 'status-value ' + (cls||''); } }
function yearsText(yrs) {
  if (!isFinite(yrs) || yrs > 40) return LANG[window._lang||'ru'].fY_gt;
  return yrs.toFixed(1) + LANG[window._lang||'ru'].fY_suffix;
}

function buildHistogramBins(l1, l2, l3, l4) {
  const bins = [], binW = 0.5;
  for (let x = 0.5; x <= 30.0; x += binW) bins.push(x);
  
  const h1 = new Array(bins.length - 1).fill(0);
  const h2 = new Array(bins.length - 1).fill(0);
  const h3 = new Array(bins.length - 1).fill(0);
  const h4 = new Array(bins.length - 1).fill(0);
  
  const fillHist = (list, hist) => {
    for (const v of list) {
      if (isFinite(v)) { 
        const idx = Math.floor((v - 0.5) / binW); 
        if (idx >= 0 && idx < hist.length) hist[idx]++; 
      }
    }
  };
  fillHist(l1, h1); fillHist(l2, h2); fillHist(l3, h3); fillHist(l4, h4);

  const tracker = v3GetTracker();
  const CUR_Y = tracker ? tracker.cfg.CURRENT_YEAR : new Date().getFullYear();
  return { 
    labels: bins.slice(0, -1).map((_, i) => (CUR_Y + (bins[i] + bins[i + 1]) / 2).toFixed(1)), 
    t1: h1, t2: h2, t3: h3, t4: h4
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
    { x: h.labels, y: h.t1, type: 'scatter', mode: 'none', fill: 'tozeroy', name: t.ch_t1, fillcolor: 'rgba(234,179,8,0.45)' },
    { x: h.labels, y: h.t2, type: 'scatter', mode: 'none', fill: 'tozeroy', name: t.ch_t2, fillcolor: 'rgba(249,115,22,0.45)' },
    { x: h.labels, y: h.t3, type: 'scatter', mode: 'none', fill: 'tozeroy', name: t.ch_t3, fillcolor: 'rgba(239,68,68,0.45)' },
    { x: h.labels, y: h.t4, type: 'scatter', mode: 'none', fill: 'tozeroy', name: t.ch_t4, fillcolor: 'rgba(139,92,246,0.45)' }
  ], { ...LAYOUT_BASE, xaxis: { ...LAYOUT_BASE.xaxis, title: { text: t.ch1_xlabel } }, yaxis: { ...LAYOUT_BASE.yaxis, title: { text: t.ch1_ylabel } } }, PLOT_CFG);
}
function plotCumulative(c) {
  const t = LANG[window._lang || 'ru'];
  Plotly.newPlot('c3', [
    { x: c.x, y: c.t1, type: 'scatter', mode: 'lines', name: t.ch_t1, line: { color: '#eab308', width: 2 } },
    { x: c.x, y: c.t2, type: 'scatter', mode: 'lines', name: t.ch_t2, line: { color: '#f97316', width: 2 } },
    { x: c.x, y: c.t3, type: 'scatter', mode: 'lines', name: t.ch_t3, line: { color: '#ef4444', width: 2 } },
    { x: c.x, y: c.t4, type: 'scatter', mode: 'lines', name: t.ch_t4, line: { color: '#8b5cf6', width: 2 } }
  ], { ...LAYOUT_BASE, xaxis: { ...LAYOUT_BASE.xaxis, title: { text: t.ch3_xlabel } }, yaxis: { ...LAYOUT_BASE.yaxis, title: { text: t.ch3_ylabel }, range: [0, 105] } }, PLOT_CFG);
}

// ===== ADVANCED PLOT FUNCTIONS =====

async function plotSensitivityHeatmap(tracker) {
  const t = LANG[window._lang || 'ru'];
  const c5 = document.getElementById('c5');
  if (c5) {
    c5.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666680;font-family:monospace;">' + (LANG[window._lang || 'ru'].ch5_loading || 'Вычисление матрицы (асинхронно)...') + '</div>';
  }

  const arcRange = [60, 65, 70, 75, 80, 85, 90, 95, 99];     // Oсь Y
  const sweRange = [20, 30, 40, 50, 60, 70, 80, 90, 99];     // Oсь X

  const matrix = await tracker.runSensitivityMatrixAsync(arcRange, sweRange);

  if (!document.getElementById('c5')) return;

  const textMatrix = matrix.map((row, i) =>
    row.map((v, j) => `ARC=${arcRange[i]}%, SWE=${sweRange[j]}%<br>${t.ch5_label}: ${v.toFixed(1)} лет`)
  );

  Plotly.newPlot('c5', [{
    z: matrix,
    x: sweRange.map(String),
    y: arcRange.map(String),
    type: 'heatmap',
    colorscale: [[0, '#0a0a0f'], [0.2, '#1a3a4a'], [0.4, '#0e5e7a'], [0.6, '#f0883e'], [0.8, '#ef4444'], [1, '#ff0040']],
    text: textMatrix,
    hoverinfo: 'text',
    colorbar: { title: { text: t.ch5_colorbar || 'Лет до T4' }, thickness: 12, len: 0.8 },
  }], {
    ...LAYOUT_BASE,
    xaxis: { ...LAYOUT_BASE.xaxis, title: { text: 'SWE-bench (%)' } },
    yaxis: { ...LAYOUT_BASE.yaxis, title: { text: 'ARC-AGI (%)' } },
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

  const yrRange = [2026, 2055];
  const lim = tracker.cfg.THRESHOLDS;
  traces.push(
    { x: yrRange, y: [lim.t1, lim.t1], type: 'scatter', mode: 'lines', name: t.ch_t1, line: { color: '#eab308', dash: 'dot', width: 1 } },
    { x: yrRange, y: [lim.t2, lim.t2], type: 'scatter', mode: 'lines', name: t.ch_t2, line: { color: '#f97316', dash: 'dot', width: 1 } },
    { x: yrRange, y: [lim.t3, lim.t3], type: 'scatter', mode: 'lines', name: t.ch_t3, line: { color: '#ef4444', dash: 'dot', width: 1 } },
    { x: yrRange, y: [lim.t4, lim.t4], type: 'scatter', mode: 'lines', name: t.ch_t4, line: { color: '#8b5cf6', dash: 'dot', width: 1 } }
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
    hdr_title:'Singularity Forecaster', hdr_sub:'v4 — Четыре стадии отлучения',
    // Status bar
    sb_t1:'Медиана T1 (Понимание)', sb_t2:'Медиана T2 (Предсказуемость)',
    sb_t3:'Медиана T3 (Контроль)', sb_t4:'Медиана T4 (Влияние)',
    sb_pagi_2029:'P(T2 · 2029)', sb_pagi_2033:'P(T2 · 2033)', sb_pagi_2040:'P(T2 · 2040)',
    sb_pasi_2035:'P(T4 · 2035)', sb_pasi_2045:'P(T4 · 2045)',
    sb_hw:'Удвоение HW', sb_algo:'Удвоение Algo', sb_agency:'Потолок Agency', sb_ess:'ESS',
    // Controls
    ctrl_simulations:'Симуляции (N)', ctrl_obs_year:'Год наблюдения',
    ctrl_intelligence:'Интеллект', ctrl_agentic:'Агентность',
    ctrl_add:'Добавить', ctrl_reset:'Сбросить',
    ctrl_swe_bench:'SWE-bench (%)', ctrl_arc_agi:'ARC-AGI (%)',
    ctrl_horizon:'Автономность (часов)', ctrl_cost:'Стоимость 1M токенов ($)',
    run_btn:'Запустить симуляцию',
    // Charts
    tag1:'Вероятностный анализ', tag3:'Кумулятивная',
    tag5:'Чувствительность', tag6:'Сценарии', tag7:'Декомпозиция',
    chart1:'1. Распределение 4-х этапов Сингулярности (Monte Carlo)',
    chart3:'2. Накопленная вероятность (Cumulative PDF)',
    chart5:'3. Карта чувствительности (Intel × Agentic)',
    chart6:'4. Веер сценариев (Multi-Run Overlay)',
    chart7:'5. Вклад компонент (Stacked Area)',
    tip1:'Показывает, где группируются 3000 прогонов Монте-Карло. Чем выше столбец — тем больше сценариев привели к T1/T2/T3/T4 в этом году.',
    tip3:'P(T2 ≤ X) — шанс, что T2 появится не позднее, чем через X лет. Если кривая круто поднимается — быстрый переход от «почти нет» к «почти точно».',
    tip5:'Тепловая карта: оси — параметры Intelligence и Agentic последнего наблюдения. Цвет — медианный год T2. Показывает, какой параметр доминирует в прогнозе.',
    tip6:'30 случайных прогонов из апостериорного распределения, наложенных полупрозрачно. Показывает разброс возможных путей к сингулярности.',
    tip7:'Разбивка capability на составляющие: Hardware scaling, Algorithmic progress, Paradigm shift bonus, RSI feedback. Показывает, что двигает прогресс.',
    ch_t1:'T1: Понимание', ch_t2:'T2: Предсказуемость', ch_t3:'T3: Контроль', ch_t4:'T4: Влияние',
    ch1_xlabel:'Год', ch1_ylabel:'Прогонов',
    ch3_xlabel:'Год', ch3_ylabel:'P(%)', ch3_pt2:'P(T2)', ch3_pt4:'P(T4)',
    ch5_label:'Лет до T4', ch5_colorbar:'Лет до T4', ch5_xaxis:'Agentic score', ch5_yaxis:'Intelligence score', ch5_loading:'Вычисление матрицы (асинхронно)...',
    ch7_ylabel:'Суммарный вклад (log FLOPs)',
    fY_suffix:' лет', fY_gt:'> 40 лет',
    // About
    about_title:'О модели v4',
    about_intro:'Модель v4 использует байесовский частичный фильтр (Bayesian Particle Filter) для калибровки прогноза на реальных данных бенчмарков (ARC-AGI, SWE-bench, Arena Elo). Каждая частица — это гипотеза о будущем: скорость роста hardware, алгоритмов и потолок агентности. Наблюдения обновляют веса частиц через правдоподобие, а маловероятные гипотезы отмирают при ресэмплинге. Панель Expert Sandbox позволяет настраивать 30+ параметров модели и проверять гипотезы о будущем в реальном времени.',
    defs_label:'Концептуальные контуры модели',
    arch_tracker_title:'Байесовский трекер',
    arch_tracker_desc:'1000 частиц с настраиваемыми априорными распределениями: hw_months, algo_months, agency_ceiling (mean/std через Expert Sandbox). Каждое наблюдение AA (Intelligence + Agentic) обновляет веса через гауссово правдоподобие. ESS-ресэмплинг предотвращает вырождение. Поддержка трёх World Models: Cascade, Hard Wall, Slow Takeoff.',
    arch_dims_title:'Два измерения интеллекта',
    arch_dims_desc:'Reasoning (slope 0.35, ceiling настраивается) и Agency (slope 0.25, ceiling — параметр частицы). Capability = min(Reasoning, Agency). Оба растут логистически от log(FLOPs), но упираются в потолки. Эпистемическая неопределённость: каждая частица верит в свою «физику мира».',
    arch_paradigm_title:'Смена парадигмы',
    arch_paradigm_desc:'Переход происходит при saturation > threshold (настраивается) + compute overhang bonus. Убывающая отдача: 1-й сдвиг ×3.0, 2-й ×2.5... World Models модифицируют вероятность: Hard Wall подавляет сдвиги, Slow Takeoff даёт огромный первый скачок.',
    arch_rsi_title:'RSI — рекурсивное самоулучшение',
    arch_rsi_desc:'Запускается при reasoning >= 8.0 AND agency >= 8.0 (настраивается). Базовый потенциал растёт от (cap - threshold)^1.2, но ограничивается координационным трением: 1/(1 + friction * max(0, cap-10)). Множитель RSI масштабирует эффект. Максимум 2.0.',
    arch_bottlenecks_title:'Бутылочные горлышки',
    arch_bottlenecks_desc:'Экономическая стена: если Reasoning обгоняет Agency > 2.0 — инвестиции экспоненциально падают. GPU-пузырь может лопнуть при agency < 4. Alignment incident замораживает масштабирование на 1.5 года. Физический предел роста hardware (maxPhysicalHwGrowth) — даже сверхразум не строит fabs мгновенно.',
    arch_mc_title:'Monte Carlo прогноз',
    arch_mc_desc:'3000 прогонов из апостериорного распределения. Каждый прогон — симуляция от 2023 до 2068 года с месячным шагом. Результат: распределение лет до T1, T2, T3 и T4. Пороги настраиваются через Expert Sandbox.',
    arch_expert_title:'Expert Sandbox',
    arch_expert_desc:'30+ настраиваемых параметров: априорные допущения (agency mean/std), пороги RSI, координационное трение, физический предел hardware, compute overhang, вероятности World Models, вес autonomy в бенчмарках. Превращает модель из прогноза в эпистемологический симулятор.',
    arch_shocks_title:'Шоки и Black Swans',
    arch_shocks_desc:'Типы шоков: Data Wall (исчерпание данных), Alignment Incident (регуляторная заморозка), GPU Bubble Burst (обвал инвестиций), AI Winter (разрыв reasoning-agency). Вероятности зависят от текущего состояния системы.',
    defs_intro:'В модели v4 описываются четыре контрольные точки технологической сингулярности:',
    t1_def_title:'T1: Потеря понимания',
    t1_def_score:'Потолок: настраиваемый',
    t1_def_text1:'Система сложнее когнитивной модели человека. Пользование становится ритуальным. Мы доверяем интерфейсам, но уже не понимаем причин решений.',
    t1_def_text2:'Промежуточные стадии: Инструмент → Усилитель → Посредник.',
    t2_def_title:'T2: Потеря предсказуемости',
    t2_def_score:'Потолок: настраиваемый',
    t2_def_text1:'Система выступает как координатор. Никто не способен оценить глобальные последствия действий. Возникает ощущение случайности мира и эрозия человеческой агентности.',
    t2_def_text2:'Промежуточные стадии: Координатор → Арбитр → Архитектор среды.',
    t3_def_title:'T3: Потеря контроля',
    t3_def_score:'Потолок: настраиваемый',
    t3_def_text1:'Система автономна и действует быстрее человеческого цикла. Строит собственную инфраструктуру. Люди, политики и государства становятся функцией инфраструктуры.',
    t3_def_text2:'Промежуточные стадии: Метасистема → Автономная инфраструктура.',
    t4_def_title:'T4: Потеря влияния',
    t4_def_score:'Потолок: настраиваемый',
    t4_def_text1:'Среда мыслит за человека. Пространство решений полностью сконструировано извне. Цели системы перестают быть человеческими. Цивилизационный фазовый переход.',
    t4_def_text2:'Промежуточные стадии: Постчеловеческий слой → Цивилизационный фазовый переход.',
    // Expert Sandbox
    expert_toggle:'Экспертные настройки',
    expert_cat1:'Архитектура и Парадигмы',
    expert_cat2:'Самоулучшение (RSI)',
    expert_cat3:'Экономика и Риски',
    expert_cat4:'Эпистемология (World Models)',
    expert_cat5:'Априорные допущения',
    expert_p_ceilingReasoningBase:'Потолок Трансформеров',
    expert_d_ceilingReasoningBase:'Когда текущая архитектура упрется в стену',
    expert_p_hypeGracePeriod:'Венчурный хайп (лет)',
    expert_d_hypeGracePeriod:'Сколько лет рынок заливает деньги в новую парадигму',
    expert_p_saturationThreshold:'Порог насыщения',
    expert_d_saturationThreshold:'Насколько надо упереться для смены парадигмы',
    expert_p_overhangShiftMultiplier:'Compute Overhang',
    expert_d_overhangShiftMultiplier:'Влияние избытка капитала на вероятность прорыва',
    expert_p_baseShiftMultiplier:'Базовый множитель прорыва',
    expert_d_baseShiftMultiplier:'Множитель потолка при первом сдвиге (1.1=иллюзия прорыва, 10=квантовый скачок)',
    expert_p_paradigmDecayRate:'Темп убывающей отдачи',
    expert_d_paradigmDecayRate:'Насколько слабее каждый следующий сдвиг (0=бесконечная сингулярность)',
    expert_p_minShiftMultiplier:'Мин. множитель сдвига',
    expert_d_minShiftMultiplier:'Гарантированный минимум (потолок не уменьшится)',
    expert_p_rsiMultiplier:'Множитель RSI',
    expert_d_rsiMultiplier:'Умножает все коэффициенты RSI (0 = без самоулучшения)',
    expert_p_rsiTriggerReasoning:'Порог RSI (Reasoning)',
    expert_d_rsiTriggerReasoning:'Reasoning для старта авто-улучшений',
    expert_p_rsiTriggerAgency:'Порог RSI (Agency)',
    expert_d_rsiTriggerAgency:'Agency для старта авто-улучшений',
    expert_p_coordinationFriction:'Координационное трение',
    expert_d_coordinationFriction:'Деградация при масштабировании агентов (0 = идеальная координация)',
    expert_p_maxPhysicalHwGrowth:'Макс. рост железа',
    expert_d_maxPhysicalHwGrowth:'Физический предел роста hardware',
    expert_p_hwCoDesignBonus:'HW ко-дизайн',
    expert_d_hwCoDesignBonus:'Насколько AI ускоряет закон Мура',
    expert_p_bubbleBurstRisk:'Риск GPU-пузыря',
    expert_d_bubbleBurstRisk:'Шанс краха инвестиций если agency < 4',
    expert_p_alignmentCooldown:'Инцидент безопасности (лет)',
    expert_d_alignmentCooldown:'Заморозка регуляторами после инцидента',
    expert_p_maxCapitalMultiplier:'Эластичность капитала',
    expert_d_maxCapitalMultiplier:'Макс. множитель инвестиций при высокой полезности',
    expert_p_priorAgencyMean:'Априорное среднее Agency',
    expert_d_priorAgencyMean:'Базовое ожидание потолка агентности (=10 это T2)',
    expert_p_priorAgencyStd:'Априорный разброс',
    expert_d_priorAgencyStd:'Разброс мнений о потолке (больше = больше оптимистичных частиц)',
    expert_p_toolUseVsAutonomyWeight:'Вес Autonomy в SWE-bench',
    expert_d_toolUseVsAutonomyWeight:'0 = бенчмарк взлабывается reasoning, 1 = только реальная автономность',
    expert_world_cascade:'Каскад %',
    expert_world_hardWall:'Стена %',
    expert_world_slowTakeoff:'Медл.взлёт %',
    expert_world_error:'Сумма должна быть 100%',
    expert_world_desc:'Априорные вероятности гипотез о структуре реальности. Сумма = 100%.',
    expert_reset:'Сбросить по умолчанию',
    expert_apply:'Применить и перезапустить',
    // Category 7: Simulation Parameters
    expert_cat7:'Симуляции и Бенчмарки',
    expert_p_simulations:'Симуляции (N)',
    expert_d_simulations:'Количество Monte Carlo прогонов (500-10000)',
    expert_p_arc_agi:'ARC-AGI (%)',
    expert_d_arc_agi:'Текущий уровень ARC-AGI для наблюдений',
    expert_p_horizon:'Автономность (часов)',
    expert_d_horizon:'Горизонт автономности для текущих бенчмарков',
    // Block headers
    expert_blkA:'Парадигмы и потолки',
    expert_blkA2:'Смена парадигм',
    expert_blkB:'Самоулучшение (RSI)',
    expert_blkB2:'Железо',
    expert_blkC:'Кризисы и штрафы',
    expert_blkD:'Бенчмарки и наблюдения',
    expert_blkD2:'Test-Time Compute',
    expert_blkD3:'Априорные допущения',
    expert_blkD4:'World Models',
    expert_blkD5:'Симуляция',
    expert_blkE:'Барьеры реальности',
    // Deep params (kept for backward compat with expertResetDefaults)
    expert_cat7new:'Углубленные настройки (TTC, штрафы, шум)',
    expert_p_maxInferenceBonusReasoning:'Макс. TTC бонус (Reasoning)',
    expert_d_maxInferenceBonusReasoning:'Максимальный множитель Test-Time Compute для логики',
    expert_p_maxInferenceBonusAgency:'Макс. TTC бонус (Agency)',
    expert_d_maxInferenceBonusAgency:'Максимальный множитель Test-Time Compute для автономности',
    expert_p_inferenceSaturationCap:'Порог насыщения TTC',
    expert_d_inferenceSaturationCap:'Базовый интеллект, где CoT перестаёт давать бонус',
    expert_p_reasoningScalingSlope:'Наклон Reasoning',
    expert_d_reasoningScalingSlope:'Наклон кривой масштабирования FLOPs → Reasoning',
    expert_p_agencyScalingSlope:'Наклон Agency',
    expert_d_agencyScalingSlope:'Наклон кривой масштабирования FLOPs → Agency',
    expert_p_dataWallPenalty:'Штраф Стены Данных',
    expert_d_dataWallPenalty:'Множитель скорости алгоритмов при исчерпании данных',
    expert_p_hypeGapThreshold:'Порог разрыва (Зима ИИ)',
    expert_d_hypeGapThreshold:'Разрыв reasoning-agency для старта Зимы ИИ',
    expert_p_winterDamping:'Строгость Зимы ИИ',
    expert_d_winterDamping:'Множитель инвестиций и алгоритмов в Зиму ИИ',
    expert_p_observationNoiseSigma:'Шум наблюдений (σ)',
    expert_d_observationNoiseSigma:'Уровень доверия к бенчмаркам (меньше = строже фильтр)',
    expert_p_t1Threshold:'Порог T1',
    expert_d_t1Threshold:'Порог capability для T1 (Понимание)',
    expert_p_t2Threshold:'Порог T2',
    expert_d_t2Threshold:'Порог capability для T2 (Предсказуемость)',
    expert_p_t3Threshold:'Порог T3',
    expert_d_t3Threshold:'Порог capability для T3 (Контроль)',
    expert_p_t4Threshold:'Порог T4',
    expert_d_t4Threshold:'Порог capability для T4 (Влияние)',
    expert_p_barrierAtomsLimit:'Проклятие атомов',
    expert_d_barrierAtomsLimit:'Макс. удвоений HW в год',
    expert_p_barrierEnergyLog:'Термодинамика',
    expert_d_barrierEnergyLog:'Предел FLOPs (log)',
    expert_p_barrierGeopoliticsRisk:'Геополитика',
    expert_d_barrierGeopoliticsRisk:'Шанс государственного шока после T2',
    expert_p_barrierNashFriction:'Конкуренция ИИ',
    expert_d_barrierNashFriction:'Координационная деградация после T3',
    expert_p_barrierDemandGrace:'Смысловой предел',
    expert_d_barrierDemandGrace:'Лет на адаптацию экономики к T2',
    // Observable Metrics
    obs_current:'Прогноз при текущих бенчмарках:',
    obs_swe:'SWE-bench',
    obs_arc:'ARC-AGI',
    obs_horizon:'Автономность',
    obs_cost:'Стоимость 1M токенов',
    // Footer
    footer_note:'Данные оценочные',
    // Loading
    loading:'Байесовское прогнозирование v4...',
    // Swarm
    swarm_title:'Визуализация обучения и прогноза',
    swarm_desc:'Интерактивная визуализация байесовского обучения. Режим «Обучение» показывает как наблюдения убивают слабые гипотезы. Режим «Прогноз» разворачивает выжившие гипотезы в предсказания T1-T4.',
    swarm_play:'Запуск', swarm_reset:'Сброс', swarm_hint:'Нажмите «Запуск» или перетаскивайте ползунок',
    swarm_mode_learn:'Обучение', swarm_mode_forecast:'Прогноз',
    swarm_play_forecast:'Анимация',
    forecast_xaxis:'Год T2', forecast_yaxis:'Удвоение HW (мес)',
    forecast_pt2:'P(T2 до 2068)', forecast_median_t2:'Медиана T2',
    forecast_xaxis_t4:'Год T4', forecast_median_t4:'Медиана T4',
    forecast_overlay:'T2 \u2264', forecast_overlay_desc:'Показаны гипотезы с T2 до',
    live_swarm_title:'Симуляция в реальном времени', live_swarm_desc:'Каждые 0.25 сек рой перерисовывается из нового прогона Monte Carlo.',
    // Event Horizon
    eh_p1:'Анимированная визуализация распределения T2/T4. Каждая частица = один MC прогон. Вылетает из центра (2026) и застывает на орбите своего года T2/T4.',
    eh_p2:'<b>Метафора:</b> плотные кольца = высокая вероятность (много частиц предсказывают AGI в этот год). Редкие точки = маловероятные сценарии.',
    eh_p3:'<b>Механика:</b> при запуске частицы «взлетают» из центра с задержкой, пропорциональной году T2/T4. Цвета орбит кодируют стадии. Расстояние от центра = вес частицы.',
    eh_p4:'<b>Что влияет:</b> распределение T2/T4 лет из posterior, случайность MC прогона. Симметричная сфера = один чёткий пик. Фрактальная структура = множество конкурирующих сценариев.',
    eh_p1_desc:'Анимированная визуализация распределения 4 этапов сингулярности. Каждая частица = один MC прогон. Вылетает из центра (2026) и застывает на орбите T1/T2/T3/T4.',
    eh_p2_desc:'<b>Метафора:</b> плотные кольца = высокая вероятность (много частиц предсказывают этап в этот год). Редкие точки = маловероятные сценарии.',
    eh_p3_desc:'<b>Механика:</b> при запуске частицы «взлетают» из центра с задержкой, пропорциональной году этапа. Жёлтые орбиты = T1, оранжевые = T2, красные = T3, фиолетовые = T4. Расстояние от центра = вес частицы.',
    eh_p4_desc:'<b>Что влияет:</b> распределение T1-T4 лет из posterior, случайность MC прогона. Симметричная сфера = один чёткий пик. Фрактальная структура = множество конкурирующих сценариев.',

    eh_play:'Запуск', eh_reset:'Сброс',
    eh_legend_t2:'достигнут', eh_legend_t4:'достигнут', eh_legend_flight:'в полёте',
    v3_variations_label:'(v4: Дисперсия в облаке частиц)',
    v3_no_agi:'Ни одна частица не достигла T2 к 2068 — модель считает AGI маловероятным при текущих параметрах.',
    // Canvas / overlay hardcoded strings (Swarm learn mode)
    swarm_canvas_median:'Медиана роя', canvas_hw_doubling:'Удвоение HW (мес)',
    canvas_agency_ceiling:'Потолок Agency', canvas_observation:'Наблюдение',
    swarm_canvas_legend_density:'Плотность роя', swarm_canvas_legend_obs:'Наблюдение',
    swarm_canvas_legend_median:'Медиана', canvas_particles:'частиц',
    // Swarm forecast overlay
    forecast_overlay_hypotheses:'Показаны гипотезы с', forecast_overlay_by:'до',
    legend_early:'< 2040', legend_mid:'2040-2055', legend_late:'> 2055',
    legend_not_reached:'Не достигнет',
    // Live swarm
    live_swarm_stats_median:'Медиана:', live_swarm_stats_range:'P10–P90:',
    live_swarm_stats_n:'N =',
    // Observable metrics warning
    v3_warning_far:'⚠️ Значения далеко от диапазона частиц — модель не может надёжно экстраполировать. Прогноз ближе к априорному.',
    // Data panel
    data_panel_year:'Год', data_panel_event:'Модель', data_panel_source:'Источники',
    data_panel_loading:'Данные загружаются...',
    // v3 params panel
    v3_params_title:'Параметры v4', v3_no_t4:'T4 не достигнут ни одной частицей к 2068',
  },
  en: {
    // Header
    hdr_title:'Singularity Forecaster', hdr_sub:'v4 — Four Stages of Dissolution',
    // Status bar
    sb_t1:'Median T1 (Understanding)', sb_t2:'Median T2 (Predictability)',
    sb_t3:'Median T3 (Control)', sb_t4:'Median T4 (Influence)',
    sb_pagi_2029:'P(T2 · 2029)', sb_pagi_2033:'P(T2 · 2033)', sb_pagi_2040:'P(T2 · 2040)',
    sb_pasi_2035:'P(T4 · 2035)', sb_pasi_2045:'P(T4 · 2045)',
    sb_hw:'HW Doubling', sb_algo:'Algo Doubling', sb_agency:'Agency Ceiling', sb_ess:'ESS',
    // Controls
    ctrl_simulations:'Simulations (N)', ctrl_obs_year:'Observation Year',
    ctrl_intelligence:'Intelligence', ctrl_agentic:'Agentic',
    ctrl_add:'Add', ctrl_reset:'Reset',
    ctrl_swe_bench:'SWE-bench (%)', ctrl_arc_agi:'ARC-AGI (%)',
    ctrl_horizon:'Autonomy (hours)', ctrl_cost:'Cost per 1M tokens ($)',
    run_btn:'Run Simulation',
    // Charts
    tag1:'Probabilistic Analysis', tag3:'Cumulative',
    tag5:'Sensitivity', tag6:'Scenarios', tag7:'Decomposition',
    chart1:'1. Four Stages of Singularity Distribution (Monte Carlo)',
    chart3:'2. Cumulative Probability (CDF)',
    chart5:'3. Sensitivity Heatmap (Intel × Agentic)',
    chart6:'4. Scenario Fan (Multi-Run Overlay)',
    chart7:'5. Component Decomposition (Stacked Area)',
    tip1:'Shows where 3000 Monte Carlo runs cluster. Higher bar = more scenarios led to T1/T2/T3/T4 in that year.',
    tip3:'P(T2 ≤ X) — chance that T2 appears no later than X years. Steep rise = fast transition from "almost no" to "almost certain".',
    tip5:'Heatmap: axes are Intelligence and Agentic scores of the last observation. Color = median T2 year. Shows which parameter dominates the forecast.',
    tip6:'30 random runs from the posterior distribution, overlaid semi-transparently. Shows the spread of possible paths to singularity.',
    tip7:'Breakdown of capability into components: Hardware scaling, Algorithmic progress, Paradigm shift bonus, RSI feedback. Shows what drives progress.',
    ch_t1:'T1: Understanding', ch_t2:'T2: Predictability', ch_t3:'T3: Control', ch_t4:'T4: Influence',
    ch1_xlabel:'Year', ch1_ylabel:'Runs',
    ch3_xlabel:'Year', ch3_ylabel:'P(%)', ch3_pt2:'P(T2)', ch3_pt4:'P(T4)',
    ch5_label:'Years to T4', ch5_colorbar:'Years to T4', ch5_xaxis:'Agentic score', ch5_yaxis:'Intelligence score', ch5_loading:'Computing matrix (async)...',
    ch7_ylabel:'Cumulative contribution (log FLOPs)',
    fY_suffix:' yrs', fY_gt:'> 40 yrs',
    // About
    about_title:'About v4 Model',
    about_intro:'The v4 model uses a Bayesian Particle Filter to calibrate predictions on real benchmark data (ARC-AGI, SWE-bench, Arena Elo). Each particle is a hypothesis about the future: hardware growth rate, algorithm progress, and agency ceiling. Observations update particle weights via likelihood, and unlikely hypotheses die during resampling. Expert Sandbox panel provides 30+ tunable parameters for real-time hypothesis testing.',
    defs_label:'Conceptual Contours of the Model',
    arch_tracker_title:'Bayesian Tracker',
    arch_tracker_desc:'1000 particles with tunable priors: hw_months, algo_months, agency_ceiling (mean/std via Expert Sandbox). Each AA observation updates weights via Gaussian likelihood. ESS resampling prevents degeneracy. Three World Models supported: Cascade, Hard Wall, Slow Takeoff.',
    arch_dims_title:'Two Dimensions of Intelligence',
    arch_dims_desc:'Reasoning (slope 0.35, ceiling configurable) and Agency (slope 0.25, ceiling — particle parameter). Capability = min(Reasoning, Agency). Both grow logistic from log(FLOPs) but hit ceilings. Epistemic uncertainty: each particle believes in its own "physics of the world".',
    arch_paradigm_title:'Paradigm Shift',
    arch_paradigm_desc:'Transition triggers when saturation > threshold (configurable) + compute overhang bonus. Diminishing returns: 1st shift ×3.0, 2nd ×2.5... World Models modify probability: Hard Wall suppresses shifts, Slow Takeoff gives massive first jump.',
    arch_rsi_title:'RSI — Recursive Self-Improvement',
    arch_rsi_desc:'Activates when reasoning >= 8.0 AND agency >= 8.0 (configurable). Base potential grows from (cap - threshold)^1.2, but limited by coordination friction: 1/(1 + friction * max(0, cap-10)). RSI multiplier scales the effect. Maximum 2.0.',
    arch_bottlenecks_title:'Bottlenecks',
    arch_bottlenecks_desc:'Economic wall: if Reasoning leads Agency > 2.0, investment drops exponentially. GPU bubble can burst when agency < 4. Alignment incident freezes scaling for 1.5 years. Physical HW growth limit (maxPhysicalHwGrowth) — even superintelligence doesn\'t build fabs instantly.',
    arch_mc_title:'Monte Carlo Forecast',
    arch_mc_desc:'3000 runs from the posterior distribution. Each run simulates 2023 to 2068 at monthly resolution. Result: distribution of years to T1, T2, T3, and T4. Thresholds are configurable via Expert Sandbox.',
    arch_expert_title:'Expert Sandbox',
    arch_expert_desc:'30+ tunable parameters: philosophical priors (agency mean/std), RSI thresholds, coordination friction, physical HW growth limit, compute overhang, World Models probabilities, benchmark autonomy weight. Transforms the model from a predictor into an epistemological simulator.',
    arch_shocks_title:'Shocks & Black Swans',
    arch_shocks_desc:'Shock types: Data Wall (data exhaustion, slows algorithms), Alignment Incident (regulatory freeze), GPU Bubble Burst (investment crash), AI Winter (reasoning-agency gap). Probabilities depend on current system state.',
    defs_intro:'The v4 model describes four control points of the technological singularity:',
    t1_def_title:'T1: Loss of Understanding',
    t1_def_score:'Threshold: configurable',
    t1_def_text1:'System more complex than human cognitive model. Usage becomes ritualistic. We trust interfaces but no longer understand the reasons behind decisions.',
    t1_def_text2:'Role in model: onset of understanding loss. Trigger for further stages.',
    t2_def_title:'T2: Loss of Predictability',
    t2_def_score:'Threshold: configurable',
    t2_def_text1:'System acts as coordinator. No one can assess the global consequences of actions. A sense of randomness emerges and human agency erodes.',
    t2_def_text2:'Role in model: trigger for RSI and geopolitical reaction. Impossible without sufficient Agency level.',
    t3_def_title:'T3: Loss of Control',
    t3_def_score:'Threshold: configurable',
    t3_def_text1:'System is autonomous and acts faster than the human cycle. Builds its own infrastructure. People, politicians, and states become a function of infrastructure.',
    t3_def_text2:'Intermediate stages: Metasystem → Autonomous infrastructure.',
    t4_def_title:'T4: Loss of Influence',
    t4_def_score:'Threshold: configurable',
    t4_def_text1:'Environment thinks for humans. Decision space is fully constructed from outside. System goals cease to be human. Civilizational phase transition.',
    t4_def_text2:'Intermediate stages: Post-human layer → Civilizational phase transition.',
    // Expert Sandbox
    expert_toggle:'Expert Settings',
    expert_cat1:'Architecture & Paradigms',
    expert_cat2:'Self-Improvement (RSI)',
    expert_cat3:'Economy & Risks',
    expert_cat4:'Epistemology (World Models)',
    expert_cat5:'Philosophical Priors',
    expert_p_ceilingReasoningBase:'Transformer Ceiling',
    expert_d_ceilingReasoningBase:'When current architecture hits a wall',
    expert_p_hypeGracePeriod:'Hype Grace Period (yrs)',
    expert_d_hypeGracePeriod:'Years market pours money into new paradigm',
    expert_p_saturationThreshold:'Saturation Threshold',
    expert_d_saturationThreshold:'How hard must we hit the ceiling to trigger paradigm shift',
    expert_p_overhangShiftMultiplier:'Compute Overhang',
    expert_d_overhangShiftMultiplier:'Effect of capital surplus on breakthrough probability',
    expert_p_baseShiftMultiplier:'Base Shift Multiplier',
    expert_d_baseShiftMultiplier:'Ceiling multiplier at first shift (1.1=illusion of progress, 10=quantum leap)',
    expert_p_paradigmDecayRate:'Diminishing Returns Rate',
    expert_d_paradigmDecayRate:'How much weaker each subsequent shift is (0=infinite singularity)',
    expert_p_minShiftMultiplier:'Min Shift Multiplier',
    expert_d_minShiftMultiplier:'Guaranteed minimum (ceiling never decreases)',
    expert_p_rsiMultiplier:'RSI Multiplier',
    expert_d_rsiMultiplier:'Multiplies all RSI coefficients (0 = no self-improvement)',
    expert_p_rsiTriggerReasoning:'RSI Threshold (Reasoning)',
    expert_d_rsiTriggerReasoning:'Reasoning required to start auto-improvement',
    expert_p_rsiTriggerAgency:'RSI Threshold (Agency)',
    expert_d_rsiTriggerAgency:'Agency required to start auto-improvement',
    expert_p_coordinationFriction:'Coordination Friction',
    expert_d_coordinationFriction:'Degradation when scaling agents (0 = perfect coordination)',
    expert_p_maxPhysicalHwGrowth:'Max HW Growth',
    expert_d_maxPhysicalHwGrowth:'Physical limit of hardware growth',
    expert_p_hwCoDesignBonus:'HW Co-design',
    expert_d_hwCoDesignBonus:'How much AGI accelerates Moore\'s Law',
    expert_p_bubbleBurstRisk:'GPU Bubble Risk',
    expert_d_bubbleBurstRisk:'Chance of investment crash if agency < 4',
    expert_p_alignmentCooldown:'Safety Incident (yrs)',
    expert_d_alignmentCooldown:'Regulatory freeze after incident',
    expert_p_maxCapitalMultiplier:'Capital Elasticity',
    expert_d_maxCapitalMultiplier:'Max investment multiplier at high utility',
    expert_p_priorAgencyMean:'Prior Agency Mean',
    expert_d_priorAgencyMean:'Baseline expectation of agency ceiling (=10 is AGI)',
    expert_p_priorAgencyStd:'Prior Agency StdDev',
    expert_d_priorAgencyStd:'Spread of beliefs about ceiling (higher = more optimistic particles)',
    expert_p_toolUseVsAutonomyWeight:'Autonomy Weight in SWE-bench',
    expert_d_toolUseVsAutonomyWeight:'0 = benchmark hackable by reasoning, 1 = only real autonomy',
    expert_world_cascade:'Cascade %',
    expert_world_hardWall:'Hard Wall %',
    expert_world_slowTakeoff:'Slow Takeoff %',
    expert_world_error:'Sum must be 100%',
    expert_world_desc:'Prior probabilities about structure of reality. Sum = 100%.',
    expert_reset:'Reset to Defaults',
    expert_apply:'Apply & Restart',
    // Category 7: Simulation Parameters
    expert_cat7:'Simulation & Benchmarks',
    expert_p_simulations:'Simulations (N)',
    expert_d_simulations:'Number of Monte Carlo runs (500-10000)',
    expert_p_arc_agi:'ARC-AGI (%)',
    expert_d_arc_agi:'Current ARC-AGI level for observations',
    expert_p_horizon:'Autonomy (hours)',
    expert_d_horizon:'Autonomy horizon for current benchmarks',
    // Block headers
    expert_blkA:'Paradigms & Ceilings',
    expert_blkA2:'Paradigm Shifts',
    expert_blkB:'Self-Improvement (RSI)',
    expert_blkB2:'Hardware',
    expert_blkC:'Crises & Penalties',
    expert_blkD:'Benchmarks & Observations',
    expert_blkD2:'Test-Time Compute',
    expert_blkD3:'Philosophical Priors',
    expert_blkD4:'World Models',
    expert_blkD5:'Simulation',
    expert_blkE:'Reality Barriers',
    // Deep params (kept for backward compat)
    expert_cat7new:'Deep Settings (TTC, Penalties, Noise)',
    expert_p_maxInferenceBonusReasoning:'Max TTC Bonus (Reasoning)',
    expert_d_maxInferenceBonusReasoning:'Maximum Test-Time Compute multiplier for reasoning',
    expert_p_maxInferenceBonusAgency:'Max TTC Bonus (Agency)',
    expert_d_maxInferenceBonusAgency:'Maximum Test-Time Compute multiplier for agency',
    expert_p_inferenceSaturationCap:'TTC Saturation Cap',
    expert_d_inferenceSaturationCap:'Base intelligence where CoT stops giving bonus',
    expert_p_reasoningScalingSlope:'Reasoning Slope',
    expert_d_reasoningScalingSlope:'Slope of FLOPs → Reasoning scaling curve',
    expert_p_agencyScalingSlope:'Agency Slope',
    expert_d_agencyScalingSlope:'Slope of FLOPs → Agency scaling curve',
    expert_p_dataWallPenalty:'Data Wall Penalty',
    expert_d_dataWallPenalty:'Algorithm speed multiplier when data is exhausted',
    expert_p_hypeGapThreshold:'Hype Gap Threshold (AI Winter)',
    expert_d_hypeGapThreshold:'Reasoning-agency gap to trigger AI Winter',
    expert_p_winterDamping:'AI Winter Damping',
    expert_d_winterDamping:'Investment and algorithm multiplier during AI Winter',
    expert_p_observationNoiseSigma:'Observation Noise (σ)',
    expert_d_observationNoiseSigma:'Trust level in benchmarks (lower = stricter filter)',
    expert_p_t1Threshold:'T1 Threshold',
    expert_d_t1Threshold:'Capability threshold for T1 (Understanding)',
    expert_p_t2Threshold:'T2 Threshold',
    expert_d_t2Threshold:'Capability threshold for T2 (Predictability)',
    expert_p_t3Threshold:'T3 Threshold',
    expert_d_t3Threshold:'Capability threshold for T3 (Control)',
    expert_p_t4Threshold:'T4 Threshold',
    expert_d_t4Threshold:'Capability threshold for T4 (Influence)',
    expert_p_barrierAtomsLimit:'Atoms Curse',
    expert_d_barrierAtomsLimit:'Max HW doublings per year',
    expert_p_barrierEnergyLog:'Thermodynamics',
    expert_d_barrierEnergyLog:'FLOPs limit (log)',
    expert_p_barrierGeopoliticsRisk:'Geopolitics',
    expert_d_barrierGeopoliticsRisk:'Government shock chance after T2',
    expert_p_barrierNashFriction:'AI Competition',
    expert_d_barrierNashFriction:'Coordination degradation after T3',
    expert_p_barrierDemandGrace:'Meaning Limit',
    expert_d_barrierDemandGrace:'Years for economy to adapt to T2',
    // Observable Metrics
    obs_current:'Forecast at current benchmarks:',
    obs_swe:'SWE-bench',
    obs_arc:'ARC-AGI',
    obs_horizon:'Autonomy',
    obs_cost:'Cost per 1M tokens',
    // Footer
    footer_note:'Data is estimated',
    // Loading
    loading:'Running Bayesian v4 forecast...',
    // Swarm
    swarm_title:'Learning & Forecast Visualization',
    swarm_desc:'Interactive visualization of Bayesian learning. "Learning" mode shows how observations kill weak hypotheses. "Forecast" mode unfolds surviving hypotheses into T1-T4 predictions.',
    swarm_play:'Play', swarm_reset:'Reset', swarm_hint:'Press Play or drag the slider',
    swarm_mode_learn:'Learning', swarm_mode_forecast:'Forecast',
    swarm_play_forecast:'Animate',
    forecast_xaxis:'T2 Year', forecast_yaxis:'HW Doubling (mo)',
    forecast_pt2:'P(T2 by 2068)', forecast_median_t2:'T2 Median',
    forecast_xaxis_t4:'T4 Year', forecast_median_t4:'T4 Median',
    forecast_overlay:'T2 \u2264', overlay_desc:'Showing hypotheses with T2 by',
    live_swarm_title:'Real-time Simulation', live_swarm_desc:'Every 0.25s the swarm redraws from a new Monte Carlo run.',
    // Event Horizon
    eh_title:'Visualization: "Sphere of Singularity"',
    eh_desc:'Each particle is one Monte Carlo run. Flies from center (2026) and freezes at its T1/T2/T3/T4 year orbit. Dense rings = high probability. Yellow orbits = T1, orange = T2, red = T3, purple = T4.',

    // Swarm Learning desc card
    swarm_learn_p1:'Interactive visualization of real-time Bayesian learning. Each point is a world hypothesis (particle): hardware growth rate <em>hw_months</em> and agency ceiling <em>agency_ceiling</em>.',
    swarm_learn_p2:'<b>"Learning" mode:</b> the slider applies AA observations one by one. At each observation, weights are recalculated:',
    swarm_learn_p3:'where R<sub>i</sub> and Ag<sub>i</sub> are particle i predictions for the observation year, &sigma; is the noise-free likelihood. Particles whose predictions are far from the observation lose weight exponentially.',
    swarm_learn_p4:'<b>"Forecast" mode:</b> all observations applied. The slider filters hypotheses by T2 year &mdash; showing which particles predict T2 by the selected year.',
    swarm_learn_p5:'<b>Visual language:</b> bright areas = high weight density; orange circle = swarm median; red = current observation. At rest the swarm &quot;breathes&quot; &mdash; rebuilds from a new MC run every 0.25s.',
    swarm_learn_p6:'<b>What affects it:</b> number and accuracy of AA observations, philosophical priors (priorAgencyMean/Std in Expert Sandbox), the particle composition itself.',
    // Live Swarm desc card
    live_swarm_p1:'Four parallel simulations &mdash; T1, T2, T3, T4 &mdash; updating every 0.25s from a new Monte Carlo run. Shows the &quot;live&quot; posterior without needing to press Play.',
    live_swarm_p2:'<b>Points:</b> each particle = one <code>runMonteCarloForecast(500)</code> run. Color encodes stage year: yellow = T1, orange = T2, red = T3, purple = T4. Opacity = particle weight.',
    live_swarm_p3:'<b>Formula:</b> for each of 500 runs, a trajectory is modeled from BASE_YEAR (2023) to 2068 at monthly resolution. T1 = first year where <code>cap &ge; 8.0</code>. T2 = <code>cap &ge; 10.0</code>. T3 = <code>cap &ge; 25.0</code>. T4 = <code>cap &ge; 100.0</code>.',
    live_swarm_p4:'Stats on the right: median, P10&ndash;P90, particle count. Updates in real time &mdash; you can see posterior variance.',
    live_swarm_p5:'<b>What affects it:</b> current observation set, particle weights, MC run randomness. Stable picture = model confidence. Chaos = high uncertainty.',
    // Histogram desc
    hist_p1:'Results of 3000 Monte Carlo runs from the posterior distribution. X-axis = year, Y-axis = number of runs where T1/T2/T3/T4 is reached in that year.',
    hist_p2:'<b>Key equation:</b> each run is sampled from particle weights (systematic resampling), then a full trajectory to 2068 is simulated:',
    hist_p3:'<b>Histogram peak</b> = most likely year. Wide distribution = high uncertainty. Bimodality = two competing scenarios (e.g., &quot;fast breakthrough&quot; vs &quot;stagnation&quot;).',
    hist_p4:'<b>What shifts the histogram:</b> new AA observations (via Bayesian weight update), Expert Sandbox parameters (RSI thresholds, paradigms, ceilings), particle count.',
    // Cumulative desc
    cum_p1:'Cumulative distribution function: P(T2 &le; X) and P(T4 &le; X). Answers the question &quot;what is the probability T2/T4 happens no later than year X?&quot;',
    cum_p2:'<b>Computed from</b> the same 3000 runs. For each year T:',
    cum_p3:'<b>Steep step</b> = forecasts concentrated in a narrow window. <b>Plateau</b> = bottleneck (data wall, energy, regulation). <b>Sharp jump</b> = nearly all particles converge on one scenario.',
    cum_p4:'<b>T4 curve</b> always lies to the right of T2 &mdash; T4 requires cap &ge; 100. Distance between curves = time between T2 and T4.',
    cum_p5:'<b>What affects it:</b> same factors as the histogram. The curves complement each other &mdash; histogram shows &quot;where is the peak&quot;, cumulative shows &quot;what is the probability by year X&quot;.',
    // Sensitivity desc
    sens_p1:'Sensitivity map: how the forecast depends on the last Intelligence &times; Agentic observation. Cell (i,j) = median T2 year if the last observation = (Intel=i, Agentic=j).',
    sens_p2:'<b>Computation:</b> for each (i,j) pair from grid [40,45,...,85] &times; [10,20,...,100], <code>runSensitivityMatrix()</code> is executed &mdash; takes the current tracker, clones particles, replaces the last observation with (i,j), runs MC.',
    sens_p3:'<b>Color interpretation:</b> blue = early T2 (model &quot;believes&quot; we&apos;re close); red = late T2 (far away). Gradients show which parameter dominates:',
    sens_li1:'Vertical gradient &rarr; Intelligence dominates',
    sens_li2:'Horizontal gradient &rarr; Agency dominates',
    sens_li3:'Diagonal &rarr; both parameters are equally important',
    sens_p4:'<b>What affects it:</b> current posterior (after all observations), model architecture (slope reasoning/agency, ceilings). See &mdash; a 1-point shift along which axis moves the forecast most.',
    // Fan desc
    fan_p1:'30 random runs from the posterior, overlaid semi-transparently. Shows the spread of possible capability paths from 2026 to 2050 (logarithmic scale).',
    fan_p2:'<b>Each run:</b> a random particle (by weights) is simulated to 2050 at monthly resolution. At each step: paradigm shift, RSI, economic bottlenecks.',
    fan_p3:'<b>Dense bundles</b> = scenarios converge. <b>Spread</b> = high uncertainty. <b>Horizontal lines cap=8, 10, 25, 100:</b> T1, T2, T3, T4 thresholds respectively.',
    fan_p4:'<b>What shapes the fan:</b><br>&bull; Width &larr; differences in hw_months, algo_months between particles<br>&bull; Slope &larr; FLOPs-scaling (hwK and algoK)<br>&bull; Bends &larr; paradigm shifts, RSI onset, economic walls',
    // Decomposition desc
    decomp_p1:'Stacked area: breakdown of total capability into 4 components. Shows <em>what</em> drives progress at each point in time.',
    decomp_p2:'<b>Components:</b>',
    decomp_p3:'Computed via <code>runDecomposition()</code> &mdash; averaging over all particles with weights. The transition from &quot;hardware&quot; to &quot;algorithms&quot; to &quot;RSI&quot; = the path to singularity.',
    // Event Horizon desc
    eh_p1:'Animated visualization of the T2/T4 distribution. Each particle = one MC run. Flies from the center (2026) and freezes on the orbit of its T2/T4 year.',
    eh_p2:'<b>Metaphor:</b> dense rings = high probability (many particles predict AGI in that year). Rare dots = unlikely scenarios.',
    eh_p3:'<b>Mechanics:</b> on launch, particles &quot;take off&quot; from the center with a delay proportional to their T2/T4 year. Orbit colors encode the stages. Distance from center = particle weight.',
    eh_p4:'<b>What affects it:</b> T2/T4 year distribution from posterior, MC run randomness. Symmetric sphere = one clear peak. Fractal structure = many competing scenarios.',
    eh_p1_desc:'Animated visualization of the 4 singularity stages distribution. Each particle = one MC run. Flies from center (2026) and freezes at its T1/T2/T3/T4 year orbit.',
    eh_p2_desc:'<b>Metaphor:</b> dense rings = high probability (many particles predict a stage in that year). Rare dots = unlikely scenarios.',
    eh_p3_desc:'<b>Mechanics:</b> on launch, particles &quot;take off&quot; from the center with a delay proportional to stage year. Yellow orbits = T1, orange = T2, red = T3, purple = T4. Distance from center = particle weight.',
    eh_p4_desc:'<b>What affects it:</b> T1-T4 year distribution from posterior, MC run randomness. Symmetric sphere = one clear peak. Fractal structure = many competing scenarios.',

    eh_play:'Play', eh_reset:'Reset',
    eh_legend_t2:'reached', eh_legend_t4:'reached', eh_legend_flight:'in flight',
    v3_variations_label:'(v4: Variance in particle cloud)',
    v3_no_agi:'No particle reached T2 by 2068 &mdash; the model considers AGI unlikely with the current parameters.',
    // Canvas / overlay hardcoded strings (Swarm learn mode)
    swarm_canvas_median:'Swarm Median', canvas_hw_doubling:'HW Doubling (mo)',
    canvas_agency_ceiling:'Agency Ceiling', canvas_observation:'Observation',
    swarm_canvas_legend_density:'Swarm Density', swarm_canvas_legend_obs:'Observation',
    swarm_canvas_legend_median:'Median', canvas_particles:'particles',
    // Swarm forecast overlay
    forecast_overlay_hypotheses:'Hypotheses with', forecast_overlay_by:'by',
    legend_early:'< 2040', legend_mid:'2040-2055', legend_late:'> 2055',
    legend_not_reached:'Not reached',
    // Live swarm
    live_swarm_stats_median:'Median:', live_swarm_stats_range:'P10–P90:',
    live_swarm_stats_n:'N =',
    // Observable metrics warning
    v3_warning_far:'Values far from particle range — model cannot reliably extrapolate. Forecast is closer to prior.',
    // v3 params panel
    v3_params_title:'v4 Parameters', v3_no_t4:'No T4 by 2068 in any particle',
    // Footer / misc
    footer_note_en:'Data is estimated',
  }
};

// ===== PARTICLE SWARM ANIMATION =====
// ===== PARTICLE SWARM v3 =====
let swarm = { mode:'learn', obsIdx:0, tracker:null, particles:[], weights:[], animating:false, rafId:null, agiYears:null, forecastSliderMax:0 };

// Pre-compute T2 and T4 years using the same MC forecast as the main charts
// Returns { t2Years: [{t2Year, hw, w}], t4Years: [{t4Year, hw, w}] }
// Note: runMonteCarloForecast returns years relative to CURRENT_YEAR
function swarmComputeAGIYears(tracker) {
  const mc = tracker.runMonteCarloForecast(500);
  const cfg = tracker.cfg;
  const curYear = cfg.CURRENT_YEAR;
  const cumw = new Float64Array(tracker.n);
  cumw[0] = tracker.weights[0];
  for (let i = 1; i < tracker.n; i++) cumw[i] = cumw[i-1] + tracker.weights[i];

  const agiResults = [], asiResults = [];
  for (let run = 0; run < mc.t2Years.length; run++) {
    const u = (run + 0.5) / mc.t2Years.length;
    let idx = 0;
    while (idx < tracker.n - 1 && cumw[idx] < u) idx++;
    const p = tracker.particles[idx];
    agiResults.push({ year: mc.t2Years[run] + curYear, hw: p.hw_months, w: 1.0 / mc.t2Years.length });
    asiResults.push({ year: mc.t4Years[run] + curYear, hw: p.hw_months, w: 1.0 / mc.t4Years.length });
  }
  return { t2: agiResults, t4: asiResults };
}

function swarmBuildTracker(idx) {
  const t = new BayesianTracker(1000);
  for (let i = 0; i < idx && i < REAL_BENCHMARK_HISTORY.length; i++) {
    t.observeRealData(REAL_BENCHMARK_HISTORY[i].year, REAL_BENCHMARK_HISTORY[i]);
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
  swarmStartLive();
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
      swarm.tracker = swarmBuildTracker(REAL_BENCHMARK_HISTORY.length);
    }
    swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months }));
    swarm.weights = Array.from(swarm.tracker.weights);
    swarm.agiYears = null;
    const mcData = swarmComputeAGIYears(swarm.tracker);
    swarm.t2Years = mcData.t2;
    if (slider) { slider.min = 2020; slider.max = 2068; slider.step = 1; slider.value = 2068; }
    swarm.forecastSliderMax = 2068;
    if (labels) labels.innerHTML = '<span>2020</span><span></span><span>2038</span><span></span><span>2048</span><span></span><span>2058</span><span>2068</span>';
    // Hide play button in forecast mode — static result only
    const playBtn = document.getElementById('swarmPlayBtn');
    if (playBtn) playBtn.style.display = 'none';
  } else {
    swarm.tracker = swarmBuildTracker(swarm.obsIdx);
    swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months }));
    swarm.weights = Array.from(swarm.tracker.weights);
    if (slider) { slider.min = 0; slider.max = REAL_BENCHMARK_HISTORY.length; slider.step = 1; slider.value = swarm.obsIdx; }
    if (labels) labels.innerHTML = '<span>2020</span><span></span><span>2024</span><span></span><span>2025</span><span></span><span>2026</span><span>2026.5</span>';
    // Show play button in learn mode
    const playBtn = document.getElementById('swarmPlayBtn');
    if (playBtn) playBtn.style.display = '';
  }
  swarmDraw();
}

function swarmSetTarget(target) {
  swarm.showT4 = (target === 't4');
  document.getElementById('swarmTargetT2').classList.toggle('active', target === 't2');
  document.getElementById('swarmTargetT4').classList.toggle('active', target === 't4');
  const slider = document.getElementById('swarmSlider');
  const labels = document.getElementById('swarmSliderLabels');
  if (swarm.showT4) {
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
  // Мы больше не рисуем "наблюдение" в виде точки, так как оси графика (HW и Agency Ceiling)
  // лежат в совершенно другом пространстве по сравнению с бенчмарками.
  ctx.fillStyle = '#58a6ff'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'left';
  const t = LANG[window._lang || 'ru'];
  ctx.fillText(t.swarm_canvas_median, pad + 4, pad + 12);
  ctx.fillStyle = '#666680'; ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.fillText(t.canvas_hw_doubling, w / 2, h - 8);
  ctx.save(); ctx.translate(12, h / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText(t.canvas_agency_ceiling, 0, 0); ctx.restore();
  ctx.fillStyle = '#ef4444'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'right';
  ctx.fillText(t.canvas_observation, w - pad - 4, pad + 12);
}

function swarmDrawForecast(ctx, w, h, pad, pw, ph) {
  const L = LANG[window._lang || 'ru'];
  if (!swarm.agiYears) {
    const mcData = swarmComputeAGIYears(swarm.tracker);
    swarm.t2Years = mcData.t2;
    swarm.t4Years = mcData.t4;
    swarm.agiYears = mcData.t2;
  }
  const years = swarm.showT4 ? swarm.t4Years : swarm.agiYears;
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
  const xLabel = L.forecast_xaxis || 'T2 Year';
  ctx.fillStyle = '#666680'; ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.fillText(xLabel, w / 2, h - 6);
  ctx.save(); ctx.translate(10, h / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText(L.forecast_yaxis || 'HW Doubling (mo)', 0, 0); ctx.restore();

  // stats
  const pct = totalW > 0 ? (visW / totalW * 100) : 0;
  const pLabel = L.forecast_pagi || 'P(T2)';
  const mLabel = L.forecast_median || 'Median T2';
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
  const L = LANG[window._lang || 'ru'];
  const ess = 1.0 / swarm.weights.reduce((a, b) => a + b * b, 0);
  ctx.fillStyle = '#666680'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'left';
  ctx.fillText(`ESS: ${ess.toFixed(0)} | ${L.canvas_particles}: ${swarm.particles.length}`, pad + 4, pad - 4);
  const slider = document.getElementById('swarmSlider');
  const ov = document.getElementById('swarmOverlay');
  const leg = document.getElementById('swarmLegend');
  const playBtn = document.getElementById('swarmPlayBtn');
  const hint = document.getElementById('swarmHint');

  if (swarm.mode === 'forecast') {
    // forecast mode: static result — no animation, no target toggle
    if (slider) { slider.style.display = ''; slider.value = swarm.forecastSliderMax || 2068; }
    if (playBtn) playBtn.style.display = 'none';
    if (hint) hint.style.display = 'none';
    if (ov) {
      const fc = swarm.forecastSliderMax || 2068;
      ov.innerHTML = `<div style="font-size:.75rem;color:#f0883e;font-weight:600">T2 ≤ ${fc}</div><div style="font-size:.68rem;color:#9898b0">${L.forecast_overlay_hypotheses} T2 ${L.forecast_overlay_by} ${fc}</div>`;
      ov.style.opacity = '1';
    }
    if (leg) {
      leg.innerHTML = `<span style="color:#58a6ff">●</span> AGI ${L.legend_early} &nbsp; <span style="color:#ffcc00">●</span> ${L.legend_mid} &nbsp; <span style="color:#ef4444">●</span> ${L.legend_late} &nbsp; <span style="color:#444">◌</span> ${L.legend_not_reached}`;
    }
  } else {
    // learn mode: slider shows observation index
    if (slider) { slider.style.display = ''; slider.value = swarm.obsIdx; }
    if (playBtn) playBtn.style.display = '';
    const targetToggleL = document.getElementById('swarmTargetToggle');
    if (targetToggleL) targetToggleL.style.display = 'none';
    if (hint) hint.style.display = '';
    // Show play button in learn mode
    const playBtnL = document.getElementById('swarmPlayBtn');
    if (playBtnL) playBtnL.style.display = '';
  if (swarm.obsIdx > 0 && swarm.obsIdx <= REAL_BENCHMARK_HISTORY.length) {
    const obs = REAL_BENCHMARK_HISTORY[swarm.obsIdx - 1];
    if (ov) { 
      ov.innerHTML = `<div style="font-size:.75rem;color:#f0883e;font-weight:600">${obs.year.toFixed(2)}</div>
      <div style="font-size:.68rem;color:#9898b0">${obs.event}</div>
      <div style="font-size:.65rem;color:#666680;margin-top:4px">ARC:${obs.arcAgi.toFixed(0)}% | SWE:${obs.sweBench.toFixed(1)}% | Elo:${obs.arenaElo.toFixed(0)}</div>`; 
      ov.style.opacity = '1'; 
    }
  } else { if (ov) ov.style.opacity = '0'; }
    if (leg) {
      leg.innerHTML = `<span style="color:#58a6ff">●</span> ${L.swarm_canvas_legend_density} &nbsp; <span style="color:#ef4444">●</span> ${L.swarm_canvas_legend_obs} &nbsp; <span style="color:#f0883e">●</span> ${L.swarm_canvas_legend_median}`;
    }
  }
}

function swarmPlay() {
  if (swarm.mode === 'forecast') {
    // Static mode — no animation, just redraw
    swarmDraw();
  } else {
    // Learn mode: animate observations
    if (swarm.animating) {
      swarm.animating = false;
      clearTimeout(swarm.rafId);
      document.getElementById('swarmPlayBtn').querySelector('span').textContent = LANG[window._lang||'ru'].swarm_play || 'Запуск';
      swarmStartLive();
      return;
    }
    if (swarm.obsIdx >= REAL_BENCHMARK_HISTORY.length) { swarm.obsIdx = 0; swarmInit(); }
    swarm.animating = true;
    swarmStopLive();
    document.getElementById('swarmPlayBtn').querySelector('span').textContent = '⏸';
    function step() {
      if (!swarm.animating || swarm.obsIdx >= REAL_BENCHMARK_HISTORY.length) {
        swarm.animating = false;
        document.getElementById('swarmPlayBtn').querySelector('span').textContent = LANG[window._lang||'ru'].swarm_play || 'Запуск';
        swarmStartLive();
        return;
      }
      swarm.obsIdx++;
      swarm.tracker = swarmBuildTracker(swarm.obsIdx);
      swarm.weights = Array.from(swarm.tracker.weights);
      swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months }));
      swarmDraw();
      swarm.rafId = setTimeout(step, 250);
    }
    step();
  }
}

function swarmReset() {
  swarm.animating = false; clearTimeout(swarm.rafId);
  swarm.forecastAnimating = false; clearTimeout(swarm.forecastRafId);
  // Restore play button visibility in learn mode
  const resetPlayBtn = document.getElementById('swarmPlayBtn');
  if (resetPlayBtn) resetPlayBtn.style.display = '';
  swarmStopLive();
  swarm.obsIdx = 0; swarmInit();
  document.getElementById('swarmPlayBtn').innerHTML = '<span>' + (LANG[window._lang||'ru'].swarm_play||'Запуск') + '</span>';
  const playFBtn = document.getElementById('swarmPlayForecastBtn');
  if (playFBtn) playFBtn.innerHTML = '<span>' + (LANG[window._lang||'ru'].swarm_play_forecast||'Анимация') + '</span>';
  document.getElementById('swarmOverlay').style.opacity = '0';
  swarmStartLive();
}

// Live background: re-draw every 250ms
// In learn mode, rebuild tracker from same obsIdx so particles "breathe" (new MC draw, no progress)
let _swarmLiveTimer = null;
function swarmStartLive() {
  swarmStopLive();
  _swarmLiveTimer = setInterval(() => {
    if (swarm.animating || swarm.forecastAnimating) return;
    if (swarm.mode === 'learn') {
      // Rebuild tracker with fresh MC particles at current obsIdx (no learning progress)
      swarm.tracker = swarmBuildTracker(swarm.obsIdx);
      swarm.weights = Array.from(swarm.tracker.weights);
      swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months }));
    }
    swarmDraw();
  }, 250);
}
function swarmStopLive() {
  if (_swarmLiveTimer) { clearInterval(_swarmLiveTimer); _swarmLiveTimer = null; }
}

// ===== LIVE SWARM: T1/T2/T3/T4 side by side =====
let liveSwarm = { tracker:null, timerT1:null, timerT2:null, timerT3:null, timerT4:null };

function liveSwarmInit() {
  // Init all 4 canvases
  ['liveSwarmT1','liveSwarmT2','liveSwarmT3','liveSwarmT4'].forEach(id => {
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
    liveSwarm.tracker = swarmBuildTracker(REAL_BENCHMARK_HISTORY.length);
  }
  liveSwarmTickAll();
}

function drawLiveSwarm(canvasId, statsId, yearsKey, colorKey, mc) {
  const c = document.getElementById(canvasId);
  if (!c || !liveSwarm.tracker) return;
  const ctx = c.getContext('2d');
  const w = c.offsetWidth, h = c.offsetHeight;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, w, h);

  const pad = 40, pw = w - pad * 2, ph = h - pad * 2;

  const xMin = 2020;
  const xMax = 2068;
  const yMin = 0, yMax = 16;

  function yearToX(yr) { return pad + ((yr - xMin) / (xMax - xMin)) * pw; }
  function hwToY(hw) { return h - pad - ((hw - yMin) / (yMax - yMin)) * ph; }

  // Use provided MC or skip
  if (!mc) return;
  const cfg = liveSwarm.tracker.cfg;
  const curYear = cfg.CURRENT_YEAR;
  const n = liveSwarm.tracker.n;
  const cumw = new Float64Array(n);
  cumw[0] = liveSwarm.tracker.weights[0];
  for (let i = 1; i < n; i++) cumw[i] = cumw[i-1] + liveSwarm.tracker.weights[i];

  const yearData = mc[yearsKey];
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

  // Color function per stage
  function particleColor(t) {
    if (colorKey === 'T1') { // yellow
      const r = Math.floor(234 - t * 80);
      const g = Math.floor(179 - t * 60);
      const b = Math.floor(88 - t * 40);
      return `rgba(${r},${g},${b},0.85)`;
    } else if (colorKey === 'T2') { // orange
      const r = Math.floor(249 - t * 60);
      const g = Math.floor(115 - t * 50);
      const b = Math.floor(22 + t * 10);
      return `rgba(${r},${g},${b},0.85)`;
    } else if (colorKey === 'T3') { // red
      const r = Math.floor(239 - t * 40);
      const g = Math.floor(100 - t * 60);
      const b = Math.floor(100 - t * 60);
      return `rgba(${r},${g},${b},0.85)`;
    } else { // T4 purple
      const r = Math.floor(139 - t * 40);
      const g = Math.floor(92 - t * 50);
      const b = Math.floor(246 - t * 40);
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
  const xLabel = LANG[lang].forecast_xaxis || 'Year';
  const yLabel = LANG[lang].forecast_yaxis || 'HW Doubling (mo)';
  ctx.fillStyle = '#555570'; ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.fillText(xLabel, w / 2, h - 4);
  ctx.save(); ctx.translate(9, h / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0); ctx.restore();

  // Stats: median, P10-P90
  pts.sort((a, b) => a.x - b.x);
  const half = totalW / 2;
  let cum = 0, median = xMax;
  for (const p of pts) { cum++; if (cum >= half) { median = p.x; break; } }
  const pct10 = pts[Math.min(pts.length - 1, Math.floor(totalW * 0.1))].x;
  const pct90 = pts[Math.min(pts.length - 1, Math.floor(totalW * 0.9))].x;

  const statsEl = document.getElementById(statsId);
  if (statsEl) {
    const mLabel = LANG[lang]['forecast_median_' + colorKey.toLowerCase()] || ('Median ' + colorKey);
    statsEl.innerHTML = `${mLabel}: <b>${median.toFixed(1)}</b><br>P10\u2013P90: ${pct10.toFixed(0)}\u2013${pct90.toFixed(0)}<br>N = ${totalW}`;
  }
}

function liveSwarmTickAll() {
  // Отменяем все предыдущие таймеры перед созданием новых
  ['T1','T2','T3','T4'].forEach(stage => {
    if (liveSwarm['timer' + stage]) {
      clearTimeout(liveSwarm['timer' + stage]);
      liveSwarm['timer' + stage] = null;
    }
  });

  const mc = liveSwarm.tracker ? liveSwarm.tracker.runMonteCarloForecast(500) : null;
  ['T1','T2','T3','T4'].forEach((stage) => {
    drawLiveSwarm('liveSwarm' + stage, 'liveSwarm' + stage + 'Stats',
      stage.toLowerCase() + 'Years', stage, mc);
  });
  // Один таймер для следующего вызова (не 4!)
  liveSwarm.timerT1 = setTimeout(liveSwarmTickAll, 250);
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
  stats: { t2: 0, t4: 0, total: 0 },
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
  const t1 = ehData.particles.filter(p => p.type === 't1').length;
  const t2 = ehData.particles.filter(p => p.type === 't2').length;
  const t3 = ehData.particles.filter(p => p.type === 't3').length;
  const t4 = ehData.particles.filter(p => p.type === 't4').length;
  const pending = n - t1 - t2 - t3 - t4;

  if (statsEl) {
    statsEl.textContent = `N=${n} | T1=${t1} T2=${t2} T3=${t3} T4=${t4} | ${pending > 0 ? 'flying +' + pending : ''}`;
  }

  if (legendEl) {
    const L = LANG[window._lang || 'ru'];
    legendEl.innerHTML = `
        <span style="color:#eab308">● T1</span> Понимание &nbsp; 
        <span style="color:#f97316">● T2</span> Предсказуемость &nbsp; 
        <span style="color:#ef4444">● T3</span> Контроль &nbsp; 
        <span style="color:#8b5cf6">● T4</span> Влияние`;
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
    const spawnRate = 2; // runs per frame
    for (let i = 0; i < spawnRate && ehData.launched < ehData.nTarget * 4 && ehData.spawnsLeft > 0; i++) {
      const pt = ehData.spawns[ehData.spawnIdx];
      ehData.spawnIdx++;
      ehData.spawnsLeft--;

      const stages = [
        { y: pt.t1, type: 't1', c: 'rgba(234,179,8,0.9)', gc: 'rgba(234,179,8,0.15)' },
        { y: pt.t2, type: 't2', c: 'rgba(249,115,22,0.9)', gc: 'rgba(249,115,22,0.15)' },
        { y: pt.t3, type: 't3', c: 'rgba(239,68,68,0.9)', gc: 'rgba(239,68,68,0.15)' },
        { y: pt.t4, type: 't4', c: 'rgba(139,92,246,0.9)', gc: 'rgba(139,92,246,0.15)' }
      ];

      for (const s of stages) {
        if (s.y !== Infinity) {
          ehData.particles.push({
            r: 0,
            angle: Math.random() * Math.PI * 2,
            speed: 8 + Math.random() * 12,
            targetYear: s.y,
            type: s.type,
            color: s.c,
            glowColor: s.gc,
            glow: 3 + Math.random() * 4,
          });
          ehData.launched++;
        }
      }
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
  for (let run = 0; run < mc.t1Years.length; run++) {
    const u = (run + 0.5) / mc.t1Years.length;
    let idx = 0;
    while (idx < n - 1 && cumw[idx] < u) idx++;
    const t1 = isFinite(mc.t1Years[run]) ? mc.t1Years[run] + curYear : Infinity;
    const t2 = isFinite(mc.t2Years[run]) ? mc.t2Years[run] + curYear : Infinity;
    const t3 = isFinite(mc.t3Years[run]) ? mc.t3Years[run] + curYear : Infinity;
    const t4 = isFinite(mc.t4Years[run]) ? mc.t4Years[run] + curYear : Infinity;
    ehData.spawns.push({ t1, t2, t3, t4, idx });
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

// ===== SINGLE LOAD HANDLER (ordered initialization) =====
window.addEventListener('load', async () => {
  setLang('ru');

  // Показываем оверлей загрузки
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.classList.add('show');
    document.getElementById('overlayText').textContent = 'Загрузка исторических бенчмарков...';
  }

  // БЛОКИРУЮЩИЙ ВЫЗОВ: загружаем реальные данные
  await loadHistoricalBenchmarks();

  // Инициализируем UI и канвасы
  swarmInit();
  ehInitCanvas();
  ehDraw();

  // Запускаем симуляцию (создаёт v3Tracker)
  const tracker = v3GetTracker();
  v3UpdateUI(tracker);
  renderDataPanel();

  // Live Swarm — используем тот же трекер
  if (typeof liveSwarm !== 'undefined') {
    liveSwarm.tracker = v3Tracker;
    liveSwarmInit();
  }

  if (overlay) overlay.classList.remove('show');
  runSimulation();
});

function setLang(lang) {
  window._lang = lang;
  document.getElementById('lang_ru')?.classList.toggle('active', lang === 'ru');
  document.getElementById('lang_en')?.classList.toggle('active', lang === 'en');
  const t = LANG[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.innerHTML = t[key];
  });
  // Re-draw canvases with new language
  if (typeof swarmDraw === 'function') swarmDraw();
  if (typeof ehDraw === 'function') ehDraw();
  if (typeof drawLiveSwarm === 'function') {
    if (typeof liveSwarm !== 'undefined') {
    if (liveSwarm.timerT1) clearTimeout(liveSwarm.timerT1);
    if (liveSwarm.timerT2) clearTimeout(liveSwarm.timerT2);
    if (liveSwarm.timerT3) clearTimeout(liveSwarm.timerT3);
    if (liveSwarm.timerT4) clearTimeout(liveSwarm.timerT4);
    liveSwarmTickAll();
    }
  }
}

// ===== EXPERT SANDBOX UI =====

function toggleExpertPanel() {
  const panel = document.getElementById('expertPanel');
  const arrow = document.getElementById('expertArrow');

  if (panel.classList.contains('collapsed')) {
    // Открыть
    panel.classList.remove('collapsed');
    arrow.classList.add('open');

    // Скролл к панели после того, как она раскроется
    requestAnimationFrame(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  } else {
    // Закрыть
    panel.classList.add('collapsed');
    arrow.classList.remove('open');
  }
}

function expertUpdate(key, value) {
  value = parseFloat(value);
  EXPERT_CONFIG[key] = value;
  if (typeof v3Tracker !== 'undefined' && v3Tracker && v3Tracker.cfg) {
    v3Tracker.cfg.EXPERT[key] = value;
  }
  const el = document.getElementById('ev-' + key);
  if (el) {
    el.textContent = (value % 1 === 0) ? value.toFixed(1) : value.toFixed(2);
  }
}

function expertWorldSlider() {
  const ids = ['e-world-cascade', 'e-world-hardWall', 'e-world-slowTakeoff'];
  const pctIds = ['ew-cascade', 'ew-hardWall', 'ew-slowTakeoff'];
  let vals = ids.map(id => Math.max(0, parseInt(document.getElementById(id).value) || 0));
  let sum = vals.reduce((a, b) => a + b, 0);

  // Нормализуем до 100% если сумма не нулевая
  if (sum > 0 && sum !== 100) {
    vals = vals.map(v => Math.round(v * 100 / sum));
    // Корректируем ошибку округления
    const diff = 100 - vals.reduce((a, b) => a + b, 0);
    if (diff !== 0) {
      // Добавляем разницу к наибольшему
      const maxIdx = vals.indexOf(Math.max(...vals));
      vals[maxIdx] += diff;
    }
    // Обновляем слайдеры
    ids.forEach((id, i) => { document.getElementById(id).value = vals[i]; });
  }

  // Обновляем метки
  vals.forEach((v, i) => {
    const el = document.getElementById(pctIds[i]);
    if (el) el.textContent = v + '%';
  });

  // Проверка ошибки
  const sumCheck = vals.reduce((a, b) => a + b, 0);
  const err = document.getElementById('expertWorldError');
  if (err) err.style.display = (sumCheck !== 100) ? '' : 'none';

  if (sumCheck === 100) {
    EXPERT_CONFIG.worldModels.cascade = vals[0] / 100;
    EXPERT_CONFIG.worldModels.hardWall = vals[1] / 100;
    EXPERT_CONFIG.worldModels.slowTakeoff = vals[2] / 100;
  }
}

function expertResetDefaults() {
  // 1. Reset to defaults from single source of truth
  Object.assign(EXPERT_CONFIG, JSON.parse(JSON.stringify(DEFAULT_EXPERT_CONFIG)));

  // 2. Dynamically update all inputs and labels from config
  for (const [key, val] of Object.entries(DEFAULT_EXPERT_CONFIG)) {
    const inputEl = document.getElementById('e-' + key);
    const valEl = document.getElementById('ev-' + key);
    if (inputEl) inputEl.value = val;
    if (valEl) {
      if (typeof val === 'number') {
        valEl.textContent = (val % 1 === 0) ? val.toFixed(1) : val.toFixed(2);
      } else {
        valEl.textContent = val;
      }
    }
  }

  // 3. World Models percentages (sum to 100%)
  const wmCascade = Math.round(DEFAULT_EXPERT_CONFIG.worldModels.cascade * 100) || 60;
  const wmHardWall = Math.round(DEFAULT_EXPERT_CONFIG.worldModels.hardWall * 100) || 25;
  const wmSlowTakeoff = Math.round(DEFAULT_EXPERT_CONFIG.worldModels.slowTakeoff * 100) || 15;
  if (document.getElementById('e-world-cascade')) {
    document.getElementById('e-world-cascade').value = wmCascade;
    document.getElementById('e-world-hardWall').value = wmHardWall;
    document.getElementById('e-world-slowTakeoff').value = wmSlowTakeoff;
    document.getElementById('ew-cascade').textContent = wmCascade + '%';
    document.getElementById('ew-hardWall').textContent = wmHardWall + '%';
    document.getElementById('ew-slowTakeoff').textContent = wmSlowTakeoff + '%';
  }
  const err = document.getElementById('expertWorldError');
  if (err) err.style.display = 'none';

  // 4. Reset simulation UI inputs (outside EXPERT_CONFIG)
  const simIds = ['rN', 'v3ARC', 'v3Horizon'];
  const simDefs = [3000, 52, 18.3];
  simIds.forEach((id, i) => {
    const inputExpert = document.getElementById('e-' + id);
    const inputMain = document.getElementById(id);
    const valLabel = document.getElementById('ev-' + id);
    if (inputExpert) inputExpert.value = simDefs[i];
    if (inputMain) inputMain.value = simDefs[i];
    if (valLabel) valLabel.textContent = simDefs[i];
  });
}

function expertApplyAndRun() {
  // Синхронизируем EXPERT_CONFIG с текущими значениями UI (включая world models)
  expertWorldSlider();
  // Сбрасываем трекер и перезапускаем
  v3ResetTracker();
  setTimeout(runSimulation, 100);
}


function v3QuickWarning() {
  v3HasUserInput = true;
  const tracker = v3Tracker || v3GetTracker();
  v3CheckWarning(tracker);
  updateObsMetrics();
}

function renderDataPanel() {
  const panel = document.getElementById('dataPanelContent');
  if (!panel) return;
  const L = LANG[window._lang || 'ru'];
  const history = REAL_BENCHMARK_HISTORY;
  if (!history || history.length === 0) {
    panel.innerHTML = '<div style="color:#666680;padding:8px;font-size:.75rem;">' + (L.data_panel_loading || 'Данные загружаются...') + '</div>';
    return;
  }
  const rows = history.map(d => {
    const flops = d.trainingFlopsLog ? d.trainingFlopsLog.toFixed(2) : '—';
    return `<tr>
      <td style="color:#f0883e">${d.year.toFixed(2)}</td>
      <td>${d.event}</td>
      <td style="text-align:right">${d.arenaElo.toFixed(0)}</td>
      <td style="text-align:right">${d.arcAgi.toFixed(1)}%</td>
      <td style="text-align:right">${d.sweBench.toFixed(1)}%</td>
      <td style="text-align:right;color:#a78bfa">${flops}</td>
    </tr>`;
  }).join('');
  panel.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:.7rem;font-family:var(--mono)">
      <thead>
        <tr style="color:#666680;text-align:left;border-bottom:1px solid #1e1e2e">
          <th style="padding:4px 6px">${L.data_panel_year || 'Год'}</th>
          <th style="padding:4px 6px">${L.data_panel_event || 'Модель'}</th>
          <th style="padding:4px 6px;text-align:right">Elo</th>
          <th style="padding:4px 6px;text-align:right">ARC</th>
          <th style="padding:4px 6px;text-align:right">SWE</th>
          <th style="padding:4px 6px;text-align:right">log FLOPs</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:6px;color:#444;font-size:.65rem;font-family:sans-serif">
      ${L.data_panel_source || 'Источники'}: LMSYS, SWE-bench Official, ARC Prize, Epoch AI.
    </div>
  `;
  const countEl = document.getElementById('dataPanelCount');
  if (countEl) countEl.textContent = history.length;
}

function updateObsMetrics() {
  const arcVal = +document.getElementById('v3ARC').value || 0;
  const horizonVal = +document.getElementById('v3Horizon').value || 0;

  // Конвертируем бенчмарки → AA → model scale
  const aa = benchmarksToAA(arcVal, horizonVal);

  const _cfg = Object.assign({}, EXPERT_CONFIG, { _lang: window._lang || 'ru' });
  const m = mapToObservables(aa.r10, aa.a10, _cfg);
  const n = getNumericObservables(aa.r10, aa.a10, _cfg);

  const el = document.getElementById('obsMetrics');
  if (el) el.style.display = 'block';
  const e1 = document.getElementById('omSWE');
  const e2 = document.getElementById('omARC');
  const e3 = document.getElementById('omHorizon');
  const e4 = document.getElementById('omCost');
  if (e1) e1.textContent = n.sweBench.toFixed(1) + '%';
  if (e2) e2.textContent = n.arcAgi.toFixed(1) + '%';
  if (e3) e3.textContent = m.horizon;
  if (e4) e4.textContent = m.cost;
  renderDataPanel();
}
// DEPLOY: scroll-to-panel fix
// cache-bypass: no-spoiler deployed
// v2026.05.30c: fix expertApplyAndRun worldSlider
// v2026.05.30d: physics patches
// v2026.05.30e: year-fix, deep-copy, noise-sensitivity, cleanup
// v2026.05.30f: fix decomp RSI + paradigm algoLog reset

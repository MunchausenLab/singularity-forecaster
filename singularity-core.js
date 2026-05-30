
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
    const costPerM = Math.max(0.01, 10.0 * Math.exp(-0.3 * r10));

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
  // Категория 4: Эпистемология (World Models)
  worldModels: { cascade: 0.60, hardWall: 0.25, slowTakeoff: 0.15 },
  // Категория 5: Априорные допущения (Philosophical Priors)
  priorAgencyMean: 8.0,            // Априорное среднее agency_ceiling
  priorAgencyStd: 3.0,             // Априорный разброс
  // Категория 6: Бенчмарки
  toolUseVsAutonomyWeight: 0.6     // Вес agency в SWE-bench (0=только reasoning, 1=только agency)
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
    THRESHOLDS: { agi: 10.0, asi: 100.0 },
    DIMENSIONS: {
      reasoning: { slope: 0.35, ceiling: EXPERT_CONFIG.ceilingReasoningBase },
      agency:    { slope: 0.25 }, // Потолок определяет частица
    },
    EXPERT: EXPERT_CONFIG,
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

  // Paradigm shift state (deterministic — no shocks)
  let paradigmGeneration = 0;
  let lastShiftYear = cfg.BASE_YEAR;
  let algoKMult = 1.0;
  let ceilingR = cfg.DIMENSIONS.reasoning.ceiling;
  let ceilingA = particle.agency_ceiling;

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

    // RSI (deterministic)
    let rsi = 0;
    if (reasoning >= cfg.EXPERT.rsiTriggerReasoning && agency >= cfg.EXPERT.rsiTriggerAgency) {
      const _coordF = cfg.EXPERT.coordinationFriction;
      const friction = 1.0 / (1.0 + _coordF * Math.max(0, cap - 10.0));
      rsi = Math.min(2.0, 0.15 * Math.pow(Math.max(0, cap - cfg.EXPERT.rsiTriggerAgency), 1.2) * cfg.EXPERT.rsiMultiplier * friction);
    }

    flopsLog += hwK * damping * dt;
    algoLog += (algoK * algoKMult * damping + rsi) * dt;
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
    if (ess < this.n * 0.3) {
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
          world_model: p.world_model || 'cascade',
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

      let agiY = null, asiY = null;
      let plotIdx = 0;
      let isWinter = false;
      let dataExhaustionHit = false;
      let gpuBubbleBurst = false;
      let alignmentIncidentCooldown = 0;

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

                algoLog -= (0.4 + paradigmGeneration * 0.1);
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

        // Проверка на лопнувший пузырь (AI Winter)
        if (!isWinter && currentYear > 2026.5) {
          const hypeGap = reasoning - agency;
          if (hypeGap > 4.0 && Math.random() < 0.10 * dt) {
            isWinter = true;
          }
        }

        if (isWinter) {
          // Зима ИИ: инвестиции в железо падают, алгоритмы развиваются медленнее
          damping = 0.1;
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

        // Стадийный RSI: дискретные уровни с порогами reasoning + agency
        let rsi = 0;
        const _rsiM = this.cfg.EXPERT.rsiMultiplier;
        const _rsiTR = this.cfg.EXPERT.rsiTriggerReasoning;
        const _rsiTA = this.cfg.EXPERT.rsiTriggerAgency;
        const _coordF = this.cfg.EXPERT.coordinationFriction;

        // ИИ может начать оптимизировать себя только при высокой автономности
        if (reasoning >= _rsiTR && agency >= _rsiTA) {
          // Базовый RSI потенциал
          let baseRsi = 0.15 * Math.pow(Math.max(0, cap - _rsiTA), 1.2) * _rsiM;

          // Координационное трение (Закон Амдала / Брукса для AI-агентов)
          // Чем выше capability, тем сложнее агентам координироваться
          const friction = 1.0 / (1.0 + _coordF * Math.max(0, cap - 10.0));

          rsi += baseRsi * friction;
        }

        // Защита от бесконечности
        rsi = Math.min(rsi, 2.0);
        
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
        // Hardware co-design: продвинутый ИИ сам проектирует чипы
        let hardwareCoDesign = 1.0;
        if (reasoning >= 10.0 && agency >= 8.0) {
          hardwareCoDesign = this.cfg.EXPERT.hwCoDesignBonus;
        }
        let dynamicHwK = hwK * capitalMultiplier * hardwareCoDesign * damping;
        if (gpuBubbleBurst) dynamicHwK *= 0.2;

        // Физический предел роста железа (Material Cycle)
        dynamicHwK = Math.min(dynamicHwK, this.cfg.EXPERT.maxPhysicalHwGrowth);

        // Shock damping applied symmetrically to both hw and algo
        flopsLog += dynamicHwK * shockDamping * dt;

        // Algo progress: includes paradigm multiplier, data exhaustion, economic damping, and shock damping
        let currentAlgoK = algoK * algoKMultiplier * damping;
        if (dataExhaustionHit) currentAlgoK *= 0.5;
        algoLog += (currentAlgoK * (isWinter ? 0.4 : 1.0) * shockDamping + rsi) * dt;
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
      let algoK = Math.log(2) / Math.max(1.0, p.algo_months / 12.0);
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
    let flopsLog = cfg.BASE_LOG_FLOPS, algoLog = 0;
    let baseLog = flopsLog;
    const hwK = Math.log(2) / Math.max(1.0, avgHw / 12.0);
    const algoK = Math.log(2) / Math.max(1.0, avgAlgo / 12.0);
    let cR = cfg.DIMENSIONS.reasoning.ceiling;
    let cA = avgCeiling;

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
  // --- РАННЯЯ ЭПОХА (Пре-Агенты) ---
  { year: 2020.45, intel: 5.0,  agentic: 0.1,  event: "GPT-3 Release" },
  { year: 2022.90, intel: 7.0,  agentic: 0.5,  event: "ChatGPT (GPT-3.5)" },

  // --- ЭПОХА ИНСТРУМЕНТОВ (2023 — начало 2024) ---
  { year: 2023.25, intel: 14.0, agentic: 2.0,  event: "GPT-4 Release" },
  { year: 2023.85, intel: 15.0, agentic: 5.5,  event: "GPT-4 Turbo + Assistants API" },
  { year: 2024.20, intel: 18.0, agentic: 13.8, event: "Claude 3 Opus" },

  // --- ЭПОХА АГЕНТНОГО ПРОРЫВА (середина 2024 — 2025) ---
  { year: 2024.45, intel: 30.0, agentic: 31.4, event: "Claude 3.5 Sonnet" },
  { year: 2024.75, intel: 31.0, agentic: 36.0, event: "OpenAI o1-preview" },
  { year: 2025.20, intel: 35.0, agentic: 42.0, event: "Claude 3.7 Sonnet (reasoning)" },
  { year: 2025.30, intel: 37.0, agentic: 48.0, event: "Claude 4 Sonnet (reasoning)" },
  { year: 2025.80, intel: 48.0, agentic: 52.0, event: "Gemini 3 Pro" },

  // --- СОВРЕМЕННЫЙ ФРОНТИР (2026) ---
  { year: 2026.15, intel: 57.0, agentic: 61.0, event: "GPT-5.4 (Agentic Web)" },
  { year: 2026.30, intel: 65.0, agentic: 65.0, event: "Claude Mythos (Closed)" },
];

function v3GetTracker() {
  if (!v3Tracker) {
    v3Tracker = new BayesianTracker(1000);
    AA_FRONTIER_DATA.forEach(d => v3Tracker.observeAAData(d.year, d.intel, d.agentic, 1.5));
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
  const aa = benchmarksToAA(arcVal, horizonVal);
  const y = 2026.5;
  const i = aa.intel;
  const a = aa.agency;
  v3Observations = v3Observations.filter(o => o.year < y - 0.01);
  v3Observations.push({ year: y, intel: i, agentic: a });
  v3Tracker = new BayesianTracker(1000);
  AA_FRONTIER_DATA.forEach(d => v3Tracker.observeAAData(d.year, d.intel, d.agentic, 1.5));
  v3Observations.forEach(d => v3Tracker.observeAAData(d.year, d.intel, d.agentic, 2.0));
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

function v3CheckWarning(tracker) {
  const warnEl = document.getElementById('v3Warning');
  if (!warnEl) return;
  // Read from benchmark inputs (ARC-AGI + Horizon) and convert to AA scale
  const arcVal = +document.getElementById('v3ARC').value || 0;
  const horizonVal = +document.getElementById('v3Horizon').value || 0;
  const aa = benchmarksToAA(arcVal, horizonVal);
  const tR = aa.intel / 10.0, tA = aa.agency / 10.0;
  let minDist = Infinity;
  for (let i = 0; i < tracker.n; i += 10) { // Проверяем каждую 10-ю частицу
    if (tracker.weights[i] < 1e-5) continue; // Снижаем порог веса
    const pred = v3SimulateToYear(tracker.particles[i], tracker.cfg.CURRENT_YEAR, tracker.cfg);
    const dist = Math.sqrt((tR - pred.reasoning) ** 2 + (tA - pred.agency) ** 2);
    if (dist < minDist) minDist = dist;
  }
  if (minDist > 8.0) {
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
    const currentY = 2026.5;
    const currentI = aa.intel;
    const currentA = aa.agency;
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
        variations: { info: { label: LANG[window._lang||'ru'].v3_variations_label || '(v3: Дисперсия в облаке частиц)', agiMedian: percentile(finite, 50) } }
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

function setVal(id, txt, cls) { const el = document.getElementById(id); if (el) { el.innerHTML = txt; el.className = 'status-value ' + (cls||''); } }
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
    ctrl_swe_bench:'SWE-bench (%)', ctrl_arc_agi:'ARC-AGI (%)',
    ctrl_horizon:'Автономность (часов)', ctrl_cost:'Стоимость 1M токенов ($)',
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
    about_intro:'Модель v3 использует байесовский частичный фильтр (Bayesian Particle Filter) для калибровки прогноза на реальных данных Artificial Analysis. Каждая частица — это гипотеза о будущем: скорость роста hardware, алгоритмов и потолок агентности. Наблюдения AA обновляют веса частиц через правдоподобие, а маловероятные гипотезы отмирают при ресэмплинге. Панель Expert Sandbox позволяет настраивать 18+ параметров модели и проверять гипотезы о будущем в реальном времени.',
    defs_label:'Архитектура модели',
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
    arch_mc_desc:'3000 прогонов из апостериорного распределения. Каждый прогон — симуляция от 2023 до 2068 года с месячным шагом. Результат: распределение лет до AGI (cap >= 10) и ASI (cap >= 100).',
    arch_expert_title:'Expert Sandbox',
    arch_expert_desc:'18+ настраиваемых параметров: априорные допущения (agency mean/std), пороги RSI, координационное трение, физический предел hardware, compute overhang, вероятности World Models, вес autonomy в бенчмарках. Превращает модель из прогноза в эпистемологический симулятор.',
    arch_shocks_title:'Шоки и Black Swans',
    arch_shocks_desc:'Типы шоков: Data Wall (исчерпание данных), Alignment Incident (регуляторная заморозка), GPU Bubble Burst (обвал инвестиций), AI Winter (разрыв reasoning-agency). Вероятности зависят от текущего состояния системы.',
    defs_intro:'В модели v3 используются строгие операциональные определения на основе двухмерной шкалы (Reasoning, Agency). Шкала логарифмическая: GPT-4 (конец 2023) ~ 3.0 по Reasoning и ~0.2 по Agency, текущие модели середины 2026 ~ 6.5 по Reasoning и ~6.5 по Agency. AGI = 10.0, ASI = 100.0.',
    agi_def_title:'AGI — Artificial General Intelligence',
    agi_def_score:'min(Reasoning, Agency) = 10.0',
    agi_def_text1:'Автономный ИИ-исследователь уровня PhD. Демонстрирует истинное обобщение, способен к сложному планированию и надёжной работе (>99%). Может автономно проводить эксперименты, писать продакшен-код и находить ошибки в чужих статьях.',
    agi_def_text2:'Роль в модели: триггер для RSI и геополитической реакции. Без достаточного уровня Agency невозможен.',
    asi_def_title:'ASI — Artificial Superintelligence',
    asi_def_score:'min(Reasoning, Agency) = 100.0',
    asi_def_text1:'Фазовый переход. ИИ автономно сжимает десятилетия научного прогресса в месяцы. Разрыв между ASI и AGI сопоставим с разницей между академиком и первоклассником.',
    asi_def_text2:'Роль в модели: конец симуляции. За этой чертой прогнозы теряют смысл.',
    // Expert Sandbox
    expert_toggle:'Экспертные настройки',
    expert_cat1:'Архитектура и Парадигмы',
    expert_cat2:'Самоулучшение (RSI)',
    expert_cat3:'Экономика и Риски',
    expert_cat4:'Эпистемология (World Models)',
    expert_cat5:'Априорные допущения',
    expert_cat7:'Симуляции и Бенчмарки',
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
    expert_d_hwCoDesignBonus:'Насколько AGI ускоряет закон Мура',
    expert_p_bubbleBurstRisk:'Риск GPU-пузыря',
    expert_d_bubbleBurstRisk:'Шанс краха инвестиций если agency < 4',
    expert_p_alignmentCooldown:'Инцидент безопасности (лет)',
    expert_d_alignmentCooldown:'Заморозка регуляторами после инцидента',
    expert_p_maxCapitalMultiplier:'Эластичность капитала',
    expert_d_maxCapitalMultiplier:'Макс. множитель инвестиций при высокой полезности',
    expert_p_priorAgencyMean:'Априорное среднее Agency',
    expert_d_priorAgencyMean:'Базовое ожидание потолка агентности (=10 это AGI)',
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
    // Observable Metrics
    obs_current:'Прогноз при текущих бенчмарках:',
    obs_swe:'SWE-bench',
    obs_arc:'ARC-AGI',
    obs_horizon:'Автономность',
    obs_cost:'Стоимость 1M токенов',
    // Footer
    footer_note:'Данные оценочные',
    // Loading
    loading:'Байесовское прогнозирование v3...',
    // Swarm
    swarm_title:'Визуализация обучения и прогноза',
    swarm_desc:'Интерактивная визуализация байесовского обучения. Режим «Обучение» показывает как наблюдения убивают слабые гипотезы. Режим «Прогноз» разворачивает выжившие гипотезы в предсказания AGI/ASI.',
    swarm_play:'Запуск', swarm_reset:'Сброс', swarm_hint:'Нажмите «Запуск» или перетаскивайте ползунок',
    swarm_mode_learn:'Обучение', swarm_mode_forecast:'Прогноз',
    swarm_play_forecast:'Анимация',
    forecast_xaxis:'Год AGI', forecast_yaxis:'Удвоение HW (мес)',
    forecast_pagi:'P(AGI до 2068)', forecast_median:'Медиана AGI',
    forecast_xaxis_asi:'Год ASI', forecast_median_asi:'Медиана ASI',
    forecast_overlay:'AGI \u2264', forecast_overlay_desc:'Показаны гипотезы с AGI до',
    live_swarm_title:'Симуляция в реальном времени', live_swarm_desc:'Каждые 0.25 сек рой перерисовывается из нового прогона Monte Carlo.',
    swarm_play_forecast:'Анимация',
    // Event Horizon
    eh_title:'Визуализация: «Сфера Сингулярности»',
    eh_desc:'Каждая частица — один прогон Monte Carlo. Вылетает из центра (2026) и застывает на орбите своего года AGI. Плотные кольца = высокая вероятность. Оранжевые орбиты — AGI, красные — ASI.',

    // Swarm Learning desc card
    swarm_learn_p1:'Интерактивная визуализация байесовского обучения в реальном времени. Каждая точка — гипотеза о мире (частица): скорость роста железа <em>hw_months</em> и потолок агентности <em>agency_ceiling</em>.',
    swarm_learn_p2:'<b>Режим «Обучение» (Learn):</b> ползунок прикладывает наблюдения AA одно за другим. При каждом наблюдении пересчитываются веса:',
    swarm_learn_p3:'где R<sub>i</sub> и Ag<sub>i</sub> — предсказания частицы i на год наблюдения, σ — нешумящее правдоподобие. Частицы, чьи предсказания далеки от наблюдения, экспоненциально теряют вес.',
    swarm_learn_p4:'<b>Режим «Прогноз» (Forecast):</b> все наблюдения применены. Ползунок фильтрует гипотезы по году AGI — показывая, какие частицы предсказывают AGI до выбранного года.',
    swarm_learn_p5:'<b>Визуальный язык:</b> яркие области = высокая плотность весов; оранжевый круг = медиана роя; красный = текущее наблюдение. В режиме покой рой «дышит» — перестраивается из нового MC прогона каждые 0.25 сек.',
    swarm_learn_p6:'<b>Что влияет:</b> количество и точность наблюдений AA, априорные допущения (priorAgencyMean/Std в Expert Sandbox), сам состав частиц.',
    // Live Swarm desc card
    live_swarm_p1:'Две параллельные симуляции — AGI и ASI — обновляются каждые 0.25 сек из нового прогона Monte Carlo. Показывает «живой» posterior без необходимости нажимать «Запуск».',
    live_swarm_p2:'<b>Точки:</b> каждая частица = один прогон <code>runMonteCarloForecast(500)</code>. Цвет кодирует год AGI/ASI: голубой = ранний, жёлтый = средний, красный = поздний. Прозрачность = вес частицы.',
    live_swarm_p3:'<b>Формула AGI/ASI year:</b> для каждого из 500 прогонов моделируется траектория от BASE_YEAR (2023) до 2068 с месячным шагом. AGI = первый год, где <code>cap ≥ 10.0</code>. ASI = первый год, где <code>cap ≥ 100.0</code>.',
    live_swarm_p4:'Статистика справа: медиана, P10–P90, количество частиц. Обновляется в реальном времени — видна дисперсия posterior.',
    live_swarm_p5:'<b>Что влияет:</b> текущий набор наблюдений, веса частиц, случайность MC прогона. Стабильность картинки ← уверенность модели. Хаотичность ← высокая неопределённость.',
    // Histogram desc
    hist_p1:'Результат 3000 прогонов Monte Carlo из апостериорного распределения. По оси X — год, по Y — количество прогонов, в которых AGI/ASI достигнут в этот год.',
    hist_p2:'<b>Ключевое уравнение:</b> каждый прогон выбирается из весов частиц (systematic resampling), затем симулируется полная траектория до 2068:',
    hist_p3:'<b>Пик гистограммы</b> = наиболее вероятный год. Широкое распределение = высокая неопределённость. Бимодальность = два конкурирующих сценария (например, «быстрый прорыв» vs «стагнация»).',
    hist_p4:'<b>Что сдвигает гистограмму:</b> новые наблюдения AA (через байесовское обновление весов), параметры Expert Sandbox (пороги RSI, парадигмы, потолки), количество частиц.',
    // Cumulative desc
    cum_p1:'Накопленная функция распределения: P(AGI ≤ X) и P(ASI ≤ X). Отвечает на вопрос «какова вероятность, что AGI случится не позднее года X?»',
    cum_p2:'<b>Вычисление:</b> из тех же 3000 прогонов. Для каждого года T:',
    cum_p3:'<b>Ступенчатый подъём</b> = концентрация прогнозов в узком окне. <b>Плато</b> = затор (data wall, энергетика, регуляция). <b>Резкий скачок</b> = почти все частицы сходятся в одном сценарии.',
    cum_p4:'<b>ASI-кривая</b> всегда лежит правее AGI — ASI требует cap ≥ 100. Расстояние между кривыми = время между AGI и ASI.',
    cum_p5:'<b>Что влияет:</b> те же факторы, что и гистограмма. Кривые дополняют друг друга — гистограмма показывает «где пик», кумулятивная — «какова вероятность к году X».',
    // Sensitivity desc
    sens_p1:'Карта чувствительности: как прогноз зависит от последнего наблюдения Intelligence × Agentic. Ячейка (i,j) = медианный год AGI если последнее наблюдение = (Intel=i, Agentic=j).',
    sens_p2:'<b>Вычисление:</b> для каждой пары (i,j) из сетки [40,45,...,85] × [10,20,...,100] выполняется <code>runSensitivityMatrix()</code> — берётся текущий tracker, клонируются частицы, заменяется последнее наблюдение на (i,j), запускается MC.',
    sens_p3:'<b>Интерпретация цвета:</b> синий = ранний AGI (модель «верит» что мы близко); красный = поздний AGI (далеко). Градиенты показывают, какой параметр доминирует:',
    sens_li1:'Вертикальный градиент → доминирует Intelligence',
    sens_li2:'Горизонтальный градиент → доминирует Agency',
    sens_li3:'Диагональный → оба параметра равноценны',
    sens_p4:'<b>Что влияет:</b> текущий posterior (после всех наблюдений), архитектура модели (slope reasoning/agency, потолки). Смотрите — сдвиг на 1 пункт по какой оси сильнее всего сдвигает прогноз.',
    // Fan desc
    fan_p1:'30 случайных прогонов из posterior, наложенных полупрозрачно. Показывает разброс возможных путей capability от 2026 до 2050 года (логарифмическая шкала).',
    fan_p2:'<b>Каждый прогон:</b> случайная частица (по весам) симулируется до 2050 с месячным шагом. На каждом шаге: paradigm shift, RSI, экономические бутылочные горлышки.',
    fan_p3:'<b>Плотные пучки</b> = сценарии сходятся. <b>Разброс</b> = высокая неопределённость. <b>Горизонтальные линии cap=10 и cap=100:</b> пороги AGI и ASI соответственно.',
    fan_p4:'<b>Что формирует веер:</b><br>• Ширина ← различие в hw_months, algo_months между частицами<br>• Наклон ← FLOPs-scaling (hwK и algoK)<br>• Изгибы ← paradigm shifts, RSI onset, экономические стены',
    // Decomposition desc
    decomp_p1:'Stacked area: разбивка суммарной capability на 4 компоненты. Показывает <em>что</em> движет прогрессом в каждый момент времени.',
    decomp_p2:'<b>Компоненты:</b>',
    decomp_p3:'Вычисляется через <code>runDecomposition()</code> — усреднение по всем частицам с весами. Переход от «железа» к «алгоритмам» к «RSI» = путь к сингулярности.',
    // Event Horizon desc
    eh_p1_desc:'Анимированная визуализация распределения AGI/ASI. Каждая частица = один MC прогон. Вылетает из центра (2026) и застывает на орбите своего года AGI.',
    eh_p2_desc:'<b>Метафора:</b> плотные кольца = высокая вероятность (много частиц предсказывают AGI в этом году). Редкие точки = маловероятные сценарии.',
    eh_p3_desc:'<b>Механика:</b> при запуске частицы «взлетают» из центра с задержкой, пропорциональной году AGI. Оранжевые орбиты = AGI, красные = ASI. Расстояние от центр = вес частицы.',
    eh_p4_desc:'<b>Что влияет:</b> распределение AGI/ASI лет из posterior, случайность MC прогона. Симметричная сфера = один чёткий пик. Фрактальная структура = множество конкурирующих сценариев. P(AGI к 2068), медиана AGI — обновляется в реальном времени.',

    eh_play:'Запуск', eh_reset:'Сброс',
    eh_legend_agi:'достигнут', eh_legend_asi:'достигнут', eh_legend_flight:'в полёте',
    v3_variations_label:'(v3: Дисперсия в облаке частиц)',
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
    // v3 params panel
    v3_params_title:'Параметры v3', v3_no_agi:'AGI не достигнут ни одной частицей к 2068',
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
    ctrl_swe_bench:'SWE-bench (%)', ctrl_arc_agi:'ARC-AGI (%)',
    ctrl_horizon:'Autonomy (hours)', ctrl_cost:'Cost per 1M tokens ($)',
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
    about_intro:'The v3 model uses a Bayesian Particle Filter to calibrate predictions on real Artificial Analysis data. Each particle is a hypothesis about the future: hardware growth rate, algorithm progress, and agency ceiling. AA observations update particle weights via likelihood, and unlikely hypotheses die during resampling. Expert Sandbox panel provides 18+ tunable parameters for real-time hypothesis testing.',
    defs_label:'Model Architecture',
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
    arch_mc_desc:'3000 runs from the posterior distribution. Each run simulates 2023 to 2068 at monthly resolution. Result: distribution of years to AGI (cap >= 10) and ASI (cap >= 100).',
    arch_expert_title:'Expert Sandbox',
    arch_expert_desc:'18+ tunable parameters: philosophical priors (agency mean/std), RSI thresholds, coordination friction, physical HW growth limit, compute overhang, World Models probabilities, benchmark autonomy weight. Transforms the model from a predictor into an epistemological simulator.',
    arch_shocks_title:'Shocks & Black Swans',
    arch_shocks_desc:'Shock types: Data Wall (data exhaustion, slows algorithms), Alignment Incident (regulatory freeze), GPU Bubble Burst (investment crash), AI Winter (reasoning-agency gap). Probabilities depend on current system state.',
    defs_intro:'The v3 model uses strict operational definitions based on a two-dimensional scale (Reasoning, Agency). The scale is logarithmic: GPT-4 (late 2023) ~ 3.0 in Reasoning and ~0.2 in Agency, current mid-2026 models ~ 6.5 in Reasoning and ~6.5 in Agency. AGI = 10.0, ASI = 100.0.',
    agi_def_title:'AGI — Artificial General Intelligence',
    agi_def_score:'min(Reasoning, Agency) = 10.0',
    agi_def_text1:'Autonomous AI researcher at PhD level. Demonstrates true generalization, capable of complex planning and reliable work (>99%). Can autonomously conduct experiments, write production code, and find errors in others\' papers.',
    agi_def_text2:'Role in model: trigger for RSI and geopolitical reaction. Impossible without sufficient Agency level.',
    asi_def_title:'ASI — Artificial Superintelligence',
    asi_def_score:'min(Reasoning, Agency) = 100.0',
    asi_def_text1:'Phase transition. AI autonomously compresses decades of scientific progress into months. The gap between ASI and AGI is comparable to the difference between an academician and a first-grader.',
    asi_def_text2:'Role in model: end of simulation. Beyond this threshold, predictions lose meaning.',
    // Expert Sandbox
    expert_toggle:'Expert Settings',
    expert_cat1:'Architecture & Paradigms',
    expert_cat2:'Self-Improvement (RSI)',
    expert_cat3:'Economy & Risks',
    expert_cat4:'Epistemology (World Models)',
    expert_cat5:'Philosophical Priors',
    expert_cat7:'Simulation & Benchmarks',
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
    // Observable Metrics
    obs_current:'Forecast at current benchmarks:',
    obs_swe:'SWE-bench',
    obs_arc:'ARC-AGI',
    obs_horizon:'Autonomy',
    obs_cost:'Cost per 1M tokens',
    // Footer
    footer_note:'Data is estimated',
    // Loading
    loading:'Running Bayesian v3 forecast...',
    // Swarm
    swarm_title:'Learning & Forecast Visualization',
    swarm_desc:'Interactive visualization of Bayesian learning. "Learning" mode shows how observations kill weak hypotheses. "Forecast" mode unfolds surviving hypotheses into AGI/ASI predictions.',
    swarm_play:'Play', swarm_reset:'Reset', swarm_hint:'Press Play or drag the slider',
    swarm_mode_learn:'Learning', swarm_mode_forecast:'Forecast',
    swarm_play_forecast:'Animate',
    forecast_xaxis:'AGI Year', forecast_yaxis:'HW Doubling (mo)',
    forecast_pagi:'P(AGI by 2068)', forecast_median:'AGI Median',
    forecast_xaxis_asi:'ASI Year', forecast_median_asi:'ASI Median',
    forecast_overlay:'AGI \u2264', forecast_overlay_desc:'Showing hypotheses with AGI by',
    live_swarm_title:'Real-time Simulation', live_swarm_desc:'Every 0.25s the swarm redraws from a new Monte Carlo run.',
    // Event Horizon
    eh_title:'Visualization: "Sphere of Singularity"',
    eh_desc:'Each particle is one Monte Carlo run. Flies from center (2026) and freezes at its AGI year orbit. Dense rings = high probability. Orange orbits — AGI, red — ASI.',

    // Swarm Learning desc card
    swarm_learn_p1:'Interactive visualization of real-time Bayesian learning. Each point is a world hypothesis (particle): hardware growth rate <em>hw_months</em> and agency ceiling <em>agency_ceiling</em>.',
    swarm_learn_p2:'<b>"Learning" mode:</b> the slider applies AA observations one by one. At each observation, weights are recalculated:',
    swarm_learn_p3:'where R<sub>i</sub> and Ag<sub>i</sub> are particle i predictions for the observation year, &sigma; is the noise-free likelihood. Particles whose predictions are far from the observation lose weight exponentially.',
    swarm_learn_p4:'<b>"Forecast" mode:</b> all observations applied. The slider filters hypotheses by AGI year &mdash; showing which particles predict AGI by the selected year.',
    swarm_learn_p5:'<b>Visual language:</b> bright areas = high weight density; orange circle = swarm median; red = current observation. At rest the swarm &quot;breathes&quot; &mdash; rebuilds from a new MC run every 0.25s.',
    swarm_learn_p6:'<b>What affects it:</b> number and accuracy of AA observations, philosophical priors (priorAgencyMean/Std in Expert Sandbox), the particle composition itself.',
    // Live Swarm desc card
    live_swarm_p1:'Two parallel simulations &mdash; AGI and ASI &mdash; updating every 0.25s from a new Monte Carlo run. Shows the &quot;live&quot; posterior without needing to press Play.',
    live_swarm_p2:'<b>Points:</b> each particle = one <code>runMonteCarloForecast(500)</code> run. Color encodes AGI/ASI year: blue = early, yellow = mid, red = late. Opacity = particle weight.',
    live_swarm_p3:'<b>AGI/ASI year formula:</b> for each of 500 runs, a trajectory is modeled from BASE_YEAR (2023) to 2068 at monthly resolution. AGI = first year where <code>cap &ge; 10.0</code>. ASI = first year where <code>cap &ge; 100.0</code>.',
    live_swarm_p4:'Stats on the right: median, P10&ndash;P90, particle count. Updates in real time &mdash; you can see posterior variance.',
    live_swarm_p5:'<b>What affects it:</b> current observation set, particle weights, MC run randomness. Stable picture = model confidence. Chaos = high uncertainty.',
    // Histogram desc
    hist_p1:'Results of 3000 Monte Carlo runs from the posterior distribution. X-axis = year, Y-axis = number of runs where AGI/ASI is reached in that year.',
    hist_p2:'<b>Key equation:</b> each run is sampled from particle weights (systematic resampling), then a full trajectory to 2068 is simulated:',
    hist_p3:'<b>Histogram peak</b> = most likely year. Wide distribution = high uncertainty. Bimodality = two competing scenarios (e.g., &quot;fast breakthrough&quot; vs &quot;stagnation&quot;).',
    hist_p4:'<b>What shifts the histogram:</b> new AA observations (via Bayesian weight update), Expert Sandbox parameters (RSI thresholds, paradigms, ceilings), particle count.',
    // Cumulative desc
    cum_p1:'Cumulative distribution function: P(AGI &le; X) and P(ASI &le; X). Answers the question &quot;what is the probability AGI happens no later than year X?&quot;',
    cum_p2:'<b>Computed from</b> the same 3000 runs. For each year T:',
    cum_p3:'<b>Steep step</b> = forecasts concentrated in a narrow window. <b>Plateau</b> = bottleneck (data wall, energy, regulation). <b>Sharp jump</b> = nearly all particles converge on one scenario.',
    cum_p4:'<b>ASI curve</b> always lies to the right of AGI &mdash; ASI requires cap &ge; 100. Distance between curves = time between AGI and ASI.',
    cum_p5:'<b>What affects it:</b> same factors as the histogram. The curves complement each other &mdash; histogram shows &quot;where is the peak&quot;, cumulative shows &quot;what is the probability by year X&quot;.',
    // Sensitivity desc
    sens_p1:'Sensitivity map: how the forecast depends on the last Intelligence &times; Agentic observation. Cell (i,j) = median AGI year if the last observation = (Intel=i, Agentic=j).',
    sens_p2:'<b>Computation:</b> for each (i,j) pair from grid [40,45,...,85] &times; [10,20,...,100], <code>runSensitivityMatrix()</code> is executed &mdash; takes the current tracker, clones particles, replaces the last observation with (i,j), runs MC.',
    sens_p3:'<b>Color interpretation:</b> blue = early AGI (model &quot;believes&quot; we&apos;re close); red = late AGI (far away). Gradients show which parameter dominates:',
    sens_li1:'Vertical gradient &rarr; Intelligence dominates',
    sens_li2:'Horizontal gradient &rarr; Agency dominates',
    sens_li3:'Diagonal &rarr; both parameters are equally important',
    sens_p4:'<b>What affects it:</b> current posterior (after all observations), model architecture (slope reasoning/agency, ceilings). See &mdash; a 1-point shift along which axis moves the forecast most.',
    // Fan desc
    fan_p1:'30 random runs from the posterior, overlaid semi-transparently. Shows the spread of possible capability paths from 2026 to 2050 (logarithmic scale).',
    fan_p2:'<b>Each run:</b> a random particle (by weights) is simulated to 2050 at monthly resolution. At each step: paradigm shift, RSI, economic bottlenecks.',
    fan_p3:'<b>Dense bundles</b> = scenarios converge. <b>Spread</b> = high uncertainty. <b>Horizontal lines cap=10 and cap=100:</b> AGI and ASI thresholds respectively.',
    fan_p4:'<b>What shapes the fan:</b><br>&bull; Width &larr; differences in hw_months, algo_months between particles<br>&bull; Slope &larr; FLOPs-scaling (hwK and algoK)<br>&bull; Bends &larr; paradigm shifts, RSI onset, economic walls',
    // Decomposition desc
    decomp_p1:'Stacked area: breakdown of total capability into 4 components. Shows <em>what</em> drives progress at each point in time.',
    decomp_p2:'<b>Components:</b>',
    decomp_p3:'Computed via <code>runDecomposition()</code> &mdash; averaging over all particles with weights. The transition from &quot;hardware&quot; to &quot;algorithms&quot; to &quot;RSI&quot; = the path to singularity.',
    // Event Horizon desc
    eh_p1_desc:'Animated visualization of the AGI/ASI distribution. Each particle = one MC run. Flies from center (2026) and freezes at its AGI year orbit.',
    eh_p2_desc:'<b>Metaphor:</b> dense rings = high probability (many particles predict AGI in that year). Rare dots = unlikely scenarios.',
    eh_p3_desc:'<b>Mechanics:</b> on launch, particles &quot;take off&quot; from the center with a delay proportional to AGI year. Orange orbits = AGI, red = ASI. Distance from center = particle weight.',
    eh_p4_desc:'<b>What affects it:</b> AGI/ASI year distribution from posterior, MC run randomness. Symmetric sphere = one clear peak. Fractal structure = many competing scenarios. P(AGI by 2068), AGI median &mdash; updated in real time.',

    eh_play:'Play', eh_reset:'Reset',
    eh_legend_agi:'reached', eh_legend_asi:'reached', eh_legend_flight:'in flight',
    v3_variations_label:'(v3: Variance in particle cloud)',
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
    v3_params_title:'v3 Parameters', v3_no_agi:'No AGI by 2068 in any particle',
    // Footer / misc
    footer_note_en:'Data is estimated',
  }
};

// ===== PARTICLE SWARM ANIMATION =====
// ===== PARTICLE SWARM v3 =====
let swarm = { mode:'learn', obsIdx:0, tracker:null, particles:[], weights:[], animating:false, rafId:null, agiYears:null, forecastSliderMax:0 };

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
      swarm.tracker = swarmBuildTracker(AA_FRONTIER_DATA.length);
    }
    swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months }));
    swarm.weights = Array.from(swarm.tracker.weights);
    swarm.agiYears = null;
    const mcData = swarmComputeAGIYears(swarm.tracker);
    swarm.agiYears = mcData.agi;
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
    if (slider) { slider.min = 0; slider.max = AA_FRONTIER_DATA.length; slider.step = 1; slider.value = swarm.obsIdx; }
    if (labels) labels.innerHTML = '<span>2020</span><span></span><span>2024</span><span></span><span>2025</span><span></span><span>2026</span><span>2026.5</span>';
    // Show play button in learn mode
    const playBtn = document.getElementById('swarmPlayBtn');
    if (playBtn) playBtn.style.display = '';
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
    swarm.agiYears = mcData.agi;
    swarm.asiYears = mcData.asi;
  }
  const years = swarm.agiYears;
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
  const xLabel = L.forecast_xaxis || 'AGI Year';
  ctx.fillStyle = '#666680'; ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.fillText(xLabel, w / 2, h - 6);
  ctx.save(); ctx.translate(10, h / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText(L.forecast_yaxis || 'HW Doubling (mo)', 0, 0); ctx.restore();

  // stats
  const pct = totalW > 0 ? (visW / totalW * 100) : 0;
  const pLabel = L.forecast_pagi || 'P(AGI)';
  const mLabel = L.forecast_median || 'Median AGI';
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
      ov.innerHTML = `<div style="font-size:.75rem;color:#f0883e;font-weight:600">AGI ≤ ${fc}</div><div style="font-size:.68rem;color:#9898b0">${L.forecast_overlay_hypotheses} AGI ${L.forecast_overlay_by} ${fc}</div>`;
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
    if (swarm.obsIdx > 0 && swarm.obsIdx <= AA_FRONTIER_DATA.length) {
      const obs = AA_FRONTIER_DATA[swarm.obsIdx - 1];
      if (ov) { ov.innerHTML = `<div style="font-size:.75rem;color:#f0883e;font-weight:600">${obs.year.toFixed(2)}</div><div style="font-size:.68rem;color:#9898b0">${obs.event}</div><div style="font-size:.65rem;color:#666680;margin-top:4px">I=${obs.intel.toFixed(0)} A=${obs.agentic.toFixed(1)}</div>`; ov.style.opacity = '1'; }
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
    if (swarm.obsIdx >= AA_FRONTIER_DATA.length) { swarm.obsIdx = 0; swarmInit(); }
    swarm.animating = true;
    swarmStopLive();
    document.getElementById('swarmPlayBtn').querySelector('span').textContent = '⏸';
    function step() {
      if (!swarm.animating || swarm.obsIdx >= AA_FRONTIER_DATA.length) {
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
  const xLabel = isASI ? (LANG[lang].forecast_xaxis_asi || 'ASI Year') : (LANG[lang].forecast_xaxis || 'AGI Year');
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
  const pct10 = pts[Math.floor(totalW * 0.1)].x;
  const pct90 = pts[Math.floor(totalW * 0.9)].x;

  const statsEl = document.getElementById(statsId);
  if (statsEl) {
    const mLabel = isASI ? (LANG[lang].forecast_median_asi || 'ASI Median') : (LANG[lang].forecast_median || 'Median AGI');
    statsEl.innerHTML = `${mLabel}: <b>${median.toFixed(1)}</b><br>P10\u2013P90: ${pct10.toFixed(0)}\u2013${pct90.toFixed(0)}<br>N = ${totalW}`;
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
    const L = LANG[window._lang || 'ru'];
    legendEl.innerHTML = `<span style="color:#f0883e">● AGI</span> ${L.eh_legend_agi || 'достигнут'} &nbsp; <span style="color:#ef4444">● ASI</span> ${L.eh_legend_asi || 'достигнут'} &nbsp; <span style="color:#555570">● ${L.eh_legend_flight || 'в полёте'}</span>`;
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

// ===== SINGLE LOAD HANDLER (ordered initialization) =====
window.addEventListener('load', () => {
  // 1. Language first (so all UI text is correct)
  setLang('ru');
  // 2. Swarm canvases (need DOM ready)
  setTimeout(swarmInit, 100);
  setTimeout(liveSwarmInit, 300);
  // 3. Event horizon canvas
  setTimeout(ehInitCanvas, 200);
  setTimeout(ehDraw, 250);
  // 4. Main simulation (last, heaviest)
  setTimeout(() => {
    const tracker = v3GetTracker();
    v3UpdateUI(tracker);
  }, 50);
  // 5. Auto-run simulation after everything is ready
  setTimeout(runSimulation, 800);
});

function setLang(lang) {
  window._lang = lang;
  document.getElementById('lang_ru').classList.toggle('active', lang === 'ru');
  document.getElementById('lang_en').classList.toggle('active', lang === 'en');
  const t = LANG[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.innerHTML = t[key];
  });
  // Re-draw canvases with new language
  if (typeof swarmDraw === 'function') swarmDraw();
  if (typeof ehDraw === 'function') ehDraw();
  if (typeof drawLiveSwarm === 'function') {
    if (typeof liveSwarm !== 'undefined' && liveSwarm.timerAGI) { clearTimeout(liveSwarm.timerAGI); liveSwarmTickAGI(); }
    if (typeof liveSwarm !== 'undefined' && liveSwarm.timerASI) { clearTimeout(liveSwarm.timerASI); liveSwarmTickASI(); }
  }
}

// ===== EXPERT SANDBOX UI =====
let _expertPanelOpen = false;

function toggleExpertPanel() {
  _expertPanelOpen = !_expertPanelOpen;
  document.getElementById('expertPanel').classList.toggle('open', _expertPanelOpen);
  document.getElementById('expertArrow').classList.toggle('open', _expertPanelOpen);
}

function expertUpdate(key, value) {
  value = parseFloat(value);
  EXPERT_CONFIG[key] = value;
  if (typeof v3Tracker !== 'undefined' && v3Tracker && v3Tracker.cfg) {
    v3Tracker.cfg.EXPERT[key] = value;
  }
  const el = document.getElementById('ev-' + key);
  if (el) {
    el.textContent = (value % 1 === 0) ? value.toFixed(1) : value.toString();
  }
}

function expertWorldUpdate() {
  const c = parseInt(document.getElementById('e-world-cascade').value) || 0;
  const h = parseInt(document.getElementById('e-world-hardWall').value) || 0;
  const s = parseInt(document.getElementById('e-world-slowTakeoff').value) || 0;
  const sum = c + h + s;
  const err = document.getElementById('expertWorldError');
  if (err) err.style.display = (sum !== 100) ? '' : 'none';
  if (sum === 100) {
    EXPERT_CONFIG.worldModels.cascade = c / 100;
    EXPERT_CONFIG.worldModels.hardWall = h / 100;
    EXPERT_CONFIG.worldModels.slowTakeoff = s / 100;
  }
}

function expertResetDefaults() {
  // Reset to defaults from single source of truth
  Object.assign(EXPERT_CONFIG, JSON.parse(JSON.stringify(DEFAULT_EXPERT_CONFIG)));
  // Обновить все UI элементы
  const fields = [
    'ceilingReasoningBase', 'hypeGracePeriod', 'saturationThreshold', 'overhangShiftMultiplier',
    'baseShiftMultiplier', 'paradigmDecayRate', 'minShiftMultiplier',
    'rsiMultiplier', 'rsiTriggerReasoning', 'rsiTriggerAgency', 'hwCoDesignBonus',
    'coordinationFriction', 'maxPhysicalHwGrowth', 'bubbleBurstRisk',
    'alignmentCooldown', 'maxCapitalMultiplier',
    'priorAgencyMean', 'priorAgencyStd', 'toolUseVsAutonomyWeight'
  ];
  const formats = {
    ceilingReasoningBase: v => v.toFixed(1),
    hypeGracePeriod: v => v.toFixed(1),
    saturationThreshold: v => v.toFixed(2),
    overhangShiftMultiplier: v => v.toFixed(2),
    baseShiftMultiplier: v => v.toFixed(1),
    paradigmDecayRate: v => v.toFixed(1),
    minShiftMultiplier: v => v.toFixed(2),
    rsiMultiplier: v => v.toFixed(1),
    rsiTriggerReasoning: v => v.toFixed(1),
    rsiTriggerAgency: v => v.toFixed(1),
    hwCoDesignBonus: v => v.toFixed(1),
    coordinationFriction: v => v.toFixed(2),
    maxPhysicalHwGrowth: v => v.toFixed(1),
    bubbleBurstRisk: v => v.toFixed(2),
    alignmentCooldown: v => v.toFixed(1),
    maxCapitalMultiplier: v => v.toFixed(1),
    priorAgencyMean: v => v.toFixed(1),
    priorAgencyStd: v => v.toFixed(1),
    toolUseVsAutonomyWeight: v => v.toFixed(2)
  };
  for (const f of fields) {
    document.getElementById('e-' + f).value = DEFAULT_EXPERT_CONFIG[f];
    document.getElementById('ev-' + f).textContent = formats[f](DEFAULT_EXPERT_CONFIG[f]);
  }
  document.getElementById('e-world-cascade').value = 60;
  document.getElementById('e-world-hardWall').value = 25;
  document.getElementById('e-world-slowTakeoff').value = 15;
  document.getElementById('expertWorldError').style.display = 'none';
  // Reset simulation parameters
  document.getElementById('e-rN').value = 3000;
  document.getElementById('ev-rN').textContent = '3000';
  document.getElementById('rN').value = 3000;
  document.getElementById('e-v3ARC').value = 52;
  document.getElementById('ev-v3ARC').textContent = '52';
  document.getElementById('v3ARC').value = 52;
  document.getElementById('e-v3Horizon').value = 18.3;
  document.getElementById('ev-v3Horizon').textContent = '18.3';
  document.getElementById('v3Horizon').value = 18.3;
  document.getElementById('e-toolUseVsAutonomyWeight').value = 0.60;
  document.getElementById('ev-toolUseVsAutonomyWeight').textContent = '0.60';
}

function expertApplyAndRun() {
  // Синхронизируем EXPERT_CONFIG с текущими значениями UI (включая world models)
  expertWorldUpdate();
  // Сбрасываем трекер и перезапускаем
  v3ResetTracker();
  setTimeout(runSimulation, 100);
}


function v3QuickWarning() {
  const tracker = v3Tracker || v3GetTracker();
  v3CheckWarning(tracker);
  updateObsMetrics();
}

function updateObsMetrics() {
  const arcVal = +document.getElementById('v3ARC').value || 0;
  const horizonVal = +document.getElementById('v3Horizon').value || 0;

  // Конвертируем бенчмарки → AA → model scale
  const aa = benchmarksToAA(arcVal, horizonVal);

  const _cfg = Object.assign({}, EXPERT_CONFIG, { _lang: window._lang || 'ru' });
  const m = mapToObservables(aa.r10, aa.a10, _cfg);

  const el = document.getElementById('obsMetrics');
  if (el) el.style.display = 'block';
  const e1 = document.getElementById('omSWE');
  const e2 = document.getElementById('omARC');
  const e3 = document.getElementById('omHorizon');
  const e4 = document.getElementById('omCost');
  if (e1) e1.textContent = m.sweBench;
  if (e2) e2.textContent = m.arcAgi;
  if (e3) e3.textContent = m.horizon;
  if (e4) e4.textContent = m.cost;
}

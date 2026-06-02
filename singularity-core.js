
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function sigmoid(x) { return 1.0 / (1.0 + Math.exp(-Math.max(-30, Math.min(30, x)))); }
function randnRange(mean, std) { const u1 = Math.random() || Number.EPSILON, u2 = Math.random(); return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function percentile(arr, p) { if (!arr || arr.length === 0) return undefined; const sorted = arr.slice().sort((a, b) => a - b); const idx = clamp(Math.floor(p / 100 * (sorted.length - 1) + 0.5), 0, sorted.length - 1); return sorted[idx]; }
function cdf(list, x) { const c = list.filter(v => isFinite(v) && v <= x).length; return list.length ? (c / list.length) * 100 : 0; }

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
  // --- COMPUTE GOVERNANCE (пред-T2 моратории и регулирование) ---
  governanceMoratoriumProb: 0.04,  // [Compute Governance] Ожидаемая доля лет, потерянных на регуляторные паузы (0.04 = ~1 мораторий за 25 лет)
  governanceShockDamping: 0.5,     // [Compute Governance] Множитель HW-роста во время шока (0.5 = рост в 2 раза медленнее)
  // --- OBSERVATION NOISE MODE ---
  observationSigmaMode: 'global',  // 'global' = BENCHMARK_SIGMAS; 'perPoint' = локальные *_sigma из точек данных
  // --- PLATEAU SCENARIO (затяжной T1 без прогресса) ---
  plateauHardWallCeiling: 5.5,     // [Plateau] Потолок agency_ceiling для hard_wall (5.5 = остановка роста)
  // --- EMBODIMENT (4-я латентная ось: физическая воплощенность) ---
  embodimentPriorMean: 4.0,        // [Embodiment] Априорное среднее embodiment_ceiling (низкое: робототехника сложна)
  embodimentPriorStd: 2.0,         // [Embodiment] Априорный разброс
  embodimentScalingSlope: 0.20,    // [Embodiment] Наклон кривой FLOPs → Embodiment (медленнее reasoning/agency)
  embodimentBypassThreshold: 8.0,  // [Embodiment] При embodiment > порога ИИ строит свои дата-центры, обходя maxPhysicalHwGrowth
  embodimentT4Requirement: 6.0,    // [Embodiment] Минимальный embodiment для засчитывания T4 (без контроля атомов T4 невозможен)
  embodimentHWBonusMultiplier: 3.0,// [Embodiment] Множитель HW-роста при активации bypass
  realRoboticsWeight: 0.30,         // [Embodiment] Вес realEmbodimentIndex в likelihood (0=игнор, 1=строгое следование)

  // Категория 4: Эпистемология (World Models)
  worldModels: { cascade: 0.60, hardWall: 0.25, slowTakeoff: 0.15 },
  // Категория 5: Априорные допущения (Philosophical Priors)
  priorAgencyMean: 8.0,            // Априорное среднее agency_ceiling
  priorAgencyStd: 3.0,             // Априорный разброс
  // Категория 6: Бенчмарки
  toolUseVsAutonomyWeight: 0.6,    // Вес agency в SWE-bench (0=только reasoning, 1=только agency)
  // Категория 7: Углубленные настройки (Test-Time Compute, Штрафы, Шум)
  wmScalingSlope: 0.30,            // Наклон кривой FLOPs -> World Modeling (медленнее логики)
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
// 3. DATA & HISTORY (API & Fallbacks)
// ============================================================================

// DATA & OBSERVABLES (Dynamic Benchmark History)
// ============================================================================

// URL вашего JSON с актуальными бенчмарками (можно заменить на GitHub Raw или ваш API)
// ============================================================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ============================================================
let coreTracker = null;
let userObservations = [];
let simulationRunning = false;
let currentResults = null;

const BENCHMARKS_API_URL = 'https://raw.githubusercontent.com/slavabelik79/ai-metrics/main/benchmarks_history.json';

// Шум (дисперсия) для каждого бенчмарка. Отражает степень доверия к тесту.
const BENCHMARK_SIGMAS = {
  arenaElo: 40.0,    // Elo (LMSYS Chatbot Arena)
  arcAgi: 8.0,       // ARC-AGI (%)
  sweBench: 10.0,    // SWE-bench Verified (%)
  flopsLog: 0.5,     // log10(FLOPs)
  horizon: 0.5,      // log10(autonomous task hours)
  simToReal: 5.0,    // % роботизированных задач, решаемых в реальном мире
  moravec: 6.0,      // Балл Moravec (1-100, моторика+восприятие)
  autoAssembly: 0.5  // log10(часы автономной сборки фабрики)
};

let REAL_BENCHMARK_HISTORY = [];

// Фундаментальная база данных бенчмарков (Данные до 31 мая 2026 года)
// Источники: LMSYS Leaderboard, SWE-bench Official, ARC Prize Reports, Epoch AI.
const FALLBACK_BENCHMARK_HISTORY = [
  // --- РАННЯЯ ЭПОХА (Пре-Агенты) ---
  {
    year: 2022.90, event: "ChatGPT (GPT-3.5)",
    arenaElo: 1000, arcAgi: 3.0, sweBench: 0.0, trainingFlopsLog: 23.5, horizon: 0.5, simToReal: 0.0, moravec: 5.0, autoAssembly: 0.05,
    arenaElo_sigma: 30, arcAgi_sigma: 5, sweBench_sigma: 0.5, trainingFlopsLog_sigma: 0.3, horizon_sigma: 0.3, simToReal_sigma: 0.5, moravec_sigma: 2, autoAssembly_sigma: 0.2,
    notes: "LMSYS base Elo = 1000. Агентность нулевая."
  },
  {
    year: 2023.25, event: "GPT-4 Release",
    arenaElo: 1150, arcAgi: 12.0, sweBench: 0.1, trainingFlopsLog: 25.32, horizon: 1.0, simToReal: 0.0, moravec: 8.0, autoAssembly: 0.1,
    arenaElo_sigma: 30, arcAgi_sigma: 6, sweBench_sigma: 1, trainingFlopsLog_sigma: 0.2, horizon_sigma: 0.3, simToReal_sigma: 0.5, moravec_sigma: 2, autoAssembly_sigma: 0.2,
    notes: "Epoch AI: 2.1e25 FLOPs. Появление зачатков абстрактного рассуждения."
  },
  {
    year: 2023.85, event: "GPT-4 Turbo",
    arenaElo: 1250, arcAgi: 15.0, sweBench: 1.5, trainingFlopsLog: 25.4, horizon: 1.0, simToReal: 0.5, moravec: 10.0, autoAssembly: 0.1,
    arenaElo_sigma: 25, arcAgi_sigma: 6, sweBench_sigma: 2, trainingFlopsLog_sigma: 0.2, horizon_sigma: 0.3, simToReal_sigma: 1, moravec_sigma: 3, autoAssembly_sigma: 0.2,
    notes: "Слабый рост reasoning, улучшенное следование инструкциям."
  },

  // --- ЭПОХА ИНСТРУМЕНТОВ И TTC ---
  {
    year: 2024.20, event: "Claude 3 Opus",
    arenaElo: 1255, arcAgi: 20.0, sweBench: 4.0, trainingFlopsLog: 25.5, horizon: 1.5, simToReal: 1.0, moravec: 12.0, autoAssembly: 0.2,
    arenaElo_sigma: 25, arcAgi_sigma: 7, sweBench_sigma: 3, trainingFlopsLog_sigma: 0.2, horizon_sigma: 0.3, simToReal_sigma: 1, moravec_sigma: 3, autoAssembly_sigma: 0.2,
    notes: "Первое серьезное покушение на лидерство OpenAI в Arena."
  },
  {
    year: 2024.45, event: "Claude 3.5 Sonnet",
    arenaElo: 1270, arcAgi: 43.0, sweBench: 31.4, trainingFlopsLog: 25.55, horizon: 2.0, simToReal: 2.0, moravec: 15.0, autoAssembly: 0.3,
    arenaElo_sigma: 25, arcAgi_sigma: 8, sweBench_sigma: 5, trainingFlopsLog_sigma: 0.2, horizon_sigma: 0.4, simToReal_sigma: 1.5, moravec_sigma: 3, autoAssembly_sigma: 0.2,
    notes: "Шок на SWE-bench (31.4%). Метод Райана Гринблатта показал 43% на ARC-AGI через сэмплирование."
  },
  {
    year: 2024.75, event: "OpenAI o1-preview",
    arenaElo: 1320, arcAgi: 65.0, sweBench: 36.0, trainingFlopsLog: 25.8, horizon: 4.0, simToReal: 4.0, moravec: 18.0, autoAssembly: 0.5,
    arenaElo_sigma: 20, arcAgi_sigma: 6, sweBench_sigma: 5, trainingFlopsLog_sigma: 0.2, horizon_sigma: 0.4, simToReal_sigma: 2, moravec_sigma: 3, autoAssembly_sigma: 0.3,
    notes: "Первый масштабный Test-Time Compute. Резкий рост эффективности на сложных задачах."
  },
  {
    year: 2024.95, event: "OpenAI o3-preview",
    arenaElo: 1350, arcAgi: 87.5, sweBench: 45.0, trainingFlopsLog: 26.0, horizon: 8.0, simToReal: 6.0, moravec: 22.0, autoAssembly: 0.8,
    arenaElo_sigma: 20, arcAgi_sigma: 5, sweBench_sigma: 5, trainingFlopsLog_sigma: 0.2, horizon_sigma: 0.4, simToReal_sigma: 2, moravec_sigma: 4, autoAssembly_sigma: 0.3,
    notes: "Декабрь 2024. ARC-AGI (High Compute) достигает 87.5%, демонстрируя силу RLHF в reasoning."
  },

  // --- МАССОВОЕ МАСШТАБИРОВАНИЕ 2025 ---
  {
    year: 2025.15, event: "GPT-4.5 Preview",
    arenaElo: 1439, arcAgi: 70.0, sweBench: 56.0, trainingFlopsLog: 26.2, horizon: 4.0, simToReal: 8.0, moravec: 25.0, autoAssembly: 1.0,
    arenaElo_sigma: 20, arcAgi_sigma: 5, sweBench_sigma: 4, trainingFlopsLog_sigma: 0.2, horizon_sigma: 0.4, simToReal_sigma: 2, moravec_sigma: 4, autoAssembly_sigma: 0.3,
    notes: "Смещение фокуса на базовую надежность моделей (без тяжелого CoT)."
  },
  {
    year: 2025.30, event: "o3-2025-04-16",
    arenaElo: 1444, arcAgi: 89.0, sweBench: 62.0, trainingFlopsLog: 26.3, horizon: 12.0, simToReal: 10.0, moravec: 28.0, autoAssembly: 1.3,
    arenaElo_sigma: 20, arcAgi_sigma: 5, sweBench_sigma: 4, trainingFlopsLog_sigma: 0.2, horizon_sigma: 0.4, simToReal_sigma: 2, moravec_sigma: 4, autoAssembly_sigma: 0.3,
    notes: "Промежуточный релиз. Улучшенная агентность в средах программирования."
  },
  {
    year: 2025.65, event: "Gemini 2.5 Pro",
    arenaElo: 1456, arcAgi: 82.0, sweBench: 65.0, trainingFlopsLog: 26.5, horizon: 24.0, simToReal: 14.0, moravec: 32.0, autoAssembly: 1.5,
    arenaElo_sigma: 20, arcAgi_sigma: 5, sweBench_sigma: 4, trainingFlopsLog_sigma: 0.2, horizon_sigma: 0.4, simToReal_sigma: 3, moravec_sigma: 4, autoAssembly_sigma: 0.3,
    notes: "Август 2025. Топ-1 LMSYS на момент релиза. Преодолен барьер 1450 Elo."
  },
  {
    year: 2025.95, event: "GPT-5-2 Thinking",
    arenaElo: 1480, arcAgi: 78.7, sweBench: 72.0, trainingFlopsLog: 26.8, horizon: 48.0, simToReal: 18.0, moravec: 38.0, autoAssembly: 1.7,
    arenaElo_sigma: 20, arcAgi_sigma: 5, sweBench_sigma: 4, trainingFlopsLog_sigma: 0.2, horizon_sigma: 0.4, simToReal_sigma: 3, moravec_sigma: 5, autoAssembly_sigma: 0.3,
    notes: "Декабрь 2025. Базовая стоимость reasoning упала в 10 раз ($0.52 за задачу ARC)."
  },

  // --- СОВРЕМЕННЫЙ ФРОНТИР (Первая половина 2026) ---
  {
    year: 2026.15, event: "GPT-5.4 Web",
    arenaElo: 1484, arcAgi: 92.0, sweBench: 78.2, trainingFlopsLog: 26.9, horizon: 72.0, simToReal: 25.0, moravec: 44.0, autoAssembly: 1.8,
    arenaElo_sigma: 20, arcAgi_sigma: 5, sweBench_sigma: 4, trainingFlopsLog_sigma: 0.2, horizon_sigma: 0.4, simToReal_sigma: 4, moravec_sigma: 5, autoAssembly_sigma: 0.3,
    notes: "Массовое внедрение агентов браузинга."
  },
  {
    year: 2026.30, event: "Claude Opus 4.7",
    arenaElo: 1504, arcAgi: 94.0, sweBench: 82.0, trainingFlopsLog: 27.0, horizon: 120.0, simToReal: 35.0, moravec: 50.0, autoAssembly: 1.85,
    arenaElo_sigma: 20, arcAgi_sigma: 5, sweBench_sigma: 4, trainingFlopsLog_sigma: 0.2, horizon_sigma: 0.4, simToReal_sigma: 4, moravec_sigma: 5, autoAssembly_sigma: 0.3,
    notes: "Апрель 2026. Пробит барьер в 1500 Elo. Насыщение оригинального SWE-bench."
  },
  {
    year: 2026.40, event: "GPT-5.5 Pro",
    arenaElo: 1561, arcAgi: 96.5, sweBench: 82.6, trainingFlopsLog: 27.2, horizon: 168.0, simToReal: 50.0, moravec: 60.0, autoAssembly: 1.9,
    arenaElo_sigma: 20, arcAgi_sigma: 4, sweBench_sigma: 3, trainingFlopsLog_sigma: 0.2, horizon_sigma: 0.4, simToReal_sigma: 5, moravec_sigma: 5, autoAssembly_sigma: 0.3,
    notes: "Май 2026. Абсолютный SOTA. Эффективный предел текущих бенчмарков."
  }
];

async function loadHistoricalBenchmarks() {
  const FALLBACK = JSON.parse(JSON.stringify(FALLBACK_BENCHMARK_HISTORY));
  const TIMEOUT_MS = 3000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await fetch(BENCHMARKS_API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (data && data.length > 0) {
      REAL_BENCHMARK_HISTORY = data;
      console.log('Benchmarks loaded from API (' + data.length + ' points).');
      return;
    }
  } catch (e) {
    console.warn('[Benchmarks] fetch failed:', e.message, '→ using fallback');
  }
  REAL_BENCHMARK_HISTORY = FALLBACK;
  console.warn('Benchmarks: used fallback data.');
}

// ============================================================================
// REAL ROBOTICS INDEX (Embodiment grounding)
//
// Калибровка на основе публичных данных о серийных гуманоидах и quad-роботах.
// Каждая запись — (год, индекс 0..10, имя модели, capability-флаги).
// Индекс = максимум из {mobility, manipulation, autonomy, dexterity}, усреднённый
// с весом 0.4 / 0.3 / 0.2 / 0.1 (мобильность+манипуляция = "тело", autonomy = "мозг").
// Используется в observeRealData как prior на embodiment_ceiling.
// ============================================================================
const REAL_ROBOTICS_DATA = [
  { year: 2018.0, name: "Boston Dynamics Spot (proto)",     index: 1.5, mobility: 7, manipulation: 0, autonomy: 4, dexterity: 0 },
  { year: 2020.0, name: "Spot (commercial)",                 index: 2.5, mobility: 8, manipulation: 0, autonomy: 6, dexterity: 0 },
  { year: 2021.5, name: "Tesla Optimus Gen 1 (announce)",   index: 1.0, mobility: 3, manipulation: 2, autonomy: 2, dexterity: 2 },
  { year: 2022.5, name: "Optimus Bumblebee",                 index: 1.5, mobility: 3, manipulation: 3, autonomy: 2, dexterity: 3 },
  { year: 2023.5, name: "1X Neo Beta / Figure 01",           index: 2.5, mobility: 5, manipulation: 4, autonomy: 3, dexterity: 4 },
  { year: 2024.0, name: "Apptronik Apollo / Figure 02",     index: 3.5, mobility: 6, manipulation: 5, autonomy: 4, dexterity: 5 },
  { year: 2024.5, name: "Unitree H1 (commercial)",          index: 3.0, mobility: 7, manipulation: 3, autonomy: 3, dexterity: 4 },
  { year: 2025.0, name: "Optimus Gen 2 / Figure 02 prod",   index: 4.5, mobility: 7, manipulation: 6, autonomy: 5, dexterity: 6 },
  { year: 2025.5, name: "1X Neo Home (limited deploy)",     index: 5.0, mobility: 7, manipulation: 7, autonomy: 5, dexterity: 7 },
  { year: 2026.0, name: "Optimus Gen 3 / Figure 03 (forecast)", index: 6.0, mobility: 8, manipulation: 8, autonomy: 6, dexterity: 8 },
  { year: 2027.0, name: "Mass humanoid pilot (forecast)",  index: 7.0, mobility: 8, manipulation: 9, autonomy: 7, dexterity: 8 },
  { year: 2028.5, name: "Factory fleet (forecast)",         index: 8.0, mobility: 9, manipulation: 9, autonomy: 8, dexterity: 9 }
];

// ============================================================================
// 4. MAPPING (Latent Engine -> Observable Reality)
// ============================================================================

// Линейная интерполяция realEmbodimentIndex по году
function realEmbodimentIndexAt(year) {
  if (year <= REAL_ROBOTICS_DATA[0].year) return REAL_ROBOTICS_DATA[0].index;
  if (year >= REAL_ROBOTICS_DATA[REAL_ROBOTICS_DATA.length - 1].year) {
    return REAL_ROBOTICS_DATA[REAL_ROBOTICS_DATA.length - 1].index;
  }
  for (let i = 0; i < REAL_ROBOTICS_DATA.length - 1; i++) {
    const a = REAL_ROBOTICS_DATA[i], b = REAL_ROBOTICS_DATA[i + 1];
    if (year >= a.year && year <= b.year) {
      const t = (year - a.year) / (b.year - a.year);
      return a.index + t * (b.index - a.index);
    }
  }
  return 0;
}

// Преобразование латентных переменных трекера в численные бенчмарки
// r10, a10 — reasoning и agency в шкале модели (0..~15)
// Возвращает предсказанные значения бенчмарков + log10(FLOPs) для сопоставления с training compute
function getNumericObservables(r10, a10, e10, expertCfg) {
    const autonomyWeight = expertCfg ? expertCfg.toolUseVsAutonomyWeight : 0.6;
    const reasoningWeight = 1.0 - autonomyWeight;
    const blendedReasoning = r10 * reasoningWeight + a10 * autonomyWeight;
    const embodimentVal = (typeof e10 === 'number') ? e10 : 4.0; // fallback если не передано

    return {
        sweBench: 100 * sigmoid(0.55 * blendedReasoning - 2.5),
        arcAgi: 100 * sigmoid(0.6 * r10 - 4.0),
        arenaElo: 800 + 70 * r10,
        // Предсказанный log10(FLOPs): калибровка ~23.5 при r10≈0, растёт с reasoning
        // k ≈ 0.13: при r10=7 → ~25.5, при r10=10 → ~26.5, при r10=13 → ~27.5
        flopsLog: 23.5 + 0.3 * r10,
        // log10(autonomous task hours). Калибровка: a10=0 → 0.5h, a10=5 → 6h, a10=10 → 74h, a10=13 → 443h
        // (формула та же что в mapToObservables, но в log-шкале)
        horizon: Math.log10(Math.min(365 * 24, 0.5 * Math.exp(0.5 * a10))),
        // Sim-to-Real: % роботизированных задач. e=0 → 0%, e=5 → 12%, e=10 → 73%, e=13 → 95%
        simToReal: 100 * sigmoid(0.5 * embodimentVal - 2.5),
        // Moravec: 1-100, моторика+восприятие. e=0 → 0, e=5 → 8, e=10 → 50, e=13 → 88
        moravec: Math.max(0, Math.min(100, 2 + 7.5 * (embodimentVal - 0.5))),
        // Auto-Assembly: log10(часы сборки фабрики). e=0 → 0.1h, e=5 → 7.4h, e=10 → 550h, e=13 → 18000h
        autoAssembly: Math.log10(Math.max(0.1, 0.5 * Math.exp(0.7 * embodimentVal)))
    };
}

// ============================================================================
// 5. MATH & PHYSICS ENGINE (Bayesian Particle Filter)
// ============================================================================

const DEFAULT_PARTICLES = 1000;

function createConfig() {
  return {
    BASE_YEAR: 2023.0,          // Якорь (уровень GPT-4)
    BASE_LOG_FLOPS: 24.5,       // Начальные FLOPs в 2023
    CURRENT_YEAR: (() => { const d = new Date(); return d.getFullYear() + (d.getMonth() + (d.getDate() - 1) / 31) / 12; })(), // Динамический текущий год
    THRESHOLDS: { t1: EXPERT_CONFIG.t1Threshold, t2: EXPERT_CONFIG.t2Threshold, t3: EXPERT_CONFIG.t3Threshold, t4: EXPERT_CONFIG.t4Threshold },
    DIMENSIONS: {
      reasoning: { slope: EXPERT_CONFIG.reasoningScalingSlope, ceiling: EXPERT_CONFIG.ceilingReasoningBase },
      agency:    { slope: EXPERT_CONFIG.agencyScalingSlope }, // Потолок определяет частица
      worldModeling: { slope: EXPERT_CONFIG.wmScalingSlope },
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

function computeDim(logDiff, slope, ceiling) {
  // Исправлено: при logDiff->inf сигмоида дает 1.0, формула возвращает ceiling.
  // При logDiff=0 сигмоида дает 0.5, формула возвращает 1.0.
  return Math.max(1.0 + (ceiling - 1.0) * (sigmoid(slope * logDiff) - 0.5) * 2.0, 0.01);
}

function applyInference(rawCap, maxBonus, satCap) {
  if (maxBonus <= 1.0) return rawCap;
  const k = Math.LN2 / satCap;
  const bonus = (maxBonus - 1.0) * (1.0 - Math.exp(-k * rawCap));
  return rawCap * (1.0 + bonus);
}

function calculateRSI(S, C, expertCfg) {
  // 1. Активация на базе Науки и Координации
  const actS = sigmoid(1.2 * (S - (expertCfg.rsiTriggerReasoning - 2.0)));
  const actC = sigmoid(1.2 * (C - (expertCfg.rsiTriggerAgency - 2.0)));
  const rsiActivation = actS * actC;

  // 2. Базовый потенциал рекурсивного улучшения растёт от Науки (S)
  const baseRsi = 0.015 * Math.pow(Math.max(0, S), 1.5) * expertCfg.rsiMultiplier;

  // 3. Координационное трение встроено в ось C, здесь просто произведение
  return Math.min(2.0, baseRsi * rsiActivation);
}

function simulateToYear(particle, targetYear, cfg) {
  const dt = 1.0 / 12.0;
  const steps = Math.max(0, Math.floor((targetYear - cfg.BASE_YEAR) * 12));
  let flopsLog = cfg.BASE_LOG_FLOPS;
  let algoLog = 0; 
  const baseLog = flopsLog;
  
  const hwK = Math.log(2) / Math.max(1.0, particle.hw_months / 12.0);
  let algoK = Math.log(2) / Math.max(1.0, particle.algo_months / 12.0); // Теперь let!

  let ceilingR = cfg.DIMENSIONS.reasoning.ceiling;
  let ceilingA = particle.agency_ceiling;
  let ceilingE = particle.embodiment_ceiling || cfg.EXPERT.embodimentPriorMean;

  // ИСПРАВЛЕНО: Применяем априорные World Models до симуляции
  if (particle.world_model === 'hard_wall') {
    ceilingA = Math.min(ceilingA, cfg.EXPERT.plateauHardWallCeiling);
    // hard_wall также ограничивает embodiment: роботы на фабриках не масштабируются
    ceilingE = Math.min(ceilingE, 4.0);
  } else if (particle.world_model === 'slow_takeoff') {
    algoK *= 0.6;
    // slow_takeoff: embodiment растёт ещё медленнее
  }

  // Paradigm shift state (deterministic — no shocks)
  let paradigmGeneration = 0;
  let lastShiftYear = cfg.BASE_YEAR;
  let algoKMult = 1.0;
  let stateIntervention = false;
  let interventionCooldown = 0;

  // PATCH 1 & 3: Independent states and robotics frontier limit
  let stateR = 0, stateA = 0, stateW = 0, stateE = 0;
  let roboticsFrontier = ceilingE;

  for (let step = 0; step < steps; step++) {
    const currentYear = cfg.BASE_YEAR + step * dt;

    // PATCH 1, 2, 3: Capabilities from independent states
    let rawR = computeDim(stateR, cfg.DIMENSIONS.reasoning.slope, ceilingR);
    let rawA = computeDim(stateA, cfg.DIMENSIONS.agency.slope, ceilingA);
    let rawE_ai = computeDim(stateE, cfg.EXPERT.embodimentScalingSlope, ceilingE);
    let rawWM = computeDim(stateW, cfg.DIMENSIONS.worldModeling.slope, ceilingR);

    const R = applyInference(rawR, cfg.INFERENCE_SCALING.max_bonus_reasoning, cfg.INFERENCE_SCALING.saturation_cap);
    const A = applyInference(rawA, cfg.INFERENCE_SCALING.max_bonus_agency, cfg.INFERENCE_SCALING.saturation_cap);
    const aiEmbodiment = applyInference(rawE_ai, cfg.INFERENCE_SCALING.max_bonus_agency * 0.5, cfg.INFERENCE_SCALING.saturation_cap);
    const E = Math.min(aiEmbodiment, roboticsFrontier); // Robotics Reality Layer
    const W = applyInference(rawWM, 1.2, cfg.INFERENCE_SCALING.saturation_cap);

    // Слой 2. Производные цивилизационные способности
    const C = Math.sqrt(A * W) * Math.max(0, 1.0 - cfg.EXPERT.coordinationFriction);
    const S = Math.pow(R, 0.4) * Math.pow(W, 0.4) * Math.pow(A, 0.2);
    const M = Math.sqrt(E * C);

    // Новые метрики Capability
    const softCap = Math.cbrt(R * A * W);
    const civCap = Math.pow(R * A * W * E * C * M, 1 / 6);
    const cap = softCap; // fallback для T1-T3 и барьеров

    // Deterministic paradigm shift: наука драйвит архитектуры
    const canShift = (paradigmGeneration === 0 && currentYear > 2026.5)
                   || (paradigmGeneration > 0 && currentYear > lastShiftYear + 4.0);
    if (canShift) {
      const saturation = S / ceilingR; // Наука упирается в текущий архитектурный потолок
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
        ceilingE *= shiftMult; // PATCH 4: Physical limit also shifts with paradigm
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
      const gap = R - A;
      if (gap > 2.0) damping *= Math.exp(-cfg.BOTTLENECKS.econ_damping * (gap - 2.0));
    }

    // --- COMPUTE GOVERNANCE (пред-T2 моратории, ожидаемое демпфирование) ---
    // Детерминированная аппроксимация: вместо случайных шоков используем среднее демпфирование.
    // Если governanceMoratoriumProb=0.04 и damping=0.5, ожидаемый множитель роста = 0.5*0.04 + 1.0*0.96 = 0.98.
    const govFactor = cfg.EXPERT.governanceMoratoriumProb * cfg.EXPERT.governanceShockDamping + (1.0 - cfg.EXPERT.governanceMoratoriumProb);
    damping *= govFactor;

    // --- EMBODIMENT BYPASS: при высоком embodiment ИИ строит свои дата-центры ---
    // Детерминированная аппроксимация: sigmoid активности bypass; умножаем HW-рост на бонус
    const bypassActivation = sigmoid(1.5 * (E - cfg.EXPERT.embodimentBypassThreshold));
    const hwBonus = 1.0 + bypassActivation * (cfg.EXPERT.embodimentHWBonusMultiplier - 1.0);

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
    if (stateIntervention) damping *= 0.1; // [PATCH Bug 5] Государственная заморозка замедляет прогресс на 90%

    // --- БАРЬЕР 4: Конкуренция ИИ (Эффект Черной Королевы после T3) ---
    let nashDamping = 1.0;
    if (cap >= cfg.THRESHOLDS.t3) {
      nashDamping = 1.0 / (1.0 + cfg.EXPERT.barrierNashFriction * (cap - cfg.THRESHOLDS.t3));
    }

    // --- БАРЬЕР 5: Смысловой предел (Шок спроса) ---
    let demandDamping = 1.0;
    if (cap >= cfg.THRESHOLDS.t2 && (currentYear - cfg.BASE_YEAR) < cfg.EXPERT.barrierDemandGrace) {
      demandDamping = 0.6;
    }

    // PATCH 8: RSI efficiency as independent internal parameter
    const rsi = calculateRSI(S, C, cfg.EXPERT) * (particle.rsi_efficiency || 1.0);

    // [NEW] Проклятие атомов: жёсткий потолок удвоений/год (лог-единицы)
    let hwDelta = hwK * damping * nashDamping * demandDamping * hwBonus;
    hwDelta = Math.min(hwDelta, cfg.EXPERT.barrierAtomsLimit * Math.LN2);
    if (flopsLog >= cfg.EXPERT.barrierEnergyLog) hwDelta = 0;
    let algoDelta = algoK * algoKMult * damping * nashDamping * demandDamping + rsi;

    // PATCH 1, 2, 3: Differential state integration with cross-dependencies
    const dCompute = (hwDelta + algoDelta) * dt;
    stateR += dCompute;
    stateW += 0.3 * dCompute + (0.4 * (W / ceilingR) + 0.3 * (R / ceilingR)) * Math.max(0, dCompute);
    stateA += 0.4 * dCompute + (0.3 * (R / ceilingR) + 0.3 * (W / ceilingR)) * Math.max(0, dCompute);
    stateE += 0.5 * dCompute + 0.2 * (A / ceilingA) * Math.max(0, dCompute);
    roboticsFrontier += (0.15 + 0.1 * (R > 7.0 ? 1 : 0)) * dt; // Real robotics linear growth

    flopsLog += hwDelta * dt;
    algoLog += algoDelta * dt;
  }

  let rawR = computeDim(stateR, cfg.DIMENSIONS.reasoning.slope, ceilingR);
  let rawA = computeDim(stateA, cfg.DIMENSIONS.agency.slope, ceilingA);
  let rawE_ai = computeDim(stateE, cfg.EXPERT.embodimentScalingSlope, ceilingE);
  let rawWM = computeDim(stateW, cfg.DIMENSIONS.worldModeling.slope, ceilingR);

  return {
    reasoning: applyInference(rawR, cfg.INFERENCE_SCALING.max_bonus_reasoning, cfg.INFERENCE_SCALING.saturation_cap),
    agency:    applyInference(rawA, cfg.INFERENCE_SCALING.max_bonus_agency, cfg.INFERENCE_SCALING.saturation_cap),
    embodiment: Math.min(applyInference(rawE_ai, cfg.INFERENCE_SCALING.max_bonus_agency * 0.5, cfg.INFERENCE_SCALING.saturation_cap), roboticsFrontier),
    worldModeling: applyInference(rawWM, 1.2, cfg.INFERENCE_SCALING.saturation_cap),
  };
}

class BayesianTracker {
  constructor(nParticles) {
    this.n = nParticles || DEFAULT_PARTICLES;
    this.cfg = createConfig();
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
        embodiment_ceiling: Math.max(1.5, randnRange(EXPERT_CONFIG.embodimentPriorMean, EXPERT_CONFIG.embodimentPriorStd)),
        world_model: worldModel,
        rsi_efficiency: Math.max(0.1, randnRange(1.0, 0.25)), // PATCH 8: Independent auto-R&D capability axis
      });
    }
  }

  observeRealData(year, obs, sigmas = BENCHMARK_SIGMAS) {
    for (let i = 0; i < this.n; i++) {
      const p = this.particles[i];
      if (p.hw_months < 1.0 || p.agency_ceiling < 1.0) { this.weights[i] = 0; continue; }

      const pred = simulateToYear(p, year, this.cfg);
      const metrics = getNumericObservables(pred.reasoning, pred.agency, pred.embodiment, this.cfg.EXPERT);

      let logLik = 0;
      let count = 0;
      const baseSigmaMult = this.cfg.EXPERT.observationNoiseSigma || 1.0;
      const usePerPoint = this.cfg.EXPERT.observationSigmaMode === 'perPoint';

      // Helper: returns sigma for a given dimension (per-point if available, else global)
      const sig = (dim, globalKey) => {
        if (usePerPoint && obs[dim + '_sigma'] !== undefined) {
          return obs[dim + '_sigma'] * baseSigmaMult;
        }
        return (sigmas[globalKey] || 1.0) * baseSigmaMult;
      };

      if (obs.sweBench !== undefined) {
        logLik -= 0.5 * ((obs.sweBench - metrics.sweBench) / sig('sweBench', 'sweBench'))**2;
        count++;
      }
      if (obs.arcAgi !== undefined) {
        logLik -= 0.5 * ((obs.arcAgi - metrics.arcAgi) / sig('arcAgi', 'arcAgi'))**2;
        count++;
      }
      if (obs.arenaElo !== undefined) {
        logLik -= 0.5 * ((obs.arenaElo - metrics.arenaElo) / sig('arenaElo', 'arenaElo'))**2;
        count++;
      }
      if (obs.trainingFlopsLog !== undefined) {
        logLik -= 0.5 * ((obs.trainingFlopsLog - metrics.flopsLog) / sig('trainingFlopsLog', 'flopsLog'))**2;
        count++;
      }
      if (obs.horizon !== undefined) {
        // Наблюдение в log-шкале (log10 hours), модель предсказывает в той же шкале
        const obsHorizonLog = Math.log10(Math.max(0.01, obs.horizon));
        logLik -= 0.5 * ((obsHorizonLog - metrics.horizon) / sig('horizon', 'horizon'))**2;
        count++;
      }
      if (obs.simToReal !== undefined) {
        logLik -= 0.5 * ((obs.simToReal - metrics.simToReal) / sig('simToReal', 'simToReal'))**2;
        count++;
      }
      if (obs.moravec !== undefined) {
        logLik -= 0.5 * ((obs.moravec - metrics.moravec) / sig('moravec', 'moravec'))**2;
        count++;
      }
      if (obs.autoAssembly !== undefined) {
        // Наблюдение в log-шкале (log10 hours), модель предсказывает в той же шкале
        const obsAutoAssemblyLog = Math.log10(Math.max(0.001, obs.autoAssembly));
        logLik -= 0.5 * ((obsAutoAssemblyLog - metrics.autoAssembly) / sig('autoAssembly', 'autoAssembly'))**2;
        count++;
      }

      // 9) Real embodiment index: prior на particle.embodiment_ceiling от реальной робототехники
      // sigma для этого prior управляется weight (0..1): weight=0 → штраф 0, weight=1 → sigma=1.0
      const rrWeight = this.cfg.EXPERT.realRoboticsWeight || 0;
      if (rrWeight > 0) {
        const realIdx = realEmbodimentIndexAt(year);
        const rrSigma = (1.5 / Math.max(0.01, rrWeight)); // weight=0.3 → sigma=5; weight=1 → sigma=1.5
        // Сравниваем с предсказанным embodiment (pred.embodiment), а не с потолком частицы
        logLik -= 0.5 * ((realIdx - pred.embodiment) / rrSigma) ** 2;
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
          hw_months: Math.max(3.0, p.hw_months + randnRange(0, 0.4)),
          algo_months: Math.max(2.0, p.algo_months + randnRange(0, 0.6)),
          agency_ceiling: Math.max(1.5, p.agency_ceiling + randnRange(0, 0.4)),
          embodiment_ceiling: Math.max(1.5, (p.embodiment_ceiling || EXPERT_CONFIG.embodimentPriorMean) + randnRange(0, 0.3)),
          rsi_efficiency: Math.max(0.1, (p.rsi_efficiency || 1.0) + randnRange(0, 0.1)), // PATCH 8: Inheritance and mutation of RSI axis
          
          // PATCH 7: Prevent early loss of world model diversity via 3% rejuvenation (mutation)
          world_model: (() => {
            if (Math.random() < 0.03) {
              const r = Math.random();
              const w = EXPERT_CONFIG.worldModels;
              const totalWM = (w.cascade || 0) + (w.hardWall || 0) + (w.slowTakeoff || 0);
              const normC = totalWM > 0 ? (w.cascade || 0) / totalWM : 0.6;
              const normH = totalWM > 0 ? (w.hardWall || 0) / totalWM : 0.25;
              if (r < normC) return 'cascade';
              if (r < normC + normH) return 'hard_wall';
              return 'slow_takeoff';
            }
            return p.world_model || 'cascade';
          })(),
        });
      }
      this.particles = newP;
      this.weights.fill(1.0 / this.n);
    }
    this.observationLog.push({ year, ...obs });
  }

  getSummary() {
    let hw = 0, agn = 0, algo = 0;
    let wCascade = 0, wHardWall = 0, wSlowTakeoff = 0;
    const totalW = this.weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < this.n; i++) {
      const nw = totalW > 0 ? this.weights[i] / totalW : 1.0 / this.n;
      hw += this.particles[i].hw_months * nw;
      agn += this.particles[i].agency_ceiling * nw;
      algo += this.particles[i].algo_months * nw;
      
      // Count weighted fraction of each world model hypothesis
      if (this.particles[i].world_model === 'cascade') wCascade += nw;
      else if (this.particles[i].world_model === 'hard_wall') wHardWall += nw;
      else if (this.particles[i].world_model === 'slow_takeoff') wSlowTakeoff += nw;
    }
    return { 
      hwMonths: hw, 
      agencyCeiling: agn, 
      algoMonths: algo,
      postCascade: wCascade,
      postHardWall: wHardWall,
      postSlowTakeoff: wSlowTakeoff
    };
  }

  runMonteCarloForecast(nRuns) {
    const t1Years = [], t2Years = [], t3Years = [], t4Years = []; 
    const maxSteps = 12 * 45, dt = 1.0 / 12.0; 
    const plotSteps = 40 * 12; 
    const trajYears = new Float64Array(plotSteps);
    const trajCaps = Array.from({length: plotSteps}, () => []);
    const trajEmbodiment = Array.from({length: plotSteps}, () => []);
    const trajReasoning = Array.from({length: plotSteps}, () => []);
    const trajWM = Array.from({length: plotSteps}, () => []);

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
      let ceilingEmbodiment = p.embodiment_ceiling || this.cfg.EXPERT.embodimentPriorMean;

      // --- World Models: эпистемическая неопределённость ---
      // Каждая частица верит в свою "физику мира"
      if (p.world_model === 'hard_wall') {
        // Мир "Стены": Трансформеры упираются в потолок агентности и embodiment
        ceilingAgency = Math.min(ceilingAgency, this.cfg.EXPERT.plateauHardWallCeiling);
        ceilingEmbodiment = Math.min(ceilingEmbodiment, 4.0);
      } else if (p.world_model === 'slow_takeoff') {
        // Мир "Нейросимволики": медленный старт, но огромный потенциал
        algoK *= 0.6; // Алгоритмический прогресс тормозит до прорыва
      }
      // 'cascade' — каскадные парадигмы, без модификаций

      let yT1 = null, yT2 = null, yT3 = null, yT4 = null;
      let t2HitYear = null; // Перенесено сюда для сохранения состояния между итерациями
      let plotIdx = 0;
      let isWinter = false;
      let dataExhaustionHit = false;
      let gpuBubbleBurst = false;
      let alignmentIncidentCooldown = 0;
      let stateIntervention = false;
      let interventionCooldown = 0;

      // --- Каскадные парадигмы ---
      let paradigmGeneration = 0;
      let lastShiftYear = 2023.0;
      let hypeGracePeriod = 0.0;
      let algoKMultiplier = 1.0;

      let stateR = 0, stateA = 0, stateW = 0, stateE = 0;
      let roboticsFrontier = ceilingEmbodiment;

      for (let step = 0; step < maxSteps; step++) {
        const currentYear = this.cfg.BASE_YEAR + step * dt;

        const rawR = computeDim(stateR, this.cfg.DIMENSIONS.reasoning.slope, ceilingReasoning);
        const rawA = computeDim(stateA, this.cfg.DIMENSIONS.agency.slope, ceilingAgency);
        const rawE_ai = computeDim(stateE, this.cfg.EXPERT.embodimentScalingSlope, ceilingEmbodiment);
        const rawWM = computeDim(stateW, this.cfg.DIMENSIONS.worldModeling.slope, ceilingReasoning);

        const R = applyInference(rawR, this.cfg.INFERENCE_SCALING.max_bonus_reasoning, this.cfg.INFERENCE_SCALING.saturation_cap);
        const A = applyInference(rawA, this.cfg.INFERENCE_SCALING.max_bonus_agency, this.cfg.INFERENCE_SCALING.saturation_cap);
        const aiEmbodiment = applyInference(rawE_ai, this.cfg.INFERENCE_SCALING.max_bonus_agency * 0.5, this.cfg.INFERENCE_SCALING.saturation_cap);
        const E = Math.min(aiEmbodiment, roboticsFrontier);
        const W = applyInference(rawWM, 1.2, this.cfg.INFERENCE_SCALING.saturation_cap);

        const C = Math.sqrt(A * W) * Math.max(0, 1.0 - this.cfg.EXPERT.coordinationFriction);
        const S = Math.pow(R, 0.4) * Math.pow(W, 0.4) * Math.pow(A, 0.2);
        const M = Math.sqrt(E * C);

        const softCap = Math.cbrt(R * A * W);
        const civCap = Math.pow(R * A * W * E * C * M, 1 / 6);
        const cap = softCap;

        // Архитектурный каскад
        const canShift = (paradigmGeneration === 0 && currentYear > 2026.5)
                       || (paradigmGeneration > 0 && currentYear > lastShiftYear + 4.0);
        if (canShift) {
            const saturation = S / ceilingReasoning; // Прорыв зависит от развития науки

            // Прорыв зависит от насыщения и от compute overhang (избыток капитал/вычисления)
            if (saturation > this.cfg.EXPERT.saturationThreshold) {
              // Вычисляем capitalMultiplier для compute overhang (полный расчёт ниже)
              const _marketUtility = R * 0.3 + A * 0.7;
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
                ceilingEmbodiment *= shiftMult; // PATCH 4: Physical limit also shifts with paradigm

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

        let damping = 1.0; // [FIX] Инициализируем damping до начала проверок шоков и барьеров

        // --- ШОКИ: черные лебеди и предсказуемые кризисы ---

        // Шок 1: Исчерпание качественных данных (Data Wall)
        if (!dataExhaustionHit && currentYear > 2026.5 && Math.random() < 0.15 * dt) {
          dataExhaustionHit = true;
        }

        // Шок 2: Инцидент безопасности / Регуляторный бан (Alignment Incident)
        if (alignmentIncidentCooldown <= 0 && A > 6.0 && Math.random() < (A * 0.01) * dt) {
          alignmentIncidentCooldown = this.cfg.EXPERT.alignmentCooldown;
        }

        // Шок 3: Схлопывание GPU-пузыря
        if (!gpuBubbleBurst && currentYear > 2027.0 && A < 4.0 && Math.random() < this.cfg.EXPERT.bubbleBurstRisk * dt) {
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
    if (stateIntervention) damping *= 0.1; // [PATCH Bug 5] Государственная заморозка замедляет прогресс на 90%

    // --- БАРЬЕР 4: Конкуренция ИИ (Эффект Черной Королевы после T3) ---
        let nashDamping = 1.0;
        if (cap >= this.cfg.THRESHOLDS.t3) {
          nashDamping = 1.0 / (1.0 + this.cfg.EXPERT.barrierNashFriction * (cap - this.cfg.THRESHOLDS.t3));
        }

        // --- БАРЬЕР 5: Смысловой предел (Шок спроса) ---
        let demandDamping = 1.0;
        if (cap >= this.cfg.THRESHOLDS.t2 && t2HitYear !== null && (currentYear - t2HitYear) < this.cfg.EXPERT.barrierDemandGrace) {
          demandDamping = 0.6;
        }
        
        if (currentYear >= this.cfg.CURRENT_YEAR && plotIdx < plotSteps) {
            trajYears[plotIdx] = currentYear;
            trajCaps[plotIdx].push(cap);
            trajEmbodiment[plotIdx].push(E);
            trajReasoning[plotIdx].push(R);
            trajWM[plotIdx].push(W);
            plotIdx++;
        }
        
                // ПАТЧ 5: Смысловые, наблюдаемые пороги Сингулярности
                const t1Condition = R >= this.cfg.THRESHOLDS.t1 && W >= this.cfg.THRESHOLDS.t1 * 0.8; // AI R&D > лучшего человека
                const t2Condition = A >= this.cfg.THRESHOLDS.t2 && R >= 8.0; // Автономные компании

                // Пользовательские значения t3 и t4 могли остаться огромными (25 и 100), поэтому кэпируем их для новых реалистичных шкал
                const t3Req = Math.min(this.cfg.THRESHOLDS.t3, 15.0);
                const t3Condition = S >= t3Req && A >= 12.0; // Автономный научный цикл

                const t4Req = Math.min(this.cfg.THRESHOLDS.t4, 18.0);
                const t4Condition = E >= this.cfg.EXPERT.embodimentT4Requirement && A >= t4Req && W >= 14.0; // Автономная инфраструктура

                if (yT1 === null && t1Condition) yT1 = currentYear;
                if (yT2 === null && t2Condition) { yT2 = currentYear; t2HitYear = currentYear; }
                if (yT3 === null && t3Condition) yT3 = currentYear;
                if (yT4 === null && t4Condition) {
                    yT4 = currentYear;
                    break;
                }
        
        // [FIX] Строка `let damping = 1.0;` отсюда удалена, т.к. переменная объявлена выше

        // Проверка на лопнувший пузырь (AI Winter)
        if (!isWinter && currentYear > 2026.5) {
          const hypeGap = R - A;
          if (hypeGap > this.cfg.EXPERT.hypeGapThreshold && Math.random() < 0.10 * dt) {
            isWinter = true;
          }
        }

        if (isWinter) {
          // Зима ИИ: инвестиции в железо падают, алгоритмы развиваются медленнее
          damping = this.cfg.EXPERT.winterDamping;
          // Выход из зимы: если RSI дотянет agency до reasoning
          if (A >= R - 1.0) {
            isWinter = false;
          }
        } else {
          // Мягкое экономическое горлышко (оригинальный код)
          if (currentYear > this.cfg.BOTTLENECKS.econ_wall_start && (R - A) > 2.0) {
            damping *= Math.exp(-this.cfg.BOTTLENECKS.econ_damping * (R - A - 2.0));
          }
        }

        // Единый расчет RSI (Парадокс улучшений — RSI отделен от чистой мощности)
        const rsiEfficiency = isWinter ? 0.2 : 1.0;
        const rsi = calculateRSI(S, C, this.cfg.EXPERT) * rsiEfficiency;

        const marketUtility = R * 0.3 + A * 0.7;
        const investorExpectations = (currentYear - 2023.0) * 1.5;
        let capitalMultiplier = Math.max(0.1, Math.min(this.cfg.EXPERT.maxCapitalMultiplier,
            marketUtility / Math.max(1.0, investorExpectations)));
        if (paradigmGeneration > 0 && hypeGracePeriod > 0) {
          capitalMultiplier = Math.max(capitalMultiplier, 2.0);
        }

        const hwAct = sigmoid(1.0 * (R - 7.5)) * sigmoid(1.0 * (A - 5.0));
        let hardwareCoDesign = 1.0 + (this.cfg.EXPERT.hwCoDesignBonus - 1.0) * hwAct;

        // PATCH 6: Принцип Либиха для многосекторной экономики
        const computeInvestment = hwK * capitalMultiplier * hardwareCoDesign;
        const energyAvailability = Math.max(0, (this.cfg.EXPERT.barrierEnergyLog - flopsLog) * 0.8);
        const bypassActivation = sigmoid(1.5 * (E - this.cfg.EXPERT.embodimentBypassThreshold));
        const fabCapacity = hwK * 1.5 * (1.0 + bypassActivation * 2.0); // Роботы масштабируют фабы
        const talentBottleneck = dataExhaustionHit ? 0.4 : 1.5;

        let effectiveHwK = Math.min(
            computeInvestment,
            energyAvailability,
            fabCapacity,
            talentBottleneck,
            this.cfg.EXPERT.maxPhysicalHwGrowth,
            this.cfg.EXPERT.barrierAtomsLimit * Math.LN2
        );

        effectiveHwK *= damping * nashDamping * demandDamping;
        if (gpuBubbleBurst) effectiveHwK *= 0.2;

        let hwDelta = effectiveHwK * shockDamping;
        const algoShockDamping = gpuBubbleBurst ? shockDamping * 0.2 : shockDamping;
        let currentAlgoK = algoK * algoKMultiplier * damping * nashDamping * demandDamping;
        if (dataExhaustionHit) currentAlgoK *= this.cfg.EXPERT.dataWallPenalty;
        let algoDelta = (currentAlgoK + rsi) * algoShockDamping;

        const dCompute = (hwDelta + algoDelta) * dt;
        stateR += dCompute;
        stateW += 0.3 * dCompute + (0.4 * (W / ceilingReasoning) + 0.3 * (R / ceilingReasoning)) * Math.max(0, dCompute);
        stateA += 0.4 * dCompute + (0.3 * (R / ceilingReasoning) + 0.3 * (W / ceilingReasoning)) * Math.max(0, dCompute);
        stateE += 0.5 * dCompute + 0.2 * (A / ceilingAgency) * Math.max(0, dCompute);
        roboticsFrontier += (0.15 + 0.1 * (R > 7.0 ? 1 : 0)) * dt;

        flopsLog += hwDelta * dt;
        algoLog += algoDelta * dt;
      }
      
      t1Years.push(yT1 !== null ? yT1 - this.cfg.CURRENT_YEAR : Infinity);
      t2Years.push(yT2 !== null ? yT2 - this.cfg.CURRENT_YEAR : Infinity);
      t3Years.push(yT3 !== null ? yT3 - this.cfg.CURRENT_YEAR : Infinity);
      t4Years.push(yT4 !== null ? yT4 - this.cfg.CURRENT_YEAR : Infinity);
    }
    
    const yrs = [], med = [], p10a = [], p25a = [], p75a = [], p90a = [];
    const embYrs = [], embMed = [], embP10 = [], embP25 = [], embP75 = [], embP90 = [];
    const wmYrs = [], rMed = [], wmMed = [];
    for (let step = 0; step < plotSteps; step++) {
        const vals = trajCaps[step];
        if (vals.length > 0) {
            vals.sort((a,b) => a - b);
            yrs.push(trajYears[step]);
            p10a.push(percentile(vals, 10)); p25a.push(percentile(vals, 25));
            med.push(percentile(vals, 50));  p75a.push(percentile(vals, 75)); p90a.push(percentile(vals, 90));
        }
        const ev = trajEmbodiment[step];
        if (ev.length > 0) {
            ev.sort((a,b) => a - b);
            embYrs.push(trajYears[step]);
            embP10.push(percentile(ev, 10)); embP25.push(percentile(ev, 25));
            embMed.push(percentile(ev, 50));  embP75.push(percentile(ev, 75)); embP90.push(percentile(ev, 90));
        }
        const rv = trajReasoning[step];
        const wmv = trajWM[step];
        if (rv.length > 0 && wmv.length > 0) {
            rv.sort((a,b) => a - b);
            wmv.sort((a,b) => a - b);
            wmYrs.push(trajYears[step]);
            rMed.push(percentile(rv, 50));
            wmMed.push(percentile(wmv, 50));
        }
    }
    return {
        t1Years, t2Years, t3Years, t4Years,
        trajectory: { years: yrs, median: med, p10: p10a, p25: p25a, p75: p75a, p90: p90a },
        embodimentTrajectory: { years: embYrs, median: embMed, p10: embP10, p25: embP25, p75: embP75, p90: embP90 },
        gapTrajectory: { years: wmYrs, reasoning: rMed, wm: wmMed }
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
      let cE = p.embodiment_ceiling || cfg.EXPERT.embodimentPriorMean;

      if (p.world_model === 'hard_wall') {
        cA = Math.min(cA, cfg.EXPERT.plateauHardWallCeiling);
        cE = Math.min(cE, 4.0);
      } else if (p.world_model === 'slow_takeoff') {
        algoK *= 0.6;
      }

      let paradigmGeneration = 0;
      let lastShiftYear = cfg.BASE_YEAR;
      let hypeGracePeriod = 0.0;
      let algoKMultiplier = 1.0;
      let dataExhaustionHit = false;
      let isWinter = false;
      let gpuBubbleBurst = false;
      let alignmentIncidentCooldown = 0;
      let stateIntervention = false;
      let interventionCooldown = 0;
      let govMoratorium = false;
      let govMoratoriumYears = 0;

      let stateR = 0, stateA = 0, stateW = 0, stateE = 0;
      let roboticsFrontier = cE;

      const years = [], caps = [];
      for (let step = 0; step < steps; step++) {
        const y = cfg.BASE_YEAR + step * dt;

        const rawR = computeDim(stateR, cfg.DIMENSIONS.reasoning.slope, cR);
        const rawA = computeDim(stateA, cfg.DIMENSIONS.agency.slope, cA);
        const rawE_ai = computeDim(stateE, cfg.EXPERT.embodimentScalingSlope, cE);
        const rawWM = computeDim(stateW, cfg.DIMENSIONS.worldModeling.slope, cR);

        const R = applyInference(rawR, cfg.INFERENCE_SCALING.max_bonus_reasoning, cfg.INFERENCE_SCALING.saturation_cap);
        const A = applyInference(rawA, cfg.INFERENCE_SCALING.max_bonus_agency, cfg.INFERENCE_SCALING.saturation_cap);
        const aiEmbodiment = applyInference(rawE_ai, cfg.INFERENCE_SCALING.max_bonus_agency * 0.5, cfg.INFERENCE_SCALING.saturation_cap);
        const E = Math.min(aiEmbodiment, roboticsFrontier);
        const W = applyInference(rawWM, 1.2, cfg.INFERENCE_SCALING.saturation_cap);

        const C = Math.sqrt(A * W) * Math.max(0, 1.0 - cfg.EXPERT.coordinationFriction);
        const S = Math.pow(R, 0.4) * Math.pow(W, 0.4) * Math.pow(A, 0.2);
        const M = Math.sqrt(E * C);

        const cap = Math.cbrt(R * A * W);

        // [PATCH Bug 4] Парадигмальные сдвиги + Hype Overhang
        const canShift = (paradigmGeneration === 0 && y > 2026.5)
                       || (paradigmGeneration > 0 && y > lastShiftYear + 4.0);
        if (canShift) {
            const saturation = S / cR;
            if (saturation > cfg.EXPERT.saturationThreshold) {
              const _marketUtility = R * 0.3 + A * 0.7;
              const _investorExpectations = (y - 2023.0) * 1.5;
              const _capMult = Math.max(0.1, Math.min(cfg.EXPERT.maxCapitalMultiplier, _marketUtility / Math.max(1.0, _investorExpectations)));
              const _hypeMult = (paradigmGeneration > 0 && hypeGracePeriod > 0) ? Math.max(_capMult, 2.0) : _capMult;
              const computeOverhang = Math.max(1.0, _hypeMult);

              let shiftProb = 0.02 + (0.15 * saturation) + (cfg.EXPERT.overhangShiftMultiplier * computeOverhang);
              if (p.world_model === 'hard_wall') shiftProb = 0.001;

              if (Math.random() < shiftProb * dt) {
                paradigmGeneration++;
                lastShiftYear = y;
                hypeGracePeriod = cfg.EXPERT.hypeGracePeriod;
                let shiftMult = Math.max(cfg.EXPERT.minShiftMultiplier, cfg.EXPERT.baseShiftMultiplier - ((paradigmGeneration - 1) * cfg.EXPERT.paradigmDecayRate));
                if (p.world_model === 'slow_takeoff' && paradigmGeneration === 1) shiftMult = Math.max(shiftMult, 5.0);

                cA *= shiftMult;
                cR *= shiftMult;
                cE *= shiftMult;
                algoLog = Math.max(algoLog - (0.4 + paradigmGeneration * 0.1), -3.0);
                algoKMultiplier = 2.0;
                dataExhaustionHit = false;
              }
            }
        }

        if (paradigmGeneration > 0) {
          if (hypeGracePeriod > 0) hypeGracePeriod -= dt;
          if (algoKMultiplier > 1.0) {
            algoKMultiplier -= (1.0 / 4.0) * dt;
            if (algoKMultiplier < 1.0) algoKMultiplier = 1.0;
          }
        }

        years.push(y);
        caps.push(Math.min(R, A)); // [FIX] Базовый интеллект не ограничивается embodiment

        // --- ДИНАМИЧЕСКИЕ ШОКИ И БАРЬЕРЫ ---
        if (!dataExhaustionHit && y > 2026.5 && Math.random() < 0.15 * dt) dataExhaustionHit = true;

        if (alignmentIncidentCooldown <= 0 && A > 6.0 && Math.random() < (A * 0.01) * dt) {
          alignmentIncidentCooldown = cfg.EXPERT.alignmentCooldown;
        }

        if (!gpuBubbleBurst && y > 2027.0 && A < 4.0 && Math.random() < cfg.EXPERT.bubbleBurstRisk * dt) {
            gpuBubbleBurst = true;
            flopsLog -= 0.5;
        }

        let shockDamping = 1.0;
        if (alignmentIncidentCooldown > 0) {
          alignmentIncidentCooldown -= dt;
          shockDamping = 0.0;
        }
        if (gpuBubbleBurst) {
          shockDamping *= 0.2;
        }

        // [PATCH Bug 5] Геополитический шок
        if (cap >= cfg.THRESHOLDS.t2 && !stateIntervention && Math.random() < cfg.EXPERT.barrierGeopoliticsRisk * dt) {
          stateIntervention = true;
          interventionCooldown = 3.0;
        }
        if (stateIntervention) {
          interventionCooldown -= dt;
          if (interventionCooldown <= 0) stateIntervention = false;
        }

        // Governance мораторий
        if (y > cfg.CURRENT_YEAR && !govMoratorium && Math.random() < cfg.EXPERT.governanceMoratoriumProb) {
          govMoratorium = true;
          govMoratoriumYears = 1.0;
        }
        if (govMoratorium) {
          govMoratoriumYears -= dt;
          if (govMoratoriumYears <= 0) govMoratorium = false;
        }

        let damping = 1.0;
        if (stateIntervention) damping *= 0.1;
        if (govMoratorium) damping *= cfg.EXPERT.governanceShockDamping;

        let nashDamping = 1.0;
        if (cap >= cfg.THRESHOLDS.t3) {
          nashDamping = 1.0 / (1.0 + cfg.EXPERT.barrierNashFriction * (cap - cfg.THRESHOLDS.t3));
        }

        let demandDamping = 1.0;
        if (cap >= cfg.THRESHOLDS.t2 && (y - cfg.BASE_YEAR) < cfg.EXPERT.barrierDemandGrace) {
          demandDamping = 0.6;
        }

        if (!isWinter && y > 2026.5) {
          const hypeGap = R - A;
          if (hypeGap > cfg.EXPERT.hypeGapThreshold && Math.random() < 0.10 * dt) {
            isWinter = true;
          }
        }

        if (isWinter) {
          damping *= cfg.EXPERT.winterDamping;
          if (A >= R - 1.0) isWinter = false;
        } else {
          if (y > cfg.BOTTLENECKS.econ_wall_start && (R - A) > 2.0) {
            damping *= Math.exp(-cfg.BOTTLENECKS.econ_damping * (R - A - 2.0));
          }
        }

        // PATCH 8: RSI efficiency for scenarios
        const rsi = calculateRSI(S, C, cfg.EXPERT) * (p.rsi_efficiency || 1.0);

        // HW с притоком капитала (синхронизация с MC)
        const marketUtility = R * 0.3 + A * 0.7;
        const investorExpectations = (y - 2023.0) * 1.5;
        let capitalMultiplier = Math.max(0.1, Math.min(cfg.EXPERT.maxCapitalMultiplier, marketUtility / Math.max(1.0, investorExpectations)));
        if (paradigmGeneration > 0 && hypeGracePeriod > 0) {
          capitalMultiplier = Math.max(capitalMultiplier, 2.0);
        }

        const hwAct = sigmoid(1.0 * (R - 7.5)) * sigmoid(1.0 * (A - 5.0));
        let hardwareCoDesign = 1.0 + (cfg.EXPERT.hwCoDesignBonus - 1.0) * hwAct;

        // PATCH 6: Закон Либиха (для сценариев)
        const computeInvestment = hwK * capitalMultiplier * hardwareCoDesign;
        const energyAvailability = Math.max(0, (cfg.EXPERT.barrierEnergyLog - flopsLog) * 0.8);
        const bypassActivation = sigmoid(1.5 * (E - cfg.EXPERT.embodimentBypassThreshold));
        const fabCapacity = hwK * 1.5 * (1.0 + bypassActivation * 2.0);
        const talentBottleneck = dataExhaustionHit ? 0.4 : 1.5;

        let effectiveHwK = Math.min(
            computeInvestment,
            energyAvailability,
            fabCapacity,
            talentBottleneck,
            cfg.EXPERT.maxPhysicalHwGrowth,
            cfg.EXPERT.barrierAtomsLimit * Math.LN2
        );

        effectiveHwK *= damping * nashDamping * demandDamping;
        if (gpuBubbleBurst) effectiveHwK *= 0.2;

        let hwDelta = effectiveHwK * shockDamping;
        const algoShockDamping = gpuBubbleBurst ? shockDamping * 0.2 : shockDamping;
        let currentAlgoK = algoK * algoKMultiplier * damping * nashDamping * demandDamping;
        if (dataExhaustionHit) currentAlgoK *= cfg.EXPERT.dataWallPenalty;
        let algoDelta = (currentAlgoK + rsi) * algoShockDamping;

        const dCompute = (hwDelta + algoDelta) * dt;
        stateR += dCompute;
        stateW += 0.3 * dCompute + (0.4 * (W / cR) + 0.3 * (R / cR)) * Math.max(0, dCompute);
        stateA += 0.4 * dCompute + (0.3 * (R / cR) + 0.3 * (W / cR)) * Math.max(0, dCompute);
        stateE += 0.5 * dCompute + 0.2 * (A / cA) * Math.max(0, dCompute);
        roboticsFrontier += (0.15 + 0.1 * (R > 7.0 ? 1 : 0)) * dt;

        flopsLog += hwDelta * dt;
        algoLog += algoDelta * dt;
      }
      scenarios.push({ years, caps });
    }
    return scenarios;
  }

  runDecomposition() {
    const cfg = this.cfg;
    // Use weighted average particle instead of particles[0] (which may have negligible weight)
    const totalW = this.weights.reduce((a, b) => a + b, 0);
    let avgHw = 0, avgAlgo = 0, avgCeiling = 0, avgEmbodimentCeiling = 0;
    if (totalW > 0) {
      for (let i = 0; i < this.n; i++) {
        const w = this.weights[i] / totalW;
        avgHw += this.particles[i].hw_months * w;
        avgAlgo += this.particles[i].algo_months * w;
        avgCeiling += this.particles[i].agency_ceiling * w;
        avgEmbodimentCeiling += (this.particles[i].embodiment_ceiling || cfg.EXPERT.embodimentPriorMean) * w;
      }
    } else {
      // Fallback: unweighted average
      for (let i = 0; i < this.n; i++) {
        avgHw += this.particles[i].hw_months;
        avgAlgo += this.particles[i].algo_months;
        avgCeiling += this.particles[i].agency_ceiling;
        avgEmbodimentCeiling += this.particles[i].embodiment_ceiling || cfg.EXPERT.embodimentPriorMean;
      }
      avgHw /= this.n;
      avgAlgo /= this.n;
      avgCeiling /= this.n;
      avgEmbodimentCeiling /= this.n;
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
    let cE = avgEmbodimentCeiling || cfg.EXPERT.embodimentPriorMean;
    // Apply weighted World Model constraints to avgCeiling
    let hardWallWeight = 0, slowTakeoffWeight = 0;
    if (totalW > 0) {
      for (let i = 0; i < this.n; i++) {
        const w = this.weights[i] / totalW;
        if (this.particles[i].world_model === 'hard_wall') hardWallWeight += w;
        else if (this.particles[i].world_model === 'slow_takeoff') slowTakeoffWeight += w;
      }
    }
    // Blend: определяем доминирующую парадигму для отрисовки декомпозиции
    const cascadeWeight = 1.0 - hardWallWeight - slowTakeoffWeight;
    const dominantModel = (hardWallWeight > cascadeWeight && hardWallWeight > slowTakeoffWeight) ? 'hard_wall' :
                          (slowTakeoffWeight > cascadeWeight && slowTakeoffWeight > hardWallWeight) ? 'slow_takeoff' : 'cascade';
                          
    if (dominantModel === 'hard_wall') {
      cA = Math.min(cA, cfg.EXPERT.plateauHardWallCeiling);
      cE = Math.min(cE, 4.0);
    }
    const algoKMultiplier = dominantModel === 'slow_takeoff' ? 0.6 : 1.0;
    let paradigmGeneration = 0;

    let stateR = 0, stateA = 0, stateW = 0, stateE = 0;
    let roboticsFrontier = cE;
    
    // PATCH 8: Weighted average RSI efficiency for decomposition
    let avgRsiEff = 0;
    if (totalW > 0) {
      for (let i = 0; i < this.n; i++) {
        avgRsiEff += (this.particles[i].rsi_efficiency || 1.0) * (this.weights[i] / totalW);
      }
    } else {
      avgRsiEff = 1.0;
    }

    for (let step = 0; step < steps; step++) {
      const y = cfg.BASE_YEAR + step * dt;
      let paradigmBonus = 0;

      const rawR = computeDim(stateR, cfg.DIMENSIONS.reasoning.slope, cR);
      const rawA = computeDim(stateA, cfg.DIMENSIONS.agency.slope, cA);
      const rawE_ai = computeDim(stateE, cfg.EXPERT.embodimentScalingSlope, cE);
      const rawWM = computeDim(stateW, cfg.DIMENSIONS.worldModeling.slope, cR);
      
      const R = applyInference(rawR, cfg.INFERENCE_SCALING.max_bonus_reasoning, cfg.INFERENCE_SCALING.saturation_cap);
      const A = applyInference(rawA, cfg.INFERENCE_SCALING.max_bonus_agency, cfg.INFERENCE_SCALING.saturation_cap);
      const aiEmbodiment = applyInference(rawE_ai, cfg.INFERENCE_SCALING.max_bonus_agency * 0.5, cfg.INFERENCE_SCALING.saturation_cap);
      const E = Math.min(aiEmbodiment, roboticsFrontier);
      const W = applyInference(rawWM, 1.2, cfg.INFERENCE_SCALING.saturation_cap);

      const C = Math.sqrt(A * W) * Math.max(0, 1.0 - cfg.EXPERT.coordinationFriction);
      const S = Math.pow(R, 0.4) * Math.pow(W, 0.4) * Math.pow(A, 0.2);
      const M = Math.sqrt(E * C);

      const cap = Math.cbrt(R * A * W);

      // ИСПРАВЛЕНИЕ: Логика парадигм синхронизирована
      const saturation = S / cR;
      if (y > cfg.CURRENT_YEAR && saturation > cfg.EXPERT.saturationThreshold && Math.random() < cfg.SCALING_LAW.paradigm_shift_prob * dt) {
        cA *= cfg.SCALING_LAW.shift_multiplier;
        cR *= cfg.SCALING_LAW.shift_multiplier;
        cE *= cfg.SCALING_LAW.shift_multiplier; // PATCH 4: Physical limit
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
      if (y > cfg.BOTTLENECKS.econ_wall_start && (R - A) > 2.0) {
        damping *= Math.exp(-cfg.BOTTLENECKS.econ_damping * (R - A - 2.0));
      }
      // PATCH 8: Apply weighted average RSI efficiency
      const rsi = calculateRSI(S, C, cfg.EXPERT) * avgRsiEff;
      accumulatedRsi += rsi * dt;
      rsiComp.push(accumulatedRsi);
      const bypassActivation = sigmoid(1.5 * (E - cfg.EXPERT.embodimentBypassThreshold));
      const hwBonus = 1.0 + bypassActivation * (cfg.EXPERT.embodimentHWBonusMultiplier - 1.0);
      // [NEW] Проклятие атомов + термодинамика
      let hwDelta = hwK * damping * hwBonus;
      hwDelta = Math.min(hwDelta, cfg.EXPERT.barrierAtomsLimit * Math.LN2);
      if (flopsLog >= cfg.EXPERT.barrierEnergyLog) hwDelta = 0;
      let algoDelta = algoK * algoKMultiplier * damping + rsi;

      const dCompute = (hwDelta + algoDelta) * dt;
      stateR += dCompute;
      stateW += 0.3 * dCompute + (0.4 * (W / cR) + 0.3 * (R / cR)) * Math.max(0, dCompute);
      stateA += 0.4 * dCompute + (0.3 * (R / cR) + 0.3 * (W / cR)) * Math.max(0, dCompute);
      stateE += 0.5 * dCompute + 0.2 * (A / cA) * Math.max(0, dCompute);
      roboticsFrontier += (0.15 + 0.1 * (R > 7.0 ? 1 : 0)) * dt;

      flopsLog += hwDelta * dt;
      algoLog += algoDelta * dt;
      pureAlgoLog += (algoK * algoKMultiplier * damping) * dt;
    }
    return { years, hwComp, algoComp, paradigmComp, rsiComp };
  }
}

// ============================================================================
// 6. UI STATE & CONTROLLERS
// ============================================================================


function getTracker() {
  if (!coreTracker) {
    coreTracker = new BayesianTracker(1000);
    REAL_BENCHMARK_HISTORY.forEach(d => coreTracker.observeRealData(d.year, d));
    userObservations.forEach(d => coreTracker.observeRealData(d.year, d));
  }
  return coreTracker;
}

// Backtest: тренируемся на первых trainEnd точках, предсказываем trainEnd+1..K.
// Возвращает: { residuals: [...], perDim: {sweBench, arcAgi, arenaElo, flopsLog, horizon, simToReal, moravec, autoAssembly}, coverage90: %, nPred: K - trainEnd }
function runBacktest(trainEnd, kPred) {
  const data = REAL_BENCHMARK_HISTORY;
  if (!data || data.length < trainEnd + kPred) {
    return { error: 'Недостаточно данных для бэктеста (нужно trainEnd + kPred наблюдений)', dataLen: data ? data.length : 0 };
  }
  const trainData = data.slice(0, trainEnd);
  const testData = data.slice(trainEnd, trainEnd + kPred);

  const btTracker = new BayesianTracker(1000);
  trainData.forEach(d => btTracker.observeRealData(d.year, d));

  const residuals = [];
  const dims = ['sweBench', 'arcAgi', 'arenaElo', 'flopsLog', 'horizon', 'simToReal', 'moravec', 'autoAssembly'];
  const sqErr = { sweBench:0, arcAgi:0, arenaElo:0, flopsLog:0, horizon:0, simToReal:0, moravec:0, autoAssembly:0 };
  const cnt = { sweBench:0, arcAgi:0, arenaElo:0, flopsLog:0, horizon:0, simToReal:0, moravec:0, autoAssembly:0 };
  let inCI90 = 0, totalCIEval = 0;

  for (let t = 0; t < testData.length; t++) {
    const obs = testData[t];
    const samples = [];
    for (let i = 0; i < btTracker.n; i += 5) {
      const pred = simulateToYear(btTracker.particles[i], obs.year, btTracker.cfg);
      const m = getNumericObservables(pred.reasoning, pred.agency, pred.embodiment, btTracker.cfg.EXPERT);
      samples.push(m);
    }
    const medianSample = {};
    for (const dim of dims) {
      const vals = samples.map(s => s[dim]).filter(v => isFinite(v)).sort((a,b)=>a-b);
      const _m = Math.floor(vals.length / 2); medianSample[dim] = vals.length > 0 ? (vals.length % 2 === 0 ? (vals[_m - 1] + vals[_m]) / 2 : vals[_m]) : 0;
      const p10 = vals.length > 0 ? vals[Math.floor(vals.length * 0.10)] : 0;
      const p90 = vals.length > 0 ? vals[Math.floor(vals.length * 0.90)] : 0;
      if (obs[dim] !== undefined) {
        // autoAssembly и horizon предсказываются в log10(часах), а в obs лежат реальные часы. Конвертируем.
        const obsInModelScale = (dim === 'autoAssembly') ? Math.log10(Math.max(0.001, obs[dim])) :
                                (dim === 'horizon') ? Math.log10(Math.max(0.01, obs[dim])) :
                                obs[dim];
        const err = obsInModelScale - medianSample[dim];
        sqErr[dim] += err * err;
        cnt[dim]++;
        if (obsInModelScale >= p10 && obsInModelScale <= p90) inCI90++;
        totalCIEval++;
      }
    }
    residuals.push({ year: obs.year, observed: obs, predicted: medianSample });
  }
  const perDim = {};
  for (const dim of dims) {
    perDim[dim] = cnt[dim] > 0 ? Math.sqrt(sqErr[dim] / cnt[dim]) : null;
  }
  return {
    trainEnd, kPred,
    trainYears: `${trainData[0].year}..${trainData[trainData.length-1].year}`,
    testYears: `${testData[0].year}..${testData[testData.length-1].year}`,
    residuals, perDim,
    coverage90: totalCIEval > 0 ? (inCI90 / totalCIEval * 100) : null,
    nPred: testData.length
  };
}

function addObservation() {
  // Считываем значения с полей. Если поля нет или оно пустое - undefined
  const arcEl = document.getElementById('v3ARC');
  const horizonEl = document.getElementById('v3Horizon');
  const sweEl = document.getElementById('v3SWE'); // задел на будущее
  const eloEl = document.getElementById('v3Elo'); // задел на будущее
  
  const arcVal = arcEl && arcEl.value ? +arcEl.value : undefined;
  const horizonVal = horizonEl && horizonEl.value ? +horizonEl.value : undefined;
  const sweVal = sweEl && sweEl.value ? +sweEl.value : undefined;
  const eloVal = eloEl && eloEl.value ? +eloEl.value : undefined;

  const y = coreTracker ? coreTracker.cfg.CURRENT_YEAR : (new Date().getFullYear() + new Date().getMonth() / 12);
  
  const newObs = { year: y };
  if (arcVal !== undefined) newObs.arcAgi = arcVal;
  if (horizonVal !== undefined) newObs.horizon = horizonVal;
  if (sweVal !== undefined) newObs.sweBench = sweVal;
  if (eloVal !== undefined) newObs.arenaElo = eloVal;

  userObservations = userObservations.filter(o => o.year < y - 0.01);
  if (Object.keys(newObs).length > 1) { // Добавляем, только если есть хотя бы 1 метрика кроме year
    userObservations.push(newObs);
  }
  
  coreTracker = new BayesianTracker(DEFAULT_PARTICLES);
  REAL_BENCHMARK_HISTORY.forEach(d => coreTracker.observeRealData(d.year, d));
  userObservations.forEach(d => coreTracker.observeRealData(d.year, d));
  
  updateTrackerUI(coreTracker);
}

function resetTracker() {
  coreTracker = null; userObservations = [];
  const obsEl = document.getElementById('userObservations');
  if (obsEl) obsEl.innerHTML = '';
  const parEl = document.getElementById('v3Params');
  if (parEl) parEl.textContent = '';
}

function updateTrackerUI(tracker) {
  checkObservationWarning(tracker);
  updateObsMetrics();
  
  // PATCH 9: Update posterior world model probabilities in real-time
  const sum = tracker.getSummary();
  const parEl = document.getElementById('v3Params');
  if (parEl) {
    const L = LANG[window._lang || 'ru'];
    parEl.innerHTML = `
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;border-top:1px dashed #1e1e2e;padding-top:8px;line-height:1.4">
        <b style="color:#f0883e">${L.v3_params_title || 'Текущие апостериорные веса гипотез'}:</b><br>
        Cascade (Каскад): <span style="color:#58a6ff;font-family:monospace">${(sum.postCascade * 100).toFixed(1)}%</span><br>
        Hard Wall (Стена): <span style="color:#ef4444;font-family:monospace">${(sum.postHardWall * 100).toFixed(1)}%</span><br>
        Slow Takeoff (Взлет): <span style="color:#22c55e;font-family:monospace">${(sum.postSlowTakeoff * 100).toFixed(1)}%</span>
      </div>
    `;
  }
}

let hasUserInput = false;

function checkObservationWarning(tracker) {
  const warnEl = document.getElementById('v3Warning');
  if (!warnEl) return;
  if (!hasUserInput) { warnEl.style.display = 'none'; return; }
  
  const arcEl = document.getElementById('v3ARC');
  const sweEl = document.getElementById('v3SWE');
  const userArc = arcEl && arcEl.value ? +arcEl.value : undefined;
  const userSwe = sweEl && sweEl.value ? +sweEl.value : undefined;
  
  if (userArc === undefined && userSwe === undefined) {
      warnEl.style.display = 'none'; return; 
  }

  let minDist = Infinity;
  for (let i = 0; i < tracker.n; i += 10) { 
    if (tracker.weights[i] < 1e-5) continue;
    const pred = simulateToYear(tracker.particles[i], tracker.cfg.CURRENT_YEAR, tracker.cfg);
    const m = getNumericObservables(pred.reasoning, pred.agency, pred.embodiment, tracker.cfg.EXPERT);
    
    let distSq = 0;
    if (userArc !== undefined) distSq += ((userArc - m.arcAgi)/BENCHMARK_SIGMAS.arcAgi)**2;
    if (userSwe !== undefined) distSq += ((userSwe - m.sweBench)/BENCHMARK_SIGMAS.sweBench)**2;
    
    const dist = Math.sqrt(distSq);
    if (dist < minDist) minDist = dist;
  }
  
  if (minDist > 3.0) { // 3 сигмы
    warnEl.style.display = '';
    const L = LANG[window._lang || 'ru'];
    warnEl.textContent = L.v3_warning_far || '⚠️ Значения далеко от диапазона частиц — экстраполяция ненадёжна.';
  } else {
    warnEl.style.display = 'none';
  }
}

async function runSimulation() {
  if (simulationRunning) return;
  simulationRunning = true;

  const btn = document.getElementById('runBtn');
  if (btn) btn.disabled = true; // Безопасная блокировка кнопки

  const overlay = document.getElementById('overlay');
  if (overlay) overlay.classList.add('show');

  const textEl = document.getElementById('overlayText');
  if (textEl) textEl.textContent = 'Байесовское прогнозирование v4...';

  const rnEl = document.getElementById('rN');
  const n = rnEl ? +rnEl.value : 3000; // Фолбэк на 3000, если инпута нет

  await new Promise(r => setTimeout(r, 50));
  try {
    // Сохраняем текущий ввод пользователя перед симуляцией
    addObservation();

    const tracker = coreTracker || getTracker();
    const runData = tracker.runMonteCarloForecast(n);
    const t1List = runData.t1Years, t2List = runData.t2Years;
    const t3List = runData.t3Years, t4List = runData.t4Years;
    const finiteT1 = t1List.filter(isFinite);
    const finiteT2 = t2List.filter(isFinite);
    const finiteT3 = t3List.filter(isFinite);
    const finiteT4 = t4List.filter(isFinite);

    const CUR_Y = tracker.cfg.CURRENT_YEAR;
    const yq = [];
    for (let y = 0.25; y <= 10; y += 0.25) yq.push(+y.toFixed(4));
    for (let y = 11; y <= 40; y++) yq.push(y);
    const yqAbs = yq.map(y => +(CUR_Y + y).toFixed(2));

    currentResults = {
      histogram: buildHistogramBins(t1List, t2List, t3List, t4List),
      trajectory: runData.trajectory,
      embodimentTrajectory: runData.embodimentTrajectory,
      gapTrajectory: runData.gapTrajectory,
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
        pT2_2029: cdf(t2List, 3), pT2_2033: cdf(t2List, 7), pT2_2040: cdf(t2List, 14),
        pT4_2035: cdf(t4List, 9), pT4_2045: cdf(t4List, 19), nRuns: n
      },
    };
    updateUI(currentResults);
    if (typeof liveSwarm !== 'undefined') liveSwarm.tracker = tracker;
    if (typeof swarm !== 'undefined' && swarm) swarm.tracker = tracker;
  } catch (err) {
    console.error("Simulation error:", err);
  } finally {
    simulationRunning = false;
    if (btn) btn.disabled = false;
    if (overlay) overlay.classList.remove('show');
  }
}

function updateUI(r) {
  const s = r.summary, fmt = yearsText;
  setVal('vT1', fmt(s.t1Median), 't1years');
  setVal('vT2', fmt(s.t2Median), 't2years');
  setVal('vT3', fmt(s.t3Median), 't3years');
  setVal('vT4', fmt(s.t4Median), 't4years');
  // Скрыть/показать предупреждение "T2 не достигнут"
  const noT2El = document.getElementById('v3NoAgi');
  if (noT2El) noT2El.style.display = isFinite(s.t2Median) ? 'none' : '';
  plotHistogram(r.histogram); plotCumulative(r.cumulative);
  // Advanced charts (async-like, yield between heavy plots)
  requestAnimationFrame(async () => {
    const tracker = getTracker();
    await plotSensitivityHeatmap(tracker);
    requestAnimationFrame(() => {
      plotScenarioFan(tracker);
      plotDecomposition(tracker);
      plotHallucinationGap(r.gapTrajectory);
      plotEmbodimentDiagnostics(tracker, r.embodimentTrajectory);
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

  const tracker = getTracker();
  const CUR_Y = tracker ? tracker.cfg.CURRENT_YEAR : new Date().getFullYear();
  return { 
    labels: bins.slice(0, -1).map((_, i) => (CUR_Y + (bins[i] + bins[i + 1]) / 2).toFixed(1)), 
    t1: h1, t2: h2, t3: h3, t4: h4
  };
}

// ============================================================================
// PLOTLY RENDERERS & i18n
// ============================================================================

// ============================================================================
// 7. VISUALIZATION (Plotly Charts)
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

function plotEmbodimentDiagnostics(tracker, embodimentTrajectory) {
  const t = LANG[window._lang || 'ru'];
  const cfg = tracker.cfg;

  // 1) Histogram текущего embodiment_ceiling по всем частицам
  const ceilingVals = tracker.particles.map(p => p.embodiment_ceiling || cfg.EXPERT.embodimentPriorMean);
  const binW = 0.4;
  const binMin = 0.5, binMax = 12.0;
  const binLabels = [];
  const binCounts = new Array(Math.ceil((binMax - binMin) / binW)).fill(0);
  for (let i = 0; i < binCounts.length; i++) binLabels.push((binMin + i * binW).toFixed(1));
  ceilingVals.forEach(v => {
    const idx = Math.floor((Math.max(binMin, Math.min(binMax, v)) - binMin) / binW);
    if (idx >= 0 && idx < binCounts.length) binCounts[idx]++;
  });

  // 2) Embodiment trajectory (percentiles) — переиспользуем результат runMonteCarloForecast из runSimulation
  //    Если не передан (вызов из другого места) — fallback на nRuns=20 для адекватных бэндов
  const et = embodimentTrajectory || (() => {
    const mc = tracker.runMonteCarloForecast(20);
    return mc.embodimentTrajectory;
  })();

  // 3) Real robotics scatter markers
  const realYears = REAL_ROBOTICS_DATA.map(d => d.year);
  const realIdx = REAL_ROBOTICS_DATA.map(d => d.index);
  const realNames = REAL_ROBOTICS_DATA.map(d => d.name);

  // 4) Threshold lines
  const lim = cfg.EXPERT;
  const yrRange = [2026, 2040];
  const realConnector = {
    x: [REAL_ROBOTICS_DATA[0].year, REAL_ROBOTICS_DATA[REAL_ROBOTICS_DATA.length - 1].year],
    y: [REAL_ROBOTICS_DATA[0].index, REAL_ROBOTICS_DATA[REAL_ROBOTICS_DATA.length - 1].index],
  };

  const traces = [
    // === ROW 1: Histogram (xaxis2 / yaxis2 — нижний подзаголовок) ===
    { x: binLabels, y: binCounts, type: 'bar', xaxis: 'x2', yaxis: 'y2', name: t.ch8_hist || 'Particles', marker: { color: 'rgba(167,139,250,0.6)' }, showlegend: false },

    // === ROW 2: Embodiment trajectory band — стандартный паттерн 3-полос ===
    // p10 (нижняя граница, без fill) → затем p90 (fill='tonexty' = между p10 и p90)
    { x: et.years, y: et.p10, type: 'scatter', mode: 'lines', xaxis: 'x', yaxis: 'y', name: t.ch8_p10 || 'p10', line: { color: 'transparent', width: 0 }, showlegend: false, hoverinfo: 'skip' },
    { x: et.years, y: et.p90, type: 'scatter', mode: 'lines', xaxis: 'x', yaxis: 'y', name: t.ch8_p1090 || 'p10..p90', line: { color: 'transparent', width: 0 }, fill: 'tonexty', fillcolor: 'rgba(167,139,250,0.10)', showlegend: false, hoverinfo: 'skip' },
    // p25 (без fill) → p75 (fill='tonexty' = между p25 и p75, поверх p10..p90)
    { x: et.years, y: et.p25, type: 'scatter', mode: 'lines', xaxis: 'x', yaxis: 'y', name: t.ch8_p25 || 'p25', line: { color: 'transparent', width: 0 }, showlegend: false, hoverinfo: 'skip' },
    { x: et.years, y: et.p75, type: 'scatter', mode: 'lines', xaxis: 'x', yaxis: 'y', name: t.ch8_p2575 || 'p25..p75', line: { color: 'transparent', width: 0 }, fill: 'tonexty', fillcolor: 'rgba(167,139,250,0.18)', showlegend: false, hoverinfo: 'skip' },
    // Median (линия)
    { x: et.years, y: et.median, type: 'scatter', mode: 'lines', xaxis: 'x', yaxis: 'y', name: t.ch8_median || 'Median (MC)', line: { color: '#a78bfa', width: 2.5 } },

    // === Real robotics: connector line + scatter ===
    { x: realConnector.x, y: realConnector.y, type: 'scatter', mode: 'lines', xaxis: 'x', yaxis: 'y', name: t.ch8_real || 'Real robotics', line: { color: '#fbbf24', width: 2, dash: 'dot' } },
    { x: realYears, y: realIdx, type: 'scatter', mode: 'markers', xaxis: 'x', yaxis: 'y', name: t.ch8_real || 'Real robots', marker: { size: 9, color: '#fbbf24', line: { color: '#000', width: 1 } }, text: realNames, hovertemplate: '<b>%{text}</b><br>year=%{x}<br>index=%{y}<extra></extra>' },

    // === Threshold lines ===
    { x: yrRange, y: [lim.embodimentT4Requirement, lim.embodimentT4Requirement], type: 'scatter', mode: 'lines', xaxis: 'x', yaxis: 'y', name: t.ch8_t4req || 'T4 requirement', line: { color: '#ef4444', dash: 'dash', width: 1.5 } },
    { x: yrRange, y: [lim.embodimentBypassThreshold, lim.embodimentBypassThreshold], type: 'scatter', mode: 'lines', xaxis: 'x', yaxis: 'y', name: t.ch8_bypass || 'HW bypass', line: { color: '#22c55e', dash: 'dash', width: 1.5 } },
  ];

  const layout = {
    ...LAYOUT_BASE,
    grid: { rows: 2, columns: 1, pattern: 'independent', roworder: 'top to bottom' },
    xaxis: { ...LAYOUT_BASE.xaxis, domain: [0, 1], anchor: 'y', title: { text: t.ch2_xlabel || 'Год' }, range: yrRange },
    yaxis: { ...LAYOUT_BASE.yaxis, domain: [0.45, 1.0], anchor: 'x', title: { text: t.ch8_y_main || 'Embodiment (0..10)' }, range: [0, 11] },
    xaxis2: { ...LAYOUT_BASE.xaxis, domain: [0, 1], anchor: 'y2', title: { text: t.ch8_x_hist || 'embodiment_ceiling' } },
    yaxis2: { ...LAYOUT_BASE.yaxis, domain: [0, 0.32], anchor: 'x2', title: { text: t.ch8_y_hist || '#particles' } },
    legend: { ...LAYOUT_BASE.legend, orientation: 'h', y: -0.08, x: 0, xanchor: 'left' },
    margin: { l: 56, r: 24, t: 12, b: 64 },
    showlegend: true,
  };

  Plotly.newPlot('c8', traces, layout, PLOT_CFG);
}

function plotHallucinationGap(gt) {
  const t = LANG[window._lang || 'ru'];

  // Создаем динамический контейнер, если его нет
  let gapContainer = document.getElementById('c_gap');
  if (!gapContainer) {
      const c7Container = document.getElementById('c7');
      if (c7Container) {
          gapContainer = document.createElement('div');
          gapContainer.id = 'c_gap';
          gapContainer.className = c7Container.className;
          c7Container.parentNode.insertBefore(gapContainer, c7Container.nextSibling);
      }
  }

  const traces = [
    { x: gt.years, y: gt.wm, type: 'scatter', mode: 'lines', name: 'World Modeling', line: { color: '#22c55e', width: 2 } },
    { x: gt.years, y: gt.reasoning, type: 'scatter', mode: 'lines', name: 'Reasoning', fill: 'tonexty', fillcolor: 'rgba(239,68,68,0.25)', line: { color: '#a78bfa', width: 2 } }
  ];

  const layout = {
    ...LAYOUT_BASE,
    title: { text: t.ch_gap_title || 'Каузальный разрыв (Hallucination Gap)', font: { size: 14, color: '#eab308' } },
    xaxis: { ...LAYOUT_BASE.xaxis, title: { text: t.ch2_xlabel || 'Год' }, range: [2026, 2045] },
    yaxis: { ...LAYOUT_BASE.yaxis, title: { text: 'Capability Scale (0..15)' }, range: [0, 16] },
    legend: { ...LAYOUT_BASE.legend, orientation: 'h', y: -0.15 },
  };

  if (gapContainer) {
      Plotly.newPlot('c_gap', traces, layout, PLOT_CFG);
  }
}



// ============================================================================
// 10. LOCALIZATION & INITIALIZATION
// ============================================================================

window._lang = 'ru';
const LANG = {
  ru: {
    // Header
    hdr_title:'Singularity Forecaster', hdr_sub:'v4.4 — Четыре стадии отлучения',
    // Status bar
    sb_t1:'Медиана T1 (Понимание)', sb_t2:'Медиана T2 (Предсказуемость)',
    sb_t3:'Медиана T3 (Контроль)', sb_t4:'Медиана T4 (Влияние)',
    sb_pagi_2029:'P(T2 · 2029)', sb_pagi_2033:'P(T2 · 2033)', sb_pagi_2040:'P(T2 · 2040)',
    sb_pasi_2035:'P(T4 · 2035)', sb_pasi_2045:'P(T4 · 2045)',
    sb_hw:'Удвоение HW', sb_algo:'Удвоение Algo', sb_agency:'Потолок Agency', sb_ess:'ESS',
    // Controls
    ctrl_simulations:'Симуляции (N)', ctrl_obs_year:'Год наблюдения',
    ctrl_intelligence:'Reasoning (Логика)', ctrl_agentic:'Agency (Агентность)',
    ctrl_add:'Добавить', ctrl_reset:'Сбросить',
    ctrl_swe_bench:'SWE-bench (%)', ctrl_arc_agi:'ARC-AGI (%)',
    ctrl_horizon:'Автономность (часов)', ctrl_cost:'Стоимость 1M токенов ($)',
    run_btn:'Запустить симуляцию',
    // Charts
    tag1:'Вероятностный анализ', tag3:'Кумулятивная',
    tag5:'Чувствительность', tag6:'Сценарии', tag7:'Декомпозиция', tag8:'Embodiment',
    chart1:'1. Распределение 4-х этапов Сингулярности (Monte Carlo)',
    chart3:'2. Накопленная вероятность (Cumulative PDF)',
    chart5:'3. Карта чувствительности (Reasoning × Agency)',
    chart6:'4. Веер сценариев (Multi-Run Overlay)',
    chart7:'5. Вклад компонент (Stacked Area)',
    chart_gap:'6. Каузальный разрыв (Hallucination Gap)',
    chart8:'7. Embodiment: распределение и реальная робототехника',
    tip1:'Аппроксимация функции плотности вероятности (PDF) моментов достижения пороговых состояний $\\tau = \\inf \\{t : C(t) \\ge C_{crit}\\}$. Рассчитано методом Монте-Карло (N=3000) на основе сэмплирования из апостериорного распределения частиц.',
    tip3:'Эмпирическая кумулятивная функция распределения (CDF), $F(t) = P(T \\le t)$. Отражает монотонно возрастающую вероятность прохождения стадий T2 и T4 к заданному году с учетом всех сценариев и дисперсии.',
    tip5:'Тепловая карта чувствительности. Демонстрирует нелинейный отклик медианного времени $\\tilde{\\tau}_{T2}$ на пертурбации вектора последнего наблюдения $(R, A)$. Позволяет оценить эластичность прогноза по метрикам Reasoning и Agency.',
    tip6:'Проекция 30 стохастических траекторий $C(t)$ из ансамбля. Визуализирует фазовые переходы (смены парадигм), эффекты RSI и влияние эндогенных шоков (схлопывание пузырей, моратории).',
    tip7:'Декомпозиция логарифмического роста $\\int_0^t (k_{hw} + k_{algo} + k_{rsi}) dt$. Площади отражают интегральный вклад аппаратного масштабирования, алгоритмической эффективности, парадигмальных сдвигов и рекурсивной обратной связи (RSI).',
    tip_gap:'Эпистемическая дивергенция между когнитивной мощностью (Reasoning) и каузальным согласованием (World Modeling). Зона высокого риска, где $R(t) \\gg W(t)$, характеризующаяся структурными галлюцинациями.',
    tip8:'Марковская оценка латентной переменной Embodiment. Верхняя панель: перцентильный коридор прогноза $E(t)$ с эмпирической калибровкой на индексе реальной робототехники. Нижняя панель: маргинальное распределение $E_{ceiling}$ в апостериорном ансамбле.',
    ch_t1:'T1: Понимание', ch_t2:'T2: Предсказуемость', ch_t3:'T3: Контроль', ch_t4:'T4: Влияние',
    ch1_xlabel:'Год', ch1_ylabel:'Прогонов',
    ch3_xlabel:'Год', ch3_ylabel:'P(%)', ch3_pt2:'P(T2)', ch3_pt4:'P(T4)',
    ch5_label:'Лет до T4', ch5_colorbar:'Лет до T4', ch5_xaxis:'Agency score', ch5_yaxis:'Reasoning score', ch5_loading:'Вычисление матрицы (асинхронно)...',
    ch7_ylabel:'Суммарный вклад (log FLOPs)',
    ch8_median:'Медиана (MC)', ch8_p1090:'p10..p90', ch8_p2575:'p25..p75', ch8_real:'Реальные роботы', ch8_t4req:'T4 requirement', ch8_bypass:'HW bypass', ch8_y_main:'Embodiment (0..10)', ch8_x_hist:'embodiment_ceiling', ch8_y_hist:'# частиц',
    fY_suffix:' лет', fY_gt:'> 40 лет',
    // About
    // About
    about_title:'Методология модели v4.4',
    about_intro:'Модель v4.4 представляет собой нелинейную динамическую систему, калибруемую на эмпирических данных посредством байесовского фильтра частиц (Bayesian Particle Filter). В отличие от стандартной лог-линейной экстраполяции (Scaling Laws), предполагающей непрерывный экспоненциальный рост, данный подход моделирует насыщение архитектур, рекурсивное самоулучшение (RSI) и макроэкономические барьеры. Преимущество метода заключается в строгом количественном учете эпистемической неопределенности: модель не предсказывает единственный детерминированный исход, а эволюционирует вероятностное облако гипотез $P(\\theta|D)$ по мере поступления новых данных $D$, отсекая маловероятные сценарии.',
    defs_label:'Архитектура и контуры',
    defs_label_arch:'Топология латентного пространства',
    defs_label_contours:'Динамические контуры модели',
    arch_tracker_title:'Байесовский вывод (Particle Filter)',
    arch_tracker_desc:'Ансамбль из N=1000 частиц, где каждая частица $\\theta_i$ — гипотеза о скорости масштабирования и асимптотических пределах. При поступлении вектора наблюдений $y_t$ веса обновляются через гауссово правдоподобие: $w_{t}^{(i)} \\propto w_{t-1}^{(i)} \\prod_j \\exp(-\\frac{1}{2} (y_{j} - \\hat{y}_{j}^{(i)})^2 / \\sigma_j^2)$. Для предотвращения вырождения применяется ESS-ресэмплинг (Effective Sample Size).',
    arch_dims_title:'Четыре базисных вектора',
    arch_dims_desc:'Система разлагается на 4 латентные размерности: Reasoning ($R$), Agency ($A$), World Modeling ($W$) и Embodiment ($E$). Базовая когнитивная емкость определяется как $C = \\sqrt[3]{R \\cdot A \\cdot W}$. Синхронизация $R$ и $W$ критична для подавления галлюцинаций, а преодоление сингулярного барьера (T4) математически невозможно без порогового значения $E$.',
    ch_gap_title: '6. Каузальный разрыв (Hallucination Gap)',
    arch_paradigm_title:'Стохастические сдвиги парадигм',
    arch_paradigm_desc:'Преодоление структурных лимитов архитектуры (например, трансформеров) моделируется как пуассоновский процесс. Интенсивность $\\lambda(t)$ возрастает при насыщении научной метрики $S(t) \\to S_{ceiling}$ и наличии избытка капитала (Compute Overhang). Эффективность каждого последующего сдвига затухает: $M_k = M_0 - k \\cdot \\delta$, отражая усложнение поиска новых архитектур.',
    arch_rsi_title:'Динамика RSI (Recursive Self-Improvement)',
    arch_rsi_desc:'Автономное ускорение R&D активируется сигмоидальными вентилями: $\\sigma(S - S_{th}) \\cdot \\sigma(A - A_{th})$. Скорость генерации алгоритмических улучшений пропорциональна базовому потенциалу $S^{1.5}$, но асимптотически демпфируется параметром координационного трения многоагентных систем. Максимальный теоретический предел ограничен мультипликатором $\\alpha_{rsi}$.',
    arch_bottlenecks_title:'Социотехнические и физические барьеры',
    arch_bottlenecks_desc:'Вектор скорости роста масштабируется набором штрафов $\\Omega(t) = \\prod \\omega_i$. Экономическая стена: экспоненциальный штраф при дивергенции $R - A > 2.0$. Термодинамика: жесткое ограничение $\\frac{d}{dt} \\log(FLOPs) = 0$ при достижении предела Кардашева-0 (Energy Log). Шок управления: пуассоновское торможение $k_{hw}$ при введении регуляторных мораториев.',
    arch_mc_title:'Монте-Карло прогнозирование',
    arch_mc_desc:'Прямое интегрирование SDE (стохастических дифференциальных уравнений) системы в будущее на основе актуального апостериорного распределения. 3000 независимых траекторий до 2068 года позволяют извлечь моменты времени $\\tau_{T1} \\dots \\tau_{T4}$ и построить их доверительные интервалы с учетом всех нелинейных взаимодействий.',
    arch_expert_title:'Эпистемологический симулятор',
    arch_expert_desc:'Интерфейс параметризации априорных распределений $P(\\theta)$. Позволяет исследователям проверять гипотезы о фундаментальной природе интеллекта (выбор априорных вероятностей для парадигм Cascade, Hard Wall, Slow Takeoff) и измерять чувствительность заднего распределения к структурным допущениям о координационном трении и физике атомов.',
    arch_shocks_title:'Экзогенные и эндогенные шоки',
    arch_shocks_desc:'Включает марковские переходы состояний: исчерпание качественных токенов (Data Wall $\\to$ деградация $k_{algo}$), инциденты безопасности (Alignment Incident $\\to$ $\\Delta t$ блокировка масштабирования), и коллапс инвестиционного пузыря (GPU Bubble $\\to$ уничтожение капитала).',
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
    expert_backtest:'📊 Бэктест',
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
    expert_toggle_label:'Expert Sandbox',
    expert_toggle_title:'Свернуть/развернуть панель',
    expert_blkC:'Кризисы и штрафы',
    expert_blkD:'Бенчмарки и наблюдения',
    expert_blkD2:'Test-Time Compute',
    expert_blkD3:'Априорные допущения',
    expert_blkD4:'World Models',
    expert_blkD5:'Симуляция',
    expert_blkE:'Барьеры реальности',
    expert_blkF:'Воплощённость',
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
    // Compute Governance (пред-T2 моратории)
    expert_p_governanceMoratoriumProb:'Compute Governance',
    expert_d_governanceMoratoriumProb:'Доля лет, потерянных на моратории (0.04 = ~1 шок за 25 лет)',
    expert_p_governanceShockDamping:'Демпфирование шока',
    expert_d_governanceShockDamping:'Множитель HW-роста во время моратория (0.5 = в 2 раза медленнее)',
    // Plateau scenario
    expert_p_plateauHardWallCeiling:'Plateau: потолок Agency',
    expert_d_plateauHardWallCeiling:'Потолок agency_ceiling для hard_wall (ниже = жёстче плато)',
    // Наблюдательный шум (per-observation sigma)
    expert_p_observationSigmaMode:'Режим шума наблюдений',
    expert_d_observationSigmaMode:'Global: BENCHMARK_SIGMAS. PerPoint: локальные *_sigma (если заданы).',
    // Embodiment (4-е латентное измерение: физическая воплощённость)
    expert_p_embodimentPriorMean:'Embodiment: prior mean',
    expert_d_embodimentPriorMean:'Априорное среднее embodiment_ceiling (робототехника сложна)',
    expert_p_embodimentBypassThreshold:'Embodiment: bypass threshold',
    expert_d_embodimentBypassThreshold:'Embodiment > порога → ИИ строит дата-центры (HW-рост ×3)',
    expert_p_embodimentT4Requirement:'Embodiment: T4 requirement',
    expert_d_embodimentT4Requirement:'Минимальный embodiment для засчитывания T4 (контроль атомов)',
    // Real robotics prior
    expert_p_realRoboticsWeight:'Real robotics prior weight',
    expert_d_realRoboticsWeight:'Вес prior на embodiment_ceiling от реальных роботов (Spot/Optimus/Figure/1X)',
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
    eh_p1_desc:'Динамическая визуализация распределения времен останова $\\tau_{T_k}$. Каждая орбита соответствует году достижения фазового перехода.',
    eh_p2_desc:'<b>Морфология:</b> Плотность колец аппроксимирует амплитуду функции $p(\\tau)$. Концентрация массы на узком радиусе — консенсус модели; диффузное облако — высокая энтропия прогноза.',
    eh_p3_desc:'<b>Механика:</b> Радиальная задержка старта пропорциональна значению $\\tau_i$. Цвета разделяют топологические барьеры (Желтый=Понимание, Оранжевый=Предсказуемость, Красный=Контроль, Фиолетовый=Влияние).',
    eh_p4_desc:'<b>Физический смысл:</b> Радиальное удаление от центра (2026 год) служит временной шкалой. Асимметрия и кластеризация орбит визуализируют негладкую природу ожидаемого технологического прогресса.',

    eh_play:'Запуск', eh_reset:'Сброс',
    eh_legend_t2:'достигнут', eh_legend_t4:'достигнут', eh_legend_flight:'в полёте',
    v3_variations_label:'(Дисперсия в облаке частиц)',
    v3_no_agi:'Ни одна частица не достигла T2 к 2068 — модель считает T2 маловероятным при текущих параметрах.',

    // Swarm Learning desc card
    swarm_learn_p2: '<b>Режим «Обучение»:</b> последовательное байесовское обновление. При поступлении эмпирических данных бенчмарков $y_t$ веса частиц пересчитываются:',
    swarm_learn_p3: '$$w_i^{(t)} \\propto w_i^{(t-1)} \\cdot \\mathcal{N}(y_t \\mid f(\\theta_i, t), \\Sigma)$$где $f(\\theta_i, t)$ — проекция внутреннего состояния гипотезы на пространство наблюдаемых метрик, а $\\Sigma$ — матрица ковариации шума измерений. Гипотезы с высокой ошибкой экспоненциально теряют вес.',
    swarm_learn_p4: '<b>Режим «Прогноз»:</b> агрегация маргинальных распределений. Слайдер выполняет роль фильтра по моменту остановки $\\tau_{T2}$, отображая долю фазового пространства, достигающую сингулярности к заданному году.',
    swarm_learn_p6: '<b>Анализ чувствительности:</b> Архитектура роя сильно зависит от априорных распределений $\\mathcal{N}(\\mu, \\sigma^2)$, задаваемых в Expert Sandbox, и степени уверенности $\\Sigma$ в эмпирических бенчмарках.',
    live_swarm_p1: 'Параллельная стохастическая проекция четырех фазовых переходов (T1-T4), обновляемая в реальном времени из апостериорного пула гипотез.',
    live_swarm_p2: '<b>Механика:</b> Ансамбль непрерывно ресэмплируется из $P(\\theta \\mid D_{1:t})$. Цвет кодирует фазу (желтый=T1, оранжевый=T2, красный=T3, фиолетовый=T4). Непрозрачность отражает апостериорную вероятность.',
    live_swarm_p3: '<b>Критерии останова:</b> Интегрирование траектории завершается в момент $\\tau = \\inf \\{ t : C(t) \\ge Threshold \\}$. Пороги $Threshold$ логарифмически распределены от 8.0 до 100.0.',
    live_swarm_p4: '<b>Статистика:</b> Формирует робастные оценки ожидаемого времени (Медиана) и интервалов неопределенности (P10-P90) без предположения о нормальности распределения.',
    live_swarm_p5: '<b>Сходимость:</b> Высокая дисперсия (хаотичное мерцание) указывает на бимодальность распределения или недостаток дискриминативной силы текущих бенчмарков.',
    hist_p1: 'Гистограмма маргинального распределения моментов времени $\\tau_{T_k}$. Аппроксимирует плотность вероятности $p(\\tau)$ на горизонте до 2068 года.',
    hist_p2: '<b>Генеративный процесс:</b> Траектория $C(t, \\theta)$ рассчитывается с шагом $\\Delta t = 1/12$ года с учетом пуассоновских сдвигов парадигм и дифференциальной динамики RSI.',
    hist_p3: '<b>Интерпретация:</b> Локальные максимумы (моды) указывают на наиболее вероятные аттракторы. Мультимодальность свидетельствует о наличии конкурирующих макросценариев (например, быстрый взлет vs стагнация).',
    hist_p4: '<b>Управляющие факторы:</b> Сдвиг распределения влево индуцируется высокими значениями метрик в последних наблюдениях или активацией гипотез Cascade в апостериоре.',
    cum_p1: 'Функция $F(t) = \\int_0^t p(\\tau) d\\tau$. Оценивает накопленную вероятность наступления фазовых переходов к моменту времени $t$.',
    cum_p2: '<b>Расчет:</b> Для ансамбля из $N=3000$ траекторий функция строится как ступенчатая эмпирическая CDF: $\\hat{F}(t) = \\frac{1}{N} \\sum_{i=1}^N \\mathbb{I}(\\tau_i \\le t)$.',
    cum_p3: '<b>Градиент кривой:</b> Производная $dF/dt$ отражает интенсивность риска в данном десятилетии. Плато (где $dF/dt \\approx 0$) маркируют периоды доминирования физических или координационных барьеров.',
    cum_p4: '<b>Коинтеграция стадий:</b> Расстояние между интегральными кривыми T2 и T4 описывает окно «Takeoff time» — время между достижением AGI и цивилизационным фазовым переходом.',
    cum_p5: '<b>Применение:</b> Оптимальный инструмент для риск-менеджмента, позволяющий извлекать метрики вида "Шанс 95% достижения AGI к году X".',
    sens_p1: 'Тепловая карта апостериорного математического ожидания $\\mathbb{E}[\\tau_{T2} \\mid (R_{obs}, A_{obs})]$. Исследует градиент модели в окрестности текущего состояния.',
    sens_p2: '<b>Протокол:</b> Сетка наблюдений (SweBench $\\times$ ArcAGI). Для каждого узла $(i,j)$ синтезируется фиктивное наблюдение $y_{T}$, проводится локальный цикл байесовского обновления и извлекается медиана $\\tilde{\\tau}$.',
    sens_p3: '<b>Топология градиента:</b> Вектор нормали к изоклинам карты указывает направление максимального ускорения прогноза.',
    sens_li1: 'Вертикальный градиент: прогноз чувствителен преимущественно к когнитивной емкости (Reasoning).',
    sens_li2: 'Горизонтальный градиент: лимитирующим фактором выступает агентность (Agency).',
    sens_li3: 'Диагональный градиент: симметричная зависимость от обоих базисов.',
    sens_p4: '<b>Анализ:</b> Позволяет выявить нелинейности — зоны, где маргинальное улучшение бенчмарков ведет к экспоненциальному схлопыванию времени до сингулярности.',
    fan_p1: 'Стохастический веер траекторий $C(t)$. Наложение $K=30$ реализаций процесса из апостериорного распределения на логарифмической шкале.',
    fan_p2: '<b>Динамика:</b> Каждая траектория интегрирует систему связанных дифференциальных уравнений, где $d(\\log FLOPs)$ и $d(\\log Algo)$ зависят от текущего зазора $R - A$ и отдачи на капитал.',
    fan_p3: '<b>Морфология:</b> Гладкие экспоненты прерываются дискретными скачками (парадигмы) и изломами (насыщение данных, регуляторные шоки). Горизонтальные асимптоты — пороги T1-T4.',
    fan_p4: '<b>Структурная неопределенность:</b> Дисперсия пучка траекторий в момент $t$ напрямую характеризует степень неопределенности системы. Расхождение пучков отражает точку бифуркации.',
    decomp_p1: 'Аддитивная декомпозиция логарифмической производительности системы на фундаментальные драйверы.',
    decomp_p2: '<b>Компоненты $d\\log C(t)$:</b>',
    decomp_p3: '<b>Синтез:</b> Переход от доминирования "Hardware" (экзогенный рост) к "Algorithms" и, наконец, к экспоненциальному взрыву "RSI" визуализирует механизм эндогенного сингулярного взлета.',
    emb_p1: '<b>Воплощенность (Embodiment, $E$)</b> — четвертый базис, квантифицирующий физическую способность системы изменять распределение атомов. T4 невозможен без $E \\ge E_{crit}$.',
    emb_p2: '<b>Верхняя панель:</b> Эволюция $E(t)$. Желтые маркеры — априорная калибровка на эмпирических данных (Boston Dynamics, Tesla Optimus, Figure). Зеленая линия (Bypass) — порог автопоэзиса, при котором ИИ начинает автономно расширять аппаратную базу, ускоряя HW рост в 3 раза.',
    emb_p3: '<b>Нижняя панель:</b> Маргинальное распределение параметра $E_{ceiling}$ (асимптотического предела воплощенности) в ансамбле частиц.',
    emb_p4: '<b>Регуляризация:</b> Вес `realRoboticsWeight` определяет штраф функции правдоподобия за дивергенцию прогноза $E(t)$ от наблюдаемой индустриальной траектории робототехники.',
    swarm_learn_p1:'Интерактивная визуализация 2D-проекции латентного пространства. Каждая точка — вектор гипотезы $\\theta_i$: по оси X — производная аппаратного роста $\\frac{d}{dt} HW$, по оси Y — асимптотический предел $\\lim_{t \\to \\infty} A(t)$.',
    swarm_learn_p5:'<b>Визуальный язык:</b> Цветовое кодирование отражает дискретную компоненту гипотезы (World Model): Синий = Paradigm Cascade, Красный = Hard Wall, Зеленый = Slow Takeoff. Радиус точки пропорционален весу $w_i$.',
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
    // Expert presets
    preset_default:'Базовый (Байес)', preset_optimist:'Оптимист (Скейлинг)', preset_skeptic:'Скептик (Медленный старт)', preset_pessimist:'Пессимист (Стена)',
    // Data panel
    data_panel_year:'Год', data_panel_event:'Модель', data_panel_source:'Источники',
    data_panel_loading:'Данные загружаются...',
    // v3 params panel
    v3_params_title:'Параметры симуляции', v3_no_t4:'T4 не достигнут ни одной частицей к 2068',
  },
  en: {
    // Header
    hdr_title:'Singularity Forecaster', hdr_sub:'v4.4 — Four Stages of Dissolution',
    // Status bar
    sb_t1:'Median T1 (Understanding)', sb_t2:'Median T2 (Predictability)',
    sb_t3:'Median T3 (Control)', sb_t4:'Median T4 (Influence)',
    sb_pagi_2029:'P(T2 · 2029)', sb_pagi_2033:'P(T2 · 2033)', sb_pagi_2040:'P(T2 · 2040)',
    sb_pasi_2035:'P(T4 · 2035)', sb_pasi_2045:'P(T4 · 2045)',
    sb_hw:'HW Doubling', sb_algo:'Algo Doubling', sb_agency:'Agency Ceiling', sb_ess:'ESS',
    // Controls
    ctrl_simulations:'Simulations (N)', ctrl_obs_year:'Observation Year',
    ctrl_intelligence:'Reasoning', ctrl_agentic:'Agency',
    ctrl_add:'Add', ctrl_reset:'Reset',
    ctrl_swe_bench:'SWE-bench (%)', ctrl_arc_agi:'ARC-AGI (%)',
    ctrl_horizon:'Autonomy (hours)', ctrl_cost:'Cost per 1M tokens ($)',
    run_btn:'Run Simulation',
    // Charts
    tag1:'Probabilistic Analysis', tag3:'Cumulative',
    tag5:'Sensitivity', tag6:'Scenarios', tag7:'Decomposition', tag8:'Embodiment',
    chart1:'1. Four Stages of Singularity Distribution (Monte Carlo)',
    chart3:'2. Cumulative Probability (CDF)',
    chart5:'3. Sensitivity Heatmap (Reasoning × Agency)',
    chart6:'4. Scenario Fan (Multi-Run Overlay)',
    chart7:'5. Component Decomposition (Stacked Area)',
    chart_gap:'6. Causal Gap (Hallucination Gap)',
    chart8:'7. Embodiment: distribution and real-world robotics',
    tip1:'Probability Density Function (PDF) approximation of stopping times $\\tau = \\inf \\{t : C(t) \\ge C_{crit}\\}$. Computed via Monte Carlo integration (N=3000) over the posterior particle ensemble.',
    tip3:'Empirical Cumulative Distribution Function (CDF), $F(t) = P(T \\le t)$. Represents the monotonically increasing probability of passing T2 and T4 stages by a given year, accounting for all uncertainties.',
    tip5:'Sensitivity Heatmap. Demonstrates the non-linear response of median time $\\tilde{\\tau}_{T2}$ to perturbations in the latest observation vector $(R, A)$. Assesses forecast elasticity to Reasoning and Agency metrics.',
    tip6:'Projection of 30 stochastic trajectories $C(t)$ from the ensemble. Visualizes phase transitions (paradigm shifts), RSI feedback loops, and endogenous shocks (bubble bursts, moratoriums).',
    tip7:'Log-space decomposition $\\int_0^t (k_{hw} + k_{algo} + k_{rsi}) dt$. Areas represent the integral contribution of hardware scaling, algorithmic efficiency, paradigm shifts, and recursive feedback (RSI).',
    tip_gap:'Epistemic divergence between cognitive capacity (Reasoning) and causal grounding (World Modeling). A high-risk zone where $R(t) \\gg W(t)$, characterized by structural hallucinations.',
    tip8:'Markov estimation of the Embodiment latent variable. Top: percentile corridor of $E(t)$ calibrated against empirical robotic indices. Bottom: marginal posterior distribution of the $E_{ceiling}$ parameter.',
    ch_t1:'T1: Understanding', ch_t2:'T2: Predictability', ch_t3:'T3: Control', ch_t4:'T4: Influence',
    ch1_xlabel:'Year', ch1_ylabel:'Runs',
    ch3_xlabel:'Year', ch3_ylabel:'P(%)', ch3_pt2:'P(T2)', ch3_pt4:'P(T4)',
    ch5_label:'Years to T4', ch5_colorbar:'Years to T4', ch5_xaxis:'Agency score', ch5_yaxis:'Reasoning score', ch5_loading:'Computing matrix (async)...',
    ch7_ylabel:'Cumulative contribution (log FLOPs)',
    ch8_median:'Median (MC)', ch8_p1090:'p10..p90', ch8_p2575:'p25..p75', ch8_real:'Real robots', ch8_t4req:'T4 requirement', ch8_bypass:'HW bypass', ch8_y_main:'Embodiment (0..10)', ch8_x_hist:'embodiment_ceiling', ch8_y_hist:'# particles',
    fY_suffix:' yrs', fY_gt:'> 40 yrs',
    // About
    about_title:'v4.4 Methodology',
    about_intro:'Model v4.4 is a non-linear dynamical system calibrated on empirical data using a Bayesian Particle Filter. Unlike standard log-linear extrapolation (Scaling Laws) which assumes continuous exponential growth, this approach models architecture saturation, recursive self-improvement (RSI), and macroeconomic barriers. The method\'s primary advantage lies in rigorous quantification of epistemic uncertainty: rather than predicting a single deterministic outcome, it evolves a probabilistic cloud of hypotheses $P(\\theta|D)$ as new benchmark data $D$ arrives, pruning unlikely scenarios.',
    defs_label:'Architecture and Contours',
    defs_label_arch:'Latent Space Topology',
    defs_label_contours:'Dynamic Contours of the Model',
    arch_tracker_title:'Bayesian Inference (Particle Filter)',
    arch_tracker_desc:'An ensemble of N=1000 particles, where each $\\theta_i$ is a hypothesis about scaling rates and asymptotic limits. Upon receiving an observation vector $y_t$, weights update via Gaussian likelihood: $w_{t}^{(i)} \\propto w_{t-1}^{(i)} \\prod_j \\exp(-\\frac{1}{2} (y_{j} - \\hat{y}_{j}^{(i)})^2 / \\sigma_j^2)$. ESS (Effective Sample Size) resampling prevents degeneracy.',
    arch_dims_title:'Four Basis Vectors',
    arch_dims_desc:'The system decomposes into 4 latent dimensions: Reasoning ($R$), Agency ($A$), World Modeling ($W$), and Embodiment ($E$). Base cognitive capacity is defined as $C = \\sqrt[3]{R \\cdot A \\cdot W}$. Synchronization of $R$ and $W$ is critical for suppressing hallucinations, and crossing the T4 singular barrier is mathematically impossible without a threshold $E$.',
    ch_gap_title: '6. Causal Gap (Hallucination Gap)',
    arch_paradigm_title:'Stochastic Paradigm Shifts',
    arch_paradigm_desc:'Overcoming structural architecture limits (e.g., Transformers) is modeled as a Poisson process. Intensity $\\lambda(t)$ increases upon saturation of the scientific metric $S(t) \\to S_{ceiling}$ and capital surplus (Compute Overhang). The efficacy of subsequent shifts decays: $M_k = M_0 - k \\cdot \\delta$, reflecting the increasing difficulty of finding novel architectures.',
    arch_rsi_title:'RSI Dynamics (Recursive Self-Improvement)',
    arch_rsi_desc:'Autonomous R&D acceleration is gated by sigmoids: $\\sigma(S - S_{th}) \\cdot \\sigma(A - A_{th})$. The generation rate of algorithmic improvements is proportional to base potential $S^{1.5}$, asymptotically damped by coordination friction in multi-agent systems. The theoretical maximum is bounded by the multiplier $\\alpha_{rsi}$.',
    arch_bottlenecks_title:'Sociotechnical and Physical Barriers',
    arch_bottlenecks_desc:'The velocity vector is scaled by a set of penalties $\\Omega(t) = \\prod \\omega_i$. Economic wall: exponential penalty when divergence $R - A > 2.0$. Thermodynamics: hard limit $\\frac{d}{dt} \\log(FLOPs) = 0$ upon reaching Kardashev-0 (Energy Log). Governance shock: Poisson damping of $k_{hw}$ due to regulatory moratoriums.',
    arch_mc_title:'Monte Carlo Forecasting',
    arch_mc_desc:'Forward integration of system SDEs (Stochastic Differential Equations) based on the current posterior distribution. 3000 independent trajectories up to 2068 allow extraction of stopping times $\\tau_{T1} \\dots \\tau_{T4}$ and construction of confidence intervals, fully accounting for non-linear interactions.',
    arch_expert_title:'Epistemological Simulator',
    arch_expert_desc:'An interface for parameterizing prior distributions $P(\\theta)$. Allows researchers to test hypotheses about the fundamental nature of intelligence (prior weights for Cascade, Hard Wall, Slow Takeoff) and measure posterior sensitivity to structural assumptions regarding coordination friction and atomic physics.',
    arch_shocks_title:'Exogenous and Endogenous Shocks',
    arch_shocks_desc:'Includes Markov state transitions: depletion of high-quality tokens (Data Wall $\\to$ $k_{algo}$ degradation), safety incidents (Alignment Incident $\\to$ $\\Delta t$ scaling freeze), and investment bubble collapse (GPU Bubble $\\to$ capital destruction).',
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
    expert_backtest:'📊 Backtest',
    // Category 7: Simulation Parameters
    expert_cat7:'Simulation & Benchmarks',
    expert_p_simulations:'Simulations (N)',
    expert_d_simulations:'Number of Monte Carlo runs (500-10000)',
    expert_p_arc_agi:'ARC-AGI (%)',
    expert_d_arc_agi:'Current ARC-AGI level for observations',
    expert_p_horizon:'Autonomy (hours)',
    expert_d_horizon:'Autonomy horizon for current benchmarks',
    // Block headers
    expert_blkA:'Paradigms and Ceilings',
    expert_blkA2:'Paradigm Shifts',
    expert_toggle_label:'Expert Sandbox',
    expert_toggle_title:'Collapse/Expand panel',
    expert_blkB:'Self-Improvement (RSI)',
    expert_blkB2:'Hardware',
    expert_blkC:'Crises & Penalties',
    expert_blkD:'Benchmarks & Observations',
    expert_blkD2:'Test-Time Compute',
    expert_blkD3:'Philosophical Priors',
    expert_blkD4:'World Models',
    expert_blkD5:'Simulation',
    expert_blkE:'Reality Barriers',
    expert_blkF:'Embodiment',
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
    // Compute Governance (pre-T2 moratoriums)
    expert_p_governanceMoratoriumProb:'Compute Governance',
    expert_d_governanceMoratoriumProb:'Fraction of years lost to moratoriums (0.04 = ~1 shock per 25 years)',
    expert_p_governanceShockDamping:'Shock damping',
    expert_d_governanceShockDamping:'HW growth multiplier during moratorium (0.5 = 2x slower)',
    // Plateau scenario
    expert_p_plateauHardWallCeiling:'Plateau: Agency ceiling',
    expert_d_plateauHardWallCeiling:'agency_ceiling cap for hard_wall particles (lower = harder plateau)',
    // Observation noise mode
    expert_p_observationSigmaMode:'Observation noise mode',
    expert_d_observationSigmaMode:'Global: BENCHMARK_SIGMAS. PerPoint: local *_sigma (when present).',
    // Embodiment (4th latent dim: physical embodiment)
    expert_p_embodimentPriorMean:'Embodiment: prior mean',
    expert_d_embodimentPriorMean:'Prior mean of embodiment_ceiling (robotics is hard)',
    expert_p_embodimentBypassThreshold:'Embodiment: bypass threshold',
    expert_d_embodimentBypassThreshold:'Embodiment > threshold → AI builds its own data centers (HW growth ×3)',
    expert_p_embodimentT4Requirement:'Embodiment: T4 requirement',
    expert_d_embodimentT4Requirement:'Minimum embodiment for T4 to count (control of atoms)',
    // Real robotics prior
    expert_p_realRoboticsWeight:'Real robotics prior weight',
    expert_d_realRoboticsWeight:'Weight of prior on embodiment_ceiling from real robots (Spot/Optimus/Figure/1X)',
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
    swarm_learn_p1:'Interactive visualization of the latent space 2D projection. Each point is a hypothesis vector $\\theta_i$: X-axis is the hardware growth derivative $\\frac{d}{dt} HW$, Y-axis is the asymptotic limit $\\lim_{t \\to \\infty} A(t)$.',
    swarm_learn_p2:'<b>"Learning" Mode:</b> Sequential Bayesian updating. When empirical benchmark data $y_t$ arrives, particle weights are recalculated:',
    swarm_learn_p3:'$$w_i^{(t)} \\propto w_i^{(t-1)} \\cdot \\mathcal{N}(y_t \\mid f(\\theta_i, t), \\Sigma)$$where $f(\\theta_i, t)$ projects the hypothesis internal state onto the observable metric space, and $\\Sigma$ is the measurement noise covariance matrix.',
    swarm_learn_p4:'<b>"Forecast" Mode:</b> Aggregation of marginal distributions. The slider acts as a filter on the stopping time $\\tau_{T2}$, showing the fraction of the phase space reaching singularity by a given year.',
    swarm_learn_p5:'<b>Visual Language:</b> Color encoding reflects the discrete World Model component: Blue = Paradigm Cascade, Red = Hard Wall, Green = Slow Takeoff. Radius is proportional to weight $w_i$.',
    swarm_learn_p6:'<b>Sensitivity Analysis:</b> Swarm topology heavily depends on the priors $\\mathcal{N}(\\mu, \\sigma^2)$ set in the Expert Sandbox and the confidence matrix $\\Sigma$ of empirical benchmarks.',
    // Live Swarm desc card
    live_swarm_p1:'Parallel stochastic projection of four phase transitions (T1-T4), updated in real-time from the posterior hypothesis pool.',
    live_swarm_p2:'<b>Mechanics:</b> The ensemble is continuously resampled from $P(\\theta \\mid D_{1:t})$. Color encodes phase (Yellow=T1, Orange=T2, Red=T3, Purple=T4). Opacity reflects posterior probability.',
    live_swarm_p3:'<b>Stopping Criteria:</b> Trajectory integration terminates at $\\tau = \\inf \\{ t : C(t) \\ge Threshold \\}$. Thresholds scale logarithmically from 8.0 to 100.0.',
    live_swarm_p4:'<b>Statistics:</b> Provides robust estimates of expected time (Median) and uncertainty intervals (P10-P90) without assuming normal distribution.',
    live_swarm_p5:'<b>Convergence:</b> High variance (chaotic flickering) indicates bimodality or insufficient discriminative power in current benchmarks.',
    // Histogram desc
    hist_p1:'Histogram of the marginal stopping time distribution $\\tau_{T_k}$. Approximates the probability density function $p(\\tau)$ up to the year 2068.',
    hist_p2:'<b>Generative Process:</b> Trajectory $C(t, \\theta)$ is calculated with a $\\Delta t = 1/12$ step, accounting for Poisson paradigm shifts and differential RSI dynamics.',
    hist_p3:'<b>Interpretation:</b> Local maxima (modes) indicate highly probable attractors. Multimodality implies competing macro-scenarios (e.g., rapid takeoff vs stagnation).',
    hist_p4:'<b>Control Factors:</b> A leftward distribution shift is induced by high metrics in recent observations or posterior dominance of Cascade hypotheses.',
    // Cumulative desc
    cum_p1:'Function $F(t) = \\int_0^t p(\\tau) d\\tau$. Estimates the cumulative probability of phase transitions occurring by time $t$.',
    cum_p2:'<b>Computation:</b> For an ensemble of $N=3000$ trajectories, constructed as a stepped empirical CDF: $\\hat{F}(t) = \\frac{1}{N} \\sum_{i=1}^N \\mathbb{I}(\\tau_i \\le t)$.',
    cum_p3:'<b>Curve Gradient:</b> Derivative $dF/dt$ reflects risk intensity per decade. Plateaus ($dF/dt \\approx 0$) mark periods dominated by physical or coordination barriers.',
    cum_p4:'<b>Stage Cointegration:</b> The delta between T2 and T4 integral curves describes the "Takeoff time" window — from AGI to civilizational phase transition.',
    cum_p5:'<b>Application:</b> Optimal for risk management, extracting metrics like "95% confidence of reaching AGI by year X".',
    // Sensitivity desc
    sens_p1:'Heatmap of the posterior expectation $\\mathbb{E}[\\tau_{T2} \\mid (R_{obs}, A_{obs})]$. Explores the model gradient in the vicinity of the current state.',
    sens_p2:'<b>Protocol:</b> Grid of observations (SweBench $\\times$ ArcAGI). For each node $(i,j)$, a fictitious observation $y_{T}$ is synthesized, a local Bayesian update cycle is run, and median $\\tilde{\\tau}$ is extracted.',
    sens_p3:'<b>Gradient Topology:</b> Normal vector to the isoclines indicates the direction of maximum forecast acceleration.',
    sens_li1:'Vertical gradient: highly sensitive primarily to cognitive capacity (Reasoning).',
    sens_li2:'Horizontal gradient: Agency is the dominant limiting factor.',
    sens_li3:'Diagonal gradient: symmetric dependency on both bases.',
    sens_p4:'<b>Analysis:</b> Reveals non-linearities — zones where marginal benchmark improvements cause exponential collapse in time-to-singularity.',
    // Fan desc
    fan_p1:'Stochastic fan of trajectories $C(t)$. Overlay of $K=30$ process realizations from the posterior distribution on a logarithmic scale.',
    fan_p2:'<b>Dynamics:</b> Each path integrates coupled differential equations where $d(\\log FLOPs)$ and $d(\\log Algo)$ depend on the current gap $R - A$ and capital returns.',
    fan_p3:'<b>Morphology:</b> Smooth exponentials are interrupted by discrete jumps (paradigms) and kinks (data saturation, regulatory shocks). Horizontal asymptotes are T1-T4 thresholds.',
    fan_p4:'<b>Structural Uncertainty:</b> Beam dispersion at time $t$ directly quantifies system uncertainty. Beam divergence marks bifurcation points.',
    // Decomposition desc
    decomp_p1:'Additive decomposition of logarithmic system performance into fundamental drivers.',
    decomp_p2:'<b>Components of $d\\log C(t)$:</b>',
    decomp_p3:'<b>Synthesis:</b> The transition from "Hardware" dominance (exogenous growth) to "Algorithms" and finally the exponential "RSI" explosion visualizes the mechanics of endogenous singular takeoff.',
    // Embodiment desc
    emb_p1:'<b>Embodiment ($E$)</b> — the fourth basis, quantifying physical capability to alter atomic distribution. T4 is impossible without $E \\ge E_{crit}$.',
    emb_p2:'<b>Top Panel:</b> $E(t)$ evolution. Yellow markers are prior calibration on empirical data (Boston Dynamics, Optimus, Figure). Green line (Bypass) is the autopoiesis threshold where AI autonomously expands hardware, accelerating HW growth $\\times 3$.',
    emb_p3:'<b>Bottom Panel:</b> Marginal distribution of the $E_{ceiling}$ parameter within the particle ensemble.',
    emb_p4:'<b>Regularization:</b> `realRoboticsWeight` defines the likelihood penalty for divergence of $E(t)$ forecast from the observed industrial robotics trajectory.',
    // Event Horizon desc
    eh_p1:'Animated visualization of the T2/T4 distribution. Each particle = one MC run. Flies from the center (2026) and freezes on the orbit of its T2/T4 year.',
    eh_p2:'<b>Metaphor:</b> dense rings = high probability (many particles predict AGI in that year). Rare dots = unlikely scenarios.',
    eh_p3:'<b>Mechanics:</b> on launch, particles &quot;take off&quot; from the center with a delay proportional to their T2/T4 year. Orbit colors encode the stages. Distance from center = particle weight.',
    eh_p4:'<b>What affects it:</b> T2/T4 year distribution from posterior, MC run randomness. Symmetric sphere = one clear peak. Fractal structure = many competing scenarios.',
    eh_p1_desc:'Dynamic visualization of stopping time distributions $\\tau_{T_k}$. Each orbit corresponds to the year of a phase transition.',
    eh_p2_desc:'<b>Morphology:</b> Ring density approximates the $p(\\tau)$ amplitude. Mass concentration on a narrow radius indicates model consensus; a diffuse cloud implies high forecast entropy.',
    eh_p3_desc:'<b>Mechanics:</b> Radial launch delay is proportional to $\\tau_i$. Colors separate topological barriers (Yellow=Understanding, Orange=Predictability, Red=Control, Purple=Influence).',
    eh_p4_desc:'<b>Physical Meaning:</b> Radial distance from the center (year 2026) serves as the temporal scale. Orbit asymmetry and clustering visualize the non-smooth nature of anticipated technological progress.',

    eh_play:'Play', eh_reset:'Reset',
    eh_legend_t2:'reached', eh_legend_t4:'reached', eh_legend_flight:'in flight',
    v3_variations_label:'(Variance in particle cloud)',
    v3_no_agi:'No particle reached T2 by 2068 — the model considers T2 unlikely with the current parameters.',
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
    // Expert presets
    preset_default:'Default (Bayesian)', preset_optimist:'Optimist (Scaling)', preset_skeptic:'Skeptic (Slow Takeoff)', preset_pessimist:'Pessimist (Hard Wall)',
    // v3 params panel
    v3_params_title:'Simulation Parameters', v3_no_t4:'No T4 by 2068 in any particle',
    // Footer / misc
    footer_note_en:'Data is estimated',
  }
};

// ===== PARTICLE SWARM ANIMATION =====
// ===== PARTICLE SWARM v3 =====

// ============================================================================
// 8. VISUALIZATION (Canvas: Swarm & Event Horizon)
// ============================================================================

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
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  c.width = c.offsetWidth * dpr; c.height = c.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
  swarm.tracker = swarmBuildTracker(swarm.obsIdx);
  swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months, wm: p.world_model }));
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
    // Use the same tracker as the main forecast (coreTracker), fallback to full AA data
    if (typeof coreTracker !== 'undefined' && coreTracker) {
      swarm.tracker = coreTracker;
    } else if (typeof v3GetTracker === 'function') {
      swarm.tracker = getTracker();
    } else {
      swarm.tracker = swarmBuildTracker(REAL_BENCHMARK_HISTORY.length);
    }
    swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months, wm: p.world_model }));
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
    swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months, wm: p.world_model }));
    swarm.weights = Array.from(swarm.tracker.weights);
    if (slider) { slider.min = 0; slider.max = REAL_BENCHMARK_HISTORY.length; slider.step = 1; slider.value = swarm.obsIdx; }
    if (labels) labels.innerHTML = '<span>2020</span><span></span><span>2024</span><span></span><span>2025</span><span></span><span>2026</span><span>2026.5</span>';
    // Show play button in learn mode
    const playBtn = document.getElementById('swarmPlayBtn');
    if (playBtn) playBtn.style.display = '';
  }
  swarmDraw();
}

function swarmOnSlider(v) {
  v = +v;
  if (swarm.mode === 'learn') {
    swarm.obsIdx = v;
    swarm.tracker = swarmBuildTracker(v);
    swarm.weights = Array.from(swarm.tracker.weights);
    swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months, wm: p.world_model }));
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

  // Границы латентного пространства для отрисовки
  const xMin = 2, xMax = 14;   // Удвоение HW (месяцы)
  const yMin = 1, yMax = 17;   // Потолок Agency

  function getX(val) { return pad + Math.max(0, Math.min(1, (val - xMin) / (xMax - xMin))) * pw; }
  function getY(val) { return h - pad - Math.max(0, Math.min(1, (val - yMin) / (yMax - yMin))) * ph; }

  // Отрисовка частиц
  for (let i = 0; i < swarm.particles.length; i++) {
    const p = swarm.particles[i];
    const wNorm = swarm.weights[i] / maxW;
    if (wNorm < 0.01) continue; // Скрываем мертвые гипотезы

    // Цвета World Models: Cascade (Синий), Hard Wall (Красный), Slow Takeoff (Зеленый)
    let r = 88, g = 166, b = 255; 
    if (p.wm === 'hard_wall') { r = 239; g = 68; b = 68; } 
    else if (p.wm === 'slow_takeoff') { r = 34; g = 197; b = 94; }

    const alpha = Math.min(1, wNorm * 1.5 + 0.1);
    const radius = 1.5 + wNorm * 4;

    ctx.beginPath();
    ctx.arc(getX(p.x), getY(p.y), radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fill();
  }

  // Расчет и отрисовка медианы роя
  const sortedX = [...swarm.particles].map((p, i) => ({ v: p.x, w: swarm.weights[i] })).sort((a, b) => a.v - b.v);
  const sortedY = [...swarm.particles].map((p, i) => ({ v: p.y, w: swarm.weights[i] })).sort((a, b) => a.v - b.v);
  const getMed = (arr) => { let cum = 0; for(let o of arr){ cum+=o.w; if(cum>=0.5) return o.v; } return arr[arr.length-1].v; };
  const medX = getMed(sortedX), medY = getMed(sortedY);

  ctx.strokeStyle = '#f0883e'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(getX(medX), getY(medY), 5, 0, Math.PI * 2); ctx.stroke();

  // Оформление осей и сетки
  const t = LANG[window._lang || 'ru'];
  ctx.fillStyle = '#f0883e'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'left';
  ctx.fillText(t.swarm_canvas_median || 'Median', getX(medX) + 8, getY(medY) + 3);

  ctx.fillStyle = '#666680'; ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.fillText(t.canvas_hw_doubling, w / 2, h - 8);
  ctx.save(); ctx.translate(12, h / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText(t.canvas_agency_ceiling, 0, 0); ctx.restore();

  ctx.font = '9px JetBrains Mono, monospace'; ctx.fillStyle = '#444460';
  for (let i = 0; i <= 5; i++) {
     const valX = xMin + (xMax - xMin) * i / 5;
     ctx.fillText(valX.toFixed(1), pad + (pw * i / 5), h - pad + 12);
     const valY = yMin + (yMax - yMin) * i / 5;
     ctx.textAlign = 'right';
     ctx.fillText(valY.toFixed(1), pad - 4, h - pad - (ph * i / 5) + 3);
  }
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
      leg.innerHTML = `<span style="color:#58a6ff">●</span> Cascade &nbsp; <span style="color:#ef4444">●</span> Hard Wall &nbsp; <span style="color:#22c55e">●</span> Slow Takeoff &nbsp; <span style="color:#f0883e">○</span> ${L.swarm_canvas_legend_median}`;
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
      swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months, wm: p.world_model }));
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
      swarm.particles = swarm.tracker.particles.map(p => ({ x: p.hw_months, y: p.agency_ceiling, algo: p.algo_months, wm: p.world_model }));
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
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * dpr; c.height = c.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
  });

  // Use same tracker as main forecast
  if (typeof coreTracker !== 'undefined' && coreTracker) {
    liveSwarm.tracker = coreTracker;
  } else if (typeof v3GetTracker === 'function') {
    liveSwarm.tracker = getTracker();
  } else {
    liveSwarm.tracker = swarmBuildTracker(REAL_BENCHMARK_HISTORY.length);
  }
  liveSwarmTickAll();
}

function drawLiveSwarm(canvasId, statsId, yearsKey, colorKey, mc) {
  const c = document.getElementById(canvasId);
  if (!c || !liveSwarm.tracker) return;
  const ctx = c.getContext('2d');
  if (!ctx) return;
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
  if (!ctx) return;
  ctx.scale(dpr, dpr);
}

function ehDraw() {
  const c = document.getElementById('eventHorizonCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  if (!ctx) return;
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
  const tracker = (liveSwarm && liveSwarm.tracker) || (typeof coreTracker !== 'undefined' ? coreTracker : null);
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
  try {
    setLang('ru');
    injectExpertPresets();

    // Показываем оверлей загрузки
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.classList.add('show');
      const textEl = document.getElementById('overlayText');
      if (textEl) textEl.textContent = 'Загрузка исторических бенчмарков...';
    }

    // [FIX] Даём браузеру 50мс на отрисовку оверлея перед блокировкой потока
    await new Promise(r => setTimeout(r, 50));

    // [FIX] Обязательно ДОЖИДАЕМСЯ загрузки данных ПЕРЕД запуском симуляции!
    await loadHistoricalBenchmarks();

    // Инициализируем UI и канвасы (теперь REAL_BENCHMARK_HISTORY гарантированно заполнен)
    swarmInit();
    ehInitCanvas();
    ehDraw();

    const tracker = getTracker();
    updateTrackerUI(tracker);
    renderDataPanel();

    // Live Swarm
    if (typeof liveSwarm !== 'undefined') {
      liveSwarm.tracker = coreTracker;
      liveSwarmInit();
    }

    // Запускаем симуляцию (она скроет оверлей по завершении)
    await runSimulation();
  } catch (err) {
    console.error("Initialization failed:", err);
  } finally {
    // ЖЕЛЕЗНАЯ ГАРАНТИЯ: если что-то пошло не так, мы всё равно снимаем экран загрузки
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('show');
  }
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


// ============================================================================
// 9. EXPERT SANDBOX & PRESETS
// ============================================================================

function toggleExpertPanel() {
  const panel = document.getElementById('expertPanel');
  if (!panel) return;
  const arrow = document.getElementById('expertArrow');

  if (panel.classList.contains('collapsed')) {
    panel.classList.remove('collapsed');
    if (arrow) arrow.classList.add('open');
    requestAnimationFrame(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  } else {
    panel.classList.add('collapsed');
    if (arrow) arrow.classList.remove('open');
  }
}

function expertUpdate(key, value) {
  // String values (e.g. observationSigmaMode) skip numeric parsing
  if (typeof value === 'string' && isNaN(parseFloat(value))) {
    EXPERT_CONFIG[key] = value;
    return; // [FIX] Убрана live-мутация трекера, ждем Apply & Restart
  }
  value = parseFloat(value);
  EXPERT_CONFIG[key] = value; // [FIX] Убрана live-мутация трекера, ждем Apply & Restart
  
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

// Универсальная синхронизация UI с текущим объектом EXPERT_CONFIG
function syncExpertUIToConfig() {
  for (const [key, val] of Object.entries(EXPERT_CONFIG)) {
    if (key === 'worldModels') continue;
    const inputEl = document.getElementById('e-' + key);
    const valEl = document.getElementById('ev-' + key);
    if (inputEl) {
      if (inputEl.tagName === 'SELECT') inputEl.value = val;
      else inputEl.value = val;
    }
    if (valEl) {
      valEl.textContent = (typeof val === 'number' && val % 1 !== 0) ? val.toFixed(2) : val;
    }
  }

  // Обновляем ползунки World Models
  const wms = EXPERT_CONFIG.worldModels;
  const wmCascade = Math.round(wms.cascade * 100);
  const wmHardWall = Math.round(wms.hardWall * 100);
  const wmSlowTakeoff = Math.round(wms.slowTakeoff * 100);
  
  if (document.getElementById('e-world-cascade')) {
    document.getElementById('e-world-cascade').value = wmCascade;
    document.getElementById('e-world-hardWall').value = wmHardWall;
    document.getElementById('e-world-slowTakeoff').value = wmSlowTakeoff;
    document.getElementById('ew-cascade').textContent = wmCascade + '%';
    document.getElementById('ew-hardWall').textContent = wmHardWall + '%';
    document.getElementById('ew-slowTakeoff').textContent = wmSlowTakeoff + '%';
  }
}

// Применение конкретного сценария будущего
function applyExpertPreset(type) {
  // Сначала откатываемся к базе
  Object.assign(EXPERT_CONFIG, JSON.parse(JSON.stringify(DEFAULT_EXPERT_CONFIG)));
  
  if (type === 'optimist') {
    // OpenAI scale: быстрый RSI, долгий хайп, каскады сменяются легко
    EXPERT_CONFIG.worldModels = { cascade: 0.80, hardWall: 0.10, slowTakeoff: 0.10 };
    EXPERT_CONFIG.ceilingReasoningBase = 20.0;
    EXPERT_CONFIG.rsiMultiplier = 1.5;
    EXPERT_CONFIG.paradigmDecayRate = 0.2;
    EXPERT_CONFIG.barrierAtomsLimit = 2.0;
    EXPERT_CONFIG.hypeGracePeriod = 4.0;
    EXPERT_CONFIG.priorAgencyMean = 12.0;
  } else if (type === 'pessimist') {
    // Зима ИИ: упираемся в стену, робототехника буксует, жесткое регулирование
    EXPERT_CONFIG.worldModels = { cascade: 0.10, hardWall: 0.80, slowTakeoff: 0.10 };
    EXPERT_CONFIG.ceilingReasoningBase = 10.0;
    EXPERT_CONFIG.plateauHardWallCeiling = 4.0;
    EXPERT_CONFIG.rsiMultiplier = 0.2;
    EXPERT_CONFIG.barrierAtomsLimit = 0.5;
    EXPERT_CONFIG.alignmentCooldown = 3.0;
    EXPERT_CONFIG.priorAgencyMean = 4.0;
  } else if (type === 'skeptic') {
    // Нейросимволика: старт долгий, но первый сдвиг парадигмы дает огромный скачок
    EXPERT_CONFIG.worldModels = { cascade: 0.10, hardWall: 0.10, slowTakeoff: 0.80 };
    EXPERT_CONFIG.ceilingReasoningBase = 12.0;
    EXPERT_CONFIG.baseShiftMultiplier = 5.0;
    EXPERT_CONFIG.rsiMultiplier = 1.0;
    EXPERT_CONFIG.barrierAtomsLimit = 0.8;
    EXPERT_CONFIG.priorAgencyMean = 6.0;
  } else if (type === 'default') {
    // clean default already applied above
  }
  
  syncExpertUIToConfig();
  expertApplyAndRun();
}

function injectExpertPresets() {
  const panel = document.getElementById('expertPanel');
  if (!panel) return;
  
  // Создаем обертку для кнопок
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.gap = '8px';
  wrapper.style.flexWrap = 'wrap';
  wrapper.style.marginBottom = '12px';
  
  const L = LANG[window._lang || 'ru'];
  
  const presets = [
    { id: 'default', label: L.preset_default || 'Базовый', color: '#58a6ff' },
    { id: 'optimist', label: L.preset_optimist || 'Оптимист', color: '#22c55e' },
    { id: 'skeptic', label: L.preset_skeptic || 'Скептик', color: '#eab308' },
    { id: 'pessimist', label: L.preset_pessimist || 'Пессимист', color: '#ef4444' }
  ];
  
  presets.forEach(p => {
    const btn = document.createElement('button');
    btn.textContent = p.label;
    btn.style.padding = '6px 12px';
    btn.style.background = 'rgba(22, 22, 32, 0.8)';
    btn.style.border = `1px solid ${p.color}`;
    btn.style.color = p.color;
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '0.75rem';
    btn.style.fontFamily = 'var(--mono, monospace)';
    btn.style.transition = 'background 0.2s';
    
    btn.onmouseover = () => btn.style.background = p.color + '33';
    btn.onmouseout = () => btn.style.background = 'rgba(22, 22, 32, 0.8)';
    
    btn.onclick = () => applyExpertPreset(p.id);
    wrapper.appendChild(btn);
  });
  
  // Вставляем обертку ПЕРЕД панелью
  panel.parentNode.insertBefore(wrapper, panel);
}

function expertResetDefaults() {
  Object.assign(EXPERT_CONFIG, JSON.parse(JSON.stringify(DEFAULT_EXPERT_CONFIG)));
  syncExpertUIToConfig();
  
  const err = document.getElementById('expertWorldError');
  if (err) err.style.display = 'none';

  // Сброс базовых инпутов UI симуляции, которые вне EXPERT_CONFIG
  const simIds = ['rN', 'v3ARC', 'v3Horizon'];
  const simDefs = [3000, 52, 18.3];
  simIds.forEach((id, i) => {
    const inputMain = document.getElementById(id);
    if (inputMain) inputMain.value = simDefs[i];
  });
}

function expertApplyAndRun() {
  // Синхронизируем EXPERT_CONFIG с текущими значениями UI (включая world models)
  expertWorldSlider();
  // Сбрасываем трекер и перезапускаем
  resetTracker(); // ← было v3ResetTracker (не существовала)
  setTimeout(runSimulation, 100);
}


function quickWarning() {
  hasUserInput = true;
  const tracker = coreTracker || getTracker();
  checkObservationWarning(tracker);
  updateObsMetrics();
}

function renderDataPanel() {
  const panel = document.getElementById('dataPanelContent');
  if (!panel) return;
  const safe = (v, dec, suffix = '') => (v !== undefined && v !== null && isFinite(v)) ? (+v).toFixed(dec) + suffix : '—';
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
      <td style="text-align:right">${safe(d.arenaElo, 0)}</td>
      <td style="text-align:right">${safe(d.arcAgi, 1, '%')}</td>
      <td style="text-align:right">${safe(d.sweBench, 1, '%')}</td>
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
  const el = document.getElementById('obsMetrics');
  if (!el) return;
  el.style.display = 'block';

  const tracker = coreTracker || getTracker();
  const y = tracker.cfg.CURRENT_YEAR;
  
  const samples = [];
  for (let i = 0; i < tracker.n; i++) {
    const pred = simulateToYear(tracker.particles[i], y, tracker.cfg);
    const m = getNumericObservables(pred.reasoning, pred.agency, pred.embodiment, tracker.cfg.EXPERT);
    samples.push({ m, r: pred.reasoning, w: tracker.weights[i] });
  }
  
  function getMedian(key) {
    // Сортируем КОПИЮ, не мутируем оригинал
    const sorted = samples.slice().sort((a, b) => a.m[key] - b.m[key]);
    let cum = 0;
    for (let i = 0; i < sorted.length; i++) {
      cum += sorted[i].w;
      if (cum >= 0.5) return sorted[i].m[key];
    }
    return sorted[sorted.length - 1].m[key];
  }

  const medSwe = getMedian('sweBench');
  const medArc = getMedian('arcAgi');
  const medHorizonLog = getMedian('horizon'); // Это значение в log10(часов)
  
  // Возвращаем в нормальные часы для отображения
  const horizonHours = Math.pow(10, medHorizonLog);
  const horizonStr = horizonHours > 24 
    ? (horizonHours / 24).toFixed(1) + (window._lang === 'en' ? ' days' : ' дней') 
    : horizonHours.toFixed(1) + (window._lang === 'en' ? ' hours' : ' часов');

  // Расчет стоимости токенов на основе медианы Reasoning
  samples.sort((a, b) => a.r - b.r);
  let medR10 = 0, cum = 0;
  for (let i = 0; i < samples.length; i++) {
    cum += samples[i].w;
    if (cum >= 0.5) { medR10 = samples[i].r; break; }
  }
  const costPerM = Math.max(0.005, 19.625 * Math.exp(-0.5973 * medR10));

  const e1 = document.getElementById('omSWE');
  const e2 = document.getElementById('omARC');
  const e3 = document.getElementById('omHorizon');
  const e4 = document.getElementById('omCost');
  
  if (e1) e1.textContent = medSwe.toFixed(1) + '%';
  if (e2) e2.textContent = medArc.toFixed(1) + '%';
  if (e3) e3.textContent = horizonStr;
  if (e4) e4.textContent = '$' + costPerM.toFixed(3);

  renderDataPanel();
}
// DEPLOY: scroll-to-panel fix
// cache-bypass: no-spoiler deployed
// v2026.05.30c: fix expertApplyAndRun worldSlider
// v2026.05.30d: physics patches
// v2026.05.30e: year-fix, deep-copy, noise-sensitivity, cleanup
// v2026.06.01a: horizon in likelihood, larger jitter, governance shock, backtest utility

// Глобальный экспорт для бэктеста из консоли:
//   runBacktest(5, 3) → train on 5 points, predict next 3
window.runBacktest = runBacktest;

// UI wrapper: запускает бэктест с автоматическим выбором границ и показывает результат в #backtestResult
function uiRunBacktest() {
  const data = REAL_BENCHMARK_HISTORY;
  if (!data || data.length < 4) {
    const el = document.getElementById('backtestResult');
    if (el) { el.style.display = 'block'; el.textContent = 'Недостаточно данных для бэктеста (нужно ≥4 наблюдений)'; }
    return;
  }
  const trainEnd = Math.max(3, Math.floor(data.length * 0.5));
  const kPred = data.length - trainEnd;
  const bt = runBacktest(trainEnd, kPred);
  if (bt.error) {
    const el = document.getElementById('backtestResult');
    if (el) { el.style.display = 'block'; el.textContent = 'Ошибка: ' + bt.error; }
    return;
  }
  const fmt = (v) => v == null ? '—' : v.toFixed(2);
  const html = `
    <div style="color:var(--text-primary);font-weight:600;margin-bottom:4px">📊 Бэктест результаты</div>
    <div>Train: ${bt.trainYears} (${trainEnd} точек) → Test: ${bt.testYears} (${kPred} точек)</div>
    <div>RMSE по измерениям:</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:4px">
      <div><span style="color:var(--text-muted)">SWE:</span> <b style="color:var(--accent)">${fmt(bt.perDim.sweBench)}</b></div>
      <div><span style="color:var(--text-muted)">ARC:</span> <b style="color:var(--accent)">${fmt(bt.perDim.arcAgi)}</b></div>
      <div><span style="color:var(--text-muted)">Elo:</span> <b style="color:var(--accent)">${fmt(bt.perDim.arenaElo)}</b></div>
      <div><span style="color:var(--text-muted)">logFLOPs:</span> <b style="color:var(--accent)">${fmt(bt.perDim.flopsLog)}</b></div>
      <div><span style="color:var(--text-muted)">logHor:</span> <b style="color:var(--accent)">${fmt(bt.perDim.horizon)}</b></div>
    </div>
    <div style="margin-top:6px">90% CI coverage: <b style="color:${bt.coverage90 >= 80 && bt.coverage90 <= 95 ? 'var(--green)' : 'var(--orange)'}">${bt.coverage90 != null ? bt.coverage90.toFixed(0) + '%' : '—'}</b> (идеально: 80–95%)</div>
  `;
  const el = document.getElementById('backtestResult');
  if (el) { el.style.display = 'block'; el.innerHTML = html; }
}
window.uiRunBacktest = uiRunBacktest;
// v2026.05.30f: fix decomp RSI + paradigm algoLog reset

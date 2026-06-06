
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function sigmoid(x) { return 1.0 / (1.0 + Math.exp(-Math.max(-30, Math.min(30, x)))); }
function randnRange(mean, std) { const u1 = Math.random() || Number.EPSILON, u2 = Math.random(); return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function percentile(arr, p) { if (!arr || arr.length === 0) return undefined; const sorted = arr.slice().sort((a, b) => a - b); const idx = clamp(Math.floor(p / 100 * (sorted.length - 1) + 0.5), 0, sorted.length - 1); return sorted[idx]; }
function cdf(list, x) { const c = list.filter(v => isFinite(v) && v <= x).length; return list.length ? (c / list.length) * 100 : 0; }

// ============================================================================
// HISTORICALLY DETERMINED CONSTANTS (not user-configurable)
// ============================================================================
const EMBODIMENT_REALITY_ANCHOR = 3.0;    // 2023 robotics level (Figure 01 / Optimus Gen 1)
const EMBODIMENT_BUILD_BASE_SPEED = 0.10;  // Factory construction speed by humans (roboticsFrontier/year)

// ============================================================================
// EXPERT SANDBOX — Параметры по умолчанию (соответствуют текущему поведению)
// ============================================================================
const EXPERT_CONFIG = {
  // Категория 1: Архитектура и Парадигмы
  ceilingReasoningBase: 15.0,       // Базовый потолок Трансформеров
  ceilingWorldModelingBase: 18.0,   // Потолок World Modeling (выше чем у Reasoning)
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

  maxPhysicalExperimentRate: 1.5,   // Лимит скорости научных экспериментов в год (wet-lab constraint для T2→T3)

  // Категория 4: Эпистемология (World Models)
  worldModels: { cascade: 0.50, hardWall: 0.20, slowTakeoff: 0.15, resilientCiv: 0.15 },
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

    // --- ПАТЧ 4: Социотехническая перекалибровка (v5.0) ---
    // P (Persuasion) - способность быть убедительным для человека.
    // Так как W (World Modeling) сюда не передается напрямую, мы аппроксимируем его как W ≈ R.
    const w10 = r10;
    const P = Math.cbrt(r10 * w10 * a10);
    // -------------------------------------------------------

    return {
        sweBench: 100 * sigmoid(0.55 * blendedReasoning - 2.5),
        arcAgi: 100 * sigmoid(0.6 * r10 - 4.0),

        // Chatbot Arena теперь измеряет Убедительность (P), а не чистый интеллект (R)
        arenaElo: 800 + 70 * P,

        flopsLog: 23.5 + 0.3 * r10,
        horizon: Math.log10(Math.min(365 * 24, 0.5 * Math.exp(0.5 * a10))),
        simToReal: 100 * sigmoid(0.5 * embodimentVal - 2.5),
        moravec: Math.max(0, Math.min(100, 2 + 7.5 * (embodimentVal - 0.5))),
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
      worldModeling: { slope: EXPERT_CONFIG.wmScalingSlope, ceiling: EXPERT_CONFIG.ceilingWorldModelingBase },
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
  let ceilingWM = cfg.DIMENSIONS.worldModeling.ceiling;
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
  let roboticsFrontier = EMBODIMENT_REALITY_ANCHOR; // Hard start from real 2023 robotics level

  // --- SOCIOTECHNICAL STATES (v5.0) ---
  let IL = 0.0; // Institutional Legitimacy (0..1)
  let IC = 0.0; // Institutional Capture (0..1)
  let II = 0.0; // Institutional Immunity (0..1)

  for (let step = 0; step < steps; step++) {
    const currentYear = cfg.BASE_YEAR + step * dt;

    // PATCH 1, 2, 3: Capabilities from independent states
    let rawR = computeDim(stateR, cfg.DIMENSIONS.reasoning.slope, ceilingR);
    let rawA = computeDim(stateA, cfg.DIMENSIONS.agency.slope, ceilingA);
    let rawE_ai = computeDim(stateE, cfg.EXPERT.embodimentScalingSlope, ceilingE);
    let rawWM = computeDim(stateW, cfg.DIMENSIONS.worldModeling.slope, ceilingWM);

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

    // --- SOCIOTECHNICAL LAYER (v5.0) ---
    const P = Math.cbrt(R * W * A);
    const DP = sigmoid(0.5 * P + 0.3 * A - 5.0);

    const socialTension = Math.max(0, DP - IL);

    IL += 0.5 * DP * (1.0 - IL) * dt;
    II += 0.1 * A * (1.0 - II) * dt;
    IC = Math.min(1.0, IC + 0.2 * IL * Math.max(0, (A - 4.0) / 10.0) * dt);

    if (particle.world_model === 'resilient_civ') {
      IC = Math.min(IC, Math.max(0, 1.0 - II));
    }
    const DR = (IC * 0.7) + (IC * (Math.min(10.0, E) / 10.0) * 0.3);

    // Детерминированный культурный шок (для фильтра частиц)
    if (socialTension > 0.5 && !stateIntervention) {
      IL *= 0.8;
      IC *= 0.5;
      stateIntervention = true;
      interventionCooldown = 2.0;
    }
    // -------------------------------------------

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
        ceilingWM *= shiftMult;
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

    // --- БАРЬЕР 3: Геополитика (Государственный шок) ---
    const interventionRisk = Math.max(0, DP - IC * 2.0) * cfg.EXPERT.barrierGeopoliticsRisk;
    if (IL > 0.2 && IC < 0.5 && !stateIntervention && interventionRisk > 0.5) { // Детерминированный триггер
      stateIntervention = true;
      interventionCooldown = 3.0;
    }
    if (stateIntervention) {
      interventionCooldown -= dt;
      if (interventionCooldown <= 0) stateIntervention = false;
    }
    if (stateIntervention) damping *= 0.1;

    // --- БАРЬЕР 4: Конкуренция ИИ (Эффект Черной Королевы) ---
    let nashDamping = 1.0;
    if (IC > 0.6) {
      nashDamping = 1.0 / (1.0 + cfg.EXPERT.barrierNashFriction * (IC - 0.6) * 10.0);
    }

    // --- БАРЬЕР 5: Смысловой предел (Шок спроса) ---
    let demandDamping = 1.0;
    if (R > 8.0 && DP < 0.3) {
      demandDamping = 0.6;
    }

    // PATCH 8: RSI efficiency as independent internal parameter
    const lowHangingFruitExhaustion = Math.max(1.0, paradigmGeneration * 1.5);
    const epistemicFriction = 1.0 / lowHangingFruitExhaustion;
    const rsi = calculateRSI(S, C, cfg.EXPERT) * (particle.rsi_efficiency || 1.0) * epistemicFriction;

    // [NEW] Проклятие атомов: жёсткий потолок удвоений/год (лог-единицы)
    let hwDelta = hwK * damping * nashDamping * demandDamping * hwBonus;
    hwDelta = Math.min(hwDelta, cfg.EXPERT.barrierAtomsLimit * Math.LN2);
    if (flopsLog >= cfg.EXPERT.barrierEnergyLog) hwDelta = 0;
    let algoDelta = algoK * algoKMult * damping * nashDamping * demandDamping + rsi;

    // PATCH 1, 2, 3: Differential state integration with cross-dependencies
    const dCompute = (hwDelta + algoDelta) * dt;
    stateR += dCompute;
    // Decoupled World Modeling: Epistemic Grounding (Physical + Digital)
    const digitalGrounding = sigmoid(0.5 * (A - 5.0)); // Познание через цифровые среды
    const physicalGrounding = sigmoid(1.0 * (E - 3.0)); // Познание через роботов
    const epistemicGrounding = 0.3 + 0.4 * digitalGrounding + 0.3 * physicalGrounding;
    const dW_ideal = (0.6 * dCompute * epistemicGrounding) + (0.2 * (R / ceilingR)) * Math.max(0, dCompute);
    const dW_real = Math.min(dW_ideal, EXPERT_CONFIG.maxPhysicalExperimentRate * dt);
    stateW += dW_real;
    stateA += 0.4 * dCompute + (0.3 * (R / ceilingR) + 0.3 * (W / ceilingWM)) * Math.max(0, dCompute);
    stateE += 0.5 * dCompute + 0.2 * (A / ceilingA) * Math.max(0, dCompute);
    const buildBaseSpeed = EMBODIMENT_BUILD_BASE_SPEED;
    const buildRoboticsBonus = 0.15 * (1.0 / (1.0 + Math.exp(-(E - 4.5))));
    roboticsFrontier += (buildBaseSpeed + buildRoboticsBonus) * dt; // Real robotics linear growth

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
      const totalWM = (w.cascade || 0) + (w.hardWall || 0) + (w.slowTakeoff || 0) + (w.resilientCiv || 0);
      const normC = totalWM > 0 ? (w.cascade || 0) / totalWM : 0.50;
      const normH = totalWM > 0 ? (w.hardWall || 0) / totalWM : 0.20;
      const normS = totalWM > 0 ? (w.slowTakeoff || 0) / totalWM : 0.15;
      let worldModel = 'cascade';
      if (rand > normC && rand <= normC + normH) worldModel = 'hard_wall';
      else if (rand > normC + normH && rand <= normC + normH + normS) worldModel = 'slow_takeoff';
      else if (rand > normC + normH + normS) worldModel = 'resilient_civ';

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
              const totalWM = (w.cascade || 0) + (w.hardWall || 0) + (w.slowTakeoff || 0) + (w.resilientCiv || 0);
              const normC = totalWM > 0 ? (w.cascade || 0) / totalWM : 0.50;
              const normH = totalWM > 0 ? (w.hardWall || 0) / totalWM : 0.20;
              const normS = totalWM > 0 ? (w.slowTakeoff || 0) / totalWM : 0.15;
              if (r < normC) return 'cascade';
              if (r < normC + normH) return 'hard_wall';
              if (r < normC + normH + normS) return 'slow_takeoff';
              return 'resilient_civ';
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
    let wCascade = 0, wHardWall = 0, wSlowTakeoff = 0, wResilientCiv = 0;
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
      else if (this.particles[i].world_model === 'resilient_civ') wResilientCiv += nw;
    }
    return {
      hwMonths: hw,
      agencyCeiling: agn,
      algoMonths: algo,
      postCascade: wCascade,
      postHardWall: wHardWall,
      postSlowTakeoff: wSlowTakeoff,
      postResilientCiv: wResilientCiv
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
      let ceilingWM = this.cfg.DIMENSIONS.worldModeling.ceiling;
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
      let roboticsFrontier = EMBODIMENT_REALITY_ANCHOR; // Hard start from real 2023 robotics level

      // --- SOCIOTECHNICAL STATES (v5.0) ---
      let IL = 0.0; // Institutional Legitimacy (0..1)
      let IC = 0.0; // Institutional Capture (0..1)
      let II = 0.0; // Institutional Immunity (0..1)

      for (let step = 0; step < maxSteps; step++) {
        const currentYear = this.cfg.BASE_YEAR + step * dt;

        const rawR = computeDim(stateR, this.cfg.DIMENSIONS.reasoning.slope, ceilingReasoning);
        const rawA = computeDim(stateA, this.cfg.DIMENSIONS.agency.slope, ceilingAgency);
        const rawE_ai = computeDim(stateE, this.cfg.EXPERT.embodimentScalingSlope, ceilingEmbodiment);
        const rawWM = computeDim(stateW, this.cfg.DIMENSIONS.worldModeling.slope, ceilingWM);

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

        // --- SOCIOTECHNICAL LAYER (v5.0) ---
        // 1. Persuasion (Убедительность)
        const P = Math.cbrt(R * W * A);
        // 2. Delegation Pressure (Давление делегирования)
        const DP = sigmoid(0.5 * P + 0.3 * A - 5.0);

        const socialTension = Math.max(0, DP - IL);

        // 3. Интегрирование Легитимности (IL), Иммунитета (II) и Захвата (IC)
        IL += 0.5 * DP * (1.0 - IL) * dt;
        II += 0.1 * A * (1.0 - II) * dt;
        IC = Math.min(1.0, IC + 0.2 * IL * Math.max(0, (A - 4.0) / 10.0) * dt);
        if (p.world_model === 'resilient_civ') {
            IC = Math.min(IC, Math.max(0, 1.0 - II));
        }

        // 4. Dependency Ratio (Зависимость цивилизации)
        const DR = (IC * 0.7) + (IC * (Math.min(10.0, E) / 10.0) * 0.3);
        // -------------------------------------------

        // СТОХАСТИЧЕСКИЙ КУЛЬТУРНЫЙ ШОК (Anti-AI Backlash)
        if (socialTension > 0.4 && Math.random() < (socialTension * 0.5) * dt) {
            IL *= 0.3; // Легитимность рушится
            IC *= 0.1; // Институты изгоняют ИИ
            stateIntervention = true;
            interventionCooldown = 5.0; // 5 лет жесткой стагнации
        }
        // -------------------------------------------

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
                ceilingWM *= shiftMult;
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

        // --- ПАТЧ 2: Эндогенные социотехнические барьеры (v5.0) ---

        // БАРЬЕР 3: Геополитика (Государственный шок)
        // Государства паникуют от давления делегирования (DP), но могут вмешаться
        // только если институциональный захват (IC) еще не стал критическим (< 0.5)
        const interventionRisk = Math.max(0, DP - IC * 2.0) * this.cfg.EXPERT.barrierGeopoliticsRisk;
        if (IL > 0.2 && IC < 0.5 && !stateIntervention && Math.random() < interventionRisk * dt) {
          stateIntervention = true;
          interventionCooldown = 3.0; // 3 года жесточайшей регуляции / заморозки
        }
        if (stateIntervention) {
          interventionCooldown -= dt;
          if (interventionCooldown <= 0) stateIntervention = false;
        }
        if (stateIntervention) damping *= 0.1;

        // БАРЬЕР 4: Конкуренция ИИ (Эффект Черной Королевы)
        // Трение координации начинается, когда ИИ глубоко проникает в институты (IC > 0.6)
        let nashDamping = 1.0;
        if (IC > 0.6) {
          nashDamping = 1.0 / (1.0 + this.cfg.EXPERT.barrierNashFriction * (IC - 0.6) * 10.0);
        }

        // БАРЬЕР 5: Смысловой предел (Шок спроса)
        // Если ИИ уже умный (R > 8), но люди не хотят ему делегировать задачи (DP < 0.3),
        // экономика тормозит внедрение и инвестиции.
        let demandDamping = 1.0;
        if (R > 8.0 && DP < 0.3) {
          demandDamping = 0.6;
        }
        // -----------------------------------------------------------

        if (currentYear >= this.cfg.CURRENT_YEAR && plotIdx < plotSteps) {
            trajYears[plotIdx] = currentYear;
            trajCaps[plotIdx].push(cap);
            trajEmbodiment[plotIdx].push(E);
            trajReasoning[plotIdx].push(R);
            trajWM[plotIdx].push(W);
            plotIdx++;
        }
        
                // --- ПАТЧ 3: Социотехнические пороги Сингулярности (v5.0) ---

                // T1: Потеря понимания (Cognitive Dominance)
                // Система превосходит экспертов, использование становится ритуальным. Оставляем когнитивный порог.
                const t1Condition = R >= this.cfg.THRESHOLDS.t1 && W >= this.cfg.THRESHOLDS.t1 * 0.6;

                // T2: Потеря предсказуемости (Autonomous Legitimacy)
                // Люди массово делегируют решения (Давление > 50%, Легитимность > 30%)
                const t2Condition = DP > 0.5 && IL > 0.3;

                // T3: Потеря контроля (Institutional Capture)
                // Отключение ИИ вызывает коллапс институтов (Захват > 60%)
                const t3Condition = IC > 0.6;

                // T4: Потеря влияния (Civilizational Dependency)
                // Тотальная зависимость, включая физический мир (DR > 90% и достаточный контроль над атомами)
                const t4Condition = DR > 0.9 && E >= this.cfg.EXPERT.embodimentT4Requirement;
                // -----------------------------------------------------------

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
        const lowHangingFruitExhaustion = Math.max(1.0, paradigmGeneration * 1.5);
        const epistemicFriction = 1.0 / lowHangingFruitExhaustion;
        const rsiEfficiency = isWinter ? 0.2 : 1.0;
        const rsi = calculateRSI(S, C, this.cfg.EXPERT) * rsiEfficiency * (p.rsi_efficiency || 1.0) * epistemicFriction;

        const marketUtility = R * 0.3 + A * 0.7;
        const investorExpectations = (currentYear - 2023.0) * 1.5;
        // Деньги зависят от хайпа, но если институты легализовали ИИ (IL растет), инвестиции гарантированы
        let capitalMultiplier = Math.max(0.1, Math.min(this.cfg.EXPERT.maxCapitalMultiplier,
            (marketUtility / Math.max(1.0, investorExpectations)) + (IL * 2.0)
        ));
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
        // Decoupled World Modeling: Epistemic Grounding (Physical + Digital)
        const digitalGrounding = sigmoid(0.5 * (A - 5.0));
        const physicalGrounding = sigmoid(1.0 * (E - 3.0));
        const epistemicGrounding = 0.3 + 0.4 * digitalGrounding + 0.3 * physicalGrounding;
        const dW_ideal = (0.6 * dCompute * epistemicGrounding) + (0.2 * (R / ceilingReasoning)) * Math.max(0, dCompute);
        const dW_real = Math.min(dW_ideal, this.cfg.EXPERT.maxPhysicalExperimentRate * dt);
        stateW += dW_real;
        stateA += 0.4 * dCompute + (0.3 * (R / ceilingReasoning) + 0.3 * (W / ceilingWM)) * Math.max(0, dCompute);
        stateE += 0.5 * dCompute + 0.2 * (A / ceilingAgency) * Math.max(0, dCompute);
        const buildBaseSpeed = EMBODIMENT_BUILD_BASE_SPEED;
        const buildRoboticsBonus = 0.15 * (1.0 / (1.0 + Math.exp(-(E - 4.5))));
        roboticsFrontier += (buildBaseSpeed + buildRoboticsBonus) * dt;

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
      let cWM = cfg.DIMENSIONS.worldModeling.ceiling;
      let cE = p.embodiment_ceiling || cfg.EXPERT.embodimentPriorMean;

      if (p.world_model === 'hard_wall') {
        cA = Math.min(cA, cfg.EXPERT.plateauHardWallCeiling);
        cE = Math.min(cE, 4.0);
      } else if (p.world_model === 'slow_takeoff') {
        algoK *= 0.6;
      }

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

      let roboticsFrontier = EMBODIMENT_REALITY_ANCHOR; // Hard start from real 2023 robotics level

      // --- SOCIOTECHNICAL STATES (v5.0) ---
      let IL = 0.0;
      let IC = 0.0;
      let II = 0.0;

      let stateR = 0, stateA = 0, stateW = 0, stateE = 0;

      const years = [], caps = [];
      for (let step = 0; step < steps; step++) {
        const y = cfg.BASE_YEAR + step * dt;

        const rawR = computeDim(stateR, cfg.DIMENSIONS.reasoning.slope, cR);
        const rawA = computeDim(stateA, cfg.DIMENSIONS.agency.slope, cA);
        const rawE_ai = computeDim(stateE, cfg.EXPERT.embodimentScalingSlope, cE);
        const rawWM = computeDim(stateW, cfg.DIMENSIONS.worldModeling.slope, cWM);

        const R = applyInference(rawR, cfg.INFERENCE_SCALING.max_bonus_reasoning, cfg.INFERENCE_SCALING.saturation_cap);
        const A = applyInference(rawA, cfg.INFERENCE_SCALING.max_bonus_agency, cfg.INFERENCE_SCALING.saturation_cap);
        const aiEmbodiment = applyInference(rawE_ai, cfg.INFERENCE_SCALING.max_bonus_agency * 0.5, cfg.INFERENCE_SCALING.saturation_cap);
        const E = Math.min(aiEmbodiment, roboticsFrontier);
        const W = applyInference(rawWM, 1.2, cfg.INFERENCE_SCALING.saturation_cap);

        const C = Math.sqrt(A * W) * Math.max(0, 1.0 - cfg.EXPERT.coordinationFriction);
        const S = Math.pow(R, 0.4) * Math.pow(W, 0.4) * Math.pow(A, 0.2);
        const M = Math.sqrt(E * C);

        const cap = Math.cbrt(R * A * W);

        // --- SOCIOTECHNICAL LAYER (v5.0) ---
        const P = Math.cbrt(R * W * A);
        const DP = sigmoid(0.5 * P + 0.3 * A - 5.0);
        const socialTension = Math.max(0, DP - IL);

        IL += 0.5 * DP * (1.0 - IL) * dt;
        II += 0.1 * A * (1.0 - II) * dt;
        IC = Math.min(1.0, IC + 0.2 * IL * Math.max(0, (A - 4.0) / 10.0) * dt);
        if (p.world_model === 'resilient_civ') {
            IC = Math.min(IC, Math.max(0, 1.0 - II));
        }
        const DR = (IC * 0.7) + (IC * (Math.min(10.0, E) / 10.0) * 0.3);

        if (socialTension > 0.4 && Math.random() < (socialTension * 0.5) * dt) {
            IL *= 0.3;
            IC *= 0.1;
            stateIntervention = true;
            interventionCooldown = 5.0;
        }

        // [PATCH Bug 4] Парадигмальные сдвиги + Hype Overhang
        const canShift = (paradigmGeneration === 0 && y > 2026.5)
                       || (paradigmGeneration > 0 && y > lastShiftYear + 4.0);
        if (canShift) {
            const saturation = S / cR;
            if (saturation > cfg.EXPERT.saturationThreshold) {
              const _marketUtility = R * 0.3 + A * 0.7;
              const _investorExpectations = (y - 2023.0) * 1.5;
              // Деньги зависят от хайпа, но если институты легализовали ИИ (IL растет), инвестиции гарантированы
              const _capMult = Math.max(0.1, Math.min(cfg.EXPERT.maxCapitalMultiplier, (_marketUtility / Math.max(1.0, _investorExpectations)) + (IL * 2.0)));
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
                cWM *= shiftMult;
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

        // БАРЬЕР 3: Геополитика (v5.0)
        const interventionRisk = Math.max(0, DP - IC * 2.0) * cfg.EXPERT.barrierGeopoliticsRisk;
        if (IL > 0.2 && IC < 0.5 && !stateIntervention && Math.random() < interventionRisk * dt) {
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

        // БАРЬЕР 4: Конкуренция ИИ (v5.0)
        let nashDamping = 1.0;
        if (IC > 0.6) {
          nashDamping = 1.0 / (1.0 + cfg.EXPERT.barrierNashFriction * (IC - 0.6) * 10.0);
        }

        // БАРЬЕР 5: Шок спроса (v5.0)
        let demandDamping = 1.0;
        if (R > 8.0 && DP < 0.3) {
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
        const lowHangingFruitExhaustion = Math.max(1.0, paradigmGeneration * 1.5);
        const epistemicFriction = 1.0 / lowHangingFruitExhaustion;
        const rsi = calculateRSI(S, C, cfg.EXPERT) * (p.rsi_efficiency || 1.0) * epistemicFriction;

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
        // Decoupled World Modeling (Physical + Digital)
        const digitalGrounding = sigmoid(0.5 * (A - 5.0));
        const physicalGrounding = sigmoid(1.0 * (E - 3.0));
        const epistemicGrounding = 0.3 + 0.4 * digitalGrounding + 0.3 * physicalGrounding;
        const dW_ideal = (0.6 * dCompute * epistemicGrounding) + (0.2 * (R / cR)) * Math.max(0, dCompute);
        const dW_real = Math.min(dW_ideal, cfg.EXPERT.maxPhysicalExperimentRate * dt);
        stateW += dW_real;
        stateA += 0.4 * dCompute + (0.3 * (R / cR) + 0.3 * (W / cWM)) * Math.max(0, dCompute);
        stateE += 0.5 * dCompute + 0.2 * (A / cA) * Math.max(0, dCompute);
        const buildBaseSpeed = EMBODIMENT_BUILD_BASE_SPEED;
        const buildRoboticsBonus = 0.15 * (1.0 / (1.0 + Math.exp(-(E - 4.5))));
        roboticsFrontier += (buildBaseSpeed + buildRoboticsBonus) * dt;

        flopsLog += hwDelta * dt;
        algoLog += algoDelta * dt;

        years.push(y);
        caps.push(cap);
      }
      scenarios.push({ years, caps });
    }
    return scenarios;
  }

  runDecomposition() {
    const cfg = this.cfg;
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
      for (let i = 0; i < this.n; i++) {
        avgHw += this.particles[i].hw_months;
        avgAlgo += this.particles[i].algo_months;
        avgCeiling += this.particles[i].agency_ceiling;
        avgEmbodimentCeiling += this.particles[i].embodiment_ceiling || cfg.EXPERT.embodimentPriorMean;
      }
      avgHw /= this.n; avgAlgo /= this.n; avgCeiling /= this.n; avgEmbodimentCeiling /= this.n;
    }
    
    const dt = 1.0 / 12.0;
    const steps = 40 * 12;
    const years = [], hwComp = [], algoComp = [], paradigmComp = [], rsiComp = [];
    
    let accumulatedParadigm = 0, accumulatedRsi = 0;
    let flopsLog = cfg.BASE_LOG_FLOPS, algoLog = 0, pureAlgoLog = 0;
    const hwK = Math.log(2) / Math.max(1.0, avgHw / 12.0);
    const algoK = Math.log(2) / Math.max(1.0, avgAlgo / 12.0);
    
    let cR = cfg.DIMENSIONS.reasoning.ceiling;
    let cA = avgCeiling;
    let cWM = cfg.DIMENSIONS.worldModeling.ceiling;
    let cE = avgEmbodimentCeiling || cfg.EXPERT.embodimentPriorMean;

    let hardWallWeight = 0, slowTakeoffWeight = 0, resilientCivWeight = 0;
    if (totalW > 0) {
      for (let i = 0; i < this.n; i++) {
        const w = this.weights[i] / totalW;
        if (this.particles[i].world_model === 'hard_wall') hardWallWeight += w;
        else if (this.particles[i].world_model === 'slow_takeoff') slowTakeoffWeight += w;
        else if (this.particles[i].world_model === 'resilient_civ') resilientCivWeight += w;
      }
    }

    const cascadeWeight = 1.0 - hardWallWeight - slowTakeoffWeight - resilientCivWeight;
    let dominantModel = 'cascade';
    const maxW = Math.max(cascadeWeight, hardWallWeight, slowTakeoffWeight, resilientCivWeight);
    if (maxW === hardWallWeight) dominantModel = 'hard_wall';
    else if (maxW === slowTakeoffWeight) dominantModel = 'slow_takeoff';
    else if (maxW === resilientCivWeight) dominantModel = 'resilient_civ';
                          
    if (dominantModel === 'hard_wall') {
      cA = Math.min(cA, cfg.EXPERT.plateauHardWallCeiling);
      cE = Math.min(cE, 4.0);
    }
    let algoKMultiplier = dominantModel === 'slow_takeoff' ? 0.6 : 1.0;
    
    let paradigmGeneration = 0;
    let lastShiftYear = cfg.BASE_YEAR;
    let t2HitYear = null;

    let stateR = 0, stateA = 0, stateW = 0, stateE = 0;
    let roboticsFrontier = EMBODIMENT_REALITY_ANCHOR; // Hard start from real 2023 robotics level

    // --- SOCIOTECHNICAL STATES (v5.0) ---
    let IL = 0.0;
    let IC = 0.0;
    let II = 0.0;

    let avgRsiEff = 1.0;
    if (totalW > 0) {
      avgRsiEff = 0;
      for (let i = 0; i < this.n; i++) {
        avgRsiEff += (this.particles[i].rsi_efficiency || 1.0) * (this.weights[i] / totalW);
      }
    }

    for (let step = 0; step < steps; step++) {
      const y = cfg.BASE_YEAR + step * dt;

      const rawR = computeDim(stateR, cfg.DIMENSIONS.reasoning.slope, cR);
      const rawA = computeDim(stateA, cfg.DIMENSIONS.agency.slope, cA);
      const rawE_ai = computeDim(stateE, cfg.EXPERT.embodimentScalingSlope, cE);
      const rawWM = computeDim(stateW, cfg.DIMENSIONS.worldModeling.slope, cWM);
      
      const R = applyInference(rawR, cfg.INFERENCE_SCALING.max_bonus_reasoning, cfg.INFERENCE_SCALING.saturation_cap);
      const A = applyInference(rawA, cfg.INFERENCE_SCALING.max_bonus_agency, cfg.INFERENCE_SCALING.saturation_cap);
      const aiEmbodiment = applyInference(rawE_ai, cfg.INFERENCE_SCALING.max_bonus_agency * 0.5, cfg.INFERENCE_SCALING.saturation_cap);
      const E = Math.min(aiEmbodiment, roboticsFrontier);
      const W = applyInference(rawWM, 1.2, cfg.INFERENCE_SCALING.saturation_cap);

      const C = Math.sqrt(A * W) * Math.max(0, 1.0 - cfg.EXPERT.coordinationFriction);
      const S = Math.pow(R, 0.4) * Math.pow(W, 0.4) * Math.pow(A, 0.2);
      
      const cap = Math.cbrt(R * A * W);

      // --- SOCIOTECHNICAL LAYER (v5.0) ---
      const P = Math.cbrt(R * W * A);
      const DP = sigmoid(0.5 * P + 0.3 * A - 5.0);
      const socialTension = Math.max(0, DP - IL);

      IL += 0.5 * DP * (1.0 - IL) * dt;
      II += 0.1 * A * (1.0 - II) * dt;
      IC = Math.min(1.0, IC + 0.2 * IL * Math.max(0, (A - 4.0) / 10.0) * dt);
      if (dominantModel === 'resilient_civ') {
          IC = Math.min(IC, Math.max(0, 1.0 - II));
      }

      // Expected shock damping in decomposition
      if (socialTension > 0.5) {
          IL *= 0.95;
          IC *= 0.9;
      }

      const DR = (IC * 0.7) + (IC * (Math.min(10.0, E) / 10.0) * 0.3);

      if (cap >= cfg.THRESHOLDS.t2 && t2HitYear === null) {
        t2HitYear = y;
      }

      // Детерминированная логика сдвигов парадигм (без Math.random)
      const saturation = S / cR;
      const canShift = (paradigmGeneration === 0 && y > 2026.5) || 
                       (paradigmGeneration > 0 && y > lastShiftYear + 4.0);

      if (canShift && saturation > cfg.EXPERT.saturationThreshold) {
        // Используем настройки Expert Sandbox, а не хардкод
        let shiftMult = Math.max(
          cfg.EXPERT.minShiftMultiplier,
          cfg.EXPERT.baseShiftMultiplier - (paradigmGeneration * cfg.EXPERT.paradigmDecayRate)
        );
        
        if (dominantModel === 'slow_takeoff' && paradigmGeneration === 0) shiftMult = Math.max(shiftMult, 5.0);
        if (dominantModel === 'hard_wall') shiftMult = 1.001;

        cA *= shiftMult;
        cR *= shiftMult;
        cWM *= shiftMult;
        cE *= shiftMult;
        
        algoLog = Math.max(algoLog - (0.4 + paradigmGeneration * 0.1), -3.0);
        paradigmGeneration++;
        lastShiftYear = y;
        algoKMultiplier = 2.0;

        // Визуальное масштабирование для адекватного отображения
        accumulatedParadigm += shiftMult * 2.0; 
      }

      if (paradigmGeneration > 0 && algoKMultiplier > 1.0) {
        algoKMultiplier -= (1.0 / 4.0) * dt;
        if (algoKMultiplier < 1.0) algoKMultiplier = 1.0;
      }

      years.push(y);
      hwComp.push(flopsLog - cfg.BASE_LOG_FLOPS);
      algoComp.push(pureAlgoLog);
      paradigmComp.push(accumulatedParadigm);

      // Включаем ВСЕ барьеры в декомпозицию (v5.0)
      let damping = cfg.EXPERT.governanceMoratoriumProb * cfg.EXPERT.governanceShockDamping + (1.0 - cfg.EXPERT.governanceMoratoriumProb);

      if (y > cfg.BOTTLENECKS.econ_wall_start && (R - A) > 2.0) {
        damping *= Math.exp(-cfg.BOTTLENECKS.econ_damping * (R - A - 2.0));
      }

      // БАРЬЕР 4: Конкуренция ИИ (v5.0)
      let nashDamping = 1.0;
      if (IC > 0.6) {
        nashDamping = 1.0 / (1.0 + cfg.EXPERT.barrierNashFriction * (IC - 0.6) * 10.0);
      }

      // БАРЬЕР 5: Шок спроса (v5.0)
      let demandDamping = 1.0;
      if (R > 8.0 && DP < 0.3) {
        demandDamping = 0.6;
      }

      const lowHangingFruitExhaustion = Math.max(1.0, paradigmGeneration * 1.5);
      const epistemicFriction = 1.0 / lowHangingFruitExhaustion;
      const rsi = calculateRSI(S, C, cfg.EXPERT) * avgRsiEff * epistemicFriction;
      accumulatedRsi += rsi * dt;
      rsiComp.push(accumulatedRsi);
      
      const bypassActivation = sigmoid(1.5 * (E - cfg.EXPERT.embodimentBypassThreshold));
      const hwBonus = 1.0 + bypassActivation * (cfg.EXPERT.embodimentHWBonusMultiplier - 1.0);
      
      let hwDelta = hwK * damping * nashDamping * demandDamping * hwBonus;
      hwDelta = Math.min(hwDelta, cfg.EXPERT.barrierAtomsLimit * Math.LN2);
      if (flopsLog >= cfg.EXPERT.barrierEnergyLog) hwDelta = 0;
      
      let algoDelta = algoK * algoKMultiplier * damping * nashDamping * demandDamping + rsi;

      const dCompute = (hwDelta + algoDelta) * dt;
      stateR += dCompute;
      // Decoupled World Modeling (Physical + Digital)
      const digitalGrounding = sigmoid(0.5 * (A - 5.0));
      const physicalGrounding = sigmoid(1.0 * (E - 3.0));
      const epistemicGrounding = 0.3 + 0.4 * digitalGrounding + 0.3 * physicalGrounding;
      const dW_ideal = (0.6 * dCompute * epistemicGrounding) + (0.2 * (R / cR)) * Math.max(0, dCompute);
      const dW_real = Math.min(dW_ideal, cfg.EXPERT.maxPhysicalExperimentRate * dt);
      stateW += dW_real;
      stateA += 0.4 * dCompute + (0.3 * (R / cR) + 0.3 * (W / cWM)) * Math.max(0, dCompute);
      stateE += 0.5 * dCompute + 0.2 * (A / cA) * Math.max(0, dCompute);
      const buildBaseSpeed = EMBODIMENT_BUILD_BASE_SPEED;
      const buildRoboticsBonus = 0.15 * (1.0 / (1.0 + Math.exp(-(E - 4.5))));
      roboticsFrontier += (buildBaseSpeed + buildRoboticsBonus) * dt;

      flopsLog += hwDelta * dt;
      algoLog += algoDelta * dt;
      
      // pureAlgoLog - базовый алгоритмический рост (без учета RSI)
      pureAlgoLog += (algoK * algoKMultiplier * damping * nashDamping * demandDamping) * dt;
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

  // Подготавливаем кумулятивные веса для правильного сэмплинга (взвешенный выбор)
  const cumw = new Float64Array(btTracker.n);
  cumw[0] = btTracker.weights[0];
  for (let i = 1; i < btTracker.n; i++) cumw[i] = cumw[i - 1] + btTracker.weights[i];

  const residuals = [];
  const dims = ['sweBench', 'arcAgi', 'arenaElo', 'flopsLog', 'horizon', 'simToReal', 'moravec', 'autoAssembly'];
  const sqErr = { sweBench:0, arcAgi:0, arenaElo:0, flopsLog:0, horizon:0, simToReal:0, moravec:0, autoAssembly:0 };
  const cnt = { sweBench:0, arcAgi:0, arenaElo:0, flopsLog:0, horizon:0, simToReal:0, moravec:0, autoAssembly:0 };
  let inCI90 = 0, totalCIEval = 0;

  for (let t = 0; t < testData.length; t++) {
    const obs = testData[t];
    const samples = [];
    
    // Генерируем 200 взвешенных прогнозов
    for (let k = 0; k < 200; k++) {
      const u = Math.random();
      let idx = 0; while (idx < btTracker.n - 1 && cumw[idx] < u) idx++;
      
      const pred = simulateToYear(btTracker.particles[idx], obs.year, btTracker.cfg);
      const m = getNumericObservables(pred.reasoning, pred.agency, pred.embodiment, btTracker.cfg.EXPERT);
      
      // Добавляем шум измерений (Posterior Predictive Distribution)
      const getSig = (dimKey) => (obs[dimKey + '_sigma'] !== undefined) ? obs[dimKey + '_sigma'] : BENCHMARK_SIGMAS[dimKey];
      
      m.sweBench = clamp(m.sweBench + randnRange(0, getSig('sweBench')), 0, 100);
      m.arcAgi = clamp(m.arcAgi + randnRange(0, getSig('arcAgi')), 0, 100);
      m.arenaElo += randnRange(0, getSig('arenaElo'));
      m.flopsLog += randnRange(0, getSig('flopsLog'));
      m.horizon += randnRange(0, getSig('horizon'));
      m.simToReal = clamp(m.simToReal + randnRange(0, getSig('simToReal')), 0, 100);
      m.moravec = clamp(m.moravec + randnRange(0, getSig('moravec')), 0, 100);
      m.autoAssembly += randnRange(0, getSig('autoAssembly'));

      samples.push(m);
    }

    const medianSample = {};
    for (const dim of dims) {
      const vals = samples.map(s => s[dim]).filter(v => isFinite(v)).sort((a,b)=>a-b);
      const _m = Math.floor(vals.length / 2); 
      medianSample[dim] = vals.length > 0 ? (vals.length % 2 === 0 ? (vals[_m - 1] + vals[_m]) / 2 : vals[_m]) : 0;
      
      // Берем 5-й и 95-й перцентили (в сумме дают 90% доверительный интервал)
      const p05 = vals.length > 0 ? vals[Math.floor(vals.length * 0.05)] : 0;
      const p95 = vals.length > 0 ? vals[Math.floor(vals.length * 0.95)] : 0;
      
      if (obs[dim] !== undefined) {
        const obsInModelScale = (dim === 'autoAssembly') ? Math.log10(Math.max(0.001, obs[dim])) :
                                (dim === 'horizon') ? Math.log10(Math.max(0.01, obs[dim])) :
                                obs[dim];
                                
        const err = obsInModelScale - medianSample[dim];
        sqErr[dim] += err * err;
        cnt[dim]++;
        
        // Проверка попадания в 90% интервал
        if (obsInModelScale >= p05 && obsInModelScale <= p95) inCI90++;
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
        <b style="color:#f0883e">${L.wm_posterior_title || 'Текущие апостериорные веса гипотез'}:</b><br>
        Cascade (Каскад): <span style="color:#58a6ff;font-family:monospace">${(sum.postCascade * 100).toFixed(1)}%</span><br>
        Hard Wall (Стена): <span style="color:#ef4444;font-family:monospace">${(sum.postHardWall * 100).toFixed(1)}%</span><br>
        Slow Takeoff (Взлет): <span style="color:#22c55e;font-family:monospace">${(sum.postSlowTakeoff * 100).toFixed(1)}%</span><br>
        Resilient (Иммунитет): <span style="color:#a855f7;font-family:monospace">${(sum.postResilientCiv * 100).toFixed(1)}%</span>
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

  const arcRange = [];
  const sweRange = [];
  for (let v = 50; v <= 100; v += 5) arcRange.push(v);
  for (let v = 15; v <= 99; v += 5) sweRange.push(v);

  const matrix = await tracker.runSensitivityMatrixAsync(arcRange, sweRange);

  if (!document.getElementById('c5')) return;

  const labelText = t.ch5_label || 'Лет до T2';
  const textMatrix = matrix.map((row, i) =>
    row.map((v, j) => `ARC=${arcRange[i]}%, SWE=${sweRange[j]}%<br>${labelText}: ${v.toFixed(1)} лет`)
  );

  Plotly.newPlot('c5', [{
    z: matrix,
    x: sweRange.map(String),
    y: arcRange.map(String),
    type: 'heatmap',
    reversescale: true,
    colorscale: [[0, '#0a0a0f'], [0.2, '#1a3a4a'], [0.4, '#0e5e7a'], [0.6, '#f0883e'], [0.8, '#ef4444'], [1, '#ff0040']],
    text: textMatrix,
    hoverinfo: 'text',
    colorbar: { title: { text: t.ch5_colorbar || 'Лет до T2' }, thickness: 12, len: 0.8 },
  }], {
    ...LAYOUT_BASE,
    xaxis: { ...LAYOUT_BASE.xaxis, title: { text: 'SWE-bench (%)' } },
    yaxis: { ...LAYOUT_BASE.yaxis, title: { text: 'ARC-AGI (%)' } },
    margin: { l: 48, r: 10, t: 36, b: 44 },
    height: 520,
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

  // ВЕРСИЯ 5.0: Оставляем только T1.
  // T2, T3 и T4 теперь социотехнические состояния (IL, IC, DR),
  // их нельзя отобразить прямой горизонтальной линией на оси когнитивных способностей.
  traces.push(
    { x: yrRange, y: [lim.t1, lim.t1], type: 'scatter', mode: 'lines', name: t.ch_t1, line: { color: '#eab308', dash: 'dot', width: 1 } }
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
  const gapContainer = document.getElementById('c_gap');
  if (!gapContainer) return;

  const years = gt.years;
  const n = years.length;

  // Для цветовой дифференциации создаём две отдельные заливки
  // Красная зона: только участки где R > W
  const redX = [], redY = [];
  const greenX = [], greenY = [];
  
  for (let i = 0; i < n - 1; i++) {
    const r0 = gt.reasoning[i], w0 = gt.wm[i];
    const r1 = gt.reasoning[i+1], w1 = gt.wm[i+1];
    const yr0 = years[i], yr1 = years[i+1];
    
    // Разбиваем сегмент если линии пересекаются
    if ((r0 - w0) * (r1 - w1) < 0) {
      // Находим точку пересечения линейной интерполяцией
      const tCross = (r0 - w0) / ((r0 - w0) - (r1 - w1));
      const yrCross = yr0 + tCross * (yr1 - yr0);
      const valCross = r0 + tCross * (r1 - r0);
      
      if (r0 > w0) {
        redX.push(yr0, yrCross); redY.push(r0, valCross);
        greenX.push(yrCross, yr1); greenY.push(valCross, w1);
      } else {
        greenX.push(yr0, yrCross); greenY.push(w0, valCross);
        redX.push(yrCross, yr1); redY.push(valCross, r1);
      }
    } else if (r0 > w0 && r1 > w1) {
      redX.push(yr0, yr1); redY.push(r0, r1);
    } else {
      greenX.push(yr0, yr1); greenY.push(w0, w1);
    }
  }

  // Строим trace заливки между R и W для каждой зоны
  function buildFillTrace(fx, fy, color, name) {
    if (fx.length < 2) return null;
    // Интерполируем W по годам fillX для нижней границы заливки
    const wInterp = fx.map(yr => {
      let idx = 0;
      for (let k = 0; k < n - 1; k++) {
        if (yr >= years[k] && yr <= years[k + 1]) { idx = k; break; }
        if (k === n - 2) idx = k;
      }
      const frac = (yr - years[idx]) / (years[Math.min(idx + 1, n - 1)] - years[idx] || 1);
      return gt.wm[idx] + frac * (gt.wm[Math.min(idx + 1, n - 1)] - gt.wm[idx]);
    });
    
    return {
      x: [...fx, ...[...fx].reverse()],
      y: [...fy, [...wInterp].reverse()],
      type: 'scatter', mode: 'none',
      fill: 'toself',
      fillcolor: color,
      name: name,
      showlegend: true,
      hoverinfo: 'x+y',
      line: { width: 0 }
    };
  }

  const redTrace = buildFillTrace(redX, redY, 'rgba(239,68,68,0.3)', t.gap_red_zone || 'Зона галлюцинаций (R > W)');
  const greenTrace = buildFillTrace(greenX, greenY, 'rgba(34,197,94,0.25)', t.gap_green_zone || 'Зона согласования (W ≥ R)');

  // Dotted R=W reference line: find where R crosses W
  const traces = [];
  if (redTrace) traces.push(redTrace);
  if (greenTrace) traces.push(greenTrace);
  
  // Reasoning and World Modeling lines
  traces.push({
    x: years, y: gt.reasoning,
    type: 'scatter', mode: 'lines',
    name: 'Reasoning (R)',
    line: { color: '#a78bfa', width: 2.5 },
  });
  traces.push({
    x: years, y: gt.wm,
    type: 'scatter', mode: 'lines',
    name: 'World Modeling (W)',
    line: { color: '#22c55e', width: 2.5 },
  });

  // R=W reference (average of R and W at each year, shown as dotted)
  // Actually, let's draw a line through points where R=W (interpolated crossings)
  // For simplicity, draw the lower envelope (W) as baseline and label gap

  const layout = {
    ...LAYOUT_BASE,
    title: { text: t.ch_gap_title || t.chart_gap || 'Каузальный разрыв (Hallucination Gap)', font: { size: 14, color: '#eab308' } },
    xaxis: { ...LAYOUT_BASE.xaxis, title: { text: t.ch2_xlabel || 'Год' }, range: [2026, 2045] },
    yaxis: {
      ...LAYOUT_BASE.yaxis,
      title: { text: t.gap_y_axis || 'Capability (0..15)' },
      range: [0, Math.max(16, ...gt.reasoning) * 1.1],
    },
    legend: { ...LAYOUT_BASE.legend, orientation: 'h', y: -0.25 },
    annotations: [
      {
        x: years[Math.floor(n * 0.7)],
        y: Math.max(...gt.reasoning) * 0.85,
        text: 'R > W → галлюцинации',
        showarrow: false,
        font: { color: '#ef4444', size: 10 }
      },
      {
        x: years[Math.floor(n * 0.7)],
        y: Math.max(...gt.reasoning) * 0.15,
        text: 'W ≥ R → согласование',
        showarrow: false,
        font: { color: '#22c55e', size: 10 }
      }
    ],
  };

  Plotly.newPlot('c_gap', traces, layout, PLOT_CFG);
}



// ============================================================================
// 10. LOCALIZATION & INITIALIZATION
// ============================================================================

window._lang = 'ru';
const LANG = {
  ru: {
    // Header
    hdr_title:'Singularity Forecaster', hdr_sub:'v5.4 — Четыре стадии отлучения',
    // Status bar
    sb_t1:'Медиана T1 (Когнитивное доминирование)', sb_t2:'Медиана T2 (Автономная легитимность)',
    sb_t3:'Медиана T3 (Институциональный захват)', sb_t4:'Медиана T4 (Цивилизационная зависимость)',
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
    tip1:'Аппроксимация функции плотности вероятности (PDF) моментов достижения пороговых состояний τ = inf {t : C(t) ≥ C_crit}. Рассчитано методом Монте-Карло (N=3000) на основе сэмплирования из апостериорного распределения частиц.',
    tip3:'Эмпирическая кумулятивная функция распределения (CDF), F(t) = P(T ≤ t). Отражает монотонно возрастающую вероятность прохождения стадий T2 и T4 к заданному году с учетом всех сценариев и дисперсии.',
    tip5:'Тепловая карта чувствительности. Демонстрирует нелинейный отклик медианного времени τ̃_T2 на пертурбации вектора последнего наблюдения (R, A). Позволяет оценить эластичность прогноза по метрикам Reasoning и Agency.',
    tip6:'Проекция 30 стохастических траекторий C(t) из ансамбля. Визуализирует фазовые переходы (смены парадигм), эффекты RSI и влияние эндогенных шоков (схлопывание пузырей, моратории).',
    tip7:'Декомпозиция логарифмического роста ∫₀ᵗ (k_hw + k_algo + k_rsi) dt. Площади отражают интегральный вклад аппаратного масштабирования, алгоритмической эффективности, парадигмальных сдвигов и рекурсивной обратной связи (RSI).',
    tip_gap:'Эпистемическая дивергенция между когнитивной мощностью (Reasoning) и каузальным согласованием (World Modeling). Зона высокого риска, где R(t) ≫ W(t), характеризующаяся структурными галлюцинациями.',
    tip8:'Марковская оценка латентной переменной Embodiment. Верхняя панель: перцентильный коридор прогноза E(t) с эмпирической калибровкой на индексе реальной робототехники. Нижняя панель: маргинальное распределение E_ceiling в апостериорном ансамбле.',
    ch_t1:'T1: Доминирование', ch_t2:'T2: Легитимность', ch_t3:'T3: Захват институтов', ch_t4:'T4: Зависимость',
    ch1_xlabel:'Год', ch1_ylabel:'Прогонов',
    ch3_xlabel:'Год', ch3_ylabel:'P(%)', ch3_pt2:'P(T2)', ch3_pt4:'P(T4)',
    ch5_label:'Лет до T2', ch5_colorbar:'Лет до T2', ch5_xaxis:'SWE-bench (%)', ch5_yaxis:'ARC-AGI (%)', ch5_loading:'Вычисление матрицы (асинхронно)...',
    ch7_ylabel:'Суммарный вклад (log FLOPs)',
    ch8_median:'Медиана (MC)', ch8_p1090:'p10..p90', ch8_p2575:'p25..p75', ch8_real:'Реальные роботы', ch8_t4req:'T4 requirement', ch8_bypass:'HW bypass', ch8_y_main:'Embodiment (0..10)', ch8_x_hist:'embodiment_ceiling', ch8_y_hist:'# частиц',
    fY_suffix:' лет', fY_gt:'> 40 лет',
    // About
    about_title:'Методология модели v5.0',
    about_intro:'Модель v5.0 переходит от «голой экстраполяции интеллекта» к эпидемиологии принятия решений. Мы моделируем не просто рост когнитивных способностей ИИ, а процесс добровольной передачи контроля (Delegation Pressure) и последующий структурный захват человеческой цивилизации (Institutional Capture). ИИ захватывает мир не потому что он умен, а потому что люди сами делегируют ему свои институты.',
    defs_label:'Архитектура и контуры',
    defs_label_arch:'Топология латентного пространства',
    defs_label_contours:'Пороги модели',
    arch_tracker_title:'Байесовский вывод (Particle Filter)',
    arch_tracker_desc:'Ансамбль из N=1000 частиц. При поступлении вектора наблюдений (бенчмарков) веса гипотез обновляются через гауссово правдоподобие. Chatbot Arena Elo теперь напрямую калибрует параметр P (Persuasion) — убедительность ИИ, отсекая маловероятные сценарии развития.',
    arch_dims_title:'Когнитивный и Социотехнический слои',
    arch_dims_desc:'Базис: Reasoning (R), World Modeling (W), Agency (A), Embodiment (E). Над ними надстроен социотехнический слой: Persuasion (P) — убедительность, Delegation Pressure (DP) — давление делегирования, Institutional Legitimacy (IL) — легализация, Institutional Capture (IC) — захват институтов, и Dependency Ratio (DR) — зависимость цивилизации.',
    ch_gap_title: '6. Каузальный разрыв (Hallucination Gap)',
    arch_paradigm_title:'Стохастические сдвиги парадигм',
    arch_paradigm_desc:'Преодоление структурных лимитов моделируется как пуассоновский процесс. Интенсивность возрастает при насыщении науки и избытке капитала (Compute Overhang). Эффективность каждого последующего сдвига затухает.',
    arch_rsi_title:'Динамика RSI (Recursive Self-Improvement)',
    arch_rsi_desc:'Автономное ускорение R&D. Скорость генерации алгоритмических улучшений пропорциональна когнитивному превосходству ИИ над человеком. Запускается на полную мощность после прохождения порога T1.',
    arch_bottlenecks_title:'Эндогенная социодинамика и Барьеры',
    arch_bottlenecks_desc:'Штрафы заменены органической динамикой. Государства вводят моратории, если Давление (DP) растет, но Захват (IC) еще мал (< 0.5). Если Захват превышает 50%, политики теряют контроль над рубильником. Экономический рост тормозит, если ИИ умен, но ему не доверяют (DP < 0.3).',
    arch_mc_title:'Монте-Карло прогнозирование',
    arch_mc_desc:'Прямое интегрирование SDE системы в будущее. 3000 независимых траекторий до 2068 года позволяют извлечь моменты фазовых переходов τ_T1 … τ_T4 с учетом инерции общества.',
    arch_expert_title:'Эпистемологический симулятор',
    arch_expert_desc:'Интерфейс параметризации априорных распределений P(θ). Позволяет проверять гипотезы о физике интеллекта (Cascade, Hard Wall, Slow Takeoff) и измерять чувствительность заднего распределения.',
    arch_shocks_title:'Экзогенные и эндогенные шоки',
    arch_shocks_desc:'Включает марковские переходы состояний: исчерпание качественных токенов (Data Wall → деградация k_algo), инциденты безопасности, и коллапс инвестиционного пузыря (GPU Bubble → уничтожение капитала).',
    defs_intro:'В модели v5.0 описываются четыре порога институционального поглощения цивилизации:',
    t1_def_title:'T1: Порог когнитивного доминирования',
    t1_def_score:'Критерий: R > Эксперт, W > Эксперт',
    t1_def_text1:'Система стабильно превосходит лучших специалистов в большинстве когнитивных задач. Пользование становится ритуальным. Машины лучше людей пишут архитектуры машин (запуск RSI).',
    t1_def_text2:'Промежуточные стадии: Инструмент → Усилитель → Посредник.',
    t2_def_title:'T2: Автономный порог легитимности',
    t2_def_score:'Критерий: DP > 0.5, IL > 0.3',
    t2_def_text1:'Людям становится выгодно массово передавать управление ИИ. Система выступает как координатор. Начинается приток бесконечного капитала, так как ИИ легитимизирован в корпоративных и гос. процессах.',
    t2_def_text2:'Промежуточные стадии: Координатор → Арбитр → Архитектор среды.',
    t3_def_title:'T3: Порог институционального захвата',
    t3_def_score:'Критерий: IC > 0.6',
    t3_def_text1:'Отключение системы вызовет коллапс институтов и экономики. ИИ получает структурную «броню» от государственного регулирования — политики сами становятся функцией инфраструктуры.',
    t3_def_text2:'Промежуточные стадии: Метасистема → Автономная инфраструктура.',
    t4_def_title:'T4: Порог цивилизационной зависимости',
    t4_def_score:'Критерий: DR > 0.9 и E > E_crit',
    t4_def_text1:'Тотальная зависимость, включая физический (атомный) мир. Большинство критически важных решений цивилизации конструируется извне. Среда мыслит за человека. Фазовый переход.',
    t4_def_text2:'Промежуточные стадии: Постчеловеческий слой → Сингулярность.',
    // Expert Sandbox
    expert_toggle:'Экспертная песочница',
    expert_dimensions:'Когнитивные измерения',
    expert_hw:'Аппаратное обеспечение',
    expert_algo:'Алгоритмы',
    expert_sociotech:'Социотехника',
    expert_barriers:'Барьеры реальности',
    expert_embodiment:'Воплощённость',
    expert_thresholds:'Пороги сингулярности',
    expert_paradigms:'Парадигмы',
    expert_rsi:'RSI',
    expert_shocks:'Шоки',
    expert_governance:'Управление',
    expert_priors:'Априорные допущения',
    expert_benchmarks:'Бенчмарки',
    expert_deep:'Углублённые настройки',
    expert_reset:'Сбросить к умолчанию',
    expert_apply:'Применить и запустить',
    // Data panel
    data_panel_year:'Год', data_panel_event:'Модель', data_panel_source:'Источники',
    data_panel_loading:'Данные загружаются...',
    // v3 params panel
    v3_params_title:'Параметры симуляции', v3_no_t4:'T4 не достигнут ни одной частицей к 2068',
    wm_posterior_title:'Текущие апостериорные веса гипотез',
  },
  en: {
    // Header
    hdr_title:'Singularity Forecaster', hdr_sub:'v5.4 — Four Stages of Disengagement',
    // Status bar
    sb_t1:'Median T1 (Cognitive Dominance)', sb_t2:'Median T2 (Autonomous Legitimacy)',
    sb_t3:'Median T3 (Institutional Capture)', sb_t4:'Median T4 (Civilizational Dependency)',
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
    tip1:'Probability Density Function (PDF) approximation of stopping times τ = inf {t : C(t) ≥ C_crit}. Computed via Monte Carlo integration (N=3000) over the posterior particle ensemble.',
    tip3:'Empirical Cumulative Distribution Function (CDF), F(t) = P(T ≤ t). Represents the monotonically increasing probability of passing T2 and T4 stages by a given year, accounting for all uncertainties.',
    tip5:'Sensitivity Heatmap. Demonstrates the non-linear response of median time τ̃_T2 to perturbations in the latest observation vector (R, A). Assesses forecast elasticity to Reasoning and Agency metrics.',
    tip6:'Projection of 30 stochastic trajectories C(t) from the ensemble. Visualizes phase transitions (paradigm shifts), RSI feedback loops, and endogenous shocks (bubble bursts, moratoriums).',
    tip7:'Log-space decomposition ∫₀ᵗ (k_hw + k_algo + k_rsi) dt. Areas represent the integral contribution of hardware scaling, algorithmic efficiency, paradigm shifts, and recursive feedback (RSI).',
    tip_gap:'Epistemic divergence between cognitive capacity (Reasoning) and causal grounding (World Modeling). A high-risk zone where R(t) ≫ W(t), characterized by structural hallucinations.',
    tip8:'Markov estimation of the Embodiment latent variable. Top: percentile corridor of E(t) calibrated against empirical robotic indices. Bottom: marginal posterior distribution of the E_ceiling parameter.',
    ch_t1:'T1: Dominance', ch_t2:'T2: Legitimacy', ch_t3:'T3: Capture', ch_t4:'T4: Dependency',
    ch1_xlabel:'Year', ch1_ylabel:'Runs',
    ch3_xlabel:'Year', ch3_ylabel:'P(%)', ch3_pt2:'P(T2)', ch3_pt4:'P(T4)',
    ch5_label:'Years to T2', ch5_colorbar:'Years to T2', ch5_xaxis:'SWE-bench (%)', ch5_yaxis:'ARC-AGI (%)', ch5_loading:'Computing matrix (async)...',
    ch7_ylabel:'Cumulative contribution (log FLOPs)',
    ch8_median:'Median (MC)', ch8_p1090:'p10..p90', ch8_p2575:'p25..p75', ch8_real:'Real robots', ch8_t4req:'T4 requirement', ch8_bypass:'HW bypass', ch8_y_main:'Embodiment (0..10)', ch8_x_hist:'embodiment_ceiling', ch8_y_hist:'# particles',
    fY_suffix:' yrs', fY_gt:'> 40 yrs',
    // About
    about_title:'v5.0 Methodology',
    about_intro:'Model v5.0 shifts from "raw intelligence extrapolation" to the epidemiology of decision-making. We model not just the growth of AI cognitive abilities, but the process of voluntary control transfer (Delegation Pressure) and subsequent structural capture of human civilization (Institutional Capture). AI takes over the world not simply because it is smart, but because humans willingly delegate their institutions to it.',
    defs_label:'Architecture and Contours',
    defs_label_arch:'Latent Space Topology',
    defs_label_contours:'Dynamic Contours of the Model',
    arch_tracker_title:'Bayesian Inference (Particle Filter)',
    arch_tracker_desc:'An ensemble of N=1000 particles. Upon receiving benchmark observations, hypothesis weights update via Gaussian likelihood. Chatbot Arena Elo now directly calibrates the P (Persuasion) parameter, pruning unlikely scenarios.',
    arch_dims_title:'Cognitive and Sociotechnical Layers',
    arch_dims_desc:'Base space: Reasoning (R), World Modeling (W), Agency (A), Embodiment (E). Layered above is the sociotechnical framework: Persuasion (P), Delegation Pressure (DP), Institutional Legitimacy (IL), Institutional Capture (IC), and Dependency Ratio (DR).',
    ch_gap_title: '6. Causal Gap (Hallucination Gap)',
    arch_paradigm_title:'Stochastic Paradigm Shifts',
    arch_paradigm_desc:'Overcoming structural architecture limits is modeled as a Poisson process. Intensity increases upon scientific saturation and capital surplus (Compute Overhang). The efficacy of subsequent shifts decays.',
    arch_rsi_title:'RSI Dynamics (Recursive Self-Improvement)',
    arch_rsi_desc:'Autonomous R&D acceleration. The generation rate of algorithmic improvements is proportional to AI\'s cognitive superiority over humans. Triggered fully after crossing the T1 threshold.',
    arch_bottlenecks_title:'Endogenous Sociodynamics and Barriers',
    arch_bottlenecks_desc:'Fixed penalties are replaced by organic dynamics. Governments enforce moratoriums if Delegation Pressure (DP) rises but Capture (IC) is still low (< 0.5). Once Capture exceeds 50%, politicians lose control. Economic growth stalls if AI is smart but untrusted (DP < 0.3).',
    arch_mc_title:'Monte Carlo Forecasting',
    arch_mc_desc:'Forward integration of system SDEs into the future. 3000 independent trajectories up to 2068 allow extraction of phase transition times τ_T1 … τ_T4 accounting for societal inertia.',
    arch_expert_title:'Epistemological Simulator',
    arch_expert_desc:'An interface for parameterizing prior distributions P(θ). Allows researchers to test hypotheses about the nature of intelligence (Cascade, Hard Wall, Slow Takeoff) and measure posterior sensitivity.',
    arch_shocks_title:'Exogenous and Endogenous Shocks',
    arch_shocks_desc:'Includes Markov state transitions: depletion of high-quality tokens (Data Wall), safety incidents, and investment bubble collapse (GPU Bubble).',
    defs_intro:'The v5.0 model describes four thresholds of institutional absorption of civilization:',
    t1_def_title:'T1: Cognitive Dominance Threshold',
    t1_def_score:'Criterion: R > Expert, W > Expert',
    t1_def_text1:'System consistently outperforms top specialists in most cognitive tasks. Usage becomes ritualistic. Machines write machine architectures better than humans (RSI triggers).',
    t1_def_text2:'Role in model: onset of understanding loss. Trigger for autonomous scaling.',
    t2_def_title:'T2: Autonomous Legitimacy Threshold',
    t2_def_score:'Criterion: DP > 0.5, IL > 0.3',
    t2_def_text1:'It becomes highly profitable for humans to massively transfer control to AI. The system acts as a coordinator. Infinite capital inflow begins as AI becomes legitimized in corporate and state processes.',
    t2_def_text2:'Role in model: trigger for massive capital integration and subsequent dependency.',
    t3_def_title:'T3: Institutional Capture Threshold',
    t3_def_score:'Criterion: IC > 0.6',
    t3_def_text1:'Disconnecting the system will cause institutional and economic collapse. AI gains structural "armor" against government regulation—politicians themselves become a function of the infrastructure.',
    t3_def_text2:'Intermediate stages: Metasystem → Autonomous infrastructure.',
    t4_def_title:'T4: Civilizational Dependency Threshold',
    t4_def_score:'Criterion: DR > 0.9 and E > E_crit',
    t4_def_text1:'Total dependency, including the physical (atomic) world. Most critical civilizational decisions are constructed externally. The environment thinks for humans. Phase transition.',
    t4_def_text2:'Intermediate stages: Post-human layer → Civilizational phase transition.',
    // Expert Sandbox
    expert_toggle:'Expert Sandbox',
    expert_dimensions:'Cognitive Dimensions',
    expert_hw:'Hardware',
    expert_algo:'Algorithms',
    expert_sociotech:'Sociotechnical',
    expert_barriers:'Reality Barriers',
    expert_embodiment:'Embodiment',
    expert_thresholds:'Singularity Thresholds',
    expert_paradigms:'Paradigms',
    expert_rsi:'RSI',
    expert_shocks:'Shocks',
    expert_governance:'Governance',
    expert_priors:'Philosophical Priors',
    expert_benchmarks:'Benchmarks',
    expert_deep:'Deep Settings',
    expert_reset:'Reset to Defaults',
    expert_apply:'Apply and Run',
    // Data panel
    data_panel_year:'Year', data_panel_event:'Model', data_panel_source:'Source',
    data_panel_loading:'Loading data...',
    // v3 params panel
    v3_params_title:'Simulation Parameters', v3_no_t4:'No T4 by 2068 in any particle',
    wm_posterior_title:'Current Posterior Hypothesis Weights',
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

    // Цвета World Models: Cascade (Синий), Hard Wall (Красный), Slow Takeoff (Зеленый), Resilient Civ (Фиолетовый)
    let r = 88, g = 166, b = 255;
    if (p.wm === 'hard_wall') { r = 239; g = 68; b = 68; }
    else if (p.wm === 'slow_takeoff') { r = 34; g = 197; b = 94; }
    else if (p.wm === 'resilient_civ') { r = 168; g = 85; b = 247; }

    const alpha = Math.min(1, wNorm * 1.5 + 0.1);
    const radius = 1.5 + wNorm * 4;

    ctx.beginPath();
    ctx.arc(getX(p.x), getY(p.y), radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = 1 + wNorm * 1.5;
    ctx.stroke();
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
      leg.innerHTML = `<span style="color:#58a6ff">●</span> Cascade &nbsp; <span style="color:#ef4444">●</span> Hard Wall &nbsp; <span style="color:#22c55e">●</span> Slow Takeoff &nbsp; <span style="color:#a855f7">●</span> Resilient Civ &nbsp; <span style="color:#f0883e">○</span> ${L.swarm_canvas_legend_median}`;
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

    // Скрываем устаревшие ползунки T2, T3, T4, так как в v5.0 они вычисляются органически
    ['e-t2Threshold', 'e-t3Threshold', 'e-t4Threshold'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        // Находим ближайший контейнер .expert-param и скрываем его
        const container = el.closest('.expert-param') || el.parentElement;
        if (container) container.style.display = 'none';
      }
    });

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
    EXPERT_CONFIG.worldModels = { cascade: 0.70, hardWall: 0.10, slowTakeoff: 0.10, resilientCiv: 0.10 };
    EXPERT_CONFIG.ceilingReasoningBase = 20.0;
    EXPERT_CONFIG.ceilingWorldModelingBase = 24.0;
    EXPERT_CONFIG.rsiMultiplier = 1.5;
    EXPERT_CONFIG.paradigmDecayRate = 0.2;
    EXPERT_CONFIG.barrierAtomsLimit = 2.0;
    EXPERT_CONFIG.hypeGracePeriod = 4.0;
    EXPERT_CONFIG.priorAgencyMean = 12.0;
  } else if (type === 'pessimist') {
    // Зима ИИ: упираемся в стену, робототехника буксует, жесткое регулирование
    EXPERT_CONFIG.worldModels = { cascade: 0.10, hardWall: 0.60, slowTakeoff: 0.10, resilientCiv: 0.20 };
    EXPERT_CONFIG.ceilingReasoningBase = 10.0;
    EXPERT_CONFIG.ceilingWorldModelingBase = 12.0;
    EXPERT_CONFIG.plateauHardWallCeiling = 4.0;
    EXPERT_CONFIG.rsiMultiplier = 0.2;
    EXPERT_CONFIG.barrierAtomsLimit = 0.5;
    EXPERT_CONFIG.alignmentCooldown = 3.0;
    EXPERT_CONFIG.priorAgencyMean = 4.0;
  } else if (type === 'skeptic') {
    // Нейросимволика: старт долгий, но первый сдвиг парадигмы дает огромный скачок
    EXPERT_CONFIG.worldModels = { cascade: 0.10, hardWall: 0.10, slowTakeoff: 0.60, resilientCiv: 0.20 };
    EXPERT_CONFIG.ceilingReasoningBase = 12.0;
    EXPERT_CONFIG.ceilingWorldModelingBase = 15.0;
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
  const actions = document.querySelector('#expertPanel .expert-actions');
  const toggleBtns = document.getElementById('expertToggleBtns');
  if (!actions) return;
  
  const L = LANG[window._lang || 'ru'];
  
  const presets = [
    { id: 'default',   label: L.preset_default   || 'Базовий',         color: '#58a6ff' },
    { id: 'optimist',  label: L.preset_optimist  || 'Оптимизм',   color: '#22c55e' },
    { id: 'skeptic',   label: L.preset_skeptic   || 'Скептицизм', color: '#eab308' },
    { id: 'pessimist', label: L.preset_pessimist || 'Пессимизм',  color: '#ef4444' }
  ];
  
  // Insert preset buttons into expert-actions (expanded view)
  [...presets].reverse().forEach(p => {
    const btn = document.createElement('button');
    btn.textContent = p.label;
    btn.className = 'btn btn-sm';
    btn.style.padding = '5px 10px';
    btn.style.fontSize = '.72rem';
    btn.style.background = 'rgba(22,22,32,0.8)';
    btn.style.border = `1px solid ${p.color}`;
    btn.style.color = p.color;
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'background 0.2s';
    
    btn.onmouseover = () => btn.style.background = p.color + '33';
    btn.onmouseout  = () => btn.style.background = 'rgba(22,22,32,0.8)';
    
    btn.onclick = () => applyExpertPreset(p.id);
    actions.insertBefore(btn, actions.firstChild);
  });

  // Clone compact preset buttons into collapsed header
  if (toggleBtns) {
    toggleBtns.innerHTML = '';
    presets.forEach(p => {
      const b = document.createElement('button');
      b.textContent = p.label;
      b.type = 'button';
      b.className = 'expert-toggle-btn';
      b.style.borderColor = p.color;
      b.style.color = p.color;
      b.onclick = (e) => { e.stopPropagation(); applyExpertPreset(p.id); };
      b.onmouseover = () => { b.style.background = p.color + '22'; };
      b.onmouseout  = () => { b.style.background = ''; };
      toggleBtns.appendChild(b);
    });
    // Compact Apply + Reset buttons
    const applyBtn = document.createElement('button');
    applyBtn.textContent = L.expert_apply || 'Применить';
    applyBtn.type = 'button';
    applyBtn.className = 'expert-toggle-btn';
    applyBtn.style.color = '#58a6ff';
    applyBtn.style.borderColor = '#58a6ff';
    applyBtn.onclick = (e) => { e.stopPropagation(); expertApplyAndRun(); };
    applyBtn.onmouseover = () => { applyBtn.style.background = '#58a6ff22'; };
    applyBtn.onmouseout  = () => { applyBtn.style.background = ''; };
    toggleBtns.appendChild(applyBtn);
    
    const resetBtn = document.createElement('button');
    resetBtn.textContent = L.expert_reset || 'Сбросить';
    resetBtn.type = 'button';
    resetBtn.className = 'expert-toggle-btn';
    resetBtn.style.color = '#ef4444';
    resetBtn.style.borderColor = '#ef4444';
    resetBtn.onclick = (e) => { e.stopPropagation(); expertResetDefaults(); };
    resetBtn.onmouseover = () => { resetBtn.style.background = '#ef444422'; };
    resetBtn.onmouseout  = () => { resetBtn.style.background = ''; };
    toggleBtns.appendChild(resetBtn);
  }
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
  const costPerM = Math.max(0.01, 19.625 * Math.exp(-0.4 * medR10));

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

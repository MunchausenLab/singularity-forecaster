# Singularity Forecaster

**Вероятностный прогноз сроков технологической сингулярности** — Монте-Карло симуляция с байесовским выводом, развёрнутая на Cloudflare Pages.

**Live:** [https://singularity-forecaster.pages.dev](https://singularity-forecaster.pages.dev)

## Модель v5.4

Симуляция моделирует рост четырёх когнитивных метрик ИИ:

- **R** — Reasoning (логический вывод)
- **A** — Agency (автономность действий)
- **W** — World Modeling (понимание мира)
- **E** — Embodiment (робототехника / физическое воплощение)

### Четыре стадии отлучения

| Порог | Название | Критерий |
|-------|----------|----------|
| T1 | Когнитивное доминирование | R ≥ порог, W ≥ 60% от R |
| T2 | Автономная легитимность | DP > 0.5, IL > 0.3 |
| T3 | Институциональный захват | IC > 0.6 |
| T4 | Цивилизационная зависимость | DR > 0.9, E ≥ порог |

### Социотехнический слой (v5.0+)

Модель включает эндогенные переменные:

- **P** (Persuasion) — убедительность ИИ
- **DP** (Delegation Pressure) — давление делегирования
- **IL** (Institutional Legitimacy) — легитимность институтов
- **IC** (Institutional Capture) — институциональный захват
- **II** (Institutional Immunity) — иммунитет институтов
- **DR** (Dependency Ratio) — коэффициент зависимости

### Digital Grounding (v5.4)

World Modeling (W) растёт не только через робототехнику (E), но и через цифровые среды — агентность (A), написание кода, виртуальные симуляции:

```
epistemicGrounding = 0.3 + 0.4 * digitalGrounding(A) + 0.3 * physicalGrounding(E)
```

## Стек

- **Фронтенд:** чистый HTML/CSS/JS (SPA), Plotly.js для графиков
- **Хостинг:** Cloudflare Pages (бесплатно, edge CDN)
- **Вычисления:** полностью клиентские, без серверной части
- **Авторизация git:** SSH key (ed25519)

## Структура

```
singularity-forecaster/
├── index.html                    # SPA — точка входа
├── singularity-core.js           # Ядро симуляции (~3900 строк)
│   ├── simulateToYear()          # Базовая симуляция одного сценария
│   ├── runMonteCarloForecast()   # Монте-Карло с байесовским обновлением
│   ├── runScenarioOverlay()      # Веер сценариев
│   ├── runDecomposition()        # Вклад компонент (HW/Algo/Paradigm)
│   └── LANG{}                    # Локализация RU/EN
├── .github/workflows/deploy.yml  # GitHub Actions → Cloudflare Pages
├── .pre-commit-config.yaml       # Pre-commit hooks (защита workflows)
└── README.md
```

## Графики

1. **Гистограмма** — распределение года достижения T2
2. **Кумулятивная** — CDF вероятности по годам
3. **Веер сценариев** — траектории R, A, W, E во времени
4. **Вклад компонент** — stacked area: HW / Algo / Paradigm
5. **Карта чувствительности** — тепловая карта T2 от ARC и SWE-Bench
6. **Каузальный разрыв** — R vs W (зона галлюцинаций)
7. **Embodiment** — динамика робототехники и связанных метрик

## Локальная разработка

Просто открой `index.html` в браузере или запи через любой статический сервер:

```bash
npx serve .
```

## Деплой

Пуш в `main` → автоматический деплой через GitHub Actions → Cloudflare Pages.

## Безопасность

- Pre-commit hooks блокируют коммиты в `.github/workflows/` без `--no-verify`
- SSH-ключи вместо PAT для git-авторизации
- Секреты (CF_API_TOKEN) хранятся в GitHub Secrets

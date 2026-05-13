# Singularity Forecaster

Вероятностный прогноз сроков AGI/ASI — Монте-Карло симуляция, развёрнутая на Cloudflare Pages.

**Live:** [https://singularity-forecaster.pages.dev](https://singularity-forecaster.pages.dev)

## Стек
- **Фронтенд:** чистый HTML/CSS/JS (SPA), Plotly.js для графиков
- **Хостинг:** Cloudflare Pages (бесплатно, edge CDN)
- **Вычисления:** полностью клиентские — Web Workers опционально для больших N

## Быстрый старт

### Локальная разработка
```bash
npm install
npm run dev
```

### Деплой
```bash
npm run deploy
# или вручную:
npx wrangler pages deploy --project-name singularity-forecaster .
```

### Автодеплой через GitHub Actions
1. Пуш в `main` → автоматический деплой
2. Требуется секрет `CF_API_TOKEN` в настройках репо

### Настройка CI
```bash
# В настройках GitHub репо → Secrets and variables → Actions
# Добавить CF_API_TOKEN (Cloudflare API Token)
```

## Структура
```
singularity-cloud/
├── index.html              # Единственная точка входа (SPA)
├── singularity-core.js     # Ядро симуляции (переношено с Python)
├── wrangler.toml           # Cloudflare Pages конфиг
├── package.json            # Скрипты деплоя
├── deploy.sh               # Двухэтапный деплой (GitHub → CF Pages)
├── .env.example            # Шаблон переменных окружения
├── .github/workflows/deploy.yml  # GitHub Actions
└── README.md
```

## Фичи
- 4 интерактивных графика (Plotly.js): гистограмма, траектория, кумулятивная, чувствительность
- 6 пользовательских параметров: N, HW, Algo, Ceiling, Data Wall start
- Переключатель языков RU/EN
- Экспорт JSON-результатов
- Модульный дизайн: ядро (`singularity-core.js`) отделено от UI

## Кросс-валидация
Python v2.1 vs JS Cloud Core — 24/24 метрик совпали (N=5000, 3 seed, допуски на основе MC standard error + PRNG divergence buffer).

## v3 (планируется)
- Байесовский Particle Filter с реальными наблюдениями
- Web Worker для некор блокирующего расчёта
- Прогресс-бар в реальном времени
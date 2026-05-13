# Singularity Forecaster

Вероятностный прогноз сроков AGI/ASI — Монте-Карло симуляция, развёрнутая на Cloudflare Pages.

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

### Структура
```
singularity-cloud/
├── index.html          # Единственная точка входа (SPA)
├── singularity-core.js  # Ядро симуляции (переношено с Python)
├── wrangler.toml        # Cloudflare Pages конфиг
├── package.json
└── README.md
```

## Фичи
- 4 интерактивных графика (Plotly.js): гистограмма, траектория, кумулятивная, чувствительность
- 6 пользовательских параметров: N, HW, Algo, Ceiling, Data Wall start
- Переключатель языков RU/EN
- Экспорт JSON-результатов
- Модульный дизайн: ядро (`singularity-core.js`) отделено от UI

## v3 (планируется)
- Байесовский Particle Filter с реальными наблюдениями
- Web Worker для некор блокирующего расчёта
- Прогресс-бар в реальном времени
#!/usr/bin/env python3
"""
v3.0 x Artificial Analysis (Байесовский трекер)
============================================================
Скрипт использует данные бенчмарков (Intelligence, Agentic Index) 
для корректировки прогноза наступления AGI.

Частицы (гипотезы) трекают 2 главных неизвестных:
  1. hw_months (Как быстро мы масштабируем железо)
  2. agency_ceiling (Где находится фундаментальный предел Трансформеров)

При поступлении новых данных маловероятные гипотезы отсеиваются.
"""

import math
import datetime
import numpy as np
from copy import deepcopy

# ---------------------------------------------------------------------------
# БАЗОВЫЕ НАСТРОЙКИ (v3.0 Константы)
# ---------------------------------------------------------------------------
CONFIG = {
    "BASE_YEAR": 2026.0,
    "FRONTIER_LOG_FLOPS": 27.5, # Уровень мая 2026
    
    "THRESHOLDS": {
        "agi": 10.0, # 100 баллов по шкале AA
    },
    
    "DIMENSIONS": {
        "reasoning": {"slope": 0.55, "ceiling": 15.0}, # Интеллект масштабируется хорошо
        "agency":    {"slope": 0.30},                  # Потолок агентности мы будем УГАДЫВАТЬ Байесом
    },
    
    "SCALING_LAW": {
        "paradigm_shift_prob": 0.15, # 15% в год на архитектурный прорыв
        "shift_multiplier": 3.0,     # Прорыв поднимает потолки
    },
    
    "BOTTLENECKS": {
        "energy_wall_start": 2026.0,
        "energy_damping": 0.10,
        "econ_wall_start": 2026.5,
        "econ_damping": 0.15,        # Сильный штраф, если модель умная, но не агентная (нет ROI)
    }
}

# ---------------------------------------------------------------------------
# ВСПОМОГАТЕЛЬНАЯ МАТЕМАТИКА
# ---------------------------------------------------------------------------

def sigmoid(x):
    x = max(min(x, 100.0), -100.0)
    return 1.0 / (1.0 + math.exp(-x))

def compute_dim(log_diff, slope, ceiling):
    S_HALF = 0.5
    raw = ceiling * (sigmoid(slope * log_diff) - S_HALF) + 1.0
    return max(raw, 0.01)

# ---------------------------------------------------------------------------
# ЯДРО СИМУЛЯЦИИ (Детерминированный шаг для оценки правдоподобия)
# ---------------------------------------------------------------------------

def simulate_to_year(particle, target_year, cfg=CONFIG):
    """
    Симулирует развитие для конкретной частицы (гипотезы) до нужного года.
    Используется фильтром для сравнения гипотезы с реальными данными AA.
    """
    dt = 1.0 / 12.0 # 1 месяц
    steps = max(1, int((target_year - cfg["BASE_YEAR"]) * 12))
    
    flops_log = cfg["FRONTIER_LOG_FLOPS"]
    base_log = flops_log
    
    hw_k = math.log(2) / (particle["hw_months"] / 12.0) # рост в год
    
    for step in range(steps):
        current_year = cfg["BASE_YEAR"] + step * dt
        log_diff = flops_log - base_log
        
        # Считаем показатели
        reasoning = compute_dim(log_diff, cfg["DIMENSIONS"]["reasoning"]["slope"], cfg["DIMENSIONS"]["reasoning"]["ceiling"])
        agency = compute_dim(log_diff, cfg["DIMENSIONS"]["agency"]["slope"], particle["agency_ceiling"])
        
        # Экономический штраф (ROI)
        damping = 1.0
        if current_year > cfg["BOTTLENECKS"]["econ_wall_start"]:
            gap = reasoning - agency
            if gap > 2.0:
                damping *= math.exp(-cfg["BOTTLENECKS"]["econ_damping"] * (gap - 2.0))
        
        flops_log += hw_k * damping * dt
        
    return reasoning, agency

# ---------------------------------------------------------------------------
# БАЙЕСОВСКИЙ ФИЛЬТР (Particle Filter)
# ---------------------------------------------------------------------------

class ArtificialAnalysisTracker:
    def __init__(self, n_particles=1000):
        self.n = n_particles
        self.particles = []
        self.weights = np.ones(n_particles) / n_particles
        
        # Априорные гипотезы (до загрузки данных AA)
        for _ in range(n_particles):
            self.particles.append({
                # Гипотеза: темп роста железа (от 5 до 12 месяцев)
                "hw_months": np.random.normal(7.5, 1.5),
                # Гипотеза: потолок агентности текущей архитектуры (от 2.0 до 6.0)
                "agency_ceiling": np.random.normal(4.0, 1.0) 
            })
            
    def observe_aa_data(self, year, aa_intelligence_index, aa_agentic_index, sigma=0.5):
        """
        Байесовское обновление по данным ArtificialAnalysis.ai
        aa_intelligence_index: Бенчмарк эрудиции (например, 62.0)
        aa_agentic_index: Бенчмарк агентности (например, 47.0)
        """
        target_reasoning = aa_intelligence_index / 10.0
        target_agency = aa_agentic_index / 10.0
        
        print(f"[{year}] Поступили данные AA: Intelligence={aa_intelligence_index:.1f}, Agentic={aa_agentic_index:.1f}")
        
        for i, p in enumerate(self.particles):
            # Если гипотеза абсурдна (отрицательные значения) - убиваем частицу
            if p["hw_months"] < 1.0 or p["agency_ceiling"] < 1.0:
                self.weights[i] = 0
                continue
                
            # Прогнозируем, что ожидала эта частица к этому году
            pred_reasoning, pred_agency = simulate_to_year(p, year)
            
            # Насколько прогноз совпал с фактом (Гауссово правдоподобие)
            error_res = ((target_reasoning - pred_reasoning) / sigma) ** 2
            error_agn = ((target_agency - pred_agency) / sigma) ** 2
            
            log_lik = -0.5 * (error_res + error_agn)
            self.weights[i] *= np.exp(max(-50, log_lik)) # Избегаем underflow
            
        self._normalize_and_resample()
        
    def _normalize_and_resample(self):
        weight_sum = np.sum(self.weights)
        if weight_sum == 0:
            print("ВНИМАНИЕ: Все гипотезы оказались неверны (коллапс). Сброс фильтра.")
            self.weights = np.ones(self.n) / self.n
            return
            
        self.weights /= weight_sum
        
        # ESS (Effective Sample Size)
        ess = 1.0 / np.sum(self.weights ** 2)
        print(f"  Разнообразие гипотез (ESS): {ess:.0f} / {self.n}")
        
        # Ресэмплинг, если половина гипотез вымерла
        if ess < self.n * 0.5:
            indices = np.random.choice(self.n, size=self.n, p=self.weights)
            new_particles = []
            for idx in indices:
                # Добавляем "шум" (roughening) при клонировании, чтобы избежать вырождения
                p_copy = deepcopy(self.particles[idx])
                p_copy["hw_months"] += np.random.normal(0, 0.2)
                p_copy["agency_ceiling"] += np.random.normal(0, 0.1)
                new_particles.append(p_copy)
                
            self.particles = new_particles
            self.weights = np.ones(self.n) / self.n
            print("  [Ресэмплинг] Маловероятные гипотезы удалены, успешные клонированы.")
            
    def get_summary(self):
        hw = np.average([p["hw_months"] for p in self.particles], weights=self.weights)
        agn = np.average([p["agency_ceiling"] for p in self.particles], weights=self.weights)
        return hw, agn

    def run_monte_carlo_forecast(self, n_runs=1000):
        """
        Запускает полные стохастические траектории (со случайными сменами парадигм),
        используя параметры выживших частиц.
        """
        agi_years = []
        cfg = CONFIG
        dt = 1.0 / 12.0
        
        indices = np.random.choice(self.n, size=n_runs, p=self.weights)
        
        for idx in indices:
            p = self.particles[idx]
            
            flops_log = cfg["FRONTIER_LOG_FLOPS"]
            base_log = flops_log
            hw_k = math.log(2) / (p["hw_months"] / 12.0)
            
            ceiling_agency = p["agency_ceiling"]
            current_year = cfg["BASE_YEAR"]
            
            agi_achieved = False
            
            for step in range(12 * 40): # 40 лет макс
                current_year += dt
                
                # Случайный архитектурный прорыв (Paradigm Shift)
                if np.random.random() < cfg["SCALING_LAW"]["paradigm_shift_prob"] * dt:
                    ceiling_agency *= cfg["SCALING_LAW"]["shift_multiplier"]
                    base_log -= 0.5 # Смягчение скачка
                
                log_diff = flops_log - base_log
                reasoning = compute_dim(log_diff, cfg["DIMENSIONS"]["reasoning"]["slope"], cfg["DIMENSIONS"]["reasoning"]["ceiling"])
                agency = compute_dim(log_diff, cfg["DIMENSIONS"]["agency"]["slope"], ceiling_agency)
                
                # AGI достигается, когда все параметры >= 10.0
                if reasoning >= cfg["THRESHOLDS"]["agi"] and agency >= cfg["THRESHOLDS"]["agi"]:
                    agi_years.append(current_year)
                    agi_achieved = True
                    break
                    
                # Экономика и энергия
                damping = 1.0
                if current_year > cfg["BOTTLENECKS"]["econ_wall_start"] and (reasoning - agency) > 2.0:
                    damping *= math.exp(-cfg["BOTTLENECKS"]["econ_damping"] * (reasoning - agency - 2.0))
                    
                flops_log += hw_k * damping * dt
                
            if not agi_achieved:
                agi_years.append(float('inf'))
                
        return np.array(agi_years)

# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    print(f"{'='*60}")
    print(" BAYESIAN AGI TRACKER (Powered by ArtificialAnalysis.ai)")
    print(f"{'='*60}")
    
    tracker = ArtificialAnalysisTracker(n_particles=2000)
    
    hw_prior, agn_prior = tracker.get_summary()
    print("\n[АПРИОРНЫЕ ГИПОТЕЗЫ (Слепая вера)]")
    print(f"  Ожидаемое время удвоения железа: ~{hw_prior:.1f} мес.")
    print(f"  Ожидаемый потолок агентности Трансформеров: ~{agn_prior:.1f} (из 10.0)")
    
    # ---------------------------------------------------------
    # ВЛИВАЕМ РЕАЛЬНЫЕ ДАННЫЕ (Май 2026)
    # ---------------------------------------------------------
    print("\n[ЗАГРУЗКА РЕАЛЬНЫХ ДАННЫХ]")
    
    # Предположим, мы посмотрели на ArtificialAnalysis в мае 2026.4:
    # Intelligence Index = 65.0 (GPT-5.5 / Claude Opus 4.7)
    # Agentic Index = 47.0 (Застряли на многошаговых задачах)
    tracker.observe_aa_data(
        year=2026.4, 
        aa_intelligence_index=65.0, 
        aa_agentic_index=47.0
    )
    
    # Допустим, мы добавили прогноз/данные из будущего (Январь 2027)
    # Intelligence вырос до 75.0 (появился xAI Grok-3 / GPT-6)
    # А вот Agentic вырос всего до 49.0 (доказательство проблемы масштабирования $p^N$)
    print("\n[ЗАГРУЗКА ДАННЫХ ИЗ ЯНВАРЯ 2027 (Эмуляция)]")
    tracker.observe_aa_data(
        year=2027.0, 
        aa_intelligence_index=75.0, 
        aa_agentic_index=49.0
    )
    
    # ---------------------------------------------------------
    # РЕЗУЛЬТАТЫ БАЙЕСА
    # ---------------------------------------------------------
    hw_post, agn_post = tracker.get_summary()
    print(f"\n{'='*60}")
    print(" АПОСТЕРИОРНЫЕ ВЫВОДЫ (Чему научилась модель)")
    print(f"{'='*60}")
    print("Модель увидела, что Интеллект растет быстро, а Агентность стагнирует.")
    print(f"  Скорректированное удвоение железа: {hw_post:.1f} мес. (БЫСТРЕЕ априора)")
    print(f"  Скорректированный потолок агентности: {agn_post:.2f} (НИЖЕ априора)")
    
    print("\n[ПРОГНОЗ AGI НА БАЗЕ ВЫЖИВШИХ ГИПОТЕЗ...]")
    agi_y = tracker.run_monte_carlo_forecast(n_runs=2000)
    
    finite_agi = agi_y[np.isfinite(agi_y)]
    median_year = np.percentile(finite_agi, 50) if len(finite_agi) else float('inf')
    
    print("\nРезультаты:")
    print(f"  Медианный год AGI:    {median_year:.1f} год")
    print(f"  10-й перцентиль:      {np.percentile(finite_agi, 10):.1f} год")
    print(f"  90-й перцентиль:      {np.percentile(finite_agi, 90):.1f} год")
    print(f"  Не достигнут за 40 лет: {100*(1 - len(finite_agi)/len(agi_y)):.1f}%")

if __name__ == "__main__":
    main()
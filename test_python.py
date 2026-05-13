#!/usr/bin/env python3
"""
Compare test: Python singularity_v2_1 vs JS singularity-core.js
Run with fixed seed, output summary metrics for comparison.
"""
import numpy as np
import json
import sys
import os

# Add parent dir to find singularity_v2_1
sys.path.insert(0, '/mnt/d/prod/singularity')
import singularity_v2_1 as sv2

# Fixed seed for reproducibility
SEED = 42
N_RUNS = 1000  # smaller for speed

np.random.seed(SEED)

def percentile(arr, p):
    finite = arr[np.isfinite(arr)]
    if len(finite) == 0:
        return float('inf')
    return np.percentile(finite, p)

def cdf(arr, x):
    return 100.0 * np.sum(arr <= x) / len(arr)

def run_comparison():
    cfg = json.loads(json.dumps(sv2.CONFIG))
    cfg['SIMULATION']['n_monte_carlo'] = N_RUNS

    now = __import__('datetime').datetime.now()
    agi_list, asi_list = [], []

    for i in range(N_RUNS):
        model = sv2.SingularityModelV2(cfg)
        d_agi, d_asi = model.run_trajectory(return_all=False)
        agi_list.append((d_agi - now).days / 365.25 if d_agi else float('inf'))
        asi_list.append((d_asi - now).days / 365.25 if d_asi else float('inf'))

        if (i + 1) % 200 == 0:
            print(f"  Python: {i+1}/{N_RUNS} runs done", file=sys.stderr)

    agi_a = np.array(agi_list)
    asi_a = np.array(asi_list)

    summary = {
        'engine': 'python_v2.1',
        'seed': SEED,
        'n_runs': N_RUNS,
        'agi_median': float(percentile(agi_a, 50)),
        'asi_median': float(percentile(asi_a, 50)),
        'p_agi_2028': float(cdf(agi_a, 2.0)),
        'p_agi_2030': float(cdf(agi_a, 4.0)),
        'p_asi_2028': float(cdf(asi_a, 2.0)),
        'p_asi_2030': float(cdf(asi_a, 4.0)),
        'p_asi_2035': float(cdf(asi_a, 9.0)),
        'p_asi_2040': float(cdf(asi_a, 14.0)),
        'finite_agi_pct': float(np.sum(np.isfinite(agi_a)) / len(agi_a) * 100),
        'finite_asi_pct': float(np.sum(np.isfinite(asi_a)) / len(asi_a) * 100),
    }

    print(json.dumps(summary, indent=2))
    return summary

if __name__ == '__main__':
    print("Running Python v2.1 simulation (seed=42, N=1000)...", file=sys.stderr)
    result = run_comparison()
    # Also save to file for JS comparison
    with open('/mnt/d/prod/singularity-cloud/python_results.json', 'w') as f:
        json.dump(result, f, indent=2)
    print("\nSaved to python_results.json", file=sys.stderr)
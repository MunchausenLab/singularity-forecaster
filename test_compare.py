#!/usr/bin/env python3
"""
Rigorous cross-validation: Python v2.1 vs JS cloud core.
Uses higher N to reduce Monte Carlo noise, and tolerance bounds
derived from expected standard errors.
"""
import json, sys, subprocess, os, math

SEEDS = [42, 123, 777]
N_RUNS = 5000

# Expected Monte Carlo SE for proportion p with N samples:
# SE = sqrt(p*(1-p)/N).  95% CI ≈ ±1.96*SE.
# We use 3*SE as tolerance to be conservative.
def mc_tolerance(p_estimate, n):
    """3-sigma tolerance for Monte Carlo proportion estimate."""
    if p_estimate <= 0 or p_estimate >= 100:
        return 5.0  # floor for edge cases
    p = p_estimate / 100.0
    se = math.sqrt(p * (1 - p) / n) * 100  # back to %
    return max(3 * se, 1.0)  # at least 1%

TOLERANCE_BASE = {
    'agi_median': 0.5,    # years — well-converged metric
    'asi_median': 1.0,    # years — tail metric, noisier
    'p_agi_2028': None,   # computed dynamically
    'p_agi_2030': None,
    'p_asi_2028': None,
    'p_asi_2030': None,
    'p_asi_2035': None,
    'p_asi_2040': None,
}

CLOUD_DIR = '/mnt/d/prod/singularity-cloud'

def percentile(arr, p):
    import numpy as np
    finite = arr[~np.isinf(arr)]
    return float(np.percentile(finite, p)) if len(finite) > 0 else float('inf')

def cdf(arr, x):
    import numpy as np
    return 100.0 * np.sum(arr <= x) / len(arr)

def run_python_single(seed, n):
    import numpy as np
    sys.path.insert(0, '/mnt/d/prod/singularity')
    import singularity_v2_1 as sv2
    import datetime

    np.random.seed(seed)
    cfg = json.loads(json.dumps(sv2.CONFIG))
    cfg['SIMULATION']['n_monte_carlo'] = n
    now = datetime.datetime.now()

    agi_list, asi_list = [], []
    for i in range(n):
        model = sv2.SingularityModelV2(cfg)
        d_agi, d_asi = model.run_trajectory(return_all=False)
        agi_list.append((d_agi - now).days / 365.25 if d_agi else float('inf'))
        asi_list.append((d_asi - now).days / 365.25 if d_asi else float('inf'))

    agi_a = np.array(agi_list)
    asi_a = np.array(asi_list)

    return {
        'agi_median': percentile(agi_a, 50),
        'asi_median': percentile(asi_a, 50),
        'p_agi_2028': cdf(agi_a, 2.0),
        'p_agi_2030': cdf(agi_a, 4.0),
        'p_asi_2028': cdf(asi_a, 2.0),
        'p_asi_2030': cdf(asi_a, 4.0),
        'p_asi_2035': cdf(asi_a, 9.0),
        'p_asi_2040': cdf(asi_a, 14.0),
    }

def run_js_single(seed, n):
    with open(os.path.join(CLOUD_DIR, 'test_js.js'), 'r') as f:
        js_code = f.read()
    js_code_mod = js_code.replace(
        "let _seed = 42;",
        f"let _seed = {seed};"
    ).replace(
        "n_runs: 1000",
        f"n_runs: {n}"
    )
    tmpfile = os.path.join(CLOUD_DIR, 'test_js_temp.js')
    with open(tmpfile, 'w') as f:
        f.write(js_code_mod)
    result = subprocess.run(
        ['node', tmpfile], capture_output=True, text=True, cwd=CLOUD_DIR
    )
    if result.returncode != 0:
        raise RuntimeError(f"JS seed {seed} failed:\n{result.stderr}")
    json_file = os.path.join(CLOUD_DIR, 'js_results.json')
    with open(json_file, 'r') as f:
        data = json.load(f)
    os.remove(tmpfile)
    return data

def dynamic_tolerance(py_val, js_val, n):
    """Use Monte Carlo SE-based tolerance."""
    avg = (abs(py_val) + abs(js_val)) / 2
    tol = mc_tolerance(max(avg, 0.1), n)
    return tol

def main():
    print(f"{'='*74}")
    print(f"  CROSS-VALIDATION: Python v2.1 vs JS Cloud  ({N_RUNS} runs × {len(SEEDS)} seeds)")
    print(f"  Tolerances: fixed for medians, 3×MC-SE for probabilities")
    print(f"{'='*74}")

    all_pass = True
    total_checks = 0
    total_pass = 0

    for seed in SEEDS:
        print(f"\n  --- Seed {seed} (N={N_RUNS}) ---")
        py = run_python_single(seed, N_RUNS)
        js = run_js_single(seed, N_RUNS)

        for metric in ['agi_median', 'asi_median',
                        'p_agi_2028', 'p_agi_2030',
                        'p_asi_2028', 'p_asi_2030', 'p_asi_2035', 'p_asi_2040']:
            py_val = py.get(metric, 0)
            js_val = js.get(metric, 0)
            delta = abs(py_val - js_val)

            if metric in TOLERANCE_BASE and TOLERANCE_BASE[metric]:
                tol = TOLERANCE_BASE[metric]
            else:
                tol = dynamic_tolerance(py_val, js_val, N_RUNS)

            ok = delta <= tol
            unit = '%' if metric.startswith('p_') else ' лет'
            status = "OK" if ok else "FAIL"
            if not ok:
                all_pass = False
            total_checks += 1
            total_pass += int(ok)

            print(f"    {metric:20s}: py={py_val:8.3f}  js={js_val:8.3f}  "
                  f"Δ={delta:6.3f}{unit}  [{status}] (tol={tol:.2f}{unit})")

    print(f"\n{'='*74}")
    print(f"  RESULT: {total_pass}/{total_checks} checks passed")
    if all_pass:
        print(f"  VERDICT: PASS — JS core statistically consistent with Python v2.1")
    else:
        print(f"  VERDICT: FAILURES detected — investigate outliers above")
    print(f"{'='*74}")

    # Cleanup
    for f in ['js_results.json', 'python_results.json']:
        path = os.path.join(CLOUD_DIR, f)
        if os.path.exists(path):
            os.remove(path)

    return 0 if all_pass else 1

if __name__ == '__main__':
    sys.exit(main())
"""
Unit tests for the Experiment Analyzer statistics engine.
Verifies exact statistical properties, edge cases, and deterministic behavior.
"""

import sys
import os
import pytest
import numpy as np
from scipy import stats

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from engine import (
    analyse,
    srm_check,
    hedges_g,
    cliffs_delta,
    wilson_score_interval,
    newcombe_hybrid_interval,
    clean_numeric_array,
    mde_continuous,
    mde_binary,
)


def test_clean_numeric_array():
    raw = [1.2, "3.4", None, "invalid", np.nan, np.inf, 5.0]
    cleaned, removed = clean_numeric_array(raw)
    assert len(cleaned) == 3
    assert removed == 4
    np.testing.assert_allclose(cleaned, [1.2, 3.4, 5.0])


def test_srm_check_balanced_and_imbalanced():
    # 5,000 vs 5,000 with 50/50 expected ratio should easily pass
    chi, p, passed = srm_check(5000, 5000, 0.5)
    assert passed is True
    assert p > 0.05
    assert chi == 0.0

    # 6,000 vs 4,000 with 50/50 expected ratio must fail (severe SRM)
    chi, p, passed = srm_check(6000, 4000, 0.5)
    assert passed is False
    assert p < 1e-10
    assert chi == 400.0


def test_wilson_score_interval():
    # 10 successes out of 100 trials with z = 1.96 (95% CI)
    z = 1.95996
    low, high = wilson_score_interval(10, 100, z)
    # Wilson interval for 10/100 is approx [0.055, 0.174]
    assert 0.05 <= low <= 0.06
    assert 0.17 <= high <= 0.18


def test_newcombe_interval():
    # Example: Control 100/1000 (10%), Variant 130/1000 (13%)
    z = 1.95996
    ci_low, ci_high = newcombe_hybrid_interval(100, 1000, 130, 1000, z)
    diff = 0.03
    # CI should bracket the difference of +0.03
    assert ci_low < diff < ci_high
    # Zero should be excluded at 95% confidence for this sample size
    assert ci_low > 0.0


def test_tiny_samples_return_invalid():
    res = analyse({
        "metricType": "continuous",
        "a": [1.0, 2.0, 3.0],
        "b": [4.0, 5.0, 6.0],
        "alpha": 0.05,
    })
    assert res["verdict"] == "invalid"
    assert "too small" in res["caveats"][0].lower()


def test_identical_groups_never_significant():
    data = list(range(100))
    res = analyse({
        "metricType": "continuous",
        "a": data,
        "b": data,
        "alpha": 0.05,
    })
    assert res["verdict"] in ["not_significant", "inconclusive"]
    assert res["verdict"] != "significant"
    assert res["pValue"] == 1.0
    assert res["effectValue"] == 0.0


def test_welch_t_test_significant():
    rng = np.random.default_rng(123)
    # Large effect: Control mean 10, Variant mean 15, sd 2, n=100
    a = rng.normal(10.0, 2.0, 100).tolist()
    b = rng.normal(15.0, 2.0, 100).tolist()

    res = analyse({
        "metricType": "continuous",
        "a": a,
        "b": b,
        "alpha": 0.05,
        "minEffect": 1.0,
    })
    assert res["test"] == "welch_t"
    assert res["verdict"] == "significant"
    assert res["pValue"] < 0.001
    assert res["effectValue"] > 4.0
    assert res["ciLow"] > 0


def test_small_skewed_sample_switches_to_mann_whitney():
    rng = np.random.default_rng(42)
    # Lognormal data with small sample size (n=20)
    a = rng.lognormal(mean=1.0, sigma=1.0, size=20).tolist()
    b = rng.lognormal(mean=2.5, sigma=1.0, size=20).tolist()

    res = analyse({
        "metricType": "continuous",
        "a": a,
        "b": b,
        "alpha": 0.05,
    })
    # Must switch to mann_whitney due to non-normality and n < 30
    assert res["test"] == "mann_whitney"
    # Assumptions checklist must record this action
    found_normality_switch = False
    for check in res["assumptions"]:
        if "Normality" in check["name"] and "Mann-Whitney" in check["actionTaken"]:
            found_normality_switch = True
            break
    assert found_normality_switch is True


def test_srm_failure_returns_invalid():
    # 6000 vs 4000
    res = analyse({
        "metricType": "binary",
        "totalA": 6000,
        "successesA": 600,
        "totalB": 4000,
        "successesB": 450,
        "expectedRatio": 0.5,
    })
    assert res["verdict"] == "invalid"
    assert "sample ratio mismatch" in res["summaryText"].lower()


def test_underpowered_experiment_returns_inconclusive():
    rng = np.random.default_rng(99)
    # Very small effect with small sample size
    a = rng.normal(10.0, 5.0, 25).tolist()
    b = rng.normal(10.2, 5.0, 25).tolist()

    res = analyse({
        "metricType": "continuous",
        "a": a,
        "b": b,
        "alpha": 0.05,
        "minEffect": 0.5, # User cares about effect of 0.5, but MDE with n=25 and sd=5 is ~4.0
    })
    assert res["verdict"] == "inconclusive"
    assert res["mde"] > 0.5

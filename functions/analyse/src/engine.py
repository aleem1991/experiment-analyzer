"""
Experiment Analyzer — Statistical Analysis Engine
Version: 1.0.0

A pure Python, deterministic statistics engine for A/B testing analysis.
No external network or Appwrite dependencies. Designed for use in Appwrite Functions
and verifiable via pytest and Monte Carlo validation simulations.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
from scipy import stats

ENGINE_VERSION = "1.0.0"


def clean_numeric_array(values: Any) -> Tuple[np.ndarray, int]:
    """
    Cleans raw input into a 1D float array of finite numbers.
    Returns (cleaned_array, removed_count).
    """
    if values is None:
        return np.array([], dtype=float), 0
    
    # Try converting to float array
    raw = np.asarray(values)
    initial_count = raw.size
    
    # Flatten if needed
    flat = raw.flatten()
    
    # Filter valid finite numeric entries
    valid_mask = []
    cleaned_vals = []
    for item in flat:
        try:
            val = float(item)
            if np.isfinite(val):
                cleaned_vals.append(val)
        except (ValueError, TypeError):
            continue

    cleaned = np.array(cleaned_vals, dtype=float)
    removed_count = initial_count - len(cleaned)
    return cleaned, removed_count


def srm_check(n_a: int, n_b: int, expected_ratio: float = 0.5) -> Tuple[float, float, bool]:
    """
    Checks for Sample Ratio Mismatch (SRM) using Chi-square Goodness of Fit.
    expected_ratio is the proportion expected in group A (e.g., 0.5 for 50/50 split).
    Returns (chi_stat, p_value, passed).
    Passed is True if p_value >= 0.001.
    """
    total = n_a + n_b
    if total <= 0 or not (0.01 <= expected_ratio <= 0.99):
        return 0.0, 1.0, True

    f_exp = [total * expected_ratio, total * (1.0 - expected_ratio)]
    chi_res = stats.chisquare([n_a, n_b], f_exp=f_exp)
    p_val = float(chi_res.pvalue)
    chi_stat = float(chi_res.statistic)
    passed = p_val >= 0.001
    return chi_stat, p_val, passed


def hedges_g(a: np.ndarray, b: np.ndarray) -> float:
    """
    Calculates Hedges' g (standardized effect size with small-sample bias correction).
    Effect is defined as mean(b) - mean(a).
    """
    na, nb = len(a), len(b)
    if na < 2 or nb < 2:
        return 0.0
    var_a = a.var(ddof=1)
    var_b = b.var(ddof=1)
    # Pooled standard deviation
    sp = np.sqrt(((na - 1) * var_a + (nb - 1) * var_b) / (na + nb - 2))
    if sp == 0:
        return 0.0
    d = (b.mean() - a.mean()) / sp
    # Small-sample bias correction factor
    j = 1.0 - (3.0 / (4.0 * (na + nb) - 9.0))
    return float(d * j)


def cliffs_delta(a: np.ndarray, b: np.ndarray) -> float:
    """
    Calculates Cliff's delta (non-parametric effect size for ordinal/continuous).
    Range: [-1.0, +1.0]. Represents the probability that a value in b is greater than
    a value in a minus the reverse probability.
    """
    na, nb = len(a), len(b)
    if na == 0 or nb == 0:
        return 0.0
    try:
        u_res = stats.mannwhitneyu(b, a, alternative="two-sided")
        u = float(u_res.statistic)
        return float(2.0 * u / (na * nb) - 1.0)
    except Exception:
        return 0.0


def wilson_score_interval(x: int, n: int, z: float) -> Tuple[float, float]:
    """
    Calculates Wilson score confidence interval for a single proportion x/n.
    """
    if n == 0:
        return 0.0, 0.0
    p = x / n
    denom = 1.0 + (z * z) / n
    center = (p + (z * z) / (2.0 * n)) / denom
    margin = z * np.sqrt((p * (1.0 - p)) / n + (z * z) / (4.0 * n * n)) / denom
    return float(max(0.0, center - margin)), float(min(1.0, center + margin))


def newcombe_hybrid_interval(x_a: int, n_a: int, x_b: int, n_b: int, z: float) -> Tuple[float, float]:
    """
    Calculates the Newcombe Hybrid Score Interval for the difference between two independent
    proportions (p_b - p_a). Proven to have much better coverage than the Wald normal interval.
    """
    if n_a == 0 or n_b == 0:
        return 0.0, 0.0
    p_a = x_a / n_a
    p_b = x_b / n_b
    diff = p_b - p_a

    l_a, u_a = wilson_score_interval(x_a, n_a, z)
    l_b, u_b = wilson_score_interval(x_b, n_b, z)

    ci_low = diff - np.sqrt((p_b - l_b) ** 2 + (u_a - p_a) ** 2)
    ci_high = diff + np.sqrt((u_b - p_b) ** 2 + (p_a - l_a) ** 2)

    return float(max(-1.0, ci_low)), float(min(1.0, ci_high))


def bootstrap_diff_means(a: np.ndarray, b: np.ndarray, alpha: float, seed: int, n_resamples: int = 2000) -> Tuple[float, float]:
    """
    Computes a BCa (or percentile fallback) bootstrap confidence interval for mean(b) - mean(a).
    """
    rng = np.random.default_rng(seed)

    def diff_stat(y, x, axis):
        return np.mean(y, axis=axis) - np.mean(x, axis=axis)

    try:
        res = stats.bootstrap(
            (b, a),
            statistic=diff_stat,
            vectorized=True,
            n_resamples=n_resamples,
            confidence_level=1.0 - alpha,
            method="BCa",
            random_state=rng,
        )
        return float(res.confidence_interval.low), float(res.confidence_interval.high)
    except Exception:
        # Fallback to percentile bootstrap if BCa acceleration fails
        try:
            res = stats.bootstrap(
                (b, a),
                statistic=diff_stat,
                vectorized=True,
                n_resamples=n_resamples,
                confidence_level=1.0 - alpha,
                method="percentile",
                random_state=rng,
            )
            return float(res.confidence_interval.low), float(res.confidence_interval.high)
        except Exception:
            # Fallback to normal approximation
            se = np.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))
            z = stats.norm.ppf(1.0 - alpha / 2.0)
            diff = b.mean() - a.mean()
            return float(diff - z * se), float(diff + z * se)


def mde_continuous(sd: float, n_a: int, n_b: int, alpha: float = 0.05, power: float = 0.80) -> float:
    """
    Computes Minimum Detectable Effect (MDE) for continuous metric at declared power (80%).
    Formula: (z_(1 - alpha/2) + z_power) * sd * sqrt(1/na + 1/nb)
    """
    if n_a <= 0 or n_b <= 0 or sd <= 0:
        return 0.0
    z_alpha = stats.norm.ppf(1.0 - alpha / 2.0)
    z_power = stats.norm.ppf(power)
    return float((z_alpha + z_power) * sd * np.sqrt(1.0 / n_a + 1.0 / n_b))


def mde_binary(pooled_p: float, n_a: int, n_b: int, alpha: float = 0.05, power: float = 0.80) -> float:
    """
    Computes Minimum Detectable Effect (absolute risk difference) for binary proportions at 80% power.
    """
    if n_a <= 0 or n_b <= 0:
        return 0.0
    p = np.clip(pooled_p, 0.0001, 0.9999)
    z_alpha = stats.norm.ppf(1.0 - alpha / 2.0)
    z_power = stats.norm.ppf(power)
    return float((z_alpha + z_power) * np.sqrt(p * (1.0 - p)) * np.sqrt(1.0 / n_a + 1.0 / n_b))


def detect_outliers_iqr(arr: np.ndarray) -> Tuple[int, float, float]:
    """
    Tukey's 1.5 * IQR outlier detection rule.
    Returns (outlier_count, lower_bound, upper_bound).
    """
    if len(arr) < 4:
        return 0, float("-inf"), float("inf")
    q25, q75 = np.percentile(arr, [25, 75])
    iqr = q75 - q25
    lower_bound = q25 - 1.5 * iqr
    upper_bound = q75 + 1.5 * iqr
    outliers = int(np.sum((arr < lower_bound) | (arr > upper_bound)))
    return outliers, float(lower_bound), float(upper_bound)


def generate_summary_text(
    verdict: str,
    label_a: str,
    label_b: str,
    effect_name: str,
    effect_val: float,
    ci_low: float,
    ci_high: float,
    ci_level: float,
    p_val: float,
    mde: float,
    min_effect: float,
    invalid_reason: Optional[str] = None,
) -> str:
    """
    Generates plain-language explanation templates based on mathematical results.
    No LLM required; completely deterministic and reliable.
    """
    ci_pct = int(round(ci_level * 100))
    direction = "higher" if effect_val >= 0 else "lower"
    abs_effect = abs(effect_val)

    if verdict == "significant":
        return (
            f"{label_b} averaged {abs_effect:.3g} {direction} than {label_a} "
            f"({ci_pct}% confidence interval: {ci_low:.3g} to {ci_high:.3g}, p = {p_val:.3g}). "
            f"The confidence interval excludes zero, indicating that this difference is statistically reliable and unlikely to be noise."
        )
    elif verdict == "not_significant":
        return (
            f"No reliable difference was found between {label_b} and {label_a} "
            f"(difference: {effect_val:.3g}, {ci_pct}% confidence interval: {ci_low:.3g} to {ci_high:.3g}, p = {p_val:.3g}). "
            f"The test was adequately powered to detect an effect of {mde:.3g} (your threshold was {min_effect:.3g}), "
            f"so an effect of practical importance would likely have been detected."
        )
    elif verdict == "inconclusive":
        return (
            f"The data is inconclusive. The observed difference was {effect_val:.3g} "
            f"({ci_pct}% confidence interval: {ci_low:.3g} to {ci_high:.3g}, p = {p_val:.3g}). "
            f"The minimum detectable effect with this sample size is {mde:.3g}, which is larger than the minimum meaningful effect ({min_effect:.3g}). "
            f"We cannot rule out a meaningful effect; more data is required before reaching a business decision."
        )
    elif verdict == "invalid":
        reason = invalid_reason or "validation or data integrity checks failed"
        return f"This comparison is invalid and cannot be trusted: {reason}."
    return "Analysis complete."


def analyse(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entry point for statistics analysis.
    Takes a structured input dictionary and returns a comprehensive StatResult dictionary.
    """
    metric_type = payload.get("metricType", "continuous")
    alpha = float(payload.get("alpha", 0.05))
    alternative = payload.get("alternative", "two-sided")
    min_effect = payload.get("minEffect")
    expected_ratio = float(payload.get("expectedRatio", 0.5))
    seed = int(payload.get("seed", 42))
    
    labels = payload.get("labels") or [payload.get("labelA", "Control"), payload.get("labelB", "Variant")]
    label_a = str(labels[0]) if len(labels) > 0 else "Control"
    label_b = str(labels[1]) if len(labels) > 1 else "Variant"

    assumptions_checklist: List[Dict[str, Any]] = []
    caveats: List[Dict[str, Any]] = []

    # -------------------------------------------------------------
    # Step 1: Input Extraction & Data Cleaning
    # -------------------------------------------------------------
    raw_a = payload.get("a")
    raw_b = payload.get("b")
    
    # Check if binary counts are provided directly
    has_counts = all(k in payload for k in ("successesA", "totalA", "successesB", "totalB"))
    
    arr_a, removed_a = clean_numeric_array(raw_a)
    arr_b, removed_b = clean_numeric_array(raw_b)

    if has_counts and len(arr_a) == 0 and len(arr_b) == 0:
        total_a = int(payload["totalA"])
        successes_a = int(payload["successesA"])
        total_b = int(payload["totalB"])
        successes_b = int(payload["successesB"])
        n_a, n_b = total_a, total_b
    else:
        n_a, n_b = len(arr_a), len(arr_b)

    # Validation: minimum sample size requirements
    min_required = 20 if metric_type == "binary" else 10
    if n_a < min_required or n_b < min_required:
        reason = (
            f"Sample size too small. Group {label_a} has {n_a} and Group {label_b} has {n_b} valid records. "
            f"At least {min_required} samples per group are required for {metric_type} metrics."
        )
        return {
            "test": "none",
            "statistic": 0.0,
            "pValue": 1.0,
            "effectName": "none",
            "effectValue": 0.0,
            "ciLow": 0.0,
            "ciHigh": 0.0,
            "ciLevel": 1.0 - alpha,
            "mde": 0.0,
            "verdict": "invalid",
            "assumptions": assumptions_checklist,
            "descriptives": {"a": {"n": n_a}, "b": {"n": n_b}},
            "caveats": [reason],
            "summaryText": generate_summary_text("invalid", label_a, label_b, "", 0, 0, 0, 1 - alpha, 1, 0, 0, reason),
            "seed": seed,
            "engineVersion": ENGINE_VERSION,
        }

    # Record data cleaning assumption
    assumptions_checklist.append({
        "name": "Data Integrity & Completeness",
        "passed": (removed_a == 0 and removed_b == 0),
        "detail": f"Removed {removed_a} non-numeric/null values from {label_a}, {removed_b} from {label_b}.",
        "actionTaken": "Filtered invalid values before computing test statistics." if (removed_a + removed_b > 0) else "None",
    })

    # Group size disparity warning
    ratio = max(n_a, n_b) / max(1, min(n_a, n_b))
    if ratio > 3.0:
        caveats.append(f"Severe group size imbalance: {label_a} vs {label_b} ratio is {ratio:.1f}:1. Unequal sizes reduce statistical efficiency.")

    # -------------------------------------------------------------
    # Step 2: Sample Ratio Mismatch (SRM)
    # -------------------------------------------------------------
    chi_srm, p_srm, srm_passed = srm_check(n_a, n_b, expected_ratio)
    assumptions_checklist.append({
        "name": "Sample Ratio Mismatch (SRM)",
        "passed": srm_passed,
        "detail": f"Expected split: {expected_ratio*100:.1f}/{(1-expected_ratio)*100:.1f}%. Observed: {n_a} vs {n_b} (Chi-sq = {chi_srm:.2f}, p = {p_srm:.4e}).",
        "actionTaken": "Flagged experiment as invalid due to assignment distortion" if not srm_passed else "None",
    })

    if not srm_passed:
        srm_reason = (
            f"Sample Ratio Mismatch detected (p = {p_srm:.4e} < 0.001). "
            f"The observed counts ({n_a} vs {n_b}) deviate significantly from the planned {expected_ratio*100:.0f}/{(1-expected_ratio)*100:.0f} allocation. "
            f"This indicates a technical tracking failure, bot filtering anomaly, or redirect drop. Analysis is invalid."
        )
        return {
            "test": "srm_chi_square",
            "statistic": chi_srm,
            "pValue": p_srm,
            "effectName": "sample ratio mismatch",
            "effectValue": 0.0,
            "ciLow": 0.0,
            "ciHigh": 0.0,
            "ciLevel": 1.0 - alpha,
            "mde": 0.0,
            "verdict": "invalid",
            "assumptions": assumptions_checklist,
            "descriptives": {"a": {"n": n_a}, "b": {"n": n_b}},
            "caveats": [srm_reason],
            "summaryText": generate_summary_text("invalid", label_a, label_b, "", 0, 0, 0, 1 - alpha, p_srm, 0, 0, srm_reason),
            "seed": seed,
            "engineVersion": ENGINE_VERSION,
        }

    # -------------------------------------------------------------
    # Step 3: Run Analysis By Metric Type
    # -------------------------------------------------------------
    z_alpha = stats.norm.ppf(1.0 - alpha / 2.0 if alternative == "two-sided" else 1.0 - alpha)

    if metric_type == "binary":
        # Binary conversions
        if has_counts and len(arr_a) == 0:
            pass # already populated total_a, successes_a, etc.
        else:
            successes_a = int(np.sum(arr_a > 0.5))
            successes_b = int(np.sum(arr_b > 0.5))
            total_a = n_a
            total_b = n_b

        p_a = successes_a / total_a if total_a > 0 else 0.0
        p_b = successes_b / total_b if total_b > 0 else 0.0
        diff_prop = p_b - p_a
        
        # Relative lift: (p_b - p_a) / p_a
        relative_lift = ((p_b - p_a) / p_a * 100.0) if p_a > 0 else 0.0

        # Check 2x2 cell counts
        contingency_table = [
            [successes_b, total_b - successes_b],
            [successes_a, total_a - successes_a],
        ]
        
        # Expected frequencies
        pooled_p = (successes_a + successes_b) / (total_a + total_b)
        e11 = total_b * pooled_p
        e12 = total_b * (1 - pooled_p)
        e21 = total_a * pooled_p
        e22 = total_a * (1 - pooled_p)
        min_expected = min(e11, e12, e21, e22)
        
        counts_check_passed = min_expected >= 5.0
        assumptions_checklist.append({
            "name": "Expected Cell Frequencies (>= 5)",
            "passed": counts_check_passed,
            "detail": f"Smallest expected cell frequency is {min_expected:.2f}.",
            "actionTaken": "Switched from Two-Proportion z-test to Fisher's Exact Test" if not counts_check_passed else "None",
        })

        # Confidence interval: Newcombe Hybrid Score Interval (Risk Difference)
        ci_low, ci_high = newcombe_hybrid_interval(successes_a, total_a, successes_b, total_b, z_alpha)

        # Odds Ratio
        odds_a = (successes_a / (total_a - successes_a)) if (total_a - successes_a) > 0 else float("inf")
        odds_b = (successes_b / (total_b - successes_b)) if (total_b - successes_b) > 0 else float("inf")
        odds_ratio = (odds_b / odds_a) if odds_a > 0 and np.isfinite(odds_a) and np.isfinite(odds_b) else 1.0

        if counts_check_passed:
            # Two-proportion z-test
            test_name = "two_prop_z"
            # Standard error under null
            se_pooled = np.sqrt(pooled_p * (1.0 - pooled_p) * (1.0 / total_a + 1.0 / total_b))
            z_stat = (diff_prop / se_pooled) if se_pooled > 0 else 0.0
            
            if alternative == "two-sided":
                p_val = float(2.0 * (1.0 - stats.norm.cdf(abs(z_stat))))
            elif alternative == "greater":
                p_val = float(1.0 - stats.norm.cdf(z_stat))
            else: # less
                p_val = float(stats.norm.cdf(z_stat))
            stat_value = float(z_stat)
        else:
            # Fisher's Exact Test
            test_name = "fisher_exact"
            # scipy fisher_exact table: [[b_succ, b_fail], [a_succ, a_fail]]
            fe_res = stats.fisher_exact(contingency_table, alternative=alternative)
            stat_value = float(fe_res.statistic) # odds ratio
            p_val = float(fe_res.pvalue)

        # MDE for binary proportions
        calculated_mde = mde_binary(pooled_p, total_a, total_b, alpha=alpha, power=0.80)
        
        # Default minimum effect for binary is 0.01 (1 percentage point) if not provided
        effective_min_effect = float(min_effect) if min_effect is not None else 0.01

        descriptives = {
            "a": {
                "n": total_a,
                "successes": successes_a,
                "rate": float(p_a),
                "label": label_a,
            },
            "b": {
                "n": total_b,
                "successes": successes_b,
                "rate": float(p_b),
                "label": label_b,
            },
            "relativeLiftPct": float(relative_lift),
            "oddsRatio": float(odds_ratio),
        }
        effect_name = "risk difference (absolute conversion lift)"
        effect_value = float(diff_prop)

    else:
        # ---------------------------------------------------------
        # Continuous Metric
        # ---------------------------------------------------------
        mean_a, mean_b = float(arr_a.mean()), float(arr_b.mean())
        std_a, std_b = float(arr_a.std(ddof=1)), float(arr_b.std(ddof=1))
        med_a, med_b = float(np.median(arr_a)), float(np.median(arr_b))
        diff_means = mean_b - mean_a

        # 1. Outlier Check (IQR rule)
        out_a, low_a, high_a = detect_outliers_iqr(arr_a)
        out_b, low_b, high_b = detect_outliers_iqr(arr_b)
        outliers_total = out_a + out_b
        outliers_passed = outliers_total <= int(0.05 * (n_a + n_b))
        assumptions_checklist.append({
            "name": "Outlier Prevalence (Tukey 1.5x IQR)",
            "passed": outliers_passed,
            "detail": f"Identified {out_a} outliers in {label_a}, {out_b} in {label_b} ({outliers_total} total).",
            "actionTaken": "Logged for robustness consideration" if not outliers_passed else "None",
        })

        # 2. Normality Check (Shapiro-Wilk on up to 5000 values)
        sub_a = arr_a if n_a <= 5000 else np.random.default_rng(seed).choice(arr_a, 5000, replace=False)
        sub_b = arr_b if n_b <= 5000 else np.random.default_rng(seed).choice(arr_b, 5000, replace=False)
        shapiro_a = stats.shapiro(sub_a)
        shapiro_b = stats.shapiro(sub_b)
        normality_passed = bool(shapiro_a.pvalue >= 0.05 and shapiro_b.pvalue >= 0.05)
        assumptions_checklist.append({
            "name": "Normality (Shapiro-Wilk)",
            "passed": normality_passed,
            "detail": f"{label_a}: W={shapiro_a.statistic:.3f}, p={shapiro_a.pvalue:.3g} | {label_b}: W={shapiro_b.statistic:.3f}, p={shapiro_b.pvalue:.3g}",
            "actionTaken": "None" if normality_passed else "Evaluated whether non-parametric test is warranted",
        })

        # 3. Variance Homogeneity (Levene test with median center / Brown-Forsythe)
        levene_res = stats.levene(arr_a, arr_b, center="median")
        levene_passed = bool(levene_res.pvalue >= 0.05)
        assumptions_checklist.append({
            "name": "Variance Homogeneity (Brown-Forsythe)",
            "passed": levene_passed,
            "detail": f"Levene statistic = {levene_res.statistic:.3f}, p = {levene_res.pvalue:.3g}.",
            "actionTaken": "Welch's t-test used by default (does not assume equal variance)",
        })

        # Pooled standard deviation for MDE
        pooled_sd = np.sqrt(((n_a - 1) * (std_a ** 2) + (n_b - 1) * (std_b ** 2)) / max(1, n_a + n_b - 2))
        calculated_mde = mde_continuous(pooled_sd, n_a, n_b, alpha=alpha, power=0.80)
        
        # Default minimum effect is 0.2 * pooled_sd (Cohen's d = 0.2, a small practical effect)
        effective_min_effect = float(min_effect) if min_effect is not None else float(0.2 * pooled_sd)

        # Decide between Welch's t-test vs Mann-Whitney U
        # Rule: Small sample (N < 30) with non-normal data OR severe outlier skew triggers Mann-Whitney
        is_small_and_skewed = (n_a < 30 or n_b < 30) and (not normality_passed or not outliers_passed)

        if is_small_and_skewed:
            test_name = "mann_whitney"
            mw_res = stats.mannwhitneyu(arr_b, arr_a, alternative=alternative)
            stat_value = float(mw_res.statistic)
            p_val = float(mw_res.pvalue)
            
            # Non-parametric effect sizes: Cliff's delta & bootstrap difference in means
            cd = cliffs_delta(arr_a, arr_b)
            ci_low, ci_high = bootstrap_diff_means(arr_a, arr_b, alpha=alpha, seed=seed)
            
            effect_name = "difference in means (Mann-Whitney rank test)"
            effect_value = float(diff_means)
            caveats.append("Data is non-normal with small sample size; used Mann-Whitney U rank test with bootstrap confidence interval.")
            
            # Update action taken in normality check
            for item in assumptions_checklist:
                if item["name"] == "Normality (Shapiro-Wilk)":
                    item["actionTaken"] = "Switched to Mann-Whitney U test due to small sample & non-normality"
        else:
            test_name = "welch_t"
            welch_res = stats.ttest_ind(arr_b, arr_a, equal_var=False, alternative=alternative)
            stat_value = float(welch_res.statistic)
            p_val = float(welch_res.pvalue)
            
            ci_obj = welch_res.confidence_interval(confidence_level=1.0 - alpha)
            ci_low = float(ci_obj.low)
            ci_high = float(ci_obj.high)
            
            effect_name = "difference in means"
            effect_value = float(diff_means)

            if not normality_passed and (n_a >= 30 and n_b >= 30):
                caveats.append("Data exhibits non-normality, but Central Limit Theorem applies given sample sizes (N >= 30). Welch t-test remains robust.")

        hg = hedges_g(arr_a, arr_b)
        descriptives = {
            "a": {
                "n": n_a,
                "mean": mean_a,
                "sd": std_a,
                "median": med_a,
                "iqr": float(high_a - low_a) / 2.0,
                "label": label_a,
            },
            "b": {
                "n": n_b,
                "mean": mean_b,
                "sd": std_b,
                "median": med_b,
                "iqr": float(high_b - low_b) / 2.0,
                "label": label_b,
            },
            "hedgesG": float(hg),
            "cliffsDelta": float(cliffs_delta(arr_a, arr_b)),
        }

    # -------------------------------------------------------------
    # Step 4: Verdict Determination
    # -------------------------------------------------------------
    # Direction check
    is_stat_sig = p_val < alpha
    if alternative == "two-sided":
        interval_excludes_zero = (ci_low > 0 and ci_high > 0) or (ci_low < 0 and ci_high < 0)
    elif alternative == "greater":
        interval_excludes_zero = (effect_value > 0 and is_stat_sig)
    else: # less
        interval_excludes_zero = (effect_value < 0 and is_stat_sig)

    if is_stat_sig and interval_excludes_zero:
        verdict = "significant"
        if min_effect is not None:
            nearer_end = min(abs(ci_low), abs(ci_high))
            if nearer_end < effective_min_effect:
                caveats.append(
                    f"Result is statistically significant, but the lower bound of the confidence interval ({nearer_end:.3g}) "
                    f"is smaller than your declared minimum meaningful effect ({effective_min_effect:.3g})."
                )
    else:
        # Not statistically significant: Check if study was adequately powered
        if calculated_mde <= effective_min_effect:
            verdict = "not_significant"
        else:
            verdict = "inconclusive"
            caveats.append(
                f"The experiment was underpowered: Minimum Detectable Effect ({calculated_mde:.3g}) "
                f"exceeds the threshold that matters ({effective_min_effect:.3g})."
            )

    summary_text = generate_summary_text(
        verdict=verdict,
        label_a=label_a,
        label_b=label_b,
        effect_name=effect_name,
        effect_val=effect_value,
        ci_low=ci_low,
        ci_high=ci_high,
        ci_level=1.0 - alpha,
        p_val=p_val,
        mde=calculated_mde,
        min_effect=effective_min_effect,
    )

    return {
        "test": test_name,
        "statistic": round(stat_value, 4),
        "pValue": float(p_val),
        "effectName": effect_name,
        "effectValue": round(effect_value, 4),
        "ciLow": round(ci_low, 4),
        "ciHigh": round(ci_high, 4),
        "ciLevel": 1.0 - alpha,
        "mde": round(calculated_mde, 4),
        "minEffect": round(effective_min_effect, 4),
        "verdict": verdict,
        "assumptions": assumptions_checklist,
        "descriptives": descriptives,
        "caveats": caveats,
        "summaryText": summary_text,
        "seed": seed,
        "engineVersion": ENGINE_VERSION,
    }

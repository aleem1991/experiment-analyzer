"""
Experiment Analyzer — Demo Data Generator
Generates the 4 core benchmark datasets with fixed seeds, each telling a specific story:
1. checkout_button_color.csv: Binary, ~8,000/group, 10% vs 11.4% (Clear Significant Win)
2. page_load_time.csv: Continuous, skewed lognormal, N=20/group (Non-normal -> Mann-Whitney auto-switch)
3. email_subject_line.csv: Binary, planned 50/50, but 6000 vs 4000 (Sample Ratio Mismatch -> Invalid)
4. onboarding_tweak.csv: Continuous, N=40/group, small effect (Underpowered -> Inconclusive)
"""

import os
import csv
import numpy as np

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "demo_data")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def generate_demos():
    print(f"Generating demo datasets in {OUTPUT_DIR}...")

    # -------------------------------------------------------------
    # Demo 1: Checkout Button Color (Clear Significant Win)
    # Binary: Control ~9.7%, Variant ~11.5%, N=8000 each
    # -------------------------------------------------------------
    rng1 = np.random.default_rng(3)
    n_checkout = 8000
    control_conv = rng1.binomial(1, 0.098, n_checkout)
    variant_conv = rng1.binomial(1, 0.118, n_checkout)

    path1 = os.path.join(OUTPUT_DIR, "checkout_button_color.csv")
    with open(path1, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["user_id", "group", "converted"])
        for i, val in enumerate(control_conv, 1):
            writer.writerow([f"user_c_{i:05d}", "control", val])
        for i, val in enumerate(variant_conv, 1):
            writer.writerow([f"user_v_{i:05d}", "variant", val])
    print(f"  [1/4] Generated checkout_button_color.csv: {2 * n_checkout} rows")

    # -------------------------------------------------------------
    # Demo 2: Page Load Time (Skewed Lognormal, N=20 -> Mann-Whitney)
    # Continuous: Control lognormal(mean=0.9, sigma=0.7), Variant lognormal(mean=0.3, sigma=0.7)
    # -------------------------------------------------------------
    rng2 = np.random.default_rng(1)
    n_load = 20
    # Simulate page load latency in seconds
    control_lat = rng2.lognormal(mean=0.9, sigma=0.7, size=n_load)
    variant_lat = rng2.lognormal(mean=0.3, sigma=0.7, size=n_load)

    path2 = os.path.join(OUTPUT_DIR, "page_load_time.csv")
    with open(path2, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["session_id", "treatment_group", "load_time_sec"])
        for i, val in enumerate(control_lat, 1):
            writer.writerow([f"sess_ctrl_{i:02d}", "control", f"{val:.3f}"])
        for i, val in enumerate(variant_lat, 1):
            writer.writerow([f"sess_var_{i:02d}", "optimized", f"{val:.3f}"])
    print(f"  [2/4] Generated page_load_time.csv: {2 * n_load} rows")

    # -------------------------------------------------------------
    # Demo 3: Email Subject Line (Sample Ratio Mismatch -> Invalid)
    # Planned 50/50, but tracking/delivery drop caused 6,000 vs 4,000
    # -------------------------------------------------------------
    rng3 = np.random.default_rng(303)
    n_email_a = 6000
    n_email_b = 4000
    opens_a = rng3.binomial(1, 0.22, n_email_a)
    opens_b = rng3.binomial(1, 0.24, n_email_b)

    path3 = os.path.join(OUTPUT_DIR, "email_subject_line.csv")
    with open(path3, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["recipient_id", "subject_variation", "opened"])
        for i, val in enumerate(opens_a, 1):
            writer.writerow([f"rec_a_{i:05d}", "subject_classic", val])
        for i, val in enumerate(opens_b, 1):
            writer.writerow([f"rec_b_{i:05d}", "subject_emoji", val])
    print(f"  [3/4] Generated email_subject_line.csv: {n_email_a + n_email_b} rows")

    # -------------------------------------------------------------
    # Demo 4: Onboarding Tweak (Underpowered -> Inconclusive)
    # Continuous: 40 per group, small true effect (Control 10.0, Variant 10.2, SD 3.0)
    # User cares about minEffect = 1.0, but with N=40 MDE is ~1.9.
    # -------------------------------------------------------------
    rng4 = np.random.default_rng(404)
    n_onboard = 40
    control_score = rng4.normal(10.0, 3.0, n_onboard)
    variant_score = rng4.normal(10.2, 3.0, n_onboard)

    path4 = os.path.join(OUTPUT_DIR, "onboarding_tweak.csv")
    with open(path4, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["user_id", "flow_variant", "onboarding_steps_completed"])
        for i, val in enumerate(control_score, 1):
            writer.writerow([f"user_std_{i:03d}", "original_flow", f"{max(0.0, val):.2f}"])
        for i, val in enumerate(variant_score, 1):
            writer.writerow([f"user_twk_{i:03d}", "guided_tour", f"{max(0.0, val):.2f}"])
    print(f"  [4/4] Generated onboarding_tweak.csv: {2 * n_onboard} rows")

    print("\nAll 4 demo datasets successfully generated!")


if __name__ == "__main__":
    generate_demos()

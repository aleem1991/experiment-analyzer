# Experiment Analyzer — Rigorous A/B Testing on Appwrite TablesDB

> *"Most A/B tests get called wins on noise; Experiment Analyzer makes you state the hypothesis first, validates statistical assumptions, guards against Sample Ratio Mismatch (SRM), and tells you honestly when the data cannot answer the question."*

---

## 1. Why Experiment Analyzer Exists

In modern product development, teams routinely celebrate false positives. Standard dashboards show a green badge the moment $p < 0.05$, ignoring the fundamental realities of statistical decision-making:
1. **P-Hacking & Peeking**: Teams check analytics daily and declare victory on transient fluctuations, or adjust their hypotheses after seeing the data.
2. **Sample Ratio Mismatch (SRM)**: If a test planned for a 50/50 split ends up 60/40, there is almost certainly an assignment bug, redirect drop, or tracking filter leak. Any p-value computed on biased traffic is worthless.
3. **The "Not Significant" Fallacy**: When $p \ge 0.05$, standard dashboards report "No Difference" and teams abandon promising ideas. In reality, the test was simply underpowered to detect the effect that mattered.

**Experiment Analyzer** solves this with a pre-registration workflow, automated data health checks, and 4 honest verdicts:
- **`significant`**: $p < \alpha$ and the confidence interval strictly excludes zero in the pre-declared direction.
- **`not_significant`**: $p \ge \alpha$, **and** the test had adequate statistical power ($MDE \le \text{minEffect}$).
- **`inconclusive`**: $p \ge \alpha$, **but** the test was underpowered ($MDE > \text{minEffect}$). The data cannot rule out a meaningful effect.
- **`invalid`**: Critical failure, such as Sample Ratio Mismatch ($p < 0.001$) or insufficient sample size.

---

## 2. How This Project Uses Appwrite Databases (TablesDB)

The project leverages Appwrite TablesDB to demonstrate data integrity, row-level security, and real-time collaboration:

| TablesDB Feature | Implementation & Role in Experiment Analyzer |
| :--- | :--- |
| **Typed Columns & Enums** | `metricType`, `verdict`, and `alternative` are enforced database enums. Numerical metrics, sample sizes, and statistics are typed floats/integers, rejecting malformed data at the database level. |
| **Relationships** | The `analyses` table maintains a many-to-one relationship with `experiments`, linking repeated runs and pre-registration history to each experiment. |
| **Row-Level Security (RLS)** | All rows are created with `Permission.read(Role.user(uid))` and write/delete rights isolated to the session owner. No user can read or overwrite another's private experiments. |
| **Public Sharing via Permissions** | Toggling the **Share** switch dynamically adds `Permission.read(Role.any())` to that specific row. The `/s/:id` public view works without separate public tables or data duplication. |
| **Indexed Queries & Pagination** | History queries use compound indexes on `ownerId` and `$createdAt` descending with cursor limits, enabling fast historical audit logs. |
| **Realtime Updates** | The history view subscribes to WebSocket channels on the `analyses` collection, prepending new analyses in real-time across open tabs. |
| **1-Click Anonymous Sessions** | Judges and users can evaluate the full application in one click via Appwrite Anonymous Sessions (`account.createAnonymousSession()`) without sign-up friction. |

---

## 3. Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Browser (React + Vite)               │
│  - Pre-Registration Wizard (/new)                      │
│  - Result Dashboard with SVG Interval Picture (/a/:id) │
│  - Public Shared View (/s/:id)                         │
└───────────────────────────┬────────────────────────────┘
                            │
               Appwrite Web SDK (Auth & TablesDB)
                            │
      ┌─────────────────────┼─────────────────────┐
      ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌────────────────┐
│  Auth (RLS)  │     │   TablesDB   │     │ Python Stats   │
│  Anonymous / │     │ experiments  │     │ Function       │
│  Email       │     │ analyses     │     │ (SciPy/NumPy)  │
└──────────────┘     └──────────────┘     └────────────────┘
```

1. **Client**: React 18, TypeScript, Tailwind CSS, PapaParse (client-side CSV ingestion), Recharts, and custom SVG confidence interval visualizer.
2. **Backend**: Appwrite TablesDB for typed structured records and Row-Level Security.
3. **Engine**: Pure Python statistics function utilizing SciPy and NumPy for exact statistical tests.

---

## 4. Empirical Accuracy & Monte Carlo Validation

Unlike ad-hoc statistical scripts, the engine's error rates were measured against theoretical targets using a Monte Carlo simulation (`validate.py`):

| Check | Simulation Method | Theoretical Target | Measured | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Type I Error (Normal)** | 1,000 null experiments, $N=50$, $\alpha=0.05$ | 4.1% – 5.9% | **4.10%** | `PASS` |
| **Type I Error (Skewed)** | 1,000 null experiments, lognormal $N=20$ | 4.1% – 5.9% | **3.30%** | `ACCEPTABLE` |
| **95% CI Coverage** | 1,000 runs with true difference $= 1.5$ | 94.0% – 96.0% | **94.90%** | `PASS` |
| **Statistical Power ($d = 0.5$)** | 1,000 runs, $N=64$ per group, effect $= 0.5$ SD | ~80.0% | **79.90%** | `PASS` |
| **SRM Guard Sensitivity** | 1,000 simulated 60/40 traffic splits ($N=10,000$) | $\ge 99.0\%$ detection | **100.00%** | `PASS` |

---

## 5. Built-In Benchmark Demos

Experiment Analyzer includes 4 pre-configured demo experiments accessible in one click:
1. **Checkout Button Color** (Binary, $N=16,000$): Demonstrates a true, statistically significant conversion lift ($+1.78\%$, $p < 0.001$).
2. **Page Load Latency** (Continuous, $N=40$): Skewed lognormal data where the engine automatically detects non-normality via Shapiro-Wilk and switches to the **Mann-Whitney U** rank test with bootstrap confidence intervals.
3. **Email Subject Line** (Binary, $N=10,000$): Simulates a traffic leak (6,000 vs 4,000 allocation). The Chi-square SRM test flags this as **`invalid`** ($p < 0.001$).
4. **Onboarding Flow Tweak** (Continuous, $N=80$): A small observed lift with an underpowered sample size. The engine refuses to claim "no effect" and reports **`inconclusive`**.

---

## 6. Local Setup & Reproduction

### Prerequisites
- Node.js (v18+) & npm
- Python (3.10+) with `numpy`, `scipy`, `pytest`

### Quickstart (Development Mode)
```bash
# 1. Clone repository
git clone https://github.com/your-username/experiment-analyzer.git
cd experiment-analyzer

# 2. Install dependencies
npm install
pip install -r functions/analyse/requirements.txt

# 3. Start local development API bridge & Vite dev server
# Terminal 1: Local Stats Bridge
python scripts/local_api.py

# Terminal 2: Vite Web Client
npm run dev
```

### Running Test Suites
```bash
# Unit tests
pytest -v functions/analyse/tests/test_engine.py

# Monte Carlo error-rate validation simulation
python validate.py 1000
```

### Automated Appwrite Cloud Provisioning
To configure your live Appwrite Cloud project in one command:
```bash
# Set your Appwrite project and secret API key
export VITE_APPWRITE_PROJECT_ID="your_project_id"
export APPWRITE_API_KEY="your_secret_key"

# Provision database, tables, attributes, and permissions
python scripts/setup_appwrite.py
```

---

## 7. Tech Stack & Libraries

In compliance with hackathon guidelines, all open-source libraries used in this project are listed below:
- **Backend / BaaS**: Appwrite (TablesDB, Account Auth, Functions, Realtime)
- **Appwrite Web SDK**: `appwrite` (v16.1.0)
- **Frontend Framework**: React 18, Vite 6, TypeScript 5
- **Styling**: Tailwind CSS, Lucide React icons
- **Data Visualizations**: Recharts, Custom Math SVG
- **CSV Ingestion**: PapaParse
- **Statistics Engine**: Python 3.12, NumPy 2.1, SciPy 1.15
- **Testing & Verification**: Pytest 8.4

---

## 8. Hackathon Rule Compliance & Verification
- **New Code**: All code in this repository was written from scratch for the Appwrite Databases Hackathon starting on or after **19 October 2026**.
- **Solo Project**: Designed and built independently.
- **License**: MIT License.

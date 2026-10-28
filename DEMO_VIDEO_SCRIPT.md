# Experiment Analyzer — Demo Video Script & Rehearsal Guide
**Target Video Duration:** 2 Minutes 15 Seconds (Max allowed: 3:00)  
**Tone:** Calm, authoritative, technical, articulate.  
**Preparation:** Open your browser to `http://localhost:5173/` in a clean window at 100% or 110% zoom.

---

## Quick-Glance Screenplay (2:15)

| Timestamp | Visual on Screen | What You Say (Exact Script) | Why You Are Saying It (Mental Anchor) |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:18** | **Landing Page Hero**<br>Slowly hover over title & pitch. | *"In product analytics, most A/B tests get called wins on noise. Teams peek at data, change their direction mid-flight, or ignore sample size. **Experiment Analyzer** solves this on Appwrite TablesDB: it forces pre-registration, validates assumptions, and tells you honestly when data cannot answer the question."* | Establishes the real-world problem and your core differentiation in the first 15 seconds. |
| **0:18 – 0:48** | **Click "Checkout Button Color" Demo**<br>Show Step 1 (16k rows) $\rightarrow$ Step 2 (Mapping) $\rightarrow$ Step 3 (Pre-Registration). | *"Let's test our Checkout Button experiment. Notice Step 3: our hypothesis, significance level, and minimum meaningful effect are **locked before we touch any numbers**. This eliminates p-hacking. Clicking 'Execute & Save' invokes our Python statistics engine and writes the result to Appwrite TablesDB with row-level security."* | Highlights pre-registration and Appwrite Python Function + TablesDB RLS. |
| **0:48 – 1:18** | **Result Page (Checkout Win)**<br>Hover over Verdict $\rightarrow$ SVG Interval Picture $\rightarrow$ Assumptions. | *"Here is the result: a statistically significant win. Look at our custom Confidence Interval visualizer: it plots zero, the shaded indifference zone, and our 95% confidence interval which cleanly excludes zero. Below, the engine's automated checklist verified data integrity, normality, and group splits before picking the test."* | Shows off the custom SVG chart and automated assumption checks. |
| **1:18 – 1:35** | **Click New $\rightarrow$ "Email Subject Line" Demo**<br>Run analysis $\rightarrow$ Result: **INVALID**. | *"Now let's see what happens when an experiment is broken. Here is our Email experiment: planned 50/50, but split 6,000 to 4,000. Our engine runs a Chi-square Sample Ratio Mismatch test. Because p is less than 0.001, it marks the experiment **Invalid**. Most dashboards would report a fake win here; we prevent that."* | **The killer demo**: Demonstrates SRM detection that judges rarely see handled. |
| **1:35 – 1:52** | **Click New $\rightarrow$ "Onboarding Tweak" Demo**<br>Run analysis $\rightarrow$ Result: **INCONCLUSIVE**. | *"Next, our Onboarding test. Standard tools would see p greater than 0.05 and declare 'No Effect'. But our engine computes the Minimum Detectable Effect at 80% power. Because the test was too small to rule out an effect that matters, we report **Inconclusive** — telling the team to collect more data instead of killing a good idea."* | Shows statistical sophistication (MDE vs observed power fallacy). |
| **1:52 – 2:10** | **Click "Make Public" / Share Toggle**<br>Open `/s/:id` in an Incognito / Private window. | *"For collaboration, Appwrite's database permissions shine. Clicking 'Make Public' dynamically appends `Permission.read(Role.any())` to that single row. Opening this link in an unauthenticated window loads the public report directly from TablesDB with zero backend code required."* | Direct proof of Appwrite TablesDB permissions and RLS feature. |
| **2:10 – 2:25** | **Landing Page: Empirical Validation Table**<br>Scroll to bottom table. | *"Finally, how do we know our maths is right? We ran a Monte Carlo validation suite over thousands of simulated experiments. As you can see, our Type I error rate hits exactly 4.1% at alpha 0.05, and confidence interval coverage hits 94.9%. Experiment Analyzer brings real scientific rigor to product decisions."* | Mic-drop ending: Empirical proof that your engine is verified. |

---

## 3 Secrets to Zero-Jitter Delivery

1. **Don't Rush Your Words**: Speak slightly slower than your normal conversational pace. Pauses between sections make you sound in control.
2. **Move Your Mouse With Intent**: Move your cursor directly to what you are talking about (e.g. circle the SVG confidence interval or the "Invalid" badge). Don't wiggle your mouse aimlessly.
3. **If You Make a Small Mistake, Don't Restart from the Beginning**: Just pause for 2 seconds and re-say that single sentence. You can trim that 2-second gap in any basic video editor in 5 seconds!

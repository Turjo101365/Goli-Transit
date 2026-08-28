# ফুরুৎ / FURUT
### A departure-time and mid-journey advisor for Dhaka

**Project proposal — showcase 6 September 2026**
Repository: github.com/Turjo101365/Goli-Transit

---

## 1. The problem, stated precisely

Dhaka's commuting problem is not distance and it is not routing. It is **variance**.

A Mirpur → Motijheel trip takes 38 minutes on a good morning and 106 minutes on a bad one. The route does not change. The distance does not change. What changes is whether you left at 7:45 or 8:15, whether it rained, and whether something happened at Farmgate that nobody told you about.

Existing tools answer *"which way do I go?"* — a question Dhaka commuters already know the answer to. Nobody needs an app to learn that Mirpur Road leads to Motijheel.

The questions that are actually unanswered:

1. **What time do I need to leave** to arrive by 9:30 — not on average, but reliably?
2. **I am already stuck. Should I get off?** And if so, where, and onto what?

FURUT answers those two.

---

## 2. Why existing tools do not

**Google Maps** gives a single ETA with no honest uncertainty, has no data on rickshaw, CNG, leguna or local bus, does not know Dhaka's alley network, and cannot advise a passenger who is already inside a stopped bus.

**Vara Koto** compares fares across Dhaka transport modes — genuinely useful, and adjacent to this project. It answers *what will it cost*. It does not answer *when should I leave* or *is this still the right choice now*.

**Jatri, Shohoz** are intercity ticketing platforms. Different problem entirely.

The gap: **nobody is modelling reliability, and nobody is advising mid-journey.**

---

## 3. What the product does

### 3.1 Departure advice, with honest uncertainty

Every estimate is a pair, never a single number.

> সাধারণত ৪৫ মিনিট · খারাপ দিনে ৭২ মিনিট

Departure time is chosen against the **90th percentile**, not the median — because a commuter with a 9:30 meeting is planning for a bad day, not an average one. This single decision differentiates every screen in the product.

### 3.2 Route options ranked by reliability, not just speed

For Mirpur 10 → Motijheel:

| Option | Usually | Bad day | Fare | Spread |
|---|---|---|---|---|
| Walk › Metro › Walk | 33 min | 41 min | ৳80 | **+8** |
| Rickshaw › Metro › Rickshaw | 35 min | 44 min | ৳170 | +9 |
| Ride-share bike | 46 min | 78 min | ৳285 | +32 |
| Local bus | 68 min | 112 min | ৳45 | **+44** |

The bus is ৳35 cheaper and 71 minutes worse on a bad day. **That trade-off is the product.** No other tool in this market shows it.

### 3.3 Mid-journey rerouting — the core

The user is already moving. FURUT re-evaluates every 60 seconds:

> কাজীপাড়ায় **নেমে পড়ুন**
> ৪ মিনিট হেঁটে মেট্রো · পৌঁছাবেন সকাল ৮:৪১
> বাসে থাকলে সকাল ৯:৪০ — **৫৯ মিনিট বাঁচবে**

This works because of a physical fact specific to this corridor: **MRT-6 runs directly above Rokeya Sarani.** A passenger stuck in a bus is a three-minute walk from a train that is unaffected by the jam.

---

## 4. Why this works in Dhaka specifically

Four assets that Google does not have and cannot easily acquire:

**Mode-condition matrix.** How each mode behaves under each condition — roughly twenty hand-authored rules, not a model:

| | Jam | Rain |
|---|---|---|
| Metro | unaffected | unaffected |
| Bus | poor | slower, packed |
| Rickshaw | good (alleys) | fare 2×, blocked by water |
| Bike | good | **riders go offline** |
| CNG | poor (same jam) | scarce, fare 2.5× |
| Walk | fine | waterlogged |

Rain does not slow everything equally — it **removes options**. Metro goes from marginally better to the only viable choice. That asymmetry is the whole insight.

**Waterlogging polygons.** Shantinagar, Malibagh, Kakrail, Green Road, Kazipara–Shewrapara, Badda, Rampura, Jatrabari, Nilkhet. Static knowledge, drawn once, triggered by rainfall. No live feed required.

**Chokepoint bypass table.** Roughly 25 notorious intersections — Farmgate, Shahbagh, Bijoy Sarani, Mohakhali, Mouchak, Science Lab, Asad Gate, Gulistan. For each: an alley or footbridge bypass, its walking time, the re-entry point, permitted modes, safe hours, and the historical queue-clearance p50/p90. Each row is verifiable on foot in an afternoon. This table, not the algorithm, is the defensible asset.

**Service-window rules.** Metro counters close at 8:50 PM; Friday ticket sales begin at 3:30 PM. Recommending a metro leg at 9:15 PM would destroy user trust in one interaction.

---

## 5. System design

**Graph.** Nodes are *place + mode* — Mirpur 10 (platform) and Mirpur 10 (street) are distinct, separated by a four-minute walk edge. Metro and bus edges are fixed and time-dependent (a 9:02 arrival catches the 9:08 train). Rickshaw, CNG, bike and walk edges are **generated on demand** within a radius, never precomputed — otherwise the edge count explodes.

Two overlapping graphs: an **arterial graph** open to all modes, and a **goli graph** open only to walk, rickshaw and bike. The value comes from switching between them, not from routing within alleys.

**Cost function.** Not shortest path — shortest path is the wrong objective in Dhaka:

```
cost = time_p50 + λ·(p90 − p50) + μ·fare + transfer_penalty
```

`transfer_penalty` of 5–8 minutes per mode change is essential; without it the router returns four-transfer routes that no human would accept. `λ` and `μ` are user-facing sliders — a student weights fare, a professional weights reliability.

**Algorithm.** A\* with a straight-line heuristic bounded by the fastest available mode. Yen's k-shortest paths for alternatives, then deduplicated by mode chain so the user sees three genuinely different options rather than four variants of one.

---

## 6. Anomaly detection

**Baseline, not free-flow.** An anomaly is a deviation from *this corridor, this weekday, this 15-minute bucket* — not from an empty road. Rush hour is the baseline, not an anomaly. This framing means the cause never has to be identified: a protest, a VIP movement, an overturned truck and a burst water main all present identically.

**Two shapes, handled differently.**
- **Spike** — accident, rain, procession. 20–90 minutes. → alert and reroute.
- **Shift** — WASA excavation, flyover closure. Permanent. → stop alerting, retrain the baseline.

Treating excavation as a spike means alerting daily for three weeks until the user disables notifications.

**Detection method.** CUSUM against a **median + MAD** baseline — robust to the heavy right skew of traffic data, where a single outlier corrupts a mean. Threshold is **adaptive on prior**: during rain, or during a Mirpur match, or on Friday afternoon, fire at two minutes instead of five. This halves detection latency without raising the false-alarm rate.

**No machine learning at this stage — deliberately.** There are no ground-truth labels for "was this an anomaly", the dataset is three weeks old, and the product's credibility rests on saying *"you moved 200m in 6 minutes; this stretch normally takes 1.4km"* — a statement the user can verify by looking out the window. A model saying *"0.87 probability"* cannot be checked, and one wrong unverifiable alert costs more trust than ten missed ones. ML belongs in **travel-time prediction** (gradient boosting on corridor × weekday × bucket × weather) once 3–6 months of data exist.

**Asymmetric cost.** Pulling someone off a bus wrongly is far worse than missing an alert. Thresholds are set conservatively: minimum 12-minute saving, 10-minute alert cooldown.

**N=1 works.** City-wide congestion detection needs 40+ users per corridor. But detecting that *this* user's bus is stuck needs only *this* user's GPS. The product is useful on day one, before any network effect.

---

## 7. Data strategy

| Layer | Source | Cost |
|---|---|---|
| Base map | OpenStreetMap | free |
| Travel-time baselines | TomTom Traffic Flow — 2,500 requests/day free, commercial use permitted, permissive caching | free |
| Weather | Open-Meteo — no API key | free |
| Metro | DMTCL published network and fare chart | free |
| Bus routes | **Hand-surveyed**, 10 corridors | labour |
| Trip traces | User GPS, foreground "Start Trip" | the moat |

Google Maps Platform was evaluated and rejected: since March 2025 the free allowance is 10,000 calls per SKU per month (~333/day, insufficient for polling), and its terms prohibit storing results — which is precisely what building a historical baseline requires. TomTom's 2,500/day covers 20 corridors polled every 15 minutes around the clock.

**No bus route dataset exists for Dhaka.** No API, no open data, no government feed. It will be hand-surveyed for ten corridors and grown by asking users one question: *"কোন বাসে উঠেছেন?"*

**Privacy.** Trip logging is foreground-only and explicitly started by the user — this also avoids Google Play's background-location declaration review, which routinely blocks student projects. Only corridor identifiers and timestamps are retained, not full GPS traces: sufficient for the model, minimal in liability.

---

## 8. Status — what is real and what is not

Stated plainly, because a claim that collapses under one question costs more than an honest gap.

**Real:**
- Metro network — 16 stations, official fares, real coordinates
- Rain detection — live, Open-Meteo
- Stuck detection — own GPS, no other users required
- Service-window rules
- Four working screens: route map with playback, route options, live journey, jam belt
- Bilingual UI with genuine localisation — Bangla numerals, Bangla time convention (`সকাল ৮:০৫`, not a translated `8:05 AM`)

**Partial:** Travel-time baselines (polling underway, three weeks needed). Bus routes (10 corridors). Chokepoint bypasses (5–8 verified).

**Not built:** Cross-user congestion detection — requires ~50 active users per corridor. Automatic area detection from GPS polygons. City-wide bus coverage.

---

## 9. Roadmap

**Now — showcase.** Integrate the four screens into one flow. Live rain. Stuck detection on own GPS. Eight verified chokepoints.

**1–3 months.** Messenger or Telegram bot before an app — no install, and Dhaka already lives on Facebook; 200 users in two weeks versus six months on Play Store. Focus one community — a single university or office building — because 50 users on one corridor beats 500 scattered across twenty.

**3–6 months.** Departure notifications, which turn a tool into a habit. Crowdsourced bus routes. Gradient boosting for travel-time prediction once data supports it.

---

## 10. Principal risks

**Cold start.** Mitigated by personal history: the app is useful with one user because it returns that user's own commute record. Network effects come later.

**False alerts.** Conservative thresholds, cooldowns, and a rule that the app reports only what it observed — never what it inferred.

**Alley safety.** Alley routes are restricted to daylight hours and to lanes with regular footfall. Sending someone into an unfamiliar goli at 9 PM is not a neutral recommendation, particularly for women.

**Bus data decay.** Dhaka routes change without notice. Crowdsourcing is the only sustainable answer.

---

## 11. Demo script — six minutes

1. Frame the problem: variance, not congestion. **30s**
2. Route options screen — the reliability spread. Bus is cheapest and worst. **60s**
3. Map playback — mode carried by line style, not just colour. **45s**
4. **Live journey.** Toggle পরিষ্কার → জ্যাম → বৃষ্টি. The recommendation flips; the mode matrix shows *why* bike went offline. **2m**
5. **Live proof.** Walk outside, stand still, let the app detect it. **60s**
6. State honestly what is real and what is not. **45s**

---

*ফুরুৎ — জ্যাম লাগার আগেই*

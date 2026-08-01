# Triage Desk

A React + Vite front end for the emergency department triage desk. A nurse
records an assessment, a deterministic **Manchester Triage System** engine
produces a priority from it, a local **Gemma** model reviews the same record,
and the nurse decides. Every base rate on screen was computed from
`5v_cleandf.rdata`.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

`npm run build` produces `dist/`, which also opens straight from disk if you
just want to look at it.

The **Start from** row at the top left loads three worked assessments — chest
pain, an unwell 81-year-old, an ankle injury — so you can see the engine, the
evidence rail and the model panel react without typing anything.

### Connecting Gemma

The app talks to an OpenAI- or Ollama-compatible host on the ward network. Vite
proxies `/gemma` to it in dev, so the browser never holds a model endpoint and
nothing crosses the hospital boundary.

```bash
ollama pull gemma3:4b
ollama serve
cp .env.example .env
```

| Variable | Default | Notes |
|---|---|---|
| `VITE_GEMMA_HOST` | `http://localhost:11434` | Ollama or any OpenAI-compatible server |
| `VITE_GEMMA_MODEL` | `gemma3:4b` | `gemma3:27b` if the workstation has the VRAM |
| `VITE_GEMMA_API` | `ollama` | `ollama` \| `openai` \| `mock` |

Without a host, **Ask Gemma to review** fails with a readable error and offers
to run the offline demo model instead, which streams a canned response so the
interface can be shown end to end. Demo output is labelled as such everywhere
it appears.

### Deploying to Vercel (Production-Safe)

The project includes a Vercel serverless proxy function (`/api/gemma.js`) so your API key is kept strictly server-side and is never exposed in the browser bundle.

```bash
npm i -g vercel
vercel env add SPUR_API_KEY
# Paste your API key when prompted, selecting Production & Preview
vercel --prod
```

---

## The three layers

**1 — Rules engine (`src/lib/triage.js`, `src/data/mts.js`).**
Pure functions, no network, re-run on every keystroke. MTS is
*first discriminator wins*: the highest priority that fires is the priority.
Physiological cut-offs are evaluated from the vitals as they are typed;
observed discriminators (airway compromise, shock, cardiac-sounding pain) are
checkboxes. Every hit is kept for the audit trail, not just the winner. If the
model host is down, or wrong, this layer still works — it is the floor, not the
decoration.

**2 — Evidence rail (`src/lib/cohort.js`, `src/data/priors.js`).**
Frequency lookups against the source export. "Of the 38,902 previous visits on
the chest pain flowchart, 43.3% were admitted." No fitting, no model. Bars are
drawn against the department-wide rate so a cohort that is unremarkable looks
unremarkable.

**3 — Gemma (`src/lib/gemma.js`).**
Gets the structured assessment, the narrative, the history, the engine's result
and the relevant base rates. Returns strict JSON: a suggested priority, a
rationale addressed to the nurse, red flags, questions that would change the
priority, and immediate actions. Streamed token by token so the panel fills in
rather than blocking.

The model's suggestion never becomes the priority on its own. Where it
disagrees with the engine, both are shown, and the disagreement is stored with
whatever the nurse records.

---

## The dataset

`5v_cleandf.rdata` — 560,486 adult ED visits, 972 variables, in R's XDR
serialization. Uncompressed it is roughly 3.6 GB, so `scripts/extract_schema.py`
and `scripts/rdata_stats.py` parse the format directly and stream it: column
statistics are accumulated in chunks and the full payload is never held in
memory. `scripts/extract_priors.py` writes `src/data/priors.js`.

What the app uses:

| From the file | Used for |
|---|---|
| `esi` (1–5) | Priority cohorts, mapped to MTS colours |
| `triage_vital_*` — HR, SBP, DBP, RR, SpO₂, temp | Percentile position of each reading; admission rate inside each discriminator band |
| `cc_*` — 200 chief-complaint flags | Pooled into 28 MTS flowcharts (`FLOWCHARTS` in `src/data/mts.js`) |
| `disposition` | The outcome every base rate is measured against; 29.7% admitted overall |
| `arrivalmode`, `age` | Arrival and age cohorts |

A few results worth knowing before you read the evidence rail: arrival by
ambulance carries a 47.3% admission rate against 19.1% for walk-ins; SpO₂ under
92% at triage runs 75.4%; respiratory distress as a chief complaint runs 91.5%.
Temperatures in the source are Fahrenheit and are converted for display.

### Two honest caveats about that mapping

**ESI is not MTS.** The source export is triaged with the Emergency Severity
Index, a five-level scale built around expected resource use. MTS is built
around presentational flowcharts and discriminators. They agree on direction —
1 is the sickest in both — but they are not the same instrument, and the
ESI→colour mapping in `extract_priors.py` is a convenience for pooling
comparable visits, not a claim of equivalence.

**Admission is not acuity.** Every bar in the evidence rail is an admission
rate. Admission is a disposition, shaped by bed availability, social
circumstance and local practice as well as by illness. It is context for the
nurse, not a prediction about the patient in front of them, and the panel says
so on screen.

The export is adult-only, so the paediatric age band is empty and is suppressed
rather than shown as a rate computed from no visits.

---

## Layout

```
src/
  App.jsx                  three columns: intake, assessment, board
  data/mts.js              MTS levels, discriminators, flowcharts, cc mapping
  data/priors.js           generated — every figure computed from the .rdata
  data/examples.js         three worked assessments
  lib/triage.js            the rules engine
  lib/cohort.js            frequency lookups and percentiles
  lib/gemma.js             prompt construction, streaming transports, parsing
  components/              one file per panel
scripts/                   the R-serialization readers and the priors extractor
```

---

## What this is not

Decision support. The registered nurse assigns the priority; nothing here
assigns it for them, and no output here is a diagnosis. It has not been
clinically validated, carries no regulatory clearance, and should not be used
on real patients in its current state.

The examples in `src/data/examples.js` are composites written to sit inside the
distributions in `priors.js`. No row of the source export is reproduced in this
repository — only aggregate statistics.

# CoST Knowledge Hub Superpowers

The Knowledge Hub now runs three high-impact intelligence loops in parallel whenever you opt into `enhance=hybrid`. Together they blend institutional knowledge, live web intelligence, ethical guardrails, and temporal foresight.

## 1. Living Context Engine (Exa Hybrid Intelligence)

- **Hybrid search orchestration** – merges vector results from the 1,164 document corpus with fresh Exa web findings.
- **Conflict radar** – flags when external sources challenge established CoST guidance and highlights validations.
- **Freshness signals** – timestamps new material (“5 days ago”) alongside evergreen references.
- **Cross-pollination stories** – surfaces cues like “South Africa unlocked X that Uganda needs now”.

`SearchResponse.livingContext` is populated only in `enhance=hybrid` mode and always contains:

| Field | Description |
| --- | --- |
| `headline`, `synthesis` | Human-ready storyline that fuses internal and external signals. |
| `internalHighlights` | Citations back to Knowledge Hub sources. |
| `externalInsights` | External evidence with stance (`supports`, `expands`, `contradicts`) and recency labels. |
| `freshnessSignals` | Time-aware indicators that contrast old wisdom with breaking developments. |
| `contradictions` | Structured alerts when external perspectives diverge from CoST ethos. |

## 2. CoST DNA Analyzer (Ethos Guardian)

- Scores every response against the four CoST pillars (`disclosureTransparency`, `assuranceQuality`, `multiStakeholderParticipation`, `socialAccountability`).
- Surfaces risks, stakeholder imbalances, and power dynamics whenever advice leans toward dominant actors.
- Uses Gemini to structure the evaluation into a machine-ready report that can gate downstream workflows.

`SearchResponse.costAlignment` includes:

- `overallScore` and per-pillar rationales.
- `risks` with severity levels.
- `stakeholderBalance` heatmap across government, private sector, civil society, beneficiaries, and oversight bodies.
- `powerDynamics` insights plus mitigation suggestions.

## 3. Time Oracle (Temporal Intelligence)

- Reads the Knowledge Hub as a timeline, tracking how guidance evolved (2013 → 2025 and beyond).
- Provides time-contextualized snapshots (e.g., “2018 perspective vs 2025 reality”).
- Generates predictive scenarios with confidence bands and leading indicators.

`SearchResponse.temporalInsights` stitches together:

- `temporalPerspective` – key viewpoints anchored to real publication years.
- `evolutionTimeline` – phase shifts and the drivers behind them.
- `predictiveScenarios` – forward-looking projections with references.
- `recommendedActions` – concise steps to act on the time intelligence.

## API Additions

| Feature | How to use |
| --- | --- |
| **Hybrid search mode** | `GET /intelligent-search?q=…&enhance=hybrid` |
| **Evolution timeline** | `GET /intelligent-search/evolution?topic=assurance` (+ optional `country`, `yearFrom`, `yearTo`) |
| **Scenario modeling** | `GET /intelligent-search/predict?scenario=implement-proactive-disclosure` |

Other enhancement modes still work:

- `enhance=fast` – default; now stitches in CoST DNA scoring.
- `enhance=full` – original full intelligence stack (connections, gaps, hidden gems).
- `enhance=minimal` – disables premium layers, returns baseline answer + results.

## Demo Script

Run a full walkthrough from the command line:

```bash
cd api
npm run demo:superpowers -- "What should CoST prioritize for digital procurement assurance?"
```

The script:

1. Retrieves relevant documents.
2. Builds a synthesized answer.
3. Runs the Living Context Engine, CoST DNA Analyzer, and Time Oracle.
4. Prints structured JSON outputs for inspection.

## Performance Notes

- `enhance=fast`: ~4–6s (adds CoST DNA scoring to the existing stack).
- `enhance=full`: unchanged, focuses on deep knowledge mining.
- `enhance=hybrid`: ~8–12s (runs all three superpowers with external lookups).
- Evolution and prediction endpoints lean on cached vector results, typically returning in 2–3s.

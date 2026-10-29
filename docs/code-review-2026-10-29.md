# Fishpond Math Hammer — code review (29 Oct 2026)

Reviewed at commit `d3ffb7d` (master, matches origin). ~26k lines of JS/JSX/CSS.

## What the project is

A client-only React 19 + Vite SPA for Warhammer players, deployed to Azure Static Web Apps:

- **40K Attack Simulator** (Monte Carlo, 11e sequence) with multi-unit attackers, multi-profile defenders, unit/target buff layers, a saved Profile Library (localStorage + JSON import/export) and a 2–4 way Profile Comparison.
- **Dice Calculator**: exact 40K Wound Success calculator (`woundPool.js`, a DP over shared reroll budgets) and a closed-form AoS damage calculator.
- **AoS Attack Simulator** (Monte Carlo, AoS 4E).
- **40K Tactical Board**: Konva canvas over the 45 official 11e battleplan maps, with bases, drawings, ruler, mission cards and primary/secondary VP planning (Zustand store).
- Dice Roller, Cheat Sheet, About. EN/ZH UI for the 40K pages.

Architecture: pure math in `src/lib/dice/` (no React), presentational primitives in `src/components/ui/`, page glue in `src/components/`, and a separate feature slice in `src/macro-battleplan/`. `knowledges/` is a handoff packet written for future AI agents.

## Verification done

- 17 pure-logic test files (529 tests) — **all pass**. They ran through a small stand-in for vitest, because the npm registry is blocked from the review environment.
- Not run: `npm run lint`, `npm run build`, and the 11 React/UI/store test files. Run them locally.
- Every engine finding below was reproduced with a script against the real modules, 50k–200k trials each.

## Correctness findings (simulator engine)

| # | Severity | Finding | Where | Repro |
|---|---|---|---|---|
| 1 | High | **Anti-X + “+1 to Wound” over-counts wounds.** `baseThr = Math.min(baseThr, antiValue)` moves the wound threshold to the Anti value, then the +1 modifier is applied on top. Under the rule text quoted in `knowledges/09` (Anti only makes an *unmodified* X+ a Critical Wound; crits always succeed), the threshold should not move. Deleting that line fixes it, and all 203 existing simulator tests still pass. | `attackSimulation.js:299`; also `knowledges/09 §3.3` | S4 vs T5, Anti-4+, Lance: app **66.4%** wound rate; correct **50%** |
| 2 | High | **Expected Damage Dealt ignores Feel No Pain.** `applyDamageToUnit` counts FNP-blocked points as “consumed”. The Simulator shows this stat only for single-model targets, where FNP then has no effect. The same number appears in the Comparison table and in copied reports. Kills and wipe % are correct. | `attackSimulation.js:94-127` | 20 × D3 vs one big model: no FNP 50.05, FNP 4+ 50.01, FNP 2+ 50.07 |
| 3 | Medium | **“Reroll ≤3” on a D3 does nothing.** The threshold is fixed at 3 regardless of die size, so every D3 face is rerolled and the expected value stays 2.0. This applies to both Attacks and Damage. Rerolling 1s on a D3 would give +0.33 per die. | `constants.js:23`, `diceExpression.js:55` | D3 damage: 1.665 without the reroll vs 1.667 with it |
| 4 | Medium | **Damage reroll “One” scope isn’t one.** The tooltip says “only a single die may be rerolled”, but damage is rolled once per wound and each roll gets its own single reroll. (The Attacks “One” scope is pooled correctly.) | `attackSimulation.js:313, 335` | 10 hits of D6: All 35.41 vs One 35.45 (no reroll 29.15) |
| 5 | Medium | **A weapon’s own reroll overrides a strictly better unit reroll.** A weapon with reroll-1s keeps it when the unit grants reroll-fails. Reroll-fails dominates reroll-1s and reroll-1s-and-2s; only fails vs non-critical is a real strategy choice. `mergeUnitReroll` already ranks these, so the weapon×unit merge could use the same ranking. | `unitBuffMerge.js:105-108, 163` | weapon `reroll-one` + unit `reroll-fail` → effective `reroll-one` |
| 6 | Low–Med | **2D6 is rerolled die by die.** The 10e core rules re-roll *all* dice of a summed roll; check the 11e wording. Rerolling per die overstates the result (2D6 attacks: about 8.5 vs about 8.0 when the whole roll is rerolled). | `diceExpression.js:55-87` | per-die model matches simulated 7.10 |
| 7 | Medium | **“95% CI” means two different things.** For kills and damage it is mean ± 1.96σ of the *outcome distribution* (e.g. [0.00, 4.80] around 2.23). For wipe % it is a real CI of the estimate (standard error). Suggest: label kills/damage as a “95% range” built from empirical 2.5/97.5 percentiles, which the distribution data already allows; keep the CI label for wipe %. | `attackSimulation.js:473-481`, `StatCard.jsx:26` | true CI of the mean there is ±0.026 |
| 8 | Low–Med | **Comparison ranking ignores damage.** Rows are sorted by expected kills, then wipe %. Against a large single model that usually survives, every row ties near 0, so the order is just the input order even though damage differs. Each slot also runs 1,000 independent trials, so small gaps are noise. Consider a damage tiebreak and common random numbers, or showing the standard error. | `ProfileComparison.jsx:174-178` | — |

## Product / UX

- Tactical Board bases and drawings are never persisted, there is no `beforeunload` warning, and undo goes back only 3 steps (`HISTORY_LIMIT = 3`). A reload loses the board.
- Letter shortcuts fire even with Cmd/Ctrl held: Cmd+F (find) switches to the ruler, Cmd+S to the line tool, Cmd+D to draw. Ctrl/Cmd+C is `preventDefault`ed across the whole board page. (`useKeyboardShortcuts.js:53-67`)
- There is no catch-all route, so a mistyped URL renders an empty main area (`App.jsx`).
- The About page has a “coffee” button that alerts “not implemented yet”. Clear-storage leaves the language key (`attackSim_lang`), and its confirmation text says saved Tactical Boards will be deleted, but boards are never saved.
- Simulations run on the main thread: about 0.4 s for 10k trials on a fast CPU, more on phones. A Web Worker would fix it but isn't urgent.

## Engineering hygiene

- **CI deploys to production on every push to master without running tests or lint.** Add an `npm ci && npm run lint && npm test` job and make deploy depend on it.
- **Dead code** is still exported and documented as live: `KillProbabilityCalculator.jsx` (no route), `simulation.js`, `killProbability.js`, `probability.js`, `woundDistribution.js`, `chargeProbability.js`.
- **Bundle:** there is no route-level code splitting, so Konva (needed only by the board), Recharts and KaTeX all load on the landing page. KaTeX and its CSS and fonts are loaded only to draw the “σ” glyph; a Unicode σ would do. `the-fishpond.png` is 1.6 MB.
- The remote has both `main` and `master`. CI tracks master; the docs say main.
- 53 of 111 commits are titled “update”, which makes bisecting the rules engine harder.

## Docs drift (matters because `knowledges/` instructs future agents)

- README: Vite template boilerplate plus feature-spec prose. There is no intro, setup steps or live URL. It links `../tools/CLEAN_MAP_PIPELINE.md`, which is outside the repo.
- `09-attack-rules-10e.md`: titled 10e. §4.2 describes save-based Benefit of Cover, but the engine uses 11e hit-based cover. §8 says −1 AP has no UI, but `minusOneAp` exists. §3.3 encodes finding #1.
- `06-dev-workflow.md`: says Windows/PowerShell, says tests live only in `lib/dice`, and says the default branch is main.
- `02-architecture.md`: omits the `macroBattleplan11e:missionPlan` key and the `missionPlan` export field.
- `01-project-overview.md`: calls the simulator “10e”.
- `TODO` (“Support 11e map”) is already done.

## Risk to decide on

The repo and the public site bundle Games Workshop battleplan maps and mission-card scans. That is a takedown risk for a public site.

## What’s strong

- Disciplined layering. The math is React-free and heavily tested, including deterministic dice-face mocking for rule *sequences* (Devastating Wounds ordering, sorted saving pools, Blast snapshots).
- `woundPool.js` is an exact DP over shared limited-reroll budgets with first and second moments, tested against independent enumeration. That is unusually rigorous for a hobby tool.
- Careful profile import validation, merge semantics and quota handling.
- Rules decisions are written down with citations.

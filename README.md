# Fishpond Math Hammer

Dice-math tools for Warhammer 40,000 (11th edition) and Age of Sigmar (4th
edition) players. It is a client-only React + Vite app with no backend.
Saved Profiles and board settings live in the browser's `localStorage`.

- **40K Attack Simulator**: Monte Carlo unit-vs-unit attacks with multiple
  attacking units, multi-profile defenders, unit buffs, a saved Profile
  Library and Profile Comparison.
- **Dice Calculator**: exact 40K wound distribution and AoS damage math.
- **AoS Attack Simulator**, **Dice Roller** and **Cheat Sheet**.
- **40K Tactical Board**: the 45 official 11e battleplans with bases,
  drawings, a ruler, mission cards and VP planning.

## Getting started

Requires Node 20+.

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest
npm run lint
npm run build    # production build in dist/
```

Pushes to `master` run the tests in GitHub Actions and then deploy to Azure
Static Web Apps. Developer and agent documentation lives in
[`knowledges/`](knowledges/README.md).

## 40K Attack Simulator

The Simulator supports multiple collapsible attacking Unit Profiles against one
shared defender. Each unit can load or save an existing attacker Profile and
retains the existing unit-buff and weapon editors. Loading the same saved Profile
into multiple units creates independent copies; saving still stores one unit,
not the entire attacking group.

Use **Add Unit** to add another attacker. Each unit uses a single amber frame
containing its saved-profile controls and
editors. Collapsing an attacking unit hides the editors while keeping its
profile selector, save action, and remove action available. The 40K weapon and
target editors retain their listed order without up/down controls. Dropdowns
omit the clear-X control without changing selection or reset behavior.

Units resolve in the order they were added, preserving the defender's remaining
models and wounds. Each unit has independent **Reroll Failed Hit/Wound Dice X**
budgets (X = 1-3), shared across that unit's weapons and firing models.
Existing eligible rerolls take priority without spending X; the limited buff
only rerolls original failures not already rerolled. No die can be rerolled
twice, including when combining reroll ones, failures, or non-critical rolls.
Duplicate saved/additional buffs use the larger X, not their sum. Older
single-failure buffs load as X = 1. The 40K Dice Calculator uses the same
priorities and exact finite budgets. Blast/Cleave use the target model count when
each attacking unit selects its target. Collapsed units still participate.
Results show the combined attack, and copied reports group weapons and buffs
by attacking unit. The Profile Library and independent Profile Comparison retain
their existing single-unit format and behavior.

Each Weapon Profile card resolves one pool of saving dice for all its normal
wounds, including all firing models on that card. Rolls are sorted from lowest
to highest, then checked against the current defender profile's armor or
invulnerable save. Damage modifiers and FNP resolve before the next result;
when that profile is exhausted, remaining results use the next profile's saves.
Separate cards remain separate pools, even if their attacks are identical.
This implements the 11e saving sequence within each card, without automatically
merging identical attacks across cards. See the
[official core rules, sections 05.03-05.04, page 19](https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf#page=19).

Devastating Wounds resolve after the same card's normal damage and before the
next card attacks. Each critical wound inflicts the modified Damage
characteristic as mortal wounds, bypassing saves. Weapon Damage increases,
HALF DAMAGE, DAMAGE -1, and DAMAGE = 1 all modify D before conversion.
For example, D4 with DAMAGE -1 produces three mortal wounds, while
DAMAGE = 1 produces one. Do not reapply D modifiers to each mortal-wound point.
Use the best eligible general or mortal-only FNP, with one roll per wound;
each critical can damage only one model and excess mortal wounds are lost.
See the [11e core rules, sections 06.02, 24.10 and 24.12](https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf#page=80).

Blast and Cleave keep one target-count snapshot for the entire attacking unit:
if its first weapon reduces 10 models to 1, its second Blast 1 or Cleave 1
weapon still gains two attacks. The next attacking unit takes a new snapshot.

## Data Source

11e Force Disposition Matrix: https://gdmissions.app/11th/matrix

## 40K Tactical Board

Oval base presets include **150x95 mm**, selectable under **bases > Oval**.

The shared **Battleplan** header sits above both tabs and selects the
Attacker's and Defender's Force Dispositions and their associated colors.
The same selections apply in both views. **Layout A/B/C** remains in the
Battlefield sidebar only, with its segmented control stretching to the
panel's full available width.

The board has two views. **Battlefield** contains the map and its tools only:
there are no scores, VP summaries, or mission-card scoring overlays on the map.
Switching views preserves bases, drawings, selections, and the map tools.
Map keyboard shortcuts are disabled while viewing **Missions & VP**.

**Missions & VP** uses the same sections and segmented controls as Battlefield.
A single **Attacker / Defender** switch above both mission sections controls
the primary and secondary inputs together. The overview cards and side switch
repeat the selected Force Disposition colors. There are no player-name labels
or explanatory paragraphs:

- Primary scoring is a vertical R1-R5 table with three manual inputs per row
  and no visible stage captions. There is no 15 VP per-round limit; the
  primary total is capped at **45 VP**. The current mission name and
  **X/45 VP** total share one header row, with no extra Primary VP footer.
  The **Primary missions** title stays above this row. The current primary
  mission name is amber; unselected secondary mission names use neutral text.
  Clicking the primary mission name opens its card, including the back where
  available. Primary card references follow the Force Disposition matchup.
  Changing the matchup applies immediately without confirmation and clears
  targets for any primary missions that change. Secondary selections and
  scores are preserved; changing only the layout preserves the entire plan.
- All 18 Tactical secondary missions have one checkbox at the start of each row.
  Scores start blank and selecting a card does not fill in a score.
  Enter each card's target directly as a whole number from 0 to
  5 VP, or clear it while planning; saved manual values are preserved and
  scores are not restricted to a dropdown
  of printed scoring tiers. Compact cards show the score followed by VP,
  without a Target prefix. Click a card's name to view the locally bundled
  original PNG. Mission names are the card-reference controls; there are no
  separate book icons. There are no task notes or secondary round assignments.
  Selecting a checkbox highlights the entire row in amber; unchecking it removes
  the highlight without clearing the saved score. There are no separate include
  or exclude buttons. Older excluded cards appear unchecked and their scores
  remain editable. Dark rounded checkboxes use the board's amber accents and
  shared check icon without hover effects. Native checkbox semantics and a
  visible keyboard focus ring are retained.
- The secondary summary shows only **X/45 VP**, using the same font size as
  the primary VP counter, with no separate Planning cap line.
  X is the raw selected pool, so excess candidate points
  remain visible while overview scores are capped at 45. This is a potential scoring
  budget, not a prediction: draw order, battlefield conditions, and the 15 VP
  secondary limit per battle round are not simulated. Fixed scoring and
  Battle Ready VP are not included.

Plans save in browser storage and are included in battleplan JSON exports.
Existing v1 exports remain supported: their names and recorded scores are
preserved, but the recorded-score panel is no longer displayed. Recorded
scores are not converted into plans; files without a mission plan start
with an empty plan. Older plans with one primary total per round migrate that
value into the middle scoring field, preserving the total and leaving the other fields
blank. Stage entries, including zeroes and blanks, survive reloads and exports.

Secondary cards and Tactical scoring tiers:
[GDM secondary missions](https://gdmissions.app/11th/secondary-missions).
Scoring limits:
[GDM tournament companion](https://gdmissions.app/11th/rules/event-companion).

### 11e map assets

The 2026-10-18 map refresh uses the latest supplied Warhammer 40,000 Event
Companion PDF. It updates 27 layouts and both their clean-board and annotated
reference images; the other 18 layouts are unchanged. Terrain remains centrally
symmetric, including the existing repair to map 01. Objectives and deployment
boundaries follow the revised PDF and are not symmetrized.
Both image URL variants carry this revision to avoid stale browser caches.

The updated map IDs are 02, 03, 07, 08, 09, 10, 12, 14, 16, 17, 18, 19, 20, 22,
24, 26, 31, 32, 34, 35, 36, 37, 38, 39, 41, 44, and 45.

For subsequent PDF revisions, use the
[map-update AI skill](.github/skills/update-11e-maps/SKILL.md) and the
prepare/apply/verify pipeline (`tools/CLEAN_MAP_PIPELINE.md` in the parent
Warhammer workspace; it is not part of this repository). It archives the applied PDF, stages only changed layouts,
checks complete and centrally symmetric terrain, updates both image variants
and cache revisions, and preserves unchanged files. Deployment is a separate,
explicitly authorized step.

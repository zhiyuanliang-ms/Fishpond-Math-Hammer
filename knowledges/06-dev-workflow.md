# Dev Workflow

## Environment
- **Windows + PowerShell.** All terminal commands assume `pwsh`.
- Node 20+ recommended (Vite 7 requirement).
- `rg` may not be available — use `Get-ChildItem ... | Select-String` or the
  workspace `grep_search` tool instead.

## Commands

| Task | Command |
|---|---|
| Install deps | `npm install` |
| Dev server | `npm run dev` (defaults to `http://localhost:5173`) |
| Dev server on LAN | `npm run dev -- --host` (use printed Network URL on phone) |
| Lint | `npm run lint` |
| Production build | `npm run build` |
| Preview prod build | `npm run preview` |

## "Definition of done" for any change
1. `npm run lint` → 0 errors, 0 warnings (we keep it clean).
2. `npm run build` → succeeds (the chunk-size warning is pre-existing and OK).
3. Smoke-check the affected page in dev (and at mobile width if CSS changed).
4. Update the relevant doc under `knowledges/` if you changed architecture.

PowerShell one-liner used in this project:
```powershell
cd "c:\Users\zhiyuanliang\Desktop\Warhammer"; npm run lint 2>&1 | Select-Object -Last 15; npm run build 2>&1 | Select-Object -Last 8
```

## Mobile testing
1. `npm run dev`
2. Open DevTools (`F12`) → toggle device toolbar (`Ctrl+Shift+M`).
3. Test at:
   - **375px** (iPhone SE) — hits `≤480px` rules.
   - **768px** (iPad Mini) — boundary of `≤768px`.
   - **Responsive** mode dragged from 320 → 1200 px.
4. For real-device testing: `npm run dev -- --host`, then open the LAN URL on
   your phone (allow Node through Windows Firewall on private networks).

## Common pitfalls (learned the hard way)

- **Don't deep-import from `lib/dice/`.** Always go through the barrel
  (`from '../lib/dice'`). Same for `ui` (`from './ui'`).
- **Don't add inline `style={{...}}` for layout/spacing.** Use a class. The
  KillProbabilityCalculator was bitten by `marginRight: '50px'` overflowing
  on phones; the fix was the `.form-row--split` class.
- **Don't break the layering.** `lib/dice/` must never import React; `ui/`
  must never import `lib/dice/`. If you find yourself wanting to, the logic
  belongs in the page component instead.
- **react-select needs explicit styles.** Use `<FormSelect>`; do not import
  `react-select` directly into a page.
- **Recharts cumulative line uses the right Y-axis.** Don't change axes
  without verifying the tooltip still reads correctly.
- **Form field values are strings.** Parse at the math boundary, not in JSX.
- **PowerShell quirks:** when chaining commands, use `;` not `&&`. The user
  memory note also flags that `GITHUB_TOKEN` env var can break some CLIs;
  unset with `$env:GITHUB_TOKEN = $null` if auth misbehaves.

## Git
- Default branch is `main` (or whatever the user is on — check `git status`).
- The user commits manually with short messages (e.g. `"refactor"`). Don't
  auto-commit unless asked.
- Never `git push --force`, never `git reset --hard` on shared branches
  without confirmation.

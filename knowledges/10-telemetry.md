# Usage Telemetry

Anonymous usage statistics go to **Azure Application Insights** so we can see
how many people visit and which features they use. Code: `src/lib/telemetry.js`.

## Azure resources

All in resource group `fishpond-math-hammer` (subscription
"Visual Studio Enterprise 订阅"), region `eastus`:

| Resource | Name | Notes |
|---|---|---|
| Log Analytics workspace | `fishpond-math-hammer` | 0.1 GB/day cap, 90-day retention |
| Application Insights | `fishpond-math-hammer` | Workspace-based; App ID `c6bdc963-83ef-40d8-a958-11663e1a2fbf` |
| Workbook | `Fishpond Usage` | Dashboard, ID `451b4159-ba3a-45d5-acdf-56c7df7b0416`; source in `infra/workbook.json` |

Open the dashboard in the portal: Application Insights `fishpond-math-hammer`
→ Workbooks → **Fishpond Usage**. After editing `infra/workbook.json`, run
`infra/deploy-workbook.sh` to update it in place (edits made in the portal are
overwritten, so copy them back into the JSON first).

The connection string is hard-coded in `telemetry.js`. It is not a secret:
any browser connection string ships in the client JS.

## When telemetry runs

Only when **both** hold:

- the bundle is a production build (`import.meta.env.PROD`), and
- the page host is in `PRODUCTION_HOSTS`: `fishpond-math-hammer.net`,
  `www.fishpond-math-hammer.net`, `yellow-river-0a256470f.7.azurestaticapps.net`.

So `npm run dev`, `npm run preview`, LAN testing (`--host`) and PR preview
environments send nothing. The owner's own use of the production site **is**
counted, by design. If the site gets a new domain, add it to
`PRODUCTION_HOSTS`, or it will silently stop reporting.

Only custom events are sent. Page views, AJAX/fetch and exception
auto-collection are disabled. The SDK is loaded with a dynamic `import()`
after first render; events tracked before it loads are queued and flushed.

## Events

Every occurrence is recorded (no de-duplication). Every event carries
`language` (`en` | `zh`), the Attack Simulator language setting at that
moment (it is the only page with a language switch).

| Event | Fired when | Extra properties |
|---|---|---|
| `AppOpen` | Each page load (site visit) | |
| `Run40KSimulation` | 40K simulation starts (after validation passes) | |
| `Profile` | A Profile is saved, loaded, viewed, created, renamed, duplicated, deleted, imported or exported | `action` |
| `Comparison` | A Profile Comparison runs | |
| `CopyReport` | A simulator report is copied | `page`: `40k-simulator` / `aos-simulator` |
| `RunAoSSimulation` | AoS simulation starts | |
| `DiceCalculator` | Calculate is pressed | `calculator`: `40k-wound` / `aos-damage` |
| `DiceRoller` | The pool is rolled or selected dice rerolled | `action`: `roll` / `reroll` |
| `CheatSheet` | The Cheat Sheet page opens | |
| `TacticalBoard` | The board opens, and each time the battleplan map changes | `map` (e.g. `map_17`, or `none`) |
| `BoardTools` | A ruler measurement, line, or freehand stroke completes; an eraser stroke removes something | `tool`: `ruler` / `line` / `draw` / `eraser` |
| `AddBase` | A base is added from the sidebar (not paste) | `shape`: `round` / `oval` / `rect` |
| `MissionCard` | A mission card dialog opens | |
| `RecordVP` | A VP / mission plan field is edited; consecutive edits to the same field count once | |

To add an event: add it to `TELEMETRY_EVENTS`, call `trackEvent(...)` at the
user action (not inside a store or `lib/dice`), and update this table and the
workbook.

## Local live dashboard

```sh
az login          # once; the dashboard uses this login
npm run usage     # http://localhost:5180
```

`tools/usage-dashboard/` is a zero-dependency Node server (`server.mjs`) plus
one HTML page. The server gets a token from the Azure CLI, runs a fixed set of
KQL queries against the Application Insights query API, and serves the page,
which refreshes every 30 s. It binds to 127.0.0.1, only answers GETs with a
`localhost` Host header, and never accepts KQL from the browser. It is a local
tool, not part of the site build.

## Queries

Run in the Azure portal → Application Insights `fishpond-math-hammer` → Logs,
or from the CLI:

```sh
az monitor app-insights query --app c6bdc963-83ef-40d8-a958-11663e1a2fbf \
  --analytics-query "customEvents | summarize count() by name" --offset 7d
```

Visits and visitors per day:

```kusto
customEvents
| where name == "AppOpen"
| summarize Visits = count(), Visitors = dcount(user_Id) by bin(timestamp, 1d)
| order by timestamp asc
```

Feature usage — total uses, users, and share of visitors who used it:

```kusto
let visitors = toscalar(customEvents | where name == "AppOpen" | summarize dcount(user_Id));
customEvents
| where name != "AppOpen"
| summarize Uses = count(), Users = dcount(user_Id) by name
| extend UsageRate = round(100.0 * Users / visitors, 1)
| order by Users desc
```

Breakdowns (swap the event and property):

```kusto
customEvents
| where name == "TacticalBoard"            // or BoardTools / Profile / AddBase
| summarize Uses = count() by Value = tostring(customDimensions.map)   // tool / action / shape
| order by Uses desc
```

`user_Id` is an anonymous per-browser cookie ID, so one person on two
browsers (or Safari plus the home-screen app) counts as two users.

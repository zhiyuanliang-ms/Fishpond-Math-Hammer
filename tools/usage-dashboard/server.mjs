// Local, near-real-time usage dashboard for Fishpond Math Hammer telemetry.
//
//   npm run usage        → http://localhost:5180
//
// Reads Application Insights through its query API with the token of the
// signed-in Azure CLI (`az login`), so no key is stored anywhere. The server
// binds to 127.0.0.1 and only runs the fixed queries below.

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PORT = Number(process.env.PORT) || 5180
const APP_ID = 'c6bdc963-83ef-40d8-a958-11663e1a2fbf'
const QUERY_URL = `https://api.applicationinsights.io/v1/apps/${APP_ID}/query`
const HERE = dirname(fileURLToPath(import.meta.url))

const RANGES = {
  '1h': { iso: 'PT1H', span: '1h', step: '5m' },
  '24h': { iso: 'P1D', span: '1d', step: '1h' },
  '7d': { iso: 'P7D', span: '7d', step: '1d' },
  '30d': { iso: 'P30D', span: '30d', step: '1d' },
  '90d': { iso: 'P90D', span: '90d', step: '7d' },
}

const FEATURE_LABELS = `let labels = datatable(name:string, Feature:string)[
 "Run40KSimulation","Run 40K Simulation", "Profile","Profile", "Comparison","Comparison",
 "CopyReport","Copy Report", "RunAoSSimulation","Run AoS Simulation",
 "DiceCalculator","Dice Calculator", "DiceRoller","Dice Roller", "CheatSheet","Cheat Sheet",
 "TacticalBoard","Tactical Board", "BoardTools","Board Tools", "AddBase","Add Base",
 "MissionCard","Mission Card", "RecordVP","Record VP"];`

const QUERIES = {
  overview: `let ev = customEvents | where timestamp > ago({span});
print
  Visits = toscalar(ev | where name == "AppOpen" | count),
  Visitors = toscalar(ev | where name == "AppOpen" | summarize dcount(user_Id)),
  FeatureUses = toscalar(ev | where name != "AppOpen" | count)`,
  trend: `customEvents
| where timestamp > ago({span}) and name == "AppOpen"
| make-series Visits = count() default = 0, Visitors = dcount(user_Id) default = 0
    on timestamp from bin(ago({span}), {step}) to now() step {step}
| mv-expand timestamp to typeof(datetime), Visits to typeof(long), Visitors to typeof(long)
| project timestamp, Visits, Visitors`,
  features: `${FEATURE_LABELS}
let ev = customEvents | where timestamp > ago({span});
let visitors = toscalar(ev | where name == "AppOpen" | summarize dcount(user_Id));
ev
| where name != "AppOpen"
| summarize Uses = count(), Users = dcount(user_Id) by name
| join kind=rightouter labels on name
| project Feature, Uses = coalesce(Uses, 0), Users = coalesce(Users, 0)
| extend Rate = iff(visitors == 0, 0.0, round(100.0 * Users / visitors, 1))
| order by Users desc, Uses desc`,
  recent: `customEvents
| where timestamp > ago({span})
| top 40 by timestamp desc
| extend d = bag_remove_keys(customDimensions, dynamic(["language"]))
| project timestamp, name, Details = tostring(d),
    User = substring(user_Id, 0, 6), Country = client_CountryOrRegion, Browser = client_Browser`,
}

// --- Azure CLI token (cached until shortly before it expires) -------------
let token = null
function getToken() {
  if (token && token.expiresAt - Date.now() > 5 * 60_000) return Promise.resolve(token.value)
  return new Promise((resolve, reject) => {
    execFile(
      'az',
      ['account', 'get-access-token', '--resource', 'https://api.applicationinsights.io', '-o', 'json'],
      { env: { ...process.env, AZURE_CORE_ONLY_SHOW_ERRORS: '1', PYTHONWARNINGS: 'ignore' } },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`Azure CLI token failed. Run \`az login\` first.\n${stderr || err.message}`))
          return
        }
        const out = JSON.parse(stdout)
        token = { value: out.accessToken, expiresAt: Number(out.expires_on) * 1000 }
        resolve(token.value)
      },
    )
  })
}

async function runQuery(kql, range) {
  const query = kql.replaceAll('{span}', range.span).replaceAll('{step}', range.step)
  const res = await fetch(QUERY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, timespan: range.iso }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body?.error?.innererror?.message || body?.error?.message || res.statusText)
  const table = body.tables[0]
  const cols = table.columns.map((c) => c.name)
  return table.rows.map((row) => Object.fromEntries(row.map((v, i) => [cols[i], v])))
}

async function dashboard(rangeKey) {
  const range = RANGES[rangeKey] ?? RANGES['24h']
  const entries = await Promise.all(
    Object.entries(QUERIES).map(async ([key, kql]) => [key, await runQuery(kql, range)]),
  )
  return { range: rangeKey in RANGES ? rangeKey : '24h', generatedAt: new Date().toISOString(), ...Object.fromEntries(entries) }
}

// --- HTTP ------------------------------------------------------------------
const LOCAL_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`])

const server = createServer(async (req, res) => {
  // Refuse other Host headers so a web page cannot reach this via DNS rebinding.
  if (!LOCAL_HOSTS.has(req.headers.host) || req.method !== 'GET') {
    res.writeHead(403).end('Forbidden')
    return
  }
  const url = new URL(req.url, `http://${req.headers.host}`)
  try {
    if (url.pathname === '/') {
      const html = await readFile(join(HERE, 'index.html'))
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(html)
    } else if (url.pathname === '/api/dashboard') {
      const data = await dashboard(url.searchParams.get('range'))
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(data))
    } else {
      res.writeHead(404).end('Not found')
    }
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message }))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Fishpond usage dashboard: http://localhost:${PORT}`)
})

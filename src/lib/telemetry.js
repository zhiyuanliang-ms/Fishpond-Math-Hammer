// Anonymous usage telemetry, sent to Azure Application Insights.
//
// Only custom events are sent (see TELEMETRY_EVENTS); page views, AJAX and
// exception auto-collection are off. Telemetry runs only in a production
// build served from a production host, so `npm run dev`, `npm run preview`,
// LAN testing and PR preview environments never send anything.

import { readStoredLang } from './langStorage'

// Not a secret: a browser connection string is visible in the shipped JS.
const CONNECTION_STRING =
  'InstrumentationKey=1b3ecb1b-b6ab-40b1-a864-e447268a8474;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=c6bdc963-83ef-40d8-a958-11663e1a2fbf'

export const PRODUCTION_HOSTS = new Set([
  'fishpond-math-hammer.net',
  'www.fishpond-math-hammer.net',
  'yellow-river-0a256470f.7.azurestaticapps.net',
])

export const TELEMETRY_EVENTS = Object.freeze({
  AppOpen: 'AppOpen',
  Run40KSimulation: 'Run40KSimulation',
  Profile: 'Profile',
  Comparison: 'Comparison',
  CopyReport: 'CopyReport',
  RunAoSSimulation: 'RunAoSSimulation',
  DiceCalculator: 'DiceCalculator',
  DiceRoller: 'DiceRoller',
  CheatSheet: 'CheatSheet',
  TacticalBoard: 'TacticalBoard',
  BoardTools: 'BoardTools',
  AddBase: 'AddBase',
  MissionCard: 'MissionCard',
  RecordVP: 'RecordVP',
})

export function isTelemetryHost(hostname, isProductionBuild = import.meta.env.PROD) {
  return Boolean(isProductionBuild) && PRODUCTION_HOSTS.has(hostname)
}

let enabled = false
let client = null
let pending = []

/**
 * Record one occurrence of a usage event. Every event carries the UI
 * `language` at the moment it happened. A no-op unless telemetry started.
 */
export function trackEvent(name, properties = {}) {
  if (!enabled) return
  const event = { name, properties: { language: readStoredLang(), ...properties } }
  if (client) client.trackEvent(event)
  else pending.push(event)
}

/** Start telemetry once per page load and record `AppOpen`. */
export function initTelemetry() {
  if (enabled || typeof window === 'undefined') return
  if (!isTelemetryHost(window.location.hostname)) return
  enabled = true
  trackEvent(TELEMETRY_EVENTS.AppOpen)

  // Load the SDK after first render so it never delays the app.
  import('@microsoft/applicationinsights-web')
    .then(({ ApplicationInsights }) => {
      const ai = new ApplicationInsights({
        config: {
          connectionString: CONNECTION_STRING,
          disableAjaxTracking: true,
          disableFetchTracking: true,
          disableExceptionTracking: true,
          enableAutoRouteTracking: false,
          autoTrackPageVisitTime: false,
        },
      })
      ai.loadAppInsights()
      client = ai
      for (const event of pending) ai.trackEvent(event)
      pending = []
    })
    .catch(() => {
      enabled = false
      pending = []
    })
}

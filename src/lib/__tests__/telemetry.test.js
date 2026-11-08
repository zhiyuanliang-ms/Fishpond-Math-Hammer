import { describe, expect, it } from 'vitest'
import { initTelemetry, isTelemetryHost, trackEvent } from '../telemetry'

describe('isTelemetryHost', () => {
  it('accepts the production hosts in a production build', () => {
    expect(isTelemetryHost('fishpond-math-hammer.net', true)).toBe(true)
    expect(isTelemetryHost('www.fishpond-math-hammer.net', true)).toBe(true)
    expect(isTelemetryHost('yellow-river-0a256470f.7.azurestaticapps.net', true)).toBe(true)
  })

  it('rejects local, LAN and PR preview hosts', () => {
    for (const host of [
      'localhost',
      '127.0.0.1',
      '192.168.1.20',
      'yellow-river-0a256470f-42.eastus2.7.azurestaticapps.net',
    ]) {
      expect(isTelemetryHost(host, true)).toBe(false)
    }
  })

  it('rejects every host outside a production build', () => {
    expect(isTelemetryHost('fishpond-math-hammer.net', false)).toBe(false)
  })
})

describe('trackEvent', () => {
  it('is a no-op when telemetry has not started (tests are not a production build)', () => {
    initTelemetry()
    expect(() => trackEvent('AppOpen', { anything: 1 })).not.toThrow()
  })
})

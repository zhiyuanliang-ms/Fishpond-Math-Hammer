import { describe, expect, it } from 'vitest'
import { MAX_ZOOM, clampView, fitScale, zoomAbout } from '../useBoardViewport'

const content = { x: 0, y: 0, width: 400, height: 200 }
const size = { width: 200, height: 200 }

describe('board viewport math', () => {
  it('fits the board and centers it when at or below fit scale', () => {
    expect(fitScale(size, content)).toBe(0.5)
    expect(clampView({ scale: 0, x: 999, y: -999 }, size, content)).toMatchObject({ scale: 0.5, y: 50 })
  })

  it('caps zoom at MAX_ZOOM times the fit scale', () => {
    expect(clampView({ scale: 100, x: 0, y: 0 }, size, content).scale).toBe(0.5 * MAX_ZOOM)
  })

  it('keeps a zoomed board covering the viewport edges', () => {
    const view = clampView({ scale: 1, x: 50, y: -500 }, size, content)
    expect(view.x).toBeCloseTo(0)
    expect(view.y).toBeCloseTo(0)
    expect(clampView({ scale: 1, x: -999, y: 0 }, size, content).x).toBe(-200)
  })

  it('zooms about a screen point without moving the board point under it', () => {
    const view = { scale: 1, x: -40, y: -10 }
    const point = { x: 60, y: 30 }
    const next = zoomAbout(view, point, 2)
    const before = { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale }
    const after = { x: (point.x - next.x) / next.scale, y: (point.y - next.y) / next.scale }
    expect(after).toEqual(before)
  })
})

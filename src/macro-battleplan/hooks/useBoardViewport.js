import { useCallback, useEffect, useRef, useState } from 'react'
import { cancelActiveInteractions } from './interactionCancel'

export const MAX_ZOOM = 4
// Per wheel-delta unit; deltas are capped so one mouse notch is a modest step.
const WHEEL_ZOOM_STEP = 0.01
const WHEEL_DELTA_CAP = 50

// Pure view math, exported for tests. `content` is the board rect (stage
// units) that must stay reachable; `fit` is the scale at which it fits.
export function fitScale(size, content) {
  return Math.min(size.width / content.width, size.height / content.height)
}

export function clampView(view, size, content) {
  const fit = fitScale(size, content)
  const scale = Math.min(fit * MAX_ZOOM, Math.max(fit, view.scale))
  const clampAxis = (pos, viewLen, start, len) => {
    const scaledLen = len * scale
    // Smaller than the viewport: keep it centered. Larger: no gap at an edge.
    if (scaledLen <= viewLen) return (viewLen - scaledLen) / 2 - start * scale
    return Math.min(-start * scale, Math.max(viewLen - (start + len) * scale, pos))
  }
  return {
    scale,
    x: clampAxis(view.x, size.width, content.x, content.width),
    y: clampAxis(view.y, size.height, content.y, content.height),
  }
}

// Scale about a fixed screen point so the board point under it stays put.
export function zoomAbout(view, point, nextScale) {
  const bx = (point.x - view.x) / view.scale
  const by = (point.y - view.y) / view.scale
  return { scale: nextScale, x: point.x - bx * nextScale, y: point.y - by * nextScale }
}

/**
 * Owns the stage transform: fit-to-screen on mount, then two-finger pinch /
 * pan on touch, ctrl+wheel (and trackpad pinch) zoom plus wheel pan on
 * desktop, and one-finger pan on empty board while zoomed in with the cursor
 * tool. While a multi-touch gesture runs, pointer and touch events are
 * stopped in the capture phase so tools underneath never see them.
 */
export function useBoardViewport({ stageRef, size, content, canPanAt }) {
  const viewRef = useRef(null)
  const [zoomed, setZoomed] = useState(false)
  const zoomedRef = useRef(false)
  const canPanAtRef = useRef(canPanAt)
  useEffect(() => {
    canPanAtRef.current = canPanAt
    zoomedRef.current = zoomed
  })

  // Writes the transform to the stage; returns the clamped view.
  const applyToStage = useCallback(
    (next) => {
      const stage = stageRef.current
      if (!stage) return null
      const view = clampView(next, size, content)
      viewRef.current = view
      stage.scale({ x: view.scale, y: view.scale })
      stage.position({ x: view.x, y: view.y })
      stage.batchDraw()
      return view
    },
    [stageRef, size, content],
  )

  const apply = useCallback(
    (next) => {
      const view = applyToStage(next)
      if (view) setZoomed(view.scale > fitScale(size, content) * 1.001)
    },
    [applyToStage, size, content],
  )

  const resetView = useCallback(() => apply({ scale: 0, x: 0, y: 0 }), [apply])

  // Re-fit on resize, keeping the zoom factor and the board point that was at
  // the center of the old viewport. The zoom factor survives, so `zoomed`
  // does not change here.
  const lastSizeRef = useRef(null)
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return
    const prev = viewRef.current
    const prevSize = lastSizeRef.current
    lastSizeRef.current = size
    if (!prev || !prevSize) {
      applyToStage({ scale: 0, x: 0, y: 0 })
      return
    }
    const zoom = prev.scale / fitScale(prevSize, content)
    const scale = fitScale(size, content) * zoom
    const bx = (prevSize.width / 2 - prev.x) / prev.scale
    const by = (prevSize.height / 2 - prev.y) / prev.scale
    applyToStage({ scale, x: size.width / 2 - bx * scale, y: size.height / 2 - by * scale })
  }, [size, content, applyToStage])

  // Zoomed in, one finger on empty board pans, so the browser must not scroll.
  useEffect(() => {
    const el = stageRef.current?.content
    if (!el) return
    el.classList.toggle('mbp-zoomed', zoomed)
  }, [zoomed, stageRef])

  useEffect(() => {
    const stage = stageRef.current
    const el = stage?.container()
    if (!el) return

    const pointers = new Map()
    // idle | pan (one finger) | pinch | blocked (pinch over, fingers still down)
    let mode = 'idle'
    let start = null

    const local = (p) => {
      const rect = el.getBoundingClientRect()
      return { x: p.x - rect.left, y: p.y - rect.top }
    }
    const firstTwo = () => [...pointers.values()].slice(0, 2).map(local)

    const beginPinch = () => {
      const [a, b] = firstTwo()
      start = {
        view: viewRef.current,
        dist: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      }
      mode = 'pinch'
    }

    const onPointerDown = (ev) => {
      if (ev.pointerType !== 'touch') return
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
      if (pointers.size >= 2) {
        if (mode === 'idle') cancelActiveInteractions()
        beginPinch()
        ev.stopPropagation()
        return
      }
      if (mode !== 'idle') {
        ev.stopPropagation()
        return
      }
      const p = local({ x: ev.clientX, y: ev.clientY })
      if (zoomedRef.current && canPanAtRef.current?.(p)) {
        mode = 'pan'
        start = { view: viewRef.current, point: p }
        ev.stopPropagation()
      }
    }

    const onPointerMove = (ev) => {
      if (!pointers.has(ev.pointerId)) return
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
      if (mode === 'idle') return
      ev.stopPropagation()
      if (mode === 'pan') {
        const p = local({ x: ev.clientX, y: ev.clientY })
        apply({
          scale: start.view.scale,
          x: start.view.x + p.x - start.point.x,
          y: start.view.y + p.y - start.point.y,
        })
      } else if (mode === 'pinch') {
        const [a, b] = firstTwo()
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const scale = start.view.scale * (Math.hypot(b.x - a.x, b.y - a.y) / start.dist)
        const zoomedView = zoomAbout(start.view, start.mid, scale)
        apply({
          scale,
          x: zoomedView.x + mid.x - start.mid.x,
          y: zoomedView.y + mid.y - start.mid.y,
        })
      }
    }

    const onPointerEnd = (ev) => {
      if (!pointers.delete(ev.pointerId)) return
      if (mode === 'idle') return
      ev.stopPropagation()
      if (pointers.size === 0) mode = 'idle'
      else if (mode === 'pinch' && pointers.size < 2) mode = 'blocked'
      else if (mode === 'pinch') beginPinch()
    }

    // Konva and the ruler also listen to touch events; hide those too, and
    // stop the browser from scrolling or zooming the page mid-gesture.
    const onTouch = (ev) => {
      if (mode === 'idle' && ev.touches.length < 2) return
      ev.stopPropagation()
      if (ev.cancelable) ev.preventDefault()
    }

    const onWheel = (ev) => {
      const view = viewRef.current
      if (!view) return
      if (ev.ctrlKey || ev.metaKey) {
        ev.preventDefault()
        const p = local({ x: ev.clientX, y: ev.clientY })
        const delta = Math.max(-WHEEL_DELTA_CAP, Math.min(WHEEL_DELTA_CAP, ev.deltaY))
        apply(zoomAbout(view, p, view.scale * Math.exp(-delta * WHEEL_ZOOM_STEP)))
      } else if (zoomedRef.current) {
        ev.preventDefault()
        apply({ scale: view.scale, x: view.x - ev.deltaX, y: view.y - ev.deltaY })
      }
    }

    const capture = { capture: true }
    const active = { capture: true, passive: false }
    el.addEventListener('pointerdown', onPointerDown, capture)
    el.addEventListener('pointermove', onPointerMove, capture)
    el.addEventListener('pointerup', onPointerEnd, capture)
    el.addEventListener('pointercancel', onPointerEnd, capture)
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
      el.addEventListener(type, onTouch, active)
    }
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('pointerdown', onPointerDown, capture)
      el.removeEventListener('pointermove', onPointerMove, capture)
      el.removeEventListener('pointerup', onPointerEnd, capture)
      el.removeEventListener('pointercancel', onPointerEnd, capture)
      for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
        el.removeEventListener(type, onTouch, active)
      }
      el.removeEventListener('wheel', onWheel)
    }
  }, [stageRef, apply])

  return { zoomed, resetView }
}

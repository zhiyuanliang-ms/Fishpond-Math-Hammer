// Lets the viewport tell in-progress one-finger tools (base drag, drawing,
// ruler) to abandon their current action when a second finger lands and the
// gesture turns into a pinch.

const listeners = new Set()

export function onCancelInteractions(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function cancelActiveInteractions() {
  for (const fn of [...listeners]) fn()
}

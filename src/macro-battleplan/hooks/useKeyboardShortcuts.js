import { useEffect } from 'react'
import { useBoardStore } from '../store/boardStore'

/**
 * Global keyboard shortcuts:
 *  Esc                 cursor mode
 *  R / D / S / X       ruler / draw / line / eraser
 *  Q / E               rotate selection ±1°
 *  Delete / Backspace  remove selected piece
 *  Ctrl/Cmd + Z        undo (last 3 ops)
 *  Ctrl/Cmd + C / V    copy / paste selection
 */
export function useKeyboardShortcuts() {
  const rotateSelected = useBoardStore((s) => s.rotateSelected)
  const deleteSelected = useBoardStore((s) => s.deleteSelected)
  const setActiveTool = useBoardStore((s) => s.setActiveTool)
  const undo = useBoardStore((s) => s.undo)
  const copySelected = useBoardStore((s) => s.copySelected)
  const pasteCopied = useBoardStore((s) => s.pasteCopied)

  useEffect(() => {
    const handler = (e) => {
      const target = e.target
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        copySelected()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        pasteCopied()
        return
      }

      if (e.key === 'Escape') {
        setActiveTool('cursor')
      } else if (e.key === 'r' || e.key === 'R') {
        setActiveTool('ruler')
      } else if (e.key === 'd' || e.key === 'D') {
        setActiveTool('draw')
      } else if (e.key === 's' || e.key === 'S') {
        setActiveTool('line')
      } else if (e.key === 'x' || e.key === 'X') {
        setActiveTool('eraser')
      } else if (e.key === 'q' || e.key === 'Q') {
        rotateSelected(-1)
      } else if (e.key === 'e' || e.key === 'E') {
        rotateSelected(1)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [rotateSelected, deleteSelected, setActiveTool, undo, copySelected, pasteCopied])
}

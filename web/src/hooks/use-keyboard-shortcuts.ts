"use client"

import { useEffect, useCallback } from "react"

/** Keyboard shortcut binding */
interface ShortcutBinding {
  /** Key code (e.g. "k", "Enter", "Escape") */
  key: string
  /** Require Cmd/Ctrl modifier */
  meta?: boolean
  /** Require Shift modifier */
  shift?: boolean
  /** Action to run */
  action: () => void
  /** Only fire when this element has focus (optional) */
  targetRef?: React.RefObject<HTMLElement | null>
}

/**
 * Hook for registering global keyboard shortcuts.
 * Automatically cleans up on unmount.
 *
 * Usage:
 * ```ts
 * useKeyboardShortcuts([
 *   { key: "k", meta: true, action: () => focusSearch() },
 *   { key: "Escape", action: () => closePanel() },
 * ])
 * ```
 */
export function useKeyboardShortcuts(bindings: ShortcutBinding[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      for (const binding of bindings) {
        const keyMatch = e.key.toLowerCase() === binding.key.toLowerCase()
        const metaMatch = binding.meta ? (e.metaKey || e.ctrlKey) : true
        const shiftMatch = binding.shift ? e.shiftKey : true

        if (keyMatch && metaMatch && shiftMatch) {
          // If targetRef is specified, only fire when that element has focus
          if (binding.targetRef?.current) {
            if (document.activeElement !== binding.targetRef.current) continue
          }

          e.preventDefault()
          binding.action()
          return
        }
      }
    },
    [bindings]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}

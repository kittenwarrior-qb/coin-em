import { useLayoutEffect, useRef, type RefObject } from 'react'

type Options = { onClose?: () => void; persistent?: boolean; initialFocus?: 'panel' }
type Entry = { node: HTMLElement | null; options: () => Options; openers: HTMLElement[] }
const stack: Entry[] = []
const marker = '__emcoinPopup'
let base: { state: unknown; url: string; id: string } | null = null
let consuming = false
let listening = false
let returnFocus: HTMLElement[] = []

function connectedOpener(openers: HTMLElement[]) {
  const dialog = topDialog()?.node
  return openers.find(element => element.isConnected && !element.closest('[hidden],[inert],[aria-hidden="true"]') && (!dialog || dialog.contains(element)))
}

function focusable(node: HTMLElement) {
  return Array.from(node.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex]'))
    .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[hidden],[inert],[aria-hidden="true"]'))
}
function focusTop() {
  const top = topDialog()
  if (top?.node) (top.options().initialFocus === 'panel' ? top.node : focusable(top.node)[0] ?? top.node).focus()
}
function topDialog() {
  for (let index = stack.length - 1; index >= 0; index--) if (stack[index].node) return stack[index]
}
function navigationPending() {
  return stack.some(entry => entry.node === null)
}

/** Native Back shares the popup/pending boundary; never authorizes room exit. */
export function handlePlatformBack(): boolean {
  if (consuming) return true
  const top = stack[stack.length - 1]
  if (!top) return false
  const options = top.options()
  if (!navigationPending() && !options.persistent) options.onClose?.()
  return true
}
function sync() {
  const top = topDialog()
  for (const entry of stack) {
    if (!entry.node) continue
    // A legacy preview can live inside its parent; never inert its own ancestor.
    const hidden = entry !== top && !entry.node.contains(top?.node ?? null)
    entry.node.toggleAttribute('inert', hidden)
    if (hidden) entry.node.setAttribute('aria-hidden', 'true')
    else entry.node.removeAttribute('aria-hidden')
    entry.node.setAttribute('aria-modal', entry === top ? 'true' : 'false')
  }
}
function pushSentinel() {
  if (!base) return
  const state = base.state && typeof base.state === 'object' ? base.state : {}
  window.history.pushState({ ...state, [marker]: base.id }, '', base.url)
}
function teardown() {
  if (stack.length || consuming) return
  document.removeEventListener('keydown', onKey, true)
  document.removeEventListener('focusin', onFocus, true)
  window.removeEventListener('popstate', onBack, true)
  listening = false
  base = null
}
function onFocus(event: FocusEvent) {
  const top = topDialog()
  if (top?.node && event.target instanceof Node && !top.node.contains(event.target)) focusTop()
}
function onKey(event: KeyboardEvent) {
  const top = stack[stack.length - 1]
  if (!top) return
  if (event.key === 'Escape') {
    event.preventDefault(); event.stopImmediatePropagation()
    const options = top.options()
    if (!navigationPending() && !options.persistent) options.onClose?.()
  } else if (event.key === 'Tab') {
    const dialog = topDialog()?.node
    if (!dialog) return
    const items = focusable(dialog)
    const first = items[0], last = items[items.length - 1]
    if (!first || !dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault()
      ;(event.shiftKey ? last ?? dialog : first ?? dialog).focus()
    }
  }
}
function onBack(event: PopStateEvent) {
  if (!stack.length && !consuming) return
  event.stopImmediatePropagation()
  if (consuming) {
    consuming = false
    if (stack.length) pushSentinel()
    const openers = returnFocus
    returnFocus = []
    // History traversal can restore old focus after popstate; restore after that step.
    if (!stack.length && openers.length) setTimeout(() => { if (!stack.length) connectedOpener(openers)?.focus() }, 0)
    teardown()
    return
  }
  // Restore our same-route boundary before closing one popup or retaining pending.
  pushSentinel()
  const options = stack[stack.length - 1]?.options()
  if (!navigationPending() && options && !options.persistent) options.onClose?.()
}

function register(node: HTMLElement | null, options: () => Options) {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const parent = [...stack].reverse().find(candidate => opener && candidate.node?.contains(opener))
  const entry: Entry = { node, options, openers: [...new Set([...(opener ? [opener] : []), ...(parent?.openers ?? (consuming ? returnFocus : []))])] }
  if (!stack.length) {
    base = { state: window.history.state, url: window.location.href, id: crypto.randomUUID() }
    if (!consuming) pushSentinel()
  }
  if (!listening) {
    listening = true
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('focusin', onFocus, true)
    window.addEventListener('popstate', onBack, true)
  }
  stack.push(entry)
  sync(); if (node) focusTop()
  return () => {
    const wasTop = stack[stack.length - 1] === entry
    const index = stack.indexOf(entry)
    if (index >= 0) stack.splice(index, 1)
    node?.setAttribute('inert', ''); node?.setAttribute('aria-hidden', 'true')
    sync()
    const target = connectedOpener(entry.openers)
    if (wasTop && target) target.focus()
    else if (wasTop) focusTop()
    if (!stack.length && !consuming && window.history.state?.[marker] === base?.id) {
      returnFocus = entry.openers
      consuming = true
      window.history.back()
    }
    teardown()
  }
}

/** Non-popup commands also retain the current route until their bounded ACK settles. */
export function usePendingNavigationGuard(pending: boolean) {
  useLayoutEffect(() => {
    if (pending) return register(null, () => ({ persistent: true }))
  }, [pending])
}

/** Presentation only: never authorizes a room exit, socket action or reward. */
export function usePopupLifecycle(ref: RefObject<HTMLElement | null>, open: boolean, options: Options, scope?: unknown) {
  const current = useRef(options)
  useLayoutEffect(() => { current.current = options })
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    return register(ref.current, () => current.current)
  }, [ref, open, scope])
}

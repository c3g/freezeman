import api from "./api"
import type { AppDispatch } from "../store"
import type { FMSFrontendLogLevel } from "../models/fms_api_models"

type LogContext = Record<string, unknown>

const CONSOLE_METHODS: Record<FMSFrontendLogLevel, (...args: unknown[]) => void> = {
  debug: console.debug,
  info: console.info,
  warning: console.warn,
  error: console.error,
}

// A div or tr with only a React onClick is not visible in the DOM. To log it, add data-log-click to that element.
// TODO(PR review): decide which custom clickable elements (for example table rows that open a detail page)
// get data-log-click. No element has the attribute yet.
const CLICKABLE_SELECTOR = [
  "button",
  "a",
  "label",
  "summary",
  "input[type=checkbox]",
  "input[type=radio]",
  "[role=button]",
  "[role=checkbox]",
  "[role=switch]",
  "[role=menuitem]",
  "[role=tab]",
  "[role=option]",
  "[data-log-click]",
].join(", ")

let dispatch: AppDispatch | undefined

/**
 * Connect the logger to the Redux store. Call it once, at application start.
 */
export function initFrontendLogger(appDispatch: AppDispatch) {
  // Keep the store dispatch: log() reads the user token through it and sends the entries with it.
  // It is passed in, not imported, to prevent an import cycle with store.ts.
  dispatch = appDispatch

  // Log each click on a clickable element. Capture phase still sees a click when a component calls stopPropagation.
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return
      const control = event.target.closest(CLICKABLE_SELECTOR)
      if (!control) return

      // TODO(PR review) privacy: the text of a control can contain sample names or other data.
      // Option: log only id, aria-label and data-* attributes.
      const label =
        control.getAttribute("aria-label") ||
        control.textContent?.trim().slice(0, 50) ||
        control.id ||
        control.tagName.toLowerCase()

      // TODO(PR review) level: debug (production can filter it) or info (always kept).
      // TODO(PR review) volume: log() sends one request per call and the backend throttles the requests.
      // Many clicks can hit the throttle and drop other entries, errors included.
      // Options: batch the click entries, or raise the throttle rate.
      frontendLogger.debug("Click", { label, tag: control.tagName.toLowerCase() })
    },
    { capture: true },
  )
}

function hasAccessToken(appDispatch: AppDispatch): boolean {
  return Boolean(appDispatch((_, getState) => getState().auth.tokens.access))
}

function log(level: FMSFrontendLogLevel, message: string, context?: LogContext) {
  if (context === undefined) CONSOLE_METHODS[level](message)
  else CONSOLE_METHODS[level](message, context)

  // Without a user the backend refuses the request: the console line is enough.
  if (!dispatch || !hasAccessToken(dispatch)) return
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    url: window.location.pathname + window.location.search + window.location.hash,
    context,
  }
  dispatch(api.frontendLogs.send(entry)).catch((error: unknown) => {
    // Use console only: a call to the logger here can loop.
    console.warn("Frontend logger: the log entry was not sent.", error)
  })
}

/**
 * Logger for messages that must reach the backend log (`fms.frontend`).
 * Each call writes to the browser console and sends one request to the backend log if a user is logged in.
 * Put related data in one call: the backend throttles the requests.
 */
export const frontendLogger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warning", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
}

export default frontendLogger

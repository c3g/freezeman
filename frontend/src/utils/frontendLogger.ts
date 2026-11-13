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

let dispatch: AppDispatch | undefined

/**
 * Connect the logger to the Redux store. Call it once, at application start.
 */
export function initFrontendLogger(appDispatch: AppDispatch) {
  // Keep the store dispatch: log() reads the user token through it and sends the entries with it.
  // It is passed in, not imported, to prevent an import cycle with store.ts.
  dispatch = appDispatch
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
    url: window.location.pathname + window.location.search,
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

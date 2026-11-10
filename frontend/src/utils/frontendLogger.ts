import api from "./api"
import type { AppDispatch } from "../store"
import type { FMSFrontendLogConfig, FMSFrontendLogEntry, FMSFrontendLogLevel } from "../models/fms_api_models"

type LogContext = Record<string, unknown>

// Fallback only. Source of truth: FRONTEND_LOGGING in backend/fms/settings.py, served by GET /api/frontend-logs/config/.
const DEFAULT_CONFIG: FMSFrontendLogConfig = {
  max_batch_size: 100,
  flush_threshold: 50,
  flush_interval_ms: 2000,
  max_buffer_size: 500,
}

const CONSOLE_METHODS: Record<FMSFrontendLogLevel, (...args: unknown[]) => void> = {
  debug: console.debug,
  info: console.info,
  warning: console.warn,
  error: console.error,
}

let config: FMSFrontendLogConfig = DEFAULT_CONFIG
let configRequested = false
let dispatch: AppDispatch | undefined
let buffer: FMSFrontendLogEntry[] = []
let timer: ReturnType<typeof setTimeout> | undefined
let flushing = false

/**
 * Connect the logger to the Redux store and flush the buffer when the page is hidden or closed.
 * Call it once, at application start.
 */
export function initFrontendLogger(appDispatch: AppDispatch) {
  // Keep the store dispatch: flush() reads the user token through it and sends the batches with it.
  // It is passed in, not imported, to prevent an import cycle with store.ts.
  dispatch = appDispatch
  // On page hide or close, send what is still in the buffer. keepalive lets the request finish after unload.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush(true)
  })
  window.addEventListener("pagehide", () => void flush(true))
}

function hasAccessToken(appDispatch: AppDispatch): boolean {
  return Boolean(appDispatch((_, getState) => getState().auth.tokens.access))
}

async function loadConfig(appDispatch: AppDispatch) {
  configRequested = true
  try {
    const response = await appDispatch(api.frontendLogs.getConfig())
    config = { ...DEFAULT_CONFIG, ...response.data }
  } catch (error) {
    console.warn("Frontend logger: cannot load the config, using the defaults.", error)
  }
}

/**
 * Send the buffered entries to the backend, in batches of `config.max_batch_size`.
 * Keep the buffer if no user is logged in. Drop a batch that the backend rejects.
 */
async function flush(keepalive = false) {
  if (timer !== undefined) {
    clearTimeout(timer)
    timer = undefined
  }
  if (!dispatch || buffer.length === 0 || flushing) return
  if (!hasAccessToken(dispatch)) return

  flushing = true
  try {
    // A request on page hide must not wait for the config.
    if (!configRequested && !keepalive) await loadConfig(dispatch)

    while (buffer.length > 0) {
      const batch = buffer.splice(0, config.max_batch_size)
      try {
        await dispatch(api.frontendLogs.send(batch, { keepalive }))
      } catch (error) {
        // Use console only: a call to the logger here can loop.
        console.warn(`Frontend logger: ${batch.length} log entries were not sent.`, error)
      }
    }
  } finally {
    flushing = false
  }
}

function log(level: FMSFrontendLogLevel, message: string, context?: LogContext) {
  if (context === undefined) CONSOLE_METHODS[level](message)
  else CONSOLE_METHODS[level](message, context)

  buffer.push({
    level,
    message,
    timestamp: new Date().toISOString(),
    url: window.location.pathname + window.location.search,
    context,
  })
  if (buffer.length > config.max_buffer_size) {
    buffer = buffer.slice(buffer.length - config.max_buffer_size)
  }

  if (level === "error" || buffer.length >= config.flush_threshold) {
    void flush()
  } else if (timer === undefined) {
    // Fixed window, not a debounce: a steady stream of logs does not delay the flush.
    timer = setTimeout(() => void flush(), config.flush_interval_ms)
  }
}

/**
 * Logger for messages that must reach the backend log (`fms.frontend`).
 * Each call also writes to the browser console.
 * Entries are sent in batches. An `error` entry is sent at once.
 */
export const frontendLogger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warning", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
}

export default frontendLogger

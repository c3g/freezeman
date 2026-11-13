import api from "./api"
import type { AppDispatch } from "../store"
import type { FMSFrontendLogConfig, FMSFrontendLogEntry, FMSFrontendLogLevel } from "../models/fms_api_models"

type LogContext = Record<string, unknown>

// Fallback only. Source of truth: FRONTEND_LOGGING in backend/fms/settings.py, served by GET /api/frontend-logs/config/.
const DEFAULT_CONFIG: FMSFrontendLogConfig = {
  max_buffer_size: 100,
  flush_delay_ms: 60000,
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
    if (document.visibilityState === "hidden") flush(true)
  })
  window.addEventListener("pagehide", () => flush(true))
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
 * Send all buffered entries to the backend in one request.
 * If no user is logged in, keep the newest `config.max_buffer_size` entries.
 * Drop a batch that the backend rejects.
 */
function flush(keepalive = false) {
  clearTimeout(timer)
  timer = undefined
  // Trim before the guards: entries pile up while no user is logged in.
  if (buffer.length > config.max_buffer_size) buffer = buffer.slice(-config.max_buffer_size)
  if (!dispatch || buffer.length === 0 || !hasAccessToken(dispatch)) return
  // A request on page hide must not start a config request.
  if (!configRequested && !keepalive) void loadConfig(dispatch)

  const batch = buffer
  buffer = []
  dispatch(api.frontendLogs.send(batch, { keepalive })).catch((error: unknown) => {
    // Use console only: a call to the logger here can loop.
    console.warn(`Frontend logger: ${batch.length} log entries were not sent.`, error)
  })
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

  if (buffer.length >= config.max_buffer_size) {
    flush()
  } else {
    // Debounce: send when no entry has come for flush_delay_ms. The size limit above bounds the wait.
    clearTimeout(timer)
    timer = setTimeout(() => flush(), config.flush_delay_ms)
  }
}

/**
 * Logger for messages that must reach the backend log (`fms.frontend`).
 * Each call also writes to the browser console.
 * Entries are sent when no entry has come for `flush_delay_ms` (1 minute), or when the buffer is full.
 */
export const frontendLogger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warning", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
}

export default frontendLogger

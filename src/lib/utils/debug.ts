// src/lib/utils/debug.ts

/**
 * Type for async functions that can be wrapped by safeExecute
 */
type AsyncHandler<T = any> = () => Promise<T>

/**
 * Type for sync functions that can be wrapped by safeExecute
 */
type SyncHandler<T = any> = () => T

/**
 * Combined handler type
 */
type Handler<T = any> = AsyncHandler<T> | SyncHandler<T>

/**
 * Safe execute wrapper for debugging
 * Wraps function calls to catch and log errors without crashing the app
 */
export async function safeExecute<T = any>(
  handler: Handler<T>,
  context?: string
): Promise<T | undefined> {
  try {
    const result = await handler()
    return result
  } catch (error) {
    console.error(`[SafeExecute${context ? ` - ${context}` : ''}]:`, error)
    return undefined
  }
}

/**
 * Debug logger with context
 */
export function debugLog(context: string, ...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${context}]`, ...args)
  }
}

/**
 * Performance timer for debugging
 */
export class DebugTimer {
  private startTime: number
  private context: string
  
  constructor(context: string) {
    this.context = context
    this.startTime = performance.now()
    debugLog(this.context, 'Started')
  }
  
  log(message: string) {
    const elapsed = performance.now() - this.startTime
    debugLog(this.context, `${message} (${elapsed.toFixed(2)}ms)`)
  }
  
  end() {
    const elapsed = performance.now() - this.startTime
    debugLog(this.context, `Completed in ${elapsed.toFixed(2)}ms`)
    return elapsed
  }
}

/**
 * Create a debug logger with a specific namespace
 */
export function createDebugger(namespace: string) {
  return {
    log: (...args: any[]) => debugLog(namespace, ...args),
    error: (error: any, ...args: any[]) => {
      console.error(`[${namespace}]`, error, ...args)
    },
    warn: (...args: any[]) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[${namespace}]`, ...args)
      }
    },
    time: () => new DebugTimer(namespace),
    execute: <T = any>(handler: Handler<T>, context?: string) => 
      safeExecute(handler, `${namespace}${context ? ` - ${context}` : ''}`)
  }
}

/**
 * Check if running in development mode
 */
export const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Check if running in production mode
 */
export const isProduction = process.env.NODE_ENV === 'production'

/**
 * Assert a condition in development mode
 */
export function devAssert(condition: any, message: string): asserts condition {
  if (isDevelopment && !condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

/**
 * Log only in development mode
 */
export function devLog(...args: any[]) {
  if (isDevelopment) {
    console.log(...args)
  }
}

/**
 * Warn only in development mode
 */
export function devWarn(...args: any[]) {
  if (isDevelopment) {
    console.warn(...args)
  }
}

/**
 * Error only in development mode (throws in dev, logs in prod)
 */
export function devError(message: string, error?: any) {
  if (isDevelopment) {
    throw new Error(message)
  } else {
    console.error(message, error)
  }
}
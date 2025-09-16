// src/lib/utils/index.ts

/**
 * Central export file for all utility functions
 * This makes imports cleaner: import { cn, formatMessageTime } from '@/lib/utils'
 */

// Re-export everything from individual utility files
export { cn } from './cn'
export {
  formatMessageTime,
  formatConversationTime,
  formatRelativeTime,
  formatDateSeparator,
  DateFormatter,
  dateFormatter,
  useDateFormatter,
  type DateLocale
} from './date-formatter'
export {
  extractHeaders,
  extractSearchParams,
  parseWebhookBody,
  createVerificationParams,
  createHeadersWithRawBody
} from './webhook'
export {
  safeExecute,
  debugLog,
  DebugTimer,
  createDebugger,
  isDevelopment,
  isProduction,
  devAssert,
  devLog,
  devWarn,
  devError
} from './debug'

// You can also import and create grouped exports for specific use cases
import * as dateFormatterModule from './date-formatter'
import * as webhookModule from './webhook'
import * as debugModule from './debug'

export const dateUtils = {
  formatMessageTime: dateFormatterModule.formatMessageTime,
  formatConversationTime: dateFormatterModule.formatConversationTime,
  formatRelativeTime: dateFormatterModule.formatRelativeTime,
  formatDateSeparator: dateFormatterModule.formatDateSeparator,
  DateFormatter: dateFormatterModule.DateFormatter,
  dateFormatter: dateFormatterModule.dateFormatter,
  useDateFormatter: dateFormatterModule.useDateFormatter,
} as const

export const webhookUtils = {
  extractHeaders: webhookModule.extractHeaders,
  extractSearchParams: webhookModule.extractSearchParams,
  parseWebhookBody: webhookModule.parseWebhookBody,
  createVerificationParams: webhookModule.createVerificationParams,
  createHeadersWithRawBody: webhookModule.createHeadersWithRawBody,
} as const

export const debugUtils = {
  safeExecute: debugModule.safeExecute,
  debugLog: debugModule.debugLog,
  DebugTimer: debugModule.DebugTimer,
  createDebugger: debugModule.createDebugger,
  isDevelopment: debugModule.isDevelopment,
  isProduction: debugModule.isProduction,
  devAssert: debugModule.devAssert,
  devLog: debugModule.devLog,
  devWarn: debugModule.devWarn,
  devError: debugModule.devError,
} as const
// src/lib/utils/date-formatter.ts

import { format, isToday, isYesterday, differenceInDays, isValid } from 'date-fns'
import { th, enUS } from 'date-fns/locale'

export type DateLocale = 'th' | 'en'

interface DateFormatterOptions {
  locale?: DateLocale
  showSeconds?: boolean
  use24Hour?: boolean
}

/**
 * Format date for message timestamps with intelligent relative formatting
 * - Today: HH:mm
 * - Yesterday: เมื่อวาน HH:mm
 * - 2-6 days ago: X วันที่แล้ว HH:mm
 * - More than 6 days: dd/MM/yy HH:mm
 */
export function formatMessageTime(
  date: string | Date, 
  options: DateFormatterOptions = {}
): string {
  const {
    locale = 'th',
    showSeconds = false,
    use24Hour = true
  } = options

  // Parse date
  const messageDate = typeof date === 'string' ? new Date(date) : date
  
  // Validate date
  if (!isValid(messageDate)) {
    return 'Invalid date'
  }

  const now = new Date()
  const daysDiff = differenceInDays(now, messageDate)
  const timeFormat = use24Hour 
    ? (showSeconds ? 'HH:mm:ss' : 'HH:mm')
    : (showSeconds ? 'h:mm:ss a' : 'h:mm a')

  // Get time string
  const timeStr = format(messageDate, timeFormat)

  // Determine the date part based on days difference
  if (isToday(messageDate)) {
    // Today - show only time
    return timeStr
  } 
  
  if (isYesterday(messageDate)) {
    // Yesterday
    return locale === 'th' 
      ? `เมื่อวาน ${timeStr}`
      : `Yesterday ${timeStr}`
  }
  
  if (daysDiff >= 2 && daysDiff <= 6) {
    // 2-6 days ago
    return locale === 'th'
      ? `${daysDiff} วันที่แล้ว ${timeStr}`
      : `${daysDiff} days ago ${timeStr}`
  }
  
  // More than 6 days - show full date
  const dateFormat = 'dd/MM/yy'
  const dateStr = format(messageDate, dateFormat)
  return `${dateStr} ${timeStr}`
}

/**
 * Format date for conversation list (shorter format)
 * - Today: HH:mm
 * - Yesterday: เมื่อวาน
 * - This week: day name (จันทร์, อังคาร)
 * - This year: dd MMM
 * - Other: dd/MM/yy
 */
export function formatConversationTime(
  date: string | Date,
  options: DateFormatterOptions = {}
): string {
  const { locale = 'th' } = options
  
  const messageDate = typeof date === 'string' ? new Date(date) : date
  
  if (!isValid(messageDate)) {
    return ''
  }

  const now = new Date()
  const daysDiff = differenceInDays(now, messageDate)
  const localeObj = locale === 'th' ? th : enUS

  if (isToday(messageDate)) {
    return format(messageDate, 'HH:mm')
  }
  
  if (isYesterday(messageDate)) {
    return locale === 'th' ? 'เมื่อวาน' : 'Yesterday'
  }
  
  if (daysDiff <= 7) {
    // Within a week - show day name
    return format(messageDate, 'EEEE', { locale: localeObj })
  }
  
  if (messageDate.getFullYear() === now.getFullYear()) {
    // Same year - show date and month
    return format(messageDate, 'd MMM', { locale: localeObj })
  }
  
  // Different year - show full date
  return format(messageDate, 'dd/MM/yy')
}

/**
 * Format relative time (e.g., "2 minutes ago", "3 hours ago")
 */
export function formatRelativeTime(
  date: string | Date,
  options: DateFormatterOptions = {}
): string {
  const { locale = 'th' } = options
  
  const messageDate = typeof date === 'string' ? new Date(date) : date
  
  if (!isValid(messageDate)) {
    return ''
  }

  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return locale === 'th' ? 'เมื่อสักครู่' : 'Just now'
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return locale === 'th' 
      ? `${diffInMinutes} นาทีที่แล้ว`
      : `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return locale === 'th'
      ? `${diffInHours} ชั่วโมงที่แล้ว`
      : `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return locale === 'th'
      ? `${diffInDays} วันที่แล้ว`
      : `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return locale === 'th'
      ? `${diffInWeeks} สัปดาห์ที่แล้ว`
      : `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`
  }
  
  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return locale === 'th'
      ? `${diffInMonths} เดือนที่แล้ว`
      : `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`
  }
  
  const diffInYears = Math.floor(diffInDays / 365)
  return locale === 'th'
    ? `${diffInYears} ปีที่แล้ว`
    : `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`
}

/**
 * Format date for date separators in chat
 */
export function formatDateSeparator(
  date: string | Date,
  options: DateFormatterOptions = {}
): string {
  const { locale = 'th' } = options
  
  const messageDate = typeof date === 'string' ? new Date(date) : date
  
  if (!isValid(messageDate)) {
    return ''
  }

  const localeObj = locale === 'th' ? th : enUS

  if (isToday(messageDate)) {
    return locale === 'th' ? 'วันนี้' : 'Today'
  }
  
  if (isYesterday(messageDate)) {
    return locale === 'th' ? 'เมื่อวาน' : 'Yesterday'
  }
  
  const now = new Date()
  const daysDiff = differenceInDays(now, messageDate)
  
  if (daysDiff <= 6) {
    // Within a week
    return format(messageDate, 'EEEE d MMMM', { locale: localeObj })
  }
  
  if (messageDate.getFullYear() === now.getFullYear()) {
    // Same year
    return format(messageDate, 'd MMMM', { locale: localeObj })
  }
  
  // Different year
  return format(messageDate, 'd MMMM yyyy', { locale: localeObj })
}

/**
 * Utility class for consistent date formatting across the app
 */
export class DateFormatter {
  private options: DateFormatterOptions

  constructor(options: DateFormatterOptions = {}) {
    this.options = {
      locale: 'th',
      showSeconds: false,
      use24Hour: true,
      ...options
    }
  }

  formatMessage(date: string | Date): string {
    return formatMessageTime(date, this.options)
  }

  formatConversation(date: string | Date): string {
    return formatConversationTime(date, this.options)
  }

  formatRelative(date: string | Date): string {
    return formatRelativeTime(date, this.options)
  }

  formatSeparator(date: string | Date): string {
    return formatDateSeparator(date, this.options)
  }

  setLocale(locale: DateLocale): void {
    this.options.locale = locale
  }

  setOptions(options: Partial<DateFormatterOptions>): void {
    this.options = { ...this.options, ...options }
  }
}

// Export singleton instance for default use
export const dateFormatter = new DateFormatter()

// React Hook for date formatting
import { useMemo } from 'react'

export function useDateFormatter(options: DateFormatterOptions = {}) {
  const formatter = useMemo(
    () => new DateFormatter(options),
    [options.locale, options.showSeconds, options.use24Hour]
  )

  return {
    formatMessage: formatter.formatMessage.bind(formatter),
    formatConversation: formatter.formatConversation.bind(formatter),
    formatRelative: formatter.formatRelative.bind(formatter),
    formatSeparator: formatter.formatSeparator.bind(formatter),
    formatter
  }
}
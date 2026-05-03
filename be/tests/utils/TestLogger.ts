/**
 * TestLogger - Centralized logging for tests
 * Provides consistent, colorful, and structured logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARNING = 3,
  ERROR = 4,
}

export interface LogEntry {
  timestamp: number
  level: LogLevel
  category: string
  message: string
  data?: any
}

export class TestLogger {
  private logs: LogEntry[] = []
  private minLevel: LogLevel = LogLevel.INFO
  private enableConsole: boolean = true

  constructor(minLevel: LogLevel = LogLevel.INFO, enableConsole: boolean = true) {
    this.minLevel = minLevel
    this.enableConsole = enableConsole
  }

  private log(level: LogLevel, category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
    }

    this.logs.push(entry)

    if (this.enableConsole && level >= this.minLevel) {
      this.printLog(entry)
    }
  }

  private printLog(entry: LogEntry) {
    const icons = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.SUCCESS]: '✅',
      [LogLevel.WARNING]: '⚠️',
      [LogLevel.ERROR]: '❌',
    }

    const icon = icons[entry.level]
    const time = new Date(entry.timestamp).toISOString().split('T')[1].slice(0, -1)
    const prefix = `[${time}] ${icon} [${entry.category}]`

    console.log(`${prefix} ${entry.message}`)
    if (entry.data) {
      console.log(`   Data:`, entry.data)
    }
  }

  debug(category: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, category, message, data)
  }

  info(category: string, message: string, data?: any) {
    this.log(LogLevel.INFO, category, message, data)
  }

  success(category: string, message: string, data?: any) {
    this.log(LogLevel.SUCCESS, category, message, data)
  }

  warning(category: string, message: string, data?: any) {
    this.log(LogLevel.WARNING, category, message, data)
  }

  error(category: string, message: string, data?: any) {
    this.log(LogLevel.ERROR, category, message, data)
  }

  // Specialized game logging
  phase(phaseName: string, round: number, totalRounds: number) {
    this.info('PHASE', `${phaseName} (Round ${round}/${totalRounds})`)
  }

  action(actor: string, action: string, target?: string) {
    const msg = target ? `${actor} → ${action} → ${target}` : `${actor} → ${action}`
    this.info('ACTION', msg)
  }

  event(eventName: string, data?: any) {
    this.info('EVENT', eventName, data)
  }

  // Get logs for reporting
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category)
  }

  // Clear logs
  clear() {
    this.logs = []
  }

  // Generate summary
  getSummary() {
    const byLevel = {
      debug: this.getLogsByLevel(LogLevel.DEBUG).length,
      info: this.getLogsByLevel(LogLevel.INFO).length,
      success: this.getLogsByLevel(LogLevel.SUCCESS).length,
      warning: this.getLogsByLevel(LogLevel.WARNING).length,
      error: this.getLogsByLevel(LogLevel.ERROR).length,
    }

    const categories = [...new Set(this.logs.map(log => log.category))]

    return {
      total: this.logs.length,
      byLevel,
      categories,
      duration: this.logs.length > 0 
        ? this.logs[this.logs.length - 1].timestamp - this.logs[0].timestamp 
        : 0,
    }
  }
}

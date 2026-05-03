import { Socket } from 'socket.io'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

const actionTimestamps = new Map<string, number[]>()

/**
 * Rate limit a socket action
 * @param socket Socket instance
 * @param action Action name
 * @param limitMs Minimum time between requests (default 500ms)
 * @returns true if allowed, false if rate limited
 */
export function rateLimitAction(socket: Socket, action: string, limitMs = 500): boolean {
  // Bypass rate limiting in test mode
  if (process.env.DISABLE_RATE_LIMIT === 'true') return true

  const key = `${socket.id}:${action}`
  const now = Date.now()
  const last = actionTimestamps.get(key) || []

  // Simple rate limit: minimum time between requests
  if (last.length > 0) {
    const lastTimestamp = last[last.length - 1]
    if (now - lastTimestamp < limitMs) {
      console.log(`[RateLimit] Blocked ${action} from ${socket.id} (too fast)`)
      return false
    }
  }

  // Update timestamp
  actionTimestamps.set(key, [now])
  return true
}

/**
 * Advanced rate limiter with sliding window
 * @param socket Socket instance
 * @param action Action name
 * @param config Rate limit configuration
 * @returns true if allowed, false if rate limited
 */
export function rateLimitAdvanced(
  socket: Socket,
  action: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 }
): boolean {
  const key = `${socket.id}:${action}`
  const now = Date.now()
  const timestamps = actionTimestamps.get(key) || []

  // Remove timestamps outside the window
  const validTimestamps = timestamps.filter((ts) => now - ts < config.windowMs)

  // Check if limit exceeded
  if (validTimestamps.length >= config.maxRequests) {
    console.log(
      `[RateLimit] Blocked ${action} from ${socket.id} (${validTimestamps.length}/${config.maxRequests} in ${config.windowMs}ms)`
    )
    return false
  }

  // Add current timestamp
  validTimestamps.push(now)
  actionTimestamps.set(key, validTimestamps)
  return true
}

/**
 * Clean up old timestamps periodically
 */
export function cleanupRateLimiter(): void {
  const now = Date.now()
  const MAX_AGE = 5 * 60 * 1000 // 5 minutes

  for (const [key, timestamps] of actionTimestamps.entries()) {
    const validTimestamps = timestamps.filter((ts) => now - ts < MAX_AGE)
    if (validTimestamps.length === 0) {
      actionTimestamps.delete(key)
    } else {
      actionTimestamps.set(key, validTimestamps)
    }
  }

  console.log(`[RateLimit] Cleanup completed. Active keys: ${actionTimestamps.size}`)
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimiter, 5 * 60 * 1000)

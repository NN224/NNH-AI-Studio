/**
 * Get Client IP Address
 *
 * Extracts the real client IP from request headers
 * considering proxies and load balancers
 */

import { NextRequest } from 'next/server'

/**
 * Get the client's real IP address from request
 */
export function getClientIP(request: NextRequest | Request): string {
  // Convert to NextRequest if needed
  const req = request instanceof Request ? new NextRequest(request.url, request) : request

  // Check various headers in order of preference
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ips = forwardedFor.split(',').map((ip) => ip.trim())
    if (ips[0]) return ips[0]
  }

  // Cloudflare
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP

  // Vercel
  const realIP = req.headers.get('x-real-ip')
  if (realIP) return realIP

  // Fallback to x-client-ip
  const clientIP = req.headers.get('x-client-ip')
  if (clientIP) return clientIP

  // Last resort - use a default
  return 'unknown-ip'
}

/**
 * Hash an IP address for privacy
 */
export function hashIP(ip: string): string {
  // Simple hash for privacy - in production use proper hashing
  const hash = ip.split('.').reduce((acc, octet) => {
    return acc + parseInt(octet, 10)
  }, 0)

  return `ip_${hash}_${ip.length}`
}

/**
 * Check if IP is from a known bot or crawler
 */
export function isKnownBot(userAgent: string | null): boolean {
  if (!userAgent) return false

  const botPatterns = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i, // Yahoo
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /slackbot/i,
    /discordbot/i,
  ]

  return botPatterns.some((pattern) => pattern.test(userAgent))
}

/**
 * Check if IP is private/local
 */
export function isPrivateIP(ip: string): boolean {
  const privateRanges = [
    /^127\./, // Loopback
    /^10\./, // Private Class A
    /^172\.(1[6-9]|2\d|3[01])\./, // Private Class B
    /^192\.168\./, // Private Class C
    /^::1$/, // IPv6 loopback
    /^fe80::/, // IPv6 link-local
    /^fc00::/, // IPv6 unique local
  ]

  return privateRanges.some((pattern) => pattern.test(ip))
}

/**
 * Get rate limit key for IP-based limiting
 */
export function getIPRateLimitKey(ip: string, endpoint?: string): string {
  const hashedIP = hashIP(ip)
  if (endpoint) {
    return `ratelimit:ip:${hashedIP}:${endpoint}`
  }
  return `ratelimit:ip:${hashedIP}`
}

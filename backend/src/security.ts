import type { Request, Response, NextFunction } from 'express';
import type { CorsOptions } from 'cors';

/**
 * Protection for /api/advise. The endpoint is unauthenticated by design -- the
 * clients are a public website and two mobile apps, none of which can hold a
 * secret, since anything shipped in a bundle is readable by whoever downloads
 * it. So the goal is not to identify callers; it is to make abuse of the Gemini
 * key expensive enough not to be worth it.
 *
 * Two independent layers:
 *   CORS      stops other websites from calling the API from a user's browser.
 *   Rate limit stops anyone -- browser, curl, or script -- from hammering it.
 *
 * CORS alone is worth very little here: it is enforced by browsers, so curl
 * ignores it entirely. The rate limit is the layer that actually bounds spend.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://balmody.com',
  'https://www.balmody.com',
  'http://localhost:8081',
  'http://localhost:19006',
];

export function allowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS;
  if (!configured) return DEFAULT_ALLOWED_ORIGINS;
  return configured
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function buildCorsOptions(origins: string[] = allowedOrigins()): CorsOptions {
  return {
    origin(requestOrigin, callback) {
      // No Origin header: a native app, a health check, curl, or a server-to-server
      // call. Browsers always send one, so this is not a CORS bypass -- it is the
      // case CORS was never meant to cover. The rate limit still applies.
      if (!requestOrigin) return callback(null, true);

      const normalized = requestOrigin.replace(/\/$/, '');
      if (origins.includes(normalized)) return callback(null, true);

      // Reject without throwing: cors() turns an Error into a 500, which would
      // read as an outage. Denying the header yields a clean browser-side CORS
      // failure instead.
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 86400,
  };
}

/**
 * Behind Cloudflare and Render, req.ip is a proxy address -- every user would
 * share one bucket and the first burst would lock out everybody. Cloudflare sets
 * CF-Connecting-IP and overwrites any client-supplied value, so it is the most
 * trustworthy hop we have. X-Forwarded-For is the fallback for requests that
 * reach Render directly, and is client-spoofable; that is acceptable because the
 * limiter is a cost guard, not an authorization boundary.
 */
export function clientIp(req: Request): string {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf.length > 0) return cf;

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return req.socket.remoteAddress ?? 'unknown';
}

interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  now?: () => number;
}

/**
 * Fixed-window counter, in memory. Per-instance and reset on deploy, which is
 * fine for one Render instance; a second instance would need shared state.
 */
export function createRateLimiter({ windowMs, max, now = Date.now }: RateLimitOptions) {
  const windows = new Map<string, Window>();

  // Sweep expired entries so a stream of unique IPs cannot grow the map without
  // bound. unref() keeps the timer from holding the process open.
  const sweep = setInterval(() => {
    const t = now();
    for (const [key, w] of windows) if (w.resetAt <= t) windows.delete(key);
  }, windowMs);
  if (typeof sweep.unref === 'function') sweep.unref();

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const key = clientIp(req);
    const t = now();
    const existing = windows.get(key);

    if (!existing || existing.resetAt <= t) {
      windows.set(key, { count: 1, resetAt: t + windowMs });
      return next();
    }

    existing.count += 1;

    if (existing.count > max) {
      const retryAfter = Math.max(1, Math.ceil((existing.resetAt - t) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment before seeking guidance again.',
        retryAfterSeconds: retryAfter,
      });
    }

    return next();
  };
}

/** Caps prompt cost. Real queries are a sentence or two. */
export const MAX_QUERY_LENGTH = 2000;

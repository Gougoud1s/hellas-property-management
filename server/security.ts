import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { allowedOrigins } from './config';

const windows = new Map<string, { count: number; resetAt: number }>();

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Resource-Policy': 'same-site',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  });
  next();
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const requestId = String(req.header('x-request-id') || randomUUID()).slice(0, 128);
  res.setHeader('X-Request-Id', requestId);
  res.locals.requestId = requestId;
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({ level: 'info', event: 'http_request', requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - startedAt }));
  });
  next();
}

export function trustedCors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.header('origin')?.replace(/\/$/, '');
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (origin) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key, X-Request-Id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
}

export function rateLimit(limit = 120, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = windows.get(key);
    const record = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    record.count += 1;
    windows.set(key, record);
    res.setHeader('RateLimit-Limit', String(limit));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, limit - record.count)));
    if (record.count > limit) { res.status(429).json({ error: 'Too many requests' }); return; }
    next();
  };
}

import rateLimit from 'express-rate-limit';
import { env } from '../env';

const skip = () => env.NODE_ENV === 'test';
const message = { error: { code: 'rate_limited', message: 'Too many attempts. Wait a few minutes and try again.' } };

// Production keeps the strict auth limit; development allows repeated demo sign ins for rehearsals and E2E runs.
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: env.NODE_ENV === 'production' ? 30 : 1000, standardHeaders: 'draft-8', legacyHeaders: false, skip, message });
export const reportLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, skip, message });
export const writeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, skip, message });

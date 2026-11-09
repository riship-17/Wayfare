import type { CookieOptions, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@wayfare/shared';
import { env } from '../env';
import { HttpError, forbidden } from '../lib/errors';
import { User, type UserDoc } from '../models';

export const SESSION_COOKIE = 'wf_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  };
}

export function setSession(res: Response, userId: string, role: Role) {
  const token = jwt.sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn: '30d', algorithm: 'HS256' });
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

export function clearSession(res: Response) {
  const { maxAge: _maxAge, ...opts } = cookieOptions();
  res.clearCookie(SESSION_COOKIE, opts);
}

/** Loads the user when a valid session cookie is present. Never fails the request. */
export const loadUser: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as { sub: string };
    const user = await User.findById(payload.sub);
    if (user && (!user.isDemo || env.DEMO_MODE)) req.user = user;
  } catch {
    // invalid or expired token: treat as signed out
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'unauthenticated', 'Sign in to continue.'));
  next();
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'unauthenticated', 'Sign in to continue.'));
    if (!roles.includes(req.user.role as Role)) return next(forbidden());
    next();
  };

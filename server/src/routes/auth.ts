import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { demoLoginSchema, loginSchema, registerSchema } from '@wayfare/shared';
import { env } from '../env';
import { HttpError, parse } from '../lib/errors';
import { clearSession, setSession } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimits';
import { User } from '../models';
import { serializeUser } from '../services/serialize';

export const authRouter = Router();

authRouter.post('/register', authLimiter, async (req, res) => {
  const input = parse(registerSchema, req.body);
  if (await User.exists({ email: input.email })) {
    throw new HttpError(409, 'email_taken', 'An account with this email already exists. Sign in instead.', { email: 'This email already has an account' });
  }
  const user = await User.create({ name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12) });
  setSession(res, String(user._id), 'student');
  res.status(201).json({ user: serializeUser(user) });
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const input = parse(loginSchema, req.body);
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  const ok = user && (await bcrypt.compare(input.password, user.passwordHash));
  if (!user || !ok || (user.isDemo && !env.DEMO_MODE)) {
    throw new HttpError(401, 'bad_credentials', 'That email and password do not match. Check them and try again.');
  }
  setSession(res, String(user._id), user.role as 'student');
  res.json({ user: serializeUser(user) });
});

authRouter.post('/logout', (_req, res) => {
  clearSession(res);
  res.status(204).end();
});

authRouter.get('/me', (req, res) => {
  res.json({ user: req.user ? serializeUser(req.user) : null, demoMode: env.DEMO_MODE });
});

authRouter.post('/demo', authLimiter, async (req, res) => {
  if (!env.DEMO_MODE) throw new HttpError(404, 'not_found', 'Demo mode is off.');
  const { as } = parse(demoLoginSchema, req.body);
  const email = as === 'admin' ? env.DEMO_ADMIN_EMAIL : env.DEMO_STUDENT_EMAIL;
  const user = await User.findOne({ email, isDemo: true });
  if (!user) throw new HttpError(404, 'demo_missing', 'The demo account is not set up yet. Run npm run seed.');
  setSession(res, String(user._id), user.role as 'student');
  res.json({ user: serializeUser(user) });
});

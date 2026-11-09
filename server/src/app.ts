import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import { env } from './env';
import { errorHandler, notFoundHandler } from './lib/errors';
import { loadUser } from './middleware/auth';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { communityRouter } from './routes/community';
import { contentRouter } from './routes/content';
import { journeyRouter } from './routes/journey';
import { listingsRouter } from './routes/listings';
import { meRouter } from './routes/me';
import { transitRouter } from './routes/transit';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // Inline style attributes come from motion and liquid glass.
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameSrc: ["'self'"],
          frameAncestors: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'", 'mailto:'],
          upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  const allow = env.CLIENT_ORIGIN.split(',').map((s) => s.trim());
  app.use('/api', cors({ origin: (origin, cb) => cb(null, !origin || allow.includes(origin)), credentials: true }));
  if (env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ level: env.NODE_ENV === 'production' ? 'info' : 'warn', redact: ['req.headers.cookie', 'res.headers["set-cookie"]'] }));
  }
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api', loadUser);

  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'up' : 'down', demoMode: env.DEMO_MODE, contactEmail: env.CONTACT_EMAIL });
  });
  api.use('/auth', authRouter);
  api.use('/me', meRouter);
  api.use('/journey', journeyRouter);
  api.use('/listings', listingsRouter);
  api.use('/transit', transitRouter);
  api.use('/admin', adminRouter);
  api.use('/', contentRouter);
  api.use('/', communityRouter);
  api.use(notFoundHandler);
  app.use('/api/v1', api);
  app.use('/api', notFoundHandler);

  if (env.NODE_ENV === 'production' && existsSync(clientDist)) {
    app.use(
      express.static(clientDist, {
        index: false,
        setHeaders: (res, file) => {
          if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          else res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    // SPA fallback. Share pages are private links, so they are kept out of search.
    app.get('/{*splat}', (req, res) => {
      if (req.path.startsWith('/share/') || req.path.startsWith('/admin') || req.path.startsWith('/app')) res.setHeader('X-Robots-Tag', 'noindex');
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}

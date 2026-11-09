import { Router } from 'express';
import { z } from 'zod';
import { planRoute } from '@wayfare/shared';
import { HttpError, parse } from '../lib/errors';
import { getNetwork } from '../services/transit';

export const transitRouter = Router();

transitRouter.get('/network', async (req, res) => {
  const net = await getNetwork();
  if (!net) throw new HttpError(503, 'transit_missing', 'Transit data is not imported yet. Run npm run import-transit.');
  res.setHeader('ETag', net.etag);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (req.headers['if-none-match'] === net.etag) return res.status(304).end();
  res.json(net.network);
});

transitRouter.get('/route', async (req, res) => {
  const { from, to } = parse(z.object({ from: z.string().min(1), to: z.string().min(1) }), req.query);
  const net = await getNetwork();
  if (!net) throw new HttpError(503, 'transit_missing', 'Transit data is not imported yet.');
  const route = planRoute(net.network, from, to);
  if (!route) throw new HttpError(404, 'no_route', 'We could not find a route between those stations.');
  res.json({ route });
});

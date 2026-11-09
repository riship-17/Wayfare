import { Router } from 'express';
import { taskUpdateSchema } from '@wayfare/shared';
import { notFound, parse } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { UserTask } from '../models';
import { journeyFor, templatesFor } from '../services/journey';

export const journeyRouter = Router();
journeyRouter.use(requireAuth);

journeyRouter.get('/', async (req, res) => {
  res.json(await journeyFor(req.user!));
});

journeyRouter.patch('/tasks/:key', async (req, res) => {
  const { status } = parse(taskUpdateSchema, req.body);
  const user = req.user!;
  const templates = await templatesFor(user.institutionId);
  if (!templates.some((t) => t.key === req.params.key)) throw notFound('That task');
  await UserTask.updateOne(
    { userId: user._id, key: req.params.key },
    { status, doneAt: status === 'done' ? new Date() : null },
    { upsert: true },
  );
  res.json(await journeyFor(user));
});

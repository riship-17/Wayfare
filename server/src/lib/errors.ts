import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, type ZodType } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (what = 'That page') => new HttpError(404, 'not_found', `${what} could not be found.`);
export const forbidden = () => new HttpError(403, 'forbidden', 'You do not have access to this.');

export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  throw zodToHttp(r.error);
}

function zodToHttp(err: ZodError): HttpError {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = issue.path.join('.') || '_';
    if (!fields[k]) fields[k] = issue.message;
  }
  const first = Object.values(fields)[0] ?? 'Check the highlighted fields.';
  return new HttpError(400, 'validation_failed', first, fields);
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(notFound('That API route'));

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) err = zodToHttp(err);
  if (err?.name === 'CastError') err = notFound();
  if (err?.type === 'entity.parse.failed') err = new HttpError(400, 'bad_json', 'The request body is not valid JSON.');
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) } });
    return;
  }
  req.log?.error({ err }, 'unhandled error');
  res.status(500).json({ error: { code: 'server_error', message: 'Something went wrong on our side. Try again in a moment.' } });
};

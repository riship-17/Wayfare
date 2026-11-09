import type { ApiError } from '@wayfare/shared';

export class RequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
  get offline() {
    return this.code === 'offline';
  }
}

const BASE = '/api/v1';

/** Built for the Vercel showcase: the API runs in the browser (src/demo/demoApi.ts), no server needed. */
export const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === 'true';

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  if (STATIC_DEMO) {
    const { handle } = await import('../demo/demoApi');
    return handle<T>(path, init);
  }
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: 'same-origin',
      ...rest,
      headers: { Accept: 'application/json', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new RequestError(0, 'offline', "You're offline. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as (T & Partial<ApiError>) | null;
  if (!res.ok) {
    const e = body?.error;
    throw new RequestError(res.status, e?.code ?? 'server_error', e?.message ?? 'Something went wrong. Try again in a moment.', e?.fields ?? {});
  }
  return body as T;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, json?: unknown) => api<T>(path, { method: 'POST', json: json ?? {} });
export const patch = <T>(path: string, json: unknown) => api<T>(path, { method: 'PATCH', json });
export const put = <T>(path: string, json: unknown) => api<T>(path, { method: 'PUT', json });
export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });

export function errorMessage(err: unknown, fallback = 'Something went wrong. Try again in a moment.'): string {
  if (err instanceof RequestError) return err.message;
  return fallback;
}

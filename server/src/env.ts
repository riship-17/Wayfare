import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/wayfare'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  PUBLIC_URL: z.string().default('http://localhost:5173'),
  CONTACT_EMAIL: z.string().default('{{contact_email}}'),
  HW_EMAIL_DOMAIN: z.string().default('{{hw_email_domain}}'),
  DEMO_MODE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  DEMO_STUDENT_EMAIL: z.string().default('aanya.demo@wayfare.app'),
  DEMO_STUDENT_PASSWORD: z.string().default(''),
  DEMO_ADMIN_EMAIL: z.string().default('housing.demo@wayfare.app'),
  DEMO_ADMIN_PASSWORD: z.string().default(''),
  RATES_URL: z.string().default('https://open.er-api.com/v6/latest/AED'),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

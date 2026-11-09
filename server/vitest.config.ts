import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27027/wayfare_test',
      JWT_SECRET: 'test-secret-that-is-long-enough-for-hs256-signing',
      DEMO_MODE: 'true',
      DEMO_STUDENT_EMAIL: 'aanya.test@wayfare.app',
      DEMO_STUDENT_PASSWORD: 'student-pass-1',
      DEMO_ADMIN_EMAIL: 'admin.test@wayfare.app',
      DEMO_ADMIN_PASSWORD: 'admin-pass-1',
      HW_EMAIL_DOMAIN: 'hw.ac.uk',
    },
  },
});

import { createApp } from './app';
import { connectDb, syncIndexes } from './db';
import { env } from './env';

async function main() {
  await connectDb(env.MONGODB_URI);
  await syncIndexes();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Wayfare API on http://localhost:${env.PORT} (demo mode ${env.DEMO_MODE ? 'on' : 'off'})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

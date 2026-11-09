import mongoose from 'mongoose';

export async function connectDb(uri: string) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  return mongoose.connection;
}

/** Brings indexes in line with the schemas, dropping ones that were removed or changed. */
export async function syncIndexes() {
  const { Budget } = await import('./models');
  await Budget.syncIndexes();
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

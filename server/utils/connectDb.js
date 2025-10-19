import mongoose from 'mongoose';

export default async function connectDb(uri) {
  if (!uri) {
    throw new Error('Missing MongoDB connection string (MONGO_URI).');
  }

  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    dbName: process.env.MONGO_DB_NAME || undefined,
  });
  return mongoose.connection;
}

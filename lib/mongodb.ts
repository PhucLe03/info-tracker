import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  // We don't throw an error immediately here because during local development
  // or static build, the environment variable might not be set.
  // We will handle the check inside the connection code dynamically.
}

const uri = process.env.MONGODB_URI || '';
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

if (uri) {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

export default clientPromise;

export async function getDb() {
  if (!uri || !clientPromise) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }
  const client = await clientPromise;
  return client.db('daily-intel');
}

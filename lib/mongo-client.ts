// This approach is taken from https://github.com/vercel/next.js/tree/canary/examples/with-mongodb
import { MongoClient, ServerApiVersion } from 'mongodb';

console.log('88888888888aaaaaaaaaaaaaa', process.env.MONGODB_URI_AUTH);

if (!process.env.MONGODB_URI_AUTH) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI_AUTH"');
}

const uri = process.env.MONGODB_URI_AUTH;
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let mongoClient: MongoClient;
let mongoClientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    mongoClient = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = mongoClient.connect();
  }
  mongoClientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  mongoClient = new MongoClient(uri, options);
  mongoClientPromise = mongoClient.connect();
}

// Export a module-scoped MongoClient. By doing this in a
// separate module, the mongoClient can be shared across functions.
export default mongoClientPromise;

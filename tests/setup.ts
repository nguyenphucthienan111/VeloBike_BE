import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = uri; // Use MONGO_URI instead of MONGO_TEST_URI
  process.env.JWT_SECRET = 'test_jwt_secret';
  process.env.PAYOS_API_KEY = 'test_payos_key';
  process.env.PAYOS_CLIENT_ID = 'test_client_id';
  process.env.PAYOS_CHECKSUM_KEY = 'test_checksum_key';
  
  // Connect to the in-memory database
  await mongoose.connect(uri);
});

afterAll(async () => {
  // Close database connection and stop MongoDB instance
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongod) {
    await mongod.stop();
  }
});

beforeEach(async () => {
  // Clear all collections before each test
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});
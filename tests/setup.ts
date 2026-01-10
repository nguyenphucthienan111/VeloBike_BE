import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.MONGO_TEST_URI = uri;
  process.env.JWT_SECRET = 'test_jwt_secret';
  process.env.PAYOS_API_KEY = 'test_payos_key';
  process.env.PAYOS_CLIENT_ID = 'test_client_id';
  process.env.PAYOS_CHECKSUM_KEY = 'test_checksum_key';
});

afterAll(async () => {
  // Close database connection and stop MongoDB instance
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
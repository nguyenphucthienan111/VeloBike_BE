// Script to delete all orders (for testing only)
const mongoose = require('mongoose');
require('dotenv').config();

async function resetOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.db.collection('orders').deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} orders`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetOrders();

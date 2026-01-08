import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { authRoutes } from './routes/authRoutes';
import { listingRoutes } from './routes/listingRoutes';
import { orderRoutes } from './routes/orderRoutes';

// Fix for missing Node.js type definitions in this environment
declare var require: any;
declare var module: any;
declare var process: any;

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json() as any);

// Database Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/velobike';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/orders', orderRoutes);

// Base Route
app.get('/', (req, res) => {
  res.send('VeloBike Backend API is Running 🚀');
});

// Error Handling Middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server Error', error: err.message });
});

// Only start if not imported (for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
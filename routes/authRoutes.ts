import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

export const authRoutes = Router();

authRoutes.post('/register', AuthController.register as any);
authRoutes.post('/login', AuthController.login as any);
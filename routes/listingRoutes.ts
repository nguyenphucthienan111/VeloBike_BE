import { Router } from 'express';
import { ListingController } from '../controllers/ListingController';

export const listingRoutes = Router();

listingRoutes.get('/', ListingController.getAll as any);
listingRoutes.get('/:id', ListingController.getById as any);
listingRoutes.post('/', ListingController.create as any);
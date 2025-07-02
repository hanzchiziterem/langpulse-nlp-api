import { Router } from "express";
import nlpRoutes from './nlp.route';
import authRoutes from './auth.route';

const router = Router();

router.use('/nlp', nlpRoutes);
router.use('/auth', authRoutes);
export default router;
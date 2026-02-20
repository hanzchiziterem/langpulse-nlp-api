import { Router } from "express";
import nlpRoutes from './nlp.route';
import authRoutes from './auth.route';
import userRoutes from './user.route';
const router = Router();

router.use('/nlp', nlpRoutes);
router.use('/auth', authRoutes);
router.use('/user/account', userRoutes);
export default router;
import { Router } from "express";
import nlpRoutes from './nlp.route';
const router = Router();

router.use('/nlp', nlpRoutes);

export default router;
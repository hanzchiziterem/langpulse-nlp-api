import { Router } from "express";
import { analyzeTextHandler } from "../../controllers/nlp.controller";
import { requireAuth } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/analyze", requireAuth, analyzeTextHandler);

export default router;

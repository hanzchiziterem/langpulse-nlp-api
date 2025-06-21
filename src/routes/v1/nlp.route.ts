import { Router } from "express";
import { analyzeTextHandler, getAnalysisHistory } from "../../controllers/nlp.controller";
import { requireAuth } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/analyze", requireAuth, analyzeTextHandler);
router.get("/history", requireAuth, getAnalysisHistory);
export default router;

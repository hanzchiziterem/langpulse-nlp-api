import { Router } from "express";
import { analyzeTextHandler, getAnalysisHistory, downloadAnalysisHistory } from "../../controllers/nlp.controller";
import { requireAuth } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/analyze", requireAuth, analyzeTextHandler);
router.get("/history", requireAuth, getAnalysisHistory);
router.get('/export', requireAuth, downloadAnalysisHistory);

export default router;

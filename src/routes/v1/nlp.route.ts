import { Router } from "express";
import { analyzeTextHandler } from "../../controllers/nlp.controller";

const router = Router();

router.post("/analyze", analyzeTextHandler);

export default router;

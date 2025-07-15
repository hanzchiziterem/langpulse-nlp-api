import express from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { getUserProfile, getAnalysisHistory,deleteAnalysis } from "../../controllers/user.controller";
const router = express.Router();

router.use(requireAuth);

router.get("/profile", getUserProfile);
router.patch("/profile", updateProfile);

router.post("/change-password", changePassword);

router.get("/settings", getSettings);
router.patch("/settings", updateSettings);

router.get("/history", getAnalysisHistory);       
router.delete("/history/:id", deleteAnalysis);    
router.delete("/history", deleteAllAnalysis);   

export default router;
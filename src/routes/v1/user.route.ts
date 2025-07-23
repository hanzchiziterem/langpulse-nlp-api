import express from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { upload } from "../../middlewares/upload.middleware";
import {
  getUserProfile,
  uploadProfilePicture,
  updateProfile,
  deleteProfileImage,
  deleteUserAccount,
} from "../../controllers/user.controller";
import { passwordAttemptLimiter } from "../../lib/rateLimit";

const router = express.Router();

router.use(requireAuth);
//User Account and Profile.
router.get("/profile", getUserProfile);
router.post(
  "/profile/image",
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message.includes("Unexpected field")
            ? 'Field name must be "profileImage"'
            : err.message,
        });
      }
      next();
    });
  },
  uploadProfilePicture
);
router.delete("/profile/image", deleteProfileImage);
router.patch("/profile/edit", updateProfile);
//Implemnt Rate Limiter Later.
router.delete("/", deleteUserAccount);

//Settings
// router.post("/change-password", changePassword);
// router.get("/settings", getSettings);
// router.patch("/settings", updateSettings);

// router.get("/history", getAnalysisHistory);
// router.delete("/history/:id", deleteAnalysis);
// router.delete("/history", deleteAllAnalysis);

export default router;

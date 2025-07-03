import { Router } from "express";
import {
  signupHandler,
  signinHandler,
  // signoutHandler,
  verifyEmail,
  resendVerification,
  // forgotPassword,
  // resetPassword,
  // changePassword,
} from "../../controllers/auth.controller";
import { requireAuth } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/signup", signupHandler);
router.post("/signin", signinHandler);
// router.post("/signout", signoutHandler);

router.get('/verify', verifyEmail);
router.post('/resend-verification', resendVerification);
// router.post('/forgot-password', forgotPassword);
// router.post('/reset-password', resetPassword);
// router.post('/change-password', requireAuth, changePassword);

export default router;

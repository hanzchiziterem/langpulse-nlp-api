import { Router } from "express";
import {
  signupHandler,
  signinHandler,
  signoutHandler,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshTokenHandler,
  resendForgotPassword
} from "../../controllers/auth.controller";
import { requireAuth } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/signup", signupHandler);
router.post("/signin", signinHandler);
router.post("/refresh", refreshTokenHandler);
router.post("/signout", signoutHandler);
router.get('/verify', verifyEmail);
router.post('/resend-email-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/resend-forgot-password', resendForgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', requireAuth, changePassword);

export default router;

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
  resendForgotPassword,
} from "../../controllers/auth.controller";

import { requireAuth } from "../../middlewares/auth.middleware";

import {
  authLimiter,
  strictLimiter,
  sensitiveActionLimiter,
} from "../../middlewares/rateLimiter.middleware";

const router = Router();

router.post("/signup",                                    authLimiter,                    signupHandler); 
router.post("/signin",                                    authLimiter,                    signinHandler);
router.get("/verify-email",                                                                 verifyEmail);
router.post("/resend-verification",                       authLimiter,               resendVerification);
router.post("/refresh-token",                             sensitiveActionLimiter,   refreshTokenHandler);
router.post("/forgot-password",                           strictLimiter,                 forgotPassword);
router.post("/resend-forgot-password",                    authLimiter,             resendForgotPassword);
router.post("/reset-password",                            strictLimiter,                  resetPassword);

router.post("/signout",                 requireAuth,                                     signoutHandler);
// router.post('/signout-all',             requireAuth,                                  signoutAllHandler);
router.post("/change-password",         requireAuth,      strictLimiter,                 changePassword);

export default router;

import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../client/prisma";
import { signinSchema, signupSchema } from "../schemas/auth.schema";
import {
  signinUser,
  signupUser,
  signoutUser,
  resetPassowrd,
} from "../services/auth.service";
import { refreshAccessToken } from "../services/auth.service";
import { transporter } from "../libs/mailer";
import { generateOTP, verifyOTP } from "../utils/otp";
import { logSecurityEvent } from "../libs/logging";
import { getUserIdFromToken } from "../utils/auth";
import { getFriendlyError } from "../utils/getFriendlyError";
import {
  calculatePasswordStrength,
  getPasswordStrengthLevel,
} from "../utils/password";
import { SECURITY_EVENT } from "../types/security";
import { SEVERITY } from "../types/security";
import {
  AuthEventMetadata,
  TokenEventMetadata,
  EmailVerificationEventMetadata,
  UserEventMetadata,
  PasswordEventMetadata,
} from "../types/security";

export const signupHandler = async (req: Request, res: Response) => {
  const valid = signupSchema.safeParse(req.body);
  if (!valid.success) {
    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType: SECURITY_EVENT.AUTH.SIGNUP_FAILED,
      severity: SEVERITY.HIGH,
      ...req.securityContext,
      metadata: {
        failure: {
          reason: "validation_error",
          validationErrors: valid.error.errors,
        },
        attemptedEmail: req.body.email,
      } as AuthEventMetadata,
    });
    res.status(400).json(valid.error.format());
    return;
  }

  try {
    const result = await signupUser(
      valid.data.name,
      valid.data.email,
      valid.data.password
    );

    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType: SECURITY_EVENT.AUTH.SIGNUP_SUCCESS,
      severity: SEVERITY.INFO,
      ...req.securityContext,
      metadata: {
        authMethod: "password",
      } as AuthEventMetadata,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    const err = error as Error;
    await logSecurityEvent({
      userId: null,
      eventType: SECURITY_EVENT.AUTH.SIGNUP_FAILED,
      severity: SEVERITY.HIGH,
      ...req.securityContext,
      metadata: {
        failure: {
          reason: "system_error",
          errorMessage: err.message,
        },
        attemptedEmail: valid.data.email,
      } as AuthEventMetadata,
    });
    res.status(400).json({ success: false, message: err.message });
  }
};

export const signinHandler = async (req: Request, res: Response) => {
  const valid = signinSchema.safeParse(req.body);
  if (!valid.success) {
    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType: SECURITY_EVENT.AUTH.SIGNIN_FAILED,
      severity: SEVERITY.HIGH,
      ...req.securityContext,
      metadata: {
        failure: {
          reason: "validation_error",
          validationErrors: valid.error.errors,
        },
        attemptedEmail: req.body.email,
      } as AuthEventMetadata,
    });
    res.status(400).json(valid.error.format());
    return;
  }

  try {
    const { accessToken, refreshToken } = await signinUser(
      valid.data.email,
      valid.data.password
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType: SECURITY_EVENT.AUTH.SIGNIN_SUCCESS,
      severity: SEVERITY.INFO,
      ...req.securityContext,
      metadata: {
        authMethod: "password",
        session: {
          durationHours: 24 * 7, // 1 week
        },
      } as AuthEventMetadata,
    });

    res.status(200).json({
      success: true,
      message: "User has signed in successfully.",
      accessToken,
    });
  } catch (error) {
    const err = error as Error;
    await logSecurityEvent({
      userId: null,
      eventType: SECURITY_EVENT.AUTH.SIGNIN_FAILED,
      severity: SEVERITY.HIGH,
      ...req.securityContext,
      metadata: {
        failure: {
          reason: err.message.includes("password")
            ? "invalid_credentials"
            : "system_error",
          errorMessage: err.message,
        },
        attemptedEmail: valid.data.email,
      } as AuthEventMetadata,
    });
    res.status(401).json({ success: false, message: err.message });
  }
};

export const refreshTokenHandler = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    await logSecurityEvent({
      userId: null,
      eventType: SECURITY_EVENT.TOKEN.MISSING_REFRESH_TOKEN,
      severity: SEVERITY.HIGH,
      ...req.securityContext,
      metadata: {
        failure: {
          reason: "missing",
        },
      } as TokenEventMetadata,
    });

    res.status(401).json({
      success: false,
      message: "Refresh token required.",
    });
  }

  try {
    const { newAccessToken, newRefreshToken } = await refreshAccessToken(token);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/auth/refresh-token",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logSecurityEvent({
      userId: getUserIdFromToken(token),
      eventType: SECURITY_EVENT.TOKEN.REFRESH_SUCCESS,
      severity: SEVERITY.INFO,
      metadata: {
        token: {
          type: "refresh",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      } as TokenEventMetadata,
    });

    res.status(200).json({
      success: true,
      message: "Refresh token expires in 1hr.",
      accessToken: newAccessToken,
      expiresIn: 3600,
    });
  } catch (err) {
    const error = err as Error;

    await logSecurityEvent({
      userId: getUserIdFromToken(token),
      eventType: SECURITY_EVENT.TOKEN.REFRESH_FAILED,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: error.message.includes("Invalid") ? "invalid" : "expired",
          errorMessage: error.message,
        },
      } as TokenEventMetadata,
    });

    res.clearCookie("refreshToken");
    const statusCode = error.message.includes("Invalid") ? 403 : 401;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Authentication failed.",
    });
  }
};

export const signoutHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const refreshToken: string | undefined = req.cookies?.refreshToken;

  if (!refreshToken) {
    await logSecurityEvent({
      userId: null,
      eventType: SECURITY_EVENT.AUTH.MISSING_SIGNOUT_TOKEN,
      severity: SEVERITY.HIGH,
      ...req.securityContext,
      metadata: {
        failure: {
          reason: "missing_token",
        },
      } as AuthEventMetadata,
    });
    res.status(400).json({ success: false, message: "No token provided." });
    return;
  }

  try {
    const userId = await signoutUser(refreshToken);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    await logSecurityEvent({
      userId,
      eventType: SECURITY_EVENT.AUTH.SIGNOUT_SUCCESS,
      ...req.securityContext,
      severity: SEVERITY.INFO,
      metadata: {
        sessionEndMethod: "user_initiated",
      } as AuthEventMetadata,
    });

    res
      .status(200)
      .json({ success: true, message: "Signed out successfully." });
    return;
  } catch (error) {
    const err = error as Error;

    await logSecurityEvent({
      userId: null,
      eventType: SECURITY_EVENT.AUTH.SIGNOUT_FAILED,
      severity: SEVERITY.HIGH,
      ...req.securityContext,
      metadata: {
        failure: {
          reason:
            err.message === "USER_NOT_FOUND"
              ? "user_not_found"
              : "system_error",
          errorMessage: err.message,
        },
      } as AuthEventMetadata,
    });

    const statusCode = err.message === "USER_NOT_FOUND" ? 404 : 401;
    res.status(statusCode).json({
      success: false,
      message: getFriendlyError(err.message),
    });
  }
};
export const verifyEmail = async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    await logSecurityEvent({
      userId: null,
      eventType: SECURITY_EVENT.EMAIL_VERIFICATION.MISSING_CODE,
      severity: SEVERITY.LOW,
      metadata: {
        failure: {
          reason: "missing_verification_code",
        },
      } as EmailVerificationEventMetadata,
    });
    res.status(400).json({ success: false, message: "Code is required." });
    return;
  }

  const cleanCode = Array.isArray(code) ? code[0] : (code as string);
  const user = await prisma.user.findFirst({
    where: { verificationCode: cleanCode },
  });

  if (!user) {
    await logSecurityEvent({
      userId: null,
      eventType: SECURITY_EVENT.EMAIL_VERIFICATION.INVALID_CODE,
      severity: SEVERITY.MEDIUM,
      metadata: {
        failure: {
          reason: "invalid_verification_code",
        },
        codeAttempted: cleanCode,
      } as EmailVerificationEventMetadata,
    });
    res
      .status(400)
      .json({ success: false, message: "Invalid verification code." });
    return;
  }

  const isValid = verifyOTP(user.verificationCodeValidation);
  if (!isValid) {
    await logSecurityEvent({
      userId: user.id,
      eventType: SECURITY_EVENT.EMAIL_VERIFICATION.EXPIRED_CODE,
      severity: SEVERITY.MEDIUM,
      metadata: {
        failure: {
          reason: "expired_verification_code",
          codeExpiredAt: user.verificationCodeValidation,
        },
      } as EmailVerificationEventMetadata,
    });
    res
      .status(400)
      .json({ success: false, message: "Verification code expired." });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verified: true,
      verificationCode: null,
      verificationCodeValidation: null,
    },
  });

  await logSecurityEvent({
    userId: user.id,
    eventType: SECURITY_EVENT.EMAIL_VERIFICATION.SUCCESS,
    severity: SEVERITY.INFO,
    metadata: {
      verificationMethod: "otp",
      emailVerified: user.email,
    } as EmailVerificationEventMetadata,
  });

  res.status(200).json({ success: true, message: "Email has been verified!" });
};

export const resendVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType: SECURITY_EVENT.EMAIL_VERIFICATION.REQUESTED,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "missing_email",
        },
      } as EmailVerificationEventMetadata,
    });
    res.status(400).json({ success: false, message: "Email is required." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType: SECURITY_EVENT.USER.NOT_FOUND,
      severity: SEVERITY.INFO,
      metadata: {
        attemptedEmail: email,
      } as UserEventMetadata,
    });
    res.status(400).json({ success: false, message: "User not found." });
    return;
  }

  if (user.verified) {
    await logSecurityEvent({
      userId: user.id,
      eventType: SECURITY_EVENT.EMAIL_VERIFICATION.ALREADY_VERIFIED,
      severity: SEVERITY.MEDIUM,
      metadata: {
        email: user.email,
      } as EmailVerificationEventMetadata,
    });
    res.status(400).json({ success: false, message: "User already verified." });
    return;
  }

  const newCode = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationCode: newCode,
      verificationCodeValidation: expires,
    },
  });

  await transporter.sendMail({
    to: email,
    subject: "New verification code",
    html: `<p>Your new verification code is: <b>${newCode}</b>. It expires in 10 minutes.</p>`,
  });

  await logSecurityEvent({
    userId: user.id,
    eventType: SECURITY_EVENT.EMAIL_VERIFICATION.CODE_RESENT,
    severity: SEVERITY.INFO,
    metadata: {
      email: user.email,
      code: {
        expiresAt: expires,
      },
      verificationMethod: "otp",
    } as EmailVerificationEventMetadata,
  });

  res.status(200).json({ success: true, message: "A new code has been sent." });
};

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType: SECURITY_EVENT.PASSWORD.RESET_REQUESTED,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "missing_email",
        },
      } as PasswordEventMetadata,
    });
    res.status(400).json({ success: false, message: "Email is required." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType: SECURITY_EVENT.USER.NOT_FOUND,
      severity: SEVERITY.INFO,
      metadata: {
        attemptedEmail: email,
      } as UserEventMetadata,
    });
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  const code = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      forgotPasswordCode: code,
      forgotPasswordCodeValidation: expires,
    },
  });

  await transporter.sendMail({
    to: email,
    subject: "Reset your password",
    html: `<p>Here's your reset code: <b>${code}</b></p>`,
  });

  await logSecurityEvent({
    userId: user.id,
    eventType: SECURITY_EVENT.PASSWORD.RESET_CODE_SENT,
    severity: SEVERITY.INFO,
    metadata: {
      email: user.email,
      code: {
        expiresAt: expires,
      },
      resetMethod: "email",
    } as PasswordEventMetadata,
  });

  res.json({ success: true, message: "Reset code sent to your email." });
};

export const resendForgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType: SECURITY_EVENT.PASSWORD.RESET_REQUESTED,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "missing_email",
        },
      } as PasswordEventMetadata,
    });
    res.status(400).json({ success: false, message: "Email is required." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType: SECURITY_EVENT.USER.NOT_FOUND,
      severity: SEVERITY.INFO,
      metadata: {
        attemptedEmail: email,
      } as UserEventMetadata,
    });
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  const newCode = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      forgotPasswordCode: newCode,
      forgotPasswordCodeValidation: expires,
    },
  });

  await transporter.sendMail({
    to: email,
    subject: "Your new password reset code",
    html: `<p>Your new reset code is: <b>${newCode}</b>. It expires in 10 minutes.</p>`,
  });

  await logSecurityEvent({
    userId: user.id,
    eventType: SECURITY_EVENT.PASSWORD.RESET_CODE_RESENT,
    severity: SEVERITY.INFO,
    metadata: {
      email: user.email,
      code: {
        expiresAt: expires,
      },
      isResend: true,
    } as PasswordEventMetadata,
  });

  res.json({
    success: true,
    message: "New reset code sent to your email.",
  });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { code, newPassword } = req.body;

  if (!code || !newPassword) {
    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType: SECURITY_EVENT.PASSWORD.RESET_FAILED,
      severity: SEVERITY.MEDIUM,
      metadata: {
        failure: {
          reason: "missing_code_or_password",
        },
      } as PasswordEventMetadata,
    });
    res
      .status(400)
      .json({ success: false, message: "Code and new password are required." });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { forgotPasswordCode: code },
  });

  if (!user) {
    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType: SECURITY_EVENT.PASSWORD.RESET_FAILED,
      severity: SEVERITY.MEDIUM,
      metadata: {
        failure: {
          reason: "invalid_reset_code",
        },
        codeAttempted: code,
      } as PasswordEventMetadata,
    });
    res.status(400).json({ success: false, message: "Invalid reset code." });
    return;
  }

  if (
    user.forgotPasswordCodeValidation &&
    user.forgotPasswordCodeValidation < new Date()
  ) {
    await logSecurityEvent({
      userId: user.id,
      eventType: SECURITY_EVENT.PASSWORD.RESET_FAILED,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "reset_code_expired",
          codeExpiredAt: user.forgotPasswordCodeValidation,
        },
      } as PasswordEventMetadata,
    });
    res.status(400).json({ success: false, message: "Reset code expired." });
    return;
  }

  await resetPassowrd(user.id, newPassword);

  await logSecurityEvent({
    userId: user.id,
    eventType: SECURITY_EVENT.PASSWORD.RESET_SUCCESS,
    severity: SEVERITY.INFO,
    metadata: {
      operationType: "reset",
      strength: {
        score: calculatePasswordStrength(newPassword),
        isAcceptable: true,
      },
    } as PasswordEventMetadata,
  });

  res.json({
    success: true,
    message: "Password has been reset successfully.",
  });
};

export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId: string = (req as any).user.id;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    await logSecurityEvent({
      userId,
      eventType: SECURITY_EVENT.PASSWORD.CHANGE_FAILED,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "missing_credentials",
        },
      } as PasswordEventMetadata,
    });
    res.status(400).json({
      success: false,
      message: "Both old and new passwords are required.",
    });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    await logSecurityEvent({
      userId,
      eventType: SECURITY_EVENT.USER.NOT_FOUND,
      severity: SEVERITY.INFO,
      metadata: {
        actionTaken: "request_rejected",
      } as UserEventMetadata,
    });
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    await logSecurityEvent({
      userId,
      eventType: SECURITY_EVENT.PASSWORD.CHANGE_FAILED,
      severity: SEVERITY.MEDIUM,
      metadata: {
        failure: {
          reason: "incorrect_old_password",
        },
      } as PasswordEventMetadata,
    });
    res
      .status(400)
      .json({ success: false, message: "Old password is incorrect." });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  const strengthScore = calculatePasswordStrength(newPassword);
  const strengthLevel = getPasswordStrengthLevel(strengthScore);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  await logSecurityEvent({
    userId,
    eventType: SECURITY_EVENT.PASSWORD.CHANGE_SUCCESS,
    severity: SEVERITY.INFO,
    metadata: {
      operationType: "change",
      strength: {
        score: strengthScore,
        level: strengthLevel,
        isAcceptable: strengthScore > 70,
      },
    } as PasswordEventMetadata,
  });

  res.json({ success: true, message: "Password changed successfully." });
};

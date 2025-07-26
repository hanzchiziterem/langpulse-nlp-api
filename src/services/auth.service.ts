import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../client/prisma";
import  transporter  from "../libs/mailer";
import { generateOTP } from "../utils/otp";
import { logSecurityEvent } from "../libs/logging/securityEvents";
import {
  AuthEventMetadata,
  PasswordEventMetadata,
  SECURITY_EVENT,
  SEVERITY,
  TokenEventMetadata,
  UserEventMetadata,
} from "../types/security";
import {
  calculatePasswordStrength,
  getPasswordStrengthLevel,
} from "../utils/password";
import { hashPassword } from "../libs/auth/password";
import { JwtPayload } from "../types/auth/token.interface";

const JWT_TOKEN_SECRET = process.env.JWT_TOKEN_SECRET;
const JWT_REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_TOKEN_SECRET;

if (!JWT_TOKEN_SECRET) {
  throw new Error("JWT_TOKEN_SECRET is not configured");
}
if (!JWT_REFRESH_TOKEN_SECRET) {
  throw new Error("JWT_REFRESH_TOKEN_SECRET is not configured");
}

export const signupUser = async (
  name: string,
  email: string,
  password: string
) => {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await logSecurityEvent({
      userId: existing.id,
      eventType: SECURITY_EVENT.AUTH.SIGNUP_FAILED,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "user_exists",
        },
        attemptedEmail: email,
      } as AuthEventMetadata,
    });
    throw new Error("User already exists.");
  }

  const hashedPassowrd = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: { name, email, password: hashedPassowrd },
  });

  const code = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: newUser.id },
    data: {
      verificationCode: code,
      verificationCodeValidation: expires,
    },
  });

  await transporter.sendMail({
    to: email,
    subject: "Verify your Email.",
    html: `<p>Your verification code is: <b>${code}</b></p>`,
  });

  return {
    success: true,
    message: "User created, Check your email for a verification code.",
  };
};

export const signinUser = async (
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await logSecurityEvent({
      userId: null,
      eventType: SECURITY_EVENT.AUTH.SIGNIN_FAILED,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "user_not_found",
        },
        attemptedEmail: email,
      } as AuthEventMetadata,
    });
    throw new Error("Invalid credentials.");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    await logSecurityEvent({
      userId: user.id,
      eventType: SECURITY_EVENT.AUTH.SIGNIN_FAILED,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "invalid_password",
        },
      } as AuthEventMetadata,
    });
    throw new Error("Invalid credentials.");
  }

  const accessToken = jwt.sign(
    { id: user.id, email: user.email, version: user.tokenVersion },
    JWT_TOKEN_SECRET,
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, version: user.tokenVersion },
    JWT_REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  const hashedRefresh = await bcrypt.hash(refreshToken, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedRefresh, isActive: true },
  });

  await logSecurityEvent({
    userId: user.id,
    eventType: SECURITY_EVENT.AUTH.SIGNIN_SUCCESS,
    severity: SEVERITY.INFO,
    metadata: {
      authMethod: "password",
      token: {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    } as AuthEventMetadata,
  });

  return { accessToken, refreshToken };
};

export const refreshAccessToken = async (
  incomingToken: string
): Promise<{ newAccessToken: string; newRefreshToken: string }> => {
  let payload: JwtPayload;
  try {
    payload = jwt.verify(
      incomingToken,
      process.env.JWT_REFRESH_TOKEN_SECRET!
    ) as JwtPayload;
  } catch (error) {
    await logSecurityEvent({
      userId: null,
      eventType: SECURITY_EVENT.TOKEN.INVALID_REFRESH_TOKEN,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "invalid",
        },
      } as TokenEventMetadata,
    });
    throw new Error("Invalid refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, refreshToken: true, tokenVersion: true },
  });

  if (!user || typeof user.tokenVersion !== "number") {
    await logSecurityEvent({
      userId: payload.id,
      eventType: SECURITY_EVENT.USER.NOT_FOUND,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "user_not_found",
        },
      } as UserEventMetadata,
    });
    throw new Error("Invalid user.");
  }

  if (user.tokenVersion !== payload.version) {
    await logSecurityEvent({
      userId: user.id,
      eventType: SECURITY_EVENT.TOKEN.REVOKED_REFRESH_TOKEN,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "version_mismatch",
          dbVersion: user.tokenVersion,
          tokenVersion: payload.version,
        },
      } as TokenEventMetadata,
    });
    throw new Error("Refresh token revoked, please signin again.");
  }

  const tokenMatches = await bcrypt.compare(incomingToken, user.refreshToken!);
  if (!tokenMatches) {
    await logSecurityEvent({
      userId: user.id,
      eventType: SECURITY_EVENT.TOKEN.INVALID_REFRESH_TOKEN,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "hash_mismatch",
        },
      } as TokenEventMetadata,
    });
    throw new Error("Invalid refresh token: Hash mismatch");
  }

  const newAccessToken = jwt.sign(
    { id: user.id, email: user.email, version: user.tokenVersion },
    process.env.JWT_TOKEN_SECRET!,
    { expiresIn: "1h" }
  );

  const newRefreshToken = jwt.sign(
    { id: user.id, email: user.email, version: user.tokenVersion },
    process.env.JWT_REFRESH_TOKEN_SECRET!,
    { expiresIn: "7d" }
  );

  const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedRefreshToken },
  });
  await logSecurityEvent({
    userId: user.id,
    eventType: SECURITY_EVENT.TOKEN.REFRESH_SUCCESS,
    severity: SEVERITY.INFO,
    metadata: {
      token: {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    } as TokenEventMetadata,
  });
  return {
    newAccessToken,
    newRefreshToken,
  };
};

export const signoutUser = async (refreshToken: string): Promise<string> => {
  let payload: JwtPayload;
  try {
    payload = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET!
    ) as JwtPayload;
  } catch (err) {
    await logSecurityEvent({
      userId: null,
      eventType: SECURITY_EVENT.TOKEN.INVALID_REFRESH_TOKEN,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "invalid",
        },
      } as TokenEventMetadata,
    });
    throw new Error("Invalid token.");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, refreshToken: true, tokenVersion: true },
  });

  if (payload.version !== user?.tokenVersion) {
    await logSecurityEvent({
      userId: payload.id,
      eventType: SECURITY_EVENT.TOKEN.REVOKED_REFRESH_TOKEN,
      severity: SEVERITY.MEDIUM,
      metadata: {
        failure: {
          reason: "version_mismatch",
          dbVersion: user?.tokenVersion,
          tokenVersion: payload.version,
        },
      } as TokenEventMetadata,
    });
    throw new Error("TOKEN_REVOKED");
  }

  if (!user) {
    await logSecurityEvent({
      userId: payload.id,
      eventType: SECURITY_EVENT.USER.NOT_FOUND,
      severity: SEVERITY.MEDIUM,
      metadata: {
        failure: {
          reason: "user_not_found",
        },
      } as UserEventMetadata,
    });
    throw new Error("USER_NOT_FOUND");
  }

  if (!user.refreshToken) {
    await logSecurityEvent({
      userId: user.id,
      eventType: SECURITY_EVENT.USER.ALREADY_SIGNED_OUT,
      severity: SEVERITY.LOW,
      metadata: {
        action: "signout_attempt",
      } as UserEventMetadata,
    });
    throw new Error("ALREADY_SIGNED_OUT");
  }

  const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!isValid) {
    await logSecurityEvent({
      userId: user.id,
      eventType: SECURITY_EVENT.TOKEN.INVALID_REFRESH_TOKEN,
      severity: SEVERITY.HIGH,
      metadata: {
        failure: {
          reason: "hash_mismatch",
        },
      } as TokenEventMetadata,
    });
    throw new Error("TOKEN_MISMATCH.");
  }

  await prisma.user.update({
    where: { id: payload.id },
    data: {
      refreshToken: null,
      tokenVersion: { increment: 1 },
      isActive: false,
      lastSignoutAt: new Date(),
    },
  });

  await logSecurityEvent({
    userId: user.id,
    eventType: SECURITY_EVENT.AUTH.SIGNOUT_SUCCESS,
    severity: SEVERITY.INFO,
    metadata: {
      sessionEndMethod: "user_initiated",
    } as AuthEventMetadata,
  });

  return payload.id;
};

export const resetPassowrd = async (userId: string, newPassword: string) => {
  const newHashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: newHashedPassword,
      isActive: false,
      tokenVersion: { increment: 1 },
      passwordChangedAt: new Date(),
      refreshToken: null,
    },
  });

  const strengthScore = calculatePasswordStrength(newPassword);
  const strengthLevel = getPasswordStrengthLevel(strengthScore);
  await logSecurityEvent({
    userId,
    eventType: SECURITY_EVENT.PASSWORD.RESET_SUCCESS,
    severity: SEVERITY.INFO,
    metadata: {
      operationType: "reset",
      strength: {
        score: strengthScore,
        level: strengthLevel,
        isAcceptable: strengthScore > 70,
      },
    } as PasswordEventMetadata,
  });
};

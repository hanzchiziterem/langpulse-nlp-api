import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logSecurityEvent } from "../libs/logging";
import prisma from "../client/prisma";
import { JwtPayload } from "../types/auth";
import { SECURITY_EVENT, SEVERITY } from "../types/security";
import { AuthEventMetadata, TokenEventMetadata } from "../types/security";
import { ExpressUser } from "../types/express/user";

const JWT_TOKEN_SECRET = process.env.JWT_TOKEN_SECRET;

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token =
    req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

  if (!token) {
    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType: SECURITY_EVENT.TOKEN.MISSING_ACCESS_TOKEN,
      severity: SEVERITY.HIGH,
      ...req.securityContext,
      metadata: {
        path: req.path,
        method: req.method,
        failure: {
          reason: "missing_token",
        },
      } as AuthEventMetadata,
    });

    res
      .status(401)
      .json({ success: false, message: "Authentication required." });
    return;
  }

  try {
    if (!JWT_TOKEN_SECRET) {
      await logSecurityEvent({
        userId: req.user?.id ?? null,
        eventType: SECURITY_EVENT.SYSTEM.CONFIG_ERROR,
        severity: SEVERITY.CRITICAL,
        ...req.securityContext,
        metadata: {
          failure: {
            reason: "missing_config",
            configKey: "JWT_TOKEN_SECRET",
          },
        } as AuthEventMetadata,
      });
      throw new Error("JWT_TOKEN_SECRET is not configured");
    }

    const decoded = jwt.verify(token, JWT_TOKEN_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        verified: true,
        tokenVersion: true,
        passwordChangedAt: true,
        isActive: true,
      },
    });

    if (!user) {
      await logSecurityEvent({
        userId: decoded.id,
        eventType: SECURITY_EVENT.USER.NOT_FOUND,
        severity: SEVERITY.HIGH,
        ...req.securityContext,
        metadata: {
          failure: {
            reason: "user_not_found",
            attemptedId: decoded.id,
          },
        } as AuthEventMetadata,
      });
      throw new Error("User account not found.");
    }

    if (!user.isActive) {
      await logSecurityEvent({
        userId: user.id,
        eventType: SECURITY_EVENT.AUTH.INACTIVE_ACCOUNT,
        severity: SEVERITY.MEDIUM,
        ...req.securityContext,
        metadata: {
          status: "account_inactive",
          lastActive: user.passwordChangedAt?.toISOString(),
        } as AuthEventMetadata,
      });
      res.status(401).json({
        success: false,
        message: "Your account is not active, please signin.",
      });
    }

    if (!user.verified) {
      await logSecurityEvent({
        userId: user.id,
        eventType: SECURITY_EVENT.AUTH.UNVERIFIED_ACCESS,
        severity: SEVERITY.MEDIUM,
        ...req.securityContext,
        metadata: {
          status: "unverified",
          verificationRequired: true,
        } as AuthEventMetadata,
      });
      res
        .status(403)
        .json({ success: false, message: "Please verify your email first." });
      return;
    }

    const tokenIssuedAt = decoded.iat! * 1000;
    const lastPasswordChange = user?.passwordChangedAt?.getTime();

    if (lastPasswordChange && tokenIssuedAt < lastPasswordChange) {
      await logSecurityEvent({
        userId: user.id,
        eventType: SECURITY_EVENT.TOKEN.STALE_AFTER_PASSWORD_CHANGE,
        severity: SEVERITY.MEDIUM,
        ...req.securityContext,
        metadata: {
          passwordChangedAt: user.passwordChangedAt!.toISOString(),
          tokenIssuedAt: new Date(tokenIssuedAt).toISOString(),
        } as TokenEventMetadata,
      });
      res.status(401).json({
        success: false,
        message: "Password changed, please signin again.",
      });
    }

    if (user.tokenVersion !== decoded.version) {
      console.log("DB version:", user.tokenVersion);
      console.log("Token version:", decoded.version);
      await logSecurityEvent({
        userId: user.id,
        eventType: SECURITY_EVENT.TOKEN.VERSION_MISMATCH,
        severity: SEVERITY.HIGH,
        ...req.securityContext,
        metadata: {
          dbVersion: user.tokenVersion,
          tokenVersion: decoded.version,
          possibleAttack: true,
        } as TokenEventMetadata,
      });
      res
        .status(401)
        .json({
          success: false,
          message: "Session expired, please signin again.",
        });
    }

    await logSecurityEvent({
      userId: user.id,
      eventType: SECURITY_EVENT.AUTH.SUCCESS,
      severity: SEVERITY.INFO,
      ...req.securityContext,
      metadata: {
        path: req.path,
        method: req.method,
      } as AuthEventMetadata,
    });

    req.user = {
      id: user.id,
      tokenIssuedAt: decoded.iat,
    } as ExpressUser;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      await logSecurityEvent({
        userId: req.user?.id || null,
        eventType: SECURITY_EVENT.TOKEN.EXPIRED,
        severity: SEVERITY.MEDIUM,
        ...req.securityContext,
        metadata: {
          expiredAt: error.expiredAt.toISOString(),
        } as TokenEventMetadata,
      });
      res
        .status(401)
        .json({ success: false, message: `Token expired: ${error}` });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      await logSecurityEvent({
        userId: null,
        eventType: SECURITY_EVENT.TOKEN.INVALID,
        severity: SEVERITY.MEDIUM,
        ...req.securityContext,
        metadata: {
          failure: {
            reason: "invalid",
            errorMessage: error.message,
          },
        } as TokenEventMetadata,
      });
      res.status(401).json({ success: false, message: "Invalid token." });
      return;
    }

    const err = error as Error;

    await logSecurityEvent({
      userId: req.user?.id || null,
      eventType: SECURITY_EVENT.AUTH.FAILURE,
      severity: SEVERITY.HIGH,
      ...req.securityContext,
      metadata: {
        failure: {
          reason: "authentication_failed",
          errorMessage: err.message,
          errorType: err.name,
          stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        },
      } as AuthEventMetadata,
    });

    res.status(401).json({ success: false, message: "Authentication failed." });
  }
};

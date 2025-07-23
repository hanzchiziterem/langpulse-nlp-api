import bcrypt from "bcrypt";
import prisma from "../../client/prisma";
import type { PasswordValidationResult, PasswordPolicy, CredentialValidationOptions } from "../../types/auth";
import { AuthEventMetadata, PasswordEventMetadata, SECURITY_EVENT, SEVERITY } from "../../types/security";
import { logSecurityEvent } from "../logging/securityEvents";
import { calculatePasswordStrength } from "../../utils/password/calculatePasswordStrength.ts";

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireSpecialChar: true,
  requireNumber: true,
  lockAfterAttempts: 5,
  lockDurationMinutes: 15
};

export const hashPassword = async (
  inputPassword: string,
  saltRounds: number = 12
): Promise<string> => {
  if (!inputPassword) {
    throw new Error("Password cannot be empty");
  }
  return bcrypt.hash(inputPassword, saltRounds);
};

export const verifyPassword = async (
  inputPassword: string,
  storedPassword: string
): Promise<boolean> => {
  if (!inputPassword || !storedPassword) {
    return false;
  }
  return bcrypt.compare(inputPassword, storedPassword);
};

export const validateCredentials = async (
  userId: string,
  password: string,
  options: CredentialValidationOptions = {
    checkLockStatus: true,
    recordAttempt: true
  }
): Promise<PasswordValidationResult> => {
  // Initial validation
  if (!password || password.length < DEFAULT_POLICY.minLength) {
    const strengthScore = calculatePasswordStrength(password);
    await logSecurityEvent({
      userId,
      eventType: SECURITY_EVENT.PASSWORD.SHORT_PASSWORD_ATTEMPT,
      severity: SEVERITY.CRITICAL,
      metadata: {
        failure: {
          reason: "short_password",
          strengthScore
        },
      } as PasswordEventMetadata
  })
    throw new Error(`Password must be at least ${DEFAULT_POLICY.minLength} characters`);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      password: true,
      failedAttempts: true,
      lastFailedAttempt: true,
    },
  });

  if (!user) {
    await logSecurityEvent({
      userId: userId ?? null,
      eventType: SECURITY_EVENT.AUTH.USER_NOT_FOUND_ATTEMPT,
      severity: SEVERITY.CRITICAL,
      metadata: {
        failure: {
            reason: "user_not_found"
        }
      }
    });
    throw new Error("Authentication failed.");
  }

  if (options.checkLockStatus && user.failedAttempts >= DEFAULT_POLICY.lockAfterAttempts) {
    const lockDuration = DEFAULT_POLICY.lockDurationMinutes * 60 * 1000;
    const lockTime = new Date(user.lastFailedAttempt!).getTime() + lockDuration;

    if (Date.now() < lockTime) {
      await logSecurityEvent({
        userId,
        severity: SEVERITY.CRITICAL,
        eventType: SECURITY_EVENT.AUTH.LOCKED_ACCOUNT_ATTEMPT,
      });
      return {
        isValid: false,
        isLocked: true,
        remainingAttempts: 0
      };
    }
  }

  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    if (options.recordAttempt) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          failedAttempts: { increment: 1 },
          lastFailedAttempt: new Date(),
        },
      });

      const remainingAttempts = Math.max(
        0, 
        DEFAULT_POLICY.lockAfterAttempts - (user.failedAttempts + 1)
      );

      await logSecurityEvent({
        userId,
        severity: SEVERITY.HIGH,
        eventType: SECURITY_EVENT.PASSWORD.FAILED_ATTEMPT,
        metadata: { remainingAttempts } as PasswordEventMetadata
      });
    }

    return {
      isValid: false,
      isLocked: false,
      remainingAttempts: DEFAULT_POLICY.lockAfterAttempts - (user.failedAttempts + 1)
    };
  }

  if (options.recordAttempt) {
    await prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: 0 },
    });
  }

  return { isValid: true };
};

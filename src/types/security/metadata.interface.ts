import { ZodIssue } from "zod";
import { SecurityEventType } from ".";

interface BaseSecurityEventMetadata {
  timestamp?: Date;
  sourceIp?: string;
  userAgent?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export interface RequestEventMetadata extends BaseSecurityEventMetadata {
  method: string;
  path: string;
  statusCode?: number;
  eventType?: SecurityEventType;
  parameters?: Record<string, unknown>;
  isAuthenticated?: boolean;
  failure?: {
    reason:
      | "rate_limited"
      | "invalid_auth"
      | "suspicious_activity"
      | "validation_error"
      | "unknown_error"
      | "csrf_failure";
    details?: string;
  };
}

export interface AuthEventMetadata extends BaseSecurityEventMetadata {
  authMethod?: "password" | "oauth" | "api_key" | "magic_link";
  provider?: string;
  sessionId?: string;
  mfa?: {
    used: boolean;
    method?: "sms" | "email" | "authenticator" | "biometric";
  };
  failure?: {
    reason:
      | "invalid_credentials"
      | "missing_token"
      | "missing_config"
      | "account_locked"
      | "unverified_email"
      | "mfa_required"
      | "mfa_failed"
      | "validation_error"
      | "system_error"
      | "user_exists"
      | "user_not_found"
      | "invalid_password"
      | "authentication_failed";
    attemptsRemaining?: number;
    lockoutDuration?: number;
    validationErrors?: ZodIssue[];
  };
  lockoutDuration?: number;
  attemptedUsername?: string;
  redirectUri?: string;
  attemptedEmail?: string;
}

export interface TokenEventMetadata extends BaseSecurityEventMetadata {
  tokenType?: "access" | "refresh" | "verification" | "password_reset";
  token?: {
    jti?: string;
    issuedAt?: Date;
    expiresAt?: Date;
    version?: number;
  };
  tokenScope?: string[];
  tokenJti?: string;
  failure?: {
    reason:
      | "invalid"
      | "expired"
      | "revoked"
      | "missing"
      | "insufficient_scope"
      | "version_mismatch"
      | "hash_mismatch";
    dbVersion?: number;
    tokenVersion?: number;
  };
  clientId?: string;
}

export interface EmailVerificationEventMetadata
  extends BaseSecurityEventMetadata {
  email?: string;
  verificationMethod?: "otp" | "link";
  codeExpiresAt?: Date;
  attemptsRemaining?: number;
  failureReason?: "invalid_code" | "expired_code" | "max_attempts";
  isResend?: boolean;
}

export interface PasswordEventMetadata extends BaseSecurityEventMetadata {
  changeMethod?: "user_initiated" | "admin_initiated" | "reset";
  strengthScore?: number;
  failure?: {
    reason:
      | "weak_password"
      | "short_password"
      | "missing_credentials"
      | "missing_code_or_password"
      | "missing_email"
      | "invalid_reset_code"
      | "reset_code_expired"
      | "password_reuse"
      | "incorrect_old_password";
  };
  isTemporary?: boolean;
  expiryDate?: Date;
  requiredChanges?: number;
}

export interface UserEventMetadata extends BaseSecurityEventMetadata {
  changedBy?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  affectedUserId?: string;
  suspensionReason?: string;
  suspensionDuration?: number;
}

export interface SystemEventMetadata extends BaseSecurityEventMetadata {
  component?: string;
  configurationKey?: string;
  oldValue?: unknown;
  newValue?: unknown;
  maintenanceWindow?: { start: Date; end: Date };
  backupSize?: number;
  backupLocation?: string;
}

export interface SecurityEventMetadata extends BaseSecurityEventMetadata {
  actionTaken?: "blocked" | "allowed" | "notified" | "quarantined";
  threatType?: "brute_force" | "injection" | "xss" | "ddos";
  detectionSource?: "firewall" | "ids" | "ips" | "manual";
  confidenceScore?: number;
  indicators?: string[];
}

export function isAuthEventMetadata(
  metadata: any
): metadata is AuthEventMetadata {
  return (
    metadata &&
    (metadata.authMethod !== undefined || metadata.sessionId !== undefined)
  );
}

export function isTokenEventMetadata(
  metadata: any
): metadata is TokenEventMetadata {
  return metadata && metadata.tokenType !== undefined;
}

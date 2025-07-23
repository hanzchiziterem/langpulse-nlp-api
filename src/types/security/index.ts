import { SECURITY_EVENT } from "./events.consts";
import {
  AuthEventMetadata,
  RequestEventMetadata,
  TokenEventMetadata,
  EmailVerificationEventMetadata,
  PasswordEventMetadata,
  UserEventMetadata,
  SystemEventMetadata,
  SecurityEventMetadata,
} from "./metadata.interface";

import { LogSecurityEventParams } from "./log.interface";

const SEVERITY = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFO: "INFO",
  DEBUG: "DEBUG",
} as const;

const AUTH_METHOD = {
  PASSWORD: "PASSWORD",
  OAUTH: "OAUTH",
  API_KEY: "API_KEY",
  MAGIC_LINK: "MAGIC_LINK",
} as const;

const TOKEN_TYPE = {
  ACCESS: "ACCESS",
  REFRESH: "REFRESH",
  VERIFICATION: "VERIFICATION",
  PASSWORD_RESET: "PASSWORD_RESET",
} as const;

const FAILURE_REASON = {
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  ACCOUNT_NOT_VERIFIED: "ACCOUNT_NOT_VERIFIED",
  EXPIRED_TOKEN: "EXPIRED_TOKEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  WEAK_PASSWORD: "WEAK_PASSWORD",
  PASSWORD_REUSE: "PASSWORD_REUSE",
  RATE_LIMITED: "RATE_LIMITED",
  SUSPICIOUS_ACTIVITY: "SUSPICIOUS_ACTIVITY",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  SYSTEM_ERROR: "SYSTEM_ERROR",
  INCORRECT_OLD_PASSWORD: "INCORRECT_OLD_PASSWORD",
  RESET_CODE_EXPIRED: "RESET_CODE_EXPIRED",
  INVALID_RESET_CODE: "INVALID_RESET_CODE",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID_SIGNATURE: "INVALID_SIGNATURE",
} as const;

export type SeverityLevel = (typeof SEVERITY)[keyof typeof SEVERITY];

export type SecurityEventType =
  | (typeof SECURITY_EVENT.AUTH)[keyof typeof SECURITY_EVENT.AUTH]
  | (typeof SECURITY_EVENT.TOKEN)[keyof typeof SECURITY_EVENT.TOKEN]
  | (typeof SECURITY_EVENT.EMAIL_VERIFICATION)[keyof typeof SECURITY_EVENT.EMAIL_VERIFICATION]
  | (typeof SECURITY_EVENT.PASSWORD)[keyof typeof SECURITY_EVENT.PASSWORD]
  | (typeof SECURITY_EVENT.USER)[keyof typeof SECURITY_EVENT.USER]
  | (typeof SECURITY_EVENT.SYSTEM)[keyof typeof SECURITY_EVENT.SYSTEM]
  | (typeof SECURITY_EVENT.SECURITY)[keyof typeof SECURITY_EVENT.SECURITY]
  | (typeof SECURITY_EVENT.REQUEST)[keyof typeof SECURITY_EVENT.REQUEST];

export type SecurityEventMetadataUnion =
  | AuthEventMetadata
  | TokenEventMetadata
  | EmailVerificationEventMetadata
  | PasswordEventMetadata
  | UserEventMetadata
  | SystemEventMetadata
  | SecurityEventMetadata;

export {
  AuthEventMetadata,
  RequestEventMetadata,
  TokenEventMetadata,
  EmailVerificationEventMetadata,
  PasswordEventMetadata,
  UserEventMetadata,
  SystemEventMetadata,
  SecurityEventMetadata,
  SECURITY_EVENT,
  SEVERITY,
  TOKEN_TYPE,
  FAILURE_REASON,
  AUTH_METHOD,
  LogSecurityEventParams
};

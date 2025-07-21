export interface PasswordValidationResult {
  isValid: boolean;
  isLocked?: boolean;
  remainingAttempts?: number;
}

export interface PasswordPolicy {
  minLength: number;
  requireSpecialChar: boolean;
  requireNumber: boolean;
  lockAfterAttempts: number;
  lockDurationMinutes: number;
}

export interface CredentialValidationOptions {
  checkLockStatus?: boolean;
  recordAttempt?: boolean;
}
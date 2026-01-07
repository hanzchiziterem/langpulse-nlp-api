interface PasswordValidationResult {
  isValid: boolean;
  isLocked?: boolean;
  remainingAttempts?: number;
}

 interface PasswordPolicy {
  minLength: number;
  requireSpecialChar: boolean;
  requireNumber: boolean;
  lockAfterAttempts: number;
  lockDurationMinutes: number;
}

interface CredentialValidationOptions {
  checkLockStatus?: boolean;
  recordAttempt?: boolean;
}

export{
  PasswordValidationResult,
  PasswordPolicy,
  CredentialValidationOptions
}
import { JwtPayload, TokenPair } from "./token.interface";
import { User } from "./user.interface";

import {
  PasswordValidationResult,
  PasswordPolicy,
  CredentialValidationOptions,
} from "./password.interface";

import { AuthenticatedRequest, SecurityContext } from "./authRequest.interface";

type AuthResponse = {
  user: User;
  tokens: TokenPair;
};

export {
  AuthResponse,
  JwtPayload,
  AuthenticatedRequest,
  SecurityContext,
  PasswordValidationResult,
  PasswordPolicy,
  CredentialValidationOptions,
};

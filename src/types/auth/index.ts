import {
  PasswordValidationResult,
  PasswordPolicy,
  CredentialValidationOptions,
} from "./password.interface";
import { AuthenticatedRequest, SecurityContext } from "./authRequest.interface";
import { JwtPayload,TokenPair } from "./token.interface";
import { User } from "./user.interface";

type AuthResponse = {
  user: User;
  tokens: TokenPair;
};

export {
  AuthResponse,
  AuthenticatedRequest,
  SecurityContext,
  JwtPayload,
  TokenPair,
  PasswordValidationResult,
  PasswordPolicy,
  CredentialValidationOptions,
};

export interface JwtPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
  version: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
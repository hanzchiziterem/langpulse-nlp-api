import { JwtPayload } from "jsonwebtoken";
export interface RefreshTokenPayload extends JwtPayload {
  id: string;
  email: string;
}

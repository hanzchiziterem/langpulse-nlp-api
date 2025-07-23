import { AuthenticatedRequest } from "../../types/auth/authRequest.interface";

export const getIdentifier = (req: AuthenticatedRequest): string => {
  if (req.user?.id) return `User: ${req.user.id}`;

  return req.ip || "unknow-ip";
};

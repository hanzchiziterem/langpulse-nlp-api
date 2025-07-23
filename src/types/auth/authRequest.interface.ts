import { Request } from "express";

export interface SecurityContext {
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
  securityContext?: SecurityContext;
}

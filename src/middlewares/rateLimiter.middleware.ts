  import rateLimit from "express-rate-limit";
  import {Response } from "express";
  import { logSecurityEvent } from "../libs/logging";
  import { getIdentifier } from "../utils/auth";
  import { AuthenticatedRequest } from "../types/auth/authRequest.interface";
  import { SECURITY_EVENT, SEVERITY } from "../types/security";
  import { RequestEventMetadata } from "../types/security";



  const createRateLimiter = (max: number, windowMinutes: number) =>
    rateLimit({
      windowMs: windowMinutes * 60 * 1000,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => getIdentifier(req),
      handler: async (req: AuthenticatedRequest, res: Response) => {
        const identifier = getIdentifier(req);
        
        const metadata: RequestEventMetadata = {
          method: req.method,
          path: req.path,
          statusCode: 429,
          isAuthenticated: !!req.user?.id,
          parameters: {
            identifier,
            limit: max,
            windowMinutes,
            ipVersion: req.ip?.includes(":") ? "IPv6" : "IPv4"
          },
          failure: {
            reason: 'rate_limited',
            details: `Limit: ${max} requests per ${windowMinutes} minutes`
          }
        };
            await logSecurityEvent({
          userId: req.user?.id ?? null,
          eventType: SECURITY_EVENT.REQUEST.RATE_LIMITED,
          severity: SEVERITY.HIGH,
          ...(req.securityContext || {}),
          metadata
        });

        res.status(429).set({
            'Retry-After': windowMinutes * 60, 
            'RateLimit-Limit': max.toString(),
            'RateLimit-Remaining': '0',
            'RateLimit-Reset': Math.floor((Date.now() + (windowMinutes * 60 * 1000)) / 1000).toString()
          }).json({
            success: false,
            message: `Too many requests. Please try again in ${windowMinutes} minutes.`,
          });
      },
      //  skip: (req) => {
      //   return process.env.NODE_ENV === 'test' || 
      //          req.path === '/healthcheck';
      // }
    });

  export const strictLimiter = createRateLimiter(3, 15);
  export const authLimiter = createRateLimiter(5, 15);
  export const sensitiveActionLimiter = createRateLimiter(5, 15);
  export const publicApiLimiter = createRateLimiter(100, 15);
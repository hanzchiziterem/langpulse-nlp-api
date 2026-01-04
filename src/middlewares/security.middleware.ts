import { Request, Response, NextFunction } from "express";
import { logSecurityEvent } from "../libs/logging";
import { SeverityLevel } from "../generated/prisma";
import { SecurityEventType, SECURITY_EVENT, SEVERITY } from "../types/security";
import { RequestEventMetadata } from "../types/security";

export const securityContextMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.securityContext = {
    ipAddress:
      req.ip ||
      (Array.isArray(req.headers["x-forwarded-for"])
        ? req.headers["x-forwarded-for"][0]
        : req.headers["x-forwarded-for"]) ||
      req.socket?.remoteAddress ||
      "unknown",
    userAgent: req.headers["user-agent"] || "unknown",
    timestamp: new Date().toISOString(),
  };

  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);
  const originalEnd = res.end.bind(res);
 
  let responseLogged = false;

  const logResponse = () => {
    if (!responseLogged) {
      responseLogged = true;
      logRequestEvent(req, res.statusCode).catch(err => {
        console.error('Failed to log request:', err);
      });
    }
  };

  res.send = function (body?: any): Response {
    logResponse();
    return originalSend(body);
  };

  res.json = function (body?: any): Response {
    logResponse();
    return originalJson(body);
  };

  res.end = function (chunk?: any, encodingOrCb?: BufferEncoding | (() => void), cb?: () => void): Response {
    if (!responseLogged && res.statusCode >= 400) {
      logResponse();
    }
    if (typeof chunk === 'function') {
      return originalEnd(chunk);
    } else if (typeof encodingOrCb === 'function') {
      return originalEnd(chunk, encodingOrCb);
    } else {
      return originalEnd(chunk, encodingOrCb as BufferEncoding, cb);
    }
  };

  next();
};

async function logRequestEvent(req: Request, statusCode: number) {
  try {
    const metadata: RequestEventMetadata = {
      method: req.method,
      path: req.path,
      statusCode,
      isAuthenticated: !!req.user?.id,
      parameters: {
        query: req.query,
        params: req.params,
        body: redactSensitiveFields(req.body),
      },
    };
    let eventType: SecurityEventType = SECURITY_EVENT.REQUEST.PROCESSED;
    let severity: SeverityLevel = SEVERITY.INFO;

    if (statusCode >= 400) {
      eventType = SECURITY_EVENT.REQUEST.BLOCKED;
      severity =
        statusCode === 401 || statusCode === 403
          ? SEVERITY.HIGH
          : SEVERITY.MEDIUM;

      metadata.failure = {
        reason:
          statusCode === 401
            ? "invalid_auth"
            : statusCode === 403
            ? "suspicious_activity"
            : statusCode === 422
            ? "validation_error"
            : "unknown_error",
        details: `HTTP ${statusCode}`,
      };
    }

    await logSecurityEvent({
      userId: req.user?.id ?? null,
      eventType,
      severity,
      ...req.securityContext,
      metadata,
    });
  } catch (error) {
    console.error("Failed to log request event:", error);
  }
}

function redactSensitiveFields(obj: Record<string, any>): Record<string, any> {
  if (!obj) return obj;
  const sensitiveFields = ["password", "token", "accessToken", "refreshToken"]; 
  const redacted = { ...obj };

  sensitiveFields.forEach((field) => {
    if (redacted[field]) {
      redacted[field] = "**REDACTED**";
    }
  });

  return redacted;
}

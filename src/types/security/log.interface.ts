import { SecurityEventType, SeverityLevel } from ".";
import { PrismaSecurityEventMetadata } from "../prisma";

export interface LogSecurityEventParams {
  userId: string | null;
  eventType: SecurityEventType;
  severity: SeverityLevel;
  ipAddress?: string;
  userAgent?: string;
  metadata?:  PrismaSecurityEventMetadata;
}

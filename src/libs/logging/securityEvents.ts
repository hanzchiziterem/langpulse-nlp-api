import prisma from "../../client/prisma";
import { LogSecurityEventParams } from "../../types/security/log.interface";
import { convertToPrismaJson } from "../../utils/logging/convertToPrismaJson";

export const logSecurityEvent = async ({
  userId,
  eventType,
  severity,
  metadata,
  ipAddress = "unknown",
  userAgent = "unknown",
}: LogSecurityEventParams) => {
  try {
    const userExists = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        })
      : null;

    await prisma.securityLog.create({
      data: {
        ...(userExists && { userId }),
        eventType,
        severity,
        ipAddress,
        userAgent,
        metadata: metadata ? convertToPrismaJson(metadata) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to log security event:", {
      eventType,
      userId,
      error: error instanceof Error ? error.message : error,
    });
    try {
      await prisma.securityLog.create({
        data: {
          eventType,
          severity,
          ipAddress,
          userAgent,
          metadata: {
            metadata: metadata ? convertToPrismaJson(metadata) : undefined,
          },
        },
      });
    } catch (fallbackError) {
      console.error(
        "Critical: Failed to create fallback security log:",
        fallbackError
      );
    }
  }
};

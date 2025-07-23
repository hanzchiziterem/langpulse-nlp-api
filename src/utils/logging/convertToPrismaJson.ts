import { InputJsonValue } from "@prisma/client/runtime/library";
import { PrismaSecurityEventMetadata } from "../../types/prisma";

export const convertToPrismaJson = (
  metadata: PrismaSecurityEventMetadata
): InputJsonValue =>
  JSON.parse(
    JSON.stringify(metadata, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    })
  );

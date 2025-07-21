import { SecurityEventMetadataUnion } from "../security";
import { PrismaJsonCompatible } from "./jsonCompatible.types";

export type PrismaSecurityEventMetadata =
  PrismaJsonCompatible<SecurityEventMetadataUnion>;

import { z } from "zod";

export const codeSchema = z.object({
  code: z.union([z.string(), z.array(z.string())]),
});

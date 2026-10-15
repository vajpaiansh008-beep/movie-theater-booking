import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ID");

export const createShowSchema = z
  .object({
    movieId: objectIdSchema,
    screenId: objectIdSchema,

    startTime: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value)),

    bufferMinutes: z.number().int().min(0).max(60).optional().default(15),

    pricing: z
      .object({
        standard: z.number().min(0).max(100000),
        premium: z.number().min(0).max(100000),
        recliner: z.number().min(0).max(100000),
      })
      .strict(),
  })
  .strict();

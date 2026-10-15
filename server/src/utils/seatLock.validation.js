import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ID");

export const lockSeatsSchema = z
  .object({
    showId: objectIdSchema,
    seatIds: z.array(objectIdSchema).min(1).max(10),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (new Set(data.seatIds).size !== data.seatIds.length) {
      ctx.addIssue({
        code: "custom",
        path: ["seatIds"],
        message: "Duplicate seat IDs are not allowed",
      });
    }
  });

export const releaseSeatsSchema = z
  .object({
    showId: objectIdSchema,
    lockToken: z.string().uuid(),
  })
  .strict();

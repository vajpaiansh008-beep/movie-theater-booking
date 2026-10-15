import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ID");

const seatItemSchema = z
  .object({
    rowLabel: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{1,3}$/, "Use a row label such as A, B, or AA"),

    seatNumber: z.number().int().min(1).max(1000),

    category: z
      .enum(["standard", "premium", "recliner"])
      .optional()
      .default("standard"),
  })
  .strict();

export const createSeatsSchema = z
  .object({
    screenId: objectIdSchema,
    seats: z.array(seatItemSchema).min(1).max(1000),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set();

    data.seats.forEach((seat, index) => {
      const key = `${seat.rowLabel}-${seat.seatNumber}`;

      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["seats", index],
          message: `Duplicate seat ${seat.rowLabel}${seat.seatNumber} in this request`,
        });
      }

      seen.add(key);
    });
  });

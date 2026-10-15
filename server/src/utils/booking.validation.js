import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ID");

export const createBookingSchema = z
  .object({
    showId: objectIdSchema,

    seatIds: z
      .array(objectIdSchema)
      .min(1, "Select at least one seat")
      .max(10, "You can book a maximum of 10 seats at once"),

    lockToken: z.string().uuid("Invalid seat lock token"),
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

import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ID");

export const createPaymentOrderSchema = z
  .object({
    showId: objectIdSchema,
    seatIds: z
      .array(objectIdSchema)
      .min(1, "Select at least one seat")
      .max(10, "You can book a maximum of 10 seats"),
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

export const verifyPaymentSchema = z
  .object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z
      .string()
      .regex(/^[a-fA-F0-9]{64}$/, "Invalid payment signature"),
  })
  .strict();

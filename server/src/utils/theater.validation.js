import { z } from "zod";

const theaterFields = {
  name: z.string().trim().min(1).max(150),

  addressLine: z.string().trim().min(1).max(300),

  city: z.string().trim().min(1).max(100),

  state: z.string().trim().min(1).max(100),

  pincode: z
    .string()
    .regex(/^[0-9]{6}$/, "Enter a valid 6-digit Indian PIN code"),

  contactPhone: z.string().trim().max(20).optional().default(""),

  amenities: z
    .array(z.string().trim().min(1).max(60))
    .max(30)
    .optional()
    .default([]),

  status: z.enum(["active", "inactive"]).optional().default("active"),
};

export const createTheaterSchema = z.object(theaterFields).strict();

export const updateTheaterSchema = z
  .object({
    ...theaterFields,
    name: theaterFields.name.optional(),
    addressLine: theaterFields.addressLine.optional(),
    city: theaterFields.city.optional(),
    state: theaterFields.state.optional(),
    pincode: theaterFields.pincode.optional(),
  })
  .partial()
  .strict();

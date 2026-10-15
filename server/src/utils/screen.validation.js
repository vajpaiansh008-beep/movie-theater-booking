import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ID");

const screenFields = {
  name: z.string().trim().min(1).max(100),

  screenType: z
    .enum(["standard", "premium", "imax", "4dx"])
    .optional()
    .default("standard"),

  totalSeats: z.number().int().min(1).max(1000),

  status: z.enum(["active", "inactive"]).optional().default("active"),
};

export const createScreenSchema = z
  .object({
    ...screenFields,
    theaterId: objectIdSchema,
  })
  .strict();

export const updateScreenSchema = z
  .object({
    name: screenFields.name.optional(),
    screenType: screenFields.screenType.optional(),
    totalSeats: screenFields.totalSeats.optional(),
    status: screenFields.status.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

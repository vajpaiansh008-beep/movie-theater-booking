import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().trim().min(2).max(60),

    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),

    password: z.string().min(8).max(72),

    // Example: +9198765-----
    phoneNumber: z
      .string()
      .trim()
      .regex(
        /^\+[1-9]\d{7,14}$/,
        "Enter a valid phone number with country code",
      ),

    // Users must explicitly choose whether to receive WhatsApp tickets.
    whatsappTicketOptIn: z.boolean(),
  })
  .strict();
  

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),

    password: z.string().min(1).max(72),
  })
  .strict();


export const verifyPhoneOtpSchema = z.object({
  email: z.string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),

  code: z.string()
    .regex(/^\d{6}$/, "OTP must contain exactly 6 digits"),
}).strict();

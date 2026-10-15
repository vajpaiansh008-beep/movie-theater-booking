import { z } from "zod";

export const createMovieSchema = z
  .object({
    title: z.string().trim().min(1).max(150),

    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and hyphens",
      )
      .max(180),

    synopsis: z.string().trim().min(1).max(3000),

    durationMinutes: z.number().int().min(1).max(600),

    genres: z.array(z.string().trim().min(1).max(40)).min(1).max(10),

    languages: z.array(z.string().trim().min(1).max(40)).min(1).max(10),

    releaseDate: z
      .string()
      .datetime()
      .transform((value) => new Date(value)),

    certification: z
      .enum(["U", "UA7+", "UA13+", "UA16+", "A", "NR"])
      .default("NR"),

    director: z.string().trim().max(120).optional().default(""),

    cast: z
      .array(z.string().trim().min(1).max(120))
      .max(50)
      .optional()
      .default([]),

    status: z
      .enum(["draft", "published", "archived"])
      .optional()
      .default("draft"),

    releaseStatus: z
      .enum(["upcoming", "now_showing", "ended"])
      .optional()
      .default("upcoming"),
  })
  .strict();

export const updateMovieSchema = createMovieSchema.partial().strict();

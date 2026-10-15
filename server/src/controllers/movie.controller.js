import Movie from "../models/movie.model.js";
import { createMovieSchema } from "../utils/movie.validation.js";
import { parseMovieFormData } from "../utils/parseMovieFormData.js";
import { updateMovieSchema } from "../utils/movie.validation.js";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

export const createMovie = async (req, res, next) => {
  let uploadedFilePath;

  try {
    // 1. Validate movie details
    const movieData = parseMovieFormData(req.body);
    const result = createMovieSchema.safeParse(movieData);

    if (!result.success) {
      // Remove uploaded poster if validation fails
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: "Invalid movie details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    // 2. Check poster
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Movie poster is required",
      });
    }

    uploadedFilePath = req.file.path;

    // 3. Check duplicate slug
    const existingMovie = await Movie.findOne({
      slug: result.data.slug,
    });

    if (existingMovie) {
      await fs.unlink(uploadedFilePath).catch(() => {});
      uploadedFilePath = null;

      return res.status(409).json({
        success: false,
        message: "A movie with this slug already exists",
      });
    }

    // 4. Generate local poster URL
    const posterUrl = `/uploads/posters/${req.file.filename}`;

    // 5. Create movie
    const movie = await Movie.create({
      ...result.data,
      posterUrl,
      createdBy: req.user._id,
    });

    // MongoDB successfully saved the movie
    uploadedFilePath = null;

    return res.status(201).json({
      success: true,
      message: "Movie created successfully",
      data: {
        movie,
      },
    });
  } catch (error) {
    // Remove orphaned local poster if movie creation fails
    if (uploadedFilePath) {
      await fs.unlink(uploadedFilePath).catch(() => {});
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A movie with this slug already exists",
      });
    }

    next(error);
  }
};

const posterDirectory = path.join(process.cwd(), "uploads", "posters");

// Safely remove only posters stored in our local poster directory.
const removeLocalPoster = async (posterUrl) => {
  if (
    typeof posterUrl !== "string" ||
    !posterUrl.startsWith("/uploads/posters/")
  ) {
    return;
  }

  const filename = posterUrl.slice("/uploads/posters/".length);

  if (!filename || path.basename(filename) !== filename) {
    return;
  }

  await fs.unlink(path.join(posterDirectory, filename)).catch((error) => {
    if (error.code !== "ENOENT") {
      console.error("Failed to remove local poster:", error.message);
    }
  });
};

// PATCH /api/admin/movies/:id
export const updateMovie = async (req, res, next) => {
  let uploadedFilePath = req.file?.path;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie ID",
      });
    }

    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    // Validate only the fields supplied by the admin.
    const movieData = parseMovieFormData(req.body);
    const result = updateMovieSchema.safeParse(movieData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    // Check whether the new slug belongs to another movie.
    if (result.data.slug) {
      const existingMovie = await Movie.findOne({
        slug: result.data.slug,
        _id: { $ne: movie._id },
      });

      if (existingMovie) {
        return res.status(409).json({
          success: false,
          message: "A movie with this slug already exists",
        });
      }
    }

    const oldPosterUrl = movie.posterUrl;

    // Never allow the client to set server-managed fields.
    const updates = { ...result.data };
    delete updates.posterUrl;
    delete updates.posterPublicId;
    delete updates.createdBy;

    Object.assign(movie, updates);

    // Replace the poster only when a new file is uploaded.
    if (req.file) {
      movie.posterUrl = `/uploads/posters/${req.file.filename}`;
    }

    await movie.save();

    // The database update succeeded. The new file is now in use.
    uploadedFilePath = null;

    if (req.file) {
      await removeLocalPoster(oldPosterUrl);
    }

    return res.status(200).json({
      success: true,
      message: "Movie updated successfully",
      data: { movie },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A movie with this slug already exists",
      });
    }

    next(error);
  } finally {
    // Remove a newly uploaded file if the update failed.
    if (uploadedFilePath) {
      await fs.unlink(uploadedFilePath).catch(() => {});
    }
  }
};

// DELETE /api/admin/movies/:id
export const deleteMovie = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie ID",
      });
    }

    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const posterUrl = movie.posterUrl;

    await movie.deleteOne();

    // Remove the local poster after deleting the movie document.
    await removeLocalPoster(posterUrl);

    return res.status(200).json({
      success: true,
      message: "Movie deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

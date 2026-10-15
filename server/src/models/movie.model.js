import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Movie title is required"],
      trim: true,
      minlength: 1,
      maxlength: 150,
    },

    slug: {
      type: String,
      required: [true, "Movie slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must contain lowercase letters, numbers, and hyphens",
      ],
      maxlength: 180,
    },

    synopsis: {
      type: String,
      required: [true, "Movie synopsis is required"],
      trim: true,
      maxlength: 3000,
    },

    durationMinutes: {
      type: Number,
      required: [true, "Movie duration is required"],
      min: 1,
      max: 600,
    },

    genres: {
      type: [String],
      required: true,
      validate: {
        validator: (genres) =>
          genres.length > 0 &&
          genres.every(
            (genre) =>
              typeof genre === "string" &&
              genre.trim().length > 0 &&
              genre.trim().length <= 40,
          ),
        message: "Add at least one valid genre",
      },
    },

    languages: {
      type: [String],
      required: true,
      validate: {
        validator: (languages) =>
          languages.length > 0 &&
          languages.every(
            (language) =>
              typeof language === "string" &&
              language.trim().length > 0 &&
              language.trim().length <= 40,
          ),
        message: "Add at least one valid language",
      },
    },

    releaseDate: {
      type: Date,
      required: [true, "Release date is required"],
    },

    certification: {
      type: String,
      enum: ["U", "UA7+", "UA13+", "UA16+", "A", "NR"],
      default: "NR",
    },
    
    // Relative URL of the locally stored movie poster
    posterUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2048,
    },

    director: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    cast: {
      type: [String],
      default: [],
      validate: {
        validator: (members) =>
          members.every(
            (member) =>
              typeof member === "string" &&
              member.trim().length > 0 &&
              member.trim().length <= 120,
          ),
        message: "Each cast member must have a valid name",
      },
    },

    // Controls visibility in the catalog
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },

    // Classifies the movie's release lifecycle
    releaseStatus: {
      type: String,
      enum: ["upcoming", "now_showing", "ended"],
      default: "upcoming",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Useful for catalog filtering and sorting.
movieSchema.index({ status: 1, releaseStatus: 1, releaseDate: 1 });
movieSchema.index({ title: 1 });

const Movie = mongoose.model("Movie", movieSchema);

export default Movie;

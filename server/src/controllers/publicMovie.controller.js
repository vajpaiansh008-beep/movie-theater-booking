import Movie from "../models/movie.model.js";

const allowedReleaseStatuses = ["upcoming", "now_showing", "ended"];

export const getPublishedMovies = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const requestedLimit = Number.parseInt(req.query.limit, 10) || 12;
    const limit = Math.min(50, Math.max(1, requestedLimit));
    const skip = (page - 1) * limit;

    const filter = { status: "published" };

    // Optional genre filter, e.g. ?genre=Sci-Fi
    if (typeof req.query.genre === "string" && req.query.genre.trim()) {
      filter.genres = req.query.genre.trim();
    }

    // Optional language filter, e.g. ?language=English
    if (typeof req.query.language === "string" && req.query.language.trim()) {
      filter.languages = req.query.language.trim();
    }

    // Optional release-status filter
    if (req.query.releaseStatus !== undefined) {
      if (
        typeof req.query.releaseStatus !== "string" ||
        !allowedReleaseStatuses.includes(req.query.releaseStatus)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid releaseStatus filter",
          allowedValues: allowedReleaseStatuses,
        });
      }

      filter.releaseStatus = req.query.releaseStatus;
    }

    // Search by movie title, e.g. ?search=interstellar
    if (req.query.search !== undefined) {
      if (typeof req.query.search !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid search parameter",
        });
      }

      const search = req.query.search.trim();

      if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        filter.title = {
          $regex: escapedSearch,
          $options: "i",
        };
      }
    }

    // Sorting
    const allowedSortFields = ["releaseDate", "createdAt", "title"];

    const sortBy = req.query.sortBy ?? "releaseDate";
    const order = req.query.order ?? "desc";

    if (typeof sortBy !== "string" || !allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sortBy parameter",
        allowedValues: allowedSortFields,
      });
    }

    if (typeof order !== "string" || !["asc", "desc"].includes(order)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order parameter",
        allowedValues: ["asc", "desc"],
      });
    }

    const sort = {
      [sortBy]: order === "asc" ? 1 : -1,
    };

    if (sortBy !== "createdAt") {
      sort.createdAt = -1;
    }

    const [movies, totalMovies] = await Promise.all([
      Movie.find(filter)
        .select("-createdBy -__v")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),

      Movie.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        movies,
        pagination: {
          currentPage: page,
          limit,
          totalMovies,
          totalPages: Math.ceil(totalMovies / limit),
          hasNextPage: page * limit < totalMovies,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPublishedMovieBySlug = async (req, res, next) => {
  try {
    const movie = await Movie.findOne({
      slug: req.params.slug,
      status: "published",
    })
      .select("-createdBy -__v")
      .lean();

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { movie },
    });
  } catch (error) {
    next(error);
  }
};

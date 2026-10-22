import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock3, CalendarDays, Languages } from "lucide-react";
import api from "../lib/api";

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1"
).replace(/\/api\/v1\/?$/, "");

export default function MovieDetails() {
  const { slug } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchMovie() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/movies/${encodeURIComponent(slug)}`);

        const result = response.data?.data?.movie ?? response.data?.data;

        if (!result || result.status !== "published") {
          throw new Error("Movie not found.");
        }

        if (!cancelled) setMovie(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Unable to load movie details.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMovie();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08090d] px-6 py-24 text-center text-white">
        Loading movie details...
      </main>
    );
  }

  if (error || !movie) {
    return (
      <main className="min-h-screen bg-[#08090d] px-6 py-24 text-center text-white">
        <p className="mb-6 text-red-400">{error || "Movie not found."}</p>
        <Link to="/" className="text-amber-400 hover:text-amber-300">
          Return to homepage
        </Link>
      </main>
    );
  }

  const poster = movie.posterUrl
    ? movie.posterUrl.startsWith("http")
      ? movie.posterUrl
      : `${API_ORIGIN}${movie.posterUrl}`
    : "";

  const releaseDate = movie.releaseDate
    ? new Date(movie.releaseDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not announced";

  return (
    <main className="min-h-screen bg-[#08090d] text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <Link
          to="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-amber-400"
        >
          <ArrowLeft size={18} />
          Back to movies
        </Link>

        <div className="grid gap-10 md:grid-cols-[300px_1fr] lg:gap-14">
          <div>
            {poster ? (
              <img
                src={poster}
                alt={movie.title}
                className="w-full rounded-2xl object-cover shadow-2xl shadow-black/40"
              />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center rounded-2xl bg-white/5 text-gray-500">
                No poster available
              </div>
            )}
          </div>

          <section className="py-2">
            <span className="inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
              {movie.releaseStatus === "upcoming"
                ? "Coming Soon"
                : movie.releaseStatus === "now_showing"
                  ? "Now Showing"
                  : movie.releaseStatus || "Movie"}
            </span>

            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              {movie.title}
            </h1>

            <div className="mt-5 flex flex-wrap gap-4 text-sm text-gray-400">
              <span className="inline-flex items-center gap-2">
                <Clock3 size={17} />
                {movie.durationMinutes
                  ? `${movie.durationMinutes} minutes`
                  : "Duration unavailable"}
              </span>

              <span className="inline-flex items-center gap-2">
                <CalendarDays size={17} />
                {releaseDate}
              </span>

              {movie.languages?.length > 0 && (
                <span className="inline-flex items-center gap-2">
                  <Languages size={17} />
                  {movie.languages.join(", ")}
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {movie.certification && (
                <span className="rounded-md border border-white/15 px-3 py-1 text-sm text-gray-300">
                  {movie.certification}
                </span>
              )}

              {(movie.genres || []).map((genre) => (
                <span
                  key={genre}
                  className="rounded-md bg-white/5 px-3 py-1 text-sm text-gray-300"
                >
                  {genre}
                </span>
              ))}
            </div>

            <h2 className="mt-10 text-xl font-semibold">About the movie</h2>
            <p className="mt-3 max-w-2xl leading-7 text-gray-400">
              {movie.synopsis || "Movie description coming soon."}
            </p>

            {movie.director && (
              <p className="mt-5 text-sm text-gray-400">
                Director: <span className="text-white">{movie.director}</span>
              </p>
            )}

            {movie.cast?.length > 0 && (
              <p className="mt-3 text-sm text-gray-400">
                Cast:{" "}
                <span className="text-white">{movie.cast.join(", ")}</span>
              </p>
            )}

            <div className="mt-10">
              {movie.releaseStatus === "now_showing" ? (
                <Link
                  to={`/movies/${movie.slug}/showtimes`}
                  className="inline-block rounded-xl bg-amber-400 px-7 py-3.5 font-semibold text-black transition hover:bg-amber-300"
                >
                  Book Tickets
                </Link>
              ) : (
                <p className="text-sm text-gray-400">
                  Showtimes will be available when this movie starts screening.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

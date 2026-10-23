import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  CalendarDays,
  Languages,
  Ticket,
  Film,
  Clapperboard,
  UserRound,
  UsersRound,
  LoaderCircle,
  CircleAlert,
  ChevronRight,
  MapPin,
} from "lucide-react";
import api from "../lib/api";

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1"
).replace(/\/api\/v1\/?$/, "");

function formatReleaseDate(date) {
  if (!date || Number.isNaN(new Date(date).getTime())) {
    return "Not announced";
  }

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function InfoItem({ icon: Icon, label, value }) {
  if (!value) return null;

  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-amber-300">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-medium leading-6 text-zinc-200">
          {value}
        </p>
      </div>
    </div>
  );
}

function getReleaseLabel(status) {
  const labels = {
    upcoming: "Coming Soon",
    now_showing: "Now Showing",
    ended: "No Longer Showing",
  };

  return labels[status] || "Movie";
}

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
      setMovie(null);

      try {
        const response = await api.get(`/movies/${encodeURIComponent(slug)}`);

        const result = response.data?.data?.movie ?? response.data?.data;

        if (!result || result.status !== "published") {
          throw new Error("This movie could not be found.");
        }

        if (!cancelled) {
          setMovie(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Unable to load movie details. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchMovie();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08090d] px-5 text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/[0.07]">
            <LoaderCircle size={30} className="animate-spin text-amber-300" />
          </div>
          <h2 className="text-lg font-semibold">Preparing your movie</h2>
          <p className="mt-2 text-sm text-zinc-500">Loading movie details...</p>
        </div>
      </main>
    );
  }

  if (error || !movie) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08090d] px-5 py-16 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 text-center sm:p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/[0.07] text-red-300">
            <CircleAlert size={28} />
          </div>

          <h1 className="text-2xl font-bold">Movie unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {error || "We couldn't find this movie."}
          </p>

          <Link
            to="/"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 font-bold text-black transition hover:bg-amber-200"
          >
            <ArrowLeft size={17} />
            Back to movies
          </Link>
        </div>
      </main>
    );
  }

  const poster = movie.posterUrl
    ? movie.posterUrl.startsWith("http")
      ? movie.posterUrl
      : `${API_ORIGIN}${movie.posterUrl.startsWith("/") ? "" : "/"}${movie.posterUrl}`
    : "";

  const isNowShowing = movie.releaseStatus === "now_showing";
  const genres = Array.isArray(movie.genres) ? movie.genres : [];
  const languages = Array.isArray(movie.languages) ? movie.languages : [];
  const cast = Array.isArray(movie.cast) ? movie.cast : [];

  return (
    <main className="min-h-screen overflow-hidden bg-[#08090d] text-white">
      {/* Cinematic background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-36 left-1/2 h-[30rem] w-[45rem] -translate-x-1/2 rounded-full bg-amber-400/[0.06] blur-[140px]" />
        <div className="absolute right-0 top-[45%] h-80 w-80 rounded-full bg-orange-500/[0.035] blur-[120px]" />
      </div>

      <div className="relative">
        {/* Wide cinematic backdrop */}
        <section className="relative isolate min-h-[300px] overflow-hidden sm:min-h-[360px]">
          {poster && (
            <div
              className="absolute inset-0 -z-20 scale-110 bg-cover bg-center opacity-30 blur-2xl"
              style={{ backgroundImage: `url("${poster}")` }}
            />
          )}

          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#08090d]/35 via-[#08090d]/75 to-[#08090d]" />

          <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-medium text-zinc-300 backdrop-blur-md transition hover:border-amber-300/30 hover:text-amber-300"
            >
              <ArrowLeft size={17} />
              Back to movies
            </Link>

            <div className="mt-16 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-amber-300 sm:mt-24">
              <Clapperboard size={17} />
              CINEBOOK ORIGINAL EXPERIENCE
            </div>

            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              Discover the story. Choose your seats. Enjoy the show.
            </p>
          </div>
        </section>

        {/* Main movie information */}
        <section className="mx-auto -mt-12 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid items-start gap-8 lg:grid-cols-[330px_minmax(0,1fr)] lg:gap-12">
            {/* Poster */}
            <div className="mx-auto w-full max-w-[300px] lg:mx-0 lg:max-w-none">
              <div className="group relative overflow-hidden rounded-3xl border border-white/[0.12] bg-[#111218] shadow-2xl shadow-black/60">
                <div className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300" />

                {poster ? (
                  <img
                    src={poster}
                    alt={`${movie.title} poster`}
                    className="aspect-[2/3] w-full object-cover transition duration-700 group-hover:scale-[1.025]"
                  />
                ) : (
                  <div className="flex aspect-[2/3] flex-col items-center justify-center gap-4 text-zinc-500">
                    <Film size={52} />
                    <span className="text-sm">Poster unavailable</span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-5 pt-16">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                    Now on CINEBOOK
                  </p>
                </div>
              </div>

              {/* Quick facts */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                  <Clock3 size={19} className="mb-3 text-amber-300" />
                  <p className="text-xs text-zinc-500">Runtime</p>
                  <p className="mt-1 font-semibold">
                    {movie.durationMinutes
                      ? `${movie.durationMinutes} min`
                      : "Not available"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                  <CalendarDays size={19} className="mb-3 text-amber-300" />
                  <p className="text-xs text-zinc-500">Release date</p>
                  <p className="mt-1 text-sm font-semibold leading-5">
                    {formatReleaseDate(movie.releaseDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Movie details */}
            <div className="min-w-0 pt-2 lg:pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isNowShowing ? "bg-emerald-400" : "bg-amber-300"
                    }`}
                  />
                  {getReleaseLabel(movie.releaseStatus)}
                </span>

                {movie.certification && (
                  <span className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-sm font-semibold text-zinc-300">
                    {movie.certification}
                  </span>
                )}
              </div>

              <h1 className="mt-5 break-words text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                {movie.title}
              </h1>

              {genres.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-lg border border-white/[0.09] bg-white/[0.035] px-3 py-1.5 text-sm text-zinc-300"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Movie metadata */}
              <div className="mt-7 grid gap-5 border-y border-white/[0.08] py-6 sm:grid-cols-2">
                <InfoItem
                  icon={CalendarDays}
                  label="Release date"
                  value={formatReleaseDate(movie.releaseDate)}
                />

                <InfoItem
                  icon={Clock3}
                  label="Movie duration"
                  value={
                    movie.durationMinutes
                      ? `${movie.durationMinutes} minutes`
                      : "Not available"
                  }
                />

                {languages.length > 0 && (
                  <InfoItem
                    icon={Languages}
                    label="Available languages"
                    value={languages.join(", ")}
                  />
                )}

                {movie.director && (
                  <InfoItem
                    icon={UserRound}
                    label="Director"
                    value={movie.director}
                  />
                )}
              </div>

              {/* Synopsis */}
              <div className="mt-8">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-5 w-1 rounded-full bg-amber-300" />
                  <h2 className="text-xl font-bold sm:text-2xl">
                    About the movie
                  </h2>
                </div>

                <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-zinc-400 sm:text-base sm:leading-8">
                  {movie.synopsis ||
                    "The story details for this movie will be available soon."}
                </p>
              </div>

              {/* Cast */}
              {cast.length > 0 && (
                <div className="mt-8">
                  <div className="mb-4 flex items-center gap-2">
                    <UsersRound size={19} className="text-amber-300" />
                    <h2 className="text-xl font-bold">Cast</h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {cast.map((person, index) => (
                      <span
                        key={`${person}-${index}`}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-2.5 text-sm text-zinc-300"
                      >
                        {person}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Booking call to action */}
              <div className="mt-9 rounded-3xl border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.09] to-transparent p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">
                      {isNowShowing
                        ? "Ready for the big screen?"
                        : "Coming to the big screen"}
                    </h2>

                    <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
                      {isNowShowing
                        ? "Find a showtime, pick your favourite seats and book your movie experience."
                        : `Release date: ${formatReleaseDate(movie.releaseDate)}. Showtimes will be available when screenings begin.`}
                    </p>
                  </div>

                  {isNowShowing ? (
                    <Link
                      to={`/movies/${movie.slug}/showtimes`}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-300 px-6 py-3.5 font-bold text-black shadow-lg shadow-amber-300/10 transition hover:-translate-y-0.5 hover:bg-amber-200"
                    >
                      <Ticket size={19} />
                      Book Tickets
                      <ChevronRight size={18} />
                    </Link>
                  ) : (
                    <Link
                      to="/"
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3.5 font-semibold text-white transition hover:border-amber-300/30 hover:text-amber-300"
                    >
                      <MapPin size={17} />
                      Browse movies
                    </Link>
                  )}
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-zinc-600 sm:text-left">
                Your next great movie experience starts with CINEBOOK.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

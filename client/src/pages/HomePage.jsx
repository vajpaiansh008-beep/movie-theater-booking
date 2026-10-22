import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clapperboard,
  Clock3,
  Film,
  LogIn,
  Menu,
  Search,
  Ticket,
  UserPlus,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1"
).replace(/\/api\/v1\/?$/, "");

const CATEGORIES = [
  "All",
  "Action",
  "Sci-Fi",
  "Adventure",
  "Thriller",
  "Drama",
  "Comedy",
  "Animation",
];

function getPosterUrl(posterUrl) {
  if (!posterUrl) return "";

  if (
    posterUrl.startsWith("http://") ||
    posterUrl.startsWith("https://")
  ) {
    return posterUrl;
  }

  return `${API_ORIGIN}${
    posterUrl.startsWith("/") ? "" : "/"
  }${posterUrl}`;
}

function formatDuration(minutes) {
  if (!minutes) return "Duration unavailable";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}m`;
}

function getMovieStatus(movie) {
  return String(movie.releaseStatus || "").toLowerCase() === "upcoming"
    ? "Coming Soon"
    : "Now Showing";
}

function MoviePoster({ movie }) {
  const [imageFailed, setImageFailed] = useState(false);
  const posterUrl = getPosterUrl(movie.posterUrl);

  if (!posterUrl || imageFailed) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
        <div className="text-center text-slate-500">
          <Film size={42} className="mx-auto mb-3" />
          <p className="text-sm">Poster unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={posterUrl}
      alt={`${movie.title} poster`}
      loading="lazy"
      onError={() => setImageFailed(true)}
      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
    />
  );
}

function MovieCard({ movie }) {
  const genres = Array.isArray(movie.genres) ? movie.genres : [];
  const genre = genres[0] || "Other";
  const releaseDate = movie.releaseDate
    ? new Date(movie.releaseDate)
    : null;

  const year =
    releaseDate && !Number.isNaN(releaseDate.getTime())
      ? releaseDate.getFullYear()
      : "";

  const comingSoon = getMovieStatus(movie) === "Coming Soon";

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-[#101522] transition duration-300 hover:-translate-y-1 hover:border-red-500/40 hover:shadow-xl hover:shadow-red-950/20">
      <Link
        to={`/movies/${movie.slug}`}
        aria-label={`View details for ${movie.title}`}
        className="relative block h-64 overflow-hidden bg-slate-900 sm:h-72"
      >
        <MoviePoster movie={movie} />

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/20" />

        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
            comingSoon
              ? "bg-blue-500/90 text-white"
              : "bg-emerald-500/90 text-white"
          }`}
        >
          {comingSoon ? "Coming Soon" : "Now Showing"}
        </span>

        {movie.certification && (
          <span className="absolute right-3 top-3 rounded-md border border-white/20 bg-black/60 px-2 py-1 text-xs font-semibold backdrop-blur">
            {movie.certification}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4">
          {year && (
            <p className="mb-1 text-xs text-gray-300">{year}</p>
          )}

          <h3 className="line-clamp-2 text-lg font-bold text-white">
            {movie.title}
          </h3>
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-center justify-between gap-3 text-xs text-gray-400">
          <span className="truncate">{genre}</span>

          <span className="flex shrink-0 items-center gap-1">
            <Clock3 size={13} />
            {formatDuration(movie.durationMinutes)}
          </span>
        </div>

        {movie.synopsis && (
          <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-gray-400">
            {movie.synopsis}
          </p>
        )}

        <Link
          to={`/movies/${movie.slug}/showtimes`}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-[#101522]"
        >
          <Ticket size={16} />
          {comingSoon ? "View Showtimes" : "Book Tickets"}
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";
  const isLoggedIn = Boolean(user);

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [activeSection, setActiveSection] = useState("Now Showing");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchMovies() {
      try {
        setLoading(true);
        setApiError("");

        const response = await api.get("/movies");
        const payload = response.data?.data;

        const movieList = Array.isArray(payload?.movies)
          ? payload.movies
          : Array.isArray(payload)
            ? payload
            : [];

        if (active) {
          setMovies(
            movieList.filter(
              (movie) => movie.status === "published",
            ),
          );
        }
      } catch (error) {
        if (active) {
          setApiError(
            error.response?.data?.message ||
              "Unable to load movies. Please check that the backend is running.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchMovies();

    return () => {
      active = false;
    };
  }, []);

  const filteredMovies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return movies.filter((movie) => {
      const title = String(movie.title || "").toLowerCase();
      const genres = Array.isArray(movie.genres) ? movie.genres : [];
      const normalizedGenres = genres.map((genre) =>
        String(genre).toLowerCase(),
      );

      const matchesSearch =
        !normalizedSearch ||
        title.includes(normalizedSearch) ||
        normalizedGenres.some((genre) =>
          genre.includes(normalizedSearch),
        );

      const matchesCategory =
        category === "All" ||
        normalizedGenres.includes(category.toLowerCase());

      const matchesSection =
        getMovieStatus(movie) === activeSection;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesSection
      );
    });
  }, [movies, search, category, activeSection]);

  function scrollToMovies() {
    setMobileMenu(false);

    document
      .getElementById("movies")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  function handleSectionChange(section) {
    setActiveSection(section);
    setCategory("All");
    setSearch("");
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      setMobileMenu(false);

      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setApiError(
        "Unable to log out right now. Please try again.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  const publicNavLinks = [
    { label: "Home", href: "/" },
    { label: "Movies", href: "#movies" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080b12] text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080b12]/95 backdrop-blur-xl">
        <nav className="mx-auto flex min-h-20 max-w-[1440px] items-center justify-between gap-4 px-5 py-3 lg:px-10">
          {/* Logo */}
          <Link
            to="/"
            onClick={() => setMobileMenu(false)}
            className="flex shrink-0 items-center gap-2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white">
              <Clapperboard size={23} />
            </span>

            <span className="text-xl font-black tracking-wide sm:text-2xl">
              CINE<span className="text-red-500">BOOK</span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-5 lg:flex xl:gap-8">
            {publicNavLinks.map((item) =>
              item.href === "/" ? (
                <Link
                  key={item.label}
                  to={item.href}
                  className="text-sm font-medium text-white transition hover:text-red-400"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium text-gray-300 transition hover:text-red-400"
                >
                  {item.label}
                </a>
              ),
            )}

            {isLoggedIn && (
              <Link
                to="/my-bookings"
                className="text-sm font-medium text-gray-300 transition hover:text-red-400"
              >
                My Tickets
              </Link>
            )}

            {isAdmin && (
              <>
                <Link
                  to="/admin"
                  className="text-sm font-medium text-gray-300 transition hover:text-red-400"
                >
                  Admin Dashboard
                </Link>

                <Link
                  to="/admin/movies"
                  className="text-sm font-medium text-gray-300 transition hover:text-red-400"
                >
                  Manage Movies
                </Link>

                <Link
                  to="/admin/theaters"
                  className="text-sm font-medium text-gray-300 transition hover:text-red-400"
                >
                  Manage Theaters
                </Link>
              </>
            )}
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 md:flex">
            {isLoggedIn ? (
              <>
                <span className="hidden max-w-32 truncate text-sm text-gray-300 xl:inline">
                  Hi, {user?.name || user?.fullName || "User"}
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold transition hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:text-white"
                >
                  <LogIn size={16} />
                  Login
                </Link>

                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold transition hover:bg-red-400"
                >
                  <UserPlus size={16} />
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile / tablet menu toggle */}
          <button
            type="button"
            aria-label={mobileMenu ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenu}
            onClick={() => setMobileMenu((previous) => !previous)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 transition hover:bg-white/10 md:hidden"
          >
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="border-t border-white/10 bg-[#0c101a] px-5 py-5 md:hidden">
            <div className="flex flex-col gap-4">
              <Link
                to="/"
                onClick={() => setMobileMenu(false)}
                className="py-1 text-sm font-medium text-gray-200 hover:text-red-400"
              >
                Home
              </Link>

              <button
                type="button"
                onClick={scrollToMovies}
                className="py-1 text-left text-sm font-medium text-gray-200 hover:text-red-400"
              >
                Movies
              </button>

              {isLoggedIn && (
                <Link
                  to="/my-bookings"
                  onClick={() => setMobileMenu(false)}
                  className="py-1 text-sm font-medium text-gray-200 hover:text-red-400"
                >
                  My Tickets
                </Link>
              )}

              {isAdmin && (
                <>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenu(false)}
                    className="py-1 text-sm font-medium text-gray-200 hover:text-red-400"
                  >
                    Admin Dashboard
                  </Link>

                  <Link
                    to="/admin/movies"
                    onClick={() => setMobileMenu(false)}
                    className="py-1 text-sm font-medium text-gray-200 hover:text-red-400"
                  >
                    Manage Movies
                  </Link>

                  <Link
                    to="/admin/theaters"
                    onClick={() => setMobileMenu(false)}
                    className="py-1 text-sm font-medium text-gray-200 hover:text-red-400"
                  >
                    Manage Theaters
                  </Link>
                </>
              )}

              <div className="border-t border-white/10 pt-4">
                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold transition hover:border-red-500 disabled:opacity-60"
                  >
                    {loggingOut ? "Logging out..." : "Logout"}
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenu(false)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-3 text-sm font-semibold transition hover:bg-white/10"
                    >
                      <LogIn size={16} />
                      Login
                    </Link>

                    <Link
                      to="/signup"
                      onClick={() => setMobileMenu(false)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-red-500 px-3 py-3 text-sm font-bold transition hover:bg-red-400"
                    >
                      <UserPlus size={16} />
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero section */}
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_80%_20%,rgba(127,29,29,0.35),transparent_50%),linear-gradient(120deg,#080b12_20%,#17101a_60%,#080b12)]" />

          <div className="absolute right-[-10%] top-10 -z-10 h-72 w-72 rounded-full bg-red-600/10 blur-3xl sm:h-96 sm:w-96" />

          <div className="mx-auto grid min-h-[530px] max-w-[1440px] items-center gap-10 px-5 py-16 sm:py-20 lg:grid-cols-2 lg:px-10 lg:py-24">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-red-300 sm:text-sm">
                <Clapperboard size={16} />
                Your movie night starts here
              </div>

              <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                Every seat.
                <br />
                Every story.
                <br />
                <span className="text-red-500">
                  One experience.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-gray-400 sm:text-lg">
                Discover the latest movies, explore showtimes,
                choose your favourite seats, and book your next
                cinema experience with CINEBOOK.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={scrollToMovies}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-4 font-bold text-white transition hover:bg-red-400"
                >
                  Explore Movies
                  <ArrowRight size={18} />
                </button>

                <Link
                  to={isLoggedIn ? "/my-bookings" : "/login"}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-4 font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
                >
                  <Ticket size={18} />
                  {isLoggedIn ? "My Tickets" : "Get Started"}
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-gray-400">
                <span className="flex items-center gap-2">
                  <Film size={17} className="text-red-400" />
                  Latest Movies
                </span>

                <span className="flex items-center gap-2">
                  <Ticket size={17} className="text-red-400" />
                  Easy Booking
                </span>

                <span className="flex items-center gap-2">
                  <Clock3 size={17} className="text-red-400" />
                  Choose Showtimes
                </span>
              </div>
            </div>

            {/* Decorative movie poster panel */}
            <div className="relative mx-auto hidden w-full max-w-lg lg:block">
              <div className="absolute inset-5 rounded-full bg-red-600/20 blur-3xl" />

              <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                      The big screen
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      Your next favourite film
                    </p>
                  </div>

                  <Clapperboard
                    size={30}
                    className="text-red-400"
                  />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="flex min-h-48 flex-col justify-end rounded-2xl border border-white/10 bg-gradient-to-br from-red-950 via-slate-900 to-black p-4">
                    <Film size={28} className="mb-auto text-red-400" />
                    <p className="text-xs uppercase tracking-widest text-gray-400">
                      Discover
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      New Stories
                    </p>
                  </div>

                  <div className="mt-8 flex min-h-48 flex-col justify-end rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950 via-slate-900 to-black p-4">
                    <Ticket
                      size={28}
                      className="mb-auto text-indigo-300"
                    />
                    <p className="text-xs uppercase tracking-widest text-gray-400">
                      Reserve
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      Your Seats
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={scrollToMovies}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-semibold text-red-300 transition hover:bg-red-500/20"
                >
                  Find your next movie
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Movie catalogue */}
        <section
          id="movies"
          className="scroll-mt-24 mx-auto max-w-[1440px] px-5 py-16 lg:px-10 lg:py-20"
        >
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-400">
                Explore the collection
              </p>

              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                Movies for every mood
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400 sm:text-base">
                Find your next favourite film and explore
                available movie details and booking options.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full lg:max-w-sm">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search movies or genres..."
                aria-label="Search movies"
                className="w-full rounded-xl border border-white/10 bg-[#101522] py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-red-500"
              />
            </div>
          </div>

          {/* Catalogue filters */}
          <div className="mt-8 flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              {["Now Showing", "Coming Soon"].map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => handleSectionChange(section)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeSection === section
                      ? "bg-red-500 text-white"
                      : "border border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                    category === item
                      ? "border-red-500 bg-red-500/10 text-red-400"
                      : "border-white/10 text-gray-400 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* API error */}
          {apiError && (
            <div
              role="alert"
              className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
            >
              <p>{apiError}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 rounded-lg border border-red-500/30 px-3 py-2 font-semibold transition hover:bg-red-500/10"
              >
                Reload page
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="grid grid-cols-1 gap-5 pt-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#101522]"
                >
                  <div className="h-64 animate-pulse bg-white/5 sm:h-72" />

                  <div className="space-y-3 p-4">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
                    <div className="h-11 animate-pulse rounded-xl bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Movie cards */}
          {!loading && !apiError && filteredMovies.length > 0 && (
            <>
              <div className="mt-8 flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Showing{" "}
                  <span className="font-semibold text-white">
                    {filteredMovies.length}
                  </span>{" "}
                  {filteredMovies.length === 1 ? "movie" : "movies"}
                </p>

                {(search || category !== "All") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setCategory("All");
                    }}
                    className="text-sm font-semibold text-red-400 transition hover:text-red-300"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredMovies.map((movie) => (
                  <MovieCard
                    key={movie._id || movie.slug}
                    movie={movie}
                  />
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {!loading && !apiError && filteredMovies.length === 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-16 text-center">
              <Search
                size={36}
                className="mx-auto text-gray-500"
              />

              <h3 className="mt-4 text-xl font-bold">
                No movies found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                {movies.length === 0
                  ? "There are no published movies to display yet."
                  : "Try another search term or choose a different category or movie section."}
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                  setActiveSection("Now Showing");
                }}
                className="mt-6 rounded-xl bg-red-500 px-5 py-3 text-sm font-bold transition hover:bg-red-400"
              >
                Reset filters
              </button>
            </div>
          )}
        </section>

        {/* Bottom call to action */}
        <section className="mx-auto max-w-[1440px] px-5 pb-16 lg:px-10">
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-red-500/20 bg-gradient-to-r from-red-950/60 via-[#17111a] to-[#101522] p-7 sm:p-10 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">
                Your seat is waiting
              </p>

              <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                Make tonight a movie night.
              </h2>

              <p className="mt-3 text-sm text-gray-400">
                Find a film, choose your seats, and enjoy the show.
              </p>
            </div>

            <button
              type="button"
              onClick={scrollToMovies}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-4 font-bold transition hover:bg-red-400"
            >
              Browse Movies
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-5 py-8 text-center text-sm text-gray-500">
        <p>
          © {new Date().getFullYear()} CINEBOOK. Built for
          people who love movies.
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-5">
          <Link
            to="/"
            className="transition hover:text-white"
          >
            Home
          </Link>

          {isLoggedIn && (
            <Link
              to="/my-bookings"
              className="transition hover:text-white"
            >
              My Tickets
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              className="transition hover:text-white"
            >
              Admin Dashboard
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
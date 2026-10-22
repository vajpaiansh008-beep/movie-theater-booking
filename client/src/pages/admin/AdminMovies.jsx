import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import CreateMovieForm from "../../components/admin/CreateMovieForm";
import EditMovieForm from "../../components/admin/EditMovieForm";

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1"
).replace(/\/api\/v1\/?$/, "");

function StatusBadge({ children }) {
  const styles = {
    published: "bg-emerald-500/10 text-emerald-400",
    draft: "bg-amber-500/10 text-amber-400",
    archived: "bg-slate-500/10 text-slate-400",
    upcoming: "bg-blue-500/10 text-blue-400",
    now_showing: "bg-emerald-500/10 text-emerald-400",
    ended: "bg-rose-500/10 text-rose-400",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[children] || "bg-white/10 text-slate-300"
      }`}
    >
      {String(children).replaceAll("_", " ")}
    </span>
  );
}

function Poster({ movie, compact = false }) {
  const [failed, setFailed] = useState(false);

  if (!movie.posterUrl || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-slate-800 text-center text-xs text-slate-500 ${
          compact ? "h-16 w-11" : "h-36 w-24"
        }`}
      >
        No poster
      </div>
    );
  }

  return (
    <img
      src={`${API_ORIGIN}${movie.posterUrl}`}
      alt={`${movie.title} poster`}
      className={`shrink-0 rounded-lg bg-slate-800 object-cover ${
        compact ? "h-16 w-11" : "h-36 w-24"
      }`}
      onError={() => setFailed(true)}
    />
  );
}

export default function AdminMovies() {
  const [movies, setMovies] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalMovies: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [releaseStatus, setReleaseStatus] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingMovieId, setDeletingMovieId] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const fetchMovies = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError("");

      try {
        const params = { page, limit: 12 };
        if (search.trim()) params.search = search.trim();
        if (status) params.status = status;
        if (releaseStatus) params.releaseStatus = releaseStatus;

        const response = await api.get("/admin/movies", { params });
        setMovies(response.data.data.movies);
        setPagination(response.data.data.pagination);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load movies. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [search, status, releaseStatus],
  );

  useEffect(() => {
    fetchMovies(1);
  }, [fetchMovies]);

  function handleSearch(event) {
    event.preventDefault();
    setSearch(searchInput);
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setReleaseStatus("");
  }

  function startEditing(movie) {
    setShowCreateForm(false);
    setEditingMovie(movie);
  }

  function handleMovieUpdated() {
    setEditingMovie(null);
    fetchMovies(pagination.currentPage);
  }

  async function handleDeleteMovie(movie) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${movie.title}"?\n\n` +
        "This action cannot be undone. Movies linked to existing shows cannot be deleted.",
    );

    if (!confirmed) return;

    setDeletingMovieId(movie._id);
    setError("");
    setActionMessage("");

    try {
      await api.delete(`/admin/movies/${movie._id}`);

      setActionMessage(`"${movie.title}" was deleted successfully.`);

      // If the last movie on this page is deleted,
      // move back one page when possible.
      const nextPage =
        movies.length === 1 && pagination.currentPage > 1
          ? pagination.currentPage - 1
          : pagination.currentPage;

      await fetchMovies(nextPage);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete this movie. Please try again.",
      );
    } finally {
      setDeletingMovieId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <Link
              to="/admin"
              className="text-xl font-bold tracking-wider text-red-500"
            >
              CINEBOOK
            </Link>
            <p className="mt-1 text-sm text-slate-400">Admin workspace</p>
          </div>

          <Link
            to="/admin"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="flex flex-wrap items-end justify-between gap-4 py-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
              Catalogue management
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Movies</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage your cinema&apos;s movie catalogue.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3">
              <p className="text-sm text-slate-400">Total matching movies</p>
              <p className="mt-1 text-2xl font-bold">
                {pagination.totalMovies}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingMovie(null);
                setShowCreateForm((previous) => !previous);
              }}
              className="rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold transition hover:bg-red-500"
            >
              {showCreateForm ? "Close Form" : "+ Add Movie"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <form
            onSubmit={handleSearch}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search title or slug..."
              aria-label="Search movies"
              className="min-w-0 rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-red-500"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by publication status"
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-red-500"
            >
              <option value="">All publication statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={releaseStatus}
              onChange={(event) => setReleaseStatus(event.target.value)}
              aria-label="Filter by release status"
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-red-500"
            >
              <option value="">All release statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="now_showing">Now showing</option>
              <option value="ended">Ended</option>
            </select>

            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold transition hover:bg-red-500"
            >
              Search movies
            </button>
          </form>

          {showCreateForm && (
            <CreateMovieForm
              onCancel={() => setShowCreateForm(false)}
              onSuccess={() => {
                setShowCreateForm(false);
                resetFilters();
                // State changes update the query; the effect reloads the catalogue.
                if (!search && !status && !releaseStatus) fetchMovies(1);
              }}
            />
          )}

          {editingMovie && (
            <EditMovieForm
              key={editingMovie._id}
              movie={editingMovie}
              onCancel={() => setEditingMovie(null)}
              onSuccess={handleMovieUpdated}
            />
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              {pagination.totalMovies} matching movie(s)
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="text-sm text-slate-300 underline underline-offset-4 hover:text-white"
            >
              Clear filters
            </button>
          </div>

          {actionMessage && (
            <div
              role="status"
              className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
            >
              {actionMessage}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => fetchMovies(pagination.currentPage)}
                className="mt-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-slate-400">
              Loading movies...
            </div>
          ) : !error && movies.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="text-lg font-semibold">No movies found</h2>
              <p className="mt-2 text-sm text-slate-400">
                Try another search or clear your filters.
              </p>
            </div>
          ) : !error ? (
            <>
              {/* Mobile catalogue */}
              <div className="mt-6 grid gap-4 md:hidden">
                {movies.map((movie) => (
                  <article
                    key={movie._id}
                    className="flex gap-4 rounded-xl border border-white/10 bg-slate-900/70 p-3"
                  >
                    <Poster movie={movie} />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold">{movie.title}</h2>
                      <p className="mt-1 break-all text-xs text-slate-400">
                        {movie.slug}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge>{movie.status}</StatusBadge>
                        <StatusBadge>{movie.releaseStatus}</StatusBadge>
                      </div>

                      <p className="mt-3 text-xs text-slate-400">
                        {movie.durationMinutes} min · {movie.certification}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(movie)}
                          disabled={Boolean(deletingMovieId)}
                          className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
                        >
                          Edit movie
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMovie(movie)}
                          disabled={Boolean(deletingMovieId)}
                          className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingMovieId === movie._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop catalogue */}
              <div className="mt-6 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-4">Movie</th>
                      <th className="px-4 py-4">Duration</th>
                      <th className="px-4 py-4">Publication</th>
                      <th className="px-4 py-4">Release</th>
                      <th className="px-4 py-4">Certification</th>
                      <th className="px-4 py-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {movies.map((movie) => (
                      <tr
                        key={movie._id}
                        className="transition hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Poster movie={movie} compact />
                            <div>
                              <p className="font-semibold">{movie.title}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {movie.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {movie.durationMinutes} min
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge>{movie.status}</StatusBadge>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge>{movie.releaseStatus}</StatusBadge>
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {movie.certification}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(movie)}
                              disabled={Boolean(deletingMovieId)}
                              className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteMovie(movie)}
                              disabled={Boolean(deletingMovieId)}
                              className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingMovieId === movie._id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                <p className="text-sm text-slate-400">
                  Page {pagination.currentPage} of{" "}
                  {Math.max(1, pagination.totalPages)}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!pagination.hasPreviousPage || loading}
                    onClick={() => fetchMovies(pagination.currentPage - 1)}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={!pagination.hasNextPage || loading}
                    onClick={() => fetchMovies(pagination.currentPage + 1)}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

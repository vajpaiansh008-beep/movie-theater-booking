import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link
            to="/"
            className="text-2xl font-bold tracking-wider text-red-500"
          >
            CINEBOOK
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Logout
          </button>
        </header>

        <section className="py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Administration
          </p>

          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Admin Dashboard
          </h1>

          <p className="mt-3 text-slate-400">
            Welcome back, {user?.name}. Manage your cinema from one place.
          </p>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-slate-400">Management</p>
            <h2 className="mt-3 text-xl font-semibold">Movies</h2>
            <p className="mt-2 text-sm text-slate-400">
              Add, edit, and manage your movie catalogue.
            </p>
            <Link
              to="/admin/movies"
              className="mt-5 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold transition hover:bg-red-500"
            >
              Manage movies
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-slate-400">Management</p>
            <h2 className="mt-3 text-xl font-semibold">Theater Management</h2>
            <p className="mt-2 text-sm text-slate-400">
              View theater locations, filter by city and status, and manage your
              cinema infrastructure.
            </p>
            <Link
              to="/admin/theaters"
              className="mt-5 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold transition hover:bg-red-500"
            >
              Manage theaters
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-slate-400">Management</p>
            <h2 className="mt-3 text-xl font-semibold">Show Scheduling</h2>
            <p className="mt-2 text-sm text-slate-400">
              Schedule screenings and handle conflicts.
            </p>
            <p className="mt-5 text-sm text-red-400">
              Coming in a later milestone
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const managementSections = [
  {
    title: "Movies",
    description:
      "Add movies, update details, upload posters, and manage your catalogue.",
    route: "/admin/movies",
    icon: "🎬",
    label: "Manage movies",
  },
  {
    title: "Theaters",
    description:
      "Manage theater locations, city information, and theater status.",
    route: "/admin/theaters",
    icon: "🏢",
    label: "Manage theaters",
  },
  {
    title: "Screens",
    description:
      "Configure screens, seat capacity, layouts, and screen status.",
    route: "/admin/screens",
    icon: "🖥️",
    label: "Manage screens",
  },
  {
    title: "Show Scheduling",
    description:
      "Schedule screenings, review showtimes, and cancel incorrect shows.",
    route: "/admin/shows",
    icon: "📅",
    label: "Manage shows",
  },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error("Unable to log out:", error);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        {/* Header and navigation */}
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/"
            aria-label="CINEBOOK home"
            className="text-2xl font-extrabold tracking-wider text-red-500 transition hover:text-red-400"
          >
            CINEBOOK
          </Link>

          <nav
            aria-label="Admin navigation"
            className="flex flex-wrap items-center gap-2"
          >
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/30 hover:bg-white/10"
            >
              <span aria-hidden="true">⌂</span>
              Home
            </Link>

            <Link
              to="/admin"
              className="inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300"
              aria-current="page"
            >
              Dashboard
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
            >
              Logout
            </button>
          </nav>
        </header>

        {/* Welcome section */}
        <section className="relative my-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-red-950/60 via-slate-900 to-slate-900 p-6 sm:my-10 sm:p-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-red-600/10 blur-3xl"
          />

          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-400 sm:text-sm">
              CINEBOOK Administration
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Admin Dashboard
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Welcome back{user?.name ? `, ${user.name}` : ""}. Manage your
              movies, theaters, screens, and show schedules from one place.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Visit customer home
              </Link>

              <Link
                to="/admin/shows"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                Manage showtimes
              </Link>
            </div>
          </div>
        </section>

        {/* Management section */}
        <section aria-labelledby="management-heading">
          <div className="mb-6">
            <h2
              id="management-heading"
              className="text-xl font-bold sm:text-2xl"
            >
              Management Center
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Choose a section to manage your cinema operations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
            {managementSections.map((section) => (
              <article
                key={section.route}
                className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition duration-200 hover:-translate-y-1 hover:border-red-500/40 hover:bg-white/[0.06] sm:p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-2xl">
                  <span aria-hidden="true">{section.icon}</span>
                </div>

                <h3 className="mt-5 text-lg font-bold">{section.title}</h3>

                <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">
                  {section.description}
                </p>

                <Link
                  to={section.route}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  {section.label}
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Quick navigation */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:mt-10 sm:p-6">
          <h2 className="text-lg font-bold">Quick Navigation</h2>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/admin/movies"
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Movies
            </Link>

            <Link
              to="/admin/theaters"
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Theaters
            </Link>

            <Link
              to="/admin/screens"
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Screens
            </Link>

            <Link
              to="/admin/shows"
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Show Scheduling
            </Link>
          </div>
        </section>

        <footer className="mt-10 border-t border-white/10 py-5 text-center text-xs text-slate-500">
          CINEBOOK Admin Workspace
        </footer>
      </div>
    </main>
  );
}

import { useEffect, useState } from "react";
import api from "../../lib/api";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-red-500";
const labelClass = "mb-2 block text-sm font-medium text-slate-300";

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function EditMovieForm({ movie, onCancel, onSuccess }) {
  const [form, setForm] = useState(null);
  const [poster, setPoster] = useState(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!movie) return;

    setForm({
      title: movie.title || "",
      slug: movie.slug || "",
      synopsis: movie.synopsis || "",
      durationMinutes: String(movie.durationMinutes ?? 120),
      genres: (movie.genres || []).join(", "),
      languages: (movie.languages || []).join(", "),
      releaseDate: toDateInput(movie.releaseDate),
      certification: movie.certification || "NR",
      director: movie.director || "",
      cast: (movie.cast || []).join(", "),
      status: movie.status || "draft",
      releaseStatus: movie.releaseStatus || "upcoming",
    });

    setPoster(null);
    setPosterPreview("");
    setErrors({});
    setSubmitError("");
  }, [movie]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "title" && !previous.slug
        ? {
            slug: value
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
          }
        : {}),
    }));

    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setSubmitError("");
  }

  function handlePosterChange(event) {
    const file = event.target.files?.[0];

    if (posterPreview) URL.revokeObjectURL(posterPreview);

    setPoster(file || null);
    setPosterPreview(file ? URL.createObjectURL(file) : "");
    setErrors((previous) => ({ ...previous, poster: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form || submitting) return;

    setErrors({});
    setSubmitError("");

    const genres = splitList(form.genres);
    const languages = splitList(form.languages);
    const cast = splitList(form.cast);

    const payload = {
      ...form,
      durationMinutes: Number(form.durationMinutes),
      genres,
      languages,
      cast,
      releaseDate: form.releaseDate
        ? new Date(`${form.releaseDate}T00:00:00.000Z`).toISOString()
        : "",
    };

    const data = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (["genres", "languages", "cast"].includes(key)) {
        data.append(key, JSON.stringify(value));
      } else {
        data.append(key, String(value));
      }
    });

    if (poster) data.append("poster", poster);

    setSubmitting(true);

    try {
      await api.patch(`/admin/movies/${movie._id}`, data);

      if (posterPreview) URL.revokeObjectURL(posterPreview);
      onSuccess?.();
    } catch (error) {
      const response = error.response?.data;

      if (Array.isArray(response?.errors)) {
        const fieldErrors = {};
        response.errors.forEach((item) => {
          fieldErrors[item.field] = item.message;
        });
        setErrors(fieldErrors);
      } else {
        setSubmitError(
          response?.message || "Unable to update the movie. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!form) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Edit movie</h2>
          <p className="mt-1 text-sm text-slate-400">
            Update movie details or optionally replace its poster.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10"
        >
          Cancel
        </button>
      </div>

      {submitError && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {submitError}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {[
          ["title", "Movie title", "text"],
          ["slug", "URL slug", "text"],
          ["durationMinutes", "Duration in minutes", "number"],
          ["releaseDate", "Release date", "date"],
          ["genres", "Genres (comma-separated)", "text"],
          ["languages", "Languages (comma-separated)", "text"],
          ["director", "Director", "text"],
          ["cast", "Cast (comma-separated)", "text"],
        ].map(([name, label, type]) => (
          <div key={name}>
            <label className={labelClass} htmlFor={`edit-${name}`}>
              {label} *
            </label>
            <input
              id={`edit-${name}`}
              name={name}
              type={type}
              value={form[name]}
              onChange={updateField}
              required={!["director", "cast"].includes(name)}
              min={type === "number" ? 1 : undefined}
              max={type === "number" ? 600 : undefined}
              maxLength={type === "text" ? 3000 : undefined}
              className={inputClass}
            />
            {errors[name] && (
              <p className="mt-1 text-sm text-red-400">{errors[name]}</p>
            )}
          </div>
        ))}

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="edit-synopsis">
            Synopsis *
          </label>
          <textarea
            id="edit-synopsis"
            name="synopsis"
            value={form.synopsis}
            onChange={updateField}
            required
            maxLength={3000}
            rows={4}
            className={inputClass}
          />
          {errors.synopsis && (
            <p className="mt-1 text-sm text-red-400">{errors.synopsis}</p>
          )}
        </div>

        {[
          [
            "certification",
            "Certification",
            ["U", "UA7+", "UA13+", "UA16+", "A", "NR"],
          ],
          ["status", "Publication status", ["draft", "published", "archived"]],
          [
            "releaseStatus",
            "Release status",
            ["upcoming", "now_showing", "ended"],
          ],
        ].map(([name, label, options]) => (
          <div key={name}>
            <label className={labelClass} htmlFor={`edit-${name}`}>
              {label}
            </label>
            <select
              id={`edit-${name}`}
              name={name}
              value={form[name]}
              onChange={updateField}
              className={inputClass}
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        ))}

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="edit-poster">
            Replace poster (optional)
          </label>
          <input
            id="edit-poster"
            type="file"
            accept="image/*"
            onChange={handlePosterChange}
            className={inputClass}
          />

          {errors.poster && (
            <p className="mt-1 text-sm text-red-400">{errors.poster}</p>
          )}

          {posterPreview ? (
            <img
              src={posterPreview}
              alt="New poster preview"
              className="mt-4 h-52 w-36 rounded-lg object-cover"
            />
          ) : movie.posterUrl ? (
            <p className="mt-2 text-xs text-slate-400">
              Current poster will be kept unless you select a replacement.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold hover:bg-red-500 disabled:opacity-50"
        >
          {submitting ? "Saving changes..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-white/15 px-5 py-3 text-sm hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

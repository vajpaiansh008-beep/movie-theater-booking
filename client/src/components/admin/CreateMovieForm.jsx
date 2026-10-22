import { useState } from "react";
import api from "../../lib/api";

const initialForm = {
  title: "",
  slug: "",
  synopsis: "",
  durationMinutes: "120",
  genres: "Action, Drama",
  languages: "English",
  releaseDate: "",
  certification: "NR",
  director: "",
  cast: "",
  status: "draft",
  releaseStatus: "upcoming",
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-red-500";

const labelClass = "mb-2 block text-sm font-medium text-slate-300";

export default function CreateMovieForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState(initialForm);
  const [poster, setPoster] = useState(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

    setPoster(file || null);
    setPosterPreview(file ? URL.createObjectURL(file) : "");
    setErrors((previous) => ({ ...previous, poster: undefined }));
  }

  function splitList(value) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErrors({});
    setSubmitError("");

    if (!poster) {
      setErrors({ poster: "Please select a movie poster." });
      return;
    }

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

    for (const [key, value] of Object.entries(payload)) {
      if (["genres", "languages", "cast"].includes(key)) {
        data.append(key, JSON.stringify(value));
      } else {
        data.append(key, String(value));
      }
    }

    data.append("poster", poster);

    setSubmitting(true);

    try {
      await api.post("/admin/movies", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setForm(initialForm);
      setPoster(null);
      setPosterPreview("");
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
          response?.message || "Unable to create the movie. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Add a movie</h2>
          <p className="mt-1 text-sm text-slate-400">
            Enter movie details and upload its poster.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
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
        <div>
          <label className={labelClass} htmlFor="title">
            Movie title *
          </label>
          <input
            id="title"
            name="title"
            value={form.title}
            onChange={updateField}
            required
            maxLength={150}
            className={inputClass}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-400">{errors.title}</p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="slug">
            URL slug *
          </label>
          <input
            id="slug"
            name="slug"
            value={form.slug}
            onChange={updateField}
            required
            maxLength={180}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Use lowercase letters, numbers, and single hyphens."
            className={inputClass}
          />
          {errors.slug && (
            <p className="mt-1 text-sm text-red-400">{errors.slug}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="synopsis">
            Synopsis *
          </label>
          <textarea
            id="synopsis"
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

        <div>
          <label className={labelClass} htmlFor="durationMinutes">
            Duration in minutes *
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min="1"
            max="600"
            step="1"
            required
            value={form.durationMinutes}
            onChange={updateField}
            className={inputClass}
          />
          {errors.durationMinutes && (
            <p className="mt-1 text-sm text-red-400">
              {errors.durationMinutes}
            </p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="releaseDate">
            Release date *
          </label>
          <input
            id="releaseDate"
            name="releaseDate"
            type="date"
            required
            value={form.releaseDate}
            onChange={updateField}
            className={inputClass}
          />
          {errors.releaseDate && (
            <p className="mt-1 text-sm text-red-400">{errors.releaseDate}</p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="genres">
            Genres * (comma-separated)
          </label>
          <input
            id="genres"
            name="genres"
            value={form.genres}
            onChange={updateField}
            required
            placeholder="Action, Drama, Sci-Fi"
            className={inputClass}
          />
          {errors.genres && (
            <p className="mt-1 text-sm text-red-400">{errors.genres}</p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="languages">
            Languages * (comma-separated)
          </label>
          <input
            id="languages"
            name="languages"
            value={form.languages}
            onChange={updateField}
            required
            placeholder="English, Hindi"
            className={inputClass}
          />
          {errors.languages && (
            <p className="mt-1 text-sm text-red-400">{errors.languages}</p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="certification">
            Certification
          </label>
          <select
            id="certification"
            name="certification"
            value={form.certification}
            onChange={updateField}
            className={inputClass}
          >
            {["U", "UA7+", "UA13+", "UA16+", "A", "NR"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="director">
            Director
          </label>
          <input
            id="director"
            name="director"
            value={form.director}
            onChange={updateField}
            maxLength={120}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="cast">
            Cast (comma-separated)
          </label>
          <input
            id="cast"
            name="cast"
            value={form.cast}
            onChange={updateField}
            placeholder="Actor One, Actor Two"
            className={inputClass}
          />
          {errors.cast && (
            <p className="mt-1 text-sm text-red-400">{errors.cast}</p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="status">
            Publication status
          </label>
          <select
            id="status"
            name="status"
            value={form.status}
            onChange={updateField}
            className={inputClass}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="releaseStatus">
            Release status
          </label>
          <select
            id="releaseStatus"
            name="releaseStatus"
            value={form.releaseStatus}
            onChange={updateField}
            className={inputClass}
          >
            <option value="upcoming">Upcoming</option>
            <option value="now_showing">Now showing</option>
            <option value="ended">Ended</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="poster">
            Movie poster *
          </label>
          <input
            id="poster"
            type="file"
            accept="image/*"
            required
            onChange={handlePosterChange}
            className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-white`}
          />

          {errors.poster && (
            <p className="mt-1 text-sm text-red-400">{errors.poster}</p>
          )}

          {posterPreview && (
            <div className="mt-4">
              <img
                src={posterPreview}
                alt="Selected poster preview"
                className="h-52 w-36 rounded-lg border border-white/10 object-cover"
              />
              <p className="mt-2 break-all text-xs text-slate-400">
                {poster?.name}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Creating movie..." : "Create movie"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-white/15 px-5 py-3 text-sm hover:bg-white/10 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    whatsappTicketOptIn: false,
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    const { name, value, checked, type } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signup(form);
      navigate("/login", {
        replace: true,
        state: { message: "Account created! Please log in." },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create your account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08090d] px-5 py-12 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8"
      >
        <Link to="/" className="text-sm text-amber-400">
          ← Back to CINEBOOK
        </Link>

        <h1 className="mt-8 text-3xl font-bold">Create account</h1>
        <p className="mt-2 text-sm text-gray-400">
          Sign up to book your favorite movies.
        </p>

        <label className="mt-6 block text-sm text-gray-300">
          Full name
          <input
            name="name"
            required
            autoComplete="name"
            value={form.name}
            onChange={updateField}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-400"
          />
        </label>

        <label className="mt-4 block text-sm text-gray-300">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={updateField}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-400"
          />
        </label>

        <label className="mt-4 block text-sm text-gray-300">
          Phone number
          <input
            name="phoneNumber"
            type="tel"
            required
            autoComplete="tel"
            value={form.phoneNumber}
            onChange={updateField}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-400"
          />
        </label>

        <label className="mt-4 block text-sm text-gray-300">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={updateField}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-400"
          />
        </label>

        <label className="mt-5 flex items-start gap-3 text-sm text-gray-300">
          <input
            name="whatsappTicketOptIn"
            type="checkbox"
            checked={form.whatsappTicketOptIn}
            onChange={updateField}
            className="mt-1 accent-amber-400"
          />
          <span>
            I'd like to receive my tickets through WhatsApp when available.
          </span>
        </label>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-7 w-full rounded-xl bg-amber-400 py-3 font-semibold text-black hover:bg-amber-300 disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already registered?{" "}
          <Link to="/login" className="text-amber-400 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}

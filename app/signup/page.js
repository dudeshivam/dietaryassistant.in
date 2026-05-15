"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { MedicalSafetyNote } from "@/components/legal-content";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      if (!acceptedLegal) {
        setErrorMessage("Please accept the Terms, Privacy Policy, and Medical Disclaimer to continue.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        router.push("/onboarding");
        router.refresh();
      }
    } catch (error) {
      setErrorMessage(error.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Create your account</h1>
        <p className="mt-2 text-sm text-slate-600">Start with a simple profile and daily plan.</p>
        <MedicalSafetyNote className="mt-3 rounded-md bg-amber-50 p-3 text-amber-800" />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSignup();
          }}
          className="mt-6 space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <input
              checked={acceptedLegal}
              className="mt-1 h-4 w-4"
              onChange={(event) => setAcceptedLegal(event.target.checked)}
              required
              type="checkbox"
            />
            <span>
              I agree to the{" "}
              <Link className="font-semibold text-emerald-700 hover:underline" href="/terms">Terms</Link>,{" "}
              <Link className="font-semibold text-emerald-700 hover:underline" href="/privacy">Privacy Policy</Link>, and{" "}
              <Link className="font-semibold text-emerald-700 hover:underline" href="/disclaimer">Medical Disclaimer</Link>.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {errorMessage && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}

          <button
            className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            disabled={loading}
            type="submit"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-medium text-emerald-700 hover:underline" href="/login">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}

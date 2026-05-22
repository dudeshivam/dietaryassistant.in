"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { MedicalSafetyNote } from "@/components/legal-content";
import { BrandMark, BrandWordmark } from "@/components/brand-mark";

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

      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.error || "Failed to create account.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setErrorMessage(
          result.existingUserConfirmed
            ? "Your existing account was repaired. Enter the original password for this email to log in."
            : error.message || "Account created, but login failed. Please try logging in."
        );
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } catch (error) {
      setErrorMessage(error.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="premium-card w-full max-w-md p-6">
        <div className="flex items-center gap-3">
          <BrandMark className="h-12 w-12" />
          <BrandWordmark />
        </div>
        <h1 className="mt-8 text-3xl font-semibold text-white">Create your account</h1>
        <p className="mt-2 text-sm text-slate-300">Start with a simple profile and adaptive daily plan.</p>
        <MedicalSafetyNote className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300" />

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
              className="mt-1 w-full rounded-xl border px-3 py-3 outline-none focus:border-blue-400"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
            <input
              checked={acceptedLegal}
              className="mt-1 h-4 w-4"
              onChange={(event) => setAcceptedLegal(event.target.checked)}
              required
              type="checkbox"
            />
            <span>
              I agree to the{" "}
              <Link className="font-semibold text-blue-300 hover:text-blue-200" href="/terms">Terms</Link>,{" "}
              <Link className="font-semibold text-blue-300 hover:text-blue-200" href="/privacy">Privacy Policy</Link>, and{" "}
              <Link className="font-semibold text-blue-300 hover:text-blue-200" href="/disclaimer">Medical Disclaimer</Link>.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-3 outline-none focus:border-blue-400"
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {errorMessage && <p className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{errorMessage}</p>}

          <button
            className="premium-button w-full px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-300">
          Already have an account?{" "}
          <Link className="font-medium text-blue-300 hover:text-blue-200" href="/login">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}

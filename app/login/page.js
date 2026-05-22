"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { BrandMark, BrandWordmark } from "@/components/brand-mark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function getLoginErrorMessage(loginError) {
    const message = loginError?.message || "";

    if (/email.*not.*confirmed/i.test(message)) {
      return "Your account needs to be repaired because email confirmation was enabled. Create the account again with the same email and password, then log in.";
    }

    if (/invalid.*credentials/i.test(message)) {
      return "Invalid email or password. If you just created this account earlier, create it again with the same email to finish setup.";
    }

    return message || "Unable to log in.";
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) {
        setError(getLoginErrorMessage(loginError));
        setLoading(false);
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      router.push(profile ? "/dashboard" : "/onboarding");
      router.refresh();
    } catch (error) {
      setError(error.message || "Failed to fetch");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="premium-card w-full max-w-md p-6">
        <div className="flex items-center gap-3">
          <BrandMark className="h-12 w-12" />
          <BrandWordmark />
        </div>
        <h1 className="mt-8 text-3xl font-semibold text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-300">Log in to continue your adaptive health coaching.</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
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

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-3 outline-none focus:border-blue-400"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

          <button
            className="premium-button w-full px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-300">
          New here?{" "}
          <Link className="font-medium text-blue-300 hover:text-blue-200" href="/signup">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}

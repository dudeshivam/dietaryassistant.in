"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getInitialTrialFields } from "@/lib/subscription";
import { MedicalSafetyNote } from "@/components/legal-content";
import { BrandMark, BrandWordmark } from "@/components/brand-mark";

function getOnboardingErrorMessage(error) {
  const message = error?.message || "";

  if (message.includes("lifestyle_description")) {
    return "Your live database is missing the lifestyle_description column. Run supabase/live-production-fix.sql in the Supabase SQL editor, then try again.";
  }

  return message || "Unable to save your profile.";
}

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    age: "",
    height: "",
    weight: "",
    goal: "fat loss",
    diet_type: "veg",
    activity_level: "moderate",
    health_notes: "",
    lifestyle: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser();
      setUser(currentUser);
    }

    loadUser();
  }, [supabase]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (!user) {
      setError("Please log in again.");
      setLoading(false);
      return;
    }

    const { error: saveError } = await supabase.from("users").upsert({
      id: user.id,
      email: user.email,
      name: form.name,
      age: Number(form.age),
      height: Number(form.height),
      weight: Number(form.weight),
      goal: form.goal,
      diet_type: form.diet_type,
      activity_level: form.activity_level,
      health_notes: form.health_notes,
      lifestyle: form.lifestyle,
      lifestyle_description: form.lifestyle,
      user_timezone: "Asia/Kolkata",
      ...getInitialTrialFields(),
      updated_at: new Date().toISOString()
    });

    if (saveError) {
      setError(getOnboardingErrorMessage(saveError));
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <section className="premium-card mx-auto w-full max-w-2xl p-6">
        <div className="flex items-center gap-3">
          <BrandMark className="h-12 w-12" />
          <BrandWordmark />
        </div>
        <h1 className="mt-8 text-3xl font-semibold text-white">Tell us about yourself</h1>
        <p className="mt-2 text-sm text-slate-300">This helps your coach build a plan that fits your real day.</p>
        <MedicalSafetyNote className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300" />

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-3 outline-none focus:border-blue-400"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Age</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-3 outline-none focus:border-blue-400"
              type="number"
              min="1"
              max="120"
              value={form.age}
              onChange={(event) => updateField("age", event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Height cm</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-3 outline-none focus:border-blue-400"
              type="number"
              min="1"
              value={form.height}
              onChange={(event) => updateField("height", event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Weight kg</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-3 outline-none focus:border-blue-400"
              type="number"
              min="1"
              value={form.weight}
              onChange={(event) => updateField("weight", event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Goal</span>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-3 outline-none focus:border-blue-400"
              value={form.goal}
              onChange={(event) => updateField("goal", event.target.value)}
            >
              <option value="fat loss">Fat loss</option>
              <option value="muscle gain">Muscle gain</option>
              <option value="balance">Balance</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Diet type</span>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-3 outline-none focus:border-blue-400"
              value={form.diet_type}
              onChange={(event) => updateField("diet_type", event.target.value)}
            >
              <option value="veg">Veg</option>
              <option value="non-veg">Non-veg</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Activity level</span>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-3 outline-none focus:border-blue-400"
              value={form.activity_level}
              onChange={(event) => updateField("activity_level", event.target.value)}
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Lifestyle description</span>
            <textarea
              className="mt-1 min-h-32 w-full rounded-xl border px-3 py-3 outline-none focus:border-blue-400"
              value={form.lifestyle}
              onChange={(event) => updateField("lifestyle", event.target.value)}
              required
            />
            <MedicalSafetyNote className="mt-2" />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Health notes or restrictions</span>
            <textarea
              className="mt-1 min-h-24 w-full rounded-xl border px-3 py-3 outline-none focus:border-blue-400"
              placeholder="Optional: illness, injury, allergies, digestion issues, foods to avoid"
              value={form.health_notes}
              onChange={(event) => updateField("health_notes", event.target.value)}
            />
          </label>

          {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200 sm:col-span-2">{error}</p>}

          <button
            className="premium-button px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
            disabled={loading}
            type="submit"
          >
            {loading ? "Saving..." : "Save and continue"}
          </button>
        </form>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSubscriptionNotice, getSubscriptionState } from "@/lib/subscription";
import { MedicalSafetyNote } from "@/components/legal-content";

const initialForm = {
  name: "",
  age: "",
  height: "",
  weight: "",
  goal: "fat loss",
  activity_level: "moderate",
  diet_type: "veg",
  lifestyle_description: "",
  user_timezone: "Asia/Kolkata",
  profile_image: "",
  subscription_status: "free",
  trial_end_date: "",
  subscription_end: ""
};

const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png"];

function getLocalDateString(date = new Date(), timeZone = "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function formatUpdatedAt(value) {
  if (!value) return "Not updated yet";

  const updatedDate = new Date(value);
  const today = new Date();
  const isToday = updatedDate.toDateString() === today.toDateString();

  if (isToday) return "Today";

  return updatedDate.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function normalizeGeneratedMeals(plan) {
  const meals = Array.isArray(plan?.meals) ? plan.meals : plan;

  if (!Array.isArray(meals)) return [];

  return meals.map((meal) => ({
    name: meal.name || meal.meal_name || "Meal",
    time: meal.time || "Time not set",
    type: ["home", "carry", "outside"].includes(meal.type) ? meal.type : "home",
    items: Array.isArray(meal.items) ? meal.items : meal.food_items || [],
    calories: Number(meal.calories) || 0,
    protein: Number(meal.protein) || 0,
    status: "pending",
    is_user_customized: Boolean(meal.is_user_customized)
  }));
}

function getProfileErrorMessage(error) {
  const message = error?.message || "";

  if (message.includes("lifestyle_description")) {
    return "Your live database is missing the lifestyle_description column. Run supabase/live-production-fix.sql in the Supabase SQL editor, then try again.";
  }

  if (message.toLowerCase().includes("bucket not found")) {
    return "The avatars storage bucket is missing. Run supabase/live-production-fix.sql in the Supabase SQL editor, then try again.";
  }

  return message || "Unable to save profile.";
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [imageCacheBust, setImageCacheBust] = useState(Date.now());
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function fetchUserProfile(currentUser = user, { showLoading = false } = {}) {
    if (!currentUser) return null;

    if (showLoading) setLoading(true);

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    if (profileError || !profile) {
      router.push("/onboarding");
      return null;
    }

    const lifestyleDescription = profile.lifestyle_description || profile.lifestyle || "";
    const currentSubscription = getSubscriptionState(profile);
    const subscriptionStatus = currentSubscription.shouldExpire ? "expired" : profile.subscription_status;

    if (currentSubscription.shouldExpire && profile.subscription_status !== "expired") {
      await supabase
        .from("users")
        .update({ is_premium: false, subscription_status: "expired" })
        .eq("id", currentUser.id);
    }

    setForm({
      name: profile.name || "",
      age: profile.age || "",
      height: profile.height || "",
      weight: profile.weight || "",
      goal: profile.goal || "fat loss",
      activity_level: profile.activity_level || "moderate",
      diet_type: profile.diet_type || "veg",
      lifestyle_description: lifestyleDescription,
      user_timezone: profile.user_timezone || "Asia/Kolkata",
      profile_image: profile.profile_image || "",
      subscription_status: subscriptionStatus,
      trial_end_date: profile.trial_end_date || "",
      subscription_end: profile.subscription_end || ""
    });
    setImageCacheBust(Date.now());
    setLastUpdated(profile.updated_at || profile.created_at || "");
    if (showLoading) setLoading(false);

    return profile;
  }

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);
      await fetchUserProfile(currentUser);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  const summary = useMemo(() => {
    return {
      goal: form.goal === "balance" ? "Lifestyle balance" : form.goal,
      weight: form.weight ? `${form.weight} kg` : "Not set"
    };
  }, [form.goal, form.weight]);
  const subscription = useMemo(() => getSubscriptionState(form), [form]);
  const subscriptionNotice = useMemo(() => getSubscriptionNotice(form), [form]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function getProfileImageSrc() {
    if (!form.profile_image) return "";

    const separator = form.profile_image.includes("?") ? "&" : "?";
    return `${form.profile_image}${separator}t=${imageCacheBust}`;
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setMessage("");

    if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) {
      setError("Please upload a JPG or PNG profile image.");
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      setError("Profile image must be 2 MB or smaller.");
      return;
    }

    setUploadingPhoto(true);

    try {
      if (!user) return;

      const extension = file.type === "image/png" ? "png" : "jpg";
      const filePath = `profiles/${user.id}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "0",
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      const publicUrl = data.publicUrl;
      const updatedAt = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("users")
        .update({
          profile_image: publicUrl,
          updated_at: updatedAt
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      await fetchUserProfile(user);
      setMessage("Profile photo updated.");
    } catch (photoError) {
      setError(getProfileErrorMessage(photoError));
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function validateForm() {
    if (!form.name.trim()) return "Name is required.";
    if (!Number(form.age) || Number(form.age) <= 0) return "Age must be a valid number.";
    if (!Number(form.height) || Number(form.height) <= 0) return "Height must be a valid number.";
    if (!Number(form.weight) || Number(form.weight) <= 0) return "Weight must be a valid number.";
    if (!form.lifestyle_description.trim()) return "Lifestyle description is required for AI diet generation.";
    return "";
  }

  async function saveProfile() {
    if (!user) return null;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return null;
    }

    const updatedAt = new Date().toISOString();
    const payload = {
      name: form.name.trim(),
      age: Number(form.age),
      height: Number(form.height),
      weight: Number(form.weight),
      goal: form.goal,
      activity_level: form.activity_level,
      diet_type: form.diet_type,
      lifestyle: form.lifestyle_description.trim(),
      lifestyle_description: form.lifestyle_description.trim(),
      user_timezone: form.user_timezone || "Asia/Kolkata",
      profile_image: form.profile_image || "",
      updated_at: updatedAt
    };

    const { error: updateError } = await supabase
      .from("users")
      .update(payload)
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    setForm((current) => ({
      ...current,
      ...payload
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setLastUpdated(updatedAt);

    return payload;
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await saveProfile();
      setMessage("Profile updated. Your next AI plan will use this data.");
    } catch (saveError) {
      setError(getProfileErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleRegeneratePlan() {
    if (!subscription.hasPremiumAccess) {
      setError("Your free trial ended. Upgrade to continue.");
      return;
    }

    setRegenerating(true);
    setError("");
    setMessage("");

    try {
      const savedProfile = await saveProfile();
      if (!savedProfile || !user) {
        setRegenerating(false);
        return;
      }

      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          age: savedProfile.age,
          height: savedProfile.height,
          weight: savedProfile.weight,
          goal: savedProfile.goal,
          diet_type: savedProfile.diet_type,
          activity_level: savedProfile.activity_level,
          health_notes: "",
          lifestyle: savedProfile.lifestyle_description,
          user_timezone: savedProfile.user_timezone || "Asia/Kolkata"
        })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to regenerate plan.");
      }

      const meals = normalizeGeneratedMeals(result.plan);
      if (meals.length === 0) {
        throw new Error("AI returned an empty plan.");
      }

      const today = getLocalDateString(new Date(), savedProfile.user_timezone || "Asia/Kolkata");
      const { error: planError } = await supabase
        .from("daily_plans")
        .upsert({
          user_id: user.id,
          date: today,
          meals,
          meal_statuses: {},
          streak_processed: false
        }, {
          onConflict: "user_id,date"
        });

      if (planError) {
        throw planError;
      }

      setMessage("Profile saved and today's journey regenerated.");
      router.refresh();
    } catch (regenerateError) {
      setError(getProfileErrorMessage(regenerateError) || "Unable to regenerate diet plan.");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm("Delete your Dietary Assistant account and personal data? This cannot be undone.");
    if (!confirmed) return;

    setDeletingAccount(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/delete-account", { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete account.");
      }

      await supabase.auth.signOut();
      router.push("/signup");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete account.");
    } finally {
      setDeletingAccount(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7faf8] px-4 py-6">
        <section className="mx-auto w-full max-w-5xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          Loading profile...
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-6">
      <section className="mx-auto w-full max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Personal space</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">My Profile</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Keep this current so your AI diet plan reflects your real day.
            </p>
            <MedicalSafetyNote className="mt-2 max-w-2xl" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              href="/settings"
            >
              Settings
            </Link>
            <button
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={handleLogout}
              type="button"
            >
              Log out
            </button>
          </div>
        </header>

        {(subscriptionNotice || subscription.status !== "premium") && (
          <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {subscriptionNotice || "Your Premium trial is active."}
                </p>
                <p className="mt-1 text-xs text-amber-700">Cancel anytime. No hidden charges.</p>
              </div>
              <Link className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" href="/upgrade">
                Upgrade
              </Link>
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-50 text-3xl font-semibold text-emerald-800">
            {form.profile_image ? (
              <img alt={form.name} className="h-full w-full object-cover" src={getProfileImageSrc()} />
            ) : (
              form.name.slice(0, 1).toUpperCase() || "U"
            )}
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">{form.name}</h2>
            <p className="mt-1 text-sm text-slate-600">Goal: {summary.goal}</p>
            <p className="mt-1 text-sm text-slate-600">Current weight: {summary.weight}</p>
            <p className="mt-2 text-xs font-semibold text-emerald-700">Last updated: {formatUpdatedAt(lastUpdated)}</p>
          </div>
          <button
            className="rounded-md border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            disabled={uploadingPhoto}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            {uploadingPhoto ? "Updating..." : "Change photo"}
          </button>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="premium-card p-4">
            <p className="text-xs font-semibold uppercase text-blue-300">Calories avg</p>
            <p className="mt-2 text-2xl font-semibold text-white">Adaptive</p>
            <p className="mt-1 text-xs text-slate-300">Changes with health state</p>
          </div>
          <div className="premium-card p-4">
            <p className="text-xs font-semibold uppercase text-blue-300">Protein avg</p>
            <p className="mt-2 text-2xl font-semibold text-white">Flexible</p>
            <p className="mt-1 text-xs text-slate-300">No pressure on recovery days</p>
          </div>
          <div className="premium-card p-4">
            <p className="text-xs font-semibold uppercase text-blue-300">Streak</p>
            <p className="mt-2 text-2xl font-semibold text-white">Coach-led</p>
            <p className="mt-1 text-xs text-slate-300">Consistency over perfection</p>
          </div>
        </section>

        <form className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]" onSubmit={handleSave}>
          <section className="rounded-lg border border-white/10 bg-[rgba(15,23,42,0.95)] p-5 shadow-[0_0_20px_rgba(59,130,246,0.12)]">
            <h2 className="text-lg font-semibold text-white">Personal Data</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-lg font-semibold text-[#E2E8F0]">Name</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="text-lg font-semibold text-[#E2E8F0]">Age</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                  min="1"
                  type="number"
                  value={form.age}
                  onChange={(event) => updateField("age", event.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="text-lg font-semibold text-[#E2E8F0]">Height</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                  min="1"
                  type="number"
                  value={form.height}
                  onChange={(event) => updateField("height", event.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="text-lg font-semibold text-[#E2E8F0]">Weight</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                  min="1"
                  type="number"
                  value={form.weight}
                  onChange={(event) => updateField("weight", event.target.value)}
                  required
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-lg font-semibold text-[#E2E8F0]">Goal</span>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                  value={form.goal}
                  onChange={(event) => updateField("goal", event.target.value)}
                >
                  <option value="fat loss">Fat loss</option>
                  <option value="muscle gain">Muscle gain</option>
                  <option value="balance">Lifestyle balance</option>
                </select>
              </label>

              <label className="block">
                <span className="text-lg font-semibold text-[#E2E8F0]">Activity Level</span>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                  value={form.activity_level}
                  onChange={(event) => updateField("activity_level", event.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label className="block">
                <span className="text-lg font-semibold text-[#E2E8F0]">Diet Type</span>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                  value={form.diet_type}
                  onChange={(event) => updateField("diet_type", event.target.value)}
                >
                  <option value="veg">Veg</option>
                  <option value="non-veg">Non-veg</option>
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="text-lg font-semibold text-[#E2E8F0]">Timezone</span>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                  value={form.user_timezone}
                  onChange={(event) => updateField("user_timezone", event.target.value)}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Chicago">America/Chicago</option>
                  <option value="America/Denver">America/Denver</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-[rgba(15,23,42,0.95)] p-5 shadow-[0_0_20px_rgba(59,130,246,0.12)]">
            <h2 className="text-lg font-semibold text-white">Your Lifestyle & Preferences</h2>
            <p className="mt-3 text-lg font-semibold text-[#E2E8F0]">Lifestyle Description</p>
            <p className="mt-1 text-sm text-[#CBD5E1]">
              Add routine, college/work timing, food habits, preferences, and what does or doesn&apos;t suit you.
            </p>
            <textarea
              className="mt-4 min-h-72 w-full rounded-md border border-white/15 bg-white px-3 py-2 outline-none focus:border-blue-500"
              placeholder="I go to university 9-4, eat oats before gym, take creatine..."
              value={form.lifestyle_description}
              onChange={(event) => updateField("lifestyle_description", event.target.value)}
              required
            />
            <MedicalSafetyNote className="mt-2 text-[#CBD5E1]" />
          </section>

          <input
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleImageChange}
            ref={fileInputRef}
            type="file"
          />

          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 lg:col-span-2">{error}</p>}
          {message && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 lg:col-span-2">{message}</p>}

          <div className="flex flex-wrap gap-3 lg:col-span-2">
            <button
              className="rounded-md bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              disabled={saving || regenerating}
              type="submit"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              className="rounded-md border border-emerald-600 bg-white px-5 py-3 font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-emerald-200 disabled:text-emerald-300"
              disabled={saving || regenerating || !subscription.hasPremiumAccess}
              onClick={handleRegeneratePlan}
              type="button"
            >
              {!subscription.hasPremiumAccess ? "Premium Required" : regenerating ? "Regenerating..." : "Regenerate Diet Plan"}
            </button>
            <button
              className="rounded-md border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
              disabled={saving || regenerating || deletingAccount}
              onClick={handleDeleteAccount}
              type="button"
            >
              {deletingAccount ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

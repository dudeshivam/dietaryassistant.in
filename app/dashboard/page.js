"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSubscriptionNotice, getSubscriptionState } from "@/lib/subscription";
import { MedicalSafetyNote } from "@/components/legal-content";
import CoinIcon from "@/components/coin-icon";

const defaultJourney = [
  { name: "Breakfast", time: "8:00 AM", type: "home", items: ["Plan loading"], calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0, status: "pending", is_user_customized: false },
  { name: "Water", time: "10:30 AM", type: "home", items: ["Drink 500 ml water"], calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0.5, status: "pending", is_user_customized: false },
  { name: "Snack", time: "11:30 AM", type: "outside", items: ["Banana or peanuts if busy"], calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0, status: "pending", is_user_customized: false },
  { name: "Lunch", time: "1:30 PM", type: "carry", items: ["Carry lunchbox"], calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0, status: "pending", is_user_customized: false },
  { name: "Evening snack", time: "5:00 PM", type: "outside", items: ["Tea with protein snack"], calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0, status: "pending", is_user_customized: false },
  { name: "Water", time: "6:30 PM", type: "home", items: ["Drink 500 ml water"], calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0.5, status: "pending", is_user_customized: false },
  { name: "Dinner", time: "8:30 PM", type: "home", items: ["Balanced dinner"], calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0, status: "pending", is_user_customized: false }
];

const legacyMealOrder = [
  ["breakfast", "Breakfast", "home"],
  ["water", "Water", "home"],
  ["snacks", "Snack", "outside"],
  ["lunch", "Lunch", "carry"],
  ["dinner", "Dinner", "home"]
];

const DAILY_REWARDS = {
  milestones: [
    { percent: 25, coins: 5 },
    { percent: 50, coins: 20 },
    { percent: 75, coins: 35 },
    { percent: 100, coins: 50 }
  ]
};

const HEALTH_CHECK_OPTIONS = ["Normal", "Low energy", "Stomach pain", "Sick", "Injury"];

const statusStyles = {
  completed: {
    node: "",
    dot: "border-emerald-500 bg-emerald-500 text-white",
    badge: "border-[#10B981] bg-[#10B98120] text-[#FFFFFF]"
  },
  pending: {
    node: "",
    dot: "border-amber-500 bg-amber-400 text-amber-950",
    badge: "border-[#F59E0B] bg-[#F59E0B20] text-[#FFFFFF]"
  },
  skipped: {
    node: "",
    dot: "border-red-500 bg-red-500 text-white",
    badge: "border-[#EF4444] bg-[#EF444420] text-[#FFFFFF]"
  }
};

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const match = value.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function extractNutritionFromItems(items, pattern) {
  const text = normalizeItems(items, "").join(" ");
  const match = text.match(pattern);
  return match ? Number(match[1]) : 0;
}

function estimateWaterLiters(meal, items) {
  const text = `${meal?.name || ""} ${normalizeItems(items, "").join(" ")}`.toLowerCase();
  const mlMatch = text.match(/(\d+(?:\.\d+)?)\s*ml/);
  const literMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:l|liter|litre|liters|litres)\b/);

  if (mlMatch) return Math.round((Number(mlMatch[1]) / 1000) * 10) / 10;
  if (literMatch) return Number(literMatch[1]);
  if (text.includes("water")) return 0.5;
  return 0;
}

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
}

function normalizeItems(items, fallback = "Not specified") {
  if (Array.isArray(items)) return items.filter(Boolean);
  if (typeof items === "string" && items.trim()) return [items.trim()];
  return [fallback];
}

function normalizeMeal(meal, fallback = {}) {
  const items = normalizeItems(meal?.items || meal?.food_items || meal?.reminder, fallback.item || "Not specified");
  const name = meal?.name || meal?.meal_name || fallback.name || "Meal";
  const time = meal?.time || fallback.time || "Time not set";
  const inferredScheduledTime = meal?.scheduled_time || fallback.scheduled_time || parseMealTimeToday(time, name)?.toISOString() || "";

  return {
    name,
    time,
    scheduled_time: inferredScheduledTime,
    type: ["home", "carry", "outside"].includes(meal?.type) ? meal.type : fallback.type || "home",
    items,
    calories: toNumber(meal?.calories) || extractNutritionFromItems(items, /(\d+(?:\.\d+)?)\s*(?:kcal|calories?)/i),
    protein: toNumber(meal?.protein) || extractNutritionFromItems(items, /(\d+(?:\.\d+)?)\s*g?\s*(?:protein|prot)/i),
    carbs: toNumber(meal?.carbs) || extractNutritionFromItems(items, /(\d+(?:\.\d+)?)\s*g?\s*(?:carbs?|carbohydrates?)/i),
    fat: toNumber(meal?.fat) || extractNutritionFromItems(items, /(\d+(?:\.\d+)?)\s*g?\s*fat/i),
    fiber: toNumber(meal?.fiber) || extractNutritionFromItems(items, /(\d+(?:\.\d+)?)\s*g?\s*fib(?:er|re)/i),
    water: toNumber(meal?.water) || estimateWaterLiters(meal, items),
    status: normalizeStatus(meal?.status || fallback.status),
    auto_skipped: Boolean(meal?.auto_skipped || meal?.autoSkipped),
    is_user_customized: Boolean(meal?.is_user_customized)
  };
}

function normalizePlanMeals(meals, mealStatuses = {}) {
  if (Array.isArray(meals)) {
    return meals.map((meal, index) => normalizeMeal(meal, defaultJourney[index] || {}));
  }

  if (meals && typeof meals === "object") {
    return legacyMealOrder
      .map(([key, title, type]) => {
        if (key === "water" && typeof meals.water === "string") {
          return normalizeMeal(
            { name: title, time: "10:30 AM", type, items: [meals.water], status: mealStatuses[key] },
            { name: title, type }
          );
        }

        const meal = meals[key];
        if (!meal) return null;

        return normalizeMeal(
          {
            ...meal,
            name: meal.meal_name || title,
            status: mealStatuses[key]
          },
          { name: title, type }
        );
      })
      .filter(Boolean);
  }

  return defaultJourney;
}

function getIcon(name) {
  const lower = name.toLowerCase();
  if (lower.includes("breakfast")) return "🍳";
  if (lower.includes("water")) return "💧";
  if (lower.includes("lunch")) return "🍱";
  if (lower.includes("evening") || lower.includes("tea")) return "☕";
  if (lower.includes("dinner")) return "🍛";
  return "🍌";
}

function parseMealTimeToday(time, mealName = "") {
  const rawTime = String(time || "").trim();
  const match = rawTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);

  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = match[3]?.toUpperCase();
  const lowerName = String(mealName || "").toLowerCase();

  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (!meridiem) {
    const likelyAfternoon = (
      lowerName.includes("lunch") ||
      lowerName.includes("evening") ||
      lowerName.includes("dinner") ||
      lowerName.includes("protein") ||
      (lowerName.includes("snack") && hours <= 7) ||
      (lowerName.includes("fruit") && hours <= 7)
    );

    if (likelyAfternoon && hours < 12) hours += 12;
  }

  if (hours > 23 || minutes > 59) return null;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date;
}

function getMealScheduledDate(meal) {
  if (meal?.scheduled_time) {
    const scheduledDate = new Date(meal.scheduled_time);
    if (!Number.isNaN(scheduledDate.getTime())) return scheduledDate;
  }

  return parseMealTimeToday(meal?.time, meal?.name);
}

function isBusyContext(profile) {
  const context = [
    profile?.lifestyle,
    profile?.lifestyle_description,
    profile?.activity_level
  ].join(" ").toLowerCase();

  return /\b(busy|class|college|school|office|work|shift|commut|travel|meeting)\b/.test(context);
}

function getAutoSkipBufferMinutes(meal, profile) {
  const name = String(meal?.name || "").toLowerCase();
  let buffer = 60;

  if (name.includes("water")) {
    buffer = 30;
  } else if (name.includes("snack") || name.includes("fruit") || name.includes("chana")) {
    buffer = 45;
  }

  return isBusyContext(profile) ? buffer + 15 : buffer;
}

function typeLabel(type) {
  if (type === "carry") return "Carry food";
  if (type === "outside") return "Outside option";
  return "Home";
}

function isRecoveryCheckIn(checkIn) {
  const status = String(checkIn?.status || "Normal").toLowerCase();
  return status !== "normal" || Boolean(String(checkIn?.text || "").trim());
}

function getNutritionTargets(profile, checkIn) {
  const weight = toNumber(profile?.weight) || 70;
  const activityMultiplier = {
    low: 28,
    moderate: 32,
    high: 36
  }[profile?.activity_level] || 32;
  const goalAdjustment = {
    "fat loss": -350,
    "muscle gain": 300,
    balance: 0
  }[profile?.goal] || 0;
  const proteinMultiplier = {
    "fat loss": 1.8,
    "muscle gain": 2,
    balance: 1.5
  }[profile?.goal] || 1.5;

  const recoveryMode = isRecoveryCheckIn(checkIn);
  const calories = Math.round(Math.max(weight * activityMultiplier + goalAdjustment, 1200) / 50) * 50;
  const protein = Math.round(weight * proteinMultiplier);

  return {
    calories: recoveryMode ? Math.round(calories * 0.75 / 50) * 50 : calories,
    protein: recoveryMode ? Math.round(protein * 0.75) : protein,
    carbs: recoveryMode ? 180 : Math.round(((calories * 0.45) / 4) / 5) * 5,
    fat: recoveryMode ? 45 : Math.round(((calories * 0.25) / 9) / 5) * 5,
    fiber: recoveryMode ? 18 : 30,
    water: recoveryMode ? 2.5 : 3
  };
}

function getDailyOutcome(meals) {
  const completedCount = meals.filter((meal) => normalizeStatus(meal.status) === "completed").length;
  const missedCount = meals.filter((meal) => normalizeStatus(meal.status) !== "completed").length;
  const fullComplete = meals.length > 0 && completedCount === meals.length;
  const partialComplete = completedCount > 0 && !fullComplete;

  return {
    completedCount,
    missedCount,
    fullComplete,
    partialComplete,
    streakContinues: fullComplete || missedCount <= 1
  };
}

function getReachedMilestones(meals) {
  if (!meals.length) return [];

  const completedCount = meals.filter((meal) => normalizeStatus(meal.status) === "completed").length;
  const completionPercent = (completedCount / meals.length) * 100;

  return DAILY_REWARDS.milestones.filter((milestone) => completionPercent >= milestone.percent);
}

function getMilestoneReason(percent) {
  return `Daily ${percent}% completion reward`;
}

function buildQuickMealSchedule(profile, checkIn = { status: "Normal", text: "" }) {
  const targets = getNutritionTargets(profile, checkIn);
  const proteinSnack = profile?.diet_type === "non-veg" ? "Eggs" : "Curd";
  const schedule = [
    ["Warm water", "8:00 AM", "home", "Drink 300 ml warm water", 0, 0, 0, 0, 0, 0.3],
    ["Breakfast", "8:20 AM", "home", "Simple breakfast: poha, oats, or upma", 350, 12, 55, 9, 6, 0],
    [proteinSnack, "9:30 AM", "carry", `${proteinSnack} for easy protein`, 160, 12, 10, 7, 0, 0],
    ["Water", "10:30 AM", "carry", "Drink 500 ml water", 0, 0, 0, 0, 0, 0.5],
    ["Fruit", "11:30 AM", "outside", "Banana or seasonal fruit", 110, 1, 27, 0, 3, 0],
    ["Lunchbox", "1:30 PM", "carry", "Roti/rice + dal or paneer/tofu sabzi", 550, 25, 75, 16, 9, 0],
    ["Water", "3:30 PM", "carry", "Drink 500 ml water", 0, 0, 0, 0, 0, 0.5],
    ["Evening snack", "4:30 PM", "outside", "Roasted chana or peanut butter sandwich", 300, 14, 34, 12, 6, 0],
    ["Protein source", "6:30 PM", "home", "Milk, protein shake, paneer, tofu, or eggs", 250, 24, 16, 8, 1, 0],
    ["Dinner", "8:30 PM", "home", "Light dinner: roti/rice + dal + vegetables", 500, 22, 68, 14, 8, 0]
  ];

  return schedule.map(([name, time, type, item, calories, protein, carbs, fat, fiber, water]) => ({
    name,
    time,
    scheduled_time: parseMealTimeToday(time, name)?.toISOString() || "",
    type,
    items: [item],
    calories,
    protein,
    carbs,
    fat,
    fiber,
    water,
    status: "pending",
    is_user_customized: false,
    target_hint: {
      calories: targets.calories,
      protein: targets.protein,
      water: targets.water
    }
  }));
}

function getAutoSkipInfo(meal, profile, now = new Date()) {
  const mealTime = getMealScheduledDate(meal);
  const threshold = getAutoSkipBufferMinutes(meal, profile);

  if (!mealTime) {
    return {
      mealTime: null,
      diffMinutes: null,
      threshold,
      statusText: "Time not available"
    };
  }

  const diffMinutes = Math.floor((now.getTime() - mealTime.getTime()) / (1000 * 60));
  let statusText = "";

  if (diffMinutes < -10) {
    statusText = `Due in ${Math.abs(diffMinutes)} minutes`;
  } else if (diffMinutes < 0) {
    statusText = `${meal.name} due in ${Math.abs(diffMinutes)} minutes`;
  } else if (diffMinutes <= threshold) {
    statusText = `Time for ${meal.name.toLowerCase()}`;
  } else {
    statusText = "Skipped automatically";
  }

  return {
    mealTime,
    diffMinutes,
    threshold,
    statusText
  };
}

function checkMealStatus(meals, profile, now = new Date()) {
  let changed = false;
  const nextMeals = meals.map((meal) => {
    if (normalizeStatus(meal.status) !== "pending") return meal;

    const info = getAutoSkipInfo(meal, profile, now);

    if (info.diffMinutes !== null && info.diffMinutes >= info.threshold) {
      changed = true;
      return {
        ...meal,
        status: "skipped",
        auto_skipped: true,
        autoSkipped: true
      };
    }

    return meal;
  });

  return { changed, meals: nextMeals };
}

function NutritionMetric({ label, current, target, unit }) {
  const remaining = Math.max(target - current, 0);
  const progress = Math.min(target ? (current / target) * 100 : 0, 100);
  const remainingLabel = `${label} left`;

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        background: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(255,255,255,0.1)",
        boxShadow: "0 0 20px rgba(59,130,246,0.12)"
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#CBD5E1]">{label}</p>
          <p className="mt-1 text-[42px] font-bold leading-none text-[#FFFFFF]">
            {current} / {target} {unit}
          </p>
        </div>
        <span className="rounded-full border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.15)] px-3 py-1 text-xs font-semibold text-[#93C5FD]">
          {remainingLabel}: {remaining} {unit}
        </span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #3B82F6, #60A5FA)"
          }}
        />
      </div>
    </div>
  );
}

function NutritionSummary({ feedback, isPerfectDay, nutrition, recoveryMode, targets }) {
  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-[#fffdf7] p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">
            {recoveryMode ? "Today's Coach Focus" : "Today's Nutrition"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {recoveryMode
              ? "Focus on light meals, hydration, and recovery today. Targets are softened."
              : "Calories, protein, carbs, fat, fiber, and water update as you complete each step."}
          </p>
        </div>
        {feedback && (
          <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
            {feedback}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <NutritionMetric
          current={nutrition.calories}
          label="Calories"
          target={targets.calories}
          unit="kcal"
        />
        <NutritionMetric
          current={nutrition.protein}
          label="Protein"
          target={targets.protein}
          unit="g"
        />
        <NutritionMetric
          current={nutrition.water}
          label="Water"
          target={targets.water}
          unit="L"
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <NutritionMetric
          current={nutrition.carbs}
          label="Carbs"
          target={targets.carbs}
          unit="g"
        />
        <NutritionMetric
          current={nutrition.fat}
          label="Fat"
          target={targets.fat}
          unit="g"
        />
        <NutritionMetric
          current={nutrition.fiber}
          label="Fiber"
          target={targets.fiber}
          unit="g"
        />
      </div>

      {isPerfectDay && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Perfect Nutrition Day 🔥
        </div>
      )}
    </section>
  );
}

function HealthCoachCheckIn({
  adaptingPlan,
  coachMessage,
  healthCheckIn,
  onHealthCheckInChange,
  onSubmit
}) {
  return (
    <section className="mt-6 rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-700">AI Health Coach</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">How are you feeling today?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Tell the coach what changed. The rest of your day will adapt around recovery, digestion, and practicality.
          </p>
        </div>
        {coachMessage && (
          <p className="max-w-sm rounded-full bg-[#0B1E3C]/10 px-4 py-2 text-sm font-semibold text-[#0B1E3C]">
            {coachMessage}
          </p>
        )}
      </div>

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <div className="flex flex-wrap gap-2">
          {HEALTH_CHECK_OPTIONS.map((option) => {
            const selected = healthCheckIn.status === option;

            return (
              <button
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  selected
                    ? "border-[#0B1E3C] bg-[#0B1E3C] text-white shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                }`}
                key={option}
                onClick={() => onHealthCheckInChange((current) => ({ ...current, status: option }))}
                type="button"
              >
                {option}
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Add details</span>
          <textarea
            className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            onChange={(event) => onHealthCheckInChange((current) => ({ ...current, text: event.target.value }))}
            placeholder="Example: I feel stomach pain after eating oats, or I have acidity today."
            value={healthCheckIn.text}
          />
        </label>

        <button
          className="rounded-md bg-[#0B1E3C] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:bg-[#102a55] disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={adaptingPlan}
          type="submit"
        >
          {adaptingPlan ? "Adapting plan..." : "Adapt my day"}
        </button>
      </form>
    </section>
  );
}

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function updateTime() {
      setTime(new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      }));
    }

    updateTime();
    const interval = window.setInterval(updateTime, 60000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <span className="rounded-full bg-white/60 px-2.5 py-1 text-xs font-normal text-slate-500">
      {time}
    </span>
  );
}

function CoinsTopBarLink({ coins }) {
  return (
    <Link
      aria-label="Open coin history"
      className="inline-flex h-11 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300"
      href="/coin-history"
    >
      <CoinIcon compact value={coins.balance} />
    </Link>
  );
}

function PremiumGate({ message = "Upgrade to Premium to continue." }) {
  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">{message}</p>
      <Link className="mt-3 inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" href="/upgrade">
        Upgrade to Premium
      </Link>
    </div>
  );
}

function SubscriptionBanner({ notice, subscription }) {
  if (!notice && subscription.status === "premium") return null;

  const isExpired = subscription.status === "expired";

  return (
    <section className={`mt-6 rounded-lg border p-4 shadow-sm ${isExpired ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${isExpired ? "text-red-800" : "text-amber-800"}`}>
            {notice || (subscription.status === "trial" ? "Your 30-day free trial is active." : "Premium is active.")}
          </p>
          {subscription.status === "trial" && (
            <p className="mt-1 text-xs text-amber-700">30-day free trial. Cancel anytime. No hidden charges.</p>
          )}
        </div>
        <Link className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" href="/upgrade">
          {isExpired ? "Upgrade Now" : "Manage Plan"}
        </Link>
      </div>
    </section>
  );
}

function JourneyNode({ meal, index, isLast, isPremiumAccess, now, onEdit, onStatusChange, profile }) {
  const status = normalizeStatus(meal.status);
  const styles = statusStyles[status] || statusStyles.pending;
  const summary = meal.items?.slice(0, 2).join(", ") || "Not specified";
  const isLocked = status === "completed" || status === "skipped";
  const lockedLabel = status === "completed" ? "✓ Completed" : meal.auto_skipped ? "Auto Skipped" : "✕ Skipped";
  const autoSkipInfo = getAutoSkipInfo(meal, profile, now);

  return (
    <div className="relative grid gap-4 pl-14 sm:grid-cols-[10rem_1fr] sm:gap-6 sm:pl-16">
      {!isLast && <div className="absolute left-5 top-12 h-[calc(100%-1rem)] w-0.5 bg-slate-200 sm:left-6" />}

      <div className={`absolute left-0 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg shadow-sm ${styles.dot} sm:h-12 sm:w-12`}>
        {getIcon(meal.name)}
      </div>

      <div className="pt-1 text-sm font-semibold text-[#94A3B8] sm:text-right">
        {meal.time || "Time not set"}
      </div>

      <article
        className={`rounded-lg border p-4 transition ${styles.node}`}
        style={{
          background: "rgba(15,23,42,0.95)",
          borderColor: "rgba(255,255,255,0.12)",
          boxShadow: "0 0 20px rgba(59,130,246,0.12)"
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-[#FFFFFF]">{meal.name}</h2>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${styles.badge}`}>
                {status}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#E2E8F0]">{summary}</p>
            {meal.auto_skipped && (
              <p className="mt-2 text-xs font-semibold text-[#CBD5E1]">Auto skipped due to no response.</p>
            )}
            {status === "pending" && autoSkipInfo.statusText && (
              <p className="mt-2 text-xs font-semibold text-[#93C5FD]">{autoSkipInfo.statusText}</p>
            )}
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#CBD5E1]">
            {typeLabel(meal.type)}
          </span>
        </div>

        <ul className="mt-4 grid gap-2 text-sm text-[#E2E8F0] sm:grid-cols-2">
          {meal.items?.map((item, itemIndex) => (
            <li className="rounded-md border border-white/10 bg-white/5 px-3 py-2" key={`${item}-${itemIndex}`}>
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#CBD5E1]">
          <span className="rounded-full bg-white/10 px-3 py-1">{meal.calories || 0} kcal</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{meal.protein || 0}g protein</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{meal.carbs || 0}g carbs</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{meal.fat || 0}g fat</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {isLocked ? (
            <button
              className="rounded-md border border-white/10 bg-slate-700/60 px-3 py-2 text-sm font-semibold text-[#CBD5E1] opacity-70"
              disabled
              type="button"
            >
              {lockedLabel}
            </button>
          ) : (
            <>
              <button
                className="rounded-md border border-emerald-500 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
                onClick={() => onStatusChange(index, "completed")}
                type="button"
              >
                Complete
              </button>
              <button
                className="rounded-md border border-red-400 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20"
                onClick={() => onStatusChange(index, "skipped")}
                type="button"
              >
                Skip
              </button>
              <button
                className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-[#E2E8F0] hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isPremiumAccess}
                onClick={() => onEdit(index)}
                type="button"
              >
                {isPremiumAccess ? "Edit" : "Premium"}
              </button>
            </>
          )}
        </div>
      </article>
    </div>
  );
}

function AutoSkipDebugPanel({ meals, now, profile }) {
  const rows = meals.map((meal) => {
    const info = getAutoSkipInfo(meal, profile, now);

    return {
      name: meal.name,
      status: normalizeStatus(meal.status),
      mealTime: info.mealTime
        ? info.mealTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "Invalid",
      diffMinutes: info.diffMinutes,
      threshold: info.threshold
    };
  });

  return (
    <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-[#CBD5E1]">
      <p className="font-semibold text-[#FFFFFF]">
        Current Time: {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {rows.map((row, index) => (
          <div className="rounded-md border border-white/10 bg-white/5 p-3" key={`${row.name}-${index}`}>
            <p className="font-semibold text-[#E2E8F0]">{row.name} · {row.status}</p>
            <p>Meal Time: {row.mealTime}</p>
            <p>Difference: {row.diffMinutes === null ? "N/A" : `${row.diffMinutes} minutes`}</p>
            <p>Auto Skip Threshold: {row.threshold} minutes</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditMealPanel({ meal, onCancel, onSave, saving }) {
  const [draft, setDraft] = useState(() => ({
    ...meal,
    items: meal.items?.length ? meal.items : [""]
  }));

  function updateItem(index, value) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? value : item))
    }));
  }

  function removeItem(index) {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      ...draft,
      items: draft.items.map((item) => item.trim()).filter(Boolean),
      status: normalizeStatus(draft.status),
      is_user_customized: true
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 px-4 py-4 sm:items-center sm:justify-center">
      <form className="w-full max-w-xl rounded-lg bg-white p-5 shadow-xl" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Edit meal</h2>
            <p className="mt-1 text-sm text-slate-600">Changes save to today&apos;s plan.</p>
          </div>
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700" onClick={onCancel} type="button">
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Meal name</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Time</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
              value={draft.time}
              onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))}
              required
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Food type</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
              value={draft.type}
              onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
            >
              <option value="home">Home</option>
              <option value="carry">Carry</option>
              <option value="outside">Outside</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Calories</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none"
              min="0"
              readOnly
              type="number"
              value={draft.calories || ""}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Protein g</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none"
              min="0"
              readOnly
              type="number"
              value={draft.protein || ""}
            />
          </label>
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Calories and macros are recalculated by AI when you save.
        </p>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-700">Food items</span>
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setDraft((current) => ({ ...current, items: [...current.items, ""] }))}
              type="button"
            >
              Add item
            </button>
          </div>

          {draft.items.map((item, index) => (
            <div className="flex gap-2" key={index}>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                value={item}
                onChange={(event) => updateItem(index, event.target.value)}
                placeholder="Food item"
              />
              <button
                className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                disabled={draft.items.length === 1 || saving}
                onClick={() => removeItem(index)}
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
          <MedicalSafetyNote />
        </div>

        <button
          className="mt-5 w-full rounded-md bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={saving}
          type="submit"
        >
          {saving ? "Calculating nutrition..." : "Save meal"}
        </button>
      </form>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const didLoadDashboard = useRef(false);
  const dashboardLoadStartRef = useRef(0);
  const generationStartRef = useRef(0);
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState(null);
  const [meals, setMeals] = useState([]);
  const [planId, setPlanId] = useState("");
  const [streakProcessed, setStreakProcessed] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [savingMeal, setSavingMeal] = useState(false);
  const [nutritionFeedback, setNutritionFeedback] = useState("");
  const [coinFeedback, setCoinFeedback] = useState("");
  const [healthCheckIn, setHealthCheckIn] = useState({ status: "Normal", text: "" });
  const [coachMessage, setCoachMessage] = useState("");
  const [adaptingPlan, setAdaptingPlan] = useState(false);
  const [coins, setCoins] = useState({ balance: 0, totalEarned: 0, totalSpent: 0 });
  const [transactions, setTransactions] = useState([]);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function logPerformance(label, startTime, extra = {}) {
    const durationMs = Math.round(performance.now() - startTime);
    console.log(`[Dashboard performance] ${label}: ${durationMs}ms`, extra);
  }

  async function processPreviousPlans(currentUserId, userProfile, coinTransactions, today) {
    const { data: unprocessedPlans, error: previousPlansError } = await supabase
      .from("daily_plans")
      .select("*")
      .eq("user_id", currentUserId)
      .eq("streak_processed", false)
      .lt("date", today)
      .order("date", { ascending: true })
      .limit(7);

    if (previousPlansError) {
      setError(previousPlansError.message);
      return userProfile;
    }

    if (!unprocessedPlans?.length) return userProfile;

    let nextStreak = Number(userProfile.current_streak) || 0;
    let coinsBalance = Math.max(Number(userProfile.coins_balance) || 0, 0);
    let totalCoinsEarned = Math.max(Number(userProfile.total_coins_earned) || 0, 0);
    let totalCoinsSpent = Math.max(Number(userProfile.total_coins_spent) || 0, 0);
    const newTransactions = [];
    const knownTransactions = [...coinTransactions];

    function hasTransaction(date, type, reason) {
      return knownTransactions.some((transaction) => (
        transaction.date === date &&
        transaction.type === type &&
        transaction.reason === reason
      ));
    }

    function queueTransaction({ coins: coinAmount, date, reason, type }) {
      if (hasTransaction(date, type, reason)) return;

      knownTransactions.push({ coins: coinAmount, date, reason, type });
      newTransactions.push({
        user_id: currentUserId,
        type,
        coins: coinAmount,
        reason,
        date
      });

      if (type === "penalty") {
        coinsBalance = Math.max(coinsBalance - coinAmount, 0);
        totalCoinsSpent += coinAmount;
      } else {
        coinsBalance += coinAmount;
        totalCoinsEarned += coinAmount;
      }
    }

    for (const plan of unprocessedPlans) {
      const planMeals = normalizePlanMeals(plan.meals, plan.meal_statuses || {});
      const outcome = getDailyOutcome(planMeals);

      getReachedMilestones(planMeals).forEach((milestone) => {
        queueTransaction({
          coins: milestone.coins,
          date: plan.date,
          reason: getMilestoneReason(milestone.percent),
          type: "reward"
        });
      });

      nextStreak = outcome.streakContinues ? nextStreak + 1 : 0;

    }

    if (newTransactions.length > 0) {
      const { data: savedTransactions, error: transactionsError } = await supabase
        .from("coin_transactions")
        .upsert(newTransactions, {
          onConflict: "user_id,date,type,reason",
          ignoreDuplicates: true
        })
        .select("*");

      if (transactionsError) {
        setError(transactionsError.message);
        return userProfile;
      }

      setTransactions((current) => [...(savedTransactions || []), ...current]);
    }

    const planIds = unprocessedPlans.map((plan) => plan.id);
    const { error: planUpdateError } = await supabase
      .from("daily_plans")
      .update({ streak_processed: true })
      .in("id", planIds);

    if (planUpdateError) {
      setError(planUpdateError.message);
      return userProfile;
    }

    const updatedProfile = {
      ...userProfile,
      current_streak: nextStreak,
      coins_balance: coinsBalance,
      total_coins_earned: totalCoinsEarned,
      total_coins_spent: totalCoinsSpent
    };

    const { error: profileUpdateError } = await supabase
      .from("users")
      .update({
        current_streak: nextStreak,
        coins_balance: coinsBalance,
        total_coins_earned: totalCoinsEarned,
        total_coins_spent: totalCoinsSpent
      })
      .eq("id", currentUserId);

    if (profileUpdateError) {
      setError(profileUpdateError.message);
      return userProfile;
    }

    setProfile(updatedProfile);
    setCoins({
      balance: coinsBalance,
      totalEarned: totalCoinsEarned,
      totalSpent: totalCoinsSpent
    });

    return updatedProfile;
  }

  function buildPlanRequestBody(userProfile, { checkIn = healthCheckIn, currentMeals = meals, reason = "Daily adaptation" } = {}) {
    return {
      age: userProfile.age,
      height: userProfile.height,
      weight: userProfile.weight,
      goal: userProfile.goal,
      diet_type: userProfile.diet_type,
      activity_level: userProfile.activity_level,
      lifestyle_description: userProfile.lifestyle_description || userProfile.lifestyle,
      lifestyle: userProfile.lifestyle_description || userProfile.lifestyle,
      health_check_status: checkIn.status,
      health_check_text: checkIn.text,
      adaptation_reason: reason,
      current_meals: currentMeals.map((meal) => ({
        name: meal.name,
        time: meal.time,
        status: normalizeStatus(meal.status)
      })),
      local_date: new Date().toISOString()
    };
  }

  function mergePreservedStatuses(generatedMeals, currentMeals) {
    return generatedMeals.map((meal, index) => {
      const currentMeal = currentMeals[index];
      const currentStatus = normalizeStatus(currentMeal?.status);

      if (currentStatus === "completed" || currentStatus === "skipped") {
        return { ...meal, status: currentStatus, auto_skipped: Boolean(currentMeal?.auto_skipped) };
      }

      return meal;
    });
  }

  async function regeneratePlan({ checkIn = healthCheckIn, currentMeals = meals, reason = "Daily adaptation" } = {}) {
    if (!profile || !userId) return;

    const currentSubscription = getSubscriptionState(profile);

    if (!currentSubscription.hasPremiumAccess) {
      setError("Your free trial ended. Upgrade to continue.");
      return;
    }

    setAdaptingPlan(true);
    setError("");

    try {
      const requestStart = performance.now();
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildPlanRequestBody(profile, { checkIn, currentMeals, reason }))
      });
      const result = await response.json();
      logPerformance("AI response received", requestStart, { reason });

      if (!response.ok) {
        setError(result.error || "Unable to adapt plan.");
        return;
      }

      const generatedMeals = normalizePlanMeals(result.plan?.meals || result.plan);
      const nextMeals = mergePreservedStatuses(generatedMeals, currentMeals);
      const today = new Date().toISOString().slice(0, 10);
      const databaseSaveStart = performance.now();

      if (planId) {
        const { data: savedPlan, error: savePlanError } = await supabase
          .from("daily_plans")
          .update({
            meals: nextMeals,
            meal_statuses: {},
            streak_processed: false
          })
          .eq("id", planId)
          .select("*")
          .single();

        if (savePlanError) {
          setError(savePlanError.message);
          return;
        }

        generationStartRef.current = requestStart;
        setMeals(normalizePlanMeals(savedPlan.meals));
        setStreakProcessed(Boolean(savedPlan.streak_processed));
        logPerformance("database save", databaseSaveStart, { mode: "update" });
      } else {
        const { data: savedPlan, error: savePlanError } = await supabase
          .from("daily_plans")
          .upsert({
            user_id: userId,
            meals: nextMeals,
            meal_statuses: {},
            streak_processed: false,
            date: today
          }, {
            onConflict: "user_id,date"
          })
          .select("*")
          .single();

        if (savePlanError) {
          setError(savePlanError.message);
          return;
        }

        generationStartRef.current = requestStart;
        setMeals(normalizePlanMeals(savedPlan.meals));
        setPlanId(savedPlan.id);
        setStreakProcessed(Boolean(savedPlan.streak_processed));
        logPerformance("database save", databaseSaveStart, { mode: "upsert" });
      }

      setCoachMessage(isRecoveryCheckIn(checkIn)
        ? "Let's keep it simple today. Recovery comes first."
        : "Your day has been rebalanced.");
      window.setTimeout(() => setCoachMessage(""), 5000);
      logPerformance("meal generation total", requestStart, { meals: nextMeals.length });
    } catch (planError) {
      setError(planError.message || "Unable to adapt plan.");
    } finally {
      setAdaptingPlan(false);
    }
  }

  useEffect(() => {
    async function loadDashboard() {
      if (didLoadDashboard.current) return;
      didLoadDashboard.current = true;
      dashboardLoadStartRef.current = performance.now();

      setLoading(true);
      setError("");

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !userProfile) {
        router.push("/onboarding");
        return;
      }

      const currentSubscription = getSubscriptionState(userProfile);
      const normalizedProfile = currentSubscription.shouldExpire
        ? { ...userProfile, subscription_status: "expired" }
        : userProfile;

      if (currentSubscription.shouldExpire && userProfile.subscription_status !== "expired") {
        await supabase
          .from("users")
          .update({ subscription_status: "expired" })
          .eq("id", user.id);
      }

      setProfile(normalizedProfile);
      setCoins({
        balance: Math.max(Number(userProfile.coins_balance) || 0, 0),
        totalEarned: Math.max(Number(userProfile.total_coins_earned) || 0, 0),
        totalSpent: Math.max(Number(userProfile.total_coins_spent) || 0, 0)
      });
      const today = new Date().toISOString().slice(0, 10);

      const { data: coinTransactions, error: coinTransactionsError } = await supabase
        .from("coin_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (coinTransactionsError) {
        setError(coinTransactionsError.message);
        setLoading(false);
        return;
      }

      setTransactions(coinTransactions || []);
      await processPreviousPlans(user.id, normalizedProfile, coinTransactions || [], today);

      const { data: existingPlan, error: planError } = await supabase
        .from("daily_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

      if (planError) {
        setError(planError.message);
        setLoading(false);
        return;
      }

      if (existingPlan) {
        const normalizedMeals = normalizePlanMeals(existingPlan.meals, existingPlan.meal_statuses || {});
        const autoSkipResult = checkMealStatus(normalizedMeals, normalizedProfile);
        const mealsToShow = autoSkipResult.meals;
        setMeals(mealsToShow);
        setPlanId(existingPlan.id);
        setStreakProcessed(Boolean(existingPlan.streak_processed));
        setLoading(false);
        logPerformance("dashboard load reused cached plan", dashboardLoadStartRef.current, { meals: mealsToShow.length });

        if (!Array.isArray(existingPlan.meals) || autoSkipResult.changed) {
          supabase.from("daily_plans").update({ meals: mealsToShow, meal_statuses: {} }).eq("id", existingPlan.id);
        }

        if (autoSkipResult.changed) {
          finalizeDailyStreak(mealsToShow, existingPlan.id, user.id);
        }

        return;
      }

      if (!currentSubscription.hasPremiumAccess) {
        setMeals(defaultJourney);
        setError("Your free trial ended. Upgrade to continue.");
        setLoading(false);
        return;
      }

      const quickMeals = buildQuickMealSchedule(userProfile);
      setMeals(quickMeals);
      setLoading(false);
      logPerformance("phase 1 schedule rendered", dashboardLoadStartRef.current, { meals: quickMeals.length });

      const requestStart = performance.now();
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildPlanRequestBody(userProfile, {
          checkIn: { status: "Normal", text: "" },
          currentMeals: [],
          reason: "Initial daily plan"
        }))
      });
      const result = await response.json();
      logPerformance("AI response received", requestStart, { reason: "Initial daily plan" });

      if (!response.ok) {
        setError(result.error || "Unable to generate plan.");
        setLoading(false);
        return;
      }

      const generatedMeals = normalizePlanMeals(result.plan?.meals || result.plan);
      const databaseSaveStart = performance.now();
      const { data: savedPlan, error: savePlanError } = await supabase
        .from("daily_plans")
        .upsert({
          user_id: user.id,
          meals: generatedMeals,
          meal_statuses: {},
          streak_processed: false,
          date: today
        }, {
          onConflict: "user_id,date"
        })
        .select("*")
        .single();

      if (savePlanError) {
        setError(savePlanError.message);
        setLoading(false);
        return;
      }

      const normalizedSavedMeals = normalizePlanMeals(savedPlan.meals);
      const autoSkipResult = checkMealStatus(normalizedSavedMeals, normalizedProfile);
      const mealsToShow = autoSkipResult.meals;
      generationStartRef.current = requestStart;
      setMeals(mealsToShow);
      setPlanId(savedPlan.id);
      setStreakProcessed(Boolean(savedPlan.streak_processed));
      setLoading(false);
      if (autoSkipResult.changed) {
        supabase.from("daily_plans").update({ meals: mealsToShow, meal_statuses: {} }).eq("id", savedPlan.id);
      }
      logPerformance("database save", databaseSaveStart, { mode: "initial upsert" });
      logPerformance("dashboard load with generation", dashboardLoadStartRef.current, { meals: generatedMeals.length });
    }

    loadDashboard();
  }, [router]);

  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    const timer = window.setTimeout(() => {
      router.refresh();
    }, tomorrow.getTime() - now.getTime());

    return () => window.clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(new Date()), 60000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (loading || meals.length === 0) return undefined;

    if (generationStartRef.current) {
      logPerformance("render complete after generation", generationStartRef.current, { meals: meals.length });
      generationStartRef.current = 0;
    }

    autoSkipPendingMeals();
    const interval = window.setInterval(autoSkipPendingMeals, 60000);

    return () => window.clearInterval(interval);
  }, [loading, meals, profile, planId, streakProcessed]);

  async function persistMeals(nextMeals) {
    if (!planId) return;

    const { error: updateError } = await supabase
      .from("daily_plans")
      .update({ meals: nextMeals, meal_statuses: {} })
      .eq("id", planId);

    if (updateError) {
      setError(updateError.message);
    }
  }

  function autoSkipPendingMeals() {
    const now = new Date();
    setCurrentTime(now);
    const { changed, meals: nextMeals } = checkMealStatus(meals, profile, now);

    if (!changed) return;

    setMeals(nextMeals);
    persistMeals(nextMeals);
    finalizeDailyStreak(nextMeals);
  }

  async function applyCoinTransaction({ coins: coinAmount, reason, type }) {
    if (!userId || coinAmount <= 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const alreadyExists = transactions.some((transaction) => (
      transaction.date === today &&
      transaction.reason === reason &&
      transaction.type === type
    ));

    if (alreadyExists) return;

    const signedAmount = type === "penalty" ? -coinAmount : coinAmount;
    const nextCoins = {
      balance: Math.max(coins.balance + signedAmount, 0),
      totalEarned: coins.totalEarned + (type === "penalty" ? 0 : coinAmount),
      totalSpent: coins.totalSpent + (type === "penalty" ? coinAmount : 0)
    };
    const optimisticTransaction = {
      id: `local-${Date.now()}-${reason}`,
      user_id: userId,
      type,
      coins: coinAmount,
      reason,
      date: today,
      created_at: new Date().toISOString()
    };

    setCoins(nextCoins);
    setTransactions((current) => [optimisticTransaction, ...current]);
    setCoinFeedback(
      type === "penalty"
        ? `-${coinAmount} coins`
        : `+${coinAmount} coins`
    );
    window.setTimeout(() => setCoinFeedback(""), 3500);

    const { data: savedTransaction, error: transactionError } = await supabase
      .from("coin_transactions")
      .insert({
        user_id: userId,
        type,
        coins: coinAmount,
        reason,
        date: today
      })
      .select("*")
      .single();

    if (transactionError) {
      setError(transactionError.message);
      return;
    }

    setTransactions((current) => current.map((transaction) => (
      transaction.id === optimisticTransaction.id ? savedTransaction : transaction
    )));

    const { error: coinUpdateError } = await supabase
      .from("users")
      .update({
        coins_balance: nextCoins.balance,
        total_coins_earned: nextCoins.totalEarned,
        total_coins_spent: nextCoins.totalSpent
      })
      .eq("id", userId);

    if (coinUpdateError) {
      setError(coinUpdateError.message);
    }
  }

  function applyDailyReward(nextMeals) {
    const today = new Date().toISOString().slice(0, 10);
    const reachedMilestones = getReachedMilestones(nextMeals);

    reachedMilestones.forEach((milestone) => {
      const reason = getMilestoneReason(milestone.percent);
      const alreadyRewarded = transactions.some((transaction) => (
        transaction.date === today && transaction.reason === reason && transaction.type === "reward"
      ));

      if (alreadyRewarded) return;

      applyCoinTransaction({
        coins: milestone.coins,
        reason,
        type: "reward"
      });
    });
  }

  async function finalizeDailyStreak(nextMeals, targetPlanId = planId, targetUserId = userId) {
    if (!targetUserId || !targetPlanId || streakProcessed || nextMeals.length === 0) return;

    const pendingCount = nextMeals.filter((meal) => normalizeStatus(meal.status) === "pending").length;
    if (pendingCount > 0) return;

    const skippedCount = nextMeals.filter((meal) => normalizeStatus(meal.status) === "skipped").length;
    const currentStreak = Number(profile?.current_streak) || 0;
    const nextStreak = skippedCount <= 1 ? currentStreak + 1 : 0;

    setStreakProcessed(true);
    setProfile((current) => ({ ...current, current_streak: nextStreak }));

    const { error: planUpdateError } = await supabase
      .from("daily_plans")
      .update({ streak_processed: true })
      .eq("id", targetPlanId);

    if (planUpdateError) {
      setError(planUpdateError.message);
      return;
    }

    const { error: streakUpdateError } = await supabase
      .from("users")
      .update({ current_streak: nextStreak })
      .eq("id", targetUserId);

    if (streakUpdateError) {
      setError(streakUpdateError.message);
      return;
    }

  }

  function updateMealStatus(index, status) {
    setMeals((currentMeals) => {
      const currentMeal = currentMeals[index];
      const currentStatus = normalizeStatus(currentMeal?.status);
      if (currentStatus === "completed" || currentStatus === "skipped") return currentMeals;

      const wasCompleted = normalizeStatus(currentMeal?.status) === "completed";
      const willComplete = normalizeStatus(status) === "completed";
      const willSkip = normalizeStatus(status) === "skipped";
      const nextMeals = currentMeals.map((meal, mealIndex) => (
        mealIndex === index ? { ...meal, status: normalizeStatus(status), auto_skipped: false } : meal
      ));

      if (willComplete && !wasCompleted && currentMeal) {
        const calories = Math.round(toNumber(currentMeal.calories));
        const protein = Math.round(toNumber(currentMeal.protein));
        const parts = [];

        if (calories) parts.push(`+${calories} kcal added`);
        if (protein) parts.push(`+${protein}g protein added`);
        setNutritionFeedback(parts.length ? parts.join(" · ") : "Meal completed");
        window.setTimeout(() => setNutritionFeedback(""), 3000);
        applyDailyReward(nextMeals);
      }

      if (willSkip && currentMeal) {
        regeneratePlan({
          currentMeals: nextMeals,
          reason: `User skipped ${currentMeal.name}. Rebalance remaining meals without pressure.`
        });
      }

      persistMeals(nextMeals);
      finalizeDailyStreak(nextMeals);
      return nextMeals;
    });
  }

  async function saveMeal(index, meal) {
    const currentMeal = meals[index];
    const currentStatus = normalizeStatus(currentMeal?.status);

    if (currentStatus === "completed" || currentStatus === "skipped") {
      setEditingIndex(null);
      return;
    }

    setSavingMeal(true);
    setError("");

    try {
      const response = await fetch("/api/estimate-meal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: meal.name,
          items: meal.items
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to calculate nutrition for this meal.");
        return;
      }

      const nutrition = result.nutrition || {};
      const mealWithNutrition = {
        ...meal,
        calories: Math.round(toNumber(nutrition.calories)),
        protein: Math.round(toNumber(nutrition.protein)),
        carbs: Math.round(toNumber(nutrition.carbs)),
        fat: Math.round(toNumber(nutrition.fat)),
        fiber: Math.round(toNumber(nutrition.fiber)),
        water: toNumber(nutrition.water)
      };

      setMeals((currentMeals) => {
        const nextMeals = currentMeals.map((item, mealIndex) => (
          mealIndex === index ? normalizeMeal(mealWithNutrition, item) : item
        ));
        persistMeals(nextMeals);
        return nextMeals;
      });
      setEditingIndex(null);
      setNutritionFeedback("Nutrition recalculated");
      window.setTimeout(() => setNutritionFeedback(""), 3000);
    } catch (saveError) {
      setError(saveError.message || "Unable to save meal.");
    } finally {
      setSavingMeal(false);
    }
  }

  async function handleHealthCheckInSubmit(event) {
    event.preventDefault();
    const submittedCheckIn = {
      status: healthCheckIn.status || "Normal",
      text: healthCheckIn.text.trim()
    };

    setHealthCheckIn(submittedCheckIn);
    await regeneratePlan({
      checkIn: submittedCheckIn,
      currentMeals: meals,
      reason: `User reported feeling ${submittedCheckIn.status}${submittedCheckIn.text ? `: ${submittedCheckIn.text}` : ""}. Adapt the rest of the day.`
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const stats = useMemo(() => {
    const completed = meals.filter((meal) => normalizeStatus(meal.status) === "completed").length;
    const skipped = meals.filter((meal) => normalizeStatus(meal.status) === "skipped").length;

    return {
      completed,
      skipped,
      pending: Math.max(meals.length - completed - skipped, 0)
    };
  }, [meals]);

  const nutrition = useMemo(() => {
    return meals.reduce(
      (totals, meal) => {
        if (normalizeStatus(meal.status) !== "completed") return totals;

        return {
          calories: totals.calories + Math.round(toNumber(meal.calories)),
          protein: totals.protein + Math.round(toNumber(meal.protein)),
          carbs: totals.carbs + Math.round(toNumber(meal.carbs)),
          fat: totals.fat + Math.round(toNumber(meal.fat)),
          fiber: totals.fiber + Math.round(toNumber(meal.fiber)),
          water: Math.round((totals.water + (toNumber(meal.water) || estimateWaterLiters(meal, meal.items))) * 10) / 10
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0 }
    );
  }, [meals]);

  const recoveryMode = useMemo(() => isRecoveryCheckIn(healthCheckIn), [healthCheckIn]);
  const targets = useMemo(() => getNutritionTargets(profile, healthCheckIn), [profile, healthCheckIn]);
  const subscription = useMemo(() => getSubscriptionState(profile), [profile]);
  const subscriptionNotice = useMemo(() => getSubscriptionNotice(profile), [profile]);
  const isPremiumAccess = subscription.hasPremiumAccess;
  const isPerfectDay = !recoveryMode && nutrition.calories >= targets.calories && nutrition.protein >= targets.protein;

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-6">
      <section className="mx-auto w-full max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Dietary Assistant</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">
              {profile ? `Today's Journey for ${profile.name}` : "Today's Journey"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Your day as a practical food roadmap, built around your routine.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LiveClock />
            <Link
              aria-label="My Profile"
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 hover:ring-2 hover:ring-emerald-200"
              href="/profile"
            >
              {profile?.profile_image ? (
                <img alt={profile.name || "Profile"} className="h-full w-full object-cover" src={`${profile.profile_image}${profile.profile_image.includes("?") ? "&" : "?"}t=${Date.now()}`} />
              ) : (
                profile?.name?.slice(0, 1).toUpperCase() || "U"
              )}
            </Link>
            <CoinsTopBarLink coins={coins} />
            <Link
              aria-label="Settings"
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

        {!loading && profile && (
          <SubscriptionBanner notice={subscriptionNotice} subscription={subscription} />
        )}

        {!loading && profile && (
          <HealthCoachCheckIn
            adaptingPlan={adaptingPlan}
            coachMessage={coachMessage}
            healthCheckIn={healthCheckIn}
            onHealthCheckInChange={setHealthCheckIn}
            onSubmit={handleHealthCheckInSubmit}
          />
        )}

        {loading && (
          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
            Generating your personal roadmap...
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        )}

        {!loading && meals.length > 0 && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase text-emerald-700">Completed</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-950">{stats.completed}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase text-amber-700">Pending</p>
                <p className="mt-1 text-2xl font-semibold text-amber-950">{stats.pending}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-semibold uppercase text-red-700">Skipped</p>
                <p className="mt-1 text-2xl font-semibold text-red-950">{stats.skipped}</p>
              </div>
            </div>

            {coinFeedback && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0B1E3C]/80 px-4 py-2 text-sm font-semibold tracking-wide text-white/90 shadow-[0_0_15px_rgba(59,130,246,0.3)] backdrop-blur-lg">
                <span>{coinFeedback}</span>
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#3B82F6] shadow-[0_0_12px_rgba(59,130,246,0.7)]" />
              </div>
            )}

            <NutritionSummary
              feedback={nutritionFeedback}
              isPerfectDay={isPerfectDay}
              nutrition={nutrition}
              recoveryMode={recoveryMode}
              targets={targets}
            />

            <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Today&apos;s Journey</h2>
                  <p className="mt-1 text-sm text-slate-600">Complete, skip, or edit each step without waiting.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Completed</span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Pending</span>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">Skipped</span>
                </div>
              </div>

              <AutoSkipDebugPanel meals={meals} now={currentTime} profile={profile} />

              <div className="mt-6 space-y-6">
                {meals.map((meal, index) => (
                  <JourneyNode
                    index={index}
                    isPremiumAccess={isPremiumAccess}
                    isLast={index === meals.length - 1}
                    key={`${meal.name}-${meal.time}-${index}`}
                    meal={meal}
                    now={currentTime}
                    onEdit={setEditingIndex}
                    onStatusChange={updateMealStatus}
                    profile={profile}
                  />
                ))}
              </div>
            </section>

            <p className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600">
              Dietary Assistant provides general wellness guidance only. It is not medical advice, diagnosis,
              or treatment. Consult a qualified professional for illness, injury, pregnancy, allergies, or
              medical conditions.
            </p>
          </>
        )}
      </section>

      {editingIndex !== null && meals[editingIndex] && (
        <EditMealPanel
          meal={meals[editingIndex]}
          onCancel={() => setEditingIndex(null)}
          onSave={(meal) => saveMeal(editingIndex, meal)}
          saving={savingMeal}
        />
      )}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const defaultJourney = [
  { name: "Breakfast", time: "8:00 AM", type: "home", items: ["Plan loading"], calories: 0, protein: 0, status: "pending", is_user_customized: false },
  { name: "Water", time: "10:30 AM", type: "home", items: ["Drink 500 ml water"], calories: 0, protein: 0, status: "pending", is_user_customized: false },
  { name: "Snack", time: "11:30 AM", type: "outside", items: ["Banana or peanuts if busy"], calories: 0, protein: 0, status: "pending", is_user_customized: false },
  { name: "Lunch", time: "1:30 PM", type: "carry", items: ["Carry lunchbox"], calories: 0, protein: 0, status: "pending", is_user_customized: false },
  { name: "Evening snack", time: "5:00 PM", type: "outside", items: ["Tea with protein snack"], calories: 0, protein: 0, status: "pending", is_user_customized: false },
  { name: "Water", time: "6:30 PM", type: "home", items: ["Drink 500 ml water"], calories: 0, protein: 0, status: "pending", is_user_customized: false },
  { name: "Dinner", time: "8:30 PM", type: "home", items: ["Balanced dinner"], calories: 0, protein: 0, status: "pending", is_user_customized: false }
];

const legacyMealOrder = [
  ["breakfast", "Breakfast", "home"],
  ["water", "Water", "home"],
  ["snacks", "Snack", "outside"],
  ["lunch", "Lunch", "carry"],
  ["dinner", "Dinner", "home"]
];

const DAILY_REWARDS = {
  partial: 0.05,
  full: 0.1,
  weekly: 1,
  monthly: 5,
  missedMealPenalty: 1
};

const statusStyles = {
  completed: {
    node: "border-emerald-300 bg-emerald-50",
    dot: "border-emerald-500 bg-emerald-500 text-white",
    badge: "bg-emerald-100 text-emerald-800"
  },
  pending: {
    node: "border-amber-300 bg-amber-50",
    dot: "border-amber-500 bg-amber-400 text-amber-950",
    badge: "bg-amber-100 text-amber-800"
  },
  skipped: {
    node: "border-red-300 bg-red-50",
    dot: "border-red-500 bg-red-500 text-white",
    badge: "bg-red-100 text-red-800"
  }
};

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const match = value.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function toMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function formatRupees(value) {
  return `₹${toMoney(value).toFixed(2)}`;
}

function getLevel(streak) {
  const normalizedStreak = Math.max(Number(streak) || 0, 0);
  if (normalizedStreak >= 30) return "Level 4";
  if (normalizedStreak >= 14) return "Level 3";
  if (normalizedStreak >= 7) return "Level 2";
  return "Level 1";
}

function extractNutritionFromItems(items, pattern) {
  const text = normalizeItems(items, "").join(" ");
  const match = text.match(pattern);
  return match ? Number(match[1]) : 0;
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

  return {
    name: meal?.name || meal?.meal_name || fallback.name || "Meal",
    time: meal?.time || fallback.time || "Time not set",
    type: ["home", "carry", "outside"].includes(meal?.type) ? meal.type : fallback.type || "home",
    items,
    calories: toNumber(meal?.calories) || extractNutritionFromItems(items, /(\d+(?:\.\d+)?)\s*(?:kcal|calories?)/i),
    protein: toNumber(meal?.protein) || extractNutritionFromItems(items, /(\d+(?:\.\d+)?)\s*g?\s*(?:protein|prot)/i),
    status: normalizeStatus(meal?.status || fallback.status),
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

function typeLabel(type) {
  if (type === "carry") return "Carry food";
  if (type === "outside") return "Outside option";
  return "Home";
}

function getNutritionTargets(profile) {
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

  return {
    calories: Math.round(Math.max(weight * activityMultiplier + goalAdjustment, 1200) / 50) * 50,
    protein: Math.round(weight * proteinMultiplier)
  };
}

function getProgressColor(current, target) {
  const percent = target ? (current / target) * 100 : 0;
  if (percent >= 100) return "bg-emerald-500";
  if (percent >= 50) return "bg-amber-400";
  return "bg-red-500";
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

function NutritionMetric({ icon, label, current, target, unit }) {
  const remaining = Math.max(target - current, 0);
  const progress = Math.min(target ? (current / target) * 100 : 0, 100);
  const remainingLabel = label === "Calories" ? "Calories left" : "Protein left";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-600">{icon} {label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {current} / {target} {unit}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {remainingLabel}: {remaining} {unit}
        </span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${getProgressColor(current, target)}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function NutritionSummary({ feedback, isPerfectDay, nutrition, targets }) {
  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-[#fffdf7] p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Today&apos;s Plan</h2>
          <p className="mt-1 text-sm text-slate-600">Nutrition progress updates the moment you complete a meal.</p>
        </div>
        {feedback && (
          <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
            {feedback}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <NutritionMetric
          current={nutrition.calories}
          icon="🔥"
          label="Calories"
          target={targets.calories}
          unit="kcal"
        />
        <NutritionMetric
          current={nutrition.protein}
          icon="💪"
          label="Protein"
          target={targets.protein}
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

function WalletSummary({ streak, transactions, wallet, walletFeedback }) {
  const recentTransactions = transactions.slice(0, 4);

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Your Wallet 💰</h2>
          <p className="mt-1 text-sm text-slate-600">Small rewards, strong accountability, ready for future discounts.</p>
        </div>
        {walletFeedback && (
          <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
            {walletFeedback}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase text-emerald-700">Current balance</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{formatRupees(wallet.balance)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-600">Total earned</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{formatRupees(wallet.totalEarned)}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase text-red-700">Total spent</p>
          <p className="mt-1 text-2xl font-semibold text-red-950">{formatRupees(wallet.totalSpent)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-semibold uppercase text-orange-700">Streak</p>
          <p className="mt-1 text-2xl font-semibold text-orange-950">🔥 {streak} days</p>
        </div>
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-semibold uppercase text-violet-700">Level</p>
          <p className="mt-1 text-2xl font-semibold text-violet-950">🎮 {getLevel(streak)}</p>
        </div>
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs font-semibold uppercase text-sky-700">Future use</p>
          <p className="mt-1 text-sm font-semibold text-sky-950">Subscription discounts and premium unlocks</p>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-950">Transaction history</h3>
        <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {recentTransactions.length === 0 && (
            <p className="p-4 text-sm text-slate-600">No wallet activity yet.</p>
          )}
          {recentTransactions.map((transaction) => (
            <div className="flex items-center justify-between gap-3 p-4 text-sm" key={transaction.id}>
              <div>
                <p className="font-semibold text-slate-950">{transaction.reason}</p>
                <p className="mt-1 text-xs text-slate-500">{transaction.date}</p>
              </div>
              <span className={`font-semibold ${transaction.type === "reward" ? "text-emerald-700" : "text-red-700"}`}>
                {transaction.type === "reward" ? "+" : "-"}{formatRupees(transaction.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function JourneyNode({ meal, index, isLast, onEdit, onStatusChange }) {
  const status = normalizeStatus(meal.status);
  const styles = statusStyles[status] || statusStyles.pending;
  const summary = meal.items?.slice(0, 2).join(", ") || "Not specified";

  return (
    <div className="relative grid gap-4 pl-14 sm:grid-cols-[10rem_1fr] sm:gap-6 sm:pl-16">
      {!isLast && <div className="absolute left-5 top-12 h-[calc(100%-1rem)] w-0.5 bg-slate-200 sm:left-6" />}

      <div className={`absolute left-0 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg shadow-sm ${styles.dot} sm:h-12 sm:w-12`}>
        {getIcon(meal.name)}
      </div>

      <div className="pt-1 text-sm font-semibold text-slate-700 sm:text-right">
        {meal.time || "Time not set"}
      </div>

      <article className={`rounded-lg border p-4 shadow-sm transition ${styles.node}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-950">{meal.name}</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badge}`}>
                {status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-700">{summary}</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {typeLabel(meal.type)}
          </span>
        </div>

        <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {meal.items?.map((item, itemIndex) => (
            <li className="rounded-md bg-white/80 px-3 py-2" key={`${item}-${itemIndex}`}>
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
          <span className="rounded-full bg-white px-3 py-1">{meal.calories || 0} kcal</span>
          <span className="rounded-full bg-white px-3 py-1">{meal.protein || 0}g protein</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-md border border-emerald-600 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            onClick={() => onStatusChange(index, "completed")}
            type="button"
          >
            Complete
          </button>
          <button
            className="rounded-md border border-red-500 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            onClick={() => onStatusChange(index, "skipped")}
            type="button"
          >
            Skip
          </button>
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => onEdit(index)}
            type="button"
          >
            Edit
          </button>
        </div>
      </article>
    </div>
  );
}

function EditMealPanel({ meal, onCancel, onSave }) {
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
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
              min="0"
              type="number"
              value={draft.calories || ""}
              onChange={(event) => setDraft((current) => ({ ...current, calories: Number(event.target.value) }))}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Protein g</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
              min="0"
              type="number"
              value={draft.protein || ""}
              onChange={(event) => setDraft((current) => ({ ...current, protein: Number(event.target.value) }))}
            />
          </label>
        </div>

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
                disabled={draft.items.length === 1}
                onClick={() => removeItem(index)}
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button className="mt-5 w-full rounded-md bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700" type="submit">
          Save meal
        </button>
      </form>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const didLoadDashboard = useRef(false);
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState(null);
  const [meals, setMeals] = useState([]);
  const [planId, setPlanId] = useState("");
  const [streakProcessed, setStreakProcessed] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [nutritionFeedback, setNutritionFeedback] = useState("");
  const [walletFeedback, setWalletFeedback] = useState("");
  const [wallet, setWallet] = useState({ balance: 0, totalEarned: 0, totalSpent: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function processPreviousPlans(currentUserId, userProfile, walletTransactions, today) {
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
    let walletBalance = toMoney(userProfile.wallet_balance ?? userProfile.balance ?? 0);
    let totalEarned = toMoney(userProfile.total_earned);
    let totalSpent = toMoney(userProfile.total_spent);
    const newTransactions = [];
    const knownTransactions = [...walletTransactions];

    function hasTransaction(date, type, reason) {
      return knownTransactions.some((transaction) => (
        transaction.date === date &&
        transaction.type === type &&
        transaction.reason === reason
      ));
    }

    function queueTransaction({ amount, date, reason, type }) {
      if (hasTransaction(date, type, reason)) return;

      knownTransactions.push({ amount, date, reason, type });
      newTransactions.push({
        user_id: currentUserId,
        type,
        amount,
        reason,
        date
      });

      if (type === "reward") {
        walletBalance = toMoney(walletBalance + amount);
        totalEarned = toMoney(totalEarned + amount);
      } else {
        walletBalance = toMoney(walletBalance - amount);
        totalSpent = toMoney(totalSpent + amount);
      }
    }

    for (const plan of unprocessedPlans) {
      const planMeals = normalizePlanMeals(plan.meals, plan.meal_statuses || {});
      const outcome = getDailyOutcome(planMeals);

      if (outcome.fullComplete) {
        const alreadyHadPartial = hasTransaction(plan.date, "reward", "Partial completion reward");
        const fullAmount = alreadyHadPartial
          ? DAILY_REWARDS.full - DAILY_REWARDS.partial
          : DAILY_REWARDS.full;

        queueTransaction({
          amount: toMoney(fullAmount),
          date: plan.date,
          reason: "Daily completion reward",
          type: "reward"
        });
      } else if (outcome.partialComplete) {
        queueTransaction({
          amount: DAILY_REWARDS.partial,
          date: plan.date,
          reason: "Partial completion reward",
          type: "reward"
        });
      }

      planMeals
        .filter((meal) => normalizeStatus(meal.status) !== "completed")
        .forEach((meal) => {
          queueTransaction({
            amount: DAILY_REWARDS.missedMealPenalty,
            date: plan.date,
            reason: `Missed ${meal.name} penalty`,
            type: "penalty"
          });
        });

      nextStreak = outcome.streakContinues ? nextStreak + 1 : 0;

      if (nextStreak > 0 && nextStreak % 30 === 0) {
        queueTransaction({
          amount: DAILY_REWARDS.monthly,
          date: plan.date,
          reason: "30-day streak bonus",
          type: "reward"
        });
      } else if (nextStreak > 0 && nextStreak % 7 === 0) {
        queueTransaction({
          amount: DAILY_REWARDS.weekly,
          date: plan.date,
          reason: "7-day streak bonus",
          type: "reward"
        });
      }
    }

    if (newTransactions.length > 0) {
      const { data: savedTransactions, error: transactionsError } = await supabase
        .from("wallet_transactions")
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
      wallet_balance: walletBalance,
      balance: walletBalance,
      total_earned: totalEarned,
      total_spent: totalSpent
    };

    const { error: profileUpdateError } = await supabase
      .from("users")
      .update({
        current_streak: nextStreak,
        wallet_balance: walletBalance,
        balance: walletBalance,
        total_earned: totalEarned,
        total_spent: totalSpent
      })
      .eq("id", currentUserId);

    if (profileUpdateError) {
      setError(profileUpdateError.message);
      return userProfile;
    }

    setProfile(updatedProfile);
    setWallet({
      balance: walletBalance,
      totalEarned,
      totalSpent
    });

    return updatedProfile;
  }

  useEffect(() => {
    async function loadDashboard() {
      if (didLoadDashboard.current) return;
      didLoadDashboard.current = true;

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

      setProfile(userProfile);
      setWallet({
        balance: toMoney(userProfile.wallet_balance ?? userProfile.balance ?? 0),
        totalEarned: toMoney(userProfile.total_earned),
        totalSpent: toMoney(userProfile.total_spent)
      });
      const today = new Date().toISOString().slice(0, 10);

      const { data: walletTransactions, error: walletTransactionsError } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (walletTransactionsError) {
        setError(walletTransactionsError.message);
        setLoading(false);
        return;
      }

      setTransactions(walletTransactions || []);
      await processPreviousPlans(user.id, userProfile, walletTransactions || [], today);

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
        setMeals(normalizedMeals);
        setPlanId(existingPlan.id);
        setStreakProcessed(Boolean(existingPlan.streak_processed));
        setLoading(false);

        if (!Array.isArray(existingPlan.meals)) {
          supabase.from("daily_plans").update({ meals: normalizedMeals, meal_statuses: {} }).eq("id", existingPlan.id);
        }

        return;
      }

      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          age: userProfile.age,
          height: userProfile.height,
          weight: userProfile.weight,
          goal: userProfile.goal,
          diet_type: userProfile.diet_type,
          activity_level: userProfile.activity_level,
          health_notes: userProfile.health_notes,
          lifestyle: userProfile.lifestyle_description || userProfile.lifestyle
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to generate plan.");
        setLoading(false);
        return;
      }

      const generatedMeals = normalizePlanMeals(result.plan?.meals || result.plan);
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

      setMeals(normalizePlanMeals(savedPlan.meals));
      setPlanId(savedPlan.id);
      setStreakProcessed(Boolean(savedPlan.streak_processed));
      setLoading(false);
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

  async function applyWalletTransaction({ amount, reason, type }) {
    if (!userId || amount <= 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const alreadyExists = transactions.some((transaction) => (
      transaction.date === today &&
      transaction.reason === reason &&
      transaction.type === type
    ));

    if (alreadyExists) return;

    const signedAmount = type === "reward" ? amount : -amount;
    const nextWallet = {
      balance: toMoney(wallet.balance + signedAmount),
      totalEarned: toMoney(wallet.totalEarned + (type === "reward" ? amount : 0)),
      totalSpent: toMoney(wallet.totalSpent + (type === "penalty" ? amount : 0))
    };
    const optimisticTransaction = {
      id: `local-${Date.now()}-${reason}`,
      user_id: userId,
      type,
      amount,
      reason,
      date: today,
      created_at: new Date().toISOString()
    };

    setWallet(nextWallet);
    setTransactions((current) => [optimisticTransaction, ...current]);
    setWalletFeedback(
      type === "reward"
        ? `${formatRupees(amount)} added 🎉`
        : `${formatRupees(amount)} deducted — stay consistent tomorrow 💪`
    );
    window.setTimeout(() => setWalletFeedback(""), 3500);

    const { data: savedTransaction, error: transactionError } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: userId,
        type,
        amount,
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

    const { error: walletUpdateError } = await supabase
      .from("users")
      .update({
        wallet_balance: nextWallet.balance,
        balance: nextWallet.balance,
        total_earned: nextWallet.totalEarned,
        total_spent: nextWallet.totalSpent
      })
      .eq("id", userId);

    if (walletUpdateError) {
      setError(walletUpdateError.message);
    }
  }

  function applyDailyReward(nextMeals) {
    const today = new Date().toISOString().slice(0, 10);
    const completedCount = nextMeals.filter((meal) => normalizeStatus(meal.status) === "completed").length;
    const fullComplete = nextMeals.length > 0 && completedCount === nextMeals.length;
    const hasPartialReward = transactions.some((transaction) => (
      transaction.date === today && transaction.reason === "Partial completion reward"
    ));
    const hasFullReward = transactions.some((transaction) => (
      transaction.date === today && transaction.reason === "Daily completion reward"
    ));

    if (fullComplete && !hasFullReward) {
      const amount = hasPartialReward
        ? DAILY_REWARDS.full - DAILY_REWARDS.partial
        : DAILY_REWARDS.full;
      applyWalletTransaction({
        amount: toMoney(amount),
        reason: "Daily completion reward",
        type: "reward"
      });
      return;
    }

    if (completedCount > 0 && !hasPartialReward && !hasFullReward) {
      applyWalletTransaction({
        amount: DAILY_REWARDS.partial,
        reason: "Partial completion reward",
        type: "reward"
      });
    }
  }

  async function finalizeDailyStreak(nextMeals) {
    if (!userId || !planId || streakProcessed || nextMeals.length === 0) return;

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
      .eq("id", planId);

    if (planUpdateError) {
      setError(planUpdateError.message);
      return;
    }

    const { error: streakUpdateError } = await supabase
      .from("users")
      .update({ current_streak: nextStreak })
      .eq("id", userId);

    if (streakUpdateError) {
      setError(streakUpdateError.message);
      return;
    }

    if (nextStreak > 0 && nextStreak % 30 === 0) {
      applyWalletTransaction({
        amount: DAILY_REWARDS.monthly,
        reason: "30-day streak bonus",
        type: "reward"
      });
      return;
    }

    if (nextStreak > 0 && nextStreak % 7 === 0) {
      applyWalletTransaction({
        amount: DAILY_REWARDS.weekly,
        reason: "7-day streak bonus",
        type: "reward"
      });
    }
  }

  function updateMealStatus(index, status) {
    setMeals((currentMeals) => {
      const currentMeal = currentMeals[index];
      const wasCompleted = normalizeStatus(currentMeal?.status) === "completed";
      const willComplete = normalizeStatus(status) === "completed";
      const wasSkipped = normalizeStatus(currentMeal?.status) === "skipped";
      const willSkip = normalizeStatus(status) === "skipped";
      const nextMeals = currentMeals.map((meal, mealIndex) => (
        mealIndex === index ? { ...meal, status: normalizeStatus(status) } : meal
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

      if (willSkip && !wasSkipped && currentMeal) {
        applyWalletTransaction({
          amount: DAILY_REWARDS.missedMealPenalty,
          reason: `Missed ${currentMeal.name} penalty`,
          type: "penalty"
        });
      }

      persistMeals(nextMeals);
      finalizeDailyStreak(nextMeals);
      return nextMeals;
    });
  }

  function saveMeal(index, meal) {
    setMeals((currentMeals) => {
      const nextMeals = currentMeals.map((currentMeal, mealIndex) => (
        mealIndex === index ? normalizeMeal(meal, currentMeal) : currentMeal
      ));
      persistMeals(nextMeals);
      return nextMeals;
    });
    setEditingIndex(null);
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
          protein: totals.protein + Math.round(toNumber(meal.protein))
        };
      },
      { calories: 0, protein: 0 }
    );
  }, [meals]);

  const targets = useMemo(() => getNutritionTargets(profile), [profile]);
  const isPerfectDay = nutrition.calories >= targets.calories && nutrition.protein >= targets.protein;

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
            <Link
              aria-label="My Profile"
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 hover:ring-2 hover:ring-emerald-200"
              href="/profile"
            >
              {profile?.profile_image ? (
                <img alt={profile.name || "Profile"} className="h-full w-full object-cover" src={profile.profile_image} />
              ) : (
                profile?.name?.slice(0, 1).toUpperCase() || "U"
              )}
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

            <WalletSummary
              streak={Number(profile?.current_streak) || 0}
              transactions={transactions}
              wallet={wallet}
              walletFeedback={walletFeedback}
            />

            <NutritionSummary
              feedback={nutritionFeedback}
              isPerfectDay={isPerfectDay}
              nutrition={nutrition}
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

              <div className="mt-6 space-y-6">
                {meals.map((meal, index) => (
                  <JourneyNode
                    index={index}
                    isLast={index === meals.length - 1}
                    key={`${meal.name}-${meal.time}-${index}`}
                    meal={meal}
                    onEdit={setEditingIndex}
                    onStatusChange={updateMealStatus}
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
        />
      )}
    </main>
  );
}

import { NextResponse } from "next/server";
import { checkGeminiRateLimit, estimateMealNutrition } from "@/lib/gemini";
import { getSubscriptionState } from "@/lib/subscription";
import { createClient } from "@/utils/supabase/server";

function getSafeErrorMessage(error) {
  const message = error?.message || "";

  if (message.includes("API key") || message.includes("403") || message.includes("Forbidden")) {
    return "The AI nutrition estimator is not configured correctly. Please update the Gemini API key and try again.";
  }

  return "Unable to estimate nutrition right now. Please try again.";
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in to estimate nutrition." }, { status: 401 });
    }

    if (!checkGeminiRateLimit(`${user.id}:estimate-meal`, 30)) {
      return NextResponse.json(
        { error: "AI nutrition estimate limit reached. Please try again later." },
        { status: 429 }
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("subscription_status, trial_end_date, subscription_end")
      .eq("id", user.id)
      .maybeSingle();
    const subscription = getSubscriptionState(profile);

    if (!subscription.hasPremiumAccess) {
      return NextResponse.json(
        { error: "Your free trial ended. Upgrade to continue." },
        { status: 402 }
      );
    }

    const meal = await request.json();
    const items = Array.isArray(meal?.items) ? meal.items.filter(Boolean) : [];

    if (!items.length) {
      return NextResponse.json({ error: "Add at least one food item." }, { status: 400 });
    }

    const nutrition = await estimateMealNutrition({ name: meal?.name, items });

    return NextResponse.json({ nutrition });
  } catch (error) {
    console.error("Meal nutrition estimation failed:", error);

    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    );
  }
}

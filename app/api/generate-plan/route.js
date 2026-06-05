import { NextResponse } from "next/server";
import { checkGeminiRateLimit, generateDietPlan } from "@/lib/gemini";
import { getSubscriptionState } from "@/lib/subscription";
import { createClient } from "@/utils/supabase/server";

function getSafeErrorMessage(error) {
  const message = error?.message || "";

  if (message.includes("project has been denied access")) {
    return "The Google AI project for this Gemini key has been denied access. Create a key from another eligible Google AI Studio or Google Cloud project, then restart the app.";
  }

  if (message.includes("API key") || message.includes("403") || message.includes("Forbidden")) {
    return "The AI plan service is not configured correctly. Please update the Gemini API key and try again.";
  }

  return "Unable to generate diet plan right now. Please try again.";
}

export async function POST(request) {
  const requestStart = performance.now();

  function logStep(label, startTime = requestStart, extra = {}) {
    const durationMs = Math.round(performance.now() - startTime);
    console.log(`[generate-plan performance] ${label}: ${durationMs}ms`, extra);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in to generate a plan." }, { status: 401 });
    }

    if (!checkGeminiRateLimit(user.id)) {
      return NextResponse.json(
        { error: "AI plan limit reached. Please try again later." },
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
      if (subscription.shouldExpire && profile?.subscription_status !== "expired") {
        await supabase
          .from("users")
          .update({ is_premium: false, subscription_status: "expired" })
          .eq("id", user.id);
      }

      return NextResponse.json(
        { error: "Your free trial ended. Upgrade to continue." },
        { status: 402 }
      );
    }

    const userData = await request.json();
    const requiredFields = ["age", "height", "weight", "goal", "diet_type", "activity_level", "lifestyle"];
    const isMissingRequiredData = requiredFields.some((field) => !userData?.[field]);

    if (isMissingRequiredData) {
      return NextResponse.json({ error: "Missing user diet details." }, { status: 400 });
    }

    const aiStart = performance.now();
    const plan = await generateDietPlan({
      age: userData.age,
      height: userData.height,
      weight: userData.weight,
      goal: userData.goal,
      diet_type: userData.diet_type,
      activity_level: userData.activity_level,
      lifestyle: userData.lifestyle_description || userData.lifestyle,
      health_check_status: userData.health_check_status,
      health_check_text: userData.health_check_text,
      adaptation_reason: userData.adaptation_reason,
      current_meals: userData.current_meals,
      local_date: userData.local_date,
      user_timezone: userData.user_timezone || "Asia/Kolkata"
    });
    logStep("AI response received", aiStart);
    logStep("request total", requestStart, { meals: Array.isArray(plan?.meals) ? plan.meals.length : 0 });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Diet plan generation failed:", error);

    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    );
  }
}

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
          .update({ subscription_status: "expired" })
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

    const plan = await generateDietPlan(userData);

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Diet plan generation failed:", error);

    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    );
  }
}

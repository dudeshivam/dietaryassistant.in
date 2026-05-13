import { NextResponse } from "next/server";
import { generateDietPlan } from "@/lib/gemini";

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

import { GoogleGenerativeAI } from "@google/generative-ai";

function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("Gemini did not return JSON.");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function generateDietPlan(userData) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const prompt = `
Generate a practical 1-day Indian diet roadmap as JSON only. The plan must feel customized to the user's real day, not generic.

Core rules:
1. Never ignore or replace the user's existing routine, foods, supplements, timings, or habits from the lifestyle description.
2. Keep those habits in the closest matching journey step, then enhance around them with calories, protein, fiber, hydration, and realistic portions.
3. If the user is in school, college, university, office, commuting, or away from home, include packable meals and outside fallback options.
4. Prefer real-life wording like "Carry 2 roti + paneer sabzi in lunchbox" or "Buy banana + peanuts from canteen if busy".
5. Avoid vague items such as only "salad" or "healthy snack". Make every item specific, affordable, and easy to follow.
6. Add water reminder nodes as part of the journey.
7. Avoid medical claims. If health notes are present, make conservative food adjustments and mention professional care only inside a food item when necessary.

Each item string should include useful nutrition context when natural, such as calories, protein, fiber, or water amount.
Also provide numeric calories and protein totals for every node. Water-only nodes should use 0 calories and 0 protein.

Return this exact JSON shape:
{
  "meals": [
    {
      "name": "Breakfast",
      "time": "8:00 AM",
      "type": "home",
      "items": ["Specific food with portion and nutrition context"],
      "calories": 450,
      "protein": 25,
      "status": "pending",
      "is_user_customized": false
    }
  ]
}

Required journey order:
Breakfast, Water, Snack, Lunch, Evening snack, Water, Dinner.

Allowed type values only: "home", "carry", "outside".
Use "carry" for lunchbox/tiffin food, "outside" for canteen/shop fallback options, and "home" for food eaten at home.

User data:
- Age: ${userData.age}
- Height: ${userData.height} cm
- Weight: ${userData.weight} kg
- Goal: ${userData.goal}
- Diet type: ${userData.diet_type}
- Activity level: ${userData.activity_level}
- Lifestyle: ${userData.lifestyle}
- Health notes: ${userData.health_notes || "None"}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return extractJson(text);
}

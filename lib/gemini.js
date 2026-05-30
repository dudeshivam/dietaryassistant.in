import { GoogleGenerativeAI } from "@google/generative-ai";

const rateLimitStore = new Map();

export function checkGeminiRateLimit(key, limit = 12, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) return false;

  current.count += 1;
  rateLimitStore.set(key, current);
  return true;
}

function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("Gemini did not return JSON.");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

function getSeasonContext(date = new Date()) {
  const month = date.getMonth() + 1;

  if (month >= 3 && month <= 6) {
    return "Summer in India: prefer lighter meals, water-rich fruits, hydration, curd/buttermilk if suitable, and avoid very heavy oily meals.";
  }

  if (month >= 7 && month <= 9) {
    return "Rainy/monsoon season in India: prefer clean, freshly cooked simple meals, avoid risky outside food, and keep digestion-friendly options.";
  }

  return "Winter/cooler season in India: prefer warm meals, soups, cooked vegetables, dals, and steady protein while keeping digestion comfortable.";
}

function formatCurrentMeals(meals = []) {
  if (!Array.isArray(meals) || meals.length === 0) return "No current meal status yet.";

  return meals.map((meal) => {
    const items = Array.isArray(meal.items) ? meal.items.join("; ") : meal.items || "Not specified";
    return `${meal.name || "Meal"} at ${meal.time || "time not set"} is ${meal.status || "pending"}: ${items}`;
  }).join("\n");
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

  const healthStatus = userData.health_check_status || "Normal";
  const healthText = userData.health_check_text || "";
  const adaptationReason = userData.adaptation_reason || "Initial daily plan";
  const seasonContext = getSeasonContext(userData.local_date ? new Date(userData.local_date) : new Date());

  const prompt = `
Generate a practical 1-day Indian AI health coach roadmap as JSON only. The plan must feel customized to the user's real day, current condition, season, and feedback, not generic.

Core rules:
1. Never ignore or replace the user's existing routine, foods, supplements, timings, or habits from the lifestyle description.
2. Keep those habits in the closest matching journey step, then enhance around them with calories, protein, fiber, hydration, and realistic portions.
3. If the user is in school, college, university, office, commuting, or away from home, include packable meals and outside fallback options.
4. Prefer real-life wording like "Carry 2 roti + paneer sabzi in lunchbox" or "Buy banana + peanuts from canteen if busy".
5. Avoid vague items such as only "salad" or "healthy snack". Make every item specific, affordable, and easy to follow.
6. Generate 10-15 small actions for the day instead of 4-5 large meals. Split big meals into simple habit steps such as warm water, poha, curd, fruit, roasted chana, lunchbox, milk, protein shake, and water.
7. Avoid medical claims, guarantees, cure language, diagnosis, or treatment instructions.
8. If health notes, injuries, allergies, symptoms, medication, or medical conditions are present, make conservative food adjustments and include "Consider consulting a professional" naturally in a relevant item.
9. Do not promise weight loss, muscle gain, disease improvement, pain relief, or guaranteed outcomes.
10. If the user is unwell, do NOT strictly enforce calorie/protein goals. Prioritize recovery, digestion, hydration, and simple foods over targets.
11. Optimize for the user's daily life context: student, day scholar, hosteller, office worker, gym goer, shift worker, commute, class schedule, canteen access, and cooking limits.
12. Prioritize easy, carryable, affordable, local foods: banana, roasted chana, peanuts, peanut butter sandwich, milk, curd, seasonal fruit, eggs if diet allows, paneer/tofu, dal, rice, roti, poha/upma, protein shake, buttermilk, and simple lunchbox foods. Avoid complex recipes unless the user already cooks them.
13. Adjust portions across the whole day to move toward realistic daily targets. Do not overload one node to hit targets.
14. Keep every meal item short: 1-2 lines maximum, no paragraphs.

AI priority order:
1. Health condition and recovery.
2. Digestion comfort.
3. Practicality for the user's day.
4. Nutrition goals.

Current check-in:
- Status: ${healthStatus}
- User note: ${healthText || "None"}
- Adaptation reason: ${adaptationReason}

Season context:
${seasonContext}

Dynamic adaptation rules:
- If stomach pain, acidity, sickness, nausea, injury, or low energy is reported, make the next pending meals lighter and recovery-focused.
- For stomach pain/acidity: avoid heavy, oily, spicy, fried, very high-fiber, and hard-to-digest foods. Prefer light options such as khichdi, curd if suitable, banana, soft rice, dal water, plain roti, light soup, or simple homemade meals.
- For low energy: keep meals gentle but add practical energy such as banana, curd, dal, poha/upma, rice, or light protein depending on diet type.
- For injury/sickness: reduce pressure, keep hydration steady, use easy protein only if digestion is comfortable, and include rest-friendly wording.
- Natural remedies may be suggested lightly and safely: tulsi water, ginger water, jeera water, or warm water. Phrase them as gentle options, not cures.
- Water timing: before meals, suggest small sips only if thirsty; during meals, minimal water; after meals, wait about 30-45 minutes if digestion feels sensitive. Adjust this based on the user's condition.
- If a meal was skipped or heavy, rebalance later meals instead of scolding. Example: missed/heavy breakfast means lunch becomes balanced and easy to digest.
- Communication style must be supportive: "Focus on light meals today, your body needs recovery" or "Let's keep it simple today." Do not say "complete your protein goal" when the user is unwell.

Current day meal status and feedback:
${formatCurrentMeals(userData.current_meals)}

Each item string should include useful nutrition context when natural, such as calories, protein, fiber, or water amount.
Also provide numeric calories, protein, carbs, fat, fiber, and water totals for every node. When unwell, these numbers can be lower because recovery comes first. Water-only nodes should use 0 calories, 0 protein, 0 carbs, 0 fat, 0 fiber, and water in liters.

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
      "carbs": 55,
      "fat": 14,
      "fiber": 7,
      "water": 0,
      "status": "pending",
      "is_user_customized": false
    }
  ]
}

Required journey style:
Use 10-15 roadmap nodes in chronological order. Prefer small action names such as "Warm water", "Poha", "Curd", "Fruit", "Water", "Lunchbox", "Roasted chana", "Protein shake", "Dinner" instead of combining many foods into one huge meal.

Example style:
8:00 AM Warm water
8:20 AM Poha
9:00 AM Curd
10:30 AM Water
11:30 AM Fruit

Daily target guidance:
- Estimate a realistic calorie and protein target from the user's weight, goal, and activity.
- Use practical quantities to move close to that target.
- For muscle gain or gym users, distribute protein across the day with realistic foods.
- For fat loss, keep foods simple and filling without extreme restriction.

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

export async function estimateMealNutrition(mealData) {
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
  const items = Array.isArray(mealData.items) ? mealData.items.join("\n") : mealData.items || "";

  const prompt = `
Estimate nutrition for this edited Indian meal or food action. Return JSON only.

Rules:
- Use realistic common Indian portions when exact quantity is not given.
- If quantity is given, honor it.
- Estimate calories, protein, carbs, fat, fiber, and water.
- Water is liters of plain water in this item. Use 0 for normal foods.
- Return numbers only, rounded to practical whole numbers except water can be decimal.
- Do not include explanation.

Meal name: ${mealData.name || "Meal"}
Food/action text:
${items}

Return this exact JSON shape:
{
  "calories": 210,
  "protein": 2,
  "carbs": 54,
  "fat": 1,
  "fiber": 6,
  "water": 0
}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const nutrition = extractJson(text);

  return {
    calories: Math.max(Number(nutrition.calories) || 0, 0),
    protein: Math.max(Number(nutrition.protein) || 0, 0),
    carbs: Math.max(Number(nutrition.carbs) || 0, 0),
    fat: Math.max(Number(nutrition.fat) || 0, 0),
    fiber: Math.max(Number(nutrition.fiber) || 0, 0),
    water: Math.max(Number(nutrition.water) || 0, 0)
  };
}

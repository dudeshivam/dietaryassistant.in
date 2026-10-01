const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canChangeMealStatus,
  getAutoSkipThresholdMinutes,
  normalizeMealStatus,
  shouldAutoSkipMeal
} = require("../lib/meal-rules.cjs");

test("only pending meals have valid terminal transitions", () => {
  assert.equal(canChangeMealStatus("pending", "completed"), true);
  assert.equal(canChangeMealStatus("pending", "skipped"), true);
  assert.equal(canChangeMealStatus("completed", "skipped"), false);
  assert.equal(canChangeMealStatus("skipped", "completed"), false);
  assert.equal(normalizeMealStatus("unexpected"), "pending");
});

test("auto-skip uses the fixed thresholds and never skips future meals", () => {
  const now = new Date("2026-10-01T12:00:00.000Z");
  assert.equal(getAutoSkipThresholdMinutes("Water"), 30);
  assert.equal(getAutoSkipThresholdMinutes("Evening snack"), 45);
  assert.equal(getAutoSkipThresholdMinutes("Lunch"), 60);
  assert.equal(shouldAutoSkipMeal({ mealName: "Water", status: "pending", scheduledAt: new Date("2026-10-01T11:29:00.000Z"), now }), true);
  assert.equal(shouldAutoSkipMeal({ mealName: "Snack", status: "pending", scheduledAt: new Date("2026-10-01T11:16:00.000Z"), now }), false);
  assert.equal(shouldAutoSkipMeal({ mealName: "Dinner", status: "pending", scheduledAt: new Date("2026-10-01T13:00:00.000Z"), now }), false);
  assert.equal(shouldAutoSkipMeal({ mealName: "Lunch", status: "completed", scheduledAt: new Date("2026-10-01T10:00:00.000Z"), now }), false);
});

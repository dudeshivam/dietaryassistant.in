function normalizeMealStatus(status) {
  const value = String(status || "pending").toLowerCase();
  return ["pending", "completed", "skipped"].includes(value) ? value : "pending";
}

function canChangeMealStatus(currentStatus, nextStatus) {
  return normalizeMealStatus(currentStatus) === "pending" &&
    ["completed", "skipped"].includes(normalizeMealStatus(nextStatus));
}

function getAutoSkipThresholdMinutes(mealName) {
  const name = String(mealName || "").toLowerCase();
  if (name.includes("water")) return 30;
  if (name.includes("snack") || name.includes("fruit") || name.includes("chana")) return 45;
  return 60;
}

function shouldAutoSkipMeal({ mealName, scheduledAt, status, now }) {
  if (normalizeMealStatus(status) !== "pending" || !(scheduledAt instanceof Date) || Number.isNaN(scheduledAt.getTime())) return false;
  const currentTime = now instanceof Date ? now : new Date();
  const elapsedMinutes = (currentTime.getTime() - scheduledAt.getTime()) / 60000;
  return elapsedMinutes > getAutoSkipThresholdMinutes(mealName);
}

module.exports = {
  canChangeMealStatus,
  getAutoSkipThresholdMinutes,
  normalizeMealStatus,
  shouldAutoSkipMeal
};

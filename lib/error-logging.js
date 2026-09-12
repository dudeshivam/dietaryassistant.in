export function getErrorDetails(error) {
  return {
    message: error?.message || String(error || "Unknown error"),
    stack: error?.stack || ""
  };
}

export async function logAppError(supabase, { action, component, error, userId }) {
  const details = getErrorDetails(error);

  console.error(`[${component}] ${action} failed`, error);

  if (!supabase) return;

  try {
    await supabase.from("app_error_logs").insert({
      user_id: userId || null,
      component,
      action,
      error: details.message,
      stack_trace: details.stack
    });
  } catch (logError) {
    console.error("[App logging] unable to persist error", logError);
  }
}

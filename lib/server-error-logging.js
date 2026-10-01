import { getErrorDetails } from "@/lib/error-logging";
import { createAdminClient } from "@/lib/supabase-admin";

export async function logServerError({ action, component, error, userId }) {
  const details = getErrorDetails(error);
  console.error(`[${component}] ${action} failed`, error);

  try {
    const supabase = createAdminClient();
    await supabase.from("app_error_logs").insert({
      user_id: userId || null,
      component,
      action,
      error: details.message,
      stack_trace: details.stack
    });
  } catch (loggingError) {
    console.error("Unable to persist server error", loggingError);
  }
}

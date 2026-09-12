import { createAdminClient } from "@/lib/supabase-admin";
import { getErrorDetails } from "@/lib/error-logging";

export async function logServerError({ action, component, error, userId }) {
  const details = getErrorDetails(error);

  console.error(`[${component}] ${action} failed`, error);

  try {
    const admin = createAdminClient();
    await admin.from("app_error_logs").insert({
      user_id: userId || null,
      component,
      action,
      error: details.message,
      stack_trace: details.stack
    });
  } catch (logError) {
    console.error("[Server logging] unable to persist error", logError);
  }
}

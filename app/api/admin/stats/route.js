import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const admin = createAdminClient();
    const [
      { data: successfulPayments, error: paymentsError },
      { count: activeSubscribers, error: subscribersError },
      { count: failedPayments, error: failedPaymentsError }
    ] = await Promise.all([
      admin.from("payments").select("amount").eq("status", "success"),
      admin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "premium")
        .gte("subscription_end", new Date().toISOString()),
      admin.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed")
    ]);

    if (paymentsError || subscribersError || failedPaymentsError) {
      throw paymentsError || subscribersError || failedPaymentsError;
    }

    const totalRevenue = (successfulPayments || []).reduce((sum, payment) => {
      return sum + Number(payment.amount || 0);
    }, 0);

    return NextResponse.json({
      totalRevenue,
      activeSubscribers: activeSubscribers || 0,
      failedPayments: failedPayments || 0
    });
  } catch (error) {
    console.error("Admin payment stats failed:", error);

    return NextResponse.json({ error: "Unable to load admin stats." }, { status: 500 });
  }
}

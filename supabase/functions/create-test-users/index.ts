import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: any[] = [];

  // Create admin user
  const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
    email: "admin@test.com",
    password: "admin123456",
    email_confirm: true,
    user_metadata: { full_name: "المدير" },
  });

  if (adminError && !adminError.message.includes("already")) {
    results.push({ user: "admin", error: adminError.message });
  } else {
    const adminId = adminData?.user?.id;
    if (adminId) {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: adminId, role: "admin" },
        { onConflict: "user_id,role" }
      );
    }
    results.push({ user: "admin", email: "admin@test.com", password: "admin123456" });
  }

  // Create cashier user
  const { data: cashierData, error: cashierError } = await supabaseAdmin.auth.admin.createUser({
    email: "cashier@test.com",
    password: "cashier123456",
    email_confirm: true,
    user_metadata: { full_name: "الكاشير" },
  });

  if (cashierError && !cashierError.message.includes("already")) {
    results.push({ user: "cashier", error: cashierError.message });
  } else {
    const cashierId = cashierData?.user?.id;
    if (cashierId) {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: cashierId, role: "cashier" },
        { onConflict: "user_id,role" }
      );
    }
    results.push({ user: "cashier", email: "cashier@test.com", password: "cashier123456" });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

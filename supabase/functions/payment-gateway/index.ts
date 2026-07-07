// Payment Gateway integration for STC Pay & Mada.
// This function acts as an abstraction layer: it currently runs in simulation
// mode (auto-approves and returns a signed reference) and is ready to be
// wired to real STC Pay / Mada acquirer APIs by setting the corresponding
// secrets (STCPAY_MERCHANT_ID / STCPAY_API_KEY / MADA_MERCHANT_ID / MADA_API_KEY)
// and enabling the `live` branch inside `callGateway`.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  action: z.enum(["initiate", "confirm", "refund"]),
  method: z.enum(["stcpay", "mada", "card", "applepay", "bank"]),
  amount: z.number().positive().max(1_000_000),
  store_id: z.string().uuid(),
  reference: z.string().max(64).optional(),
  mobile: z.string().max(20).optional(),
  otp: z.string().max(10).optional(),
  sale_id: z.string().uuid().optional(),
});

type GatewayResponse = {
  reference: string;
  gateway_ref: string;
  status: "pending" | "approved" | "failed";
  message: string;
  raw: Record<string, unknown>;
};

function randomRef(prefix: string) {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${t}-${r}`;
}

async function callGateway(
  body: z.infer<typeof BodySchema>,
): Promise<GatewayResponse> {
  const prefixMap: Record<string, string> = {
    stcpay: "STCP", mada: "MADA", card: "CARD", applepay: "APAY", bank: "BANK",
  };
  const prefix = prefixMap[body.method] ?? "PAY";

  const stcConfigured = Boolean(Deno.env.get("STCPAY_MERCHANT_ID") && Deno.env.get("STCPAY_API_KEY"));
  const madaConfigured = Boolean(Deno.env.get("MADA_MERCHANT_ID") && Deno.env.get("MADA_API_KEY"));

  // ---- live path (guarded, off by default) ------------------------------
  if (body.method === "stcpay" && stcConfigured) {
    // TODO: replace with real STC Pay Direct Payment API call.
    // return await fetch(...); parse response; map to GatewayResponse.
  }
  if ((body.method === "mada" || body.method === "card") && madaConfigured) {
    // TODO: replace with real Mada acquirer API call (e.g. HyperPay / PayTabs).
  }

  // ---- simulation path (default in dev / no secrets) --------------------
  const reference = body.reference?.trim() || randomRef(prefix);
  const gateway_ref = randomRef(`GW-${prefix}`);

  if (body.action === "initiate") {
    return {
      reference,
      gateway_ref,
      status: body.method === "stcpay" ? "pending" : "approved",
      message: body.method === "stcpay"
        ? "تم إرسال طلب الدفع إلى STC Pay - في انتظار موافقة العميل"
        : "تمت الموافقة (وضع محاكاة)",
      raw: { mode: "simulation", action: body.action, method: body.method, amount: body.amount },
    };
  }
  if (body.action === "confirm") {
    return {
      reference,
      gateway_ref,
      status: "approved",
      message: "تم تأكيد الدفع",
      raw: { mode: "simulation", action: body.action, otp_masked: body.otp ? "****" : null },
    };
  }
  return {
    reference,
    gateway_ref,
    status: "refunded" as unknown as "approved",
    message: "تم إرجاع المبلغ",
    raw: { mode: "simulation", action: body.action },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Validate caller identity (verify_jwt is disabled by default in Lovable).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = parsed.data;

    // Ensure the caller is a member of the store.
    const { data: member } = await supabase
      .from("store_members").select("role")
      .eq("store_id", body.store_id).eq("user_id", userData.user.id).maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Forbidden: not a store member" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await callGateway(body);

    return new Response(JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("payment-gateway error", err);
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

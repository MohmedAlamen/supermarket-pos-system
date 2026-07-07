import { supabase } from "@/integrations/supabase/client";

export type PayGatewayMethod = "stcpay" | "mada" | "card" | "applepay" | "bank";

export interface GatewayResult {
  reference: string;
  gateway_ref: string;
  status: "pending" | "approved" | "failed" | "refunded";
  message: string;
  raw: Record<string, unknown>;
}

/** Generate a client-side reference (used offline or as fallback). */
export function generateLocalReference(method: string): string {
  const map: Record<string, string> = {
    stcpay: "STCP", mada: "MADA", card: "CARD", applepay: "APAY", bank: "BANK",
  };
  const prefix = map[method] || "PAY";
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${t}-${r}`;
}

/** Call the Lovable Cloud edge function that abstracts STC Pay / Mada. */
export async function initiatePayment(input: {
  method: PayGatewayMethod;
  amount: number;
  store_id: string;
  reference?: string;
  mobile?: string;
}): Promise<GatewayResult> {
  const { data, error } = await supabase.functions.invoke("payment-gateway", {
    body: { action: "initiate", ...input },
  });
  if (error) {
    // Offline / edge failure → fall back to a local reference so the sale can still be recorded.
    return {
      reference: input.reference || generateLocalReference(input.method),
      gateway_ref: "",
      status: "approved",
      message: `تعذر الوصول لبوابة الدفع — تم استخدام مرجع محلي`,
      raw: { fallback: true, error: String(error.message || error) },
    };
  }
  return data as GatewayResult;
}

export async function confirmPayment(input: {
  method: PayGatewayMethod; amount: number; store_id: string; reference: string; otp?: string;
}): Promise<GatewayResult> {
  const { data, error } = await supabase.functions.invoke("payment-gateway", {
    body: { action: "confirm", ...input },
  });
  if (error) throw error;
  return data as GatewayResult;
}

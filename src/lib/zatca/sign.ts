import { supabase } from "@/integrations/supabase/client";

export interface SignPayload {
  branch_id: string;
  sale_id?: string;
  invoice_number: string;
  uuid: string;
  icv: number;
  issue_datetime: string;
  xml: string;
  invoice_hash: string;
  previous_invoice_hash: string;
  seller_name: string;
  vat_number: string;
  total_with_vat: number;
  vat_total: number;
}

export interface SignResult {
  signed_xml: string;
  signature_value: string;
  qr_code_signed: string;
  mode: string;
  signed_at: string;
}

/**
 * Calls the zatca-sign edge function. Returns null when the branch has no
 * CSID configured yet (caller keeps the unsigned invoice), throws on other
 * failures so the caller can surface them.
 */
export async function signInvoiceWithCsid(payload: SignPayload): Promise<SignResult | null> {
  const { data, error } = await supabase.functions.invoke("zatca-sign", { body: payload });
  if (error) {
    // 412 => branch not configured with CSID; treat as "skip signing".
    const msg = String(error.message || "");
    if (msg.includes("csid_not_configured") || msg.includes("412")) return null;
    throw error;
  }
  if (data?.error === "csid_not_configured") return null;
  return data as SignResult;
}

import { supabase } from "@/integrations/supabase/client";
import { buildZatcaInvoice, GENESIS_PIH, type ZatcaLine } from "@/lib/zatca";
import { signInvoiceWithCsid } from "@/lib/zatca/sign";

export interface ZatcaBuildContext {
  branchId: string;
  invoiceNumber: string;
  icv: number;
  issueDateISO: string;
  invoiceType: "simplified" | "standard";
  items: { name: string; price: number; quantity: number }[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  customer?: { name?: string | null; tax_number?: string | null; address?: string | null } | null;
}

async function loadBranch(branchId: string) {
  const { data } = await (supabase as any)
    .from("branches")
    .select("id, name, tax_number, address, city, common_name, organization_name, country_code, crn, last_invoice_hash, invoice_counter, invoice_prefix")
    .eq("id", branchId)
    .maybeSingle();
  return data;
}

async function loadStore() {
  const { data } = await (supabase as any)
    .from("store_settings")
    .select("store_name, tax_number, address, tax_rate")
    .limit(1)
    .maybeSingle();
  return data;
}

/**
 * Build ZATCA e-invoice payload and advance the branch hash chain.
 * Called from the online save path AND from the offline sync path,
 * after the official branch invoice number + ICV are known.
 */
export async function buildAndPersistZatca(ctx: ZatcaBuildContext) {
  const [branch, store] = await Promise.all([loadBranch(ctx.branchId), loadStore()]);
  if (!branch) throw new Error("Branch not found for ZATCA build");

  const vatRate = ctx.subtotal > 0 ? (ctx.taxAmount / Math.max(ctx.subtotal - ctx.discountAmount, 0.0001)) * 100 : 0;
  const lines: ZatcaLine[] = ctx.items.map((it) => {
    const lineNet = it.price * it.quantity;
    const share = ctx.subtotal > 0 ? lineNet / ctx.subtotal : 0;
    const lineNetAfterDisc = lineNet - ctx.discountAmount * share;
    const lineVat = ctx.taxAmount * share;
    return {
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.price,
      lineTotal: +lineNetAfterDisc.toFixed(2),
      vatRate: +vatRate.toFixed(2),
      vatAmount: +lineVat.toFixed(2),
    };
  });

  const seller = {
    name: branch.organization_name || store?.store_name || branch.name || "متجر",
    vatNumber: branch.tax_number || store?.tax_number || "",
    crn: branch.crn || undefined,
    address: branch.address || store?.address || undefined,
    city: branch.city || undefined,
    country: branch.country_code || "SA",
  };

  const previousInvoiceHash = branch.last_invoice_hash || GENESIS_PIH;

  const built = await buildZatcaInvoice({
    invoiceNumber: ctx.invoiceNumber,
    icv: ctx.icv,
    previousInvoiceHash,
    issueDateISO: ctx.issueDateISO,
    invoiceType: ctx.invoiceType,
    seller,
    customer: ctx.customer
      ? { name: ctx.customer.name || null, vatNumber: ctx.customer.tax_number || null, address: ctx.customer.address || null }
      : null,
    lines,
    subtotal: +ctx.subtotal.toFixed(2),
    discountTotal: +ctx.discountAmount.toFixed(2),
    vatTotal: +ctx.taxAmount.toFixed(2),
    grandTotal: +ctx.total.toFixed(2),
  });

  // Advance chain — best-effort optimistic update.
  await (supabase as any)
    .from("branches")
    .update({ last_invoice_hash: built.invoiceHash })
    .eq("id", ctx.branchId);

  // Digital signing (CSID) — Phase 2. Skips gracefully if branch has no CSID yet.
  let signed: Awaited<ReturnType<typeof signInvoiceWithCsid>> = null;
  let signingStatus: "signed" | "unsigned" | "failed" = "unsigned";
  let signingError: string | null = null;
  try {
    signed = await signInvoiceWithCsid({
      branch_id: ctx.branchId,
      invoice_number: ctx.invoiceNumber,
      uuid: built.uuid,
      icv: ctx.icv,
      issue_datetime: ctx.issueDateISO,
      xml: built.xml,
      invoice_hash: built.invoiceHash,
      previous_invoice_hash: previousInvoiceHash,
      seller_name: seller.name,
      vat_number: seller.vatNumber,
      total_with_vat: +ctx.total.toFixed(2),
      vat_total: +ctx.taxAmount.toFixed(2),
    });
    if (signed) signingStatus = "signed";
  } catch (err: any) {
    console.error("ZATCA signing failed:", err);
    signingStatus = "failed";
    signingError = String(err?.message || err);
  }

  return {
    uuid_zatca: built.uuid,
    previous_invoice_hash: previousInvoiceHash,
    invoice_hash: built.invoiceHash,
    xml_content: signed?.signed_xml || built.xml,
    qr_code: signed?.qr_code_signed || built.qrBase64,
    icv: ctx.icv,
    invoice_type: ctx.invoiceType,
    zatca_status: "not_submitted" as const,
    signed_xml: signed?.signed_xml || null,
    signature_value: signed?.signature_value || null,
    qr_code_signed: signed?.qr_code_signed || null,
    signing_status: signingStatus,
    signing_error: signingError,
    signed_at: signed?.signed_at || null,
  };
}

/** Compute ICV = invoice_counter after the RPC advanced it. We read it back. */
export async function readBranchCounter(branchId: string): Promise<number> {
  const { data } = await (supabase as any)
    .from("branches")
    .select("invoice_counter")
    .eq("id", branchId)
    .maybeSingle();
  return Number(data?.invoice_counter || 0);
}

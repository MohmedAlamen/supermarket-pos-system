import { supabase } from "@/integrations/supabase/client";
import { buildZatcaInvoice, GENESIS_PIH, type ZatcaLine } from "@/lib/zatca";

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

  return {
    uuid_zatca: built.uuid,
    previous_invoice_hash: previousInvoiceHash,
    invoice_hash: built.invoiceHash,
    xml_content: built.xml,
    qr_code: built.qrBase64,
    icv: ctx.icv,
    invoice_type: ctx.invoiceType,
    zatca_status: "not_submitted" as const,
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

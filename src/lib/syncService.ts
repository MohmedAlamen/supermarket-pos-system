import { supabase } from "@/integrations/supabase/client";
import {
  pendingSales, markSynced, markFailed, markStockAdjusted,
  pendingCount, type PendingSale,
} from "@/lib/offlineDB";
import { toast } from "sonner";
import { buildAndPersistZatca, readBranchCounter } from "@/lib/zatca/persist";

let syncing = false;
const listeners = new Set<(count: number) => void>();
const syncedListeners = new Set<(sale: PendingSale) => void>();

export function onPendingChange(cb: (count: number) => void) {
  listeners.add(cb);
  pendingCount().then(cb);
  return () => { listeners.delete(cb); };
}

export function onSaleSynced(cb: (sale: PendingSale) => void) {
  syncedListeners.add(cb);
  return () => { syncedListeners.delete(cb); };
}

export async function notifyPendingChanged() {
  const c = await pendingCount();
  listeners.forEach((l) => l(c));
}

export async function syncPendingSales(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0, failed = 0;
  try {
    const queue = await pendingSales();
    for (const s of queue) {
      try {
        const { data: inv, error: invErr } = await (supabase as any)
          .rpc("generate_branch_invoice_number", { _branch_id: s.branch_id });
        if (invErr) throw invErr;
        const invoice_number = inv || s.local_invoice_number;
        const icv = await readBranchCounter(s.branch_id);

        let customerForZatca: any = null;
        if (s.customer_id) {
          const { data: c } = await (supabase as any)
            .from("customers").select("name, tax_number, address").eq("id", s.customer_id).maybeSingle();
          customerForZatca = c;
        }
        const discountAmount = (Number(s.subtotal) * Number(s.discount || 0)) / 100;
        const zatca = await buildAndPersistZatca({
          branchId: s.branch_id,
          invoiceNumber: invoice_number,
          icv,
          issueDateISO: s.created_at,
          invoiceType: customerForZatca?.tax_number ? "standard" : "simplified",
          items: s.items.map((it) => ({ name: it.name, price: it.price, quantity: it.quantity })),
          subtotal: s.subtotal,
          discountAmount,
          taxAmount: s.tax_amount,
          total: s.total,
          customer: customerForZatca,
        });

        const { error } = await (supabase as any).from("sales").insert({
          cashier_id: s.cashier_id,
          branch_id: s.branch_id,
          invoice_number,
          customer_id: s.customer_id,
          items: s.items,
          subtotal: s.subtotal,
          tax_amount: s.tax_amount,
          total: s.total,
          discount: s.discount,
          payment_method: s.payment_method,
          payment_status: s.payment_status || "paid",
          payment_gateway: s.payment_gateway || "manual",
          payment_reference: s.payment_reference || null,
          payments: s.payments || [{ method: s.payment_method, amount: s.total }],
          created_at: s.created_at,
          ...zatca,
        });
        if (error) throw error;

        for (const it of s.items) {
          const { data: row } = await (supabase as any)
            .from("branch_stock")
            .select("stock")
            .eq("branch_id", s.branch_id)
            .eq("product_id", it.product_id)
            .maybeSingle();
          const current = Number(row?.stock || 0);
          await (supabase as any).from("branch_stock").upsert(
            { branch_id: s.branch_id, product_id: it.product_id, stock: Math.max(0, current - it.quantity) },
            { onConflict: "branch_id,product_id" }
          );
        }

        await markSynced(s.id!, invoice_number);
        const updated: PendingSale = { ...s, status: "synced", final_invoice_number: invoice_number };
        syncedListeners.forEach((l) => l(updated));
        synced++;
      } catch (err: any) {
        console.error("sync failed for sale", s.id, err);
        await markFailed(s.id!, String(err?.message || err));
        failed++;
      }
    }
  } finally {
    syncing = false;
    await notifyPendingChanged();
  }
  if (synced > 0) toast.success(`تمت مزامنة ${synced} فاتورة`);
  if (failed > 0) toast.error(`فشلت مزامنة ${failed} فاتورة`);
  return { synced, failed };
}

export function initSyncService() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => { syncPendingSales(); });
  setTimeout(() => { syncPendingSales(); }, 1500);
  setInterval(() => { syncPendingSales(); }, 30000);
}

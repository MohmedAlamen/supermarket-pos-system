import { supabase } from "@/integrations/supabase/client";
import { pendingSales, removePending, bumpAttempts, pendingCount } from "@/lib/offlineDB";
import { toast } from "sonner";

let syncing = false;
const listeners = new Set<(count: number) => void>();

export function onPendingChange(cb: (count: number) => void) {
  listeners.add(cb);
  pendingCount().then(cb);
  return () => listeners.delete(cb);
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
        // Get real branch invoice number
        const { data: inv, error: invErr } = await (supabase as any)
          .rpc("generate_branch_invoice_number", { _branch_id: s.branch_id });
        if (invErr) throw invErr;
        const invoice_number = inv || s.local_invoice_number;

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
          created_at: s.created_at,
        });
        if (error) throw error;

        // Decrement branch_stock
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

        await removePending(s.id!);
        synced++;
      } catch (err) {
        console.error("sync failed for sale", s.id, err);
        await bumpAttempts(s.id!);
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
  // Initial attempt + interval
  setTimeout(() => { syncPendingSales(); }, 1500);
  setInterval(() => { syncPendingSales(); }, 30000);
}

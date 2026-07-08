import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { CartItem } from "@/types/pos";
import { toast } from "sonner";
import { enqueueSale, type PaymentEntry } from "@/lib/offlineDB";
import { syncPendingSales, notifyPendingChanged } from "@/lib/syncService";
import { buildAndPersistZatca, readBranchCounter } from "@/lib/zatca/persist";

function localInvoiceNumber(prefix: string) {
  const d = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${prefix}-OFF-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function useSales() {
  const { user } = useAuth();
  const { currentBranch } = useBranch();

  const saveSale = async (sale: {
    items: CartItem[];
    subtotal: number;
    discount: number;
    discountAmount: number;
    tax_amount?: number;
    total: number;
    paymentMethod: string;
    cashReceived?: number;
    change?: number;
    customer_id?: string | null;
    payments?: PaymentEntry[];
    payment_status?: string;
    payment_reference?: string | null;
    payment_gateway?: string;
    coupon?: { id: string; code: string; discount: number } | null;
    loyalty?: { points_redeemed: number; loyalty_discount: number } | null;
  }): Promise<{ ok: boolean; invoice_number?: string; qr_code?: string; offline?: boolean }> => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return { ok: false }; }
    if (!currentBranch) { toast.error("يجب اختيار الفرع أولاً"); return { ok: false }; }

    const itemsPayload = sale.items.map((item) => ({
      product_id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
    }));

    const payments = sale.payments || [{ method: sale.paymentMethod, amount: sale.total, reference: sale.payment_reference || undefined }];
    const payment_status = sale.payment_status || "paid";
    const payment_gateway = sale.payment_gateway || "manual";
    const payment_reference = sale.payment_reference || null;

    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    const client_uid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

    if (offline) {
      const invoice_number = localInvoiceNumber(currentBranch.invoice_prefix || "INV");
      await enqueueSale({
        client_uid,
        branch_id: currentBranch.id,
        cashier_id: user.id,
        customer_id: sale.customer_id || null,
        items: itemsPayload,
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax_amount: sale.tax_amount || 0,
        total: sale.total,
        payment_method: sale.paymentMethod,
        payment_status,
        payment_gateway,
        payment_reference,
        payments,
        local_invoice_number: invoice_number,
        created_at: new Date().toISOString(),
      });
      await notifyPendingChanged();
      toast.success("تم حفظ الفاتورة محلياً (وضع عدم الاتصال). ستتم المزامنة عند عودة الاتصال.");
      return { ok: true, invoice_number, offline: true };
    }

    try {
      const { data: invData, error: invErr } = await (supabase as any)
        .rpc("generate_branch_invoice_number", { _branch_id: currentBranch.id });
      if (invErr) throw invErr;
      const invoice_number = invData || `INV-${Date.now()}`;
      const icv = await readBranchCounter(currentBranch.id);

      // Build ZATCA e-invoice (XML + QR + hash chain).
      let customerForZatca: any = null;
      if (sale.customer_id) {
        const { data: c } = await (supabase as any)
          .from("customers").select("name, tax_number, address").eq("id", sale.customer_id).maybeSingle();
        customerForZatca = c;
      }
      const zatca = await buildAndPersistZatca({
        branchId: currentBranch.id,
        invoiceNumber: invoice_number,
        icv,
        issueDateISO: new Date().toISOString(),
        invoiceType: customerForZatca?.tax_number ? "standard" : "simplified",
        items: itemsPayload.map((it) => ({ name: it.name, price: it.price, quantity: it.quantity })),
        subtotal: sale.subtotal,
        discountAmount: sale.discountAmount,
        taxAmount: sale.tax_amount || 0,
        total: sale.total,
        customer: customerForZatca,
      });

      const storeId = (currentBranch as any).store_id || null;
      const { data: saleRow, error } = await (supabase as any).from("sales").insert({
        cashier_id: user.id,
        branch_id: currentBranch.id,
        store_id: storeId,
        client_uid,
        invoice_number,
        customer_id: sale.customer_id || null,
        items: itemsPayload,
        subtotal: sale.subtotal,
        tax_amount: sale.tax_amount || 0,
        total: sale.total,
        discount: sale.discount,
        payment_method: sale.paymentMethod,
        payment_status,
        payment_gateway,
        payment_reference,
        payments,
        coupon_id: sale.coupon?.id || null,
        coupon_code: sale.coupon?.code || null,
        coupon_discount: sale.coupon?.discount || 0,
        loyalty_points_redeemed: sale.loyalty?.points_redeemed || 0,
        loyalty_discount: sale.loyalty?.loyalty_discount || 0,
        ...zatca,
      }).select("id").single();
      if (error) throw error;
      const saleId = saleRow?.id;

      for (const it of sale.items) {
        const { data: row } = await (supabase as any)
          .from("branch_stock")
          .select("stock")
          .eq("branch_id", currentBranch.id)
          .eq("product_id", it.product.id)
          .maybeSingle();
        const current = Number(row?.stock || 0);
        await (supabase as any).from("branch_stock").upsert(
          { branch_id: currentBranch.id, product_id: it.product.id, stock: Math.max(0, current - it.quantity) },
          { onConflict: "branch_id,product_id" }
        );
      }

      // Loyalty program + coupon side-effects
      let pointsEarned = 0;
      if (storeId && sale.customer_id) {
        const { data: program } = await (supabase as any)
          .from("loyalty_programs")
          .select("is_active, points_per_currency")
          .eq("store_id", storeId).maybeSingle();
        if (program?.is_active) {
          pointsEarned = Math.floor(Math.max(0, sale.total) * Number(program.points_per_currency || 0));
          if (pointsEarned > 0) {
            await (supabase as any).from("loyalty_transactions").insert({
              store_id: storeId, customer_id: sale.customer_id, sale_id: saleId,
              type: "earn", points: pointsEarned, reason: `فاتورة ${invoice_number}`, created_by: user.id,
            });
          }
        }
        if (sale.loyalty && sale.loyalty.points_redeemed > 0) {
          await (supabase as any).from("loyalty_transactions").insert({
            store_id: storeId, customer_id: sale.customer_id, sale_id: saleId,
            type: "redeem", points: -Math.abs(sale.loyalty.points_redeemed),
            reason: `استرداد على فاتورة ${invoice_number}`, created_by: user.id,
          });
        }
        // update total_purchases + earned points cached column
        if (pointsEarned > 0) {
          await (supabase as any).from("sales").update({ loyalty_points_earned: pointsEarned }).eq("id", saleId);
        }
        const { data: cust } = await (supabase as any)
          .from("customers").select("total_purchases").eq("id", sale.customer_id).maybeSingle();
        if (cust) {
          await (supabase as any).from("customers").update({
            total_purchases: Number(cust.total_purchases || 0) + sale.total,
          }).eq("id", sale.customer_id);
        }
      }

      if (storeId && sale.coupon?.id) {
        await (supabase as any).from("coupon_redemptions").insert({
          store_id: storeId, coupon_id: sale.coupon.id, customer_id: sale.customer_id || null,
          sale_id: saleId, discount_applied: sale.coupon.discount, redeemed_by: user.id,
        });
      }

      // Persist a payment_transactions row per payment line (STC Pay / Mada / cash / ...)
      if (storeId && payments.length > 0) {
        const rows = payments.map((p: any) => ({
          store_id: storeId,
          sale_id: saleId,
          method: p.method,
          amount: Number(p.amount) || 0,
          reference: p.reference || `${(p.method || "PAY").toUpperCase()}-${Date.now()}`,
          gateway_ref: p.gateway_ref || null,
          gateway: p.gateway || sale.payment_gateway || "manual",
          status: (p.status as any) || "approved",
          raw_response: p.raw || null,
          created_by: user.id,
        }));
        await (supabase as any).from("payment_transactions").insert(rows);
      }

      syncPendingSales();
      return { ok: true, invoice_number, qr_code: zatca.qr_code };
    } catch (err) {
      console.error("online save failed, falling back to offline queue", err);
      const invoice_number = localInvoiceNumber(currentBranch.invoice_prefix || "INV");
      await enqueueSale({
        client_uid, // reuse same idempotency key → sync dedupes if the server actually got it
        branch_id: currentBranch.id,
        cashier_id: user.id,
        customer_id: sale.customer_id || null,
        items: itemsPayload,
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax_amount: sale.tax_amount || 0,
        total: sale.total,
        payment_method: sale.paymentMethod,
        payment_status,
        payment_gateway,
        payment_reference,
        payments,
        local_invoice_number: invoice_number,
        created_at: new Date().toISOString(),
      });
      await notifyPendingChanged();
      toast.warning("تعذر الاتصال بالخادم - تم حفظ الفاتورة محلياً");
      return { ok: true, invoice_number, offline: true };
    }
  };

  return { saveSale };
}


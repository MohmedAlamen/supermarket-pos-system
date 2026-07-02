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

    if (offline) {
      const invoice_number = localInvoiceNumber(currentBranch.invoice_prefix || "INV");
      await enqueueSale({
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

      const { error } = await (supabase as any).from("sales").insert({
        cashier_id: user.id,
        branch_id: currentBranch.id,
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
        ...zatca,
      });
      if (error) throw error;

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

      if (sale.customer_id) {
        const { data: cust } = await (supabase as any)
          .from("customers").select("loyalty_points, total_purchases").eq("id", sale.customer_id).maybeSingle();
        if (cust) {
          const { data: settings } = await (supabase as any)
            .from("store_settings").select("loyalty_points_per_unit").limit(1).maybeSingle();
          const rate = Number(settings?.loyalty_points_per_unit ?? 0.01);
          await (supabase as any).from("customers").update({
            loyalty_points: Math.floor((cust.loyalty_points || 0) + sale.total * rate),
            total_purchases: Number(cust.total_purchases || 0) + sale.total,
          }).eq("id", sale.customer_id);
        }
      }

      syncPendingSales();
      return { ok: true, invoice_number, qr_code: zatca.qr_code };
    } catch (err) {
      console.error("online save failed, falling back to offline queue", err);
      const invoice_number = localInvoiceNumber(currentBranch.invoice_prefix || "INV");
      await enqueueSale({
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


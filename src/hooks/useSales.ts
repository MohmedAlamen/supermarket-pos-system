import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CartItem } from "@/types/pos";
import { toast } from "sonner";

export function useSales() {
  const { user } = useAuth();

  const saveSale = async (sale: {
    items: CartItem[];
    subtotal: number;
    discount: number;
    discountAmount: number;
    total: number;
    paymentMethod: "cash" | "card";
    cashReceived?: number;
    change?: number;
  }) => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return false;
    }

    const { error } = await (supabase as any).from("sales").insert({
      user_id: user.id,
      items: sale.items.map((item) => ({
        product_id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      })),
      subtotal: sale.subtotal,
      discount: sale.discount,
      discount_amount: sale.discountAmount,
      total: sale.total,
      payment_method: sale.paymentMethod,
      cash_received: sale.cashReceived ?? null,
      change_amount: sale.change ?? null,
    });

    if (error) {
      toast.error("خطأ في حفظ عملية البيع");
      console.error(error);
      return false;
    }
    return true;
  };

  return { saveSale };
}

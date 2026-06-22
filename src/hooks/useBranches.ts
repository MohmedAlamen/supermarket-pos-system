import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBranch, Branch } from "@/contexts/BranchContext";

export function useBranches() {
  const { branches, reload, loading } = useBranch();

  const addBranch = async (b: {
    name: string; code: string; invoice_prefix: string;
    address?: string; phone?: string; tax_number?: string;
  }) => {
    const { error } = await (supabase as any).from("branches").insert({
      name: b.name,
      code: b.code.toUpperCase(),
      invoice_prefix: (b.invoice_prefix || b.code).toUpperCase(),
      address: b.address || null,
      phone: b.phone || null,
      tax_number: b.tax_number || null,
    });
    if (error) { toast.error("خطأ في إضافة الفرع: " + error.message); return false; }
    toast.success("تم إضافة الفرع");
    await reload();
    return true;
  };

  const updateBranch = async (id: string, updates: Partial<Branch>) => {
    const { error } = await (supabase as any).from("branches").update(updates).eq("id", id);
    if (error) { toast.error("خطأ في تحديث الفرع"); return false; }
    toast.success("تم التحديث");
    await reload();
    return true;
  };

  const deleteBranch = async (id: string) => {
    const { error } = await (supabase as any).from("branches").update({ is_active: false }).eq("id", id);
    if (error) { toast.error("خطأ في حذف الفرع"); return false; }
    toast.success("تم إلغاء تفعيل الفرع");
    await reload();
    return true;
  };

  return { branches, loading, addBranch, updateBranch, deleteBranch, reload };
}

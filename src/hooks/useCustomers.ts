import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/pos";
import { toast } from "sonner";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("customers")
      .select("*")
      .order("name");
    if (error) {
      toast.error("خطأ في تحميل العملاء");
      console.error(error);
    } else {
      setCustomers(
        (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          email: c.email || "",
          address: c.address || "",
          loyalty_points: c.loyalty_points || 0,
          total_purchases: Number(c.total_purchases) || 0,
          notes: c.notes || "",
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const addCustomer = async (data: Omit<Customer, "id" | "loyalty_points" | "total_purchases">) => {
    const { error } = await (supabase as any).from("customers").insert({
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      notes: data.notes,
    });
    if (error) {
      toast.error("خطأ في إضافة العميل");
      return false;
    }
    toast.success("تم إضافة العميل");
    await fetchCustomers();
    return true;
  };

  const updateCustomer = async (id: string, data: Partial<Customer>) => {
    const { error } = await (supabase as any).from("customers").update(data).eq("id", id);
    if (error) {
      toast.error("خطأ في تحديث العميل");
      return false;
    }
    toast.success("تم التحديث");
    await fetchCustomers();
    return true;
  };

  const deleteCustomer = async (id: string) => {
    const { error } = await (supabase as any).from("customers").delete().eq("id", id);
    if (error) {
      toast.error("خطأ في الحذف");
      return false;
    }
    toast.success("تم الحذف");
    await fetchCustomers();
    return true;
  };

  return { customers, loading, fetchCustomers, addCustomer, updateCustomer, deleteCustomer };
}

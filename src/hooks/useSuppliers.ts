import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Supplier } from "@/types/pos";
import { toast } from "sonner";

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("suppliers")
      .select("*")
      .order("name");
    if (error) {
      toast.error("خطأ في تحميل الموردين");
      console.error(error);
    } else {
      setSuppliers(
        (data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          phone: s.phone || "",
          email: s.email || "",
          address: s.address || "",
          contact_person: s.contact_person || "",
          balance: Number(s.balance) || 0,
          notes: s.notes || "",
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const addSupplier = async (data: Omit<Supplier, "id" | "balance">) => {
    const { error } = await (supabase as any).from("suppliers").insert({
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      contact_person: data.contact_person,
      notes: data.notes,
    });
    if (error) {
      toast.error("خطأ في إضافة المورد");
      return false;
    }
    toast.success("تم إضافة المورد");
    await fetchSuppliers();
    return true;
  };

  const updateSupplier = async (id: string, data: Partial<Supplier>) => {
    const { error } = await (supabase as any).from("suppliers").update(data).eq("id", id);
    if (error) {
      toast.error("خطأ في التحديث");
      return false;
    }
    toast.success("تم التحديث");
    await fetchSuppliers();
    return true;
  };

  const deleteSupplier = async (id: string) => {
    const { error } = await (supabase as any).from("suppliers").delete().eq("id", id);
    if (error) {
      toast.error("خطأ في الحذف");
      return false;
    }
    toast.success("تم الحذف");
    await fetchSuppliers();
    return true;
  };

  return { suppliers, loading, fetchSuppliers, addSupplier, updateSupplier, deleteSupplier };
}

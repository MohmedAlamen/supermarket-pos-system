import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StoreSettings } from "@/types/pos";
import { toast } from "sonner";

const DEFAULTS: StoreSettings = {
  id: "",
  store_name: "متجر السوبر ماركت",
  tax_number: "",
  tax_rate: 15,
  address: "",
  phone: "",
  email: "",
  invoice_counter: 1000,
  loyalty_points_per_unit: 0.01,
};

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("store_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) {
      setSettings({
        id: data.id,
        store_name: data.store_name || DEFAULTS.store_name,
        tax_number: data.tax_number || "",
        tax_rate: Number(data.tax_rate) || 0,
        address: data.address || "",
        phone: data.phone || "",
        email: data.email || "",
        invoice_counter: data.invoice_counter || 1000,
        loyalty_points_per_unit: Number(data.loyalty_points_per_unit) || 0,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const updateSettings = async (updates: Partial<StoreSettings>) => {
    if (!settings.id) {
      toast.error("لا توجد إعدادات");
      return false;
    }
    const { error } = await (supabase as any)
      .from("store_settings")
      .update(updates)
      .eq("id", settings.id);
    if (error) {
      toast.error("خطأ في تحديث الإعدادات");
      return false;
    }
    toast.success("تم حفظ الإعدادات");
    await fetch();
    return true;
  };

  return { settings, loading, updateSettings };
}

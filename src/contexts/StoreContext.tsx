import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type StoreRole = "owner" | "admin" | "manager" | "cashier";

export interface Store {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  logo_url: string | null;
  is_active: boolean;
  my_role?: StoreRole;
}

interface StoreContextValue {
  stores: Store[];
  currentStore: Store | null;
  currentRole: StoreRole | null;
  setCurrentStoreId: (id: string) => void;
  loading: boolean;
  reload: () => Promise<void>;
  createStore: (name: string) => Promise<Store | null>;
}

const StoreContext = createContext<StoreContextValue | null>(null);
const STORAGE_KEY = "pos.currentStoreId";

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStoreId, setIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) { setStores([]); setLoading(false); return; }
    setLoading(true);
    // membership → store (RLS ensures we only see our own)
    const { data: memberships, error: mErr } = await (supabase as any)
      .from("store_members")
      .select("role, store_id, stores!inner(id, name, slug, owner_id, logo_url, is_active)")
      .eq("user_id", user.id);
    if (mErr) {
      console.error(mErr);
      toast.error("خطأ في تحميل المتاجر");
      setLoading(false);
      return;
    }
    const list: Store[] = (memberships || []).map((m: any) => ({
      ...m.stores,
      my_role: m.role as StoreRole,
    }));
    setStores(list);
    const exists = list.find((s) => s.id === currentStoreId);
    if (!exists && list.length > 0) {
      setIdState(list[0].id);
      localStorage.setItem(STORAGE_KEY, list[0].id);
    }
    setLoading(false);
  }, [user, currentStoreId]);

  useEffect(() => { reload(); }, [user]); // eslint-disable-line

  const setCurrentStoreId = useCallback((id: string) => {
    setIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const createStore = useCallback(async (name: string) => {
    if (!user) return null;
    const { data, error } = await (supabase as any)
      .from("stores")
      .insert({ name, owner_id: user.id })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    toast.success("تم إنشاء المتجر");
    await reload();
    setCurrentStoreId(data.id);
    return data as Store;
  }, [user, reload, setCurrentStoreId]);

  const currentStore = stores.find((s) => s.id === currentStoreId) || null;
  const currentRole = currentStore?.my_role || null;

  return (
    <StoreContext.Provider value={{ stores, currentStore, currentRole, setCurrentStoreId, loading, reload, createStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

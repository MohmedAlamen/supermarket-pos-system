import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Branch {
  id: string;
  name: string;
  code: string;
  invoice_prefix: string;
  invoice_counter: number;
  address: string | null;
  phone: string | null;
  tax_number: string | null;
  is_active: boolean;
}

interface BranchContextValue {
  branches: Branch[];
  currentBranch: Branch | null;
  setCurrentBranchId: (id: string) => void;
  loading: boolean;
  reload: () => Promise<void>;
}

const BranchContext = createContext<BranchContextValue | null>(null);
const STORAGE_KEY = "pos.currentBranchId";

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranchId, setIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("branches")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) {
      toast.error("خطأ في تحميل الفروع");
    } else {
      const list = (data || []) as Branch[];
      setBranches(list);
      // Auto-pick first branch if none chosen or chosen doesn't exist
      const exists = list.find((b) => b.id === currentBranchId);
      if (!exists && list.length > 0) {
        setIdState(list[0].id);
        localStorage.setItem(STORAGE_KEY, list[0].id);
      }
    }
    setLoading(false);
  }, [currentBranchId]);

  useEffect(() => { reload(); }, []); // eslint-disable-line

  const setCurrentBranchId = useCallback((id: string) => {
    setIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const currentBranch = branches.find((b) => b.id === currentBranchId) || null;

  return (
    <BranchContext.Provider value={{ branches, currentBranch, setCurrentBranchId, loading, reload }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used inside BranchProvider");
  return ctx;
}

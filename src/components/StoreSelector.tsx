import { Building2 } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useNavigate } from "react-router-dom";

export default function StoreSelector() {
  const { stores, currentStore, setCurrentStoreId, loading } = useStore();
  const navigate = useNavigate();

  if (loading) return null;

  if (stores.length === 0) {
    return (
      <button
        onClick={() => navigate("/stores")}
        className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/30 rounded-md px-2 py-1 text-sm font-medium"
      >
        <Building2 className="h-4 w-4" />
        إنشاء متجر
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-secondary border border-border rounded-md px-2 py-1 text-sm">
      <Building2 className="h-4 w-4 text-primary" />
      <select
        value={currentStore?.id || ""}
        onChange={(e) => {
          if (e.target.value === "__manage__") { navigate("/stores"); return; }
          setCurrentStoreId(e.target.value);
        }}
        className="bg-transparent outline-none cursor-pointer font-medium"
        aria-label="اختيار المتجر"
      >
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
        <option value="__manage__">— إدارة المتاجر —</option>
      </select>
    </div>
  );
}

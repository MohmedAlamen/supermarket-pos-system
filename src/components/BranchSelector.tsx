import { Store } from "lucide-react";
import { useBranch } from "@/contexts/BranchContext";

export default function BranchSelector() {
  const { branches, currentBranch, setCurrentBranchId, loading } = useBranch();
  if (loading || branches.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 bg-secondary border border-border rounded-md px-2 py-1 text-sm">
      <Store className="h-4 w-4 text-primary" />
      <select
        value={currentBranch?.id || ""}
        onChange={(e) => setCurrentBranchId(e.target.value)}
        className="bg-transparent outline-none cursor-pointer font-medium"
        aria-label="اختيار الفرع"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
  );
}

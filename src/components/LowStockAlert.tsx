import { useEffect, useState, useRef } from "react";
import { AlertTriangle, Bell, X } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STORAGE_KEY = "lowStockThreshold";
const NOTIFIED_KEY = "lowStockNotified";

export default function LowStockAlert() {
  const { products, loading } = useProducts();
  const [threshold, setThreshold] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) : 10;
  });
  const [open, setOpen] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());

  const lowStockProducts = products.filter((p) => p.stock <= threshold);
  const outOfStock = lowStockProducts.filter((p) => p.stock === 0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(threshold));
  }, [threshold]);

  // Show toast notifications when products drop below threshold (once per session per product)
  useEffect(() => {
    if (loading) return;
    const sessionNotified: string[] = JSON.parse(
      sessionStorage.getItem(NOTIFIED_KEY) || "[]"
    );
    notifiedRef.current = new Set(sessionNotified);

    const newAlerts = lowStockProducts.filter(
      (p) => !notifiedRef.current.has(p.id)
    );

    if (newAlerts.length > 0) {
      if (newAlerts.length === 1) {
        const p = newAlerts[0];
        if (p.stock === 0) {
          toast.error(`نفذ المخزون: ${p.name}`, {
            icon: <AlertTriangle className="h-4 w-4" />,
          });
        } else {
          toast.warning(`مخزون منخفض: ${p.name} (${p.stock} متبقي)`, {
            icon: <AlertTriangle className="h-4 w-4" />,
          });
        }
      } else {
        toast.warning(`${newAlerts.length} منتجات بمخزون منخفض`, {
          description: "اضغط على جرس التنبيهات لعرض التفاصيل",
        });
      }

      newAlerts.forEach((p) => notifiedRef.current.add(p.id));
      sessionStorage.setItem(
        NOTIFIED_KEY,
        JSON.stringify(Array.from(notifiedRef.current))
      );
    }
  }, [products, threshold, loading]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="تنبيهات المخزون"
        >
          <Bell className="h-5 w-5" />
          {lowStockProducts.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs"
            >
              {lowStockProducts.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-card border-border" align="end">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            تنبيهات المخزون
          </h3>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 pb-3 border-b border-border">
          <Label className="text-xs text-muted-foreground">حد التنبيه</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value) || 0)}
              className="h-8 bg-secondary border-border"
              min={0}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              قطعة أو أقل
            </span>
          </div>
        </div>

        {lowStockProducts.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            ✓ جميع المنتجات بمخزون جيد
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2">
            {outOfStock.length > 0 && (
              <p className="text-xs text-destructive font-semibold">
                نفذ المخزون ({outOfStock.length})
              </p>
            )}
            {lowStockProducts
              .sort((a, b) => a.stock - b.stock)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-md bg-secondary/50"
                >
                  <Badge
                    variant={p.stock === 0 ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {p.stock === 0 ? "نفذ" : `${p.stock} متبقي`}
                  </Badge>
                  <span className="text-sm font-medium text-right flex-1 mr-2">
                    {p.name}
                  </span>
                </div>
              ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

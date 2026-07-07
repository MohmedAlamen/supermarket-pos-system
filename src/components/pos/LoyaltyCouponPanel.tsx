import { useEffect, useState } from "react";
import { Gift, Tag, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Customer } from "@/types/pos";
import { fetchCustomerPoints, useLoyaltyProgram } from "@/hooks/useLoyalty";
import { validateCoupon } from "@/hooks/useCoupons";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";

export interface AppliedCoupon { id: string; code: string; discount: number; }

interface Props {
  customer: Customer | null;
  subtotal: number;
  appliedCoupon: AppliedCoupon | null;
  onCouponChange: (c: AppliedCoupon | null) => void;
  pointsToRedeem: number;
  onPointsChange: (points: number, discount: number) => void;
}

export default function LoyaltyCouponPanel({
  customer, subtotal, appliedCoupon, onCouponChange, pointsToRedeem, onPointsChange,
}: Props) {
  const { currentStore } = useStore();
  const { program } = useLoyaltyProgram();
  const [balance, setBalance] = useState(0);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [pointsInput, setPointsInput] = useState("");

  useEffect(() => {
    if (customer) fetchCustomerPoints(customer.id).then(setBalance);
    else setBalance(0);
  }, [customer]);

  useEffect(() => {
    // reset points when customer changes
    setPointsInput(""); onPointsChange(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  const applyCoupon = async () => {
    if (!currentStore || !code.trim()) return;
    setLoading(true);
    const res = await validateCoupon(currentStore.id, code, customer?.id || null, subtotal);
    setLoading(false);
    if (!res.valid || !res.coupon_id) { toast.error(res.message || "كوبون غير صالح"); return; }
    onCouponChange({ id: res.coupon_id, code: code.trim().toUpperCase(), discount: res.discount });
    toast.success(`${res.message} — خصم ${res.discount.toFixed(2)} ر.س`);
    setCode("");
  };

  const applyPoints = () => {
    if (!program || !customer) return;
    const p = parseInt(pointsInput);
    if (!p || p <= 0) { toast.error("أدخل عدد نقاط صحيح"); return; }
    if (p > balance) { toast.error("رصيد النقاط غير كافٍ"); return; }
    if (p < program.min_redeem_points) { toast.error(`الحد الأدنى للاسترداد: ${program.min_redeem_points} نقطة`); return; }
    const discount = Math.min(subtotal, +(p * program.currency_per_point).toFixed(2));
    onPointsChange(p, discount);
    toast.success(`تم استخدام ${p} نقطة (${discount.toFixed(2)} ر.س)`);
  };

  const clearPoints = () => { setPointsInput(""); onPointsChange(0, 0); };

  const potentialEarn = program?.is_active
    ? Math.floor(Math.max(0, subtotal) * Number(program.points_per_currency || 0))
    : 0;

  if (!program?.is_active) return null;

  return (
    <div className="rounded-md border border-border bg-secondary/30 p-2 space-y-2">
      {customer && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1"><Gift className="h-3 w-3" /> رصيد النقاط</span>
          <span className="font-semibold">{balance} نقطة (~{(balance * program.currency_per_point).toFixed(2)} ر.س)</span>
        </div>
      )}

      {/* Coupon */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1"><Tag className="h-3 w-3" /> كود الكوبون</Label>
        {appliedCoupon ? (
          <div className="flex items-center justify-between bg-primary/10 rounded-md px-2 py-1.5">
            <button onClick={() => onCouponChange(null)} className="text-destructive"><X className="h-3 w-3" /></button>
            <div className="text-right text-xs">
              <span className="font-bold">{appliedCoupon.code}</span>
              <span className="text-muted-foreground"> — خصم {appliedCoupon.discount.toFixed(2)} ر.س</span>
            </div>
          </div>
        ) : (
          <div className="flex gap-1">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="COUPON" className="h-8 text-xs bg-background" />
            <Button size="sm" variant="outline" onClick={applyCoupon} disabled={loading} className="h-8 text-xs">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "تطبيق"}
            </Button>
          </div>
        )}
      </div>

      {/* Points redemption */}
      {customer && balance >= program.min_redeem_points && (
        <div className="space-y-1">
          <Label className="text-xs">استخدام نقاط الولاء</Label>
          {pointsToRedeem > 0 ? (
            <div className="flex items-center justify-between bg-primary/10 rounded-md px-2 py-1.5">
              <button onClick={clearPoints} className="text-destructive"><X className="h-3 w-3" /></button>
              <div className="text-right text-xs">
                <span className="font-bold">{pointsToRedeem} نقطة</span>
              </div>
            </div>
          ) : (
            <div className="flex gap-1">
              <Input
                type="number"
                value={pointsInput}
                onChange={(e) => setPointsInput(e.target.value)}
                placeholder={`≥ ${program.min_redeem_points}`}
                className="h-8 text-xs bg-background"
                min={program.min_redeem_points}
                max={balance}
              />
              <Button size="sm" variant="outline" onClick={applyPoints} className="h-8 text-xs">استخدام</Button>
            </div>
          )}
        </div>
      )}

      {customer && potentialEarn > 0 && (
        <p className="text-[10px] text-success text-center">ستكسب {potentialEarn} نقطة من هذه الفاتورة</p>
      )}
    </div>
  );
}

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Receipt, Loader2, ScanLine, UserCircle, X, Smartphone, Wallet, Building2, Split, Zap, CheckCircle2 } from "lucide-react";
import ReceiptPrint from "@/components/pos/ReceiptPrint";
import LoyaltyCouponPanel, { AppliedCoupon } from "@/components/pos/LoyaltyCouponPanel";
import BarcodeScanner from "@/components/pos/BarcodeScanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import { useCustomers } from "@/hooks/useCustomers";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Product, CartItem, Customer } from "@/types/pos";
import { toast } from "sonner";

type PayMethod = "cash" | "card" | "stcpay" | "applepay" | "bank";
interface PayLine { method: PayMethod; amount: number; reference: string; }

const METHODS: { id: PayMethod; label: string; icon: any; needsRef: boolean }[] = [
  { id: "cash", label: "نقدي", icon: Banknote, needsRef: false },
  { id: "card", label: "بطاقة", icon: CreditCard, needsRef: true },
  { id: "stcpay", label: "STC Pay", icon: Smartphone, needsRef: true },
  { id: "applepay", label: "Apple Pay", icon: Wallet, needsRef: true },
  { id: "bank", label: "تحويل بنكي", icon: Building2, needsRef: true },
];

const POSPage = () => {
  const { products, loading } = useProducts();
  const categories = useCategories(products);
  const { saveSale } = useSales();
  const { customers } = useCustomers();
  const { settings } = useStoreSettings();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [cashReceived, setCashReceived] = useState("");
  const [payMode, setPayMode] = useState<"single" | "split">("single");
  const [singleMethod, setSingleMethod] = useState<PayMethod>("cash");
  const [singleRef, setSingleRef] = useState("");
  const [splitLines, setSplitLines] = useState<PayLine[]>([{ method: "cash", amount: 0, reference: "" }]);
  const [processing, setProcessing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);
  const barcodeBuffer = useRef("");
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>();
  const [showCheckout, setShowCheckout] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState<{ points: number; discount: number }>({ points: 0, discount: 0 });

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.includes(search) || p.barcode.includes(search);
      const matchCategory = selectedCategory === "الكل" || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [search, selectedCategory, products]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 5);
    return customers.filter((c) => c.name.includes(customerSearch) || c.phone.includes(customerSearch)).slice(0, 8);
  }, [customerSearch, customers]);

  const handleBarcodeScan = useCallback((barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      addToCart(product);
      toast.success(`تم إضافة: ${product.name}`);
    } else {
      toast.error(`لم يتم العثور على منتج بالباركود: ${barcode}`);
    }
  }, [products]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "Enter" && barcodeBuffer.current.length > 3) {
        handleBarcodeScan(barcodeBuffer.current);
        barcodeBuffer.current = "";
        return;
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ""; }, 100);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBarcodeScan]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error("الكمية المطلوبة غير متوفرة في المخزون");
          return prev;
        }
        return prev.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => prev.map((item) => item.product.id === productId ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const couponDiscount = appliedCoupon?.discount || 0;
  const loyaltyDiscount = loyaltyRedeem.discount || 0;
  const afterDiscount = Math.max(0, subtotal - discountAmount - couponDiscount - loyaltyDiscount);
  const taxRate = Number(settings.tax_rate) || 0;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const total = afterDiscount + taxAmount;
  const change = cashReceived ? parseFloat(cashReceived) - total : 0;

  const splitSum = splitLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const splitRemaining = +(total - splitSum).toFixed(2);

  const addSplitLine = () => setSplitLines((ls) => [...ls, { method: "card", amount: Math.max(0, splitRemaining), reference: "" }]);
  const updateSplitLine = (i: number, patch: Partial<PayLine>) => setSplitLines((ls) => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const removeSplitLine = (i: number) => setSplitLines((ls) => ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls);

  const completeSale = async () => {
    if (cart.length === 0) { toast.error("السلة فارغة"); return; }

    let payments: { method: PayMethod; amount: number; reference?: string }[] = [];
    let primaryMethod: string;
    let primaryRef: string | null = null;

    if (payMode === "single") {
      const m = METHODS.find((x) => x.id === singleMethod)!;
      if (m.id === "cash") {
        if (!cashReceived || parseFloat(cashReceived) < total) { toast.error("المبلغ المدفوع أقل من الإجمالي"); return; }
      } else if (m.needsRef && !singleRef.trim()) {
        toast.error(`أدخل الرقم المرجعي لعملية ${m.label}`); return;
      }
      payments = [{ method: m.id, amount: total, reference: singleRef.trim() || undefined }];
      primaryMethod = m.id;
      primaryRef = singleRef.trim() || null;
    } else {
      if (Math.abs(splitRemaining) > 0.01) { toast.error(`المتبقي: ${splitRemaining.toFixed(2)} ر.س — يجب أن يساوي الإجمالي`); return; }
      for (const l of splitLines) {
        if (!l.amount || l.amount <= 0) { toast.error("كل طريقة دفع يجب أن يكون لها مبلغ"); return; }
        const m = METHODS.find((x) => x.id === l.method)!;
        if (m.needsRef && !l.reference.trim()) { toast.error(`أدخل الرقم المرجعي لعملية ${m.label}`); return; }
      }
      payments = splitLines.map((l) => ({ method: l.method, amount: +Number(l.amount).toFixed(2), reference: l.reference.trim() || undefined }));
      primaryMethod = "mixed";
    }

    setProcessing(true);
    const saved = await saveSale({
      items: [...cart],
      subtotal,
      discount,
      discountAmount,
      tax_amount: taxAmount,
      total,
      paymentMethod: primaryMethod,
      cashReceived: payMode === "single" && singleMethod === "cash" ? parseFloat(cashReceived) : undefined,
      change: payMode === "single" && singleMethod === "cash" ? parseFloat(cashReceived) - total : undefined,
      customer_id: selectedCustomer?.id || null,
      payments,
      payment_status: "paid",
      payment_reference: primaryRef,
      payment_gateway: "manual",
      coupon: appliedCoupon,
      loyalty: loyaltyRedeem.points > 0 ? { points_redeemed: loyaltyRedeem.points, loyalty_discount: loyaltyRedeem.discount } : null,
    });
    setProcessing(false);

    if (!saved.ok) return;

    setLastSale({
      items: [...cart],
      subtotal,
      discount,
      discountAmount,
      tax_amount: taxAmount,
      tax_rate: taxRate,
      total,
      paymentMethod: primaryMethod,
      cashReceived: payMode === "single" && singleMethod === "cash" ? parseFloat(cashReceived) : undefined,
      change: payMode === "single" && singleMethod === "cash" ? parseFloat(cashReceived) - total : undefined,
      date: new Date(),
      invoice_number: saved.invoice_number,
      customer: selectedCustomer,
      store: settings,
      payments,
      payment_status: "paid",
      payment_reference: primaryRef,
      payment_gateway: "manual",
      qr_code: saved.qr_code,
    });

    toast.success(`تم إتمام البيع! فاتورة: ${saved.invoice_number}`);
    setCart([]);
    setDiscount(0);
    setCashReceived("");
    setSingleRef("");
    setSplitLines([{ method: "cash", amount: 0, reference: "" }]);
    setPayMode("single");
    setSingleMethod("cash");
    setSelectedCustomer(null);
    setAppliedCoupon(null);
    setLoyaltyRedeem({ points: 0, discount: 0 });
    setShowCheckout(false);
    setTimeout(() => window.print(), 300);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-3rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3rem)] print:hidden">
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex gap-2 mb-3">
          <Button variant="outline" size="icon" onClick={() => setScannerOpen(true)} className="shrink-0 border-primary text-primary hover:bg-primary/10" title="مسح الباركود">
            <ScanLine className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الباركود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 bg-card border-border"
              onKeyDown={(e) => { if (e.key === "Enter" && search.trim()) { handleBarcodeScan(search.trim()); setSearch(""); } }}
            />
          </div>
        </div>

        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>{cat}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filteredProducts.map((product) => (
              <button key={product.id} onClick={() => addToCart(product)} className="bg-card rounded-lg p-3 text-right hover:ring-2 hover:ring-primary/50 transition-all group">
                <p className="font-semibold text-sm leading-tight mb-1 group-hover:text-primary transition-colors">{product.name}</p>
                <p className="text-primary font-bold text-lg">{product.price} ر.س</p>
                <Badge variant={product.stock < 10 ? "destructive" : "secondary"} className="mt-1 text-xs">المخزون: {product.stock}</Badge>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-96 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            الفاتورة
            <Badge variant="secondary" className="mr-auto">{cart.length}</Badge>
          </h2>
        </div>

        {/* Customer Selector */}
        <div className="p-3 border-b border-border relative">
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-primary/10 rounded-md px-3 py-2">
              <button onClick={() => setSelectedCustomer(null)} className="text-destructive">
                <X className="h-4 w-4" />
              </button>
              <div className="text-right">
                <p className="font-semibold text-sm">{selectedCustomer.name}</p>
                <p className="text-xs text-muted-foreground">نقاط: {selectedCustomer.loyalty_points}</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <UserCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث عن عميل (اختياري)..."
                value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerList(true); }}
                onFocus={() => setShowCustomerList(true)}
                onBlur={() => setTimeout(() => setShowCustomerList(false), 200)}
                className="pr-10 bg-secondary border-border h-9 text-sm"
              />
              {showCustomerList && filteredCustomers.length > 0 && (
                <div className="absolute z-10 top-full mt-1 right-0 left-0 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.map((c) => (
                    <button key={c.id} onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(""); setShowCustomerList(false); }} className="w-full text-right px-3 py-2 hover:bg-muted text-sm border-b border-border/50 last:border-0">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone} • {c.loyalty_points} نقطة</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <ShoppingCartEmpty />
              <p className="mt-2">السلة فارغة</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="bg-secondary/50 rounded-lg p-3 animate-slide-in">
                <div className="flex justify-between items-start mb-2">
                  <button onClick={() => removeFromCart(item.product.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <p className="font-medium text-sm flex-1 text-right">{item.product.name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-primary">{(item.product.price * item.quantity).toFixed(2)} ر.س</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="bg-muted hover:bg-border rounded-md p-1"><Minus className="h-4 w-4" /></button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="bg-muted hover:bg-border rounded-md p-1"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <LoyaltyCouponPanel
            customer={selectedCustomer}
            subtotal={subtotal - discountAmount}
            appliedCoupon={appliedCoupon}
            onCouponChange={setAppliedCoupon}
            pointsToRedeem={loyaltyRedeem.points}
            onPointsChange={(points, discount) => setLoyaltyRedeem({ points, discount })}
          />

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">خصم %</span>
            <Input type="number" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} className="w-20 h-8 text-center bg-secondary border-border" min={0} max={100} />
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>{subtotal.toFixed(2)} ر.س</span>
              <span className="text-muted-foreground">المجموع</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>-{discountAmount.toFixed(2)} ر.س</span>
                <span>الخصم ({discount}%)</span>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>-{couponDiscount.toFixed(2)} ر.س</span>
                <span>كوبون {appliedCoupon?.code}</span>
              </div>
            )}
            {loyaltyDiscount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>-{loyaltyDiscount.toFixed(2)} ر.س</span>
                <span>نقاط الولاء ({loyaltyRedeem.points})</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>+{taxAmount.toFixed(2)} ر.س</span>
                <span>ضريبة ({taxRate}%)</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
              <span className="text-primary">{total.toFixed(2)} ر.س</span>
              <span>الإجمالي</span>
            </div>
          </div>


          {showCheckout ? (
            <div className="space-y-3 animate-slide-in max-h-[55vh] overflow-y-auto pr-1">
              <div className="flex gap-2">
                <button onClick={() => setPayMode("single")} className={`flex-1 text-xs py-1.5 rounded-md border ${payMode === "single" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border"}`}>طريقة واحدة</button>
                <button onClick={() => { setPayMode("split"); if (splitLines.length === 1 && !splitLines[0].amount) setSplitLines([{ method: "cash", amount: total, reference: "" }]); }} className={`flex-1 text-xs py-1.5 rounded-md border flex items-center justify-center gap-1 ${payMode === "split" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border"}`}><Split className="h-3 w-3" />دفع مقسّم</button>
              </div>

              {payMode === "single" ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-1">
                    {METHODS.map((m) => {
                      const Icon = m.icon;
                      return (
                        <button key={m.id} onClick={() => setSingleMethod(m.id)} className={`flex flex-col items-center gap-1 p-2 rounded-md border text-[10px] ${singleMethod === m.id ? "bg-primary/15 border-primary text-primary" : "bg-secondary border-border"}`} title={m.label}>
                          <Icon className="h-4 w-4" />
                          <span className="leading-tight">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {singleMethod === "cash" ? (
                    <>
                      <Input type="number" placeholder="المبلغ المدفوع" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="bg-secondary border-border text-center text-lg" />
                      {cashReceived && parseFloat(cashReceived) >= total && (
                        <p className="text-center text-success font-bold">الباقي: {change.toFixed(2)} ر.س</p>
                      )}
                    </>
                  ) : (
                    <div>
                      <Label className="text-xs">رقم العملية / المرجع</Label>
                      <Input value={singleRef} onChange={(e) => setSingleRef(e.target.value)} placeholder="من جهاز POS / إشعار STC / ..." className="bg-secondary border-border" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {splitLines.map((line, i) => (
                    <div key={i} className="bg-secondary/60 rounded-md p-2 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <select value={line.method} onChange={(e) => updateSplitLine(i, { method: e.target.value as PayMethod })} className="flex-1 bg-background border border-border rounded-md h-8 text-xs px-2">
                          {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                        </select>
                        <Input type="number" value={line.amount || ""} onChange={(e) => updateSplitLine(i, { amount: Number(e.target.value) })} placeholder="المبلغ" className="w-24 h-8 text-center bg-background border-border text-xs" />
                        <button onClick={() => removeSplitLine(i)} className="text-destructive p-1 disabled:opacity-30" disabled={splitLines.length === 1}><X className="h-4 w-4" /></button>
                      </div>
                      {METHODS.find((m) => m.id === line.method)?.needsRef && (
                        <Input value={line.reference} onChange={(e) => updateSplitLine(i, { reference: e.target.value })} placeholder="رقم المرجع" className="bg-background border-border h-7 text-xs" />
                      )}
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={addSplitLine} className="w-full h-7 text-xs"><Plus className="h-3 w-3 ml-1" />إضافة طريقة دفع</Button>
                  <div className={`flex justify-between text-xs font-bold px-1 ${Math.abs(splitRemaining) < 0.01 ? "text-success" : "text-destructive"}`}>
                    <span>{splitRemaining.toFixed(2)} ر.س</span>
                    <span>المتبقي</span>
                  </div>
                </div>
              )}

              <Button onClick={completeSale} disabled={processing} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد الدفع"}
              </Button>
              <Button variant="ghost" onClick={() => setShowCheckout(false)} className="w-full text-muted-foreground h-8">إلغاء</Button>
            </div>
          ) : (
            <Button onClick={() => setShowCheckout(true)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-lg h-12" disabled={cart.length === 0}>إتمام البيع</Button>
          )}
        </div>
      </div>
    </div>
    {lastSale && <ReceiptPrint ref={receiptRef} {...lastSale} />}
    <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScan} />
    </>
  );
};

function ShoppingCartEmpty() {
  return (
    <svg className="mx-auto h-16 w-16 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  );
}

export default POSPage;

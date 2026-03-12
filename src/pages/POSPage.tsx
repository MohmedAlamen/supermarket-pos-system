import { useState, useMemo, useRef } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Receipt, Printer } from "lucide-react";
import ReceiptPrint from "@/components/pos/ReceiptPrint";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sampleProducts, categories } from "@/data/products";
import { Product, CartItem, Sale } from "@/types/pos";
import { toast } from "sonner";

const POSPage = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [cashReceived, setCashReceived] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [lastSale, setLastSale] = useState<{
    items: CartItem[];
    subtotal: number;
    discount: number;
    discountAmount: number;
    total: number;
    paymentMethod: "cash" | "card";
    cashReceived?: number;
    change?: number;
    date: Date;
  } | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    return sampleProducts.filter((p) => {
      const matchSearch = p.name.includes(search) || p.barcode.includes(search);
      const matchCategory = selectedCategory === "الكل" || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [search, selectedCategory]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error("الكمية المطلوبة غير متوفرة في المخزون");
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  const change = cashReceived ? parseFloat(cashReceived) - total : 0;

  const completeSale = (method: "cash" | "card") => {
    if (cart.length === 0) {
      toast.error("السلة فارغة");
      return;
    }
    if (method === "cash" && (!cashReceived || parseFloat(cashReceived) < total)) {
      toast.error("المبلغ المدفوع أقل من الإجمالي");
      return;
    }
    const saleData = {
      items: [...cart],
      subtotal,
      discount,
      discountAmount,
      total,
      paymentMethod: method,
      cashReceived: method === "cash" ? parseFloat(cashReceived) : undefined,
      change: method === "cash" ? parseFloat(cashReceived) - total : undefined,
      date: new Date(),
    };
    setLastSale(saleData);
    toast.success(`تم إتمام البيع بنجاح! الإجمالي: ${total.toFixed(2)} ر.س`);
    setCart([]);
    setDiscount(0);
    setCashReceived("");
    setShowCheckout(false);

    // Print after a short delay to allow state update
    setTimeout(() => window.print(), 300);
  };

  return (
    <>
    {lastSale && <ReceiptPrint ref={receiptRef} {...lastSale} />}
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3rem)] print:hidden">
      {/* Products Section */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Search */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الباركود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 bg-card border-border"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-card rounded-lg p-3 text-right hover:ring-2 hover:ring-primary/50 transition-all group"
              >
                <p className="font-semibold text-sm leading-tight mb-1 group-hover:text-primary transition-colors">
                  {product.name}
                </p>
                <p className="text-primary font-bold text-lg">{product.price} ر.س</p>
                <Badge variant={product.stock < 10 ? "destructive" : "secondary"} className="mt-1 text-xs">
                  المخزون: {product.stock}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-96 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            الفاتورة
            <Badge variant="secondary" className="mr-auto">{cart.length}</Badge>
          </h2>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <ShoppingCartEmpty />
              <p className="mt-2">السلة فارغة</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="bg-secondary/50 rounded-lg p-3 animate-slide-in"
              >
                <div className="flex justify-between items-start mb-2">
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <p className="font-medium text-sm flex-1 text-right">{item.product.name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-primary">
                    {(item.product.price * item.quantity).toFixed(2)} ر.س
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="bg-muted hover:bg-border rounded-md p-1"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="bg-muted hover:bg-border rounded-md p-1"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">خصم %</span>
            <Input
              type="number"
              value={discount || ""}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-20 h-8 text-center bg-secondary border-border"
              min={0}
              max={100}
            />
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
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
              <span className="text-primary">{total.toFixed(2)} ر.س</span>
              <span>الإجمالي</span>
            </div>
          </div>

          {showCheckout ? (
            <div className="space-y-2 animate-slide-in">
              <Input
                type="number"
                placeholder="المبلغ المدفوع"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="bg-secondary border-border text-center text-lg"
              />
              {cashReceived && parseFloat(cashReceived) >= total && (
                <p className="text-center text-success font-bold">
                  الباقي: {change.toFixed(2)} ر.س
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => completeSale("cash")}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Banknote className="h-4 w-4 ml-1" />
                  نقدي
                </Button>
                <Button
                  onClick={() => completeSale("card")}
                  variant="outline"
                  className="flex-1 border-primary text-primary hover:bg-primary/10"
                >
                  <CreditCard className="h-4 w-4 ml-1" />
                  بطاقة
                </Button>
              </div>
              <Button
                variant="ghost"
                onClick={() => setShowCheckout(false)}
                className="w-full text-muted-foreground"
              >
                إلغاء
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowCheckout(true)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-lg h-12"
              disabled={cart.length === 0}
            >
              إتمام البيع
            </Button>
          )}
        </div>
      </div>
    </div>
    {lastSale && <ReceiptPrint ref={receiptRef} {...lastSale} />}
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

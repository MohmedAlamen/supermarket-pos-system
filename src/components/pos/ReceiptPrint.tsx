import { CartItem } from "@/types/pos";
import { forwardRef } from "react";

interface ReceiptProps {
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  total: number;
  paymentMethod: "cash" | "card";
  cashReceived?: number;
  change?: number;
  date: Date;
}

const ReceiptPrint = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ items, subtotal, discount, discountAmount, total, paymentMethod, cashReceived, change, date }, ref) => {
    return (
      <div ref={ref} className="hidden print:block p-6 max-w-[300px] mx-auto font-mono text-xs" dir="rtl">
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold">نقطة البيع</h1>
          <p className="text-[10px]">{date.toLocaleDateString("ar-SA")} - {date.toLocaleTimeString("ar-SA")}</p>
          <div className="border-b border-dashed border-black my-2" />
        </div>

        <table className="w-full mb-2">
          <thead>
            <tr className="border-b border-dashed border-black">
              <th className="text-right pb-1">المنتج</th>
              <th className="text-center pb-1">الكمية</th>
              <th className="text-left pb-1">السعر</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.product.id}>
                <td className="text-right py-0.5">{item.product.name}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-left">{(item.product.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-dashed border-black pt-2 space-y-1">
          <div className="flex justify-between">
            <span>{subtotal.toFixed(2)} ر.س</span>
            <span>المجموع</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <span>-{discountAmount.toFixed(2)} ر.س</span>
              <span>الخصم ({discount}%)</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t border-dashed border-black pt-1">
            <span>{total.toFixed(2)} ر.س</span>
            <span>الإجمالي</span>
          </div>
          <div className="flex justify-between">
            <span>{paymentMethod === "cash" ? "نقدي" : "بطاقة"}</span>
            <span>طريقة الدفع</span>
          </div>
          {paymentMethod === "cash" && cashReceived !== undefined && (
            <>
              <div className="flex justify-between">
                <span>{cashReceived.toFixed(2)} ر.س</span>
                <span>المدفوع</span>
              </div>
              <div className="flex justify-between">
                <span>{(change ?? 0).toFixed(2)} ر.س</span>
                <span>الباقي</span>
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-4 border-t border-dashed border-black pt-2">
          <p>شكراً لزيارتكم</p>
        </div>
      </div>
    );
  }
);

ReceiptPrint.displayName = "ReceiptPrint";
export default ReceiptPrint;

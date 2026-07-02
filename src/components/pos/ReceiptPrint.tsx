import { CartItem, Customer, StoreSettings } from "@/types/pos";
import { forwardRef, useEffect, useState } from "react";
import QRCode from "qrcode";

export interface ReceiptPaymentEntry {
  method: string;
  amount: number;
  reference?: string;
}

interface ReceiptProps {
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  tax_amount?: number;
  tax_rate?: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  date: Date;
  invoice_number?: string;
  customer?: Customer | null;
  store?: StoreSettings;
  payments?: ReceiptPaymentEntry[];
  payment_status?: string;
  payment_reference?: string | null;
  payment_gateway?: string;
  qr_code?: string; // ZATCA TLV base64
}

const methodLabel = (m: string) => ({
  cash: "نقدي", card: "بطاقة", stcpay: "STC Pay", applepay: "Apple Pay", bank: "تحويل بنكي", mixed: "دفع مقسّم",
} as Record<string, string>)[m] || m;

const statusLabel = (s?: string) => ({
  paid: "مدفوعة", pending: "معلّقة", failed: "فاشلة", refunded: "مستردة",
} as Record<string, string>)[s || "paid"] || s;

const ReceiptPrint = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ items, subtotal, discount, discountAmount, tax_amount = 0, tax_rate = 0, total, paymentMethod, cashReceived, change, date, invoice_number, customer, store, payments, payment_status, payment_reference, payment_gateway, qr_code }, ref) => {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    useEffect(() => {
      if (!qr_code) { setQrDataUrl(null); return; }
      QRCode.toDataURL(qr_code, { errorCorrectionLevel: "M", margin: 1, width: 180 })
        .then(setQrDataUrl).catch(() => setQrDataUrl(null));
    }, [qr_code]);
    return (
      <div ref={ref} className="hidden print:block p-6 max-w-[320px] mx-auto font-mono text-xs" dir="rtl">
        <div className="text-center mb-3">
          <h1 className="text-lg font-bold">{store?.store_name || "نقطة البيع"}</h1>
          {store?.address && <p className="text-[10px]">{store.address}</p>}
          {store?.phone && <p className="text-[10px]">هاتف: {store.phone}</p>}
          {store?.tax_number && <p className="text-[10px]">الرقم الضريبي: {store.tax_number}</p>}
          <div className="border-b border-dashed border-black my-2" />
          <p className="font-bold">فاتورة ضريبية</p>
          {invoice_number && <p className="text-[10px]">رقم الفاتورة: {invoice_number}</p>}
          <p className="text-[10px]">{date.toLocaleDateString("ar-SA")} - {date.toLocaleTimeString("ar-SA")}</p>
          {customer && (
            <>
              <div className="border-b border-dashed border-black my-1" />
              <p className="text-[10px]">العميل: {customer.name}</p>
              {customer.phone && <p className="text-[10px]">{customer.phone}</p>}
            </>
          )}
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
          {tax_amount > 0 && (
            <div className="flex justify-between">
              <span>{tax_amount.toFixed(2)} ر.س</span>
              <span>ضريبة القيمة المضافة ({tax_rate}%)</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t border-dashed border-black pt-1 text-sm">
            <span>{total.toFixed(2)} ر.س</span>
            <span>الإجمالي</span>
          </div>
          <div className="flex justify-between">
            <span>{methodLabel(paymentMethod)}</span>
            <span>طريقة الدفع</span>
          </div>
          {payments && payments.length > 1 && (
            <div className="border-t border-dashed border-black pt-1 mt-1">
              {payments.map((p, i) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span>{p.amount.toFixed(2)} ر.س{p.reference ? ` (${p.reference})` : ""}</span>
                  <span>{methodLabel(p.method)}</span>
                </div>
              ))}
            </div>
          )}
          {payment_reference && (!payments || payments.length <= 1) && (
            <div className="flex justify-between text-[10px]">
              <span>{payment_reference}</span>
              <span>رقم العملية</span>
            </div>
          )}
          {payment_gateway && payment_gateway !== "manual" && (
            <div className="flex justify-between text-[10px]">
              <span>{payment_gateway}</span>
              <span>البوابة</span>
            </div>
          )}
          {payment_status && payment_status !== "paid" && (
            <div className="flex justify-between text-[10px] font-bold">
              <span>{statusLabel(payment_status)}</span>
              <span>الحالة</span>
            </div>
          )}
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

        {qrDataUrl && (
          <div className="flex justify-center my-3">
            <img src={qrDataUrl} alt="ZATCA QR" className="w-32 h-32" />
          </div>
        )}

        <div className="text-center mt-4 border-t border-dashed border-black pt-2">
          <p>شكراً لزيارتكم</p>
          {store?.email && <p className="text-[10px] mt-1">{store.email}</p>}
          <p className="text-[9px] mt-1 text-black/70">فاتورة إلكترونية - هيئة الزكاة والضريبة</p>
        </div>
      </div>
    );
  }
);

ReceiptPrint.displayName = "ReceiptPrint";
export default ReceiptPrint;

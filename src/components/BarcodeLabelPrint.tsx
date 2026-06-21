import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Tag } from "lucide-react";
import { Product } from "@/types/pos";
import { useStoreSettings } from "@/hooks/useStoreSettings";

interface Props {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

const BarcodeLabelPrint = ({ open, onClose, product }: Props) => {
  const { settings } = useStoreSettings();
  const [count, setCount] = useState(12);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !product) return;
    const code = product.barcode && product.barcode.length >= 6 ? product.barcode : product.id.slice(0, 12);
    setTimeout(() => {
      document.querySelectorAll<SVGElement>("svg.label-barcode").forEach((el) => {
        try {
          JsBarcode(el, code, { format: "CODE128", displayValue: true, fontSize: 12, height: 40, margin: 2 });
        } catch {}
      });
    }, 50);
  }, [open, product, count]);

  if (!product) return null;

  const handlePrint = () => {
    const html = containerRef.current?.innerHTML || "";
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    w.document.write(`<html dir="rtl"><head><title>ملصقات</title>
      <style>
        body{font-family:Arial;margin:8px;}
        .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
        .label{border:1px dashed #999;padding:6px;text-align:center;page-break-inside:avoid;}
        .name{font-weight:bold;font-size:11px;margin-bottom:2px;}
        .price{font-size:13px;color:#16a34a;font-weight:bold;margin-top:2px;}
        .store{font-size:9px;color:#555;}
        @media print { .label{border:none;} }
      </style></head><body><div class="grid">${html}</div>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" /> طباعة ملصقات الباركود — {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label>عدد الملصقات</Label>
            <Input type="number" min={1} max={120} value={count} onChange={(e) => setCount(Math.max(1, Math.min(120, +e.target.value || 1)))} />
          </div>
          <Button onClick={handlePrint} className="bg-primary text-primary-foreground">
            <Printer className="h-4 w-4 ml-1" /> طباعة
          </Button>
        </div>

        <div ref={containerRef} className="grid grid-cols-3 gap-2 bg-white p-3 rounded">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="label border border-dashed border-gray-400 p-2 text-center text-black">
              <div className="store text-[9px] text-gray-600">{settings.store_name}</div>
              <div className="name font-bold text-[11px]">{product.name}</div>
              <svg className="label-barcode mx-auto"></svg>
              <div className="price text-[13px] font-bold" style={{ color: "#16a34a" }}>{product.price} ر.س</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeLabelPrint;

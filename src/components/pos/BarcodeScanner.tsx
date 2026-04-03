import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine, X } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

const BarcodeScanner = ({ open, onClose, onScan }: BarcodeScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          onScan(decodedText);
          scanner.stop().catch(() => {});
          onClose();
        },
        () => {}
      )
      .catch(() => setError("لا يمكن الوصول إلى الكاميرا"));

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            مسح الباركود
          </DialogTitle>
        </DialogHeader>
        <div className="relative rounded-lg overflow-hidden bg-muted min-h-[250px]">
          <div id="barcode-reader" className="w-full" />
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-destructive text-sm">
              {error}
            </div>
          )}
        </div>
        <Button variant="outline" onClick={onClose} className="w-full">
          <X className="h-4 w-4 ml-1" />
          إغلاق
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;

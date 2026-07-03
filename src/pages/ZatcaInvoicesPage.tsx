import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranch } from "@/contexts/BranchContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, FileText, Loader2, QrCode, ShieldCheck, ShieldAlert, ShieldQuestion, Search, PenLine } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { signInvoiceWithCsid } from "@/lib/zatca/sign";

interface Row {
  id: string;
  invoice_number: string;
  created_at: string;
  total: number;
  tax_amount: number;
  invoice_type: string;
  zatca_status: string;
  icv: number | null;
  uuid_zatca: string | null;
  previous_invoice_hash: string | null;
  invoice_hash: string | null;
  qr_code: string | null;
  xml_content: string | null;
  signing_status: string | null;
  signature_value: string | null;
  signed_at: string | null;
  branch_id: string;
}

const STATUS_LABEL: Record<string, string> = {
  not_submitted: "لم تُرسل",
  reported: "مُبلَّغ عنها",
  cleared: "معتمدة",
  rejected: "مرفوضة",
};

const STATUS_ICON: Record<string, any> = {
  not_submitted: ShieldQuestion,
  reported: ShieldCheck,
  cleared: ShieldCheck,
  rejected: ShieldAlert,
};

export default function ZatcaInvoicesPage() {
  const { currentBranch } = useBranch();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!currentBranch) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("sales")
      .select("id, invoice_number, created_at, total, tax_amount, invoice_type, zatca_status, icv, uuid_zatca, previous_invoice_hash, invoice_hash, qr_code, xml_content, signing_status, signature_value, signed_at, branch_id")
      .eq("branch_id", currentBranch.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [currentBranch?.id]);

  useEffect(() => {
    if (!selected?.qr_code) { setQrUrl(null); return; }
    QRCode.toDataURL(selected.qr_code, { errorCorrectionLevel: "M", margin: 1, width: 240 })
      .then(setQrUrl).catch(() => setQrUrl(null));
  }, [selected?.id]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.invoice_number?.toLowerCase().includes(q) || r.uuid_zatca?.toLowerCase().includes(q));
  }, [rows, search]);

  const downloadXml = (r: Row) => {
    if (!r.xml_content) { toast.error("XML غير متوفر لهذه الفاتورة"); return; }
    const blob = new Blob([r.xml_content], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.invoice_number || r.id}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          فواتير ZATCA الإلكترونية
        </h1>
        <Badge variant="secondary">الفرع: {currentBranch?.name || "—"}</Badge>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="بحث برقم الفاتورة أو UUID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">لا توجد فواتير</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-right p-3">رقم الفاتورة</th>
                    <th className="text-right p-3">ICV</th>
                    <th className="text-right p-3">النوع</th>
                    <th className="text-right p-3">الإجمالي</th>
                    <th className="text-right p-3">حالة ZATCA</th>
                    <th className="text-right p-3">التاريخ</th>
                    <th className="text-right p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const Icon = STATUS_ICON[r.zatca_status] || ShieldQuestion;
                    return (
                      <tr key={r.id} className={`border-t border-border cursor-pointer hover:bg-muted/40 ${selected?.id === r.id ? "bg-primary/5" : ""}`} onClick={() => setSelected(r)}>
                        <td className="p-3 font-mono text-xs">{r.invoice_number}</td>
                        <td className="p-3">{r.icv ?? "—"}</td>
                        <td className="p-3">
                          <Badge variant={r.invoice_type === "standard" ? "default" : "secondary"} className="text-xs">
                            {r.invoice_type === "standard" ? "ضريبية" : "مبسّطة"}
                          </Badge>
                        </td>
                        <td className="p-3">{Number(r.total).toFixed(2)}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Icon className="h-3.5 w-3.5" />
                            {STATUS_LABEL[r.zatca_status] || r.zatca_status}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar-SA")}</td>
                        <td className="p-3">
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); downloadXml(r); }} title="تنزيل XML">
                            <Download className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <h2 className="font-bold flex items-center gap-2"><QrCode className="h-5 w-5 text-primary" /> تفاصيل الفاتورة</h2>
          {!selected ? (
            <p className="text-sm text-muted-foreground">اختر فاتورة لعرض QR والتفاصيل التقنية.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <Detail label="رقم الفاتورة" value={selected.invoice_number} mono />
              <Detail label="UUID" value={selected.uuid_zatca || "—"} mono small />
              <Detail label="ICV" value={String(selected.icv ?? "—")} />
              <Detail label="حالة الإرسال" value={STATUS_LABEL[selected.zatca_status] || selected.zatca_status} />
              {qrUrl && (
                <div className="flex justify-center p-3 bg-white rounded-md">
                  <img src={qrUrl} alt="ZATCA QR" className="w-48 h-48" />
                </div>
              )}
              <Detail label="Hash الحالي" value={selected.invoice_hash || "—"} mono small />
              <Detail label="Hash السابق (PIH)" value={selected.previous_invoice_hash || "—"} mono small />
              <Button size="sm" variant="outline" className="w-full" onClick={() => downloadXml(selected)}>
                <Download className="h-4 w-4 ml-1" /> تنزيل XML
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                * التوقيع الرقمي والإرسال المباشر إلى ZATCA يتطلبان إكمال الـ Onboarding والحصول على شهادة CSID.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`${mono ? "font-mono" : ""} ${small ? "text-[10px] break-all" : "text-sm"}`}>{value}</p>
    </div>
  );
}

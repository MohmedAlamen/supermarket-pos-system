import { useState } from "react";
import { KeyRound, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  branchId: string;
  branchName: string;
  configured?: boolean;
  onSaved?: () => void;
}

export default function BranchCsidDialog({ branchId, branchName, configured, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cert, setCert] = useState("");
  const [pkey, setPkey] = useState("");
  const [secret, setSecret] = useState("");
  const [mode, setMode] = useState<"sandbox" | "production">("sandbox");

  const openDialog = async () => {
    setOpen(true);
    setLoading(true);
    const { data } = await (supabase as any)
      .from("branches")
      .select("csid_certificate_pem, csid_private_key_pem, csid_secret, csid_mode")
      .eq("id", branchId)
      .maybeSingle();
    setCert(data?.csid_certificate_pem || "");
    setPkey(data?.csid_private_key_pem || "");
    setSecret(data?.csid_secret || "");
    setMode((data?.csid_mode as any) || "sandbox");
    setLoading(false);
  };

  const save = async () => {
    if (!cert.includes("BEGIN CERTIFICATE") || !pkey.includes("BEGIN")) {
      toast.error("الشهادة أو المفتاح غير صالحين — يجب أن يكونا بصيغة PEM.");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("branches")
      .update({
        csid_certificate_pem: cert.trim(),
        csid_private_key_pem: pkey.trim(),
        csid_secret: secret.trim() || null,
        csid_mode: mode,
      })
      .eq("id", branchId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حفظ CSID بنجاح");
    setOpen(false);
    onSaved?.();
  };

  const clearCsid = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("branches")
      .update({ csid_certificate_pem: null, csid_private_key_pem: null, csid_secret: null })
      .eq("id", branchId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setCert(""); setPkey(""); setSecret("");
    toast.success("تم مسح CSID");
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => v ? openDialog() : setOpen(false)}>
      <DialogTrigger asChild>
        <button
          onClick={openDialog}
          className={`p-1.5 rounded-md hover:bg-muted ${configured ? "text-success" : "text-muted-foreground"}`}
          title="إعداد CSID"
        >
          {configured ? <ShieldCheck className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
        </button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            إعداد CSID — {branchName}
            {configured && <Badge variant="secondary" className="text-success">مُعدّة</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <Label>وضع البيئة</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="flex gap-4 mt-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <RadioGroupItem value="sandbox" /> Sandbox (اختبار)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <RadioGroupItem value="production" /> Production (إنتاج)
                </label>
              </RadioGroup>
            </div>
            <div>
              <Label>شهادة CSID (PEM)</Label>
              <Textarea rows={5} value={cert} onChange={(e) => setCert(e.target.value)}
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                className="bg-secondary mt-1 font-mono text-xs" />
            </div>
            <div>
              <Label>المفتاح الخاص ECDSA P-256 (PEM PKCS#8)</Label>
              <Textarea rows={5} value={pkey} onChange={(e) => setPkey(e.target.value)}
                placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                className="bg-secondary mt-1 font-mono text-xs" />
            </div>
            <div>
              <Label>CSID Secret (اختياري — من رد بوابة فاتورة)</Label>
              <Input value={secret} onChange={(e) => setSecret(e.target.value)} className="bg-secondary mt-1 font-mono text-xs" />
            </div>
            <p className="text-xs text-muted-foreground">
              يتم استخدام هذه البيانات فقط من خلال Edge Function آمنة لتوقيع الفواتير رقمياً قبل الإرسال إلى ZATCA. لا تُعرض للعملاء أبداً.
            </p>
            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={saving} className="flex-1 bg-primary text-primary-foreground">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ CSID"}
              </Button>
              {configured && (
                <Button onClick={clearCsid} disabled={saving} variant="outline" className="text-destructive">
                  مسح
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

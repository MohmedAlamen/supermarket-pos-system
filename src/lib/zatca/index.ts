import { buildZatcaXml, type BuildXmlInput, type ZatcaLine } from "./xml";
import { buildZatcaQrBase64 } from "./qr";
import { sha256Base64, GENESIS_PIH } from "./hash";

export { buildZatcaXml, buildZatcaQrBase64, sha256Base64, GENESIS_PIH };
export type { ZatcaLine, BuildXmlInput };

// Generate RFC 4122 v4 UUID (browser + node fallback)
export function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b).map((x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10, 16).join("")}`;
}

export interface BuildInvoiceInput {
  invoiceNumber: string;
  icv: number;
  previousInvoiceHash: string; // base64
  issueDateISO: string;
  invoiceType: "simplified" | "standard";
  seller: {
    name: string;
    vatNumber: string;
    crn?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  customer?: { name?: string | null; vatNumber?: string | null; address?: string | null } | null;
  lines: ZatcaLine[];
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
}

export interface BuiltInvoice {
  uuid: string;
  xml: string;
  invoiceHash: string; // base64 of hex sha256(xml)
  qrBase64: string;
}

export async function buildZatcaInvoice(input: BuildInvoiceInput): Promise<BuiltInvoice> {
  const uuid = newUuid();
  const xml = buildZatcaXml({
    invoiceNumber: input.invoiceNumber,
    uuid,
    icv: input.icv,
    issueDateISO: input.issueDateISO,
    previousInvoiceHash: input.previousInvoiceHash || GENESIS_PIH,
    invoiceType: input.invoiceType,
    seller: input.seller,
    customer: input.customer || null,
    lines: input.lines,
    subtotal: input.subtotal,
    discountTotal: input.discountTotal,
    vatTotal: input.vatTotal,
    grandTotal: input.grandTotal,
  });
  const invoiceHash = await sha256Base64(xml);
  const qrBase64 = buildZatcaQrBase64({
    sellerName: input.seller.name,
    vatNumber: input.seller.vatNumber,
    timestampISO: input.issueDateISO,
    totalWithVat: input.grandTotal,
    vatTotal: input.vatTotal,
  });
  return { uuid, xml, invoiceHash, qrBase64 };
}

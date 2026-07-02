// TLV Base64 QR code per ZATCA Phase 1/2 (simplified invoice – 5 fields).
// Phase-2 signed invoices append fields 6–9 (hash, pubkey, signature). Those
// three are added once the signing edge function is enabled.

function tlv(tag: number, valueUtf8: string): Uint8Array {
  const value = new TextEncoder().encode(valueUtf8);
  const out = new Uint8Array(2 + value.length);
  out[0] = tag;
  out[1] = value.length;
  out.set(value, 2);
  return out;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export interface QrInput {
  sellerName: string;
  vatNumber: string;      // 15-digit VAT
  timestampISO: string;   // e.g. new Date().toISOString()
  totalWithVat: number;   // gross
  vatTotal: number;       // tax amount
}

export function buildZatcaQrBase64(input: QrInput): string {
  const chunks = [
    tlv(1, input.sellerName || ""),
    tlv(2, input.vatNumber || ""),
    tlv(3, input.timestampISO),
    tlv(4, input.totalWithVat.toFixed(2)),
    tlv(5, input.vatTotal.toFixed(2)),
  ];
  return bytesToBase64(concat(chunks));
}

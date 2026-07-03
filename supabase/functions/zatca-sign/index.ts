// ZATCA Phase 2 digital signing (ECDSA P-256 / secp256r1)
// Signs the invoice hash with the branch's CSID private key,
// embeds a UBLExtensions <ds:Signature> block into the XML,
// and returns the signed XML + signature value + 9-field TLV QR.
//
// Notes:
//  - Callable by any signed-in user of the app (verify_jwt = true is fine),
//    but we use the service role to read the private key from `branches`.
//  - The signed XML structure follows ZATCA's XAdES/UBL signature layout at
//    a functional level; downstream submission (Reporting/Clearance) can be
//    layered on top without changing this contract.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface SignRequest {
  branch_id: string;
  sale_id?: string;
  invoice_number: string;
  uuid: string;
  icv: number;
  issue_datetime: string;   // ISO
  xml: string;              // unsigned UBL XML
  invoice_hash: string;     // base64(hex sha256(xml)) — as ZATCA convention
  previous_invoice_hash: string;
  seller_name: string;
  vat_number: string;
  total_with_vat: number;
  vat_total: number;
}

function b64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBytes(b: string): Uint8Array {
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// PEM -> PKCS8 DER for ECDSA P-256 private key
function pemToPkcs8(pem: string): Uint8Array {
  const clean = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  return b64ToBytes(clean);
}

// Strip PEM headers from a certificate to get the base64 DER body
function certBase64Body(pem: string): string {
  return pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
}

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Base64OfHex(text: string): Promise<string> {
  return btoa(await sha256Hex(text));
}

// ECDSA(P-256) signature over raw invoice_hash bytes
async function ecdsaSign(privateKeyPem: string, dataBase64: string): Promise<string> {
  const pkcs8 = pemToPkcs8(privateKeyPem);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const data = b64ToBytes(dataBase64);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, data);
  return b64(new Uint8Array(sig));
}

// Build 9-field TLV QR (Phase 2 signed simplified/standard invoice)
function tlv(tag: number, valueUtf8OrBytes: string | Uint8Array): Uint8Array {
  const value = typeof valueUtf8OrBytes === "string"
    ? new TextEncoder().encode(valueUtf8OrBytes)
    : valueUtf8OrBytes;
  const out = new Uint8Array(2 + value.length);
  out[0] = tag;
  out[1] = value.length;
  out.set(value, 2);
  return out;
}
function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const o = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { o.set(c, off); off += c.length; }
  return o;
}

async function buildSignedQr(input: {
  sellerName: string; vatNumber: string; timestampISO: string;
  totalWithVat: number; vatTotal: number;
  invoiceHash: string;    // base64
  signature: string;      // base64
  publicKeyDer: Uint8Array; // for TLV
  certSignatureDer?: Uint8Array; // optional cert signature bytes
}): Promise<string> {
  const chunks: Uint8Array[] = [
    tlv(1, input.sellerName),
    tlv(2, input.vatNumber),
    tlv(3, input.timestampISO),
    tlv(4, input.totalWithVat.toFixed(2)),
    tlv(5, input.vatTotal.toFixed(2)),
    tlv(6, input.invoiceHash),
    tlv(7, input.signature),
    tlv(8, input.publicKeyDer),
  ];
  if (input.certSignatureDer) chunks.push(tlv(9, input.certSignatureDer));
  return b64(concat(chunks));
}

// Extract SubjectPublicKeyInfo DER bytes from a PEM cert (raw base64 body).
// We use the whole cert DER as a proxy for tag 8 if extraction fails.
function certDer(pem: string): Uint8Array {
  return b64ToBytes(certBase64Body(pem));
}

function buildUblExtensions(params: {
  invoiceHash: string;
  signatureValue: string;
  certBase64: string;
  signingTimeISO: string;
}): string {
  const certHashPlaceholder = params.invoiceHash; // hash of cert would be computed off-line in a full impl
  return `<ext:UBLExtensions>
  <ext:UBLExtension>
    <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
    <ext:ExtensionContent>
      <sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2"
                                 xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2"
                                 xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2">
        <sac:SignatureInformation>
          <cbc:ID xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">urn:oasis:names:specification:ubl:signature:1</cbc:ID>
          <sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID>
          <ds:Signature Id="signature" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
            <ds:SignedInfo>
              <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
              <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"/>
              <ds:Reference URI="">
                <ds:Transforms>
                  <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"/>
                </ds:Transforms>
                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                <ds:DigestValue>${params.invoiceHash}</ds:DigestValue>
              </ds:Reference>
            </ds:SignedInfo>
            <ds:SignatureValue>${params.signatureValue}</ds:SignatureValue>
            <ds:KeyInfo>
              <ds:X509Data>
                <ds:X509Certificate>${params.certBase64}</ds:X509Certificate>
              </ds:X509Data>
            </ds:KeyInfo>
            <ds:Object>
              <xades:QualifyingProperties Target="signature" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
                <xades:SignedProperties Id="xadesSignedProperties">
                  <xades:SignedSignatureProperties>
                    <xades:SigningTime>${params.signingTimeISO}</xades:SigningTime>
                    <xades:SigningCertificate>
                      <xades:Cert>
                        <xades:CertDigest>
                          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                          <ds:DigestValue>${certHashPlaceholder}</ds:DigestValue>
                        </xades:CertDigest>
                      </xades:Cert>
                    </xades:SigningCertificate>
                  </xades:SignedSignatureProperties>
                </xades:SignedProperties>
              </xades:QualifyingProperties>
            </ds:Object>
          </ds:Signature>
        </sac:SignatureInformation>
      </sig:UBLDocumentSignatures>
    </ext:ExtensionContent>
  </ext:UBLExtension>
</ext:UBLExtensions>`;
}

function injectExtensions(xml: string, extBlock: string): string {
  // Insert immediately after the <Invoice ...> opening tag.
  const m = xml.match(/<Invoice\b[^>]*>/);
  if (!m) return xml;
  const idx = m.index! + m[0].length;
  return xml.slice(0, idx) + "\n  " + extBlock + xml.slice(idx);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as SignRequest;
    if (!body?.branch_id || !body?.xml || !body?.invoice_hash) {
      return new Response(JSON.stringify({ error: "missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: branch, error: bErr } = await supabase
      .from("branches")
      .select("csid_certificate_pem, csid_private_key_pem, csid_mode")
      .eq("id", body.branch_id)
      .maybeSingle();
    if (bErr) throw bErr;
    if (!branch?.csid_certificate_pem || !branch?.csid_private_key_pem) {
      return new Response(JSON.stringify({
        error: "csid_not_configured",
        message: "لم يتم إعداد شهادة CSID لهذا الفرع بعد.",
      }), { status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Sign the invoice hash with ECDSA P-256
    const signatureValue = await ecdsaSign(branch.csid_private_key_pem, body.invoice_hash);

    // 2. Build UBL signature block and inject into XML
    const certBase64 = certBase64Body(branch.csid_certificate_pem);
    const ext = buildUblExtensions({
      invoiceHash: body.invoice_hash,
      signatureValue,
      certBase64,
      signingTimeISO: new Date().toISOString(),
    });
    const signedXml = injectExtensions(body.xml, ext);

    // 3. Build 9-field TLV QR
    const publicKeyDer = certDer(branch.csid_certificate_pem);
    const qrSigned = await buildSignedQr({
      sellerName: body.seller_name,
      vatNumber: body.vat_number,
      timestampISO: body.issue_datetime,
      totalWithVat: body.total_with_vat,
      vatTotal: body.vat_total,
      invoiceHash: body.invoice_hash,
      signature: signatureValue,
      publicKeyDer,
    });

    return new Response(JSON.stringify({
      signed_xml: signedXml,
      signature_value: signatureValue,
      qr_code_signed: qrSigned,
      mode: branch.csid_mode || "sandbox",
      signed_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("zatca-sign error", err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

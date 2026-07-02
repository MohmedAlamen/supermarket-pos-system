// Minimal UBL 2.1 XML builder for ZATCA e-invoices (Phase 2 structure).
// Digital signature block is added later by the signing edge function.

export interface ZatcaLine {
  name: string;
  quantity: number;
  unitPrice: number;   // net unit price (before VAT)
  lineTotal: number;   // net line total (before VAT)
  vatRate: number;     // percent, e.g. 15
  vatAmount: number;   // absolute VAT for this line
}

export interface ZatcaSeller {
  name: string;
  vatNumber: string;
  crn?: string;
  address?: string;
  city?: string;
  country?: string; // ISO 2-letter
}

export interface ZatcaCustomer {
  name?: string | null;
  vatNumber?: string | null;
  address?: string | null;
}

export interface BuildXmlInput {
  invoiceNumber: string;
  uuid: string;
  icv: number;
  issueDateISO: string;   // full ISO datetime
  previousInvoiceHash: string; // base64
  invoiceType: "simplified" | "standard";
  currency?: string;      // default SAR
  seller: ZatcaSeller;
  customer?: ZatcaCustomer | null;
  lines: ZatcaLine[];
  subtotal: number;      // sum of line net totals
  discountTotal: number; // absolute
  vatTotal: number;
  grandTotal: number;
}

function esc(s: string | number | undefined | null): string {
  const str = s == null ? "" : String(s);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildZatcaXml(input: BuildXmlInput): string {
  const currency = input.currency || "SAR";
  const date = input.issueDateISO.substring(0, 10);
  const time = input.issueDateISO.substring(11, 19);
  // ZATCA InvoiceTypeCode: 388 = tax invoice; name attribute encodes B2C(01) or B2B(02) etc.
  // Simplified (B2C) => name="0200000", Standard (B2B) => name="0100000"
  const typeName = input.invoiceType === "simplified" ? "0200000" : "0100000";

  const linesXml = input.lines
    .map((l, idx) => `
  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">${l.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${l.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${currency}">${l.vatAmount.toFixed(2)}</cbc:TaxAmount>
      <cbc:RoundingAmount currencyID="${currency}">${(l.lineTotal + l.vatAmount).toFixed(2)}</cbc:RoundingAmount>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${esc(l.name)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${l.vatRate.toFixed(2)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${l.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`)
    .join("");

  const customerXml = input.customer && (input.customer.name || input.customer.vatNumber) ? `
  <cac:AccountingCustomerParty>
    <cac:Party>
      ${input.customer.vatNumber ? `<cac:PartyTaxScheme><cbc:CompanyID>${esc(input.customer.vatNumber)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ""}
      <cac:PartyLegalEntity><cbc:RegistrationName>${esc(input.customer.name || "")}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${esc(input.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${input.uuid}</cbc:UUID>
  <cbc:IssueDate>${date}</cbc:IssueDate>
  <cbc:IssueTime>${time}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${typeName}">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${currency}</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${input.icv}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${input.previousInvoiceHash}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="CRN">${esc(input.seller.crn || "")}</cbc:ID></cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(input.seller.address || "")}</cbc:StreetName>
        <cbc:CityName>${esc(input.seller.city || "")}</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>${esc(input.seller.country || "SA")}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(input.seller.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${esc(input.seller.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>${customerXml}
  <cac:AllowanceCharge>
    <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
    <cbc:AllowanceChargeReason>discount</cbc:AllowanceChargeReason>
    <cbc:Amount currencyID="${currency}">${input.discountTotal.toFixed(2)}</cbc:Amount>
  </cac:AllowanceCharge>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${input.vatTotal.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${input.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${(input.subtotal - input.discountTotal).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${input.grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${currency}">${input.discountTotal.toFixed(2)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="${currency}">${input.grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${linesXml}
</Invoice>`;
}

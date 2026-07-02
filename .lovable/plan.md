## نطاق ZATCA Phase 2 (الفوترة الإلكترونية السعودية)

تكامل ZATCA Phase 2 يتكوّن من 4 طبقات. سأنفّذها على مراحل — الطبقات 1 و2 لا تحتاج شهادات ZATCA وتعمل الآن، والطبقات 3 و4 تحتاج تسجيل مع ZATCA.

---

## المرحلة الأولى (سأبدأ بها الآن) — الأساس المستقل

### 1. توسعة قاعدة البيانات
جدول `sales` — إضافة أعمدة ZATCA:
- `icv` (عدّاد الفاتورة لكل جهاز/فرع — Invoice Counter Value)
- `uuid_zatca` (UUID فريد للفاتورة)
- `previous_invoice_hash` (PIH — للـ hash chain)
- `invoice_hash` (SHA-256 للفاتورة الحالية)
- `xml_content` (نص XML UBL 2.1 الكامل)
- `qr_code` (TLV base64 — للطباعة على الفاتورة)
- `zatca_status` (`not_submitted` / `reported` / `cleared` / `rejected`)
- `zatca_response` (JSONB — رد ZATCA)
- `invoice_type` (`simplified` / `standard` — B2C / B2B)

جدول `branches` — إضافة:
- `device_serial` (رقم تسلسلي للجهاز)
- `common_name`, `organization_name`, `country_code`, `crn` (السجل التجاري) — لبيانات الشهادة
- `last_invoice_hash` (لسلسلة الـ hash)

### 2. مكتبة توليد UBL 2.1 XML
`src/lib/zatca/xml.ts` — بناء XML UBL موافق لمواصفات ZATCA لكل فاتورة:
- بيانات البائع، المشتري، البنود، الضرائب، الخصومات
- ربطها تلقائياً بترقيم الفرع الحالي (invoice_prefix + counter)
- توليد UUID + ICV + PIH من آخر فاتورة في نفس الفرع

### 3. QR TLV Base64
`src/lib/zatca/qr.ts` — توليد QR بصيغة TLV Base64 (5 حقول للفاتورة المبسّطة B2C):
1. اسم البائع
2. الرقم الضريبي
3. التاريخ والوقت (ISO 8601)
4. الإجمالي مع الضريبة
5. مبلغ الضريبة

عرضه على الإيصال المطبوع تلقائياً.

### 4. Hash Chain
`src/lib/zatca/hash.ts` — SHA-256 للفاتورة، وربط `previous_invoice_hash` بالفاتورة السابقة لنفس الفرع (يُقرأ من `branches.last_invoice_hash` ويُحدَّث بعد كل بيع).

### 5. صفحة "فواتير ZATCA"
- عرض الفواتير مع حالة ZATCA
- زر تنزيل XML لكل فاتورة
- عرض QR + PIH + Hash

---

## المرحلة الثانية (لاحقاً) — التوقيع الرقمي والإرسال

### 6. Edge Function للتوقيع
`supabase/functions/zatca-sign/index.ts`:
- توقيع XML بمفتاح ECDSA P-256
- إضافة الـ signature + certificate إلى XML
- توليد QR TLV بـ 9 حقول (للفواتير الضريبية B2B)

**يحتاج**: توليد CSR + تسجيل مع ZATCA للحصول على Compliance CSID → Production CSID.

### 7. Edge Function للإرسال
`supabase/functions/zatca-submit/index.ts`:
- **B2C (Simplified)**: إرسال Reporting بعد البيع (خلال 24 ساعة)
- **B2B (Standard)**: إرسال Clearance وانتظار الرد قبل الطباعة
- تخزين رد ZATCA (`cleared` / `rejected` / warnings)

### 8. Onboarding UI
صفحة إعدادات لكل فرع:
- إدخال بيانات المنشأة
- توليد CSR
- إدخال OTP من بوابة Fatoora
- الحصول على شهادة الامتثال ثم الإنتاج

---

## بيئة العمل

- **Sandbox أولاً**: كل استدعاءات ZATCA تذهب إلى بيئة `sandbox.zatca.gov.sa` حتى ينتهي الاختبار
- **Production لاحقاً**: تبديل عبر مفتاح في إعدادات المتجر

---

## ما أحتاجه منك لاحقاً (المرحلة الثانية)

1. الرقم الضريبي للمنشأة (15 رقم يبدأ بـ 3 وينتهي بـ 3)
2. رقم السجل التجاري (CRN)
3. اسم المنشأة بالإنجليزية
4. عنوان المنشأة (شارع، مبنى، حي، مدينة، رمز بريدي)
5. OTP من بوابة Fatoora لكل فرع (للحصول على شهادة الامتثال)

---

## خطة التنفيذ الآن

سأنفّذ **المرحلة الأولى فقط** الآن (البنود 1–5). النتيجة:
- كل فاتورة جديدة تُخزَّن مع XML كامل، QR TLV، Hash، ICV، PIH
- QR يظهر على الإيصال المطبوع
- يمكنك تنزيل XML وتقديمه يدوياً لـ ZATCA للاختبار
- كل شيء جاهز لتفعيل التوقيع والإرسال في المرحلة الثانية دون تعديل بنية البيانات

هل أبدأ؟
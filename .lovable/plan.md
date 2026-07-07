## برنامج الولاء المتقدم

نظام ولاء متعدد المتاجر يشمل نقاطاً للعملاء، كوبونات خصم، وإدارة كاملة للاستردادات، مربوط بالمتجر النشط (store_id) وبنظام نقطة البيع الحالي.

### 1) قاعدة البيانات (Migration)

**جداول جديدة (كلها مربوطة بـ store_id + RLS حسب عضوية المتجر):**

- **loyalty_programs** — إعدادات البرنامج لكل متجر: نسبة النقاط لكل ريال (`points_per_currency`), قيمة النقطة عند الاسترداد (`currency_per_point`), الحد الأدنى للاسترداد, حالة التفعيل, انتهاء النقاط بعد X شهر.
- **loyalty_transactions** — سجل حركات النقاط: type (`earn` / `redeem` / `adjust` / `expire` / `refund`), points (± موجب/سالب), customer_id, sale_id (اختياري), reason, created_by, created_at. مصدر الحقيقة لرصيد العميل = مجموع النقاط.
- **coupons** — الكوبونات: code (unique per store), نوع الخصم (`percent` / `fixed` / `free_shipping`), القيمة, الحد الأدنى للفاتورة, تاريخ البداية والانتهاء, عدد الاستخدامات الكلي والمتبقي, حد الاستخدام لكل عميل, is_active.
- **coupon_redemptions** — كل عملية استخدام لكوبون: coupon_id, customer_id, sale_id, discount_applied, redeemed_by, redeemed_at.

**تعديلات على `sales`:**
- `coupon_id` (nullable) + `coupon_code` + `coupon_discount` (تخفيض من الكوبون)
- `loyalty_points_earned` + `loyalty_points_redeemed` + `loyalty_discount`

**دوال SQL (Security Definer):**
- `get_customer_points(_customer_id)` → SUM من loyalty_transactions
- `redeem_coupon(_code, _customer_id, _subtotal, _store_id)` → التحقق من الصلاحية وإرجاع قيمة الخصم (بدون تسجيل — التسجيل يحدث عند الحفظ)

### 2) نقطة البيع (POS)

في `POSPage` وسلة الشراء نضيف قسم **"الولاء والكوبونات"**:
- عرض رصيد نقاط العميل (إن اختير عميل) + قيمتها بالريال.
- زر **"استخدام النقاط"** (input بعدد النقاط ≤ الرصيد ≤ الحد الأدنى المسموح).
- حقل **"كود كوبون"** + زر تطبيق → استدعاء `redeem_coupon` وعرض قيمة الخصم أو الخطأ.
- إظهار سطر منفصل في ملخص الفاتورة: خصم الكوبون / خصم النقاط / النقاط المكتسبة من هذه الفاتورة.

عند حفظ الفاتورة (`persistSale`):
- تخزين `coupon_id/code/discount` و `loyalty_points_earned/redeemed` في `sales`.
- إنشاء transactions في `loyalty_transactions`: صف earn بالنقاط المكتسبة، وصف redeem سالب إن استخدمت نقاط.
- إنشاء صف في `coupon_redemptions` وتخفيض `remaining_uses` للكوبون.

### 3) الصفحات الجديدة

- **`/loyalty`** — إعدادات البرنامج، رصيد أعلى 10 عملاء، إحصائيات (نقاط ممنوحة/مستردة هذا الشهر).
- **`/coupons`** — CRUD كامل للكوبونات + نسخ الكود + عرض عدد الاستخدامات المتبقية + تفعيل/تعطيل.
- **`/redemptions`** — صفحة إدارة الاستردادات: جدول موحّد يعرض حركات النقاط + استخدامات الكوبونات مع فلاتر (النوع، العميل، الفترة، الكوبون)، إمكانية **إلغاء استرداد** (يُنشئ حركة عكسية refund + يعيد استخدام الكوبون)، تصدير Excel.

### 4) الشريط الجانبي والصلاحيات

- إضافة روابط: "الولاء" و"الكوبونات" و"الاستردادات" (admin/manager فقط للإدارة، الكاشير يرى فقط).
- صفحة العميل تعرض تبويب "سجل النقاط" مع الحركات.

### تفاصيل تقنية

**RLS:** كل الجداول الجديدة تستخدم `is_store_member(store_id)` للقراءة و `has_store_role(store_id, ARRAY['owner','admin','manager'])` للكتابة/الحذف. الكاشير يستطيع إنشاء `loyalty_transactions` و `coupon_redemptions` (اللازم للبيع) لكن لا يستطيع التعديل أو الحذف.

**التزامن مع دون اتصال:** حركات النقاط والكوبونات جزء من عملية الحفظ نفسها في `persistSale` (نفس المسار الحالي). عند إعادة المزامنة من IndexedDB، تُنفَّذ نفس الخطوات.

**الحقل `customers.loyalty_points`** يبقى كـ cache للعرض السريع، ويُحدَّث عبر trigger على `loyalty_transactions`.

**الملفات الجديدة:**
```
supabase/migrations/*.sql
src/hooks/useLoyalty.ts
src/hooks/useCoupons.ts
src/components/pos/LoyaltyCouponPanel.tsx
src/pages/LoyaltyPage.tsx
src/pages/CouponsPage.tsx
src/pages/RedemptionsPage.tsx
```

**الملفات المعدَّلة:**
```
src/App.tsx                 (روابط الصفحات)
src/components/AppSidebar.tsx
src/pages/POSPage.tsx       (دمج لوحة الولاء)
src/hooks/useSales.ts       (حفظ نقاط + كوبون)
src/lib/zatca/persist.ts    (إضافة loyalty/coupon fields)
```

بعد الموافقة سأبدأ بـ (1) الـ migration ثم (2) الصفحات والـ hooks ثم (3) دمج POS.
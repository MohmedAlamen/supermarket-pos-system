# نظام نقطة البيع للسوبر ماركت | Supermarket POS System

## مفهوم المشروع | Project Concept

نظام متكامل لإدارة نقطة البيع (POS) في السوبر ماركتات والمتاجر الصغيرة. يوفر حلاً شاملاً لتسجيل المبيعات، إدارة المخزون، الإبلاغ عن الأداء، وإدارة الموظفين. التطبيق مبني على أحدث التقنيات الويب لضمان أداء سريع وموثوقية عالية.

**An integrated Point of Sale (POS) system for supermarkets and small stores. It provides a comprehensive solution for sales transactions, inventory management, performance reporting, and staff administration. The application is built with modern web technologies to ensure fast performance and high reliability.**

---

## الميزات الرئيسية | Key Features

### 🛒 نقطة البيع | Point of Sale (POS)
- **الفحص السريع للمنتجات**: ماسح الباركود المدمج لتسجيل المنتجات بسرعة
- **إدارة سلة التسوق**: إضافة/حذف/تعديل كميات المنتجات
- **معالجة الدفع**: دعم طرق دفع متعددة
- **طباعة الإيصالات**: طباعة تفصيلية للعمليات

### 📊 إدارة المخزون | Inventory Management
- **تتبع المنتجات**: قائمة شاملة بجميع المنتجات
- **تنبيهات المخزون المنخفض**: إشعارات تلقائية عند انخفاض المخزون
- **تحديث الكميات**: تحديث فوري لكميات المنتجات بعد كل عملية بيع

### 📈 التقارير والتحليلات | Reports & Analytics
- **تقارير المبيعات**: إحصائيات مفصلة عن المبيعات اليومية والشهرية
- **تحليل الأداء**: متابعة الأرباح والخسائر
- **رؤى البيانات**: رسوم بيانية وجداول تفصيلية

### 👥 إدارة الموظفين | Staff Management
- **تسجيل الموظفين**: إنشاء وإدارة حسابات الموظفين
- **الأدوار والصلاحيات**: نظام صلاحيات متقدم حسب الدور الوظيفي
- **تتبع الأنشطة**: سجل شامل لأنشطة كل موظف

### 🔐 الأمان والمصادقة | Security & Authentication
- **تسجيل الدخول الآمن**: نظام مصادقة موثوق مع Supabase
- **التشفير**: حماية كاملة للبيانات الحساسة
- **الصلاحيات المتقدمة**: تحكم دقيق على من يمكنه الوصول لماذا

---

## المكدس التكنولوجي | Tech Stack

### Frontend
- **React 18**: مكتبة واجهات المستخدم
- **TypeScript**: لتطوير آمن من حيث الأنواع
- **Vite**: أداة بناء سريعة وحديثة
- **Tailwind CSS**: نظام تصميم سريع الاستجابة
- **Shadcn/ui**: مكتبة مكونات احترافية

### Backend
- **Supabase**: منصة Firebase مفتوحة المصدر
- **PostgreSQL**: قاعدة البيانات القوية
- **Real-time Updates**: تحديثات فورية للبيانات

### Testing & Quality
- **Vitest**: اختبار الوحدات السريع
- **Playwright**: اختبار التكامل والتطبيقات النهائية
- **ESLint**: فحص جودة الكود

---

## البنية المشروعية | Project Structure

```
src/
├── components/          # مكونات الواجهة
│   ├── pos/            # مكونات نقطة البيع
│   ├── ui/             # مكونات واجهة المستخدم الأساسية
│   └── ...
├── pages/              # الصفحات الرئيسية
│   ├── POSPage.tsx     # صفحة نقطة البيع
│   ├── ProductsPage.tsx
│   ├── ReportsPage.tsx
│   └── ...
├── hooks/              # React hooks مخصصة
├── contexts/           # Context API للحالة العامة
├── integrations/       # تكاملات خارجية (Supabase)
├── lib/                # وظائف مساعدة
└── types/              # تعريفات TypeScript
```

---

## البدء السريع | Quick Start

### المتطلبات | Prerequisites
- Node.js 18+
- npm (package manager)
- حساب Supabase (Supabase account)

### التثبيت | Installation

```bash
# استنساخ المشروع
git clone <repository-url>
cd supermarket-pos-system

# تثبيت المتعلقات
npm install

# إعداد متغيرات البيئة
cp .env.example .env.local
# قم بتعديل .env.local بمفاتيح Supabase الخاصة بك
```

### التشغيل | Running

```bash
# بدء خادم التطوير
npm run dev

# بناء الإنتاج
npm run build

# اختبار التطبيق
npm run test

# اختبار البلاي رايت
npm run test:e2e
```

---

## الميزات المتقدمة | Advanced Features

### 🔄 المزامنة الفورية | Real-time Synchronization
يتم تحديث بيانات المخزون والمبيعات في الوقت الفعلي عبر جميع الأجهزة المتصلة.

### 📱 التوافق مع الهاتف | Mobile Responsive
واجهة مستجيبة تعمل بكفاءة على الأجهزة اللوحية وشاشات اللمس.

### 🖨️ طباعة متقدمة | Advanced Printing
دعم العديد من أنواع الطابعات مع خيارات طباعة مرنة.

### 📤 تصدير البيانات | Data Export
تصدير التقارير والبيانات إلى صيغ متعددة (CSV, PDF).

---

## المساهمة | Contributing

نرحب بالمساهمات! يرجى:
1. Fork المشروع
2. إنشاء branch للميزة الجديدة
3. Commit التغييرات
4. Push للـ branch
5. فتح Pull Request

---

## الترخيص | License

هذا المشروع مرخص تحت MIT License.

---

## الدعم | Support

للمساعدة والدعم، يرجى فتح issue في المشروع أو التواصل معنا عبر البريد الإلكتروني.

---

**تم بناء هذا المشروع بواسطة فريق متخصص في حلول نقاط البيع الحديثة.**

**Built with ❤️ by a specialized team in modern POS solutions.**

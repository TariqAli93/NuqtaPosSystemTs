// ============================================================
// Business Preset Definitions for Seed Script
// All prices in IQD (Iraqi Dinar) — thousands-based, no decimals
// ============================================================

export type PresetKey =
  | 'supermarket'
  | 'phones'
  | 'clothing'
  | 'pharmacy'
  | 'electronics'
  | 'restaurant';

export interface PresetCategory {
  name: string;
  description: string;
}

export interface PresetProductUnit {
  unitName: string;
  factorToBase: number;
  barcode?: string;
  sellingPrice?: number;
}

export interface PresetProduct {
  name: string;
  sku: string;
  categoryRef: string; // matches a category name from the same preset
  costPrice: number;
  sellingPrice: number;
  stock: number; // fallback stock if no purchases seed it
  minStock: number;
  unit: string;
  supplier: string;
  status: 'available' | 'out_of_stock' | 'discontinued';
  units?: PresetProductUnit[]; // extra packaging units
}

export interface PresetCustomer {
  name: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
}

export interface PresetSupplier {
  name: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
}

export interface PresetPurchaseItem {
  productRef: string; // SKU
  quantity: number;
  unitCost: number;
  unit?: string; // Optional: specify a unit like 'carton'
}

export interface PresetPurchase {
  supplierRef: string; // matches supplier name
  invoiceNumber: string;
  items: PresetPurchaseItem[];
  paidAmount: number;
  notes: string;
}

export interface PresetSaleItem {
  productRef: string; // SKU
  quantity: number;
  unit?: string; // Optional: specify a unit
}

export interface PresetSale {
  customerRef: number; // index into customers array
  discount: number;
  paymentType: 'cash' | 'credit' | 'mixed';
  paidAmount: number;
  notes: string;
  items: PresetSaleItem[];
  interestRate?: number;
}

export interface Preset {
  label: string;
  categories: PresetCategory[];
  products: PresetProduct[];
  suppliers: PresetSupplier[];
  purchases: PresetPurchase[];
  customers: PresetCustomer[];
  sales: PresetSale[];
}

// ============================================================
// SUPERMARKET / GROCERY
// ============================================================
export const supermarket: Preset = {
  label: 'سوبرماركت / بقالة',
  categories: [
    { name: 'مواد غذائية', description: 'مواد غذائية أساسية ومستلزمات يومية' },
    { name: 'مشروبات', description: 'مشروبات باردة وساخنة' },
    { name: 'ألبان ومشتقاتها', description: 'حليب، لبن، جبن وألبان متنوعة' },
    { name: 'وجبات خفيفة', description: 'شيبس، بسكويت، شوكولاتة' },
    { name: 'مواد تنظيف', description: 'مساحيق غسيل ومنظفات' },
    { name: 'العناية الشخصية', description: 'صابون، شامبو ومستحضرات العناية' },
  ],
  products: [
    // مواد غذائية
    {
      name: 'رز عنبر ممتاز 5 كغم',
      sku: 'SM-RICE-5KG',
      categoryRef: 'مواد غذائية',
      costPrice: 15000,
      sellingPrice: 22000,
      stock: 0,
      minStock: 10,
      unit: 'كيس',
      supplier: 'شركة الرافدين للمواد الغذائية',
      status: 'available',
      units: [{ unitName: 'كرتونة', factorToBase: 4, sellingPrice: 85000 }],
    },
    {
      name: 'سكر أبيض 1 كغم',
      sku: 'SM-SUGAR-1KG',
      categoryRef: 'مواد غذائية',
      costPrice: 1000,
      sellingPrice: 1500,
      stock: 80,
      minStock: 20,
      unit: 'كيس',
      supplier: 'شركة السكر العراقية',
      status: 'available',
    },
    {
      name: 'زيت دوار الشمس 1.5 لتر',
      sku: 'SM-OIL-1.5L',
      categoryRef: 'مواد غذائية',
      costPrice: 4500,
      sellingPrice: 6500,
      stock: 5,
      minStock: 10,
      unit: 'قنينة',
      supplier: 'شركة الزيوت النباتية',
      status: 'available',
    },
    {
      name: 'طحين أبيض 2 كغم',
      sku: 'SM-FLOUR-2KG',
      categoryRef: 'مواد غذائية',
      costPrice: 2000,
      sellingPrice: 3000,
      stock: 0,
      minStock: 15,
      unit: 'كيس',
      supplier: 'مطاحن بغداد',
      status: 'out_of_stock',
    },
    // مشروبات
    {
      name: 'شاي أسود 250 غرام',
      sku: 'SM-TEA-250G',
      categoryRef: 'مشروبات',
      costPrice: 2500,
      sellingPrice: 4000,
      stock: 60,
      minStock: 15,
      unit: 'علبة',
      supplier: 'شركة البصرة للشاي',
      status: 'available',
    },
    {
      name: 'ماء معدني 1.5 لتر',
      sku: 'SM-WATER-1.5L',
      categoryRef: 'مشروبات',
      costPrice: 250,
      sellingPrice: 500,
      stock: 0,
      minStock: 50,
      unit: 'قنينة',
      supplier: 'ينابيع بغداد',
      status: 'available',
      units: [
        { unitName: 'صندوق', factorToBase: 12, sellingPrice: 5500 },
        { unitName: 'رزمة', factorToBase: 24, sellingPrice: 10000 },
      ],
    },
    {
      name: 'عصير برتقال 1 لتر',
      sku: 'SM-JUICE-1L',
      categoryRef: 'مشروبات',
      costPrice: 2000,
      sellingPrice: 3000,
      stock: 45,
      minStock: 10,
      unit: 'كرتونة',
      supplier: 'مصنع العصائر الوطني',
      status: 'available',
    },
    {
      name: 'مشروب غازي 2 لتر',
      sku: 'SM-COLA-2L',
      categoryRef: 'مشروبات',
      costPrice: 1000,
      sellingPrice: 1500,
      stock: 90,
      minStock: 20,
      unit: 'قنينة',
      supplier: 'شركة المشروبات الغازية',
      status: 'available',
    },
    // ألبان
    {
      name: 'حليب كامل الدسم 1 لتر',
      sku: 'SM-MILK-1L',
      categoryRef: 'ألبان ومشتقاتها',
      costPrice: 1500,
      sellingPrice: 2500,
      stock: 35,
      minStock: 15,
      unit: 'كرتونة',
      supplier: 'مزارع الألبان الحديثة',
      status: 'available',
    },
    {
      name: 'لبن زبادي 500 مل',
      sku: 'SM-YOGURT-500ML',
      categoryRef: 'ألبان ومشتقاتها',
      costPrice: 750,
      sellingPrice: 1250,
      stock: 20,
      minStock: 10,
      unit: 'علبة',
      supplier: 'مزارع الألبان الحديثة',
      status: 'available',
    },
    {
      name: 'جبن أبيض 400 غرام',
      sku: 'SM-CHEESE-400G',
      categoryRef: 'ألبان ومشتقاتها',
      costPrice: 3000,
      sellingPrice: 5000,
      stock: 25,
      minStock: 8,
      unit: 'علبة',
      supplier: 'مصنع الأجبان الوطني',
      status: 'available',
    },
    // وجبات خفيفة
    {
      name: 'شيبس بطاطا 100 غرام',
      sku: 'SM-CHIPS-100G',
      categoryRef: 'وجبات خفيفة',
      costPrice: 500,
      sellingPrice: 1000,
      stock: 150,
      minStock: 30,
      unit: 'كيس',
      supplier: 'مصنع الوجبات الخفيفة',
      status: 'available',
    },
    {
      name: 'بسكويت محشي 200 غرام',
      sku: 'SM-BISCUIT-200G',
      categoryRef: 'وجبات خفيفة',
      costPrice: 1000,
      sellingPrice: 1750,
      stock: 70,
      minStock: 20,
      unit: 'علبة',
      supplier: 'مخبز الحلويات الشرقية',
      status: 'available',
    },
    {
      name: 'شوكولاتة 50 غرام',
      sku: 'SM-CHOCO-50G',
      categoryRef: 'وجبات خفيفة',
      costPrice: 750,
      sellingPrice: 1500,
      stock: 120,
      minStock: 25,
      unit: 'قطعة',
      supplier: 'مصنع الحلويات',
      status: 'available',
    },
    // مواد تنظيف
    {
      name: 'مسحوق غسيل 3 كغم',
      sku: 'SM-DETERGENT-3KG',
      categoryRef: 'مواد تنظيف',
      costPrice: 5000,
      sellingPrice: 7500,
      stock: 30,
      minStock: 10,
      unit: 'كيس',
      supplier: 'شركة المنظفات الحديثة',
      status: 'available',
    },
    {
      name: 'سائل جلي 750 مل',
      sku: 'SM-DISH-750ML',
      categoryRef: 'مواد تنظيف',
      costPrice: 1500,
      sellingPrice: 2500,
      stock: 55,
      minStock: 15,
      unit: 'قنينة',
      supplier: 'شركة المنظفات الحديثة',
      status: 'available',
    },
    // العناية الشخصية
    {
      name: 'شامبو للشعر 400 مل',
      sku: 'SM-SHAMPOO-400ML',
      categoryRef: 'العناية الشخصية',
      costPrice: 3500,
      sellingPrice: 6000,
      stock: 40,
      minStock: 12,
      unit: 'قنينة',
      supplier: 'شركة مستحضرات التجميل',
      status: 'available',
    },
    {
      name: 'صابون معطر 125 غرام',
      sku: 'SM-SOAP-125G',
      categoryRef: 'العناية الشخصية',
      costPrice: 500,
      sellingPrice: 1000,
      stock: 100,
      minStock: 30,
      unit: 'قطعة',
      supplier: 'مصنع الصابون الطبيعي',
      status: 'available',
    },
  ],
  suppliers: [
    {
      name: 'شركة الرافدين للمواد الغذائية',
      phone: '+964780100200',
      address: 'المنطقة الصناعية، بغداد',
      city: 'بغداد',
      notes: 'مورد رئيسي للأرز والسكر والزيوت',
    },
    {
      name: 'ينابيع بغداد',
      phone: '+964780200300',
      address: 'الطارمية، بغداد',
      city: 'بغداد',
      notes: 'مورد المياه المعدنية',
    },
    {
      name: 'شركة المنظفات الحديثة',
      phone: '+964780300400',
      address: 'المنطقة الصناعية، بصرة',
      city: 'البصرة',
      notes: 'منظفات ومواد تنظيف',
    },
  ],
  purchases: [
    {
      supplierRef: 'شركة الرافدين للمواد الغذائية',
      invoiceNumber: 'PUR-SM-001',
      paidAmount: 800000,
      notes: 'توريد شهري - مواد غذائية',
      items: [
        { productRef: 'SM-RICE-5KG', quantity: 40, unitCost: 15000 },
        { productRef: 'SM-SUGAR-1KG', quantity: 80, unitCost: 1000 },
        { productRef: 'SM-OIL-1.5L', quantity: 30, unitCost: 4500 },
        { productRef: 'SM-TEA-250G', quantity: 60, unitCost: 2500 },
      ],
    },
    {
      supplierRef: 'ينابيع بغداد',
      invoiceNumber: 'PUR-SM-002',
      paidAmount: 50000,
      notes: 'توريد مياه أسبوعي',
      items: [
        { productRef: 'SM-WATER-1.5L', quantity: 200, unitCost: 250 },
        { productRef: 'SM-JUICE-1L', quantity: 45, unitCost: 2000 },
        { productRef: 'SM-COLA-2L', quantity: 90, unitCost: 1000 },
      ],
    },
  ],
  customers: [
    {
      name: 'علي حسن محمود',
      phone: '+964770111222',
      address: 'الكرادة، بغداد',
      city: 'Baghdad',
      notes: 'زبون دائم، يشتري بالجملة',
    },
    {
      name: 'سارة محمود أحمد',
      phone: '+964770222333',
      address: 'الجادرية، بغداد',
      city: 'Baghdad',
      notes: 'زبونة مميزة',
    },
    {
      name: 'محمد عبد الله',
      phone: '+964770333444',
      address: 'المنصور، بغداد',
      city: 'Baghdad',
      notes: 'يفضل الدفع بالتقسيط',
    },
    {
      name: 'فاطمة جمال',
      phone: '+964770444555',
      address: 'الأعظمية، بغداد',
      city: 'Baghdad',
      notes: 'تشتري المواد الغذائية أسبوعياً',
    },
    {
      name: 'حسين طارق',
      phone: '+964770555666',
      address: 'الدورة، بغداد',
      city: 'Baghdad',
      notes: 'صاحب مطعم صغير',
    },
    {
      name: 'زينب كريم',
      phone: '+964770666777',
      address: 'الكاظمية، بغداد',
      city: 'Baghdad',
      notes: '',
    },
    {
      name: 'أحمد سعيد',
      phone: '+964770777888',
      address: 'الزعفرانية، بغداد',
      city: 'Baghdad',
      notes: 'يطلب توصيل',
    },
    {
      name: 'ليلى مهدي',
      phone: '+964770888999',
      address: 'الحرية، بغداد',
      city: 'Baghdad',
      notes: 'عميلة جديدة',
    },
  ],
  sales: [
    // Sale 1: Large cash sale (groceries)
    {
      customerRef: 0,
      discount: 2000,
      paymentType: 'cash',
      paidAmount: 100000,
      notes: 'مشتريات شهرية',
      items: [
        { productRef: 'SM-RICE-5KG', quantity: 3 },
        { productRef: 'SM-SUGAR-1KG', quantity: 5 },
        { productRef: 'SM-OIL-1.5L', quantity: 2 },
        { productRef: 'SM-TEA-250G', quantity: 4 },
      ],
    },
    // Sale 2: Mixed payment
    {
      customerRef: 2,
      discount: 0,
      paymentType: 'mixed',
      paidAmount: 40000,
      notes: 'دفع جزء نقدي والباقي آجل',
      interestRate: 5,
      items: [
        { productRef: 'SM-RICE-5KG', quantity: 2 },
        { productRef: 'SM-MILK-1L', quantity: 5 },
        { productRef: 'SM-CHEESE-400G', quantity: 3 },
        { productRef: 'SM-DETERGENT-3KG', quantity: 2 },
      ],
    },
    // Sale 3: Credit sale (restaurant owner buying in bulk)
    {
      customerRef: 4,
      discount: 5000,
      paymentType: 'mixed',
      paidAmount: 0,
      interestRate: 0,
      notes: 'للمطعم - دفع آجل',
      items: [
        { productRef: 'SM-WATER-1.5L', quantity: 24 },
        { productRef: 'SM-JUICE-1L', quantity: 12 },
        { productRef: 'SM-COLA-2L', quantity: 12 },
      ],
    },
    // Sale 4: Simple cash sale (beverages and snacks)
    {
      customerRef: 1,
      discount: 0,
      paymentType: 'cash',
      paidAmount: 11000,
      notes: '',
      items: [
        { productRef: 'SM-WATER-1.5L', quantity: 2 },
        { productRef: 'SM-CHIPS-100G', quantity: 3 },
        { productRef: 'SM-CHOCO-50G', quantity: 5 },
      ],
    },
    // Sale 5: Large family weekly shopping
    {
      customerRef: 3,
      discount: 2000,
      paymentType: 'cash',
      paidAmount: 65000,
      notes: 'مشتريات أسبوعية للعائلة',
      items: [
        { productRef: 'SM-RICE-5KG', quantity: 1 },
        { productRef: 'SM-SUGAR-1KG', quantity: 2 },
        { productRef: 'SM-TEA-250G', quantity: 2 },
        { productRef: 'SM-MILK-1L', quantity: 4 },
        { productRef: 'SM-YOGURT-500ML', quantity: 6 },
        { productRef: 'SM-BISCUIT-200G', quantity: 4 },
        { productRef: 'SM-DISH-750ML', quantity: 1 },
        { productRef: 'SM-SOAP-125G', quantity: 3 },
      ],
    },
    // Sale 6: Personal care products
    {
      customerRef: 5,
      discount: 0,
      paymentType: 'cash',
      paidAmount: 25000,
      notes: '',
      items: [
        { productRef: 'SM-SHAMPOO-400ML', quantity: 2 },
        { productRef: 'SM-SOAP-125G', quantity: 5 },
        { productRef: 'SM-DETERGENT-3KG', quantity: 1 },
      ],
    },
    // Sale 7: Mixed payment (partial cash)
    {
      customerRef: 6,
      discount: 1000,
      paymentType: 'mixed',
      paidAmount: 30000,
      notes: 'دفع جزئي',
      interestRate: 0,
      items: [
        { productRef: 'SM-RICE-5KG', quantity: 2 },
        { productRef: 'SM-OIL-1.5L', quantity: 3 },
        { productRef: 'SM-CHEESE-400G', quantity: 2 },
      ],
    },
    // Sale 8: Bulk snacks for small shop
    {
      customerRef: 7,
      discount: 10000,
      paymentType: 'cash',
      paidAmount: 120000,
      notes: 'للبيع بالتجزئة',
      items: [
        { productRef: 'SM-CHIPS-100G', quantity: 20 },
        { productRef: 'SM-BISCUIT-200G', quantity: 15 },
        { productRef: 'SM-CHOCO-50G', quantity: 30 },
        { productRef: 'SM-WATER-1.5L', quantity: 12 },
      ],
    },
    // Sale 9: Credit sale with multiple items
    {
      customerRef: 0,
      discount: 2000,
      paymentType: 'mixed',
      paidAmount: 0,
      interestRate: 0,
      notes: 'سيدفع نهاية الأسبوع',
      items: [
        { productRef: 'SM-JUICE-1L', quantity: 6 },
        { productRef: 'SM-COLA-2L', quantity: 8 },
        { productRef: 'SM-WATER-1.5L', quantity: 12 },
      ],
    },
    // Sale 10: Simple dairy purchase
    {
      customerRef: 1,
      discount: 0,
      paymentType: 'cash',
      paidAmount: 13000,
      notes: '',
      items: [
        { productRef: 'SM-MILK-1L', quantity: 3 },
        { productRef: 'SM-YOGURT-500ML', quantity: 4 },
      ],
    },
  ],
};

// ============================================================
// PHONE SHOP
// ============================================================
const phones: Preset = {
  label: 'محل هواتف',
  categories: [
    { name: 'هواتف ذكية', description: 'هواتف ذكية بمختلف الماركات' },
    { name: 'إكسسوارات هواتف', description: 'كفرات، شواحن، سماعات' },
    { name: 'قطع غيار وإصلاح', description: 'شاشات، بطاريات، قطع غيار' },
    { name: 'بطاقات وشرائح', description: 'شرائح اتصال ورصيد' },
  ],
  products: [
    // هواتف ذكية
    {
      name: 'Samsung Galaxy A15',
      sku: 'PH-SAM-A15',
      categoryRef: 'هواتف ذكية',
      costPrice: 180000,
      sellingPrice: 220000,
      stock: 8,
      minStock: 3,
      unit: 'قطعة',
      supplier: 'وكالة سامسونج - بغداد',
      status: 'available',
    },
    {
      name: 'iPhone 15 128GB',
      sku: 'PH-IPH-15-128',
      categoryRef: 'هواتف ذكية',
      costPrice: 950000,
      sellingPrice: 1100000,
      stock: 4,
      minStock: 2,
      unit: 'قطعة',
      supplier: 'Apple Store بغداد',
      status: 'available',
    },
    {
      name: 'Xiaomi Redmi Note 13',
      sku: 'PH-XIA-RN13',
      categoryRef: 'هواتف ذكية',
      costPrice: 200000,
      sellingPrice: 250000,
      stock: 12,
      minStock: 5,
      unit: 'قطعة',
      supplier: 'شاومي العراق',
      status: 'available',
    },
    // إكسسوارات
    {
      name: 'شاحن سريع 65W',
      sku: 'PH-CHRG-65W',
      categoryRef: 'إكسسوارات هواتف',
      costPrice: 8000,
      sellingPrice: 15000,
      stock: 50,
      minStock: 15,
      unit: 'قطعة',
      supplier: 'مستودع الإكسسوارات',
      status: 'available',
    },
    {
      name: 'كفر سيليكون Samsung',
      sku: 'PH-CASE-SAM',
      categoryRef: 'إكسسوارات هواتف',
      costPrice: 3000,
      sellingPrice: 7000,
      stock: 80,
      minStock: 20,
      unit: 'قطعة',
      supplier: 'مستودع الإكسسوارات',
      status: 'available',
    },
    {
      name: 'سماعة بلوتوث لاسلكية',
      sku: 'PH-EARBUDS',
      categoryRef: 'إكسسوارات هواتف',
      costPrice: 12000,
      sellingPrice: 25000,
      stock: 30,
      minStock: 10,
      unit: 'قطعة',
      supplier: 'مستودع الإكسسوارات',
      status: 'available',
    },
    {
      name: 'واقي شاشة زجاجي',
      sku: 'PH-SCRN-PROT',
      categoryRef: 'إكسسوارات هواتف',
      costPrice: 1000,
      sellingPrice: 3000,
      stock: 200,
      minStock: 50,
      unit: 'قطعة',
      supplier: 'مستودع الإكسسوارات',
      status: 'available',
    },
    {
      name: 'كيبل USB-C 1 متر',
      sku: 'PH-CABLE-USBC',
      categoryRef: 'إكسسوارات هواتف',
      costPrice: 2000,
      sellingPrice: 5000,
      stock: 100,
      minStock: 25,
      unit: 'قطعة',
      supplier: 'مستودع الإكسسوارات',
      status: 'available',
    },
    // قطع غيار
    {
      name: 'شاشة Samsung A15 أصلية',
      sku: 'PH-LCD-A15',
      categoryRef: 'قطع غيار وإصلاح',
      costPrice: 35000,
      sellingPrice: 55000,
      stock: 6,
      minStock: 3,
      unit: 'قطعة',
      supplier: 'مركز قطع الغيار',
      status: 'available',
    },
    {
      name: 'بطارية iPhone 15',
      sku: 'PH-BAT-IPH15',
      categoryRef: 'قطع غيار وإصلاح',
      costPrice: 20000,
      sellingPrice: 35000,
      stock: 0,
      minStock: 3,
      unit: 'قطعة',
      supplier: 'مركز قطع الغيار',
      status: 'out_of_stock',
    },
    // بطاقات
    {
      name: 'شريحة آسياسيل جديدة',
      sku: 'PH-SIM-ASIA',
      categoryRef: 'بطاقات وشرائح',
      costPrice: 1000,
      sellingPrice: 2000,
      stock: 50,
      minStock: 20,
      unit: 'قطعة',
      supplier: 'آسياسيل',
      status: 'available',
    },
    {
      name: 'بطاقة رصيد 10000 IQD',
      sku: 'PH-TOPUP-10K',
      categoryRef: 'بطاقات وشرائح',
      costPrice: 9500,
      sellingPrice: 10000,
      stock: 100,
      minStock: 30,
      unit: 'قطعة',
      supplier: 'زين العراق',
      status: 'available',
    },
  ],
  suppliers: [
    {
      name: 'وكالة سامسونج - بغداد',
      phone: '+964781100200',
      address: 'الكرادة، بغداد',
      city: 'بغداد',
      notes: 'وكيل سامسونج الرسمي',
    },
    {
      name: 'مستودع الإكسسوارات',
      phone: '+964781200300',
      address: 'الشورجة، بغداد',
      city: 'بغداد',
      notes: 'إكسسوارات هواتف بالجملة',
    },
  ],
  purchases: [
    {
      supplierRef: 'وكالة سامسونج - بغداد',
      invoiceNumber: 'PUR-PH-001',
      paidAmount: 1500000,
      notes: 'توريد هواتف وقطع غيار',
      items: [
        { productRef: 'PH-SAM-A15', quantity: 8, unitCost: 180000 },
        { productRef: 'PH-LCD-A15', quantity: 6, unitCost: 35000 },
      ],
    },
  ],
  customers: [
    {
      name: 'عمر خالد',
      phone: '+964771100200',
      address: 'الكرادة، بغداد',
      city: 'Baghdad',
      notes: 'يشتري أجهزة بالجملة',
    },
    {
      name: 'هدى ناصر',
      phone: '+964771200300',
      address: 'المنصور، بغداد',
      city: 'Baghdad',
      notes: 'زبونة دائمة',
    },
    {
      name: 'مصطفى رائد',
      phone: '+964771300400',
      address: 'الأعظمية، بغداد',
      city: 'Baghdad',
      notes: 'صاحب محل إكسسوارات',
    },
    {
      name: 'نور علي',
      phone: '+964771400500',
      address: 'الشعب، بغداد',
      city: 'Baghdad',
      notes: 'فني صيانة',
    },
  ],
  sales: [
    {
      customerRef: 0,
      discount: 10000,
      paymentType: 'cash',
      paidAmount: 260000,
      notes: 'غلاف وشاحن',
      items: [
        { productRef: 'PH-CASE-SAM', quantity: 10 },
        { productRef: 'PH-CHRG-65W', quantity: 5 },
      ],
    },
  ],
};

// ============================================================
// CLOTHING STORE
// ============================================================
const clothing: Preset = {
  label: 'محل ألبسة',
  categories: [
    { name: 'رجالي', description: 'ملابس رجالية' },
    { name: 'نسائي', description: 'ملابس نسائية' },
    { name: 'أطفال', description: 'ملابس أطفال' },
    { name: 'أحذية', description: 'أحذية رجالية ونسائية' },
  ],
  products: [
    // رجالي
    {
      name: 'قميص رجالي كلاسيك',
      sku: 'CL-SHIRT-MEN',
      categoryRef: 'رجالي',
      costPrice: 15000,
      sellingPrice: 25000,
      stock: 50,
      minStock: 10,
      unit: 'قطعة',
      supplier: 'مشغل النور للخياطة',
      status: 'available',
    },
    {
      name: 'بنطلون جينز رجالي',
      sku: 'CL-JEANS-MEN',
      categoryRef: 'رجالي',
      costPrice: 20000,
      sellingPrice: 35000,
      stock: 40,
      minStock: 10,
      unit: 'قطعة',
      supplier: 'مستورد ملابس تركية',
      status: 'available',
    },
    // نسائي
    {
      name: 'فستان صيفي',
      sku: 'CL-DRESS-WMN',
      categoryRef: 'نسائي',
      costPrice: 25000,
      sellingPrice: 45000,
      stock: 30,
      minStock: 5,
      unit: 'قطعة',
      supplier: 'مستورد ملابس تركية',
      status: 'available',
    },
    {
      name: 'شال قطني',
      sku: 'CL-SCARF',
      categoryRef: 'نسائي',
      costPrice: 5000,
      sellingPrice: 10000,
      stock: 60,
      minStock: 15,
      unit: 'قطعة',
      supplier: 'مشغل النور للخياطة',
      status: 'available',
    },
    // أطفال
    {
      name: 'طقم ولادي قطن',
      sku: 'CL-KIDS-BOY',
      categoryRef: 'أطفال',
      costPrice: 12000,
      sellingPrice: 20000,
      stock: 25,
      minStock: 8,
      unit: 'طقم',
      supplier: 'مستورد ملابس تركية',
      status: 'available',
    },
    // أحذية
    {
      name: 'حذاء رياضي رجالي',
      sku: 'CL-SHOE-SPT',
      categoryRef: 'أحذية',
      costPrice: 30000,
      sellingPrice: 50000,
      stock: 20,
      minStock: 5,
      unit: 'زوج',
      supplier: 'الشركة العامة للصناعات الجلدية',
      status: 'available',
    },
  ],
  suppliers: [
    {
      name: 'مشغل النور للخياطة',
      phone: '+964782100200',
      address: 'الكاظمية، بغداد',
      city: 'بغداد',
      notes: 'ملابس محلية الصنع',
    },
    {
      name: 'مستورد ملابس تركية',
      phone: '+964782200300',
      address: 'شارع فلسطين، بغداد',
      city: 'بغداد',
      notes: 'استيراد من تركيا',
    },
  ],
  purchases: [
    {
      supplierRef: 'مشغل النور للخياطة',
      invoiceNumber: 'PUR-CL-001',
      paidAmount: 500000,
      notes: 'تجهيز صيفي',
      items: [
        { productRef: 'CL-SHIRT-MEN', quantity: 20, unitCost: 15000 },
        { productRef: 'CL-SCARF', quantity: 30, unitCost: 5000 },
      ],
    },
  ],
  customers: [
    {
      name: 'ياسر محمد',
      phone: '+964772100200',
      address: 'زيونة، بغداد',
      city: 'Baghdad',
      notes: 'زبون دائم',
    },
  ],
  sales: [
    {
      customerRef: 0,
      discount: 5000,
      paymentType: 'cash',
      paidAmount: 60000,
      notes: '',
      items: [
        { productRef: 'CL-SHIRT-MEN', quantity: 1 },
        { productRef: 'CL-JEANS-MEN', quantity: 1 },
      ],
    },
  ],
};

// ============================================================
// EXPORT MAP
// ============================================================
export const PRESETS: Record<PresetKey, Preset> = {
  supermarket,
  phones,
  clothing,
  pharmacy: {
    label: 'صيدلية (قريباً)',
    categories: [],
    products: [],
    suppliers: [],
    purchases: [],
    customers: [],
    sales: [],
  },
  electronics: {
    label: 'إلكترونيات (قريباً)',
    categories: [],
    products: [],
    suppliers: [],
    purchases: [],
    customers: [],
    sales: [],
  },
  restaurant: {
    label: 'مطعم (قريباً)',
    categories: [],
    products: [],
    suppliers: [],
    purchases: [],
    customers: [],
    sales: [],
  },
};

export const PRESET_MENU = Object.entries(PRESETS).map(([key, val]) => ({
  value: key as PresetKey,
  label: val.label,
}));

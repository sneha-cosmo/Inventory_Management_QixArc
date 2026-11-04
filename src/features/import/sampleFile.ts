import { calculateEan13CheckDigit } from '../../utils/bulkImport';
import { 
  DEFAULT_TAX_SETTINGS, 
  TaxSettings, 
  getRequiredHsnDigits 
} from '../../rules/tax';
import { Clock } from '../../rules/clock';
import { Warehouse, Category } from '../../types';

export type PickRng = () => number;

export interface SampleProductPoolItem {
  sku: string;
  name: string;
  category: string;
  unit: string;
  uqc: string;
  hsn: string; // 6 statutory digits
  gstRate: number;
  barcode12: string;
  baseCost: number;
  baseSellingPrice: number;
  baseStock: number;
  baseDailyUsage: number;
  baseLeadTime: number;
  description: string;
}

export const BLANK_TEMPLATE_HEADERS = [
  'SKU',
  'Item Name',
  'Barcode',
  'Description',
  'Category',
  'Unit',
  'HSN/SAC',
  'GST Rate (%)',
  'UQC',
  'Unit Cost',
  'Selling Price',
  'Current Stock',
  'Minimum Threshold',
  'Safety Stock',
  'Daily Usage',
  'Lead Time (days)',
  'Warehouse'
];

/**
 * 30 realistic sample products across 5 domains:
 * Fabrics, Trims, Packaging, Thread, Finished Goods.
 */
export const SAMPLE_PRODUCTS_POOL: SampleProductPoolItem[] = [
  // 1. Fabrics (6 items)
  {
    sku: 'FAB-COT-101',
    name: '100% Combed Cotton Poplin 40s',
    category: 'Fabrics',
    unit: 'meters',
    uqc: 'MTR',
    hsn: '520811',
    gstRate: 5,
    barcode12: '890100100001',
    baseCost: 110,
    baseSellingPrice: 175,
    baseStock: 300,
    baseDailyUsage: 15,
    baseLeadTime: 5,
    description: 'Premium 40s combed cotton poplin roll for shirting'
  },
  {
    sku: 'FAB-LIN-102',
    name: 'Pure Belgian Linen Fabric 60 Lea',
    category: 'Fabrics',
    unit: 'meters',
    uqc: 'MTR',
    hsn: '530911',
    gstRate: 5,
    barcode12: '890100100002',
    baseCost: 320,
    baseSellingPrice: 480,
    baseStock: 150,
    baseDailyUsage: 8,
    baseLeadTime: 7,
    description: '100% natural organic linen fabric 60 lea'
  },
  {
    sku: 'FAB-SLK-103',
    name: 'Mulberry Silk Chiffon Fabric',
    category: 'Fabrics',
    unit: 'meters',
    uqc: 'MTR',
    hsn: '500720',
    gstRate: 5,
    barcode12: '890100100003',
    baseCost: 450,
    baseSellingPrice: 680,
    baseStock: 100,
    baseDailyUsage: 5,
    baseLeadTime: 10,
    description: 'Pure mulberry silk lightweight chiffon roll'
  },
  {
    sku: 'FAB-DNM-104',
    name: 'Indigo Stretch Denim Fabric 12oz',
    category: 'Fabrics',
    unit: 'meters',
    uqc: 'MTR',
    hsn: '520942',
    gstRate: 5,
    barcode12: '890100100004',
    baseCost: 210,
    baseSellingPrice: 320,
    baseStock: 250,
    baseDailyUsage: 12,
    baseLeadTime: 6,
    description: 'Ring-spun indigo dyed stretch denim fabric 12oz'
  },
  {
    sku: 'FAB-RAY-105',
    name: 'Viscose Rayon Printed Twill',
    category: 'Fabrics',
    unit: 'meters',
    uqc: 'MTR',
    hsn: '540822',
    gstRate: 5,
    barcode12: '890100100005',
    baseCost: 95,
    baseSellingPrice: 150,
    baseStock: 400,
    baseDailyUsage: 20,
    baseLeadTime: 4,
    description: 'Soft drapey viscose rayon floral printed twill'
  },
  {
    sku: 'FAB-WOL-106',
    name: 'Merino Wool Blend Suiting Fabric',
    category: 'Fabrics',
    unit: 'meters',
    uqc: 'MTR',
    hsn: '511211',
    gstRate: 5,
    barcode12: '890100100006',
    baseCost: 550,
    baseSellingPrice: 850,
    baseStock: 120,
    baseDailyUsage: 6,
    baseLeadTime: 12,
    description: 'Worsted merino wool blended formal suiting fabric'
  },

  // 2. Trims (6 items)
  {
    sku: 'TRM-ZIP-201',
    name: 'Antique Brass Metal Zipper #5 20cm',
    category: 'Trims',
    unit: 'pcs',
    uqc: 'PCS',
    hsn: '960711',
    gstRate: 18,
    barcode12: '890100200001',
    baseCost: 14,
    baseSellingPrice: 25,
    baseStock: 1200,
    baseDailyUsage: 60,
    baseLeadTime: 4,
    description: 'Closed-end antique brass teeth zipper 20cm'
  },
  {
    sku: 'TRM-BTN-202',
    name: 'Natural Horn Suit Buttons 24L',
    category: 'Trims',
    unit: 'pcs',
    uqc: 'PCS',
    hsn: '960629',
    gstRate: 18,
    barcode12: '890100200002',
    baseCost: 6,
    baseSellingPrice: 12,
    baseStock: 3500,
    baseDailyUsage: 150,
    baseLeadTime: 5,
    description: 'Genuine polished water buffalo horn buttons 24L'
  },
  {
    sku: 'TRM-ELA-203',
    name: 'Knitted Elastic Webbing Band 38mm',
    category: 'Trims',
    unit: 'meters',
    uqc: 'MTR',
    hsn: '560410',
    gstRate: 12,
    barcode12: '890100200003',
    baseCost: 12,
    baseSellingPrice: 22,
    baseStock: 800,
    baseDailyUsage: 40,
    baseLeadTime: 3,
    description: 'High elasticity stretch waistband webbing 38mm'
  },
  {
    sku: 'TRM-LAC-204',
    name: 'Cotton Crochet Lace Trim 25mm',
    category: 'Trims',
    unit: 'meters',
    uqc: 'MTR',
    hsn: '580421',
    gstRate: 12,
    barcode12: '890100200004',
    baseCost: 25,
    baseSellingPrice: 42,
    baseStock: 500,
    baseDailyUsage: 25,
    baseLeadTime: 6,
    description: 'Vintage style off-white cotton crochet lace border'
  },
  {
    sku: 'TRM-RIV-205',
    name: 'Copper Rivets and Burrs 9mm',
    category: 'Trims',
    unit: 'pcs',
    uqc: 'PCS',
    hsn: '731823',
    gstRate: 18,
    barcode12: '890100200005',
    baseCost: 3.5,
    baseSellingPrice: 7,
    baseStock: 5000,
    baseDailyUsage: 200,
    baseLeadTime: 5,
    description: 'Solid copper reinforcing rivets for pockets and seams'
  },
  {
    sku: 'TRM-VEL-206',
    name: 'Hook and Loop Tape Fastener 50mm',
    category: 'Trims',
    unit: 'meters',
    uqc: 'MTR',
    hsn: '580610',
    gstRate: 12,
    barcode12: '890100200006',
    baseCost: 18,
    baseSellingPrice: 32,
    baseStock: 600,
    baseDailyUsage: 30,
    baseLeadTime: 4,
    description: 'Self-adhesive heavy duty nylon hook and loop fastener'
  },

  // 3. Packaging (6 items)
  {
    sku: 'PKG-PLY-301',
    name: 'Recycled LDPE Garment Polybags 14x18',
    category: 'Packaging',
    unit: 'pcs',
    uqc: 'PCS',
    hsn: '392321',
    gstRate: 18,
    barcode12: '890100300001',
    baseCost: 2.2,
    baseSellingPrice: 4.5,
    baseStock: 6000,
    baseDailyUsage: 250,
    baseLeadTime: 3,
    description: 'Transparent suffocation-warning garment bags with flap seal'
  },
  {
    sku: 'PKG-CTN-302',
    name: 'Corrugated Shipping Box 5-Ply Master',
    category: 'Packaging',
    unit: 'boxes',
    uqc: 'BOX',
    hsn: '481910',
    gstRate: 18,
    barcode12: '890100300002',
    baseCost: 45,
    baseSellingPrice: 75,
    baseStock: 400,
    baseDailyUsage: 20,
    baseLeadTime: 5,
    description: 'Heavy-duty 5-ply corrugated carton box 60x40x40 cm'
  },
  {
    sku: 'PKG-TAG-303',
    name: 'Kraft Paper Brand Hangtags 350 GSM',
    category: 'Packaging',
    unit: 'pcs',
    uqc: 'PCS',
    hsn: '482110',
    gstRate: 12,
    barcode12: '890100300003',
    baseCost: 1.8,
    baseSellingPrice: 3.8,
    baseStock: 8000,
    baseDailyUsage: 300,
    baseLeadTime: 4,
    description: 'Die-cut brown kraft cardboard hangtags with eyelet'
  },
  {
    sku: 'PKG-BRC-304',
    name: 'Direct Thermal Barcode Labels 50x25mm',
    category: 'Packaging',
    unit: 'rolls',
    uqc: 'ROL',
    hsn: '482190',
    gstRate: 18,
    barcode12: '890100300004',
    baseCost: 120,
    baseSellingPrice: 195,
    baseStock: 200,
    baseDailyUsage: 10,
    baseLeadTime: 3,
    description: 'Roll of 2,000 self-adhesive direct thermal barcode stickers'
  },
  {
    sku: 'PKG-TIS-305',
    name: 'Acid-Free White Wrapping Tissue Paper',
    category: 'Packaging',
    unit: 'packs',
    uqc: 'PAC',
    hsn: '480254',
    gstRate: 12,
    barcode12: '890100300005',
    baseCost: 85,
    baseSellingPrice: 140,
    baseStock: 350,
    baseDailyUsage: 15,
    baseLeadTime: 4,
    description: 'Pack of 500 sheets acid-free archival gift wrapping tissue'
  },
  {
    sku: 'PKG-SIL-306',
    name: 'Silica Gel Desiccant Packets 2g',
    category: 'Packaging',
    unit: 'packs',
    uqc: 'PAC',
    hsn: '281122',
    gstRate: 18,
    barcode12: '890100300006',
    baseCost: 65,
    baseSellingPrice: 110,
    baseStock: 500,
    baseDailyUsage: 20,
    baseLeadTime: 4,
    description: 'Pack of 1,000 moisture absorbing non-toxic silica packets'
  },

  // 4. Thread (6 items)
  {
    sku: 'THR-PLY-401',
    name: 'Spun Polyester Sewing Thread 40/2',
    category: 'Thread',
    unit: 'cones',
    uqc: 'CON',
    hsn: '540110',
    gstRate: 12,
    barcode12: '890100400001',
    baseCost: 45,
    baseSellingPrice: 75,
    baseStock: 600,
    baseDailyUsage: 30,
    baseLeadTime: 3,
    description: 'All-purpose industrial spun poly thread 5,000m cone'
  },
  {
    sku: 'THR-NYL-402',
    name: 'Bonded Nylon High Tenacity Thread 69',
    category: 'Thread',
    unit: 'cones',
    uqc: 'CON',
    hsn: '540110',
    gstRate: 12,
    barcode12: '890100400002',
    baseCost: 85,
    baseSellingPrice: 135,
    baseStock: 300,
    baseDailyUsage: 12,
    baseLeadTime: 5,
    description: 'Heavy-duty bonded nylon filament thread for upholstery'
  },
  {
    sku: 'THR-COT-403',
    name: 'Mercerized Cotton Quilting Thread 50wt',
    category: 'Thread',
    unit: 'cones',
    uqc: 'CON',
    hsn: '520411',
    gstRate: 12,
    barcode12: '890100400003',
    baseCost: 65,
    baseSellingPrice: 105,
    baseStock: 250,
    baseDailyUsage: 10,
    baseLeadTime: 4,
    description: '100% Egyptian long staple mercerized cotton thread'
  },
  {
    sku: 'THR-EMB-404',
    name: 'Rayon Viscose Embroidery Thread 120D',
    category: 'Thread',
    unit: 'cones',
    uqc: 'CON',
    hsn: '540120',
    gstRate: 12,
    barcode12: '890100400004',
    baseCost: 55,
    baseSellingPrice: 90,
    baseStock: 450,
    baseDailyUsage: 18,
    baseLeadTime: 3,
    description: 'High sheen multi-color machine embroidery thread 4,000m'
  },
  {
    sku: 'THR-OVR-405',
    name: 'Textured Polyester Overlock Looper Thread',
    category: 'Thread',
    unit: 'cones',
    uqc: 'CON',
    hsn: '540233',
    gstRate: 12,
    barcode12: '890100400005',
    baseCost: 40,
    baseSellingPrice: 68,
    baseStock: 500,
    baseDailyUsage: 25,
    baseLeadTime: 3,
    description: 'Bulk textured continuous filament thread for serging seams'
  },
  {
    sku: 'THR-ZAR-406',
    name: 'Metallic Gold Zari Embroidery Thread',
    category: 'Thread',
    unit: 'cones',
    uqc: 'CON',
    hsn: '560500',
    gstRate: 12,
    barcode12: '890100400006',
    baseCost: 95,
    baseSellingPrice: 160,
    baseStock: 180,
    baseDailyUsage: 6,
    baseLeadTime: 6,
    description: 'Fine metallic gold zari thread for ethnic bridal wear embroidery'
  },

  // 5. Finished Goods (6 items)
  {
    sku: 'FNG-SHT-501',
    name: 'Classic Oxford Cotton Button-Down Shirt',
    category: 'Finished Goods',
    unit: 'pcs',
    uqc: 'PCS',
    hsn: '620520',
    gstRate: 5,
    barcode12: '890100500001',
    baseCost: 420,
    baseSellingPrice: 899,
    baseStock: 180,
    baseDailyUsage: 8,
    baseLeadTime: 7,
    description: 'Men tailored slim fit long sleeve oxford cloth shirt'
  },
  {
    sku: 'FNG-CHN-502',
    name: 'Slim Fit Stretch Twill Chino Trouser',
    category: 'Finished Goods',
    unit: 'pcs',
    uqc: 'PCS',
    hsn: '620342',
    gstRate: 5,
    barcode12: '890100500002',
    baseCost: 520,
    baseSellingPrice: 1199,
    baseStock: 150,
    baseDailyUsage: 6,
    baseLeadTime: 8,
    description: 'Flat-front cotton twill stretch casual chino trouser'
  },
  {
    sku: 'FNG-JCK-503',
    name: 'Classic Trucker Denim Jacket 14oz',
    category: 'Finished Goods',
    unit: 'pcs',
    uqc: 'PCS',
    hsn: '620140',
    gstRate: 12,
    barcode12: '890100500003',
    baseCost: 780,
    baseSellingPrice: 1799,
    baseStock: 90,
    baseDailyUsage: 4,
    baseLeadTime: 10,
    description: 'Unlined vintage washed indigo denim trucker jacket'
  },
  {
    sku: 'FNG-DRS-504',
    name: 'Floral Print Tiered Cotton Summer Dress',
    category: 'Finished Goods',
    unit: 'pcs',
    uqc: 'PCS',
    hsn: '620442',
    gstRate: 5,
    barcode12: '890100500004',
    baseCost: 610,
    baseSellingPrice: 1399,
    baseStock: 110,
    baseDailyUsage: 5,
    baseLeadTime: 8,
    description: 'A-line midi tiered cotton summer dress with flutter sleeves'
  },
  {
    sku: 'FNG-KRT-505',
    name: 'Embroidered Chanderi Silk Anarkali Kurti',
    category: 'Finished Goods',
    unit: 'pcs',
    uqc: 'PCS',
    hsn: '620449',
    gstRate: 5,
    barcode12: '890100500005',
    baseCost: 850,
    baseSellingPrice: 1999,
    baseStock: 80,
    baseDailyUsage: 3,
    baseLeadTime: 9,
    description: 'Handcrafted zari embroidered Chanderi silk ethnic Kurti'
  },
  {
    sku: 'FNG-POL-506',
    name: 'Pique Knit Cotton Athletic Polo T-Shirt',
    category: 'Finished Goods',
    unit: 'pcs',
    uqc: 'PCS',
    hsn: '610510',
    gstRate: 5,
    barcode12: '890100500006',
    baseCost: 310,
    baseSellingPrice: 699,
    baseStock: 220,
    baseDailyUsage: 10,
    baseLeadTime: 6,
    description: 'Breathable honeycomb pique knit cotton casual polo tee'
  }
];

export interface GenerateSampleOptions {
  warehouses?: (Warehouse | string)[];
  categories?: (Category | string)[];
  taxSettings?: TaxSettings;
  rng?: PickRng;
  clock?: { getCurrentDate: () => Date };
  pickCount?: number;
}

/**
 * Returns blank template CSV containing header row only (always identical).
 */
export function generateBlankTemplateCsv(): string {
  return BLANK_TEMPLATE_HEADERS.join(',') + '\r\n';
}

/**
 * Formats date-time from Clock for filename:
 * inventory_sample_YYYY-MM-DD_HH-mm-ss.csv
 */
export function getSampleFileName(clock: { getCurrentDate: () => Date } = Clock): string {
  const d = clock.getCurrentDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `inventory_sample_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.csv`;
}

/**
 * Picks 3 to 8 distinct products from the pool using the provided RNG.
 */
export function pickDistinctProducts(
  pool: SampleProductPoolItem[],
  rng: PickRng,
  count?: number
): SampleProductPoolItem[] {
  const requestedCount = count ?? (3 + Math.floor(rng() * 6)); // 3 to 8
  const n = Math.max(3, Math.min(8, requestedCount, pool.length));

  // Fisher-Yates partial shuffle of pool indices
  const indices = Array.from({ length: pool.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }

  return indices.slice(0, n).map(idx => pool[idx]);
}

/**
 * Generates sample CSV file from the fixed 30-product pool:
 * - Picks 3 to 8 distinct products using the injectable rng function (default Math.random).
 * - Small sensible variations on prices and stock (cost < selling price, min/safety stock < current stock).
 * - Full compliance with statutory GST, HSN turnover threshold, valid EAN-13 check digits, and mapped UQC.
 */
export function generateSampleFile(options: GenerateSampleOptions = {}): string {
  const rng = options.rng ?? Math.random;
  const taxSettings = options.taxSettings ?? DEFAULT_TAX_SETTINGS;
  const requiredHsnDigits = getRequiredHsnDigits(taxSettings);

  // Available warehouse names
  const availableWarehouses: string[] = [];
  if (options.warehouses && options.warehouses.length > 0) {
    for (const w of options.warehouses) {
      const name = typeof w === 'string' ? w : w.name;
      if (name && name.trim()) availableWarehouses.push(name.trim());
    }
  }
  if (availableWarehouses.length === 0) {
    availableWarehouses.push('Main Warehouse');
  }

  // Available categories mapping
  const availableCategories: string[] = [];
  if (options.categories && options.categories.length > 0) {
    for (const c of options.categories) {
      const name = typeof c === 'string' ? c : c.name;
      if (name && name.trim()) availableCategories.push(name.trim());
    }
  }

  const selectedProducts = pickDistinctProducts(SAMPLE_PRODUCTS_POOL, rng, options.pickCount);

  const rows: string[][] = [];

  for (const item of selectedProducts) {
    // Small variation factor between 0.90 and 1.10
    const factor = 0.90 + (rng() * 0.20);

    // Calculate unit cost
    const unitCost = Math.round(item.baseCost * factor * 100) / 100;

    // Selling price must be strictly greater than unitCost
    const calculatedSell = Math.round(item.baseSellingPrice * factor * 100) / 100;
    const minSell = Math.round((unitCost * 1.25 + 5) * 100) / 100;
    const sellingPrice = Math.max(minSell, calculatedSell);

    // Current stock: sensible quantity
    const currentStock = Math.max(50, Math.round(item.baseStock * factor));

    // Thresholds: minStock and safetyStock must be strictly below currentStock
    const minStock = Math.max(10, Math.min(currentStock - 10, Math.round(currentStock * 0.25)));
    const safetyStock = Math.max(5, Math.min(minStock - 5, Math.round(minStock * 0.5)));

    const dailyUsage = Math.max(1, Math.round(item.baseDailyUsage * factor));
    const leadTime = Math.max(1, Math.round(item.baseLeadTime));

    // Warehouse: pick from availableWarehouses
    const warehouse = availableWarehouses[Math.floor(rng() * availableWarehouses.length)];

    // Category: match to availableCategories if provided, or adapt synonyms
    let category = item.category;
    if (availableCategories.length > 0) {
      const directMatch = availableCategories.find(c => c.toLowerCase() === item.category.toLowerCase());
      if (directMatch) {
        category = directMatch;
      } else {
        // Check standard synonyms in textiles domain
        if (item.category === 'Trims') {
          const accMatch = availableCategories.find(c => c.toLowerCase() === 'accessories');
          category = accMatch || availableCategories[0];
        } else if (item.category === 'Thread') {
          const thrMatch = availableCategories.find(c => c.toLowerCase() === 'threads');
          category = thrMatch || availableCategories[0];
        } else {
          category = availableCategories[0];
        }
      }
    }

    // Barcode: compute mathematically valid 13th EAN-13 check digit
    const checkDigit = calculateEan13CheckDigit(item.barcode12);
    const barcode = `${item.barcode12}${checkDigit}`;

    // HSN code: sliced to required digits based on turnover setting (4 or 6 digits)
    const hsnCode = item.hsn.slice(0, requiredHsnDigits);

    rows.push([
      item.sku,
      item.name,
      barcode,
      item.description,
      category,
      item.unit,
      hsnCode,
      item.gstRate.toString(),
      item.uqc,
      unitCost.toFixed(2),
      sellingPrice.toFixed(2),
      currentStock.toString(),
      minStock.toString(),
      safetyStock.toString(),
      dailyUsage.toString(),
      leadTime.toString(),
      warehouse
    ]);
  }

  const csvLines = [
    BLANK_TEMPLATE_HEADERS.join(','),
    ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
  ];

  return csvLines.join('\r\n');
}

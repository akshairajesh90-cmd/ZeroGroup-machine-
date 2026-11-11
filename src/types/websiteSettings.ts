import { z } from "zod";

export const AllowedIcons = [
  "Cog",
  "Building2",
  "Gauge",
  "Fuel",
  "Truck",
  "HardHat",
  "Wrench",
  "ShieldCheck",
  "Clock",
  "Phone",
] as const;

export const CatalogItemSchema = z.object({
  id: z.string().optional(),
  category: z.string().min(1, "Category is required").max(80),
  categorySubtext: z.string().max(160).optional().nullable(),
  categoryIcon: z.enum(AllowedIcons).default("Cog"),
  title: z.string().min(2, "Machine title is required").max(120),
  power: z.string().min(1, "Power specification is required").max(120),
  specs: z.array(z.string().min(1).max(200)).min(1, "At least one specification bullet is required").max(10),
  idealFor: z.string().min(2, "Ideal application is required").max(160),
  classification: z.string().min(1, "Classification is required").max(60),
  demandTag: z.string().min(1, "Demand tag is required").max(50),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const ValuePropSchema = z.object({
  id: z.string().optional(),
  badge: z.string().min(1, "Badge is required").max(50),
  title: z.string().min(1, "Title is required").max(80),
  description: z.string().min(1, "Description is required").max(250),
  iconName: z.enum(AllowedIcons).default("Truck"),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const UpdateWebsiteSettingsInputSchema = z.object({
  storeName: z.string().min(2, "Store name is required").max(120),
  storeAddress: z.string().min(5, "Store address is required").max(300),
  storeLatitude: z.number().min(-90, "Invalid Depot coordinates: latitude must be between -90 and 90").max(90, "Invalid Depot coordinates: latitude must be between -90 and 90"),
  storeLongitude: z.number().min(-180, "Invalid Depot coordinates: longitude must be between -180 and 180").max(180, "Invalid Depot coordinates: longitude must be between -180 and 180"),
  companyPhone: z.string().min(8, "Valid phone number required").max(25),
  whatsappNumber: z.string().min(8, "Valid WhatsApp number required").max(25),
  companyEmail: z.string().email("Valid email required").max(100),
  gstinNumber: z.string().min(10, "Valid GSTIN required").max(25),
  heroBadge: z.string().max(120).optional().nullable(),
  heroHeadline: z.string().min(5, "Hero headline required").max(180),
  heroSubheadline: z.string().min(10, "Hero subheadline required").max(350),
  heroPrimaryCta: z.string().max(60).optional().nullable(),
  heroSecondaryCta: z.string().max(60).optional().nullable(),
  publicNotice: z.string().max(300).optional().nullable(),
  maintenanceMode: z.boolean().default(false),
  maintenanceNotice: z.string().max(300).optional().nullable(),
  emergencyPhone: z.string().max(25).optional().nullable(),
  districtsCovered: z.array(z.string().min(1).max(50)).max(30).default([]),
  footerCopy: z.string().max(350).optional().nullable(),
  expectedUpdatedAt: z.string().optional(),
  catalogItems: z.array(CatalogItemSchema).max(50).optional(),
  valueProps: z.array(ValuePropSchema).max(12).optional(),
});

export type CatalogItemInput = z.infer<typeof CatalogItemSchema>;
export type ValuePropInput = z.infer<typeof ValuePropSchema>;
export type UpdateWebsiteSettingsInput = z.infer<typeof UpdateWebsiteSettingsInputSchema>;

export interface WebsiteCatalogItemData {
  id?: string;
  category: string;
  categorySubtext?: string | null;
  categoryIcon: string;
  title: string;
  power: string;
  specs: string[];
  idealFor: string;
  classification: string;
  demandTag: string;
  sortOrder: number;
  isActive: boolean;
}

export interface WebsiteValuePropData {
  id?: string;
  badge: string;
  title: string;
  description: string;
  iconName: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CorporateWebsiteSettingsData {
  id?: string;
  storeName: string;
  storeAddress: string;
  storeLatitude: number;
  storeLongitude: number;
  companyPhone: string;
  whatsappNumber: string;
  companyEmail: string;
  gstinNumber: string;
  heroBadge?: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroPrimaryCta?: string;
  heroSecondaryCta?: string;
  publicNotice?: string;
  maintenanceMode: boolean;
  maintenanceNotice?: string;
  emergencyPhone?: string;
  districtsCovered?: string[];
  footerCopy?: string;
  updatedAt?: string;
  catalogItems?: WebsiteCatalogItemData[];
  valueProps?: WebsiteValuePropData[];
}

export const DEFAULT_KERALA_DISTRICTS = [
  "Kottayam",
  "Ernakulam",
  "Idukki",
  "Alappuzha",
  "Pathanamthitta",
  "Thrissur",
  "Kollam",
  "Palakkad",
  "Thiruvananthapuram",
  "Malappuram",
  "Kozhikode",
  "Kannur",
  "Wayanad",
  "Kasaragod",
];

export const DEFAULT_VALUE_PROPS: WebsiteValuePropData[] = [
  {
    badge: "Flatbed Transit",
    title: "Direct Site Mobilization",
    description: "Scheduled flatbed delivery from Kottayam yard directly to your project location.",
    iconName: "Truck",
    sortOrder: 0,
    isActive: true,
  },
  {
    badge: "Certified Operators",
    title: "Trained Field Personnel",
    description: "Experienced equipment operators for safe, consistent hydraulic machinery operation.",
    iconName: "HardHat",
    sortOrder: 1,
    isActive: true,
  },
  {
    badge: "Field Maintenance",
    title: "Zero Breakdown Guarantee",
    description: "On-call service mechanics and immediate spare parts dispatch.",
    iconName: "Wrench",
    sortOrder: 2,
    isActive: true,
  },
  {
    badge: "Commercial Terms",
    title: "GST Compliant Billing",
    description: "Transparent monthly invoicing, verified machine logs, and corporate hire contracts.",
    iconName: "Building2",
    sortOrder: 3,
    isActive: true,
  },
];

export const DEFAULT_CATALOG_ITEMS: WebsiteCatalogItemData[] = [
  {
    category: "Concrete Mixers & Batching",
    categorySubtext: "Hydraulic Reversible & Heavy Duty Drum Machinery",
    categoryIcon: "Cog",
    title: "Hydraulic Reversible Drum Mixer (10/7 & 10/14 Cu. Ft.)",
    power: "Kirloskar Water-Cooled Diesel / 3-Phase Electric",
    specs: [
      "Hydraulic automatic loading hopper skip",
      "Calibrated water metering system with auto-cutoff",
      "Dual-direction discharge chute with anti-spill guard",
      "Towable chassis on heavy pneumatic radial tires",
    ],
    idealFor: "Commercial Slabs, Foundations, Rafts & Infrastructure",
    classification: "Commercial Heavy",
    demandTag: "High Demand",
    sortOrder: 0,
    isActive: true,
  },
  {
    category: "Concrete Mixers & Batching",
    categorySubtext: "Hydraulic Reversible & Heavy Duty Drum Machinery",
    categoryIcon: "Cog",
    title: "Heavy-Duty Diesel Concrete Mixer (10/7 Cu. Ft.)",
    power: "Heavy Single-Cylinder Air-Cooled Diesel Engine",
    specs: [
      "Precision-cast iron mixing drum with reinforced bevel gear",
      "Tow bar with heavy suspension for rough terrain haulage",
      "Low fuel consumption: under 1.2 L/hr continuous load",
      "Lockable engine housing with safety emergency cutoff",
    ],
    idealFor: "Residential Projects, Retaining Walls & Column Pours",
    classification: "Commercial Heavy",
    demandTag: "Fuel Efficient",
    sortOrder: 1,
    isActive: true,
  },
  {
    category: "Material Hoists & Tower Winches",
    categorySubtext: "Certified High-Rise Building Material Hoisting Systems",
    categoryIcon: "Building2",
    title: "Builder's Heavy Material Hoist (1 Ton / 100+ Feet)",
    power: "Geared Electric Motor with Electromagnetic Fail-Safe Brake",
    specs: [
      "Automatic limit switches at top and floor levels",
      "Heavy steel cage with safety interlocking gates",
      "Certified wire rope with 6x safety factor",
      "Scaffolding wall-tie brackets & mast sections included",
    ],
    idealFor: "Multi-Storey Concrete, Masonry Blocks & Reinforcement Steel",
    classification: "Certified High-Rise",
    demandTag: "100+ Ft Certified",
    sortOrder: 2,
    isActive: true,
  },
  {
    category: "Material Hoists & Tower Winches",
    categorySubtext: "Certified High-Rise Building Material Hoisting Systems",
    categoryIcon: "Building2",
    title: "Portable Cantilever Rope Winch Hoist (300 - 500 kg)",
    power: "High-Speed Single-Phase / 3-Phase Electric Winch",
    specs: [
      "360-degree rotating boom for safe parapet unloading",
      "Quick-clamp column mount for rapid roof installation",
      "Dead-man pendant control switch with emergency stop",
    ],
    idealFor: "Roof-Top Concreting, Finishing Materials & Interior Shifting",
    classification: "Rapid Setup",
    demandTag: "Roof Mounted",
    sortOrder: 3,
    isActive: true,
  },
  {
    category: "Compaction & Concrete Vibrators",
    categorySubtext: "High-Frequency Needle Vibrators & Surface Screeds",
    categoryIcon: "Gauge",
    title: "High-Frequency Concrete Needle Vibrator Rig",
    power: "Honda 4-Stroke Petrol / Induction Electric Drive",
    specs: [
      "Choice of 40mm and 60mm flexible needle pokers",
      "Reinforced steel-braided rubber shafts (4m & 6m lengths)",
      "12,000 vibrations per minute for total void elimination",
      "Quick-release universal drive coupling",
    ],
    idealFor: "Dense RCC Slabs, Heavy Beams, Columns & Retaining Structures",
    classification: "Structural Essential",
    demandTag: "Honda Driven",
    sortOrder: 4,
    isActive: true,
  },
  {
    category: "Compaction & Concrete Vibrators",
    categorySubtext: "High-Frequency Needle Vibrators & Surface Screeds",
    categoryIcon: "Gauge",
    title: "Heavy Soil & Sand Plate Compactor",
    power: "Greaves / Honda 5 HP Industrial Engine",
    specs: [
      "Ductile iron base plate with curved edges to avoid gouging",
      "3,500 kg centrifugal compaction force",
      "Vibration-isolated ergonomic guide handle",
      "Built-in transport wheels for single-man site moving",
    ],
    idealFor: "Sub-Base Compaction, Trench Backfills & Interlocking Pavers",
    classification: "Earthwork",
    demandTag: "3.5T Force",
    sortOrder: 5,
    isActive: true,
  },
  {
    category: "Trench Drainage & Pumping",
    categorySubtext: "High-Discharge Sludge & Construction Trench Dewatering Pumps",
    categoryIcon: "Fuel",
    title: "Heavy-Duty Diesel De-Watering Trash Pump (3-Inch / 4-Inch)",
    power: "Single-Cylinder Industrial Diesel with Electric Start",
    specs: [
      "1,400 Litres/Minute high-volume displacement",
      "Silicon carbide mechanical seals for sandy / abrasive sludge",
      "Solids handling up to 28mm spherical diameter",
      "Complete suction hose, strainer, and delivery lay-flat hose kit",
    ],
    idealFor: "Monsoon Foundation Flooding, Deep Basement Excavations & Pits",
    classification: "Site Drainage",
    demandTag: "1400 L/min",
    sortOrder: 6,
    isActive: true,
  },
];

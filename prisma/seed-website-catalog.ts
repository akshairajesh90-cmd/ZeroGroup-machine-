import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding Website CMS tables...");

  // 1. Seed or update SystemSettings
  const existingSettings = await prisma.systemSettings.findFirst();
  if (!existingSettings) {
    await prisma.systemSettings.create({
      data: {
        storeName: "ZERO GROUP Heavy Machinery & Equipment Rentals",
        storeAddress: "Central Machinery Yard, Pala - Ponkunnam Road, Kottayam, Kerala 686575",
        storeLatitude: 9.5916,
        storeLongitude: 76.5222,
        companyPhone: "+91 94471 23456",
        whatsappNumber: "919447123456",
        companyEmail: "operations@zerogroup.in",
        gstinNumber: "32AAACZ0000A1Z5",
        heroBadge: "KERALA COMMERCIAL INFRASTRUCTURE & CONSTRUCTION LOGISTICS",
        heroHeadline: "Heavy Construction Equipment & Precision Plant Logistics",
        heroSubheadline: "Commercial concrete mixers, vertical material hoists, and heavy de-watering plant supplied across Kerala with certified operators.",
        heroPrimaryCta: "Request Hire Quotation",
        heroSecondaryCta: "Search Plant Inventory",
        publicNotice: "Full machinery fleet operational. Direct flatbed site dispatch active from Central Yard.",
        maintenanceMode: false,
        maintenanceNotice: "Notice: Scheduled fleet maintenance window. Emergency plant dispatch active via helpline.",
        emergencyPhone: "+91 94471 23456",
        districtsCovered: [
          "Kottayam", "Ernakulam", "Idukki", "Alappuzha", "Pathanamthitta",
          "Thrissur", "Kollam", "Palakkad", "Thiruvananthapuram", "Malappuram",
          "Kozhikode", "Kannur", "Wayanad", "Kasaragod"
        ],
        footerCopy: "ZERO GROUP Equipment Rentals. All commercial plant certified under Kerala industrial equipment safety guidelines."
      }
    });
    console.log("Created initial SystemSettings record.");
  } else {
    console.log("SystemSettings record already exists, keeping current record.");
  }

  // 2. Seed WebsiteValueProp (if empty)
  const valuePropCount = await prisma.websiteValueProp.count();
  if (valuePropCount === 0) {
    await prisma.websiteValueProp.createMany({
      data: [
        {
          badge: "Flatbed Transit",
          title: "Direct Site Mobilization",
          description: "Scheduled flatbed delivery from Kottayam yard directly to your project location.",
          iconName: "Truck",
          sortOrder: 0,
          isActive: true
        },
        {
          badge: "Certified Operators",
          title: "Trained Field Personnel",
          description: "Experienced equipment operators for safe, consistent hydraulic machinery operation.",
          iconName: "HardHat",
          sortOrder: 1,
          isActive: true
        },
        {
          badge: "Field Maintenance",
          title: "Zero Breakdown Guarantee",
          description: "On-call service mechanics and immediate spare parts dispatch.",
          iconName: "Wrench",
          sortOrder: 2,
          isActive: true
        },
        {
          badge: "Commercial Terms",
          title: "GST Compliant Billing",
          description: "Transparent monthly invoicing, verified machine logs, and corporate hire contracts.",
          iconName: "Building2",
          sortOrder: 3,
          isActive: true
        }
      ]
    });
    console.log("Seeded 4 initial WebsiteValueProp records.");
  } else {
    console.log(`WebsiteValueProp has ${valuePropCount} records, skipping seed.`);
  }

  // 3. Seed WebsiteCatalogItem (if empty)
  const catalogCount = await prisma.websiteCatalogItem.count();
  if (catalogCount === 0) {
    await prisma.websiteCatalogItem.createMany({
      data: [
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
            "Towable chassis on heavy pneumatic radial tires"
          ],
          idealFor: "Commercial Slabs, Foundations, Rafts & Infrastructure",
          classification: "Commercial Heavy",
          demandTag: "High Demand",
          sortOrder: 0,
          isActive: true
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
            "Lockable engine housing with safety emergency cutoff"
          ],
          idealFor: "Residential Projects, Retaining Walls & Column Pours",
          classification: "Commercial Heavy",
          demandTag: "Fuel Efficient",
          sortOrder: 1,
          isActive: true
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
            "Scaffolding wall-tie brackets & mast sections included"
          ],
          idealFor: "Multi-Storey Concrete, Masonry Blocks & Reinforcement Steel",
          classification: "Certified High-Rise",
          demandTag: "100+ Ft Certified",
          sortOrder: 2,
          isActive: true
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
            "Dead-man pendant control switch with emergency stop"
          ],
          idealFor: "Roof-Top Concreting, Finishing Materials & Interior Shifting",
          classification: "Rapid Setup",
          demandTag: "Roof Mounted",
          sortOrder: 3,
          isActive: true
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
            "Quick-release universal drive coupling"
          ],
          idealFor: "Dense RCC Slabs, Heavy Beams, Columns & Retaining Structures",
          classification: "Structural Essential",
          demandTag: "Honda Driven",
          sortOrder: 4,
          isActive: true
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
            "Built-in transport wheels for single-man site moving"
          ],
          idealFor: "Sub-Base Compaction, Trench Backfills & Interlocking Pavers",
          classification: "Earthwork",
          demandTag: "3.5T Force",
          sortOrder: 5,
          isActive: true
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
            "Complete suction hose, strainer, and delivery lay-flat hose kit"
          ],
          idealFor: "Monsoon Foundation Flooding, Deep Basement Excavations & Pits",
          classification: "Site Drainage",
          demandTag: "1400 L/min",
          sortOrder: 6,
          isActive: true
        }
      ]
    });
    console.log("Seeded 7 initial WebsiteCatalogItem records.");
  } else {
    console.log(`WebsiteCatalogItem has ${catalogCount} records, skipping seed.`);
  }

  console.log("Website CMS seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

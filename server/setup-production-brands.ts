import { db } from "./db";
import { brands, regions, brandRegions } from "@shared/schema";
import { eq } from "drizzle-orm";

async function setupProductionBrands() {
  console.log("Setting up brand-region assignments for production...\n");

  // First, ensure all required brands exist
  const newBrands = [
    { name: "Baby Central", color: "#FF6B6B", isActive: true },
    { name: "Beaba", color: "#4A90D9", isActive: true },
    { name: "Bloom Connect", color: "#95E1D3", isActive: true },
    { name: "Bloom Create", color: "#F38181", isActive: true },
    { name: "Bubble", color: "#7C4DFF", isActive: true },
    { name: "Ergobaby", color: "#2E7D32", isActive: true },
    { name: "Micro", color: "#A8E6CF", isActive: true },
    { name: "Skip Hop", color: "#FF9800", isActive: true },
  ];

  for (const brand of newBrands) {
    const existing = await db.select().from(brands).where(eq(brands.name, brand.name));
    if (existing.length === 0) {
      await db.insert(brands).values(brand);
      console.log(`Created brand: ${brand.name}`);
    } else {
      console.log(`Brand already exists: ${brand.name}`);
    }
  }

  // Get all regions and brands
  const allRegions = await db.select().from(regions);
  const allBrands = await db.select().from(brands);

  console.log("\nFound regions:", allRegions.map(r => r.name));
  console.log("Found brands:", allBrands.map(b => b.name));

  // Define brand-region mappings
  const brandRegionMappings: Record<string, string[]> = {
    "Baby Central": ["ID", "HK", "MY", "SG"],
    "Beaba": ["MY", "SG"],
    "Bloom Connect": ["ID", "HK", "MY", "SG"],
    "Bloom Create": ["ID", "HK", "MY", "SG"],
    "Bubble": ["ID"],
    "Ergobaby": ["ID", "HK", "MY", "SG"],
    "Micro": ["SG"],
    "Skip Hop": ["HK", "MY", "SG"],
  };

  // Clear existing brand-region relationships
  await db.delete(brandRegions);
  console.log("\nCleared existing brand-region relationships");

  // Create brand-region assignments
  for (const [brandName, regionNames] of Object.entries(brandRegionMappings)) {
    const brand = allBrands.find(b => b.name === brandName);
    if (!brand) {
      console.log(`Warning: Brand not found: ${brandName}`);
      continue;
    }

    for (const regionName of regionNames) {
      const region = allRegions.find(r => r.name === regionName);
      if (!region) {
        console.log(`Warning: Region not found: ${regionName}`);
        continue;
      }

      await db.insert(brandRegions).values({
        brandId: brand.id,
        regionId: region.id,
      });
      console.log(`Assigned ${brandName} to ${regionName}`);
    }
  }

  console.log("\nProduction brand-region setup complete!");
  process.exit(0);
}

setupProductionBrands().catch((error) => {
  console.error("Error setting up production brands:", error);
  process.exit(1);
});

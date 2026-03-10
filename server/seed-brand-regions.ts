import { db } from "./db";
import { brands, regions, brandRegions } from "@shared/schema";
import { eq } from "drizzle-orm";

const brandData = [
  { name: "Baby Central", color: "#FF6B6B" },
  { name: "Beaba", color: "#4ECDC4" },
  { name: "Bloom Connect", color: "#95E1D3" },
  { name: "Bloom Create", color: "#F38181" },
  { name: "Bubble", color: "#AA96DA" },
  { name: "Ergobaby", color: "#FCBAD3" },
  { name: "Micro", color: "#A8E6CF" },
  { name: "Skip Hop", color: "#FFD93D" },
];

const brandRegionMapping: Record<string, string[]> = {
  "Baby Central": ["ID", "HK", "MY", "SG"],
  "Beaba": ["MY", "SG"],
  "Bloom Connect": ["ID", "HK", "MY", "SG"],
  "Bloom Create": ["ID", "HK", "MY", "SG"],
  "Bubble": ["ID"],
  "Ergobaby": ["ID", "HK", "MY", "SG"],
  "Micro": ["SG"],
  "Skip Hop": ["HK", "MY", "SG"],
};

export async function seedBrandRegions() {
  console.log("Seeding brand-region assignments...");

  try {
    const allRegions = await db.select().from(regions);
    const regionMap = Object.fromEntries(
      allRegions.map(r => [r.code, r.id])
    );

    console.log("Found regions:", Object.keys(regionMap));

    const allBrands = await db.select().from(brands);
    const brandMap = Object.fromEntries(
      allBrands.map(b => [b.name, b.id])
    );

    console.log("Found brands:", Object.keys(brandMap));

    await db.delete(brandRegions);
    console.log("Cleared existing brand-region relationships");

    for (const [brandName, regionCodes] of Object.entries(brandRegionMapping)) {
      const brandId = brandMap[brandName];
      if (!brandId) {
        console.warn(`Brand ${brandName} not found in database`);
        continue;
      }

      for (const regionCode of regionCodes) {
        const regionId = regionMap[regionCode];
        if (regionId) {
          await db.insert(brandRegions).values({
            brandId,
            regionId,
          });
          console.log(`Assigned ${brandName} to ${regionCode}`);
        } else {
          console.warn(`Region ${regionCode} not found in database`);
        }
      }
    }

    console.log("Brand-region seeding complete!");
  } catch (error) {
    console.error("Error seeding brand-regions:", error);
    throw error;
  }
}

seedBrandRegions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { db } from "./db";
import { users, brands, regions, campaigns } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function seed() {
  console.log("Seeding database...");

  const regionData = [
    { name: "Australia & New Zealand", code: "ANZ", timezone: "Australia/Sydney" },
    { name: "Singapore", code: "SG", timezone: "Asia/Singapore" },
    { name: "Malaysia", code: "MY", timezone: "Asia/Kuala_Lumpur" },
    { name: "Indonesia", code: "ID", timezone: "Asia/Jakarta" },
    { name: "China", code: "CN", timezone: "Asia/Shanghai" },
    { name: "Hong Kong, Macau & Taiwan", code: "HK", timezone: "Asia/Hong_Kong" },
  ];

  for (const region of regionData) {
    const existing = await db.select().from(regions).where(eq(regions.code, region.code));
    if (existing.length === 0) {
      await db.insert(regions).values(region);
      console.log(`Created region: ${region.name}`);
    }
  }

  const brandData = [
    { name: "Baby Central", color: "#FF6B6B" },
    { name: "Beaba", color: "#F15BB5" },
    { name: "Bloom Connect", color: "#95E1D3" },
    { name: "Bloom Create", color: "#F38181" },
    { name: "Bubble", color: "#96CEB4" },
    { name: "Ergobaby", color: "#9B5DE5" },
    { name: "Micro", color: "#A8E6CF" },
    { name: "Skip Hop", color: "#00B4D8" },
  ];

  for (const brand of brandData) {
    const existing = await db.select().from(brands).where(eq(brands.name, brand.name));
    if (existing.length === 0) {
      await db.insert(brands).values(brand);
      console.log(`Created brand: ${brand.name}`);
    }
  }

  const adminEmail = "admin@bloomandgrow.com";
  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail));
  
  if (existingAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash("Admin123!", 10);
    await db.insert(users).values({
      email: adminEmail,
      password: hashedPassword,
      name: "System Admin",
      role: "ADMIN",
      isActive: true,
    });
    console.log("Created admin user: admin@bloomandgrow.com");
  }

  const campaignData = [
    { name: "Q1 2026 Product Launch", startDate: "2026-01-01", endDate: "2026-03-31", isActive: true },
    { name: "Summer Sale Campaign", startDate: "2026-06-01", endDate: "2026-08-31", isActive: true },
  ];

  for (const campaign of campaignData) {
    const existing = await db.select().from(campaigns).where(eq(campaigns.name, campaign.name));
    if (existing.length === 0) {
      await db.insert(campaigns).values(campaign);
      console.log(`Created campaign: ${campaign.name}`);
    }
  }

  console.log("Database seeding completed!");
}

if (process.argv[1]?.includes("seed.ts")) {
  seed().catch(console.error);
}

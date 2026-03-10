import { storage } from "./storage";

let brandCacheForDetection: { id: string; name: string; nameLower: string }[] = [];
let brandCacheLoadedAt = 0;

async function loadBrandCache() {
  if (Date.now() - brandCacheLoadedAt < 60000 && brandCacheForDetection.length > 0) {
    return brandCacheForDetection;
  }
  const brands = await storage.getBrands();
  brandCacheForDetection = brands
    .map(b => ({ id: b.id, name: b.name, nameLower: b.name.toLowerCase() }))
    .sort((a, b) => b.nameLower.length - a.nameLower.length);
  brandCacheLoadedAt = Date.now();
  return brandCacheForDetection;
}

export async function detectBrandFromName(name: string): Promise<string | null> {
  if (!name) return null;
  const brands = await loadBrandCache();
  const lower = name.toLowerCase();
  for (const brand of brands) {
    const idx = lower.indexOf(brand.nameLower);
    if (idx !== -1) {
      const before = idx > 0 ? lower[idx - 1] : " ";
      const after = idx + brand.nameLower.length < lower.length ? lower[idx + brand.nameLower.length] : " ";
      const boundaryChars = /[\s\-_.,;:!?/\\()\[\]{}|'"#@&+~`^%$*=<>]/;
      if ((idx === 0 || boundaryChars.test(before)) &&
          (idx + brand.nameLower.length >= lower.length || boundaryChars.test(after))) {
        return brand.id;
      }
    }
  }
  return null;
}

export function detectAssetTypeFromName(name: string, fileUrl: string): string {
  const lower = (name + " " + fileUrl).toLowerCase();
  if (/\.(mp4|webm|mov|avi|mkv|m4v|ogv)(\?|$)/i.test(fileUrl) || /\bvideo\b|\breel\b|\bclip\b|\bmotion\b/i.test(lower)) return "VIDEO";
  if (/\.(doc|docx|pdf|txt|rtf|odt)(\?|$)/i.test(fileUrl) || /\bdocument\b|\breport\b|\bbrief\b|\bguideline\b|\bwhitepaper\b/i.test(lower)) return "DOCUMENT";
  if (/\bemail.?template\b|\bnewsletter\b|\bedm\b|\beblast\b/i.test(lower)) return "EMAIL_TEMPLATE";
  if (/\b(csv|xlsx?|spreadsheet|data.?sheet|data.?file)\b/i.test(lower) || /\.(csv|xlsx?)(\?|$)/i.test(fileUrl)) return "DATA";
  return "GRAPHIC";
}

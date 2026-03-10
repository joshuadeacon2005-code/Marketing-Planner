import { storage } from "./storage";
import {
  getValidAccessToken,
  fetchAllCanvaDesigns,
  mapCanvaDesignToAsset,
  refreshAccessToken,
} from "./canvaService";
import { detectBrandFromName, detectAssetTypeFromName } from "./assetDetection";
import { log } from "./index";

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function syncForIntegration(integration: {
  id: string;
  userId: string;
  canvaAccessToken: string | null;
  canvaRefreshToken: string | null;
  tokenExpiresAt: Date | null;
  isActive: boolean;
}): Promise<{ imported: number; skipped: number; errors: number }> {
  const result = { imported: 0, skipped: 0, errors: 0 };

  if (!integration.canvaAccessToken) return result;

  let accessToken = await getValidAccessToken(
    integration,
    (id, data) => storage.updateCanvaIntegration(id, data)
  );

  if (!accessToken) {
    if (integration.canvaRefreshToken) {
      const refreshed = await refreshAccessToken(integration.canvaRefreshToken);
      if (refreshed) {
        await storage.updateCanvaIntegration(integration.id, {
          canvaAccessToken: refreshed.access_token,
          canvaRefreshToken: refreshed.refresh_token,
          tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        });
        accessToken = refreshed.access_token;
      }
    }
    if (!accessToken) {
      log(`Canva sync: token expired for integration ${integration.id}, skipping`, "canva-scheduler");
      return result;
    }
  }

  let designs;
  try {
    designs = await fetchAllCanvaDesigns(accessToken, 5);
  } catch (err: any) {
    if (err.message?.includes("401") || err.message?.includes("403")) {
      if (integration.canvaRefreshToken) {
        const refreshed = await refreshAccessToken(integration.canvaRefreshToken);
        if (refreshed) {
          await storage.updateCanvaIntegration(integration.id, {
            canvaAccessToken: refreshed.access_token,
            canvaRefreshToken: refreshed.refresh_token,
            tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          });
          try {
            designs = await fetchAllCanvaDesigns(refreshed.access_token, 5);
          } catch {
            log(`Canva sync: retry failed for integration ${integration.id}`, "canva-scheduler");
            return result;
          }
        }
      }
    }
    if (!designs) {
      log(`Canva sync: API error for integration ${integration.id}: ${err.message}`, "canva-scheduler");
      return result;
    }
  }

  const existingCanvaIds = await storage.getExistingCanvaDesignIds();

  for (const design of designs) {
    try {
      if (existingCanvaIds.has(design.id)) {
        result.skipped++;
        continue;
      }
      const assetData = mapCanvaDesignToAsset(design);
      const detectedBrandId = await detectBrandFromName(assetData.name || "");
      if (!assetData.assetType) {
        assetData.assetType = detectAssetTypeFromName(assetData.name || "", assetData.fileUrl || "");
      }
      await storage.createAsset({
        ...assetData,
        brandId: detectedBrandId || null,
        createdById: integration.userId,
      } as any);
      result.imported++;
    } catch {
      result.errors++;
    }
  }

  await storage.updateCanvaIntegration(integration.id, { lastSyncAt: new Date() });

  return result;
}

async function runScheduledSync() {
  try {
    const integrations = await storage.getAllActiveCanvaIntegrations();
    if (integrations.length === 0) return;

    log(`Canva auto-sync starting for ${integrations.length} integration(s) [every 6 hours]`, "canva-scheduler");

    for (const integration of integrations) {
      try {
        const result = await syncForIntegration(integration);
        if (result.imported > 0 || result.errors > 0) {
          log(
            `Canva sync for user ${integration.userId}: ${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors`,
            "canva-scheduler"
          );
        }
      } catch (err: any) {
        log(`Canva sync error for integration ${integration.id}: ${err.message}`, "canva-scheduler");
      }
    }
  } catch (err: any) {
    log(`Canva scheduler error: ${err.message}`, "canva-scheduler");
  }
}

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

export function startCanvaScheduler() {
  log("Canva auto-sync scheduler started (every 6 hours)", "canva-scheduler");
  setTimeout(() => {
    runScheduledSync();
  }, 30000);
  schedulerTimer = setInterval(() => {
    runScheduledSync();
  }, SYNC_INTERVAL_MS);
}

export function stopCanvaScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    log("Canva auto-sync scheduler stopped", "canva-scheduler");
  }
}

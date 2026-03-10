import crypto from "crypto";
import { db } from "./db";
import { canvaPkceStates } from "@shared/schema";
import { eq, lt } from "drizzle-orm";

const CANVA_API_BASE = "https://api.canva.com/rest/v1";
const CANVA_AUTH_BASE = "https://www.canva.com/api/oauth";
const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";

function getCanvaCredentials() {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  return { clientId, clientSecret };
}

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export async function getCanvaAuthUrl(userId: string, redirectUri: string): Promise<{ url: string; state: string } | null> {
  const { clientId } = getCanvaCredentials();
  if (!clientId) return null;

  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  await db.delete(canvaPkceStates).where(lt(canvaPkceStates.expiresAt, new Date()));

  await db.insert(canvaPkceStates).values({
    state,
    codeVerifier,
    userId,
    redirectUri,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const scopes = [
    "design:meta:read",
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return {
    url: `${CANVA_AUTH_BASE}/authorize?${params.toString()}`,
    state,
  };
}

export async function getPkceData(state: string): Promise<{ codeVerifier: string; userId: string; redirectUri: string } | null> {
  const [data] = await db.select().from(canvaPkceStates).where(eq(canvaPkceStates.state, state));
  if (!data) return null;
  if (data.expiresAt < new Date()) {
    await db.delete(canvaPkceStates).where(eq(canvaPkceStates.state, state));
    return null;
  }
  await db.delete(canvaPkceStates).where(eq(canvaPkceStates.state, state));
  return { codeVerifier: data.codeVerifier, userId: data.userId, redirectUri: data.redirectUri };
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{
  success: true;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
} | { success: false; error: string }> {
  const { clientId, clientSecret } = getCanvaCredentials();
  if (!clientId || !clientSecret) return { success: false, error: "Missing Canva credentials" };

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Canva token exchange failed:", response.status, errorText);
    console.error("Canva token exchange details - redirectUri:", redirectUri, "code length:", code.length, "codeVerifier length:", codeVerifier.length);
    return { success: false, error: `Canva returned ${response.status}: ${errorText}` };
  }

  const data = await response.json();
  return { success: true, ...data };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  const { clientId, clientSecret } = getCanvaCredentials();
  if (!clientId || !clientSecret) return null;

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    console.error("Canva token refresh failed:", response.status);
    return null;
  }

  return response.json();
}

async function getValidAccessToken(
  integration: {
    canvaAccessToken: string | null;
    canvaRefreshToken: string | null;
    tokenExpiresAt: Date | null;
    id: string;
  },
  updateTokenFn: (id: string, data: any) => Promise<any>
): Promise<string | null> {
  if (!integration.canvaAccessToken) return null;

  if (integration.tokenExpiresAt && new Date() >= integration.tokenExpiresAt) {
    if (!integration.canvaRefreshToken) return null;

    const refreshed = await refreshAccessToken(integration.canvaRefreshToken);
    if (!refreshed) return null;

    await updateTokenFn(integration.id, {
      canvaAccessToken: refreshed.access_token,
      canvaRefreshToken: refreshed.refresh_token,
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    });

    return refreshed.access_token;
  }

  return integration.canvaAccessToken;
}

export interface CanvaDesign {
  id: string;
  title: string;
  created_at?: number;
  updated_at?: number;
  thumbnail?: {
    width: number;
    height: number;
    url: string;
  };
  urls?: {
    edit_url?: string;
    view_url?: string;
  };
  owner?: {
    user_id?: string;
    team_id?: string;
  };
}

export interface CanvaDesignsResponse {
  items: CanvaDesign[];
  continuation?: string;
}

export async function fetchCanvaDesigns(
  accessToken: string,
  options?: { query?: string; continuation?: string; limit?: number }
): Promise<CanvaDesignsResponse> {
  const params = new URLSearchParams();
  if (options?.query) params.append("query", options.query);
  if (options?.continuation) params.append("continuation", options.continuation);

  const url = `${CANVA_API_BASE}/designs${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Canva API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

export async function fetchAllCanvaDesigns(
  accessToken: string,
  maxPages: number = 5
): Promise<CanvaDesign[]> {
  const allDesigns: CanvaDesign[] = [];
  let continuation: string | undefined;
  let page = 0;

  do {
    const response = await fetchCanvaDesigns(accessToken, { continuation });
    if (response.items) {
      allDesigns.push(...response.items);
    }
    continuation = response.continuation;
    page++;
  } while (continuation && page < maxPages);

  return allDesigns;
}

export async function fetchCanvaUserProfile(accessToken: string): Promise<{
  user_id: string;
  team_id?: string;
  display_name?: string;
} | null> {
  const response = await fetch(`${CANVA_API_BASE}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;
  return response.json();
}

export function mapCanvaDesignToAsset(design: CanvaDesign) {
  let assetType: string = "GRAPHIC";
  const title = design.title?.toLowerCase() || "";
  if (title.includes("video")) assetType = "VIDEO";
  else if (title.includes("template") || title.includes("email")) assetType = "EMAIL_TEMPLATE";
  else if (title.includes("document") || title.includes("doc") || title.includes("report")) assetType = "DOCUMENT";

  return {
    name: design.title || "Untitled Canva Design",
    description: `Imported from Canva`,
    assetType,
    fileUrl: design.urls?.view_url || design.urls?.edit_url || null,
    thumbnailUrl: design.thumbnail?.url || null,
    source: "CANVA",
    canvaDesignId: design.id,
    canvaEditUrl: design.urls?.edit_url || null,
    canvaThumbnailUrl: design.thumbnail?.url || null,
    isPublic: true,
    tags: ["canva", "imported"],
  };
}

export { getValidAccessToken };

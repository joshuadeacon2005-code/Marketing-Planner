import crypto from "crypto";
import { db } from "./db";
import { metaPkceStates } from "@shared/schema";
import { eq, lt } from "drizzle-orm";

const META_GRAPH_BASE = "https://graph.facebook.com/v21.0";
const META_AUTH_BASE = "https://www.facebook.com/v21.0/dialog/oauth";
const META_TOKEN_URL = `${META_GRAPH_BASE}/oauth/access_token`;

function getMetaCredentials() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  return { appId, appSecret };
}

export function hasMetaCredentials(): boolean {
  const { appId, appSecret } = getMetaCredentials();
  return !!(appId && appSecret);
}

export async function getMetaAuthUrl(userId: string, redirectUri: string): Promise<{ url: string; state: string } | null> {
  const { appId } = getMetaCredentials();
  if (!appId) return null;

  const state = crypto.randomBytes(16).toString("hex");

  await db.delete(metaPkceStates).where(lt(metaPkceStates.expiresAt, new Date()));

  await db.insert(metaPkceStates).values({
    state,
    userId,
    redirectUri,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "pages_read_user_content",
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_insights",
    "read_insights",
  ].join(",");

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    response_type: "code",
  });

  return {
    url: `${META_AUTH_BASE}?${params.toString()}`,
    state,
  };
}

export async function getMetaOAuthState(state: string): Promise<{ userId: string; redirectUri: string } | null> {
  const [data] = await db.select().from(metaPkceStates).where(eq(metaPkceStates.state, state));
  if (!data) return null;
  if (data.expiresAt < new Date()) {
    await db.delete(metaPkceStates).where(eq(metaPkceStates.state, state));
    return null;
  }
  await db.delete(metaPkceStates).where(eq(metaPkceStates.state, state));
  return { userId: data.userId, redirectUri: data.redirectUri };
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ success: true; access_token: string; expires_in?: number } | { success: false; error: string }> {
  const { appId, appSecret } = getMetaCredentials();
  if (!appId || !appSecret) return { success: false, error: "Missing Meta credentials" };

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(`${META_TOKEN_URL}?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Meta token exchange failed:", response.status, errorText);
    return { success: false, error: `Meta returned ${response.status}: ${errorText}` };
  }

  const data = await response.json();
  return { success: true, access_token: data.access_token, expires_in: data.expires_in };
}

export async function exchangeForLongLivedToken(
  shortToken: string
): Promise<{ access_token: string; expires_in: number } | null> {
  const { appId, appSecret } = getMetaCredentials();
  if (!appId || !appSecret) return null;

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });

  const response = await fetch(`${META_TOKEN_URL}?${params.toString()}`);
  if (!response.ok) {
    console.error("Meta long-lived token exchange failed:", response.status);
    return null;
  }

  return response.json();
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  instagram_business_account?: {
    id: string;
  };
}

export async function fetchUserPages(userAccessToken: string): Promise<MetaPage[]> {
  const response = await fetch(
    `${META_GRAPH_BASE}/me/accounts?fields=id,name,access_token,category,instagram_business_account&access_token=${userAccessToken}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Meta API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function fetchMetaUserId(accessToken: string): Promise<string | null> {
  const response = await fetch(`${META_GRAPH_BASE}/me?access_token=${accessToken}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.id || null;
}

export async function publishToFacebook(
  pageAccessToken: string,
  pageId: string,
  message: string,
  imageUrl?: string
): Promise<{ id: string } | null> {
  let url: string;
  let body: URLSearchParams;

  if (imageUrl) {
    url = `${META_GRAPH_BASE}/${pageId}/photos`;
    body = new URLSearchParams({
      url: imageUrl,
      caption: message,
      access_token: pageAccessToken,
    });
  } else {
    url = `${META_GRAPH_BASE}/${pageId}/feed`;
    body = new URLSearchParams({
      message,
      access_token: pageAccessToken,
    });
  }

  const response = await fetch(url, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Facebook publish failed:", response.status, errorText);
    throw new Error(`Facebook publish failed: ${errorText}`);
  }

  return response.json();
}

export async function publishToInstagram(
  pageAccessToken: string,
  igAccountId: string,
  caption: string,
  imageUrl: string
): Promise<{ id: string } | null> {
  const containerResponse = await fetch(`${META_GRAPH_BASE}/${igAccountId}/media`, {
    method: "POST",
    body: new URLSearchParams({
      image_url: imageUrl,
      caption,
      access_token: pageAccessToken,
    }),
  });

  if (!containerResponse.ok) {
    const errorText = await containerResponse.text();
    console.error("Instagram container creation failed:", containerResponse.status, errorText);
    throw new Error(`Instagram container creation failed: ${errorText}`);
  }

  const container = await containerResponse.json();
  const containerId = container.id;

  await new Promise(resolve => setTimeout(resolve, 3000));

  const publishResponse = await fetch(`${META_GRAPH_BASE}/${igAccountId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({
      creation_id: containerId,
      access_token: pageAccessToken,
    }),
  });

  if (!publishResponse.ok) {
    const errorText = await publishResponse.text();
    console.error("Instagram publish failed:", publishResponse.status, errorText);
    throw new Error(`Instagram publish failed: ${errorText}`);
  }

  return publishResponse.json();
}

export interface MetaPostInsights {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
  engagementRate?: number;
}

export async function fetchFacebookPostInsights(
  pageAccessToken: string,
  postId: string
): Promise<MetaPostInsights> {
  const fieldsUrl = `${META_GRAPH_BASE}/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${pageAccessToken}`;
  const response = await fetch(fieldsUrl);

  if (!response.ok) {
    console.error("Facebook post insights fetch failed:", response.status);
    return {};
  }

  const data = await response.json();

  const likes = data.likes?.summary?.total_count || 0;
  const comments = data.comments?.summary?.total_count || 0;
  const shares = data.shares?.count || 0;

  let views = 0;
  let reach = 0;
  try {
    const insightsUrl = `${META_GRAPH_BASE}/${postId}/insights?metric=post_impressions,post_engaged_users&access_token=${pageAccessToken}`;
    const insightsResponse = await fetch(insightsUrl);
    if (insightsResponse.ok) {
      const insightsData = await insightsResponse.json();
      for (const metric of insightsData.data || []) {
        if (metric.name === "post_impressions") {
          views = metric.values?.[0]?.value || 0;
        }
        if (metric.name === "post_engaged_users") {
          reach = metric.values?.[0]?.value || 0;
        }
      }
    }
  } catch (e) {
    console.error("Failed to fetch post insights metrics:", e);
  }

  const totalEngagements = likes + comments + shares;
  const engagementRate = views > 0 ? (totalEngagements / views) * 100 : 0;

  return {
    views,
    likes,
    comments,
    shares,
    reach,
    engagementRate: Math.round(engagementRate * 100) / 100,
  };
}

export async function fetchInstagramPostInsights(
  pageAccessToken: string,
  mediaId: string
): Promise<MetaPostInsights> {
  const fieldsUrl = `${META_GRAPH_BASE}/${mediaId}?fields=like_count,comments_count,timestamp&access_token=${pageAccessToken}`;
  const response = await fetch(fieldsUrl);

  if (!response.ok) {
    console.error("Instagram media fields fetch failed:", response.status);
    return {};
  }

  const data = await response.json();
  const likes = data.like_count || 0;
  const comments = data.comments_count || 0;

  let views = 0;
  let saves = 0;
  let shares = 0;
  let reach = 0;

  try {
    const insightsUrl = `${META_GRAPH_BASE}/${mediaId}/insights?metric=impressions,saved,shares,reach&access_token=${pageAccessToken}`;
    const insightsResponse = await fetch(insightsUrl);
    if (insightsResponse.ok) {
      const insightsData = await insightsResponse.json();
      for (const metric of insightsData.data || []) {
        if (metric.name === "impressions") views = metric.values?.[0]?.value || 0;
        if (metric.name === "saved") saves = metric.values?.[0]?.value || 0;
        if (metric.name === "shares") shares = metric.values?.[0]?.value || 0;
        if (metric.name === "reach") reach = metric.values?.[0]?.value || 0;
      }
    }
  } catch (e) {
    console.error("Failed to fetch Instagram insights:", e);
  }

  const totalEngagements = likes + comments + shares + saves;
  const engagementRate = views > 0 ? (totalEngagements / views) * 100 : 0;

  return {
    views,
    likes,
    comments,
    shares,
    saves,
    reach,
    engagementRate: Math.round(engagementRate * 100) / 100,
  };
}

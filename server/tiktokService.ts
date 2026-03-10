import crypto from "crypto";

const TIKTOK_AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

const oauthStates = new Map<string, { userId: string; redirectUri: string; codeVerifier: string; expiresAt: number }>();

function getTikTokCredentials() {
  return {
    clientKey: process.env.TIKTOK_CLIENT_KEY,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
  };
}

export function hasTikTokCredentials(): boolean {
  const { clientKey, clientSecret } = getTikTokCredentials();
  return !!(clientKey && clientSecret);
}

export function getTikTokAuthUrl(
  userId: string,
  redirectUri: string
): { url: string; state: string } | null {
  const { clientKey } = getTikTokCredentials();
  if (!clientKey) return null;

  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const entries = Array.from(oauthStates.entries());
  for (const [key, value] of entries) {
    if (value.expiresAt < Date.now()) {
      oauthStates.delete(key);
    }
  }

  oauthStates.set(state, {
    userId,
    redirectUri,
    codeVerifier,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const scopes = "user.info.basic,video.publish,video.upload,video.list";

  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return {
    url: `${TIKTOK_AUTH_BASE}?${params.toString()}`,
    state,
  };
}

export function getTikTokOAuthState(
  state: string
): { userId: string; redirectUri: string; codeVerifier: string } | null {
  const data = oauthStates.get(state);
  if (!data) return null;

  if (data.expiresAt < Date.now()) {
    oauthStates.delete(state);
    return null;
  }

  oauthStates.delete(state);
  return { userId: data.userId, redirectUri: data.redirectUri, codeVerifier: data.codeVerifier };
}

export async function exchangeTikTokCode(
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<
  | { success: true; access_token: string; refresh_token: string; open_id: string; expires_in: number; refresh_expires_in: number }
  | { success: false; error: string }
> {
  try {
    const { clientKey, clientSecret } = getTikTokCredentials();
    if (!clientKey || !clientSecret) {
      return { success: false, error: "Missing TikTok credentials" };
    }

    const body: Record<string, string> = {
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    };

    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TikTok] Token exchange failed:", response.status, errorText);
      return { success: false, error: `TikTok returned ${response.status}: ${errorText}` };
    }

    const data = await response.json();

    if (data.error) {
      console.error("[TikTok] Token exchange error:", data.error, data.error_description);
      return { success: false, error: data.error_description || data.error };
    }

    return {
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      open_id: data.open_id,
      expires_in: data.expires_in,
      refresh_expires_in: data.refresh_expires_in,
    };
  } catch (error) {
    console.error("[TikTok] Token exchange exception:", error);
    return { success: false, error: String(error) };
  }
}

export async function refreshTikTokToken(
  refreshToken: string
): Promise<
  | { success: true; access_token: string; refresh_token: string; expires_in: number; refresh_expires_in: number }
  | { success: false; error: string }
> {
  try {
    const { clientKey, clientSecret } = getTikTokCredentials();
    if (!clientKey || !clientSecret) {
      return { success: false, error: "Missing TikTok credentials" };
    }

    const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TikTok] Token refresh failed:", response.status, errorText);
      return { success: false, error: `TikTok returned ${response.status}: ${errorText}` };
    }

    const data = await response.json();

    if (data.error) {
      console.error("[TikTok] Token refresh error:", data.error, data.error_description);
      return { success: false, error: data.error_description || data.error };
    }

    return {
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      refresh_expires_in: data.refresh_expires_in,
    };
  } catch (error) {
    console.error("[TikTok] Token refresh exception:", error);
    return { success: false, error: String(error) };
  }
}

export interface TikTokVideoInitResponse {
  publish_id: string;
  upload_url: string;
}

export async function initTikTokVideoUpload(
  accessToken: string,
  caption: string
): Promise<TikTokVideoInitResponse | null> {
  try {
    const response = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: "SELF_ONLY",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TikTok] Video upload init failed:", response.status, errorText);
      throw new Error(`TikTok video init failed: ${errorText}`);
    }

    const data = await response.json();

    if (data.error && data.error.code !== "ok") {
      console.error("[TikTok] Video upload init error:", data.error);
      throw new Error(`TikTok video init error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    return {
      publish_id: data.data?.publish_id,
      upload_url: data.data?.upload_url,
    };
  } catch (error) {
    console.error("[TikTok] Video upload init exception:", error);
    throw error;
  }
}

export interface TikTokPhotoPublishResponse {
  publish_id: string;
}

export async function publishTikTokPhoto(
  accessToken: string,
  imageUrls: string[],
  caption: string
): Promise<TikTokPhotoPublishResponse | null> {
  try {
    const images = imageUrls.map((url) => ({ image_url: url }));

    const response = await fetch(`${TIKTOK_API_BASE}/post/publish/content/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: "SELF_ONLY",
          disable_comment: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          photo_images: images,
        },
        post_mode: "DIRECT_POST",
        media_type: "PHOTO",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TikTok] Photo publish failed:", response.status, errorText);
      throw new Error(`TikTok photo publish failed: ${errorText}`);
    }

    const data = await response.json();

    if (data.error && data.error.code !== "ok") {
      console.error("[TikTok] Photo publish error:", data.error);
      throw new Error(`TikTok photo publish error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    return {
      publish_id: data.data?.publish_id,
    };
  } catch (error) {
    console.error("[TikTok] Photo publish exception:", error);
    throw error;
  }
}

export interface TikTokVideoInsights {
  id: string;
  title?: string;
  video_description?: string;
  duration?: number;
  cover_image_url?: string;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
}

export async function fetchTikTokVideoInsights(
  accessToken: string,
  videoIds: string[]
): Promise<TikTokVideoInsights[]> {
  try {
    const fields = "id,title,video_description,duration,cover_image_url,like_count,comment_count,share_count,view_count";

    const response = await fetch(`${TIKTOK_API_BASE}/video/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        filters: {
          video_ids: videoIds,
        },
        fields: fields.split(","),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TikTok] Video insights fetch failed:", response.status, errorText);
      return [];
    }

    const data = await response.json();

    if (data.error && data.error.code !== "ok") {
      console.error("[TikTok] Video insights error:", data.error);
      return [];
    }

    return (data.data?.videos || []).map((video: any) => ({
      id: video.id,
      title: video.title,
      video_description: video.video_description,
      duration: video.duration,
      cover_image_url: video.cover_image_url,
      like_count: video.like_count,
      comment_count: video.comment_count,
      share_count: video.share_count,
      view_count: video.view_count,
    }));
  } catch (error) {
    console.error("[TikTok] Video insights exception:", error);
    return [];
  }
}

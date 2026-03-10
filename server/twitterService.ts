import crypto from "crypto";

const TWITTER_AUTH_BASE = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const TWITTER_API_BASE = "https://api.x.com/2";
const TWITTER_UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json";

const oauthStates = new Map<string, { userId: string; redirectUri: string; codeVerifier: string; expiresAt: number }>();

function getTwitterCredentials() {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  return { clientId, clientSecret };
}

export function hasTwitterCredentials(): boolean {
  const { clientId, clientSecret } = getTwitterCredentials();
  return !!(clientId && clientSecret);
}

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function getTwitterAuthUrl(userId: string, redirectUri: string): { url: string; state: string } | null {
  const { clientId } = getTwitterCredentials();
  if (!clientId) return null;

  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const now = Date.now();
  oauthStates.forEach((value, key) => {
    if (value.expiresAt < now) {
      oauthStates.delete(key);
    }
  });

  oauthStates.set(state, {
    userId,
    redirectUri,
    codeVerifier,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return {
    url: `${TWITTER_AUTH_BASE}?${params.toString()}`,
    state,
  };
}

export function getTwitterOAuthState(state: string): { userId: string; redirectUri: string; codeVerifier: string } | null {
  const data = oauthStates.get(state);
  if (!data) return null;

  if (data.expiresAt < Date.now()) {
    oauthStates.delete(state);
    return null;
  }

  oauthStates.delete(state);
  return { userId: data.userId, redirectUri: data.redirectUri, codeVerifier: data.codeVerifier };
}

export async function exchangeTwitterCode(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{ success: true; access_token: string; refresh_token?: string; expires_in?: number } | { success: false; error: string }> {
  const { clientId, clientSecret } = getTwitterCredentials();
  if (!clientId || !clientSecret) return { success: false, error: "Missing Twitter credentials" };

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  try {
    const response = await fetch(TWITTER_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Twitter] Token exchange failed:", response.status, errorText);
      return { success: false, error: `Twitter returned ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return {
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (error) {
    console.error("[Twitter] Token exchange error:", error);
    return { success: false, error: `Token exchange failed: ${error}` };
  }
}

export async function refreshTwitterToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const { clientId, clientSecret } = getTwitterCredentials();
  if (!clientId || !clientSecret) return null;

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(TWITTER_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Twitter] Token refresh failed:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (error) {
    console.error("[Twitter] Token refresh error:", error);
    return null;
  }
}

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export async function fetchTwitterUser(accessToken: string): Promise<TwitterUser | null> {
  try {
    const response = await fetch(`${TWITTER_API_BASE}/users/me?user.fields=profile_image_url,username,name`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Twitter] Fetch user failed:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("[Twitter] Fetch user error:", error);
    return null;
  }
}

export async function publishTweet(
  accessToken: string,
  text: string,
  mediaId?: string
): Promise<{ id: string } | null> {
  try {
    const tweetBody: Record<string, any> = { text };

    if (mediaId) {
      tweetBody.media = { media_ids: [mediaId] };
    }

    const response = await fetch(`${TWITTER_API_BASE}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tweetBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Twitter] Publish tweet failed:", response.status, errorText);
      throw new Error(`Twitter publish failed: ${errorText}`);
    }

    const data = await response.json();
    return { id: data.data?.id };
  } catch (error) {
    console.error("[Twitter] Publish tweet error:", error);
    throw error;
  }
}

export async function uploadTwitterMedia(
  accessToken: string,
  imageUrl: string
): Promise<string | null> {
  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error("[Twitter] Failed to fetch image from URL:", imageUrl);
      return null;
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const totalBytes = imageBuffer.length;

    const initParams = new URLSearchParams({
      command: "INIT",
      total_bytes: totalBytes.toString(),
      media_type: contentType,
    });

    const initResponse = await fetch(`${TWITTER_UPLOAD_URL}?${initParams.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error("[Twitter] Media upload INIT failed:", initResponse.status, errorText);
      return null;
    }

    const initData = await initResponse.json();
    const mediaId = initData.media_id_string;

    const chunkSize = 5 * 1024 * 1024;
    let segmentIndex = 0;

    for (let offset = 0; offset < totalBytes; offset += chunkSize) {
      const chunk = imageBuffer.subarray(offset, Math.min(offset + chunkSize, totalBytes));

      const formData = new FormData();
      formData.append("command", "APPEND");
      formData.append("media_id", mediaId);
      formData.append("segment_index", segmentIndex.toString());
      formData.append("media_data", chunk.toString("base64"));

      const appendResponse = await fetch(TWITTER_UPLOAD_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!appendResponse.ok) {
        const errorText = await appendResponse.text();
        console.error("[Twitter] Media upload APPEND failed:", appendResponse.status, errorText);
        return null;
      }

      segmentIndex++;
    }

    const finalizeParams = new URLSearchParams({
      command: "FINALIZE",
      media_id: mediaId,
    });

    const finalizeResponse = await fetch(`${TWITTER_UPLOAD_URL}?${finalizeParams.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!finalizeResponse.ok) {
      const errorText = await finalizeResponse.text();
      console.error("[Twitter] Media upload FINALIZE failed:", finalizeResponse.status, errorText);
      return null;
    }

    const finalizeData = await finalizeResponse.json();

    if (finalizeData.processing_info) {
      let processingState = finalizeData.processing_info.state;
      let checkAfterSecs = finalizeData.processing_info.check_after_secs || 5;

      while (processingState === "pending" || processingState === "in_progress") {
        await new Promise((resolve) => setTimeout(resolve, checkAfterSecs * 1000));

        const statusParams = new URLSearchParams({
          command: "STATUS",
          media_id: mediaId,
        });

        const statusResponse = await fetch(`${TWITTER_UPLOAD_URL}?${statusParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!statusResponse.ok) {
          console.error("[Twitter] Media upload STATUS check failed:", statusResponse.status);
          break;
        }

        const statusData = await statusResponse.json();
        processingState = statusData.processing_info?.state;
        checkAfterSecs = statusData.processing_info?.check_after_secs || 5;

        if (processingState === "failed") {
          console.error("[Twitter] Media processing failed:", statusData.processing_info?.error);
          return null;
        }
      }
    }

    return mediaId;
  } catch (error) {
    console.error("[Twitter] Media upload error:", error);
    return null;
  }
}

export interface TweetMetrics {
  impressions?: number;
  likes?: number;
  retweets?: number;
  replies?: number;
  url_link_clicks?: number;
  profile_clicks?: number;
}

export async function fetchTweetMetrics(
  accessToken: string,
  tweetId: string
): Promise<TweetMetrics | null> {
  try {
    const response = await fetch(
      `${TWITTER_API_BASE}/tweets/${tweetId}?tweet.fields=public_metrics,non_public_metrics,organic_metrics`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Twitter] Fetch tweet metrics failed:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const tweet = data.data;

    if (!tweet) return null;

    const publicMetrics = tweet.public_metrics || {};
    const nonPublicMetrics = tweet.non_public_metrics || {};
    const organicMetrics = tweet.organic_metrics || {};

    return {
      impressions: nonPublicMetrics.impression_count ?? organicMetrics.impression_count ?? publicMetrics.impression_count,
      likes: publicMetrics.like_count ?? organicMetrics.like_count,
      retweets: publicMetrics.retweet_count ?? organicMetrics.retweet_count,
      replies: publicMetrics.reply_count ?? organicMetrics.reply_count,
      url_link_clicks: nonPublicMetrics.url_link_clicks ?? organicMetrics.url_link_clicks,
      profile_clicks: nonPublicMetrics.user_profile_clicks,
    };
  } catch (error) {
    console.error("[Twitter] Fetch tweet metrics error:", error);
    return null;
  }
}

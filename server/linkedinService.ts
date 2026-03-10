import crypto from "crypto";

const LINKEDIN_AUTH_BASE = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";
const LINKEDIN_REST_BASE = "https://api.linkedin.com/rest";

const oauthStates = new Map<string, { userId: string; redirectUri: string; expiresAt: number }>();

function getLinkedInCredentials() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  return { clientId, clientSecret };
}

export function hasLinkedInCredentials(): boolean {
  const { clientId, clientSecret } = getLinkedInCredentials();
  return !!(clientId && clientSecret);
}

export function getLinkedInAuthUrl(userId: string, redirectUri: string): { url: string; state: string } | null {
  const { clientId } = getLinkedInCredentials();
  if (!clientId) return null;

  const state = crypto.randomBytes(16).toString("hex");

  const now = Date.now();
  oauthStates.forEach((value, key) => {
    if (value.expiresAt < now) {
      oauthStates.delete(key);
    }
  });

  oauthStates.set(state, {
    userId,
    redirectUri,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const scopes = "openid profile w_member_social r_organization_social rw_organization_admin";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
  });

  return {
    url: `${LINKEDIN_AUTH_BASE}?${params.toString()}`,
    state,
  };
}

export function getLinkedInOAuthState(state: string): { userId: string; redirectUri: string } | null {
  const data = oauthStates.get(state);
  if (!data) return null;
  if (data.expiresAt < Date.now()) {
    oauthStates.delete(state);
    return null;
  }
  oauthStates.delete(state);
  return { userId: data.userId, redirectUri: data.redirectUri };
}

export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<{ success: true; access_token: string; refresh_token?: string; expires_in?: number } | { success: false; error: string }> {
  const { clientId, clientSecret } = getLinkedInCredentials();
  if (!clientId || !clientSecret) return { success: false, error: "Missing LinkedIn credentials" };

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  try {
    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[LinkedIn] Token exchange failed:", response.status, errorText);
      return { success: false, error: `LinkedIn returned ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return {
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (err) {
    console.error("[LinkedIn] Token exchange error:", err);
    return { success: false, error: `Token exchange request failed: ${err}` };
  }
}

export async function refreshLinkedInToken(
  refreshToken: string
): Promise<{ success: true; access_token: string; refresh_token?: string; expires_in?: number } | { success: false; error: string }> {
  const { clientId, clientSecret } = getLinkedInCredentials();
  if (!clientId || !clientSecret) return { success: false, error: "Missing LinkedIn credentials" };

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  try {
    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[LinkedIn] Token refresh failed:", response.status, errorText);
      return { success: false, error: `LinkedIn returned ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return {
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (err) {
    console.error("[LinkedIn] Token refresh error:", err);
    return { success: false, error: `Token refresh request failed: ${err}` };
  }
}

export interface LinkedInProfile {
  sub: string;
  name: string;
  picture?: string;
  email?: string;
}

export async function fetchLinkedInProfile(
  accessToken: string
): Promise<LinkedInProfile | null> {
  try {
    const response = await fetch(`${LINKEDIN_API_BASE}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[LinkedIn] Profile fetch failed:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    return {
      sub: data.sub,
      name: data.name,
      picture: data.picture,
      email: data.email,
    };
  } catch (err) {
    console.error("[LinkedIn] Profile fetch error:", err);
    return null;
  }
}

export interface LinkedInOrganization {
  organizationId: string;
  role: string;
  state: string;
}

export async function fetchLinkedInOrganizations(
  accessToken: string
): Promise<LinkedInOrganization[]> {
  try {
    const params = new URLSearchParams({
      q: "roleAssignee",
      role: "ADMINISTRATOR",
      state: "APPROVED",
      projection: "(elements*(organization~(localizedName,vanityName,logoV2),roleAssignee,role,state))",
    });

    const response = await fetch(`${LINKEDIN_API_BASE}/organizationAcls?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[LinkedIn] Organizations fetch failed:", response.status, errorText);
      return [];
    }

    const data = await response.json();
    const elements = data.elements || [];

    return elements.map((el: any) => {
      const orgUrn = el.organization || "";
      const orgId = orgUrn.split(":").pop() || "";
      return {
        organizationId: orgId,
        role: el.role || "ADMINISTRATOR",
        state: el.state || "APPROVED",
      };
    });
  } catch (err) {
    console.error("[LinkedIn] Organizations fetch error:", err);
    return [];
  }
}

export interface LinkedInPostResult {
  success: boolean;
  postUrn?: string;
  error?: string;
}

export async function publishLinkedInPost(
  accessToken: string,
  authorUrn: string,
  text: string,
  imageUrl?: string
): Promise<LinkedInPostResult> {
  try {
    if (imageUrl) {
      return await publishLinkedInImagePost(accessToken, authorUrn, text, imageUrl);
    }

    const postBody = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      visibility: "PUBLIC",
      commentary: text,
      distribution: {
        feedDistribution: "MAIN_FEED",
      },
    };

    const response = await fetch(`${LINKEDIN_API_BASE}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202401",
      },
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[LinkedIn] Post publish failed:", response.status, errorText);
      return { success: false, error: `LinkedIn returned ${response.status}: ${errorText}` };
    }

    const postUrn = response.headers.get("x-restli-id") || response.headers.get("X-RestLi-Id");
    return { success: true, postUrn: postUrn || undefined };
  } catch (err) {
    console.error("[LinkedIn] Post publish error:", err);
    return { success: false, error: `Post publish request failed: ${err}` };
  }
}

async function publishLinkedInImagePost(
  accessToken: string,
  authorUrn: string,
  text: string,
  imageUrl: string
): Promise<LinkedInPostResult> {
  try {
    const initBody = {
      initializeUploadRequest: {
        owner: authorUrn,
      },
    };

    const initResponse = await fetch(`${LINKEDIN_REST_BASE}/images?action=initializeUpload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
      },
      body: JSON.stringify(initBody),
    });

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error("[LinkedIn] Image upload init failed:", initResponse.status, errorText);
      return { success: false, error: `Image upload init failed: ${errorText}` };
    }

    const initData = await initResponse.json();
    const uploadUrl = initData.value?.uploadUrl;
    const imageUrn = initData.value?.image;

    if (!uploadUrl || !imageUrn) {
      return { success: false, error: "Failed to get upload URL or image URN from LinkedIn" };
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return { success: false, error: `Failed to download image from ${imageUrl}` };
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
      },
      body: imageBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("[LinkedIn] Image upload failed:", uploadResponse.status, errorText);
      return { success: false, error: `Image upload failed: ${errorText}` };
    }

    const postBody = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      visibility: "PUBLIC",
      commentary: text,
      distribution: {
        feedDistribution: "MAIN_FEED",
      },
      content: {
        media: {
          id: imageUrn,
        },
      },
    };

    const postResponse = await fetch(`${LINKEDIN_API_BASE}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202401",
      },
      body: JSON.stringify(postBody),
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error("[LinkedIn] Image post publish failed:", postResponse.status, errorText);
      return { success: false, error: `LinkedIn returned ${postResponse.status}: ${errorText}` };
    }

    const postUrn = postResponse.headers.get("x-restli-id") || postResponse.headers.get("X-RestLi-Id");
    return { success: true, postUrn: postUrn || undefined };
  } catch (err) {
    console.error("[LinkedIn] Image post publish error:", err);
    return { success: false, error: `Image post publish failed: ${err}` };
  }
}

export interface LinkedInPostAnalytics {
  likes?: number;
  comments?: number;
  shares?: number;
  impressions?: number;
  clicks?: number;
  engagementRate?: number;
}

export async function fetchLinkedInPostAnalytics(
  accessToken: string,
  postUrn: string
): Promise<LinkedInPostAnalytics> {
  const result: LinkedInPostAnalytics = {};

  try {
    const encodedUrn = encodeURIComponent(postUrn);

    const likesResponse = await fetch(`${LINKEDIN_API_BASE}/socialActions/${encodedUrn}/likes?count=0`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (likesResponse.ok) {
      const likesData = await likesResponse.json();
      result.likes = likesData.paging?.total || 0;
    } else {
      console.error("[LinkedIn] Likes fetch failed:", likesResponse.status);
    }

    const commentsResponse = await fetch(`${LINKEDIN_API_BASE}/socialActions/${encodedUrn}/comments?count=0`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (commentsResponse.ok) {
      const commentsData = await commentsResponse.json();
      result.comments = commentsData.paging?.total || 0;
    } else {
      console.error("[LinkedIn] Comments fetch failed:", commentsResponse.status);
    }

    const socialResponse = await fetch(`${LINKEDIN_API_BASE}/socialActions/${encodedUrn}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (socialResponse.ok) {
      const socialData = await socialResponse.json();
      result.likes = result.likes ?? socialData.likesSummary?.totalLikes ?? 0;
      result.comments = result.comments ?? socialData.commentsSummary?.totalFirstLevelComments ?? 0;
      result.shares = socialData.sharesSummary?.totalShares ?? 0;
    } else {
      console.error("[LinkedIn] Social actions fetch failed:", socialResponse.status);
    }

    const totalEngagements = (result.likes || 0) + (result.comments || 0) + (result.shares || 0);
    if (result.impressions && result.impressions > 0) {
      result.engagementRate = Math.round((totalEngagements / result.impressions) * 10000) / 100;
    }
  } catch (err) {
    console.error("[LinkedIn] Post analytics fetch error:", err);
  }

  return result;
}

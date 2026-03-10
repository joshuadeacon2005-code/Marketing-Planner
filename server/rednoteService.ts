import crypto from "crypto";

const REDNOTE_AUTH_BASE = "https://open.xiaohongshu.com/oauth2/authorize";
const REDNOTE_API_BASE = "https://open.xiaohongshu.com/api";

const oauthStates = new Map<string, { userId: string; redirectUri: string; expiresAt: number }>();

function getRedNoteCredentials() {
  return {
    appId: process.env.REDNOTE_APP_ID,
    appSecret: process.env.REDNOTE_APP_SECRET,
  };
}

export function hasRedNoteCredentials(): boolean {
  const { appId, appSecret } = getRedNoteCredentials();
  return !!(appId && appSecret);
}

export function getRedNoteAuthUrl(
  userId: string,
  redirectUri: string
): { url: string; state: string } | null {
  const { appId } = getRedNoteCredentials();
  if (!appId) return null;

  const state = crypto.randomBytes(16).toString("hex");

  const entries = Array.from(oauthStates.entries());
  for (const [key, value] of entries) {
    if (value.expiresAt < Date.now()) {
      oauthStates.delete(key);
    }
  }

  oauthStates.set(state, {
    userId,
    redirectUri,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const scopes = "user.info,note.publish,note.read,data.read";

  const params = new URLSearchParams({
    app_id: appId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    response_type: "code",
  });

  return {
    url: `${REDNOTE_AUTH_BASE}?${params.toString()}`,
    state,
  };
}

export function getRedNoteOAuthState(
  state: string
): { userId: string; redirectUri: string } | null {
  const data = oauthStates.get(state);
  if (!data) return null;

  if (data.expiresAt < Date.now()) {
    oauthStates.delete(state);
    return null;
  }

  oauthStates.delete(state);
  return { userId: data.userId, redirectUri: data.redirectUri };
}

export async function exchangeRedNoteCode(
  code: string,
  redirectUri: string
): Promise<
  | { success: true; access_token: string; refresh_token: string; user_id: string; expires_in: number }
  | { success: false; error: string }
> {
  try {
    const { appId, appSecret } = getRedNoteCredentials();
    if (!appId || !appSecret) {
      return { success: false, error: "Missing RedNote credentials" };
    }

    const response = await fetch(`${REDNOTE_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[RedNote] Token exchange failed:", response.status, errorText);
      return { success: false, error: `RedNote returned ${response.status}: ${errorText}` };
    }

    const data = await response.json();

    if (data.error_code) {
      console.error("[RedNote] Token exchange error:", data.error_code, data.error_msg);
      return { success: false, error: data.error_msg || data.error_code };
    }

    return {
      success: true,
      access_token: data.data?.access_token || data.access_token,
      refresh_token: data.data?.refresh_token || data.refresh_token,
      user_id: data.data?.user_id || data.user_id || "",
      expires_in: data.data?.expires_in || data.expires_in || 86400,
    };
  } catch (error) {
    console.error("[RedNote] Token exchange exception:", error);
    return { success: false, error: String(error) };
  }
}

export async function refreshRedNoteToken(
  refreshToken: string
): Promise<
  | { success: true; access_token: string; refresh_token: string; expires_in: number }
  | { success: false; error: string }
> {
  try {
    const { appId, appSecret } = getRedNoteCredentials();
    if (!appId || !appSecret) {
      return { success: false, error: "Missing RedNote credentials" };
    }

    const response = await fetch(`${REDNOTE_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[RedNote] Token refresh failed:", response.status, errorText);
      return { success: false, error: `RedNote returned ${response.status}: ${errorText}` };
    }

    const data = await response.json();

    if (data.error_code) {
      console.error("[RedNote] Token refresh error:", data.error_code, data.error_msg);
      return { success: false, error: data.error_msg || data.error_code };
    }

    return {
      success: true,
      access_token: data.data?.access_token || data.access_token,
      refresh_token: data.data?.refresh_token || data.refresh_token,
      expires_in: data.data?.expires_in || data.expires_in || 86400,
    };
  } catch (error) {
    console.error("[RedNote] Token refresh exception:", error);
    return { success: false, error: String(error) };
  }
}

export async function publishToRedNote(
  accessToken: string,
  title: string,
  content: string,
  imageUrls?: string[]
): Promise<{ success: true; noteId: string } | { success: false; error: string }> {
  try {
    const body: any = {
      title,
      content,
    };

    if (imageUrls && imageUrls.length > 0) {
      body.images = imageUrls.map((url) => ({ url }));
    }

    const response = await fetch(`${REDNOTE_API_BASE}/note/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[RedNote] Publish failed:", response.status, errorText);
      return { success: false, error: `RedNote returned ${response.status}: ${errorText}` };
    }

    const data = await response.json();

    if (data.error_code) {
      console.error("[RedNote] Publish error:", data.error_code, data.error_msg);
      return { success: false, error: data.error_msg || data.error_code };
    }

    return {
      success: true,
      noteId: data.data?.note_id || "",
    };
  } catch (error) {
    console.error("[RedNote] Publish exception:", error);
    return { success: false, error: String(error) };
  }
}

export interface RedNoteNoteInsights {
  noteId: string;
  title?: string;
  likeCount?: number;
  commentCount?: number;
  collectCount?: number;
  shareCount?: number;
  viewCount?: number;
}

export async function fetchRedNoteInsights(
  accessToken: string,
  noteIds: string[]
): Promise<RedNoteNoteInsights[]> {
  try {
    const response = await fetch(`${REDNOTE_API_BASE}/note/insights`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        note_ids: noteIds,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[RedNote] Insights fetch failed:", response.status, errorText);
      return [];
    }

    const data = await response.json();

    if (data.error_code) {
      console.error("[RedNote] Insights error:", data.error_code, data.error_msg);
      return [];
    }

    return (data.data?.notes || []).map((note: any) => ({
      noteId: note.note_id,
      title: note.title,
      likeCount: note.like_count,
      commentCount: note.comment_count,
      collectCount: note.collect_count,
      shareCount: note.share_count,
      viewCount: note.view_count,
    }));
  } catch (error) {
    console.error("[RedNote] Insights exception:", error);
    return [];
  }
}

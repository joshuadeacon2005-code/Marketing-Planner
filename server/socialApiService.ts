import { publishToFacebook, publishToInstagram, fetchFacebookPostInsights, fetchInstagramPostInsights } from "./metaService";
import { publishTikTokPhoto, initTikTokVideoUpload, fetchTikTokVideoInsights } from "./tiktokService";
import { publishLinkedInPost, fetchLinkedInPostAnalytics } from "./linkedinService";
import { publishTweet, uploadTwitterMedia, fetchTweetMetrics } from "./twitterService";
import { publishToRedNote, fetchRedNoteInsights } from "./rednoteService";

export interface PublishResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface AnalyticsData {
  impressions?: number;
  reach?: number;
  engagements?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  videoViews?: number;
  avgWatchTime?: number;
  engagementRate?: string;
}

export async function publishToMetaVia(
  accountToken: string,
  pageId: string,
  caption: string,
  platform: "facebook" | "instagram",
  imageUrl?: string,
  igAccountId?: string
): Promise<PublishResult> {
  try {
    if (platform === "facebook") {
      const result = await publishToFacebook(accountToken, pageId, caption, imageUrl);
      if (result?.id) {
        return { success: true, postId: result.id, postUrl: `https://facebook.com/${result.id}` };
      }
      return { success: false, error: "Facebook publish returned no ID" };
    } else {
      if (!igAccountId) {
        return { success: false, error: "No Instagram Business Account linked to this page" };
      }
      if (!imageUrl) {
        return { success: false, error: "Instagram posts require an image URL" };
      }
      const result = await publishToInstagram(accountToken, igAccountId, caption, imageUrl);
      if (result?.id) {
        return { success: true, postId: result.id };
      }
      return { success: false, error: "Instagram publish returned no ID" };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Meta publish failed" };
  }
}

export async function publishToTikTokVia(
  accessToken: string,
  caption: string,
  imageUrls?: string[],
  videoUrl?: string
): Promise<PublishResult> {
  try {
    if (imageUrls && imageUrls.length > 0) {
      const result = await publishTikTokPhoto(accessToken, imageUrls, caption);
      if (result?.publish_id) {
        return { success: true, postId: result.publish_id };
      }
      return { success: false, error: "TikTok photo publish returned no publish_id" };
    } else if (videoUrl) {
      const result = await initTikTokVideoUpload(accessToken, caption);
      if (result?.publish_id) {
        return { success: true, postId: result.publish_id, postUrl: result.upload_url };
      }
      return { success: false, error: "TikTok video upload init returned no publish_id" };
    }
    return { success: false, error: "TikTok requires either image URLs or a video URL" };
  } catch (error: any) {
    return { success: false, error: error.message || "TikTok publish failed" };
  }
}

export async function publishToLinkedInVia(
  accessToken: string,
  authorUrn: string,
  text: string,
  imageUrl?: string
): Promise<PublishResult> {
  try {
    const result = await publishLinkedInPost(accessToken, authorUrn, text, imageUrl);
    if (result.success && result.postUrn) {
      return { success: true, postId: result.postUrn };
    }
    return { success: false, error: result.error || "LinkedIn publish failed" };
  } catch (error: any) {
    return { success: false, error: error.message || "LinkedIn publish failed" };
  }
}

export async function publishToTwitterVia(
  accessToken: string,
  text: string,
  imageUrl?: string
): Promise<PublishResult> {
  try {
    let mediaId: string | undefined | null;
    if (imageUrl) {
      mediaId = await uploadTwitterMedia(accessToken, imageUrl);
      if (!mediaId) {
        console.warn("[Social API] Twitter media upload failed, posting without image");
      }
    }
    const result = await publishTweet(accessToken, text, mediaId || undefined);
    if (result?.id) {
      return { success: true, postId: result.id, postUrl: `https://x.com/i/status/${result.id}` };
    }
    return { success: false, error: "Twitter publish returned no ID" };
  } catch (error: any) {
    return { success: false, error: error.message || "Twitter publish failed" };
  }
}

export async function publishContent(
  platform: string,
  accountCredentials: Record<string, string>,
  content: { caption: string; imageUrl?: string; imageUrls?: string[]; videoUrl?: string }
): Promise<PublishResult> {
  switch (platform.toLowerCase()) {
    case "facebook":
      return publishToMetaVia(accountCredentials.accessToken, accountCredentials.pageId, content.caption, "facebook", content.imageUrl);
    case "instagram":
      return publishToMetaVia(accountCredentials.accessToken, accountCredentials.pageId, content.caption, "instagram", content.imageUrl, accountCredentials.igAccountId);
    case "tiktok":
      return publishToTikTokVia(accountCredentials.accessToken, content.caption, content.imageUrls, content.videoUrl);
    case "linkedin":
      return publishToLinkedInVia(accountCredentials.accessToken, accountCredentials.authorUrn, content.caption, content.imageUrl);
    case "twitter":
    case "twitter/x":
      return publishToTwitterVia(accountCredentials.accessToken, content.caption, content.imageUrl);
    case "rednote":
      return publishToRedNoteVia(accountCredentials.accessToken, content.caption, content.imageUrl ? [content.imageUrl] : content.imageUrls);
    default:
      return { success: false, error: `Unsupported platform: ${platform}` };
  }
}

export async function fetchMetaAnalyticsVia(
  accountToken: string,
  postId: string,
  platform: "facebook" | "instagram"
): Promise<AnalyticsData | null> {
  try {
    if (platform === "facebook") {
      const insights = await fetchFacebookPostInsights(accountToken, postId);
      return {
        impressions: insights.views,
        reach: insights.reach,
        likes: insights.likes,
        comments: insights.comments,
        shares: insights.shares,
        engagementRate: insights.engagementRate?.toString(),
      };
    } else {
      const insights = await fetchInstagramPostInsights(accountToken, postId);
      return {
        impressions: insights.views,
        reach: insights.reach,
        likes: insights.likes,
        comments: insights.comments,
        shares: insights.shares,
        saves: insights.saves,
        engagementRate: insights.engagementRate?.toString(),
      };
    }
  } catch (error: any) {
    console.error(`[Social API] Meta analytics error:`, error.message);
    return null;
  }
}

export async function fetchTikTokAnalyticsVia(
  accessToken: string,
  videoId: string
): Promise<AnalyticsData | null> {
  try {
    const videos = await fetchTikTokVideoInsights(accessToken, [videoId]);
    if (videos && videos.length > 0) {
      const v = videos[0];
      return {
        videoViews: v.view_count,
        likes: v.like_count,
        comments: v.comment_count,
        shares: v.share_count,
      };
    }
    return null;
  } catch (error: any) {
    console.error(`[Social API] TikTok analytics error:`, error.message);
    return null;
  }
}

export async function fetchLinkedInAnalyticsVia(
  accessToken: string,
  postUrn: string
): Promise<AnalyticsData | null> {
  try {
    const analytics = await fetchLinkedInPostAnalytics(accessToken, postUrn);
    return {
      likes: analytics.likes,
      comments: analytics.comments,
      shares: analytics.shares,
    };
  } catch (error: any) {
    console.error(`[Social API] LinkedIn analytics error:`, error.message);
    return null;
  }
}

export async function fetchTwitterAnalyticsVia(
  accessToken: string,
  tweetId: string
): Promise<AnalyticsData | null> {
  try {
    const metrics = await fetchTweetMetrics(accessToken, tweetId);
    if (metrics) {
      return {
        impressions: metrics.impressions,
        likes: metrics.likes,
        shares: metrics.retweets,
        comments: metrics.replies,
        clicks: metrics.url_link_clicks,
      };
    }
    return null;
  } catch (error: any) {
    console.error(`[Social API] Twitter analytics error:`, error.message);
    return null;
  }
}

async function publishToRedNoteVia(
  accessToken: string,
  caption: string,
  imageUrls?: string[]
): Promise<PublishResult> {
  try {
    const title = caption.split("\n")[0]?.substring(0, 100) || "Post";
    const result = await publishToRedNote(accessToken, title, caption, imageUrls);
    if (result.success) {
      return { success: true, postId: result.noteId, postUrl: `https://www.xiaohongshu.com/explore/${result.noteId}` };
    }
    return { success: false, error: result.error };
  } catch (error: any) {
    console.error("[Social API] RedNote publish error:", error.message);
    return { success: false, error: error.message };
  }
}

async function fetchRedNoteAnalyticsVia(
  accessToken: string,
  noteId: string
): Promise<AnalyticsData | null> {
  try {
    const insights = await fetchRedNoteInsights(accessToken, [noteId]);
    if (insights && insights.length > 0) {
      const n = insights[0];
      return {
        likes: n.likeCount,
        comments: n.commentCount,
        shares: n.shareCount,
        saves: n.collectCount,
        videoViews: n.viewCount,
      };
    }
    return null;
  } catch (error: any) {
    console.error("[Social API] RedNote analytics error:", error.message);
    return null;
  }
}

export async function fetchAnalytics(
  platform: string,
  accountCredentials: Record<string, string>,
  postId: string
): Promise<AnalyticsData | null> {
  switch (platform.toLowerCase()) {
    case "facebook":
      return fetchMetaAnalyticsVia(accountCredentials.accessToken, postId, "facebook");
    case "instagram":
      return fetchMetaAnalyticsVia(accountCredentials.accessToken, postId, "instagram");
    case "tiktok":
      return fetchTikTokAnalyticsVia(accountCredentials.accessToken, postId);
    case "linkedin":
      return fetchLinkedInAnalyticsVia(accountCredentials.accessToken, postId);
    case "twitter":
    case "twitter/x":
      return fetchTwitterAnalyticsVia(accountCredentials.accessToken, postId);
    case "rednote":
      return fetchRedNoteAnalyticsVia(accountCredentials.accessToken, postId);
    default:
      return null;
  }
}

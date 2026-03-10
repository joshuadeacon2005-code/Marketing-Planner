import { storage } from "./storage";
import type { NotificationType, User, SocialPost, EmailCampaign, Event as MarketingEvent, AssetLibraryItem, Brand, Region } from "@shared/schema";
import { getCanvaNewDesignUrl, mapPlatformToDeliverableType, DELIVERABLE_PRESET_DIMENSIONS } from "@shared/schema";

interface SlackMessage {
  text: string;
  blocks?: Array<{
    type: string;
    text?: { type: string; text: string };
    fields?: Array<{ type: string; text: string }>;
    elements?: Array<any>;
    accessory?: any;
  }>;
}

function getSlackBotToken(): string | null {
  return process.env.SLACK_BOT_TOKEN || null;
}

async function sendSlackDM(userId: string, message: SlackMessage): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user?.slackUserId) {
      console.log(`User ${userId} has no Slack ID configured, skipping Slack DM`);
      return false;
    }

    const botToken = getSlackBotToken();
    if (!botToken) {
      console.log("Slack bot token not configured, skipping Slack DM");
      return false;
    }

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: user.slackUserId,
        text: message.text,
        blocks: message.blocks,
      }),
    });

    const data = await response.json() as { ok: boolean; error?: string };
    if (!data.ok) {
      console.error("Slack API error:", data.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send Slack DM:", error);
    return false;
  }
}

async function getBrandName(brandId: string | null): Promise<string> {
  if (!brandId) return "No Brand";
  const brand = await storage.getBrand(brandId);
  return brand?.name || "Unknown Brand";
}

async function getRegionName(regionId: string | null): Promise<string> {
  if (!regionId) return "No Region";
  const region = await storage.getRegion(regionId);
  return region?.name || "Unknown Region";
}

async function getUserName(userId: string | null): Promise<string> {
  if (!userId) return "Unassigned";
  const user = await storage.getUser(userId);
  return user?.name || "Unknown User";
}

async function findRelatedAssets(brandId: string | null, tags?: string[]): Promise<AssetLibraryItem[]> {
  if (!brandId) return [];
  const assets = await storage.getAssets({ brandId, assetType: "GRAPHIC" });
  return assets.slice(0, 5);
}

export async function notifyDesignerPostCreated(post: SocialPost): Promise<void> {
  if (!post.designerId) {
    console.log("No designer assigned to post, skipping notification");
    return;
  }

  const brandName = await getBrandName(post.brandId);
  const regionName = await getRegionName(post.regionId);
  const creatorName = await getUserName(post.createdById);
  const relatedAssets = await findRelatedAssets(post.brandId);

  await storage.createNotification({
    userId: post.designerId,
    type: "POST_CREATED_NEEDS_DESIGN",
    title: "New Social Post Needs Graphics",
    message: `A new ${post.platform} ${post.postFormat} post for ${brandName} (${regionName}) needs design work. Created by ${creatorName}.`,
    entityType: "social_post",
    entityId: post.id,
    isRead: false,
  });

  const assetsText = relatedAssets.length > 0 
    ? `\n\n*Related Brand Assets:*\n${relatedAssets.map(a => `• ${a.name}`).join("\n")}`
    : "";

  const deliverableType = mapPlatformToDeliverableType(post.platform, post.postFormat);
  const preset = DELIVERABLE_PRESET_DIMENSIONS[deliverableType];
  const canvaUrl = getCanvaNewDesignUrl(deliverableType);

  await sendSlackDM(post.designerId, {
    text: `New Social Post Needs Design`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New Social Post Needs Design* :art:\n\nA new ${post.platform} ${post.postFormat} post has been created and needs graphics.`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Brand:*\n${brandName}` },
          { type: "mrkdwn", text: `*Region:*\n${regionName}` },
          { type: "mrkdwn", text: `*Platform:*\n${post.platform}` },
          { type: "mrkdwn", text: `*Format:*\n${post.postFormat}` },
          { type: "mrkdwn", text: `*Created By:*\n${creatorName}` },
          { type: "mrkdwn", text: `*Scheduled:*\n${post.scheduledDate ? new Date(post.scheduledDate).toLocaleDateString() : "TBD"}` },
        ],
      },
      ...(preset ? [{
        type: "section",
        text: { type: "mrkdwn", text: `*Recommended Dimensions:* ${preset.label}` },
      }] : []),
      ...(post.caption ? [{
        type: "section",
        text: { type: "mrkdwn", text: `*Caption:*\n${post.caption.substring(0, 200)}${post.caption.length > 200 ? "..." : ""}` },
      }] : []),
      ...(assetsText ? [{
        type: "section",
        text: { type: "mrkdwn", text: assetsText },
      }] : []),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Create in Canva" },
            url: canvaUrl,
            style: "primary",
          },
        ],
      },
    ],
  });
}

export async function notifyPublisherGraphicsReady(post: SocialPost): Promise<void> {
  if (!post.publisherId) {
    console.log("No publisher assigned to post, skipping notification");
    return;
  }

  const brandName = await getBrandName(post.brandId);
  const regionName = await getRegionName(post.regionId);
  const designerName = await getUserName(post.designerId);

  await storage.createNotification({
    userId: post.publisherId,
    type: "POST_READY_TO_PUBLISH",
    title: "Social Post Ready for Publishing",
    message: `The ${post.platform} ${post.postFormat} post for ${brandName} (${regionName}) has graphics ready. Designed by ${designerName}.`,
    entityType: "social_post",
    entityId: post.id,
    isRead: false,
  });

  await sendSlackDM(post.publisherId, {
    text: `Social Post Ready for Publishing`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Social Post Ready for Publishing* :rocket:\n\nGraphics are complete and the post is ready to be scheduled/published.`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Brand:*\n${brandName}` },
          { type: "mrkdwn", text: `*Region:*\n${regionName}` },
          { type: "mrkdwn", text: `*Platform:*\n${post.platform}` },
          { type: "mrkdwn", text: `*Format:*\n${post.postFormat}` },
          { type: "mrkdwn", text: `*Designer:*\n${designerName}` },
          { type: "mrkdwn", text: `*Scheduled:*\n${post.scheduledDate ? new Date(post.scheduledDate).toLocaleDateString() : "TBD"}` },
        ],
      },
    ],
  });
}

export async function notifyDesignerEmailCreated(email: EmailCampaign): Promise<void> {
  if (!email.designerId) {
    console.log("No designer assigned to email campaign, skipping notification");
    return;
  }

  const brandName = await getBrandName(email.brandId);
  const regionName = await getRegionName(email.regionId);
  const creatorName = await getUserName(email.createdById);

  await storage.createNotification({
    userId: email.designerId,
    type: "EMAIL_CREATED_NEEDS_DESIGN",
    title: "New Email Campaign Needs Design",
    message: `A new ${email.emailType} email "${email.subject}" for ${brandName} (${regionName}) needs design work. Created by ${creatorName}.`,
    entityType: "email_campaign",
    entityId: email.id,
    isRead: false,
  });

  await sendSlackDM(email.designerId, {
    text: `New Email Campaign Needs Design`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New Email Campaign Needs Design* :email:\n\nA new email campaign has been created and needs design work.`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Subject:*\n${email.subject}` },
          { type: "mrkdwn", text: `*Type:*\n${email.emailType}` },
          { type: "mrkdwn", text: `*Brand:*\n${brandName}` },
          { type: "mrkdwn", text: `*Region:*\n${regionName}` },
          { type: "mrkdwn", text: `*Created By:*\n${creatorName}` },
          { type: "mrkdwn", text: `*Scheduled:*\n${email.scheduledDate ? new Date(email.scheduledDate).toLocaleDateString() : "TBD"}` },
        ],
      },
    ],
  });
}

export async function notifyPublisherEmailReady(email: EmailCampaign): Promise<void> {
  if (!email.publisherId) {
    console.log("No publisher assigned to email campaign, skipping notification");
    return;
  }

  const brandName = await getBrandName(email.brandId);
  const regionName = await getRegionName(email.regionId);
  const designerName = await getUserName(email.designerId);

  await storage.createNotification({
    userId: email.publisherId,
    type: "EMAIL_READY_TO_PUBLISH",
    title: "Email Campaign Ready to Send",
    message: `The ${email.emailType} email "${email.subject}" for ${brandName} (${regionName}) is ready to be scheduled/sent. Designed by ${designerName}.`,
    entityType: "email_campaign",
    entityId: email.id,
    isRead: false,
  });

  await sendSlackDM(email.publisherId, {
    text: `Email Campaign Ready to Send`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Email Campaign Ready to Send* :envelope:\n\nThe email design is complete and ready for scheduling.`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Subject:*\n${email.subject}` },
          { type: "mrkdwn", text: `*Type:*\n${email.emailType}` },
          { type: "mrkdwn", text: `*Brand:*\n${brandName}` },
          { type: "mrkdwn", text: `*Region:*\n${regionName}` },
          { type: "mrkdwn", text: `*Designer:*\n${designerName}` },
          { type: "mrkdwn", text: `*Scheduled:*\n${email.scheduledDate ? new Date(email.scheduledDate).toLocaleDateString() : "TBD"}` },
        ],
      },
    ],
  });
}

export async function notifyDesignerEventCreated(event: MarketingEvent): Promise<void> {
  if (!event.designerId) {
    console.log("No designer assigned to event, skipping notification");
    return;
  }

  const regionName = await getRegionName(event.regionId);
  const creatorName = await getUserName(event.createdById);

  await storage.createNotification({
    userId: event.designerId,
    type: "EVENT_CREATED_NEEDS_DESIGN",
    title: "New Event Needs Design Materials",
    message: `A new ${event.eventType} event "${event.name}" (${regionName}) needs design materials. Created by ${creatorName}.`,
    entityType: "event",
    entityId: event.id,
    isRead: false,
  });

  await sendSlackDM(event.designerId, {
    text: `New Event Needs Design Materials`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New Event Needs Design Materials* :calendar:\n\nA new event has been created and needs design work.`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Event:*\n${event.name}` },
          { type: "mrkdwn", text: `*Type:*\n${event.eventType}` },
          { type: "mrkdwn", text: `*Region:*\n${regionName}` },
          { type: "mrkdwn", text: `*Created By:*\n${creatorName}` },
          { type: "mrkdwn", text: `*Date:*\n${event.startDate ? new Date(event.startDate).toLocaleDateString() : "TBD"}` },
          { type: "mrkdwn", text: `*Location:*\n${event.location || "TBD"}` },
        ],
      },
    ],
  });
}

export async function notifyPublisherEventReady(event: MarketingEvent): Promise<void> {
  if (!event.publisherId) {
    console.log("No publisher assigned to event, skipping notification");
    return;
  }

  const regionName = await getRegionName(event.regionId);
  const designerName = await getUserName(event.designerId);

  await storage.createNotification({
    userId: event.publisherId,
    type: "EVENT_READY_TO_PUBLISH",
    title: "Event Materials Ready",
    message: `The ${event.eventType} event "${event.name}" (${regionName}) has all design materials ready. Designed by ${designerName}.`,
    entityType: "event",
    entityId: event.id,
    isRead: false,
  });

  await sendSlackDM(event.publisherId, {
    text: `Event Materials Ready`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Event Materials Ready* :sparkles:\n\nAll design materials for the event are complete.`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Event:*\n${event.name}` },
          { type: "mrkdwn", text: `*Type:*\n${event.eventType}` },
          { type: "mrkdwn", text: `*Region:*\n${regionName}` },
          { type: "mrkdwn", text: `*Designer:*\n${designerName}` },
          { type: "mrkdwn", text: `*Date:*\n${event.startDate ? new Date(event.startDate).toLocaleDateString() : "TBD"}` },
          { type: "mrkdwn", text: `*Location:*\n${event.location || "TBD"}` },
        ],
      },
    ],
  });
}

export async function notifyDeliverableStageChange(
  deliverable: { id: string; deliverableType: string; deliverableName: string | null; projectId: string; currentStage: string; designSpecs?: string | null; designDeadline?: Date | string | null },
  targetUserId: string | null,
  stageName: string,
  projectName?: string,
): Promise<void> {
  if (!targetUserId) return;

  const assigneeName = await getUserName(targetUserId);
  const displayName = deliverable.deliverableName || deliverable.deliverableType;

  await storage.createNotification({
    userId: targetUserId,
    type: "GENERAL" as NotificationType,
    title: `${displayName} moved to ${stageName}`,
    message: `The deliverable "${displayName}" in project "${projectName || 'Unknown'}" has moved to the ${stageName} stage and is assigned to you.`,
    entityType: "PROJECT",
    entityId: deliverable.projectId,
    isRead: false,
  });

  const isDesignStage = stageName === "Design" || deliverable.currentStage === "DESIGN";
  const preset = DELIVERABLE_PRESET_DIMENSIONS[deliverable.deliverableType];
  const canvaUrl = getCanvaNewDesignUrl(deliverable.deliverableType);

  const specsBlock = deliverable.designSpecs ? [{
    type: "section",
    text: { type: "mrkdwn", text: `*Design Specs:* ${deliverable.designSpecs}` },
  }] : (preset ? [{
    type: "section",
    text: { type: "mrkdwn", text: `*Recommended Dimensions:* ${preset.label}` },
  }] : []);

  const deadlineBlock = deliverable.designDeadline ? [{
    type: "section",
    text: { type: "mrkdwn", text: `*Designer Deadline:* ${new Date(deliverable.designDeadline).toLocaleDateString()}` },
  }] : [];

  const canvaBlock = isDesignStage ? [{
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "Create in Canva" },
        url: canvaUrl,
        style: "primary",
      },
    ],
  }] : [];

  await sendSlackDM(targetUserId, {
    text: `${displayName} is ready for ${stageName}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${displayName}* is ready for *${stageName}*\nProject: ${projectName || 'Unknown'}`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Deliverable:* ${displayName}` },
          { type: "mrkdwn", text: `*Stage:* ${stageName}` },
          { type: "mrkdwn", text: `*Assigned to:* ${assigneeName}` },
        ],
      },
      ...specsBlock,
      ...deadlineBlock,
      ...canvaBlock,
    ],
  });
}

export async function sendDeadlineReminder(params: {
  entityType: string;
  entityId: string;
  entityName: string;
  userId: string;
  deadlineDate: Date;
  reminderType: string;
  contextLabel?: string;
}): Promise<void> {
  const { entityType, entityId, entityName, userId, deadlineDate, reminderType, contextLabel } = params;

  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
  const timeRemaining = diffHours >= 24
    ? `${Math.round(diffHours / 24)} day(s)`
    : `${diffHours} hour(s)`;

  const deadlineStr = deadlineDate.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const entityLabels: Record<string, string> = {
    TASK: "Task",
    DELIVERABLE: "Deliverable",
    SOCIAL_POST: "Social Post",
    EMAIL_CAMPAIGN: "Email Campaign",
    EVENT: "Event",
    EVENT_DELIVERABLE: "Event Deliverable",
  };
  const label = entityLabels[entityType] || entityType;
  const contextSuffix = contextLabel ? ` (${contextLabel})` : "";

  await storage.createNotification({
    userId,
    type: "GENERAL",
    title: `${label} Deadline Reminder`,
    message: `"${entityName}"${contextSuffix} is due in ${timeRemaining} -- ${deadlineStr}`,
    entityType: entityType.toLowerCase(),
    entityId,
    isRead: false,
  });

  await sendSlackDM(userId, {
    text: `${label} Deadline Reminder: "${entityName}" is due in ${timeRemaining}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${label} Deadline Reminder*\n\n"${entityName}"${contextSuffix} is due in *${timeRemaining}*.\n*Deadline:* ${deadlineStr}`,
        },
      },
    ],
  });
}

export async function lookupSlackUserByEmail(email: string): Promise<string | null> {
  try {
    const botToken = getSlackBotToken();
    if (!botToken) {
      console.log("Slack bot token not configured");
      return null;
    }

    const response = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${botToken}`,
      },
    });

    const data = await response.json() as { ok: boolean; user?: { id: string }; error?: string };
    if (!data.ok) {
      console.error("Slack API error looking up user:", data.error);
      return null;
    }
    return data.user?.id || null;
  } catch (error) {
    console.error("Failed to lookup Slack user:", error);
    return null;
  }
}

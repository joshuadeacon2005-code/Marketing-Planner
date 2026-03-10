import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, decimal, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "MANAGER", "USER", "COPYWRITER", "DESIGNER", "MARKETING_MANAGER", "PUBLISHER"]);
export const platformEnum = pgEnum("platform", ["TIKTOK", "INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER", "REDNOTE"]);
export const postFormatEnum = pgEnum("post_format", ["POST", "CAROUSEL", "REEL", "VIDEO"]);
export const keyMessageTypeEnum = pgEnum("key_message_type", ["RETAILER_SUPPORT", "PRODUCT_EDUCATION", "BRAND_STORY", "LAUNCH"]);
export const assetStatusEnum = pgEnum("asset_status", ["PENDING", "IN_DESIGN", "FINAL", "PENDING_APPROVAL", "APPROVED", "NEEDS_REVISION"]);
export const copyStatusEnum = pgEnum("copy_status", ["DRAFT", "APPROVED", "POSTED"]);
export const emailTypeEnum = pgEnum("email_type", ["TRADE_PROMOTIONS", "PRODUCT_LAUNCHES", "RETAILER_TOOLKITS", "EVENT_INVITATIONS", "BRAND_UPDATES"]);
export const emailStatusEnum = pgEnum("email_status", ["PLANNING", "DESIGNING", "QA", "SCHEDULED", "SENT"]);
export const eventTypeEnum = pgEnum("event_type", ["TRADE_SHOW", "PRODUCT_LAUNCH", "RETAILER_TRAINING", "CONSUMER_EVENT", "INTERNAL_MEETING"]);
export const eventStatusEnum = pgEnum("event_status", ["PLANNING", "CONFIRMED", "COMPLETED", "CANCELLED"]);
export const taskStatusEnum = pgEnum("task_status", ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]);
export const taskPriorityEnum = pgEnum("task_priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const assetLibraryTypeEnum = pgEnum("asset_library_type", ["GRAPHIC", "DATA", "EMAIL_TEMPLATE", "VIDEO", "DOCUMENT"]);
export const discountTypeEnum = pgEnum("discount_type", ["PERCENTAGE", "FIXED_AMOUNT", "BOGO", "OTHER"]);
export const promotionStatusEnum = pgEnum("promotion_status", ["ACTIVE", "SCHEDULED", "ENDED"]);
export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
export const approvalStatusEnum = pgEnum("approval_status", ["PENDING", "APPROVED", "REJECTED"]);
export const approvalContentTypeEnum = pgEnum("approval_content_type", ["SOCIAL_POST", "EMAIL_CAMPAIGN", "EVENT"]);
export const deliverableTypeEnum = pgEnum("deliverable_type", [
  "INSTAGRAM_POST", "INSTAGRAM_STORY", "INSTAGRAM_REEL",
  "FACEBOOK_POST", "TIKTOK_POST", "LINKEDIN_POST", "TWITTER_POST", "REDNOTE_POST",
  "EDM_GRAPHIC", "WEBSITE_BANNER", "EVENT_MATERIAL"
]);
export const workflowStageEnum = pgEnum("workflow_stage", ["DESIGN", "COPYWRITING", "PUBLISHING", "COMPLETED"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("USER"),
  regionId: varchar("region_id").references(() => regions.id),
  isActive: boolean("is_active").notNull().default(true),
  slackUserId: text("slack_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Brands table - Updated with external links
export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#F7971C"),
  isActive: boolean("is_active").notNull().default(true),
  dreamPimUrl: text("dream_pim_url"),
  assetPortalUrl: text("asset_portal_url"),
  assetPortalName: text("asset_portal_name").default("Asset Portal"),
});

// Regions table
export const regions = pgTable("regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  timezone: text("timezone").notNull(),
});

// Brand-Region junction table (many-to-many)
export const brandRegions = pgTable("brand_regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  regionId: varchar("region_id").notNull().references(() => regions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: boolean("is_active").notNull().default(true),
});

// Promotions table - NEW
export const promotions = pgTable("promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  discountType: discountTypeEnum("discount_type").notNull(),
  discountValue: text("discount_value"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: promotionStatusEnum("status").notNull().default("SCHEDULED"),
  regions: text("regions").array(),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Recurrence Patterns table - NEW
export const recurrencePatterns = pgTable("recurrence_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  frequency: recurrenceFrequencyEnum("frequency").notNull(),
  interval: integer("interval").notNull().default(1),
  daysOfWeek: text("days_of_week").array(),
  dayOfMonth: integer("day_of_month"),
  endDate: timestamp("end_date"),
  occurrences: integer("occurrences"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Social Posts table - Updated with promotion and recurrence links
export const socialPosts = pgTable("social_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id),
  regionId: varchar("region_id").notNull().references(() => regions.id),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  promotionId: varchar("promotion_id").references(() => promotions.id, { onDelete: "set null" }),
  platform: platformEnum("platform").notNull(),
  postFormat: postFormatEnum("post_format").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  caption: text("caption"),
  keyMessage: keyMessageTypeEnum("key_message"),
  assetStatus: assetStatusEnum("asset_status").notNull().default("PENDING"),
  copyStatus: copyStatusEnum("copy_status").notNull().default("DRAFT"),
  assetUrl: text("asset_url"),
  copywriterId: varchar("copywriter_id").references(() => users.id),
  copyAssignedAt: timestamp("copy_assigned_at"),
  copyCompletedAt: timestamp("copy_completed_at"),
  designerId: varchar("designer_id").references(() => users.id),
  designAssignedAt: timestamp("design_assigned_at"),
  designCompletedAt: timestamp("design_completed_at"),
  publisherId: varchar("publisher_id").references(() => users.id),
  publishAssignedAt: timestamp("publish_assigned_at"),
  parentId: varchar("parent_id"),
  recurrencePatternId: varchar("recurrence_pattern_id").references(() => recurrencePatterns.id, { onDelete: "set null" }),
  isRecurrenceParent: boolean("is_recurrence_parent").default(false),
  recurrenceParentId: varchar("recurrence_parent_id"),
  metaPageId: varchar("meta_page_id").references(() => metaPageMappings.id, { onDelete: "set null" }),
  metaPostId: text("meta_post_id"),
  metaPublishedAt: timestamp("meta_published_at"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Email Campaigns table - Updated with promotion and recurrence links
export const emailCampaigns = pgTable("email_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  brandId: varchar("brand_id").notNull().references(() => brands.id),
  regionId: varchar("region_id").notNull().references(() => regions.id),
  promotionId: varchar("promotion_id").references(() => promotions.id, { onDelete: "set null" }),
  emailType: emailTypeEnum("email_type").notNull(),
  status: emailStatusEnum("status").notNull().default("PLANNING"),
  scheduledDate: timestamp("scheduled_date"),
  subject: text("subject"),
  previewText: text("preview_text"),
  targetAudience: text("target_audience").array(),
  openRate: decimal("open_rate", { precision: 5, scale: 2 }),
  clickRate: decimal("click_rate", { precision: 5, scale: 2 }),
  designerId: varchar("designer_id").references(() => users.id),
  publisherId: varchar("publisher_id").references(() => users.id),
  recurrencePatternId: varchar("recurrence_pattern_id").references(() => recurrencePatterns.id, { onDelete: "set null" }),
  isRecurrenceParent: boolean("is_recurrence_parent").default(false),
  recurrenceParentId: varchar("recurrence_parent_id"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Events table - Updated with recurrence links
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  eventType: eventTypeEnum("event_type"),
  status: eventStatusEnum("status").notNull().default("PLANNING"),
  regionId: varchar("region_id").references(() => regions.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  location: text("location"),
  description: text("description"),
  plannedBudget: decimal("planned_budget", { precision: 12, scale: 2 }),
  actualBudget: decimal("actual_budget", { precision: 12, scale: 2 }),
  notes: text("notes"),
  isPromotion: boolean("is_promotion").notNull().default(false),
  promotionDetails: text("promotion_details"),
  designerId: varchar("designer_id").references(() => users.id),
  publisherId: varchar("publisher_id").references(() => users.id),
  parentId: varchar("parent_id"),
  recurrencePatternId: varchar("recurrence_pattern_id").references(() => recurrencePatterns.id, { onDelete: "set null" }),
  isRecurrenceParent: boolean("is_recurrence_parent").default(false),
  recurrenceParentId: varchar("recurrence_parent_id"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Event Brands junction table
export const eventBrands = pgTable("event_brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  brandId: varchar("brand_id").notNull().references(() => brands.id),
});

// Event Deliverables table
export const eventDeliverables = pgTable("event_deliverables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  dueDate: timestamp("due_date"),
  assigneeId: varchar("assignee_id").references(() => users.id),
});

// Asset Library table
export const assetLibrary = pgTable("asset_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  assetType: assetLibraryTypeEnum("asset_type").notNull(),
  fileUrl: text("file_url"),
  thumbnailUrl: text("thumbnail_url"),
  content: text("content"),
  brandId: varchar("brand_id").references(() => brands.id),
  tags: text("tags").array(),
  isPublic: boolean("is_public").notNull().default(true),
  source: text("source").default("UPLOAD"),
  canvaAssetId: text("canva_asset_id"),
  canvaDesignId: text("canva_design_id"),
  canvaEditUrl: text("canva_edit_url"),
  canvaThumbnailUrl: text("canva_thumbnail_url"),
  autoLinkedFromPost: boolean("auto_linked_from_post").default(false),
  linkedPostId: varchar("linked_post_id"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Notifications table
export const notificationTypeEnum = pgEnum("notification_type", [
  "POST_CREATED_NEEDS_DESIGN",
  "POST_DESIGN_COMPLETE", 
  "POST_READY_TO_PUBLISH",
  "EMAIL_CREATED_NEEDS_DESIGN",
  "EMAIL_DESIGN_COMPLETE",
  "EMAIL_READY_TO_PUBLISH",
  "EVENT_CREATED_NEEDS_DESIGN",
  "EVENT_DESIGN_COMPLETE",
  "EVENT_READY_TO_PUBLISH",
  "TASK_ASSIGNED",
  "APPROVAL_REQUESTED",
  "APPROVAL_APPROVED",
  "APPROVAL_REJECTED",
  "GENERAL",
  "COPY_ASSIGNED",
  "COPY_READY",
  "COPY_REVISION_NEEDED"
]);

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"),
  entityId: varchar("entity_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// App Settings table (for Slack webhook, etc.)
export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("BACKLOG"),
  priority: taskPriorityEnum("priority").notNull().default("MEDIUM"),
  brandId: varchar("brand_id").references(() => brands.id),
  regionId: varchar("region_id").references(() => regions.id),
  assigneeId: varchar("assignee_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  linkedSocialPostId: varchar("linked_social_post_id").references(() => socialPosts.id),
  linkedEmailCampaignId: varchar("linked_email_campaign_id").references(() => emailCampaigns.id),
  linkedEventId: varchar("linked_event_id").references(() => events.id),
  parentId: varchar("parent_id"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User Preferences table - NEW
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  calendarView: text("calendar_view").default("month"),
  calendarFilters: text("calendar_filters").default("{}"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Approvals table - NEW
export const approvals = pgTable("approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentType: approvalContentTypeEnum("content_type").notNull(),
  contentId: varchar("content_id").notNull(),
  status: approvalStatusEnum("status").notNull().default("PENDING"),
  requestedById: varchar("requested_by_id").notNull().references(() => users.id),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  assetPreviewUrl: text("asset_preview_url"),
  rejectionReason: text("rejection_reason"),
  requestedChanges: text("requested_changes"),
  slackMessageTs: text("slack_message_ts"),
  slackChannelId: text("slack_channel_id"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// Collaboration Profiles table
export const collaborationProfiles = pgTable("collaboration_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  handle: text("handle"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  brandId: varchar("brand_id").references(() => brands.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Post Collaborations junction table
export const postCollaborations = pgTable("post_collaborations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => socialPosts.id, { onDelete: "cascade" }),
  profileId: varchar("profile_id").notNull().references(() => collaborationProfiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Post Tags table
export const postTags = pgTable("post_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color").default("#6B7280"),
  description: text("description"),
  category: text("category"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Post Tag Relations junction table
export const postTagRelations = pgTable("post_tag_relations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => socialPosts.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => postTags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Post Performance table
export const postPerformance = pgTable("post_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => socialPosts.id, { onDelete: "cascade" }),
  followers: integer("followers"),
  views: integer("views"),
  likes: integer("likes"),
  clicks: integer("clicks"),
  shares: integer("shares"),
  comments: integer("comments"),
  saves: integer("saves"),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }),
  postUrl: text("post_url"),
  remarks: text("remarks"),
  recordedAt: timestamp("recorded_at").notNull(),
  recordedById: varchar("recorded_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Meta Integration tables
export const metaIntegrations = pgTable("meta_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  userAccessToken: text("user_access_token"),
  metaUserId: text("meta_user_id"),
  selectedPageId: text("selected_page_id"),
  selectedPageName: text("selected_page_name"),
  selectedPageAccessToken: text("selected_page_access_token"),
  instagramBusinessAccountId: text("instagram_business_account_id"),
  tokenExpiresAt: timestamp("token_expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const metaPageMappings = pgTable("meta_page_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metaIntegrationId: varchar("meta_integration_id").notNull().references(() => metaIntegrations.id, { onDelete: "cascade" }),
  pageId: text("page_id").notNull(),
  pageName: text("page_name").notNull(),
  pageAccessToken: text("page_access_token").notNull(),
  instagramBusinessAccountId: text("instagram_business_account_id"),
  regionId: varchar("region_id").references(() => regions.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const metaPkceStates = pgTable("meta_pkce_states", {
  state: varchar("state").primaryKey(),
  userId: varchar("user_id").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Canva PKCE States table (for OAuth flow persistence)
export const canvaPkceStates = pgTable("canva_pkce_states", {
  state: varchar("state").primaryKey(),
  codeVerifier: text("code_verifier").notNull(),
  userId: varchar("user_id").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Canva Integrations table
export const canvaIntegrations = pgTable("canva_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  canvaAccessToken: text("canva_access_token"),
  canvaRefreshToken: text("canva_refresh_token"),
  canvaUserId: text("canva_user_id"),
  canvaTeamId: text("canva_team_id"),
  tokenExpiresAt: timestamp("token_expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Social Accounts table
export const socialAccounts = pgTable("social_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: varchar("platform", { length: 50 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountHandle: varchar("account_handle", { length: 255 }),
  accountId: varchar("account_id", { length: 255 }),
  pageId: varchar("page_id", { length: 255 }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  brandId: varchar("brand_id").references(() => brands.id),
  regionId: varchar("region_id").references(() => regions.id),
  isActive: boolean("is_active").default(true),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tagged Creators table
export const taggedCreators = pgTable("tagged_creators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: varchar("platform", { length: 50 }).notNull(),
  handle: varchar("handle", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  brandId: varchar("brand_id").references(() => brands.id),
  usageCount: integer("usage_count").default(1),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  firstUsedAt: timestamp("first_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  regionId: varchar("region_id").notNull().references(() => regions.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  promotionId: varchar("promotion_id").references(() => promotions.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  defaultDesignerId: varchar("default_designer_id").references(() => users.id),
  defaultCopywriterId: varchar("default_copywriter_id").references(() => users.id),
  defaultPublisherId: varchar("default_publisher_id").references(() => users.id),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Project Deliverables table
export const projectDeliverables = pgTable("project_deliverables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  deliverableType: deliverableTypeEnum("deliverable_type").notNull(),
  deliverableName: varchar("deliverable_name", { length: 255 }),
  currentStage: workflowStageEnum("current_stage").notNull().default("DESIGN"),
  designerId: varchar("designer_id").references(() => users.id),
  designAssignedAt: timestamp("design_assigned_at"),
  designCompletedAt: timestamp("design_completed_at"),
  copywriterId: varchar("copywriter_id").references(() => users.id),
  copyAssignedAt: timestamp("copy_assigned_at"),
  copyCompletedAt: timestamp("copy_completed_at"),
  publisherId: varchar("publisher_id").references(() => users.id),
  publishAssignedAt: timestamp("publish_assigned_at"),
  publishCompletedAt: timestamp("publish_completed_at"),
  canvaLink: text("canva_link"),
  canvaDesignId: varchar("canva_design_id", { length: 255 }),
  assetImageUrl: text("asset_image_url"),
  assetThumbnailUrl: text("asset_thumbnail_url"),
  aiSuggestedCopy: text("ai_suggested_copy"),
  aiSuggestedHashtags: text("ai_suggested_hashtags").array(),
  aiAnalysisCompletedAt: timestamp("ai_analysis_completed_at"),
  finalCopy: text("final_copy"),
  finalHashtags: text("final_hashtags").array(),
  taggedUsers: text("tagged_users").array(),
  scheduledPublishDate: timestamp("scheduled_publish_date"),
  actualPublishDate: timestamp("actual_publish_date"),
  postUrl: text("post_url"),
  metaPostId: text("meta_post_id"),
  metaPageId: varchar("meta_page_id").references(() => metaPageMappings.id, { onDelete: "set null" }),
  publishedAccountId: varchar("published_account_id").references(() => socialAccounts.id),
  publishNotes: text("publish_notes"),
  revisionRequested: boolean("revision_requested").default(false),
  revisionNotes: text("revision_notes"),
  revisionRequestedById: varchar("revision_requested_by_id").references(() => users.id),
  revisionRequestedAt: timestamp("revision_requested_at"),
  designSpecs: text("design_specs"),
  designDeadline: timestamp("design_deadline"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Deliverable Reference Images table
export const deliverableReferences = pgTable("deliverable_references", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deliverableId: varchar("deliverable_id").notNull().references(() => projectDeliverables.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Project Activity Log table
export const projectActivityLog = pgTable("project_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Deliverable Analytics table
export const deliverableAnalytics = pgTable("deliverable_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deliverableId: varchar("deliverable_id").notNull().references(() => projectDeliverables.id, { onDelete: "cascade" }),
  impressions: integer("impressions").default(0),
  reach: integer("reach").default(0),
  engagement: integer("engagement").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  saves: integer("saves").default(0),
  clicks: integer("clicks").default(0),
  videoViews: integer("video_views").default(0),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }).default("0"),
  platform: varchar("platform", { length: 50 }),
  rawResponse: jsonb("raw_response"),
  manualImpressions: integer("manual_impressions"),
  manualEngagement: integer("manual_engagement"),
  manualNotes: text("manual_notes"),
  designTimeHours: decimal("design_time_hours", { precision: 10, scale: 2 }),
  copywritingTimeHours: decimal("copywriting_time_hours", { precision: 10, scale: 2 }),
  totalTimeHours: decimal("total_time_hours", { precision: 10, scale: 2 }),
  lastFetchedAt: timestamp("last_fetched_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Hashtag Library table
export const hashtagLibrary = pgTable("hashtag_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hashtag: varchar("hashtag", { length: 255 }).notNull(),
  normalizedTag: varchar("normalized_tag", { length: 255 }).notNull(),
  brandId: varchar("brand_id").references(() => brands.id, { onDelete: "cascade" }),
  regionId: varchar("region_id").references(() => regions.id),
  usageCount: integer("usage_count").default(1),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  clusterId: varchar("cluster_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Slack Notifications table
export const slackNotifications = pgTable("slack_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deliverableId: varchar("deliverable_id").references(() => projectDeliverables.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  notificationType: varchar("notification_type", { length: 50 }).notNull(),
  recipientUserId: varchar("recipient_user_id").notNull().references(() => users.id),
  slackChannel: varchar("slack_channel", { length: 100 }),
  slackMessageTs: varchar("slack_message_ts", { length: 100 }),
  buttonsActive: boolean("buttons_active").default(true),
  buttonClicked: varchar("button_clicked", { length: 50 }),
  clickedAt: timestamp("clicked_at"),
  sentAt: timestamp("sent_at").defaultNow(),
});

// Promotion Reminders table
export const promotionReminders = pgTable("promotion_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promotionId: varchar("promotion_id").notNull().references(() => promotions.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id),
  reminderDate: date("reminder_date").notNull(),
  reminderTime: text("reminder_time").default("09:00:00"),
  reminderType: varchar("reminder_type", { length: 50 }).default("END_OF_PROMOTION"),
  sent: boolean("sent").default(false),
  sentAt: timestamp("sent_at"),
  notifyCreator: boolean("notify_creator").default(true),
  notifyPublisher: boolean("notify_publisher").default(true),
  additionalRecipients: text("additional_recipients").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Deadline Reminders tracking table (prevents duplicate notifications)
export const deadlineReminders = pgTable("deadline_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  reminderType: text("reminder_type").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  region: one(regions, { fields: [users.regionId], references: [regions.id] }),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  promotions: many(promotions),
  regions: many(brandRegions),
}));

export const brandRegionsRelations = relations(brandRegions, ({ one }) => ({
  brand: one(brands, { fields: [brandRegions.brandId], references: [brands.id] }),
  region: one(regions, { fields: [brandRegions.regionId], references: [regions.id] }),
}));

export const promotionsRelations = relations(promotions, ({ one }) => ({
  brand: one(brands, { fields: [promotions.brandId], references: [brands.id] }),
  createdBy: one(users, { fields: [promotions.createdById], references: [users.id] }),
}));

export const socialPostsRelations = relations(socialPosts, ({ one }) => ({
  brand: one(brands, { fields: [socialPosts.brandId], references: [brands.id] }),
  region: one(regions, { fields: [socialPosts.regionId], references: [regions.id] }),
  campaign: one(campaigns, { fields: [socialPosts.campaignId], references: [campaigns.id] }),
  promotion: one(promotions, { fields: [socialPosts.promotionId], references: [promotions.id] }),
  recurrencePattern: one(recurrencePatterns, { fields: [socialPosts.recurrencePatternId], references: [recurrencePatterns.id] }),
  createdBy: one(users, { fields: [socialPosts.createdById], references: [users.id] }),
}));

export const emailCampaignsRelations = relations(emailCampaigns, ({ one }) => ({
  brand: one(brands, { fields: [emailCampaigns.brandId], references: [brands.id] }),
  region: one(regions, { fields: [emailCampaigns.regionId], references: [regions.id] }),
  promotion: one(promotions, { fields: [emailCampaigns.promotionId], references: [promotions.id] }),
  recurrencePattern: one(recurrencePatterns, { fields: [emailCampaigns.recurrencePatternId], references: [recurrencePatterns.id] }),
  createdBy: one(users, { fields: [emailCampaigns.createdById], references: [users.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  region: one(regions, { fields: [events.regionId], references: [regions.id] }),
  recurrencePattern: one(recurrencePatterns, { fields: [events.recurrencePatternId], references: [recurrencePatterns.id] }),
  createdBy: one(users, { fields: [events.createdById], references: [users.id] }),
  brands: many(eventBrands),
  deliverables: many(eventDeliverables),
}));

export const eventBrandsRelations = relations(eventBrands, ({ one }) => ({
  event: one(events, { fields: [eventBrands.eventId], references: [events.id] }),
  brand: one(brands, { fields: [eventBrands.brandId], references: [brands.id] }),
}));

export const eventDeliverablesRelations = relations(eventDeliverables, ({ one }) => ({
  event: one(events, { fields: [eventDeliverables.eventId], references: [events.id] }),
  assignee: one(users, { fields: [eventDeliverables.assigneeId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  brand: one(brands, { fields: [tasks.brandId], references: [brands.id] }),
  region: one(regions, { fields: [tasks.regionId], references: [regions.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
  createdBy: one(users, { fields: [tasks.createdById], references: [users.id] }),
  linkedSocialPost: one(socialPosts, { fields: [tasks.linkedSocialPostId], references: [socialPosts.id] }),
  linkedEmailCampaign: one(emailCampaigns, { fields: [tasks.linkedEmailCampaignId], references: [emailCampaigns.id] }),
  linkedEvent: one(events, { fields: [tasks.linkedEventId], references: [events.id] }),
}));

export const assetLibraryRelations = relations(assetLibrary, ({ one }) => ({
  brand: one(brands, { fields: [assetLibrary.brandId], references: [brands.id] }),
  createdBy: one(users, { fields: [assetLibrary.createdById], references: [users.id] }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
  requestedBy: one(users, { fields: [approvals.requestedById], references: [users.id] }),
  reviewer: one(users, { fields: [approvals.reviewerId], references: [users.id] }),
}));

export const collaborationProfilesRelations = relations(collaborationProfiles, ({ one }) => ({
  brand: one(brands, { fields: [collaborationProfiles.brandId], references: [brands.id] }),
}));

export const postCollaborationsRelations = relations(postCollaborations, ({ one }) => ({
  post: one(socialPosts, { fields: [postCollaborations.postId], references: [socialPosts.id] }),
  profile: one(collaborationProfiles, { fields: [postCollaborations.profileId], references: [collaborationProfiles.id] }),
}));

export const postTagsRelations = relations(postTags, ({ many }) => ({
  posts: many(postTagRelations),
}));

export const postTagRelationsRelations = relations(postTagRelations, ({ one }) => ({
  post: one(socialPosts, { fields: [postTagRelations.postId], references: [socialPosts.id] }),
  tag: one(postTags, { fields: [postTagRelations.tagId], references: [postTags.id] }),
}));

export const postPerformanceRelations = relations(postPerformance, ({ one }) => ({
  post: one(socialPosts, { fields: [postPerformance.postId], references: [socialPosts.id] }),
  recordedBy: one(users, { fields: [postPerformance.recordedById], references: [users.id] }),
}));

export const canvaIntegrationsRelations = relations(canvaIntegrations, ({ one }) => ({
  user: one(users, { fields: [canvaIntegrations.userId], references: [users.id] }),
}));

export const metaIntegrationsRelations = relations(metaIntegrations, ({ one }) => ({
  user: one(users, { fields: [metaIntegrations.userId], references: [users.id] }),
}));

export const socialAccountsRelations = relations(socialAccounts, ({ one }) => ({
  brand: one(brands, { fields: [socialAccounts.brandId], references: [brands.id] }),
  region: one(regions, { fields: [socialAccounts.regionId], references: [regions.id] }),
}));

export const taggedCreatorsRelations = relations(taggedCreators, ({ one }) => ({
  brand: one(brands, { fields: [taggedCreators.brandId], references: [brands.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  brand: one(brands, { fields: [projects.brandId], references: [brands.id] }),
  region: one(regions, { fields: [projects.regionId], references: [regions.id] }),
  campaign: one(campaigns, { fields: [projects.campaignId], references: [campaigns.id] }),
  promotion: one(promotions, { fields: [projects.promotionId], references: [promotions.id] }),
  defaultDesigner: one(users, { fields: [projects.defaultDesignerId], references: [users.id] }),
  defaultCopywriter: one(users, { fields: [projects.defaultCopywriterId], references: [users.id] }),
  defaultPublisher: one(users, { fields: [projects.defaultPublisherId], references: [users.id] }),
  createdBy: one(users, { fields: [projects.createdById], references: [users.id] }),
  deliverables: many(projectDeliverables),
  activityLog: many(projectActivityLog),
}));

export const projectDeliverablesRelations = relations(projectDeliverables, ({ one, many }) => ({
  project: one(projects, { fields: [projectDeliverables.projectId], references: [projects.id] }),
  designer: one(users, { fields: [projectDeliverables.designerId], references: [users.id] }),
  copywriter: one(users, { fields: [projectDeliverables.copywriterId], references: [users.id] }),
  publisher: one(users, { fields: [projectDeliverables.publisherId], references: [users.id] }),
  publishedAccount: one(socialAccounts, { fields: [projectDeliverables.publishedAccountId], references: [socialAccounts.id] }),
  revisionRequestedBy: one(users, { fields: [projectDeliverables.revisionRequestedById], references: [users.id] }),
  references: many(deliverableReferences),
}));

export const deliverableReferencesRelations = relations(deliverableReferences, ({ one }) => ({
  deliverable: one(projectDeliverables, { fields: [deliverableReferences.deliverableId], references: [projectDeliverables.id] }),
}));

export const projectActivityLogRelations = relations(projectActivityLog, ({ one }) => ({
  project: one(projects, { fields: [projectActivityLog.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectActivityLog.userId], references: [users.id] }),
}));

export const deliverableAnalyticsRelations = relations(deliverableAnalytics, ({ one }) => ({
  deliverable: one(projectDeliverables, { fields: [deliverableAnalytics.deliverableId], references: [projectDeliverables.id] }),
}));

export const hashtagLibraryRelations = relations(hashtagLibrary, ({ one }) => ({
  brand: one(brands, { fields: [hashtagLibrary.brandId], references: [brands.id] }),
  region: one(regions, { fields: [hashtagLibrary.regionId], references: [regions.id] }),
}));

export const slackNotificationsRelations = relations(slackNotifications, ({ one }) => ({
  deliverable: one(projectDeliverables, { fields: [slackNotifications.deliverableId], references: [projectDeliverables.id] }),
  project: one(projects, { fields: [slackNotifications.projectId], references: [projects.id] }),
  recipientUser: one(users, { fields: [slackNotifications.recipientUserId], references: [users.id] }),
}));

export const promotionRemindersRelations = relations(promotionReminders, ({ one }) => ({
  promotion: one(promotions, { fields: [promotionReminders.promotionId], references: [promotions.id] }),
  project: one(projects, { fields: [promotionReminders.projectId], references: [projects.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertBrandSchema = createInsertSchema(brands).omit({ id: true });
export const insertRegionSchema = createInsertSchema(regions).omit({ id: true });
export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true });
export const insertPromotionSchema = createInsertSchema(promotions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRecurrencePatternSchema = createInsertSchema(recurrencePatterns).omit({ id: true, createdAt: true });
export const insertSocialPostSchema = createInsertSchema(socialPosts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  eventType: z.string().optional().nullable(),
  regionId: z.string().optional().nullable(),
  startDate: z.union([z.string(), z.date()]).optional().nullable(),
  endDate: z.union([z.string(), z.date()]).optional().nullable(),
});
export const insertEventBrandSchema = createInsertSchema(eventBrands).omit({ id: true });
export const insertBrandRegionSchema = createInsertSchema(brandRegions).omit({ id: true, createdAt: true });
export const insertEventDeliverableSchema = createInsertSchema(eventDeliverables).omit({ id: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssetLibrarySchema = createInsertSchema(assetLibrary).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertAppSettingSchema = createInsertSchema(appSettings).omit({ id: true, updatedAt: true });
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApprovalSchema = createInsertSchema(approvals).omit({ id: true, requestedAt: true });
export const insertCollaborationProfileSchema = createInsertSchema(collaborationProfiles).omit({ id: true, createdAt: true });
export const insertPostCollaborationSchema = createInsertSchema(postCollaborations).omit({ id: true, createdAt: true });
export const insertPostTagSchema = createInsertSchema(postTags).omit({ id: true, createdAt: true });
export const insertPostTagRelationSchema = createInsertSchema(postTagRelations).omit({ id: true, createdAt: true });
export const insertPostPerformanceSchema = createInsertSchema(postPerformance).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCanvaIntegrationSchema = createInsertSchema(canvaIntegrations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMetaIntegrationSchema = createInsertSchema(metaIntegrations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMetaPageMappingSchema = createInsertSchema(metaPageMappings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSocialAccountSchema = createInsertSchema(socialAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaggedCreatorSchema = createInsertSchema(taggedCreators).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectDeliverableSchema = createInsertSchema(projectDeliverables).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeliverableReferenceSchema = createInsertSchema(deliverableReferences).omit({ id: true, createdAt: true });
export const insertProjectActivityLogSchema = createInsertSchema(projectActivityLog).omit({ id: true, createdAt: true });
export const insertDeliverableAnalyticsSchema = createInsertSchema(deliverableAnalytics).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHashtagLibrarySchema = createInsertSchema(hashtagLibrary).omit({ id: true, createdAt: true });
export const insertSlackNotificationSchema = createInsertSchema(slackNotifications).omit({ id: true, sentAt: true });
export const insertPromotionReminderSchema = createInsertSchema(promotionReminders).omit({ id: true, createdAt: true });
export const insertDeadlineReminderSchema = createInsertSchema(deadlineReminders).omit({ id: true, sentAt: true });

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Region = typeof regions.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type RecurrencePattern = typeof recurrencePatterns.$inferSelect;
export type InsertRecurrencePattern = z.infer<typeof insertRecurrencePatternSchema>;
export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventBrand = typeof eventBrands.$inferSelect;
export type InsertEventBrand = z.infer<typeof insertEventBrandSchema>;
export type BrandRegion = typeof brandRegions.$inferSelect;
export type InsertBrandRegion = z.infer<typeof insertBrandRegionSchema>;
export type EventDeliverable = typeof eventDeliverables.$inferSelect;
export type InsertEventDeliverable = z.infer<typeof insertEventDeliverableSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type AssetLibraryItem = typeof assetLibrary.$inferSelect;
export type InsertAssetLibraryItem = z.infer<typeof insertAssetLibrarySchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferencesSchema>;
export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type CollaborationProfile = typeof collaborationProfiles.$inferSelect;
export type InsertCollaborationProfile = z.infer<typeof insertCollaborationProfileSchema>;
export type PostCollaboration = typeof postCollaborations.$inferSelect;
export type InsertPostCollaboration = z.infer<typeof insertPostCollaborationSchema>;
export type PostTag = typeof postTags.$inferSelect;
export type InsertPostTag = z.infer<typeof insertPostTagSchema>;
export type PostTagRelation = typeof postTagRelations.$inferSelect;
export type InsertPostTagRelation = z.infer<typeof insertPostTagRelationSchema>;
export type PostPerformanceRecord = typeof postPerformance.$inferSelect;
export type InsertPostPerformance = z.infer<typeof insertPostPerformanceSchema>;
export type CanvaIntegration = typeof canvaIntegrations.$inferSelect;
export type InsertCanvaIntegration = z.infer<typeof insertCanvaIntegrationSchema>;
export type MetaIntegration = typeof metaIntegrations.$inferSelect;
export type InsertMetaIntegration = z.infer<typeof insertMetaIntegrationSchema>;
export type MetaPageMapping = typeof metaPageMappings.$inferSelect;
export type InsertMetaPageMapping = z.infer<typeof insertMetaPageMappingSchema>;
export type SocialAccount = typeof socialAccounts.$inferSelect;
export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;
export type TaggedCreator = typeof taggedCreators.$inferSelect;
export type InsertTaggedCreator = z.infer<typeof insertTaggedCreatorSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectDeliverable = typeof projectDeliverables.$inferSelect;
export type InsertProjectDeliverable = z.infer<typeof insertProjectDeliverableSchema>;
export type DeliverableReference = typeof deliverableReferences.$inferSelect;
export type InsertDeliverableReference = z.infer<typeof insertDeliverableReferenceSchema>;
export type ProjectActivityLogEntry = typeof projectActivityLog.$inferSelect;
export type InsertProjectActivityLog = z.infer<typeof insertProjectActivityLogSchema>;
export type DeliverableAnalytic = typeof deliverableAnalytics.$inferSelect;
export type InsertDeliverableAnalytic = z.infer<typeof insertDeliverableAnalyticsSchema>;
export type HashtagLibraryItem = typeof hashtagLibrary.$inferSelect;
export type InsertHashtagLibraryItem = z.infer<typeof insertHashtagLibrarySchema>;
export type SlackNotification = typeof slackNotifications.$inferSelect;
export type InsertSlackNotification = z.infer<typeof insertSlackNotificationSchema>;
export type PromotionReminder = typeof promotionReminders.$inferSelect;
export type InsertPromotionReminder = z.infer<typeof insertPromotionReminderSchema>;
export type DeadlineReminder = typeof deadlineReminders.$inferSelect;
export type InsertDeadlineReminder = z.infer<typeof insertDeadlineReminderSchema>;

// Preset dimensions for each deliverable type
export const DELIVERABLE_PRESET_DIMENSIONS: Record<string, { width: number; height: number; label: string }> = {
  INSTAGRAM_POST: { width: 1080, height: 1080, label: "1080 × 1080px (Square)" },
  INSTAGRAM_STORY: { width: 1080, height: 1920, label: "1080 × 1920px (9:16 Vertical)" },
  INSTAGRAM_REEL: { width: 1080, height: 1920, label: "1080 × 1920px (9:16 Vertical)" },
  FACEBOOK_POST: { width: 1200, height: 630, label: "1200 × 630px (Landscape)" },
  TIKTOK_POST: { width: 1080, height: 1920, label: "1080 × 1920px (9:16 Vertical)" },
  LINKEDIN_POST: { width: 1200, height: 627, label: "1200 × 627px (Landscape)" },
  TWITTER_POST: { width: 1600, height: 900, label: "1600 × 900px (16:9 Landscape)" },
  REDNOTE_POST: { width: 1080, height: 1440, label: "1080 × 1440px (3:4 Vertical)" },
  EDM_GRAPHIC: { width: 600, height: 800, label: "600 × 800px (Email Width)" },
  WEBSITE_BANNER: { width: 1920, height: 600, label: "1920 × 600px (Wide Banner)" },
  EVENT_MATERIAL: { width: 1080, height: 1080, label: "1080 × 1080px (Square)" },
};

export function getCanvaNewDesignUrl(deliverableType: string): string {
  const preset = DELIVERABLE_PRESET_DIMENSIONS[deliverableType];
  if (!preset) return "https://www.canva.com/design/new";
  return `https://www.canva.com/design/new?width=${preset.width}&height=${preset.height}&units=px`;
}

export function mapPlatformToDeliverableType(platform: string, postFormat?: string): string {
  const p = platform?.toUpperCase();
  if (p === "INSTAGRAM") {
    if (postFormat === "REEL") return "INSTAGRAM_REEL";
    if (postFormat === "CAROUSEL") return "INSTAGRAM_POST";
    return "INSTAGRAM_POST";
  }
  if (p === "FACEBOOK") return "FACEBOOK_POST";
  if (p === "TIKTOK") return "TIKTOK_POST";
  if (p === "LINKEDIN") return "LINKEDIN_POST";
  if (p === "TWITTER") return "TWITTER_POST";
  if (p === "REDNOTE") return "REDNOTE_POST";
  return "INSTAGRAM_POST";
}

// Enum types for frontend
export type UserRole = "ADMIN" | "MANAGER" | "USER" | "COPYWRITER" | "DESIGNER" | "MARKETING_MANAGER" | "PUBLISHER";
export type Platform = "TIKTOK" | "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "TWITTER" | "REDNOTE";
export type PostFormat = "POST" | "CAROUSEL" | "REEL" | "VIDEO";
export type KeyMessageType = "RETAILER_SUPPORT" | "PRODUCT_EDUCATION" | "BRAND_STORY" | "LAUNCH";
export type AssetStatus = "PENDING" | "IN_DESIGN" | "FINAL" | "PENDING_APPROVAL" | "APPROVED" | "NEEDS_REVISION";
export type CopyStatus = "DRAFT" | "APPROVED" | "POSTED";
export type EmailType = "TRADE_PROMOTIONS" | "PRODUCT_LAUNCHES" | "RETAILER_TOOLKITS" | "EVENT_INVITATIONS" | "BRAND_UPDATES";
export type EmailStatus = "PLANNING" | "DESIGNING" | "QA" | "SCHEDULED" | "SENT";
export type EventType = "TRADE_SHOW" | "PRODUCT_LAUNCH" | "RETAILER_TRAINING" | "CONSUMER_EVENT" | "INTERNAL_MEETING";
export type EventStatus = "PLANNING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type AssetLibraryType = "GRAPHIC" | "DATA" | "EMAIL_TEMPLATE" | "VIDEO" | "DOCUMENT";
export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "BOGO" | "OTHER";
export type PromotionStatus = "ACTIVE" | "SCHEDULED" | "ENDED";
export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ApprovalContentType = "SOCIAL_POST" | "EMAIL_CAMPAIGN" | "EVENT";
export type NotificationType = "POST_CREATED_NEEDS_DESIGN" | "POST_DESIGN_COMPLETE" | "POST_READY_TO_PUBLISH" | "EMAIL_CREATED_NEEDS_DESIGN" | "EMAIL_DESIGN_COMPLETE" | "EMAIL_READY_TO_PUBLISH" | "EVENT_CREATED_NEEDS_DESIGN" | "EVENT_DESIGN_COMPLETE" | "EVENT_READY_TO_PUBLISH" | "TASK_ASSIGNED" | "APPROVAL_REQUESTED" | "APPROVAL_APPROVED" | "APPROVAL_REJECTED" | "GENERAL" | "COPY_ASSIGNED" | "COPY_READY" | "COPY_REVISION_NEEDED";
export type DeliverableType = "INSTAGRAM_POST" | "INSTAGRAM_STORY" | "INSTAGRAM_REEL" | "FACEBOOK_POST" | "TIKTOK_POST" | "LINKEDIN_POST" | "TWITTER_POST" | "REDNOTE_POST" | "EDM_GRAPHIC" | "WEBSITE_BANNER" | "EVENT_MATERIAL";
export type WorkflowStage = "DESIGN" | "COPYWRITING" | "PUBLISHING" | "COMPLETED";

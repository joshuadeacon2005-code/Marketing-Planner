import {
  users, brands, regions, campaigns, socialPosts, emailCampaigns, events, eventBrands, eventDeliverables, tasks, assetLibrary, notifications, appSettings, promotions, recurrencePatterns, userPreferences, approvals, brandRegions,
  collaborationProfiles, postCollaborations, postTags, postTagRelations, postPerformance, canvaIntegrations, metaIntegrations, metaPageMappings,
  projects, projectDeliverables, deliverableAnalytics, hashtagLibrary, slackNotifications, promotionReminders,
  socialAccounts, taggedCreators, projectActivityLog, deliverableReferences,
  type User, type InsertUser, type Brand, type InsertBrand, type Region, type InsertRegion,
  type Campaign, type InsertCampaign, type SocialPost, type InsertSocialPost,
  type EmailCampaign, type InsertEmailCampaign, type Event, type InsertEvent,
  type EventBrand, type InsertEventBrand, type EventDeliverable, type InsertEventDeliverable,
  type Task, type InsertTask, type AssetLibraryItem, type InsertAssetLibraryItem,
  type Notification, type InsertNotification, type AppSetting, type InsertAppSetting,
  type Promotion, type InsertPromotion, type RecurrencePattern, type InsertRecurrencePattern,
  type UserPreference, type InsertUserPreference, type Approval, type InsertApproval,
  type BrandRegion, type InsertBrandRegion,
  type CollaborationProfile, type InsertCollaborationProfile,
  type PostTag, type InsertPostTag,
  type PostPerformanceRecord, type InsertPostPerformance,
  type CanvaIntegration, type InsertCanvaIntegration,
  type MetaIntegration, type InsertMetaIntegration,
  type MetaPageMapping, type InsertMetaPageMapping,
  type Project, type InsertProject,
  type ProjectDeliverable, type InsertProjectDeliverable,
  type DeliverableAnalytic, type InsertDeliverableAnalytic,
  type HashtagLibraryItem, type InsertHashtagLibraryItem,
  type SlackNotification, type InsertSlackNotification,
  type PromotionReminder, type InsertPromotionReminder,
  type SocialAccount, type InsertSocialAccount,
  type TaggedCreator, type InsertTaggedCreator,
  type ProjectActivityLogEntry, type InsertProjectActivityLog,
  type DeliverableReference, type InsertDeliverableReference,
  type DeadlineReminder, type InsertDeadlineReminder,
  deadlineReminders,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, inArray, sql, or, isNotNull, ilike, like } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Brands
  getBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: string, brand: Partial<InsertBrand>): Promise<Brand | undefined>;
  
  // Regions
  getRegions(): Promise<Region[]>;
  getRegion(id: string): Promise<Region | undefined>;
  createRegion(region: InsertRegion): Promise<Region>;
  
  // Campaigns
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  
  // Social Posts
  getSocialPosts(filters?: { platform?: string; brandId?: string; regionId?: string; startDate?: Date; endDate?: Date }): Promise<SocialPost[]>;
  getSocialPost(id: string): Promise<SocialPost | undefined>;
  createSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  updateSocialPost(id: string, post: Partial<InsertSocialPost>): Promise<SocialPost | undefined>;
  deleteSocialPost(id: string): Promise<boolean>;
  
  // Email Campaigns
  getEmailCampaigns(filters?: { status?: string; brandId?: string; regionId?: string }): Promise<EmailCampaign[]>;
  getEmailCampaign(id: string): Promise<EmailCampaign | undefined>;
  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  updateEmailCampaign(id: string, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined>;
  deleteEmailCampaign(id: string): Promise<boolean>;
  
  // Events
  getEvents(filters?: { status?: string; regionId?: string; startDate?: Date; endDate?: Date }): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  
  // Event Deliverables
  getEventDeliverables(eventId: string): Promise<EventDeliverable[]>;
  createEventDeliverable(deliverable: InsertEventDeliverable): Promise<EventDeliverable>;
  updateEventDeliverable(id: string, deliverable: Partial<InsertEventDeliverable>): Promise<EventDeliverable | undefined>;
  deleteEventDeliverable(id: string): Promise<boolean>;
  
  // Tasks
  getTasks(filters?: { status?: string; priority?: string; assigneeId?: string; brandId?: string }): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  
  // Dashboard
  getDashboardStats(userId?: string): Promise<{ postsThisMonth: number; emailsThisMonth: number; eventsThisQuarter: number; tasksCompleted: number }>;
  getUpcomingDeadlines(days: number): Promise<Array<{ id: string; title: string; type: string; dueDate: string }>>;
  
  // Asset Library
  getAssets(filters?: { assetType?: string; brandId?: string }): Promise<AssetLibraryItem[]>;
  getAsset(id: string): Promise<AssetLibraryItem | undefined>;
  getExistingCanvaDesignIds(): Promise<Set<string>>;
  createAsset(asset: InsertAssetLibraryItem): Promise<AssetLibraryItem>;
  updateAsset(id: string, asset: Partial<InsertAssetLibraryItem>): Promise<AssetLibraryItem | undefined>;
  deleteAsset(id: string): Promise<boolean>;
  
  // Duplicate across regions
  duplicateSocialPost(id: string, targetRegionIds: string[], createdById: string): Promise<SocialPost[]>;
  duplicateEvent(id: string, targetRegionIds: string[], createdById: string): Promise<Event[]>;
  duplicateTask(id: string, targetRegionIds: string[], createdById: string): Promise<Task[]>;
  
  // Notifications
  getNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<boolean>;
  
  // App Settings
  getSetting(key: string): Promise<AppSetting | undefined>;
  setSetting(key: string, value: string): Promise<AppSetting>;
  
  // Promotions
  getPromotions(filters?: { brandId?: string; status?: string }): Promise<Promotion[]>;
  getPromotion(id: string): Promise<Promotion | undefined>;
  createPromotion(promotion: InsertPromotion): Promise<Promotion>;
  updatePromotion(id: string, promotion: Partial<InsertPromotion>): Promise<Promotion | undefined>;
  deletePromotion(id: string): Promise<boolean>;
  
  // Recurrence Patterns
  getRecurrencePattern(id: string): Promise<RecurrencePattern | undefined>;
  createRecurrencePattern(pattern: InsertRecurrencePattern): Promise<RecurrencePattern>;
  updateRecurrencePattern(id: string, pattern: Partial<InsertRecurrencePattern>): Promise<RecurrencePattern | undefined>;
  deleteRecurrencePattern(id: string): Promise<boolean>;
  
  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreference | undefined>;
  setUserPreferences(userId: string, preferences: Partial<InsertUserPreference>): Promise<UserPreference>;
  
  // Approvals
  getApprovals(filters?: { contentType?: string; status?: string; requestedById?: string }): Promise<Approval[]>;
  getApproval(id: string): Promise<Approval | undefined>;
  getApprovalByContent(contentType: string, contentId: string): Promise<Approval | undefined>;
  createApproval(approval: InsertApproval): Promise<Approval>;
  updateApproval(id: string, approval: Partial<InsertApproval>): Promise<Approval | undefined>;
  
  // Brand-Region assignments
  getBrandRegions(): Promise<BrandRegion[]>;
  getBrandRegionsForBrand(brandId: string): Promise<BrandRegion[]>;
  getRegionsForBrand(brandId: string): Promise<Region[]>;
  getBrandsForRegion(regionId: string): Promise<Brand[]>;
  assignBrandToRegion(brandId: string, regionId: string): Promise<BrandRegion>;
  removeBrandFromRegion(brandId: string, regionId: string): Promise<boolean>;

  // Collaboration Profiles
  getCollaborationProfiles(filters?: { brandId?: string }): Promise<CollaborationProfile[]>;
  getCollaborationProfile(id: string): Promise<CollaborationProfile | undefined>;
  createCollaborationProfile(profile: InsertCollaborationProfile): Promise<CollaborationProfile>;
  updateCollaborationProfile(id: string, profile: Partial<InsertCollaborationProfile>): Promise<CollaborationProfile | undefined>;
  deleteCollaborationProfile(id: string): Promise<boolean>;
  getPostCollaborations(postId: string): Promise<CollaborationProfile[]>;
  setPostCollaborations(postId: string, profileIds: string[]): Promise<void>;

  // Post Tags
  getPostTags(): Promise<PostTag[]>;
  getPostTag(id: string): Promise<PostTag | undefined>;
  createPostTag(tag: InsertPostTag): Promise<PostTag>;
  updatePostTag(id: string, tag: Partial<InsertPostTag>): Promise<PostTag | undefined>;
  deletePostTag(id: string): Promise<boolean>;
  getTagsForPost(postId: string): Promise<PostTag[]>;
  setPostTags(postId: string, tagIds: string[]): Promise<void>;
  getPostIdsByTag(tagId: string): Promise<string[]>;

  // Post Performance
  getPostPerformance(postId: string): Promise<PostPerformanceRecord | undefined>;
  getPostPerformanceHistory(postId: string): Promise<PostPerformanceRecord[]>;
  createPostPerformance(performance: InsertPostPerformance): Promise<PostPerformanceRecord>;
  updatePostPerformance(id: string, performance: Partial<InsertPostPerformance>): Promise<PostPerformanceRecord | undefined>;
  deletePostPerformance(id: string): Promise<boolean>;
  getTopPerformingPosts(limit?: number, filters?: { regionId?: string; brandId?: string }): Promise<any[]>;

  // Canva Integrations
  getCanvaIntegration(userId: string): Promise<CanvaIntegration | undefined>;
  getAllActiveCanvaIntegrations(): Promise<CanvaIntegration[]>;
  createCanvaIntegration(integration: InsertCanvaIntegration): Promise<CanvaIntegration>;
  updateCanvaIntegration(id: string, integration: Partial<InsertCanvaIntegration>): Promise<CanvaIntegration | undefined>;
  deleteCanvaIntegration(id: string): Promise<boolean>;

  // Meta Integrations
  getMetaIntegration(userId: string): Promise<MetaIntegration | undefined>;
  getFirstActiveMetaIntegration(): Promise<MetaIntegration | undefined>;
  createMetaIntegration(integration: InsertMetaIntegration): Promise<MetaIntegration>;
  updateMetaIntegration(id: string, integration: Partial<InsertMetaIntegration>): Promise<MetaIntegration | undefined>;
  deleteMetaIntegration(id: string): Promise<boolean>;

  // Meta Page Mappings
  getMetaPageMappings(metaIntegrationId?: string): Promise<MetaPageMapping[]>;
  getMetaPageMappingById(id: string): Promise<MetaPageMapping | undefined>;
  getMetaPageMappingByRegion(regionId: string): Promise<MetaPageMapping | undefined>;
  getMetaPageMappingByPageId(pageId: string): Promise<MetaPageMapping | undefined>;
  getAllActiveMetaPageMappings(): Promise<MetaPageMapping[]>;
  createMetaPageMapping(mapping: InsertMetaPageMapping): Promise<MetaPageMapping>;
  updateMetaPageMapping(id: string, mapping: Partial<InsertMetaPageMapping>): Promise<MetaPageMapping | undefined>;
  deleteMetaPageMapping(id: string): Promise<boolean>;
  deleteMetaPageMappingsByIntegration(metaIntegrationId: string): Promise<boolean>;

  // Projects
  getProjects(filters?: { brandId?: string; regionId?: string; isCompleted?: boolean }): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Project Deliverables
  getProjectDeliverables(projectId: string): Promise<ProjectDeliverable[]>;
  getDeliverable(id: string): Promise<ProjectDeliverable | undefined>;
  getDeliverablesByStage(stage: string): Promise<ProjectDeliverable[]>;
  getDeliverablesByUser(userId: string, role: 'designer' | 'copywriter' | 'publisher'): Promise<ProjectDeliverable[]>;
  createDeliverable(deliverable: InsertProjectDeliverable): Promise<ProjectDeliverable>;
  updateDeliverable(id: string, deliverable: Partial<InsertProjectDeliverable>): Promise<ProjectDeliverable | undefined>;
  deleteDeliverable(id: string): Promise<boolean>;

  // Deliverable References
  getDeliverableReferences(deliverableId: string): Promise<DeliverableReference[]>;
  addDeliverableReference(data: InsertDeliverableReference): Promise<DeliverableReference>;
  deleteDeliverableReference(id: string): Promise<boolean>;

  // Deliverable Analytics
  getDeliverableAnalytics(deliverableId: string): Promise<DeliverableAnalytic | undefined>;
  createDeliverableAnalytics(analytics: InsertDeliverableAnalytic): Promise<DeliverableAnalytic>;
  updateDeliverableAnalytics(id: string, analytics: Partial<InsertDeliverableAnalytic>): Promise<DeliverableAnalytic | undefined>;

  // Hashtag Library
  searchHashtags(query: string, brandId?: string, limit?: number): Promise<HashtagLibraryItem[]>;
  getHashtagsByBrand(brandId: string): Promise<HashtagLibraryItem[]>;
  upsertHashtag(hashtag: string, brandId: string, regionId?: string): Promise<HashtagLibraryItem>;

  // Slack Notifications
  createSlackNotification(notification: InsertSlackNotification): Promise<SlackNotification>;
  getSlackNotification(id: string): Promise<SlackNotification | undefined>;
  updateSlackNotification(id: string, data: Partial<InsertSlackNotification>): Promise<SlackNotification | undefined>;

  // Promotion Reminders
  createPromotionReminder(reminder: InsertPromotionReminder): Promise<PromotionReminder>;
  getDueReminders(currentDate: string): Promise<PromotionReminder[]>;
  markReminderSent(id: string): Promise<void>;

  // Deadline Reminders
  hasDeadlineReminderBeenSent(entityType: string, entityId: string, reminderType: string, userId: string): Promise<boolean>;
  markDeadlineReminderSent(data: InsertDeadlineReminder): Promise<DeadlineReminder>;
  getTasksWithUpcomingDeadlines(withinHours: number): Promise<Task[]>;
  getDeliverablesWithUpcomingDesignDeadlines(withinHours: number): Promise<ProjectDeliverable[]>;
  getSocialPostsWithUpcomingDeadlines(withinHours: number): Promise<SocialPost[]>;
  getEmailCampaignsWithUpcomingDeadlines(withinHours: number): Promise<EmailCampaign[]>;
  getEventsWithUpcomingDeadlines(withinHours: number): Promise<Event[]>;
  getEventDeliverablesWithUpcomingDeadlines(withinHours: number): Promise<EventDeliverable[]>;

  // Social Accounts
  getSocialAccounts(filters?: { platform?: string; brandId?: string; regionId?: string; isActive?: boolean }): Promise<SocialAccount[]>;
  getSocialAccount(id: string): Promise<SocialAccount | undefined>;
  createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount>;
  updateSocialAccount(id: string, account: Partial<InsertSocialAccount>): Promise<SocialAccount | undefined>;
  deleteSocialAccount(id: string): Promise<boolean>;

  // Tagged Creators
  searchTaggedCreators(query: string, platform?: string, brandId?: string, limit?: number): Promise<TaggedCreator[]>;
  upsertTaggedCreator(platform: string, handle: string, brandId?: string, displayName?: string): Promise<TaggedCreator>;

  // Project Activity Log
  getProjectActivityLog(projectId: string, limit?: number): Promise<ProjectActivityLogEntry[]>;
  createActivityLogEntry(entry: InsertProjectActivityLog): Promise<ProjectActivityLogEntry>;

  // Published Deliverables (enhanced query)
  getPublishedDeliverables(filters?: { platform?: string; brandId?: string; regionId?: string; accountId?: string; dateFrom?: Date; dateTo?: Date; search?: string; sort?: string; page?: number; limit?: number }): Promise<{ deliverables: ProjectDeliverable[]; total: number }>;

  // Deliverable Analytics History
  getDeliverableAnalyticsHistory(deliverableId: string): Promise<DeliverableAnalytic[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`);
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.name));
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updated || undefined;
  }

  // Brands
  async getBrands(): Promise<Brand[]> {
    return await db.select().from(brands).orderBy(asc(brands.name));
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand || undefined;
  }

  async createBrand(brand: InsertBrand): Promise<Brand> {
    const [created] = await db.insert(brands).values(brand).returning();
    return created;
  }

  async updateBrand(id: string, brand: Partial<InsertBrand>): Promise<Brand | undefined> {
    const [updated] = await db.update(brands).set(brand).where(eq(brands.id, id)).returning();
    return updated || undefined;
  }

  // Regions
  async getRegions(): Promise<Region[]> {
    return await db.select().from(regions).orderBy(asc(regions.name));
  }

  async getRegion(id: string): Promise<Region | undefined> {
    const [region] = await db.select().from(regions).where(eq(regions.id, id));
    return region || undefined;
  }

  async createRegion(region: InsertRegion): Promise<Region> {
    const [created] = await db.insert(regions).values(region).returning();
    return created;
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.startDate));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [created] = await db.insert(campaigns).values(campaign).returning();
    return created;
  }

  // Social Posts
  async getSocialPosts(filters?: { platform?: string; brandId?: string; regionId?: string; startDate?: Date; endDate?: Date }): Promise<SocialPost[]> {
    let query = db.select().from(socialPosts);
    const conditions = [];
    
    if (filters?.platform) {
      conditions.push(eq(socialPosts.platform, filters.platform as any));
    }
    if (filters?.brandId) {
      conditions.push(eq(socialPosts.brandId, filters.brandId));
    }
    if (filters?.regionId) {
      conditions.push(eq(socialPosts.regionId, filters.regionId));
    }
    if (filters?.startDate) {
      conditions.push(gte(socialPosts.scheduledDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(socialPosts.scheduledDate, filters.endDate));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(socialPosts).where(and(...conditions)).orderBy(desc(socialPosts.scheduledDate));
    }
    return await db.select().from(socialPosts).orderBy(desc(socialPosts.scheduledDate));
  }

  async getSocialPost(id: string): Promise<SocialPost | undefined> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, id));
    return post || undefined;
  }

  async createSocialPost(post: InsertSocialPost): Promise<SocialPost> {
    const [created] = await db.insert(socialPosts).values(post).returning();
    return created;
  }

  async updateSocialPost(id: string, post: Partial<InsertSocialPost>): Promise<SocialPost | undefined> {
    const updateData = { ...post, updatedAt: new Date() };
    const [updated] = await db.update(socialPosts).set(updateData).where(eq(socialPosts.id, id)).returning();
    return updated || undefined;
  }

  async deleteSocialPost(id: string): Promise<boolean> {
    const result = await db.delete(socialPosts).where(eq(socialPosts.id, id));
    return true;
  }

  // Email Campaigns
  async getEmailCampaigns(filters?: { status?: string; brandId?: string; regionId?: string }): Promise<EmailCampaign[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(emailCampaigns.status, filters.status as any));
    }
    if (filters?.brandId) {
      conditions.push(eq(emailCampaigns.brandId, filters.brandId));
    }
    if (filters?.regionId) {
      conditions.push(eq(emailCampaigns.regionId, filters.regionId));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(emailCampaigns).where(and(...conditions)).orderBy(desc(emailCampaigns.scheduledDate));
    }
    return await db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.scheduledDate));
  }

  async getEmailCampaign(id: string): Promise<EmailCampaign | undefined> {
    const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id));
    return campaign || undefined;
  }

  async createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const [created] = await db.insert(emailCampaigns).values(campaign).returning();
    return created;
  }

  async updateEmailCampaign(id: string, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined> {
    const updateData = { ...campaign, updatedAt: new Date() };
    const [updated] = await db.update(emailCampaigns).set(updateData).where(eq(emailCampaigns.id, id)).returning();
    return updated || undefined;
  }

  async deleteEmailCampaign(id: string): Promise<boolean> {
    await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
    return true;
  }

  // Events
  async getEvents(filters?: { status?: string; regionId?: string; startDate?: Date; endDate?: Date }): Promise<Event[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(events.status, filters.status as any));
    }
    if (filters?.regionId) {
      conditions.push(eq(events.regionId, filters.regionId));
    }
    if (filters?.startDate) {
      conditions.push(gte(events.startDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(events.endDate, filters.endDate));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(events).where(and(...conditions)).orderBy(desc(events.startDate));
    }
    return await db.select().from(events).orderBy(desc(events.startDate));
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const updateData = { ...event, updatedAt: new Date() };
    const [updated] = await db.update(events).set(updateData).where(eq(events.id, id)).returning();
    return updated || undefined;
  }

  async deleteEvent(id: string): Promise<boolean> {
    await db.delete(events).where(eq(events.id, id));
    return true;
  }

  // Event Deliverables
  async getEventDeliverables(eventId: string): Promise<EventDeliverable[]> {
    return await db.select().from(eventDeliverables).where(eq(eventDeliverables.eventId, eventId));
  }

  async createEventDeliverable(deliverable: InsertEventDeliverable): Promise<EventDeliverable> {
    const [created] = await db.insert(eventDeliverables).values(deliverable).returning();
    return created;
  }

  async updateEventDeliverable(id: string, deliverable: Partial<InsertEventDeliverable>): Promise<EventDeliverable | undefined> {
    const [updated] = await db.update(eventDeliverables).set(deliverable).where(eq(eventDeliverables.id, id)).returning();
    return updated || undefined;
  }

  async deleteEventDeliverable(id: string): Promise<boolean> {
    await db.delete(eventDeliverables).where(eq(eventDeliverables.id, id));
    return true;
  }

  // Tasks
  async getTasks(filters?: { status?: string; priority?: string; assigneeId?: string; brandId?: string }): Promise<Task[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status as any));
    }
    if (filters?.priority) {
      conditions.push(eq(tasks.priority, filters.priority as any));
    }
    if (filters?.assigneeId) {
      conditions.push(eq(tasks.assigneeId, filters.assigneeId));
    }
    if (filters?.brandId) {
      conditions.push(eq(tasks.brandId, filters.brandId));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
    }
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined> {
    const updateData = { ...task, updatedAt: new Date() };
    const [updated] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    return updated || undefined;
  }

  async deleteTask(id: string): Promise<boolean> {
    await db.delete(tasks).where(eq(tasks.id, id));
    return true;
  }

  // Dashboard
  async getDashboardStats(userId?: string): Promise<{ postsThisMonth: number; emailsThisMonth: number; eventsThisQuarter: number; tasksCompleted: number }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    
    const [postsResult] = await db.select({ count: sql<number>`count(*)` })
      .from(socialPosts)
      .where(gte(socialPosts.scheduledDate, startOfMonth));
    
    const [emailsResult] = await db.select({ count: sql<number>`count(*)` })
      .from(emailCampaigns)
      .where(gte(emailCampaigns.scheduledDate, startOfMonth));
    
    const [eventsResult] = await db.select({ count: sql<number>`count(*)` })
      .from(events)
      .where(gte(events.startDate, startOfQuarter));
    
    const [tasksResult] = await db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(eq(tasks.status, 'DONE'));
    
    return {
      postsThisMonth: Number(postsResult?.count) || 0,
      emailsThisMonth: Number(emailsResult?.count) || 0,
      eventsThisQuarter: Number(eventsResult?.count) || 0,
      tasksCompleted: Number(tasksResult?.count) || 0,
    };
  }

  async getUpcomingDeadlines(days: number): Promise<Array<{ id: string; title: string; type: string; dueDate: string }>> {
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    const upcomingTasks = await db.select()
      .from(tasks)
      .where(and(
        gte(tasks.dueDate, now),
        lte(tasks.dueDate, endDate)
      ))
      .orderBy(asc(tasks.dueDate))
      .limit(10);
    
    const upcomingPosts = await db.select()
      .from(socialPosts)
      .where(and(
        gte(socialPosts.scheduledDate, now),
        lte(socialPosts.scheduledDate, endDate)
      ))
      .orderBy(asc(socialPosts.scheduledDate))
      .limit(10);
    
    const deadlines: Array<{ id: string; title: string; type: string; dueDate: string }> = [];
    
    upcomingTasks.forEach(task => {
      if (task.dueDate) {
        deadlines.push({
          id: task.id,
          title: task.title,
          type: 'task',
          dueDate: task.dueDate.toISOString(),
        });
      }
    });
    
    upcomingPosts.forEach(post => {
      deadlines.push({
        id: post.id,
        title: `${post.platform} Post`,
        type: 'social',
        dueDate: post.scheduledDate.toISOString(),
      });
    });
    
    return deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 10);
  }

  // Asset Library
  async getAssets(filters?: { assetType?: string; brandId?: string }): Promise<AssetLibraryItem[]> {
    const conditions = [];
    
    if (filters?.assetType) {
      conditions.push(eq(assetLibrary.assetType, filters.assetType as any));
    }
    if (filters?.brandId) {
      conditions.push(eq(assetLibrary.brandId, filters.brandId));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(assetLibrary).where(and(...conditions)).orderBy(desc(assetLibrary.createdAt));
    }
    return await db.select().from(assetLibrary).orderBy(desc(assetLibrary.createdAt));
  }

  async getAsset(id: string): Promise<AssetLibraryItem | undefined> {
    const [asset] = await db.select().from(assetLibrary).where(eq(assetLibrary.id, id));
    return asset || undefined;
  }

  async getExistingCanvaDesignIds(): Promise<Set<string>> {
    const results = await db.select({ canvaDesignId: assetLibrary.canvaDesignId })
      .from(assetLibrary)
      .where(isNotNull(assetLibrary.canvaDesignId));
    return new Set(results.map(r => r.canvaDesignId!).filter(Boolean));
  }

  async createAsset(asset: InsertAssetLibraryItem): Promise<AssetLibraryItem> {
    const [created] = await db.insert(assetLibrary).values(asset).returning();
    return created;
  }

  async updateAsset(id: string, asset: Partial<InsertAssetLibraryItem>): Promise<AssetLibraryItem | undefined> {
    const updateData = { ...asset, updatedAt: new Date() };
    const [updated] = await db.update(assetLibrary).set(updateData).where(eq(assetLibrary.id, id)).returning();
    return updated || undefined;
  }

  async deleteAsset(id: string): Promise<boolean> {
    await db.delete(assetLibrary).where(eq(assetLibrary.id, id));
    return true;
  }

  // Duplicate across regions
  async duplicateSocialPost(id: string, targetRegionIds: string[], createdById: string): Promise<SocialPost[]> {
    const original = await this.getSocialPost(id);
    if (!original) throw new Error('Social post not found');
    
    const duplicates: SocialPost[] = [];
    for (const regionId of targetRegionIds) {
      const newPost = await this.createSocialPost({
        brandId: original.brandId,
        regionId,
        campaignId: original.campaignId,
        platform: original.platform,
        postFormat: original.postFormat,
        scheduledDate: original.scheduledDate,
        caption: original.caption,
        keyMessage: original.keyMessage,
        assetStatus: 'PENDING',
        copyStatus: 'DRAFT',
        assetUrl: original.assetUrl,
        parentId: original.id,
        createdById,
      });
      duplicates.push(newPost);
    }
    return duplicates;
  }

  async duplicateEvent(id: string, targetRegionIds: string[], createdById: string): Promise<Event[]> {
    const original = await this.getEvent(id);
    if (!original) throw new Error('Event not found');
    
    const originalBrands = await db.select().from(eventBrands).where(eq(eventBrands.eventId, id));
    const originalDeliverables = await this.getEventDeliverables(id);
    
    const duplicates: Event[] = [];
    for (const regionId of targetRegionIds) {
      const newEvent = await this.createEvent({
        name: original.name,
        eventType: original.eventType,
        status: 'PLANNING',
        regionId,
        startDate: original.startDate,
        endDate: original.endDate,
        location: original.location,
        description: original.description,
        plannedBudget: original.plannedBudget,
        actualBudget: null,
        notes: original.notes,
        parentId: original.id,
        createdById,
      });
      
      // Duplicate event brands
      for (const brand of originalBrands) {
        await db.insert(eventBrands).values({ eventId: newEvent.id, brandId: brand.brandId });
      }
      
      // Duplicate deliverables with reset status
      for (const deliverable of originalDeliverables) {
        await this.createEventDeliverable({
          eventId: newEvent.id,
          name: deliverable.name,
          isCompleted: false,
          dueDate: deliverable.dueDate,
          assigneeId: null,
        });
      }
      
      duplicates.push(newEvent);
    }
    return duplicates;
  }

  async duplicateTask(id: string, targetRegionIds: string[], createdById: string): Promise<Task[]> {
    const original = await this.getTask(id);
    if (!original) throw new Error('Task not found');
    
    const duplicates: Task[] = [];
    for (const regionId of targetRegionIds) {
      const newTask = await this.createTask({
        title: original.title,
        description: original.description,
        status: 'TODO',
        priority: original.priority,
        brandId: original.brandId,
        regionId,
        assigneeId: null,
        dueDate: original.dueDate,
        linkedSocialPostId: null,
        linkedEmailCampaignId: null,
        linkedEventId: null,
        parentId: original.id,
        createdById,
      });
      duplicates.push(newTask);
    }
    return duplicates;
  }

  // Notifications
  async getNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    if (unreadOnly) {
      return await db.select().from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
        .orderBy(desc(notifications.createdAt));
    }
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated || undefined;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id));
    return true;
  }

  // App Settings
  async getSetting(key: string): Promise<AppSetting | undefined> {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: string): Promise<AppSetting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db.update(appSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(appSettings.key, key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(appSettings).values({ key, value }).returning();
    return created;
  }

  // Promotions
  async getPromotions(filters?: { brandId?: string; status?: string }): Promise<Promotion[]> {
    const conditions = [];
    
    if (filters?.brandId) {
      conditions.push(eq(promotions.brandId, filters.brandId));
    }
    if (filters?.status) {
      conditions.push(eq(promotions.status, filters.status as any));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(promotions).where(and(...conditions)).orderBy(desc(promotions.startDate));
    }
    return await db.select().from(promotions).orderBy(desc(promotions.startDate));
  }

  async getPromotion(id: string): Promise<Promotion | undefined> {
    const [promotion] = await db.select().from(promotions).where(eq(promotions.id, id));
    return promotion || undefined;
  }

  async createPromotion(promotion: InsertPromotion): Promise<Promotion> {
    const [created] = await db.insert(promotions).values(promotion).returning();
    return created;
  }

  async updatePromotion(id: string, promotion: Partial<InsertPromotion>): Promise<Promotion | undefined> {
    const updateData = { ...promotion, updatedAt: new Date() };
    const [updated] = await db.update(promotions).set(updateData).where(eq(promotions.id, id)).returning();
    return updated || undefined;
  }

  async deletePromotion(id: string): Promise<boolean> {
    await db.delete(promotions).where(eq(promotions.id, id));
    return true;
  }

  // Recurrence Patterns
  async getRecurrencePattern(id: string): Promise<RecurrencePattern | undefined> {
    const [pattern] = await db.select().from(recurrencePatterns).where(eq(recurrencePatterns.id, id));
    return pattern || undefined;
  }

  async createRecurrencePattern(pattern: InsertRecurrencePattern): Promise<RecurrencePattern> {
    const [created] = await db.insert(recurrencePatterns).values(pattern).returning();
    return created;
  }

  async updateRecurrencePattern(id: string, pattern: Partial<InsertRecurrencePattern>): Promise<RecurrencePattern | undefined> {
    const [updated] = await db.update(recurrencePatterns).set(pattern).where(eq(recurrencePatterns.id, id)).returning();
    return updated || undefined;
  }

  async deleteRecurrencePattern(id: string): Promise<boolean> {
    await db.delete(recurrencePatterns).where(eq(recurrencePatterns.id, id));
    return true;
  }

  // User Preferences
  async getUserPreferences(userId: string): Promise<UserPreference | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs || undefined;
  }

  async setUserPreferences(userId: string, preferences: Partial<InsertUserPreference>): Promise<UserPreference> {
    const existing = await this.getUserPreferences(userId);
    if (existing) {
      const [updated] = await db.update(userPreferences)
        .set({ ...preferences, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userPreferences).values({ userId, ...preferences }).returning();
    return created;
  }

  // Approvals
  async getApprovals(filters?: { contentType?: string; status?: string; requestedById?: string }): Promise<Approval[]> {
    const conditions = [];
    
    if (filters?.contentType) {
      conditions.push(eq(approvals.contentType, filters.contentType as any));
    }
    if (filters?.status) {
      conditions.push(eq(approvals.status, filters.status as any));
    }
    if (filters?.requestedById) {
      conditions.push(eq(approvals.requestedById, filters.requestedById));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(approvals).where(and(...conditions)).orderBy(desc(approvals.requestedAt));
    }
    return await db.select().from(approvals).orderBy(desc(approvals.requestedAt));
  }

  async getApproval(id: string): Promise<Approval | undefined> {
    const [approval] = await db.select().from(approvals).where(eq(approvals.id, id));
    return approval || undefined;
  }

  async getApprovalByContent(contentType: string, contentId: string): Promise<Approval | undefined> {
    const [approval] = await db.select().from(approvals)
      .where(and(
        eq(approvals.contentType, contentType as any),
        eq(approvals.contentId, contentId)
      ))
      .orderBy(desc(approvals.requestedAt))
      .limit(1);
    return approval || undefined;
  }

  async createApproval(approval: InsertApproval): Promise<Approval> {
    const [created] = await db.insert(approvals).values(approval).returning();
    return created;
  }

  async updateApproval(id: string, approval: Partial<InsertApproval>): Promise<Approval | undefined> {
    const [updated] = await db.update(approvals).set(approval).where(eq(approvals.id, id)).returning();
    return updated || undefined;
  }

  // Brand-Region assignments
  async getBrandRegions(): Promise<BrandRegion[]> {
    return await db.select().from(brandRegions);
  }

  async getBrandRegionsForBrand(brandId: string): Promise<BrandRegion[]> {
    return await db.select().from(brandRegions).where(eq(brandRegions.brandId, brandId));
  }

  async getRegionsForBrand(brandId: string): Promise<Region[]> {
    const results = await db
      .select({ region: regions })
      .from(brandRegions)
      .innerJoin(regions, eq(brandRegions.regionId, regions.id))
      .where(eq(brandRegions.brandId, brandId));
    return results.map(r => r.region);
  }

  async getBrandsForRegion(regionId: string): Promise<Brand[]> {
    const results = await db
      .select({ brand: brands })
      .from(brandRegions)
      .innerJoin(brands, eq(brandRegions.brandId, brands.id))
      .where(eq(brandRegions.regionId, regionId));
    return results.map(r => r.brand);
  }

  async assignBrandToRegion(brandId: string, regionId: string): Promise<BrandRegion> {
    // Check if already exists
    const [existing] = await db.select().from(brandRegions)
      .where(and(eq(brandRegions.brandId, brandId), eq(brandRegions.regionId, regionId)));
    if (existing) return existing;
    
    const [created] = await db.insert(brandRegions).values({ brandId, regionId }).returning();
    return created;
  }

  async removeBrandFromRegion(brandId: string, regionId: string): Promise<boolean> {
    await db.delete(brandRegions)
      .where(and(eq(brandRegions.brandId, brandId), eq(brandRegions.regionId, regionId)));
    return true;
  }

  // Collaboration Profiles
  async getCollaborationProfiles(filters?: { brandId?: string }): Promise<CollaborationProfile[]> {
    const conditions = [];
    if (filters?.brandId) conditions.push(eq(collaborationProfiles.brandId, filters.brandId));
    return await db.select().from(collaborationProfiles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(collaborationProfiles.name));
  }

  async getCollaborationProfile(id: string): Promise<CollaborationProfile | undefined> {
    const [profile] = await db.select().from(collaborationProfiles).where(eq(collaborationProfiles.id, id));
    return profile || undefined;
  }

  async createCollaborationProfile(profile: InsertCollaborationProfile): Promise<CollaborationProfile> {
    const [created] = await db.insert(collaborationProfiles).values(profile).returning();
    return created;
  }

  async updateCollaborationProfile(id: string, profile: Partial<InsertCollaborationProfile>): Promise<CollaborationProfile | undefined> {
    const [updated] = await db.update(collaborationProfiles).set(profile).where(eq(collaborationProfiles.id, id)).returning();
    return updated || undefined;
  }

  async deleteCollaborationProfile(id: string): Promise<boolean> {
    await db.delete(collaborationProfiles).where(eq(collaborationProfiles.id, id));
    return true;
  }

  async getPostCollaborations(postId: string): Promise<CollaborationProfile[]> {
    const results = await db
      .select({ profile: collaborationProfiles })
      .from(postCollaborations)
      .innerJoin(collaborationProfiles, eq(postCollaborations.profileId, collaborationProfiles.id))
      .where(eq(postCollaborations.postId, postId));
    return results.map(r => r.profile);
  }

  async setPostCollaborations(postId: string, profileIds: string[]): Promise<void> {
    await db.delete(postCollaborations).where(eq(postCollaborations.postId, postId));
    if (profileIds.length > 0) {
      await db.insert(postCollaborations).values(profileIds.map(profileId => ({ postId, profileId })));
    }
  }

  // Post Tags
  async getPostTags(): Promise<PostTag[]> {
    return await db.select().from(postTags).orderBy(asc(postTags.name));
  }

  async getPostTag(id: string): Promise<PostTag | undefined> {
    const [tag] = await db.select().from(postTags).where(eq(postTags.id, id));
    return tag || undefined;
  }

  async createPostTag(tag: InsertPostTag): Promise<PostTag> {
    const [created] = await db.insert(postTags).values(tag).returning();
    return created;
  }

  async updatePostTag(id: string, tag: Partial<InsertPostTag>): Promise<PostTag | undefined> {
    const [updated] = await db.update(postTags).set(tag).where(eq(postTags.id, id)).returning();
    return updated || undefined;
  }

  async deletePostTag(id: string): Promise<boolean> {
    await db.delete(postTagRelations).where(eq(postTagRelations.tagId, id));
    await db.delete(postTags).where(eq(postTags.id, id));
    return true;
  }

  async getTagsForPost(postId: string): Promise<PostTag[]> {
    const results = await db
      .select({ tag: postTags })
      .from(postTagRelations)
      .innerJoin(postTags, eq(postTagRelations.tagId, postTags.id))
      .where(eq(postTagRelations.postId, postId));
    return results.map(r => r.tag);
  }

  async setPostTags(postId: string, tagIds: string[]): Promise<void> {
    await db.delete(postTagRelations).where(eq(postTagRelations.postId, postId));
    if (tagIds.length > 0) {
      await db.insert(postTagRelations).values(tagIds.map(tagId => ({ postId, tagId })));
    }
  }

  async getPostIdsByTag(tagId: string): Promise<string[]> {
    const results = await db
      .select({ postId: postTagRelations.postId })
      .from(postTagRelations)
      .where(eq(postTagRelations.tagId, tagId));
    return results.map(r => r.postId);
  }

  // Post Performance
  async getPostPerformance(postId: string): Promise<PostPerformanceRecord | undefined> {
    const [record] = await db.select().from(postPerformance)
      .where(eq(postPerformance.postId, postId))
      .orderBy(desc(postPerformance.createdAt))
      .limit(1);
    return record || undefined;
  }

  async getPostPerformanceHistory(postId: string): Promise<PostPerformanceRecord[]> {
    return await db.select().from(postPerformance)
      .where(eq(postPerformance.postId, postId))
      .orderBy(desc(postPerformance.recordedAt));
  }

  async createPostPerformance(performance: InsertPostPerformance): Promise<PostPerformanceRecord> {
    const [created] = await db.insert(postPerformance).values(performance).returning();
    return created;
  }

  async updatePostPerformance(id: string, performance: Partial<InsertPostPerformance>): Promise<PostPerformanceRecord | undefined> {
    const [updated] = await db.update(postPerformance).set({ ...performance, updatedAt: new Date() }).where(eq(postPerformance.id, id)).returning();
    return updated || undefined;
  }

  async deletePostPerformance(id: string): Promise<boolean> {
    await db.delete(postPerformance).where(eq(postPerformance.id, id));
    return true;
  }

  async getTopPerformingPosts(limit: number = 10, filters?: { regionId?: string; brandId?: string }): Promise<any[]> {
    const conditions = [];
    if (filters?.regionId) conditions.push(eq(socialPosts.regionId, filters.regionId));
    if (filters?.brandId) conditions.push(eq(socialPosts.brandId, filters.brandId));

    const results = await db
      .select({
        post: socialPosts,
        performance: postPerformance,
        brand: brands,
        region: regions,
      })
      .from(socialPosts)
      .innerJoin(postPerformance, eq(socialPosts.id, postPerformance.postId))
      .leftJoin(brands, eq(socialPosts.brandId, brands.id))
      .leftJoin(regions, eq(socialPosts.regionId, regions.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(postPerformance.engagementRate))
      .limit(limit);

    return results.map(r => ({
      ...r.post,
      performance: r.performance,
      brand: r.brand,
      region: r.region,
    }));
  }

  async getCanvaIntegration(userId: string): Promise<CanvaIntegration | undefined> {
    const [integration] = await db.select().from(canvaIntegrations).where(eq(canvaIntegrations.userId, userId));
    return integration || undefined;
  }

  async getAllActiveCanvaIntegrations(): Promise<CanvaIntegration[]> {
    return db.select().from(canvaIntegrations).where(eq(canvaIntegrations.isActive, true));
  }

  async createCanvaIntegration(integration: InsertCanvaIntegration): Promise<CanvaIntegration> {
    const [created] = await db.insert(canvaIntegrations).values(integration).returning();
    return created;
  }

  async updateCanvaIntegration(id: string, integration: Partial<InsertCanvaIntegration>): Promise<CanvaIntegration | undefined> {
    const [updated] = await db.update(canvaIntegrations).set({ ...integration, updatedAt: new Date() }).where(eq(canvaIntegrations.id, id)).returning();
    return updated || undefined;
  }

  async deleteCanvaIntegration(id: string): Promise<boolean> {
    const result = await db.delete(canvaIntegrations).where(eq(canvaIntegrations.id, id)).returning();
    return result.length > 0;
  }

  // Meta Integrations
  async getMetaIntegration(userId: string): Promise<MetaIntegration | undefined> {
    const [integration] = await db.select().from(metaIntegrations).where(eq(metaIntegrations.userId, userId));
    return integration || undefined;
  }

  async getFirstActiveMetaIntegration(): Promise<MetaIntegration | undefined> {
    const [integration] = await db.select().from(metaIntegrations).where(eq(metaIntegrations.isActive, true)).limit(1);
    return integration || undefined;
  }

  async createMetaIntegration(integration: InsertMetaIntegration): Promise<MetaIntegration> {
    const [created] = await db.insert(metaIntegrations).values(integration).returning();
    return created;
  }

  async updateMetaIntegration(id: string, integration: Partial<InsertMetaIntegration>): Promise<MetaIntegration | undefined> {
    const [updated] = await db.update(metaIntegrations).set({ ...integration, updatedAt: new Date() }).where(eq(metaIntegrations.id, id)).returning();
    return updated || undefined;
  }

  async deleteMetaIntegration(id: string): Promise<boolean> {
    const result = await db.delete(metaIntegrations).where(eq(metaIntegrations.id, id)).returning();
    return result.length > 0;
  }

  // Meta Page Mappings
  async getMetaPageMappings(metaIntegrationId?: string): Promise<MetaPageMapping[]> {
    if (metaIntegrationId) {
      return db.select().from(metaPageMappings).where(eq(metaPageMappings.metaIntegrationId, metaIntegrationId));
    }
    return db.select().from(metaPageMappings);
  }

  async getMetaPageMappingById(id: string): Promise<MetaPageMapping | undefined> {
    const [mapping] = await db.select().from(metaPageMappings).where(eq(metaPageMappings.id, id));
    return mapping || undefined;
  }

  async getMetaPageMappingByRegion(regionId: string): Promise<MetaPageMapping | undefined> {
    const [mapping] = await db.select().from(metaPageMappings).where(
      and(eq(metaPageMappings.regionId, regionId), eq(metaPageMappings.isActive, true))
    );
    return mapping || undefined;
  }

  async getMetaPageMappingByPageId(pageId: string): Promise<MetaPageMapping | undefined> {
    const [mapping] = await db.select().from(metaPageMappings).where(eq(metaPageMappings.pageId, pageId));
    return mapping || undefined;
  }

  async getAllActiveMetaPageMappings(): Promise<MetaPageMapping[]> {
    return db.select().from(metaPageMappings).where(eq(metaPageMappings.isActive, true));
  }

  async createMetaPageMapping(mapping: InsertMetaPageMapping): Promise<MetaPageMapping> {
    const [created] = await db.insert(metaPageMappings).values(mapping).returning();
    return created;
  }

  async updateMetaPageMapping(id: string, mapping: Partial<InsertMetaPageMapping>): Promise<MetaPageMapping | undefined> {
    const [updated] = await db.update(metaPageMappings).set({ ...mapping, updatedAt: new Date() }).where(eq(metaPageMappings.id, id)).returning();
    return updated || undefined;
  }

  async deleteMetaPageMapping(id: string): Promise<boolean> {
    const result = await db.delete(metaPageMappings).where(eq(metaPageMappings.id, id)).returning();
    return result.length > 0;
  }

  async deleteMetaPageMappingsByIntegration(metaIntegrationId: string): Promise<boolean> {
    const result = await db.delete(metaPageMappings).where(eq(metaPageMappings.metaIntegrationId, metaIntegrationId)).returning();
    return result.length >= 0;
  }

  // Projects
  async getProjects(filters?: { brandId?: string; regionId?: string; isCompleted?: boolean }): Promise<Project[]> {
    const conditions = [];
    if (filters?.brandId) conditions.push(eq(projects.brandId, filters.brandId));
    if (filters?.regionId) conditions.push(eq(projects.regionId, filters.regionId));
    if (filters?.isCompleted !== undefined) conditions.push(eq(projects.isCompleted, filters.isCompleted));

    if (conditions.length > 0) {
      return await db.select().from(projects).where(and(...conditions)).orderBy(desc(projects.createdAt));
    }
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set({ ...project, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    return updated || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Project Deliverables
  async getProjectDeliverables(projectId: string): Promise<ProjectDeliverable[]> {
    return await db.select().from(projectDeliverables).where(eq(projectDeliverables.projectId, projectId)).orderBy(asc(projectDeliverables.createdAt));
  }

  async getDeliverable(id: string): Promise<ProjectDeliverable | undefined> {
    const [deliverable] = await db.select().from(projectDeliverables).where(eq(projectDeliverables.id, id));
    return deliverable || undefined;
  }

  async getDeliverablesByStage(stage: string): Promise<ProjectDeliverable[]> {
    return await db.select().from(projectDeliverables).where(eq(projectDeliverables.currentStage, stage as any)).orderBy(asc(projectDeliverables.createdAt));
  }

  async getDeliverablesByUser(userId: string, role: 'designer' | 'copywriter' | 'publisher'): Promise<ProjectDeliverable[]> {
    const columnMap = {
      designer: projectDeliverables.designerId,
      copywriter: projectDeliverables.copywriterId,
      publisher: projectDeliverables.publisherId,
    };
    return await db.select().from(projectDeliverables).where(eq(columnMap[role], userId)).orderBy(asc(projectDeliverables.createdAt));
  }

  async createDeliverable(deliverable: InsertProjectDeliverable): Promise<ProjectDeliverable> {
    const [created] = await db.insert(projectDeliverables).values(deliverable).returning();
    return created;
  }

  async updateDeliverable(id: string, deliverable: Partial<InsertProjectDeliverable>): Promise<ProjectDeliverable | undefined> {
    const [updated] = await db.update(projectDeliverables).set({ ...deliverable, updatedAt: new Date() }).where(eq(projectDeliverables.id, id)).returning();
    return updated || undefined;
  }

  async deleteDeliverable(id: string): Promise<boolean> {
    const result = await db.delete(projectDeliverables).where(eq(projectDeliverables.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Deliverable References
  async getDeliverableReferences(deliverableId: string): Promise<DeliverableReference[]> {
    return await db.select().from(deliverableReferences).where(eq(deliverableReferences.deliverableId, deliverableId)).orderBy(asc(deliverableReferences.sortOrder));
  }

  async addDeliverableReference(data: InsertDeliverableReference): Promise<DeliverableReference> {
    const [created] = await db.insert(deliverableReferences).values(data).returning();
    return created;
  }

  async deleteDeliverableReference(id: string): Promise<boolean> {
    const result = await db.delete(deliverableReferences).where(eq(deliverableReferences.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Deliverable Analytics
  async getDeliverableAnalytics(deliverableId: string): Promise<DeliverableAnalytic | undefined> {
    const [analytics] = await db.select().from(deliverableAnalytics).where(eq(deliverableAnalytics.deliverableId, deliverableId));
    return analytics || undefined;
  }

  async createDeliverableAnalytics(analytics: InsertDeliverableAnalytic): Promise<DeliverableAnalytic> {
    const [created] = await db.insert(deliverableAnalytics).values(analytics).returning();
    return created;
  }

  async updateDeliverableAnalytics(id: string, analytics: Partial<InsertDeliverableAnalytic>): Promise<DeliverableAnalytic | undefined> {
    const [updated] = await db.update(deliverableAnalytics).set({ ...analytics, updatedAt: new Date() }).where(eq(deliverableAnalytics.id, id)).returning();
    return updated || undefined;
  }

  // Hashtag Library
  async searchHashtags(query: string, brandId?: string, limit?: number): Promise<HashtagLibraryItem[]> {
    const conditions = [ilike(hashtagLibrary.normalizedTag, `%${query.toLowerCase()}%`)];
    if (brandId) conditions.push(eq(hashtagLibrary.brandId, brandId));

    return await db.select().from(hashtagLibrary)
      .where(and(...conditions))
      .orderBy(desc(hashtagLibrary.usageCount))
      .limit(limit ?? 50);
  }

  async getHashtagsByBrand(brandId: string): Promise<HashtagLibraryItem[]> {
    return await db.select().from(hashtagLibrary).where(eq(hashtagLibrary.brandId, brandId)).orderBy(desc(hashtagLibrary.usageCount));
  }

  async upsertHashtag(hashtag: string, brandId: string, regionId?: string): Promise<HashtagLibraryItem> {
    const [existing] = await db.select().from(hashtagLibrary).where(
      and(eq(hashtagLibrary.hashtag, hashtag), eq(hashtagLibrary.brandId, brandId))
    );

    if (existing) {
      const [updated] = await db.update(hashtagLibrary)
        .set({ usageCount: (existing.usageCount ?? 0) + 1, lastUsedAt: new Date() })
        .where(eq(hashtagLibrary.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(hashtagLibrary).values({
      hashtag,
      normalizedTag: hashtag.toLowerCase().replace(/^#/, ''),
      brandId,
      regionId: regionId ?? null,
    }).returning();
    return created;
  }

  // Slack Notifications
  async createSlackNotification(notification: InsertSlackNotification): Promise<SlackNotification> {
    const [created] = await db.insert(slackNotifications).values(notification).returning();
    return created;
  }

  async getSlackNotification(id: string): Promise<SlackNotification | undefined> {
    const [notification] = await db.select().from(slackNotifications).where(eq(slackNotifications.id, id));
    return notification || undefined;
  }

  async updateSlackNotification(id: string, data: Partial<InsertSlackNotification>): Promise<SlackNotification | undefined> {
    const [updated] = await db.update(slackNotifications).set(data).where(eq(slackNotifications.id, id)).returning();
    return updated || undefined;
  }

  // Promotion Reminders
  async createPromotionReminder(reminder: InsertPromotionReminder): Promise<PromotionReminder> {
    const [created] = await db.insert(promotionReminders).values(reminder).returning();
    return created;
  }

  async getDueReminders(currentDate: string): Promise<PromotionReminder[]> {
    return await db.select().from(promotionReminders).where(
      and(
        eq(promotionReminders.sent, false),
        lte(promotionReminders.reminderDate, currentDate)
      )
    );
  }

  async markReminderSent(id: string): Promise<void> {
    await db.update(promotionReminders).set({ sent: true, sentAt: new Date() }).where(eq(promotionReminders.id, id));
  }

  // Social Accounts
  async getSocialAccounts(filters?: { platform?: string; brandId?: string; regionId?: string; isActive?: boolean }): Promise<SocialAccount[]> {
    const conditions = [];
    if (filters?.platform) conditions.push(eq(socialAccounts.platform, filters.platform));
    if (filters?.brandId) conditions.push(eq(socialAccounts.brandId, filters.brandId));
    if (filters?.regionId) conditions.push(eq(socialAccounts.regionId, filters.regionId));
    if (filters?.isActive !== undefined) conditions.push(eq(socialAccounts.isActive, filters.isActive));

    if (conditions.length > 0) {
      return await db.select().from(socialAccounts).where(and(...conditions)).orderBy(asc(socialAccounts.accountName));
    }
    return await db.select().from(socialAccounts).orderBy(asc(socialAccounts.accountName));
  }

  async getSocialAccount(id: string): Promise<SocialAccount | undefined> {
    const [account] = await db.select().from(socialAccounts).where(eq(socialAccounts.id, id));
    return account || undefined;
  }

  async createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount> {
    const [created] = await db.insert(socialAccounts).values(account).returning();
    return created;
  }

  async updateSocialAccount(id: string, account: Partial<InsertSocialAccount>): Promise<SocialAccount | undefined> {
    const [updated] = await db.update(socialAccounts).set({ ...account, updatedAt: new Date() }).where(eq(socialAccounts.id, id)).returning();
    return updated || undefined;
  }

  async deleteSocialAccount(id: string): Promise<boolean> {
    const result = await db.delete(socialAccounts).where(eq(socialAccounts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Tagged Creators
  async searchTaggedCreators(query: string, platform?: string, brandId?: string, limit?: number): Promise<TaggedCreator[]> {
    const conditions = [ilike(taggedCreators.handle, `%${query}%`)];
    if (platform) conditions.push(eq(taggedCreators.platform, platform));
    if (brandId) conditions.push(eq(taggedCreators.brandId, brandId));

    return await db.select().from(taggedCreators)
      .where(and(...conditions))
      .orderBy(desc(taggedCreators.usageCount))
      .limit(limit ?? 50);
  }

  async upsertTaggedCreator(platform: string, handle: string, brandId?: string, displayName?: string): Promise<TaggedCreator> {
    const conditions = [eq(taggedCreators.platform, platform), eq(taggedCreators.handle, handle)];
    if (brandId) conditions.push(eq(taggedCreators.brandId, brandId));

    const [existing] = await db.select().from(taggedCreators).where(and(...conditions));

    if (existing) {
      const [updated] = await db.update(taggedCreators)
        .set({ usageCount: (existing.usageCount ?? 0) + 1, lastUsedAt: new Date() })
        .where(eq(taggedCreators.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(taggedCreators).values({
      platform,
      handle,
      brandId: brandId ?? null,
      displayName: displayName ?? null,
    }).returning();
    return created;
  }

  // Project Activity Log
  async getProjectActivityLog(projectId: string, limit?: number): Promise<ProjectActivityLogEntry[]> {
    const query = db.select().from(projectActivityLog)
      .where(eq(projectActivityLog.projectId, projectId))
      .orderBy(desc(projectActivityLog.createdAt));
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async createActivityLogEntry(entry: InsertProjectActivityLog): Promise<ProjectActivityLogEntry> {
    const [created] = await db.insert(projectActivityLog).values(entry).returning();
    return created;
  }

  // Published Deliverables (enhanced)
  async getPublishedDeliverables(filters?: { platform?: string; brandId?: string; regionId?: string; accountId?: string; dateFrom?: Date; dateTo?: Date; search?: string; sort?: string; page?: number; limit?: number }): Promise<{ deliverables: ProjectDeliverable[]; total: number }> {
    const conditions = [eq(projectDeliverables.currentStage, 'COMPLETED' as any)];
    
    if (filters?.accountId) conditions.push(eq(projectDeliverables.publishedAccountId, filters.accountId));
    if (filters?.dateFrom) conditions.push(gte(projectDeliverables.actualPublishDate, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(projectDeliverables.actualPublishDate, filters.dateTo));
    if (filters?.search) {
      conditions.push(or(
        ilike(projectDeliverables.finalCopy, `%${filters.search}%`),
        ilike(projectDeliverables.deliverableName, `%${filters.search}%`)
      )!);
    }
    if (filters?.platform) {
      const platformMap: Record<string, string> = {
        instagram: 'INSTAGRAM_POST',
        facebook: 'FACEBOOK_POST',
        tiktok: 'TIKTOK_POST',
        linkedin: 'LINKEDIN_POST',
        twitter: 'TWITTER_POST',
        edm: 'EDM_GRAPHIC',
        website: 'WEBSITE_BANNER',
        event: 'EVENT_MATERIAL',
      };
      const deliverableType = platformMap[filters.platform.toLowerCase()];
      if (deliverableType) {
        conditions.push(eq(projectDeliverables.deliverableType, deliverableType as any));
      }
    }

    const whereClause = and(...conditions);
    
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(projectDeliverables).where(whereClause);
    const total = countResult?.count ?? 0;

    let orderBy;
    switch (filters?.sort) {
      case 'date_asc': orderBy = asc(projectDeliverables.actualPublishDate); break;
      case 'date_desc': default: orderBy = desc(projectDeliverables.actualPublishDate); break;
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const offset = (page - 1) * limit;

    const deliverables = await db.select().from(projectDeliverables)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return { deliverables, total };
  }

  // Deliverable Analytics History
  async getDeliverableAnalyticsHistory(deliverableId: string): Promise<DeliverableAnalytic[]> {
    return await db.select().from(deliverableAnalytics)
      .where(eq(deliverableAnalytics.deliverableId, deliverableId))
      .orderBy(desc(deliverableAnalytics.createdAt));
  }

  // Deadline Reminders
  async hasDeadlineReminderBeenSent(entityType: string, entityId: string, reminderType: string, userId: string): Promise<boolean> {
    const existing = await db.select().from(deadlineReminders)
      .where(and(
        eq(deadlineReminders.entityType, entityType),
        eq(deadlineReminders.entityId, entityId),
        eq(deadlineReminders.reminderType, reminderType),
        eq(deadlineReminders.userId, userId),
      ))
      .limit(1);
    return existing.length > 0;
  }

  async markDeadlineReminderSent(data: InsertDeadlineReminder): Promise<DeadlineReminder> {
    const [created] = await db.insert(deadlineReminders).values(data).returning();
    return created;
  }

  async getTasksWithUpcomingDeadlines(withinHours: number): Promise<Task[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinHours * 60 * 60 * 1000);
    return await db.select().from(tasks)
      .where(and(
        isNotNull(tasks.dueDate),
        gte(tasks.dueDate, now),
        lte(tasks.dueDate, cutoff),
        sql`${tasks.status} != 'DONE'`,
      ));
  }

  async getDeliverablesWithUpcomingDesignDeadlines(withinHours: number): Promise<ProjectDeliverable[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinHours * 60 * 60 * 1000);
    return await db.select().from(projectDeliverables)
      .where(and(
        isNotNull(projectDeliverables.designDeadline),
        gte(projectDeliverables.designDeadline, now),
        lte(projectDeliverables.designDeadline, cutoff),
        eq(projectDeliverables.currentStage, "DESIGN"),
      ));
  }

  async getSocialPostsWithUpcomingDeadlines(withinHours: number): Promise<SocialPost[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinHours * 60 * 60 * 1000);
    return await db.select().from(socialPosts)
      .where(and(
        isNotNull(socialPosts.scheduledDate),
        gte(socialPosts.scheduledDate, now),
        lte(socialPosts.scheduledDate, cutoff),
        sql`${socialPosts.copyStatus} != 'POSTED'`,
      ));
  }

  async getEmailCampaignsWithUpcomingDeadlines(withinHours: number): Promise<EmailCampaign[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinHours * 60 * 60 * 1000);
    return await db.select().from(emailCampaigns)
      .where(and(
        isNotNull(emailCampaigns.scheduledDate),
        gte(emailCampaigns.scheduledDate, now),
        lte(emailCampaigns.scheduledDate, cutoff),
        sql`${emailCampaigns.status} != 'SENT'`,
      ));
  }

  async getEventsWithUpcomingDeadlines(withinHours: number): Promise<Event[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinHours * 60 * 60 * 1000);
    return await db.select().from(events)
      .where(and(
        isNotNull(events.startDate),
        gte(events.startDate, now),
        lte(events.startDate, cutoff),
        sql`${events.status} != 'COMPLETED'`,
        sql`${events.status} != 'CANCELLED'`,
      ));
  }

  async getEventDeliverablesWithUpcomingDeadlines(withinHours: number): Promise<EventDeliverable[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinHours * 60 * 60 * 1000);
    return await db.select().from(eventDeliverables)
      .where(and(
        isNotNull(eventDeliverables.dueDate),
        gte(eventDeliverables.dueDate, now),
        lte(eventDeliverables.dueDate, cutoff),
        eq(eventDeliverables.isCompleted, false),
      ));
  }
}

export const storage = new DatabaseStorage();

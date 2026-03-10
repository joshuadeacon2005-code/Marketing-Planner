# MARKETING PLANNER - ADVANCED FEATURES: COPY WORKFLOW, CANVA SYNC, POST PREVIEWS & PERFORMANCE

## Overview
Add copywriter workflow, Canva asset synchronization, social media post previews, performance tracking, and enhanced filtering across the entire platform.

---

## FEATURE 1: COPYWRITER WORKFLOW & NOTIFICATIONS

### 1.1 New User Role: COPYWRITER

**Database Schema Changes:**
```typescript
// In shared/schema.ts - Update user role enum
export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "MARKETING_MANAGER", 
  "DESIGNER",
  "COPYWRITER",  // NEW ROLE
  "PUBLISHER",
  "USER"
]);
```

### 1.2 New Content Status Flow with Copywriter

**Current Flow:**
DRAFT → READY_FOR_GRAPHICS → GRAPHICS_READY → PENDING_APPROVAL → APPROVED → PUBLISHED

**New Flow with Copywriter:**
```
DRAFT 
  ↓
READY_FOR_COPY ← (Marketing Manager assigns to Copywriter)
  ↓
COPY_IN_PROGRESS ← (Copywriter working)
  ↓
COPY_READY ← (Copywriter completes, notifies Designer)
  ↓
READY_FOR_GRAPHICS ← (Designer picks up)
  ↓
GRAPHICS_IN_PROGRESS
  ↓
GRAPHICS_READY ← (Designer completes, notifies Marketing Manager)
  ↓
PENDING_APPROVAL ← (Marketing Manager reviews)
  ↓
APPROVED / REJECTED
  ↓
READY_TO_PUBLISH ← (Publisher notified)
  ↓
PUBLISHED
```

**Update Status Enums:**
```typescript
// shared/schema.ts
export const socialPostStatusEnum = pgEnum("social_post_status", [
  "DRAFT",
  "READY_FOR_COPY",
  "COPY_IN_PROGRESS", 
  "COPY_READY",
  "READY_FOR_GRAPHICS",
  "GRAPHICS_IN_PROGRESS",
  "GRAPHICS_READY",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "READY_TO_PUBLISH",
  "PUBLISHED",
  "ARCHIVED"
]);

// Update copy status field
export const socialPosts = pgTable("social_posts", {
  // ... existing fields ...
  
  copyStatus: socialPostStatusEnum("copy_status").default("DRAFT"),
  copywriterId: varchar("copywriter_id").references(() => users.id),
  copyAssignedAt: timestamp("copy_assigned_at"),
  copyCompletedAt: timestamp("copy_completed_at"),
  
  designerId: varchar("designer_id").references(() => users.id),
  designAssignedAt: timestamp("design_assigned_at"),
  designCompletedAt: timestamp("design_completed_at"),
  
  publisherId: varchar("publisher_id").references(() => users.id),
  publishAssignedAt: timestamp("publish_assigned_at"),
});
```

### 1.3 Copywriter Assignment & Notifications

**Notification Service Update:**
```typescript
// server/notificationService.ts

// Notify copywriter when assigned
export async function notifyCopywriterAssigned(
  post: SocialPost,
  copywriter: User
) {
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken || !copywriter.slackUserId) return;

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: copywriter.slackUserId,
      text: `New copy assignment: ${post.platform} post`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `✍️ New Copy Assignment`,
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Platform:* ${post.platform}\n*Brand:* ${post.brand?.name}\n*Scheduled:* ${formatDate(post.scheduledDate)}\n*Key Message:* ${post.keyMessage || 'Not specified'}`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Start Working"
              },
              style: "primary",
              url: `${process.env.APP_URL}/social?selected=${post.id}`
            }
          ]
        }
      ]
    }),
  });

  // Create in-app notification
  await storage.createNotification({
    userId: copywriter.id,
    type: "COPY_ASSIGNED",
    title: "New copy assignment",
    message: `You've been assigned to write copy for a ${post.platform} post`,
    linkUrl: `/social?selected=${post.id}`,
    isRead: false,
  });
}

// Notify designer when copy is ready
export async function notifyDesignerCopyReady(
  post: SocialPost,
  designer: User
) {
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken || !designer.slackUserId) return;

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: designer.slackUserId,
      text: `Copy ready: ${post.platform} post`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `✅ Copy Ready for Design`,
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Platform:* ${post.platform}\n*Brand:* ${post.brand?.name}\n*Caption:*\n${post.caption?.substring(0, 300)}`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Start Design"
              },
              style: "primary",
              url: `${process.env.APP_URL}/social?selected=${post.id}`
            }
          ]
        }
      ]
    }),
  });

  await storage.createNotification({
    userId: designer.id,
    type: "COPY_READY",
    title: "Copy ready for graphics",
    message: `Copy completed for ${post.platform} post - ready for design`,
    linkUrl: `/social?selected=${post.id}`,
    isRead: false,
  });
}
```

---

## FEATURE 2: POST COLLABORATION & TAGS

### 2.1 Collaboration Profiles

**Database Schema:**
```typescript
// shared/schema.ts

// Collaboration profiles (e.g., influencers, partners, guests)
export const collaborationProfiles = pgTable("collaboration_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // "INFLUENCER" | "PARTNER" | "GUEST" | "AGENCY"
  handle: text("handle"), // Social media handle
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  brandId: varchar("brand_id").references(() => brands.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Link posts to collaboration profiles
export const postCollaborations = pgTable("post_collaborations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => socialPosts.id, { onDelete: "cascade" }),
  profileId: varchar("profile_id").notNull().references(() => collaborationProfiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Post tags
export const postTags = pgTable("post_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color").default("#6B7280"),
  description: text("description"),
  category: text("category"), // "CAMPAIGN" | "THEME" | "SEASON" | "CUSTOM"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Link posts to tags
export const postTagRelations = pgTable("post_tag_relations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => socialPosts.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => postTags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Validation schemas
export const insertCollaborationProfileSchema = createInsertSchema(collaborationProfiles);
export const insertPostTagSchema = createInsertSchema(postTags);
```

### 2.2 UI Components for Collaboration & Tags

**In Social Post Form:**
```typescript
// client/src/components/social-post-form.tsx

function SocialPostForm({ post, onSave }) {
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: collaborators } = useQuery({
    queryKey: ["/api/collaboration-profiles"],
  });

  const { data: tags } = useQuery({
    queryKey: ["/api/post-tags"],
  });

  return (
    <form>
      {/* ... existing fields ... */}

      {/* Collaboration Section */}
      <FormField label="Collaboration">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.hasCollaboration}
              onCheckedChange={(checked) => 
                setFormData({...formData, hasCollaboration: checked})
              }
            />
            <Label>This post includes a collaboration</Label>
          </div>
          
          {formData.hasCollaboration && (
            <MultiSelect
              placeholder="Select collaborators"
              options={collaborators?.map(c => ({
                label: `${c.name}${c.handle ? ` (@${c.handle})` : ''}`,
                value: c.id
              })) || []}
              value={selectedCollaborators}
              onChange={setSelectedCollaborators}
            />
          )}
        </div>
      </FormField>

      {/* Tags Section */}
      <FormField label="Tags">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.hasTags}
              onCheckedChange={(checked) => 
                setFormData({...formData, hasTags: checked})
              }
            />
            <Label>Add tags to this post</Label>
          </div>
          
          {formData.hasTags && (
            <div className="space-y-3">
              <MultiSelect
                placeholder="Select or create tags"
                options={tags?.map(t => ({
                  label: t.name,
                  value: t.id
                })) || []}
                value={selectedTags}
                onChange={setSelectedTags}
              />
              
              {/* Quick create tag */}
              <div className="flex gap-2">
                <Input
                  placeholder="Create new tag..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                <Button 
                  type="button"
                  size="sm"
                  onClick={handleCreateTag}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Display selected tags */}
              <div className="flex flex-wrap gap-2">
                {selectedTags.map(tagId => {
                  const tag = tags?.find(t => t.id === tagId);
                  return tag ? (
                    <Badge 
                      key={tag.id}
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => setSelectedTags(prev => prev.filter(id => id !== tagId))}
                      />
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      </FormField>
    </form>
  );
}
```

---

## FEATURE 3: ENHANCED CALENDAR FILTERING

### 3.1 Add Country/Region Filter to All Calendars

**Update UnifiedCalendar Component:**
```typescript
// client/src/components/unified-calendar.tsx

export function UnifiedCalendar() {
  const [filters, setFilters] = useState({
    brandIds: [] as string[],
    regionIds: [] as string[],  // NEW: Region/Country filter
    platforms: [] as string[],
    contentTypes: ['social', 'email', 'event', 'promotion', 'task'],
    tagIds: [] as string[],  // NEW: Tag filter
  });

  // Get user's default region
  const { data: currentUser } = useQuery({ queryKey: ["/api/auth/me"] });

  // Set default filter to user's region
  useEffect(() => {
    if (currentUser?.regionId && filters.regionIds.length === 0) {
      setFilters(prev => ({
        ...prev,
        regionIds: [currentUser.regionId]
      }));
    }
  }, [currentUser]);

  return (
    <div className="space-y-4">
      {/* Enhanced Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            {/* Country/Region Filter - PROMINENT POSITION */}
            <div>
              <Label className="mb-2 block">Country/Region</Label>
              <MultiSelect
                placeholder="All countries"
                options={regions?.map(r => ({
                  label: `${r.name} (${r.code})`,
                  value: r.id
                })) || []}
                value={filters.regionIds}
                onChange={(value) => setFilters({...filters, regionIds: value})}
              />
            </div>

            {/* Brand Filter */}
            <div>
              <Label className="mb-2 block">Brands</Label>
              <MultiSelect
                placeholder="All brands"
                options={brands?.map(b => ({
                  label: b.name,
                  value: b.id
                })) || []}
                value={filters.brandIds}
                onChange={(value) => setFilters({...filters, brandIds: value})}
              />
            </div>

            {/* Platform Filter */}
            <div>
              <Label className="mb-2 block">Platforms</Label>
              <MultiSelect
                placeholder="All platforms"
                options={[
                  { label: 'Instagram', value: 'INSTAGRAM' },
                  { label: 'Facebook', value: 'FACEBOOK' },
                  { label: 'LinkedIn', value: 'LINKEDIN' },
                  { label: 'Twitter', value: 'TWITTER' },
                  { label: 'TikTok', value: 'TIKTOK' },
                ]}
                value={filters.platforms}
                onChange={(value) => setFilters({...filters, platforms: value})}
              />
            </div>

            {/* Tags Filter - NEW */}
            <div>
              <Label className="mb-2 block">Tags</Label>
              <MultiSelect
                placeholder="All tags"
                options={tags?.map(t => ({
                  label: t.name,
                  value: t.id
                })) || []}
                value={filters.tagIds}
                onChange={(value) => setFilters({...filters, tagIds: value})}
              />
            </div>

            {/* Content Type Filter */}
            <div>
              <Label className="mb-2 block">Content Types</Label>
              <MultiSelect
                placeholder="All types"
                options={[
                  { label: 'Social Posts', value: 'social' },
                  { label: 'Emails', value: 'email' },
                  { label: 'Events', value: 'event' },
                  { label: 'Promotions', value: 'promotion' },
                  { label: 'Tasks', value: 'task' },
                ]}
                value={filters.contentTypes}
                onChange={(value) => setFilters({...filters, contentTypes: value})}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              {filters.regionIds.length === 0 && (
                <Badge variant="secondary">Showing all countries</Badge>
              )}
              {currentUser?.regionId && filters.regionIds.includes(currentUser.regionId) && (
                <Badge variant="default">Your region selected</Badge>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setFilters({
                brandIds: [],
                regionIds: currentUser?.regionId ? [currentUser.regionId] : [],
                platforms: [],
                contentTypes: ['social', 'email', 'event', 'promotion', 'task'],
                tagIds: [],
              })}
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar component */}
      <Calendar ... />
    </div>
  );
}
```

### 3.2 Apply Filters in All Views

**Update API Calls to Include Filters:**
```typescript
// Fetch content with all filters applied
const { data: socialPosts } = useQuery({
  queryKey: ["/api/social", filters],
  queryFn: async () => {
    const params = new URLSearchParams();
    if (filters.brandIds.length) params.append('brandIds', filters.brandIds.join(','));
    if (filters.regionIds.length) params.append('regionIds', filters.regionIds.join(','));
    if (filters.platforms.length) params.append('platforms', filters.platforms.join(','));
    if (filters.tagIds.length) params.append('tagIds', filters.tagIds.join(','));
    
    const res = await fetch(`/api/social?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },
  enabled: filters.contentTypes.includes('social'),
});
```

---

## FEATURE 4: BRAND ASSET MANAGEMENT & CANVA SYNC

### 4.1 Enhanced Asset Upload

**Database Schema:**
```typescript
// shared/schema.ts - Update asset library
export const assetLibrary = pgTable("asset_library", {
  // ... existing fields ...
  
  source: text("source").default("UPLOAD"), // "UPLOAD" | "CANVA" | "GENERATED"
  canvaAssetId: text("canva_asset_id"), // Canva asset ID
  canvaDesignId: text("canva_design_id"), // Canva design ID
  canvaEditUrl: text("canva_edit_url"), // Link to edit in Canva
  canvaThumbnailUrl: text("canva_thumbnail_url"), // Canva thumbnail
  
  autoLinkedFromPost: boolean("auto_linked_from_post").default(false),
  linkedPostId: varchar("linked_post_id").references(() => socialPosts.id),
});
```

### 4.2 Auto-Link Graphics to Asset Library

**When Designer Uploads Graphics:**
```typescript
// server/routes.ts

app.post("/api/social/:id/upload-asset", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { assetUrl, assetName } = req.body;
    
    const post = await storage.getSocialPost(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Update post with asset URL
    await storage.updateSocialPost(id, { assetUrl });
    
    // AUTO-CREATE ASSET LIBRARY ENTRY
    const asset = await storage.createAsset({
      name: assetName || `${post.platform} - ${post.brand?.name} - ${formatDate(post.scheduledDate)}`,
      brandId: post.brandId,
      assetType: "GRAPHIC",
      fileUrl: assetUrl,
      source: "GENERATED",
      autoLinkedFromPost: true,
      linkedPostId: post.id,
      uploadedById: req.user.userId,
    });
    
    console.log(`✓ Auto-created asset library entry: ${asset.id}`);
    
    res.json({ post, asset });
  } catch (error) {
    console.error("Upload asset error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
```

### 4.3 Canva API Integration

**Environment Variables:**
```bash
CANVA_CLIENT_ID=your_canva_client_id
CANVA_CLIENT_SECRET=your_canva_client_secret
CANVA_ACCESS_TOKEN=your_canva_access_token
CANVA_FOLDER_ID=your_uploads_folder_id
```

**Canva Sync Service:**
```typescript
// server/canvaService.ts

import { storage } from "./storage";

interface CanvaAsset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'design';
  thumbnail: {
    url: string;
    width: number;
    height: number;
  };
  created_at: string;
  updated_at: string;
}

interface CanvaDesign {
  id: string;
  title: string;
  urls: {
    edit_url: string;
    view_url: string;
  };
}

export class CanvaService {
  private accessToken: string;
  private folderId: string;

  constructor() {
    this.accessToken = process.env.CANVA_ACCESS_TOKEN!;
    this.folderId = process.env.CANVA_FOLDER_ID!;
    
    if (!this.accessToken) {
      throw new Error("CANVA_ACCESS_TOKEN not configured");
    }
  }

  // Sync assets from Canva folder
  async syncCanvaAssets(brandId?: string): Promise<number> {
    try {
      console.log("🔄 Starting Canva asset sync...");
      
      // 1. Get folder items (images and designs)
      const response = await fetch(
        `https://api.canva.com/rest/v1/folders/${this.folderId}/items?item_types=image,design`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Canva API error: ${response.statusText}`);
      }

      const { items } = await response.json();
      console.log(`✓ Found ${items.length} items in Canva folder`);

      let syncedCount = 0;

      // 2. Process each item
      for (const item of items) {
        try {
          if (item.type === 'image') {
            await this.syncImageAsset(item.image, brandId);
            syncedCount++;
          } else if (item.type === 'design') {
            await this.syncDesignAsset(item.design, brandId);
            syncedCount++;
          }
        } catch (error) {
          console.error(`Error syncing item ${item.id}:`, error);
        }
      }

      console.log(`✅ Canva sync complete: ${syncedCount} assets synced`);
      return syncedCount;

    } catch (error) {
      console.error("Canva sync error:", error);
      throw error;
    }
  }

  // Sync individual image asset
  private async syncImageAsset(asset: CanvaAsset, brandId?: string) {
    // Check if asset already exists
    const existing = await storage.getAssetByCanvaId(asset.id);
    
    if (existing) {
      // Update existing asset
      await storage.updateAsset(existing.id, {
        canvaThumbnailUrl: asset.thumbnail.url,
        updatedAt: new Date(),
      });
      console.log(`  ↻ Updated existing asset: ${asset.name}`);
      return;
    }

    // Download thumbnail to permanent storage
    const thumbnailUrl = await this.downloadAndStoreImage(
      asset.thumbnail.url,
      asset.name
    );

    // Create new asset entry
    await storage.createAsset({
      name: asset.name,
      brandId: brandId || null,
      assetType: "GRAPHIC",
      fileUrl: thumbnailUrl,
      source: "CANVA",
      canvaAssetId: asset.id,
      canvaThumbnailUrl: asset.thumbnail.url,
      uploadedById: null, // System sync
    });

    console.log(`  ✓ Synced new asset: ${asset.name}`);
  }

  // Sync design asset
  private async syncDesignAsset(design: CanvaDesign, brandId?: string) {
    // Get design thumbnail
    const thumbnailResponse = await fetch(
      `https://api.canva.com/rest/v1/designs/${design.id}/thumbnail`,
      {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      }
    );

    const thumbnailData = await thumbnailResponse.json();
    
    // Check if already exists
    const existing = await storage.getAssetByCanvaId(design.id);
    
    if (existing) {
      await storage.updateAsset(existing.id, {
        canvaEditUrl: design.urls.edit_url,
        canvaThumbnailUrl: thumbnailData.thumbnail?.url,
        updatedAt: new Date(),
      });
      console.log(`  ↻ Updated existing design: ${design.title}`);
      return;
    }

    // Download and store thumbnail
    const thumbnailUrl = await this.downloadAndStoreImage(
      thumbnailData.thumbnail?.url,
      design.title
    );

    // Create asset entry
    await storage.createAsset({
      name: design.title,
      brandId: brandId || null,
      assetType: "DESIGN",
      fileUrl: thumbnailUrl,
      source: "CANVA",
      canvaDesignId: design.id,
      canvaEditUrl: design.urls.edit_url,
      canvaThumbnailUrl: thumbnailData.thumbnail?.url,
      uploadedById: null,
    });

    console.log(`  ✓ Synced new design: ${design.title}`);
  }

  // Download image and store permanently
  private async downloadAndStoreImage(url: string, name: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    
    // Save to attached_assets folder
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    
    const hash = crypto.createHash('md5').update(name).digest('hex');
    const ext = path.extname(name) || '.jpg';
    const filename = `canva_${hash}${ext}`;
    const filepath = path.join(process.cwd(), 'attached_assets', filename);
    
    fs.writeFileSync(filepath, Buffer.from(buffer));
    
    // Return URL for accessing the file
    return `/assets/${filename}`;
  }
}

// Export singleton instance
export const canvaService = new CanvaService();
```

**Sync Endpoint:**
```typescript
// server/routes.ts

app.post("/api/canva/sync", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { brandId } = req.body;
    const syncedCount = await canvaService.syncCanvaAssets(brandId);
    
    res.json({ 
      success: true,
      syncedCount,
      message: `Successfully synced ${syncedCount} assets from Canva`
    });
  } catch (error) {
    console.error("Canva sync error:", error);
    res.status(500).json({ message: "Failed to sync Canva assets" });
  }
});

// Auto-sync endpoint (for cron job)
app.post("/api/canva/auto-sync", async (req: any, res) => {
  // Verify cron secret
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const syncedCount = await canvaService.syncCanvaAssets();
    res.json({ success: true, syncedCount });
  } catch (error) {
    res.status(500).json({ message: "Sync failed" });
  }
});
```

### 4.4 Asset Preview with Canva Redirect

**Asset Card Component:**
```typescript
// client/src/components/asset-card.tsx

export function AssetCard({ asset }: { asset: AssetLibraryItem }) {
  const handleClick = () => {
    if (asset.source === 'CANVA' && asset.canvaEditUrl) {
      // Redirect to Canva to edit
      window.open(asset.canvaEditUrl, '_blank');
    } else {
      // Open preview modal
      openAssetPreview(asset);
    }
  };

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleClick}
    >
      <div className="aspect-video bg-muted relative">
        <img 
          src={asset.canvaThumbnailUrl || asset.fileUrl} 
          alt={asset.name}
          className="object-cover w-full h-full"
        />
        
        {/* Source Badge */}
        <Badge 
          className="absolute top-2 right-2"
          variant={asset.source === 'CANVA' ? 'default' : 'secondary'}
        >
          {asset.source === 'CANVA' && <ExternalLink className="h-3 w-3 mr-1" />}
          {asset.source}
        </Badge>

        {/* Brand Badge */}
        {asset.brand && (
          <Badge 
            className="absolute top-2 left-2"
            style={{ backgroundColor: asset.brand.color }}
          >
            {asset.brand.name}
          </Badge>
        )}
      </div>

      <CardContent className="pt-4">
        <h3 className="font-semibold text-sm">{asset.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {asset.assetType}
        </p>
        
        {asset.source === 'CANVA' && (
          <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
            <ExternalLink className="h-3 w-3" />
            <span>Click to edit in Canva</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## FEATURE 5: SOCIAL MEDIA POST PREVIEWS

### 5.1 Real Platform Preview Components

**Database - Store Preview Data:**
```typescript
// No schema changes needed - preview is generated on-the-fly from post data
```

**Preview Component:**
```typescript
// client/src/components/post-preview.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PostPreviewProps {
  post: SocialPost;
  open: boolean;
  onClose: () => void;
}

export function PostPreview({ post, open, onClose }: PostPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post Preview - {post.platform}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={post.platform.toLowerCase()}>
          <TabsList>
            <TabsTrigger value="instagram">Instagram</TabsTrigger>
            <TabsTrigger value="facebook">Facebook</TabsTrigger>
            <TabsTrigger value="tiktok">TikTok</TabsTrigger>
            <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
            <TabsTrigger value="twitter">Twitter/X</TabsTrigger>
          </TabsList>

          <TabsContent value="instagram">
            <InstagramPreview post={post} />
          </TabsContent>

          <TabsContent value="facebook">
            <FacebookPreview post={post} />
          </TabsContent>

          <TabsContent value="tiktok">
            <TikTokPreview post={post} />
          </TabsContent>

          <TabsContent value="linkedin">
            <LinkedInPreview post={post} />
          </TabsContent>

          <TabsContent value="twitter">
            <TwitterPreview post={post} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Instagram Preview with Accurate Frame
function InstagramPreview({ post }: { post: SocialPost }) {
  const brandColor = post.brand?.color || '#000000';
  
  return (
    <div className="bg-white rounded-lg border max-w-md mx-auto">
      {/* Instagram Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full"
            style={{ backgroundColor: brandColor }}
          />
          <div>
            <p className="font-semibold text-sm">{post.brand?.name || 'Brand Name'}</p>
            <p className="text-xs text-gray-500">Sponsored</p>
          </div>
        </div>
        <button className="text-xl">⋯</button>
      </div>

      {/* Image */}
      <div className="aspect-square bg-gray-100">
        {post.assetUrl ? (
          <img 
            src={post.assetUrl} 
            alt="Post"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No image uploaded
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="text-2xl">♡</button>
            <button className="text-2xl">💬</button>
            <button className="text-2xl">✈</button>
          </div>
          <button className="text-2xl">🔖</button>
        </div>

        {/* Likes */}
        <p className="font-semibold text-sm">1,234 likes</p>

        {/* Caption */}
        <div className="text-sm">
          <span className="font-semibold mr-1">{post.brand?.name || 'brandname'}</span>
          <span className="whitespace-pre-wrap">{post.caption || 'Caption text will appear here...'}</span>
        </div>

        {/* View all comments */}
        <p className="text-sm text-gray-500">View all 89 comments</p>

        {/* Time */}
        <p className="text-xs text-gray-400 uppercase">
          {formatDistanceToNow(new Date(post.scheduledDate), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

// Facebook Preview
function FacebookPreview({ post }: { post: SocialPost }) {
  return (
    <div className="bg-white rounded-lg border max-w-md mx-auto">
      {/* Facebook Header */}
      <div className="p-4 flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-full flex-shrink-0"
          style={{ backgroundColor: post.brand?.color || '#1877f2' }}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{post.brand?.name || 'Brand Name'}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>{formatDistanceToNow(new Date(post.scheduledDate), { addSuffix: true })}</span>
                <span>·</span>
                <span>🌐</span>
              </div>
            </div>
            <button className="text-2xl">⋯</button>
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="px-4 pb-3">
        <p className="text-sm whitespace-pre-wrap">
          {post.caption || 'Caption text will appear here...'}
        </p>
      </div>

      {/* Image */}
      <div className="bg-gray-100">
        {post.assetUrl ? (
          <img 
            src={post.assetUrl} 
            alt="Post"
            className="w-full object-cover"
          />
        ) : (
          <div className="w-full h-64 flex items-center justify-center text-gray-400">
            No image uploaded
          </div>
        )}
      </div>

      {/* Engagement Stats */}
      <div className="px-4 py-2 border-b flex items-center justify-between text-xs text-gray-500">
        <span>👍❤️ 1.2K</span>
        <div className="flex gap-3">
          <span>89 Comments</span>
          <span>23 Shares</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-2 flex items-center justify-around text-sm text-gray-600">
        <button className="flex items-center gap-2">
          <span>👍</span>
          <span>Like</span>
        </button>
        <button className="flex items-center gap-2">
          <span>💬</span>
          <span>Comment</span>
        </button>
        <button className="flex items-center gap-2">
          <span>↗</span>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}

// TikTok Preview
function TikTokPreview({ post }: { post: SocialPost }) {
  return (
    <div className="bg-black rounded-lg relative max-w-sm mx-auto" style={{ aspectRatio: '9/16' }}>
      {/* Video Area */}
      <div className="absolute inset-0">
        {post.assetUrl ? (
          <img 
            src={post.assetUrl} 
            alt="Post"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            No video uploaded
          </div>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center text-white">
          <div 
            className="w-12 h-12 rounded-full border-2 border-white"
            style={{ backgroundColor: post.brand?.color }}
          />
          <span className="text-xs mt-1">♡</span>
          <span className="text-xs">12.3K</span>
        </div>
        <div className="flex flex-col items-center text-white">
          <span className="text-2xl">💬</span>
          <span className="text-xs">892</span>
        </div>
        <div className="flex flex-col items-center text-white">
          <span className="text-2xl">🔗</span>
          <span className="text-xs">234</span>
        </div>
        <div className="flex flex-col items-center text-white">
          <span className="text-2xl">📤</span>
          <span className="text-xs">89</span>
        </div>
      </div>

      {/* Bottom Caption Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-8 h-8 rounded-full"
            style={{ backgroundColor: post.brand?.color }}
          />
          <p className="text-white font-semibold text-sm">@{post.brand?.name?.toLowerCase().replace(/\s+/g, '')}</p>
          <button className="text-white border border-white px-3 py-1 rounded text-xs font-semibold">
            Follow
          </button>
        </div>
        <p className="text-white text-sm line-clamp-2">
          {post.caption || 'Caption text will appear here...'}
        </p>
        <p className="text-white text-xs mt-1">
          🎵 Original Audio - {post.brand?.name}
        </p>
      </div>
    </div>
  );
}

// LinkedIn and Twitter previews similar structure...
```

**Add Preview Button to Post Card:**
```typescript
// In social post card/table
<Button 
  variant="ghost" 
  size="sm"
  onClick={() => setPreviewPost(post)}
>
  <Eye className="h-4 w-4 mr-2" />
  Preview
</Button>

{previewPost && (
  <PostPreview 
    post={previewPost}
    open={!!previewPost}
    onClose={() => setPreviewPost(null)}
  />
)}
```

---

## FEATURE 6: POST PERFORMANCE TRACKING

### 6.1 Performance Database Schema

```typescript
// shared/schema.ts

export const postPerformance = pgTable("post_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => socialPosts.id, { onDelete: "cascade" }),
  
  // Performance Metrics
  followers: integer("followers"),
  views: integer("views"),
  likes: integer("likes"),
  clicks: integer("clicks"),
  shares: integer("shares"), // Repost/Reshare
  comments: integer("comments"),
  saves: integer("saves"),
  
  // Engagement Rate (calculated)
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }),
  
  // Post Link
  postUrl: text("post_url"), // Direct link to published post
  
  // Remarks/Notes
  remarks: text("remarks"),
  
  // Tracking
  recordedAt: timestamp("recorded_at").notNull(),
  recordedById: varchar("recorded_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Validation schemas
export const insertPostPerformanceSchema = createInsertSchema(postPerformance);
export type PostPerformance = z.infer<typeof selectPostPerformanceSchema>;
```

### 6.2 Performance Entry Form

**Component:**
```typescript
// client/src/components/performance-form.tsx

export function PerformanceForm({ post, onSave }: { post: SocialPost, onSave: () => void }) {
  const [formData, setFormData] = useState({
    followers: 0,
    views: 0,
    likes: 0,
    clicks: 0,
    shares: 0,
    comments: 0,
    saves: 0,
    postUrl: '',
    remarks: '',
  });

  const calculateEngagementRate = () => {
    const { views, likes, clicks, shares, comments, saves } = formData;
    if (views === 0) return 0;
    
    const totalEngagements = likes + clicks + shares + comments + saves;
    return ((totalEngagements / views) * 100).toFixed(2);
  };

  const handleSubmit = async () => {
    const engagementRate = calculateEngagementRate();
    
    const response = await fetch(`/api/social/${post.id}/performance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...formData,
        engagementRate: parseFloat(engagementRate),
        recordedAt: new Date().toISOString(),
      })
    });

    if (response.ok) {
      toast.success("Performance data saved!");
      onSave();
    }
  };

  return (
    <Dialog open onOpenChange={onSave}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Post Performance</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Metrics */}
          <FormField label="Followers">
            <Input
              type="number"
              value={formData.followers}
              onChange={(e) => setFormData({...formData, followers: parseInt(e.target.value) || 0})}
            />
          </FormField>

          <FormField label="Views">
            <Input
              type="number"
              value={formData.views}
              onChange={(e) => setFormData({...formData, views: parseInt(e.target.value) || 0})}
            />
          </FormField>

          <FormField label="Likes">
            <Input
              type="number"
              value={formData.likes}
              onChange={(e) => setFormData({...formData, likes: parseInt(e.target.value) || 0})}
            />
          </FormField>

          <FormField label="Clicks">
            <Input
              type="number"
              value={formData.clicks}
              onChange={(e) => setFormData({...formData, clicks: parseInt(e.target.value) || 0})}
            />
          </FormField>

          <FormField label="Shares/Reposts">
            <Input
              type="number"
              value={formData.shares}
              onChange={(e) => setFormData({...formData, shares: parseInt(e.target.value) || 0})}
            />
          </FormField>

          <FormField label="Comments">
            <Input
              type="number"
              value={formData.comments}
              onChange={(e) => setFormData({...formData, comments: parseInt(e.target.value) || 0})}
            />
          </FormField>

          <FormField label="Saves">
            <Input
              type="number"
              value={formData.saves}
              onChange={(e) => setFormData({...formData, saves: parseInt(e.target.value) || 0})}
            />
          </FormField>

          {/* Engagement Rate (Calculated) */}
          <FormField label="Engagement Rate">
            <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
              <span className="font-semibold">{calculateEngagementRate()}%</span>
            </div>
          </FormField>
        </div>

        {/* Post URL */}
        <FormField label="Post URL">
          <Input
            type="url"
            placeholder="https://instagram.com/p/..."
            value={formData.postUrl}
            onChange={(e) => setFormData({...formData, postUrl: e.target.value})}
          />
        </FormField>

        {/* Remarks */}
        <FormField label="Remarks/Notes">
          <Textarea
            placeholder="Any observations or notes about this post's performance..."
            rows={3}
            value={formData.remarks}
            onChange={(e) => setFormData({...formData, remarks: e.target.value})}
          />
        </FormField>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onSave}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Performance Data</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 6.3 Performance Display

**In Post Card:**
```typescript
// Show performance badge if data exists
{post.performance && (
  <div className="flex items-center gap-2 mt-2">
    <Badge variant="success">
      👁 {post.performance.views?.toLocaleString()}
    </Badge>
    <Badge variant="secondary">
      ❤️ {post.performance.likes?.toLocaleString()}
    </Badge>
    <Badge variant="outline">
      📊 {post.performance.engagementRate}% ER
    </Badge>
    {post.performance.postUrl && (
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => window.open(post.performance.postUrl, '_blank')}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    )}
  </div>
)}
```

---

## FEATURE 7: BEST PERFORMING POSTS HIGHLIGHT

### 7.1 Dashboard Highlights Section

```typescript
// client/src/components/top-performing-posts.tsx

export function TopPerformingPosts() {
  const { data: topPosts } = useQuery({
    queryKey: ["/api/social/top-performing"],
    queryFn: async () => {
      const res = await fetch("/api/social/top-performing?limit=6", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Best Performing Posts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topPosts?.map((post: any, index: number) => (
            <div 
              key={post.id}
              className="relative rounded-lg overflow-hidden border hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => window.open(post.performance?.postUrl, '_blank')}
            >
              {/* Rank Badge */}
              <div className="absolute top-2 left-2 z-10">
                <Badge 
                  variant={index === 0 ? "default" : "secondary"}
                  className="text-lg font-bold"
                >
                  #{index + 1}
                </Badge>
              </div>

              {/* Image */}
              <div className="aspect-square bg-gray-100">
                {post.assetUrl && (
                  <img 
                    src={post.assetUrl} 
                    alt={post.caption}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Performance Stats Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: post.brand?.color }}
                  />
                  <span className="text-white text-sm font-semibold">
                    {post.brand?.name}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-white text-xs">
                  <div>
                    <div className="opacity-70">Views</div>
                    <div className="font-bold">{post.performance?.views?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="opacity-70">Likes</div>
                    <div className="font-bold">{post.performance?.likes?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="opacity-70">ER</div>
                    <div className="font-bold">{post.performance?.engagementRate}%</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Add to Dashboard
export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Marketing Dashboard</h1>
      
      {/* Highlights */}
      <TopPerformingPosts />
      
      {/* Main Calendar */}
      <UnifiedCalendar />
    </div>
  );
}
```

**API Endpoint:**
```typescript
// server/routes.ts

app.get("/api/social/top-performing", authenticateToken, async (req: any, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const { regionId, brandId } = req.query;
    
    // Get posts with performance data, sorted by engagement rate
    const query = db
      .select({
        post: socialPosts,
        performance: postPerformance,
        brand: brands,
      })
      .from(socialPosts)
      .innerJoin(postPerformance, eq(socialPosts.id, postPerformance.postId))
      .leftJoin(brands, eq(socialPosts.brandId, brands.id))
      .where(eq(socialPosts.status, 'PUBLISHED'))
      .orderBy(desc(postPerformance.engagementRate))
      .limit(limit);
    
    // Apply filters
    if (regionId) {
      query.where(eq(socialPosts.regionId, regionId));
    }
    if (brandId) {
      query.where(eq(socialPosts.brandId, brandId));
    }
    
    const results = await query;
    
    // Transform results
    const topPosts = results.map(r => ({
      ...r.post,
      performance: r.performance,
      brand: r.brand,
    }));
    
    res.json(topPosts);
  } catch (error) {
    console.error("Get top performing posts error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
```

---

## FEATURE 8: SENT CONTENT PAGE WITH FILTERING

### 8.1 Published Content View

```typescript
// client/src/pages/sent.tsx

export default function SentPage() {
  const [filters, setFilters] = useState({
    contentType: 'all', // 'all' | 'social' | 'email' | 'event'
    brandIds: [] as string[],
    regionIds: [] as string[],
    dateRange: null as { from: Date, to: Date } | null,
  });

  // Get user's default region
  const { data: currentUser } = useQuery({ queryKey: ["/api/auth/me"] });

  // Set default to user's region
  useEffect(() => {
    if (currentUser?.regionId) {
      setFilters(prev => ({
        ...prev,
        regionIds: [currentUser.regionId]
      }));
    }
  }, [currentUser]);

  const { data: sentContent } = useQuery({
    queryKey: ["/api/sent", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.contentType !== 'all') params.append('type', filters.contentType);
      if (filters.brandIds.length) params.append('brandIds', filters.brandIds.join(','));
      if (filters.regionIds.length) params.append('regionIds', filters.regionIds.join(','));
      if (filters.dateRange) {
        params.append('from', filters.dateRange.from.toISOString());
        params.append('to', filters.dateRange.to.toISOString());
      }
      
      const res = await fetch(`/api/sent?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Published Content</h1>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Content Type */}
            <div>
              <Label className="mb-2 block">Content Type</Label>
              <Select 
                value={filters.contentType}
                onValueChange={(value) => setFilters({...filters, contentType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="social">Social Posts</SelectItem>
                  <SelectItem value="email">Email Campaigns</SelectItem>
                  <SelectItem value="event">Events</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Brand Filter */}
            <div>
              <Label className="mb-2 block">Brand</Label>
              <MultiSelect
                placeholder="All brands"
                options={brands?.map(b => ({ label: b.name, value: b.id })) || []}
                value={filters.brandIds}
                onChange={(value) => setFilters({...filters, brandIds: value})}
              />
            </div>

            {/* Region Filter */}
            <div>
              <Label className="mb-2 block">Country/Region</Label>
              <MultiSelect
                placeholder="Your region"
                options={regions?.map(r => ({ label: r.name, value: r.id })) || []}
                value={filters.regionIds}
                onChange={(value) => setFilters({...filters, regionIds: value})}
              />
            </div>

            {/* Date Range */}
            <div>
              <Label className="mb-2 block">Date Range</Label>
              <DateRangePicker
                value={filters.dateRange}
                onChange={(range) => setFilters({...filters, dateRange: range})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid/List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sentContent?.map((item: any) => (
          <Card key={item.id} className="overflow-hidden">
            {/* Preview Image */}
            <div className="aspect-video bg-gray-100 relative">
              {item.assetUrl && (
                <img 
                  src={item.assetUrl} 
                  alt={item.title || item.caption}
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Type Badge */}
              <Badge className="absolute top-2 left-2">
                {item.type === 'social' && '📱'}
                {item.type === 'email' && '📧'}
                {item.type === 'event' && '🎪'}
                {' '}{item.type.toUpperCase()}
              </Badge>

              {/* Brand Badge */}
              <Badge 
                className="absolute top-2 right-2"
                style={{ backgroundColor: item.brand?.color }}
              >
                {item.brand?.name}
              </Badge>
            </div>

            <CardContent className="pt-4">
              <h3 className="font-semibold line-clamp-2">
                {item.title || item.caption || item.subject}
              </h3>
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-muted-foreground">
                  {formatDate(item.publishedAt || item.scheduledDate)}
                </span>
                
                {/* Link to Published Post */}
                {item.postUrl && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.open(item.postUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Post
                  </Button>
                )}
              </div>

              {/* Performance Summary */}
              {item.performance && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Badge variant="outline">
                    👁 {item.performance.views?.toLocaleString()}
                  </Badge>
                  <Badge variant="outline">
                    ❤️ {item.performance.likes?.toLocaleString()}
                  </Badge>
                  <Badge variant="outline">
                    📊 {item.performance.engagementRate}%
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {sentContent?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No published content found with these filters
          </p>
        </div>
      )}
    </div>
  );
}
```

**API Endpoint:**
```typescript
// server/routes.ts

app.get("/api/sent", authenticateToken, async (req: any, res) => {
  try {
    const { type, brandIds, regionIds, from, to } = req.query;
    
    let allContent: any[] = [];
    
    // Fetch social posts
    if (!type || type === 'all' || type === 'social') {
      const posts = await storage.getSocialPosts({
        status: 'PUBLISHED',
        brandId: brandIds?.split(','),
        regionId: regionIds?.split(','),
        startDate: from ? new Date(from) : undefined,
        endDate: to ? new Date(to) : undefined,
      });
      
      // Get performance data for each
      for (const post of posts) {
        const [performance] = await db
          .select()
          .from(postPerformance)
          .where(eq(postPerformance.postId, post.id))
          .orderBy(desc(postPerformance.createdAt))
          .limit(1);
        
        allContent.push({
          ...post,
          type: 'social',
          performance,
          postUrl: performance?.postUrl,
        });
      }
    }
    
    // Fetch emails
    if (!type || type === 'all' || type === 'email') {
      const emails = await storage.getEmailCampaigns({
        status: 'SENT',
        brandId: brandIds?.split(','),
        regionId: regionIds?.split(','),
      });
      
      allContent.push(...emails.map(e => ({
        ...e,
        type: 'email',
      })));
    }
    
    // Fetch events
    if (!type || type === 'all' || type === 'event') {
      const events = await storage.getEvents({
        status: 'COMPLETED',
        regionId: regionIds?.split(','),
        startDate: from ? new Date(from) : undefined,
        endDate: to ? new Date(to) : undefined,
      });
      
      // Filter by brand
      if (brandIds) {
        const brandIdArray = brandIds.split(',');
        // Filter events that have the specified brands
        // (requires checking eventBrands table)
      }
      
      allContent.push(...events.map(e => ({
        ...e,
        type: 'event',
      })));
    }
    
    // Sort by published date
    allContent.sort((a, b) => 
      new Date(b.publishedAt || b.scheduledDate).getTime() - 
      new Date(a.publishedAt || a.scheduledDate).getTime()
    );
    
    res.json(allContent);
  } catch (error) {
    console.error("Get sent content error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Copywriter Workflow ✓
- [ ] Add COPYWRITER role to user enum
- [ ] Update status enums with copy statuses
- [ ] Add copywriter fields to content tables
- [ ] Implement assignment notifications
- [ ] Create copy workflow UI

### Phase 2: Collaboration & Tags ✓
- [ ] Create collaboration_profiles table
- [ ] Create post_tags table
- [ ] Create junction tables
- [ ] Build collaboration selector UI
- [ ] Build tag management UI
- [ ] Add to content creation forms

### Phase 3: Enhanced Filtering ✓
- [ ] Add region/country filter to all calendars
- [ ] Add tag filter to calendars
- [ ] Set user region as default filter
- [ ] Update all API endpoints to support filters
- [ ] Test filter combinations

### Phase 4: Asset Management & Canva ✓
- [ ] Update asset schema with Canva fields
- [ ] Build CanvaService class
- [ ] Implement sync endpoints
- [ ] Create auto-link on upload
- [ ] Build asset preview with Canva redirect
- [ ] Add manual sync button
- [ ] Set up cron job for auto-sync

### Phase 5: Post Previews ✓
- [ ] Create preview components for each platform
- [ ] Implement Instagram frame
- [ ] Implement Facebook frame
- [ ] Implement TikTok frame
- [ ] Implement LinkedIn frame
- [ ] Implement Twitter frame
- [ ] Add preview button to post cards
- [ ] Test with various content types

### Phase 6: Performance Tracking ✓
- [ ] Create post_performance table
- [ ] Build performance entry form
- [ ] Add calculate engagement rate
- [ ] Display performance badges
- [ ] Add external link to published post
- [ ] Test performance data entry

### Phase 7: Best Performing Posts ✓
- [ ] Create top performing endpoint
- [ ] Build highlights component
- [ ] Add to dashboard
- [ ] Test sorting by engagement rate
- [ ] Add region/brand filters

### Phase 8: Sent Content Page ✓
- [ ] Create sent page route
- [ ] Build filter UI
- [ ] Implement content grid
- [ ] Add external links to posts
- [ ] Test filtering by type/brand/region
- [ ] Verify user sees their region by default

---

## TESTING GUIDE

1. **Copywriter Workflow**
   - Assign copywriter to post
   - Verify Slack notification sent
   - Complete copy, verify designer notified
   - Test full workflow: copy → design → approval → publish

2. **Collaboration & Tags**
   - Create collaboration profile
   - Add collaborator to post
   - Create tags
   - Tag posts
   - Filter calendar by tags

3. **Filtering**
   - Verify user sees their region by default
   - Test multi-select filters
   - Test filter combinations
   - Verify other regions are accessible

4. **Canva Integration**
   - Configure Canva API credentials
   - Run manual sync
   - Verify assets appear
   - Click asset, verify Canva opens
   - Test auto-link on upload

5. **Post Previews**
   - Create post with image
   - Preview on each platform
   - Verify layout matches real platform
   - Check no content hidden by buttons

6. **Performance Tracking**
   - Record performance data
   - Verify engagement rate calculation
   - Add post URL
   - Click URL, verify redirect
   - Check badges display correctly

7. **Best Performing**
   - Add performance to multiple posts
   - Check dashboard highlights
   - Verify sorted by engagement rate
   - Test filters

8. **Sent Content**
   - Publish content
   - Check appears on sent page
   - Test type/brand/region filters
   - Verify default shows user's region
   - Test external links

---

This comprehensive implementation adds all requested features while maintaining data integrity and user experience across the platform!

# Marketing Planner V3 — Complete Feature Update Prompt

**Project:** B2B Marketing Planner for Bloom & Grow Group
**Date:** February 12, 2026
**Prepared by:** JD CoreDev

---

## 🎯 EXECUTIVE SUMMARY

This prompt covers a comprehensive update to the Marketing Planner platform. The core changes are: editable projects after creation, full Slack integration with stage-change buttons, improved dashboard UI, multi-account publishing with per-platform publish buttons, social media API modules (TikTok, Meta, LinkedIn, Twitter/X), hashtag/creator memory, auto-syncing analytics, calendar view, platform-frame previews on the published page, AI copywriting, and settings-based API management. Every feature below must be implemented in full.

---

## 📋 TABLE OF CONTENTS

1. [Editable Projects](#1-editable-projects)
2. [Slack Integration & Stage Changes](#2-slack-integration--stage-changes)
3. [Dashboard Redesign](#3-dashboard-redesign)
4. [Project Profile & Custom Assignments](#4-project-profile--custom-assignments)
5. [Hashtag & Creator Memory System](#5-hashtag--creator-memory-system)
6. [Multi-Account Publishing](#6-multi-account-publishing)
7. [Per-Platform Publish Buttons](#7-per-platform-publish-buttons)
8. [Social Media API Modules](#8-social-media-api-modules)
9. [Publish Notifications (Slack)](#9-publish-notifications-slack)
10. [Auto-Sync Analytics](#10-auto-sync-analytics)
11. [Projects Page Calendar View](#11-projects-page-calendar-view)
12. [Published Posts — Direct Links to Live Posts](#12-published-posts--direct-links-to-live-posts)
13. [Analytics Preview & Deep View](#13-analytics-preview--deep-view)
14. [AI Copywriting](#14-ai-copywriting)
15. [Dashboard Quick Actions Replacement](#15-dashboard-quick-actions-replacement)
16. [Remove Archive Tab](#16-remove-archive-tab)
17. [Published Page — Detailed Filtering](#17-published-page--detailed-filtering)
18. [Platform Frame Previews](#18-platform-frame-previews)
19. [Canva Link for Publisher](#19-canva-link-for-publisher)
20. [Settings — Platform API Management](#20-settings--platform-api-management)
21. [Slack Stage-Change Buttons & Notifications](#21-slack-stage-change-buttons--notifications)
22. [Database Schema Updates](#22-database-schema-updates)
23. [Implementation Checklist](#23-implementation-checklist)

---

## 1. EDITABLE PROJECTS

### Current Problem
Projects cannot be modified after creation.

### Requirements

**Make ALL project fields editable after creation:**

- Project name
- Description
- Brand / Region assignment
- Campaign / Promotion links
- Start date and End date
- Deliverable types and quantities (add more, remove unused)
- Default team assignments (Designer, Copywriter, Publisher)

**Implementation:**

1. **Project Detail Page** — when a user opens a project, every field should be inline-editable or open an edit modal
2. **API Endpoint:** `PATCH /api/projects/:id`

```typescript
// Request body — all fields optional, only send what changed
interface UpdateProjectRequest {
  name?: string;
  description?: string;
  brand_id?: string;
  region_id?: string;
  campaign_id?: string;
  promotion_id?: string;
  start_date?: string; // ISO date
  end_date?: string;
  default_designer_id?: string;
  default_copywriter_id?: string;
  default_publisher_id?: string;
}
```

3. **Add Deliverables Post-Creation:**
   - [+ Add Deliverable] button in the project detail view
   - Opens mini-modal: select type, assign team member, confirm
   - Creates new `project_deliverables` record linked to existing project
   - Sends Slack notification to the assigned designer immediately

4. **Remove Deliverables:**
   - Only allow removal if deliverable is still in DESIGN stage and no work has been submitted
   - Show confirmation dialog: "This deliverable has not been started. Remove it?"
   - If any work exists (Canva link submitted, copy written), block deletion and show: "This deliverable has work in progress. Archive it instead?"

5. **Edit History:**
   - Log all edits to a `project_activity_log` table
   - Show activity feed in the project detail sidebar

```sql
CREATE TABLE project_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- 'edited_name', 'added_deliverable', 'changed_designer', etc.
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 2. SLACK INTEGRATION & STAGE CHANGES

### Requirements

The Slack bot must be the primary control interface for stage transitions. When any project or deliverable changes state, Slack must:

1. **Notify the relevant person** (designer, copywriter, publisher, or project creator)
2. **Provide interactive buttons** that allow the user to advance the stage directly from Slack
3. **Update the planner database** when a Slack button is clicked
4. **Confirm the change** back in Slack with an updated message

### Slack App Configuration

**Required OAuth Scopes:**
- `chat:write` — Send messages
- `chat:write.public` — Post in channels
- `users:read` — Look up user info
- `users:read.email` — Match Slack users to planner users
- `commands` — Slash commands
- `incoming-webhook` — Webhook posting

**Required Features:**
- Interactive Components enabled (Request URL: `https://your-domain.com/api/slack/interactions`)
- Event Subscriptions enabled
- Bot Token stored in environment variables as `SLACK_BOT_TOKEN`
- Signing Secret stored as `SLACK_SIGNING_SECRET`

### Stage Transition Flow via Slack

**A) New Project Created → Designer Notified**

```
🎨 New Design Task Assigned

📁 Project: Spring Sale 2026
🎯 Deliverable: Instagram Post #1
🏷️ Brand: BabyZen
📅 Due: Feb 20, 2026
👤 Assigned by: Josh

[Upload Canva Link]  [View Project]
```

**B) Designer Submits Canva Link → Copywriter Notified**

```
✏️ Design Ready for Copy

📁 Project: Spring Sale 2026
🎯 Deliverable: Instagram Post #1
🔗 Canva Link: https://canva.com/design/...
👤 Designer: Sarah

[Start Copywriting]  [Request Revision]  [View Design]
```

**C) Copywriter Completes Copy → Publisher Notified**

```
📤 Ready to Publish

📁 Project: Spring Sale 2026
🎯 Deliverable: Instagram Post #1
🔗 Canva Link: https://canva.com/design/...
📝 Copy: "Spring into savings! Up to 30% off..."
#springsale #babygear #discount

[Open Publisher]  [Request Revision]
```

**D) Post Published → Creator & Publisher Notified**

```
🎉 Post Published Successfully!

📁 Project: Spring Sale 2026
🎯 Deliverable: Instagram Post #1
📱 Platform: Instagram
👤 Account: @babycentral_sg
🕐 Published: Feb 15, 2026 10:00 AM SGT
🔗 Post URL: https://instagram.com/p/ABC123

[View Post]  [View Analytics]
```

### Slack Interactions Handler

**Endpoint:** `POST /api/slack/interactions`

```typescript
app.post('/api/slack/interactions', async (req, res) => {
  // Verify Slack signature
  const isValid = verifySlackSignature(req);
  if (!isValid) return res.status(401).send('Invalid signature');

  const payload = JSON.parse(req.body.payload);
  res.sendStatus(200); // Acknowledge immediately

  switch (payload.type) {
    case 'block_actions':
      const action = payload.actions[0];
      switch (action.action_id) {
        case 'upload_canva_link':
          await openCanvaLinkModal(payload.trigger_id, action.value);
          break;
        case 'start_copywriting':
          await advanceStage(action.value, 'COPYWRITING', payload.user.id);
          await updateSlackMessage(payload, '✅ Copywriting started');
          break;
        case 'request_revision':
          await openRevisionModal(payload.trigger_id, action.value);
          break;
        case 'mark_published':
          await advanceStage(action.value, 'COMPLETED', payload.user.id);
          await updateSlackMessage(payload, '✅ Published');
          break;
      }
      break;
    case 'view_submission':
      await handleModalSubmission(payload);
      break;
  }
});
```

### Critical: Button State Management

After a button is clicked:
1. **Remove ALL action buttons** from the original message
2. **Replace with a confirmation line** showing who clicked what and when
3. **Set `buttons_active = false`** in the `slack_notifications` table
4. **Prevent double-clicks** — if buttons_active is already false, ignore the action

```sql
CREATE TABLE slack_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES project_deliverables(id),
  slack_channel VARCHAR(100) NOT NULL,
  slack_message_ts VARCHAR(50) NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  buttons_active BOOLEAN DEFAULT TRUE,
  clicked_action VARCHAR(100),
  clicked_by_user_id UUID REFERENCES users(id),
  clicked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 3. DASHBOARD REDESIGN

### Current Problem
Dashboard has generic quick action buttons and irrelevant modules (upcoming deadlines for old system).

### New Dashboard Layout

**Replace the entire dashboard with project-relevant modules:**

#### Row 1: Welcome Banner + Stats
```
┌─────────────────────────────────────────────────────────────┐
│  Good morning, Josh 👋                                       │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 12       │  │ 5        │  │ 3        │  │ 24       │    │
│  │ Active   │  │ In Design│  │ Ready to │  │ Published│    │
│  │ Projects │  │          │  │ Publish  │  │ This Mo. │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

#### Row 2: Project Progress Overview + My Tasks
```
┌────────────────────────────────┐  ┌─────────────────────────┐
│  📊 Project Progress           │  │  📋 My Tasks             │
│                                │  │                         │
│  Spring Sale 2026       ████░░ │  │  • Instagram Post #1    │
│  6/10 deliverables      60%   │  │    Write copy — Due Feb 15│
│                                │  │                         │
│  Summer Launch          ██░░░░ │  │  • Facebook Post #2     │
│  2/8 deliverables       25%   │  │    Publish — Due Feb 16  │
│                                │  │                         │
│  Brand Refresh          ███░░░ │  │  • EDM Graphic #1       │
│  4/12 deliverables      33%   │  │    Design — Due Feb 18   │
│                                │  │                         │
└────────────────────────────────┘  └─────────────────────────┘
```

**Progress bars** should be gradient-filled using Bloom & Grow orange (#F7971C) to blue (#2575FC), with the percentage shown numerically beside the bar.

**Progress calculation:** `completed_deliverables / total_deliverables * 100`

A deliverable counts as "completed" when `current_stage = 'COMPLETED'`.

#### Row 3: Recent Activity + Top Performing Posts
```
┌────────────────────────────────┐  ┌─────────────────────────┐
│  🔔 Recent Activity            │  │  🏆 Top Performing Posts │
│                                │  │                         │
│  Sarah submitted design for    │  │  1. IG Post — 2.4K likes│
│  Instagram Post #1 — 2h ago   │  │  2. FB Post — 1.8K reach│
│                                │  │  3. TikTok — 15K views  │
│  Josh created new project      │  │                         │
│  "Summer Launch" — 5h ago     │  │  [View All Analytics →]  │
│                                │  │                         │
└────────────────────────────────┘  └─────────────────────────┘
```

#### Row 4: Upcoming Deadlines (Project-Based)
```
┌─────────────────────────────────────────────────────────────┐
│  📅 Upcoming Deadlines                                       │
│                                                              │
│  TODAY          │  THIS WEEK        │  NEXT WEEK             │
│  IG Post #1     │  FB Post #2       │  Summer Launch         │
│  Publish by 3pm │  Copy due Wed     │  All designs due       │
│                 │  EDM due Friday   │                        │
└─────────────────────────────────────────────────────────────┘
```

### Remove These Old Modules
- Generic quick action buttons (Create Post, Schedule Email, etc.)
- "Upcoming Deadlines" from the old individual-post system
- Any references to archive
- Any standalone post/email/event creation shortcuts

---

## 4. PROJECT PROFILE & CUSTOM ASSIGNMENTS

### Project Profile Page

When a user clicks into a project, they see a full project profile with:

**Header Section:**
- Project name (inline editable)
- Brand logo + name
- Region badge
- Status badge (Active / Completed)
- Date range: Start → End
- Created by: [User avatar + name]
- Created on: [Date]

**Team Assignment Section:**
```
┌─────────────────────────────────────────────────┐
│  👥 Team Assignments                             │
│                                                  │
│  Default Designer:    [Sarah Chen ▼]             │
│  Default Copywriter:  [Mike Wong ▼]              │
│  Default Publisher:   [Lisa Tan ▼]               │
│                                                  │
│  ⚙️ Custom Assignments (per deliverable)         │
│                                                  │
│  Instagram Post #1   Designer: [Sarah ▼]         │
│                      Copywriter: [Mike ▼]        │
│                      Publisher: [Lisa ▼]         │
│                                                  │
│  Instagram Post #2   Designer: [Alex ▼]  ← diff │
│                      Copywriter: [Mike ▼]        │
│                      Publisher: [Lisa ▼]         │
│                                                  │
│  Website Banner #1   Designer: [Sarah ▼]         │
│                      Copywriter: [— None —]      │
│                      Publisher: [Josh ▼]         │
└─────────────────────────────────────────────────┘
```

### Custom Assignment Logic

1. When a project is created, the "default" team is assigned to ALL deliverables
2. The user can **override assignments per deliverable** by clicking the dropdown next to each one
3. Changing a default does NOT retroactively change custom overrides
4. If a deliverable has a custom assignment, show a small indicator (different color or icon)

**Database:** The `project_deliverables` table already has `designer_id`, `copywriter_id`, `publisher_id` columns. These are the per-deliverable assignments. The `projects` table holds the defaults.

```sql
-- Add default assignment columns to projects table if not present
ALTER TABLE projects ADD COLUMN IF NOT EXISTS default_designer_id UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS default_copywriter_id UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS default_publisher_id UUID REFERENCES users(id);
```

**Deliverable Info Displayed:**
For each deliverable row, show:
- Deliverable name + type icon
- Current stage (with colored badge)
- Assigned team member for current stage
- Due date (if set)
- Canva link (if submitted)
- Copy preview (if written)
- Post URL (if published)

---

## 5. HASHTAG & CREATOR MEMORY SYSTEM

### Purpose
Remember every hashtag and tagged creator used across all projects, so users get autocomplete suggestions based on history.

### Database

```sql
-- Hashtag memory
CREATE TABLE hashtag_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag VARCHAR(255) NOT NULL,
  brand_id UUID REFERENCES brands(id),
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP DEFAULT NOW(),
  first_used_at TIMESTAMP DEFAULT NOW(),
  created_by_id UUID REFERENCES users(id),
  UNIQUE(hashtag, brand_id)
);

CREATE INDEX idx_hashtag_library_search ON hashtag_library(hashtag, brand_id);
CREATE INDEX idx_hashtag_library_usage ON hashtag_library(usage_count DESC);

-- Tagged creator memory
CREATE TABLE tagged_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL, -- 'instagram', 'tiktok', 'facebook', etc.
  handle VARCHAR(255) NOT NULL, -- '@username'
  display_name VARCHAR(255),
  brand_id UUID REFERENCES brands(id),
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP DEFAULT NOW(),
  first_used_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(platform, handle, brand_id)
);

CREATE INDEX idx_tagged_creators_search ON tagged_creators(handle, platform, brand_id);
```

### Autocomplete Behavior

**Hashtag Input Field:**
- When user types `#` followed by characters, query `hashtag_library` filtered by current brand
- Show results ranked by `usage_count DESC`
- Display: `#summersale (used 15 times)` — with usage count as context
- Group similar variations together (e.g., #summersale, #summer_sale, #SummerSale)
- Allow creating new hashtags inline

**Tagged Creator Input Field (separate from hashtags):**
- When user types `@` followed by characters, query `tagged_creators` filtered by platform + brand
- Show results: `@babycentral_sg (Instagram, used 8 times)`
- Allow selecting a platform filter
- Allow creating new tagged creators inline

**Auto-Update on Publish:**
When a post is published:
1. Parse all hashtags from the final copy
2. For each hashtag: INSERT or UPDATE (increment `usage_count`, update `last_used_at`)
3. Parse all @mentions from the final copy
4. For each mention: INSERT or UPDATE in `tagged_creators`

**API Endpoints:**

```
GET /api/hashtags/search?q=summer&brand_id=xxx — Returns matching hashtags
GET /api/tagged-creators/search?q=baby&platform=instagram&brand_id=xxx — Returns matching creators
POST /api/hashtags — Manually add a hashtag
POST /api/tagged-creators — Manually add a creator
```

---

## 6. MULTI-ACCOUNT PUBLISHING

### Problem
A publisher may be responsible for posting to multiple social media accounts (e.g., @babycentral_sg AND @babycentral_my on Instagram).

### Account Selection UI

When a publisher opens a deliverable in the PUBLISHING stage, they must **select which account to post to** before publishing.

**Database:**

```sql
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL, -- 'instagram', 'facebook', 'tiktok', 'linkedin', 'twitter', 'website'
  account_name VARCHAR(255) NOT NULL, -- Display name: "BabyCentral Singapore"
  account_handle VARCHAR(255), -- @babycentral_sg
  account_id VARCHAR(255), -- Platform-specific ID (e.g., Instagram Business Account ID)
  page_id VARCHAR(255), -- For Facebook pages
  access_token TEXT, -- Encrypted OAuth token
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  brand_id UUID REFERENCES brands(id),
  region_id UUID REFERENCES regions(id),
  is_active BOOLEAN DEFAULT TRUE,
  profile_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_social_accounts_platform ON social_accounts(platform, brand_id);
```

**Publisher UI:**

```
┌─────────────────────────────────────────────────┐
│  📤 Publish: Instagram Post #1                   │
│                                                  │
│  Select Account:                                 │
│  ┌──────────────────────────────────────┐        │
│  │ 📷 @babycentral_sg (Singapore)      │ ← ●   │
│  │ 📷 @babycentral_my (Malaysia)       │ ← ○   │
│  │ 📷 @babycentral_hk (Hong Kong)      │ ← ○   │
│  └──────────────────────────────────────┘        │
│                                                  │
│  [Publish to @babycentral_sg]                    │
└─────────────────────────────────────────────────┘
```

The publish button label must dynamically update to show the selected account.

**Record which account was used:**

```sql
ALTER TABLE project_deliverables ADD COLUMN IF NOT EXISTS published_account_id UUID REFERENCES social_accounts(id);
```

---

## 7. PER-PLATFORM PUBLISH BUTTONS

### Requirements

Each deliverable type should have its own individual publish button. The publisher should NOT see a single generic "Publish" button — they should see specific buttons per content type.

**For Social Media Platforms (API-integrated):**

```
┌─────────────────────────────────────────────────────┐
│  Deliverables Ready to Publish                       │
│                                                      │
│  Instagram Post #1                                   │
│  Account: @babycentral_sg                            │
│  [📷 Publish to Instagram]                           │
│                                                      │
│  Facebook Post #1                                    │
│  Account: BabyCentral Singapore                      │
│  [📘 Publish to Facebook]                            │
│                                                      │
│  TikTok Post #1                                      │
│  Account: @babycentral_sg                            │
│  [🎵 Publish to TikTok]                              │
│                                                      │
│  LinkedIn Post #1                                    │
│  Account: BabyCentral                                │
│  [💼 Publish to LinkedIn]                            │
│                                                      │
│  Twitter Post #1                                     │
│  Account: @babycentral                               │
│  [🐦 Publish to Twitter/X]                           │
└─────────────────────────────────────────────────────┘
```

**For Non-API Platforms (Website, EDM, Event Materials):**

These do not have direct API publishing. Instead, show a simple "Mark as Published" button that:
1. Changes the deliverable status to COMPLETED
2. Asks for a URL (optional for website posts, required field shows but can be skipped)
3. **Sends a Slack notification to the project creator** saying the content is ready/published

```
┌─────────────────────────────────────────────────────┐
│  Website Banner #1                                   │
│  [🌐 Mark as Published]                              │
│                                                      │
│  EDM Graphic #1                                      │
│  [📧 Mark as Published]                              │
│                                                      │
│  Event Material #1                                   │
│  [📋 Mark as Published]                              │
└─────────────────────────────────────────────────────┘
```

When "Mark as Published" is clicked, show a modal:
```
✅ Mark as Published

Post URL (optional): [________________________]
Notes: [________________________]

[Confirm]  [Cancel]
```

---

## 8. SOCIAL MEDIA API MODULES

Create separate, modular API integration files for each platform. Each module should be self-contained and follow the same interface pattern.

### Shared Interface

```typescript
// /server/integrations/types.ts

interface PublishResult {
  success: boolean;
  post_id?: string;
  post_url?: string;
  error?: string;
  platform: string;
  account_handle: string;
  published_at: string; // ISO timestamp
}

interface AnalyticsResult {
  post_id: string;
  platform: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  engagement_rate: number;
  video_views?: number;
  fetched_at: string;
}

interface SocialMediaModule {
  publish(params: PublishParams): Promise<PublishResult>;
  fetchAnalytics(postId: string, accountId: string): Promise<AnalyticsResult>;
  refreshToken(accountId: string): Promise<boolean>;
  validateConnection(accountId: string): Promise<boolean>;
}
```

### Module: Meta (Instagram + Facebook)

**File:** `/server/integrations/meta.ts`

```typescript
// Uses Meta Graph API v18.0+
// Instagram: Container-based publishing (create container → publish)
// Facebook: Direct page post

// Required scopes: pages_show_list, pages_read_engagement, pages_manage_posts,
// instagram_basic, instagram_content_publish, instagram_manage_insights

export class MetaIntegration implements SocialMediaModule {
  async publishToInstagram(params: {
    accountId: string;       // Instagram Business Account ID
    imageUrl: string;        // Public URL of the image
    caption: string;         // Includes copy + hashtags
    accessToken: string;
  }): Promise<PublishResult> {
    // Step 1: Create media container
    const container = await fetch(
      `https://graph.facebook.com/v18.0/${params.accountId}/media`,
      {
        method: 'POST',
        body: new URLSearchParams({
          image_url: params.imageUrl,
          caption: params.caption,
          access_token: params.accessToken,
        }),
      }
    );

    // Step 2: Publish container
    const publish = await fetch(
      `https://graph.facebook.com/v18.0/${params.accountId}/media_publish`,
      {
        method: 'POST',
        body: new URLSearchParams({
          creation_id: container.id,
          access_token: params.accessToken,
        }),
      }
    );

    return {
      success: true,
      post_id: publish.id,
      post_url: `https://www.instagram.com/p/${publish.id}`,
      platform: 'instagram',
      account_handle: params.accountHandle,
      published_at: new Date().toISOString(),
    };
  }

  async publishToFacebook(params: {
    pageId: string;
    imageUrl: string;
    caption: string;
    accessToken: string;
  }): Promise<PublishResult> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${params.pageId}/photos`,
      {
        method: 'POST',
        body: new URLSearchParams({
          url: params.imageUrl,
          message: params.caption,
          access_token: params.accessToken,
        }),
      }
    );

    return {
      success: true,
      post_id: response.id,
      post_url: `https://www.facebook.com/${response.id}`,
      platform: 'facebook',
      account_handle: params.pageName,
      published_at: new Date().toISOString(),
    };
  }

  async fetchInstagramAnalytics(mediaId: string, accessToken: string): Promise<AnalyticsResult> {
    const insights = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=impressions,reach,likes,comments,shares,saved,engagement&access_token=${accessToken}`
    );
    // Parse and return standardized AnalyticsResult
  }

  async fetchFacebookAnalytics(postId: string, accessToken: string): Promise<AnalyticsResult> {
    const insights = await fetch(
      `https://graph.facebook.com/v18.0/${postId}/insights?metric=post_impressions,post_reach,post_reactions_like_total,post_comments,post_shares&access_token=${accessToken}`
    );
    // Parse and return standardized AnalyticsResult
  }
}
```

### Module: TikTok

**File:** `/server/integrations/tiktok.ts`

```typescript
// Uses TikTok Content Posting API
// OAuth 2.0 flow: https://developers.tiktok.com/doc/login-kit-web
// Content Posting: https://developers.tiktok.com/doc/content-posting-api-get-started

// Required scopes: user.info.basic, video.upload, video.publish, video.list

export class TikTokIntegration implements SocialMediaModule {
  private baseUrl = 'https://open.tiktokapis.com/v2';

  async publish(params: {
    accessToken: string;
    videoUrl?: string;     // For video posts
    imageUrls?: string[];  // For photo posts (TikTok photo mode)
    caption: string;
    privacy: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  }): Promise<PublishResult> {

    // Step 1: Initialize upload
    const initResponse = await fetch(`${this.baseUrl}/post/publish/inbox/video/init/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: params.caption,
          privacy_level: params.privacy,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: params.videoUrl,
        },
      }),
    });

    const initData = await initResponse.json();

    // Step 2: Check publish status (TikTok is async)
    const publishId = initData.data.publish_id;

    // Poll for status
    let status = 'PROCESSING_UPLOAD';
    let attempts = 0;
    while (status === 'PROCESSING_UPLOAD' && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusResponse = await fetch(`${this.baseUrl}/post/publish/status/fetch/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publish_id: publishId }),
      });
      const statusData = await statusResponse.json();
      status = statusData.data.status;
      attempts++;
    }

    return {
      success: status === 'PUBLISH_COMPLETE',
      post_id: publishId,
      post_url: `https://www.tiktok.com/@${params.accountHandle}/video/${publishId}`,
      platform: 'tiktok',
      account_handle: params.accountHandle,
      published_at: new Date().toISOString(),
    };
  }

  async fetchAnalytics(videoId: string, accessToken: string): Promise<AnalyticsResult> {
    const response = await fetch(`${this.baseUrl}/video/query/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: { video_ids: [videoId] },
        fields: ['like_count', 'comment_count', 'share_count', 'view_count'],
      }),
    });

    const data = await response.json();
    const video = data.data.videos[0];

    return {
      post_id: videoId,
      platform: 'tiktok',
      impressions: video.view_count,
      reach: video.view_count, // TikTok doesn't separate reach
      likes: video.like_count,
      comments: video.comment_count,
      shares: video.share_count,
      saves: 0, // Not available via API
      clicks: 0,
      engagement_rate: ((video.like_count + video.comment_count + video.share_count) / video.view_count) * 100,
      video_views: video.view_count,
      fetched_at: new Date().toISOString(),
    };
  }

  // OAuth token refresh
  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    return response.json();
  }
}
```

### Module: LinkedIn

**File:** `/server/integrations/linkedin.ts`

```typescript
// Uses LinkedIn Marketing API
// OAuth 2.0: https://learn.microsoft.com/en-us/linkedin/shared/authentication
// Share API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares

// Required scopes: w_member_social, r_organization_social, w_organization_social, rw_organization_admin

export class LinkedInIntegration implements SocialMediaModule {
  private baseUrl = 'https://api.linkedin.com/v2';

  async publish(params: {
    accessToken: string;
    organizationId: string; // For company pages
    text: string;
    imageUrl?: string;
  }): Promise<PublishResult> {

    // Step 1: Register image upload (if image present)
    let imageUrn: string | undefined;
    if (params.imageUrl) {
      const registerResponse = await fetch(`${this.baseUrl}/assets?action=registerUpload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:organization:${params.organizationId}`,
            serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
          },
        }),
      });
      // Upload binary to the upload URL, get asset URN
    }

    // Step 2: Create share
    const shareResponse = await fetch(`${this.baseUrl}/ugcPosts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        author: `urn:li:organization:${params.organizationId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: params.text },
            shareMediaCategory: imageUrn ? 'IMAGE' : 'NONE',
            media: imageUrn ? [{ status: 'READY', media: imageUrn }] : [],
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });

    return {
      success: true,
      post_id: shareResponse.id,
      post_url: `https://www.linkedin.com/feed/update/${shareResponse.id}`,
      platform: 'linkedin',
      account_handle: params.orgName,
      published_at: new Date().toISOString(),
    };
  }

  async fetchAnalytics(shareId: string, accessToken: string): Promise<AnalyticsResult> {
    const response = await fetch(
      `${this.baseUrl}/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${orgId}&shares=List(${shareId})`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    // Parse LinkedIn analytics response
  }
}
```

### Module: Twitter/X

**File:** `/server/integrations/twitter.ts`

```typescript
// Uses Twitter API v2
// OAuth 2.0 with PKCE: https://developer.twitter.com/en/docs/authentication/oauth-2-0

// Required scopes: tweet.read, tweet.write, users.read, offline.access

export class TwitterIntegration implements SocialMediaModule {
  private baseUrl = 'https://api.twitter.com/2';

  async publish(params: {
    accessToken: string;
    text: string;
    mediaIds?: string[]; // Pre-uploaded media IDs
  }): Promise<PublishResult> {

    // Step 1: Upload media (if present)
    // Uses v1.1 media upload endpoint
    // POST https://upload.twitter.com/1.1/media/upload.json

    // Step 2: Create tweet
    const response = await fetch(`${this.baseUrl}/tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        media: params.mediaIds ? { media_ids: params.mediaIds } : undefined,
      }),
    });

    const tweet = await response.json();

    return {
      success: true,
      post_id: tweet.data.id,
      post_url: `https://twitter.com/${params.handle}/status/${tweet.data.id}`,
      platform: 'twitter',
      account_handle: params.handle,
      published_at: new Date().toISOString(),
    };
  }

  async fetchAnalytics(tweetId: string, accessToken: string): Promise<AnalyticsResult> {
    const response = await fetch(
      `${this.baseUrl}/tweets/${tweetId}?tweet.fields=public_metrics,organic_metrics`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    // Parse Twitter metrics
  }
}
```

### Integration Registry

**File:** `/server/integrations/index.ts`

```typescript
import { MetaIntegration } from './meta';
import { TikTokIntegration } from './tiktok';
import { LinkedInIntegration } from './linkedin';
import { TwitterIntegration } from './twitter';

const integrations = {
  instagram: new MetaIntegration(),
  facebook: new MetaIntegration(),
  tiktok: new TikTokIntegration(),
  linkedin: new LinkedInIntegration(),
  twitter: new TwitterIntegration(),
};

export function getIntegration(platform: string): SocialMediaModule {
  const integration = integrations[platform];
  if (!integration) throw new Error(`No integration for platform: ${platform}`);
  return integration;
}

// Universal publish function
export async function publishDeliverable(
  deliverableId: string,
  accountId: string
): Promise<PublishResult> {
  const account = await getAccountById(accountId);
  const deliverable = await getDeliverableById(deliverableId);
  const integration = getIntegration(account.platform);

  const result = await integration.publish({
    accessToken: account.access_token,
    accountId: account.account_id,
    caption: `${deliverable.final_copy}\n\n${deliverable.final_hashtags}`,
    imageUrl: deliverable.asset_image_url,
    // ... platform-specific params
  });

  // Update deliverable record
  await updateDeliverableOnPublish(deliverableId, accountId, result);

  // Send Slack notifications
  await sendPublishSuccessNotification(deliverableId, result);

  // Schedule analytics sync
  await scheduleAnalyticsSync(deliverableId);

  return result;
}
```

---

## 9. PUBLISH NOTIFICATIONS (SLACK)

### Requirements

Every time a deliverable is published (via API or manually marked), send Slack notifications to:

1. **The project creator** — so they know their project is progressing
2. **The publisher** — as confirmation of successful publish

### Notification Format

```
🎉 Post Published Successfully!

📁 Project: Spring Sale 2026
🎯 Deliverable: Instagram Post #1
📱 Platform: Instagram
👤 Account: @babycentral_sg
🕐 Published: Feb 15, 2026 10:00 AM SGT
🔗 Post URL: https://instagram.com/p/ABC123

[View Post ↗]  [View in Planner]
```

**For non-API platforms (website, EDM, events):**

```
📋 Content Marked as Published

📁 Project: Spring Sale 2026
🎯 Deliverable: Website Banner #1
📱 Type: Website
👤 Published by: Lisa Tan
🕐 Marked at: Feb 15, 2026 11:30 AM SGT
📝 Notes: "Uploaded to homepage slider"

[View in Planner]
```

### Implementation

```typescript
async function sendPublishSuccessNotification(
  deliverableId: string,
  result: PublishResult
) {
  const deliverable = await getDeliverableWithProject(deliverableId);
  const project = deliverable.project;
  const creator = await getUserById(project.created_by_id);
  const publisher = await getUserById(deliverable.publisher_id);

  const blocks = buildPublishSuccessBlocks({
    projectName: project.name,
    deliverableName: deliverable.deliverable_name,
    platform: result.platform,
    accountHandle: result.account_handle,
    publishedAt: result.published_at,
    postUrl: result.post_url,
  });

  // Notify creator
  if (creator.slack_user_id) {
    await slackClient.chat.postMessage({
      channel: creator.slack_user_id,
      blocks,
    });
  }

  // Notify publisher (confirmation)
  if (publisher.slack_user_id && publisher.id !== creator.id) {
    await slackClient.chat.postMessage({
      channel: publisher.slack_user_id,
      blocks,
    });
  }

  // Log notification
  await logSlackNotification(deliverableId, 'publish_success');
}
```

---

## 10. AUTO-SYNC ANALYTICS

### Requirements

1. **Auto-sync every 30 minutes** for all published deliverables that were published within the last 30 days
2. **Manual refresh button** that triggers an immediate sync for a specific deliverable or all deliverables in a project
3. Store analytics history so trends can be viewed

### Database

```sql
CREATE TABLE deliverable_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES project_deliverables(id) ON DELETE CASCADE,
  
  -- Metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Metadata
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  platform VARCHAR(50) NOT NULL,
  raw_response JSONB -- Store the full API response for debugging
);

CREATE INDEX idx_analytics_deliverable ON deliverable_analytics(deliverable_id, fetched_at DESC);

-- Latest analytics view for quick access
CREATE VIEW latest_analytics AS
SELECT DISTINCT ON (deliverable_id)
  deliverable_id, impressions, reach, likes, comments, shares, saves,
  clicks, video_views, engagement_rate, fetched_at
FROM deliverable_analytics
ORDER BY deliverable_id, fetched_at DESC;
```

### Cron Job (Every 30 Minutes)

```typescript
// /server/jobs/analytics-sync.ts

import cron from 'node-cron';

// Run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('[Analytics Sync] Starting...');
  
  // Get all published deliverables from last 30 days with a connected account
  const deliverables = await db.query(`
    SELECT pd.*, sa.platform, sa.account_id, sa.access_token
    FROM project_deliverables pd
    JOIN social_accounts sa ON pd.published_account_id = sa.id
    WHERE pd.current_stage = 'COMPLETED'
    AND pd.actual_publish_date > NOW() - INTERVAL '30 days'
    AND pd.meta_post_id IS NOT NULL
  `);

  for (const deliverable of deliverables) {
    try {
      const integration = getIntegration(deliverable.platform);
      const analytics = await integration.fetchAnalytics(
        deliverable.meta_post_id,
        deliverable.access_token
      );

      await db.insert(deliverableAnalytics).values({
        deliverable_id: deliverable.id,
        impressions: analytics.impressions,
        reach: analytics.reach,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        saves: analytics.saves,
        clicks: analytics.clicks,
        video_views: analytics.video_views,
        engagement_rate: analytics.engagement_rate,
        platform: deliverable.platform,
        raw_response: analytics,
      });
    } catch (error) {
      console.error(`[Analytics Sync] Failed for deliverable ${deliverable.id}:`, error);
    }
  }

  console.log(`[Analytics Sync] Completed for ${deliverables.length} deliverables`);
});
```

### Manual Refresh

**API Endpoint:** `POST /api/deliverables/:id/refresh-analytics`

Triggers an immediate fetch for a single deliverable and returns the latest data.

**API Endpoint:** `POST /api/projects/:id/refresh-analytics`

Triggers an immediate fetch for ALL published deliverables in a project.

**UI:** Refresh button (🔄) shown on:
- Individual post analytics cards
- Project detail view header
- Published page header

---

## 11. PROJECTS PAGE CALENDAR VIEW

### Requirements

Add a **dropdown calendar** to the Projects page so users can view projects by date.

### Implementation

**Calendar Component:**
- Use a month-view calendar (like FullCalendar or a custom React component)
- Each project appears as a colored bar spanning its start_date to end_date
- Color-coded by brand
- Click a project bar to open the project detail
- Deliverable deadlines shown as dots/pins on specific dates

**Toggle between views:**
```
┌─────────────────────────────────────────────────────┐
│  Projects  [📋 List] [📅 Calendar] [📊 Kanban]      │
│                                                      │
│  ◄ January 2026                     February 2026 ► │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun                  │
│  ───────────────────────────────────                 │
│                                  1                   │
│  ████████████████████  Spring Sale 2026              │
│  2    3    4    5    6    7    8                      │
│  ████████  Summer Launch                             │
│  ░░░░░░░░░░░░  Brand Refresh                        │
│  9    10   11   12   13   14   15                    │
│  •IG  •FB       •EDM      •Pub                      │
└─────────────────────────────────────────────────────┘
```

**Dropdown Calendar (for quick date jumping):**
- Small calendar picker in the page header
- Select any date to jump the main calendar to that month
- Shows indicators for months with active projects

---

## 12. PUBLISHED POSTS — DIRECT LINKS TO LIVE POSTS

### Requirements

On the Published page, every post must have a clickable link that opens the actual live post on the relevant social media platform.

### Implementation

**Post URL Storage:**
The `project_deliverables` table already has a `post_url` column. This is populated:
- **Automatically** when published via API (the API returns the URL)
- **Manually** when the publisher marks non-API content as published (they enter the URL)

**UI:**
Each published post card shows:
```
┌─────────────────────────────────────────────────┐
│  📷 Instagram Post #1                            │
│  Spring Sale 2026 · @babycentral_sg              │
│  Published: Feb 15, 2026 10:00 AM                │
│                                                  │
│  [View on Instagram ↗]  [View Analytics]         │
└─────────────────────────────────────────────────┘
```

**"View on Instagram ↗"** opens `post_url` in a new tab.

The link icon/button should use the platform's brand color:
- Instagram: gradient pink/purple
- Facebook: #1877F2
- TikTok: #000000
- LinkedIn: #0A66C2
- Twitter/X: #000000

---

## 13. ANALYTICS PREVIEW & DEEP VIEW

### Requirements

1. **Preview:** Show a quick summary of analytics on the published post card (without clicking into it)
2. **Deep View:** Click into the post to see full analytics breakdown

### Analytics Preview (on Published Page cards)

Each published post card shows a compact metrics row:

```
┌─────────────────────────────────────────────────────┐
│  📷 Instagram Post #1 · Spring Sale 2026            │
│  @babycentral_sg · Published Feb 15                  │
│                                                      │
│  [Platform Frame Preview]                            │
│                                                      │
│  👁 2.4K  ❤️ 342  💬 28  ↗️ 15  📌 89              │
│  Engagement: 4.2%                                    │
│                                                      │
│  [View Full Analytics]  [View on Instagram ↗]        │
└─────────────────────────────────────────────────────┘
```

Metrics shown in preview: Impressions, Likes, Comments, Shares, Saves, Engagement Rate

### Analytics Deep View (on click)

Opens a modal or full-page view with:

```
┌─────────────────────────────────────────────────────────┐
│  📊 Analytics: Instagram Post #1                         │
│  Spring Sale 2026 · @babycentral_sg                      │
│  Published: Feb 15, 2026 10:00 AM                        │
│  Last synced: 2 minutes ago  [🔄 Refresh]                │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ 2,412    │  │ 1,890    │  │ 342      │  │ 4.2%     ││
│  │ Impress. │  │ Reach    │  │ Likes    │  │ Engage.  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ 28       │  │ 15       │  │ 89       │  │ 45       ││
│  │ Comments │  │ Shares   │  │ Saves    │  │ Clicks   ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
│                                                          │
│  📈 Performance Over Time                                │
│  [Line chart showing metrics over days since publish]    │
│                                                          │
│  📝 Post Details                                         │
│  Copy: "Spring into savings! Up to 30% off..."          │
│  Hashtags: #springsale #babygear #discount               │
│  Tagged: @ergobaby @skiphop                              │
│                                                          │
│  [View on Instagram ↗]                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 14. AI COPYWRITING

### Requirements

- Use the **most cost-effective model** (Claude Haiku 4.5 via Anthropic API)
- Functional "Generate AI Copy" button in the copywriting stage
- AI analyzes the design image (pulled from Canva) to generate relevant copy

### Implementation

```typescript
// /server/services/ai-copywriting.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CopyGenerationRequest {
  deliverableType: string;       // 'INSTAGRAM_POST', 'FACEBOOK_POST', etc.
  brandName: string;
  brandTone?: string;            // From brand settings
  imageBase64?: string;          // Design image for visual analysis
  projectDescription?: string;
  previousCopy?: string[];       // Past copy for this brand (for consistency)
  hashtagSuggestions?: string[]; // From hashtag library
}

interface CopyGenerationResult {
  variations: Array<{
    copy: string;
    hashtags: string[];
    tone: string; // 'professional', 'casual', 'playful', etc.
  }>;
  suggested_tagged_creators: string[];
}

export async function generateCopy(request: CopyGenerationRequest): Promise<CopyGenerationResult> {
  const systemPrompt = `You are a social media copywriter for ${request.brandName}, a premium baby and family products brand. 
Generate engaging copy for ${request.deliverableType.replace(/_/g, ' ').toLowerCase()}.
${request.brandTone ? `Brand tone: ${request.brandTone}` : ''}

Return EXACTLY this JSON structure:
{
  "variations": [
    {
      "copy": "The main caption text",
      "hashtags": ["#hashtag1", "#hashtag2"],
      "tone": "professional"
    }
  ],
  "suggested_tagged_creators": ["@handle1", "@handle2"]
}

Generate 3 variations with different tones. Keep copy concise and platform-appropriate.
Instagram: max 2,200 chars. Facebook: max 500 chars. TikTok: max 150 chars. LinkedIn: max 700 chars. Twitter: max 280 chars.`;

  const messages: any[] = [];

  if (request.imageBase64) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: request.imageBase64,
          },
        },
        {
          type: 'text',
          text: `Analyze this design and generate copy for it. Project context: ${request.projectDescription || 'N/A'}`,
        },
      ],
    });
  } else {
    messages.push({
      role: 'user',
      content: `Generate copy for: ${request.projectDescription || request.deliverableType}`,
    });
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001', // Most cost-effective model
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  
  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse AI response');
  
  return JSON.parse(jsonMatch[0]);
}
```

**API Endpoint:** `POST /api/deliverables/:id/generate-copy`

**UI Flow:**
1. Copywriter opens a deliverable in the COPYWRITING stage
2. Sees the Canva design preview
3. Clicks [✨ Generate AI Copy]
4. Loading state while AI processes
5. 3 copy variations appear in expandable cards
6. Copywriter selects one or edits manually
7. Hashtags shown as editable tags below
8. Tagged creators shown as separate editable field
9. Click [Complete Copy] to finalize

---

## 15. DASHBOARD QUICK ACTIONS REPLACEMENT

### Remove
- "Create Social Post" button
- "Schedule Email" button
- "Plan Event" button
- Any other old quick action buttons

### Replace With

```
┌─────────────────────────────────────────────────────┐
│  ⚡ Quick Actions                                    │
│                                                      │
│  [➕ New Project]  [📤 Publishing Queue]             │
│  [📊 View Analytics]  [👥 Team Workload]             │
└─────────────────────────────────────────────────────┘
```

- **New Project** — opens the project creation modal
- **Publishing Queue** — navigates to deliverables in PUBLISHING stage
- **View Analytics** — navigates to the Published page with analytics
- **Team Workload** — shows a summary of how many tasks each team member has

---

## 16. REMOVE ARCHIVE TAB

### Requirements
- **Delete** the Archive tab/page entirely from the navigation
- All published/completed content is now viewed from the **Published** page
- Update navigation: remove "Archive" menu item
- Redirect any existing archive URLs to the Published page

---

## 17. PUBLISHED PAGE — DETAILED FILTERING

### Filter Bar

```
┌─────────────────────────────────────────────────────────┐
│  Published Posts                                         │
│                                                          │
│  Platform: [All ▼] [Instagram] [Facebook] [TikTok]      │
│           [LinkedIn] [Twitter] [Website] [EDM]           │
│                                                          │
│  Brand: [All Brands ▼]                                   │
│  Region: [All Regions ▼]                                 │
│  Account: [All Accounts ▼]                               │
│  Date Range: [Last 7 days ▼] or [Custom: ___ to ___]    │
│  Search: [Search by project name, copy, hashtag...]      │
│                                                          │
│  Sort by: [Date Published ▼] [Engagement ▼] [Reach ▼]   │
│                                                          │
│  Active Filters: [Instagram ×] [BabyZen ×] [Clear All]  │
└─────────────────────────────────────────────────────────┘
```

### Filter Options

| Filter | Options |
|--------|---------|
| Platform | Instagram, Facebook, TikTok, LinkedIn, Twitter/X, Website, EDM, Event |
| Brand | Dynamic from brands table |
| Region | Dynamic from regions table |
| Account | Dynamic from social_accounts table |
| Date Range | Last 7 days, Last 30 days, Last 90 days, This month, Last month, Custom range |
| Sort | Date (newest), Date (oldest), Most likes, Most reach, Most engagement, Most comments |
| Search | Free text search across project name, copy, hashtags, tagged creators |

### API Endpoint

```
GET /api/published?platform=instagram&brand_id=xxx&region_id=xxx&account_id=xxx&date_from=2026-01-01&date_to=2026-02-12&sort=engagement_desc&search=spring&page=1&limit=20
```

---

## 18. PLATFORM FRAME PREVIEWS

### Requirements

On the Published page AND in the Publisher's pre-publish view, show the post content inside a realistic platform frame so the user can see exactly how it will look on the actual platform.

### Frame Designs

**Instagram Post Frame:**
```
┌──────────────────────────────┐
│  ○ babycentral_sg    •••    │
│  ┌──────────────────────────┐│
│  │                          ││
│  │    [POST IMAGE]          ││
│  │    (Square 1:1)          ││
│  │                          ││
│  └──────────────────────────┘│
│  ♡  💬  ↗️           🔖     │
│  342 likes                   │
│  babycentral_sg Spring into  │
│  savings! Up to 30%...       │
│  #springsale #babygear       │
│  View all 28 comments        │
│  2 HOURS AGO                 │
└──────────────────────────────┘
```

**Facebook Post Frame:**
```
┌──────────────────────────────┐
│  ○ BabyCentral Singapore     │
│  2h · 🌐                     │
│                              │
│  Spring into savings! Up to  │
│  30% off all strollers...    │
│  ┌──────────────────────────┐│
│  │                          ││
│  │    [POST IMAGE]          ││
│  │    (Landscape 16:9)      ││
│  │                          ││
│  └──────────────────────────┘│
│  👍 ❤️ 89    💬 12   ↗️ 5   │
└──────────────────────────────┘
```

**TikTok Post Frame:**
```
┌────────────────────┐
│                    │  ○ Profile
│                    │  ♡ 1.2K
│  [VIDEO THUMBNAIL] │  💬 45
│  (9:16 Portrait)   │  ↗️ 23
│                    │  🎵
│                    │
│  @babycentral_sg   │
│  Spring sale! 🌸   │
│  #springsale       │
└────────────────────┘
```

**LinkedIn Post Frame:**
```
┌──────────────────────────────┐
│  ○ BabyCentral               │
│  1,234 followers · 2h        │
│                              │
│  Spring into savings! As a   │
│  leading distributor of...   │
│  ┌──────────────────────────┐│
│  │    [POST IMAGE]          ││
│  │    (Landscape)           ││
│  └──────────────────────────┘│
│  👍 34  💬 8 comments        │
│  ─────────────────────────── │
│  👍 Like  💬 Comment  ↗ Share│
└──────────────────────────────┘
```

**Twitter/X Post Frame:**
```
┌──────────────────────────────┐
│  ○ BabyCentral @babycentral  │
│                              │
│  Spring into savings! Up to  │
│  30% off all strollers 🌸    │
│  #springsale #babygear       │
│  ┌──────────────────────────┐│
│  │    [POST IMAGE]          ││
│  │    (16:9 or 1:1)         ││
│  └──────────────────────────┘│
│  💬 5  🔄 12  ♡ 89  📊 2.4K │
└──────────────────────────────┘
```

### Implementation

Create a **reusable React component** for each platform:

```typescript
// /client/src/components/platform-previews/InstagramPreview.tsx
// /client/src/components/platform-previews/FacebookPreview.tsx
// /client/src/components/platform-previews/TikTokPreview.tsx
// /client/src/components/platform-previews/LinkedInPreview.tsx
// /client/src/components/platform-previews/TwitterPreview.tsx

interface PlatformPreviewProps {
  accountName: string;
  accountHandle: string;
  accountAvatar?: string;
  imageUrl: string;
  caption: string;
  hashtags: string[];
  metrics?: {
    likes: number;
    comments: number;
    shares: number;
    saves?: number;
    views?: number;
  };
  publishedAt?: string;
}
```

Use these components:
1. **Published Page** — each post card shows the platform frame preview
2. **Publisher Pre-Publish View** — shows what the post will look like before clicking publish
3. **Project Detail** — show mini previews for completed deliverables

---

## 19. CANVA LINK FOR PUBLISHER

### Requirements

When a publisher opens a deliverable in the PUBLISHING stage, they must see the Canva link prominently so they can:
1. Open Canva to review the final design
2. Make last-minute changes if needed
3. Download the final file from Canva
4. Upload it to the planner for publishing

### Publisher View

```
┌─────────────────────────────────────────────────────────┐
│  📤 Publish: Instagram Post #1                           │
│  Project: Spring Sale 2026                               │
│                                                          │
│  🎨 Design                                               │
│  ┌──────────────────────────────────────────────────┐    │
│  │  [Design Preview Image]                          │    │
│  │                                                  │    │
│  │  Canva Link: https://canva.com/design/ABC123     │    │
│  │  [Open in Canva ↗]  [Download from Canva]        │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  📝 Copy                                                 │
│  "Spring into savings! Up to 30% off all strollers..."   │
│  #springsale #babygear #discount                         │
│  Tagged: @ergobaby @skiphop                              │
│                                                          │
│  📁 Upload Final File                                    │
│  [Drag & drop or click to upload the final image/video]  │
│                                                          │
│  📱 Select Account                                       │
│  [● @babycentral_sg] [○ @babycentral_my]                │
│                                                          │
│  [Preview Post]  [📷 Publish to Instagram]               │
└─────────────────────────────────────────────────────────┘
```

**Flow:**
1. Publisher clicks "Open in Canva" to review/edit the design
2. Publisher downloads the final file from Canva
3. Publisher uploads the file to the planner (drag & drop area)
4. Publisher selects the target account
5. Publisher clicks "Preview Post" to see the platform frame preview
6. Publisher clicks the platform-specific publish button

---

## 20. SETTINGS — PLATFORM API MANAGEMENT

### New Settings Section: "Connected Platforms"

```
┌─────────────────────────────────────────────────────────┐
│  ⚙️ Settings > Connected Platforms                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  📷 Instagram                          [Connected]│    │
│  │                                                  │    │
│  │  Connected Accounts:                             │    │
│  │  • @babycentral_sg (Singapore) ✅ Active          │    │
│  │  • @babycentral_my (Malaysia) ✅ Active            │    │
│  │  • @babycentral_hk (Hong Kong) ✅ Active           │    │
│  │                                                  │    │
│  │  API Status: ✅ Connected                         │    │
│  │  Token Expires: Mar 15, 2026                      │    │
│  │  [Reconnect]  [Manage Accounts]  [Disconnect]     │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  📘 Facebook                          [Connected] │    │
│  │                                                  │    │
│  │  Connected Pages:                                │    │
│  │  • BabyCentral Singapore ✅ Active                │    │
│  │  • BabyCentral Malaysia ✅ Active                  │    │
│  │                                                  │    │
│  │  API Status: ✅ Connected                         │    │
│  │  [Reconnect]  [Manage Pages]  [Disconnect]        │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  🎵 TikTok                        [Not Connected] │    │
│  │                                                  │    │
│  │  [Connect TikTok Account]                        │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  💼 LinkedIn                       [Not Connected]│    │
│  │                                                  │    │
│  │  [Connect LinkedIn Page]                         │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  🐦 Twitter/X                      [Not Connected]│    │
│  │                                                  │    │
│  │  [Connect Twitter Account]                       │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  💬 Slack                             [Connected] │    │
│  │                                                  │    │
│  │  Workspace: Bloom & Grow                          │    │
│  │  Bot Channel: #marketing-planner                  │    │
│  │  Status: ✅ Active                                │    │
│  │  [Test Connection]  [Disconnect]                  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  🎨 Canva                             [Connected] │    │
│  │                                                  │    │
│  │  Connected as: Josh D.                            │    │
│  │  [Reconnect]  [Disconnect]                        │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Per-Platform Features

**Each connected platform section shows:**
1. Connection status (Connected / Not Connected / Token Expired)
2. List of postable accounts/pages for that platform
3. Which accounts are active (can be toggled on/off)
4. Token expiry date
5. Reconnect button (for token refresh)
6. Disconnect button
7. Test Connection button

### API Management Endpoints

```
GET /api/settings/platforms — List all platform connections and their accounts
POST /api/settings/platforms/:platform/connect — Start OAuth flow
POST /api/settings/platforms/:platform/disconnect — Remove connection
POST /api/settings/platforms/:platform/refresh — Refresh OAuth token
GET /api/settings/platforms/:platform/accounts — List accounts for a platform
PATCH /api/settings/platforms/:platform/accounts/:id — Toggle account active/inactive
POST /api/settings/platforms/:platform/test — Test the connection
```

---

## 21. SLACK STAGE-CHANGE BUTTONS & NOTIFICATIONS

### Complete Stage Change Flow via Slack

Every stage change must:
1. Update the database
2. Notify the NEXT person in the workflow
3. Notify the project creator (optional, configurable)
4. Update the original Slack message to remove buttons

### Notification Matrix

| Stage Change | Notified | Slack Message |
|---|---|---|
| Project created | Default Designer | "🎨 New design task assigned" |
| Designer submits Canva link | Copywriter | "✏️ Design ready for copy" |
| Revision requested on design | Designer | "⚠️ Revision requested on design" |
| Copywriter completes copy | Publisher | "📤 Ready to publish" |
| Revision requested on copy | Copywriter | "⚠️ Revision requested on copy" |
| Post published | Creator + Publisher | "🎉 Post published successfully" |
| Deliverable added to project | Assigned Designer | "🎨 New design task assigned" |
| Project edited | All assigned team members | "📝 Project updated" |
| Assignment changed | New assignee | "👤 You've been assigned to..." |

### Slack Button Actions

Each notification can have context-appropriate buttons:

```typescript
const SLACK_ACTIONS = {
  DESIGN_ASSIGNMENT: ['upload_canva_link', 'view_project'],
  DESIGN_READY: ['start_copywriting', 'request_revision', 'view_design'],
  COPY_READY: ['open_publisher', 'request_revision'],
  REVISION_REQUEST: ['upload_canva_link', 'view_feedback'],
  PUBLISHED: ['view_post', 'view_analytics'],
};
```

---

## 22. DATABASE SCHEMA UPDATES

### Summary of All New/Modified Tables

```sql
-- NEW TABLES
-- project_activity_log (Section 1)
-- slack_notifications (Section 2)
-- hashtag_library (Section 5)
-- tagged_creators (Section 5)
-- social_accounts (Section 6)
-- deliverable_analytics (Section 10)

-- MODIFIED TABLES
-- projects: Add default_designer_id, default_copywriter_id, default_publisher_id
-- project_deliverables: Add published_account_id, post_url, final_hashtags, tagged_users

-- Ensure these columns exist on project_deliverables
ALTER TABLE project_deliverables ADD COLUMN IF NOT EXISTS published_account_id UUID REFERENCES social_accounts(id);
ALTER TABLE project_deliverables ADD COLUMN IF NOT EXISTS post_url TEXT;
ALTER TABLE project_deliverables ADD COLUMN IF NOT EXISTS final_hashtags TEXT[]; -- Array of hashtag strings
ALTER TABLE project_deliverables ADD COLUMN IF NOT EXISTS tagged_users TEXT[]; -- Array of @handles
ALTER TABLE project_deliverables ADD COLUMN IF NOT EXISTS canva_link TEXT;
ALTER TABLE project_deliverables ADD COLUMN IF NOT EXISTS asset_image_url TEXT;
ALTER TABLE project_deliverables ADD COLUMN IF NOT EXISTS final_copy TEXT;
ALTER TABLE project_deliverables ADD COLUMN IF NOT EXISTS meta_post_id VARCHAR(255);
ALTER TABLE project_deliverables ADD COLUMN IF NOT EXISTS actual_publish_date TIMESTAMP;
```

---

## 23. IMPLEMENTATION CHECKLIST

### Phase 1: Database & Core Backend
- [ ] Run all schema migrations (new tables + column additions)
- [ ] Create `project_activity_log` table
- [ ] Create `social_accounts` table
- [ ] Create `hashtag_library` and `tagged_creators` tables
- [ ] Create `deliverable_analytics` table
- [ ] Create `slack_notifications` table
- [ ] Implement `PATCH /api/projects/:id` (editable projects)
- [ ] Implement `POST /api/projects/:id/deliverables` (add deliverables post-creation)
- [ ] Implement project activity logging middleware

### Phase 2: Social Media API Modules
- [ ] Create `/server/integrations/types.ts` (shared interfaces)
- [ ] Create `/server/integrations/meta.ts` (Instagram + Facebook)
- [ ] Create `/server/integrations/tiktok.ts`
- [ ] Create `/server/integrations/linkedin.ts`
- [ ] Create `/server/integrations/twitter.ts`
- [ ] Create `/server/integrations/index.ts` (registry)
- [ ] Implement OAuth flows for each platform
- [ ] Create settings page API endpoints for platform management

### Phase 3: Slack Integration
- [ ] Implement `POST /api/slack/interactions` handler
- [ ] Build all notification templates (design, copy, publish, revision)
- [ ] Implement button state management (remove after click)
- [ ] Implement stage advancement via Slack buttons
- [ ] Add publish success notifications (to creator + publisher)
- [ ] Test all Slack notification flows end-to-end

### Phase 4: Publishing System
- [ ] Build multi-account selection UI
- [ ] Build per-platform publish buttons
- [ ] Implement `POST /api/deliverables/:id/publish` using integration modules
- [ ] Implement "Mark as Published" for non-API platforms
- [ ] Add Canva link display in publisher view
- [ ] Build file upload component for publisher
- [ ] Build platform frame preview components (all 5 platforms)

### Phase 5: Analytics
- [ ] Implement analytics fetching per platform module
- [ ] Set up 30-minute cron job for auto-sync
- [ ] Build manual refresh endpoints
- [ ] Build analytics preview component (compact metrics row)
- [ ] Build analytics deep view modal (full breakdown + chart)

### Phase 6: Frontend — Dashboard
- [ ] Redesign dashboard with new layout (stats, progress, tasks, activity, deadlines)
- [ ] Implement project progress bars with gradient fill
- [ ] Replace quick actions with project-relevant buttons
- [ ] Build "My Tasks" component
- [ ] Build "Recent Activity" feed
- [ ] Build "Top Performing Posts" widget

### Phase 7: Frontend — Projects Page
- [ ] Add calendar view toggle (list / calendar / kanban)
- [ ] Build month-view calendar with project bars
- [ ] Build dropdown date picker for quick navigation
- [ ] Implement inline editing on project profile
- [ ] Build custom assignment UI per deliverable

### Phase 8: Frontend — Published Page
- [ ] Remove Archive tab from navigation
- [ ] Build comprehensive filter bar
- [ ] Build platform frame preview cards
- [ ] Add direct "View on [Platform]" links
- [ ] Build analytics preview on cards
- [ ] Build analytics deep view modal
- [ ] Implement sort and search

### Phase 9: AI Copywriting & Memory
- [ ] Implement AI copywriting endpoint using Claude Haiku 4.5
- [ ] Build copy generation UI with 3 variations
- [ ] Implement hashtag autocomplete from hashtag_library
- [ ] Implement tagged creator autocomplete from tagged_creators
- [ ] Auto-update memory tables on publish

### Phase 10: Settings
- [ ] Build "Connected Platforms" settings page
- [ ] Show per-platform account lists
- [ ] Implement connect/disconnect flows
- [ ] Implement token refresh UI
- [ ] Add "Test Connection" functionality
- [ ] Show Slack integration status

---

## 🎨 DESIGN SYSTEM REFERENCE

**Use Bloom & Grow brand colors throughout:**

| Color | Hex | Usage |
|-------|-----|-------|
| Bloom Orange | #F7971C | Primary buttons, accents, progress bars |
| Bloom Blue | #2575FC | Links, secondary accents, CTAs |
| Success Green | #10B981 | Published, completed states |
| Warning Amber | #F59E0B | In progress, pending states |
| Error Red | #EF4444 | Overdue, errors |
| Info Blue | #3B82F6 | Draft, scheduled states |

**Typography:** Roboto (primary), Poppins (secondary)

**Border Radius:** 5px (consistent with existing UI)

---

## ⚠️ CRITICAL IMPLEMENTATION NOTES

1. **Do NOT create separate pages for post types.** Everything flows through the unified Projects system.
2. **Slack is the primary notification channel.** Every stage change triggers a Slack message.
3. **Analytics auto-sync runs independently** via cron — it should not block any user actions.
4. **Platform frame previews are required** on both the Published page and the pre-publish view.
5. **The Canva link must always be visible** to the publisher — never hidden behind a click.
6. **AI copywriting must use Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) for cost efficiency.
7. **Multi-account support is mandatory** — publishers must select which account to post to.
8. **Each platform has its own publish button** — no generic "Publish" button.
9. **Archive tab is removed entirely** — Published page is the single source of truth.
10. **All filters on Published page must be additive** (AND logic, not OR).

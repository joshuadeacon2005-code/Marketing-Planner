import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loginSchema, insertSocialPostSchema, insertEmailCampaignSchema, insertEventSchema, insertEventDeliverableSchema, insertTaskSchema, insertUserSchema, insertBrandSchema, insertAssetLibrarySchema, insertNotificationSchema, insertPromotionSchema, insertApprovalSchema, insertRecurrencePatternSchema, insertCollaborationProfileSchema, insertPostTagSchema, insertPostPerformanceSchema, DELIVERABLE_PRESET_DIMENSIONS } from "@shared/schema";
import { z } from "zod";
import { 
  notifyDesignerPostCreated, 
  notifyPublisherGraphicsReady,
  notifyDesignerEmailCreated,
  notifyPublisherEmailReady,
  notifyDesignerEventCreated,
  notifyPublisherEventReady,
  notifyDeliverableStageChange
} from "./notificationService";
import {
  getCanvaAuthUrl,
  getPkceData,
  exchangeCodeForTokens,
  refreshAccessToken,
  fetchAllCanvaDesigns,
  fetchCanvaUserProfile,
  mapCanvaDesignToAsset,
  getValidAccessToken,
} from "./canvaService";
import { startCanvaScheduler } from "./canvaScheduler";
import { startDeadlineScheduler } from "./deadlineScheduler";
import { seed } from "./seed";
import { detectBrandFromName, detectAssetTypeFromName } from "./assetDetection";
import {
  hasRedNoteCredentials,
  getRedNoteAuthUrl,
  getRedNoteOAuthState,
  exchangeRedNoteCode,
  publishToRedNote,
} from "./rednoteService";
import {
  hasMetaCredentials,
  getMetaAuthUrl,
  getMetaOAuthState,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchUserPages,
  fetchMetaUserId,
  publishToFacebook,
  publishToInstagram,
  fetchFacebookPostInsights,
  fetchInstagramPostInsights,
} from "./metaService";
import {
  hasTikTokCredentials,
  getTikTokAuthUrl,
  getTikTokOAuthState,
  exchangeTikTokCode,
  refreshTikTokToken,
  fetchTikTokVideoInsights,
} from "./tiktokService";
import {
  hasLinkedInCredentials,
  getLinkedInAuthUrl,
  getLinkedInOAuthState,
  exchangeLinkedInCode,
  refreshLinkedInToken,
  fetchLinkedInProfile,
} from "./linkedinService";
import {
  hasTwitterCredentials,
  getTwitterAuthUrl,
  getTwitterOAuthState,
  exchangeTwitterCode,
  refreshTwitterToken,
  fetchTwitterUser,
} from "./twitterService";
import { publishContent, fetchAnalytics } from "./socialApiService";

const JWT_SECRET = process.env.SESSION_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required for JWT authentication");
}

function getCallbackOrigin(req: any): string {
  if (process.env.APP_DOMAIN) {
    return `https://${process.env.APP_DOMAIN}`;
  }
  const clientOrigin = req.headers.origin || req.headers.referer;
  if (clientOrigin) {
    return new URL(clientOrigin).origin;
  }
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers.host;
  return `${protocol}://${host}`;
}

function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  seed().catch((err) => console.error("Auto-seed failed:", err));

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      const regions = await storage.getRegions();
      res.json({ status: 'ok', database: 'connected', regionsCount: regions.length });
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ status: 'error', database: 'disconnected', error: error instanceof Error ? error.message : 'Unknown' });
    }
  });

  // Auth Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      if (!user.isActive) {
        return res.status(403).json({ message: "Account is deactivated" });
      }
      
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Auth me error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Users Routes (admin only)
  app.get("/api/users", authenticateToken, async (req: any, res) => {
    try {
      const users = await storage.getUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      console.log('=== USER CREATION ATTEMPT ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('User role:', req.user?.role);
      
      const data = insertUserSchema.parse(req.body);
      console.log('Parsed data:', JSON.stringify({ ...data, password: '[HIDDEN]' }, null, 2));
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(data.email);
      console.log('Existing user check:', existingUser ? 'FOUND' : 'NOT FOUND');
      
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
      
      console.log('Hashing password...');
      const hashedPassword = await bcrypt.hash(data.password, 10);
      console.log('Password hashed successfully');
      
      console.log('Creating user in database...');
      const user = await storage.createUser({ ...data, password: hashedPassword });
      console.log('User created:', user.id);
      
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('=== USER CREATION ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
      
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      // Handle database constraint violations
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
      res.status(500).json({ 
        message: "Failed to create user. Please try again.",
        debug: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  app.put("/api/users/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      if (data.password && data.password.length > 0) {
        data.password = await bcrypt.hash(data.password, 10);
      } else {
        delete data.password;
      }
      
      const user = await storage.updateUser(id, data);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Brands Routes
  app.get("/api/brands", authenticateToken, async (req: any, res) => {
    try {
      const brands = await storage.getBrands();
      res.json(brands);
    } catch (error) {
      console.error("Get brands error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/brands", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const data = insertBrandSchema.parse(req.body);
      const brand = await storage.createBrand(data);
      res.status(201).json(brand);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create brand error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/brands/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const brand = await storage.updateBrand(id, req.body);
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      res.json(brand);
    } catch (error) {
      console.error("Update brand error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Brand-Region assignments
  app.get("/api/brand-regions", authenticateToken, async (req: any, res) => {
    try {
      const brandRegions = await storage.getBrandRegions();
      res.json(brandRegions);
    } catch (error) {
      console.error("Get brand regions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/brands/:id/regions", authenticateToken, async (req: any, res) => {
    try {
      const regions = await storage.getRegionsForBrand(req.params.id);
      res.json(regions);
    } catch (error) {
      console.error("Get regions for brand error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/regions/:id/brands", authenticateToken, async (req: any, res) => {
    try {
      const brands = await storage.getBrandsForRegion(req.params.id);
      res.json(brands);
    } catch (error) {
      console.error("Get brands for region error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/brands/:brandId/regions/:regionId", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { brandId, regionId } = req.params;
      const brandRegion = await storage.assignBrandToRegion(brandId, regionId);
      res.status(201).json(brandRegion);
    } catch (error) {
      console.error("Assign brand to region error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/brands/:brandId/regions/:regionId", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { brandId, regionId } = req.params;
      await storage.removeBrandFromRegion(brandId, regionId);
      res.status(204).send();
    } catch (error) {
      console.error("Remove brand from region error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Regions Routes
  app.get("/api/regions", authenticateToken, async (req: any, res) => {
    try {
      const regions = await storage.getRegions();
      res.json(regions);
    } catch (error) {
      console.error("Get regions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Campaigns Routes
  app.get("/api/campaigns", authenticateToken, async (req: any, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Get campaigns error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Social Posts Routes
  app.get("/api/social-posts", authenticateToken, async (req: any, res) => {
    try {
      const { platform, brandId, regionId } = req.query;
      const posts = await storage.getSocialPosts({
        platform: platform as string,
        brandId: brandId as string,
        regionId: regionId as string,
      });
      res.json(posts);
    } catch (error) {
      console.error("Get social posts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/social-posts/:id", authenticateToken, async (req: any, res) => {
    try {
      const post = await storage.getSocialPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Get social post error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/social-posts", authenticateToken, async (req: any, res) => {
    try {
      const { recurrence, ...postData } = req.body;
      const body = {
        ...postData,
        scheduledDate: postData.scheduledDate ? new Date(postData.scheduledDate) : undefined,
      };
      const data = insertSocialPostSchema.parse(body);
      
      // Handle recurrence if provided
      if (recurrence?.enabled && body.scheduledDate) {
        const posts: any[] = [];
        const baseDate = new Date(body.scheduledDate);
        const endDate = recurrence.endDate ? new Date(recurrence.endDate) : null;
        const occurrences = recurrence.occurrences || 10;
        
        // Calculate recurring dates
        const dates: Date[] = [baseDate];
        let currentDate = new Date(baseDate);
        
        for (let i = 1; i < occurrences; i++) {
          const nextDate = new Date(currentDate);
          
          switch (recurrence.frequency) {
            case 'daily':
              nextDate.setDate(nextDate.getDate() + (recurrence.interval || 1));
              break;
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + 7 * (recurrence.interval || 1));
              break;
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + (recurrence.interval || 1));
              break;
          }
          
          if (endDate && nextDate > endDate) break;
          dates.push(nextDate);
          currentDate = nextDate;
        }
        
        // Create a post for each recurring date
        for (const date of dates) {
          const postPayload = { ...data, scheduledDate: date };
          const post = await storage.createSocialPost(postPayload);
          posts.push(post);
          
          if (post.designerId) {
            notifyDesignerPostCreated(post).catch(err => console.error("Notification error:", err));
          }
        }
        
        res.status(201).json({ posts, count: posts.length });
      } else {
        // Single post creation
        const post = await storage.createSocialPost(data);
        
        if (post.designerId) {
          notifyDesignerPostCreated(post).catch(err => console.error("Notification error:", err));
        }
        
        res.status(201).json(post);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create social post error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/social-posts/:id", authenticateToken, async (req: any, res) => {
    try {
      // Get original post to check for changes
      const originalPost = await storage.getSocialPost(req.params.id);
      
      const body = {
        ...req.body,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
      };
      const post = await storage.updateSocialPost(req.params.id, body);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // Notify designer if just assigned
      if (post.designerId && originalPost && !originalPost.designerId) {
        notifyDesignerPostCreated(post).catch(err => console.error("Notification error:", err));
      }
      
      // Notify publisher when graphics are complete (assetStatus changed to FINAL)
      if (post.assetStatus === "FINAL" && originalPost && originalPost.assetStatus !== "FINAL" && post.publisherId) {
        notifyPublisherGraphicsReady(post).catch(err => console.error("Notification error:", err));
      }

      // Auto-add uploaded graphics to brand asset library when asset URL is set
      if (post.assetUrl && post.assetUrl !== originalPost?.assetUrl && post.brandId) {
        try {
          const brand = await storage.getBrand(post.brandId);
          await storage.createAsset({
            name: `${brand?.name || 'Brand'} - ${post.platform} ${post.postFormat} - ${new Date(post.scheduledDate).toLocaleDateString()}`,
            assetType: post.postFormat === "VIDEO" || post.postFormat === "REEL" ? "VIDEO" : "GRAPHIC",
            fileUrl: post.assetUrl,
            brandId: post.brandId,
            source: "AUTO",
            autoLinkedFromPost: true,
            linkedPostId: post.id,
            createdById: req.user.userId,
          });
        } catch (autoAssetError) {
          console.error("Auto-add asset to library error:", autoAssetError);
        }
      }
      
      res.json(post);
    } catch (error) {
      console.error("Update social post error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/social-posts/:id", authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteSocialPost(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete social post error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email Campaigns Routes
  app.get("/api/email-campaigns", authenticateToken, async (req: any, res) => {
    try {
      const { status, brandId, regionId } = req.query;
      const campaigns = await storage.getEmailCampaigns({
        status: status as string,
        brandId: brandId as string,
        regionId: regionId as string,
      });
      res.json(campaigns);
    } catch (error) {
      console.error("Get email campaigns error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/email-campaigns/:id", authenticateToken, async (req: any, res) => {
    try {
      const campaign = await storage.getEmailCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Get email campaign error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/email-campaigns", authenticateToken, async (req: any, res) => {
    try {
      const body = {
        ...req.body,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
      };
      const data = insertEmailCampaignSchema.parse(body);
      const campaign = await storage.createEmailCampaign(data);
      
      // Notify designer if assigned
      if (campaign.designerId) {
        notifyDesignerEmailCreated(campaign).catch(err => console.error("Notification error:", err));
      }
      
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create email campaign error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/email-campaigns/:id", authenticateToken, async (req: any, res) => {
    try {
      // Get original campaign to check for changes
      const originalCampaign = await storage.getEmailCampaign(req.params.id);
      
      const body = {
        ...req.body,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
      };
      const campaign = await storage.updateEmailCampaign(req.params.id, body);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Notify designer if just assigned
      if (campaign.designerId && originalCampaign && !originalCampaign.designerId) {
        notifyDesignerEmailCreated(campaign).catch(err => console.error("Notification error:", err));
      }
      
      // Notify publisher when design is complete (status changed from DESIGNING to QA or beyond)
      if (campaign.status !== "PLANNING" && campaign.status !== "DESIGNING" && 
          originalCampaign && (originalCampaign.status === "PLANNING" || originalCampaign.status === "DESIGNING") && 
          campaign.publisherId) {
        notifyPublisherEmailReady(campaign).catch(err => console.error("Notification error:", err));
      }
      
      res.json(campaign);
    } catch (error) {
      console.error("Update email campaign error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/email-campaigns/:id", authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteEmailCampaign(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete email campaign error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Events Routes
  app.get("/api/events", authenticateToken, async (req: any, res) => {
    try {
      const { status, regionId } = req.query;
      const eventsList = await storage.getEvents({
        status: status as string,
        regionId: regionId as string,
      });
      
      // Get deliverables for each event
      const eventsWithDeliverables = await Promise.all(
        eventsList.map(async (event) => {
          const deliverables = await storage.getEventDeliverables(event.id);
          return { ...event, deliverables };
        })
      );
      
      res.json(eventsWithDeliverables);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/:id", authenticateToken, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      const deliverables = await storage.getEventDeliverables(event.id);
      res.json({ ...event, deliverables });
    } catch (error) {
      console.error("Get event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events", authenticateToken, async (req: any, res) => {
    try {
      const data = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(data);
      
      // Notify designer if assigned
      if (event.designerId) {
        notifyDesignerEventCreated(event).catch(err => console.error("Notification error:", err));
      }
      
      res.status(201).json({ ...event, deliverables: [] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/events/:id", authenticateToken, async (req: any, res) => {
    try {
      // Get original event to check for changes
      const originalEvent = await storage.getEvent(req.params.id);
      
      const event = await storage.updateEvent(req.params.id, req.body);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Notify designer if just assigned
      if (event.designerId && originalEvent && !originalEvent.designerId) {
        notifyDesignerEventCreated(event).catch(err => console.error("Notification error:", err));
      }
      
      // Notify publisher when event status changes to CONFIRMED (materials ready)
      if (event.status === "CONFIRMED" && originalEvent && originalEvent.status !== "CONFIRMED" && event.publisherId) {
        notifyPublisherEventReady(event).catch(err => console.error("Notification error:", err));
      }
      
      const deliverables = await storage.getEventDeliverables(event.id);
      res.json({ ...event, deliverables });
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/events/:id", authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Event Deliverables
  app.post("/api/events/:id/deliverables", authenticateToken, async (req: any, res) => {
    try {
      const eventId = req.params.id;
      const { name } = req.body;
      const deliverable = await storage.createEventDeliverable({ eventId, name });
      res.status(201).json(deliverable);
    } catch (error) {
      console.error("Create deliverable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/events/:id/deliverables/:did", authenticateToken, async (req: any, res) => {
    try {
      const deliverable = await storage.updateEventDeliverable(req.params.did, req.body);
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }
      res.json(deliverable);
    } catch (error) {
      console.error("Update deliverable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/events/:id/deliverables/:did", authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteEventDeliverable(req.params.did);
      res.status(204).send();
    } catch (error) {
      console.error("Delete deliverable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tasks Routes
  app.get("/api/tasks", authenticateToken, async (req: any, res) => {
    try {
      const { status, priority, assigneeId, brandId } = req.query;
      const tasksList = await storage.getTasks({
        status: status as string,
        priority: priority as string,
        assigneeId: assigneeId as string,
        brandId: brandId as string,
      });
      res.json(tasksList);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tasks/:id", authenticateToken, async (req: any, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Get task error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tasks", authenticateToken, async (req: any, res) => {
    try {
      const data = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(data);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create task error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/tasks/:id", authenticateToken, async (req: any, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tasks/:id", authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard Routes
  app.get("/api/dashboard/stats", authenticateToken, async (req: any, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dashboard/upcoming", authenticateToken, async (req: any, res) => {
    try {
      const deadlines = await storage.getUpcomingDeadlines(7);
      res.json(deadlines);
    } catch (error) {
      console.error("Get upcoming deadlines error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Asset Library Routes
  app.get("/api/assets", authenticateToken, async (req: any, res) => {
    try {
      const { assetType, brandId } = req.query;
      const assets = await storage.getAssets({
        assetType: assetType as string,
        brandId: brandId as string,
      });
      res.json(assets);
    } catch (error) {
      console.error("Get assets error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/assets/:id", authenticateToken, async (req: any, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Get asset error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/assets", authenticateToken, async (req: any, res) => {
    try {
      const body = { ...req.body, createdById: req.user.userId };

      if (!body.brandId || body.brandId === "") {
        const detectedBrandId = await detectBrandFromName(body.name || "");
        if (detectedBrandId) body.brandId = detectedBrandId;
      }

      if (!body.assetType || body.assetType === "") {
        body.assetType = detectAssetTypeFromName(body.name || "", body.fileUrl || "");
      }

      const data = insertAssetLibrarySchema.parse(body);
      const asset = await storage.createAsset(data);
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create asset error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/assets/:id", authenticateToken, async (req: any, res) => {
    try {
      const asset = await storage.updateAsset(req.params.id, req.body);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Update asset error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/assets/auto-sort", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const allAssets = await storage.getAssets();
      let brandUpdated = 0;
      let typeUpdated = 0;
      let unchanged = 0;

      for (const asset of allAssets) {
        const updates: Record<string, any> = {};

        if (!asset.brandId) {
          const detectedBrandId = await detectBrandFromName(asset.name || "");
          if (detectedBrandId) {
            updates.brandId = detectedBrandId;
            brandUpdated++;
          }
        }

        const detectedType = detectAssetTypeFromName(asset.name || "", asset.fileUrl || "");
        if (detectedType !== asset.assetType) {
          updates.assetType = detectedType;
          typeUpdated++;
        }

        if (Object.keys(updates).length > 0) {
          await storage.updateAsset(asset.id, updates);
        } else {
          unchanged++;
        }
      }

      res.json({
        total: allAssets.length,
        brandUpdated,
        typeUpdated,
        unchanged,
        message: `Auto-sorted ${allAssets.length} assets: ${brandUpdated} brands detected, ${typeUpdated} types corrected`,
      });
    } catch (error) {
      console.error("Auto-sort assets error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/assets/:id", authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteAsset(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete asset error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Duplicate across regions
  const duplicateSchema = z.object({
    targetRegionIds: z.array(z.string()).min(1, "At least one region required"),
  });

  app.post("/api/social-posts/:id/duplicate", authenticateToken, async (req: any, res) => {
    try {
      const { targetRegionIds } = duplicateSchema.parse(req.body);
      const duplicates = await storage.duplicateSocialPost(req.params.id, targetRegionIds, req.user.userId);
      res.status(201).json(duplicates);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Duplicate social post error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events/:id/duplicate", authenticateToken, async (req: any, res) => {
    try {
      const { targetRegionIds } = duplicateSchema.parse(req.body);
      const duplicates = await storage.duplicateEvent(req.params.id, targetRegionIds, req.user.userId);
      res.status(201).json(duplicates);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Duplicate event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tasks/:id/duplicate", authenticateToken, async (req: any, res) => {
    try {
      const { targetRegionIds } = duplicateSchema.parse(req.body);
      const duplicates = await storage.duplicateTask(req.params.id, targetRegionIds, req.user.userId);
      res.status(201).json(duplicates);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Duplicate task error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notifications Routes
  app.get("/api/notifications", authenticateToken, async (req: any, res) => {
    try {
      const { unreadOnly } = req.query;
      const notifications = await storage.getNotifications(req.user.userId, unreadOnly === "true");
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/notifications/:id/read", authenticateToken, async (req: any, res) => {
    try {
      const notification = await storage.markNotificationRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/notifications/mark-all-read", authenticateToken, async (req: any, res) => {
    try {
      await storage.markAllNotificationsRead(req.user.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/notifications/:id", authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteNotification(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // App Settings Routes (admin only)
  app.get("/api/settings/:key", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      res.json(setting || { key: req.params.key, value: null });
    } catch (error) {
      console.error("Get setting error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/settings/:key", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { value } = req.body;
      const setting = await storage.setSetting(req.params.key, value);
      res.json(setting);
    } catch (error) {
      console.error("Set setting error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Test Slack DM endpoint (admin only)
  app.post("/api/settings/slack/test-dm", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const botToken = process.env.SLACK_BOT_TOKEN;
      if (!botToken) {
        return res.status(400).json({ message: "SLACK_BOT_TOKEN secret not configured. Add it in the Secrets tab." });
      }

      if (!botToken.startsWith("xoxb-")) {
        return res.status(400).json({ message: "Invalid bot token format. The token should start with 'xoxb-'. Make sure you copied the Bot User OAuth Token (not a user token or signing secret)." });
      }

      const currentUser = await storage.getUser(req.user.userId);
      if (!currentUser?.slackUserId) {
        return res.status(400).json({ message: "Your account is not linked to a Slack ID. Click 'Auto' next to your name in the user list below to link your account first." });
      }

      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: currentUser.slackUserId,
          text: "Test notification from Bloom & Grow Marketing Planner",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "*Test DM* :white_check_mark:\n\nThis is a test direct message from your marketing planner. If you see this message, Slack DM integration is working correctly!",
              },
            },
          ],
        }),
      });

      const data = await response.json() as { ok: boolean; error?: string };
      if (!data.ok) {
        const slackError = data.error || "unknown_error";
        const errorMessages: Record<string, string> = {
          "invalid_auth": "The bot token is invalid. Please check that you copied the correct Bot User OAuth Token from your Slack app settings.",
          "token_revoked": "The bot token has been revoked. Please generate a new token in your Slack app settings.",
          "not_authed": "The bot token is missing or not recognized by Slack. Please re-enter it in Secrets.",
          "channel_not_found": "Could not find a DM channel with your Slack user. Make sure the bot has been added to your workspace.",
          "not_in_channel": "The bot is not authorized to message this user. Make sure the bot has 'chat:write' and 'im:write' scopes.",
          "missing_scope": "The bot is missing required permissions. Add 'chat:write' and 'im:write' scopes in your Slack app settings.",
          "account_inactive": "The Slack account is inactive or disabled.",
        };
        const friendlyMessage = errorMessages[slackError] || `Slack returned error: ${slackError}`;
        return res.status(400).json({ message: friendlyMessage });
      }

      res.json({ success: true, message: "Test DM sent to your Slack account" });
    } catch (error) {
      console.error("Slack test DM error:", error);
      res.status(500).json({ message: "Failed to connect to Slack. Please check your internet connection and try again." });
    }
  });

  // Lookup Slack user by email (admin only)
  app.post("/api/slack/lookup-user", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const botToken = process.env.SLACK_BOT_TOKEN;
      if (!botToken) {
        return res.status(400).json({ message: "SLACK_BOT_TOKEN secret not configured. Add it in Secrets." });
      }

      const response = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${botToken}`,
        },
      });

      const data = await response.json() as { ok: boolean; user?: { id: string }; error?: string };
      if (!data.ok) {
        return res.json({ slackUserId: null, email, error: data.error });
      }

      res.json({ slackUserId: data.user?.id || null, email });
    } catch (error) {
      console.error("Slack lookup error:", error);
      res.status(500).json({ message: "Failed to lookup Slack user" });
    }
  });

  // Update user's Slack ID (admin only)
  app.put("/api/users/:id/slack", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { slackUserId } = req.body;
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updated = await storage.updateUser(req.params.id, { slackUserId });
      res.json(updated);
    } catch (error) {
      console.error("Update Slack ID error:", error);
      res.status(500).json({ message: "Failed to update Slack ID" });
    }
  });

  // Auto-link user to Slack by email (admin only)
  app.post("/api/users/:id/slack/auto-link", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const botToken = process.env.SLACK_BOT_TOKEN;
      if (!botToken) {
        return res.status(400).json({ message: "SLACK_BOT_TOKEN secret not configured. Add it in the Secrets tab." });
      }

      if (!botToken.startsWith("xoxb-")) {
        return res.status(400).json({ message: "Invalid bot token format. The token should start with 'xoxb-'. Make sure you copied the Bot User OAuth Token (not a user token or signing secret)." });
      }

      const response = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(user.email)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${botToken}`,
        },
      });

      const data = await response.json() as { ok: boolean; user?: { id: string }; error?: string };
      
      if (!data.ok) {
        const slackError = data.error || "unknown_error";
        const errorMessages: Record<string, string> = {
          "users_not_found": `Could not find a Slack user with email: ${user.email}. Please ensure their Slack email matches their account email exactly.`,
          "invalid_auth": "The bot token is invalid. Please check your SLACK_BOT_TOKEN secret.",
          "token_revoked": "The bot token has been revoked. Please generate a new one in Slack.",
          "missing_scope": "The bot is missing the 'users:read.email' scope. Add it in your Slack App settings under 'OAuth & Permissions'.",
          "ratelimited": "Slack API rate limit exceeded. Please try again in a few minutes.",
          "account_inactive": "The Slack account for this email is inactive or disabled.",
        };
        const friendlyMessage = errorMessages[slackError] || `Slack error: ${slackError}`;
        return res.status(400).json({ message: friendlyMessage });
      }

      if (!data.user?.id) {
        return res.status(404).json({ message: `Slack found the user but returned no ID for email: ${user.email}` });
      }

      const updated = await storage.updateUser(req.params.id, { slackUserId: data.user.id });
      res.json({ slackUserId: data.user.id, user: updated });
    } catch (error) {
      console.error("Auto-link Slack error:", error);
      res.status(500).json({ message: "Failed to connect to Slack. Please check your internet connection." });
    }
  });

  // Promotions Routes
  app.get("/api/promotions", authenticateToken, async (req: any, res) => {
    try {
      const { brandId, status } = req.query;
      const promotions = await storage.getPromotions({
        brandId: brandId as string,
        status: status as string,
      });
      res.json(promotions);
    } catch (error) {
      console.error("Get promotions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/promotions/:id", authenticateToken, async (req: any, res) => {
    try {
      const promotion = await storage.getPromotion(req.params.id);
      if (!promotion) {
        return res.status(404).json({ message: "Promotion not found" });
      }
      res.json(promotion);
    } catch (error) {
      console.error("Get promotion error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/promotions", authenticateToken, async (req: any, res) => {
    try {
      const data = insertPromotionSchema.parse({
        ...req.body,
        createdById: req.user.userId,
      });
      const promotion = await storage.createPromotion(data);
      res.status(201).json(promotion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create promotion error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/promotions/:id", authenticateToken, async (req: any, res) => {
    try {
      const promotion = await storage.updatePromotion(req.params.id, req.body);
      if (!promotion) {
        return res.status(404).json({ message: "Promotion not found" });
      }
      res.json(promotion);
    } catch (error) {
      console.error("Update promotion error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/promotions/:id", authenticateToken, async (req: any, res) => {
    try {
      await storage.deletePromotion(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete promotion error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Approvals Routes
  app.get("/api/approvals", authenticateToken, async (req: any, res) => {
    try {
      const { contentType, contentId, status, requestedById } = req.query;
      
      if (contentType && contentId) {
        const approval = await storage.getApprovalByContent(contentType as string, contentId as string);
        res.json(approval ? [approval] : []);
        return;
      }
      
      const approvals = await storage.getApprovals({
        contentType: contentType as string,
        status: status as string,
        requestedById: requestedById as string,
      });
      res.json(approvals);
    } catch (error) {
      console.error("Get approvals error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/approvals/:id", authenticateToken, async (req: any, res) => {
    try {
      const approval = await storage.getApproval(req.params.id);
      if (!approval) {
        return res.status(404).json({ message: "Approval not found" });
      }
      res.json(approval);
    } catch (error) {
      console.error("Get approval error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/approvals", authenticateToken, async (req: any, res) => {
    try {
      const data = insertApprovalSchema.parse({
        ...req.body,
        requestedById: req.user.userId,
      });
      const approval = await storage.createApproval(data);
      res.status(201).json(approval);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create approval error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/approvals/:id", authenticateToken, async (req: any, res) => {
    try {
      const approval = await storage.getApproval(req.params.id);
      if (!approval) {
        return res.status(404).json({ message: "Approval not found" });
      }
      
      const updateData = { ...req.body };
      
      if (req.body.status === "APPROVED" || req.body.status === "REJECTED") {
        if (approval.requestedById === req.user.userId) {
          return res.status(403).json({ message: "You cannot approve or reject your own request" });
        }
        
        if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
          return res.status(403).json({ message: "Only admins and managers can approve or reject requests" });
        }
        
        updateData.reviewerId = req.user.userId;
        updateData.reviewedAt = new Date();
      }
      
      const updated = await storage.updateApproval(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Update approval error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User Preferences Routes
  app.get("/api/user-preferences", authenticateToken, async (req: any, res) => {
    try {
      const prefs = await storage.getUserPreferences(req.user.userId);
      res.json(prefs || { userId: req.user.userId, calendarView: "month", calendarFilters: "{}" });
    } catch (error) {
      console.error("Get user preferences error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/user-preferences", authenticateToken, async (req: any, res) => {
    try {
      const prefs = await storage.setUserPreferences(req.user.userId, req.body);
      res.json(prefs);
    } catch (error) {
      console.error("Update user preferences error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Recurrence Patterns Routes
  app.post("/api/recurrence-patterns", authenticateToken, async (req: any, res) => {
    try {
      const data = insertRecurrencePatternSchema.parse(req.body);
      const pattern = await storage.createRecurrencePattern(data);
      res.status(201).json(pattern);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create recurrence pattern error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/recurrence-patterns/:id", authenticateToken, async (req: any, res) => {
    try {
      const pattern = await storage.getRecurrencePattern(req.params.id);
      if (!pattern) {
        return res.status(404).json({ message: "Recurrence pattern not found" });
      }
      res.json(pattern);
    } catch (error) {
      console.error("Get recurrence pattern error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/recurrence-patterns/:id", authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteRecurrencePattern(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete recurrence pattern error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Unified Calendar API - returns all content types for calendar view
  app.get("/api/calendar", authenticateToken, async (req: any, res) => {
    try {
      const { startDate, endDate, brandId, regionId, contentTypes } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const types = contentTypes ? (contentTypes as string).split(",") : ["SOCIAL", "EMAIL", "EVENT"];
      
      const results: Array<{
        id: string;
        title: string;
        type: "SOCIAL" | "EMAIL" | "EVENT";
        date: Date | string;
        brandId: string | null;
        regionId: string;
        status: string;
        platform?: string;
        eventType?: string;
        emailType?: string;
        brandColor?: string;
      }> = [];

      const brands = await storage.getBrands();
      const brandColorMap = new Map(brands.map(b => [b.id, b.color]));

      if (types.includes("SOCIAL")) {
        const posts = await storage.getSocialPosts({
          brandId: brandId as string,
          regionId: regionId as string,
          startDate: start,
          endDate: end,
        });
        posts.forEach(post => {
          results.push({
            id: post.id,
            title: post.caption || `${post.platform} Post`,
            type: "SOCIAL",
            date: post.scheduledDate,
            brandId: post.brandId,
            regionId: post.regionId,
            status: post.copyStatus,
            platform: post.platform,
            brandColor: brandColorMap.get(post.brandId),
          });
        });
      }

      if (types.includes("EMAIL")) {
        const emails = await storage.getEmailCampaigns({
          brandId: brandId as string,
          regionId: regionId as string,
        });
        emails.forEach(email => {
          if (email.scheduledDate) {
            const emailDate = new Date(email.scheduledDate);
            if ((!start || emailDate >= start) && (!end || emailDate <= end)) {
              results.push({
                id: email.id,
                title: email.name,
                type: "EMAIL",
                date: email.scheduledDate,
                brandId: email.brandId,
                regionId: email.regionId,
                status: email.status,
                emailType: email.emailType,
                brandColor: brandColorMap.get(email.brandId),
              });
            }
          }
        });
      }

      if (types.includes("EVENT")) {
        const events = await storage.getEvents({
          regionId: regionId as string,
          startDate: start,
          endDate: end,
        });
        events.forEach(event => {
          results.push({
            id: event.id,
            title: event.name,
            type: "EVENT",
            date: event.startDate,
            brandId: null,
            regionId: event.regionId,
            status: event.status,
            eventType: event.eventType,
          });
        });
      }

      results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      res.json(results);
    } catch (error) {
      console.error("Get calendar error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Brand Detail with Promotions and Stats
  app.get("/api/brands/:id/detail", authenticateToken, async (req: any, res) => {
    try {
      const brand = await storage.getBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }

      const brandId = req.params.id;
      const promotions = await storage.getPromotions({ brandId });
      const socialPosts = await storage.getSocialPosts({ brandId });
      const emailCampaigns = await storage.getEmailCampaigns({ brandId });
      const assets = await storage.getAssets({ brandId });
      const tasks = await storage.getTasks({ brandId });

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);

      const activePromotions = promotions.filter(p => p.status === "ACTIVE");
      const upcomingPosts = socialPosts.filter(p => new Date(p.scheduledDate) > now).slice(0, 5);
      const upcomingEmails = emailCampaigns.filter(e => e.scheduledDate && new Date(e.scheduledDate) > now).slice(0, 5);
      
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const postsThisMonth = socialPosts.filter(p => {
        const postDate = new Date(p.scheduledDate);
        return postDate >= startOfMonth && postDate <= endOfMonth;
      }).length;
      
      const scheduledPostsCount = socialPosts.filter(p => new Date(p.scheduledDate) > now).length;
      const completedTasks = tasks.filter(t => t.status === "DONE").length;

      res.json({
        brand,
        stats: {
          totalPromotions: promotions.length,
          activePromotions: activePromotions.length,
          totalPosts: socialPosts.length,
          totalEmails: emailCampaigns.length,
          totalAssets: assets.length,
          totalTasks: tasks.length,
          postsThisMonth,
          scheduledPosts: scheduledPostsCount,
          completedTasks,
        },
        promotions,
        upcomingPosts,
        upcomingEmails,
      });
    } catch (error) {
      console.error("Get brand detail error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Brand Activity - Recent updates for a brand
  app.get("/api/brands/:id/activity", authenticateToken, async (req: any, res) => {
    try {
      const brandId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 20;

      const [posts, emails, tasks] = await Promise.all([
        storage.getSocialPosts({ brandId }),
        storage.getEmailCampaigns({ brandId }),
        storage.getTasks({ brandId }),
      ]);

      const activity: any[] = [];

      posts.forEach(post => {
        activity.push({
          id: `social-${post.id}`,
          type: 'social',
          title: `${post.platform} post ${post.copyStatus === 'POSTED' ? 'published' : 'created'}`,
          description: post.caption?.substring(0, 100),
          status: post.copyStatus || post.assetStatus || 'DRAFT',
          createdAt: post.createdAt,
        });
      });

      emails.forEach(email => {
        activity.push({
          id: `email-${email.id}`,
          type: 'email',
          title: `Email campaign: ${email.name}`,
          description: email.subject?.substring(0, 100),
          status: email.status || 'PLANNING',
          createdAt: email.createdAt,
        });
      });

      tasks.forEach(task => {
        activity.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          description: task.description?.substring(0, 100),
          status: task.status || 'TODO',
          createdAt: task.createdAt,
        });
      });

      activity.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.json(activity.slice(0, limit));
    } catch (error) {
      console.error("Get brand activity error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============ Collaboration Profiles ============
  app.get("/api/collaboration-profiles", authenticateToken, async (req: any, res) => {
    try {
      const { brandId } = req.query;
      const profiles = await storage.getCollaborationProfiles(brandId ? { brandId: brandId as string } : undefined);
      res.json(profiles);
    } catch (error) {
      console.error("Get collaboration profiles error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/collaboration-profiles", authenticateToken, async (req: any, res) => {
    try {
      const profile = await storage.createCollaborationProfile(req.body);
      res.status(201).json(profile);
    } catch (error) {
      console.error("Create collaboration profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/collaboration-profiles/:id", authenticateToken, async (req: any, res) => {
    try {
      const updated = await storage.updateCollaborationProfile(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Profile not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update collaboration profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/collaboration-profiles/:id", authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteCollaborationProfile(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete collaboration profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============ Top Performing Posts (must be before /api/social/:id routes) ============
  app.get("/api/social/top-performing", authenticateToken, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const { regionId, brandId } = req.query;
      const topPosts = await storage.getTopPerformingPosts(limit, {
        regionId: regionId as string,
        brandId: brandId as string,
      });
      res.json(topPosts);
    } catch (error) {
      console.error("Get top performing posts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/social/:id/collaborations", authenticateToken, async (req: any, res) => {
    try {
      const profiles = await storage.getPostCollaborations(req.params.id);
      res.json(profiles);
    } catch (error) {
      console.error("Get post collaborations error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/social/:id/collaborations", authenticateToken, async (req: any, res) => {
    try {
      const { profileIds } = req.body;
      await storage.setPostCollaborations(req.params.id, profileIds || []);
      res.json({ success: true });
    } catch (error) {
      console.error("Set post collaborations error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============ Post Tags ============
  app.get("/api/post-tags", authenticateToken, async (req: any, res) => {
    try {
      const tags = await storage.getPostTags();
      res.json(tags);
    } catch (error) {
      console.error("Get post tags error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/post-tags", authenticateToken, async (req: any, res) => {
    try {
      const tag = await storage.createPostTag(req.body);
      res.status(201).json(tag);
    } catch (error) {
      console.error("Create post tag error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/post-tags/:id", authenticateToken, async (req: any, res) => {
    try {
      const updated = await storage.updatePostTag(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Tag not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update post tag error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/post-tags/:id", authenticateToken, async (req: any, res) => {
    try {
      await storage.deletePostTag(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete post tag error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/post-tags/:id/posts", authenticateToken, async (req: any, res) => {
    try {
      const postIds = await storage.getPostIdsByTag(req.params.id);
      res.json(postIds);
    } catch (error) {
      console.error("Get posts by tag error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/social/:id/tags", authenticateToken, async (req: any, res) => {
    try {
      const tags = await storage.getTagsForPost(req.params.id);
      res.json(tags);
    } catch (error) {
      console.error("Get post tags error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/social/:id/tags", authenticateToken, async (req: any, res) => {
    try {
      const { tagIds } = req.body;
      await storage.setPostTags(req.params.id, tagIds || []);
      res.json({ success: true });
    } catch (error) {
      console.error("Set post tags error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============ Post Performance ============
  app.get("/api/social/:id/performance", authenticateToken, async (req: any, res) => {
    try {
      const performance = await storage.getPostPerformance(req.params.id);
      res.json(performance || null);
    } catch (error) {
      console.error("Get post performance error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/social/:id/performance/history", authenticateToken, async (req: any, res) => {
    try {
      const history = await storage.getPostPerformanceHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Get performance history error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/social/:id/performance", authenticateToken, async (req: any, res) => {
    try {
      const performance = await storage.createPostPerformance({
        ...req.body,
        postId: req.params.id,
        recordedById: req.user.userId,
        recordedAt: req.body.recordedAt ? new Date(req.body.recordedAt) : new Date(),
      });
      res.status(201).json(performance);
    } catch (error) {
      console.error("Create post performance error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/performance/:id", authenticateToken, async (req: any, res) => {
    try {
      const updated = await storage.updatePostPerformance(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Performance record not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update post performance error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/performance/:id", authenticateToken, async (req: any, res) => {
    try {
      await storage.deletePostPerformance(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete post performance error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============ Sent/Published Content ============
  app.get("/api/sent", authenticateToken, async (req: any, res) => {
    try {
      const { type, brandIds, regionIds, from, to } = req.query;
      let allContent: any[] = [];

      if (!type || type === 'all' || type === 'social') {
        const posts = await storage.getSocialPosts({
          startDate: from ? new Date(from as string) : undefined,
          endDate: to ? new Date(to as string) : undefined,
        });
        const publishedPosts = posts.filter(p => p.copyStatus === 'POSTED');
        const filteredPosts = publishedPosts.filter(p => {
          if (brandIds) {
            const ids = (brandIds as string).split(',');
            if (!ids.includes(p.brandId)) return false;
          }
          if (regionIds) {
            const ids = (regionIds as string).split(',');
            if (!ids.includes(p.regionId)) return false;
          }
          return true;
        });

        for (const post of filteredPosts) {
          const performance = await storage.getPostPerformance(post.id);
          const brand = await storage.getBrand(post.brandId);
          allContent.push({
            ...post,
            type: 'social',
            performance,
            brand,
            postUrl: performance?.postUrl,
          });
        }
      }

      if (!type || type === 'all' || type === 'email') {
        const emails = await storage.getEmailCampaigns({ status: 'SENT' });
        const filteredEmails = emails.filter(e => {
          if (brandIds) {
            const ids = (brandIds as string).split(',');
            if (!ids.includes(e.brandId)) return false;
          }
          if (regionIds) {
            const ids = (regionIds as string).split(',');
            if (!ids.includes(e.regionId)) return false;
          }
          return true;
        });
        for (const email of filteredEmails) {
          const brand = await storage.getBrand(email.brandId);
          allContent.push({ ...email, type: 'email', brand });
        }
      }

      if (!type || type === 'all' || type === 'event') {
        const evts = await storage.getEvents({ status: 'COMPLETED' });
        const filteredEvents = evts.filter(e => {
          if (regionIds) {
            const ids = (regionIds as string).split(',');
            if (!ids.includes(e.regionId)) return false;
          }
          return true;
        });
        for (const evt of filteredEvents) {
          allContent.push({ ...evt, type: 'event' });
        }
      }

      allContent.sort((a, b) =>
        new Date(b.scheduledDate || b.startDate || b.createdAt).getTime() -
        new Date(a.scheduledDate || a.startDate || a.createdAt).getTime()
      );

      res.json(allContent);
    } catch (error) {
      console.error("Get sent content error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============ Copywriter Assignment ============
  app.post("/api/social/:id/assign-copywriter", authenticateToken, async (req: any, res) => {
    try {
      const { copywriterId } = req.body;
      const post = await storage.updateSocialPost(req.params.id, {
        copywriterId,
        copyAssignedAt: new Date(),
      } as any);
      if (!post) return res.status(404).json({ message: "Post not found" });

      if (copywriterId) {
        const copywriter = await storage.getUser(copywriterId);
        if (copywriter) {
          await storage.createNotification({
            userId: copywriterId,
            type: "COPY_ASSIGNED",
            title: "New copy assignment",
            message: `You've been assigned to write copy for a ${post.platform} post`,
            entityType: "social_post",
            entityId: post.id,
            isRead: false,
          });
        }
      }

      res.json(post);
    } catch (error) {
      console.error("Assign copywriter error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/social/:id/copy-complete", authenticateToken, async (req: any, res) => {
    try {
      const post = await storage.updateSocialPost(req.params.id, {
        copyCompletedAt: new Date(),
      } as any);
      if (!post) return res.status(404).json({ message: "Post not found" });

      if (post.designerId) {
        await storage.createNotification({
          userId: post.designerId,
          type: "COPY_READY",
          title: "Copy ready for design",
          message: `Copy completed for ${post.platform} post - ready for design`,
          entityType: "social_post",
          entityId: post.id,
          isRead: false,
        });
      }

      res.json(post);
    } catch (error) {
      console.error("Copy complete error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============ Canva Integration Endpoints ============

  app.get("/api/canva/status", authenticateToken, async (req: any, res) => {
    try {
      const integration = await storage.getCanvaIntegration(req.user.userId);
      const hasCredentials = !!(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET);
      res.json({
        connected: !!integration?.isActive,
        integration: integration || null,
        hasCredentials,
      });
    } catch (error) {
      console.error("Get Canva status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/canva/auth-url", authenticateToken, async (req: any, res) => {
    try {
      const clientOrigin = req.query.origin as string | undefined;
      let redirectUri: string;
      if (clientOrigin) {
        redirectUri = `${clientOrigin}/api/canva/callback`;
      } else {
        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        redirectUri = `${protocol}://${host}/api/canva/callback`;
      }
      console.log("Canva auth-url: generating with redirectUri:", redirectUri);
      const result = await getCanvaAuthUrl(req.user.userId, redirectUri);
      if (!result) {
        return res.status(400).json({ message: "Canva Client ID not configured. Add CANVA_CLIENT_ID and CANVA_CLIENT_SECRET in Secrets." });
      }
      res.json({ authUrl: result.url });
    } catch (error) {
      console.error("Get Canva auth URL error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/canva/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return res.redirect("/settings?canva_error=missing_params");
      }

      const pkceData = await getPkceData(state as string);
      if (!pkceData) {
        return res.redirect("/settings?canva_error=invalid_state");
      }

      const redirectUri = pkceData.redirectUri;
      console.log("Canva callback: using stored redirectUri:", redirectUri);
      console.log("Canva callback: code length:", (code as string).length, "codeVerifier length:", pkceData.codeVerifier.length);

      const tokenResult = await exchangeCodeForTokens(code as string, pkceData.codeVerifier, redirectUri);
      if (!tokenResult.success) {
        console.error("Canva token exchange error:", tokenResult.error);
        return res.redirect("/settings?canva_error=" + encodeURIComponent(tokenResult.error));
      }
      const tokens = tokenResult;

      let canvaUserId: string | null = null;
      let canvaTeamId: string | null = null;
      try {
        const profile = await fetchCanvaUserProfile(tokens.access_token);
        if (profile) {
          canvaUserId = profile.user_id;
          canvaTeamId = profile.team_id || null;
        }
      } catch (e) {
        console.warn("Could not fetch Canva user profile:", e);
      }

      const existing = await storage.getCanvaIntegration(pkceData.userId);
      const integrationData = {
        canvaAccessToken: tokens.access_token,
        canvaRefreshToken: tokens.refresh_token,
        canvaUserId,
        canvaTeamId,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isActive: true,
      };

      if (existing) {
        await storage.updateCanvaIntegration(existing.id, integrationData);
      } else {
        await storage.createCanvaIntegration({
          userId: pkceData.userId,
          ...integrationData,
        });
      }

      res.redirect("/settings?canva_success=true");
    } catch (error) {
      console.error("Canva callback error:", error);
      res.redirect("/settings?canva_error=callback_failed");
    }
  });

  app.post("/api/canva/connect", authenticateToken, async (req: any, res) => {
    try {
      const { canvaAccessToken } = req.body;
      if (!canvaAccessToken) {
        return res.status(400).json({ message: "Access token is required" });
      }

      let canvaUserId: string | null = null;
      let canvaTeamId: string | null = null;
      try {
        const profile = await fetchCanvaUserProfile(canvaAccessToken);
        if (profile) {
          canvaUserId = profile.user_id;
          canvaTeamId = profile.team_id || null;
        }
      } catch (e) {
        console.warn("Could not fetch Canva user profile:", e);
      }

      const existing = await storage.getCanvaIntegration(req.user.userId);
      const integrationData = {
        canvaAccessToken,
        canvaUserId,
        canvaTeamId,
        isActive: true,
      };

      if (existing) {
        const updated = await storage.updateCanvaIntegration(existing.id, integrationData);
        res.json(updated);
      } else {
        const created = await storage.createCanvaIntegration({
          userId: req.user.userId,
          ...integrationData,
        });
        res.status(201).json(created);
      }
    } catch (error) {
      console.error("Connect Canva error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/canva/disconnect", authenticateToken, async (req: any, res) => {
    try {
      const integration = await storage.getCanvaIntegration(req.user.userId);
      if (integration) {
        await storage.updateCanvaIntegration(integration.id, {
          isActive: false,
          canvaAccessToken: null,
          canvaRefreshToken: null,
          tokenExpiresAt: null,
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Disconnect Canva error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/canva/sync-assets", authenticateToken, async (req: any, res) => {
    try {
      const integration = await storage.getCanvaIntegration(req.user.userId);
      if (!integration?.isActive || !integration.canvaAccessToken) {
        return res.status(400).json({ message: "Canva not connected" });
      }

      const accessToken = await getValidAccessToken(
        integration,
        (id, data) => storage.updateCanvaIntegration(id, data)
      );

      if (!accessToken) {
        return res.status(401).json({ message: "Canva token expired. Please reconnect." });
      }

      const { brandId } = req.body;

      if (brandId) {
        const brand = await storage.getBrand(brandId);
        if (!brand) {
          return res.status(400).json({ message: "Invalid brand selected" });
        }
      }

      let designs;
      try {
        designs = await fetchAllCanvaDesigns(accessToken, 5);
      } catch (apiError: any) {
        console.error("Canva API fetch error:", apiError);
        if (apiError.message?.includes("401") || apiError.message?.includes("403")) {
          if (integration.canvaRefreshToken) {
            const refreshed = await refreshAccessToken(integration.canvaRefreshToken);
            if (refreshed) {
              await storage.updateCanvaIntegration(integration.id, {
                canvaAccessToken: refreshed.access_token,
                canvaRefreshToken: refreshed.refresh_token,
                tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
              });
              try {
                designs = await fetchAllCanvaDesigns(refreshed.access_token, 5);
              } catch {
                return res.status(401).json({ message: "Canva token invalid. Please reconnect." });
              }
            } else {
              return res.status(401).json({ message: "Canva token expired. Please reconnect." });
            }
          } else {
            return res.status(401).json({ message: "Canva token invalid or expired. Please reconnect." });
          }
        } else {
          return res.status(502).json({ message: "Failed to fetch designs from Canva" });
        }
      }

      const existingCanvaIds = await storage.getExistingCanvaDesignIds();

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const design of designs) {
        try {
          if (existingCanvaIds.has(design.id)) {
            skipped++;
            continue;
          }

          const assetData = mapCanvaDesignToAsset(design);
          let assignedBrandId = brandId || null;
          if (!assignedBrandId) {
            assignedBrandId = await detectBrandFromName(assetData.name || "") || null;
          }
          if (!assetData.assetType) {
            assetData.assetType = detectAssetTypeFromName(assetData.name || "", assetData.fileUrl || "");
          }
          await storage.createAsset({
            ...assetData,
            brandId: assignedBrandId,
            createdById: req.user.userId,
          } as any);
          imported++;
        } catch (assetError: any) {
          console.error(`Failed to import design ${design.id}:`, assetError);
          errors.push(design.title || design.id);
        }
      }

      await storage.updateCanvaIntegration(integration.id, { lastSyncAt: new Date() });

      res.json({
        success: true,
        message: `Sync complete: ${imported} imported, ${skipped} already existed`,
        totalDesigns: designs.length,
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Sync Canva assets error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/canva/designs", authenticateToken, async (req: any, res) => {
    try {
      const integration = await storage.getCanvaIntegration(req.user.userId);
      if (!integration?.isActive || !integration.canvaAccessToken) {
        return res.status(400).json({ message: "Canva not connected" });
      }

      const accessToken = await getValidAccessToken(
        integration,
        (id, data) => storage.updateCanvaIntegration(id, data)
      );

      if (!accessToken) {
        return res.status(401).json({ message: "Canva token expired. Please reconnect." });
      }

      const designs = await fetchAllCanvaDesigns(accessToken, 3);
      res.json({ designs });
    } catch (error) {
      console.error("Fetch Canva designs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== Meta Integration Routes =====

  app.get("/api/meta/status", authenticateToken, async (req: any, res) => {
    try {
      const integration = await storage.getMetaIntegration(req.user.userId);
      res.json({
        connected: !!integration?.isActive,
        integration: integration || null,
        hasCredentials: hasMetaCredentials(),
      });
    } catch (error) {
      console.error("Meta status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/meta/auth-url", authenticateToken, async (req: any, res) => {
    try {
      const origin = req.query.origin as string;
      let redirectUri: string;
      if (origin) {
        const clientOrigin = decodeURIComponent(origin);
        redirectUri = `${clientOrigin}/api/meta/callback`;
      } else {
        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        redirectUri = `${protocol}://${host}/api/meta/callback`;
      }

      const result = await getMetaAuthUrl(req.user.userId, redirectUri);
      if (!result) {
        return res.status(400).json({ message: "Meta credentials not configured" });
      }
      res.json({ authUrl: result.url });
    } catch (error) {
      console.error("Meta auth URL error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/meta/callback", async (req, res) => {
    try {
      const { code, state, error: authError } = req.query;

      if (authError) {
        console.error("Meta OAuth error:", authError);
        return res.redirect("/?meta_error=auth_denied");
      }

      if (!code || !state) {
        return res.redirect("/?meta_error=missing_params");
      }

      const stateData = await getMetaOAuthState(state as string);
      if (!stateData) {
        return res.redirect("/?meta_error=invalid_state");
      }

      const tokenResult = await exchangeCodeForToken(code as string, stateData.redirectUri);
      if (!tokenResult.success) {
        console.error("Meta token exchange error:", tokenResult.error);
        return res.redirect("/?meta_error=token_exchange");
      }

      const longLived = await exchangeForLongLivedToken(tokenResult.access_token);
      const finalToken = longLived?.access_token || tokenResult.access_token;
      const expiresIn = longLived?.expires_in || tokenResult.expires_in || 5184000;

      const metaUserId = await fetchMetaUserId(finalToken);

      const existing = await storage.getMetaIntegration(stateData.userId);
      if (existing) {
        await storage.updateMetaIntegration(existing.id, {
          userAccessToken: finalToken,
          metaUserId,
          tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
          isActive: true,
        });
      } else {
        await storage.createMetaIntegration({
          userId: stateData.userId,
          userAccessToken: finalToken,
          metaUserId,
          tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
          isActive: true,
        });
      }

      res.redirect("/settings?meta_connected=true");
    } catch (error) {
      console.error("Meta callback error:", error);
      res.redirect("/?meta_error=callback_failed");
    }
  });

  app.get("/api/meta/pages", authenticateToken, async (req: any, res) => {
    try {
      const integration = await storage.getMetaIntegration(req.user.userId);
      if (!integration?.userAccessToken) {
        return res.status(400).json({ message: "Meta not connected" });
      }
      const pages = await fetchUserPages(integration.userAccessToken);
      res.json({ pages });
    } catch (error) {
      console.error("Meta pages error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/meta/select-page", authenticateToken, async (req: any, res) => {
    try {
      const { pageId } = req.body;
      const integration = await storage.getMetaIntegration(req.user.userId);
      if (!integration?.userAccessToken) {
        return res.status(400).json({ message: "Meta not connected" });
      }

      const pages = await fetchUserPages(integration.userAccessToken);
      const selectedPage = pages.find(p => p.id === pageId);
      if (!selectedPage) {
        return res.status(404).json({ message: "Page not found" });
      }

      await storage.updateMetaIntegration(integration.id, {
        selectedPageId: selectedPage.id,
        selectedPageName: selectedPage.name,
        selectedPageAccessToken: selectedPage.access_token,
        instagramBusinessAccountId: selectedPage.instagram_business_account?.id || null,
      });

      res.json({
        message: "Page selected",
        page: {
          id: selectedPage.id,
          name: selectedPage.name,
          hasInstagram: !!selectedPage.instagram_business_account,
        },
      });
    } catch (error) {
      console.error("Meta select page error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/meta/disconnect", authenticateToken, async (req: any, res) => {
    try {
      const integration = await storage.getMetaIntegration(req.user.userId);
      if (integration) {
        await storage.deleteMetaPageMappingsByIntegration(integration.id);
        await storage.deleteMetaIntegration(integration.id);
      }
      res.json({ message: "Meta disconnected" });
    } catch (error) {
      console.error("Meta disconnect error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Meta Page Mapping routes
  app.get("/api/meta/page-mappings", authenticateToken, async (req: any, res) => {
    try {
      const mappings = await storage.getAllActiveMetaPageMappings();
      res.json(mappings);
    } catch (error) {
      console.error("Meta page mappings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/meta/sync-pages", authenticateToken, async (req: any, res) => {
    try {
      const integration = await storage.getMetaIntegration(req.user.userId);
      if (!integration?.userAccessToken) {
        return res.status(400).json({ message: "Meta not connected" });
      }

      const pages = await fetchUserPages(integration.userAccessToken);
      const results = { synced: 0, updated: 0, total: pages.length };

      for (const page of pages) {
        const existing = await storage.getMetaPageMappingByPageId(page.id);
        if (existing) {
          await storage.updateMetaPageMapping(existing.id, {
            pageName: page.name,
            pageAccessToken: page.access_token,
            instagramBusinessAccountId: page.instagram_business_account?.id || null,
          });
          results.updated++;
        } else {
          await storage.createMetaPageMapping({
            metaIntegrationId: integration.id,
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token,
            instagramBusinessAccountId: page.instagram_business_account?.id || null,
            isActive: true,
          });
          results.synced++;
        }
      }

      const mappings = await storage.getMetaPageMappings(integration.id);
      res.json({ message: "Pages synced successfully", results, mappings });
    } catch (error: any) {
      console.error("Meta sync pages error:", error);
      res.status(500).json({ message: error.message || "Failed to sync pages" });
    }
  });

  app.post("/api/meta/page-mappings/:id/assign-region", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { regionId } = req.body;
      const mapping = await storage.updateMetaPageMapping(id, { regionId: regionId || null });
      if (!mapping) {
        return res.status(404).json({ message: "Page mapping not found" });
      }
      res.json(mapping);
    } catch (error) {
      console.error("Meta assign region error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/meta/page-mappings/:id", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMetaPageMapping(id);
      res.json({ message: "Page mapping deleted" });
    } catch (error) {
      console.error("Meta delete page mapping error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Helper to resolve the right Meta page for a post
  async function resolveMetaPageForPost(post: any): Promise<any | null> {
    // 1. If post has a direct metaPageId, use that
    if (post.metaPageId) {
      const mapping = await storage.getMetaPageMappingById(post.metaPageId);
      if (mapping?.isActive) return mapping;
    }
    // 2. Fall back to region-based mapping
    if (post.regionId) {
      const mapping = await storage.getMetaPageMappingByRegion(post.regionId);
      if (mapping) return mapping;
    }
    // 3. Fall back to first active mapping (legacy behavior)
    const allMappings = await storage.getAllActiveMetaPageMappings();
    return allMappings[0] || null;
  }

  app.post("/api/meta/publish/:postId", authenticateToken, async (req: any, res) => {
    try {
      const { postId } = req.params;
      const post = await storage.getSocialPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const pageMapping = await resolveMetaPageForPost(post);
      if (!pageMapping) {
        return res.status(400).json({ message: "No Meta page configured. Connect Meta and assign pages to regions in Settings." });
      }

      const caption = post.caption || "";
      const imageUrl = post.assetUrl || undefined;

      let result: { id: string } | null = null;

      if (post.platform === "FACEBOOK") {
        result = await publishToFacebook(
          pageMapping.pageAccessToken,
          pageMapping.pageId,
          caption,
          imageUrl
        );
      } else if (post.platform === "INSTAGRAM") {
        if (!pageMapping.instagramBusinessAccountId) {
          return res.status(400).json({ message: "No Instagram Business Account linked to this page." });
        }
        if (!imageUrl) {
          return res.status(400).json({ message: "Instagram posts require an image. Please add an asset URL first." });
        }
        result = await publishToInstagram(
          pageMapping.pageAccessToken,
          pageMapping.instagramBusinessAccountId,
          caption,
          imageUrl
        );
      } else {
        return res.status(400).json({ message: `Publishing to ${post.platform} is not supported via Meta. Only Facebook and Instagram are supported.` });
      }

      if (result?.id) {
        await storage.updateSocialPost(postId, {
          metaPostId: result.id,
          metaPublishedAt: new Date(),
          metaPageId: pageMapping.id,
          copyStatus: "POSTED",
        });
      }

      res.json({ message: "Post published successfully", metaPostId: result?.id, pageName: pageMapping.pageName });
    } catch (error: any) {
      console.error("Meta publish error:", error);
      res.status(500).json({ message: error.message || "Failed to publish post" });
    }
  });

  app.post("/api/meta/fetch-analytics/:postId", authenticateToken, async (req: any, res) => {
    try {
      const { postId } = req.params;
      const post = await storage.getSocialPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (!post.metaPostId) {
        return res.status(400).json({ message: "This post has not been published via Meta." });
      }

      const pageMapping = await resolveMetaPageForPost(post);
      if (!pageMapping) {
        return res.status(400).json({ message: "Meta page not found for this post" });
      }

      let insights;
      if (post.platform === "FACEBOOK") {
        insights = await fetchFacebookPostInsights(pageMapping.pageAccessToken, post.metaPostId);
      } else if (post.platform === "INSTAGRAM") {
        insights = await fetchInstagramPostInsights(pageMapping.pageAccessToken, post.metaPostId);
      } else {
        return res.status(400).json({ message: "Analytics only available for Facebook and Instagram posts" });
      }

      const existingPerf = await storage.getPostPerformance(postId);
      const perfData = {
        postId,
        views: insights.views || 0,
        likes: insights.likes || 0,
        comments: insights.comments || 0,
        shares: insights.shares || 0,
        saves: insights.saves || 0,
        engagementRate: insights.engagementRate?.toString() || "0",
        recordedAt: new Date(),
        recordedById: req.user.userId,
      };

      if (existingPerf) {
        await storage.updatePostPerformance(existingPerf.id, perfData);
      } else {
        await storage.createPostPerformance(perfData);
      }

      res.json({ message: "Analytics fetched successfully", insights });
    } catch (error: any) {
      console.error("Meta analytics error:", error);
      res.status(500).json({ message: error.message || "Failed to fetch analytics" });
    }
  });

  app.post("/api/meta/fetch-all-analytics", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const allPosts = await storage.getSocialPosts();
      const metaPosts = allPosts.filter(p => p.metaPostId && (p.platform === "FACEBOOK" || p.platform === "INSTAGRAM"));

      let updated = 0;
      let errors = 0;

      for (const post of metaPosts) {
        try {
          const pageMapping = await resolveMetaPageForPost(post);
          if (!pageMapping) {
            errors++;
            continue;
          }

          let insights;
          if (post.platform === "FACEBOOK") {
            insights = await fetchFacebookPostInsights(pageMapping.pageAccessToken, post.metaPostId!);
          } else {
            insights = await fetchInstagramPostInsights(pageMapping.pageAccessToken, post.metaPostId!);
          }

          const existingPerf = await storage.getPostPerformance(post.id);
          const perfData = {
            postId: post.id,
            views: insights.views || 0,
            likes: insights.likes || 0,
            comments: insights.comments || 0,
            shares: insights.shares || 0,
            saves: insights.saves || 0,
            engagementRate: insights.engagementRate?.toString() || "0",
            recordedAt: new Date(),
            recordedById: req.user.userId,
          };

          if (existingPerf) {
            await storage.updatePostPerformance(existingPerf.id, perfData);
          } else {
            await storage.createPostPerformance(perfData);
          }
          updated++;
        } catch (e) {
          errors++;
          console.error(`Failed to fetch analytics for post ${post.id}:`, e);
        }
      }

      res.json({ message: `Analytics updated for ${updated} posts`, updated, errors, total: metaPosts.length });
    } catch (error) {
      console.error("Meta fetch all analytics error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== TikTok Integration Routes =====
  app.get("/api/tiktok/status", authenticateToken, async (req: any, res) => {
    try {
      const accounts = await storage.getSocialAccounts({ platform: "tiktok", isActive: true });
      res.json({ connected: accounts.length > 0, accounts, hasCredentials: hasTikTokCredentials() });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tiktok/auth-url", authenticateToken, async (req: any, res) => {
    try {
      const redirectUri = `${getCallbackOrigin(req)}/api/tiktok/callback`;
      const result = await getTikTokAuthUrl(req.user.userId, redirectUri);
      if (!result) return res.status(400).json({ message: "TikTok credentials not configured" });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tiktok/callback", async (req, res) => {
    try {
      const { code, state, error: authError } = req.query;
      if (authError) return res.redirect("/?tiktok_error=auth_denied");
      if (!code || !state) return res.redirect("/?tiktok_error=missing_params");
      const stateData = await getTikTokOAuthState(state as string);
      if (!stateData) return res.redirect("/?tiktok_error=invalid_state");
      const tokenResult = await exchangeTikTokCode(code as string, stateData.redirectUri, stateData.codeVerifier);
      if (!tokenResult.success) return res.redirect("/?tiktok_error=token_exchange");
      const tokenData = tokenResult as any;
      await storage.createSocialAccount({
        platform: "tiktok",
        accountName: tokenData.open_id || "TikTok Account",
        accountId: tokenData.open_id || null,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
        isActive: true,
      });
      res.redirect("/settings?tiktok_connected=true");
    } catch (error: any) {
      console.error("TikTok callback error:", error);
      res.redirect("/?tiktok_error=callback_failed");
    }
  });

  app.post("/api/tiktok/disconnect", authenticateToken, async (req: any, res) => {
    try {
      const accounts = await storage.getSocialAccounts({ platform: "tiktok" });
      for (const account of accounts) {
        await storage.deleteSocialAccount(account.id);
      }
      res.json({ message: "TikTok disconnected" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== LinkedIn Integration Routes =====
  app.get("/api/linkedin/status", authenticateToken, async (req: any, res) => {
    try {
      const accounts = await storage.getSocialAccounts({ platform: "linkedin", isActive: true });
      res.json({ connected: accounts.length > 0, accounts, hasCredentials: hasLinkedInCredentials() });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/linkedin/auth-url", authenticateToken, async (req: any, res) => {
    try {
      const redirectUri = `${getCallbackOrigin(req)}/api/linkedin/callback`;
      const result = await getLinkedInAuthUrl(req.user.userId, redirectUri);
      if (!result) return res.status(400).json({ message: "LinkedIn credentials not configured" });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/linkedin/callback", async (req, res) => {
    try {
      const { code, state, error: authError } = req.query;
      if (authError) return res.redirect("/?linkedin_error=auth_denied");
      if (!code || !state) return res.redirect("/?linkedin_error=missing_params");
      const stateData = await getLinkedInOAuthState(state as string);
      if (!stateData) return res.redirect("/?linkedin_error=invalid_state");
      const tokenResult = await exchangeLinkedInCode(code as string, stateData.redirectUri);
      if (!tokenResult.success) return res.redirect("/?linkedin_error=token_exchange");
      const tokenData = tokenResult as any;
      let profileName = "LinkedIn Account";
      let profileId = "";
      try {
        const profile = await fetchLinkedInProfile(tokenData.access_token);
        if (profile) {
          profileName = profile.name || profileName;
          profileId = profile.sub || "";
        }
      } catch (e) { console.error("LinkedIn profile fetch error:", e); }
      await storage.createSocialAccount({
        platform: "linkedin",
        accountName: profileName,
        accountId: profileId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
        isActive: true,
      });
      res.redirect("/settings?linkedin_connected=true");
    } catch (error: any) {
      console.error("LinkedIn callback error:", error);
      res.redirect("/?linkedin_error=callback_failed");
    }
  });

  app.post("/api/linkedin/disconnect", authenticateToken, async (req: any, res) => {
    try {
      const accounts = await storage.getSocialAccounts({ platform: "linkedin" });
      for (const account of accounts) {
        await storage.deleteSocialAccount(account.id);
      }
      res.json({ message: "LinkedIn disconnected" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Twitter/X Integration Routes =====
  app.get("/api/twitter/status", authenticateToken, async (req: any, res) => {
    try {
      const accounts = await storage.getSocialAccounts({ platform: "twitter", isActive: true });
      res.json({ connected: accounts.length > 0, accounts, hasCredentials: hasTwitterCredentials() });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/twitter/auth-url", authenticateToken, async (req: any, res) => {
    try {
      const redirectUri = `${getCallbackOrigin(req)}/api/twitter/callback`;
      const result = await getTwitterAuthUrl(req.user.userId, redirectUri);
      if (!result) return res.status(400).json({ message: "Twitter credentials not configured" });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/twitter/callback", async (req, res) => {
    try {
      const { code, state, error: authError } = req.query;
      if (authError) return res.redirect("/?twitter_error=auth_denied");
      if (!code || !state) return res.redirect("/?twitter_error=missing_params");
      const stateData = await getTwitterOAuthState(state as string);
      if (!stateData) return res.redirect("/?twitter_error=invalid_state");
      const tokenResult = await exchangeTwitterCode(code as string, stateData.redirectUri, stateData.codeVerifier);
      if (!tokenResult.success) return res.redirect("/?twitter_error=token_exchange");
      const tokenData = tokenResult as any;
      let profileName = "Twitter Account";
      let profileHandle = "";
      try {
        const user = await fetchTwitterUser(tokenData.access_token);
        if (user) {
          profileName = user.name || profileName;
          profileHandle = user.username || "";
        }
      } catch (e) { console.error("Twitter user fetch error:", e); }
      await storage.createSocialAccount({
        platform: "twitter",
        accountName: profileName,
        accountHandle: profileHandle || null,
        accountId: tokenData.user_id || null,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
        isActive: true,
      });
      res.redirect("/settings?twitter_connected=true");
    } catch (error: any) {
      console.error("Twitter callback error:", error);
      res.redirect("/?twitter_error=callback_failed");
    }
  });

  app.post("/api/twitter/disconnect", authenticateToken, async (req: any, res) => {
    try {
      const accounts = await storage.getSocialAccounts({ platform: "twitter" });
      for (const account of accounts) {
        await storage.deleteSocialAccount(account.id);
      }
      res.json({ message: "Twitter disconnected" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== RedNote (Xiaohongshu) Integration Routes =====
  app.get("/api/rednote/status", authenticateToken, async (req: any, res) => {
    try {
      const accounts = await storage.getSocialAccounts({ platform: "rednote", isActive: true });
      res.json({ connected: accounts.length > 0, accounts, hasCredentials: hasRedNoteCredentials() });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/rednote/auth-url", authenticateToken, async (req: any, res) => {
    try {
      const redirectUri = `${getCallbackOrigin(req)}/api/rednote/callback`;
      const result = getRedNoteAuthUrl(req.user.userId, redirectUri);
      if (!result) return res.status(400).json({ message: "RedNote credentials not configured" });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/rednote/callback", async (req, res) => {
    try {
      const { code, state, error: authError } = req.query;
      if (authError) return res.redirect("/?rednote_error=auth_denied");
      if (!code || !state) return res.redirect("/?rednote_error=missing_params");
      const stateData = getRedNoteOAuthState(state as string);
      if (!stateData) return res.redirect("/?rednote_error=invalid_state");
      const tokenResult = await exchangeRedNoteCode(code as string, stateData.redirectUri);
      if (!tokenResult.success) return res.redirect("/?rednote_error=token_exchange");
      const tokenData = tokenResult as any;
      await storage.createSocialAccount({
        platform: "rednote",
        accountName: "RedNote Account",
        accountHandle: null,
        accountId: tokenData.user_id || null,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
        isActive: true,
      });
      res.redirect("/settings?rednote_connected=true");
    } catch (error: any) {
      console.error("RedNote callback error:", error);
      res.redirect("/?rednote_error=callback_failed");
    }
  });

  app.post("/api/rednote/disconnect", authenticateToken, async (req: any, res) => {
    try {
      const accounts = await storage.getSocialAccounts({ platform: "rednote" });
      for (const account of accounts) {
        await storage.deleteSocialAccount(account.id);
      }
      res.json({ message: "RedNote disconnected" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Unified Deliverable Publish Endpoint =====
  app.post("/api/deliverables/:id/publish-to-platform", authenticateToken, async (req: any, res) => {
    try {
      const deliverable = await storage.getDeliverable(req.params.id);
      if (!deliverable) return res.status(404).json({ message: "Deliverable not found" });

      const { accountId } = req.body;
      if (!accountId) return res.status(400).json({ message: "Please select a social media account to publish to" });

      const account = await storage.getSocialAccount(accountId);
      if (!account) return res.status(404).json({ message: "Social account not found" });
      if (!account.accessToken) return res.status(400).json({ message: "Account has no access token. Please reconnect." });

      const caption = deliverable.finalCopy || "";
      const hashtags = (deliverable.finalHashtags || []).map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ");
      const fullCaption = hashtags ? `${caption}\n\n${hashtags}` : caption;

      const imageUrl = deliverable.assetImageUrl || deliverable.canvaLink || undefined;

      const platformMap: Record<string, string> = {
        INSTAGRAM_POST: "instagram",
        INSTAGRAM_STORY: "instagram",
        INSTAGRAM_REEL: "instagram",
        FACEBOOK_POST: "facebook",
        TIKTOK_POST: "tiktok",
        LINKEDIN_POST: "linkedin",
        TWITTER_POST: "twitter",
        REDNOTE_POST: "rednote",
      };

      const platform = platformMap[deliverable.deliverableType];
      if (!platform) {
        return res.status(400).json({ message: `Direct publishing not supported for ${deliverable.deliverableType}. Use the manual publish option.` });
      }

      const credentials: Record<string, string> = {
        accessToken: account.accessToken,
      };

      if (platform === "facebook" || platform === "instagram") {
        credentials.pageId = account.pageId || account.accountId || "";
        if (platform === "instagram") {
          credentials.igAccountId = account.accountId || "";
        }
      }
      if (platform === "linkedin") {
        credentials.authorUrn = `urn:li:person:${account.accountId}`;
      }

      const result = await publishContent(platform, credentials, {
        caption: fullCaption,
        imageUrl,
      });

      if (result.success) {
        const updated = await storage.updateDeliverable(req.params.id, {
          currentStage: "COMPLETED",
          publishCompletedAt: new Date(),
          actualPublishDate: new Date(),
          postUrl: result.postUrl || null,
          metaPostId: result.postId || null,
          publishedAccountId: accountId,
          publishNotes: `Published via API to ${account.platform} (${account.accountName})`,
        });

        if (deliverable.projectId) {
          await storage.createActivityLogEntry({
            projectId: deliverable.projectId,
            userId: req.user.userId,
            action: "published_deliverable",
            newValue: `${deliverable.deliverableName || deliverable.deliverableType} → ${account.accountName}`,
          });
        }

        res.json({ success: true, postId: result.postId, postUrl: result.postUrl, deliverable: updated });
      } else {
        res.status(400).json({ success: false, message: result.error || "Publishing failed" });
      }
    } catch (error: any) {
      console.error("Deliverable publish error:", error);
      res.status(500).json({ message: error.message || "Failed to publish" });
    }
  });

  // ===== Platform Status Summary =====
  app.get("/api/platforms/status", authenticateToken, async (req: any, res) => {
    try {
      const [metaAccounts, tiktokAccounts, linkedinAccounts, twitterAccounts, rednoteAccounts] = await Promise.all([
        storage.getSocialAccounts({ platform: "instagram", isActive: true }),
        storage.getSocialAccounts({ platform: "tiktok", isActive: true }),
        storage.getSocialAccounts({ platform: "linkedin", isActive: true }),
        storage.getSocialAccounts({ platform: "twitter", isActive: true }),
        storage.getSocialAccounts({ platform: "rednote", isActive: true }),
      ]);
      res.json({
        meta: { connected: metaAccounts.length > 0, count: metaAccounts.length, hasCredentials: hasMetaCredentials() },
        tiktok: { connected: tiktokAccounts.length > 0, count: tiktokAccounts.length, hasCredentials: hasTikTokCredentials() },
        linkedin: { connected: linkedinAccounts.length > 0, count: linkedinAccounts.length, hasCredentials: hasLinkedInCredentials() },
        twitter: { connected: twitterAccounts.length > 0, count: twitterAccounts.length, hasCredentials: hasTwitterCredentials() },
        rednote: { connected: rednoteAccounts.length > 0, count: rednoteAccounts.length, hasCredentials: hasRedNoteCredentials() },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Projects CRUD
  app.get("/api/projects", authenticateToken, async (req: any, res) => {
    try {
      const { brandId, regionId, isCompleted } = req.query;
      const filters: any = {};
      if (brandId) filters.brandId = brandId;
      if (regionId) filters.regionId = regionId;
      if (isCompleted !== undefined) filters.isCompleted = isCompleted === 'true';
      const projectsList = await storage.getProjects(filters);
      
      const projectsWithDeliverables = await Promise.all(
        projectsList.map(async (project) => {
          const deliverables = await storage.getProjectDeliverables(project.id);
          return { ...project, deliverables };
        })
      );
      
      res.json(projectsWithDeliverables);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/projects/:id", authenticateToken, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const deliverables = await storage.getProjectDeliverables(req.params.id);
      res.json({ ...project, deliverables });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const createProjectSchema = z.object({
    name: z.string().min(1, "Project name is required"),
    description: z.string().optional().nullable(),
    brandId: z.string().min(1),
    regionId: z.string().min(1),
    campaignId: z.string().optional().nullable().transform(v => v === "" ? null : v),
    promotionId: z.string().optional().nullable().transform(v => v === "" ? null : v),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    deliverables: z.array(z.object({
      type: z.string(),
      count: z.number().min(1).max(20),
      designSpecs: z.string().optional().nullable(),
      designDeadline: z.string().optional().nullable(),
    })).optional(),
    defaultDesignerId: z.string().optional().nullable(),
    defaultCopywriterId: z.string().optional().nullable(),
    defaultPublisherId: z.string().optional().nullable(),
  });

  app.post("/api/projects", authenticateToken, async (req: any, res) => {
    try {
      const parsed = createProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { deliverables: deliverableSpecs, defaultDesignerId, defaultCopywriterId, defaultPublisherId, ...projectData } = parsed.data;
      
      const project = await storage.createProject({
        ...projectData,
        startDate: projectData.startDate ? new Date(projectData.startDate) : null,
        endDate: projectData.endDate ? new Date(projectData.endDate) : null,
        createdById: req.user.userId,
      });
      
      const createdDeliverables = [];
      if (deliverableSpecs && Array.isArray(deliverableSpecs)) {
        for (const spec of deliverableSpecs) {
          const count = spec.count || 1;
          for (let i = 1; i <= count; i++) {
            const typeName = spec.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
            const deliverable = await storage.createDeliverable({
              projectId: project.id,
              deliverableType: spec.type,
              deliverableName: count > 1 ? `${typeName} #${i}` : typeName,
              designerId: defaultDesignerId || null,
              copywriterId: defaultCopywriterId || null,
              publisherId: defaultPublisherId || null,
              designAssignedAt: defaultDesignerId ? new Date() : null,
              designSpecs: spec.designSpecs || DELIVERABLE_PRESET_DIMENSIONS[spec.type]?.label || null,
              designDeadline: spec.designDeadline ? new Date(spec.designDeadline) : null,
            });
            createdDeliverables.push(deliverable);
          }
        }
      }
      
      res.status(201).json({ ...project, deliverables: createdDeliverables });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/projects/:id", authenticateToken, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const updateData: any = { ...req.body };
      if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
      if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

      const updated = await storage.updateProject(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "Project not found" });

      const changedFields = Object.keys(req.body);
      for (const field of changedFields) {
        if (field === 'updatedAt') continue;
        await storage.createActivityLogEntry({
          projectId: req.params.id,
          userId: req.user.userId,
          action: `edited_${field}`,
          oldValue: String((project as any)[field] ?? ''),
          newValue: String(req.body[field] ?? ''),
        });
      }

      const deliverables = await storage.getProjectDeliverables(req.params.id);
      res.json({ ...updated, deliverables });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/projects/:id", authenticateToken, async (req: any, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Project not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const addDeliverableSchema = z.object({
    type: z.string().min(1),
    name: z.string().optional(),
    designerId: z.string().optional().nullable(),
    copywriterId: z.string().optional().nullable(),
    publisherId: z.string().optional().nullable(),
    designSpecs: z.string().optional().nullable(),
    designDeadline: z.string().optional().nullable(),
  });

  // Project Deliverables
  app.post("/api/projects/:id/deliverables", authenticateToken, async (req: any, res) => {
    try {
      const parsed = addDeliverableSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      
      const { type, name, designerId, copywriterId, publisherId, designSpecs, designDeadline } = parsed.data;
      
      let deliverableName = name;
      if (!deliverableName) {
        const existing = await storage.getProjectDeliverables(req.params.id);
        const sameType = existing.filter(d => d.deliverableType === type);
        const typeName = type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        deliverableName = `${typeName} #${sameType.length + 1}`;
      }
      
      const deliverable = await storage.createDeliverable({
        projectId: req.params.id,
        deliverableType: type,
        deliverableName,
        designerId: designerId || null,
        copywriterId: copywriterId || null,
        publisherId: publisherId || null,
        designAssignedAt: designerId ? new Date() : null,
        designSpecs: designSpecs || DELIVERABLE_PRESET_DIMENSIONS[type]?.label || null,
        designDeadline: designDeadline ? new Date(designDeadline) : null,
      });
      
      res.status(201).json(deliverable);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/deliverables/:id", authenticateToken, async (req: any, res) => {
    try {
      const data = { ...req.body };
      if (data.designDeadline && typeof data.designDeadline === "string") {
        data.designDeadline = new Date(data.designDeadline);
      }
      const updated = await storage.updateDeliverable(req.params.id, data);
      if (!updated) return res.status(404).json({ message: "Deliverable not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/deliverables/:id", authenticateToken, async (req: any, res) => {
    try {
      const deleted = await storage.deleteDeliverable(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Deliverable not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/deliverables/:id/references", authenticateToken, async (req: any, res) => {
    try {
      const refs = await storage.getDeliverableReferences(req.params.id);
      res.json(refs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/deliverables/:id/references", authenticateToken, async (req: any, res) => {
    try {
      const { imageUrl, caption, sortOrder } = req.body;
      if (!imageUrl) return res.status(400).json({ message: "imageUrl is required" });
      const ref = await storage.addDeliverableReference({
        deliverableId: req.params.id,
        imageUrl,
        caption: caption || null,
        sortOrder: sortOrder ?? 0,
      });
      res.status(201).json(ref);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/deliverable-references/:id", authenticateToken, async (req: any, res) => {
    try {
      const deleted = await storage.deleteDeliverableReference(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Reference not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const canvaLinkSchema = z.object({
    canvaLink: z.string().url().refine(val => /canva\.com\/design\//.test(val), "Must be a valid Canva design link"),
  });

  app.post("/api/deliverables/:id/canva-link", authenticateToken, async (req: any, res) => {
    try {
      const parsed = canvaLinkSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { canvaLink } = parsed.data;
      
      const match = canvaLink.match(/canva\.com\/design\/([A-Za-z0-9_-]+)/);
      const canvaDesignId = match ? match[1] : null;
      
      const updated = await storage.updateDeliverable(req.params.id, {
        canvaLink,
        canvaDesignId,
        designCompletedAt: new Date(),
        currentStage: "COPYWRITING",
      });
      
      if (!updated) return res.status(404).json({ message: "Deliverable not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/deliverables/:id/stage", authenticateToken, async (req: any, res) => {
    try {
      const { stage, ...additionalData } = req.body;
      if (!stage) return res.status(400).json({ message: "stage is required" });
      
      const updateData: any = { currentStage: stage, ...additionalData };
      
      if (stage === "COPYWRITING") {
        updateData.designCompletedAt = updateData.designCompletedAt || new Date();
        updateData.copyAssignedAt = updateData.copyAssignedAt || new Date();
      } else if (stage === "PUBLISHING") {
        updateData.copyCompletedAt = updateData.copyCompletedAt || new Date();
        updateData.publishAssignedAt = updateData.publishAssignedAt || new Date();
      } else if (stage === "COMPLETED") {
        updateData.publishCompletedAt = updateData.publishCompletedAt || new Date();
        updateData.actualPublishDate = updateData.actualPublishDate || new Date();
      }
      
      const updated = await storage.updateDeliverable(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "Deliverable not found" });

      try {
        const project = await storage.getProject(updated.projectId);
        if (stage === "COPYWRITING" && updated.copywriterId) {
          notifyDeliverableStageChange(updated, updated.copywriterId, "Copywriting", project?.name);
        } else if (stage === "PUBLISHING" && updated.publisherId) {
          notifyDeliverableStageChange(updated, updated.publisherId, "Publishing", project?.name);
        }
      } catch (notifErr) {
        console.error("Notification error:", notifErr);
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/deliverables/:id/revision", authenticateToken, async (req: any, res) => {
    try {
      const { notes } = req.body;
      const updated = await storage.updateDeliverable(req.params.id, {
        revisionRequested: true,
        revisionNotes: notes || null,
        revisionRequestedById: req.user.userId,
        revisionRequestedAt: new Date(),
        currentStage: "DESIGN",
        designCompletedAt: null,
        copyAssignedAt: null,
        copyCompletedAt: null,
      });
      if (!updated) return res.status(404).json({ message: "Deliverable not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Publishing Queue
  app.get("/api/publishing-queue", authenticateToken, async (req: any, res) => {
    try {
      const deliverables = await storage.getDeliverablesByStage("PUBLISHING");
      res.json(deliverables);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/published", authenticateToken, async (req: any, res) => {
    try {
      const { platform, brandId, regionId, accountId, dateFrom, dateTo, search, sort, page, limit } = req.query;
      const filters: any = {};
      if (platform) filters.platform = platform;
      if (brandId) filters.brandId = brandId;
      if (regionId) filters.regionId = regionId;
      if (accountId) filters.accountId = accountId;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (search) filters.search = search;
      if (sort) filters.sort = sort;
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await storage.getPublishedDeliverables(filters);
      
      const enriched = await Promise.all(
        result.deliverables.map(async (d) => {
          const project = await storage.getProject(d.projectId);
          const analytics = await storage.getDeliverableAnalytics(d.id);
          const account = d.publishedAccountId ? await storage.getSocialAccount(d.publishedAccountId) : null;
          return { ...d, project, analytics, publishedAccount: account };
        })
      );

      res.json({ deliverables: enriched, total: result.total });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Copywriting
  app.post("/api/ai/generate-copy", authenticateToken, async (req: any, res) => {
    try {
      const { generateCopySuggestion } = await import("./aiCopywritingService");
      const result = await generateCopySuggestion(req.body);
      if (!result) {
        return res.json({ success: false, message: "AI copywriting not available. Configure OPENAI_API_KEY in secrets to enable AI suggestions." });
      }
      res.json({ success: true, suggestion: result });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Hashtags
  app.get("/api/hashtags/search", authenticateToken, async (req: any, res) => {
    try {
      const { q, brandId } = req.query;
      if (!q) return res.json([]);
      const results = await storage.searchHashtags(q as string, brandId as string, 10);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Tagged Creators
  app.get("/api/tagged-creators/search", authenticateToken, async (req: any, res) => {
    try {
      const { q, platform, brandId } = req.query;
      if (!q) return res.json([]);
      const results = await storage.searchTaggedCreators(q as string, platform as string, brandId as string, 10);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Social Accounts
  app.get("/api/social-accounts", authenticateToken, async (req: any, res) => {
    try {
      const { platform, brandId, regionId, isActive } = req.query;
      const filters: any = {};
      if (platform) filters.platform = platform;
      if (brandId) filters.brandId = brandId;
      if (regionId) filters.regionId = regionId;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      const accounts = await storage.getSocialAccounts(filters);
      res.json(accounts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/social-accounts", authenticateToken, async (req: any, res) => {
    try {
      const account = await storage.createSocialAccount(req.body);
      res.status(201).json(account);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/social-accounts/:id", authenticateToken, async (req: any, res) => {
    try {
      const updated = await storage.updateSocialAccount(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Account not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/social-accounts/:id", authenticateToken, async (req: any, res) => {
    try {
      const deleted = await storage.deleteSocialAccount(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Account not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Project Activity Log
  app.get("/api/projects/:id/activity", authenticateToken, async (req: any, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getProjectActivityLog(req.params.id, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Mark deliverable as published (for non-API platforms)
  app.post("/api/deliverables/:id/mark-published", authenticateToken, async (req: any, res) => {
    try {
      const { postUrl, notes, accountId } = req.body;
      const deliverable = await storage.getDeliverable(req.params.id);
      if (!deliverable) return res.status(404).json({ message: "Deliverable not found" });

      const updated = await storage.updateDeliverable(req.params.id, {
        currentStage: "COMPLETED",
        publishCompletedAt: new Date(),
        actualPublishDate: new Date(),
        postUrl: postUrl || null,
        publishNotes: notes || null,
        publishedAccountId: accountId || null,
      });

      if (deliverable.projectId) {
        await storage.createActivityLogEntry({
          projectId: deliverable.projectId,
          userId: req.user.userId,
          action: 'published_deliverable',
          newValue: deliverable.deliverableName || deliverable.deliverableType,
        });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Deliverable Analytics
  app.get("/api/deliverables/:id/analytics", authenticateToken, async (req: any, res) => {
    try {
      const analytics = await storage.getDeliverableAnalytics(req.params.id);
      res.json(analytics || {});
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/deliverables/:id/analytics-history", authenticateToken, async (req: any, res) => {
    try {
      const history = await storage.getDeliverableAnalyticsHistory(req.params.id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard stats (enhanced for V3)
  app.get("/api/dashboard/project-stats", authenticateToken, async (req: any, res) => {
    try {
      const allProjects = await storage.getProjects();
      const activeProjects = allProjects.filter(p => !p.isCompleted);
      
      let totalDeliverables = 0;
      let inDesign = 0;
      let readyToPublish = 0;
      let publishedThisMonth = 0;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      for (const project of allProjects) {
        const deliverables = await storage.getProjectDeliverables(project.id);
        totalDeliverables += deliverables.length;
        for (const d of deliverables) {
          if (d.currentStage === 'DESIGN') inDesign++;
          if (d.currentStage === 'PUBLISHING') readyToPublish++;
          if (d.currentStage === 'COMPLETED' && d.actualPublishDate && new Date(d.actualPublishDate) >= monthStart) {
            publishedThisMonth++;
          }
        }
      }

      res.json({
        activeProjects: activeProjects.length,
        inDesign,
        readyToPublish,
        publishedThisMonth,
        totalDeliverables,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // My tasks for dashboard
  app.get("/api/dashboard/my-tasks", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const designTasks = await storage.getDeliverablesByUser(userId, 'designer');
      const copyTasks = await storage.getDeliverablesByUser(userId, 'copywriter');
      const publishTasks = await storage.getDeliverablesByUser(userId, 'publisher');

      const myTasks = [
        ...designTasks.filter(d => d.currentStage === 'DESIGN').map(d => ({ ...d, myRole: 'designer' })),
        ...copyTasks.filter(d => d.currentStage === 'COPYWRITING').map(d => ({ ...d, myRole: 'copywriter' })),
        ...publishTasks.filter(d => d.currentStage === 'PUBLISHING').map(d => ({ ...d, myRole: 'publisher' })),
      ];

      const enriched = await Promise.all(
        myTasks.map(async (task) => {
          const project = await storage.getProject(task.projectId);
          return { ...task, project };
        })
      );

      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  startCanvaScheduler();
  startDeadlineScheduler();

  return httpServer;
}

# Bloom & Grow Marketing Planner

## Overview
Bloom & Grow Marketing Planner is a B2B application designed to streamline marketing operations for regional teams. It enables comprehensive management of social media posts, email campaigns, events, and tasks across multiple brands and geographic regions. The platform features role-based access control and aims to unify workflow for content creation, approval, publishing, and performance tracking, enhancing efficiency and coordination in marketing efforts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: Zustand (auth), TanStack React Query (server state)
- **UI Components**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with a custom orange primary color (#F7971C) design system
- **Forms**: React Hook Form with Zod validation
- **Calendar**: FullCalendar
- **UI/UX**: Features a dark, futuristic theme with a top navigation bar. Includes dynamic brand pages with integrated calendars, analytics, and asset management.

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Style**: RESTful JSON API (`/api` prefix)
- **Authentication**: JWT-based with bcrypt for password hashing
- **Build Tools**: esbuild (server), Vite (client)

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Schema**: Defined in `shared/schema.ts`, including Zod validation schemas.
- **Key Entities**: Users (role-based), Brands, Regions, Campaigns, Social Posts (with platform-specific previews, performance tracking, recurrence, and duplicate tracking), Email Campaigns, Events (with promotion details, flexible validation, and duplicate tracking), Tasks, Brand Assets (graphics, videos, documents, templates with tagging and Canva integration), Notifications, Approvals, Projects (with deliverables, workflow stages, design specs, designer deadlines, and reference images), Social Accounts, Hashtag Library, Deliverable References (images linked to deliverables for design hand-off).

### Core Features & Design Decisions
- **Unified Projects Workflow**: Centralized project management with deliverables (e.g., Instagram Posts, Website Banners), each following a Design → Copywriting → Publishing workflow with team assignments and revision capabilities.
- **Multi-Platform Publishing**: Integrations for TikTok, LinkedIn, Twitter/X, and Meta (Facebook/Instagram) for direct publishing and analytics.
- **Approval Workflow**: Role-based content approval system with self-approval prevention.
- **Preset Dimensions & Canva Integration**: Each deliverable type has recommended dimensions (e.g., Instagram Post = 1080x1080px). Specs auto-fill on creation. Slack notifications to designers include a "Create in Canva" button that opens a new Canva project with correct dimensions pre-set.
- **Notification System**: Automated in-app and Slack DM notifications for workflow events (e.g., assignment, asset completion). Designer notifications include design specs, deadlines, and a direct Canva creation link. Includes automated deadline reminders (24h and 2h before) for tasks, project deliverables, social posts, email campaigns, events, and event deliverables via a background scheduler (`server/deadlineScheduler.ts`) running every 30 minutes with duplicate-prevention tracking (`deadline_reminders` table).
- **Brand Asset Management**: Comprehensive management of brand-specific assets, including Canva integration for design syncing, and external links (DreamPIM, Asset Portal).
- **Calendar & Dashboard**: Unified calendar view for all content types with multi-filtering, and a dashboard displaying project metrics, top-performing posts, and recent activities.
- **Content Performance Tracking**: Recording and calculating engagement metrics for social posts.
- **Multi-Region Support**: Assignment of content and Meta pages to specific regions.

### Authentication
JWT-based authentication with tokens stored client-side in localStorage (via Zustand persist middleware) and sent with all API requests.

### Project Structure
Organized into `client/` (React frontend), `server/` (Express backend), and `shared/` (common code like schema definitions).

## External Dependencies

### Database
- PostgreSQL

### Third-Party Integrations
- **Canva**: OAuth2 integration for syncing designs into the asset library.
- **Meta (Facebook/Instagram)**: API integration for page mapping, publishing, and analytics.
- **TikTok**: OAuth2 integration for video publishing and analytics.
- **LinkedIn**: OAuth2 integration for post publishing and analytics.
- **Twitter/X**: OAuth2 integration for tweet publishing and analytics.
- **Slack**: Integration for direct message notifications.

### Key NPM Packages
- **UI**: `@radix-ui/*`, `lucide-react`, `class-variance-authority`
- **Data**: `drizzle-orm`, `@tanstack/react-query`, `zod`
- **Auth**: `bcryptjs`, `jsonwebtoken`
- **Calendar**: `@fullcalendar/react` and plugins

### Required Environment Variables
- `DATABASE_URL`
- `SESSION_SECRET`
- `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET` (Optional)
- `META_APP_ID`, `META_APP_SECRET`
- TikTok, LinkedIn, Twitter credentials (configurable in Settings)
# Bloom & Grow Marketing Planner - Design Guidelines

## Design Approach
This is a B2B productivity application with an established brand identity. Following the **Design System Approach** using the provided Bloom & Grow brand guidelines.

## Brand Colors

**Primary Palette:**
- Brand Orange: #F7971C (primary actions, active states, highlights)
- Orange Light: #FEF3E2 (backgrounds, table headers, hover states)
- Orange Dark: #E8850F (hover states for primary buttons)
- Brand Blue: #2575FC (links, secondary highlights)
- Blue Light: #EBF4FF (informational backgrounds)

**Status Colors:**
- Success: #10B981 (completed, approved)
- Warning: #F59E0B (pending, in-progress)
- Error: #EF4444 (overdue, failed)
- Info: #3B82F6 (informational messages)

**Neutral Palette:**
- Dark: #1F2937, #374151, #4B5563 (text, borders)
- Light: #F9FAFB, #F3F4F6, #E5E7EB (backgrounds, dividers)
- White: #FFFFFF (cards, modals, content areas)

## Typography

**Font Families:**
- Primary: Roboto (body text, UI elements)
- Secondary: Poppins (headings, emphasis)

**Hierarchy:**
- H1: 32px bold, letter-spacing -0.5px
- H2: 24px semi-bold
- H3: 20px semi-bold
- Body: 16px regular, line-height 1.5
- Small: 14px regular
- Tiny: 12px regular (labels, captions)

## Spacing System
Use Tailwind's spacing scale consistently:
- Component padding: 4, 6, 8 units
- Section spacing: 12, 16, 20 units
- Card padding: 6 units (p-6)
- Modal padding: 8 units (p-8)
- Page margins: 8 units on mobile, 12 on desktop

## Layout Structure

**Sidebar Navigation:**
- Width: 256px on desktop, full-screen overlay on mobile
- Background: #111827 (dark gray)
- Active item: Brand orange background
- Inactive items: White text, hover shows orange accent
- Collapsible on tablet/mobile with hamburger menu

**Main Content Area:**
- Max width: Full viewport width minus sidebar
- Background: #F9FAFB (light gray)
- Content cards: White with subtle shadow

**Header:**
- Height: 64px
- Background: White
- Border bottom: 1px #E5E7EB
- Contains page title, user menu, notifications

## Component Styles

**Buttons:**
- Primary: Orange background, white text, rounded corners, px-5 py-2.5
- Secondary: White background, orange border and text, same padding
- Ghost: No background, orange text on hover
- All buttons: Medium font weight, slight shadow on hover

**Cards:**
- White background
- Border: 1px #E5E7EB
- Border radius: 8px
- Shadow: Subtle (shadow-sm)
- Padding: 24px (p-6)

**Tables:**
- Header row: Orange-light background (#FEF3E2)
- Alternating rows: White and #F9FAFB
- Border: 1px #E5E7EB
- Cell padding: 12px 16px
- Hover row: Slight orange tint

**Form Inputs:**
- Border: 1px #D1D5DB
- Border radius: 6px
- Focus: Orange border (#F7971C), orange ring with 20% opacity
- Padding: 10px 14px
- Font size: 16px

**Status Badges:**
- Rounded pill shape
- Background: Status color at 10% opacity
- Text: Full status color
- Padding: 4px 12px
- Font size: 14px semi-bold

**Modals:**
- Overlay: Black at 40% opacity
- Container: White, max-width 600px, centered
- Border radius: 12px
- Padding: 32px

## Calendar Views

**FullCalendar Styling:**
- Event blocks: Brand color coded by status/brand
- Header: Orange accent for active view
- Today highlight: Light orange background
- Drag-and-drop: Cursor grab, semi-transparent while dragging
- Multi-day events: Span full width with gradient

## Dashboard Widgets

**Stat Cards:**
- Large number: 36px bold, brand blue
- Label: 14px gray text below
- Icon: Top right corner, orange or blue
- Grid: 4 columns on desktop, 2 on tablet, 1 on mobile

**Recent Activity Feed:**
- List items with left border accent (orange)
- Avatar or icon on left
- Timestamp: 12px gray text
- Hover: Light background

## Responsive Behavior
- Desktop (1024px+): Full sidebar visible, multi-column layouts
- Tablet (768-1023px): Collapsible sidebar, 2-column grids
- Mobile (<768px): Hamburger menu, single column, stacked forms

## Icons
Use Lucide React consistently throughout. Standard size: 20px for UI, 24px for headers.

## Images
This is a data-heavy productivity application. No hero images required. Use icons and data visualizations instead. Brand logos appear in dropdowns and filters.
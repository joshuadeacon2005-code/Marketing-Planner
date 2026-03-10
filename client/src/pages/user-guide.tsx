import { Link } from "wouter";
import { ArrowLeft, BookOpen } from "lucide-react";

// ── Small reusable pieces ──────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: string; title: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-7">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: "rgba(247,151,28,0.12)", border: "1px solid rgba(247,151,28,0.25)" }}
      >
        {icon}
      </div>
      <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
    </div>
  );
}

function Callout({
  type,
  icon,
  title,
  children,
}: {
  type: "tip" | "note" | "warn" | "admin";
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    tip:   { bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.25)",  color: "#10B981" },
    note:  { bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.25)",  color: "#3B82F6" },
    warn:  { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.25)",  color: "#F59E0B" },
    admin: { bg: "rgba(247,151,28,0.06)",  border: "rgba(247,151,28,0.25)",  color: "#F7971C" },
  }[type];
  return (
    <div
      className="flex gap-3 rounded-xl p-4 my-5"
      style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
    >
      <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-bold mb-1" style={{ color: styles.color }}>{title}</p>
        <p className="text-sm text-gray-400 leading-relaxed m-0">{children}</p>
      </div>
    </div>
  );
}

function Steps({ items }: { items: { title: string; desc: string }[] }) {
  return (
    <div className="my-5 space-y-4">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4 relative">
          {i < items.length - 1 && (
            <div
              className="absolute left-[16px] top-9 bottom-[-16px] w-px"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
          )}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: "rgba(247,151,28,0.12)", border: "1px solid rgba(247,151,28,0.35)", color: "#F7971C" }}
          >
            {i + 1}
          </div>
          <div className="pt-1">
            <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
            <p className="text-sm text-gray-400 leading-relaxed m-0">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Badge({ variant, children }: { variant: string; children: React.ReactNode }) {
  const styles: Record<string, React.CSSProperties> = {
    draft:     { background: "rgba(107,114,128,0.15)", color: "#9CA3AF" },
    pending:   { background: "rgba(245,158,11,0.12)",  color: "#F59E0B" },
    approved:  { background: "rgba(16,185,129,0.12)",  color: "#10B981" },
    published: { background: "rgba(59,130,246,0.12)",  color: "#3B82F6" },
    overdue:   { background: "rgba(239,68,68,0.12)",   color: "#EF4444" },
    orange:    { background: "rgba(247,151,28,0.12)",  color: "#F7971C" },
    completed: { background: "rgba(16,185,129,0.12)",  color: "#10B981" },
    admin:     { background: "rgba(239,68,68,0.12)",   color: "#EF4444" },
    manager:   { background: "rgba(247,151,28,0.12)",  color: "#F7971C" },
    user:      { background: "rgba(59,130,246,0.12)",  color: "#3B82F6" },
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={styles[variant] || styles.draft}
    >
      {children}
    </span>
  );
}

function GuideTable({ headers, rows }: { headers: string[]; rows: (React.ReactNode[])[] }) {
  return (
    <div className="overflow-x-auto my-5">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-2.5 text-gray-400 align-top"
                  style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SmallCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <p className="text-sm font-semibold text-white mb-1">{icon} {title}</p>
      <p className="text-xs text-gray-500 leading-relaxed m-0">{desc}</p>
    </div>
  );
}

// ── TOC link ──────────────────────────────────────────────────────────────────

function TocLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-orange-400 hover:bg-orange-400/5 transition-colors"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 opacity-40 flex-shrink-0" />
      {label}
    </a>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UserGuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex">

      {/* ── Sidebar TOC ── */}
      <aside
        className="fixed top-0 left-0 h-full w-60 overflow-y-auto z-50 hidden lg:flex flex-col"
        style={{ background: "#0F1117", borderRight: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Logo */}
        <div className="p-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-base font-bold" style={{ color: "#F7971C" }}>bloom &amp; grow</p>
          <p className="text-xs text-gray-600 uppercase tracking-widest mt-0.5">User Guide</p>
        </div>

        {/* Back to login */}
        <div className="px-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link
            href="/login"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Login
          </Link>
        </div>

        {/* Nav */}
        <nav className="px-2 py-3 flex flex-col gap-0.5">
          <p className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-gray-700">Contents</p>
          <TocLink href="#overview" label="Overview" />
          <TocLink href="#getting-started" label="Getting Started" />
          <TocLink href="#navigation" label="Navigation" />
          <TocLink href="#dashboard" label="Dashboard" />
          <TocLink href="#projects" label="Projects" />
          <TocLink href="#publishing-queue" label="Publishing Queue" />
          <TocLink href="#published" label="Published" />
          <TocLink href="#tasks" label="Tasks" />
          <TocLink href="#assets" label="Asset Library" />
          <TocLink href="#brands" label="Brands" />
          <TocLink href="#archive" label="Archive" />
          <TocLink href="#settings" label="Settings (Admin)" />
          <TocLink href="#notifications" label="Notifications" />
          <TocLink href="#roles" label="Roles & Permissions" />
          <TocLink href="#statuses" label="Status Reference" />
          <TocLink href="#integrations" label="Integrations" />
          <TocLink href="#tips" label="Tips & Best Practices" />
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 lg:ml-60 px-6 py-12 lg:px-16" style={{ maxWidth: "calc(100vw)" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>

          {/* Mobile back link */}
          <div className="lg:hidden mb-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>

          {/* ── Page Header ── */}
          <header className="mb-14 pb-10" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mb-4"
              style={{ background: "rgba(247,151,28,0.12)", border: "1px solid rgba(247,151,28,0.3)", color: "#F7971C" }}
            >
              <BookOpen className="w-3 h-3" />
              User Guide
            </div>
            <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-3">
              Bloom &amp; Grow<br />
              <span style={{ color: "#F7971C" }}>Marketing Planner</span>
            </h1>
            <p className="text-base text-gray-400 leading-relaxed max-w-lg">
              Everything you need to plan, create, approve, and publish marketing content across all your brands and platforms — from one place.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {["Version 3.0", "Updated March 2026", "Roles: Admin · Manager · User"].map((pill) => (
                <span
                  key={pill}
                  className="text-xs text-gray-500 px-3 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {pill}
                </span>
              ))}
            </div>
          </header>

          {/* ═══════════════════ OVERVIEW ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="overview">
            <SectionHeader icon="🌸" title="What is the Marketing Planner?" />
            <p className="text-gray-400 leading-relaxed mb-5">
              The <strong className="text-white">Bloom &amp; Grow Marketing Planner</strong> is a centralised B2B platform built to unify the entire marketing workflow — from initial project creation through design, copywriting, approval, and publishing — across multiple brands and geographic regions.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <SmallCard icon="🗂" title="Project Management" desc="Organise campaigns into projects with deliverables, deadlines, and team assignments." />
              <SmallCard icon="📅" title="Content Calendar" desc="Visualise all social posts, emails, events, and tasks on a unified calendar." />
              <SmallCard icon="✅" title="Approval Workflow" desc="Route content through Design → Copywriting → Publishing with role-based approvals." />
              <SmallCard icon="📊" title="Analytics & Performance" desc="Track engagement metrics and top-performing posts per brand." />
              <SmallCard icon="🖼" title="Asset Library" desc="Store and manage brand assets — graphics, videos, templates — with Canva sync." />
              <SmallCard icon="🔔" title="Smart Notifications" desc="Automated in-app and Slack alerts for deadlines, assignments, and approvals." />
            </div>
            <Callout type="note" icon="ℹ️" title="Multi-Brand & Multi-Region">
              The planner supports multiple brands and regions. Content, assets, and team members are scoped so each team only sees what is relevant to them.
            </Callout>
          </section>

          {/* ═══════════════════ GETTING STARTED ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="getting-started">
            <SectionHeader icon="🚀" title="Getting Started" />
            <h3 className="text-base font-semibold text-white mb-3">Logging In</h3>
            <p className="text-gray-400 leading-relaxed mb-4">
              Navigate to the Marketing Planner URL in your browser. You will land on the login screen.
            </p>

            {/* Login UI mockup */}
            <div
              className="rounded-xl overflow-hidden mb-6"
              style={{ background: "#161B27", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2.5"
                style={{ background: "#0F1117", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-gray-600 uppercase tracking-wider">Login Screen</span>
              </div>
              <div className="p-8">
                <div className="max-w-xs mx-auto text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
                    style={{ background: "#F7971C" }}
                  >
                    🌸
                  </div>
                  <p className="text-lg font-bold text-white mb-0.5">Bloom &amp; Grow</p>
                  <p className="text-xs text-gray-500 mb-6">Marketing Planner</p>
                  <div
                    className="rounded-lg px-3 py-2.5 mb-2.5 text-left text-xs text-gray-500"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    📧  your@email.com
                  </div>
                  <div
                    className="rounded-lg px-3 py-2.5 mb-4 text-left text-xs text-gray-500"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    🔒  ••••••••
                  </div>
                  <div className="rounded-lg py-2.5 text-sm font-bold text-white text-center" style={{ background: "#F7971C" }}>
                    Sign In
                  </div>
                </div>
              </div>
            </div>

            <Steps items={[
              { title: "Enter your email address", desc: "Use the email address set up for your account by your Administrator." },
              { title: "Enter your password", desc: "Passwords are set by your Admin. If you have forgotten yours, contact your Administrator to have it reset." },
              { title: "Click \"Sign In\"", desc: "You will be taken to the Dashboard. Your session is saved — you will remain logged in unless you sign out or clear your browser data." },
            ]} />

            <h3 className="text-base font-semibold text-white mb-3 mt-6">Signing Out</h3>
            <p className="text-gray-400 leading-relaxed">
              Click your <strong className="text-white">name or avatar</strong> in the top-right of the navigation bar and select <strong className="text-white">"Sign out"</strong>.
            </p>
            <Callout type="warn" icon="⚠️" title="Shared Computers">
              Always sign out when using a shared or public computer to protect your account.
            </Callout>
          </section>

          {/* ═══════════════════ NAVIGATION ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="navigation">
            <SectionHeader icon="🧭" title="Navigation" />
            <p className="text-gray-400 leading-relaxed mb-5">
              The <strong className="text-white">top navigation bar</strong> runs across every page. It contains all section links, the Brands dropdown, notification bell, and your user menu.
            </p>

            {/* Navbar mockup */}
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-1.5 flex-wrap mb-6"
              style={{ background: "rgba(15,17,23,0.9)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <span className="text-sm font-bold text-white mr-3 pr-4" style={{ borderRight: "1px solid rgba(255,255,255,0.1)" }}>
                bloom &amp; grow
              </span>
              {[
                { label: "Dashboard", active: true },
                { label: "Projects" },
                { label: "Queue" },
                { label: "Published" },
                { label: "Tasks" },
                { label: "Assets" },
                { label: "Archive" },
                { label: "Brands ▾" },
              ].map(({ label, active }) => (
                <span
                  key={label}
                  className="text-xs font-medium px-2.5 py-1 rounded-md"
                  style={
                    active
                      ? { background: "rgba(247,151,28,0.15)", color: "#F7971C", border: "1px solid rgba(247,151,28,0.3)" }
                      : { color: "#6B7280" }
                  }
                >
                  {label}
                </span>
              ))}
              <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ color: "#F7971C" }}>Settings</span>
              <div className="ml-auto flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-xs"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  🔔
                </div>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "#F7971C" }}
                >
                  JD
                </div>
              </div>
            </div>

            <GuideTable
              headers={["Nav Item", "What it does", "Who can see it"]}
              rows={[
                [<strong className="text-white">Dashboard</strong>, "Overview metrics, unified calendar, upcoming deadlines, recent activity", "Everyone"],
                [<strong className="text-white">Projects</strong>, "Manage creative projects and deliverables through the workflow stages", "Everyone"],
                [<strong className="text-white">Queue</strong>, "Deliverables that are approved and ready to publish to social platforms", "Everyone"],
                [<strong className="text-white">Published</strong>, "History of all successfully published content", "Everyone"],
                [<strong className="text-white">Tasks</strong>, "Standalone tasks across brands and regions", "Everyone"],
                [<strong className="text-white">Assets</strong>, "Brand asset library — graphics, videos, documents, templates", "Everyone"],
                [<strong className="text-white">Archive</strong>, "Historical record of sent/completed content", "Everyone"],
                [<strong className="text-white">Brands ▾</strong>, "Dropdown to view all brands or jump to a specific brand hub", "Everyone"],
                [<strong className="text-white">Settings</strong>, "User management, brand/region config, integrations", <span style={{ color: "#EF4444" }}>Admins only</span>],
              ]}
            />

            <Callout type="tip" icon="💡" title="Mobile Navigation">
              On smaller screens, tap the <strong>☰ menu icon</strong> (top right) to open all navigation links in a full-screen overlay.
            </Callout>
          </section>

          {/* ═══════════════════ DASHBOARD ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="dashboard">
            <SectionHeader icon="📊" title="Dashboard" />
            <p className="text-gray-400 leading-relaxed mb-5">
              The Dashboard is your command centre — a live snapshot of all marketing activity across every brand and region you have access to.
            </p>

            <h3 className="text-base font-semibold text-white mb-3">Stat Cards</h3>
            <p className="text-gray-400 leading-relaxed mb-4">
              The top row shows four glowing metric cards with counts and mini trend charts. Hover over a card for more detail. Click a card to navigate to that section.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { icon: "📣", label: "Social Posts" },
                { icon: "📧", label: "Email Campaigns" },
                { icon: "📅", label: "Upcoming Events" },
                { icon: "✅", label: "Active Tasks" },
              ].map(({ icon, label }) => (
                <div
                  key={label}
                  className="rounded-xl p-4"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-xl mb-1">{icon}</p>
                  <p className="text-xs font-semibold text-white mb-1">{label}</p>
                  <div className="flex items-end gap-0.5 h-5 mt-2">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{ height: `${h}%`, background: "rgba(247,151,28,0.5)" }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-base font-semibold text-white mb-3">Unified Calendar</h3>
            <p className="text-gray-400 leading-relaxed mb-4">
              A full calendar shows <strong className="text-white">all content types in one view</strong> — social posts, email campaigns, events, and tasks. Filter by brand, region, or content type. Switch between Month, Week, and Day views.
            </p>
            <Callout type="tip" icon="💡" title="Colour Coding">
              Calendar events are colour-coded by brand, making it easy to see at a glance which brand each piece of content belongs to.
            </Callout>

            <h3 className="text-base font-semibold text-white mb-2 mt-6">Upcoming Deadlines</h3>
            <p className="text-gray-400 leading-relaxed">Items due within the next 7 days are listed sorted by urgency. Overdue items appear in red; items due today appear in amber.</p>

            <h3 className="text-base font-semibold text-white mb-2 mt-6">Recent Activity</h3>
            <p className="text-gray-400 leading-relaxed">A live feed of the most recent actions by your team — posts created, tasks completed, assets uploaded, approvals submitted.</p>
          </section>

          {/* ═══════════════════ PROJECTS ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="projects">
            <SectionHeader icon="🗂" title="Projects" />
            <p className="text-gray-400 leading-relaxed mb-5">
              A <strong className="text-white">Project</strong> represents a marketing campaign or initiative. It contains one or more <strong className="text-white">Deliverables</strong> — the individual pieces of content to be created and published.
            </p>

            <h3 className="text-base font-semibold text-white mb-4">The Content Workflow</h3>
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {[
                { icon: "🎨", label: "Design", sub: "Designer creates asset", color: "#F7971C" },
                { icon: "✍️", label: "Copywriting", sub: "Copy written & approved", color: "#3B82F6" },
                { icon: "📤", label: "Publishing", sub: "Content goes live", color: "#10B981" },
              ].map(({ icon, label, sub, color }, i, arr) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5 min-w-[90px]">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                      style={{ background: `${color}18`, border: `2px solid ${color}55` }}
                    >
                      {icon}
                    </div>
                    <p className="text-xs font-semibold text-white">{label}</p>
                    <p className="text-xs text-gray-600 text-center">{sub}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="text-gray-700 text-xl mb-4">→</span>
                  )}
                </div>
              ))}
            </div>

            <h3 className="text-base font-semibold text-white mb-3">Creating a Project</h3>
            <Steps items={[
              { title: "Click \"+ New Project\"", desc: "The orange button in the top-right of the Projects page opens the project creation dialog." },
              { title: "Fill in project details", desc: "Enter a Project Name, optional description, select the Brand and Region, and optionally link to a Campaign. Set a date range and assign default team members (Designer, Copywriter, Publisher)." },
              { title: "Add Deliverables", desc: "Select the deliverable types needed — e.g. Instagram Posts, Facebook Posts, EDM Graphics, Website Banners, Event Materials. Dimensions auto-fill for each type." },
              { title: "Save the project", desc: "The project is created and appears in your list. Assigned team members receive a Slack notification with design specs and a direct \"Create in Canva\" link." },
            ]} />

            <h3 className="text-base font-semibold text-white mb-3 mt-6">Deliverable Types &amp; Dimensions</h3>
            <GuideTable
              headers={["Deliverable Type", "Platform", "Recommended Size"]}
              rows={[
                [<strong className="text-white">Instagram Post</strong>, "Instagram", "1080 × 1080 px"],
                [<strong className="text-white">Instagram Story</strong>, "Instagram", "1080 × 1920 px"],
                [<strong className="text-white">Instagram Reel</strong>, "Instagram", "1080 × 1920 px"],
                [<strong className="text-white">Facebook Post</strong>, "Facebook", "1200 × 630 px"],
                [<strong className="text-white">TikTok Post</strong>, "TikTok", "1080 × 1920 px"],
                [<strong className="text-white">LinkedIn Post</strong>, "LinkedIn", "1200 × 627 px"],
                [<strong className="text-white">Twitter / X Post</strong>, "Twitter/X", "1600 × 900 px"],
                [<strong className="text-white">RedNote Post</strong>, "RedNote", "1080 × 1440 px"],
                [<strong className="text-white">EDM Graphic</strong>, "Email", "600 × 400 px"],
                [<strong className="text-white">Website Banner</strong>, "Website", "1920 × 600 px"],
                [<strong className="text-white">Event Material</strong>, "Various", "Custom"],
              ]}
            />

            <h3 className="text-base font-semibold text-white mb-3 mt-6">Project Views</h3>
            <p className="text-gray-400 leading-relaxed">Switch between three views using the icons in the top-right of the Projects page:</p>
            <ul className="text-gray-400 space-y-1 pl-5 list-disc mt-2">
              <li><strong className="text-white">List view</strong> — compact table with all projects</li>
              <li><strong className="text-white">Card / Kanban view</strong> — grouped by workflow stage</li>
              <li><strong className="text-white">Calendar view</strong> — projects plotted by date range</li>
            </ul>

            <Callout type="tip" icon="💡" title="Canva Integration">
              When a Designer is assigned to a deliverable, they receive a Slack message with a <strong>"Create in Canva"</strong> button that opens a new Canva project with the correct dimensions already set — saving time and preventing size errors.
            </Callout>
          </section>

          {/* ═══════════════════ PUBLISHING QUEUE ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="publishing-queue">
            <SectionHeader icon="📤" title="Publishing Queue" />
            <p className="text-gray-400 leading-relaxed mb-5">
              The <strong className="text-white">Publishing Queue</strong> shows all deliverables that have completed the Design and Copywriting stages and are now awaiting publication to their target social platform.
            </p>
            <p className="text-gray-400 leading-relaxed mb-5">
              Use the <strong className="text-white">Brand</strong>, <strong className="text-white">Region</strong>, and <strong className="text-white">Type</strong> filter dropdowns to narrow the list.
            </p>

            <h3 className="text-base font-semibold text-white mb-3">Publishing a Deliverable</h3>
            <Steps items={[
              { title: "Find the deliverable in the Queue", desc: "Each card shows the deliverable name, target platform, assigned publisher, and due date." },
              { title: "Click the publish arrow icon", desc: "This opens the Publish screen where you can review the final content, caption, and choose the platform account." },
              { title: "Select the connected account", desc: "Choose the Meta Page, TikTok, LinkedIn, or Twitter account to post to. Only connected accounts (configured in Settings) appear here." },
              { title: "Confirm & Publish", desc: "Click \"Publish Now\". The content is sent to the platform. On success, the deliverable moves to the Published section." },
            ]} />

            <Callout type="note" icon="ℹ️" title="Platform Status">
              The Queue page shows a status indicator per integration. A green tick means the integration is connected and ready. A grey icon means it isn't configured — contact your Admin.
            </Callout>
          </section>

          {/* ═══════════════════ PUBLISHED ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="published">
            <SectionHeader icon="✅" title="Published" />
            <p className="text-gray-400 leading-relaxed">
              The <strong className="text-white">Published</strong> page is the permanent record of all content that has been successfully published through the platform. It shows the post, platform, publish date, the team member who published it, and any available performance metrics. Use it to review what has gone out and confirm that scheduled content went live as planned.
            </p>
          </section>

          {/* ═══════════════════ TASKS ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="tasks">
            <SectionHeader icon="✅" title="Tasks" />
            <p className="text-gray-400 leading-relaxed mb-5">
              The <strong className="text-white">Tasks</strong> section is for standalone work items that don't belong to a Project — briefing meetings, research, admin to-dos, or any action that needs tracking.
            </p>

            <h3 className="text-base font-semibold text-white mb-3">Views</h3>
            <ul className="text-gray-400 space-y-1 pl-5 list-disc mb-5">
              <li><strong className="text-white">Kanban Board</strong> — columns for To Do, In Progress, and Done. Drag cards between columns.</li>
              <li><strong className="text-white">List View</strong> — table layout with sorting and filtering.</li>
            </ul>

            <h3 className="text-base font-semibold text-white mb-3">Creating a Task</h3>
            <Steps items={[
              { title: "Click \"+ New Task\"", desc: "The orange button in the top-right opens the task creation dialog." },
              { title: "Fill in the details", desc: "Enter a Title, optional description, select Brand and Region, set a Due Date, assign a Priority (Low, Medium, High, Urgent), and assign it to a team member." },
              { title: "Save", desc: "The task appears on the board and the assigned person receives a notification." },
            ]} />

            <h3 className="text-base font-semibold text-white mb-3 mt-6">Priority Levels</h3>
            <GuideTable
              headers={["Priority", "Badge", "When to use"]}
              rows={[
                [<strong className="text-white">Low</strong>, <Badge variant="draft">Low</Badge>, "Nice-to-have, no deadline pressure"],
                [<strong className="text-white">Medium</strong>, <Badge variant="published">Medium</Badge>, "Standard tasks with a normal timeline"],
                [<strong className="text-white">High</strong>, <Badge variant="pending">High</Badge>, "Important, needs attention soon"],
                [<strong className="text-white">Urgent</strong>, <Badge variant="overdue">Urgent</Badge>, "Blocking something, needs immediate action"],
              ]}
            />

            <Callout type="tip" icon="💡" title="Duplicate a Task">
              Use the <strong>⋮ menu</strong> on any task card and select <strong>"Duplicate"</strong> to quickly create a copy of a recurring task with all its details pre-filled.
            </Callout>
          </section>

          {/* ═══════════════════ ASSETS ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="assets">
            <SectionHeader icon="🖼" title="Asset Library" />
            <p className="text-gray-400 leading-relaxed mb-5">
              A centralised repository for all brand creative files — logos, photography, graphic templates, videos, documents, and email graphics. Assets are organised by brand and filterable by type and tags.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <SmallCard icon="🖼" title="Graphics / Images" desc="PNG, JPG, GIF, WEBP files" />
              <SmallCard icon="🎥" title="Videos" desc="MP4, MOV, and other video formats" />
              <SmallCard icon="📄" title="Documents" desc="PDF, DOCX, PPTX briefs and guides" />
              <SmallCard icon="📐" title="Templates" desc="Canva and design templates" />
              <SmallCard icon="📧" title="EDM Graphics" desc="Email marketing visuals" />
            </div>

            <h3 className="text-base font-semibold text-white mb-3">Uploading an Asset</h3>
            <Steps items={[
              { title: "Click \"+ Add Asset\"", desc: "Opens the asset upload dialog." },
              { title: "Fill in details", desc: "Enter a name and description, select the Brand, choose the Asset Type, and add tags. You can also add an external URL (e.g. a Canva, DreamPIM, or Asset Portal link)." },
              { title: "Upload the file or paste a link", desc: "Either upload a file directly or provide an external link. Canva designs can be synced automatically via the Canva integration." },
            ]} />

            <h3 className="text-base font-semibold text-white mb-3 mt-6">Searching & Filtering</h3>
            <ul className="text-gray-400 space-y-1 pl-5 list-disc">
              <li><strong className="text-white">Search bar</strong> — searches names and descriptions</li>
              <li><strong className="text-white">Type filter</strong> — show only Graphics, Videos, Documents, etc.</li>
              <li><strong className="text-white">Brand filter</strong> — show only assets for a specific brand</li>
              <li><strong className="text-white">Tag filter</strong> — find assets by tag</li>
            </ul>

            <h3 className="text-base font-semibold text-white mb-2 mt-6">Canva Sync</h3>
            <p className="text-gray-400 leading-relaxed">
              If Canva is connected, use the <strong className="text-white">"Sync from Canva"</strong> button to pull the latest versions of your Canva designs into the asset library automatically.
            </p>
          </section>

          {/* ═══════════════════ BRANDS ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="brands">
            <SectionHeader icon="🏢" title="Brands" />
            <p className="text-gray-400 leading-relaxed mb-5">
              Each brand has a dedicated <strong className="text-white">hub page</strong> giving a complete picture of that brand's marketing activity in one place. Access it via the <strong className="text-white">Brands ▾</strong> dropdown in the nav.
            </p>

            <GuideTable
              headers={["Tab", "Contents"]}
              rows={[
                [<strong className="text-white">Overview</strong>, "Key stats, upcoming posts, and upcoming email campaigns"],
                [<strong className="text-white">Promotions</strong>, "Active, scheduled, and ended promotions with discount type and dates"],
                [<strong className="text-white">Calendar</strong>, "All content for this brand on a filtered calendar view"],
                [<strong className="text-white">Assets</strong>, "Brand-specific assets from the asset library, searchable and filterable"],
                [<strong className="text-white">Activity</strong>, "Recent content activity — posts created, tasks completed, campaigns launched"],
              ]}
            />

            <Callout type="admin" icon="🔑" title="Creating / Editing Brands">
              Adding new brands, editing brand details, and managing brand–region assignments is done in <strong>Settings → Brands</strong> by an Administrator.
            </Callout>
          </section>

          {/* ═══════════════════ ARCHIVE ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="archive">
            <SectionHeader icon="🗄" title="Archive" />
            <p className="text-gray-400 leading-relaxed mb-4">
              The <strong className="text-white">Archive</strong> stores completed and sent content — published social posts, sent email campaigns, and past events. Use it to reference past campaigns, review historic content, or find a previous post to duplicate.
            </p>
            <Callout type="note" icon="ℹ️" title="Read-Only">
              Content in the Archive cannot be edited. To reuse content, use the <strong>Duplicate</strong> function to create a new editable copy.
            </Callout>
          </section>

          {/* ═══════════════════ SETTINGS ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="settings">
            <SectionHeader
              icon="⚙️"
              title={
                <>
                  Settings{" "}
                  <span className="text-sm font-semibold ml-2 align-middle" style={{ color: "#EF4444" }}>
                    Admin Only
                  </span>
                </>
              }
            />

            <Callout type="admin" icon="🔑" title="Admin Access Required">
              The Settings link only appears for Admin users. If you need something changed in Settings, contact your platform Administrator.
            </Callout>

            <h3 className="text-base font-semibold text-white mb-3 mt-6">Users Tab</h3>
            <ul className="text-gray-400 space-y-1 pl-5 list-disc">
              <li>Create new users with name, email, password, role, and region</li>
              <li>Edit or delete existing user accounts</li>
              <li>Assign roles: Admin, Manager, or User</li>
            </ul>

            <h3 className="text-base font-semibold text-white mb-3 mt-6">Brands Tab</h3>
            <ul className="text-gray-400 space-y-1 pl-5 list-disc">
              <li>Add new brands with name, colour, and logo</li>
              <li>Activate or deactivate brands</li>
              <li>Assign brands to regions</li>
              <li>Add external links (DreamPIM, Asset Portal) per brand</li>
            </ul>

            <h3 className="text-base font-semibold text-white mb-3 mt-6">Integrations Tab</h3>
            <GuideTable
              headers={["Integration", "Purpose", "Setup"]}
              rows={[
                [<strong className="text-white">Meta (Facebook/Instagram)</strong>, "Direct publishing and analytics for Facebook Pages and Instagram", "Click \"Connect Meta\" and authenticate via OAuth. Then map pages to brands/regions."],
                [<strong className="text-white">TikTok</strong>, "Connect TikTok accounts for video publishing", "Enter TikTok API credentials and authenticate via OAuth"],
                [<strong className="text-white">LinkedIn</strong>, "Connect LinkedIn Pages for post publishing", "Enter LinkedIn OAuth credentials"],
                [<strong className="text-white">Twitter / X</strong>, "Connect Twitter/X accounts", "Enter Twitter API credentials"],
                [<strong className="text-white">Canva</strong>, "Sync designs from Canva into the Asset Library", "Enter Canva Client ID and Secret, then authenticate"],
                [<strong className="text-white">Slack</strong>, "Automated notifications to team members via DM", "Configured server-side — contact your developer/Admin"],
              ]}
            />

            <Callout type="tip" icon="💡" title="Connecting Meta Pages">
              After connecting your Meta account, <strong>map each Facebook/Instagram Page to a brand and region</strong> in Settings → Integrations. This tells the planner which account to post to when publishing for a specific brand and region.
            </Callout>
          </section>

          {/* ═══════════════════ NOTIFICATIONS ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="notifications">
            <SectionHeader icon="🔔" title="Notifications" />
            <p className="text-gray-400 leading-relaxed mb-5">
              The planner sends automated notifications to keep your team informed without needing to constantly check the platform.
            </p>

            <h3 className="text-base font-semibold text-white mb-3">In-App Notifications</h3>
            <p className="text-gray-400 leading-relaxed mb-5">
              Click the <strong className="text-white">🔔 bell icon</strong> in the top-right to view all in-app notifications. A badge shows unread count. Click any notification to navigate directly to the relevant item.
            </p>

            <h3 className="text-base font-semibold text-white mb-3">Slack Notifications</h3>
            <GuideTable
              headers={["Event", "Who Gets Notified"]}
              rows={[
                ["Assigned as Designer on a deliverable", "The Designer — includes specs + \"Create in Canva\" button"],
                ["Assigned as Copywriter on a deliverable", "The Copywriter"],
                ["Assigned as Publisher on a deliverable", "The Publisher"],
                ["Content submitted for approval", "Approvers"],
                ["Content approved", "Submitter"],
                ["Deadline in 24 hours", "Assigned team member"],
                ["Deadline in 2 hours", "Assigned team member"],
                ["Task assigned to you", "The assigned user"],
              ]}
            />
          </section>

          {/* ═══════════════════ ROLES ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="roles">
            <SectionHeader icon="👥" title="Roles & Permissions" />
            <p className="text-gray-400 leading-relaxed mb-5">
              Every user is assigned one of three roles. Your role determines what you can see and do.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                {
                  badge: "ADMIN", variant: "admin",
                  desc: "Full access to everything including Settings, user management, brand/region configuration, and all integrations. Can create, edit, and delete any content across all brands and regions.",
                },
                {
                  badge: "MANAGER", variant: "manager",
                  desc: "Can view and manage content across all brands and regions. Can create/edit projects, posts, tasks, and assets. Cannot access Settings or manage users.",
                },
                {
                  badge: "USER", variant: "user",
                  desc: "Can view content within their assigned region/brand and update items assigned to them. Typically designers, copywriters, and coordinators.",
                },
              ].map(({ badge, variant, desc }) => (
                <div
                  key={badge}
                  className="rounded-xl p-4"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="mb-3">
                    <Badge variant={variant}>{badge}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed m-0">{desc}</p>
                </div>
              ))}
            </div>

            <h3 className="text-base font-semibold text-white mb-2">Approval Self-Prevention</h3>
            <p className="text-gray-400 leading-relaxed">
              You <strong className="text-white">cannot approve your own content</strong>. A different team member must approve items you created or submitted. This ensures genuine review at every stage.
            </p>
          </section>

          {/* ═══════════════════ STATUSES ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="statuses">
            <SectionHeader icon="🏷" title="Status Reference" />
            <p className="text-gray-400 leading-relaxed mb-5">
              Content items and deliverables move through statuses as they progress. Here is a reference for all status badges you will encounter:
            </p>
            <GuideTable
              headers={["Status", "Meaning"]}
              rows={[
                [<Badge variant="draft">DRAFT</Badge>, "Created but not yet submitted for review"],
                [<Badge variant="pending">PENDING</Badge>, "Submitted and awaiting approval or action"],
                [<Badge variant="approved">APPROVED</Badge>, "Reviewed and approved — ready for next stage"],
                [<Badge variant="published">PUBLISHED</Badge>, "Successfully published to the target platform"],
                [<Badge variant="overdue">OVERDUE</Badge>, "Past its deadline and not yet completed"],
                [<Badge variant="orange">SCHEDULED</Badge>, "Scheduled for a future date/time"],
                [<Badge variant="completed">COMPLETED</Badge>, "Task or item is fully done"],
                [<Badge variant="draft">CANCELLED</Badge>, "Item has been cancelled"],
              ]}
            />
          </section>

          {/* ═══════════════════ INTEGRATIONS ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="integrations">
            <SectionHeader icon="🔗" title="Integrations" />
            <p className="text-gray-400 leading-relaxed mb-5">
              The Marketing Planner connects with the following third-party platforms:
            </p>

            <div className="flex flex-wrap gap-2.5 mb-6">
              {[
                { icon: "📘", label: "Meta (Facebook)" },
                { icon: "📸", label: "Instagram" },
                { icon: "🎵", label: "TikTok" },
                { icon: "💼", label: "LinkedIn" },
                { icon: "🐦", label: "Twitter / X" },
                { icon: "📖", label: "RedNote" },
                { icon: "🎨", label: "Canva" },
                { icon: "💬", label: "Slack" },
              ].map(({ icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <span>{icon}</span> {label}
                </div>
              ))}
            </div>

            <h3 className="text-base font-semibold text-white mb-2">Meta (Facebook &amp; Instagram)</h3>
            <p className="text-gray-400 leading-relaxed mb-4">
              Allows direct publishing of posts and reels to Facebook Pages and Instagram Business accounts, plus analytics (reach, impressions, engagement). Setup is done in <strong className="text-white">Settings → Integrations</strong>.
            </p>

            <h3 className="text-base font-semibold text-white mb-2">Canva</h3>
            <ul className="text-gray-400 space-y-1 pl-5 list-disc mb-4">
              <li><strong className="text-white">Create in Canva link</strong> — Designers receive a Slack notification with a button that opens a new design at the correct dimensions.</li>
              <li><strong className="text-white">Canva Sync</strong> — Connect your account in Settings to sync finished designs directly into the Asset Library.</li>
            </ul>

            <Callout type="warn" icon="⚠️" title="Integration Tokens">
              API tokens and OAuth credentials are stored securely on the server. Never share your platform credentials. If a token expires, the Admin will need to re-authenticate the integration in Settings.
            </Callout>
          </section>

          {/* ═══════════════════ TIPS ═══════════════════ */}
          <section className="mb-16 scroll-mt-8" id="tips">
            <SectionHeader icon="💡" title="Tips & Best Practices" />

            <h3 className="text-base font-semibold text-white mb-3">Staying Organised</h3>
            <ul className="text-gray-400 space-y-1.5 pl-5 list-disc mb-6">
              <li>Always assign a <strong className="text-white">Brand</strong> and <strong className="text-white">Region</strong> to every piece of content so the right team sees the right work.</li>
              <li>Use <strong className="text-white">Projects</strong> to group related content — one project per campaign or event.</li>
              <li>Set <strong className="text-white">deadlines</strong> on all deliverables so the automated reminder system alerts your team in advance.</li>
              <li>Add <strong className="text-white">tags</strong> to assets so they are easy to find later.</li>
            </ul>

            <h3 className="text-base font-semibold text-white mb-3">Workflow Efficiency</h3>
            <ul className="text-gray-400 space-y-1.5 pl-5 list-disc mb-6">
              <li>Use the <strong className="text-white">Duplicate</strong> function (⋮ menu) on posts, tasks, and events to save time on recurring content.</li>
              <li>Set <strong className="text-white">default team members</strong> when creating a project — all deliverables will be pre-assigned to that Designer, Copywriter, and Publisher.</li>
              <li>Check the <strong className="text-white">Publishing Queue</strong> daily if you are a publisher — items there are approved and ready to go live.</li>
              <li>Use the <strong className="text-white">Calendar view</strong> on the Dashboard to spot content gaps and scheduling conflicts.</li>
            </ul>

            <h3 className="text-base font-semibold text-white mb-3">Common Questions</h3>
            <div className="space-y-3">
              {[
                {
                  q: "I can't see a brand in the dropdown. What's wrong?",
                  a: "The brand may be deactivated or you may not be assigned to that region. Ask your Admin to check brand and region assignments in Settings.",
                },
                {
                  q: "The publish button isn't working for a platform.",
                  a: "The platform integration may not be connected or the token may have expired. Check Settings → Integrations or contact your Admin.",
                },
                {
                  q: "I'm not receiving Slack notifications.",
                  a: "Ensure your Slack username is configured in your user profile and that the Slack integration is active in Settings. If the issue persists, contact your Admin.",
                },
                {
                  q: "How do I reset my password?",
                  a: "Contact your Administrator. They can reset your password in Settings → Users.",
                },
              ].map(({ q, a }) => (
                <div
                  key={q}
                  className="rounded-xl p-4"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-sm font-semibold text-white mb-1">{q}</p>
                  <p className="text-sm text-gray-400 leading-relaxed m-0">{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Footer ── */}
          <footer className="mt-16 pt-8 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-xs text-gray-600">
              Bloom &amp; Grow Marketing Planner · User Guide · Version 3.0 · March 2026
            </p>
            <p className="text-xs text-gray-700 mt-1">For technical support contact your platform Administrator.</p>
            <div className="mt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
                style={{ color: "#F7971C" }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </footer>

        </div>
      </main>
    </div>
  );
}

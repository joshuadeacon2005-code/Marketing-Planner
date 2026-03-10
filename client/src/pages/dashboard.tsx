import { useQuery } from "@tanstack/react-query";
import { format, isBefore, addDays } from "date-fns";
import {
  Share2,
  Mail,
  Calendar,
  CheckSquare,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  Eye,
  Heart,
  BarChart3,
  Instagram,
  Facebook,
  FolderPlus,
  Briefcase,
  Paintbrush,
  PenTool,
  Send,
  BookOpen,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, getStatusVariant } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { UnifiedCalendar } from "@/components/unified-calendar";
import { useAuthStore } from "@/lib/auth-store";
import { Link, useLocation } from "wouter";
import type { Task, Brand, Region, Project } from "@shared/schema";


interface UpcomingDeadline {
  id: string;
  title: string;
  type: "social" | "email" | "event" | "task";
  dueDate: string;
}

function MiniChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-0.5 h-8 mt-2">
      {data.map((value, index) => (
        <div
          key={index}
          className="mini-chart-bar w-1.5"
          style={{ height: `${(value / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
  chartData,
  href,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: string;
  loading?: boolean;
  chartData?: number[];
  href?: string;
}) {
  if (loading) {
    return (
      <div className="control-panel p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-white/5" />
            <Skeleton className="h-9 w-16 bg-white/5" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg bg-white/5" />
        </div>
      </div>
    );
  }

  const cardContent = (
    <div className="control-panel metric-card-hover p-6 group relative rounded-xl cursor-pointer">
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={2}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{title}</p>
          <p className="text-4xl font-display font-bold text-foreground">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 text-xs text-status-success">
              <TrendingUp className="w-3 h-3" />
              <span>{trend}</span>
            </div>
          )}
          {chartData && (
            <div className="trend-chart">
              <MiniChart data={chartData} />
            </div>
          )}
        </div>
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
}

function DeadlineItem({ deadline }: { deadline: UpcomingDeadline }) {
  const typeIcons = {
    social: Share2,
    email: Mail,
    event: Calendar,
    task: CheckSquare,
  };
  const Icon = typeIcons[deadline.type];
  const isOverdue = isBefore(new Date(deadline.dueDate), new Date());
  const isUrgent = isBefore(new Date(deadline.dueDate), addDays(new Date(), 2));

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 border border-transparent hover:border-primary/20 group">
      <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${
        isOverdue ? "bg-status-error/10 border border-status-error/20" : isUrgent ? "bg-status-warning/10 border border-status-warning/20" : "bg-brand-blue/10 border border-brand-blue/20"
      }`}>
        <Icon className={`w-4 h-4 ${
          isOverdue ? "text-status-error" : isUrgent ? "text-status-warning" : "text-brand-blue"
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{deadline.title}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{format(new Date(deadline.dueDate), "MMM d, yyyy")}</span>
        </div>
      </div>
      {isOverdue && (
        <StatusBadge status="error">Overdue</StatusBadge>
      )}
      {!isOverdue && isUrgent && (
        <StatusBadge status="warning">Soon</StatusBadge>
      )}
    </div>
  );
}

function TaskItem({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 border-l-2 border-primary">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
        {task.dueDate && (
          <p className="text-xs text-muted-foreground">
            Due {format(new Date(task.dueDate), "MMM d")}
          </p>
        )}
      </div>
      <StatusBadge status={getStatusVariant(task.priority)}>
        {task.priority}
      </StatusBadge>
    </div>
  );
}

function ProjectStatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="p-4 rounded-lg border border-white/10 bg-white/5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 bg-white/5" />
          <Skeleton className="h-8 w-12 bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

function RecentProjectItem({ project, brands }: { project: Project; brands: Brand[] }) {
  const brand = brands.find(b => b.id === project.brandId);
  const brandColor = brand?.color || "#F7971C";

  return (
    <Link href={`/projects?id=${project.id}`}>
      <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all group">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
          <div className="flex items-center gap-2 mt-1">
            {brand && (
              <Badge variant="secondary" className="text-xs shrink-0" style={{ backgroundColor: `${brandColor}20`, borderColor: `${brandColor}40` }}>
                <span style={{ color: brandColor }} className="font-medium">{brand.name}</span>
              </Badge>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary/80 shrink-0" 
          data-testid={`link-view-project-${project.id}`}
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [, setLocation] = useLocation();

  const { data: upcoming, isLoading: upcomingLoading } = useQuery<UpcomingDeadline[]>({
    queryKey: ["/api/dashboard/upcoming"],
  });

  const { data: myTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { assigneeId: user?.id, status: ["TODO", "IN_PROGRESS"] }],
    enabled: !!user?.id,
  });

  const { data: topPosts, isLoading: topPostsLoading } = useQuery<any[]>({
    queryKey: ["/api/social/top-performing?limit=10"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const { data: brands, isLoading: brandsLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: publishingQueue, isLoading: publishingQueueLoading } = useQuery<any[]>({
    queryKey: ["/api/publishing-queue"],
  });

  const { data: published, isLoading: publishedLoading } = useQuery<any[]>({
    queryKey: ["/api/published"],
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const sampleChartData = [4, 7, 5, 9, 6, 8, 10, 7, 9, 11, 8, 12];

  return (
    <div className="space-y-10 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
            {greeting()}, {user?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span>Strategic Marketing Control Center</span>
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
          <span>LIVE DATA</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Projects"
          value={(projects?.filter(p => !p.isCompleted) || []).length}
          icon={Briefcase}
          loading={projectsLoading}
          chartData={sampleChartData}
          href="/projects"
        />
        <StatCard
          title="Deliverables in Progress"
          value={
            (projects?.flatMap(p => p.deliverables || []) || []).filter(
              d => d.currentStage !== "COMPLETED"
            ).length
          }
          icon={Paintbrush}
          loading={projectsLoading}
          chartData={[6, 4, 8, 5, 7, 9, 6, 8, 7, 10, 9, 8]}
          href="/projects"
        />
        <StatCard
          title="Ready to Publish"
          value={(publishingQueue || []).length}
          icon={Send}
          loading={publishingQueueLoading}
          chartData={[3, 5, 4, 6, 5, 4, 7, 6, 5, 8, 7, 6]}
          href="/publishing-queue"
        />
        <StatCard
          title="Published"
          value={(published || []).length}
          icon={CheckSquare}
          loading={publishedLoading}
          chartData={[8, 10, 7, 12, 9, 11, 14, 10, 13, 15, 12, 16]}
          href="/published"
        />
      </div>

      {/* Workflow Pipeline */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-semibold text-foreground">Workflow Pipeline</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(() => {
            const allDeliverables = projects?.flatMap(p => p.deliverables || []) || [];
            const stages = [
              { key: "DESIGN", label: "Design", icon: Paintbrush, color: "text-blue-400" },
              { key: "COPYWRITING", label: "Copywriting", icon: PenTool, color: "text-purple-400" },
              { key: "PUBLISHING", label: "Publishing", icon: Send, color: "text-amber-400" },
              { key: "COMPLETED", label: "Published", icon: CheckSquare, color: "text-emerald-400" },
            ];
            return stages.map((s) => {
              const count = allDeliverables.filter(d => d.currentStage === s.key).length;
              return (
                <Link key={s.key} href={s.key === "PUBLISHING" ? "/publishing-queue" : s.key === "COMPLETED" ? "/published" : "/projects"}>
                  <Card className="hover-elevate cursor-pointer" data-testid={`pipeline-stage-${s.key.toLowerCase()}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <s.icon className={`w-4 h-4 ${s.color}`} />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {projectsLoading ? <Skeleton className="h-7 w-8 bg-white/10" /> : count}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            });
          })()}
        </div>
      </div>

      {/* Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-foreground">Recent Projects</h2>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-primary" data-testid="link-view-all-projects">
                <ArrowRight className="w-4 h-4 mr-1" />
                View All
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {projectsLoading || brandsLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-lg border">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </>
            ) : projects && projects.length > 0 ? (
              projects
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((project) => (
                  <RecentProjectItem 
                    key={project.id} 
                    project={project} 
                    brands={brands || []}
                  />
                ))
            ) : (
              <div className="text-center py-6">
                <FolderPlus className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted-foreground">No projects yet</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <Link href="/projects">
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-display font-semibold text-foreground">Start a New Project</h3>
                    <p className="text-xs text-muted-foreground mt-1">Design, copywriting, and publishing workflow</p>
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20 shrink-0">
                    <FolderPlus className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex flex-col gap-8">
          {/* Deadlines & Tasks Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="control-panel p-0 overflow-visible relative rounded-xl">
              <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={2}
              />
              <div className="flex flex-row items-center justify-between gap-2 p-4 pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-display font-semibold uppercase tracking-widest text-foreground">Upcoming Deadlines</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Next 7 days</p>
                </div>
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid="link-view-all-deadlines">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="p-4 pt-3 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {upcomingLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                        <Skeleton className="h-8 w-8 rounded-lg bg-white/5" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-3/4 bg-white/5" />
                          <Skeleton className="h-2 w-1/2 bg-white/5" />
                        </div>
                      </div>
                    ))}
                  </>
                ) : upcoming && upcoming.length > 0 ? (
                  upcoming.slice(0, 4).map((deadline) => (
                    <DeadlineItem key={deadline.id} deadline={deadline} />
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-muted-foreground">No upcoming deadlines</p>
                  </div>
                )}
              </div>
            </div>

            <div className="control-panel p-0 overflow-visible relative rounded-xl">
              <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={2}
              />
              <div className="flex flex-row items-center justify-between gap-2 p-4 pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-display font-semibold uppercase tracking-widest text-foreground">My Tasks</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Assigned to you</p>
                </div>
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid="link-view-all-tasks">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="p-4 pt-3 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {tasksLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-3/4 bg-white/5" />
                          <Skeleton className="h-2 w-1/2 bg-white/5" />
                        </div>
                        <Skeleton className="h-5 w-14 rounded-full bg-white/5" />
                      </div>
                    ))}
                  </>
                ) : myTasks && myTasks.length > 0 ? (
                  myTasks.slice(0, 4).map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))
                ) : (
                  <div className="text-center py-6">
                    <CheckSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-muted-foreground">No tasks assigned</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Performing Posts */}
          <div className="control-panel p-0 overflow-visible relative rounded-xl">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={2}
            />
            <div className="flex flex-row items-center justify-between gap-2 p-4 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-display font-semibold uppercase tracking-widest text-foreground">Top Performing Posts</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Highest engagement</p>
              </div>
              <Link href="/social">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid="link-view-all-top-posts">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="p-4 pt-3 space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              {topPostsLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Skeleton className="h-9 w-9 rounded-lg bg-white/5" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-3/4 bg-white/5" />
                        <Skeleton className="h-2 w-1/2 bg-white/5" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full bg-white/5" />
                    </div>
                  ))}
                </>
              ) : topPosts && topPosts.length > 0 ? (
                topPosts.map((post: any) => {
                  const platformIcon: Record<string, React.ElementType> = {
                    TIKTOK: SiTiktok,
                    INSTAGRAM: Instagram,
                    FACEBOOK: Facebook,
                    REDNOTE: BookOpen,
                  };
                  const PIcon = platformIcon[post.platform] || Share2;
                  return (
                    <div key={post.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 border border-transparent hover:border-primary/20" data-testid={`card-top-post-${post.id}`}>
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/20">
                        <PIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {post.caption ? post.caption.substring(0, 50) + (post.caption.length > 50 ? "..." : "") : `${post.platform} Post`}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {post.brand && <span>{post.brand.name}</span>}
                          {post.performance && (
                            <>
                              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(post.performance.views || 0).toLocaleString()}</span>
                              <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{(post.performance.likes || 0).toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {post.performance && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          <BarChart3 className="w-3 h-3 mr-1" />
                          {Number(post.performance.engagementRate || 0).toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6">
                  <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground">No performance data yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Track post performance from the Social page</p>
                </div>
              )}
            </div>
          </div>

          {/* Content Calendar - Below deadlines/tasks */}
          <div className="control-panel p-0 overflow-visible relative rounded-xl">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={2}
            />
            <div className="p-6 pb-4 border-b border-white/5">
              <h3 className="text-sm font-display font-semibold uppercase tracking-widest text-foreground">Content Calendar</h3>
              <p className="text-xs text-muted-foreground mt-0.5">All scheduled content</p>
            </div>
            <div className="p-4">
              <UnifiedCalendar
                onEventClick={(event) => {
                  if (event.type === "SOCIAL") {
                    setLocation("/social");
                  } else if (event.type === "EMAIL") {
                    setLocation("/email");
                  } else if (event.type === "EVENT") {
                    setLocation("/events");
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

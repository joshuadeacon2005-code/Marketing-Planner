import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Instagram,
  Facebook,
  Video,
  Linkedin,
  Twitter,
  Mail,
  Globe,
  CalendarDays,
  Minus,
  ChevronDown,
  ChevronRight,
  Palette,
  PenTool,
  Send,
  CheckCircle2,
  FolderOpen,
  Calendar,
  List,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/ui/glass-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAutocomplete } from "@/components/user-autocomplete";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/lib/auth-store";
import type { Project, Brand, Region, Campaign, User, DeliverableType, ProjectDeliverable } from "@shared/schema";
import { DELIVERABLE_PRESET_DIMENSIONS } from "@shared/schema";

type ProjectWithDeliverables = Project & { deliverables: ProjectDeliverable[] };
import { ProjectDetailModal } from "@/components/project-detail-modal";

const DELIVERABLE_TYPES: {
  type: DeliverableType;
  label: string;
  icon: React.ElementType;
  category: string;
}[] = [
  { type: "INSTAGRAM_POST", label: "Instagram Posts", icon: Instagram, category: "Social Media" },
  { type: "INSTAGRAM_STORY", label: "Instagram Stories", icon: Instagram, category: "Social Media" },
  { type: "INSTAGRAM_REEL", label: "Instagram Reels", icon: Instagram, category: "Social Media" },
  { type: "FACEBOOK_POST", label: "Facebook Posts", icon: Facebook, category: "Social Media" },
  { type: "TIKTOK_POST", label: "TikTok Posts", icon: Video, category: "Social Media" },
  { type: "LINKEDIN_POST", label: "LinkedIn Posts", icon: Linkedin, category: "Social Media" },
  { type: "TWITTER_POST", label: "Twitter Posts", icon: Twitter, category: "Social Media" },
  { type: "REDNOTE_POST", label: "RedNote Posts", icon: BookOpen, category: "Social Media" },
  { type: "EDM_GRAPHIC", label: "EDM Graphics", icon: Mail, category: "EDM Graphics" },
  { type: "WEBSITE_BANNER", label: "Website Banners", icon: Globe, category: "Website Banners" },
  { type: "EVENT_MATERIAL", label: "Event Materials", icon: CalendarDays, category: "Event Materials" },
];

const CATEGORIES = ["Social Media", "EDM Graphics", "Website Banners", "Event Materials"];

const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  brandId: z.string().min(1, "Brand is required"),
  regionId: z.string().min(1, "Region is required"),
  campaignId: z.string().optional(),
  useDateRange: z.boolean().default(false),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  defaultDesignerId: z.string().optional(),
  defaultCopywriterId: z.string().optional(),
  defaultPublisherId: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

function ProjectCalendarView({
  projects,
  brands,
  onProjectClick
}: {
  projects: ProjectWithDeliverables[];
  brands: Brand[];
  onProjectClick: (id: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const projectsWithDates = projects.filter(p => p.startDate && p.endDate);

  const getProjectsForDay = (day: number) => {
    const date = new Date(year, month, day);
    return projectsWithDates.filter(p => {
      const start = new Date(p.startDate!);
      const end = new Date(p.endDate!);
      return date >= start && date <= end;
    });
  };

  const days = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="min-h-[80px]" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayProjects = getProjectsForDay(day);
    const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

    days.push(
      <div
        key={day}
        className={`min-h-[80px] border rounded-md p-1 ${isToday ? 'border-primary' : 'border-border'}`}
      >
        <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
          {day}
        </span>
        <div className="mt-1 space-y-0.5">
          {dayProjects.slice(0, 3).map(p => {
            const brand = brands.find(b => b.id === p.brandId);
            return (
              <button
                key={p.id}
                className="w-full text-left text-[10px] px-1 py-0.5 rounded truncate cursor-pointer"
                style={{
                  backgroundColor: brand?.color ? `${brand.color}20` : 'var(--muted)',
                  color: brand?.color || 'var(--foreground)',
                  borderLeft: `2px solid ${brand?.color || 'var(--primary)'}`
                }}
                onClick={() => onProjectClick(p.id)}
                data-testid={`calendar-project-${p.id}-day-${day}`}
              >
                {p.name}
              </button>
            );
          })}
          {dayProjects.length > 3 && (
            <span className="text-[10px] text-muted-foreground px-1">+{dayProjects.length - 3} more</span>
          )}
        </div>
      </div>
    );
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} data-testid="button-prev-month">
            <ChevronDown className="w-4 h-4 rotate-90" />
          </Button>
          <h3 className="text-lg font-semibold text-foreground" data-testid="text-current-month">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} data-testid="button-next-month">
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
          {days}
        </div>
        {projectsWithDates.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            No projects with dates found. Set start/end dates on projects to see them here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>(user?.regionId || "all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [deliverableCounts, setDeliverableCounts] = useState<Record<DeliverableType, number>>(
    {} as Record<DeliverableType, number>
  );
  const [deliverableSpecs, setDeliverableSpecs] = useState<Record<string, string>>({});
  const [deliverableDeadlines, setDeliverableDeadlines] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "Social Media": true,
  });
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const { data: projects, isLoading: projectsLoading } = useQuery<ProjectWithDeliverables[]>({
    queryKey: ["/api/projects"],
  });

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      brandId: "",
      regionId: user?.regionId || "",
      campaignId: "",
      useDateRange: false,
      startDate: "",
      endDate: "",
      defaultDesignerId: "",
      defaultCopywriterId: "",
      defaultPublisherId: "",
    },
  });

  const useDateRange = form.watch("useDateRange");

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const deliverables = Object.entries(deliverableCounts)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => ({
          type: type as DeliverableType,
          count,
          designSpecs: deliverableSpecs[type] || null,
          designDeadline: deliverableDeadlines[type] ? new Date(deliverableDeadlines[type]).toISOString() : null,
        }));

      return await apiRequest("POST", "/api/projects", {
        name: data.name,
        description: data.description || null,
        brandId: data.brandId,
        regionId: data.regionId,
        campaignId: data.campaignId || null,
        startDate: data.useDateRange && data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.useDateRange && data.endDate ? new Date(data.endDate).toISOString() : null,
        deliverables,
        defaultDesignerId: data.defaultDesignerId && data.defaultDesignerId !== "none" ? data.defaultDesignerId : null,
        defaultCopywriterId: data.defaultCopywriterId && data.defaultCopywriterId !== "none" ? data.defaultCopywriterId : null,
        defaultPublisherId: data.defaultPublisherId && data.defaultPublisherId !== "none" ? data.defaultPublisherId : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsModalOpen(false);
      form.reset();
      setDeliverableCounts({} as Record<DeliverableType, number>);
      setDeliverableSpecs({});
      setDeliverableDeadlines({});
      toast({ title: "Success", description: "Project created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createMutation.mutate(data);
  };

  const handleOpenModal = () => {
    form.reset();
    setDeliverableCounts({} as Record<DeliverableType, number>);
    setDeliverableSpecs({});
    setDeliverableDeadlines({});
    setExpandedCategories({ "Social Media": true });
    setIsModalOpen(true);
  };

  const updateDeliverableCount = (type: DeliverableType, delta: number) => {
    setDeliverableCounts((prev) => {
      const current = prev[type] || 0;
      const next = Math.max(0, current + delta);
      if (current === 0 && next > 0) {
        const preset = DELIVERABLE_PRESET_DIMENSIONS[type];
        if (preset && !deliverableSpecs[type]) {
          setDeliverableSpecs((p) => ({ ...p, [type]: preset.label }));
        }
      }
      return { ...prev, [type]: next };
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const totalDeliverables = Object.values(deliverableCounts).reduce((sum, c) => sum + c, 0);

  const filteredProjects = projects?.filter((project) => {
    const matchesSearch = !searchQuery || project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = brandFilter === "all" || project.brandId === brandFilter;
    const matchesRegion = regionFilter === "all" || project.regionId === regionFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !project.isCompleted) ||
      (statusFilter === "completed" && project.isCompleted);
    return matchesSearch && matchesBrand && matchesRegion && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif" data-testid="text-projects-title">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your project-based workflows</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="no-default-hover-elevate"
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("calendar")}
              className="no-default-hover-elevate"
              data-testid="button-view-calendar"
            >
              <Calendar className="w-4 h-4" />
            </Button>
          </div>
          <GlassButton
            onClick={handleOpenModal}
            variant="info"
            size="sm"
            contentClassName="flex items-center gap-2"
            data-testid="button-create-project"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </GlassButton>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-projects"
              />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-40" data-testid="select-brand-filter">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-40" data-testid="select-region-filter">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {viewMode === "calendar" && (
        <ProjectCalendarView
          projects={filteredProjects || []}
          brands={brands || []}
          onProjectClick={(id) => setSelectedProjectId(id)}
        />
      )}

      {viewMode === "list" && (projectsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-2 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects && filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const brand = brands?.find((b) => b.id === project.brandId);
            const region = regions?.find((r) => r.id === project.regionId);
            const projectDeliverables = project.deliverables || [];
            const total = projectDeliverables.length;
            const completed = projectDeliverables.filter((d) => d.currentStage === 'COMPLETED').length;
            const inDesign = projectDeliverables.filter((d) => d.currentStage === 'DESIGN').length;
            const inCopy = projectDeliverables.filter((d) => d.currentStage === 'COPYWRITING').length;
            const inPublishing = projectDeliverables.filter((d) => d.currentStage === 'PUBLISHING').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <Card
                key={project.id}
                className="hover-elevate cursor-pointer transition-colors"
                onClick={() => setSelectedProjectId(project.id)}
                data-testid={`card-project-${project.id}`}
              >
                <CardContent className="pt-6 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground truncate" data-testid={`text-project-name-${project.id}`}>
                    {project.name}
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {brand && (
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-brand-${project.id}`}>
                        <span
                          className="w-2 h-2 rounded-full mr-1.5 inline-block flex-shrink-0"
                          style={{ backgroundColor: brand.color }}
                        />
                        {brand.name}
                      </Badge>
                    )}
                    {region && (
                      <Badge variant="outline" className="text-xs" data-testid={`badge-region-${project.id}`}>
                        {region.name}
                      </Badge>
                    )}
                    {project.isCompleted && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        Completed
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground" data-testid={`text-dates-${project.id}`}>
                    {project.startDate && project.endDate
                      ? `${format(new Date(project.startDate), "MMM d, yyyy")} - ${format(new Date(project.endDate), "MMM d, yyyy")}`
                      : "No dates set"}
                  </p>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-xs text-muted-foreground">{completed} / {total}</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Palette className="w-3 h-3" />
                      Design: {inDesign}
                    </span>
                    <span className="flex items-center gap-1">
                      <PenTool className="w-3 h-3" />
                      Copy: {inCopy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      Publishing: {inPublishing}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Done: {completed}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No projects found</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery || brandFilter !== "all" || regionFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first project to get started"}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Set up a new project with deliverables and team assignments.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Q1 Social Campaign" {...field} data-testid="input-project-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional project description..." {...field} data-testid="input-project-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project-brand">
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands?.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                                {b.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project-region">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {regions?.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="campaignId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-campaign">
                          <SelectValue placeholder="Select campaign (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Campaign</SelectItem>
                        {campaigns?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="useDateRange"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-date-range"
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Set date range</FormLabel>
                    </FormItem>
                  )}
                />
                {useDateRange && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-start-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">Deliverables</h4>
                  {totalDeliverables > 0 && (
                    <Badge variant="secondary" className="text-xs">{totalDeliverables} total</Badge>
                  )}
                </div>

                <div className="space-y-1 border rounded-md">
                  {CATEGORIES.map((category) => {
                    const items = DELIVERABLE_TYPES.filter((d) => d.category === category);
                    const isExpanded = expandedCategories[category];
                    const categoryCount = items.reduce((sum, item) => sum + (deliverableCounts[item.type] || 0), 0);

                    return (
                      <div key={category}>
                        <button
                          type="button"
                          className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-foreground hover-elevate rounded-md"
                          onClick={() => toggleCategory(category)}
                          data-testid={`button-toggle-${category.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <span className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {category}
                          </span>
                          {categoryCount > 0 && (
                            <Badge variant="secondary" className="text-xs">{categoryCount}</Badge>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="pb-2 px-3 space-y-1">
                            {items.map((item) => {
                              const count = deliverableCounts[item.type] || 0;
                              const Icon = item.icon;
                              return (
                                <div
                                  key={item.type}
                                  className="flex items-center justify-between py-1.5 pl-6 pr-1"
                                  data-testid={`deliverable-row-${item.type}`}
                                >
                                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => updateDeliverableCount(item.type, -1)}
                                      disabled={count === 0}
                                      data-testid={`button-minus-${item.type}`}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="w-8 text-center text-sm font-medium tabular-nums" data-testid={`count-${item.type}`}>
                                      {count}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => updateDeliverableCount(item.type, 1)}
                                      data-testid={`button-plus-${item.type}`}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {totalDeliverables > 0 && (
                  <div className="mt-3 space-y-3">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Design Details</h5>
                    {Object.entries(deliverableCounts)
                      .filter(([, count]) => count > 0)
                      .map(([type]) => {
                        const config = DELIVERABLE_TYPES.find(d => d.type === type);
                        if (!config) return null;
                        const Icon = config.icon;
                        return (
                          <div key={type} className="border rounded-md p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Icon className="w-4 h-4" />
                              {config.label}
                            </div>
                            <div className="space-y-2">
                              <div>
                                <label className="text-xs text-muted-foreground">Design Specs / Dimensions</label>
                                <Textarea
                                  value={deliverableSpecs[type] || ""}
                                  onChange={(e) => setDeliverableSpecs(prev => ({ ...prev, [type]: e.target.value }))}
                                  placeholder="e.g., Desktop: 1920x600px, Mobile: 750x1200px"
                                  className="mt-1 text-sm"
                                  rows={2}
                                  data-testid={`input-specs-${type}`}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Designer Deadline</label>
                                <Input
                                  type="date"
                                  value={deliverableDeadlines[type] || ""}
                                  onChange={(e) => setDeliverableDeadlines(prev => ({ ...prev, [type]: e.target.value }))}
                                  className="mt-1"
                                  data-testid={`input-deadline-${type}`}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Default Team Assignments</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="defaultDesignerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designer</FormLabel>
                        <FormControl>
                          <UserAutocomplete
                            users={users}
                            value={field.value || null}
                            onSelect={(userId) => field.onChange(userId)}
                            onClear={() => field.onChange("none")}
                            placeholder="Type to search..."
                            data-testid="select-default-designer"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultCopywriterId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Copywriter</FormLabel>
                        <FormControl>
                          <UserAutocomplete
                            users={users}
                            value={field.value || null}
                            onSelect={(userId) => field.onChange(userId)}
                            onClear={() => field.onChange("none")}
                            placeholder="Type to search..."
                            data-testid="select-default-copywriter"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultPublisherId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publisher</FormLabel>
                        <FormControl>
                          <UserAutocomplete
                            users={users}
                            value={field.value || null}
                            onSelect={(userId) => field.onChange(userId)}
                            onClear={() => field.onChange("none")}
                            placeholder="Type to search..."
                            data-testid="select-default-publisher"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  data-testid="button-cancel-project"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-project"
                >
                  {createMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ProjectDetailModal
        projectId={selectedProjectId}
        open={!!selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
      />
    </div>
  );
}

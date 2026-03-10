import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Plus,
  Calendar,
  List,
  Filter,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Instagram,
  Facebook,
  Copy,
  Eye,
  BarChart3,
  Send,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { RecurrenceSelector, type RecurrenceSettings } from "@/components/recurrence-selector";
import { PostPreview } from "@/components/post-preview";
import { PerformanceForm } from "@/components/performance-form";
import { SiTiktok } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/ui/glass-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, getStatusVariant } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DuplicateDialog } from "@/components/duplicate-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Users, Tag, X } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import type { SocialPost, Brand, Region, Campaign, User, CollaborationProfile, PostTag } from "@shared/schema";

interface MetaPageMappingOption {
  id: string;
  pageId: string;
  pageName: string;
  instagramBusinessAccountId: string | null;
  regionId: string | null;
}

const socialPostFormSchema = z.object({
  brandId: z.string().min(1, "Brand is required"),
  regionId: z.string().min(1, "Region is required"),
  metaPageId: z.string().optional(),
  campaignId: z.string().optional(),
  platform: z.enum(["TIKTOK", "INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER", "REDNOTE"]),
  postFormat: z.enum(["POST", "CAROUSEL", "REEL", "VIDEO"]),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
  caption: z.string().optional(),
  keyMessage: z.enum(["RETAILER_SUPPORT", "PRODUCT_EDUCATION", "BRAND_STORY", "LAUNCH"]).optional(),
  assetStatus: z.enum(["PENDING", "IN_DESIGN", "FINAL", "PENDING_APPROVAL", "APPROVED", "NEEDS_REVISION"]),
  copyStatus: z.enum(["DRAFT", "APPROVED", "POSTED"]),
  designerId: z.string().optional(),
  publisherId: z.string().optional(),
  copywriterId: z.string().optional(),
});

type SocialPostFormData = z.infer<typeof socialPostFormSchema>;

const platformIcons: Record<string, React.ElementType> = {
  TIKTOK: SiTiktok,
  INSTAGRAM: Instagram,
  FACEBOOK: Facebook,
  REDNOTE: BookOpen,
};

const platformColors: Record<string, string> = {
  TIKTOK: "#000000",
  INSTAGRAM: "#E4405F",
  FACEBOOK: "#1877F2",
  REDNOTE: "#FF2442",
};

export default function SocialPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { user } = useAuthStore();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>(user?.regionId || "all");
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatingPost, setDuplicatingPost] = useState<SocialPost | null>(null);
  const [recurrenceSettings, setRecurrenceSettings] = useState<RecurrenceSettings | undefined>(undefined);
  const [previewPost, setPreviewPost] = useState<SocialPost | null>(null);
  const [performancePost, setPerformancePost] = useState<SocialPost | null>(null);
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const { toast } = useToast();

  // Auto-open modal when ?new=true is in URL
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get("new") === "true") {
      setIsModalOpen(true);
      setEditingPost(null);
      setRecurrenceSettings(undefined);
      // Clear the query param from URL
      setLocation("/social", { replace: true });
    }
  }, [searchString, setLocation]);

  const { data: posts, isLoading: postsLoading } = useQuery<SocialPost[]>({
    queryKey: ["/api/social-posts"],
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

  const { data: collaborationProfiles } = useQuery<CollaborationProfile[]>({
    queryKey: ["/api/collaboration-profiles"],
  });

  const { data: allTags } = useQuery<PostTag[]>({
    queryKey: ["/api/post-tags"],
  });

  const { data: taggedPostIds } = useQuery<string[]>({
    queryKey: [`/api/post-tags/${tagFilter}/posts`],
    enabled: tagFilter !== "all",
  });

  const { data: postCollaborations } = useQuery<{ profile: CollaborationProfile }[]>({
    queryKey: [`/api/social/${editingPost?.id}/collaborations`],
    enabled: !!editingPost,
  });

  const { data: postTagRelations } = useQuery<{ tag: PostTag }[]>({
    queryKey: [`/api/social/${editingPost?.id}/tags`],
    enabled: !!editingPost,
  });

  useEffect(() => {
    if (postCollaborations) {
      setSelectedCollaborators(postCollaborations.map(pc => pc.profile.id));
    } else {
      setSelectedCollaborators([]);
    }
  }, [postCollaborations]);

  useEffect(() => {
    if (postTagRelations) {
      setSelectedTags(postTagRelations.map(pt => pt.tag.id));
    } else {
      setSelectedTags([]);
    }
  }, [postTagRelations]);

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/post-tags", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-tags"] });
    },
  });

  const { data: metaPageMappings } = useQuery<MetaPageMappingOption[]>({
    queryKey: ["/api/meta/page-mappings"],
  });

  const form = useForm<SocialPostFormData>({
    resolver: zodResolver(socialPostFormSchema),
    defaultValues: {
      brandId: "",
      regionId: user?.regionId || "",
      metaPageId: "",
      campaignId: "",
      platform: "INSTAGRAM",
      postFormat: "POST",
      scheduledDate: "",
      caption: "",
      assetStatus: "PENDING",
      copyStatus: "DRAFT",
      designerId: "",
      publisherId: "",
      copywriterId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SocialPostFormData & { recurrence?: RecurrenceSettings }) => {
      const { recurrence, ...postData } = data;
      return await apiRequest("POST", "/api/social-posts", {
        ...postData,
        campaignId: postData.campaignId || null,
        keyMessage: postData.keyMessage || null,
        metaPageId: postData.metaPageId && postData.metaPageId !== "none" ? postData.metaPageId : null,
        scheduledDate: new Date(postData.scheduledDate).toISOString(),
        designerId: postData.designerId && postData.designerId !== "none" ? postData.designerId : null,
        publisherId: postData.publisherId && postData.publisherId !== "none" ? postData.publisherId : null,
        recurrence: recurrence?.enabled ? recurrence : undefined,
      });
    },
    onSuccess: async (response: any) => {
      const postId = response?.id || response?.posts?.[0]?.id;
      if (postId && (selectedCollaborators.length > 0 || selectedTags.length > 0)) {
        if (selectedCollaborators.length > 0) {
          await apiRequest("PUT", `/api/social/${postId}/collaborations`, { profileIds: selectedCollaborators });
        }
        if (selectedTags.length > 0) {
          await apiRequest("PUT", `/api/social/${postId}/tags`, { tagIds: selectedTags });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      setIsModalOpen(false);
      form.reset();
      setRecurrenceSettings(undefined);
      setSelectedCollaborators([]);
      setSelectedTags([]);
      const message = response?.count 
        ? `Created ${response.count} recurring posts successfully`
        : "Social post created successfully";
      toast({ title: "Success", description: message });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SocialPostFormData & { id: string }) => {
      const { id, ...rest } = data;
      await apiRequest("PUT", `/api/social-posts/${id}`, {
        ...rest,
        campaignId: rest.campaignId || null,
        keyMessage: rest.keyMessage || null,
        metaPageId: rest.metaPageId && rest.metaPageId !== "none" ? rest.metaPageId : null,
        scheduledDate: new Date(rest.scheduledDate).toISOString(),
        designerId: rest.designerId && rest.designerId !== "none" ? rest.designerId : null,
        publisherId: rest.publisherId && rest.publisherId !== "none" ? rest.publisherId : null,
      });
      await apiRequest("PUT", `/api/social/${id}/collaborations`, { profileIds: selectedCollaborators });
      await apiRequest("PUT", `/api/social/${id}/tags`, { tagIds: selectedTags });
      return id;
    },
    onSuccess: (postId: string) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      queryClient.invalidateQueries({ queryKey: [`/api/social/${postId}/collaborations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/social/${postId}/tags`] });
      setIsModalOpen(false);
      setEditingPost(null);
      form.reset();
      setSelectedCollaborators([]);
      setSelectedTags([]);
      toast({ title: "Success", description: "Social post updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/social-posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      toast({ title: "Success", description: "Social post deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const publishToMetaMutation = useMutation({
    mutationFn: async (postId: string) => {
      return await apiRequest("POST", `/api/meta/publish/${postId}`) as any;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      toast({ title: "Published!", description: "Post published to Meta successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Publish Failed", description: error.message, variant: "destructive" });
    },
  });

  const fetchAnalyticsMutation = useMutation({
    mutationFn: async (postId: string) => {
      return await apiRequest("POST", `/api/meta/fetch-analytics/${postId}`) as any;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/top-performing"] });
      toast({ title: "Analytics Updated", description: "Engagement metrics have been refreshed" });
    },
    onError: (error: Error) => {
      toast({ title: "Analytics Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenModal = (post?: SocialPost) => {
    if (post) {
      setEditingPost(post);
      form.reset({
        brandId: post.brandId,
        regionId: post.regionId,
        metaPageId: (post as any).metaPageId || "",
        campaignId: post.campaignId || "",
        platform: post.platform,
        postFormat: post.postFormat,
        scheduledDate: format(new Date(post.scheduledDate), "yyyy-MM-dd'T'HH:mm"),
        caption: post.caption || "",
        keyMessage: post.keyMessage || undefined,
        assetStatus: post.assetStatus,
        copyStatus: post.copyStatus,
        designerId: post.designerId || "",
        publisherId: post.publisherId || "",
        copywriterId: (post as any).copywriterId || "",
      });
    } else {
      setEditingPost(null);
      form.reset();
      setRecurrenceSettings(undefined);
      setSelectedCollaborators([]);
      setSelectedTags([]);
    }
    setIsModalOpen(true);
  };

  const onSubmit = (data: SocialPostFormData) => {
    if (editingPost) {
      updateMutation.mutate({ ...data, id: editingPost.id });
    } else {
      const payload = recurrenceSettings?.enabled 
        ? { ...data, recurrence: recurrenceSettings }
        : data;
      createMutation.mutate(payload);
    }
  };

  const filteredPosts = posts?.filter((post) => {
    const matchesSearch = !searchQuery || post.caption?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === "all" || post.platform === platformFilter;
    const matchesBrand = brandFilter === "all" || post.brandId === brandFilter;
    const matchesRegion = regionFilter === "all" || post.regionId === regionFilter;
    const matchesTag = tagFilter === "all" || (taggedPostIds && taggedPostIds.includes(post.id));
    return matchesSearch && matchesPlatform && matchesBrand && matchesRegion && matchesTag;
  });

  const calendarEvents = filteredPosts?.map((post) => {
    const brand = brands?.find((b) => b.id === post.brandId);
    return {
      id: post.id,
      title: `${post.platform} - ${brand?.name || "Unknown"}`,
      start: post.scheduledDate,
      backgroundColor: platformColors[post.platform] || "#F7971C",
      borderColor: platformColors[post.platform] || "#F7971C",
      extendedProps: { post },
    };
  });

  const handleEventDrop = (info: any) => {
    const post = info.event.extendedProps.post as SocialPost;
    updateMutation.mutate({
      ...post,
      scheduledDate: info.event.start.toISOString(),
      campaignId: post.campaignId || "",
      keyMessage: post.keyMessage || undefined,
      caption: post.caption || "",
    } as any);
  };

  const inProgressPosts = filteredPosts?.filter((post) => 
    post.assetStatus !== "FINAL" || post.copyStatus !== "APPROVED"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif">Social Media</h1>
          <p className="text-muted-foreground mt-1">Manage your social media content calendar</p>
        </div>
        <GlassButton
          onClick={() => handleOpenModal()}
          variant="info"
          size="sm"
          contentClassName="flex items-center gap-2"
          data-testid="button-create-social-post"
        >
          <Plus className="w-4 h-4" />
          <span>New Post</span>
        </GlassButton>
      </div>

      {inProgressPosts && inProgressPosts.length > 0 && (
        <Card className="border-brand-orange/20 bg-brand-orange/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
              In Progress Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressPosts.map((post) => {
                const brand = brands?.find((b) => b.id === post.brandId);
                const PlatformIcon = platformIcons[post.platform];
                return (
                  <div 
                    key={post.id}
                    className="p-3 rounded-lg border bg-card hover:border-brand-orange/50 transition-colors cursor-pointer"
                    onClick={() => handleOpenModal(post)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <PlatformIcon className="w-4 h-4" style={{ color: platformColors[post.platform] }} />
                        <span className="text-sm font-medium">{brand?.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(post.scheduledDate), "MMM d")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={getStatusVariant(post.assetStatus)} className="text-[10px]">
                        Asset: {post.assetStatus}
                      </StatusBadge>
                      <StatusBadge status={getStatusVariant(post.copyStatus)} className="text-[10px]">
                        Copy: {post.copyStatus}
                      </StatusBadge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={view === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("calendar")}
                className={view === "calendar" ? "bg-brand-orange hover:bg-brand-orange-dark" : ""}
                data-testid="button-calendar-view"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Calendar
              </Button>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("list")}
                className={view === "list" ? "bg-brand-orange hover:bg-brand-orange-dark" : ""}
                data-testid="button-list-view"
              >
                <List className="w-4 h-4 mr-1" />
                List
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="input-search-posts"
                />
              </div>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-36" data-testid="select-platform-filter">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  <SelectItem value="TIKTOK">TikTok</SelectItem>
                  <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                  <SelectItem value="TWITTER">Twitter/X</SelectItem>
                  <SelectItem value="REDNOTE">RedNote</SelectItem>
                </SelectContent>
              </Select>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-36" data-testid="select-brand-filter">
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
                <SelectTrigger className="w-36" data-testid="select-region-filter">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-36" data-testid="select-tag-filter">
                  <Tag className="w-4 h-4 mr-1" />
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {postsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : view === "calendar" ? (
            <div className="fc-wrapper">
              <style>{`
                .fc {
                  --fc-border-color: hsl(var(--border));
                  --fc-today-bg-color: rgba(247, 151, 28, 0.1);
                  --fc-event-border-color: transparent;
                }
                .fc-toolbar-title {
                  font-family: Poppins, sans-serif;
                  font-size: 1.25rem !important;
                  font-weight: 600;
                }
                .fc-button {
                  background-color: white !important;
                  border-color: hsl(var(--border)) !important;
                  color: hsl(var(--foreground)) !important;
                }
                .fc-button:hover {
                  background-color: hsl(var(--muted)) !important;
                }
                .fc-button-active {
                  background-color: #F7971C !important;
                  border-color: #F7971C !important;
                  color: white !important;
                }
                .fc-daygrid-day:hover {
                  background-color: hsl(var(--muted));
                }
                .fc-event {
                  cursor: pointer;
                  border-radius: 4px;
                  font-size: 0.75rem;
                  padding: 2px 4px;
                }
              `}</style>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek",
                }}
                events={calendarEvents}
                editable={true}
                droppable={true}
                eventDrop={handleEventDrop}
                eventClick={(info) => {
                  handleOpenModal(info.event.extendedProps.post);
                }}
                height="auto"
              />
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-brand-orange-light">
                    <TableHead>Platform</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Asset Status</TableHead>
                    <TableHead>Copy Status</TableHead>
                    <TableHead>Designer</TableHead>
                    <TableHead>Publisher</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts?.map((post, index) => {
                    const brand = brands?.find((b) => b.id === post.brandId);
                    const PlatformIcon = platformIcons[post.platform];
                    return (
                      <TableRow
                        key={post.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        data-testid={`row-social-post-${post.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PlatformIcon
                              className="w-4 h-4"
                              style={{ color: platformColors[post.platform] }}
                            />
                            <span>{post.platform}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{brand?.name || "-"}</TableCell>
                        <TableCell>
                          {format(new Date(post.scheduledDate), "MMM d, yyyy h:mm a")}
                        </TableCell>
                        <TableCell>{post.postFormat}</TableCell>
                        <TableCell>
                          <StatusBadge status={getStatusVariant(post.assetStatus)}>
                            {post.assetStatus}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={getStatusVariant(post.copyStatus)}>
                            {post.copyStatus}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {users?.find((u) => u.id === post.designerId)?.name || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {users?.find((u) => u.id === post.publisherId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-post-menu-${post.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setPreviewPost(post)} data-testid={`button-preview-${post.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setPerformancePost(post)} data-testid={`button-performance-${post.id}`}>
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Performance
                              </DropdownMenuItem>
                              {(post.platform === "FACEBOOK" || post.platform === "INSTAGRAM") && !(post as any).metaPostId && (
                                <DropdownMenuItem
                                  onClick={() => publishToMetaMutation.mutate(post.id)}
                                  disabled={publishToMetaMutation.isPending}
                                  data-testid={`button-publish-meta-${post.id}`}
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  {publishToMetaMutation.isPending ? "Publishing..." : "Publish to Meta"}
                                </DropdownMenuItem>
                              )}
                              {(post as any).metaPostId && (
                                <DropdownMenuItem
                                  onClick={() => fetchAnalyticsMutation.mutate(post.id)}
                                  disabled={fetchAnalyticsMutation.isPending}
                                  data-testid={`button-fetch-analytics-${post.id}`}
                                >
                                  <TrendingUp className="w-4 h-4 mr-2" />
                                  {fetchAnalyticsMutation.isPending ? "Fetching..." : "Refresh Analytics"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleOpenModal(post)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setDuplicatingPost(post);
                                  setDuplicateDialogOpen(true);
                                }}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate to Regions
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteMutation.mutate(post.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!filteredPosts || filteredPosts.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No social posts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit Social Post" : "Create Social Post"}</DialogTitle>
            <DialogDescription>
              {editingPost ? "Update the social post details" : "Add a new post to your content calendar"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-brand">
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands?.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
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
                      <FormLabel>Region</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-region">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {regions?.map((region) => (
                            <SelectItem key={region.id} value={region.id}>
                              {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {metaPageMappings && metaPageMappings.length > 0 && (
                <FormField
                  control={form.control}
                  name="metaPageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Account (Facebook/Instagram)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-meta-page">
                            <SelectValue placeholder="Auto (by region)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Auto (based on region)</SelectItem>
                          {metaPageMappings.map((page) => (
                            <SelectItem key={page.id} value={page.id}>
                              {page.pageName}
                              {page.instagramBusinessAccountId ? " (FB + IG)" : " (FB only)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-platform">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                          <SelectItem value="TIKTOK">TikTok</SelectItem>
                          <SelectItem value="FACEBOOK">Facebook</SelectItem>
                          <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                          <SelectItem value="TWITTER">Twitter/X</SelectItem>
                          <SelectItem value="REDNOTE">RedNote</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Format</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-format">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="POST">Post</SelectItem>
                          <SelectItem value="CAROUSEL">Carousel</SelectItem>
                          <SelectItem value="REEL">Reel</SelectItem>
                          <SelectItem value="VIDEO">Video</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Date & Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        data-testid="input-scheduled-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="caption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Caption</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter post caption..."
                        rows={4}
                        {...field}
                        data-testid="input-caption"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assetStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-asset-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="IN_DESIGN">In Design</SelectItem>
                          <SelectItem value="FINAL">Final</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="copyStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Copy Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-copy-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="APPROVED">Approved</SelectItem>
                          <SelectItem value="POSTED">Posted</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="designerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-designer">
                            <SelectValue placeholder="Assign designer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No designer</SelectItem>
                          {users?.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
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
                  name="publisherId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Social Media Publisher</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-publisher">
                            <SelectValue placeholder="Assign publisher" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No publisher</SelectItem>
                          {users?.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
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
                name="copywriterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Copywriter</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-copywriter">
                          <SelectValue placeholder="Assign copywriter" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No copywriter</SelectItem>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Collaborators
                  </Label>
                  <Select
                    value=""
                    onValueChange={(val) => {
                      if (val && !selectedCollaborators.includes(val)) {
                        setSelectedCollaborators(prev => [...prev, val]);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-collaborator">
                      <SelectValue placeholder="Add collaborator..." />
                    </SelectTrigger>
                    <SelectContent>
                      {collaborationProfiles?.filter(p => !selectedCollaborators.includes(p.id)).map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name} ({profile.type})
                        </SelectItem>
                      ))}
                      {(!collaborationProfiles || collaborationProfiles.filter(p => !selectedCollaborators.includes(p.id)).length === 0) && (
                        <SelectItem value="_empty" disabled>No collaborators available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedCollaborators.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedCollaborators.map((id) => {
                        const profile = collaborationProfiles?.find(p => p.id === id);
                        return (
                          <Badge key={id} variant="secondary" data-testid={`badge-collaborator-${id}`}>
                            {profile?.name || id}
                            <button
                              type="button"
                              onClick={() => setSelectedCollaborators(prev => prev.filter(c => c !== id))}
                              className="ml-1"
                              data-testid={`button-remove-collaborator-${id}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value=""
                      onValueChange={(val) => {
                        if (val && !selectedTags.includes(val)) {
                          setSelectedTags(prev => [...prev, val]);
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1" data-testid="select-tag">
                        <SelectValue placeholder="Add tag..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allTags?.filter(t => !selectedTags.includes(t.id)).map((tag) => (
                          <SelectItem key={tag.id} value={tag.id}>
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#6B7280' }} />
                              {tag.name}
                            </span>
                          </SelectItem>
                        ))}
                        {(!allTags || allTags.filter(t => !selectedTags.includes(t.id)).length === 0) && (
                          <SelectItem value="_empty" disabled>No tags available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Input
                        placeholder="New tag..."
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        className="w-32"
                        data-testid="input-new-tag"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!newTagName.trim() || createTagMutation.isPending}
                        onClick={async () => {
                          if (newTagName.trim()) {
                            const result: any = await createTagMutation.mutateAsync(newTagName.trim());
                            if (result?.id) {
                              setSelectedTags(prev => [...prev, result.id]);
                            }
                            setNewTagName("");
                          }
                        }}
                        data-testid="button-create-tag"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((id) => {
                        const tag = allTags?.find(t => t.id === id);
                        return (
                          <Badge
                            key={id}
                            variant="secondary"
                            style={{ borderLeft: `3px solid ${tag?.color || '#6B7280'}` }}
                            data-testid={`badge-tag-${id}`}
                          >
                            {tag?.name || id}
                            <button
                              type="button"
                              onClick={() => setSelectedTags(prev => prev.filter(t => t !== id))}
                              className="ml-1"
                              data-testid={`button-remove-tag-${id}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {!editingPost && (
                <div className="border-t pt-4">
                  <RecurrenceSelector
                    value={recurrenceSettings || { enabled: false, frequency: "WEEKLY" as const, interval: 1, occurrences: 4, daysOfWeek: [], dayOfMonth: null, endDate: null }}
                    onChange={setRecurrenceSettings}
                  />
                </div>
              )}
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-orange hover:bg-brand-orange-dark"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-post"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : (recurrenceSettings?.enabled && !editingPost ? "Create Recurring Posts" : "Save Post")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {duplicatingPost && (
        <DuplicateDialog
          open={duplicateDialogOpen}
          onOpenChange={(open) => {
            setDuplicateDialogOpen(open);
            if (!open) setDuplicatingPost(null);
          }}
          itemId={duplicatingPost.id}
          itemName={`${duplicatingPost.platform} Post`}
          entityType="social-posts"
          currentRegionId={duplicatingPost.regionId}
        />
      )}

      {previewPost && (
        <PostPreview
          post={{ ...previewPost, brand: brands?.find(b => b.id === previewPost.brandId) || null }}
          open={!!previewPost}
          onClose={() => setPreviewPost(null)}
        />
      )}

      {performancePost && (
        <PerformanceForm
          post={{ ...performancePost, brand: brands?.find(b => b.id === performancePost.brandId) || null }}
          open={!!performancePost}
          onClose={() => setPerformancePost(null)}
        />
      )}
    </div>
  );
}

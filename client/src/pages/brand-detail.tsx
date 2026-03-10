import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ArrowLeft, ExternalLink, Tag, Mail, Image, TrendingUp, Plus, Percent, DollarSign, Gift, Package, Trash2, CalendarDays, Activity, Share2, CheckSquare, Folder, Video, File, FileText, MoreVertical, Edit, Search, Filter, Grid, List } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuthStore } from "@/lib/auth-store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import type { Brand, Promotion, SocialPost, EmailCampaign, AssetLibraryItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { UnifiedCalendar } from "@/components/unified-calendar";

interface BrandDetailResponse {
  brand: Brand;
  stats: {
    totalPromotions: number;
    activePromotions: number;
    totalPosts: number;
    totalEmails: number;
    totalAssets: number;
    totalTasks: number;
    postsThisMonth: number;
    scheduledPosts: number;
    completedTasks: number;
  };
  promotions: Promotion[];
  upcomingPosts: SocialPost[];
  upcomingEmails: EmailCampaign[];
}

interface ActivityItem {
  id: string;
  type: 'social' | 'email' | 'event' | 'task';
  title: string;
  description?: string;
  status: string;
  createdAt: string;
}

const promotionFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "BOGO", "OTHER"]),
  discountValue: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  status: z.enum(["ACTIVE", "SCHEDULED", "ENDED"]),
});

type PromotionFormData = z.infer<typeof promotionFormSchema>;

export default function BrandDetailPage() {
  const [, params] = useRoute("/brands/:id");
  const brandId = params?.id;
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [assetView, setAssetView] = useState<"grid" | "list">("grid");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery<BrandDetailResponse>({
    queryKey: ['/api/brands', brandId, 'detail'],
    queryFn: async () => {
      const res = await fetch(`/api/brands/${brandId}/detail`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch brand');
      return res.json();
    },
    enabled: !!brandId && !!token,
  });

  const { data: activityData } = useQuery<ActivityItem[]>({
    queryKey: ['/api/brands', brandId, 'activity'],
    queryFn: async () => {
      const res = await fetch(`/api/brands/${brandId}/activity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch activity');
      return res.json();
    },
    enabled: !!brandId && !!token,
  });

  const { data: allAssets } = useQuery<AssetLibraryItem[]>({
    queryKey: ['/api/assets'],
  });

  const brandAssets = allAssets?.filter(asset => asset.brandId === brandId) || [];
  
  const filteredAssets = brandAssets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
      asset.description?.toLowerCase().includes(assetSearch.toLowerCase());
    const matchesType = assetTypeFilter === "all" || asset.assetType === assetTypeFilter;
    return matchesSearch && matchesType;
  });

  const assetTypeIcons: Record<string, React.ElementType> = {
    GRAPHIC: Image,
    DATA: FileText,
    EMAIL_TEMPLATE: Mail,
    VIDEO: Video,
    DOCUMENT: File,
  };

  const assetTypeColors: Record<string, string> = {
    GRAPHIC: "#E4405F",
    DATA: "#10B981",
    EMAIL_TEMPLATE: "#F59E0B",
    VIDEO: "#6366F1",
    DOCUMENT: "#3B82F6",
  };

  const promotionForm = useForm<PromotionFormData>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      name: "",
      description: "",
      discountType: "PERCENTAGE",
      discountValue: "",
      startDate: "",
      endDate: "",
      status: "SCHEDULED",
    },
  });

  const createPromotionMutation = useMutation({
    mutationFn: (data: PromotionFormData) =>
      apiRequest("POST", "/api/promotions", {
        ...data,
        brandId,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brands', brandId, 'detail'] });
      setIsPromotionModalOpen(false);
      promotionForm.reset();
      toast({ title: "Promotion created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create promotion", variant: "destructive" });
    },
  });

  const updatePromotionMutation = useMutation({
    mutationFn: (data: PromotionFormData) =>
      apiRequest("PUT", `/api/promotions/${editingPromotion?.id}`, {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brands', brandId, 'detail'] });
      setIsPromotionModalOpen(false);
      setEditingPromotion(null);
      promotionForm.reset();
      toast({ title: "Promotion updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update promotion", variant: "destructive" });
    },
  });

  const deletePromotionMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/promotions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brands', brandId, 'detail'] });
      toast({ title: "Promotion deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete promotion", variant: "destructive" });
    },
  });

  const handleOpenPromotionModal = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
      promotionForm.reset({
        name: promotion.name,
        description: promotion.description || "",
        discountType: promotion.discountType,
        discountValue: promotion.discountValue || "",
        startDate: format(new Date(promotion.startDate), "yyyy-MM-dd"),
        endDate: format(new Date(promotion.endDate), "yyyy-MM-dd"),
        status: promotion.status,
      });
    } else {
      setEditingPromotion(null);
      promotionForm.reset();
    }
    setIsPromotionModalOpen(true);
  };

  const onPromotionSubmit = (formData: PromotionFormData) => {
    if (editingPromotion) {
      updatePromotionMutation.mutate(formData);
    } else {
      createPromotionMutation.mutate(formData);
    }
  };

  const getDiscountIcon = (type: string) => {
    switch (type) {
      case "PERCENTAGE": return <Percent className="w-4 h-4" />;
      case "FIXED_AMOUNT": return <DollarSign className="w-4 h-4" />;
      case "BOGO": return <Gift className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-500/10 text-green-600 border-green-500/30";
      case "SCHEDULED": return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      case "ENDED": return "bg-gray-500/10 text-gray-600 border-gray-500/30";
      default: return "";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'social': return <Share2 className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'event': return <CalendarDays className="w-4 h-4" />;
      case 'task': return <CheckSquare className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'PUBLISHED':
      case 'COMPLETED':
      case 'APPROVED':
      case 'DONE':
      case 'FINAL':
        return 'default';
      case 'PENDING_APPROVAL':
      case 'IN_PROGRESS':
      case 'REVIEW':
        return 'secondary';
      case 'REJECTED':
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Brand not found</p>
          <Link href="/">
            <Button variant="ghost">Back to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { brand, stats, promotions, upcomingPosts, upcomingEmails } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl shadow-lg"
              style={{ backgroundColor: brand.color }}
            />
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-brand-name">{brand.name}</h1>
              <p className="text-muted-foreground">Marketing Plan & Calendar</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {brand.dreamPimUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(brand.dreamPimUrl!, "_blank")}
              data-testid="button-dreampim"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              DreamPIM
            </Button>
          )}
          {brand.assetPortalUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(brand.assetPortalUrl!, "_blank")}
              data-testid="button-asset-portal"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {brand.assetPortalName || "Asset Portal"}
            </Button>
          )}
          <Button size="sm" data-testid="button-new-content">
            <Plus className="w-4 h-4 mr-2" />
            New Content
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-posts-this-month">{stats.postsThisMonth}</p>
                <p className="text-sm text-muted-foreground">Posts This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Share2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-scheduled-posts">{stats.scheduledPosts}</p>
                <p className="text-sm text-muted-foreground">Scheduled Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Tag className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-active-promotions">{stats.activePromotions}</p>
                <p className="text-sm text-muted-foreground">Active Promotions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <CheckSquare className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-completed-tasks">{stats.completedTasks}</p>
                <p className="text-sm text-muted-foreground">Completed Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar" className="flex items-center gap-2" data-testid="tab-calendar">
            <Calendar className="w-4 h-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="promotions" className="flex items-center gap-2" data-testid="tab-promotions">
            <Tag className="w-4 h-4" />
            Promotions
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2" data-testid="tab-activity">
            <Activity className="w-4 h-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2" data-testid="tab-assets">
            <Folder className="w-4 h-4" />
            Assets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{brand.name} Marketing Calendar</CardTitle>
                <p className="text-sm text-muted-foreground">Showing all content for this brand</p>
              </div>
            </CardHeader>
            <CardContent>
              <UnifiedCalendar brandId={brandId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Promotions</CardTitle>
                <CardDescription>Manage promotional campaigns for {brand.name}</CardDescription>
              </div>
              <Button
                onClick={() => handleOpenPromotionModal()}
                data-testid="button-add-promotion"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Promotion
              </Button>
            </CardHeader>
            <CardContent>
              {promotions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No promotions yet</p>
                  <p className="text-sm">Create a promotion to track discounts and campaigns</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {promotions.map(promotion => (
                    <div
                      key={promotion.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenPromotionModal(promotion)}
                      data-testid={`card-promotion-${promotion.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          {getDiscountIcon(promotion.discountType)}
                        </div>
                        <div>
                          <p className="font-medium">{promotion.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(promotion.startDate), "MMM d")} - {format(new Date(promotion.endDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {promotion.discountValue && (
                          <Badge variant="outline">
                            {promotion.discountType === "PERCENTAGE" ? `${promotion.discountValue}% off` :
                             promotion.discountType === "FIXED_AMOUNT" ? `$${promotion.discountValue} off` :
                             promotion.discountType === "BOGO" ? "BOGO" :
                             promotion.discountValue}
                          </Badge>
                        )}
                        <Badge className={getStatusColor(promotion.status)}>
                          {promotion.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this promotion?")) {
                              deletePromotionMutation.mutate(promotion.id);
                            }
                          }}
                          data-testid={`button-delete-promotion-${promotion.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates for {brand.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {!activityData || activityData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activityData.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-start gap-3 pb-4 border-b last:border-0"
                    >
                      <div className="flex-shrink-0 mt-1 p-2 bg-muted rounded-lg">
                        {getActivityIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant={getActivityBadgeVariant(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle>Assets</CardTitle>
                <CardDescription>Brand assets for {brand.name}</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    variant={assetView === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAssetView("grid")}
                    data-testid="button-grid-view"
                  >
                    <Grid className="w-4 h-4 mr-1" />
                    Grid
                  </Button>
                  <Button
                    variant={assetView === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAssetView("list")}
                    data-testid="button-list-view"
                  >
                    <List className="w-4 h-4 mr-1" />
                    List
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assets..."
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    className="pl-9 w-48"
                    data-testid="input-search-assets"
                  />
                </div>
                <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                  <SelectTrigger className="w-36" data-testid="select-asset-type-filter">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="GRAPHIC">Graphics</SelectItem>
                    <SelectItem value="DATA">Data Files</SelectItem>
                    <SelectItem value="EMAIL_TEMPLATE">Email Templates</SelectItem>
                    <SelectItem value="VIDEO">Videos</SelectItem>
                    <SelectItem value="DOCUMENT">Documents</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Folder className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No assets found for this brand</p>
                  <p className="text-sm text-muted-foreground mt-1">Add assets via the Brand Assets page</p>
                </div>
              ) : assetView === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredAssets.map((asset) => {
                    const TypeIcon = assetTypeIcons[asset.assetType];
                    return (
                      <Card
                        key={asset.id}
                        className="group relative overflow-visible hover-elevate cursor-pointer"
                        data-testid={`card-asset-${asset.id}`}
                      >
                        <div className="aspect-video bg-muted flex items-center justify-center relative rounded-t-lg overflow-hidden">
                          {asset.thumbnailUrl ? (
                            <img
                              src={asset.thumbnailUrl}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <TypeIcon
                              className="w-12 h-12"
                              style={{ color: assetTypeColors[asset.assetType] }}
                            />
                          )}
                          {asset.fileUrl && (
                            <div className="absolute top-2 right-2">
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => window.open(asset.fileUrl!, "_blank")}
                                data-testid={`button-open-asset-${asset.id}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <p className="font-medium text-sm truncate">{asset.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="outline" className="text-xs">
                              {asset.assetType.replace("_", " ")}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAssets.map((asset) => {
                    const TypeIcon = assetTypeIcons[asset.assetType];
                    return (
                      <div
                        key={asset.id}
                        className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        data-testid={`list-asset-${asset.id}`}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${assetTypeColors[asset.assetType]}20` }}
                        >
                          <TypeIcon
                            className="w-5 h-5"
                            style={{ color: assetTypeColors[asset.assetType] }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{asset.name}</p>
                          {asset.description && (
                            <p className="text-sm text-muted-foreground truncate">{asset.description}</p>
                          )}
                        </div>
                        <Badge variant="outline">
                          {asset.assetType.replace("_", " ")}
                        </Badge>
                        {asset.fileUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(asset.fileUrl!, "_blank")}
                            data-testid={`button-open-asset-list-${asset.id}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPromotionModalOpen} onOpenChange={setIsPromotionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPromotion ? "Edit Promotion" : "Add Promotion"}</DialogTitle>
            <DialogDescription>
              {editingPromotion ? "Update the promotion details" : "Create a new promotional campaign"}
            </DialogDescription>
          </DialogHeader>
          <Form {...promotionForm}>
            <form onSubmit={promotionForm.handleSubmit(onPromotionSubmit)} className="space-y-4">
              <FormField
                control={promotionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Summer Sale 2024" data-testid="input-promotion-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={promotionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional description" data-testid="input-promotion-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={promotionForm.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-discount-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                          <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                          <SelectItem value="BOGO">BOGO</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={promotionForm.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="20" data-testid="input-discount-value" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={promotionForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={promotionForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={promotionForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ENDED">Ended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPromotionModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPromotionMutation.isPending || updatePromotionMutation.isPending}
                  data-testid="button-save-promotion"
                >
                  {editingPromotion ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

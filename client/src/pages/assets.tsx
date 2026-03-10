import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Wand2,
  Image,
  FileText,
  Mail,
  Video,
  File,
  ExternalLink,
  Grid,
  List,
  Folder,
  BarChart3,
  Package,
  Globe,
  X,
  Play,
  FileImage,
  AlertCircle,
} from "lucide-react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CanvaSyncButton } from "@/components/canva-sync-button";
import type { AssetLibraryItem, Brand, Region } from "@shared/schema";

const assetFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  assetType: z.enum(["GRAPHIC", "DATA", "EMAIL_TEMPLATE", "VIDEO", "DOCUMENT"]),
  description: z.string().optional(),
  fileUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  thumbnailUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  content: z.string().optional(),
  brandId: z.string().optional().or(z.literal("")),
  tags: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetFormSchema>;

interface BrandRegion {
  id: string;
  brandId: string;
  regionId: string;
}

const assetTypeIcons: Record<string, React.ElementType> = {
  GRAPHIC: Image,
  DATA: FileText,
  EMAIL_TEMPLATE: Mail,
  VIDEO: Video,
  DOCUMENT: File,
};

const assetTypeLabels: Record<string, string> = {
  GRAPHIC: "Graphic",
  DATA: "Data File",
  EMAIL_TEMPLATE: "Email Template",
  VIDEO: "Video",
  DOCUMENT: "Document",
};

const assetTypeColors: Record<string, string> = {
  GRAPHIC: "#E4405F",
  DATA: "#10B981",
  EMAIL_TEMPLATE: "#F59E0B",
  VIDEO: "#6366F1",
  DOCUMENT: "#3B82F6",
};

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|tiff?)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi|mkv|m4v|ogv)$/i;

function getDisplayUrl(asset: AssetLibraryItem): string | null {
  if (asset.thumbnailUrl) return asset.thumbnailUrl;
  if (asset.canvaThumbnailUrl) return asset.canvaThumbnailUrl;
  if (asset.fileUrl && (IMAGE_EXTENSIONS.test(asset.fileUrl) || asset.assetType === "GRAPHIC")) {
    return asset.fileUrl;
  }
  return null;
}

function isVideoFile(asset: AssetLibraryItem): boolean {
  if (asset.assetType === "VIDEO") return true;
  if (asset.fileUrl && VIDEO_EXTENSIONS.test(asset.fileUrl)) return true;
  return false;
}

function AssetThumbnail({
  asset,
  size = "large",
}: {
  asset: AssetLibraryItem;
  size?: "large" | "small";
}) {
  const [imgError, setImgError] = useState(false);
  const displayUrl = getDisplayUrl(asset);
  const TypeIcon = assetTypeIcons[asset.assetType];
  const color = assetTypeColors[asset.assetType];
  const isVideo = isVideoFile(asset);
  const isLarge = size === "large";

  const handleError = useCallback(() => {
    setImgError(true);
  }, []);

  if (displayUrl && !imgError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={displayUrl}
          alt={asset.name}
          className={`${isLarge ? "w-full h-full" : "w-10 h-10 rounded-md"} object-cover`}
          onError={handleError}
          loading="lazy"
          data-testid={`img-asset-${asset.id}`}
        />
        {isVideo && isLarge && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-5 h-5 text-black ml-0.5" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isVideo && asset.fileUrl && !imgError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-muted">
        <video
          src={asset.fileUrl}
          className={`${isLarge ? "w-full h-full" : "w-10 h-10 rounded-md"} object-cover`}
          muted
          preload="metadata"
          onError={handleError}
          data-testid={`video-asset-${asset.id}`}
        />
        {isLarge && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-5 h-5 text-black ml-0.5" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${isLarge ? "" : "w-10 h-10 rounded-md"}`}
      style={isLarge ? undefined : { backgroundColor: `${color}20` }}
    >
      <TypeIcon
        className={isLarge ? "w-12 h-12" : "w-5 h-5"}
        style={{ color }}
      />
    </div>
  );
}

export default function AssetsPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetLibraryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [regionFilter, setRegionFilterState] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: assets, isLoading: assetsLoading } = useQuery<AssetLibraryItem[]>({
    queryKey: ["/api/assets"],
  });

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: brandRegions } = useQuery<BrandRegion[]>({
    queryKey: ["/api/brand-regions"],
  });

  const autoSortMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/assets/auto-sort", {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Auto-Sort Complete",
        description: data?.message || "Assets have been categorized.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Auto-Sort Failed",
        description: error.message || "Could not auto-sort assets.",
        variant: "destructive",
      });
    },
  });

  const brandMap = useMemo(() => {
    const map = new Map<string, Brand>();
    brands?.forEach((b) => map.set(b.id, b));
    return map;
  }, [brands]);

  const brandIdsByRegion = useMemo(() => {
    const map = new Map<string, Set<string>>();
    brandRegions?.forEach((br) => {
      if (!map.has(br.regionId)) map.set(br.regionId, new Set());
      map.get(br.regionId)!.add(br.brandId);
    });
    return map;
  }, [brandRegions]);

  const brandsForCurrentRegion = useMemo(() => {
    if (regionFilter === "all" || !brands) return brands || [];
    const regionBrandIds = brandIdsByRegion.get(regionFilter);
    if (!regionBrandIds) return brands;
    return brands.filter((b) => regionBrandIds.has(b.id));
  }, [brands, regionFilter, brandIdsByRegion]);

  const setRegionFilter = (value: string) => {
    setRegionFilterState(value);
    if (value !== "all" && brandFilter !== "all") {
      const regionBrandIds = brandIdsByRegion.get(value);
      if (regionBrandIds && !regionBrandIds.has(brandFilter)) {
        setBrandFilter("all");
      }
    }
  };

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      assetType: "GRAPHIC",
      description: "",
      fileUrl: "",
      thumbnailUrl: "",
      content: "",
      brandId: "",
      tags: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AssetFormData) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : [],
        brandId: data.brandId && data.brandId !== "none" ? data.brandId : null,
        fileUrl: data.fileUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
        content: data.content || null,
        description: data.description || null,
      };
      return await apiRequest("POST", "/api/assets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setIsModalOpen(false);
      form.reset();
      toast({ title: "Success", description: "Asset created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AssetFormData & { id: string }) => {
      const { id, ...rest } = data;
      const payload = {
        ...rest,
        tags: rest.tags ? rest.tags.split(",").map((t) => t.trim()) : [],
        brandId: rest.brandId && rest.brandId !== "none" ? rest.brandId : null,
        fileUrl: rest.fileUrl || null,
        thumbnailUrl: rest.thumbnailUrl || null,
        content: rest.content || null,
        description: rest.description || null,
      };
      return await apiRequest("PUT", `/api/assets/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setIsModalOpen(false);
      setEditingAsset(null);
      form.reset();
      toast({ title: "Success", description: "Asset updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Success", description: "Asset deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenModal = (asset?: AssetLibraryItem) => {
    if (asset) {
      setEditingAsset(asset);
      form.reset({
        name: asset.name,
        assetType: asset.assetType,
        description: asset.description || "",
        fileUrl: asset.fileUrl || "",
        thumbnailUrl: asset.thumbnailUrl || "",
        content: asset.content || "",
        brandId: asset.brandId || "",
        tags: asset.tags?.join(", ") || "",
      });
    } else {
      setEditingAsset(null);
      form.reset({
        name: "",
        assetType: "GRAPHIC",
        description: "",
        fileUrl: "",
        thumbnailUrl: "",
        content: "",
        brandId: brandFilter !== "all" ? brandFilter : "",
        tags: "",
      });
    }
    setIsModalOpen(true);
  };

  const onSubmit = (data: AssetFormData) => {
    if (editingAsset) {
      updateMutation.mutate({ ...data, id: editingAsset.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    return assets.filter((asset) => {
      const matchesSearch = !searchQuery ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === "all" || asset.assetType === typeFilter;
      const matchesBrand = brandFilter === "all" || asset.brandId === brandFilter;
      const matchesRegion = regionFilter === "all" || (
        brandIdsByRegion.size === 0 ? true :
        (asset.brandId ? (brandIdsByRegion.get(regionFilter)?.has(asset.brandId) ?? true) : false)
      );
      const matchesSource = sourceFilter === "all" ||
        (sourceFilter === "canva" && asset.canvaDesignId) ||
        (sourceFilter === "upload" && !asset.canvaDesignId);
      return matchesSearch && matchesType && matchesBrand && matchesRegion && matchesSource;
    });
  }, [assets, searchQuery, typeFilter, brandFilter, regionFilter, sourceFilter, brandIdsByRegion]);

  const activeFilterCount = [typeFilter, brandFilter, regionFilter, sourceFilter].filter(f => f !== "all").length;

  const stats = useMemo(() => {
    const list = filteredAssets;
    return {
      total: list.length,
      graphics: list.filter((a) => a.assetType === "GRAPHIC").length,
      videos: list.filter((a) => a.assetType === "VIDEO").length,
      documents: list.filter((a) => a.assetType === "DOCUMENT").length,
      emailTemplates: list.filter((a) => a.assetType === "EMAIL_TEMPLATE").length,
      dataFiles: list.filter((a) => a.assetType === "DATA").length,
    };
  }, [filteredAssets]);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setBrandFilter("all");
    setRegionFilterState("all");
    setSourceFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif" data-testid="text-page-title">Asset Library</h1>
          <p className="text-muted-foreground mt-1">Browse and manage all marketing assets across brands and regions</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CanvaSyncButton compact />
          <Button
            variant="outline"
            size="sm"
            onClick={() => autoSortMutation.mutate()}
            disabled={autoSortMutation.isPending}
            data-testid="button-auto-sort"
          >
            <Wand2 className={`w-3.5 h-3.5 mr-1.5 ${autoSortMutation.isPending ? "animate-spin" : ""}`} />
            {autoSortMutation.isPending ? "Sorting..." : "Auto-Sort"}
          </Button>
          <GlassButton
            onClick={() => handleOpenModal()}
            variant="warning"
            size="sm"
            contentClassName="flex items-center gap-2"
            data-testid="button-add-asset"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </GlassButton>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card
          className={`cursor-pointer hover-elevate ${typeFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setTypeFilter("all")}
          data-testid="stat-total"
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover-elevate ${typeFilter === "GRAPHIC" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setTypeFilter(typeFilter === "GRAPHIC" ? "all" : "GRAPHIC")}
          data-testid="stat-graphics"
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: `${assetTypeColors.GRAPHIC}20` }}>
                <Image className="w-4 h-4" style={{ color: assetTypeColors.GRAPHIC }} />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.graphics}</p>
                <p className="text-xs text-muted-foreground">Graphics</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover-elevate ${typeFilter === "VIDEO" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setTypeFilter(typeFilter === "VIDEO" ? "all" : "VIDEO")}
          data-testid="stat-videos"
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: `${assetTypeColors.VIDEO}20` }}>
                <Video className="w-4 h-4" style={{ color: assetTypeColors.VIDEO }} />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.videos}</p>
                <p className="text-xs text-muted-foreground">Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover-elevate ${typeFilter === "DOCUMENT" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setTypeFilter(typeFilter === "DOCUMENT" ? "all" : "DOCUMENT")}
          data-testid="stat-documents"
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: `${assetTypeColors.DOCUMENT}20` }}>
                <File className="w-4 h-4" style={{ color: assetTypeColors.DOCUMENT }} />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.documents}</p>
                <p className="text-xs text-muted-foreground">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover-elevate ${typeFilter === "EMAIL_TEMPLATE" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setTypeFilter(typeFilter === "EMAIL_TEMPLATE" ? "all" : "EMAIL_TEMPLATE")}
          data-testid="stat-templates"
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: `${assetTypeColors.EMAIL_TEMPLATE}20` }}>
                <Mail className="w-4 h-4" style={{ color: assetTypeColors.EMAIL_TEMPLATE }} />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.emailTemplates}</p>
                <p className="text-xs text-muted-foreground">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover-elevate ${typeFilter === "DATA" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setTypeFilter(typeFilter === "DATA" ? "all" : "DATA")}
          data-testid="stat-data"
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: `${assetTypeColors.DATA}20` }}>
                <FileText className="w-4 h-4" style={{ color: assetTypeColors.DATA }} />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.dataFiles}</p>
                <p className="text-xs text-muted-foreground">Data Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={view === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("grid")}
                  className={view === "grid" ? "bg-brand-orange" : ""}
                  data-testid="button-grid-view"
                >
                  <Grid className="w-4 h-4 mr-1" />
                  Grid
                </Button>
                <Button
                  variant={view === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("list")}
                  className={view === "list" ? "bg-brand-orange" : ""}
                  data-testid="button-list-view"
                >
                  <List className="w-4 h-4 mr-1" />
                  List
                </Button>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                    <X className="w-4 h-4 mr-1" />
                    Clear filters ({activeFilterCount})
                  </Button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets by name, description, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-80"
                  data-testid="input-search-assets"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />

              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-40" data-testid="select-brand-filter">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brandsForCurrentRegion.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: brand.color }} />
                        {brand.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-40" data-testid="select-region-filter">
                  <Globe className="w-4 h-4 mr-1" />
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions?.map((region) => (
                    <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40" data-testid="select-type-filter">
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

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40" data-testid="select-source-filter">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="canva">Canva</SelectItem>
                  <SelectItem value="upload">Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {assetsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Folder className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-1">No assets found</p>
              <p className="text-muted-foreground text-sm mb-4">
                {activeFilterCount > 0 || searchQuery
                  ? "Try adjusting your filters or search query"
                  : "Get started by adding your first asset"}
              </p>
              {activeFilterCount > 0 || searchQuery ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear all filters
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => handleOpenModal()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Asset
                </Button>
              )}
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredAssets.map((asset) => {
                const brand = asset.brandId ? brandMap.get(asset.brandId) : null;
                return (
                  <Card
                    key={asset.id}
                    className="group relative overflow-visible cursor-pointer"
                    data-testid={`card-asset-${asset.id}`}
                  >
                    <div className="aspect-video bg-muted rounded-t-md flex items-center justify-center relative overflow-hidden">
                      <AssetThumbnail asset={asset} size="large" />
                      <div className="absolute top-2 right-2 invisible group-hover:visible">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              data-testid={`button-asset-menu-${asset.id}`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(asset.fileUrl || asset.canvaEditUrl) && (
                              <DropdownMenuItem onClick={() => window.open(asset.fileUrl || asset.canvaEditUrl!, "_blank")}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleOpenModal(asset)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(asset.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div
                        className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: assetTypeColors[asset.assetType] }}
                      >
                        {assetTypeLabels[asset.assetType]}
                      </div>
                      {asset.canvaDesignId && (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-xs font-medium bg-purple-600 text-white">
                          Canva
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm truncate" title={asset.name}>
                        {asset.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        {brand && (
                          <Badge variant="secondary" className="text-xs">
                            <div className="w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: brand.color }} />
                            {brand.name}
                          </Badge>
                        )}
                      </div>
                      {asset.tags && asset.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {asset.tags.slice(0, 2).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {asset.tags.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{asset.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredAssets.map((asset) => {
                const brand = asset.brandId ? brandMap.get(asset.brandId) : null;
                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-3 rounded-md border bg-card hover-elevate"
                    data-testid={`row-asset-${asset.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <AssetThumbnail asset={asset} size="small" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{asset.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {assetTypeLabels[asset.assetType]}
                          </span>
                          {brand && (
                            <Badge variant="secondary" className="text-xs">
                              <div className="w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: brand.color }} />
                              {brand.name}
                            </Badge>
                          )}
                          {asset.canvaDesignId && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                              Canva
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {(asset.fileUrl || asset.canvaEditUrl) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(asset.fileUrl || asset.canvaEditUrl!, "_blank")}
                          data-testid={`button-open-asset-${asset.id}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(asset)}
                        data-testid={`button-edit-asset-${asset.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(asset.id)}
                        data-testid={`button-delete-asset-${asset.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingAsset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
            <DialogDescription>
              {editingAsset ? "Update asset details" : "Add a new asset to the library"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-asset-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-asset-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="GRAPHIC">Graphic</SelectItem>
                          <SelectItem value="DATA">Data File</SelectItem>
                          <SelectItem value="EMAIL_TEMPLATE">Email Template</SelectItem>
                          <SelectItem value="VIDEO">Video</SelectItem>
                          <SelectItem value="DOCUMENT">Document</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-asset-brand">
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Brand</SelectItem>
                          {brands?.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: brand.color }} />
                                {brand.name}
                              </div>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} data-testid="input-asset-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." data-testid="input-asset-fileurl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="thumbnailUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." data-testid="input-asset-thumbnail" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (comma separated)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="tag1, tag2, tag3" data-testid="input-asset-tags" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-asset"
                >
                  {editingAsset ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

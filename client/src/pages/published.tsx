import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Instagram,
  Facebook,
  Video,
  Linkedin,
  Twitter,
  Mail,
  Globe,
  CalendarDays,
  BookOpen,
  Search,
  ExternalLink,
  Eye,
  ThumbsUp,
  MessageSquare,
  Share2,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import type { Brand, Region } from "@shared/schema";

const PLATFORM_OPTIONS = [
  { value: "all", label: "All Platforms" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter/X" },
  { value: "rednote", label: "RedNote" },
  { value: "edm", label: "EDM" },
  { value: "website", label: "Website" },
  { value: "event", label: "Event" },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  INSTAGRAM_POST: Instagram,
  INSTAGRAM_STORY: Instagram,
  INSTAGRAM_REEL: Instagram,
  FACEBOOK_POST: Facebook,
  TIKTOK_POST: Video,
  LINKEDIN_POST: Linkedin,
  TWITTER_POST: Twitter,
  REDNOTE_POST: BookOpen,
  EDM_GRAPHIC: Mail,
  WEBSITE_BANNER: Globe,
  EVENT_MATERIAL: CalendarDays,
};

const formatType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function PublishedPage() {
  const [platform, setPlatform] = useState<string>("all");
  const [brandId, setBrandId] = useState<string>("all");
  const [regionId, setRegionId] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sort, setSort] = useState<string>("newest");
  const [page, setPage] = useState<number>(1);

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data, isLoading } = useQuery<{ deliverables: any[]; total: number }>({
    queryKey: ["/api/published", platform, brandId, regionId, search, dateFrom, dateTo, sort, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (platform !== "all") params.set("platform", platform);
      if (brandId !== "all") params.set("brandId", brandId);
      if (regionId !== "all") params.set("regionId", regionId);
      if (search) params.set("search", search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("sort", sort);
      params.set("page", String(page));
      params.set("limit", "20");
      return await apiRequest("GET", `/api/published?${params.toString()}`);
    },
  });

  const deliverables = data?.deliverables ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const brandMap = new Map<string, Brand>();
  brands?.forEach((b) => brandMap.set(b.id, b));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground font-serif" data-testid="text-published-title">
          Published
        </h1>
        <p className="text-muted-foreground mt-1">Completed and published deliverables</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <Select value={platform} onValueChange={(v) => { setPlatform(v); setPage(1); }}>
              <SelectTrigger className="w-44" data-testid="select-published-platform-filter">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={brandId} onValueChange={(v) => { setBrandId(v); setPage(1); }}>
              <SelectTrigger className="w-44" data-testid="select-published-brand-filter">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={regionId} onValueChange={(v) => { setRegionId(v); setPage(1); }}>
              <SelectTrigger className="w-44" data-testid="select-published-region-filter">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search..."
                className="pl-8 w-44"
                data-testid="input-published-search"
              />
            </div>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-40"
              data-testid="input-published-date-from"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-40"
              data-testid="input-published-date-to"
            />

            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
              <SelectTrigger className="w-44" data-testid="select-published-sort">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : deliverables.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliverables.map((d) => {
              const Icon = TYPE_ICONS[d.deliverableType] || FileCheck;
              const brand = d.project ? brandMap.get(d.project.brandId) : null;

              return (
                <Card key={d.id} className="hover-elevate" data-testid={`card-published-${d.id}`}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground text-sm" data-testid={`text-deliverable-name-${d.id}`}>
                          {d.deliverableName || formatType(d.deliverableType)}
                        </span>
                      </div>
                      {d.postUrl && (
                        <a
                          href={d.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary"
                          data-testid={`link-post-${d.id}`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Post
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {brand && (
                        <Badge
                          variant="secondary"
                          style={{ backgroundColor: brand.color, color: "#fff" }}
                          data-testid={`badge-brand-${d.id}`}
                        >
                          {brand.name}
                        </Badge>
                      )}
                      {d.project && (
                        <span className="text-xs text-muted-foreground" data-testid={`text-project-name-${d.id}`}>
                          {d.project.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      {d.actualPublishDate && (
                        <span data-testid={`text-publish-date-${d.id}`}>
                          {format(new Date(d.actualPublishDate), "MMM d, yyyy")}
                        </span>
                      )}
                      {d.publishedAccount && (
                        <span data-testid={`text-account-name-${d.id}`}>
                          {d.publishedAccount.accountName}
                        </span>
                      )}
                      {d.canvaLink && (
                        <a
                          href={d.canvaLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary"
                          data-testid={`link-canva-${d.id}`}
                        >
                          <Palette className="w-3 h-3" />
                          Canva
                        </a>
                      )}
                    </div>

                    {d.analytics && (
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-2 mt-2">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {d.analytics.impressions ?? 0} views
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {d.analytics.likes ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {d.analytics.comments ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="w-3 h-3" />
                          {d.analytics.shares ?? 0}
                        </span>
                        {d.analytics.engagementRate && Number(d.analytics.engagementRate) > 0 && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            {d.analytics.engagementRate}%
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span className="text-sm text-muted-foreground" data-testid="text-published-count">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                data-testid="button-published-prev"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                data-testid="button-published-next"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1" data-testid="text-published-empty">
                No published deliverables found
              </h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your filters or check back when deliverables are published
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

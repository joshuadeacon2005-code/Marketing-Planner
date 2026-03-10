import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  Filter,
  Share2,
  Mail,
  Calendar,
  Eye,
  Heart,
  BarChart3,
  Instagram,
  Facebook,
  ExternalLink,
  Archive,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PostPreview } from "@/components/post-preview";
import { PerformanceForm } from "@/components/performance-form";
import { useAuthStore } from "@/lib/auth-store";
import type { Brand, Region } from "@shared/schema";

const platformIcons: Record<string, React.ElementType> = {
  TIKTOK: SiTiktok,
  INSTAGRAM: Instagram,
  FACEBOOK: Facebook,
};

export default function SentContentPage() {
  const { user } = useAuthStore();
  const [typeFilter, setTypeFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState(user?.regionId || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewPost, setPreviewPost] = useState<any | null>(null);
  const [performancePost, setPerformancePost] = useState<any | null>(null);

  const { data: brands } = useQuery<Brand[]>({ queryKey: ["/api/brands"] });
  const { data: regions } = useQuery<Region[]>({ queryKey: ["/api/regions"] });

  const buildSentUrl = () => {
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (brandFilter !== "all") params.set("brandIds", brandFilter);
    if (regionFilter !== "all") params.set("regionIds", regionFilter);
    const qs = params.toString();
    return `/api/sent${qs ? `?${qs}` : ""}`;
  };

  const sentUrl = buildSentUrl();

  const { data: sentContent, isLoading } = useQuery<any[]>({
    queryKey: [sentUrl],
  });

  const filteredContent = sentContent?.filter((item: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.caption?.toLowerCase().includes(q) ||
      item.subject?.toLowerCase().includes(q) ||
      item.title?.toLowerCase().includes(q) ||
      item.brand?.name?.toLowerCase().includes(q)
    );
  });

  const getContentIcon = (item: any) => {
    if (item.type === "social") {
      const PIcon = platformIcons[item.platform] || Share2;
      return <PIcon className="w-4 h-4" />;
    }
    if (item.type === "email") return <Mail className="w-4 h-4" />;
    return <Calendar className="w-4 h-4" />;
  };

  const getContentTitle = (item: any) => {
    if (item.type === "social") return item.caption?.substring(0, 60) || `${item.platform} Post`;
    if (item.type === "email") return item.subject || "Email Campaign";
    return item.title || "Event";
  };

  const getContentDate = (item: any) => {
    const d = item.scheduledDate || item.startDate || item.createdAt;
    return d ? format(new Date(d), "MMM d, yyyy") : "-";
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground flex items-center gap-2">
            <Archive className="w-6 h-6 text-primary" />
            Sent Content Archive
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse all published and sent content across channels
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search sent content..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-sent"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-type-filter">
            <SelectValue placeholder="Content Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="social">Social Posts</SelectItem>
            <SelectItem value="email">Emails</SelectItem>
            <SelectItem value="event">Events</SelectItem>
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-brand-filter">
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
          <SelectTrigger className="w-[150px]" data-testid="select-region-filter">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {regions?.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Type</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : filteredContent && filteredContent.length > 0 ? (
                  filteredContent.map((item: any, idx: number) => (
                    <TableRow key={`${item.type}-${item.id}`} data-testid={`row-sent-${item.type}-${item.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {getContentIcon(item)}
                          {item.type === "social" ? item.platform : item.type === "email" ? "Email" : "Event"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm font-medium truncate">{getContentTitle(item)}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{item.brand?.name || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{getContentDate(item)}</span>
                      </TableCell>
                      <TableCell>
                        {item.performance ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(item.performance.views || 0).toLocaleString()}</span>
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{(item.performance.likes || 0).toLocaleString()}</span>
                            <Badge variant="secondary" className="text-xs">
                              {Number(item.performance.engagementRate || 0).toFixed(1)}%
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {item.type === "social" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPreviewPost(item)}
                                data-testid={`button-preview-sent-${item.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPerformancePost(item)}
                                data-testid={`button-performance-sent-${item.id}`}
                              >
                                <BarChart3 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {item.postUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(item.postUrl, "_blank")}
                              data-testid={`button-link-sent-${item.id}`}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Archive className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No sent content found</p>
                      <p className="text-xs mt-1">Published posts, sent emails, and completed events will appear here</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {previewPost && (
        <PostPreview
          post={{ ...previewPost, brand: previewPost.brand || null }}
          open={!!previewPost}
          onClose={() => setPreviewPost(null)}
        />
      )}

      {performancePost && (
        <PerformanceForm
          post={{ ...performancePost, brand: performancePost.brand || null }}
          open={!!performancePost}
          onClose={() => setPerformancePost(null)}
        />
      )}
    </div>
  );
}

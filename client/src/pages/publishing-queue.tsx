import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  SendHorizontal,
  ExternalLink,
  CalendarClock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectDeliverable, Project, Brand, Region, User } from "@shared/schema";

type PlatformStatusMap = Record<string, {
  connected: boolean;
  count: number;
  hasCredentials: boolean;
}>;

export default function PublishingQueuePage() {
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: deliverables, isLoading } = useQuery<ProjectDeliverable[]>({
    queryKey: ["/api/publishing-queue"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: platformStatus } = useQuery<PlatformStatusMap>({
    queryKey: ["/api/platforms/status"],
  });

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects?.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    users?.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const filteredDeliverables = useMemo(() => {
    if (!deliverables) return [];
    return deliverables.filter((d) => {
      const project = projectMap.get(d.projectId);
      const matchesBrand = brandFilter === "all" || project?.brandId === brandFilter;
      const matchesRegion = regionFilter === "all" || project?.regionId === regionFilter;
      const matchesType = typeFilter === "all" || d.deliverableType === typeFilter;
      return matchesBrand && matchesRegion && matchesType;
    });
  }, [deliverables, projectMap, brandFilter, regionFilter, typeFilter]);

  const formatType = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const getPlatformForType = (type: string): string | null => {
    if (type.startsWith("INSTAGRAM_") || type.startsWith("FACEBOOK_")) return "meta";
    if (type === "TIKTOK_POST") return "tiktok";
    if (type === "LINKEDIN_POST") return "linkedin";
    if (type === "TWITTER_POST") return "twitter";
    if (type === "REDNOTE_POST") return "rednote";
    return null;
  };

  const getPlatformDisplayName = (platform: string): string => {
    const names: Record<string, string> = {
      meta: "Meta (Instagram/Facebook)",
      tiktok: "TikTok",
      linkedin: "LinkedIn",
      twitter: "Twitter/X",
      rednote: "RedNote (Xiaohongshu)",
    };
    return names[platform] || platform;
  };

  const isPlatformConnected = (platform: string): boolean => {
    if (!platformStatus) return false;
    return platformStatus[platform]?.connected ?? false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground font-serif" data-testid="text-publishing-queue-title">
          Publishing Queue
        </h1>
        <p className="text-muted-foreground mt-1">Deliverables ready to be published</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-40" data-testid="select-queue-brand-filter">
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
              <SelectTrigger className="w-40" data-testid="select-queue-region-filter">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48" data-testid="select-queue-type-filter">
                <SelectValue placeholder="Deliverable Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="INSTAGRAM_POST">Instagram Post</SelectItem>
                <SelectItem value="INSTAGRAM_STORY">Instagram Story</SelectItem>
                <SelectItem value="INSTAGRAM_REEL">Instagram Reel</SelectItem>
                <SelectItem value="FACEBOOK_POST">Facebook Post</SelectItem>
                <SelectItem value="TIKTOK_POST">TikTok Post</SelectItem>
                <SelectItem value="LINKEDIN_POST">LinkedIn Post</SelectItem>
                <SelectItem value="TWITTER_POST">Twitter Post</SelectItem>
                <SelectItem value="REDNOTE_POST">RedNote Post</SelectItem>
                <SelectItem value="EDM_GRAPHIC">EDM Graphic</SelectItem>
                <SelectItem value="WEBSITE_BANNER">Website Banner</SelectItem>
                <SelectItem value="EVENT_MATERIAL">Event Material</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-9 w-28" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDeliverables.length > 0 ? (
        <div className="space-y-4">
          {filteredDeliverables.map((deliverable) => {
            const project = projectMap.get(deliverable.projectId);
            const publisher = deliverable.publisherId
              ? userMap.get(deliverable.publisherId)
              : null;
            const platform = getPlatformForType(deliverable.deliverableType);
            const connected = platform ? isPlatformConnected(platform) : false;

            return (
              <Card key={deliverable.id} data-testid={`card-queue-deliverable-${deliverable.id}`}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-foreground" data-testid={`text-deliverable-name-${deliverable.id}`}>
                        {deliverable.deliverableName || "Untitled Deliverable"}
                      </h3>
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-type-${deliverable.id}`}>
                        {formatType(deliverable.deliverableType)}
                      </Badge>
                      {platform && (
                        <Badge
                          variant={connected ? "default" : "outline"}
                          className="text-xs"
                          data-testid={`badge-platform-status-${deliverable.id}`}
                        >
                          {connected ? (
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertCircle className="w-3 h-3 mr-1" />
                          )}
                          {getPlatformDisplayName(platform)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {deliverable.canvaLink && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          data-testid={`button-canva-${deliverable.id}`}
                        >
                          <a href={deliverable.canvaLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                            Canva
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        asChild
                        data-testid={`button-approve-publish-${deliverable.id}`}
                      >
                        <Link href={`/publish/${deliverable.id}`}>
                          <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                          Approve to Publish
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {project && (
                      <span className="text-primary font-medium" data-testid={`text-project-name-${deliverable.id}`}>
                        {project.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1" data-testid={`text-publisher-${deliverable.id}`}>
                      <UserIcon className="w-3.5 h-3.5" />
                      {publisher ? publisher.name : "Unassigned"}
                    </span>
                    {deliverable.scheduledPublishDate && (
                      <span className="flex items-center gap-1" data-testid={`text-scheduled-${deliverable.id}`}>
                        <CalendarClock className="w-3.5 h-3.5" />
                        {format(new Date(deliverable.scheduledPublishDate), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>

                  {deliverable.finalCopy && (
                    <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-copy-preview-${deliverable.id}`}>
                      {deliverable.finalCopy}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <SendHorizontal className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1" data-testid="text-queue-empty">
                No deliverables in queue
              </h3>
              <p className="text-muted-foreground text-sm">
                Deliverables will appear here when they reach the publishing stage
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

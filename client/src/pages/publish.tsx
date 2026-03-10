import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { format } from "date-fns";
import {
  SendHorizontal,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarClock,
  Hash,
  AtSign,
  User as UserIcon,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProjectDeliverable, Project, Brand, Region, User } from "@shared/schema";

type SocialAccount = {
  id: string;
  platform: string;
  accountName: string;
  accountHandle: string | null;
  accountId: string | null;
  pageId: string | null;
  isActive: boolean | null;
  brandId: string | null;
  regionId: string | null;
  profileImageUrl: string | null;
};

type PlatformStatusMap = Record<string, {
  connected: boolean;
  count: number;
  hasCredentials: boolean;
}>;

export default function PublishPage() {
  const [, params] = useRoute("/publish/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [publishNotes, setPublishNotes] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const deliverableId = params?.id;

  const { data: deliverables } = useQuery<ProjectDeliverable[]>({
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

  const { data: socialAccounts } = useQuery<SocialAccount[]>({
    queryKey: ["/api/social-accounts"],
  });

  const deliverable = deliverables?.find((d) => d.id === deliverableId);
  const project = deliverable ? projects?.find((p) => p.id === deliverable.projectId) : null;
  const brand = project?.brandId ? brands?.find((b) => b.id === project.brandId) : null;
  const region = project?.regionId ? regions?.find((r) => r.id === project.regionId) : null;
  const designer = deliverable?.designerId ? users?.find((u) => u.id === deliverable.designerId) : null;
  const copywriter = deliverable?.copywriterId ? users?.find((u) => u.id === deliverable.copywriterId) : null;
  const publisher = deliverable?.publisherId ? users?.find((u) => u.id === deliverable.publisherId) : null;

  const getPlatformForType = (type: string): string | null => {
    if (type.startsWith("INSTAGRAM_") || type.startsWith("FACEBOOK_")) return "meta";
    if (type === "TIKTOK_POST") return "tiktok";
    if (type === "LINKEDIN_POST") return "linkedin";
    if (type === "TWITTER_POST") return "twitter";
    if (type === "REDNOTE_POST") return "rednote";
    return null;
  };

  const getAccountPlatformFilter = (type: string): string[] => {
    if (type.startsWith("INSTAGRAM_")) return ["instagram"];
    if (type.startsWith("FACEBOOK_")) return ["facebook"];
    if (type === "TIKTOK_POST") return ["tiktok"];
    if (type === "LINKEDIN_POST") return ["linkedin"];
    if (type === "TWITTER_POST") return ["twitter"];
    if (type === "REDNOTE_POST") return ["rednote"];
    return [];
  };

  const getPlatformDisplayName = (platform: string): string => {
    const names: Record<string, string> = {
      meta: "Meta (Instagram/Facebook)",
      tiktok: "TikTok",
      linkedin: "LinkedIn",
      twitter: "Twitter/X",
      rednote: "RedNote (Xiaohongshu)",
      instagram: "Instagram",
      facebook: "Facebook",
    };
    return names[platform] || platform;
  };

  const formatType = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const isPlatformConnected = (platform: string): boolean => {
    if (!platformStatus) return false;
    return platformStatus[platform]?.connected ?? false;
  };

  const availableAccounts = useMemo(() => {
    if (!deliverable || !socialAccounts) return [];
    const platformFilters = getAccountPlatformFilter(deliverable.deliverableType);
    return socialAccounts.filter(
      (a) => platformFilters.includes(a.platform) && a.isActive !== false
    );
  }, [deliverable, socialAccounts]);

  const publishMutation = useMutation({
    mutationFn: async ({ accountId }: { accountId: string }) => {
      const res = await apiRequest("POST", `/api/deliverables/${deliverableId}/publish-to-platform`, {
        accountId,
        publishNotes: publishNotes || undefined,
      });
      return (res as Response).json();
    },
    onSuccess: (data) => {
      toast({
        title: "Published Successfully",
        description: data.message || "Content has been published to the platform.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/publishing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/published"] });
      navigate("/published");
    },
    onError: (error: Error) => {
      toast({
        title: "Publishing Failed",
        description: error.message || "Failed to publish content. Check your platform connection.",
        variant: "destructive",
      });
    },
  });

  if (!deliverable) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild data-testid="button-back-to-queue">
          <Link href="/publishing-queue">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Queue
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1" data-testid="text-not-found">
                Deliverable not found
              </h3>
              <p className="text-muted-foreground text-sm">
                This deliverable may have already been published or removed from the queue.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const platform = getPlatformForType(deliverable.deliverableType);
  const connected = platform ? isPlatformConnected(platform) : false;
  const accountToPublish = selectedAccountId || (availableAccounts.length === 1 ? availableAccounts[0].id : "");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild data-testid="button-back-to-queue">
          <Link href="/publishing-queue">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Queue
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground font-serif" data-testid="text-publish-title">
          Publish Content
        </h1>
        <p className="text-muted-foreground mt-1">Review and publish this deliverable to its platform</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle data-testid="text-deliverable-title">
                  {deliverable.deliverableName || "Untitled Deliverable"}
                </CardTitle>
                <Badge variant="secondary" className="text-xs" data-testid="badge-deliverable-type">
                  {formatType(deliverable.deliverableType)}
                </Badge>
              </div>
              {project && (
                <CardDescription data-testid="text-project-info">
                  Project: {project.name}
                  {brand && ` | ${brand.name}`}
                  {region && ` | ${region.name}`}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {deliverable.finalCopy && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Final Copy
                  </Label>
                  <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap" data-testid="text-final-copy">
                    {deliverable.finalCopy}
                  </div>
                </div>
              )}

              {deliverable.finalHashtags && deliverable.finalHashtags.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    Hashtags
                  </Label>
                  <div className="flex flex-wrap gap-1.5" data-testid="text-hashtags">
                    {deliverable.finalHashtags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        #{tag.replace(/^#/, "")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {deliverable.taggedUsers && deliverable.taggedUsers.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5" />
                    Tagged Users
                  </Label>
                  <div className="flex flex-wrap gap-1.5" data-testid="text-tagged-users">
                    {deliverable.taggedUsers.map((user, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        @{user.replace(/^@/, "")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {deliverable.canvaLink && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Design Asset</Label>
                  <Button variant="outline" size="sm" asChild data-testid="button-view-canva">
                    <a href={deliverable.canvaLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      View in Canva
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publishing Notes</CardTitle>
              <CardDescription>Add any notes about this publish (optional)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add notes about scheduling, audience targeting, or any special instructions..."
                value={publishNotes}
                onChange={(e) => setPublishNotes(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="textarea-publish-notes"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-1 text-sm">
                <span className="text-muted-foreground">Designer</span>
                <span className="flex items-center gap-1.5" data-testid="text-designer">
                  <UserIcon className="w-3.5 h-3.5" />
                  {designer?.name || "Unassigned"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 text-sm">
                <span className="text-muted-foreground">Copywriter</span>
                <span className="flex items-center gap-1.5" data-testid="text-copywriter">
                  <UserIcon className="w-3.5 h-3.5" />
                  {copywriter?.name || "Unassigned"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 text-sm">
                <span className="text-muted-foreground">Publisher</span>
                <span className="flex items-center gap-1.5" data-testid="text-publisher">
                  <UserIcon className="w-3.5 h-3.5" />
                  {publisher?.name || "Unassigned"}
                </span>
              </div>
              {deliverable.scheduledPublishDate && (
                <div className="flex items-center justify-between gap-1 text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span className="flex items-center gap-1.5" data-testid="text-scheduled-date">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {format(new Date(deliverable.scheduledPublishDate), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {platform ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    {connected ? (
                      <Badge variant="default" className="text-xs" data-testid="badge-platform-connected">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {getPlatformDisplayName(platform)} Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs" data-testid="badge-platform-disconnected">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {getPlatformDisplayName(platform)} Not Connected
                      </Badge>
                    )}
                  </div>

                  {connected && availableAccounts.length > 0 ? (
                    <div className="space-y-3">
                      {availableAccounts.length > 1 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Publish to account</Label>
                          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <SelectTrigger data-testid="select-publish-account">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableAccounts.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.accountName}
                                  {acc.accountHandle ? ` (@${acc.accountHandle})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {availableAccounts.length === 1 && (
                        <div className="text-sm text-muted-foreground" data-testid="text-publish-account">
                          Publishing as: <span className="font-medium text-foreground">{availableAccounts[0].accountName}</span>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        onClick={() => publishMutation.mutate({ accountId: accountToPublish })}
                        disabled={publishMutation.isPending || !accountToPublish}
                        data-testid="button-publish-to-platform"
                      >
                        {publishMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <SendHorizontal className="w-4 h-4 mr-2" />
                        )}
                        {publishMutation.isPending ? "Publishing..." : `Publish to ${getPlatformDisplayName(platform).split(" ")[0]}`}
                      </Button>
                    </div>
                  ) : connected && availableAccounts.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        No {getPlatformDisplayName(platform)} accounts found. Add an account in Settings.
                      </p>
                      <Button variant="outline" className="w-full" asChild data-testid="button-add-account">
                        <Link href="/settings">
                          Go to Settings
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Connect your {getPlatformDisplayName(platform)} account in Settings to publish directly.
                      </p>
                      <Button variant="outline" className="w-full" asChild data-testid="button-connect-platform">
                        <Link href="/settings">
                          Go to Settings
                        </Link>
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="text-no-platform">
                  This deliverable type does not support direct platform publishing.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

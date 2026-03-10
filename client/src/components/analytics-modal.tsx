import { format } from "date-fns";
import {
  Eye,
  Users,
  Activity,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MousePointerClick,
  Play,
  Clock,
  BarChart3,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsModalProps {
  open: boolean;
  onClose: () => void;
  deliverableName?: string;
  analytics?: {
    impressions?: number | null;
    reach?: number | null;
    engagements?: number | null;
    likes?: number | null;
    comments?: number | null;
    shares?: number | null;
    saves?: number | null;
    clicks?: number | null;
    videoViews?: number | null;
    avgWatchTime?: number | null;
    engagementRate?: string | null;
    fetchedAt?: string | null;
  } | null;
  isLoading?: boolean;
}

interface MetricCard {
  label: string;
  value: number | null | undefined;
  icon: React.ElementType;
  testId: string;
}

function MetricCard({ label, value, icon: Icon, testId }: MetricCard) {
  const displayValue = value !== null && value !== undefined ? value.toLocaleString() : "—";

  return (
    <Card className="flex flex-col gap-2 p-4" data-testid={testId}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold text-foreground">{displayValue}</div>
    </Card>
  );
}

export function AnalyticsModal({
  open,
  onClose,
  deliverableName,
  analytics,
  isLoading = false,
}: AnalyticsModalProps) {
  const hasAnalytics =
    analytics &&
    (analytics.impressions !== null ||
      analytics.reach !== null ||
      analytics.engagements !== null ||
      analytics.likes !== null ||
      analytics.comments !== null ||
      analytics.shares !== null);

  const engagementRate = analytics?.engagementRate
    ? typeof analytics.engagementRate === "string"
      ? parseFloat(analytics.engagementRate)
      : analytics.engagementRate
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-analytics-modal">
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analytics{deliverableName ? ` - ${deliverableName}` : ""}
          </DialogTitle>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            data-testid="button-close-analytics"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : !hasAnalytics ? (
            <Card className="p-8 text-center" data-testid="card-empty-state">
              <div className="space-y-2">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-foreground font-medium">
                  No analytics data available yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Analytics will appear after the post has been published and data is synced.
                </p>
              </div>
            </Card>
          ) : (
            <>
              {/* Engagement Rate - Prominent Display */}
              {engagementRate !== null && (
                <Card
                  className="p-6 bg-gradient-to-br from-primary/10 to-primary/5"
                  data-testid="card-engagement-rate"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Engagement Rate
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-foreground">
                          {engagementRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <Activity className="w-12 h-12 text-primary opacity-20" />
                  </div>
                </Card>
              )}

              {/* Key Metrics Grid - 2x3 */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Key Metrics
                </h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <MetricCard
                    label="Impressions"
                    value={analytics.impressions}
                    icon={Eye}
                    testId="card-metric-impressions"
                  />
                  <MetricCard
                    label="Reach"
                    value={analytics.reach}
                    icon={Users}
                    testId="card-metric-reach"
                  />
                  <MetricCard
                    label="Engagements"
                    value={analytics.engagements}
                    icon={Activity}
                    testId="card-metric-engagements"
                  />
                  <MetricCard
                    label="Likes"
                    value={analytics.likes}
                    icon={Heart}
                    testId="card-metric-likes"
                  />
                  <MetricCard
                    label="Comments"
                    value={analytics.comments}
                    icon={MessageSquare}
                    testId="card-metric-comments"
                  />
                  <MetricCard
                    label="Shares"
                    value={analytics.shares}
                    icon={Share2}
                    testId="card-metric-shares"
                  />
                </div>
              </div>

              {/* Additional Metrics */}
              {(analytics.saves !== null ||
                analytics.clicks !== null ||
                analytics.videoViews !== null ||
                analytics.avgWatchTime !== null) && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Additional Metrics
                  </h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {analytics.saves !== null && (
                      <MetricCard
                        label="Saves"
                        value={analytics.saves}
                        icon={Bookmark}
                        testId="card-metric-saves"
                      />
                    )}
                    {analytics.clicks !== null && (
                      <MetricCard
                        label="Clicks"
                        value={analytics.clicks}
                        icon={MousePointerClick}
                        testId="card-metric-clicks"
                      />
                    )}
                    {analytics.videoViews !== null && (
                      <MetricCard
                        label="Video Views"
                        value={analytics.videoViews}
                        icon={Play}
                        testId="card-metric-video-views"
                      />
                    )}
                    {analytics.avgWatchTime !== null && (
                      <Card className="flex flex-col gap-2 p-4" data-testid="card-metric-avg-watch-time">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            Avg Watch Time
                          </span>
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold text-foreground">
                          {analytics.avgWatchTime
                            ? `${analytics.avgWatchTime.toFixed(1)}s`
                            : "—"}
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {/* Last Updated */}
              {analytics.fetchedAt && (
                <div
                  className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t"
                  data-testid="text-last-updated"
                >
                  <Clock className="w-3 h-3" />
                  <span>
                    Last updated:{" "}
                    {format(new Date(analytics.fetchedAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

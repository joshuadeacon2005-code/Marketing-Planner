import { useQuery, useMutation } from "@tanstack/react-query";
import { RefreshCw, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface CanvaStatus {
  connected: boolean;
  integration: {
    lastSyncAt: string | null;
  } | null;
  hasCredentials: boolean;
}

export function CanvaSyncButton({ compact = false }: { compact?: boolean }) {
  const { toast } = useToast();

  const { data: canvaStatus, isLoading: statusLoading } = useQuery<CanvaStatus>({
    queryKey: ["/api/canva/status"],
    refetchInterval: 60000,
  });

  const oauthMutation = useMutation({
    mutationFn: async () => {
      const origin = encodeURIComponent(window.location.origin);
      return await apiRequest("GET", `/api/canva/auth-url?origin=${origin}`) as { authUrl: string };
    },
    onSuccess: (data: { authUrl: string }) => {
      window.location.href = data.authUrl;
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to Canva. Please try again.",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/canva/sync-assets", {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Canva Sync Complete",
        description: `${data?.imported ?? 0} new designs imported, ${data?.skipped ?? 0} already existed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/canva/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
    },
    onError: (error: Error) => {
      const msg = error.message;
      const isAuthError = msg.includes("expired") || msg.includes("reconnect") || msg.includes("token");
      toast({
        title: "Sync Failed",
        description: isAuthError
          ? "Your Canva connection has expired. Please reconnect."
          : msg || "Could not sync with Canva. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (statusLoading) return null;

  if (!canvaStatus?.hasCredentials) return null;

  if (!canvaStatus?.connected) {
    return (
      <div className="flex items-center gap-2" data-testid="canva-sync-disconnected">
        <Button
          variant="outline"
          size="sm"
          onClick={() => oauthMutation.mutate()}
          disabled={oauthMutation.isPending}
          className="gap-1.5 w-full"
          data-testid="link-connect-canva"
        >
          <Palette className="w-3.5 h-3.5" />
          {oauthMutation.isPending ? "Connecting..." : "Connect Canva"}
        </Button>
      </div>
    );
  }

  const lastSyncAt = canvaStatus.integration?.lastSyncAt;
  const lastSyncText = lastSyncAt
    ? `Synced ${formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}`
    : "Never synced";

  return (
    <div className="flex flex-col gap-1" data-testid="canva-sync-section">
      <Button
        variant="outline"
        size="sm"
        onClick={() => syncMutation.mutate()}
        disabled={syncMutation.isPending}
        className="w-full"
        data-testid="button-canva-sync"
      >
        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
        {syncMutation.isPending ? "Syncing..." : "Sync Canva"}
      </Button>
      <span className="text-xs text-muted-foreground" data-testid="text-last-synced">
        {lastSyncText}
      </span>
    </div>
  );
}

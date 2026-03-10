import { useQuery, useMutation } from "@tanstack/react-query";
import { Facebook, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface MetaStatus {
  connected: boolean;
  integration: any;
  hasCredentials: boolean;
}

export function MetaConnectButton({ showConnected = false }: { showConnected?: boolean }) {
  const { toast } = useToast();

  const { data: metaStatus, isLoading } = useQuery<MetaStatus>({
    queryKey: ["/api/meta/status"],
    refetchInterval: 60000,
  });

  const oauthMutation = useMutation({
    mutationFn: async () => {
      const origin = encodeURIComponent(window.location.origin);
      return await apiRequest("GET", `/api/meta/auth-url?origin=${origin}`) as { authUrl: string };
    },
    onSuccess: (data: { authUrl: string }) => {
      window.location.href = data.authUrl;
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to Meta. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) return null;
  if (!metaStatus?.hasCredentials) return null;

  if (metaStatus?.connected) {
    if (!showConnected) return null;
    return (
      <div className="flex items-center gap-2" data-testid="meta-connected-status">
        <Check className="w-3.5 h-3.5 text-green-500" />
        <span className="text-xs text-muted-foreground">Meta Connected</span>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => oauthMutation.mutate()}
      disabled={oauthMutation.isPending}
      className="gap-1.5 w-full"
      data-testid="button-meta-connect"
    >
      <Facebook className="w-3.5 h-3.5" />
      {oauthMutation.isPending ? "Connecting..." : "Connect Meta"}
    </Button>
  );
}

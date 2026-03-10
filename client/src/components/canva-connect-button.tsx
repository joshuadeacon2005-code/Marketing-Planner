import { useQuery, useMutation } from "@tanstack/react-query";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CanvaStatus {
  connected: boolean;
  integration: {
    lastSyncAt: string | null;
  } | null;
  hasCredentials: boolean;
}

export function CanvaConnectButton() {
  const { toast } = useToast();

  const { data: canvaStatus, isLoading } = useQuery<CanvaStatus>({
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

  if (isLoading) return null;

  if (!canvaStatus?.hasCredentials) return null;

  if (canvaStatus?.connected) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => oauthMutation.mutate()}
      disabled={oauthMutation.isPending}
      className="gap-1.5"
      data-testid="button-canva-connect-navbar"
    >
      <Palette className="w-3.5 h-3.5" />
      {oauthMutation.isPending ? "Connecting..." : "Connect Canva"}
    </Button>
  );
}

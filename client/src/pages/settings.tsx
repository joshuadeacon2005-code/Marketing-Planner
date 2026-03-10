import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users,
  Tags,
  Info,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Shield,
  Check,
  X,
  Bell,
  Webhook,
  ExternalLink,
  Eye,
  Link2,
  Unlink,
  RefreshCw,
  Video,
  Linkedin,
  Twitter,
  Loader2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth-store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Brand, Region, BrandRegion, CanvaIntegration } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

const userFormSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["ADMIN", "MANAGER", "USER"]),
  regionId: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

const brandFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required"),
  dreamPimUrl: z.string().optional(),
  assetPortalUrl: z.string().optional(),
  assetPortalName: z.string().optional(),
});

type BrandFormData = z.infer<typeof brandFormSchema>;

function CanvaIntegrationSection() {
  const { toast } = useToast();
  const [syncBrandId, setSyncBrandId] = useState("");
  const [syncResults, setSyncResults] = useState<{ imported: number; skipped: number; totalDesigns: number; errors?: string[] } | null>(null);

  const { data: canvaStatus, isLoading: isLoadingStatus } = useQuery<{ connected: boolean; integration: CanvaIntegration | null; hasCredentials: boolean }>({
    queryKey: ["/api/canva/status"],
  });

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
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
      toast({ title: "Error", description: error.message || "Failed to start OAuth flow. Make sure CANVA_CLIENT_ID and CANVA_CLIENT_SECRET are configured.", variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/canva/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/canva/status"] });
      setSyncResults(null);
      toast({ title: "Disconnected", description: "Canva integration disconnected" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to disconnect Canva", variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/canva/sync-assets", {
        brandId: syncBrandId === "all" ? undefined : syncBrandId || undefined,
      }) as any;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/canva/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setSyncResults({
        imported: data.imported,
        skipped: data.skipped,
        totalDesigns: data.totalDesigns,
        errors: data.errors,
      });
      toast({
        title: "Sync Complete",
        description: `${data.imported} designs imported, ${data.skipped} already existed`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to sync assets", variant: "destructive" });
    },
  });

  const isConnected = canvaStatus?.connected;
  const integration = canvaStatus?.integration;
  const hasCredentials = canvaStatus?.hasCredentials;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Canva Integration
        </CardTitle>
        <CardDescription>
          Connect your Canva account to sync design assets and templates into your brand asset library
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Status:</span>
          {isLoadingStatus ? (
            <Skeleton className="h-5 w-20" />
          ) : isConnected ? (
            <StatusBadge status="success" data-testid="status-canva-connected">Connected</StatusBadge>
          ) : (
            <StatusBadge status="warning" data-testid="status-canva-disconnected">Disconnected</StatusBadge>
          )}
        </div>

        {isConnected && integration?.lastSyncAt && (
          <div className="text-sm text-muted-foreground" data-testid="text-canva-last-sync">
            Last synced: {new Date(integration.lastSyncAt).toLocaleString()}
          </div>
        )}

        {isConnected && integration?.canvaUserId && (
          <div className="text-sm text-muted-foreground">
            Canva User ID: {integration.canvaUserId}
          </div>
        )}

        {!isConnected && (
          <div className="space-y-3">
            <Button
              onClick={() => oauthMutation.mutate()}
              disabled={oauthMutation.isPending || !hasCredentials}
              data-testid="button-canva-oauth-connect"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {oauthMutation.isPending ? "Connecting..." : "Connect with Canva"}
            </Button>
            {!hasCredentials && (
              <p className="text-xs text-muted-foreground">
                Canva credentials are not configured yet.
              </p>
            )}
          </div>
        )}

        {isConnected && (
          <div className="space-y-4">
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-medium">Sync Canva Designs</h3>
              <p className="text-sm text-muted-foreground">
                Pull your Canva designs into the asset library. Optionally assign them to a brand.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={syncBrandId} onValueChange={setSyncBrandId}>
                  <SelectTrigger className="w-[200px]" data-testid="select-sync-brand">
                    <SelectValue placeholder="All brands (no filter)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All brands (no filter)</SelectItem>
                    {brands?.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  data-testid="button-canva-sync"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                  {syncMutation.isPending ? "Syncing..." : "Sync Designs"}
                </Button>
              </div>
            </div>

            {syncResults && (
              <div className="p-4 bg-muted rounded-md space-y-2" data-testid="div-sync-results">
                <p className="text-sm font-medium">Last Sync Results</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Found:</span>
                    <span className="ml-2 font-medium">{syncResults.totalDesigns}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Imported:</span>
                    <span className="ml-2 font-medium text-green-500">{syncResults.imported}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Already Existed:</span>
                    <span className="ml-2 font-medium">{syncResults.skipped}</span>
                  </div>
                </div>
                {syncResults.errors && syncResults.errors.length > 0 && (
                  <div className="text-sm text-destructive">
                    Failed to import: {syncResults.errors.join(", ")}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                data-testid="button-canva-disconnect"
              >
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetaPageMapping {
  id: string;
  metaIntegrationId: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagramBusinessAccountId: string | null;
  regionId: string | null;
  isActive: boolean;
}

function MetaIntegrationSection() {
  const { toast } = useToast();

  const { data: metaStatus, isLoading: isLoadingStatus } = useQuery<{
    connected: boolean;
    integration: any;
    hasCredentials: boolean;
  }>({
    queryKey: ["/api/meta/status"],
  });

  const { data: pageMappings } = useQuery<MetaPageMapping[]>({
    queryKey: ["/api/meta/page-mappings"],
    enabled: !!metaStatus?.connected,
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
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
      toast({ title: "Error", description: error.message || "Failed to start Meta OAuth", variant: "destructive" });
    },
  });

  const syncPagesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/meta/sync-pages") as any;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/page-mappings"] });
      toast({
        title: "Pages Synced",
        description: `Found ${data.results?.total} pages (${data.results?.synced} new, ${data.results?.updated} updated)`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const assignRegionMutation = useMutation({
    mutationFn: async ({ mappingId, regionId }: { mappingId: string; regionId: string | null }) => {
      return await apiRequest("POST", `/api/meta/page-mappings/${mappingId}/assign-region`, { regionId }) as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/page-mappings"] });
      toast({ title: "Region Updated", description: "Page region assignment updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/meta/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meta/page-mappings"] });
      toast({ title: "Disconnected", description: "Meta integration disconnected" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const fetchAllAnalyticsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/meta/fetch-all-analytics") as any;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Analytics Updated",
        description: `Updated ${data.updated} posts${data.errors ? `, ${data.errors} failed` : ""}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isConnected = metaStatus?.connected;
  const hasCredentials = metaStatus?.hasCredentials;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="w-5 h-5" />
          Meta Integration (Facebook & Instagram)
        </CardTitle>
        <CardDescription>
          Connect your Meta accounts and assign pages to regions for multi-account publishing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Status:</span>
          {isLoadingStatus ? (
            <Skeleton className="h-5 w-20" />
          ) : isConnected ? (
            <StatusBadge status="success" data-testid="status-meta-connected">Connected</StatusBadge>
          ) : (
            <StatusBadge status="warning" data-testid="status-meta-disconnected">Disconnected</StatusBadge>
          )}
        </div>

        {!isConnected && (
          <div className="space-y-3">
            <Button
              onClick={() => oauthMutation.mutate()}
              disabled={oauthMutation.isPending || !hasCredentials}
              data-testid="button-meta-oauth-connect"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {oauthMutation.isPending ? "Connecting..." : "Connect with Meta"}
            </Button>
            {!hasCredentials && (
              <p className="text-xs text-muted-foreground">
                META_APP_ID and META_APP_SECRET need to be configured first.
              </p>
            )}
          </div>
        )}

        {isConnected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => syncPagesMutation.mutate()}
                disabled={syncPagesMutation.isPending}
                data-testid="button-meta-sync-pages"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncPagesMutation.isPending ? "animate-spin" : ""}`} />
                {syncPagesMutation.isPending ? "Syncing..." : "Sync Pages from Meta"}
              </Button>
              <Button
                variant="outline"
                onClick={() => fetchAllAnalyticsMutation.mutate()}
                disabled={fetchAllAnalyticsMutation.isPending}
                data-testid="button-meta-fetch-all-analytics"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${fetchAllAnalyticsMutation.isPending ? "animate-spin" : ""}`} />
                {fetchAllAnalyticsMutation.isPending ? "Fetching..." : "Fetch All Analytics"}
              </Button>
              <Button
                variant="outline"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                data-testid="button-meta-disconnect"
              >
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>

            {pageMappings && pageMappings.length > 0 ? (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-sm font-medium">Page-to-Region Mapping</h3>
                <p className="text-sm text-muted-foreground">
                  Assign each Facebook/Instagram page to a region. Posts will automatically publish to the correct page based on their region.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page Name</TableHead>
                      <TableHead>Instagram</TableHead>
                      <TableHead>Assigned Region</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageMappings.map((mapping) => (
                      <TableRow key={mapping.id} data-testid={`row-page-mapping-${mapping.id}`}>
                        <TableCell className="font-medium">{mapping.pageName}</TableCell>
                        <TableCell>
                          {mapping.instagramBusinessAccountId ? (
                            <Badge variant="secondary">Linked</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not linked</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping.regionId || "none"}
                            onValueChange={(value) =>
                              assignRegionMutation.mutate({
                                mappingId: mapping.id,
                                regionId: value === "none" ? null : value,
                              })
                            }
                          >
                            <SelectTrigger className="w-40" data-testid={`select-region-${mapping.id}`}>
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No region</SelectItem>
                              {regions?.map((region) => (
                                <SelectItem key={region.id} value={region.id}>
                                  {region.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  No pages synced yet. Click "Sync Pages from Meta" to import your Facebook Pages.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlatformConnectionCard({
  platformName,
  platformIcon,
  description,
  statusEndpoint,
  authEndpoint,
  disconnectEndpoint,
  testId,
}: {
  platformName: string;
  platformIcon: any;
  description: string;
  statusEndpoint: string;
  authEndpoint: string;
  disconnectEndpoint: string;
  testId: string;
}) {
  const { toast } = useToast();

  const { data: status, isLoading } = useQuery<{
    connected: boolean;
    accounts: any[];
    hasCredentials: boolean;
  }>({
    queryKey: [statusEndpoint],
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("GET", authEndpoint) as { url: string };
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", disconnectEndpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [statusEndpoint] });
      toast({ title: "Disconnected", description: `${platformName} disconnected successfully` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {platformIcon}
          {platformName}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Status:</span>
          {isLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : status?.connected ? (
            <Badge variant="secondary" data-testid={`status-${testId}-connected`}>Connected ({status.accounts?.length || 0} account{(status.accounts?.length || 0) !== 1 ? "s" : ""})</Badge>
          ) : (
            <Badge variant="outline" data-testid={`status-${testId}-disconnected`}>Disconnected</Badge>
          )}
        </div>

        {status?.connected && status.accounts?.map((acc: any) => (
          <div key={acc.id} className="flex items-center gap-2 text-sm text-muted-foreground pl-2 border-l-2 border-muted">
            <span>{acc.accountName}</span>
            {acc.accountHandle && <span className="text-xs">@{acc.accountHandle}</span>}
          </div>
        ))}

        <div className="flex gap-2 flex-wrap">
          {!status?.connected ? (
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending || !status?.hasCredentials}
              data-testid={`button-connect-${testId}`}
            >
              {connectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Connect {platformName}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              data-testid={`button-disconnect-${testId}`}
            >
              Disconnect
            </Button>
          )}
        </div>

        {!status?.hasCredentials && (
          <p className="text-xs text-muted-foreground">
            API credentials not configured. Add the required environment secrets to enable {platformName} integration.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PlatformsTab() {
  const { toast } = useToast();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [formData, setFormData] = useState({
    platform: "",
    accountName: "",
    accountHandle: "",
    brandId: "",
    regionId: "",
  });

  const { data: accounts, isLoading } = useQuery<any[]>({
    queryKey: ["/api/social-accounts"],
  });

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/social-accounts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      setShowAddAccount(false);
      resetForm();
      toast({ title: "Social account added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/social-accounts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      setEditingAccount(null);
      resetForm();
      toast({ title: "Account updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/social-accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      toast({ title: "Account removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ platform: "", accountName: "", accountHandle: "", brandId: "", regionId: "" });
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setFormData({
      platform: account.platform,
      accountName: account.accountName,
      accountHandle: account.accountHandle || "",
      brandId: account.brandId || "",
      regionId: account.regionId || "",
    });
    setShowAddAccount(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      brandId: formData.brandId || null,
      regionId: formData.regionId || null,
    };
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const platforms = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "TWITTER"];
  const platformLabels: Record<string, string> = {
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    TIKTOK: "TikTok",
    LINKEDIN: "LinkedIn",
    TWITTER: "Twitter/X",
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Connected Social Accounts</CardTitle>
          <CardDescription>Manage social media accounts for publishing content</CardDescription>
        </div>
        <Button
          onClick={() => { resetForm(); setEditingAccount(null); setShowAddAccount(true); }}
          className="bg-brand-orange hover:bg-brand-orange-dark"
          data-testid="button-add-social-account"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </CardHeader>
      <CardContent>
        {showAddAccount && (
          <Card className="mb-4">
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm font-medium text-foreground">{editingAccount ? "Edit Account" : "Add Social Account"}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Platform</Label>
                  <Select value={formData.platform} onValueChange={(v) => setFormData(p => ({ ...p, platform: v }))}>
                    <SelectTrigger data-testid="select-account-platform">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map(p => (
                        <SelectItem key={p} value={p}>{platformLabels[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Account Name</Label>
                  <Input
                    value={formData.accountName}
                    onChange={(e) => setFormData(p => ({ ...p, accountName: e.target.value }))}
                    placeholder="e.g. Ergobaby ANZ"
                    data-testid="input-account-name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Handle</Label>
                  <Input
                    value={formData.accountHandle}
                    onChange={(e) => setFormData(p => ({ ...p, accountHandle: e.target.value }))}
                    placeholder="e.g. @ergobaby_anz"
                    data-testid="input-account-handle"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Brand</Label>
                  <Select value={formData.brandId || "none"} onValueChange={(v) => setFormData(p => ({ ...p, brandId: v === "none" ? "" : v }))}>
                    <SelectTrigger data-testid="select-account-brand">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No brand</SelectItem>
                      {brands?.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Region</Label>
                  <Select value={formData.regionId || "none"} onValueChange={(v) => setFormData(p => ({ ...p, regionId: v === "none" ? "" : v }))}>
                    <SelectTrigger data-testid="select-account-region">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No region</SelectItem>
                      {regions?.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!formData.platform || !formData.accountName || createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-account"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingAccount ? "Update" : "Add"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowAddAccount(false); setEditingAccount(null); resetForm(); }}
                  data-testid="button-cancel-account"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : accounts && accounts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => {
                const brand = brands?.find(b => b.id === account.brandId);
                const region = regions?.find(r => r.id === account.regionId);
                return (
                  <TableRow key={account.id} data-testid={`row-account-${account.id}`}>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{platformLabels[account.platform] || account.platform}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{account.accountName}</TableCell>
                    <TableCell className="text-muted-foreground">{account.accountHandle || "-"}</TableCell>
                    <TableCell>{brand?.name || "-"}</TableCell>
                    <TableCell>{region?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={account.isActive ? "default" : "secondary"} className={`text-xs ${account.isActive ? "bg-green-600" : ""}`}>
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-account-menu-${account.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(account)} data-testid={`button-edit-account-${account.id}`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateMutation.mutate({ id: account.id, data: { isActive: !account.isActive } })}
                            data-testid={`button-toggle-account-${account.id}`}
                          >
                            {account.isActive ? <X className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                            {account.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(account.id)}
                            data-testid={`button-delete-account-${account.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <Webhook className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No social accounts configured yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add accounts to enable publishing to social media platforms</p>
          </div>
        )}
      </CardContent>
    </Card>

    <CanvaIntegrationSection />
    <MetaIntegrationSection />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <PlatformConnectionCard
        platformName="TikTok"
        platformIcon={<Video className="w-5 h-5" />}
        description="Connect your TikTok account to publish videos and photos directly"
        statusEndpoint="/api/tiktok/status"
        authEndpoint="/api/tiktok/auth-url"
        disconnectEndpoint="/api/tiktok/disconnect"
        testId="tiktok"
      />
      <PlatformConnectionCard
        platformName="LinkedIn"
        platformIcon={<Linkedin className="w-5 h-5" />}
        description="Connect your LinkedIn profile or company page to publish posts"
        statusEndpoint="/api/linkedin/status"
        authEndpoint="/api/linkedin/auth-url"
        disconnectEndpoint="/api/linkedin/disconnect"
        testId="linkedin"
      />
      <PlatformConnectionCard
        platformName="Twitter/X"
        platformIcon={<Twitter className="w-5 h-5" />}
        description="Connect your Twitter/X account to publish tweets"
        statusEndpoint="/api/twitter/status"
        authEndpoint="/api/twitter/auth-url"
        disconnectEndpoint="/api/twitter/disconnect"
        testId="twitter"
      />
      <PlatformConnectionCard
        platformName="RedNote"
        platformIcon={<BookOpen className="w-5 h-5" />}
        description="Connect your RedNote (Xiaohongshu) account to publish notes"
        statusEndpoint="/api/rednote/status"
        authEndpoint="/api/rednote/auth-url"
        disconnectEndpoint="/api/rednote/disconnect"
        testId="rednote"
      />
    </div>
    </>
  );
}

function IntegrationsTab() {
  const { toast } = useToast();

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const testDmMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/settings/slack/test-dm");
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Test DM sent to your Slack account" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to send test DM", variant: "destructive" });
    },
  });

  const lookupSlackIdMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/slack/lookup-user", { email });
      return await (res as Response).json() as { slackUserId: string | null; email: string };
    },
    onSuccess: (data: { slackUserId: string | null; email: string }) => {
      if (data.slackUserId) {
        toast({ title: "Found!", description: `Slack ID: ${data.slackUserId}` });
      } else {
        toast({ title: "Not Found", description: "No Slack user found with that email", variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to lookup Slack user", variant: "destructive" });
    },
  });

  const updateSlackIdMutation = useMutation({
    mutationFn: async ({ userId, slackUserId }: { userId: string; slackUserId: string }) => {
      return await apiRequest("PUT", `/api/users/${userId}/slack`, { slackUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "Slack ID updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const autoLinkMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/users/${userId}/slack/auto-link`);
      return res as { slackUserId: string | null };
    },
    onSuccess: (data: { slackUserId: string | null }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      if (data.slackUserId) {
        toast({ title: "Linked!", description: "User linked to Slack account" });
      } else {
        toast({ title: "Not Found", description: "No Slack user found with that email", variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to auto-link Slack account", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Slack Integration
          </CardTitle>
          <CardDescription>
            Connect Slack to send direct messages to team members when posts, emails, or events need their attention
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-4 bg-muted rounded-md space-y-2">
              <p className="text-sm font-medium">Setup Instructions:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Create a Slack App at <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">api.slack.com/apps</a></li>
                <li>Add bot scopes: <code className="text-xs bg-background px-1 rounded">chat:write</code>, <code className="text-xs bg-background px-1 rounded">im:write</code>, <code className="text-xs bg-background px-1 rounded">users:read.email</code></li>
                <li>Install the app to your workspace</li>
                <li>Copy the Bot User OAuth Token (starts with <code className="text-xs bg-background px-1 rounded">xoxb-</code>)</li>
                <li>Add it as a Replit Secret named <code className="text-xs bg-background px-1 rounded">SLACK_BOT_TOKEN</code></li>
              </ol>
            </div>
            <Button
              variant="outline"
              onClick={() => testDmMutation.mutate()}
              disabled={testDmMutation.isPending}
              data-testid="button-test-dm"
            >
              Send Test DM to Me
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Link Users to Slack
          </CardTitle>
          <CardDescription>
            Connect team members to their Slack accounts to receive direct message notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Slack ID</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.slackUserId ? (
                      <StatusBadge status="success">{user.slackUserId}</StatusBadge>
                    ) : (
                      <StatusBadge status="warning">Not linked</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => autoLinkMutation.mutate(user.id)}
                        disabled={autoLinkMutation.isPending}
                        title="Auto-link using email"
                        data-testid={`button-auto-link-${user.id}`}
                      >
                        Auto
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-4">
            Click "Auto" to automatically find a user's Slack ID by their email address. The Slack bot must have the users:read.email scope.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Workflow
          </CardTitle>
          <CardDescription>
            How the notification system works
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-semibold text-sm">1</div>
              <div>
                <p className="font-medium">Post/Email/Event Created</p>
                <p className="text-sm text-muted-foreground">When a social media manager creates content and assigns a designer, the designer receives a direct message with all relevant details and related brand assets.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-semibold text-sm">2</div>
              <div>
                <p className="font-medium">Graphics Completed</p>
                <p className="text-sm text-muted-foreground">When the designer marks the graphics as complete (status: FINAL for posts, or moves email status past DESIGNING), the assigned publisher receives a DM.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-semibold text-sm">3</div>
              <div>
                <p className="font-medium">Ready for Publishing</p>
                <p className="text-sm text-muted-foreground">The publisher can now schedule or publish the content knowing all assets are ready.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default function SettingsPage() {
  const { user: currentUser } = useAuthStore();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const { toast } = useToast();

  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const canvaError = params.get("canva_error");
    const canvaSuccess = params.get("canva_success");
    if (canvaError) {
      setTimeout(() => {
        toast({
          title: "Canva Connection Failed",
          description: canvaError,
          variant: "destructive",
        });
      }, 500);
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (canvaSuccess) {
      setTimeout(() => {
        toast({
          title: "Canva Connected",
          description: "Your Canva account has been connected successfully.",
        });
      }, 500);
      window.history.replaceState({}, "", window.location.pathname);
    }
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: brands, isLoading: brandsLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: brandRegions } = useQuery<BrandRegion[]>({
    queryKey: ["/api/brand-regions"],
  });

  const userForm = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "USER",
      regionId: "",
    },
  });

  const brandForm = useForm<BrandFormData>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: "",
      color: "#F7971C",
      dreamPimUrl: "",
      assetPortalUrl: "",
      assetPortalName: "",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsUserModalOpen(false);
      userForm.reset();
      toast({ title: "Success", description: "User created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: UserFormData & { id: string }) => {
      const { id, ...rest } = data;
      return await apiRequest("PUT", `/api/users/${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsUserModalOpen(false);
      setEditingUser(null);
      userForm.reset();
      toast({ title: "Success", description: "User updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PUT", `/api/users/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "User status updated" });
    },
  });

  const createBrandMutation = useMutation({
    mutationFn: async (data: BrandFormData) => {
      return await apiRequest("POST", "/api/brands", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      setIsBrandModalOpen(false);
      brandForm.reset();
      toast({ title: "Success", description: "Brand created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: async (data: BrandFormData & { id: string }) => {
      const { id, ...rest } = data;
      return await apiRequest("PUT", `/api/brands/${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      setIsBrandModalOpen(false);
      setEditingBrand(null);
      brandForm.reset();
      toast({ title: "Success", description: "Brand updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      userForm.reset({
        email: user.email,
        password: "",
        name: user.name,
        role: user.role as "ADMIN" | "MANAGER" | "USER",
        regionId: user.regionId || "",
      });
    } else {
      setEditingUser(null);
      userForm.reset();
    }
    setIsUserModalOpen(true);
  };

  const handleOpenBrandModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      brandForm.reset({
        name: brand.name,
        color: brand.color,
        dreamPimUrl: brand.dreamPimUrl || "",
        assetPortalUrl: brand.assetPortalUrl || "",
        assetPortalName: brand.assetPortalName || "",
      });
    } else {
      setEditingBrand(null);
      brandForm.reset({ name: "", color: "#F7971C", dreamPimUrl: "", assetPortalUrl: "", assetPortalName: "" });
    }
    setIsBrandModalOpen(true);
  };

  const onUserSubmit = (data: UserFormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ ...data, id: editingUser.id });
    } else {
      if (!data.password || data.password.length < 6) {
        toast({ title: "Error", description: "Password is required and must be at least 6 characters", variant: "destructive" });
        return;
      }
      createUserMutation.mutate(data);
    }
  };

  const onBrandSubmit = (data: BrandFormData) => {
    if (editingBrand) {
      updateBrandMutation.mutate({ ...data, id: editingBrand.id });
    } else {
      createBrandMutation.mutate(data);
    }
  };

  const roleColors: Record<string, "success" | "warning" | "info"> = {
    ADMIN: "success",
    MANAGER: "warning",
    USER: "info",
  };

  if (currentUser?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              You don't have permission to access this page. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground font-serif">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage users, brands, and system settings</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-users">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-2" data-testid="tab-brands">
            <Tags className="w-4 h-4" />
            Brands
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2" data-testid="tab-system">
            <Info className="w-4 h-4" />
            System Info
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2" data-testid="tab-integrations">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="platforms" className="flex items-center gap-2" data-testid="tab-platforms">
            <Webhook className="w-4 h-4" />
            Platforms
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </div>
              <Button
                onClick={() => handleOpenUserModal()}
                className="bg-brand-orange hover:bg-brand-orange-dark"
                data-testid="button-add-user"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-brand-orange-light">
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map((user, index) => {
                        const region = regions?.find((r) => r.id === user.regionId);
                        return (
                          <TableRow
                            key={user.id}
                            className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                            data-testid={`row-user-${user.id}`}
                          >
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <StatusBadge status={roleColors[user.role]}>
                                {user.role}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>{region?.name || "-"}</TableCell>
                            <TableCell>
                              {user.isActive ? (
                                <span className="flex items-center gap-1 text-status-success text-sm">
                                  <Check className="w-4 h-4" />
                                  Active
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-muted-foreground text-sm">
                                  <X className="w-4 h-4" />
                                  Inactive
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenUserModal(user)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      toggleUserMutation.mutate({
                                        id: user.id,
                                        isActive: !user.isActive,
                                      })
                                    }
                                  >
                                    {user.isActive ? (
                                      <>
                                        <X className="w-4 h-4 mr-2" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Brand Management</CardTitle>
                <CardDescription>Manage product brands</CardDescription>
              </div>
              <Button
                onClick={() => handleOpenBrandModal()}
                className="bg-brand-orange hover:bg-brand-orange-dark"
                data-testid="button-add-brand"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Brand
              </Button>
            </CardHeader>
            <CardContent>
              {brandsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brands?.map((brand) => {
                    const brandRegionIds = brandRegions?.filter(br => br.brandId === brand.id).map(br => br.regionId) || [];
                    const assignedRegions = regions?.filter(r => brandRegionIds.includes(r.id)) || [];
                    return (
                      <div
                        key={brand.id}
                        className="flex flex-col p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid={`card-brand-${brand.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg"
                              style={{ backgroundColor: brand.color }}
                            />
                            <div>
                              <p className="font-medium">{brand.name}</p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={`/brands/${brand.id}`}>
                                <DropdownMenuItem data-testid={`menu-view-brand-${brand.id}`}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem onClick={() => handleOpenBrandModal(brand)} data-testid={`menu-edit-brand-${brand.id}`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {assignedRegions.length > 0 ? (
                            assignedRegions.map(region => (
                              <Badge key={region.id} variant="secondary" className="text-xs">
                                {region.code || region.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No regions assigned</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>View system details and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Application</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span>Bloom & Grow Marketing Planner</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version</span>
                      <span>1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Environment</span>
                      <span>Production</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Statistics</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Users</span>
                      <span>{users?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Brands</span>
                      <span>{brands?.filter((b) => b.isActive).length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Regions</span>
                      <span>{regions?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Brand-Region Assignments</h3>
                <p className="text-sm text-muted-foreground">Shows which brands are available in each region</p>
                <div className="space-y-4">
                  {regions?.map((region) => {
                    const regionBrandIds = brandRegions?.filter(br => br.regionId === region.id).map(br => br.brandId) || [];
                    const regionBrands = brands?.filter(b => regionBrandIds.includes(b.id)) || [];
                    return (
                      <div
                        key={region.id}
                        className="p-4 border rounded-lg bg-muted/30"
                        data-testid={`region-brands-${region.code}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{region.name}</p>
                            <p className="text-xs text-muted-foreground">{region.code} • {region.timezone}</p>
                          </div>
                          <Badge variant="secondary">{regionBrands.length} brands</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {regionBrands.length > 0 ? (
                            regionBrands.map(brand => (
                              <Badge
                                key={brand.id}
                                variant="outline"
                                className="cursor-default"
                                style={{ borderLeft: `3px solid ${brand.color}` }}
                                data-testid={`brand-badge-${brand.id}`}
                              >
                                {brand.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground italic">No brands assigned</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="platforms">
          <PlatformsTab />
        </TabsContent>
      </Tabs>

      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user details" : "Create a new user account"}
            </DialogDescription>
          </DialogHeader>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
              <FormField
                control={userForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" {...field} data-testid="input-user-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email" {...field} data-testid="input-user-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editingUser ? "Password (leave blank to keep current)" : "Password"}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                        {...field}
                        data-testid="input-user-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="regionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-region">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {regions?.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-orange hover:bg-brand-orange-dark"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  data-testid="button-save-user"
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) ? "Saving..." : "Save User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isBrandModalOpen} onOpenChange={setIsBrandModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBrand ? "Edit Brand" : "Add Brand"}</DialogTitle>
            <DialogDescription>
              {editingBrand ? "Update brand details" : "Create a new brand"}
            </DialogDescription>
          </DialogHeader>
          <Form {...brandForm}>
            <form onSubmit={brandForm.handleSubmit(onBrandSubmit)} className="space-y-4">
              <FormField
                control={brandForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter brand name" {...field} data-testid="input-brand-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={brandForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" {...field} className="w-16 h-10 p-1" data-testid="input-brand-color" />
                        <Input
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="#F7971C"
                          className="flex-1"
                          data-testid="input-brand-color-hex"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={brandForm.control}
                name="dreamPimUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DreamPIM URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://dreampim.com/brand/..." {...field} data-testid="input-dreampim-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={brandForm.control}
                  name="assetPortalUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Portal URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} data-testid="input-asset-portal-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={brandForm.control}
                  name="assetPortalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Asset Portal" {...field} data-testid="input-asset-portal-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsBrandModalOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-orange hover:bg-brand-orange-dark"
                  disabled={createBrandMutation.isPending || updateBrandMutation.isPending}
                  data-testid="button-save-brand"
                >
                  {(createBrandMutation.isPending || updateBrandMutation.isPending) ? "Saving..." : "Save Brand"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

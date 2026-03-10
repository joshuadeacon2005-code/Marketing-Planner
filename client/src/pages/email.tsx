import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import {
  Plus,
  Calendar,
  Columns3,
  List,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  GripVertical,
  Mail,
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
import { StatusBadge, getStatusVariant } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EmailCampaign, Brand, Region, User } from "@shared/schema";

const emailFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  brandId: z.string().min(1, "Brand is required"),
  regionId: z.string().min(1, "Region is required"),
  emailType: z.enum(["TRADE_PROMOTIONS", "PRODUCT_LAUNCHES", "RETAILER_TOOLKITS", "EVENT_INVITATIONS", "BRAND_UPDATES"]),
  status: z.enum(["PLANNING", "DESIGNING", "QA", "SCHEDULED", "SENT"]),
  scheduledDate: z.string().optional(),
  subject: z.string().optional(),
  previewText: z.string().optional(),
  designerId: z.string().optional(),
  publisherId: z.string().optional(),
});

type EmailFormData = z.infer<typeof emailFormSchema>;

const kanbanColumns = [
  { id: "PLANNING", title: "Planning", color: "bg-status-warning" },
  { id: "DESIGNING", title: "Designing", color: "bg-status-info" },
  { id: "QA", title: "QA", color: "bg-brand-blue" },
  { id: "SCHEDULED", title: "Scheduled", color: "bg-status-success" },
  { id: "SENT", title: "Sent", color: "bg-gray-500" },
];

function KanbanCard({
  campaign,
  onEdit,
  onDelete,
  brands,
}: {
  campaign: EmailCampaign;
  onEdit: () => void;
  onDelete: () => void;
  brands?: Brand[];
}) {
  const brand = brands?.find((b) => b.id === campaign.brandId);

  return (
    <div
      className="bg-card rounded-lg border p-3 mb-2 hover:shadow-md transition-shadow cursor-pointer group"
      data-testid={`card-email-${campaign.id}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-foreground truncate">{campaign.name}</h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: brand?.color || "#F7971C" }}
            />
            <span className="text-xs text-muted-foreground">{brand?.name || "-"}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <StatusBadge status={getStatusVariant(campaign.emailType)} className="text-[10px] px-2 py-0.5">
              {campaign.emailType.replace(/_/g, " ")}
            </StatusBadge>
            {campaign.scheduledDate && (
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(campaign.scheduledDate), "MMM d")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmailPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [view, setView] = useState<"calendar" | "kanban" | "list">("kanban");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Auto-open modal when ?new=true is in URL
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get("new") === "true") {
      setIsModalOpen(true);
      setEditingCampaign(null);
      setLocation("/email", { replace: true });
    }
  }, [searchString, setLocation]);

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<EmailCampaign[]>({
    queryKey: ["/api/email-campaigns"],
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

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      name: "",
      brandId: "",
      regionId: "",
      emailType: "TRADE_PROMOTIONS",
      status: "PLANNING",
      scheduledDate: "",
      subject: "",
      previewText: "",
      designerId: "",
      publisherId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      return await apiRequest("POST", "/api/email-campaigns", {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate).toISOString() : null,
        designerId: data.designerId && data.designerId !== "none" ? data.designerId : null,
        publisherId: data.publisherId && data.publisherId !== "none" ? data.publisherId : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-campaigns"] });
      setIsModalOpen(false);
      form.reset();
      toast({ title: "Success", description: "Email campaign created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EmailFormData & { id: string }) => {
      const { id, ...rest } = data;
      return await apiRequest("PUT", `/api/email-campaigns/${id}`, {
        ...rest,
        scheduledDate: rest.scheduledDate ? new Date(rest.scheduledDate).toISOString() : null,
        designerId: rest.designerId && rest.designerId !== "none" ? rest.designerId : null,
        publisherId: rest.publisherId && rest.publisherId !== "none" ? rest.publisherId : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-campaigns"] });
      setIsModalOpen(false);
      setEditingCampaign(null);
      form.reset();
      toast({ title: "Success", description: "Email campaign updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/email-campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-campaigns"] });
      toast({ title: "Success", description: "Email campaign deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenModal = (campaign?: EmailCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      form.reset({
        name: campaign.name,
        brandId: campaign.brandId,
        regionId: campaign.regionId,
        emailType: campaign.emailType,
        status: campaign.status,
        scheduledDate: campaign.scheduledDate
          ? format(new Date(campaign.scheduledDate), "yyyy-MM-dd'T'HH:mm")
          : "",
        subject: campaign.subject || "",
        previewText: campaign.previewText || "",
        designerId: campaign.designerId || "",
        publisherId: campaign.publisherId || "",
      });
    } else {
      setEditingCampaign(null);
      form.reset();
    }
    setIsModalOpen(true);
  };

  const onSubmit = (data: EmailFormData) => {
    if (editingCampaign) {
      updateMutation.mutate({ ...data, id: editingCampaign.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredCampaigns = campaigns?.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calendarEvents = filteredCampaigns
    ?.filter((c) => c.scheduledDate)
    .map((campaign) => {
      const brand = brands?.find((b) => b.id === campaign.brandId);
      return {
        id: campaign.id,
        title: campaign.name,
        start: campaign.scheduledDate!,
        backgroundColor: brand?.color || "#F7971C",
        borderColor: brand?.color || "#F7971C",
      };
    });

  const inProgressCampaigns = filteredCampaigns?.filter((c) => 
    c.status !== "SENT" && c.status !== "SCHEDULED"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif">Email Marketing</h1>
          <p className="text-muted-foreground mt-1">Manage your email campaigns</p>
        </div>
        <GlassButton
          onClick={() => handleOpenModal()}
          variant="purple"
          size="sm"
          contentClassName="flex items-center gap-2"
          data-testid="button-create-email"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </GlassButton>
      </div>

      {inProgressCampaigns && inProgressCampaigns.length > 0 && (
        <Card className="border-brand-orange/20 bg-brand-orange/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
              In Progress Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressCampaigns.map((campaign) => {
                const brand = brands?.find((b) => b.id === campaign.brandId);
                return (
                  <div 
                    key={campaign.id}
                    className="p-3 rounded-lg border bg-card hover:border-brand-orange/50 transition-colors cursor-pointer"
                    onClick={() => handleOpenModal(campaign)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium truncate flex-1 mr-2">{campaign.name}</h4>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brand?.color }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <StatusBadge status={getStatusVariant(campaign.status)} className="text-[10px]">
                        {campaign.status}
                      </StatusBadge>
                      {campaign.scheduledDate && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(campaign.scheduledDate), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={view === "kanban" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("kanban")}
                className={view === "kanban" ? "bg-brand-orange hover:bg-brand-orange-dark" : ""}
                data-testid="button-kanban-view"
              >
                <Columns3 className="w-4 h-4 mr-1" />
                Kanban
              </Button>
              <Button
                variant={view === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("calendar")}
                className={view === "calendar" ? "bg-brand-orange hover:bg-brand-orange-dark" : ""}
                data-testid="button-calendar-view"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Calendar
              </Button>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("list")}
                className={view === "list" ? "bg-brand-orange hover:bg-brand-orange-dark" : ""}
                data-testid="button-list-view"
              >
                <List className="w-4 h-4 mr-1" />
                List
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-search-emails"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {campaignsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : view === "kanban" ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {kanbanColumns.map((column) => {
                const columnCampaigns = filteredCampaigns?.filter((c) => c.status === column.id) || [];
                return (
                  <div
                    key={column.id}
                    className="flex-shrink-0 w-72 bg-muted/30 rounded-lg p-3"
                    data-testid={`column-${column.id.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${column.color}`} />
                      <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {columnCampaigns.length}
                      </span>
                    </div>
                    <div className="space-y-2 min-h-[200px]">
                      {columnCampaigns.map((campaign) => (
                        <KanbanCard
                          key={campaign.id}
                          campaign={campaign}
                          brands={brands}
                          onEdit={() => handleOpenModal(campaign)}
                          onDelete={() => deleteMutation.mutate(campaign.id)}
                        />
                      ))}
                      {columnCampaigns.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No campaigns
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : view === "calendar" ? (
            <div className="fc-wrapper">
              <style>{`
                .fc {
                  --fc-border-color: hsl(var(--border));
                  --fc-today-bg-color: rgba(247, 151, 28, 0.1);
                }
                .fc-toolbar-title {
                  font-family: Poppins, sans-serif;
                  font-size: 1.25rem !important;
                  font-weight: 600;
                }
                .fc-button {
                  background-color: white !important;
                  border-color: hsl(var(--border)) !important;
                  color: hsl(var(--foreground)) !important;
                }
                .fc-button:hover {
                  background-color: hsl(var(--muted)) !important;
                }
                .fc-button-active {
                  background-color: #F7971C !important;
                  border-color: #F7971C !important;
                  color: white !important;
                }
              `}</style>
              <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth",
                }}
                events={calendarEvents}
                eventClick={(info) => {
                  const campaign = campaigns?.find((c) => c.id === info.event.id);
                  if (campaign) handleOpenModal(campaign);
                }}
                height="auto"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCampaigns?.map((campaign) => {
                const brand = brands?.find((b) => b.id === campaign.brandId);
                return (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`row-email-${campaign.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-orange-light">
                        <Mail className="w-5 h-5 text-brand-orange" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{campaign.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {brand?.name} • {campaign.emailType.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {campaign.designerId && (
                          <span>Designer: {users?.find((u) => u.id === campaign.designerId)?.name}</span>
                        )}
                        {campaign.publisherId && (
                          <span>Publisher: {users?.find((u) => u.id === campaign.publisherId)?.name}</span>
                        )}
                      </div>
                      <StatusBadge status={getStatusVariant(campaign.status)}>
                        {campaign.status}
                      </StatusBadge>
                      {campaign.scheduledDate && (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(campaign.scheduledDate), "MMM d, yyyy")}
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenModal(campaign)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(campaign.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
              {(!filteredCampaigns || filteredCampaigns.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No email campaigns found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? "Edit Email Campaign" : "Create Email Campaign"}</DialogTitle>
            <DialogDescription>
              {editingCampaign ? "Update the campaign details" : "Add a new email campaign"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter campaign name" {...field} data-testid="input-campaign-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-brand">
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands?.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-region">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emailType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-email-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="TRADE_PROMOTIONS">Trade Promotions</SelectItem>
                          <SelectItem value="PRODUCT_LAUNCHES">Product Launches</SelectItem>
                          <SelectItem value="RETAILER_TOOLKITS">Retailer Toolkits</SelectItem>
                          <SelectItem value="EVENT_INVITATIONS">Event Invitations</SelectItem>
                          <SelectItem value="BRAND_UPDATES">Brand Updates</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PLANNING">Planning</SelectItem>
                          <SelectItem value="DESIGNING">Designing</SelectItem>
                          <SelectItem value="QA">QA</SelectItem>
                          <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                          <SelectItem value="SENT">Sent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-scheduled-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Line</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email subject" {...field} data-testid="input-subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="previewText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preview Text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter preview text..."
                        rows={2}
                        {...field}
                        data-testid="input-preview-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="designerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-designer">
                            <SelectValue placeholder="Assign designer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No designer</SelectItem>
                          {users?.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="publisherId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publisher</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-publisher">
                            <SelectValue placeholder="Assign publisher" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No publisher</SelectItem>
                          {users?.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-orange hover:bg-brand-orange-dark"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-campaign"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Campaign"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

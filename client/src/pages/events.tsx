import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import {
  Plus,
  Calendar,
  List,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle2,
  Circle,
  X,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/ui/glass-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge, getStatusVariant } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { DuplicateDialog } from "@/components/duplicate-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event, Brand, Region, EventDeliverable, User } from "@shared/schema";

const eventFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  eventType: z.enum(["TRADE_SHOW", "PRODUCT_LAUNCH", "RETAILER_TRAINING", "CONSUMER_EVENT", "INTERNAL_MEETING"]).optional(),
  status: z.enum(["PLANNING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  regionId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  plannedBudget: z.string().optional(),
  actualBudget: z.string().optional(),
  isPromotion: z.boolean().optional(),
  promotionDetails: z.string().optional(),
  designerId: z.string().optional(),
  publisherId: z.string().optional(),
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface EventWithDetails extends Event {
  deliverables?: EventDeliverable[];
}

export default function EventsPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithDetails | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newDeliverable, setNewDeliverable] = useState("");
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatingEvent, setDuplicatingEvent] = useState<EventWithDetails | null>(null);
  const { toast } = useToast();

  // Auto-open modal when ?new=true is in URL
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get("new") === "true") {
      setIsModalOpen(true);
      setEditingEvent(null);
      setLocation("/events", { replace: true });
    }
  }, [searchString, setLocation]);

  const { data: events, isLoading: eventsLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["/api/events"],
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

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      eventType: "TRADE_SHOW",
      status: "PLANNING",
      regionId: "",
      startDate: "",
      endDate: "",
      location: "",
      description: "",
      plannedBudget: "",
      actualBudget: "",
      isPromotion: false,
      promotionDetails: "",
      designerId: "",
      publisherId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      return await apiRequest("POST", "/api/events", {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        eventType: data.eventType || null,
        regionId: data.regionId || null,
        plannedBudget: data.plannedBudget || null,
        actualBudget: data.actualBudget || null,
        isPromotion: data.isPromotion || false,
        promotionDetails: data.promotionDetails || null,
        designerId: data.designerId && data.designerId !== "none" ? data.designerId : null,
        publisherId: data.publisherId && data.publisherId !== "none" ? data.publisherId : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsModalOpen(false);
      form.reset();
      toast({ title: "Success", description: "Event created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EventFormData & { id: string }) => {
      const { id, ...rest } = data;
      return await apiRequest("PUT", `/api/events/${id}`, {
        ...rest,
        startDate: rest.startDate ? new Date(rest.startDate).toISOString() : null,
        endDate: rest.endDate ? new Date(rest.endDate).toISOString() : null,
        eventType: rest.eventType || null,
        regionId: rest.regionId || null,
        plannedBudget: rest.plannedBudget || null,
        actualBudget: rest.actualBudget || null,
        isPromotion: rest.isPromotion || false,
        promotionDetails: rest.promotionDetails || null,
        designerId: rest.designerId && rest.designerId !== "none" ? rest.designerId : null,
        publisherId: rest.publisherId && rest.publisherId !== "none" ? rest.publisherId : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsModalOpen(false);
      setEditingEvent(null);
      form.reset();
      toast({ title: "Success", description: "Event updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setSelectedEvent(null);
      toast({ title: "Success", description: "Event deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addDeliverableMutation = useMutation({
    mutationFn: async ({ eventId, name }: { eventId: string; name: string }) => {
      return await apiRequest("POST", `/api/events/${eventId}/deliverables`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setNewDeliverable("");
      toast({ title: "Success", description: "Deliverable added" });
    },
  });

  const toggleDeliverableMutation = useMutation({
    mutationFn: async ({ eventId, deliverableId, isCompleted }: { eventId: string; deliverableId: string; isCompleted: boolean }) => {
      return await apiRequest("PUT", `/api/events/${eventId}/deliverables/${deliverableId}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const handleOpenModal = (event?: EventWithDetails) => {
    if (event) {
      setEditingEvent(event);
      form.reset({
        name: event.name,
        eventType: event.eventType,
        status: event.status,
        regionId: event.regionId,
        startDate: event.startDate ? format(new Date(event.startDate), "yyyy-MM-dd'T'HH:mm") : "",
        endDate: event.endDate ? format(new Date(event.endDate), "yyyy-MM-dd'T'HH:mm") : "",
        location: event.location || "",
        description: event.description || "",
        plannedBudget: event.plannedBudget?.toString() || "",
        actualBudget: event.actualBudget?.toString() || "",
        isPromotion: event.isPromotion || false,
        promotionDetails: event.promotionDetails || "",
        designerId: event.designerId || "",
        publisherId: event.publisherId || "",
      });
    } else {
      setEditingEvent(null);
      form.reset();
    }
    setIsModalOpen(true);
  };

  const onSubmit = (data: EventFormData) => {
    if (editingEvent) {
      updateMutation.mutate({ ...data, id: editingEvent.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredEvents = events?.filter((event) =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calendarEvents = filteredEvents?.filter((event) => event.startDate).map((event) => ({
    id: event.id,
    title: event.name,
    start: event.startDate,
    end: event.endDate || event.startDate,
    backgroundColor: event.status === "CANCELLED" ? "#EF4444" : event.status === "COMPLETED" ? "#10B981" : "#F7971C",
    borderColor: "transparent",
  }));

  const statusColors: Record<string, string> = {
    PLANNING: "bg-status-warning",
    CONFIRMED: "bg-status-success",
    COMPLETED: "bg-gray-500",
    CANCELLED: "bg-status-error",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif">Events & Promotions</h1>
          <p className="text-muted-foreground mt-1">Manage marketing events and activities</p>
        </div>
        <GlassButton
          onClick={() => handleOpenModal()}
          variant="success"
          size="sm"
          contentClassName="flex items-center gap-2"
          data-testid="button-create-event"
        >
          <Plus className="w-4 h-4" />
          <span>New Event</span>
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selectedEvent ? "lg:col-span-2" : "lg:col-span-3"}>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
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
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search-events"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
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
                    .fc-event {
                      cursor: pointer;
                      border-radius: 4px;
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
                      const event = events?.find((e) => e.id === info.event.id);
                      if (event) setSelectedEvent(event);
                    }}
                    height="auto"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEvents?.map((event) => {
                    const region = regions?.find((r) => r.id === event.regionId);
                    const duration = event.startDate && event.endDate ? differenceInDays(new Date(event.endDate), new Date(event.startDate)) + 1 : null;
                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedEvent(event)}
                        data-testid={`row-event-${event.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-1 h-12 rounded-full ${statusColors[event.status]}`} />
                          <div>
                            <h4 className="font-medium text-foreground">{event.name}</h4>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {event.startDate ? format(new Date(event.startDate), "MMM d") : "TBD"} - {event.endDate ? format(new Date(event.endDate), "MMM d, yyyy") : "TBD"}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {event.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {event.designerId && (
                              <span>Designer: {users?.find((u) => u.id === event.designerId)?.name}</span>
                            )}
                            {event.publisherId && (
                              <span>Publisher: {users?.find((u) => u.id === event.publisherId)?.name}</span>
                            )}
                          </div>
                          <StatusBadge status={getStatusVariant(event.status)}>
                            {event.status}
                          </StatusBadge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenModal(event)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setDuplicatingEvent(event);
                                  setDuplicateDialogOpen(true);
                                }}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate to Regions
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteMutation.mutate(event.id)}
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
                  {(!filteredEvents || filteredEvents.length === 0) && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No events found</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedEvent && (
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{selectedEvent.name}</CardTitle>
                    <CardDescription>
                      {selectedEvent.eventType ? selectedEvent.eventType.replace(/_/g, " ") : "Unspecified"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedEvent(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="details">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="deliverables">Tasks</TabsTrigger>
                    <TabsTrigger value="budget">Budget</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {selectedEvent.startDate ? format(new Date(selectedEvent.startDate), "MMM d, yyyy h:mm a") : "TBD"} -
                          {selectedEvent.endDate ? format(new Date(selectedEvent.endDate), "MMM d, yyyy h:mm a") : "TBD"}
                        </span>
                      </div>
                      {selectedEvent.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{selectedEvent.location}</span>
                        </div>
                      )}
                      <div className="pt-2">
                        <StatusBadge status={getStatusVariant(selectedEvent.status)}>
                          {selectedEvent.status}
                        </StatusBadge>
                      </div>
                      {selectedEvent.description && (
                        <p className="text-sm text-muted-foreground pt-2">
                          {selectedEvent.description}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="deliverables" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      {selectedEvent.deliverables?.map((deliverable) => (
                        <div
                          key={deliverable.id}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={deliverable.isCompleted}
                            onCheckedChange={(checked) =>
                              toggleDeliverableMutation.mutate({
                                eventId: selectedEvent.id,
                                deliverableId: deliverable.id,
                                isCompleted: !!checked,
                              })
                            }
                          />
                          <span className={deliverable.isCompleted ? "line-through text-muted-foreground" : ""}>
                            {deliverable.name}
                          </span>
                        </div>
                      ))}
                      {(!selectedEvent.deliverables || selectedEvent.deliverables.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No deliverables yet
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add deliverable..."
                        value={newDeliverable}
                        onChange={(e) => setNewDeliverable(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newDeliverable.trim()) {
                            addDeliverableMutation.mutate({
                              eventId: selectedEvent.id,
                              name: newDeliverable.trim(),
                            });
                          }
                        }}
                        data-testid="input-new-deliverable"
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          if (newDeliverable.trim()) {
                            addDeliverableMutation.mutate({
                              eventId: selectedEvent.id,
                              name: newDeliverable.trim(),
                            });
                          }
                        }}
                        className="bg-brand-orange hover:bg-brand-orange-dark"
                        data-testid="button-add-deliverable"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="budget" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Planned Budget</span>
                          <span className="font-medium">
                            ${selectedEvent.plannedBudget ? Number(selectedEvent.plannedBudget).toLocaleString() : "0"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Actual Spend</span>
                          <span className="font-medium">
                            ${selectedEvent.actualBudget ? Number(selectedEvent.actualBudget).toLocaleString() : "0"}
                          </span>
                        </div>
                      </div>
                      {selectedEvent.plannedBudget && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>Budget Used</span>
                            <span>
                              {Math.round(
                                ((Number(selectedEvent.actualBudget) || 0) / Number(selectedEvent.plannedBudget)) * 100
                              )}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min(
                              100,
                              ((Number(selectedEvent.actualBudget) || 0) / Number(selectedEvent.plannedBudget)) * 100
                            )}
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleOpenModal(selectedEvent)}
                    data-testid="button-edit-event"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(selectedEvent.id)}
                    data-testid="button-delete-event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
            <DialogDescription>
              {editingEvent ? "Update the event details" : "Add a new marketing event"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter event name" {...field} data-testid="input-event-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-event-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="TRADE_SHOW">Trade Show</SelectItem>
                          <SelectItem value="PRODUCT_LAUNCH">Product Launch</SelectItem>
                          <SelectItem value="RETAILER_TRAINING">Retailer Training</SelectItem>
                          <SelectItem value="CONSUMER_EVENT">Consumer Event</SelectItem>
                          <SelectItem value="INTERNAL_MEETING">Internal Meeting</SelectItem>
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
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter event location" {...field} data-testid="input-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter event description..." rows={3} {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="plannedBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Planned Budget ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" {...field} data-testid="input-planned-budget" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="actualBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Budget ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" {...field} data-testid="input-actual-budget" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="isPromotion"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-is-promotion"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>This is an Active Promotion</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Mark this as a promotion for ad idea reference
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              {form.watch("isPromotion") && (
                <FormField
                  control={form.control}
                  name="promotionDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promotion Details</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the promotion, discounts, offers..." rows={2} {...field} data-testid="input-promotion-details" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
                      <FormLabel>Social Media Publisher</FormLabel>
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
                  data-testid="button-save-event"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Event"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {duplicatingEvent && (
        <DuplicateDialog
          open={duplicateDialogOpen}
          onOpenChange={(open) => {
            setDuplicateDialogOpen(open);
            if (!open) setDuplicatingEvent(null);
          }}
          itemId={duplicatingEvent.id}
          itemName={duplicatingEvent.name}
          entityType="events"
          currentRegionId={duplicatingEvent.regionId}
        />
      )}
    </div>
  );
}

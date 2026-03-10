import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  Columns3,
  List,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  GripVertical,
  CheckSquare,
  Calendar,
  Flag,
  Copy,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { DuplicateDialog } from "@/components/duplicate-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, Brand, Region, User } from "@shared/schema";

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  brandId: z.string().optional(),
  regionId: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

const kanbanColumns = [
  { id: "BACKLOG", title: "Backlog", color: "#8B7355" },
  { id: "TODO", title: "To Do", color: "#D4A574" },
  { id: "IN_PROGRESS", title: "In Progress", color: "#6B8E23" },
  { id: "REVIEW", title: "Review", color: "#CD853F" },
  { id: "DONE", title: "Done", color: "#556B2F" },
];

const priorityColors: Record<string, string> = {
  LOW: "text-status-info",
  MEDIUM: "text-status-warning",
  HIGH: "text-status-error",
  URGENT: "text-status-error",
};

function KanbanCard({
  task,
  onEdit,
  onDelete,
  onDuplicate,
  onDragStart,
  brands,
  users,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart: (e: React.DragEvent) => void;
  brands?: Brand[];
  users?: User[];
}) {
  const brand = brands?.find((b) => b.id === task.brandId);
  const assignee = users?.find((u) => u.id === task.assigneeId);

  return (
    <Card
      className="cursor-move transition-all duration-300 border bg-white/60 dark:bg-card/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-card/80 hover:shadow-lg group"
      draggable
      onDragStart={onDragStart}
      data-testid={`card-task-${task.id}`}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-foreground leading-tight line-clamp-2">{task.title}</h4>
            <div className="flex items-center gap-1">
              <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-move" />
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
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate to Regions
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="text-xs"
              style={brand ? { backgroundColor: `${brand.color}20`, color: brand.color } : {}}
            >
              {brand?.name || "No Brand"}
            </Badge>
            <Badge
              variant="secondary"
              className={`text-xs ${
                task.priority === "URGENT" || task.priority === "HIGH"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : task.priority === "MEDIUM"
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              }`}
            >
              {task.priority}
            </Badge>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center gap-3 text-muted-foreground">
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{format(new Date(task.dueDate), "MMM d")}</span>
                </div>
              )}
            </div>

            {assignee && (
              <Avatar className="w-7 h-7 ring-2 ring-white/50 dark:ring-card/50">
                <AvatarFallback className="bg-brand-orange text-white text-xs font-medium">
                  {assignee.name?.split(" ").map((n) => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TasksPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatingTask, setDuplicatingTask] = useState<Task | null>(null);
  const { toast } = useToast();

  // Auto-open modal when ?new=true is in URL
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get("new") === "true") {
      setIsModalOpen(true);
      setEditingTask(null);
      setLocation("/tasks", { replace: true });
    }
  }, [searchString, setLocation]);

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
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

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      brandId: "",
      regionId: "",
      assigneeId: "",
      dueDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      return await apiRequest("POST", "/api/tasks", {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        brandId: data.brandId || null,
        regionId: data.regionId || null,
        assigneeId: data.assigneeId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsModalOpen(false);
      form.reset();
      toast({ title: "Success", description: "Task created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TaskFormData & { id: string }) => {
      const { id, ...rest } = data;
      return await apiRequest("PUT", `/api/tasks/${id}`, {
        ...rest,
        dueDate: rest.dueDate ? new Date(rest.dueDate).toISOString() : null,
        brandId: rest.brandId || null,
        regionId: rest.regionId || null,
        assigneeId: rest.assigneeId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsModalOpen(false);
      setEditingTask(null);
      form.reset();
      toast({ title: "Success", description: "Task updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const statusUpdateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PUT", `/api/tasks/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task moved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      form.reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        brandId: task.brandId || "",
        regionId: task.regionId || "",
        assigneeId: task.assigneeId || "",
        dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd'T'HH:mm") : "",
      });
    } else {
      setEditingTask(null);
      form.reset();
    }
    setIsModalOpen(true);
  };

  const onSubmit = (data: TaskFormData) => {
    if (editingTask) {
      updateMutation.mutate({ ...data, id: editingTask.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredTasks = tasks?.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const inProgressTasks = filteredTasks?.filter((t) => 
    t.status === "IN_PROGRESS" || t.status === "REVIEW"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage your marketing tasks and to-dos</p>
        </div>
        <GlassButton
          onClick={() => handleOpenModal()}
          variant="primary"
          size="sm"
          contentClassName="flex items-center gap-2"
          data-testid="button-create-task"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </GlassButton>
      </div>

      {inProgressTasks && inProgressTasks.length > 0 && (
        <Card className="border-brand-orange/20 bg-brand-orange/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
              In Progress Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressTasks.map((task) => {
                const brand = brands?.find((b) => b.id === task.brandId);
                return (
                  <div 
                    key={task.id}
                    className="p-3 rounded-lg border bg-card hover:border-brand-orange/50 transition-colors cursor-pointer"
                    onClick={() => handleOpenModal(task)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium truncate flex-1 mr-2">{task.title}</h4>
                      {brand && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brand.color }} />}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <StatusBadge status={getStatusVariant(task.status)} className="text-[10px]">
                          {task.status.replace(/_/g, " ")}
                        </StatusBadge>
                        <StatusBadge status={getStatusVariant(task.priority)} className="text-[10px]">
                          {task.priority}
                        </StatusBadge>
                      </div>
                      {task.dueDate && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(task.dueDate), "MMM d")}
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
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="input-search-tasks"
                />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32" data-testid="select-priority-filter">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : view === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {kanbanColumns.map((column) => {
                const columnTasks = filteredTasks?.filter((t) => t.status === column.id) || [];
                return (
                  <div
                    key={column.id}
                    className="bg-white/20 dark:bg-card/20 backdrop-blur-xl rounded-2xl p-5 border border-border/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                      if (data.taskId && data.sourceColumn !== column.id) {
                        statusUpdateMutation.mutate({ id: data.taskId, status: column.id });
                      }
                    }}
                    data-testid={`column-${column.id.toLowerCase().replace(/_/g, "-")}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
                        <h3 className="font-semibold text-foreground">{column.title}</h3>
                        <Badge variant="secondary" className="bg-muted/80 text-muted-foreground">
                          {columnTasks.length}
                        </Badge>
                      </div>
                      <button 
                        className="p-1.5 rounded-full bg-white/30 dark:bg-card/30 hover:bg-white/50 dark:hover:bg-card/50 transition-colors"
                        onClick={() => {
                          form.reset({ ...form.getValues(), status: column.id as any });
                          handleOpenModal();
                        }}
                      >
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="space-y-3 min-h-[150px]">
                      {columnTasks.map((task) => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          brands={brands}
                          users={users}
                          onEdit={() => handleOpenModal(task)}
                          onDelete={() => deleteMutation.mutate(task.id)}
                          onDuplicate={() => {
                            setDuplicatingTask(task);
                            setDuplicateDialogOpen(true);
                          }}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: task.id, sourceColumn: task.status }));
                          }}
                        />
                      ))}
                      {columnTasks.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border/30 rounded-xl">
                          Drop tasks here
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks?.map((task) => {
                const brand = brands?.find((b) => b.id === task.brandId);
                const assignee = users?.find((u) => u.id === task.assigneeId);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`row-task-${task.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <CheckSquare className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium text-foreground">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {brand && (
                            <span className="text-xs text-muted-foreground">{brand.name}</span>
                          )}
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              Due {format(new Date(task.dueDate), "MMM d")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={getStatusVariant(task.priority)}>
                        {task.priority}
                      </StatusBadge>
                      <StatusBadge status={getStatusVariant(task.status)}>
                        {task.status.replace(/_/g, " ")}
                      </StatusBadge>
                      {assignee && (
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-orange text-white text-xs font-medium">
                          {assignee.name?.split(" ").map((n) => n[0]).join("").toUpperCase()}
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenModal(task)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setDuplicatingTask(task);
                              setDuplicateDialogOpen(true);
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate to Regions
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(task.id)}
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
              {(!filteredTasks || filteredTasks.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No tasks found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Update the task details" : "Add a new task"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} data-testid="input-task-title" />
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
                      <Textarea placeholder="Enter task description..." rows={3} {...field} data-testid="input-task-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
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
                          <SelectItem value="BACKLOG">Backlog</SelectItem>
                          <SelectItem value="TODO">To Do</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="REVIEW">Review</SelectItem>
                          <SelectItem value="DONE">Done</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
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
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-brand">
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
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
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-assignee">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
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
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-due-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-orange hover:bg-brand-orange-dark"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-task"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {duplicatingTask && (
        <DuplicateDialog
          open={duplicateDialogOpen}
          onOpenChange={(open) => {
            setDuplicateDialogOpen(open);
            if (!open) setDuplicatingTask(null);
          }}
          itemId={duplicatingTask.id}
          itemName={duplicatingTask.title}
          entityType="tasks"
          currentRegionId={duplicatingTask.regionId || ""}
        />
      )}
    </div>
  );
}

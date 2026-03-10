import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowRight,
  Instagram,
  Facebook,
  Video,
  Linkedin,
  Twitter,
  Mail,
  Globe,
  CalendarDays,
  Link2,
  PenTool,
  Send,
  Palette,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RotateCcw,
  Hash,
  AtSign,
  Eye,
  Image,
  Pencil,
  History,
  Users,
  Save,
  BarChart3,
  BookOpen,
  Upload,
  ImagePlus,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { PlatformPreviewModal } from "@/components/platform-preview";
import { AnalyticsModal } from "@/components/analytics-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAutocomplete } from "@/components/user-autocomplete";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  Project,
  ProjectDeliverable,
  Brand,
  Region,
  User,
  DeliverableType,
  WorkflowStage,
  DeliverableReference,
} from "@shared/schema";
import { DELIVERABLE_PRESET_DIMENSIONS, getCanvaNewDesignUrl } from "@shared/schema";

interface ProjectDetailModalProps {
  projectId: string | null;
  open: boolean;
  onClose: () => void;
}

const DELIVERABLE_TYPE_CONFIG: Record<
  DeliverableType,
  { label: string; icon: React.ElementType }
> = {
  INSTAGRAM_POST: { label: "Instagram Post", icon: Instagram },
  INSTAGRAM_STORY: { label: "Instagram Story", icon: Instagram },
  INSTAGRAM_REEL: { label: "Instagram Reel", icon: Instagram },
  FACEBOOK_POST: { label: "Facebook Post", icon: Facebook },
  TIKTOK_POST: { label: "TikTok Post", icon: Video },
  LINKEDIN_POST: { label: "LinkedIn Post", icon: Linkedin },
  TWITTER_POST: { label: "Twitter Post", icon: Twitter },
  REDNOTE_POST: { label: "RedNote Post", icon: BookOpen },
  EDM_GRAPHIC: { label: "EDM Graphic", icon: Mail },
  WEBSITE_BANNER: { label: "Website Banner", icon: Globe },
  EVENT_MATERIAL: { label: "Event Material", icon: CalendarDays },
};

const WORKFLOW_STAGES: { key: WorkflowStage; label: string; icon: React.ElementType }[] = [
  { key: "DESIGN", label: "Design", icon: Palette },
  { key: "COPYWRITING", label: "Copywriting", icon: PenTool },
  { key: "PUBLISHING", label: "Publishing", icon: Send },
];

function getStageStatus(
  currentStage: WorkflowStage,
  stageKey: WorkflowStage,
  deliverable: ProjectDeliverable
): "done" | "in_progress" | "pending" | "revision" {
  const stageOrder: WorkflowStage[] = ["DESIGN", "COPYWRITING", "PUBLISHING", "COMPLETED"];
  const currentIdx = stageOrder.indexOf(currentStage);
  const stageIdx = stageOrder.indexOf(stageKey);

  if (stageKey === "DESIGN" && deliverable.revisionRequested) {
    return "revision";
  }

  if (currentStage === "COMPLETED") return "done";
  if (stageIdx < currentIdx) return "done";
  if (stageIdx === currentIdx) return "in_progress";
  return "pending";
}

function getAssigneeName(
  stageKey: WorkflowStage,
  deliverable: ProjectDeliverable,
  users: User[] | undefined
): string {
  let userId: string | null = null;
  if (stageKey === "DESIGN") userId = deliverable.designerId;
  if (stageKey === "COPYWRITING") userId = deliverable.copywriterId;
  if (stageKey === "PUBLISHING") userId = deliverable.publisherId;
  if (!userId) return "Unassigned";
  const user = users?.find((u) => u.id === userId);
  return user?.name || "Unassigned";
}

interface HashtagSuggestion {
  id: string;
  hashtag: string;
  usageCount: number;
}

function HashtagAutocomplete({
  value,
  onChange,
  brandId,
}: {
  value: string;
  onChange: (val: string) => void;
  brandId?: string;
}) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: suggestions } = useQuery<HashtagSuggestion[]>({
    queryKey: ["/api/hashtags/search", query, brandId],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query });
      if (brandId) params.set("brandId", brandId);
      return await apiRequest("GET", `/api/hashtags/search?${params.toString()}`);
    },
    enabled: query.length >= 2,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    const parts = val.split(/[\s,]+/);
    const lastPart = parts[parts.length - 1] || "";
    const cleaned = lastPart.replace(/^#/, "");
    setQuery(cleaned);
    setShowSuggestions(cleaned.length >= 2);
  };

  const handleSelectSuggestion = (hashtag: string) => {
    const parts = value.split(/[\s,]+/);
    parts[parts.length - 1] = hashtag;
    onChange(parts.join(" ") + " ");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5">
        <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <Input
          ref={inputRef}
          placeholder="Type hashtags separated by spaces..."
          value={value}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          data-testid="input-hashtags"
        />
      </div>
      {showSuggestions && suggestions && suggestions.length > 0 && (
        <Card className="absolute z-50 top-full left-0 right-0 mt-1">
          <CardContent className="p-1">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm rounded-md hover-elevate cursor-pointer flex items-center justify-between gap-2"
                onClick={() => handleSelectSuggestion(s.hashtag)}
                data-testid={`hashtag-suggestion-${s.id}`}
              >
                <span className="text-foreground">{s.hashtag}</span>
                <span className="text-[10px] text-muted-foreground">used {s.usageCount}x</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CreatorAutocomplete({
  value,
  onChange,
  brandId,
  platform,
}: {
  value: string;
  onChange: (val: string) => void;
  brandId?: string;
  platform?: string;
}) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: suggestions } = useQuery<Array<{ id: string; handle: string; platform: string; usageCount: number }>>({
    queryKey: ["/api/tagged-creators/search", query, platform, brandId],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query });
      if (platform) params.set("platform", platform);
      if (brandId) params.set("brandId", brandId);
      return await apiRequest("GET", `/api/tagged-creators/search?${params.toString()}`);
    },
    enabled: query.length >= 2,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    const parts = val.split(/[\s,]+/);
    const lastPart = parts[parts.length - 1] || "";
    const cleaned = lastPart.replace(/^@/, "");
    setQuery(cleaned);
    setShowSuggestions(cleaned.length >= 2);
  };

  const handleSelectSuggestion = (handle: string) => {
    const parts = value.split(/[\s,]+/);
    parts[parts.length - 1] = handle.startsWith("@") ? handle : `@${handle}`;
    onChange(parts.join(" ") + " ");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5">
        <AtSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <Input
          ref={inputRef}
          placeholder="@user1 @user2..."
          value={value}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          data-testid="input-tagged-users"
        />
      </div>
      {showSuggestions && suggestions && suggestions.length > 0 && (
        <Card className="absolute z-50 top-full left-0 right-0 mt-1">
          <CardContent className="p-1">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm rounded-md hover-elevate cursor-pointer flex items-center justify-between gap-2"
                onClick={() => handleSelectSuggestion(s.handle)}
                data-testid={`creator-suggestion-${s.id}`}
              >
                <span className="text-foreground">@{s.handle}</span>
                <span className="text-[10px] text-muted-foreground">{s.platform} | used {s.usageCount}x</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DeliverableDetailsSection({
  deliverable,
  projectId,
}: {
  deliverable: ProjectDeliverable;
  projectId: string;
}) {
  const { toast } = useToast();
  const [editingSpecs, setEditingSpecs] = useState(false);
  const [specsValue, setSpecsValue] = useState(deliverable.designSpecs || "");
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineValue, setDeadlineValue] = useState(
    deliverable.designDeadline ? format(new Date(deliverable.designDeadline), "yyyy-MM-dd") : ""
  );
  const [addingRef, setAddingRef] = useState(false);
  const [refCaption, setRefCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: references = [] } = useQuery<DeliverableReference[]>({
    queryKey: ["/api/deliverables", deliverable.id, "references"],
    queryFn: () => apiRequest("GET", `/api/deliverables/${deliverable.id}/references`),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiRequest("PATCH", `/api/deliverables/${deliverable.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setEditingSpecs(false);
      setEditingDeadline(false);
    },
  });

  const addReferenceMutation = useMutation({
    mutationFn: (data: { imageUrl: string; caption: string | null; sortOrder: number }) =>
      apiRequest("POST", `/api/deliverables/${deliverable.id}/references`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables", deliverable.id, "references"] });
      setAddingRef(false);
      setRefCaption("");
      toast({ title: "Reference added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteReferenceMutation = useMutation({
    mutationFn: (refId: string) =>
      apiRequest("DELETE", `/api/deliverable-references/${refId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables", deliverable.id, "references"] });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      addReferenceMutation.mutate({
        imageUrl: dataUri,
        caption: refCaption || null,
        sortOrder: references.length,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const isOverdue = deliverable.designDeadline &&
    new Date(deliverable.designDeadline) < new Date() &&
    deliverable.currentStage === "DESIGN";

  const hasSpecs = !!deliverable.designSpecs;
  const hasDeadline = !!deliverable.designDeadline;
  const hasRefs = references.length > 0;
  const preset = DELIVERABLE_PRESET_DIMENSIONS[deliverable.deliverableType];
  const canvaUrl = getCanvaNewDesignUrl(deliverable.deliverableType);

  if (!hasSpecs && !hasDeadline && !hasRefs && !editingSpecs && !editingDeadline && !addingRef) {
    return (
      <div className="mt-1 space-y-1">
        {preset && (
          <p className="text-[11px] text-muted-foreground" data-testid={`text-recommended-${deliverable.id}`}>
            Recommended: {preset.label}
          </p>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setEditingSpecs(true)}
            data-testid={`button-add-specs-${deliverable.id}`}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Add Specs
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setEditingDeadline(true)}
            data-testid={`button-add-deadline-${deliverable.id}`}
          >
            <Calendar className="w-3 h-3 mr-1" />
            Set Deadline
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setAddingRef(true)}
            data-testid={`button-add-ref-${deliverable.id}`}
          >
            <ImagePlus className="w-3 h-3 mr-1" />
            Add Reference
          </Button>
          <a
            href={canvaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            data-testid={`link-canva-${deliverable.id}`}
          >
            <ExternalLink className="w-3 h-3" />
            Open Canva
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-2 border-t pt-3" data-testid={`details-section-${deliverable.id}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Design Specs</span>
          {!editingSpecs && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => {
                setSpecsValue(deliverable.designSpecs || "");
                setEditingSpecs(true);
              }}
              data-testid={`button-edit-specs-${deliverable.id}`}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>
        {editingSpecs ? (
          <div className="space-y-2">
            <Textarea
              value={specsValue}
              onChange={(e) => setSpecsValue(e.target.value)}
              placeholder={preset ? `Recommended: ${preset.label}` : "e.g., Desktop: 1920x600px, Mobile: 750x1200px"}
              rows={2}
              className="text-sm"
              data-testid={`input-edit-specs-${deliverable.id}`}
            />
            <div className="flex gap-2 items-center">
              <Button
                size="sm"
                className="text-xs"
                onClick={() => updateMutation.mutate({ designSpecs: specsValue || null })}
                disabled={updateMutation.isPending}
                data-testid={`button-save-specs-${deliverable.id}`}
              >
                {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setEditingSpecs(false)}
              >
                Cancel
              </Button>
              {preset && !specsValue && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs text-primary p-0 h-auto"
                  onClick={() => setSpecsValue(preset.label)}
                  data-testid={`button-use-recommended-${deliverable.id}`}
                >
                  Use recommended ({preset.label})
                </Button>
              )}
            </div>
          </div>
        ) : hasSpecs ? (
          <div className="space-y-1">
            <p className="text-sm text-foreground whitespace-pre-wrap" data-testid={`text-specs-${deliverable.id}`}>
              {deliverable.designSpecs}
            </p>
            <a
              href={canvaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              data-testid={`link-canva-specs-${deliverable.id}`}
            >
              <ExternalLink className="w-3 h-3" />
              Create in Canva with these dimensions
            </a>
          </div>
        ) : (
          <div className="space-y-1">
            {preset && (
              <p className="text-xs text-muted-foreground italic">
                Recommended: {preset.label}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Designer Deadline</span>
          {!editingDeadline && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => {
                setDeadlineValue(
                  deliverable.designDeadline
                    ? format(new Date(deliverable.designDeadline), "yyyy-MM-dd")
                    : ""
                );
                setEditingDeadline(true);
              }}
              data-testid={`button-edit-deadline-${deliverable.id}`}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>
        {editingDeadline ? (
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              value={deadlineValue}
              onChange={(e) => setDeadlineValue(e.target.value)}
              className="w-auto"
              data-testid={`input-edit-deadline-${deliverable.id}`}
            />
            <Button
              size="sm"
              className="text-xs"
              onClick={() =>
                updateMutation.mutate({
                  designDeadline: deadlineValue ? new Date(deadlineValue).toISOString() : null,
                })
              }
              disabled={updateMutation.isPending}
              data-testid={`button-save-deadline-${deliverable.id}`}
            >
              {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditingDeadline(false)}>
              Cancel
            </Button>
          </div>
        ) : hasDeadline ? (
          <div className="flex items-center gap-2">
            <span
              className={`text-sm ${isOverdue ? "text-red-500 font-semibold" : "text-foreground"}`}
              data-testid={`text-deadline-${deliverable.id}`}
            >
              {format(new Date(deliverable.designDeadline!), "MMM d, yyyy")}
            </span>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs" data-testid={`badge-overdue-${deliverable.id}`}>
                <AlertCircle className="w-3 h-3 mr-1" />
                Overdue
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No deadline set</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Reference Images ({references.length})
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setAddingRef(true)}
            data-testid={`button-add-reference-${deliverable.id}`}
          >
            <ImagePlus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>

        {addingRef && (
          <div className="border rounded-md p-3 space-y-2" data-testid={`add-ref-form-${deliverable.id}`}>
            <Input
              placeholder="Caption (optional, e.g. 'Desktop layout')"
              value={refCaption}
              onChange={(e) => setRefCaption(e.target.value)}
              className="text-sm"
              data-testid={`input-ref-caption-${deliverable.id}`}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={addReferenceMutation.isPending}
                data-testid={`button-upload-ref-${deliverable.id}`}
              >
                {addReferenceMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Upload className="w-3 h-3 mr-1" />
                )}
                Upload Image
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setAddingRef(false); setRefCaption(""); }}>
                Cancel
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {references.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" data-testid={`ref-gallery-${deliverable.id}`}>
            {references.map((ref) => (
              <div key={ref.id} className="group relative" data-testid={`ref-image-${ref.id}`}>
                <div className="aspect-square rounded-md overflow-hidden border bg-muted">
                  <img
                    src={ref.imageUrl}
                    alt={ref.caption || "Reference"}
                    className="w-full h-full object-cover"
                  />
                </div>
                {ref.caption && (
                  <p className="text-[10px] text-muted-foreground mt-1 truncate" data-testid={`text-ref-caption-${ref.id}`}>
                    {ref.caption}
                  </p>
                )}
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteReferenceMutation.mutate(ref.id);
                  }}
                  data-testid={`button-delete-ref-${ref.id}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CopywritingSection({
  deliverable,
  brandId,
  onComplete,
  onRevision,
  isPending,
}: {
  deliverable: ProjectDeliverable;
  brandId?: string;
  onComplete: (data: { finalCopy: string; finalHashtags: string[]; taggedUsers: string[] }) => void;
  onRevision: () => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [finalCopy, setFinalCopy] = useState(
    deliverable.finalCopy || deliverable.aiSuggestedCopy || ""
  );
  const [hashtagsText, setHashtagsText] = useState(
    (deliverable.finalHashtags || deliverable.aiSuggestedHashtags || []).join(" ")
  );
  const [taggedUsersText, setTaggedUsersText] = useState(
    (deliverable.taggedUsers || []).join(" ")
  );

  const aiGenerateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/ai/generate-copy", {
        deliverableType: deliverable.deliverableType,
        existingCopy: finalCopy || undefined,
        tone: "professional",
      });
    },
    onSuccess: (data: any) => {
      if (data.success && data.suggestion) {
        if (data.suggestion.copy) setFinalCopy(data.suggestion.copy);
        if (data.suggestion.hashtags?.length) {
          setHashtagsText(data.suggestion.hashtags.join(" "));
        }
      }
    },
  });

  const handleComplete = () => {
    const hashtags = hashtagsText
      .split(/[\s,]+/)
      .map((h) => h.trim())
      .filter(Boolean);
    const tagged = taggedUsersText
      .split(/[\s,]+/)
      .map((u) => u.trim())
      .filter(Boolean);
    onComplete({ finalCopy, finalHashtags: hashtags, taggedUsers: tagged });
  };

  return (
    <div className="mt-3 border rounded-md" data-testid={`copywriting-section-${deliverable.id}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 p-3 text-sm font-medium text-foreground hover-elevate rounded-md"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-toggle-copywriting-${deliverable.id}`}
      >
        <span className="flex items-center gap-2">
          <PenTool className="w-4 h-4" />
          Copywriting
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {(deliverable.assetImageUrl || deliverable.canvaLink) && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Image className="w-3 h-3" />
                Design Preview
              </span>
              {deliverable.assetImageUrl ? (
                <a
                  href={deliverable.assetImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  data-testid={`link-asset-preview-${deliverable.id}`}
                >
                  <img
                    src={deliverable.assetImageUrl}
                    alt="Design preview"
                    className="max-h-40 rounded-md border object-contain"
                  />
                </a>
              ) : deliverable.canvaLink ? (
                <a
                  href={deliverable.canvaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary"
                  data-testid={`link-canva-preview-${deliverable.id}`}
                >
                  <ExternalLink className="w-3 h-3" />
                  View Canva Design
                </a>
              ) : null}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor={`copy-${deliverable.id}`}>
                Final Copy
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => aiGenerateMutation.mutate()}
                disabled={aiGenerateMutation.isPending}
                className="h-6 text-xs text-primary"
                data-testid={`button-ai-suggest-${deliverable.id}`}
              >
                {aiGenerateMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Palette className="w-3 h-3 mr-1" />
                )}
                AI Suggest
              </Button>
            </div>
            <Textarea
              id={`copy-${deliverable.id}`}
              value={finalCopy}
              onChange={(e) => setFinalCopy(e.target.value)}
              placeholder="Write your post copy here..."
              className="min-h-[100px] resize-y text-sm"
              data-testid={`textarea-final-copy-${deliverable.id}`}
            />
            {deliverable.aiSuggestedCopy && !deliverable.finalCopy && (
              <span className="text-[10px] text-muted-foreground">Pre-filled from AI suggestion</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Hashtags</label>
            <HashtagAutocomplete
              value={hashtagsText}
              onChange={setHashtagsText}
              brandId={brandId}
            />
            {hashtagsText && (
              <div className="flex flex-wrap gap-1">
                {hashtagsText
                  .split(/[\s,]+/)
                  .filter(Boolean)
                  .map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tagged Users / Creators</label>
            <CreatorAutocomplete
              value={taggedUsersText}
              onChange={setTaggedUsersText}
              brandId={brandId}
              platform={deliverable.deliverableType?.includes("INSTAGRAM") ? "instagram" : deliverable.deliverableType?.includes("TIKTOK") ? "tiktok" : undefined}
            />
            {taggedUsersText && (
              <div className="flex flex-wrap gap-1">
                {taggedUsersText
                  .split(/[\s,]+/)
                  .filter(Boolean)
                  .map((user, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {user.startsWith("@") ? user : `@${user}`}
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={isPending || !finalCopy.trim()}
              data-testid={`button-complete-copywriting-${deliverable.id}`}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              Complete Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRevision}
              disabled={isPending}
              data-testid={`button-request-revision-${deliverable.id}`}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Request Revision
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PublishingSection({
  deliverable,
  onPublish,
  onSchedule,
  isPending,
}: {
  deliverable: ProjectDeliverable;
  onPublish: (postUrl?: string, accountId?: string) => void;
  onSchedule: (date: string) => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [scheduleDate, setScheduleDate] = useState(
    deliverable.scheduledPublishDate
      ? format(new Date(deliverable.scheduledPublishDate), "yyyy-MM-dd'T'HH:mm")
      : ""
  );
  const [postUrl, setPostUrl] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const { data: accounts } = useQuery<Array<{ id: string; platform: string; accountName: string; accountHandle: string | null }>>({
    queryKey: ["/api/social-accounts"],
  });

  return (
    <div className="mt-3 border rounded-md" data-testid={`publishing-section-${deliverable.id}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 p-3 text-sm font-medium text-foreground hover-elevate rounded-md"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-toggle-publishing-${deliverable.id}`}
      >
        <span className="flex items-center gap-2">
          <Send className="w-4 h-4" />
          Publishing
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {deliverable.canvaLink && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                Canva Design
              </span>
              <a
                href={deliverable.canvaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary"
                data-testid={`link-canva-publishing-${deliverable.id}`}
              >
                <ExternalLink className="w-3 h-3" />
                Open in Canva
              </a>
            </div>
          )}

          {deliverable.finalCopy && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Final Copy
              </span>
              <div
                className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 rounded-md p-3"
                data-testid={`text-final-copy-readonly-${deliverable.id}`}
              >
                {deliverable.finalCopy}
              </div>
            </div>
          )}

          {deliverable.finalHashtags && deliverable.finalHashtags.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Hash className="w-3 h-3" />
                Hashtags
              </span>
              <div className="flex flex-wrap gap-1" data-testid={`hashtags-readonly-${deliverable.id}`}>
                {deliverable.finalHashtags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {deliverable.taggedUsers && deliverable.taggedUsers.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <AtSign className="w-3 h-3" />
                Tagged Users
              </span>
              <div className="flex flex-wrap gap-1" data-testid={`tagged-users-readonly-${deliverable.id}`}>
                {deliverable.taggedUsers.map((user, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {user.startsWith("@") ? user : `@${user}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {accounts && accounts.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Publish to Account</label>
              <Select value={selectedAccountId || "none"} onValueChange={(v) => setSelectedAccountId(v === "none" ? "" : v)}>
                <SelectTrigger data-testid={`select-publish-account-${deliverable.id}`}>
                  <SelectValue placeholder="Select account (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manual publish</SelectItem>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.accountName} {a.accountHandle ? `(${a.accountHandle})` : ""} - {a.platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Post URL (after publishing)</label>
            <Input
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://instagram.com/p/..."
              data-testid={`input-post-url-${deliverable.id}`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Scheduled Publish Date (optional)</label>
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => {
                setScheduleDate(e.target.value);
                if (e.target.value) {
                  onSchedule(e.target.value);
                }
              }}
              data-testid={`input-schedule-date-${deliverable.id}`}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => onPublish(postUrl || undefined, selectedAccountId || undefined)}
              disabled={isPending}
              data-testid={`button-mark-published-${deliverable.id}`}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              Mark as Published
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatActivityAction(action: string, oldValue: string | null, newValue: string | null): string {
  const field = action.replace('edited_', '').replace(/_/g, ' ');
  if (action === 'published_deliverable') return `Published ${newValue}`;
  if (action.startsWith('edited_')) {
    if (oldValue && newValue) return `Changed ${field} from "${oldValue}" to "${newValue}"`;
    if (newValue) return `Set ${field} to "${newValue}"`;
    return `Updated ${field}`;
  }
  return action.replace(/_/g, ' ');
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(date, 'MMM d, yyyy');
}

export function ProjectDetailModal({ projectId, open, onClose }: ProjectDetailModalProps) {
  const { toast } = useToast();
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [newDeliverableType, setNewDeliverableType] = useState<DeliverableType | "">("");
  const [newDeliverableName, setNewDeliverableName] = useState("");
  const [canvaLinkInputId, setCanvaLinkInputId] = useState<string | null>(null);
  const [canvaLinkValue, setCanvaLinkValue] = useState("");
  const [assignSelectId, setAssignSelectId] = useState<string | null>(null);
  const [assignStage, setAssignStage] = useState<WorkflowStage | null>(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [previewDeliverable, setPreviewDeliverable] = useState<ProjectDeliverable | null>(null);
  const [analyticsDeliverable, setAnalyticsDeliverable] = useState<ProjectDeliverable | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [activeTab, setActiveTab] = useState("deliverables");

  const { data: projectData, isLoading } = useQuery<Project & { deliverables: ProjectDeliverable[] }>({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      return await apiRequest("GET", `/api/projects/${projectId}`);
    },
    enabled: !!projectId && open,
  });

  const { data: brands } = useQuery<Brand[]>({ queryKey: ["/api/brands"] });
  const { data: regions } = useQuery<Region[]>({ queryKey: ["/api/regions"] });
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const brand = brands?.find((b) => b.id === projectData?.brandId);
  const region = regions?.find((r) => r.id === projectData?.regionId);

  const invalidateProjectQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
  }, [projectId]);

  const addDeliverableMutation = useMutation({
    mutationFn: async (data: { type: DeliverableType; name?: string }) => {
      return await apiRequest("POST", `/api/projects/${projectId}/deliverables`, data);
    },
    onSuccess: () => {
      invalidateProjectQueries();
      setShowAddDeliverable(false);
      setNewDeliverableType("");
      setNewDeliverableName("");
      toast({ title: "Deliverable added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteDeliverableMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/deliverables/${id}`);
    },
    onSuccess: () => {
      invalidateProjectQueries();
      toast({ title: "Deliverable removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const advanceStageMutation = useMutation({
    mutationFn: async ({ id, stage, ...additionalData }: { id: string; stage: WorkflowStage; [key: string]: unknown }) => {
      return await apiRequest("PATCH", `/api/deliverables/${id}/stage`, { stage, ...additionalData });
    },
    onSuccess: () => {
      invalidateProjectQueries();
      toast({ title: "Stage updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const submitCanvaLinkMutation = useMutation({
    mutationFn: async ({ id, canvaLink }: { id: string; canvaLink: string }) => {
      return await apiRequest("POST", `/api/deliverables/${id}/canva-link`, { canvaLink });
    },
    onSuccess: () => {
      invalidateProjectQueries();
      setCanvaLinkInputId(null);
      setCanvaLinkValue("");
      toast({ title: "Canva link saved, advancing to Copywriting" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const revisionMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return await apiRequest("POST", `/api/deliverables/${id}/revision`, { notes });
    },
    onSuccess: () => {
      invalidateProjectQueries();
      toast({ title: "Revision requested, sent back to Design" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateDeliverableMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return await apiRequest("PATCH", `/api/deliverables/${id}`, data);
    },
    onSuccess: () => {
      invalidateProjectQueries();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: async ({ id, field, userId }: { id: string; field: string; userId: string }) => {
      return await apiRequest("PATCH", `/api/deliverables/${id}`, { [field]: userId });
    },
    onSuccess: () => {
      invalidateProjectQueries();
      setAssignSelectId(null);
      setAssignStage(null);
      toast({ title: "User assigned" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}`, data);
    },
    onSuccess: () => {
      invalidateProjectQueries();
      setEditingField(null);
      toast({ title: "Project updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const { data: activityLog } = useQuery<Array<{ id: string; action: string; oldValue: string | null; newValue: string | null; userId: string; createdAt: string }>>({
    queryKey: ["/api/projects", projectId, "activity"],
    queryFn: async () => {
      return await apiRequest("GET", `/api/projects/${projectId}/activity?limit=50`);
    },
    enabled: !!projectId && open && activeTab === "activity",
  });

  const deliverables = projectData?.deliverables || [];

  const getDeliverableDisplayName = (d: ProjectDeliverable, index: number) => {
    if (d.deliverableName) return d.deliverableName;
    const config = DELIVERABLE_TYPE_CONFIG[d.deliverableType];
    const sameType = deliverables.filter((dd) => dd.deliverableType === d.deliverableType);
    const typeIndex = sameType.findIndex((dd) => dd.id === d.id) + 1;
    return `${config.label} #${typeIndex}`;
  };

  const handleAssignField = (stageKey: WorkflowStage): string => {
    if (stageKey === "DESIGN") return "designerId";
    if (stageKey === "COPYWRITING") return "copywriterId";
    return "publisherId";
  };

  const renderStageIcon = (status: "done" | "in_progress" | "pending" | "revision") => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "in_progress":
        return <Clock className="w-5 h-5 text-primary animate-pulse" />;
      case "revision":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "pending":
        return <Circle className="w-5 h-5 text-muted-foreground/40" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        data-testid="dialog-project-detail"
      >
        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : projectData ? (
          <>
            <DialogHeader className="space-y-3">
              <div className="group flex items-center gap-2">
                {editingField === 'name' ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateProjectMutation.mutate({ name: editName });
                        }
                        if (e.key === 'Escape') setEditingField(null);
                      }}
                      autoFocus
                      className="text-xl font-bold"
                      data-testid="input-edit-project-name"
                    />
                    <Button size="icon" variant="ghost" onClick={() => updateProjectMutation.mutate({ name: editName })} data-testid="button-save-project-name">
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <DialogTitle
                    className="text-2xl font-bold font-serif cursor-pointer"
                    onClick={() => { setEditingField('name'); setEditName(projectData.name); }}
                    data-testid="text-project-detail-name"
                  >
                    {projectData.name}
                    <Pencil className="w-3 h-3 ml-2 inline-block invisible group-hover:visible text-muted-foreground" />
                  </DialogTitle>
                )}
              </div>

              <div className="group">
                {editingField === 'description' ? (
                  <div className="space-y-1">
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Add a description..."
                      className="text-sm min-h-[60px]"
                      autoFocus
                      data-testid="textarea-edit-project-description"
                    />
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" onClick={() => updateProjectMutation.mutate({ description: editDescription })} data-testid="button-save-description">Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-sm text-muted-foreground cursor-pointer"
                    onClick={() => { setEditingField('description'); setEditDescription(projectData.description || ''); }}
                    data-testid="text-project-description"
                  >
                    {projectData.description || 'Click to add description...'}
                    <Pencil className="w-3 h-3 ml-1 inline-block invisible group-hover:visible" />
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {brand && (
                  <Badge variant="secondary" data-testid="badge-project-brand">
                    <span
                      className="w-2 h-2 rounded-full mr-1.5 inline-block flex-shrink-0"
                      style={{ backgroundColor: brand.color }}
                    />
                    {brand.name}
                  </Badge>
                )}
                {region && (
                  <Badge variant="outline" data-testid="badge-project-region">
                    {region.name}
                  </Badge>
                )}

                <span className="text-xs text-muted-foreground ml-auto" data-testid="text-project-dates">
                  {projectData.startDate && projectData.endDate
                    ? `${format(new Date(projectData.startDate), "MMM d, yyyy")} - ${format(new Date(projectData.endDate), "MMM d, yyyy")}`
                    : "No dates set"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Defaults:</span>
                </div>
                <UserAutocomplete
                  users={users}
                  value={projectData.defaultDesignerId}
                  onSelect={(userId) => updateProjectMutation.mutate({ defaultDesignerId: userId })}
                  onClear={() => updateProjectMutation.mutate({ defaultDesignerId: null })}
                  placeholder="Designer..."
                  size="sm"
                  className="min-w-[160px]"
                  data-testid="select-default-designer"
                />
                <UserAutocomplete
                  users={users}
                  value={projectData.defaultCopywriterId}
                  onSelect={(userId) => updateProjectMutation.mutate({ defaultCopywriterId: userId })}
                  onClear={() => updateProjectMutation.mutate({ defaultCopywriterId: null })}
                  placeholder="Copywriter..."
                  size="sm"
                  className="min-w-[160px]"
                  data-testid="select-default-copywriter"
                />
                <UserAutocomplete
                  users={users}
                  value={projectData.defaultPublisherId}
                  onSelect={(userId) => updateProjectMutation.mutate({ defaultPublisherId: userId })}
                  onClear={() => updateProjectMutation.mutate({ defaultPublisherId: null })}
                  placeholder="Publisher..."
                  size="sm"
                  className="min-w-[160px]"
                  data-testid="select-default-publisher"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddDeliverable(!showAddDeliverable)}
                  data-testid="button-add-deliverable"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Deliverable
                </Button>
                {!confirmDeleteProject ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmDeleteProject(true)}
                    data-testid="button-delete-project"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Project
                  </Button>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteProjectMutation.mutate()}
                      disabled={deleteProjectMutation.isPending}
                      data-testid="button-confirm-delete-project"
                    >
                      {deleteProjectMutation.isPending ? "Deleting..." : "Confirm Delete"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDeleteProject(false)}
                      data-testid="button-cancel-delete-project"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </DialogHeader>

            {showAddDeliverable && (
              <Card className="mt-2" data-testid="card-add-deliverable">
                <CardContent className="pt-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Add Deliverable</p>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={newDeliverableType}
                      onValueChange={(v) => setNewDeliverableType(v as DeliverableType)}
                    >
                      <SelectTrigger className="w-48" data-testid="select-new-deliverable-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(DELIVERABLE_TYPE_CONFIG) as DeliverableType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {DELIVERABLE_TYPE_CONFIG[type].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Custom name (optional)"
                      value={newDeliverableName}
                      onChange={(e) => setNewDeliverableName(e.target.value)}
                      className="flex-1 min-w-[150px]"
                      data-testid="input-new-deliverable-name"
                    />
                    <Button
                      size="sm"
                      disabled={!newDeliverableType || addDeliverableMutation.isPending}
                      onClick={() => {
                        if (newDeliverableType) {
                          addDeliverableMutation.mutate({
                            type: newDeliverableType as DeliverableType,
                            name: newDeliverableName || undefined,
                          });
                        }
                      }}
                      data-testid="button-submit-add-deliverable"
                    >
                      {addDeliverableMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList>
                <TabsTrigger value="deliverables" data-testid="tab-deliverables">
                  Deliverables ({deliverables.length})
                </TabsTrigger>
                <TabsTrigger value="activity" data-testid="tab-activity">
                  <History className="w-3 h-3 mr-1" />
                  Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="deliverables" className="space-y-3 mt-2">
                {deliverables.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm" data-testid="text-no-deliverables">
                    No deliverables yet. Click "Add Deliverable" to get started.
                  </div>
                ) : (
                  deliverables.map((deliverable, idx) => {
                    const config = DELIVERABLE_TYPE_CONFIG[deliverable.deliverableType];
                    const Icon = config?.icon || Circle;
                    const displayName = getDeliverableDisplayName(deliverable, idx);

                    return (
                      <Card key={deliverable.id} data-testid={`card-deliverable-${deliverable.id}`}>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              <span
                                className="font-medium text-foreground text-sm"
                                data-testid={`text-deliverable-name-${deliverable.id}`}
                              >
                                {displayName}
                              </span>
                              {deliverable.currentStage === "COMPLETED" && (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  Completed
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {deliverable.currentStage === "PUBLISHING" || deliverable.currentStage === "COMPLETED" ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setPreviewDeliverable(deliverable)}
                                  data-testid={`button-preview-${deliverable.id}`}
                                >
                                  <Eye className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              ) : null}
                              {deliverable.currentStage === "COMPLETED" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setAnalyticsDeliverable(deliverable)}
                                  data-testid={`button-analytics-${deliverable.id}`}
                                >
                                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteDeliverableMutation.mutate(deliverable.id)}
                                data-testid={`button-delete-deliverable-${deliverable.id}`}
                              >
                                <X className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1" data-testid={`workflow-track-${deliverable.id}`}>
                            {WORKFLOW_STAGES.map((stage, sIdx) => {
                              const status = getStageStatus(
                                deliverable.currentStage,
                                stage.key,
                                deliverable
                              );
                              const isCurrent = deliverable.currentStage === stage.key;
                              const assignee = getAssigneeName(stage.key, deliverable, users);

                              return (
                                <div key={stage.key} className="flex items-center flex-1">
                                  <div
                                    className={`flex flex-col items-center gap-1 flex-1 rounded-md p-2 transition-colors ${
                                      isCurrent
                                        ? "bg-primary/10 border border-primary/30"
                                        : ""
                                    }`}
                                    data-testid={`stage-${stage.key.toLowerCase()}-${deliverable.id}`}
                                  >
                                    {renderStageIcon(status)}
                                    <span
                                      className={`text-xs font-medium ${
                                        isCurrent ? "text-primary" : "text-muted-foreground"
                                      }`}
                                    >
                                      {stage.label}
                                    </span>
                                    <button
                                      type="button"
                                      className="text-[10px] text-muted-foreground truncate max-w-full cursor-pointer hover:text-primary hover:underline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAssignSelectId(deliverable.id);
                                        setAssignStage(stage.key);
                                      }}
                                      data-testid={`text-assignee-${stage.key.toLowerCase()}-${deliverable.id}`}
                                    >
                                      {assignee}
                                    </button>

                                    {isCurrent && renderStageActions(deliverable, stage.key)}
                                  </div>
                                  {sIdx < WORKFLOW_STAGES.length - 1 && (
                                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mx-0.5" />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {canvaLinkInputId === deliverable.id && (
                            <div className="flex gap-2 mt-1" data-testid={`canva-link-input-${deliverable.id}`}>
                              <Input
                                placeholder="Paste Canva link..."
                                value={canvaLinkValue}
                                onChange={(e) => setCanvaLinkValue(e.target.value)}
                                className="flex-1"
                                data-testid={`input-canva-link-${deliverable.id}`}
                              />
                              <Button
                                size="sm"
                                disabled={!canvaLinkValue || submitCanvaLinkMutation.isPending}
                                onClick={() =>
                                  submitCanvaLinkMutation.mutate({
                                    id: deliverable.id,
                                    canvaLink: canvaLinkValue,
                                  })
                                }
                                data-testid={`button-submit-canva-link-${deliverable.id}`}
                              >
                                {submitCanvaLinkMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCanvaLinkInputId(null);
                                  setCanvaLinkValue("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}

                          {assignSelectId === deliverable.id && assignStage && (
                            <div className="flex gap-2 mt-1" data-testid={`assign-select-${deliverable.id}`}>
                              <UserAutocomplete
                                users={users}
                                value={null}
                                onSelect={(userId) => {
                                  assignUserMutation.mutate({
                                    id: deliverable.id,
                                    field: handleAssignField(assignStage),
                                    userId,
                                  });
                                }}
                                placeholder="Type to assign..."
                                className="w-48"
                                data-testid={`select-assign-user-${deliverable.id}`}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAssignSelectId(null);
                                  setAssignStage(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}

                          <DeliverableDetailsSection
                            deliverable={deliverable}
                            projectId={projectId!}
                          />

                          {deliverable.currentStage === "COPYWRITING" && (
                            <CopywritingSection
                              deliverable={deliverable}
                              brandId={projectData?.brandId}
                              onComplete={(data) => {
                                advanceStageMutation.mutate({
                                  id: deliverable.id,
                                  stage: "PUBLISHING",
                                  finalCopy: data.finalCopy,
                                  finalHashtags: data.finalHashtags,
                                  taggedUsers: data.taggedUsers,
                                });
                              }}
                              onRevision={() => {
                                revisionMutation.mutate({ id: deliverable.id });
                              }}
                              isPending={advanceStageMutation.isPending || revisionMutation.isPending}
                            />
                          )}

                          {deliverable.currentStage === "PUBLISHING" && (
                            <PublishingSection
                              deliverable={deliverable}
                              onPublish={(postUrl, accountId) => {
                                advanceStageMutation.mutate({
                                  id: deliverable.id,
                                  stage: "COMPLETED",
                                  postUrl: postUrl || null,
                                  publishedAccountId: accountId || null,
                                });
                              }}
                              onSchedule={(date) => {
                                updateDeliverableMutation.mutate({
                                  id: deliverable.id,
                                  data: { scheduledPublishDate: new Date(date).toISOString() },
                                });
                              }}
                              isPending={advanceStageMutation.isPending}
                            />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="activity" className="mt-2">
                <div className="space-y-2">
                  {activityLog?.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                      <History className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground">{formatActivityAction(entry.action, entry.oldValue, entry.newValue)}</p>
                        <p className="text-xs text-muted-foreground">
                          {users?.find((u) => u.id === entry.userId)?.name || 'Unknown'} · {formatTimeAgo(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!activityLog || activityLog.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-6">No activity recorded yet</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </DialogContent>

      {previewDeliverable && (
        <PlatformPreviewModal
          open={!!previewDeliverable}
          onClose={() => setPreviewDeliverable(null)}
          deliverableType={previewDeliverable.deliverableType}
          copy={previewDeliverable.finalCopy}
          hashtags={previewDeliverable.finalHashtags}
          taggedUsers={previewDeliverable.taggedUsers}
          canvaLink={previewDeliverable.canvaLink}
        />
      )}

      {analyticsDeliverable && (
        <AnalyticsModal
          open={!!analyticsDeliverable}
          onClose={() => setAnalyticsDeliverable(null)}
          deliverableName={getDeliverableDisplayName(analyticsDeliverable, 0)}
        />
      )}
    </Dialog>
  );

  function renderStageActions(deliverable: ProjectDeliverable, stageKey: WorkflowStage) {
    const stageOrder: WorkflowStage[] = ["DESIGN", "COPYWRITING", "PUBLISHING", "COMPLETED"];
    const nextStage = stageOrder[stageOrder.indexOf(stageKey) + 1];

    if (stageKey === "DESIGN") {
      if (!deliverable.designerId) {
        return (
          <Button
            variant="outline"
            size="sm"
            className="mt-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setAssignSelectId(deliverable.id);
              setAssignStage("DESIGN");
            }}
            data-testid={`button-assign-designer-${deliverable.id}`}
          >
            Assign Designer
          </Button>
        );
      }
      if (!deliverable.canvaLink) {
        return (
          <Button
            variant="outline"
            size="sm"
            className="mt-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setCanvaLinkInputId(deliverable.id);
              setCanvaLinkValue(deliverable.canvaLink || "");
            }}
            data-testid={`button-submit-canva-${deliverable.id}`}
          >
            <Link2 className="w-3 h-3 mr-1" />
            Submit Canva Link
          </Button>
        );
      }
      return (
        <Button
          variant="outline"
          size="sm"
          className="mt-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            if (nextStage) advanceStageMutation.mutate({ id: deliverable.id, stage: nextStage });
          }}
          disabled={advanceStageMutation.isPending}
          data-testid={`button-complete-design-${deliverable.id}`}
        >
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Complete Design
        </Button>
      );
    }

    if (stageKey === "COPYWRITING") {
      if (!deliverable.copywriterId) {
        return (
          <Button
            variant="outline"
            size="sm"
            className="mt-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setAssignSelectId(deliverable.id);
              setAssignStage("COPYWRITING");
            }}
            data-testid={`button-assign-copywriter-${deliverable.id}`}
          >
            Assign Copywriter
          </Button>
        );
      }
      return null;
    }

    if (stageKey === "PUBLISHING") {
      if (!deliverable.publisherId) {
        return (
          <Button
            variant="outline"
            size="sm"
            className="mt-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setAssignSelectId(deliverable.id);
              setAssignStage("PUBLISHING");
            }}
            data-testid={`button-assign-publisher-${deliverable.id}`}
          >
            Assign Publisher
          </Button>
        );
      }
      return null;
    }

    return null;
  }
}

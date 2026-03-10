import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Region } from "@shared/schema";

interface DuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
  entityType: "social-posts" | "events" | "tasks";
  currentRegionId: string;
  onSuccess?: () => void;
}

export function DuplicateDialog({
  open,
  onOpenChange,
  itemId,
  itemName,
  entityType,
  currentRegionId,
  onSuccess,
}: DuplicateDialogProps) {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setSelectedRegions([]);
    }
  }, [open, itemId]);

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/${entityType}/${itemId}/duplicate`, {
        targetRegionIds: selectedRegions,
      });
    },
    onSuccess: () => {
      const queryKeyMap: Record<string, string> = {
        "social-posts": "/api/social-posts",
        "events": "/api/events",
        "tasks": "/api/tasks",
      };
      queryClient.invalidateQueries({ queryKey: [queryKeyMap[entityType]] });
      toast({
        title: "Success",
        description: `Duplicated to ${selectedRegions.length} region(s)`,
      });
      setSelectedRegions([]);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleToggleRegion = (regionId: string) => {
    setSelectedRegions((prev) =>
      prev.includes(regionId) ? prev.filter((r) => r !== regionId) : [...prev, regionId]
    );
  };

  const handleSelectAll = () => {
    const availableRegions = regions?.filter((r) => !currentRegionId || r.id !== currentRegionId).map((r) => r.id) || [];
    if (selectedRegions.length === availableRegions.length) {
      setSelectedRegions([]);
    } else {
      setSelectedRegions(availableRegions);
    }
  };

  const otherRegions = regions?.filter((r) => !currentRegionId || r.id !== currentRegionId) || [];
  const allSelected = otherRegions.length > 0 && selectedRegions.length === otherRegions.length;

  const entityLabels: Record<string, string> = {
    "social-posts": "post",
    "events": "event",
    "tasks": "task",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-primary" />
            Duplicate to Other Regions
          </DialogTitle>
          <DialogDescription>
            Select which regions to duplicate "{itemName}" to. The {entityLabels[entityType]} will be
            copied with reset statuses.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Target Regions</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              data-testid="button-select-all-regions"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {otherRegions.map((region) => (
              <div key={region.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted">
                <Checkbox
                  id={`region-${region.id}`}
                  checked={selectedRegions.includes(region.id)}
                  onCheckedChange={() => handleToggleRegion(region.id)}
                  data-testid={`checkbox-region-${region.id}`}
                />
                <Label
                  htmlFor={`region-${region.id}`}
                  className="flex-1 cursor-pointer font-normal"
                >
                  <span className="font-medium">{region.name}</span>
                  {region.code && (
                    <span className="text-muted-foreground ml-2">({region.code})</span>
                  )}
                </Label>
              </div>
            ))}
            {otherRegions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No other regions available
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-duplicate"
          >
            Cancel
          </Button>
          <Button
            onClick={() => duplicateMutation.mutate()}
            disabled={selectedRegions.length === 0 || duplicateMutation.isPending}
            className="bg-brand-orange hover:bg-brand-orange-dark text-white"
            data-testid="button-confirm-duplicate"
          >
            {duplicateMutation.isPending
              ? "Duplicating..."
              : `Duplicate to ${selectedRegions.length} Region(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, Send, AlertCircle, MessageSquare } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Approval, User } from "@shared/schema";

interface ApprovalWorkflowProps {
  contentType: "SOCIAL_POST" | "EMAIL_CAMPAIGN" | "EVENT";
  contentId: string;
  contentTitle: string;
  assetPreviewUrl?: string;
  onApprovalChange?: (approval: Approval) => void;
}

export function ApprovalWorkflow({
  contentType,
  contentId,
  contentTitle,
  assetPreviewUrl,
  onApprovalChange,
}: ApprovalWorkflowProps) {
  const { toast } = useToast();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: approval, isLoading } = useQuery<Approval | null>({
    queryKey: ["/api/approvals", contentType, contentId],
    queryFn: async () => {
      const res = await fetch(`/api/approvals?contentType=${contentType}&contentId=${contentId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.length > 0 ? data[0] : null;
    },
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const requestApprovalMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/approvals", {
        method: "POST",
        body: JSON.stringify({
          contentType,
          contentId,
          assetPreviewUrl,
          status: "PENDING",
        }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals", contentType, contentId] });
      setIsRequestDialogOpen(false);
      toast({ title: "Approval requested successfully" });
      if (onApprovalChange) onApprovalChange(data as Approval);
    },
    onError: () => {
      toast({ title: "Failed to request approval", variant: "destructive" });
    },
  });

  const updateApprovalMutation = useMutation({
    mutationFn: (data: { status: string; rejectionReason?: string }) =>
      apiRequest(`/api/approvals/${approval?.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals", contentType, contentId] });
      setIsReviewDialogOpen(false);
      setRejectionReason("");
      toast({ title: data.status === "APPROVED" ? "Approved successfully" : "Feedback sent" });
      if (onApprovalChange) onApprovalChange(data as Approval);
    },
    onError: () => {
      toast({ title: "Failed to update approval", variant: "destructive" });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING": return <Clock className="w-4 h-4" />;
      case "APPROVED": return <CheckCircle className="w-4 h-4" />;
      case "REJECTED": return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
      case "APPROVED": return "bg-green-500/10 text-green-600 border-green-500/30";
      case "REJECTED": return "bg-red-500/10 text-red-600 border-red-500/30";
      default: return "";
    }
  };

  const getReviewerName = (reviewerId?: string | null) => {
    if (!reviewerId) return "Pending";
    const user = users?.find(u => u.id === reviewerId);
    return user?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-4">
          <div className="animate-pulse h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="pt-4">
          {!approval ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Send className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Request Approval</p>
                  <p className="text-xs text-muted-foreground">Send for review before publishing</p>
                </div>
              </div>
              <Button
                onClick={() => setIsRequestDialogOpen(true)}
                size="sm"
                data-testid="button-request-approval"
              >
                Request Approval
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    approval.status === "APPROVED" ? "bg-green-500/10" :
                    approval.status === "REJECTED" ? "bg-red-500/10" : "bg-yellow-500/10"
                  }`}>
                    {getStatusIcon(approval.status)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">Approval Status</p>
                      <Badge className={getStatusColor(approval.status)}>
                        {approval.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requested {format(new Date(approval.requestedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                {approval.status === "PENDING" && (
                  <Button
                    onClick={() => setIsReviewDialogOpen(true)}
                    size="sm"
                    variant="outline"
                    data-testid="button-review-approval"
                  >
                    Review
                  </Button>
                )}
              </div>

              {approval.status === "APPROVED" && approval.reviewedAt && (
                <div className="pl-11 text-sm text-muted-foreground">
                  Approved by {getReviewerName(approval.reviewerId)} on {format(new Date(approval.reviewedAt), "MMM d, yyyy")}
                </div>
              )}

              {approval.status === "REJECTED" && (
                <div className="pl-11 space-y-2">
                  {approval.reviewedAt && (
                    <p className="text-sm text-muted-foreground">
                      Rejected by {getReviewerName(approval.reviewerId)} on {format(new Date(approval.reviewedAt), "MMM d, yyyy")}
                    </p>
                  )}
                  {approval.rejectionReason && (
                    <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-600">Feedback</p>
                          <p className="text-sm text-muted-foreground mt-1">{approval.rejectionReason}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={() => requestApprovalMutation.mutate()}
                    size="sm"
                    variant="outline"
                    data-testid="button-resubmit-approval"
                  >
                    Resubmit for Approval
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Approval</DialogTitle>
            <DialogDescription>
              Submit "{contentTitle}" for review before publishing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">What happens next?</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>A notification will be sent to reviewers</li>
                    <li>They can approve or request changes</li>
                    <li>You&apos;ll be notified of the decision</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => requestApprovalMutation.mutate()}
              disabled={requestApprovalMutation.isPending}
              data-testid="button-confirm-request"
            >
              {requestApprovalMutation.isPending ? "Sending..." : "Request Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Content</DialogTitle>
            <DialogDescription>
              Review "{contentTitle}" and provide your decision
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {assetPreviewUrl && (
              <div className="border rounded-lg p-2">
                <img
                  src={assetPreviewUrl}
                  alt="Asset preview"
                  className="w-full h-48 object-cover rounded"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Feedback (optional for rejection)</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide feedback or request specific changes..."
                className="mt-2"
                data-testid="textarea-feedback"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => updateApprovalMutation.mutate({ status: "REJECTED", rejectionReason })}
              disabled={updateApprovalMutation.isPending}
              data-testid="button-reject"
            >
              Request Changes
            </Button>
            <Button
              onClick={() => updateApprovalMutation.mutate({ status: "APPROVED" })}
              disabled={updateApprovalMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-approve"
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BarChart3, Eye, Heart, MousePointerClick, Share2, MessageSquare, Bookmark, Users, ExternalLink } from "lucide-react";
import type { SocialPost, Brand } from "@shared/schema";

interface PerformanceFormProps {
  post: SocialPost & { brand?: Brand | null };
  open: boolean;
  onClose: () => void;
}

export function PerformanceForm({ post, open, onClose }: PerformanceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    followers: 0,
    views: 0,
    likes: 0,
    clicks: 0,
    shares: 0,
    comments: 0,
    saves: 0,
    postUrl: '',
    remarks: '',
  });

  const { data: existingPerformance } = useQuery<any>({
    queryKey: [`/api/social/${post.id}/performance`],
    enabled: open,
  });

  useEffect(() => {
    if (existingPerformance && existingPerformance.id) {
      setFormData({
        followers: existingPerformance.followers || 0,
        views: existingPerformance.views || 0,
        likes: existingPerformance.likes || 0,
        clicks: existingPerformance.clicks || 0,
        shares: existingPerformance.shares || 0,
        comments: existingPerformance.comments || 0,
        saves: existingPerformance.saves || 0,
        postUrl: existingPerformance.postUrl || '',
        remarks: existingPerformance.remarks || '',
      });
    }
  }, [existingPerformance]);

  const calculateEngagementRate = () => {
    const { views, likes, clicks, shares, comments, saves } = formData;
    if (views === 0) return '0.00';
    const totalEngagements = likes + clicks + shares + comments + saves;
    return ((totalEngagements / views) * 100).toFixed(2);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const engagementRate = parseFloat(calculateEngagementRate());
      return apiRequest('POST', `/api/social/${post.id}/performance`, {
        ...formData,
        engagementRate,
        recordedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({ title: "Performance data saved" });
      queryClient.invalidateQueries({ queryKey: [`/api/social/${post.id}/performance`] });
      queryClient.invalidateQueries({ queryKey: ['/api/social/top-performing?limit=5'] });
      queryClient.invalidateQueries({ queryKey: ['/api/social-posts'] });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to save performance data", variant: "destructive" });
    },
  });

  const updateNumericField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: parseInt(value) || 0 }));
  };

  const updateTextField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Record Post Performance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                {post.platform} post for {post.brand?.name || 'Unknown brand'}
              </p>
              {post.caption && (
                <p className="text-sm line-clamp-2">{post.caption}</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Followers</Label>
              <Input
                type="number"
                min="0"
                value={formData.followers}
                onChange={(e) => updateNumericField('followers', e.target.value)}
                data-testid="input-followers"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Eye className="h-3.5 w-3.5" /> Views</Label>
              <Input
                type="number"
                min="0"
                value={formData.views}
                onChange={(e) => updateNumericField('views', e.target.value)}
                data-testid="input-views"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Heart className="h-3.5 w-3.5" /> Likes</Label>
              <Input
                type="number"
                min="0"
                value={formData.likes}
                onChange={(e) => updateNumericField('likes', e.target.value)}
                data-testid="input-likes"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><MousePointerClick className="h-3.5 w-3.5" /> Clicks</Label>
              <Input
                type="number"
                min="0"
                value={formData.clicks}
                onChange={(e) => updateNumericField('clicks', e.target.value)}
                data-testid="input-clicks"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Share2 className="h-3.5 w-3.5" /> Shares/Reposts</Label>
              <Input
                type="number"
                min="0"
                value={formData.shares}
                onChange={(e) => updateNumericField('shares', e.target.value)}
                data-testid="input-shares"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /> Comments</Label>
              <Input
                type="number"
                min="0"
                value={formData.comments}
                onChange={(e) => updateNumericField('comments', e.target.value)}
                data-testid="input-comments"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Bookmark className="h-3.5 w-3.5" /> Saves</Label>
              <Input
                type="number"
                min="0"
                value={formData.saves}
                onChange={(e) => updateNumericField('saves', e.target.value)}
                data-testid="input-saves"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" /> Engagement Rate</Label>
              <div className="flex items-center px-3 py-2 rounded-md border bg-muted">
                <span className="font-semibold">{calculateEngagementRate()}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><ExternalLink className="h-3.5 w-3.5" /> Post URL</Label>
            <Input
              type="url"
              placeholder="https://instagram.com/p/..."
              value={formData.postUrl}
              onChange={(e) => updateTextField('postUrl', e.target.value)}
              data-testid="input-post-url"
            />
          </div>

          <div className="space-y-2">
            <Label>Remarks/Notes</Label>
            <Textarea
              placeholder="Any observations about this post's performance..."
              rows={3}
              value={formData.remarks}
              onChange={(e) => updateTextField('remarks', e.target.value)}
              data-testid="input-remarks"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-performance">Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-performance">
              {saveMutation.isPending ? 'Saving...' : 'Save Performance Data'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PerformanceBadges({ postId }: { postId: string }) {
  const { data: performance } = useQuery({
    queryKey: ['/api/social', postId, 'performance'],
    queryFn: async () => {
      const res = await fetch(`/api/social/${postId}/performance`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (!performance) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap" data-testid={`performance-badges-${postId}`}>
      {performance.views != null && performance.views > 0 && (
        <Badge variant="secondary" className="text-xs">
          <Eye className="h-3 w-3 mr-1" />
          {performance.views.toLocaleString()}
        </Badge>
      )}
      {performance.likes != null && performance.likes > 0 && (
        <Badge variant="secondary" className="text-xs">
          <Heart className="h-3 w-3 mr-1" />
          {performance.likes.toLocaleString()}
        </Badge>
      )}
      {performance.engagementRate != null && parseFloat(performance.engagementRate) > 0 && (
        <Badge variant="outline" className="text-xs">
          <BarChart3 className="h-3 w-3 mr-1" />
          {performance.engagementRate}% ER
        </Badge>
      )}
      {performance.postUrl && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            window.open(performance.postUrl, '_blank');
          }}
          data-testid={`button-view-post-${postId}`}
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Instagram,
  Facebook,
  Video,
  Linkedin,
  Twitter,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ThumbsUp,
  Send,
  Repeat2,
  Eye,
  ExternalLink,
  BookOpen,
} from "lucide-react";

interface PlatformPreviewProps {
  open: boolean;
  onClose: () => void;
  deliverableType: string;
  copy?: string | null;
  hashtags?: string[] | null;
  taggedUsers?: string[] | null;
  accountName?: string;
  canvaLink?: string | null;
}

const PLATFORM_FRAMES: Record<string, { icon: React.ElementType; name: string; bgColor: string; aspects: string }> = {
  INSTAGRAM_POST: { icon: Instagram, name: "Instagram", bgColor: "bg-gradient-to-br from-purple-600 to-pink-500", aspects: "aspect-square" },
  INSTAGRAM_STORY: { icon: Instagram, name: "Instagram Story", bgColor: "bg-gradient-to-br from-purple-600 to-orange-400", aspects: "aspect-[9/16] max-h-[400px]" },
  INSTAGRAM_REEL: { icon: Instagram, name: "Instagram Reel", bgColor: "bg-gradient-to-br from-purple-600 to-pink-500", aspects: "aspect-[9/16] max-h-[400px]" },
  FACEBOOK_POST: { icon: Facebook, name: "Facebook", bgColor: "bg-blue-600", aspects: "aspect-video" },
  TIKTOK_POST: { icon: Video, name: "TikTok", bgColor: "bg-black", aspects: "aspect-[9/16] max-h-[400px]" },
  LINKEDIN_POST: { icon: Linkedin, name: "LinkedIn", bgColor: "bg-blue-700", aspects: "aspect-video" },
  TWITTER_POST: { icon: Twitter, name: "Twitter/X", bgColor: "bg-zinc-900", aspects: "aspect-video" },
  REDNOTE_POST: { icon: BookOpen, name: "RedNote", bgColor: "bg-red-500", aspects: "aspect-[3/4] max-h-[400px]" },
};

function EngagementBar({ platform }: { platform: string }) {
  if (platform.startsWith("INSTAGRAM")) {
    return (
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-4">
          <Heart className="w-5 h-5 text-white cursor-pointer" data-testid="icon-heart" />
          <MessageCircle className="w-5 h-5 text-white cursor-pointer" data-testid="icon-comment" />
          <Send className="w-5 h-5 text-white cursor-pointer" data-testid="icon-send" />
        </div>
        <Bookmark className="w-5 h-5 text-white cursor-pointer" data-testid="icon-bookmark" />
      </div>
    );
  }

  if (platform === "FACEBOOK_POST") {
    return (
      <div className="flex items-center justify-around border-t border-white/10 px-3 py-2">
        <div className="flex items-center gap-1.5 text-white/80 text-xs cursor-pointer" data-testid="action-like">
          <ThumbsUp className="w-4 h-4" />
          <span>Like</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/80 text-xs cursor-pointer" data-testid="action-comment">
          <MessageCircle className="w-4 h-4" />
          <span>Comment</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/80 text-xs cursor-pointer" data-testid="action-share">
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </div>
      </div>
    );
  }

  if (platform === "TIKTOK_POST") {
    return (
      <div className="absolute right-2 bottom-16 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <Heart className="w-6 h-6 text-white" data-testid="icon-heart" />
          <span className="text-[10px] text-white/70">0</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <MessageCircle className="w-6 h-6 text-white" data-testid="icon-comment" />
          <span className="text-[10px] text-white/70">0</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Bookmark className="w-6 h-6 text-white" data-testid="icon-bookmark" />
          <span className="text-[10px] text-white/70">0</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Share2 className="w-6 h-6 text-white" data-testid="icon-share" />
          <span className="text-[10px] text-white/70">0</span>
        </div>
      </div>
    );
  }

  if (platform === "LINKEDIN_POST") {
    return (
      <div className="flex items-center justify-around border-t border-white/10 px-3 py-2">
        <div className="flex items-center gap-1.5 text-white/80 text-xs cursor-pointer" data-testid="action-like">
          <ThumbsUp className="w-4 h-4" />
          <span>Like</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/80 text-xs cursor-pointer" data-testid="action-comment">
          <MessageCircle className="w-4 h-4" />
          <span>Comment</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/80 text-xs cursor-pointer" data-testid="action-repost">
          <Repeat2 className="w-4 h-4" />
          <span>Repost</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/80 text-xs cursor-pointer" data-testid="action-send">
          <Send className="w-4 h-4" />
          <span>Send</span>
        </div>
      </div>
    );
  }

  if (platform === "TWITTER_POST") {
    return (
      <div className="flex items-center justify-around px-3 py-2">
        <MessageCircle className="w-4 h-4 text-white/60 cursor-pointer" data-testid="icon-reply" />
        <Repeat2 className="w-4 h-4 text-white/60 cursor-pointer" data-testid="icon-retweet" />
        <Heart className="w-4 h-4 text-white/60 cursor-pointer" data-testid="icon-heart" />
        <Bookmark className="w-4 h-4 text-white/60 cursor-pointer" data-testid="icon-bookmark" />
      </div>
    );
  }

  if (platform === "REDNOTE_POST") {
    return (
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-4">
          <Heart className="w-5 h-5 text-white cursor-pointer" data-testid="icon-heart" />
          <MessageCircle className="w-5 h-5 text-white cursor-pointer" data-testid="icon-comment" />
          <Share2 className="w-5 h-5 text-white cursor-pointer" data-testid="icon-share" />
        </div>
        <Bookmark className="w-5 h-5 text-white cursor-pointer" data-testid="icon-bookmark" />
      </div>
    );
  }

  return null;
}

export function PlatformPreviewModal({
  open,
  onClose,
  deliverableType,
  copy,
  hashtags,
  taggedUsers,
  accountName = "your_account",
  canvaLink,
}: PlatformPreviewProps) {
  const frame = PLATFORM_FRAMES[deliverableType];

  if (!frame) return null;

  const PlatformIcon = frame.icon;
  const isTikTok = deliverableType === "TIKTOK_POST";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md" data-testid="dialog-platform-preview">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-preview-title">
            <Eye className="w-4 h-4" />
            {frame.name} Preview
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg overflow-hidden bg-zinc-950 border border-white/10" data-testid="preview-frame">
          <div className="flex items-center gap-2 px-3 py-2 bg-black/40">
            <PlatformIcon className="w-5 h-5 text-white" data-testid="icon-platform" />
            <span className="text-sm font-semibold text-white" data-testid="text-account-name">
              {accountName}
            </span>
          </div>

          <div className={`relative w-full ${frame.aspects} ${frame.bgColor}`}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <PlatformIcon className="w-10 h-10 text-white/30" />
              <span className="text-xs text-white/50 font-medium">Design Preview</span>
              {canvaLink && (
                <a
                  href={canvaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-white/70 underline underline-offset-2"
                  data-testid="link-canva-design"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in Canva
                </a>
              )}
            </div>

            {isTikTok && <EngagementBar platform={deliverableType} />}
          </div>

          {!isTikTok && <EngagementBar platform={deliverableType} />}

          {(copy || (hashtags && hashtags.length > 0) || (taggedUsers && taggedUsers.length > 0)) && (
            <div className="px-3 py-2 space-y-1">
              {copy && (
                <p className="text-xs text-white/90 leading-relaxed" data-testid="text-copy-preview">
                  <span className="font-semibold text-white mr-1">{accountName}</span>
                  {copy}
                </p>
              )}

              {taggedUsers && taggedUsers.length > 0 && (
                <p className="text-xs text-blue-400" data-testid="text-tagged-users">
                  {taggedUsers.map((u) => (u.startsWith("@") ? u : `@${u}`)).join(" ")}
                </p>
              )}

              {hashtags && hashtags.length > 0 && (
                <p className="text-xs text-blue-400" data-testid="text-hashtags-preview">
                  {hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose} data-testid="button-close-preview">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

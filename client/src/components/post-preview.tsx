import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Send, Bookmark, ThumbsUp, Share2, Repeat2, Globe, MoreHorizontal, CheckCircle2 } from "lucide-react";
import type { SocialPost, Brand } from "@shared/schema";

interface PostPreviewProps {
  post: SocialPost & { brand?: Brand | null };
  open: boolean;
  onClose: () => void;
}

export function PostPreview({ post, open, onClose }: PostPreviewProps) {
  const defaultTab = post.platform?.toLowerCase() || "instagram";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Post Preview
            <Badge variant="secondary">{post.platform}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="instagram" data-testid="tab-instagram-preview">Instagram</TabsTrigger>
            <TabsTrigger value="facebook" data-testid="tab-facebook-preview">Facebook</TabsTrigger>
            <TabsTrigger value="tiktok" data-testid="tab-tiktok-preview">TikTok</TabsTrigger>
            <TabsTrigger value="linkedin" data-testid="tab-linkedin-preview">LinkedIn</TabsTrigger>
            <TabsTrigger value="twitter" data-testid="tab-twitter-preview">Twitter/X</TabsTrigger>
          </TabsList>

          <TabsContent value="instagram">
            <InstagramPreview post={post} />
          </TabsContent>
          <TabsContent value="facebook">
            <FacebookPreview post={post} />
          </TabsContent>
          <TabsContent value="tiktok">
            <TikTokPreview post={post} />
          </TabsContent>
          <TabsContent value="linkedin">
            <LinkedInPreview post={post} />
          </TabsContent>
          <TabsContent value="twitter">
            <TwitterPreview post={post} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InstagramPreview({ post }: { post: SocialPost & { brand?: Brand | null } }) {
  const brandColor = post.brand?.color || '#000000';
  const brandName = post.brand?.name || 'Brand';

  return (
    <div className="bg-white rounded-lg border max-w-md mx-auto text-black">
      <div className="flex items-center justify-between gap-2 p-3 border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: brandColor }} />
          <div>
            <p className="font-semibold text-sm">{brandName}</p>
            <p className="text-xs text-gray-500">Sponsored</p>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-400" />
      </div>

      <div className="aspect-square bg-gray-100">
        {post.assetUrl ? (
          <img src={post.assetUrl} alt="Post" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No image uploaded
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <Heart className="w-5 h-5" />
            <MessageCircle className="w-5 h-5" />
            <Send className="w-5 h-5" />
          </div>
          <Bookmark className="w-5 h-5" />
        </div>
        <p className="font-semibold text-sm">1,234 likes</p>
        <div className="text-sm">
          <span className="font-semibold mr-1">{brandName.toLowerCase().replace(/\s+/g, '')}</span>
          <span className="whitespace-pre-wrap">{post.caption || 'Caption text will appear here...'}</span>
        </div>
        <p className="text-sm text-gray-500">View all 89 comments</p>
        <p className="text-xs text-gray-400 uppercase">
          {post.scheduledDate ? new Date(post.scheduledDate).toLocaleDateString() : 'Scheduled date'}
        </p>
      </div>
    </div>
  );
}

function FacebookPreview({ post }: { post: SocialPost & { brand?: Brand | null } }) {
  const brandColor = post.brand?.color || '#1877f2';
  const brandName = post.brand?.name || 'Brand';

  return (
    <div className="bg-white rounded-lg border max-w-md mx-auto text-black">
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: brandColor }} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{brandName}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>{post.scheduledDate ? new Date(post.scheduledDate).toLocaleDateString() : 'Date'}</span>
                <span>&#183;</span>
                <Globe className="w-3 h-3 inline" />
              </div>
            </div>
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <p className="text-sm whitespace-pre-wrap">{post.caption || 'Caption text will appear here...'}</p>
      </div>

      <div className="bg-gray-100">
        {post.assetUrl ? (
          <img src={post.assetUrl} alt="Post" className="w-full object-cover" />
        ) : (
          <div className="w-full h-64 flex items-center justify-center text-gray-400 text-sm">
            No image uploaded
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-b flex items-center justify-between gap-2 text-xs text-gray-500">
        <span>1.2K Reactions</span>
        <div className="flex gap-3">
          <span>89 Comments</span>
          <span>23 Shares</span>
        </div>
      </div>

      <div className="px-4 py-2 flex items-center justify-around text-sm text-gray-600">
        <button className="flex items-center gap-2 hover:bg-gray-100 px-4 py-1 rounded">
          <span>Like</span>
        </button>
        <button className="flex items-center gap-2 hover:bg-gray-100 px-4 py-1 rounded">
          <span>Comment</span>
        </button>
        <button className="flex items-center gap-2 hover:bg-gray-100 px-4 py-1 rounded">
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}

function TikTokPreview({ post }: { post: SocialPost & { brand?: Brand | null } }) {
  const brandColor = post.brand?.color || '#000000';
  const brandName = post.brand?.name || 'Brand';

  return (
    <div className="bg-black rounded-lg relative max-w-sm mx-auto overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: '500px' }}>
      <div className="absolute inset-0">
        {post.assetUrl ? (
          <img src={post.assetUrl} alt="Post" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
            No video uploaded
          </div>
        )}
      </div>

      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center text-white">
          <div className="w-10 h-10 rounded-full border-2 border-white" style={{ backgroundColor: brandColor }} />
          <span className="text-xs mt-2 font-semibold">12.3K</span>
        </div>
        <div className="flex flex-col items-center text-white">
          <Heart className="w-5 h-5" />
          <span className="text-xs">892</span>
        </div>
        <div className="flex flex-col items-center text-white">
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs">234</span>
        </div>
        <div className="flex flex-col items-center text-white">
          <Share2 className="w-5 h-5" />
          <span className="text-xs">89</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full" style={{ backgroundColor: brandColor }} />
          <p className="text-white font-semibold text-sm">@{brandName.toLowerCase().replace(/\s+/g, '')}</p>
          <span className="text-white border border-white px-3 py-0.5 rounded text-xs font-semibold">Follow</span>
        </div>
        <p className="text-white text-sm line-clamp-2">{post.caption || 'Caption text will appear here...'}</p>
        <p className="text-white text-xs mt-1 opacity-70">Original Audio - {brandName}</p>
      </div>
    </div>
  );
}

function LinkedInPreview({ post }: { post: SocialPost & { brand?: Brand | null } }) {
  const brandColor = post.brand?.color || '#0A66C2';
  const brandName = post.brand?.name || 'Brand';

  return (
    <div className="bg-white rounded-lg border max-w-md mx-auto text-black">
      <div className="p-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-sm flex-shrink-0" style={{ backgroundColor: brandColor }} />
        <div className="flex-1">
          <p className="font-semibold text-sm">{brandName}</p>
          <p className="text-xs text-gray-500">Marketing Company</p>
          <p className="text-xs text-gray-400">{post.scheduledDate ? new Date(post.scheduledDate).toLocaleDateString() : 'Date'}</p>
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-400" />
      </div>

      <div className="px-4 pb-3">
        <p className="text-sm whitespace-pre-wrap">{post.caption || 'Post content will appear here...'}</p>
      </div>

      <div className="bg-gray-100">
        {post.assetUrl ? (
          <img src={post.assetUrl} alt="Post" className="w-full object-cover" />
        ) : (
          <div className="w-full h-64 flex items-center justify-center text-gray-400 text-sm">
            No image uploaded
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t flex items-center justify-between gap-2 text-xs text-gray-500">
        <span>245 reactions</span>
        <span>18 comments</span>
      </div>

      <div className="px-4 py-2 border-t flex items-center justify-around text-sm text-gray-600">
        <button className="flex items-center gap-1 hover:bg-gray-100 px-3 py-1 rounded">Like</button>
        <button className="flex items-center gap-1 hover:bg-gray-100 px-3 py-1 rounded">Comment</button>
        <button className="flex items-center gap-1 hover:bg-gray-100 px-3 py-1 rounded">Repost</button>
        <button className="flex items-center gap-1 hover:bg-gray-100 px-3 py-1 rounded">Send</button>
      </div>
    </div>
  );
}

function TwitterPreview({ post }: { post: SocialPost & { brand?: Brand | null } }) {
  const brandColor = post.brand?.color || '#000000';
  const brandName = post.brand?.name || 'Brand';

  return (
    <div className="bg-white rounded-lg border max-w-md mx-auto text-black">
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: brandColor }} />
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <p className="font-bold text-sm">{brandName}</p>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            <p className="text-gray-500 text-sm">@{brandName.toLowerCase().replace(/\s+/g, '')}</p>
            <span className="text-gray-400 text-sm">&#183;</span>
            <p className="text-gray-500 text-sm">{post.scheduledDate ? new Date(post.scheduledDate).toLocaleDateString() : 'Date'}</p>
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap">{post.caption || 'Tweet content will appear here...'}</p>

          {post.assetUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border">
              <img src={post.assetUrl} alt="Post" className="w-full object-cover" />
            </div>
          )}

          <div className="flex items-center justify-between mt-3 text-gray-500 text-sm max-w-xs">
            <span>89 replies</span>
            <span>234 reposts</span>
            <span>1.2K likes</span>
            <span>45K views</span>
          </div>
        </div>
      </div>
    </div>
  );
}

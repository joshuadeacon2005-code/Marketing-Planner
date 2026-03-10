import { useState, useCallback } from "react";
import { Image, FileText, Mail, Video, File, Play } from "lucide-react";
import type { AssetLibraryItem } from "@shared/schema";

const assetTypeIcons: Record<string, React.ElementType> = {
  GRAPHIC: Image,
  DATA: FileText,
  EMAIL_TEMPLATE: Mail,
  VIDEO: Video,
  DOCUMENT: File,
};

export const assetTypeColors: Record<string, string> = {
  GRAPHIC: "#E4405F",
  DATA: "#10B981",
  EMAIL_TEMPLATE: "#F59E0B",
  VIDEO: "#6366F1",
  DOCUMENT: "#3B82F6",
};

export const assetTypeLabels: Record<string, string> = {
  GRAPHIC: "Graphic",
  DATA: "Data File",
  EMAIL_TEMPLATE: "Email Template",
  VIDEO: "Video",
  DOCUMENT: "Document",
};

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|tiff?)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi|mkv|m4v|ogv)$/i;

function getDisplayUrl(asset: AssetLibraryItem): string | null {
  if (asset.thumbnailUrl) return asset.thumbnailUrl;
  if (asset.canvaThumbnailUrl) return asset.canvaThumbnailUrl;
  if (asset.fileUrl && (IMAGE_EXTENSIONS.test(asset.fileUrl) || asset.assetType === "GRAPHIC")) {
    return asset.fileUrl;
  }
  return null;
}

function isVideoFile(asset: AssetLibraryItem): boolean {
  if (asset.assetType === "VIDEO") return true;
  if (asset.fileUrl && VIDEO_EXTENSIONS.test(asset.fileUrl)) return true;
  return false;
}

export function AssetThumbnail({
  asset,
  size = "large",
}: {
  asset: AssetLibraryItem;
  size?: "large" | "small";
}) {
  const [imgError, setImgError] = useState(false);
  const displayUrl = getDisplayUrl(asset);
  const TypeIcon = assetTypeIcons[asset.assetType] || File;
  const color = assetTypeColors[asset.assetType] || "#6B7280";
  const isVideo = isVideoFile(asset);
  const isLarge = size === "large";

  const handleError = useCallback(() => {
    setImgError(true);
  }, []);

  if (displayUrl && !imgError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={displayUrl}
          alt={asset.name}
          className={`${isLarge ? "w-full h-full" : "w-10 h-10 rounded-md"} object-cover`}
          onError={handleError}
          loading="lazy"
          data-testid={`img-asset-${asset.id}`}
        />
        {isVideo && isLarge && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-5 h-5 text-black ml-0.5" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isVideo && asset.fileUrl && !imgError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-muted">
        <video
          src={asset.fileUrl}
          className={`${isLarge ? "w-full h-full" : "w-10 h-10 rounded-md"} object-cover`}
          muted
          preload="metadata"
          onError={handleError}
          data-testid={`video-asset-${asset.id}`}
        />
        {isLarge && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-5 h-5 text-black ml-0.5" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${isLarge ? "" : "w-10 h-10 rounded-md"}`}
      style={isLarge ? undefined : { backgroundColor: `${color}20` }}
    >
      <TypeIcon
        className={isLarge ? "w-12 h-12" : "w-5 h-5"}
        style={{ color }}
      />
    </div>
  );
}

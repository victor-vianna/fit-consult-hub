import { useState } from "react";
import { Dumbbell, ExternalLink, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DIRECT_VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".ogv", ".mov", ".m4v"];

interface ExerciseVideoPreviewProps {
  videoUrl?: string | null;
  fallbackImage?: string | null;
  title: string;
  className?: string;
}

function getUrl(value?: string | null): URL | null {
  if (!value) return null;

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isDirectVideoUrl(url: URL): boolean {
  const pathname = url.pathname.toLowerCase();
  return DIRECT_VIDEO_EXTENSIONS.some((extension) => pathname.endsWith(extension));
}

function getYoutubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] || null;
  }

  if (!host.endsWith("youtube.com")) return null;

  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }

  const [, type, id] = url.pathname.split("/");
  if (["embed", "shorts"].includes(type) && id) {
    return id;
  }

  return null;
}

function getYoutubeEmbedUrl(videoId: string, controls = false): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: videoId,
    controls: controls ? "1" : "0",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
    iv_load_policy: "3",
    disablekb: controls ? "0" : "1",
    fs: controls ? "1" : "0",
  });

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

export function ExerciseVideoPreview({
  videoUrl,
  fallbackImage,
  title,
  className,
}: ExerciseVideoPreviewProps) {
  const parsedUrl = getUrl(videoUrl);
  const youtubeId = parsedUrl ? getYoutubeId(parsedUrl) : null;
  const hasDirectVideo = parsedUrl ? isDirectVideoUrl(parsedUrl) : false;
  const [open, setOpen] = useState(false);
  const canOpenPreview = Boolean(videoUrl && (hasDirectVideo || youtubeId));

  return (
    <>
      <div
        className={cn(
          "relative aspect-video w-full min-w-[152px] max-w-[220px] shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm sm:w-[176px]",
          className
        )}
      >
        {hasDirectVideo && videoUrl ? (
          <video
            src={videoUrl}
            title={`Demonstracao de ${title}`}
            className="h-full w-full object-cover"
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
          />
        ) : youtubeId ? (
          <iframe
            title={`Demonstracao de ${title}`}
            src={getYoutubeEmbedUrl(youtubeId)}
            className="h-full w-full pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture"
            loading="lazy"
          />
        ) : fallbackImage ? (
          <img
            src={fallbackImage}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Dumbbell className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        {canOpenPreview && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
            aria-label={`Ampliar demonstracao de ${title}`}
            className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/35 via-transparent to-transparent p-2 text-white transition-colors hover:from-black/45"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
              <Maximize2 className="h-3.5 w-3.5" />
            </span>
          </button>
        )}

        {videoUrl && !hasDirectVideo && !youtubeId && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir demonstracao de ${title}`}
            className="absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-colors hover:bg-black/55"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl overflow-hidden p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="pr-8 text-base">{title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black">
            {hasDirectVideo && videoUrl ? (
              <video
                src={videoUrl}
                title={`Demonstracao de ${title}`}
                className="h-full w-full"
                muted
                autoPlay
                loop
                playsInline
                controls
              />
            ) : youtubeId ? (
              <iframe
                title={`Demonstracao de ${title}`}
                src={getYoutubeEmbedUrl(youtubeId, true)}
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ExerciseVideoPreview;

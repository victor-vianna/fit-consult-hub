import { useRef, useState } from "react";
import { Dumbbell, ExternalLink, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

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

function getYoutubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: "0",
    mute: "1",
    loop: "1",
    playlist: videoId,
    controls: "1",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("[ExerciseVideoPreview] Erro ao controlar video:", error);
    }
  };

  return (
    <div
      className={cn(
        "relative h-[116px] w-[96px] shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm sm:h-[132px] sm:w-[108px]",
        className
      )}
    >
      {hasDirectVideo && videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          title={`Demonstração de ${title}`}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      ) : youtubeId ? (
        <iframe
          title={`Demonstração de ${title}`}
          src={getYoutubeEmbedUrl(youtubeId)}
          className="h-full w-full"
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

      {hasDirectVideo && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            togglePlayback();
          }}
          aria-label={isPlaying ? `Pausar demonstração de ${title}` : `Reproduzir demonstração de ${title}`}
          className="absolute inset-0 flex items-center justify-center bg-black/10 text-white transition-colors hover:bg-black/20"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
          </span>
        </button>
      )}

      {videoUrl && !hasDirectVideo && !youtubeId && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir demonstração de ${title}`}
          className="absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-colors hover:bg-black/55"
          onClick={(event) => event.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

export default ExerciseVideoPreview;

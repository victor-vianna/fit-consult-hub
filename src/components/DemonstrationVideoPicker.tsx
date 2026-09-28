import { useMemo, useState } from "react";
import { ExternalLink, Play, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getValidVideoReferences,
  getVideoThumbnail,
} from "@/utils/videoLinks";

interface DemonstrationVideoPickerProps {
  links?: unknown;
  legacyVideoUrl?: string | null;
  title: string;
  variant?: "thumbnail" | "inline";
  className?: string;
}

export function DemonstrationVideoPicker({
  links,
  legacyVideoUrl,
  title,
  variant = "thumbnail",
  className,
}: DemonstrationVideoPickerProps) {
  const [open, setOpen] = useState(false);
  const videos = useMemo(
    () => getValidVideoReferences(links, legacyVideoUrl),
    [legacyVideoUrl, links]
  );

  if (videos.length === 0) return null;

  const firstVideo = videos[0];
  const firstThumbnail = getVideoThumbnail(firstVideo.url);
  const hasMultipleVideos = videos.length > 1;
  const accessibleTitle = hasMultipleVideos
    ? `Escolher entre ${videos.length} vídeos de demonstração de ${title}`
    : `Abrir demonstração de ${title} em nova aba`;

  const triggerContent =
    variant === "inline" ? (
      <>
        <Play className="h-3.5 w-3.5 shrink-0" />
        <span>
          {hasMultipleVideos
            ? `Ver ${videos.length} demonstrações`
            : "Ver demonstração"}
        </span>
      </>
    ) : (
      <>
        <img
          src={firstThumbnail || undefined}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60">
            <Play className="ml-0.5 h-3.5 w-3.5 text-white" />
          </span>
        </span>
        {hasMultipleVideos ? (
          <span className="absolute right-1 top-1 rounded-full bg-background/95 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-foreground shadow-sm">
            {videos.length} vídeos
          </span>
        ) : null}
      </>
    );

  const triggerClassName = cn(
    variant === "inline"
      ? "inline-flex min-h-9 items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
      : "relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted shadow-sm transition-transform active:scale-[0.98] sm:h-14 sm:w-20",
    className
  );

  if (!hasMultipleVideos) {
    return (
      <a
        href={firstVideo.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        aria-label={accessibleTitle}
        title="Abrir demonstração"
        className={triggerClassName}
      >
        {triggerContent}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={accessibleTitle}
        title={`${videos.length} vídeos de demonstração`}
        className={triggerClassName}
      >
        {triggerContent}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[88vh] w-[calc(100vw-1rem)] max-w-xl overflow-hidden p-0"
          onClick={(event) => event.stopPropagation()}
        >
          <DialogHeader className="border-b px-4 pb-4 pt-5 sm:px-6">
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Video className="h-5 w-5 text-primary" />
              Vídeos de demonstração
            </DialogTitle>
            <DialogDescription>
              {title} possui {videos.length} referências. Escolha qual deseja assistir.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[68vh] gap-2 overflow-y-auto p-4 sm:grid-cols-2 sm:p-6">
            {videos.map((video, index) => {
              const thumbnail = getVideoThumbnail(video.url);

              return (
                <a
                  key={video.url}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-w-0 items-center gap-3 rounded-lg border bg-card p-2 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                    <img
                      src={thumbnail || undefined}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60">
                        <Play className="ml-0.5 h-3.5 w-3.5 text-white" />
                      </span>
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-muted-foreground">
                      Demonstração {index + 1}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-sm font-medium text-foreground">
                      <span className="truncate">{video.label}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DemonstrationVideoPicker;

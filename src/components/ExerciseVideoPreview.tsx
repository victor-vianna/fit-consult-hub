import { cn } from "@/lib/utils";
import { DEFAULT_VIDEO_THUMBNAIL, getNormalizedVideoUrl } from "@/utils/videoLinks";

interface ExerciseVideoPreviewProps {
  videoUrl?: string | null;
  fallbackImage?: string | null;
  title: string;
  className?: string;
  objectFit?: "cover" | "contain";
}

export function ExerciseVideoPreview({
  videoUrl,
  title,
  className,
}: ExerciseVideoPreviewProps) {
  const externalUrl = getNormalizedVideoUrl(videoUrl);

  const content = (
    <img
      src={DEFAULT_VIDEO_THUMBNAIL}
      alt=""
      className="h-full w-full object-cover"
      loading="lazy"
    />
  );

  if (!externalUrl) {
    return (
      <div
        className={cn(
          "relative aspect-[9/12] w-full min-w-[108px] max-w-[160px] shrink-0 overflow-hidden rounded-lg bg-muted opacity-70 shadow-sm",
          className
        )}
        aria-label={`Sem video cadastrado para ${title}`}
      >
        {content}
      </div>
    );
  }

  return (
    <a
      href={externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      aria-label={`Abrir video de ${title} no YouTube`}
      className={cn(
        "relative aspect-[9/12] w-full min-w-[108px] max-w-[160px] shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm transition-transform active:scale-[0.98]",
        className
      )}
    >
      {content}
    </a>
  );
}

export default ExerciseVideoPreview;

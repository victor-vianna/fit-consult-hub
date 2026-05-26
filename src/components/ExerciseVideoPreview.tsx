import { cn } from "@/lib/utils";

const DEFAULT_EXERCISE_THUMBNAIL = "/exercise-thumbnail.svg";

interface ExerciseVideoPreviewProps {
  videoUrl?: string | null;
  fallbackImage?: string | null;
  title: string;
  className?: string;
  objectFit?: "cover" | "contain";
}

function getExternalVideoUrl(value?: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/watch?v=${videoId}` : value;
    }

    if (host.endsWith("youtube.com")) {
      const [, type, id] = url.pathname.split("/");

      if (url.pathname === "/watch") return value;
      if (["embed", "shorts"].includes(type) && id) {
        return `https://www.youtube.com/watch?v=${id}`;
      }
    }

    return value;
  } catch {
    return value;
  }
}

export function ExerciseVideoPreview({
  videoUrl,
  title,
  className,
}: ExerciseVideoPreviewProps) {
  const externalUrl = getExternalVideoUrl(videoUrl);

  const content = (
    <img
      src={DEFAULT_EXERCISE_THUMBNAIL}
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

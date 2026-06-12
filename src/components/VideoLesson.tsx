import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2 } from "lucide-react";

interface VideoLessonProps {
  videoId: string;
  videoUrl: string;
  nextTestUrl: string;
  title?: string;
  /** Seconds of tolerance for "completed" detection (default 1.5s) */
  completionTolerance?: number;
  /** Save interval in ms (default 5000) */
  saveIntervalMs?: number;
}

const keys = (id: string) => ({
  progress: `progress_${id}`,
  max: `max_progress_${id}`,
  completed: `completed_${id}`,
});

export function VideoLesson({
  videoId,
  videoUrl,
  nextTestUrl,
  title,
  completionTolerance = 1.5,
  saveIntervalMs = 5000,
}: VideoLessonProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const k = keys(videoId);

  const [completed, setCompleted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(k.completed) === "true";
  });
  const [maxProgress, setMaxProgress] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseFloat(localStorage.getItem(k.max) ?? "0") || 0;
  });
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  // Resume from saved position on mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const saved = parseFloat(localStorage.getItem(k.progress) ?? "0");
    const onLoaded = () => {
      if (saved > 0 && saved < video.duration) {
        video.currentTime = saved;
      }
    };
    video.addEventListener("loadedmetadata", onLoaded);
    return () => video.removeEventListener("loadedmetadata", onLoaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Periodic save every N seconds
  useEffect(() => {
    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) return;
      localStorage.setItem(k.progress, String(video.currentTime));
    }, saveIntervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, saveIntervalMs]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;

    // Update max progress as user watches forward naturally
    if (t > maxProgress) {
      const next = t;
      setMaxProgress(next);
      localStorage.setItem(k.max, String(next));
    }
  }, [maxProgress, k.max]);

  const handleSeeking = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (completed) return; // once completed, free seek
    const allowed = maxProgress + completionTolerance;
    if (video.currentTime > allowed) {
      video.currentTime = Math.max(0, maxProgress);
      setShowSkipWarning(true);
      window.setTimeout(() => setShowSkipWarning(false), 2500);
    }
  }, [completed, maxProgress, completionTolerance, k.max]);

  const handleEnded = useCallback(() => {
    localStorage.setItem(k.completed, "true");
    localStorage.setItem(k.progress, "0");
    setCompleted(true);
  }, [k.completed, k.progress]);

  const handleTestClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!completed) {
      e.preventDefault();
      alert("Per accedere al test devi prima completare la visione del video.");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {title && <h2 className="text-2xl font-semibold">{title}</h2>}

      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          controlsList="nodownload"
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onEnded={handleEnded}
          className="w-full h-full"
        />
        {showSkipWarning && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-sm px-3 py-1.5 rounded-md shadow">
            Non puoi saltare avanti nel video
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {completed ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Lezione completata
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Guarda tutto il video per sbloccare il test
            </>
          )}
        </div>

        <Button
          asChild={completed}
          disabled={!completed}
          variant={completed ? "default" : "secondary"}
          className={completed ? "" : "opacity-60 cursor-not-allowed"}
        >
          {completed ? (
            <a href={nextTestUrl} onClick={handleTestClick}>
              Vai al test
            </a>
          ) : (
            <span>Vai al test</span>
          )}
        </Button>
      </div>
    </div>
  );
}

export default VideoLesson;

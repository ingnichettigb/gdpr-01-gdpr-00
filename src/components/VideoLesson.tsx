import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2 } from "lucide-react";

interface VideoLessonProps {
  videoId: string;
  videoUrl: string;
  nextTestUrl?: string;
  title?: string;
  /** Hide built-in "Vai al test" button (when parent renders its own) */
  hideTestButton?: boolean;
  /** Lock the player until a prerequisite is met */
  locked?: boolean;
  /** Notify parent when completion state changes */
  onCompletedChange?: (completed: boolean) => void;
  /** Completamento già registrato lato server (course_progress) */
  serverCompleted?: boolean;
  /** Chiamato a fine video: persistenza su course_progress */
  onEnded?: () => void | Promise<void>;
  completionTolerance?: number;
  saveIntervalMs?: number;
}

// Legge il PUK dell'attivazione corrente (stessa fonte usata in tutto il resto
// dell'app: sessionStorage.activation, popolato da attivazione.tsx). Serve per
// scopare le chiavi di avanzamento video PER PUK, cosi' due PUK diversi usati
// nello stesso browser non condividono lo stesso stato di completamento.
export function currentPuk(): string {
  if (typeof window === "undefined") return "no-puk";
  // 1) sessionStorage: attivazione appena fatta in questa sessione
  try {
    const raw = sessionStorage.getItem("activation");
    const act = raw ? JSON.parse(raw) : null;
    if (act?.puk) return act.puk;
  } catch {
    // ignore
  }
  // 2) localStorage "attestato_data": sopravvive alla chiusura del browser,
  // popolato quando l'utente compila i dati anagrafici (prima dei video).
  try {
    const raw = localStorage.getItem("attestato_data");
    const data = raw ? JSON.parse(raw) : null;
    if (data?.puk) return data.puk;
  } catch {
    // ignore
  }
  // 3) localStorage "lastActivation": sopravvive anch'esso, popolato subito
  // dopo l'attivazione (anche prima di arrivare ai dati anagrafici).
  try {
    const raw = localStorage.getItem("lastActivation");
    const act = raw ? JSON.parse(raw) : null;
    if (act?.puk) return act.puk;
  } catch {
    // ignore
  }
  return "no-puk";
}

const keys = (id: string) => {
  const puk = currentPuk();
  return {
    progress: `progress_${puk}_${id}`,
    max: `max_progress_${puk}_${id}`,
    completed: `completed_${puk}_${id}`,
  };
};

export function isLessonCompleted(videoId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`completed_${currentPuk()}_${videoId}`) === "true";
}

export function VideoLesson({
  videoId,
  videoUrl,
  nextTestUrl,
  title,
  hideTestButton = false,
  locked = false,
  onCompletedChange,
  serverCompleted = false,
  onEnded,
  completionTolerance = 1.5,
  saveIntervalMs = 5000,
}: VideoLessonProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const k = keys(videoId);

  const [completed, setCompleted] = useState(serverCompleted);
  const [maxProgress, setMaxProgress] = useState(0);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCompleted(serverCompleted || localStorage.getItem(k.completed) === "true");
    setMaxProgress(parseFloat(localStorage.getItem(k.max) ?? "0") || 0);
  }, [videoId, serverCompleted, k.completed, k.max]);

  useEffect(() => {
    onCompletedChange?.(completed);
  }, [completed, onCompletedChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || locked) return;
    const saved = parseFloat(localStorage.getItem(k.progress) ?? "0");
    const onLoaded = () => {
      if (saved > 0 && saved < video.duration) {
        video.currentTime = saved;
      }
    };
    video.addEventListener("loadedmetadata", onLoaded);
    return () => video.removeEventListener("loadedmetadata", onLoaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, locked]);

  useEffect(() => {
    if (locked) return;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) return;
      localStorage.setItem(k.progress, String(video.currentTime));
    }, saveIntervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, saveIntervalMs, locked]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    if (t > maxProgress) {
      setMaxProgress(t);
      localStorage.setItem(k.max, String(t));
    }
  }, [maxProgress, k.max]);

  const handleSeeking = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (completed) return;
    const allowed = maxProgress + completionTolerance;
    if (video.currentTime > allowed) {
      video.currentTime = Math.max(0, maxProgress);
      setShowSkipWarning(true);
      window.setTimeout(() => setShowSkipWarning(false), 2500);
    }
  }, [completed, maxProgress, completionTolerance]);

  const handleEnded = useCallback(() => {
    localStorage.setItem(k.completed, "true");
    localStorage.setItem(k.progress, "0");
    setCompleted(true);
    void onEnded?.();
  }, [k.completed, k.progress, onEnded]);

  return (
    <div className="w-full space-y-3">
      {title && <h3 className="text-xl font-semibold">{title}</h3>}

      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
        {locked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2">
            <Lock className="h-8 w-8" />
            <p className="text-sm">Completa il modulo precedente per sbloccare questo video</p>
          </div>
        ) : (
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
        )}
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
              Modulo completato
            </>
          ) : locked ? (
            <>
              <Lock className="h-4 w-4" />
              Bloccato
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Guarda tutto il video per completare il modulo
            </>
          )}
        </div>

        {!hideTestButton && nextTestUrl && (
          <Button
            asChild={completed}
            disabled={!completed}
            variant={completed ? "default" : "secondary"}
            className={completed ? "" : "opacity-60 cursor-not-allowed"}
          >
            {completed ? <a href={nextTestUrl}>Vai al test</a> : <span>Vai al test</span>}
          </Button>
        )}
      </div>
    </div>
  );
}

export default VideoLesson;

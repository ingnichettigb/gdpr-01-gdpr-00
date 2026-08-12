import { useEffect, useRef, useState, useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2 } from "lucide-react";

interface VideoLessonProps {
  videoId: string;
  /** URL YouTube del video (es. https://youtu.be/XXXXXXXXXXX oppure
   * https://www.youtube.com/watch?v=XXXXXXXXXXX). Manteniamo il nome prop
   * "videoUrl" per compatibilita' con i chiamanti esistenti (corso.tsx),
   * anche se ora accetta un URL YouTube invece di un file mp4 diretto. */
  videoUrl: string;
  nextTestUrl?: string;
  title?: string;
  /** Hide built-in "Vai al test" button (when parent renders its own) */
  hideTestButton?: boolean;
  /** Lock the player until a prerequisite is met */
  locked?: boolean;
  /** Notify parent when completion state changes */
  onCompletedChange?: (completed: boolean) => void;
  /** Completamento già registrato lato server (video_progress) */
  serverCompleted?: boolean;
  /** Chiamato a fine video: persistenza su video_progress */
  onEnded?: () => void | Promise<void>;
  completionTolerance?: number;
  saveIntervalMs?: number;
}

// --- YouTube IFrame API: caricamento minimale, senza dipendenze npm ---
declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
}

let ytApiPromise: Promise<void> | null = null;

/** Carica lo script IFrame API di YouTube una sola volta per l'intera app. */
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

/** Estrae l'ID video da un URL youtu.be/... o youtube.com/watch?v=... */
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "") || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch) return embedMatch[1];
    }
  } catch {
    // ignore, fallback sotto
  }
  return null;
}

// Legge il PUK dell'attivazione corrente (stessa fonte usata in tutto il resto
// dell'app: sessionStorage.activation, popolato da attivazione.tsx). Serve per
// scopare le chiavi di avanzamento video PER PUK, cosi' due PUK diversi usati
// nello stesso browser non condividono lo stesso stato di completamento.
export function currentPuk(): string {
  if (typeof window === "undefined") return "no-puk";
  try {
    const raw = sessionStorage.getItem("activation");
    const act = raw ? JSON.parse(raw) : null;
    if (act?.puk) return act.puk;
  } catch {
    // ignore
  }
  try {
    const raw = localStorage.getItem("attestato_data");
    const data = raw ? JSON.parse(raw) : null;
    if (data?.puk) return data.puk;
  } catch {
    // ignore
  }
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
  const containerId = `yt-player-${useId().replace(/:/g, "")}`;
  const playerRef = useRef<YTPlayer | null>(null);
  const k = keys(videoId);

  const [completed, setCompleted] = useState(serverCompleted);
  const [maxProgress, setMaxProgress] = useState(0);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  // maxProgress/completed vengono letti anche dentro i callback dell'API
  // YouTube, che catturerebbero un valore stale se leggessimo solo lo state
  // React: usiamo ref sempre aggiornati per la logica di anti-skip.
  const maxProgressRef = useRef(0);
  useEffect(() => {
    maxProgressRef.current = maxProgress;
  }, [maxProgress]);

  const completedRef = useRef(false);
  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCompleted(serverCompleted || localStorage.getItem(k.completed) === "true");
    setMaxProgress(parseFloat(localStorage.getItem(k.max) ?? "0") || 0);
  }, [videoId, serverCompleted, k.completed, k.max]);

  useEffect(() => {
    onCompletedChange?.(completed);
  }, [completed, onCompletedChange]);

  const handleEnded = useCallback(() => {
    localStorage.setItem(k.completed, "true");
    localStorage.setItem(k.progress, "0");
    setCompleted(true);
    void onEnded?.();
  }, [k.completed, k.progress, onEnded]);

  // Crea/distrugge il player YouTube quando il video (o lo stato locked) cambia.
  useEffect(() => {
    if (locked) return;
    const youtubeId = extractYouTubeId(videoUrl);
    if (!youtubeId) {
      console.error("VideoLesson: impossibile estrarre l'ID YouTube da", videoUrl);
      return;
    }

    let destroyed = false;
    let pollId: number | undefined;

    loadYouTubeApi().then(() => {
      if (destroyed || !window.YT) return;
      const saved = parseFloat(localStorage.getItem(k.progress) ?? "0");

      const player = new window.YT.Player(containerId, {
        videoId: youtubeId,
        playerVars: { modestbranding: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: (e) => {
            if (saved > 0) {
              e.target.seekTo(saved, true);
            }
          },
          onStateChange: (e) => {
            if (!window.YT) return;
            if (e.data === window.YT.PlayerState.ENDED) {
              handleEnded();
            }
          },
        },
      });
      playerRef.current = player;

      // Polling per: tracking progresso + anti-skip.
      // L'IFrame API di YouTube non espone un evento "onSeeking" nativo come
      // il tag <video>, quindi rileviamo i salti in avanti confrontando la
      // posizione corrente con quella massima raggiunta finora. Il controllo
      // gira a intervalli BREVI (molto più corti di saveIntervalMs): con un
      // poll ogni 5s la normale riproduzione dei primi 5 secondi verrebbe
      // scambiata per un salto in avanti (bug riscontrato e corretto su
      // 02-GDPR-00, riportato qui fin da subito). La scrittura su
      // localStorage resta invece throttlata a saveIntervalMs.
      const ANTI_SKIP_POLL_MS = 500;
      let lastSaveAt = 0;

      pollId = window.setInterval(() => {
        const p = playerRef.current;
        if (!p) return;
        let t: number;
        try {
          t = p.getCurrentTime();
        } catch {
          return;
        }
        if (Number.isNaN(t)) return;

        if (!completedRef.current) {
          const allowed = maxProgressRef.current + completionTolerance;
          if (t > allowed) {
            p.seekTo(Math.max(0, maxProgressRef.current), true);
            setShowSkipWarning(true);
            window.setTimeout(() => setShowSkipWarning(false), 2500);
            return;
          }
        }

        if (t > maxProgressRef.current) {
          maxProgressRef.current = t;
          setMaxProgress(t);
          localStorage.setItem(k.max, String(t));
        }

        const now = Date.now();
        if (now - lastSaveAt >= saveIntervalMs) {
          lastSaveAt = now;
          localStorage.setItem(k.progress, String(t));
        }
      }, ANTI_SKIP_POLL_MS);
    });

    return () => {
      destroyed = true;
      if (pollId) window.clearInterval(pollId);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, videoUrl, locked, saveIntervalMs, completionTolerance, containerId, handleEnded]);

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
          <div id={containerId} className="w-full h-full" />
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

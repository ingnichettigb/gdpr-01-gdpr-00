import { createFileRoute } from "@tanstack/react-router";
import { VideoLesson } from "@/components/VideoLesson";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lezione video — Corporate Boost Service" },
      {
        name: "description",
        content:
          "Modulo video per e-learning con ripresa automatica, blocco salto avanti e sblocco test al completamento.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Lezione 1 — Privacy</h1>
        <p className="text-muted-foreground mt-2">
          Guarda il video fino alla fine per sbloccare il test. Puoi tornare indietro,
          ma non saltare avanti. La tua posizione viene salvata automaticamente.
        </p>
      </div>

      <VideoLesson
        videoId="lezione1"
        videoUrl="https://www.w3schools.com/html/mov_bbb.mp4"
        nextTestUrl="/test/lezione1"
        title="Modulo 1 — Introduzione"
      />
    </main>
  );
}

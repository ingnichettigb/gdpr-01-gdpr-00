/**
 * Elenco dei moduli video del corso, in sequenza — FONTE UNICA DI VERITÀ.
 *
 * "key" è il module_key salvato su Supabase (tabella video_progress) — NON
 * cambiare i valori esistenti (lezione1, lezione2, ...) per non perdere la
 * corrispondenza con i completamenti già registrati.
 *
 * Importato da corso.tsx (player), test.tsx (gate d'accesso + pulizia) e
 * index.tsx (dashboard di riepilogo), così un solo posto da aggiornare se
 * cambia il numero di moduli o i loro titoli.
 */
export const LESSONS: { key: string; title: string; videoUrl: string }[] = [
  {
    key: "lezione1",
    title: "Modulo 1 — My Privacy: il Regolamento europeo in materia di protezione dei dati personali",
    videoUrl: "https://youtu.be/7M1kTqg_UlE",
  },
  {
    key: "lezione2",
    title: "Modulo 2 — I 7 Principi del GDPR (prima parte)",
    videoUrl: "https://youtu.be/qtAdKxFazjs",
  },
  {
    key: "lezione3",
    title: "Modulo 3 — I 7 Principi del GDPR (seconda parte)",
    videoUrl: "https://youtu.be/e8A71MhwGYI",
  },
  {
    key: "lezione4",
    title: "Modulo 4 — L'Interessato",
    videoUrl: "https://youtu.be/Wwkun2SeetI",
  },
  {
    key: "lezione5",
    title: "Modulo 5 — Le Figure Chiave del GDPR",
    videoUrl: "https://youtu.be/iSxAr5izHrQ",
  },
  {
    key: "lezione6",
    title: "Modulo 6 — Un Nuovo Approccio",
    videoUrl: "https://youtu.be/qe62Se_HgVo",
  },
  {
    key: "lezione7",
    title: "Modulo 7 — Responsabilità e Sanzioni",
    videoUrl: "https://youtu.be/aJL1c7LzP6E",
  },
  {
    key: "lezione8",
    title: "Modulo 8 — Privacy come Processo Continuo",
    videoUrl: "https://youtu.be/pNXYDiyDV_M",
  },
  {
    key: "lezione9",
    title: "Modulo 9 — Documenti Cartacei",
    videoUrl: "https://youtu.be/2-q_BCWPDpk",
  },
  {
    key: "lezione10",
    title: "Modulo 10 — Governance e Compliance GDPR",
    videoUrl: "https://youtu.be/CmMerixgD-0",
  },
];

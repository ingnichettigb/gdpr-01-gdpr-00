import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Download, RotateCw } from "lucide-react";
import { generateAttestatoPdf, TOPICS } from "@/lib/generateAttestatoPdf";
import timbroAsset from "@/assets/timbro_corporate.png.asset.json";
import { checkCertificateByPuk } from "@/lib/certificate.functions";



export const Route = createFileRoute("/attestato")({
  head: () => ({
    meta: [
      { title: "Attestato — Corporate Boost Service" },
      {
        name: "description",
        content:
          "Attestato di partecipazione e superamento del corso Privacy GDPR per Incaricati.",
      },
    ],
  }),
  component: AttestatoPage,
});

const STORAGE_KEY = "attestato_data";
const PASSED_KEY = "test_passed";

type Data = {
  nome: string;
  luogo: string;
  dataNascita: string;
  cf: string;
  ditta: string;
};

function AttestatoPage() {
  const navigate = useNavigate();
  const checkCertFn = useServerFn(checkCertificateByPuk);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [noActivationFound, setNoActivationFound] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [certNumber, setCertNumber] = useState<string>("");
  const [issuedAt, setIssuedAt] = useState<string>("");

  useEffect(() => {
    (async () => {
      // 1) Prova a leggere il certificato da Supabase usando il PUK corrente.
      // Cerca prima in sessionStorage (attivazione appena fatta in questa sessione),
      // poi come fallback in localStorage (attivazione fatta in questo stesso
      // browser, anche in una sessione precedente).
      let pukCorrente: string | null = null;
      try {
        const raw = sessionStorage.getItem("activation");
        const act = raw ? JSON.parse(raw) : null;
        pukCorrente = act?.puk ?? null;
      } catch {
        // ignore
      }
      if (!pukCorrente) {
        try {
          const raw = localStorage.getItem("lastActivation");
          const act = raw ? JSON.parse(raw) : null;
          pukCorrente = act?.puk ?? null;
        } catch {
          // ignore
        }
      }

      if (pukCorrente) {
        const cert = await checkCertFn({ data: { puk: pukCorrente } });
        if (cert) {
          setAllowed(true);
          setData({
            nome: cert.nome_snapshot ?? "",
            luogo: cert.luogo_nascita_snapshot ?? "",
            dataNascita: cert.data_nascita_snapshot ?? "",
            cf: (cert.cf_snapshot ?? "").toUpperCase(),
            ditta: cert.ditta_snapshot ?? "",
          });
          setCertNumber(cert.certificate_number ?? "");
          setIssuedAt(cert.issued_at ?? "");
          return;
        }
      } else {
        // Nessun riferimento PUK trovato in nessuno storage: non sappiamo se
        // l'utente ha superato il test o no, semplicemente non abbiamo modo
        // di identificarlo. Messaggio diverso da "non hai superato il test".
        setNoActivationFound(true);
      }



      // 2) Fallback al flusso legacy (localStorage) — nessun certificato ancora salvato
      const passed = localStorage.getItem(PASSED_KEY) === "true";
      setAllowed(passed);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.nome && parsed.cf && parsed.ditta) {
            setData({ ...parsed, cf: String(parsed.cf).toUpperCase() });
          }
        } catch {
          // ignore
        }
      }
      let cert = localStorage.getItem("attestato_cert_number");
      if (!cert && passed) {
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        cert = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
        localStorage.setItem("attestato_cert_number", cert);
      }
      if (cert) setCertNumber(cert);
      const iss = localStorage.getItem("attestato_issued_at");
      if (iss) setIssuedAt(iss);
    })();
  }, []);

  if (allowed === null) return null;

  if (!allowed) {
    if (noActivationFound) {
      return (
        <main className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="max-w-md text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">Attestato non trovato in questo browser</h1>
            <p className="text-muted-foreground">
              Se hai già completato il corso su un altro dispositivo o browser,
              inserisci di nuovo la tua licenza e il tuo codice PUK per recuperare
              l'attestato.
            </p>
            <Button onClick={() => navigate({ to: "/attivazione" })}>
              Recupera il tuo attestato
            </Button>
          </div>
        </main>
      );
    }
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold">Attestato non disponibile</h1>
          <p className="text-muted-foreground">
            Per ottenere l'attestato devi prima superare il test finale.
          </p>
          <Button onClick={() => navigate({ to: "/test" })}>Vai al test</Button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold">Dati anagrafici mancanti</h1>
          <p className="text-muted-foreground">
            Per generare l'attestato è necessario inserire i dati anagrafici
            nella schermata iniziale.
          </p>
          <Button onClick={() => navigate({ to: "/" })}>
            Vai alla schermata iniziale
          </Button>
        </div>
      </main>
    );
  }

  const oggi = (issuedAt ? new Date(issuedAt) : new Date()).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const cfUpper = data.cf.toUpperCase();
  const dittaUpper = data.ditta;

  return (
    <main className="min-h-screen bg-muted/30 py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap justify-between gap-3 print:hidden">
          <Button asChild variant="outline">
            <Link to="/">Torna alla dashboard</Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFlipped((f) => !f)}>
              <RotateCw className="h-4 w-4 mr-2" />
              {flipped ? "Mostra fronte" : "Mostra retro"}
            </Button>
            <Button
              onClick={() =>
                data &&
                generateAttestatoPdf({
                  nome: data.nome,
                  luogo: data.luogo,
                  dataNascita: data.dataNascita,
                  cf: data.cf,
                  ditta: data.ditta,
                  certNumber,
                  issuedAt,
                })
              }
            >
              <Download className="h-4 w-4 mr-2" />
              Scarica PDF
            </Button>
          </div>
        </div>

        {/* FRONTE */}
        <section
          className={`${flipped ? "hidden" : "block"} print:block bg-[#e9f6e9] text-slate-900 shadow-lg rounded-md aspect-[1.414/1] relative overflow-hidden border-[10px] border-double border-emerald-700 p-8 print:shadow-none print:rounded-none print:border-emerald-700`}
        >
          <div className="absolute inset-4 border border-emerald-700/40 rounded" />
          <div className="relative h-full flex flex-col items-center justify-center text-center">
            <p className="uppercase tracking-[0.3em] text-xs text-emerald-800 font-semibold">
              Corporate Boost Service
            </p>
            <h1 className="mt-3 text-3xl font-extrabold text-emerald-800 tracking-tight">
              Attestato di Partecipazione
            </h1>
            <p className="mt-1 text-sm italic text-slate-600">
              e superamento del test finale
            </p>

            <p className="mt-4 text-base text-slate-700">Si certifica che</p>
            <p className="mt-1 text-2xl font-bold uppercase">{data.nome}</p>
            <p className="mt-1 text-sm font-semibold tracking-wider text-slate-800">
              C.F. {cfUpper}
            </p>
            {(data.luogo || data.dataNascita) && (
              <p className="mt-1 text-xs text-slate-600">
                {data.luogo && <>Nato/a a {data.luogo}</>}
                {data.luogo && data.dataNascita && " — "}
                {data.dataNascita && (
                  <>
                    il{" "}
                    {new Date(data.dataNascita).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </>
                )}
              </p>
            )}

            <p className="mt-3 text-sm text-slate-700">
              ha partecipato e superato con esito positivo il corso in e-learning
            </p>
            <h2 className="mt-1 text-xl font-bold italic text-emerald-800 max-w-2xl leading-snug">
              "Il Regolamento europeo in materia di protezione dei dati personali"
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-700">
              General Data Protection Regulation (GDPR) — Regolamento UE 2016/679
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
              My Privacy corso completo — 4 h
            </p>
            {certNumber && (
              <p className="mt-2 text-xs font-bold tracking-wider text-slate-800">
                Certificato n. {certNumber}
              </p>
            )}


            <p className="mt-3 max-w-3xl text-[10.5px] italic text-slate-700 leading-snug px-4">
              La formazione è stata erogata da <strong>{dittaUpper}</strong> e
              sviluppata in coerenza con il programma generale e con le
              direttive operative, le procedure, le nomine e le informative
              emanate dal Titolare e dal Responsabile Privacy; pertanto il
              presente attestato è valido esclusivamente come supporto al
              sistema privacy adottato dalla società{" "}
              <strong>{dittaUpper}</strong>.
            </p>

            <div className="mt-4 w-full flex justify-between items-end pt-2 text-sm">
              <div className="text-left">
                <p className="text-slate-600 text-xs">Data di rilascio</p>
                <p className="font-semibold">{oggi}</p>
              </div>
              <div className="text-right relative">
                <img
                  src={timbroAsset.url}
                  alt="Timbro Corporate Boost Service"
                  className="absolute -top-16 right-2 w-28 opacity-90 -rotate-6 pointer-events-none select-none"
                />
                <p className="border-t border-slate-400 pt-1 px-6 font-semibold">
                  Corporate Boost Service
                </p>
                <p className="text-xs text-slate-500">Ente erogatore</p>
              </div>
            </div>
          </div>
        </section>

        {/* RETRO */}
        <section
          className={`${flipped ? "block" : "hidden"} print:block print:mt-0 bg-[#e9f6e9] text-slate-900 shadow-lg rounded-md aspect-[1.414/1] relative overflow-hidden border-[10px] border-double border-emerald-700 p-6 print:shadow-none print:rounded-none print:break-before-page`}
        >
          <div className="absolute inset-4 border border-emerald-700/40 rounded" />
          <div className="relative h-full flex flex-col justify-center">
            <p className="uppercase tracking-[0.3em] text-xs text-emerald-800 font-semibold text-center">
              Corporate Boost Service
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-emerald-800 text-center leading-tight">
              Argomenti del Corso – GDPR &amp; Privacy Operativa
            </h2>
            <p className="text-center text-[11px] text-slate-600 italic leading-tight">
              GDPR — My Privacy corso completo
            </p>

            <div className="mt-2 columns-2 gap-x-6 text-[8.5px] text-slate-800 leading-[1.15] [column-fill:_balance]">
              {TOPICS.map((topic) => (
                <TopicGroup
                  key={topic.title}
                  title={topic.title}
                  items={topic.items}
                />
              ))}
            </div>

            <div className="mt-3 text-[10px] text-slate-500 text-center leading-tight">
              Documento generato elettronicamente da Corporate Boost Service —{" "}
              {oggi}
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          main { padding: 0 !important; margin: 0 !important; }
          main > div { max-width: none !important; margin: 0 !important; padding: 0 !important; gap: 0 !important; }
          section {
            width: 100vw !important;
            height: 100vh !important;
            aspect-ratio: auto !important;
            border-radius: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            page-break-after: always;
            break-after: page;
          }
          section:last-of-type { page-break-after: auto; break-after: auto; }
        }
      `}</style>
    </main>
  );
}

function TopicGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col break-inside-avoid mb-1.5">
      <p className="font-bold text-emerald-800 leading-tight text-[9px]">{title}</p>
      <ul className="list-disc list-inside text-slate-700 leading-[1.15] mt-0.5 space-y-0">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

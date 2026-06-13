import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Award, Printer, RotateCw } from "lucide-react";

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
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState<Data>({
    nome: "",
    luogo: "",
    dataNascita: "",
    cf: "",
    ditta: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
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
  }, []);

  if (allowed === null) return null;

  if (!allowed) {
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
      <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.nome.trim() || !form.cf.trim() || !form.ditta.trim() || !accepted) return;
            const payload: Data = { ...form, cf: form.cf.toUpperCase() };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            setData(payload);
          }}
          className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6"
        >
          <div className="text-center space-y-2">
            <Award className="h-10 w-10 mx-auto text-primary" />
            <h1 className="text-2xl font-bold">Genera il tuo attestato</h1>
            <p className="text-sm text-muted-foreground">
              Inserisci i tuoi dati per personalizzare l'attestato.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome e cognome</Label>
            <Input
              id="nome"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Mario Rossi"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ditta">Nome della ditta</Label>
            <Input
              id="ditta"
              required
              value={form.ditta}
              onChange={(e) => setForm({ ...form, ditta: e.target.value })}
              placeholder="ACME S.r.l."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="luogo">Luogo di nascita</Label>
            <Input
              id="luogo"
              value={form.luogo}
              onChange={(e) => setForm({ ...form, luogo: e.target.value })}
              placeholder="Milano"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataNascita">Data di nascita</Label>
            <Input
              id="dataNascita"
              type="date"
              value={form.dataNascita}
              onChange={(e) => setForm({ ...form, dataNascita: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cf">Codice Fiscale</Label>
            <Input
              id="cf"
              required
              value={form.cf}
              onChange={(e) =>
                setForm({ ...form, cf: e.target.value.toUpperCase() })
              }
              placeholder="RSSMRA85T10A562S"
              style={{ textTransform: "uppercase" }}
              maxLength={16}
            />
          </div>

          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-900 flex gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              I dati inseriti sono sotto la <strong>responsabilità esclusiva
              dello scrivente</strong>. Eventuali errori di digitazione
              <strong> non potranno essere corretti</strong> una volta generato
              l'attestato. Verificare attentamente nome, codice fiscale e nome
              della ditta prima di proseguire.
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="accept"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
            />
            <Label htmlFor="accept" className="text-sm leading-snug font-normal">
              Confermo di aver verificato i dati e accetto la responsabilità di
              quanto inserito.
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={!accepted}>
            Genera attestato
          </Button>
        </form>
      </main>
    );
  }

  const oggi = new Date().toLocaleDateString("it-IT", {
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
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Stampa / PDF
            </Button>
          </div>
        </div>

        {/* FRONTE */}
        <section
          className={`${flipped ? "hidden" : "block"} print:block bg-white text-slate-900 shadow-lg rounded-md aspect-[1.414/1] relative overflow-hidden border-[10px] border-double border-emerald-700 p-8 print:shadow-none print:rounded-none print:border-emerald-700`}
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
              Guida Pratica per l'Addetto e l'Incaricato
            </p>

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
              <div className="text-right">
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
          className={`${flipped ? "block" : "hidden"} print:block print:mt-0 bg-white text-slate-900 shadow-lg rounded-md aspect-[1.414/1] relative overflow-hidden border-[10px] border-double border-emerald-700 p-6 print:shadow-none print:rounded-none print:break-before-page`}
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
              GDPR — Guida Pratica per l'Addetto e l'Incaricato
            </p>

            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-800 leading-tight">
              <TopicGroup
                title="Principi del GDPR"
                items={[
                  "Regolamento UE 2016/679",
                  "Privacy come processo continuo",
                  "Accountability e responsabilizzazione del titolare",
                ]}
              />
              <TopicGroup
                title="Programma di Adeguamento Annuale"
                items={[
                  "Revisione documentazione privacy (PIA, registro trattamenti)",
                  "Aggiornamento nomine interne ed esterne",
                  "Verifica informative e clausole contrattuali",
                  "Valutazione privacy by design & by default",
                  "DPIA e gestione data breach",
                ]}
              />
              <TopicGroup
                title="Misure di Sicurezza Tecniche e Organizzative"
                items={[
                  "Controllo accessi fisici e digitali",
                  "Password sicure: requisiti, custodia e gestione",
                  "Autenticazione a due fattori (2FA)",
                  "Gestione salvaschermo e protezione postazione",
                ]}
              />
              <TopicGroup
                title="Backup e Protezione dei Dati"
                items={[
                  "Tipologie di backup: completo, incrementale, differenziale",
                  "Backup locale e cloud",
                  "Verifica dell'esito del backup",
                  "Procedure di ripristino e continuità operativa",
                  "Buone pratiche quotidiane",
                ]}
              />
              <TopicGroup
                title="Gestione Sicura dei Documenti Cartacei"
                items={[
                  "Custodia e trasporto dei documenti",
                  "Divieti: copie non autorizzate, riciclo, distruzione impropria",
                  "Protezione da accessi non autorizzati",
                  "Comportamenti corretti in ufficio e fuori sede",
                ]}
              />
              <TopicGroup
                title="Comunicazioni e Telefonate Sicure"
                items={[
                  "Verifica dell'identità dell'interlocutore",
                  "Evitare conversazioni in luoghi pubblici",
                  "Non parlare ad alta voce in presenza di terzi",
                ]}
              />
              <TopicGroup
                title="Uso e Custodia dei Supporti Rimovibili"
                items={[
                  "Protezione da furto, calore, campi magnetici",
                  "Prevenzione accessi non autorizzati",
                  "Conservazione e trasporto sicuro",
                ]}
              />
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
    <div className="flex flex-col">
      <p className="font-bold text-emerald-800 leading-tight">{title}</p>
      <ul className="list-disc list-inside text-slate-700 leading-tight mt-0.5 space-y-0">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isLessonCompleted } from "@/components/VideoLesson";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  Lock,
  PlayCircle,
  FileText,
  ListChecks,
  Award,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Area Formazione — Corporate Boost Service" },
      {
        name: "description",
        content:
          "Dashboard del corso privacy per incaricati. Accedi ai moduli video e al test finale.",
      },
    ],
  }),
  component: HomePage,
});

const STORAGE_KEY = "attestato_data";
const PREFILL_KEY = "attestato_prefill";

type Data = {
  nome: string;
  luogo: string;
  dataNascita: string;
  cf: string;
  ditta: string;
  licenseKey: string;
  licenseId: string;
};

const emptyData: Data = {
  nome: "",
  luogo: "",
  dataNascita: "",
  cf: "",
  ditta: "",
  licenseKey: "",
  licenseId: "",
};

function HomePage() {
  const [ready, setReady] = useState(false);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.nome && parsed.cf && parsed.ditta && parsed.licenseId) {
          setHasData(true);
        }
      } catch {
        // ignore
      }
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!hasData) {
    return <OnboardingForm onDone={() => setHasData(true)} />;
  }

  return <Dashboard />;
}

function OnboardingForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState<Data>(emptyData);
  const [accepted, setAccepted] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bypassClicks, setBypassClicks] = useState(0);

  useEffect(() => {
    const prefill = localStorage.getItem(PREFILL_KEY);
    if (prefill) {
      try {
        const parsed = JSON.parse(prefill);
        if (parsed && typeof parsed === "object") {
          setForm({
            nome: parsed.nome ?? "",
            luogo: parsed.luogo ?? "",
            dataNascita: parsed.dataNascita ?? "",
            cf: (parsed.cf ?? "").toUpperCase(),
            ditta: parsed.ditta ?? "",
            licenseKey: parsed.licenseKey ?? "",
            licenseId: parsed.licenseId ?? "",
          });
          setAccepted(true);
          setPrefilled(true);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (
            !form.nome.trim() ||
            !form.cf.trim() ||
            !form.ditta.trim() ||
            !form.licenseKey.trim() ||
            !accepted
          )
            return;

          setValidating(true);
          try {
            const key = form.licenseKey.trim();
            const { data: lic, error: dbErr } = await supabase
              .from("licenses")
              .select("id, is_active, expires_at")
              .eq("license_key", key)
              .maybeSingle();

            if (dbErr) {
              setError(
                "Errore di rete durante la verifica della licenza. Riprova.",
              );
              return;
            }
            if (!lic) {
              setError("Codice licenza non trovato. Controlla e riprova.");
              return;
            }
            if (lic.is_active === false) {
              setError("Questa licenza non è attiva.");
              return;
            }
            if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
              setError("Questa licenza è scaduta.");
              return;
            }

            const payload: Data = {
              ...form,
              cf: form.cf.toUpperCase(),
              licenseKey: key,
              licenseId: lic.id,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            localStorage.removeItem(PREFILL_KEY);
            onDone();
          } finally {
            setValidating(false);
          }
        }}
        className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6"
      >
        <div className="text-center space-y-2">
          <Award className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Benvenuto nel corso Privacy</h1>
          <p className="text-sm text-muted-foreground">
            Inserisci i tuoi dati per iniziare. Verranno utilizzati per
            generare l'attestato al termine del corso.
          </p>
          {prefilled && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
              Abbiamo precompilato i campi con i dati del tuo precedente
              accesso. Verifica e conferma per procedere.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="licenseKey">Codice licenza</Label>
          <Input
            id="licenseKey"
            required
            value={form.licenseKey}
            onChange={(e) =>
              setForm({ ...form, licenseKey: e.target.value.trim() })
            }
            placeholder="Inserisci il codice licenza fornito"
            autoComplete="off"
          />
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

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={!accepted || validating}
          onClick={(e) => {
            // DEV BYPASS: 7 click consecutivi saltano la validazione licenza
            const next = bypassClicks + 1;
            setBypassClicks(next);
            if (next >= 7) {
              e.preventDefault();
              const payload: Data = {
                nome: form.nome.trim() || "DEV BYPASS",
                luogo: form.luogo,
                dataNascita: form.dataNascita,
                cf: (form.cf || "BYPASS00X00X000X").toUpperCase(),
                ditta: form.ditta.trim() || "DEV DITTA",
                licenseKey: form.licenseKey.trim() || "DEV-BYPASS",
                licenseId: "00000000-0000-0000-0000-000000000000",
              };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
              localStorage.removeItem(PREFILL_KEY);
              onDone();
            }
          }}
        >
          {validating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifica licenza…
            </>
          ) : (
            "Conferma e inizia il corso"
          )}
        </Button>
      </form>
    </main>
  );
}

function Dashboard() {
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);

  useEffect(() => {
    setC1(isLessonCompleted("lezione1"));
    setC2(isLessonCompleted("lezione2"));
  }, []);

  const allDone = c1 && c2;

  const prussian = "#003153";
  return (
    <main className="min-h-screen bg-background py-10 px-4" style={{ color: prussian }}>
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: prussian }}>
            Corso Privacy per Incaricati
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold italic" style={{ color: prussian }}>
            Guida Pratica per l'Addetto e l'Incaricato
          </h2>
          <p className="max-w-2xl mx-auto" style={{ color: prussian, opacity: 0.85 }}>
            Benvenuto nel modulo formativo. Segui i passaggi sottostanti: guarda i video
            in ordine, senza saltare, e completa il test finale per ottenere l'attestato.
          </p>
          <div className="flex justify-center pt-2">
            <Button asChild size="lg" style={{ backgroundColor: prussian, color: "#fff" }}>
              <Link to="/corso">
                {c1 || c2 ? "Continua il corso" : "Inizia il corso"}
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PlayCircle className="h-5 w-5 text-primary" />
                Modulo 1
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Guida Pratica per l'Addetto e l'Incaricato.
              </p>
              <div className="flex items-center justify-between">
                {c1 ? (
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Completato
                  </Badge>
                ) : (
                  <Badge variant="secondary">Da iniziare</Badge>
                )}
                <span className="text-xs text-muted-foreground">Video</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PlayCircle className="h-5 w-5 text-primary" />
                Modulo 2
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Privacy come processo continuo.
              </p>
              <div className="flex items-center justify-between">
                {c2 ? (
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Completato
                  </Badge>
                ) : c1 ? (
                  <Badge variant="secondary">Disponibile</Badge>
                ) : (
                  <Badge variant="outline" className="opacity-70">
                    <Lock className="h-3 w-3 mr-1" /> Bloccato
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">Video</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-primary" />
                Test finale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                3 domande a scelta multipla. Soglia 2/3.
              </p>
              <div className="flex items-center justify-between">
                {allDone ? (
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Sbloccato
                  </Badge>
                ) : (
                  <Badge variant="outline" className="opacity-70">
                    <Lock className="h-3 w-3 mr-1" /> Bloccato
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">Quiz</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-xl border bg-card p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Come usufruire del corso
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Clicca su <strong className="text-foreground">"Inizia il corso"</strong> per aprire la pagina dei video.
            </li>
            <li>
              Guarda il <strong className="text-foreground">Modulo 1</strong> dall'inizio alla fine: il sistema salva automaticamente il punto in cui ti fermi.
            </li>
            <li>
              Una volta completato il primo video, si sblocca il <strong className="text-foreground">Modulo 2</strong>.
            </li>
            <li>
              Dopo aver visto entrambi i video, il <strong className="text-foreground">Test finale</strong> si sblocca. Rispondi alle 3 domande: devi totalizzare almeno 2 risposte corrette per superarlo.
            </li>
            <li>
              Se non superi il test al primo tentativo, puoi <strong className="text-foreground">riprovare</strong> fino al raggiungimento del punteggio minimo.
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}

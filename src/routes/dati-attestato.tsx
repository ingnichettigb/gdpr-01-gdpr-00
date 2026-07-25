import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Award, AlertTriangle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dati-attestato")({
  head: () => ({
    meta: [{ title: "Dati attestato — Area Corsi" }],
  }),
  component: DatiAttestatoPage,
});

const STORAGE_KEY = "attestato_data";

type Data = {
  nome: string;
  luogo: string;
  dataNascita: string;
  cf: string;
  ditta: string;
  licenseKey: string;
  licenseId: string;
  puk: string;
};

function DatiAttestatoPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [activation, setActivation] = useState<{ licenseId: string; licenseKey: string } | null>(null);
  const [form, setForm] = useState<Data>({
    nome: "",
    luogo: "",
    dataNascita: "",
    cf: "",
    ditta: "",
    licenseKey: "",
    licenseId: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const verifiedEmail = sessionStorage.getItem("verified_email");
      if (!verifiedEmail) {
        navigate({ to: "/auth" });
        return;
      }
      let act: { licenseId: string; licenseKey: string } | null = null;
      try {
        const raw = sessionStorage.getItem("activation");
        if (raw) act = JSON.parse(raw);
      } catch {
        // ignore
      }
      if (!act?.licenseId) {
        navigate({ to: "/attivazione" });
        return;
      }
      setActivation(act);
      setForm((f) => ({ ...f, licenseKey: act!.licenseKey, licenseId: act!.licenseId }));

      // Prefill dai dati esistenti se già presenti
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            setForm({
              nome: parsed.nome ?? "",
              luogo: parsed.luogo ?? "",
              dataNascita: parsed.dataNascita ?? "",
              cf: (parsed.cf ?? "").toUpperCase(),
              ditta: parsed.ditta ?? "",
              licenseKey: act!.licenseKey,
              licenseId: act!.licenseId,
            });
          }
        } catch {
          // ignore
        }
      }
      setReady(true);
    })();
  }, [navigate]);

  if (!ready || !activation) return null;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            !form.nome.trim() ||
            !form.cf.trim() ||
            !form.ditta.trim() ||
            !accepted
          )
            return;
          setSaving(true);
          const payload: Data = {
            ...form,
            cf: form.cf.toUpperCase(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
          setSaving(false);
          navigate({ to: "/corso" });
        }}
        className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6"
      >
        <div className="text-center space-y-2">
          <Award className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Passaggio 3 di 3 — Dati attestato</h1>
          <p className="text-sm text-muted-foreground">
            Inserisci i tuoi dati. Verranno utilizzati per generare l'attestato
            al termine del corso.
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
            onChange={(e) => setForm({ ...form, cf: e.target.value.toUpperCase() })}
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
            l'attestato.
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

        <Button type="submit" className="w-full" disabled={!accepted || saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvataggio…
            </>
          ) : (
            "Conferma e vai al corso"
          )}
        </Button>
      </form>
    </main>
  );
}

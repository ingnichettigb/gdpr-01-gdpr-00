import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/corso-gia-completato")({
  head: () => ({
    meta: [
      { title: "Corso già completato — Corporate Boost Service" },
      {
        name: "description",
        content:
          "Questo codice PUK ha già generato un attestato. Acquista un nuovo corso per ottenere una nuova licenza.",
      },
    ],
  }),
  component: CorsoGiaCompletatoPage,
});

function CorsoGiaCompletatoPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="max-w-lg text-center space-y-5 rounded-xl border bg-card p-8">
        <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-600" />
        <h1 className="text-2xl font-bold">Corso già completato</h1>
        <p className="text-muted-foreground">
          Questo codice PUK ha già generato un attestato in precedenza e non
          può essere riutilizzato per accedere nuovamente al corso o al test.
        </p>
        <p className="text-sm text-muted-foreground">
          Se desideri erogare il corso a un'altra persona, puoi acquistare
          una nuova licenza (con nuovo codice PUK) al link seguente:
        </p>
        <Button asChild size="lg">
          <a
            href="https://corporateboostservice.eu/corso-gdpr-incaricati"
            target="_blank"
            rel="noopener noreferrer"
          >
            Acquista un nuovo corso
          </a>
        </Button>
      </div>
    </main>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/accesso/successo")({
  head: () => ({ meta: [{ title: "Accesso autorizzato — Area Corsi" }] }),
  component: AccessoSuccesso,
});

function AccessoSuccesso() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-center">Accesso autorizzato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            La tua licenza è stata verificata e il PUK attivato. La dashboard del corso sarà
            disponibile nella prossima fase.
          </p>
          <Button asChild className="w-full">
            <Link to="/">Torna alla home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

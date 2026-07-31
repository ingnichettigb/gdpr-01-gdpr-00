import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TermsConsent } from "@/components/terms-consent";
import { useServerFn } from "@tanstack/react-start";
import { checkTermsConsent } from "@/lib/consent.functions";

export const Route = createFileRoute("/termini")({
  component: TerminiPage,
});

type Activation = {
  licenseId: string;
  licenseKey: string;
  puk: string;
};

function TerminiPage() {
  const navigate = useNavigate();
  const checkFn = useServerFn(checkTermsConsent);
  const [activation, setActivation] = useState<Activation | null>(null);
  const [email, setEmail] = useState<string>("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      let act: Activation | null = null;
      try {
        const raw = sessionStorage.getItem("activation");
        act = raw ? JSON.parse(raw) : null;
      } catch {
        // ignore
      }
      const verified = sessionStorage.getItem("verified_email") ?? "";
      setEmail(verified);

      if (!act || !act.puk || !act.licenseId) {
        // Nessuna attivazione in sessione: si riparte da capo
        navigate({ to: "/attivazione" });
        return;
      }
      setActivation(act);

      // Se questo PUK ha gia' accettato le condizioni (versione corrente),
      // salta subito al passaggio successivo senza mostrare di nuovo il testo.
      const res = await checkFn({ data: { puk: act.puk } });
      if (res.accepted) {
        navigate({ to: "/dati-attestato" });
        return;
      }
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking || !activation) return null;

  return (
    <TermsConsent
      puk={activation.puk}
      licenseId={activation.licenseId}
      email={email}
      onAccepted={() => navigate({ to: "/dati-attestato" })}
    />
  );
}

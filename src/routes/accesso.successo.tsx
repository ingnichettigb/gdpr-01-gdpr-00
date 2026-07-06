import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/accesso/successo")({
  beforeLoad: () => {
    throw redirect({ to: "/dati-attestato" });
  },
});

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/accesso/attiva")({
  beforeLoad: () => {
    throw redirect({ to: "/attivazione" });
  },
});

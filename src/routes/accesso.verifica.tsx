import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/accesso/verifica")({
  beforeLoad: () => {
    throw redirect({ to: "/auth/verifica" });
  },
});

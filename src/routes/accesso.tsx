import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/accesso")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});

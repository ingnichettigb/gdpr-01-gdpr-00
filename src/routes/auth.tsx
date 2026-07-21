import { createFileRoute, Outlet } from "@tanstack/react-router";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Verifica email — Area Corsi" },
      {
        name: "description",
        content:
          "Passaggio 1 di 3: verifichiamo che tu sia il proprietario della casella email.",
      },
    ],
  }),
  component: AuthLayout,
});

function AuthLayout() {
  return <Outlet />;
}

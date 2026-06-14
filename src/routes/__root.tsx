import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "Lovable Generated Project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Lovable Generated Project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const handleReset = () => {
    if (typeof window === "undefined") return;
    if (!window.confirm("Sei sicuro di voler resettare il primo accesso? Verranno cancellati tutti i dati e i progressi del corso. I tuoi dati anagrafici verranno proposti di nuovo per essere confermati.")) {
      return;
    }
    // Preserve last entered user data to prefill the onboarding form
    const lastData = localStorage.getItem("attestato_data");
    // Clear all local and session storage
    localStorage.clear();
    sessionStorage.clear();
    // Clear all cookies
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=" + window.location.hostname + ";";
    }
    // Restore last data as prefill so the user can quickly confirm
    if (lastData) {
      localStorage.setItem("attestato_prefill", lastData);
    }
    // Hard reload to initial onboarding page
    window.location.href = "/";
  };

  return (
    <>
      <button
        onClick={handleReset}
        className="fixed bottom-3 left-3 z-[9999] flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive shadow-sm hover:bg-destructive/20 print:hidden"
        title="Resetta primo accesso"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset Primo Accesso
      </button>
      <Outlet />
    </>
  );
}

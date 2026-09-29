import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Public demo account (demo data only) — lets visitors try the restaurant space without signing up.
const DEMO_EMAIL = "demo.resto@garcon-test.app";
const DEMO_PASSWORD = "GarconDemo2026!";

export const Route = createFileRoute("/demo")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Démo restaurateur — Garçon" },
      { name: "description", content: "Essayez l'espace restaurateur Garçon sans inscription." },
      { property: "og:title", content: "Démo restaurateur — Garçon" },
      { property: "og:description", content: "Essayez l'espace restaurateur Garçon sans inscription." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  useEffect(() => {
    void (async () => {
      const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
      if (error) return setError(true);
      await navigate({ to: "/dashboard" });
    })();
  }, [navigate]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-wash px-4">
      <p className="text-lg font-bold text-ink">
        {error ? "La démo est indisponible pour le moment." : "Ouverture de la démo restaurateur…"}
      </p>
    </main>
  );
}

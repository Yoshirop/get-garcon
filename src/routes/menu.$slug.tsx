import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { localized, money } from "@/lib/garcon";

type MenuItem = {
  id: string;
  name: string | null;
  name_fr: string | null;
  name_he: string | null;
  description: string | null;
  description_fr: string | null;
  description_he: string | null;
  category: string | null;
  category_fr: string | null;
  category_he: string | null;
  price_cents: number;
};

type Resto = {
  id: string;
  name: string;
  slug: string;
  tagline_fr: string | null;
  tagline_he: string | null;
  tagline_en: string | null;
};

export const Route = createFileRoute("/menu/$slug")({
  staticData: { sitemap: false },
  head: ({ params }) => ({
    meta: [
      { title: `Carte — ${params.slug} — Garçon` },
      { name: "description", content: "Consultez la carte du restaurant." },
      { property: "og:title", content: `Carte — ${params.slug}` },
      { property: "og:description", content: "Consultez la carte du restaurant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicMenuPage,
});

function PublicMenuPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();

  const resto = useQuery({
    queryKey: ["public-resto", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id,name,slug,tagline_fr,tagline_he,tagline_en")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as Resto | null;
    },
  });

  const menu = useQuery({
    queryKey: ["public-menu", resto.data?.id],
    enabled: !!resto.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select(
          "id,name,name_fr,name_he,description,description_fr,description_he,category,category_fr,category_he,price_cents",
        )
        .eq("restaurant_id", resto.data!.id)
        .eq("available", true)
        .order("sort_order");
      if (error) throw error;
      return data as MenuItem[];
    },
  });

  const tagline =
    (lang === "he" ? resto.data?.tagline_he : lang === "en" ? resto.data?.tagline_en : resto.data?.tagline_fr) ??
    resto.data?.tagline_fr ??
    resto.data?.tagline_he ??
    resto.data?.tagline_en;

  const groups = new Map<string, MenuItem[]>();
  for (const item of menu.data ?? []) {
    const cat = localized(item, "category", lang) || t("menu.other");
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }

  return (
    <div className="min-h-screen bg-wash pb-16">
      <header className="sticky top-0 z-10 border-b border-line-soft bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-ink">{resto.data?.name ?? "…"}</p>
            {tagline && <p className="truncate text-xs text-muted-foreground">{tagline}</p>}
          </div>
          <LanguageSwitch />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="text-2xl font-black text-ink">{t("menu.title")}</h1>

        {resto.data === null && (
          <p className="mt-6 text-sm text-muted-foreground">{t("menu.notFound")}</p>
        )}

        {menu.data && menu.data.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">{t("menu.empty")}</p>
        )}

        <div className="mt-6 space-y-8">
          {[...groups.entries()].map(([cat, items]) => (
            <section key={cat}>
              <h2 className="eyebrow">{cat}</h2>
              <div className="mt-3 space-y-3">
                {items.map((item) => (
                  <article key={item.id} className="surface flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="font-bold text-ink">{localized(item, "name", lang)}</p>
                      {localized(item, "description", lang) && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {localized(item, "description", lang)}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-base font-black text-ink">{money(item.price_cents)}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          <Link to="/" className="underline">
            Garçon
          </Link>
        </p>
      </main>
    </div>
  );
}

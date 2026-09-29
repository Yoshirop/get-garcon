import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { GarconLogo } from "@/components/GarconLogo";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/serveurs")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Gestion des serveurs — Garçon" },
      { name: "description", content: "Créez, modifiez et supprimez les serveurs avec leur code privé et leur rôle." },
      { property: "og:title", content: "Gestion des serveurs — Garçon" },
      { property: "og:description", content: "Gestion des serveurs, codes privés et rôles par restaurant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServeursPage,
});

type Restaurant = { id: string; name: string; name_he: string | null; city: string };
type WaiterRole = "serveur" | "chef_de_rang" | "manager";
type Waiter = { id: string; name: string; access_code: string | null; role: WaiterRole; active: boolean };

const roles: WaiterRole[] = ["serveur", "chef_de_rang", "manager"];

function randomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function ServeursPage() {
  const { t, lang, dir } = useI18n();
  const qc = useQueryClient();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", role: "serveur" as WaiterRole, access_code: randomCode() });
  const [editing, setEditing] = useState<Record<string, { name: string; role: WaiterRole; access_code: string; active: boolean }>>({});

  const restaurants = useQuery({
    queryKey: ["server-page-restaurants"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("restaurants")
        .select("id,name,name_he,city")
        .eq("owner_id", auth.user.id)
        .order("created_at");
      if (error) throw error;
      return data as Restaurant[];
    },
  });

  useEffect(() => {
    const list = restaurants.data ?? [];
    if (list.length && !list.some((restaurant) => restaurant.id === restaurantId)) setRestaurantId(list[0]!.id);
  }, [restaurants.data, restaurantId]);

  const waiters = useQuery({
    queryKey: ["server-page-waiters", restaurantId],
    enabled: Boolean(restaurantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waiters")
        .select("id,name,access_code,role,active")
        .eq("restaurant_id", restaurantId as string)
        .order("created_at");
      if (error) throw error;
      return data as Waiter[];
    },
  });

  useEffect(() => {
    const next: Record<string, { name: string; role: WaiterRole; access_code: string; active: boolean }> = {};
    (waiters.data ?? []).forEach((waiter) => {
      next[waiter.id] = {
        name: waiter.name,
        role: waiter.role,
        access_code: waiter.access_code ?? "",
        active: waiter.active,
      };
    });
    setEditing(next);
  }, [waiters.data]);

  const createWaiter = useMutation({
    mutationFn: async () => {
      if (!restaurantId) return;
      const { error } = await supabase.from("waiters").insert({
        restaurant_id: restaurantId,
        name: draft.name.trim(),
        role: draft.role,
        access_code: draft.access_code.trim() || randomCode(),
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft({ name: "", role: "serveur", access_code: randomCode() });
      qc.invalidateQueries({ queryKey: ["server-page-waiters", restaurantId] });
      qc.invalidateQueries({ queryKey: ["waiters", restaurantId] });
    },
  });

  const updateWaiter = useMutation({
    mutationFn: async (waiterId: string) => {
      const row = editing[waiterId];
      if (!row) return;
      const { error } = await supabase
        .from("waiters")
        .update({ name: row.name.trim(), role: row.role, access_code: row.access_code.trim() || null, active: row.active })
        .eq("id", waiterId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["server-page-waiters", restaurantId] });
      qc.invalidateQueries({ queryKey: ["waiters", restaurantId] });
    },
  });

  const deleteWaiter = useMutation({
    mutationFn: async (waiterId: string) => {
      if (restaurantId) {
        const { error: assignError } = await supabase
          .from("restaurant_tables")
          .update({ waiter_id: null })
          .eq("restaurant_id", restaurantId)
          .eq("waiter_id", waiterId);
        if (assignError) throw assignError;
      }
      const { error } = await supabase.from("waiters").delete().eq("id", waiterId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["server-page-waiters", restaurantId] });
      qc.invalidateQueries({ queryKey: ["waiters", restaurantId] });
    },
  });

  const restaurantsList = restaurants.data ?? [];
  const current = restaurantsList.find((restaurant) => restaurant.id === restaurantId);
  const nameOf = (restaurant: Restaurant) => (lang === "he" && restaurant.name_he ? restaurant.name_he : restaurant.name);

  return (
    <main className="min-h-screen bg-wash pb-12" dir={dir}>
      <header className="border-b border-line-soft bg-card/95 backdrop-blur-xl">
        <div className="shell flex min-h-16 items-center justify-between gap-3 py-3">
          <Link to="/dashboard"><GarconLogo size={26} /></Link>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-xs font-bold text-muted-foreground underline">{t("s.backDashboard")}</Link>
            <LanguageSwitch />
          </div>
        </div>
      </header>

      <section className="shell pt-6">
        <div className="flex flex-col gap-4 border-b border-line-soft pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{t("s.manageEyebrow")}</p>
            <h1 className="mt-2 text-3xl font-black text-ink">{t("s.manageTitle")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("s.manageHint")}</p>
          </div>
          {restaurantsList.length > 0 && (
            <select value={restaurantId ?? ""} onChange={(event) => setRestaurantId(event.target.value)} className="rounded-full border border-line-soft bg-card px-4 py-2 text-sm font-bold text-ink outline-none focus:border-primary">
              {restaurantsList.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{nameOf(restaurant)}{restaurant.city ? ` · ${restaurant.city}` : ""}</option>)}
            </select>
          )}
        </div>

        {!current ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("r.none")}</p>
        ) : (
          <div className="mt-6 space-y-6">
            <form className="surface grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_180px_150px_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); if (draft.name.trim()) createWaiter.mutate(); }}>
              <Labeled label={t("s.name")}><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></Labeled>
              <Labeled label={t("s.role")}><RoleSelect value={draft.role} onChange={(role) => setDraft({ ...draft, role })} t={t} /></Labeled>
              <Labeled label={t("s.code")}><input inputMode="numeric" maxLength={8} value={draft.access_code} onChange={(event) => setDraft({ ...draft, access_code: event.target.value.replace(/\D/g, "").slice(0, 8) })} className={`${inputClass} font-black tracking-[0.25em]`} /></Labeled>
              <button type="submit" disabled={!draft.name.trim() || createWaiter.isPending} className="btn-base btn-orange text-sm disabled:opacity-50">{createWaiter.isPending ? t("s.adding") : t("s.add")}</button>
            </form>

            {(waiters.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{t("s.none")}</p> : (
              <div className="grid gap-3">
                {(waiters.data ?? []).map((waiter) => {
                  const row = editing[waiter.id] ?? { name: waiter.name, role: waiter.role, access_code: waiter.access_code ?? "", active: waiter.active };
                  return (
                    <article key={waiter.id} className="surface grid gap-3 p-4 lg:grid-cols-[minmax(0,1.3fr)_190px_170px_130px_auto] lg:items-end">
                      <Labeled label={t("s.name")}><input value={row.name} onChange={(event) => setEditing({ ...editing, [waiter.id]: { ...row, name: event.target.value } })} className={inputClass} /></Labeled>
                      <Labeled label={t("s.role")}><RoleSelect value={row.role} onChange={(role) => setEditing({ ...editing, [waiter.id]: { ...row, role } })} t={t} /></Labeled>
                      <Labeled label={t("s.code")}><input inputMode="numeric" maxLength={8} value={row.access_code} onChange={(event) => setEditing({ ...editing, [waiter.id]: { ...row, access_code: event.target.value.replace(/\D/g, "").slice(0, 8) } })} className={`${inputClass} font-black tracking-[0.25em]`} /></Labeled>
                      <label className="flex h-11 items-center gap-2 rounded-lg border border-line-soft bg-card px-3 text-sm font-bold text-ink">
                        <input type="checkbox" checked={row.active} onChange={(event) => setEditing({ ...editing, [waiter.id]: { ...row, active: event.target.checked } })} className="accent-primary" />
                        {t("s.active")}
                      </label>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button type="button" onClick={() => updateWaiter.mutate(waiter.id)} disabled={!row.name.trim() || updateWaiter.isPending} className="btn-base btn-dark text-sm disabled:opacity-50">{t("s.save")}</button>
                        <button type="button" onClick={() => deleteWaiter.mutate(waiter.id)} disabled={deleteWaiter.isPending} className="btn-base btn-ghost text-sm disabled:opacity-50">{t("s.delete")}</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

const inputClass = "h-11 w-full rounded-lg border border-line-soft bg-card px-3 text-sm font-semibold text-ink outline-none focus:border-primary";

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-bold text-ink"><span>{label}</span><div className="mt-1.5">{children}</div></label>;
}

function RoleSelect({ value, onChange, t }: { value: WaiterRole; onChange: (role: WaiterRole) => void; t: (key: string) => string }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as WaiterRole)} className={inputClass}>
      {roles.map((role) => <option key={role} value={role}>{t(`s.role.${role}`)}</option>)}
    </select>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { GarconLogo } from "@/components/GarconLogo";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useI18n } from "@/lib/i18n";
import { avgPrepMinutes, localized, money, type OrderStatus } from "@/lib/garcon";
import { useServerFn } from "@tanstack/react-start";
import { extractMenu, type AiDish } from "@/lib/menu-ai.functions";
import { generateBrand, type AiBrand } from "@/lib/brand-ai.functions";
import { syncGoogleReviews } from "@/lib/google-reviews.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Espace restaurateur — Garçon" },
      {
        name: "description",
        content:
          "Tickets de cuisine en direct, carte, QR codes et encaissements pour chacun de vos restaurants.",
      },
      { property: "og:title", content: "Espace restaurateur — Garçon" },
      {
        property: "og:description",
        content: "Tickets de cuisine en direct, carte, QR codes et encaissements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Tab = "kitchen" | "menu" | "qr" | "payments" | "staff" | "brand";

type Restaurant = {
  id: string;
  slug: string;
  name: string;
  name_he: string | null;
  city: string;
};

function slugify(v: string) {
  return (
    v
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `resto-${Date.now()}`
  );
}

function Dashboard() {
  const { t, lang, dir } = useI18n();
  const { isAdmin } = Route.useRouteContext();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("kitchen");
  const [restoId, setRestoId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", city: "" });
  const syncReviews = useServerFn(syncGoogleReviews);

  const restaurants = useQuery({
    queryKey: ["restaurants"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("restaurants")
        .select("id,slug,name,name_he,city")
        .eq("owner_id", auth.user.id)
        .order("created_at");
      if (error) throw error;
      return data as Restaurant[];
    },
  });

  useEffect(() => {
    const list = restaurants.data ?? [];
    if (list.length && !list.some((r) => r.id === restoId)) setRestoId(list[0]!.id);
  }, [restaurants.data, restoId]);

  const addResto = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("not-authenticated");
      const { data, error } = await supabase
        .from("restaurants")
        .insert({ owner_id: auth.user.id, name: form.name.trim(), city: form.city.trim(), slug: slugify(form.name) })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setForm({ name: "", city: "" });
      setShowAdd(false);
      setRestoId(id);
      qc.invalidateQueries({ queryKey: ["restaurants"] });
    },
  });

  const list = restaurants.data ?? [];
  const current = list.find((r) => r.id === restoId) ?? null;
  const nameOf = (r: Restaurant) => (lang === "he" && r.name_he ? r.name_he : r.name);

  return (
    <div className="min-h-screen bg-wash pb-28 sm:pb-16" dir={dir}>
      <header className="sticky top-0 z-30 border-b border-line-soft bg-card/90 backdrop-blur-xl">
        <div className="shell flex h-16 items-center justify-between gap-3">
          <Link to="/">
            <GarconLogo size={26} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-accent-foreground sm:inline">
              {t("d.badge")}
            </span>
            {isAdmin && <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-bold text-primary-foreground">ADMIN</span>}
            <LanguageSwitch />
            <button type="button" onClick={async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); window.location.href = "/auth"; }} className="text-xs font-bold text-muted-foreground underline">
              {t("auth.logout")}
            </button>
          </div>
        </div>

        <div className="shell flex items-center gap-2 overflow-x-auto pb-3">
          <span className="eyebrow shrink-0">{t("r.select")}</span>
          <div className="flex gap-1">
            {list.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRestoId(r.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                  r.id === restoId
                    ? "bg-ink text-primary-foreground"
                    : "border border-line-soft text-muted-foreground hover:text-ink"
                }`}
              >
                {nameOf(r)}
                {r.city ? ` · ${r.city}` : ""}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-full border border-dashed border-line-soft px-3 py-1.5 text-xs font-semibold text-primary-strong"
          >
            + {t("r.add")}
          </button>
        </div>

        {showAdd && (
          <div className="shell pb-4">
            <form
              className="surface flex flex-wrap items-end gap-3 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (form.name.trim()) addResto.mutate();
              }}
            >
              <Field placeholder={t("r.name")} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field placeholder={t("r.city")} value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <button
                type="submit"
                disabled={!form.name.trim() || addResto.isPending}
                className="btn-base btn-orange disabled:opacity-50"
              >
                {addResto.isPending ? t("r.adding") : t("r.addCta")}
              </button>
            </form>
          </div>
        )}

        <div className="shell hidden pb-3 sm:block">
          <div className="flex gap-1 overflow-x-auto rounded-full bg-wash p-1 text-sm font-semibold text-muted-foreground">
            {(["kitchen", "menu", "qr", "payments", "staff", "brand"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 ${
                  tab === k ? "bg-ink text-primary-foreground" : ""
                }`}
              >
                {t(`d.tab.${k}`)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="shell pt-6">
        {!current ? (
          <p className="text-sm text-muted-foreground">{t("r.none")}</p>
        ) : (
          <>
            <p className="mb-5 text-xs text-muted-foreground">
              {nameOf(current)} — {t("r.scope")}
            </p>
            {tab === "kitchen" && <KitchenTab restoId={current.id} />}
            {tab === "menu" && <MenuTab restoId={current.id} />}
            {tab === "qr" && <QrTab restoId={current.id} slug={current.slug} />}
            {tab === "payments" && <PaymentsTab restoId={current.id} syncReviews={syncReviews} />}
            {tab === "staff" && <StaffTab restoId={current.id} />}
            {tab === "brand" && <BrandTab restoId={current.id} />}
          </>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-card/95 backdrop-blur-xl sm:hidden">
        <div className="flex overflow-x-auto px-2 py-2">
          {(["kitchen", "menu", "qr", "payments", "staff", "brand"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`min-w-[4.5rem] flex-1 shrink-0 rounded-2xl px-2 py-2 text-[11px] font-bold ${
                tab === k ? "bg-ink text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t(`d.tab.${k}`)}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}


type OrderRow = {
  id: string;
  table_number: number;
  guest_name: string;
  item_name: string;
  quantity: number;
  unit_price_cents: number;
  status: string;
  paid: boolean;
  created_at: string;
};

const nextStatus: Record<string, OrderStatus | null> = {
  sent: "preparing",
  preparing: "ready",
  ready: "served",
  served: null,
};

function KitchenTab({ restoId }: { restoId: string }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();

  const menuNames = useQuery({
    queryKey: ["menu-names", restoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("name,name_fr,name_he")
        .eq("restaurant_id", restoId);
      if (error) throw error;
      return data as { name: string; name_fr: string | null; name_he: string | null }[];
    },
  });

  const nameOf = (itemName: string) => {
    const row = (menuNames.data ?? []).find((m) => m.name === itemName);
    return row ? localized(row, "name", lang) : itemName;
  };

  const orders = useQuery({
    queryKey: ["kitchen", restoId],
    refetchInterval: 3000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id,table_number,guest_name,item_name,quantity,unit_price_cents,status,paid,created_at")
        .eq("restaurant_id", restoId)
        .neq("status", "draft")
        .order("created_at");
      if (error) throw error;
      return data as OrderRow[];
    },
  });

  const requests = useQuery({
    queryKey: ["requests", restoId],
    refetchInterval: 4000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("id,table_number,kind,created_at")
        .eq("restaurant_id", restoId)
        .eq("resolved", false)
        .order("created_at");
      if (error) throw error;
      return data as { id: string; table_number: number; kind: string; created_at: string }[];
    },
  });

  const advance = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: OrderStatus }) => {
      const patch: { status: OrderStatus; ready_at?: string } = { status };
      if (status === "ready") patch.ready_at = new Date().toISOString();
      const { error } = await supabase.from("order_items").update(patch).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kitchen", restoId] }),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_requests").update({ resolved: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requests", restoId] }),
  });

  const active = (orders.data ?? []).filter((o) => o.status !== "served");
  const tables = [...new Set(active.map((o) => o.table_number))].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {(requests.data ?? []).length > 0 && (
        <div className="surface p-4">
          <p className="eyebrow">{t("k.requests")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(requests.data ?? []).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => resolve.mutate(r.id)}
                className="rounded-full border border-line-soft bg-card px-4 py-2 text-sm text-ink hover:bg-wash"
              >
                {t("k.table")} {r.table_number} · {r.kind === "bill" ? t("k.bill") : t("k.waiter")} ✓
              </button>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && (
        <div className="surface p-8 text-center">
          <p className="font-semibold text-ink">{t("k.empty")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("k.emptyDesc")}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tables.map((tn) => {
          const items = active.filter((o) => o.table_number === tn);
          const step = items[0]?.status ?? "sent";
          const target = nextStatus[step];
          const total = items.reduce((s, o) => s + o.unit_price_cents * o.quantity, 0);
          const targetLabel =
            target === "preparing"
              ? t("k.markPreparing")
              : target === "ready"
                ? t("k.markReady")
                : t("k.markServed");
          return (
            <div key={tn} className="surface p-5">
              <div className="flex items-center justify-between">
                <p className="font-bold text-ink">
                  {t("k.table")} {tn}
                </p>
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                  {t(`status.${step}`)}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {items.map((o) => (
                  <li key={o.id} className="flex justify-between gap-2">
                    <span>
                      {o.quantity}× {nameOf(o.item_name)} · {o.guest_name}
                    </span>
                    <span className="whitespace-nowrap text-xs">{t(`status.${o.status}`)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-bold text-ink">{money(total)}</p>
              <div className="mt-3 flex gap-2">
                {target && (
                  <button
                    type="button"
                    onClick={() => advance.mutate({ ids: items.map((o) => o.id), status: target })}
                    className="btn-base btn-dark flex-1 py-2 text-xs"
                  >
                    {targetLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => advance.mutate({ ids: items.map((o) => o.id), status: "served" })}
                  className="btn-base btn-ghost flex-1 py-2 text-xs"
                >
                  {t("k.served")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type MenuRow = {
  id: string;
  name: string;
  name_fr: string | null;
  name_he: string | null;
  description: string;
  description_fr: string | null;
  description_he: string | null;
  category: string;
  category_fr: string | null;
  category_he: string | null;
  price_cents: number;
  available: boolean;
};

function MenuTab({ restoId }: { restoId: string }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", nameHe: "", description: "", category: "Plats", price: "" });

  const menu = useQuery({
    queryKey: ["menu-admin", restoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select(
          "id,name,name_fr,name_he,description,description_fr,description_he,category,category_fr,category_he,price_cents,available",
        )
        .eq("restaurant_id", restoId)
        .order("sort_order");
      if (error) throw error;
      return data as MenuRow[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["menu-admin", restoId] });
    qc.invalidateQueries({ queryKey: ["menu", restoId] });
  };

  const addItem = useMutation({
    mutationFn: async () => {
      const cents = Math.round(parseFloat(form.price.replace(",", ".")) * 100);
      const { error } = await supabase.from("menu_items").insert({
        restaurant_id: restoId,
        name: form.name.trim(),
        name_fr: form.name.trim(),
        name_he: form.nameHe.trim() || null,
        description: form.description.trim(),
        description_fr: form.description.trim(),
        category: form.category.trim() || "Plats",
        category_fr: form.category.trim() || "Plats",
        price_cents: Number.isFinite(cents) ? cents : 0,
        sort_order: (menu.data?.length ?? 0) * 10 + 10,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ name: "", nameHe: "", description: "", category: form.category, price: "" });
      refresh();
    },
  });

  const toggle = useMutation({
    mutationFn: async (row: MenuRow) => {
      const { error } = await supabase
        .from("menu_items")
        .update({ available: !row.available })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const updatePrice = useMutation({
    mutationFn: async ({ id, cents }: { id: string; cents: number }) => {
      const { error } = await supabase.from("menu_items").update({ price_cents: cents }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  return (
    <div className="space-y-6">
      <AiMenuImport restoId={restoId} count={menu.data?.length ?? 0} onDone={refresh} />
      <form
        className="surface space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (form.name.trim() && form.price) addItem.mutate();
        }}
      >
        <p className="eyebrow">{t("m.add")}</p>
        <div className="grid gap-3 md:grid-cols-5">
          <Field placeholder={t("m.name")} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field placeholder={t("m.nameHe")} value={form.nameHe} onChange={(v) => setForm({ ...form, nameHe: v })} />
          <Field
            placeholder={t("m.desc")}
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
          />
          <Field placeholder={t("m.cat")} value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
          <Field placeholder={t("m.price")} value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
        </div>
        <button
          type="submit"
          disabled={!form.name.trim() || !form.price || addItem.isPending}
          className="btn-base btn-orange w-full disabled:opacity-50 md:w-auto"
        >
          {addItem.isPending ? t("m.adding") : t("m.addCta")}
        </button>
      </form>

      <div className="space-y-3">
        {(menu.data ?? []).map((row) => (
          <div key={row.id} className="surface flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{localized(row, "name", lang)}</p>
              <p className="text-xs text-muted-foreground">
                {localized(row, "category", lang)} ·{" "}
                {localized(row, "description", lang) || t("m.noDesc")}
              </p>
            </div>
            <input
              type="number"
              step="0.1"
              defaultValue={(row.price_cents / 100).toFixed(2)}
              onBlur={(e) => {
                const cents = Math.round(parseFloat(e.target.value) * 100);
                if (Number.isFinite(cents) && cents !== row.price_cents) updatePrice.mutate({ id: row.id, cents });
              }}
              className="w-24 rounded-full border border-line-soft bg-card px-3 py-2 text-sm text-ink outline-none focus:border-primary"
              aria-label={`${t("m.priceOf")} ${localized(row, "name", lang)}`}
            />
            <button
              type="button"
              onClick={() => toggle.mutate(row)}
              className={`btn-base py-2 text-xs ${row.available ? "btn-ghost" : "btn-dark"}`}
            >
              {row.available ? t("m.available") : t("m.hidden")}
            </button>
            <button
              type="button"
              onClick={() => remove.mutate(row.id)}
              className="rounded-full border border-line-soft px-3 py-2 text-xs text-muted-foreground hover:text-ink"
            >
              {t("m.delete")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiMenuImport({
  restoId,
  count,
  onDone,
}: {
  restoId: string;
  count: number;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const run = useServerFn(extractMenu);
  const [text, setText] = useState("");
  const [dishes, setDishes] = useState<AiDish[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const analyze = useMutation({
    mutationFn: async (payload: { imageDataUrl?: string; text?: string }) => run({ data: payload }),
    onSuccess: (res) => {
      if (res.error) {
        setErr(
          res.error === "credits" ? t("ai.errCredits") : res.error === "rate_limit" ? t("ai.errRate") : t("ai.err"),
        );
        return;
      }
      setErr(res.dishes.length ? null : t("ai.err"));
      setDishes(res.dishes);
    },
    onError: () => setErr(t("ai.err")),
  });

  const importAll = useMutation({
    mutationFn: async () => {
      const rows = dishes.map((d, i) => ({
        restaurant_id: restoId,
        name: d.name_en || d.name_fr,
        name_fr: d.name_fr,
        name_he: d.name_he || null,
        description: d.description_fr,
        description_fr: d.description_fr,
        description_he: d.description_he || null,
        category: d.category_fr,
        category_fr: d.category_fr,
        category_he: d.category_he || null,
        price_cents: d.price_cents,
        sort_order: count * 10 + (i + 1) * 10,
      }));
      const { error } = await supabase.from("menu_items").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      setDishes([]);
      setText("");
      onDone();
    },
    onError: () => setErr(t("ai.err")),
  });

  const onFile = (file: File) => {
    setErr(null);
    const reader = new FileReader();
    reader.onload = () => analyze.mutate({ imageDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div className="surface space-y-3 p-5">
      <p className="eyebrow">{t("ai.title")}</p>
      <p className="text-sm text-muted-foreground">{t("ai.hint")}</p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="btn-base btn-dark cursor-pointer text-sm">
          {t("ai.photo")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
        {analyze.isPending && <span className="text-sm text-muted-foreground">{t("ai.analyzing")}</span>}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("ai.paste")}
        rows={3}
        className="w-full rounded-2xl border border-line-soft bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary"
      />
      <button
        type="button"
        disabled={!text.trim() || analyze.isPending}
        onClick={() => {
          setErr(null);
          analyze.mutate({ text });
        }}
        className="btn-base btn-ghost text-sm disabled:opacity-50"
      >
        {analyze.isPending ? t("ai.analyzing") : t("ai.analyze")}
      </button>

      {err && <p className="text-sm text-primary">{err}</p>}

      {dishes.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-line-soft p-3">
          <p className="text-sm font-semibold text-ink">
            {dishes.length} {t("ai.found")}
          </p>
          <ul className="max-h-64 space-y-1 overflow-auto text-sm text-muted-foreground">
            {dishes.map((d, i) => (
              <li key={`${d.name_fr}-${i}`} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-ink">
                  {d.name_fr}
                  {d.name_he ? ` · ${d.name_he}` : ""}
                </span>
                <span>{money(d.price_cents)}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => importAll.mutate()}
              disabled={importAll.isPending}
              className="btn-base btn-orange text-sm disabled:opacity-50"
            >
              {importAll.isPending ? t("ai.importing") : t("ai.import")}
            </button>
            <button type="button" onClick={() => setDishes([])} className="btn-base btn-ghost text-sm">
              {t("ai.clear")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function Field({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-full border border-line-soft bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-primary"
    />
  );
}

type TableRow = { id: string; number: number; seats: number };

function QrTab({ restoId, slug }: { restoId: string; slug: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [newTable, setNewTable] = useState("");
  const [origin, setOrigin] = useState("");
  const [publicQr, setPublicQr] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    QRCode.toDataURL(`${origin}/menu/${slug}`, {
      width: 320,
      margin: 1,
      color: { dark: "#2b2b2b", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setPublicQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [origin, slug]);

  const tables = useQuery({
    queryKey: ["tables", restoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("id,number,seats")
        .eq("restaurant_id", restoId)
        .order("number");
      if (error) throw error;
      return data as TableRow[];
    },
  });

  const linkFor = (n: number) => `${origin}/t/${n}?r=${slug}`;

  useEffect(() => {
    if (!origin || !tables.data) return;
    let cancelled = false;
    Promise.all(
      tables.data.map(async (tr) => {
        const url = await QRCode.toDataURL(`${origin}/t/${tr.number}?r=${slug}`, {
          width: 320,
          margin: 1,
          color: { dark: "#2b2b2b", light: "#ffffff" },
        });
        return [tr.number, url] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setCodes(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [origin, tables.data, slug]);

  const addTable = useMutation({
    mutationFn: async () => {
      const number = parseInt(newTable, 10);
      const { error } = await supabase
        .from("restaurant_tables")
        .insert({ restaurant_id: restoId, number, seats: 4 });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTable("");
      qc.invalidateQueries({ queryKey: ["tables", restoId] });
    },
  });

  const removeTable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tables", restoId] }),
  });

  return (
    <div className="space-y-6">
      <div className="surface flex flex-wrap items-center gap-5 p-5">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{t("qr.publicTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("qr.publicHint")}</p>
          <p className="mt-2 truncate text-[11px] text-muted-foreground">{origin}/menu/{slug}</p>
          <div className="mt-3 flex gap-2">
            <a
              href={`/menu/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="btn-base btn-ghost py-2 text-xs"
            >
              {t("qr.open")}
            </a>
            <a
              href={publicQr || "#"}
              download={`${slug}-menu-qr.png`}
              className="btn-base btn-dark py-2 text-xs"
            >
              {t("qr.download")}
            </a>
          </div>
        </div>
        {publicQr ? (
          <img src={publicQr} alt={t("qr.publicTitle")} className="h-32 w-32 rounded-xl" />
        ) : (
          <div className="h-32 w-32 animate-pulse rounded-xl bg-wash" />
        )}
      </div>

      <div className="surface flex flex-wrap items-end gap-3 p-5">
        <div className="flex-1">
          <p className="eyebrow">{t("qr.add")}</p>
          <input
            value={newTable}
            onChange={(e) => setNewTable(e.target.value)}
            placeholder={t("qr.number")}
            className="mt-2 w-full rounded-full border border-line-soft bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-primary md:w-52"
          />
        </div>
        <button
          type="button"
          disabled={!newTable || addTable.isPending}
          onClick={() => addTable.mutate()}
          className="btn-base btn-orange disabled:opacity-50"
        >
          {t("qr.generate")}
        </button>
        <button type="button" onClick={() => window.print()} className="btn-base btn-ghost">
          {t("qr.printAll")}
        </button>
      </div>
      {addTable.isError && <p className="text-sm text-primary-strong">{t("qr.exists")}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(tables.data ?? []).map((tr) => (
          <div key={tr.id} className="surface p-5 text-center">
            <p className="font-bold text-ink">
              {t("k.table")} {tr.number}
            </p>
            {codes[tr.number] ? (
              <img
                src={codes[tr.number]}
                alt={`${t("qr.codeFor")} ${tr.number}`}
                className="mx-auto mt-3 h-40 w-40"
              />
            ) : (
              <div className="mx-auto mt-3 h-40 w-40 animate-pulse rounded-xl bg-wash" />
            )}
            <p className="mt-3 truncate text-[11px] text-muted-foreground">{linkFor(tr.number)}</p>
            <div className="mt-3 flex gap-2">
              <a
                href={`/t/${tr.number}?r=${slug}`}
                target="_blank"
                rel="noreferrer"
                className="btn-base btn-ghost flex-1 py-2 text-xs"
              >
                {t("qr.open")}
              </a>
              <a
                href={codes[tr.number] ?? "#"}
                download={`${slug}-table-${tr.number}-qr.png`}
                className="btn-base btn-dark flex-1 py-2 text-xs"
              >
                {t("qr.download")}
              </a>
            </div>
            <button
              type="button"
              onClick={() => removeTable.mutate(tr.id)}
              className="mt-2 text-[11px] text-muted-foreground underline"
            >
              {t("qr.remove")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

type PaymentRow = {
  id: string;
  table_number: number;
  guest_name: string;
  amount_cents: number;
  tip_cents: number;
  mode: string;
  created_at: string;
};

function PaymentsTab({ restoId, syncReviews }: { restoId: string; syncReviews: (input: { data: { restaurantId: string; placeId: string } }) => Promise<{ count: number }> }) {
  const { t } = useI18n();
  const payments = useQuery({
    queryKey: ["payments", restoId],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id,table_number,guest_name,amount_cents,tip_cents,mode,created_at")
        .eq("restaurant_id", restoId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as PaymentRow[];
    },
  });

  const rows = payments.data ?? [];
  const total = rows.reduce((s, p) => s + p.amount_cents, 0);
  const tips = rows.reduce((s, p) => s + (p.tip_cents ?? 0), 0);

  const byTable = [...new Set(rows.map((p) => p.table_number))]
    .sort((a, b) => a - b)
    .map((tn) => {
      const items = rows.filter((p) => p.table_number === tn);
      return {
        table: tn,
        total: items.reduce((s, p) => s + p.amount_cents, 0),
        tips: items.reduce((s, p) => s + (p.tip_cents ?? 0), 0),
        count: items.length,
      };
    });

  return (
    <div className="space-y-5">
      <div className="surface grid grid-cols-3 divide-x divide-line-soft p-6 text-center">
        <div>
          <p className="text-2xl font-black text-ink">{money(total)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("p.collected")}</p>
        </div>
        <div>
          <p className="text-2xl font-black text-primary">{money(tips)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("p.tips")}</p>
        </div>
        <div>
          <p className="text-2xl font-black text-ink">{rows.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("p.count")}</p>
        </div>
      </div>

      {byTable.length > 0 && (
        <div className="surface p-5">
          <p className="eyebrow">{t("p.byTable")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byTable.map((b) => (
              <div key={b.table} className="rounded-2xl border border-line-soft bg-card p-4">
                <p className="font-bold text-ink">
                  {t("k.table")} {b.table}
                </p>
                <p className="mt-1 text-lg font-black text-ink">{money(b.total)}</p>
                <p className="text-xs text-primary">
                  {money(b.tips)} {t("p.tableTips")}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {b.count} × {t("p.count")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <GoogleReviewField restoId={restoId} paidCount={rows.length} syncReviews={syncReviews} />




      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("p.empty")}</p>
      ) : (
        <div className="surface divide-y divide-line-soft">
          {rows.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-semibold text-ink">
                  {t("k.table")} {p.table_number} · {p.guest_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.mode === "table" ? t("p.modeTable") : p.mode === "split" ? t("p.modeSplit") : t("p.modeMine")} ·{" "}
                  {new Date(p.created_at).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-right">
                <span className="font-bold text-ink">{money(p.amount_cents)}</span>
                {p.tip_cents > 0 && (
                  <p className="text-xs text-primary">
                    {t("p.tips")} {money(p.tip_cents)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GoogleReviewField({ restoId, paidCount, syncReviews }: { restoId: string; paidCount: number; syncReviews: (input: { data: { restaurantId: string; placeId: string } }) => Promise<{ count: number }> }) {
  const { t } = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const current = useQuery({
    queryKey: ["resto-review", restoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("google_review_url,google_place_id")
        .eq("id", restoId)
        .maybeSingle();
      if (error) throw error;
      return { url: (data?.google_review_url as string | null) ?? "", placeId: (data?.google_place_id as string | null) ?? "" };
    },
  });

  const snapshot = useQuery({
    queryKey: ["google-review-snapshot", restoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_review_snapshots")
        .select("rating,user_rating_count,reviews,fetched_at")
        .eq("restaurant_id", restoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setUrl(null);
    setPlaceId(null);
    setSaved(false);
  }, [restoId]);

  const value = url ?? current.data?.url ?? "";
  const placeValue = placeId ?? current.data?.placeId ?? "";

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("restaurants")
        .update({ google_review_url: value.trim() || null })
        .eq("id", restoId);
      if (error) throw error;
    },
    onSuccess: () => setSaved(true),
  });

  const sync = useMutation({
    mutationFn: async () => syncReviews({ data: { restaurantId: restoId, placeId: placeValue.trim() } }),
    onSuccess: (result) => {
      setSyncMessage(`${t("r.reviewSynced")} ${result.count}`);
      setSaved(true);
      void current.refetch();
      void snapshot.refetch();
    },
    onError: (caught) => setSyncMessage(caught instanceof Error && caught.message.includes("google-not-connected") ? t("r.reviewNeedsGoogle") : t("r.reviewSyncError")),
  });

  return (
    <div className="surface space-y-3 p-5">
      <p className="eyebrow">{t("r.review")}</p>
      <p className="text-sm text-muted-foreground">{t("r.reviewHint")}</p>
      <label className="block text-xs font-bold text-ink">
        {t("r.placeId")}
        <input value={placeValue} onChange={(e) => { setPlaceId(e.target.value); setSyncMessage(""); }} maxLength={255} placeholder={t("r.placeIdPh")} className="mt-1.5 w-full rounded-lg border border-line-soft bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-primary" />
      </label>
      <button type="button" onClick={() => sync.mutate()} disabled={sync.isPending || placeValue.trim().length < 10} className="btn-base btn-orange text-sm disabled:opacity-50">
        {sync.isPending ? t("r.reviewSyncing") : t("r.reviewSync")}
      </button>
      {syncMessage && <p className="text-xs font-semibold text-muted-foreground">{syncMessage}</p>}
      {snapshot.data && (
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-line-soft bg-wash p-3 text-center">
          <div><p className="text-lg font-black text-ink">{snapshot.data.rating ?? "—"} ★</p><p className="text-[11px] text-muted-foreground">{t("r.googleRating")}</p></div>
          <div><p className="text-lg font-black text-ink">{snapshot.data.user_rating_count}</p><p className="text-[11px] text-muted-foreground">{t("r.googleCount")}</p></div>
          <div><p className="text-lg font-black text-ink">{Array.isArray(snapshot.data.reviews) ? snapshot.data.reviews.length : 0}</p><p className="text-[11px] text-muted-foreground">{t("r.googleShown")}</p></div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          value={value}
          onChange={(e) => {
            setUrl(e.target.value);
            setSaved(false);
          }}
          placeholder={t("r.reviewPh")}
          className="min-w-0 flex-1 rounded-full border border-line-soft bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="btn-base btn-dark text-sm disabled:opacity-50"
        >
          {t("r.reviewSave")}
        </button>
      </div>
      {saved && <p className="text-xs text-primary">{t("r.reviewSaved")}</p>}
      {value.trim() ? (
        <div className="flex flex-wrap items-center gap-3">
          <a href={value.trim()} target="_blank" rel="noreferrer" className="btn-base btn-orange text-sm">
            {t("p.reviewOpen")}
          </a>
          <span className="text-xs text-muted-foreground">
            {paidCount} {t("p.reviewInvites")}
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("p.reviewMissing")}</p>
      )}
    </div>
  );
}

type WaiterRole = "serveur" | "chef_de_rang" | "manager";
type WaiterRow = { id: string; name: string; active: boolean; access_code: string | null; role: WaiterRole };

function randomCode() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

function StaffTab({ restoId }: { restoId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [waiterQr, setWaiterQr] = useState<Record<string, string>>({});

  useEffect(() => setOrigin(window.location.origin), []);


  const waiters = useQuery({
    queryKey: ["waiters", restoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waiters")
        .select("id,name,active,access_code,role")
        .eq("restaurant_id", restoId)
        .order("created_at");
      if (error) throw error;
      return data as WaiterRow[];
    },
  });

  useEffect(() => {
    if (!origin || !waiters.data) return;
    let cancelled = false;
    Promise.all(
      waiters.data
        .filter((w) => w.access_code)
        .map(async (w) => {
          const url = await QRCode.toDataURL(`${origin}/serveur?w=${w.access_code}`, {
            width: 320,
            margin: 1,
            color: { dark: "#2b2b2b", light: "#ffffff" },
          });
          return [w.id, url] as const;
        }),
    ).then((entries) => {
      if (!cancelled) setWaiterQr(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [origin, waiters.data]);



  const tables = useQuery({
    queryKey: ["staff-tables", restoId],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("id,number,seats,waiter_id")
        .eq("restaurant_id", restoId)
        .order("number");
      if (error) throw error;
      return data as { id: string; number: number; seats: number; waiter_id: string | null }[];
    },
  });

  const orders = useQuery({
    queryKey: ["staff-orders", restoId],
    refetchInterval: 4000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id,table_number,status,quantity,sent_at,ready_at,created_at")
        .eq("restaurant_id", restoId)
        .neq("status", "draft");
      if (error) throw error;
      return data as {
        id: string;
        table_number: number;
        status: string;
        quantity: number;
        sent_at: string | null;
        ready_at: string | null;
        created_at: string;
      }[];
    },
  });

  const calls = useQuery({
    queryKey: ["staff-calls", restoId],
    refetchInterval: 4000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("id,table_number,kind,note,created_at")
        .eq("restaurant_id", restoId)
        .eq("resolved", false)
        .order("created_at");
      if (error) throw error;
      return data as { id: string; table_number: number; kind: string; note: string | null; created_at: string }[];

    },
  });

  const payments = useQuery({
    queryKey: ["staff-payments", restoId],
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id,table_number,amount_cents,tip_cents,created_at")
        .eq("restaurant_id", restoId);
      if (error) throw error;
      return data as { id: string; table_number: number; amount_cents: number; tip_cents: number; created_at: string }[];
    },
  });

  const addWaiter = useMutation({
    mutationFn: async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { error } = await supabase
          .from("waiters")
          .insert({ restaurant_id: restoId, name: name.trim(), access_code: randomCode() });
        if (!error) return;
        if (error.code !== "23505") throw error;
      }
      throw new Error("code-collision");
    },
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["waiters", restoId] });
    },
  });

  const removeWaiter = useMutation({
    mutationFn: async (id: string) => {
      const { error: assignError } = await supabase
        .from("restaurant_tables")
        .update({ waiter_id: null })
        .eq("restaurant_id", restoId)
        .eq("waiter_id", id);
      if (assignError) throw assignError;
      const { error } = await supabase.from("waiters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waiters", restoId] });
      qc.invalidateQueries({ queryKey: ["staff-tables", restoId] });
    },
  });

  const assign = useMutation({
    mutationFn: async ({ tableId, waiterId }: { tableId: string; waiterId: string | null }) => {
      const { error } = await supabase.from("restaurant_tables").update({ waiter_id: waiterId }).eq("id", tableId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-tables", restoId] }),
  });

  const resolveCall = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_requests").update({ resolved: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-calls", restoId] }),
  });

  const waiterList = waiters.data ?? [];
  const tableList = tables.data ?? [];

  const statsFor = (waiterId: string) => {
    const today = new Date().toLocaleDateString("en-CA");
    const isToday = (value: string | null) =>
      !!value && new Date(value).toLocaleDateString("en-CA") === today;
    const nums = tableList.filter((tr) => tr.waiter_id === waiterId).map((tr) => tr.number);
    const myCalls = (calls.data ?? []).filter((c) => nums.includes(c.table_number));
    const myOrders = (orders.data ?? []).filter((o) => nums.includes(o.table_number));
    const myPays = (payments.data ?? []).filter((p) => nums.includes(p.table_number));
    const activeOrders = myOrders.filter((o) => o.status !== "served");
    const todayOrders = myOrders.filter((o) => isToday(o.sent_at ?? o.created_at));
    const todayPays = myPays.filter((p) => isToday(p.created_at));
    const activeTables = new Set([
      ...activeOrders.map((o) => o.table_number),
      ...myCalls.map((c) => c.table_number),
    ]).size;
    const todayTips = todayPays.reduce((sum, payment) => sum + (payment.tip_cents ?? 0), 0);
    return {
      nums,
      calls: myCalls,
      received: todayOrders.length,
      sentItems: todayOrders.reduce((s, o) => s + o.quantity, 0),
      prep: avgPrepMinutes(myOrders),
      dishes: activeOrders.reduce((s, o) => s + o.quantity, 0),
      sales: myPays.reduce((s, p) => s + p.amount_cents, 0),
      tips: myPays.reduce((s, p) => s + (p.tip_cents ?? 0), 0),
      avgTip: todayPays.length ? Math.round(todayTips / todayPays.length) : 0,
      activeTables,
    };
  };

  return (
    <div className="space-y-6">
      <div className="surface space-y-3 p-5">
        <p className="eyebrow">{t("s.title")}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t("s.hint")}</p>
          <Link to="/serveurs" className="btn-base btn-dark text-sm">
            {t("s.manage")}
          </Link>
        </div>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) addWaiter.mutate();
          }}
        >
          <div className="min-w-0 flex-1 md:max-w-xs">
            <Field placeholder={t("s.name")} value={name} onChange={setName} />
          </div>
          <button
            type="submit"
            disabled={!name.trim() || addWaiter.isPending}
            className="btn-base btn-orange text-sm disabled:opacity-50"
          >
            {addWaiter.isPending ? t("s.adding") : t("s.add")}
          </button>
        </form>
      </div>

      {waiterList.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("s.none")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {waiterList.map((w) => {
            const s = statsFor(w.id);
            return (
              <div key={w.id} className="surface p-5">
                <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-black text-ink">{w.name}</p>
                      <p className="text-xs font-bold text-primary-strong">{t(`s.role.${w.role ?? "serveur"}`)}</p>
                    </div>
                  <button
                    type="button"
                    onClick={() => removeWaiter.mutate(w.id)}
                    className="text-[11px] text-muted-foreground underline"
                  >
                    {t("s.remove")}
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("s.tables")}: {s.nums.length ? s.nums.join(" · ") : t("s.noTables")}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-dashed border-line-soft p-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">{t("s.code")}</p>
                    <p className="text-lg font-black tracking-[0.3em] text-ink">{w.access_code ?? "—"}</p>
                  </div>
                  <Link to="/serveur" search={{ w: w.access_code ?? undefined }} className="text-[11px] font-semibold text-primary-strong underline">
                    {t("s.portal")}
                  </Link>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">{t("s.codeHint")}</p>
                {waiterQr[w.id] && (
                  <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line-soft bg-wash p-3">
                    <img src={waiterQr[w.id]} alt={`${t("s.qrTitle")} ${w.name}`} width={96} height={96} className="h-24 w-24 rounded-lg bg-card" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink">{t("s.qrTitle")}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{t("s.qrHint")}</p>
                      <a
                        href={waiterQr[w.id]}
                        download={`serveur-${w.name}.png`}
                        className="mt-1 inline-block text-[11px] font-semibold text-primary-strong underline"
                      >
                        {t("qr.download")}
                      </a>
                    </div>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-2xl border border-line-soft bg-wash p-3">
                    <p className="text-xl font-black text-primary">{s.activeTables}</p>
                    <p className="text-xs font-medium text-muted-foreground">{t("s.activeTables")}</p>
                  </div>
                  <div className="rounded-2xl border border-line-soft bg-wash p-3">
                    <p className="text-xl font-black text-ink">{s.dishes}</p>
                    <p className="text-xs font-medium text-muted-foreground">{t("s.orders")}</p>
                  </div>
                  <div className="rounded-2xl border border-line-soft bg-wash p-3">
                    <p className="text-xl font-black text-ink">{s.received}</p>
                    <p className="text-xs font-medium text-muted-foreground">{t("s.ordersToday")}</p>
                  </div>
                  <div className="rounded-2xl border border-line-soft bg-wash p-3">
                    <p className="text-xl font-black text-ink">{s.sentItems}</p>
                    <p className="text-xs font-medium text-muted-foreground">{t("s.itemsToday")}</p>
                  </div>
                  <div className="rounded-2xl border border-line-soft bg-wash p-3">
                    <p className="text-sm font-black text-ink">
                      {s.prep === null ? t("s.noPrep") : `${s.prep} ${t("s.min")}`}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">{t("s.avgPrep")}</p>
                  </div>
                  <div className="rounded-2xl border border-line-soft bg-wash p-3">
                    <p className="text-sm font-black text-ink">{money(s.sales)}</p>
                    <p className="text-xs font-medium text-muted-foreground">{t("s.sales")}</p>
                  </div>
                  <div className="rounded-2xl border border-line-soft bg-wash p-3">
                    <p className="text-sm font-black text-primary">{money(s.avgTip)}</p>
                    <p className="text-xs font-medium text-muted-foreground">{t("s.avgTip")}</p>
                  </div>
                  <div className="rounded-2xl border border-line-soft bg-wash p-3">
                    <p className="text-sm font-black text-primary">{money(s.tips)}</p>
                    <p className="text-xs font-medium text-muted-foreground">{t("s.tips")}</p>
                  </div>
                </div>
                {s.calls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.calls.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => resolveCall.mutate(c.id)}
                        className="rounded-full border border-line-soft bg-card px-3 py-1.5 text-xs text-ink hover:bg-wash"
                      >
                        {t("k.table")} {c.table_number} ·{" "}
                        {c.kind === "bill" ? t("k.bill") : c.kind === "message" ? `${t("k.message")}: ${c.note ?? ""}` : t("k.waiter")} ✓

                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="surface p-5">
        <p className="eyebrow">{t("s.assign")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tableList.map((tr) => (
            <div
              key={tr.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line-soft bg-card p-4"
            >
              <p className="text-sm font-bold text-ink">
                {t("k.table")} {tr.number}
              </p>
              <select
                value={tr.waiter_id ?? ""}
                onChange={(e) => assign.mutate({ tableId: tr.id, waiterId: e.target.value || null })}
                className="rounded-full border border-line-soft bg-wash px-3 py-1.5 text-xs font-semibold text-ink outline-none"
              >
                <option value="">{t("s.unassigned")}</option>
                {waiterList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type BrandRow = {
  name: string;
  city: string | null;
  tagline_fr: string | null;
  tagline_he: string | null;
  tagline_en: string | null;
  brand_primary: string | null;
  brand_ink: string | null;
  brand_wash: string | null;
  brand_vibe: string | null;
};

function BrandTab({ restoId }: { restoId: string }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const run = useServerFn(generateBrand);
  const [quiz, setQuiz] = useState({ cuisine: "", ambiance: "", audience: "", palette: "", extra: "" });
  const [brand, setBrand] = useState<AiBrand | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    setBrand(null);
    setErr(null);
    setApplied(false);
    setQuiz({ cuisine: "", ambiance: "", audience: "", palette: "", extra: "" });
  }, [restoId]);

  const current = useQuery({
    queryKey: ["brand", restoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          "name,city,tagline_fr,tagline_he,tagline_en,brand_primary,brand_ink,brand_wash,brand_vibe",
        )
        .eq("id", restoId)
        .single();
      if (error) throw error;
      return data as BrandRow;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const row = current.data;
      return await run({
        data: {
          name: row?.name ?? "",
          city: row?.city ?? "",
          cuisine: quiz.cuisine,
          ambiance: quiz.ambiance,
          audience: quiz.audience,
          palette: quiz.palette,
          extra: quiz.extra,
        },
      });
    },
    onSuccess: (res) => {
      setApplied(false);
      if (res.brand) {
        setBrand(res.brand);
        setErr(null);
      } else {
        setBrand(null);
        setErr(res.error === "credits" ? t("ai.errCredits") : res.error === "rate_limit" ? t("ai.errRate") : t("b.err"));
      }
    },
    onError: () => setErr(t("b.err")),
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!brand) return;
      const { error } = await supabase.from("restaurants").update(brand).eq("id", restoId);
      if (error) throw error;
    },
    onSuccess: () => {
      setApplied(true);
      qc.invalidateQueries({ queryKey: ["brand", restoId] });
      qc.invalidateQueries({ queryKey: ["restaurants"] });
    },
  });

  const row = current.data;
  const taglineOf = (b: { tagline_fr: string | null; tagline_he: string | null; tagline_en: string | null }) =>
    (lang === "he" ? b.tagline_he : lang === "en" ? b.tagline_en : b.tagline_fr) || b.tagline_fr || "";

  return (
    <div className="space-y-5">
      <div className="surface space-y-4 p-5">
        <div>
          <p className="eyebrow">{t("b.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("b.hint")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <BrandField label={t("b.cuisine")} ph={t("b.cuisinePh")} value={quiz.cuisine} onChange={(v) => setQuiz({ ...quiz, cuisine: v })} />
          <BrandField label={t("b.ambiance")} ph={t("b.ambiancePh")} value={quiz.ambiance} onChange={(v) => setQuiz({ ...quiz, ambiance: v })} />
          <BrandField label={t("b.audience")} ph={t("b.audiencePh")} value={quiz.audience} onChange={(v) => setQuiz({ ...quiz, audience: v })} />
          <BrandField label={t("b.palette")} ph={t("b.palettePh")} value={quiz.palette} onChange={(v) => setQuiz({ ...quiz, palette: v })} />
          <BrandField label={t("b.extra")} ph={t("b.extraPh")} value={quiz.extra} onChange={(v) => setQuiz({ ...quiz, extra: v })} />
        </div>
        <button
          type="button"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="btn-base btn-orange text-sm disabled:opacity-50"
        >
          {generate.isPending ? t("b.generating") : brand ? t("b.regenerate") : t("b.generate")}
        </button>
        {err && <p className="text-sm text-destructive">{err}</p>}
      </div>

      {brand && (
        <div className="surface space-y-4 p-5">
          <p className="eyebrow">{t("b.preview")}</p>
          <div
            className="rounded-3xl p-6"
            style={{ background: brand.brand_wash, color: brand.brand_ink }}
          >
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: brand.brand_primary }}>
              {row?.name}
            </p>
            <p className="mt-2 text-2xl font-black leading-tight">{taglineOf(brand)}</p>
            {brand.brand_vibe && <p className="mt-2 text-sm opacity-70">{brand.brand_vibe}</p>}
            <span
              className="mt-4 inline-block rounded-full px-4 py-2 text-sm font-bold text-white"
              style={{ background: brand.brand_primary }}
            >
              {t("draft.send")}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {[brand.brand_primary, brand.brand_ink, brand.brand_wash].map((c) => (
              <span key={c} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-6 w-6 rounded-full border border-line-soft" style={{ background: c }} />
                {c}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => apply.mutate()}
            disabled={apply.isPending}
            className="btn-base btn-dark text-sm disabled:opacity-50"
          >
            {apply.isPending ? t("b.applying") : t("b.apply")}
          </button>
          {applied && <p className="text-xs text-primary">{t("b.applied")}</p>}
        </div>
      )}

      {row?.brand_primary && (
        <div className="surface space-y-2 p-5">
          <p className="eyebrow">{t("b.current")}</p>
          <p className="text-sm font-semibold text-ink">{taglineOf(row)}</p>
          <div className="flex gap-2">
            {[row.brand_primary, row.brand_ink, row.brand_wash].map(
              (c) => c && <span key={c} className="h-6 w-6 rounded-full border border-line-soft" style={{ background: c }} />,
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BrandField({
  label,
  ph,
  value,
  onChange,
}: {
  label: string;
  ph: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ph}
        className="mt-1 w-full rounded-2xl border border-line-soft bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-primary"
      />
    </label>
  );
}

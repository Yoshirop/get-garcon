import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GarconLogo } from "@/components/GarconLogo";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useI18n } from "@/lib/i18n";
import {
  clearGuest,
  colorClass,
  guestColors,
  itemImage,
  loadGuest,
  localized,
  money,
  saveGuest,
  type OrderStatus,
  type StoredGuest,
} from "@/lib/garcon";

export const Route = createFileRoute("/t/$table")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>) => ({
    r: typeof search['r'] === "string" ? (search['r'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Commander à votre table — Garçon" },
      {
        name: "description",
        content: "Commandez ensemble depuis votre téléphone et payez en un geste.",
      },
      { property: "og:title", content: "Commander à votre table — Garçon" },
      {
        property: "og:description",
        content: "Commandez ensemble depuis votre téléphone et payez en un geste.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TablePage,
});

type MenuItem = {
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

type OrderItem = {
  id: string;
  guest_id: string | null;
  guest_name: string;
  item_name: string;
  unit_price_cents: number;
  quantity: number;
  status: string;
  paid: boolean;
};

type Guest = { id: string; name: string; color: string };

type Restaurant = {
  id: string;
  slug: string;
  name: string;
  name_he: string | null;
  google_review_url: string | null;
  tagline_fr: string | null;
  tagline_he: string | null;
  tagline_en: string | null;
  brand_primary: string | null;
  brand_ink: string | null;
  brand_wash: string | null;
};

type ReviewSnapshot = {
  rating: number | null;
  user_rating_count: number;
  google_maps_uri: string | null;
  reviews: Array<{ author: string; author_uri: string | null; photo_uri: string | null; rating: number; relative_time: string; text: string }>;
};

const TIP_PERCENTS = [0, 5, 10, 15] as const;

function TablePage() {
  const { table } = Route.useParams();
  const { r: slug } = Route.useSearch();
  const tableNumber = Number(table);
  const { t, lang, dir } = useI18n();
  const qc = useQueryClient();
  const [guest, setGuest] = useState<StoredGuest | null>(null);
  const [tab, setTab] = useState<"menu" | "table" | "pay">("menu");
  const [toast, setToast] = useState<string | null>(null);
  const [tipPercent, setTipPercent] = useState<number | "custom">(10);
  const [tipCustom, setTipCustom] = useState("");
  const [thanks, setThanks] = useState<{ total: number; tip: number } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [msg, setMsg] = useState("");


  const restaurant = useQuery({
    queryKey: ["restaurant", slug ?? "default"],
    queryFn: async () => {
      const base = supabase
        .from("restaurants")
        .select(
          "id,slug,name,name_he,google_review_url,tagline_fr,tagline_he,tagline_en,brand_primary,brand_ink,brand_wash",
        );
      const { data, error } = slug
        ? await base.eq("slug", slug).maybeSingle()
        : await base.order("created_at").limit(1).maybeSingle();
      if (error) throw error;
      return (data as Restaurant | null) ?? null;
    },
  });

  const resto = restaurant.data ?? null;
  const restoId = resto?.id ?? null;
  const restoName = resto ? (lang === "he" && resto.name_he ? resto.name_he : resto.name) : "";
  const tagline = resto
    ? (lang === "he" ? resto.tagline_he : lang === "en" ? resto.tagline_en : resto.tagline_fr) ??
      resto.tagline_fr ??
      ""
    : "";
  const brandStyle = {
    ...(resto?.brand_primary
      ? { "--primary": resto.brand_primary, "--primary-strong": resto.brand_primary }
      : {}),
    ...(resto?.brand_ink ? { "--ink": resto.brand_ink } : {}),
    ...(resto?.brand_wash ? { "--wash": resto.brand_wash } : {}),
  } as CSSProperties;
  const sessionKey = `${resto?.slug ?? "default"}.table${tableNumber}`;

  const reviewSnapshot = useQuery({
    queryKey: ["google-reviews", restoId],
    enabled: Boolean(restoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_review_snapshots")
        .select("rating,user_rating_count,google_maps_uri,reviews")
        .eq("restaurant_id", restoId as string)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...data, rating: data.rating === null ? null : Number(data.rating), reviews: Array.isArray(data.reviews) ? data.reviews : [] } as ReviewSnapshot;
    },
  });

  useEffect(() => {
    if (resto) setGuest(loadGuest(sessionKey));
  }, [sessionKey, resto]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const menu = useQuery({
    queryKey: ["menu", restoId],
    enabled: !!restoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select(
          "id,name,name_fr,name_he,description,description_fr,description_he,category,category_fr,category_he,price_cents,available",
        )
        .eq("restaurant_id", restoId!)
        .eq("available", true)
        .order("sort_order");
      if (error) throw error;
      return data as MenuItem[];
    },
  });

  const orders = useQuery({
    queryKey: ["orders", restoId, tableNumber],
    enabled: !!restoId,
    refetchInterval: 3000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id,guest_id,guest_name,item_name,unit_price_cents,quantity,status,paid")
        .eq("restaurant_id", restoId!)
        .eq("table_number", tableNumber)
        .order("created_at");
      if (error) throw error;
      return data as OrderItem[];
    },
  });

  const guests = useQuery({
    queryKey: ["guests", restoId, tableNumber],
    enabled: !!restoId,
    refetchInterval: 6000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("id,name,color")
        .eq("restaurant_id", restoId!)
        .eq("table_number", tableNumber)
        .order("created_at");
      if (error) throw error;
      return data as Guest[];
    },
  });

  const tableWaiter = useQuery({
    queryKey: ["table-waiter", restoId, tableNumber],
    enabled: !!restoId,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("waiter_id, waiters(id,name,role,access_code)")
        .eq("restaurant_id", restoId!)
        .eq("number", tableNumber)
        .maybeSingle();
      if (error) throw error;
      const w = (data as { waiters: { id: string; name: string; role: string; access_code: string | null } | null } | null)?.waiters;
      return w ?? null;
    },
  });


  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["orders", restoId, tableNumber] });
    qc.invalidateQueries({ queryKey: ["guests", restoId, tableNumber] });
  };

  const join = useMutation({
    mutationFn: async (name: string) => {
      const used = (guests.data ?? []).map((g) => g.color);
      const color = guestColors.find((c) => !used.includes(c.key))?.key ?? "orange";
      const { data, error } = await supabase
        .from("guests")
        .insert({ restaurant_id: restoId, table_number: tableNumber, name, color })
        .select("id,name,color")
        .single();
      if (error) throw error;
      return data as Guest;
    },
    onSuccess: (g) => {
      saveGuest(sessionKey, g);
      setGuest(g);
      invalidate();
    },
  });

  const addItem = useMutation({
    mutationFn: async (item: MenuItem) => {
      if (!guest) throw new Error("no-guest");
      const existing = (orders.data ?? []).find(
        (o) => o.guest_id === guest.id && o.item_name === item.name && o.status === "draft",
      );
      if (existing) {
        const { error } = await supabase
          .from("order_items")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("order_items").insert({
        restaurant_id: restoId,
        table_number: tableNumber,
        guest_id: guest.id,
        guest_name: guest.name,
        item_name: item.name,
        menu_item_id: item.id,
        unit_price_cents: item.price_cents,
        quantity: 1,
        status: "draft",
      });
      if (error) {
        // Stale session: the guest no longer exists in the backend -> rejoin.
        if ((error as { code?: string }).code === "23503") {
          clearGuest(sessionKey);
          setGuest(null);
          throw new Error("stale-guest");
        }
        throw error;
      }
    },
    onSuccess: (_d, item) => {
      setToast(`${localized(item, "name", lang)} · ${t("toast.added")}`);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
      invalidate();
    },
    onError: (err) => {
      if (err.message !== "stale-guest") setToast(t("toast.error"));
    },
  });

  const setQty = useMutation({
    mutationFn: async ({ id, qty }: { id: string; qty: number }) => {
      if (qty <= 0) {
        const { error } = await supabase.from("order_items").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("order_items").update({ quantity: qty }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const sendOrder = useMutation({
    mutationFn: async () => {
      if (!guest) return;
      const { error } = await supabase
        .from("order_items")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("table_number", tableNumber)
        .eq("guest_id", guest.id)
        .eq("status", "draft");
      if (error) throw error;
    },
    onSuccess: () => {
      setToast(t("toast.sent"));
      invalidate();
    },
  });

  const callWaiter = useMutation({
    mutationFn: async (kind: "waiter" | "bill") => {
      const { error } = await supabase
        .from("service_requests")
        .insert({ restaurant_id: restoId, table_number: tableNumber, kind });
      if (error) throw error;
      return kind;
    },
    onSuccess: (kind) => setToast(kind === "bill" ? t("toast.bill") : t("toast.waiter")),
  });

  const sendMessage = useMutation({
    mutationFn: async (note: string) => {
      const { error } = await supabase
        .from("service_requests")
        .insert({ restaurant_id: restoId, table_number: tableNumber, kind: "message", note });
      if (error) throw error;
    },
    onSuccess: () => {
      setMsg("");
      setToast(t("client.msgSent"));
    },
    onError: () => setToast(t("toast.error")),
  });


  const pay = useMutation({
    mutationFn: async ({
      mode,
      amount,
      tip,
      ids,
    }: {
      mode: string;
      amount: number;
      tip: number;
      ids: string[];
    }) => {
      const { error } = await supabase.from("payments").insert({
        restaurant_id: restoId,
        table_number: tableNumber,
        guest_name: guest?.name ?? "Guest",
        amount_cents: amount + tip,
        tip_cents: tip,
        method: "demo_card",
        mode,
      });
      if (error) throw error;
      if (ids.length) {
        const { error: e2 } = await supabase.from("order_items").update({ paid: true }).in("id", ids);
        if (e2) throw e2;
      }
      return { total: amount + tip, tip };
    },
    onSuccess: (res) => {
      setToast(t("toast.paid"));
      setThanks(res);
      invalidate();
    },
  });


  const nameOf = (itemName: string) => {
    const row = (menu.data ?? []).find((m) => m.name === itemName);
    return row ? localized(row, "name", lang) : itemName;
  };

  const sentItems = (orders.data ?? []).filter((o) => o.status !== "draft");
  const myDrafts = (orders.data ?? []).filter((o) => o.status === "draft" && o.guest_id === guest?.id);
  const draftTotal = myDrafts.reduce((s, o) => s + o.unit_price_cents * o.quantity, 0);
  const unpaid = sentItems.filter((o) => !o.paid);
  const myUnpaid = unpaid.filter((o) => o.guest_id === guest?.id);
  const tableTotal = unpaid.reduce((s, o) => s + o.unit_price_cents * o.quantity, 0);
  const myTotal = myUnpaid.reduce((s, o) => s + o.unit_price_cents * o.quantity, 0);
  const guestCount = Math.max(1, (guests.data ?? []).length);

  const tipFor = (base: number) => {
    if (tipPercent === "custom") {
      const cents = Math.round(parseFloat(tipCustom.replace(",", ".")) * 100);
      return Number.isFinite(cents) && cents > 0 ? cents : 0;
    }
    return Math.round((base * tipPercent) / 100);
  };

  const categories = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    (menu.data ?? []).forEach((m) => {
      const cat = localized(m, "category", lang);
      map.set(cat, [...(map.get(cat) ?? []), m]);
    });
    return [...map.entries()];
  }, [menu.data, lang]);

  if (!restaurant.isLoading && !resto) {
    return (
      <div className="grid min-h-screen place-items-center bg-wash px-5 text-center">
        <div>
          <GarconLogo />
          <p className="mt-4 text-sm text-muted-foreground">{t("r.unknown")}</p>
          <Link to="/" className="mt-4 inline-block text-xs text-muted-foreground underline">
            {t("join.back")}
          </Link>
        </div>
      </div>
    );
  }

  if (!guest) {
    return (
      <JoinScreen
        tableNumber={tableNumber}
        restoName={restoName}
        tagline={tagline}
        brandStyle={brandStyle}
        pending={join.isPending}
        onJoin={(name) => join.mutate(name)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-wash pb-32" dir={dir} style={brandStyle}>
      <header className="sticky top-0 z-30 border-b border-line-soft bg-card/95 shadow-sm backdrop-blur-xl">
        <div className="shell grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-14 min-w-14 shrink-0 place-items-center rounded-xl bg-ink px-2 text-primary-foreground shadow-sm">
              <span className="text-2xl font-black leading-none">{tableNumber}</span>
              <span className="text-[10px] font-bold uppercase leading-none">{t("join.table")}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-ink">{restoName}</p>
              {tagline && <p className="line-clamp-1 text-xs font-medium text-muted-foreground">{tagline}</p>}
              <p className="mt-1 text-xs font-semibold text-primary-strong">
                {(guests.data ?? []).length} {(guests.data ?? []).length > 1 ? t("pay.guests") : t("pay.guest")}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex -space-x-2">
              {(guests.data ?? []).map((g) => (
                <span
                  key={g.id}
                  title={g.name}
                  className={`grid h-8 w-8 place-items-center rounded-full border-2 border-card text-xs font-bold text-primary-foreground ${colorClass(g.color)}`}
                >
                  {g.name.charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
            <LanguageSwitch />
          </div>
        </div>
        <div className="shell pb-3">
          <div className="mb-3 rounded-xl border border-line-soft bg-wash p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">{t("client.waiterTitle")}</p>
                {tableWaiter.data ? (
                  <p className="truncate text-sm font-black text-ink">
                    {tableWaiter.data.name}
                    <span className="ms-2 text-xs font-bold text-primary-strong">
                      {t(`s.role.${tableWaiter.data.role ?? "serveur"}`)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground">{t("client.waiterNone")}</p>
                )}
              </div>
              {tableWaiter.data?.access_code && (
                <div className="text-end">
                  <p className="text-[11px] font-medium text-muted-foreground">{t("client.waiterCode")}</p>
                  <p className="text-sm font-black tracking-[0.3em] text-ink">{tableWaiter.data.access_code}</p>
                </div>
              )}
            </div>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (msg.trim()) sendMessage.mutate(msg.trim().slice(0, 300));
              }}
            >
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value.slice(0, 300))}
                placeholder={t("client.msgPh")}
                className="min-w-0 flex-1 rounded-full border border-line-soft bg-card px-4 py-2 text-sm text-ink outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!msg.trim() || sendMessage.isPending}
                className="btn-base btn-dark shrink-0 px-4 py-2 text-xs disabled:opacity-50"
              >
                {t("client.msgSend")}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-3 items-center rounded-xl border border-line-soft bg-wash p-1 text-sm font-bold text-muted-foreground">
            {(["menu", "table", "pay"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`min-w-0 rounded-lg px-2 py-2.5 transition-colors ${
                  tab === k ? "bg-ink text-primary-foreground" : ""
                }`}
              >
                {k === "table"
                  ? `${t("tab.table")} · ${sentItems.length + myDrafts.length}`
                  : t(`tab.${k}`)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="shell flex justify-end pt-2">
        <Link to="/auth" className="text-xs font-medium text-muted-foreground underline underline-offset-2">
          {t("r.spaceLink")}
        </Link>
      </div>

      <main className="shell pt-5">
        {tab === "menu" && (
          <div className="space-y-8">
            <div className="flex items-end justify-between gap-3 border-b border-line-soft pb-4">
              <div>
                <p className="text-2xl font-black text-ink">{t("client.menuTitle")}</p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{t("client.menuHint")}</p>
              </div>
              {myDrafts.length > 0 && (
                <button type="button" onClick={() => setTab("table")} className="shrink-0 text-sm font-bold text-primary-strong underline">
                  {myDrafts.reduce((sum, order) => sum + order.quantity, 0)} · {money(draftTotal)}
                </button>
              )}
            </div>
            {menu.isLoading && <p className="text-sm text-muted-foreground">{t("menu.loading")}</p>}
            {categories.map(([cat, items]) => (
              <section key={cat}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-ink">{cat}</h2>
                  <span className="text-xs font-semibold text-muted-foreground">{items.length}</span>
                </div>
                <div className="mt-3 space-y-3">
                  {items.map((it) => {
                    const img = itemImage(it.name);
                    const label = localized(it, "name", lang);
                    return (
                      <div key={it.id} className="surface grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3">
                        {img && (
                          <img
                            src={img}
                            alt={label}
                            width={816}
                            height={816}
                            loading="lazy"
                            className="h-20 w-20 shrink-0 rounded-lg object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-bold text-ink">{label}</p>
                          <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {localized(it, "description", lang)}
                          </p>
                          <p className="mt-2 text-base font-black text-ink">{money(it.price_cents)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addItem.mutate(it)}
                          disabled={addItem.isPending}
                          className="btn-base btn-orange h-12 w-12 shrink-0 p-0 text-2xl shadow-sm"
                          aria-label={`${t("menu.add")} ${label}`}
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
            {reviewSnapshot.data && <GoogleReviews snapshot={reviewSnapshot.data} />}
          </div>
        )}

        {tab === "table" && (
          <div className="space-y-3">
            {sentItems.length === 0 && myDrafts.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("table.empty")}</p>
            )}
            {[...myDrafts, ...sentItems].map((o) => (
              <div key={o.id} className="surface flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {o.quantity}× {nameOf(o.item_name)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {o.guest_id === guest.id ? t("table.you") : o.guest_name} ·{" "}
                    <span className={o.status === "draft" ? "text-primary-strong" : ""}>
                      {t(`status.${o.status as OrderStatus}`)}
                    </span>
                    {o.paid && ` · ${t("table.paid")}`}
                  </p>
                </div>
                {o.status === "draft" && o.guest_id === guest.id && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={t("table.minus")}
                      onClick={() => setQty.mutate({ id: o.id, qty: o.quantity - 1 })}
                      className="grid h-8 w-8 place-items-center rounded-full border border-line-soft text-ink"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      aria-label={t("table.plus")}
                      onClick={() => setQty.mutate({ id: o.id, qty: o.quantity + 1 })}
                      className="grid h-8 w-8 place-items-center rounded-full border border-line-soft text-ink"
                    >
                      +
                    </button>
                  </div>
                )}
                <span className="text-sm font-bold text-ink">
                  {money(o.unit_price_cents * o.quantity)}
                </span>
              </div>
            ))}

            {myDrafts.length > 0 && (
              <button
                type="button"
                onClick={() => sendOrder.mutate()}
                disabled={sendOrder.isPending}
                className="btn-base btn-orange mt-4 w-full disabled:opacity-50"
              >
                {sendOrder.isPending ? t("draft.sending") : `${t("client.kitchen")} · ${money(draftTotal)}`}
              </button>
            )}

            <div className="flex gap-2 pt-4">

              <button
                type="button"
                onClick={() => callWaiter.mutate("waiter")}
                className="btn-base btn-ghost flex-1 py-3 text-sm"
              >
                {t("table.callWaiter")}
              </button>
              <button
                type="button"
                onClick={() => callWaiter.mutate("bill")}
                className="btn-base btn-ghost flex-1 py-3 text-sm"
              >
                {t("table.askBill")}
              </button>
            </div>
          </div>
        )}

        {tab === "pay" && (
          <div className="space-y-4">
            <div className="surface p-5">
              <p className="text-sm text-muted-foreground">{t("pay.total")}</p>
              <p className="text-3xl font-black text-ink">{money(tableTotal)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("pay.yours")}: {money(myTotal)} · {guestCount}{" "}
                {guestCount > 1 ? t("pay.guests") : t("pay.guest")}
              </p>
            </div>

            {unpaid.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("pay.allPaid")}</p>
            ) : (
              <div className="space-y-3">
                <div className="surface space-y-3 p-5">
                  <p className="eyebrow">{t("tip.title")}</p>
                  <div className="flex flex-wrap gap-2">
                    {TIP_PERCENTS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTipPercent(p)}
                        className={`btn-base px-4 py-2 text-sm ${tipPercent === p ? "btn-orange" : "btn-ghost"}`}
                      >
                        {p === 0 ? t("tip.none") : `${p}%`}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTipPercent("custom")}
                      className={`btn-base px-4 py-2 text-sm ${tipPercent === "custom" ? "btn-orange" : "btn-ghost"}`}
                    >
                      {t("tip.custom")}
                    </button>
                  </div>
                  {tipPercent === "custom" && (
                    <input
                      value={tipCustom}
                      onChange={(e) => setTipCustom(e.target.value)}
                      inputMode="decimal"
                      placeholder={t("tip.customPh")}
                      className="w-full rounded-full border border-line-soft bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-primary"
                    />
                  )}
                </div>

                <PayButton
                  label={`${t("pay.mine")} · ${money(myTotal + tipFor(myTotal))}`}
                  disabled={myTotal === 0 || pay.isPending}
                  onClick={() =>
                    pay.mutate({
                      mode: "mine",
                      amount: myTotal,
                      tip: tipFor(myTotal),
                      ids: myUnpaid.map((o) => o.id),
                    })
                  }
                />
                <PayButton
                  label={`${t("pay.whole")} · ${money(tableTotal + tipFor(tableTotal))}`}
                  variant="dark"
                  disabled={pay.isPending}
                  onClick={() =>
                    pay.mutate({
                      mode: "table",
                      amount: tableTotal,
                      tip: tipFor(tableTotal),
                      ids: unpaid.map((o) => o.id),
                    })
                  }
                />
                <PayButton
                  label={`${t("pay.split")} · ${money(
                    Math.round(tableTotal / guestCount) + tipFor(Math.round(tableTotal / guestCount)),
                  )}`}
                  variant="ghost"
                  disabled={pay.isPending}
                  onClick={() =>
                    pay.mutate({
                      mode: "split",
                      amount: Math.round(tableTotal / guestCount),
                      tip: tipFor(Math.round(tableTotal / guestCount)),
                      ids: [],
                    })
                  }
                />
                <p className="text-center text-xs text-muted-foreground">{t("pay.demo")}</p>
              </div>
            )}
          </div>
        )}
      </main>

      {tab !== "pay" && myDrafts.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-card p-4">
          <div className="shell">
            <div className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
              <span>
                {t("draft.notSent")} · {myDrafts.length}
              </span>
              <span className="text-base font-black text-ink">{money(draftTotal)}</span>
            </div>
            <button
              type="button"
              onClick={() => sendOrder.mutate()}
              disabled={sendOrder.isPending}
              className="btn-base btn-orange mt-2 w-full"
            >
              {sendOrder.isPending ? t("draft.sending") : t("draft.send")}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
          {toast}
        </div>
      )}

      {thanks && (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/60 p-4 sm:items-center sm:justify-center">
          <div className="surface w-full max-w-sm space-y-4 p-6 text-center">
            <p className="text-2xl font-black text-ink">{t("tip.thanksTitle")}</p>
            <p className="text-3xl font-black text-primary">{money(thanks.total)}</p>
            {thanks.tip > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("tip.added")} · {money(thanks.tip)}
              </p>
            )}
            <p className="text-sm text-muted-foreground">{t("tip.thanksBody")}</p>
            {resto?.google_review_url && (
              <div className="space-y-3 border-t border-line-soft pt-4 text-start">
                <p className="text-base font-black text-ink">{t("review.formTitle")}</p>
                <div className="flex justify-center gap-1" role="radiogroup" aria-label={t("review.ratingLabel")}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button key={rating} type="button" role="radio" aria-checked={reviewRating === rating} onClick={() => setReviewRating(rating)} className={`text-3xl ${rating <= reviewRating ? "text-primary" : "text-line-soft"}`} aria-label={`${rating}/5`}>★</button>
                  ))}
                </div>
                <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value.slice(0, 1000))} maxLength={1000} rows={3} placeholder={t("review.placeholder")} className="w-full resize-none rounded-lg border border-line-soft bg-card px-4 py-3 text-sm text-ink outline-none focus:border-primary" />
                <button type="button" onClick={async () => { if (reviewText.trim()) { try { await navigator.clipboard.writeText(reviewText.trim()); } catch { /* clipboard may be unavailable */ } } window.open(resto.google_review_url ?? "", "_blank", "noopener,noreferrer"); }} className="btn-base btn-orange w-full">
                  {t("review.openGoogle")}
                </button>
                <p className="text-center text-xs text-muted-foreground">{reviewText.trim() ? t("review.copyHint") : t("review.googleHint")}</p>
              </div>
            )}
            <button type="button" onClick={() => setThanks(null)} className="btn-base btn-ghost w-full text-sm">
              {t("tip.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleReviews({ snapshot }: { snapshot: ReviewSnapshot }) {
  const { t } = useI18n();
  return (
    <section className="border-t border-line-soft pt-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t("review.google")}</p>
          <h2 className="mt-1 text-2xl font-black text-ink">{t("review.title")}</h2>
        </div>
        {snapshot.rating !== null && <div className="text-end"><p className="text-2xl font-black text-ink">{snapshot.rating.toFixed(1)} <span className="text-primary">★</span></p><p className="text-xs text-muted-foreground">{snapshot.user_rating_count} {t("review.count")}</p></div>}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {snapshot.reviews.map((review, index) => (
          <article key={`${review.author}-${index}`} className="surface p-4">
            <div className="flex items-center gap-3">
              {review.photo_uri ? <img src={review.photo_uri} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-black text-accent-foreground">{review.author.charAt(0)}</span>}
              <div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{review.author}</p><p className="text-xs text-primary">{"★".repeat(review.rating)} <span className="text-muted-foreground">· {review.relative_time}</span></p></div>
            </div>
            {review.text && <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{review.text}</p>}
          </article>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{t("review.powered")}</span>{snapshot.google_maps_uri && <a href={snapshot.google_maps_uri} target="_blank" rel="noreferrer" className="font-bold text-primary-strong underline">{t("review.all")}</a>}</div>
    </section>
  );
}

function PayButton({
  label,
  onClick,
  disabled,
  variant = "orange",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "orange" | "dark" | "ghost";
}) {
  const cls = variant === "dark" ? "btn-dark" : variant === "ghost" ? "btn-ghost" : "btn-orange";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`btn-base ${cls} w-full disabled:opacity-50`}>
      {label}
    </button>
  );
}

function JoinScreen({
  tableNumber,
  restoName,
  tagline,
  brandStyle,
  onJoin,
  pending,
}: {
  tableNumber: number;
  restoName: string;
  tagline?: string;
  brandStyle?: CSSProperties;
  onJoin: (name: string) => void;
  pending: boolean;
}) {
  const { t, dir } = useI18n();
  const [name, setName] = useState("");
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-wash px-5 py-8"
      dir={dir}
      style={brandStyle}
    >
      <GarconLogo />
      <div className="surface mt-6 w-full max-w-sm p-7 text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-xl bg-ink text-primary-foreground shadow-sm">
          <span className="text-4xl font-black leading-none">{tableNumber}</span>
          <span className="text-xs font-bold uppercase leading-none">{t("join.table")}</span>
        </div>
        <h1 className="mt-2 text-2xl font-black text-ink">
          {t("join.welcome")} {restoName}
        </h1>
        {tagline && <p className="mt-1 text-sm font-semibold text-primary-strong">{tagline}</p>}
        <p className="mt-2 text-sm text-muted-foreground">{t("join.hint")}</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onJoin(name.trim());
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("join.placeholder")}
            autoFocus
            autoComplete="given-name"
            spellCheck={false}
            className="w-full rounded-full border border-line-soft bg-card px-5 py-3 text-center text-base text-ink outline-none focus:border-primary"
          />
          <button type="submit" disabled={!name.trim() || pending} className="btn-base btn-orange w-full disabled:opacity-50">
            {pending ? t("join.pending") : t("join.cta")}
          </button>
        </form>
        <div className="mt-5 flex justify-center">
          <LanguageSwitch />
        </div>
      </div>
      <div className="mt-6 flex items-center gap-4 text-sm font-medium text-muted-foreground underline underline-offset-2">
        <Link to="/">{t("join.back")}</Link>
        <span aria-hidden>·</span>
        <Link to="/auth">{t("r.spaceLink")}</Link>
      </div>
    </div>
  );
}

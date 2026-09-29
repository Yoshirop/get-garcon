import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GarconLogo } from "@/components/GarconLogo";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useI18n } from "@/lib/i18n";
import { avgPrepMinutes, localized, money } from "@/lib/garcon";

export const Route = createFileRoute("/serveur")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search['w'];
    return {
      w: typeof raw === "string" || typeof raw === "number" ? String(raw) : undefined,
    };
  },

  head: () => ({
    meta: [
      { title: "Espace serveur — Garçon" },
      {
        name: "description",
        content: "Chaque serveur suit ses tables, ses appels, ses commandes et ses pourboires avec son code privé.",
      },
      { property: "og:title", content: "Espace serveur — Garçon" },
      {
        property: "og:description",
        content: "Mes tables, mes appels, mes commandes et mes pourboires, accès par code privé.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WaiterSpace,
});

const CODE_KEY = "garcon.waiter.code";

type Waiter = { id: string; name: string; restaurant_id: string | null; access_code: string | null };

function WaiterSpace() {
  const { t, dir } = useI18n();
  const { w: codeFromQr } = Route.useSearch();
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const scanned = codeFromQr?.replace(/\D/g, "").slice(0, 8);
    if (scanned) {
      setCode(scanned);
      try {
        window.localStorage.setItem(CODE_KEY, scanned);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const stored = window.localStorage.getItem(CODE_KEY);
      if (stored) setCode(stored);
    } catch {
      /* ignore */
    }
  }, [codeFromQr]);


  const waiter = useQuery({
    queryKey: ["waiter-by-code", code],
    enabled: !!code,
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("waiters")
        .select("id,name,restaurant_id,access_code")
        .eq("access_code", code!)
        .maybeSingle();
      if (err) throw err;
      return (data as Waiter | null) ?? null;
    },
  });

  useEffect(() => {
    if (code && waiter.isFetched && !waiter.data) {
      setError(true);
      setCode(null);
      try {
        window.localStorage.removeItem(CODE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [code, waiter.isFetched, waiter.data]);

  const signIn = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setError(false);
    setCode(clean);
    try {
      window.localStorage.setItem(CODE_KEY, clean);
    } catch {
      /* ignore */
    }
  };

  const signOut = () => {
    setCode(null);
    setInput("");
    try {
      window.localStorage.removeItem(CODE_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-wash pb-16" dir={dir}>
      <header className="sticky top-0 z-30 border-b border-line-soft bg-card/90 backdrop-blur-xl">
        <div className="shell flex h-16 items-center justify-between gap-3">
          <Link to="/">
            <GarconLogo size={26} />
          </Link>
          <div className="flex items-center gap-3">
            {waiter.data && (
              <button type="button" onClick={signOut} className="text-xs font-semibold text-muted-foreground underline">
                {t("w.logout")}
              </button>
            )}
            <LanguageSwitch />
          </div>
        </div>
      </header>

      <main className="shell pt-8">
        {!waiter.data ? (
          <form
            className="surface mx-auto max-w-sm space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              signIn(input);
            }}
          >
            <p className="text-2xl font-black text-ink">{t("w.title")}</p>
            <p className="text-sm text-muted-foreground">{t("w.hint")}</p>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder={t("w.codePh")}
              inputMode="numeric"
              className="w-full rounded-2xl border border-line-soft bg-wash px-4 py-3 text-center text-2xl font-black tracking-[0.4em] text-ink outline-none"
            />
            {error && <p className="text-sm font-semibold text-primary-strong">{t("w.bad")}</p>}
            <button type="submit" disabled={input.length < 4} className="btn-base btn-orange w-full disabled:opacity-50">
              {t("w.enter")}
            </button>
          </form>
        ) : (
          <WaiterBoard waiter={waiter.data} />
        )}
      </main>
    </div>
  );
}

type WaiterOrder = {
  id: string;
  table_number: number;
  guest_name: string;
  item_name: string;
  quantity: number;
  status: string;
  sent_at: string | null;
  ready_at: string | null;
};

function WaiterBoard({ waiter }: { waiter: Waiter }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const restoId = waiter.restaurant_id;

  const tables = useQuery({
    queryKey: ["w-tables", waiter.id],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("id,number")
        .eq("waiter_id", waiter.id)
        .order("number");
      if (error) throw error;
      return data as { id: string; number: number }[];
    },
  });

  const nums = (tables.data ?? []).map((tr) => tr.number);

  const orders = useQuery({
    queryKey: ["w-orders", waiter.id, nums.join(",")],
    enabled: !!restoId && nums.length > 0,
    refetchInterval: 4000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id,table_number,guest_name,item_name,quantity,status,sent_at,ready_at")
        .eq("restaurant_id", restoId!)
        .in("table_number", nums)
        .neq("status", "draft")
        .order("created_at");
      if (error) throw error;
      return data as WaiterOrder[];
    },
  });

  const calls = useQuery({
    queryKey: ["w-calls", waiter.id, nums.join(",")],
    enabled: !!restoId && nums.length > 0,
    refetchInterval: 4000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("id,table_number,kind,note,created_at")
        .eq("restaurant_id", restoId!)
        .in("table_number", nums)
        .eq("resolved", false)
        .order("created_at");
      if (error) throw error;
      return data as { id: string; table_number: number; kind: string; note: string | null; created_at: string }[];

    },
  });

  const payments = useQuery({
    queryKey: ["w-payments", waiter.id, nums.join(",")],
    enabled: !!restoId && nums.length > 0,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id,table_number,amount_cents,tip_cents")
        .eq("restaurant_id", restoId!)
        .in("table_number", nums);
      if (error) throw error;
      return data as { id: string; amount_cents: number; tip_cents: number }[];
    },
  });

  const menuNames = useQuery({
    queryKey: ["w-menu-names", restoId],
    enabled: !!restoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("name,name_fr,name_he")
        .eq("restaurant_id", restoId!);
      if (error) throw error;
      return data as { name: string; name_fr: string | null; name_he: string | null }[];
    },
  });

  const nameOf = (itemName: string) => {
    const row = (menuNames.data ?? []).find((m) => m.name === itemName);
    return row ? localized(row, "name", lang) : itemName;
  };

  const resolveCall = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_requests").update({ resolved: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["w-calls", waiter.id, nums.join(",")] }),
  });

  const all = orders.data ?? [];
  const active = all.filter((o) => o.status !== "served");
  const prep = avgPrepMinutes(all);
  const sales = (payments.data ?? []).reduce((s, p) => s + p.amount_cents, 0);
  const tips = (payments.data ?? []).reduce((s, p) => s + (p.tip_cents ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="surface p-5">
        <p className="eyebrow">{t("w.title")}</p>
        <p className="text-2xl font-black text-ink">{waiter.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("w.myTables")}: {nums.length ? nums.join(" · ") : t("s.noTables")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat value={String((calls.data ?? []).length)} label={t("w.myCalls")} accent />
        <Stat value={String(all.length)} label={t("s.received")} />
        <Stat value={prep === null ? t("s.noPrep") : `${prep} ${t("s.min")}`} label={t("s.avgPrep")} />
        <Stat value={money(tips)} label={t("w.tips")} accent />
      </div>

      <div className="surface p-5">
        <p className="eyebrow">{t("w.myCalls")}</p>
        {(calls.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("w.noCalls")}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {(calls.data ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => resolveCall.mutate(c.id)}
                className="rounded-full border border-line-soft bg-card px-4 py-2 text-sm text-ink hover:bg-wash"
              >
                {t("k.table")} {c.table_number} ·{" "}
                {c.kind === "bill" ? t("k.bill") : c.kind === "message" ? `${t("k.message")}: ${c.note ?? ""}` : t("k.waiter")} ✓

              </button>
            ))}
          </div>
        )}
      </div>

      <div className="surface p-5">
        <p className="eyebrow">{t("w.myOrders")}</p>
        {active.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("w.noOrders")}</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {active.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 border-b border-line-soft pb-2">
                <span className="text-ink">
                  {t("k.table")} {o.table_number} · {o.quantity}× {nameOf(o.item_name)} · {o.guest_name}
                </span>
                <span className="whitespace-nowrap text-xs text-muted-foreground">{t(`status.${o.status}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="surface p-5">
        <p className="eyebrow">{t("w.sales")}</p>
        <p className="mt-1 text-2xl font-black text-ink">{money(sales)}</p>
        <p className="text-xs text-muted-foreground">
          {t("p.tips")} {money(tips)}
        </p>
      </div>
    </div>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="surface p-4 text-center">
      <p className={`text-xl font-black ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

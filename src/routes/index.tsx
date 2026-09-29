import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GarconLogo } from "@/components/GarconLogo";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { PhoneMockup } from "@/components/PhoneMockup";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Garçon — Vos tables prennent leur commande" },
      {
        name: "description",
        content:
          "Commande et paiement par QR code pour les restaurants. Les clients scannent, commandent ensemble et paient depuis leur téléphone. Les commandes arrivent en cuisine.",
      },
      { property: "og:title", content: "Garçon — Vos tables prennent leur commande" },
      {
        property: "og:description",
        content:
          "Les clients scannent le QR code, commandent ensemble et paient en un geste. Gratuit pendant le pilote.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <Stats />
      <TwoApps />
      <HowItWorks />
      <SharedTable />
      <Features />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Header() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b border-line-soft/70 bg-card/80 backdrop-blur-xl">
      <div className="shell flex h-16 items-center justify-between gap-3">
        <a href="#top" aria-label="Garçon">
          <GarconLogo />
        </a>
        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how" className="hover:text-ink">{t("nav.how")}</a>
            <a href="#features" className="hover:text-ink">{t("nav.features")}</a>
            <a href="#pricing" className="hover:text-ink">{t("nav.pricing")}</a>
          </nav>
          <LanguageSwitch />
          <Link to="/auth" className="btn-base btn-dark px-4 py-2 text-sm">
            {t("nav.resto")}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { t } = useI18n();
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-accent blur-3xl" />
      <div className="shell relative pt-12 pb-16 text-center md:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-line-soft bg-card px-4 py-2 text-xs font-semibold text-ink shadow-sm">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">%</span>
          {t("hero.badge")}
        </span>
        <h1 className="mx-auto mt-7 max-w-3xl text-5xl leading-[1.02] font-black md:text-7xl">
          {t("hero.title1")}{" "}
          <span className="rounded-2xl bg-accent px-2 text-primary">{t("hero.title2")}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">{t("hero.sub")}</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link to="/auth" className="btn-base btn-dark w-full sm:w-auto">{t("hero.cta1")}</Link>
          <Link to="/demo" className="btn-base btn-orange w-full sm:w-auto">Démo restaurateur</Link>
          <Link to="/t/$table" params={{ table: "12" }} search={{ r: undefined }} className="btn-base btn-ghost w-full sm:w-auto">
            {t("hero.cta2")}
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t("hero.note")}</p>

        <div className="mt-12">
          <PhoneMockup eager />
        </div>
        <p className="mt-8 text-sm text-muted-foreground">{t("hero.built")}</p>
      </div>
    </section>
  );
}

function Stats() {
  const { t } = useI18n();
  const stats = [
    { v: "+22%", l: t("stats.basket") },
    { v: "15 min", l: t("stats.time") },
    { v: "0%", l: t("stats.commission") },
  ];
  return (
    <section className="shell pb-16">
      <div className="surface grid grid-cols-3 divide-x divide-line-soft p-6 text-center">
        {stats.map((s) => (
          <div key={s.l} className="px-2">
            <p className="text-2xl font-black text-ink md:text-4xl">{s.v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TwoApps() {
  const { t } = useI18n();
  return (
    <section id="apps" className="shell pb-20">
      <p className="eyebrow text-center">{t("apps.eyebrow")}</p>
      <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-black md:text-5xl">
        {t("apps.title")}
      </h2>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="surface flex flex-col p-7">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-lg text-primary-foreground">
            🍳
          </span>
          <h3 className="mt-5 text-xl font-bold text-ink">{t("apps.resto.t")}</h3>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">{t("apps.resto.d")}</p>
          <Link to="/dashboard" className="btn-base btn-dark mt-6 w-full">
            {t("apps.resto.cta")}
          </Link>
        </div>
        <div className="surface flex flex-col border-primary/40 p-7 ring-1 ring-primary/20">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-lg text-primary-foreground">
            📱
          </span>
          <h3 className="mt-5 text-xl font-bold text-ink">{t("apps.client.t")}</h3>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">{t("apps.client.d")}</p>
          <Link to="/t/$table" params={{ table: "12" }} search={{ r: undefined }} className="btn-base btn-orange mt-6 w-full">
            {t("apps.client.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { n: "1", t: t("how.s1.t"), d: t("how.s1.d") },
    { n: "2", t: t("how.s2.t"), d: t("how.s2.d") },
    { n: "3", t: t("how.s3.t"), d: t("how.s3.d") },
  ];
  return (
    <section id="how" className="bg-wash py-20">
      <div className="shell">
        <p className="eyebrow text-center">{t("how.eyebrow")}</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-black md:text-5xl">
          {t("how.title")}
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="surface p-6">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                {s.n}
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SharedTable() {
  const { t } = useI18n();
  const items = [
    [t("shared.i1.t"), t("shared.i1.d")],
    [t("shared.i2.t"), t("shared.i2.d")],
    [t("shared.i3.t"), t("shared.i3.d")],
  ];
  return (
    <section id="demo" className="shell py-20">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <p className="eyebrow">{t("shared.eyebrow")}</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">{t("shared.title")}</h2>
          <p className="mt-4 text-muted-foreground">{t("shared.sub")}</p>
          <ul className="mt-8 space-y-5">
            {items.map(([title, desc]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-ink">{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <PhoneMockup />
      </div>
    </section>
  );
}

function Features() {
  const { t } = useI18n();
  return (
    <section id="features" className="bg-wash py-20">
      <div className="shell">
        <h2 className="mx-auto max-w-2xl text-center text-3xl font-black md:text-5xl">
          {t("features.title")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">{t("features.sub")}</p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <FeatureCard title={t("f.kitchen.t")} desc={t("f.kitchen.d")}>
            <div className="space-y-3">
              {[
                {
                  k: "a",
                  title: "Table 12 #148",
                  s: t("f.kitchen.new"),
                  lines: ["2× Classic Smash · Léa", "1× Frites · Sam"],
                  cta: t("f.kitchen.start"),
                },
                {
                  k: "b",
                  title: "Table 4 #147",
                  s: t("f.kitchen.preparing"),
                  lines: ["1× Truffe & champignons", "2× Limonade"],
                  cta: t("f.kitchen.ready"),
                },
              ].map((tk) => (
                <div key={tk.k} className="rounded-2xl border border-line-soft bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-ink">{tk.title}</p>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                      {tk.s}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {tk.lines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                  <div className="btn-base btn-dark mt-3 w-full py-2 text-xs">{tk.cta}</div>
                </div>
              ))}
            </div>
          </FeatureCard>

          <FeatureCard title={t("f.pay.t")} desc={t("f.pay.d")}>
            <div className="rounded-2xl border border-line-soft bg-card p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-ink">50,70 €</p>
                <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {t("f.pay.paid")}
                </span>
              </div>
              <ul className="mt-4 space-y-2">
                {[
                  ["L", "Léa", "17,40 €", "bg-primary"],
                  ["S", "Sam", "12,68 €", "bg-sky-500"],
                  ["N", "Noa", "12,68 €", "bg-violet-500"],
                  ["Y", "Yoni", "13,94 €", "bg-emerald-600"],
                ].map(([i, n, p, c]) => (
                  <li key={n} className="flex items-center gap-3 text-sm">
                    <span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-primary-foreground ${c}`}>
                      {i}
                    </span>
                    <span className="flex-1 text-ink">{n}</span>
                    <span className="font-semibold text-ink">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FeatureCard>

          <FeatureCard title={t("f.import.t")} desc={t("f.import.d")}>
            <div className="rounded-2xl border border-line-soft bg-card p-4">
              <p className="inline-flex items-center gap-2 rounded-full bg-wash px-3 py-1 text-xs font-semibold text-muted-foreground">
                carte.pdf
              </p>
              <div className="mt-4 space-y-2">
                {[["Classic Smash", "12,90 €"], ["Frites", "4,50 €"]].map(([n, p]) => (
                  <div key={n} className="flex items-center justify-between rounded-xl bg-wash px-3 py-2 text-sm">
                    <span className="text-ink">{n}</span>
                    <span className="font-semibold text-ink">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </FeatureCard>

          <FeatureCard title={t("f.lang.t")} desc={t("f.lang.d")}>
            <div className="space-y-2">
              {[
                ["FR", "Poulet miel piquant", "Poulet frit au babeurre, miel piquant"],
                ["HE", "עוף בדבש חריף", "עוף מטוגן בחלב חמאה, דבש חריף"],
                ["EN", "Hot Honey Chicken", "Buttermilk fried chicken, hot honey"],
              ].map(([code, n, d]) => (
                <div key={code} className="flex items-start gap-3 rounded-xl border border-line-soft bg-card p-3">
                  <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                    {code}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{n}</p>
                    <p className="text-xs text-muted-foreground">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </FeatureCard>

          <div className="md:col-span-2">
            <FeatureCard title={t("f.waiter.t")} desc={t("f.waiter.d")}>
              <div className="flex flex-wrap gap-3">
                {[t("f.waiter.n1"), t("f.waiter.n2")].map((n) => (
                  <span key={n} className="rounded-full border border-line-soft bg-card px-4 py-2 text-sm text-ink">
                    {n}
                  </span>
                ))}
              </div>
            </FeatureCard>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface p-6">
      <div className="rounded-2xl bg-wash p-4">{children}</div>
      <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Pricing() {
  const { t } = useI18n();
  return (
    <section id="pricing" className="shell py-20">
      <p className="eyebrow text-center">{t("pricing.eyebrow")}</p>
      <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-black md:text-5xl">
        {t("pricing.title")}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">{t("pricing.sub")}</p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="surface border-primary/40 p-7 ring-1 ring-primary/20">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-ink">{t("pricing.free")}</p>
            <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
              {t("pricing.pilot")}
            </span>
          </div>
          <p className="mt-4 text-4xl font-black text-ink">
            0 €<span className="text-base font-semibold text-muted-foreground">{t("pricing.month")}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("pricing.freeDesc")}</p>
          <Link to="/auth" className="btn-base btn-orange mt-6 w-full">{t("pricing.joinCta")}</Link>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            {["f1", "f2", "f3", "f4", "f5", "f6", "f7"].map((k) => (
              <li key={k} className="flex gap-2">
                <span className="text-primary">✓</span>
                {t(`pricing.${k}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="surface p-7">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-ink">{t("pricing.later")}</p>
            <span className="rounded-full bg-wash px-3 py-1 text-[11px] font-bold text-muted-foreground">
              {t("pricing.laterBadge")}
            </span>
          </div>
          <p className="mt-4 text-4xl font-black text-ink">
            5%<span className="text-base font-semibold text-muted-foreground">{t("pricing.perOrder")}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("pricing.laterDesc")}</p>
          <div className="btn-base btn-ghost mt-6 w-full opacity-60">{t("pricing.notYet")}</div>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            {["l1", "l2", "l3", "l4"].map((k) => (
              <li key={k} className="flex gap-2">
                <span className="text-primary">✓</span>
                {t(`pricing.${k}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">{t("pricing.footnote")}</p>
    </section>
  );
}

function Faq() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);
  const faqs = [1, 2, 3, 4, 5].map((i) => ({ q: t(`faq.q${i}`), a: t(`faq.a${i}`) }));
  return (
    <section className="bg-wash py-20">
      <div className="shell max-w-3xl">
        <h2 className="text-center text-3xl font-black md:text-5xl">{t("faq.title")}</h2>
        <div className="mt-10 space-y-3">
          {faqs.map((f, i) => (
            <div key={f.q} className="surface overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
                aria-expanded={open === i}
              >
                <span className="font-semibold text-ink">{f.q}</span>
                <span className="text-xl leading-none text-primary">{open === i ? "−" : "+"}</span>
              </button>
              {open === i && <p className="px-5 pb-5 text-sm text-muted-foreground">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const { t } = useI18n();
  return (
    <section id="cta" className="shell py-20">
      <div className="surface bg-ink px-6 py-14 text-center">
        <h2 className="text-3xl font-black text-primary-foreground md:text-5xl">{t("cta.title")}</h2>
        <p className="mt-4 text-muted-foreground">{t("cta.sub")}</p>
        <Link to="/dashboard" className="btn-base btn-orange mt-8">{t("cta.btn")}</Link>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-line-soft py-10">
      <div className="shell flex flex-col items-center gap-4 text-center">
        <GarconLogo size={26} />
        <LanguageSwitch />
        <p className="text-xs text-muted-foreground">{t("footer.rights")}</p>
      </div>
    </footer>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { GarconLogo } from "@/components/GarconLogo";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Inscription restaurateur — Garçon" },
      { name: "description", content: "Créez votre espace restaurateur Garçon ou connectez-vous." },
      { property: "og:title", content: "Inscription restaurateur — Garçon" },
      { property: "og:description", content: "Créez votre espace restaurateur Garçon ou connectez-vous." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  restaurantName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

function slugify(value: string) {
  return `${value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 6)}`;
}

function AuthPage() {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [form, setForm] = useState({ fullName: "", restaurantName: "", email: "", password: "" });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function finishConfirmedSignup() {
      const { data } = await supabase.auth.getUser();
      const raw = window.localStorage.getItem("garcon.pendingProfile");
      if (!active || !data.user || !raw) return;
      try {
        const pending = z.object({ fullName: z.string().min(2).max(100), restaurantName: z.string().min(2).max(120) }).parse(JSON.parse(raw));
        await supabase.from("profiles").upsert({ id: data.user.id, full_name: pending.fullName, restaurant_name: pending.restaurantName });
        const { data: existing } = await supabase.from("restaurants").select("id").eq("owner_id", data.user.id).limit(1);
        if (!existing?.length) await supabase.from("restaurants").insert({ owner_id: data.user.id, name: pending.restaurantName, slug: slugify(pending.restaurantName), city: "" });
        window.localStorage.removeItem("garcon.pendingProfile");
        await navigate({ to: "/dashboard" });
      } catch {
        if (active) setError(t("auth.error"));
      }
    }
    void finishConfirmedSignup();
    return () => { active = false; };
  }, [navigate, t]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    try {
      if (mode === "login") {
        const email = z.string().trim().email().max(255).parse(form.email);
        const password = z.string().min(8).max(128).parse(form.password);
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        await navigate({ to: "/dashboard" });
        return;
      }

      const values = signupSchema.parse(form);
      const { data, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (authError) throw authError;
      if (!data.user) throw new Error("missing-user");

      if (data.session) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: values.fullName,
          restaurant_name: values.restaurantName,
        });
        if (profileError) throw profileError;
        const { error: restaurantError } = await supabase.from("restaurants").insert({
          owner_id: data.user.id,
          name: values.restaurantName,
          slug: slugify(values.restaurantName),
          city: "",
        });
        if (restaurantError) throw restaurantError;
        await navigate({ to: "/dashboard" });
      } else {
        window.localStorage.setItem("garcon.pendingProfile", JSON.stringify({
          fullName: values.fullName,
          restaurantName: values.restaurantName,
        }));
        setMessage(t("auth.checkEmail"));
      }
    } catch (caught) {
      setError(caught instanceof z.ZodError ? t("auth.invalid") : t("auth.error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-wash px-4 py-6" dir={dir}>
      <div className="mx-auto flex max-w-md items-center justify-between">
        <Link to="/"><GarconLogo /></Link>
        <LanguageSwitch />
      </div>
      <section className="surface mx-auto mt-10 max-w-md p-6 sm:p-8">
        <p className="eyebrow">{t("auth.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-black text-ink">{t(mode === "signup" ? "auth.signupTitle" : "auth.loginTitle")}</h1>
        <div className="mt-5 grid grid-cols-2 rounded-full bg-wash p-1 text-sm font-bold">
          {(["signup", "login"] as const).map((item) => (
            <button key={item} type="button" onClick={() => { setMode(item); setError(""); setMessage(""); }} className={`rounded-full px-3 py-2 ${mode === item ? "bg-ink text-primary-foreground" : "text-muted-foreground"}`}>
              {t(`auth.${item}`)}
            </button>
          ))}
        </div>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === "signup" && <>
            <AuthField label={t("auth.name")} value={form.fullName} onChange={(fullName) => setForm({ ...form, fullName })} autoComplete="name" />
            <AuthField label={t("auth.restaurant")} value={form.restaurantName} onChange={(restaurantName) => setForm({ ...form, restaurantName })} autoComplete="organization" />
          </>}
          <AuthField label={t("auth.email")} type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} autoComplete="email" />
          <AuthField label={t("auth.password")} type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          <p className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="rounded-lg bg-accent p-3 text-sm font-semibold text-accent-foreground">{message}</p>}
          <button type="submit" disabled={pending} className="btn-base btn-orange w-full disabled:opacity-50">
            {pending ? t("auth.pending") : t(mode === "signup" ? "auth.create" : "auth.connect")}
          </button>
        </form>
        <Link to="/demo" className="btn-base btn-dark mt-4 w-full">Essayer la démo sans compte</Link>
      </section>
    </main>
  );
}

function AuthField({ label, value, onChange, type = "text", autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete: string }) {
  return <label className="block text-sm font-semibold text-ink">{label}<input required type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} maxLength={type === "password" ? 128 : 255} className="mt-1.5 w-full rounded-lg border border-line-soft bg-card px-4 py-3 text-ink outline-none focus:border-primary" /></label>;
}
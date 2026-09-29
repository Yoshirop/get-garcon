import { languages, useI18n } from "@/lib/i18n";

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-line-soft bg-card p-0.5"
      role="group"
      aria-label={t("lang.label")}
    >
      {languages.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          title={l.native}
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
            lang === l.code ? "bg-ink text-primary-foreground" : "text-muted-foreground hover:text-ink"
          }`}
        >
          {compact ? l.label : l.label}
        </button>
      ))}
    </div>
  );
}

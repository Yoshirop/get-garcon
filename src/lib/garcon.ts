import burger from "@/assets/burger.jpg";
import fries from "@/assets/fries.jpg";
import milkshake from "@/assets/milkshake.jpg";
import chicken from "@/assets/chicken.jpg";

export type OrderStatus = "draft" | "sent" | "preparing" | "ready" | "served";

export const orderStatuses: OrderStatus[] = ["draft", "sent", "preparing", "ready", "served"];

/** Picks the field matching the current language, falling back to the base (English) column. */
export function localized<T extends Record<string, unknown>>(
  row: T,
  field: string,
  lang: string,
): string {
  const suffixed = lang === "fr" || lang === "he" ? row[`${field}_${lang}`] : null;
  return (typeof suffixed === "string" && suffixed.trim() ? suffixed : String(row[field] ?? "")) as string;
}

export const guestColors = [
  { key: "orange", cls: "bg-primary" },
  { key: "sky", cls: "bg-sky-500" },
  { key: "violet", cls: "bg-violet-500" },
  { key: "emerald", cls: "bg-emerald-600" },
  { key: "rose", cls: "bg-rose-500" },
  { key: "amber", cls: "bg-amber-500" },
];

export function colorClass(key: string) {
  return guestColors.find((c) => c.key === key)?.cls ?? "bg-primary";
}

/** Average minutes between "sent to kitchen" and "ready", or null when not measurable yet. */
export function avgPrepMinutes(rows: { sent_at: string | null; ready_at: string | null }[]): number | null {
  const spans = rows
    .filter((r) => r.sent_at && r.ready_at)
    .map((r) => new Date(r.ready_at!).getTime() - new Date(r.sent_at!).getTime())
    .filter((ms) => ms > 0);
  if (!spans.length) return null;
  return Math.round((spans.reduce((s, ms) => s + ms, 0) / spans.length / 60000) * 10) / 10;
}

export function money(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

const imageMap: Record<string, string> = {
  "the classic smash": burger,
  "truffle shroom": burger,
  "hot honey chicken": chicken,
  "skin-on fries": fries,
  coleslaw: fries,
  "vanilla milkshake": milkshake,
  "homemade lemonade": milkshake,
  "craft beer": milkshake,
  "chocolate cookie": burger,
};

export function itemImage(name: string): string | null {
  return imageMap[name.trim().toLowerCase()] ?? null;
}

const storageKey = (key: string) => `garcon.guest.${key}`;

export type StoredGuest = { id: string; name: string; color: string };

export function loadGuest(key: string): StoredGuest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    return raw ? (JSON.parse(raw) as StoredGuest) : null;
  } catch {
    return null;
  }
}

export function saveGuest(key: string, guest: StoredGuest) {
  window.localStorage.setItem(storageKey(key), JSON.stringify(guest));
}

export function clearGuest(key: string) {
  window.localStorage.removeItem(storageKey(key));
}

export const statusLabel: Record<OrderStatus, string> = {
  draft: "Panier",
  sent: "Envoyé",
  preparing: "En préparation",
  ready: "Prêt",
  served: "Servi",
};

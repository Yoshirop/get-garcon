import burger from "@/assets/burger.jpg";
import fries from "@/assets/fries.jpg";
import milkshake from "@/assets/milkshake.jpg";
import chicken from "@/assets/chicken.jpg";

type Item = {
  img: string;
  name: string;
  who: string;
  status: "Preparing" | "Sent" | "Not sent";
  price: string;
  dot: string;
};

const items: Item[] = [
  { img: burger, name: "2× The Classic Smash", who: "Léa", status: "Preparing", price: "€12.90", dot: "bg-primary" },
  { img: fries, name: "Skin-on fries", who: "Sam", status: "Preparing", price: "€4.50", dot: "bg-sky-500" },
  { img: milkshake, name: "Vanilla milkshake", who: "Noa", status: "Sent", price: "€6.50", dot: "bg-violet-500" },
  { img: chicken, name: "Hot Honey Chicken", who: "you", status: "Not sent", price: "€13.90", dot: "bg-emerald-500" },
];

const avatars = [
  { l: "L", c: "bg-primary" },
  { l: "S", c: "bg-sky-500" },
  { l: "N", c: "bg-violet-500" },
  { l: "Y", c: "bg-emerald-600" },
];

export function PhoneMockup({ eager = false }: { eager?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[330px] rounded-[2.75rem] bg-primary p-[3px] shadow-[0_30px_70px_-30px_oklch(0.5_0.18_40/45%)]">
      <div className="rounded-[2.6rem] bg-ink p-2">
        <div className="overflow-hidden rounded-[2.1rem] bg-wash">
          {/* status bar */}
          <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[11px] font-semibold text-ink">
            <span>9:41</span>
            <span className="h-5 w-20 rounded-full bg-ink" />
            <span className="flex items-center gap-1">
              <span className="h-2 w-4 rounded-sm bg-ink" />
              <span className="h-2 w-2 rounded-full border border-ink" />
            </span>
          </div>

          <div className="bg-card px-4 pt-3 pb-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-strong">Smash &amp; Co</p>
                <p className="text-xl font-bold text-ink">Table 12</p>
              </div>
              <div className="flex -space-x-2">
                {avatars.map((a) => (
                  <span
                    key={a.l}
                    className={`grid h-7 w-7 place-items-center rounded-full border-2 border-card text-[11px] font-bold text-primary-foreground ${a.c}`}
                  >
                    {a.l}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-full bg-wash p-1 text-xs font-semibold text-muted-foreground">
              <span className="flex-1 py-2 text-center">Menu</span>
              <span className="flex-1 rounded-full bg-ink py-2 text-center text-primary-foreground">Table · 5</span>
              <span className="flex-1 py-2 text-center">Pay</span>
            </div>
          </div>

          <div className="space-y-2 px-3 pb-3">
            {items.map((it) => (
              <div key={it.name} className="flex items-center gap-3 rounded-2xl bg-card p-2 shadow-[0_1px_2px_oklch(0.27_0.006_60/6%)]">
                <img
                  src={it.img}
                  alt={it.name}
                  width={816}
                  height={816}
                  loading={eager ? "eager" : "lazy"}
                  className="h-12 w-12 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{it.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${it.dot}`} />
                    {it.who} ·{" "}
                    <span className={it.status === "Sent" ? "text-muted-foreground" : "text-primary-strong"}>
                      {it.status}
                    </span>
                  </p>
                </div>
                <span className="text-[13px] font-bold text-ink">{it.price}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-line-soft bg-card p-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Not sent yet · 1</span>
              <span className="font-bold text-ink">€13.90</span>
            </div>
            <div className="btn-base btn-orange mt-2 w-full text-[13px]">Send my items to the kitchen</div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { createServerFn } from "@tanstack/react-start";

export type AiDish = {
  name_fr: string;
  name_he: string;
  name_en: string;
  description_fr: string;
  description_he: string;
  category_fr: string;
  category_he: string;
  price_cents: number;
};

type Input = { imageDataUrl?: string; text?: string };

const SYSTEM = `Tu es un assistant qui numérise des cartes de restaurant.
Réponds UNIQUEMENT avec du JSON valide, sans texte autour, au format:
{"dishes":[{"name_fr":"","name_he":"","name_en":"","description_fr":"","description_he":"","category_fr":"","category_he":"","price_cents":0}]}
Règles:
- price_cents = prix en centimes (12,50 € -> 1250). Si le prix est absent, mets 0.
- name_he / description_he / category_he en hébreu, name_fr en français, name_en en anglais.
- category_fr parmi: Entrées, Plats, Desserts, Boissons (choisis le plus proche).
- description courte (max 12 mots). Ignore les mentions légales et allergènes.`;

export const extractMenu = createServerFn({ method: "POST" })
  .inputValidator((data: Input) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { dishes: [] as AiDish[], error: "missing_key" };

    const userContent: unknown[] = [];
    if (data.text?.trim()) {
      userContent.push({ type: "text", text: `Voici la carte:\n${data.text.trim()}` });
    }
    if (data.imageDataUrl) {
      userContent.push({ type: "text", text: "Extrais tous les plats de cette carte." });
      userContent.push({ type: "image_url", image_url: { url: data.imageDataUrl } });
    }
    if (!userContent.length) return { dishes: [] as AiDish[], error: "empty" };

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userContent },
          ],
        }),
      });
    } catch {
      return { dishes: [] as AiDish[], error: "network" };
    }

    if (res.status === 429) return { dishes: [] as AiDish[], error: "rate_limit" };
    if (res.status === 402) return { dishes: [] as AiDish[], error: "credits" };
    if (!res.ok) {
      console.error("menu ai gateway error", res.status, await res.text());
      return { dishes: [] as AiDish[], error: "gateway" };
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return { dishes: [] as AiDish[], error: "parse" };

    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { dishes?: Partial<AiDish>[] };
      const dishes: AiDish[] = (parsed.dishes ?? [])
        .filter((d) => (d.name_fr ?? d.name_en ?? "").trim().length > 0)
        .slice(0, 60)
        .map((d) => ({
          name_fr: (d.name_fr ?? d.name_en ?? "").trim(),
          name_he: (d.name_he ?? "").trim(),
          name_en: (d.name_en ?? d.name_fr ?? "").trim(),
          description_fr: (d.description_fr ?? "").trim(),
          description_he: (d.description_he ?? "").trim(),
          category_fr: (d.category_fr ?? "Plats").trim(),
          category_he: (d.category_he ?? "עיקריות").trim(),
          price_cents: Math.max(0, Math.round(Number(d.price_cents ?? 0))),
        }));
      return { dishes, error: null as string | null };
    } catch {
      return { dishes: [] as AiDish[], error: "parse" };
    }
  });

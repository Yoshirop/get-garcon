import { createServerFn } from "@tanstack/react-start";

export type AiBrand = {
  tagline_fr: string;
  tagline_he: string;
  tagline_en: string;
  brand_primary: string;
  brand_ink: string;
  brand_wash: string;
  brand_vibe: string;
};

export type BrandQuiz = {
  name: string;
  city?: string;
  cuisine?: string;
  ambiance?: string;
  audience?: string;
  palette?: string;
  extra?: string;
};

const SYSTEM = `Tu es directeur artistique pour des restaurants.
À partir d'un court questionnaire, tu crées une identité visuelle.
Réponds UNIQUEMENT avec du JSON valide, sans texte autour, au format:
{"tagline_fr":"","tagline_he":"","tagline_en":"","brand_primary":"#RRGGBB","brand_ink":"#RRGGBB","brand_wash":"#RRGGBB","brand_vibe":""}
Règles:
- tagline = devise courte et mémorable (max 7 mots), pas de nom du restaurant obligatoire.
- tagline_he en hébreu naturel, tagline_en en anglais.
- brand_primary = couleur d'accent vive et lisible sur blanc.
- brand_ink = couleur de texte très sombre, dérivée de l'accent.
- brand_wash = fond très clair (proche du blanc) dérivé de l'accent.
- Couleurs en hexadécimal 6 chiffres uniquement.
- brand_vibe = une phrase en français décrivant l'ambiance visuelle.`;

const HEX = /^#[0-9a-fA-F]{6}$/;
const hex = (v: unknown, fallback: string) =>
  typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : fallback;

export const generateBrand = createServerFn({ method: "POST" })
  .inputValidator((data: BrandQuiz) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { brand: null as AiBrand | null, error: "missing_key" };
    if (!data.name?.trim()) return { brand: null as AiBrand | null, error: "empty" };

    const prompt = [
      `Restaurant: ${data.name.trim()}`,
      data.city ? `Ville: ${data.city}` : "",
      data.cuisine ? `Cuisine: ${data.cuisine}` : "",
      data.ambiance ? `Ambiance: ${data.ambiance}` : "",
      data.audience ? `Clientèle: ${data.audience}` : "",
      data.palette ? `Couleurs souhaitées: ${data.palette}` : "",
      data.extra ? `Précisions: ${data.extra}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: prompt },
          ],
        }),
      });
    } catch {
      return { brand: null as AiBrand | null, error: "network" };
    }

    if (res.status === 429) return { brand: null as AiBrand | null, error: "rate_limit" };
    if (res.status === 402) return { brand: null as AiBrand | null, error: "credits" };
    if (!res.ok) {
      console.error("brand ai gateway error", res.status, await res.text());
      return { brand: null as AiBrand | null, error: "gateway" };
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return { brand: null as AiBrand | null, error: "parse" };

    try {
      const p = JSON.parse(cleaned.slice(start, end + 1)) as Partial<AiBrand>;
      const brand: AiBrand = {
        tagline_fr: (p.tagline_fr ?? "").trim(),
        tagline_he: (p.tagline_he ?? "").trim(),
        tagline_en: (p.tagline_en ?? p.tagline_fr ?? "").trim(),
        brand_primary: hex(p.brand_primary, "#ff6a1a"),
        brand_ink: hex(p.brand_ink, "#1f1a16"),
        brand_wash: hex(p.brand_wash, "#fff6ef"),
        brand_vibe: (p.brand_vibe ?? "").trim(),
      };
      if (!brand.tagline_fr) return { brand: null as AiBrand | null, error: "parse" };
      return { brand, error: null as string | null };
    } catch {
      return { brand: null as AiBrand | null, error: "parse" };
    }
  });

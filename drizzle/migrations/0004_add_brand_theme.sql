ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS tagline_fr text,
  ADD COLUMN IF NOT EXISTS tagline_he text,
  ADD COLUMN IF NOT EXISTS tagline_en text,
  ADD COLUMN IF NOT EXISTS brand_primary text,
  ADD COLUMN IF NOT EXISTS brand_ink text,
  ADD COLUMN IF NOT EXISTS brand_wash text,
  ADD COLUMN IF NOT EXISTS brand_vibe text;

UPDATE public.restaurants SET
  tagline_fr = COALESCE(tagline_fr, 'Le burger qui claque, sans attendre'),
  tagline_he = COALESCE(tagline_he, 'הבורגר הטוב, בלי להמתין'),
  tagline_en = COALESCE(tagline_en, 'Great burgers, zero waiting'),
  brand_primary = COALESCE(brand_primary, '#ff6a1a'),
  brand_ink = COALESCE(brand_ink, '#1f1a16'),
  brand_wash = COALESCE(brand_wash, '#fff6ef')
WHERE slug = 'smash-co';

UPDATE public.restaurants SET
  tagline_fr = COALESCE(tagline_fr, 'La pita de Tel Aviv, fraîche et généreuse'),
  tagline_he = COALESCE(tagline_he, 'פיתה תל אביבית, טרייה ונדיבה'),
  tagline_en = COALESCE(tagline_en, 'Tel Aviv pita, fresh and generous'),
  brand_primary = COALESCE(brand_primary, '#1e9e8a'),
  brand_ink = COALESCE(brand_ink, '#13322d'),
  brand_wash = COALESCE(brand_wash, '#effaf6')
WHERE slug = 'tel-aviv-pita';
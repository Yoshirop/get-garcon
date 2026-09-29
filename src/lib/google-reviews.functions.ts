import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const syncSchema = z.object({
  restaurantId: z.string().uuid(),
  placeId: z.string().trim().min(10).max(255).regex(/^[A-Za-z0-9_-]+$/),
});

type GoogleReview = {
  name?: string;
  rating?: number;
  relativePublishTimeDescription?: string;
  text?: { text?: string; languageCode?: string };
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
};

type GooglePlace = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: GoogleReview[];
};

export const syncGoogleReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => syncSchema.parse(input))
  .handler(async ({ data, context }) => {
    const lovableKey = process.env['LOVABLE_API_KEY'];
    const mapsKey = process.env['GOOGLE_MAPS_API_KEY'];
    if (!lovableKey || !mapsKey) throw new Error("google-not-connected");

    const { data: restaurant, error: restaurantError } = await context.supabase
      .from("restaurants")
      .select("id,owner_id")
      .eq("id", data.restaurantId)
      .maybeSingle();
    if (restaurantError) throw restaurantError;
    if (!restaurant || (restaurant.owner_id && restaurant.owner_id !== context.userId)) {
      throw new Error("restaurant-forbidden");
    }

    if (!restaurant.owner_id) {
      const { error: claimError } = await context.supabase
        .from("restaurants")
        .update({ owner_id: context.userId })
        .eq("id", data.restaurantId)
        .is("owner_id", null);
      if (claimError) throw claimError;
    }

    const response = await fetch(
      `https://connector-gateway.lovable.dev/google_maps/places/v1/places/${encodeURIComponent(data.placeId)}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
          "X-Goog-FieldMask": "id,rating,userRatingCount,googleMapsUri,reviews",
          "X-Goog-Language-Code": "fr",
        },
      },
    );
    if (!response.ok) {
      const body = await response.text();
      console.error(`Google Places failed [${response.status}]: ${body}`);
      throw new Error(response.status === 403 ? "google-permission" : "google-request");
    }

    const place = (await response.json()) as GooglePlace;
    const reviews = (place.reviews ?? []).slice(0, 5).map((review) => ({
      author: review.authorAttribution?.displayName ?? "Google user",
      author_uri: review.authorAttribution?.uri ?? null,
      photo_uri: review.authorAttribution?.photoUri ?? null,
      rating: Math.max(1, Math.min(5, Math.round(review.rating ?? 0))),
      relative_time: review.relativePublishTimeDescription ?? "",
      text: review.text?.text?.slice(0, 1000) ?? "",
    }));
    const writeUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(data.placeId)}`;

    const { error: restaurantUpdateError } = await context.supabase
      .from("restaurants")
      .update({ google_place_id: data.placeId, google_review_url: writeUrl })
      .eq("id", data.restaurantId);
    if (restaurantUpdateError) throw restaurantUpdateError;

    const { error: snapshotError } = await context.supabase.from("google_review_snapshots").upsert({
      restaurant_id: data.restaurantId,
      place_id: data.placeId,
      rating: place.rating ?? null,
      user_rating_count: place.userRatingCount ?? 0,
      google_maps_uri: place.googleMapsUri ?? null,
      reviews,
      fetched_at: new Date().toISOString(),
    });
    if (snapshotError) throw snapshotError;

    return { count: reviews.length };
  });
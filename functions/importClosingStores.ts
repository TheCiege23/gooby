import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GOOGLE_MAPS_API_KEY = "AIzaSyDg7MzjazFeTvgbDwEGKzdFQgu-5iKSxOE";

// Retail store types to search for
const RETAIL_TYPES = [
  "clothing_store",
  "electronics_store",
  "furniture_store",
  "home_goods_store",
  "shoe_store",
  "jewelry_store",
  "book_store",
  "sporting_goods_store",
  "toy_store",
  "department_store",
];

// Map Google types to our categories
function mapCategory(types = []) {
  if (types.includes("clothing_store") || types.includes("shoe_store")) return "clothing";
  if (types.includes("electronics_store")) return "electronics";
  if (types.includes("furniture_store")) return "furniture";
  if (types.includes("home_goods_store")) return "home_goods";
  if (types.includes("sporting_goods_store")) return "sports";
  if (types.includes("toy_store")) return "toys";
  if (types.includes("book_store")) return "books";
  if (types.includes("jewelry_store")) return "jewelry";
  return "other";
}

// Search for places of a given type in a region
async function searchPlaces(type, region) {
  const query = encodeURIComponent(`${type.replace(/_/g, " ")} in ${region}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

// Get place details including business_status and phone
async function getPlaceDetails(placeId) {
  const fields = "place_id,name,formatted_address,formatted_phone_number,geometry,business_status,address_components,types";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result || null;
}

function extractCityState(addressComponents = []) {
  let city = "";
  let state = "";
  let zip = "";
  for (const comp of addressComponents) {
    if (comp.types.includes("locality")) city = comp.long_name;
    if (comp.types.includes("administrative_area_level_1")) state = comp.short_name;
    if (comp.types.includes("postal_code")) zip = comp.long_name;
  }
  return { city, state, zip };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const region = body.region || "New Jersey";

    let imported = 0;
    let skipped = 0;

    // Fetch existing place_ids to avoid duplicates
    const existing = await base44.asServiceRole.entities.ImportedStore.list();
    const existingIds = new Set(existing.map(s => s.place_id));

    for (const type of RETAIL_TYPES) {
      const places = await searchPlaces(type, region);

      for (const place of places) {
        if (existingIds.has(place.place_id)) {
          skipped++;
          continue;
        }

        // Only interested in closed or potentially closing stores
        // CLOSED_PERMANENTLY or CLOSED_TEMPORARILY
        const status = place.business_status;
        if (status !== "CLOSED_PERMANENTLY" && status !== "CLOSED_TEMPORARILY") {
          skipped++;
          continue;
        }

        const details = await getPlaceDetails(place.place_id);
        if (!details) continue;

        const { city, state, zip } = extractCityState(details.address_components || []);

        await base44.asServiceRole.entities.ImportedStore.create({
          place_id: details.place_id,
          name: details.name,
          address: details.formatted_address || "",
          city,
          state,
          zip_code: zip,
          phone: details.formatted_phone_number || "",
          latitude: details.geometry?.location?.lat || null,
          longitude: details.geometry?.location?.lng || null,
          business_status: details.business_status || status,
          category: mapCategory(details.types || []),
          types: details.types || [],
          status: "pending",
          email_sent: false,
          source_region: region,
        });

        existingIds.add(details.place_id);
        imported++;
      }

      // Small delay to stay within rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    return Response.json({ success: true, imported, skipped, region });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
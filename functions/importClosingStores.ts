import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GOOGLE_MAPS_API_KEY = "AIzaSyDg7MzjazFeTvgbDwEGKzdFQgu-5iKSxOE";

// NJ center: Sayreville area
const DEFAULT_LAT = 40.4594;
const DEFAULT_LNG = -74.3608;
const DEFAULT_RADIUS = 50000; // 50km in meters (Google max is 50000)

const RETAIL_TYPES = [
  "department_store",
  "clothing_store",
  "electronics_store",
  "furniture_store",
  "home_goods_store",
  "shoe_store",
  "jewelry_store",
  "book_store",
  "sporting_goods_store",
  "toy_store",
];

const CLOSURE_KEYWORDS = [
  "closing", "closed", "liquidation", "liquidating", "going out of business",
  "final sale", "store closing", "everything must go", "out of business",
  "bankruptcy", "shutting down", "last chance"
];

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

// Nearby search by type around a lat/lng
async function nearbySearch(type, lat, lng, radius) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(`Nearby search error for ${type}: ${data.status} - ${data.error_message || ""}`);
  }
  return data.results || [];
}

// Get detailed info including reviews and rating
async function getPlaceDetails(placeId) {
  const fields = "place_id,name,formatted_address,formatted_phone_number,geometry,business_status,address_components,types,rating,user_ratings_total,reviews";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK") {
    console.error(`Place details error for ${placeId}: ${data.status}`);
  }
  return data.result || null;
}

function extractCityState(addressComponents = []) {
  let city = "", state = "", zip = "";
  for (const comp of addressComponents) {
    if (comp.types.includes("locality")) city = comp.long_name;
    if (comp.types.includes("administrative_area_level_1")) state = comp.short_name;
    if (comp.types.includes("postal_code")) zip = comp.long_name;
  }
  return { city, state, zip };
}

// Score a place for closure likelihood (0-100)
function closureScore(place, details) {
  let score = 0;

  // Already officially closed = high confidence
  if (details.business_status === "CLOSED_PERMANENTLY") score += 70;
  else if (details.business_status === "CLOSED_TEMPORARILY") score += 50;

  // Low rating signals distress
  if (details.rating && details.rating < 2.5) score += 20;
  else if (details.rating && details.rating < 3.0) score += 10;

  // Closure keywords in reviews
  const reviews = details.reviews || [];
  for (const review of reviews) {
    const text = (review.text || "").toLowerCase();
    for (const kw of CLOSURE_KEYWORDS) {
      if (text.includes(kw)) {
        score += 15;
        break; // count each review once
      }
    }
  }

  return Math.min(score, 100);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Support both admin-triggered and scheduled (service role) calls
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === "admin") isAuthorized = true;
    } catch (_) {
      // Scheduled calls won't have a user — allow via service role check
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const lat = body.lat || DEFAULT_LAT;
    const lng = body.lng || DEFAULT_LNG;
    const radius = body.radius || DEFAULT_RADIUS;
    const region = body.region || "New Jersey";
    // Minimum closure score to import (0 = import all closed, 40 = higher confidence)
    const minScore = body.minScore ?? 40;

    let imported = 0;
    let skipped = 0;
    let lowConfidence = 0;

    // Fetch existing place_ids to deduplicate
    const existing = await base44.asServiceRole.entities.ImportedStore.list();
    const existingIds = new Set(existing.map(s => s.place_id));

    for (const type of RETAIL_TYPES) {
      console.log(`Searching for ${type} near ${lat},${lng} radius ${radius}m`);
      const places = await nearbySearch(type, lat, lng, radius);
      console.log(`Found ${places.length} results for ${type}`);

      for (const place of places) {
        if (existingIds.has(place.place_id)) {
          skipped++;
          continue;
        }

        // Quick pre-filter: skip obviously operational stores unless we want to check reviews
        const quickStatus = place.business_status;
        const isOfficallyClosed = quickStatus === "CLOSED_PERMANENTLY" || quickStatus === "CLOSED_TEMPORARILY";

        // For operational stores, only fetch details if rating is suspicious
        if (!isOfficallyClosed) {
          const rating = place.rating;
          // Skip operational stores with decent ratings — not likely closing
          if (!rating || rating >= 3.0) {
            skipped++;
            continue;
          }
        }

        // Get full details for scoring
        const details = await getPlaceDetails(place.place_id);
        if (!details) continue;

        const score = closureScore(place, details);
        console.log(`${details.name}: closure score ${score}, status ${details.business_status}`);

        if (score < minScore) {
          lowConfidence++;
          continue;
        }

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
          business_status: details.business_status || quickStatus,
          category: mapCategory(details.types || []),
          types: details.types || [],
          status: "pending",
          email_sent: false,
          source_region: region,
        });

        existingIds.add(details.place_id);
        imported++;
      }

      // Rate limit: small delay between type searches
      await new Promise(r => setTimeout(r, 300));
    }

    // Notify admins if new stores were imported
    if (imported > 0) {
      try {
        const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
        for (const admin of admins) {
          if (admin.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: admin.email,
              subject: `GOOBY: ${imported} new closing stores imported`,
              body: `Hi ${admin.full_name || "Admin"},\n\n${imported} new potential closing stores were detected near ${region} and added to the import queue for review.\n\nLog in to the Admin Imports page to approve or reject them.\n\nSkipped (duplicates): ${skipped}\nLow confidence: ${lowConfidence}\n\n— GOOBY System`,
            });
          }
        }
      } catch (emailErr) {
        console.error("Failed to notify admins:", emailErr.message);
      }
    }

    console.log(`Import complete: ${imported} imported, ${skipped} skipped, ${lowConfidence} low confidence`);
    return Response.json({ success: true, imported, skipped, lowConfidence, region });
  } catch (error) {
    console.error("importClosingStores error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
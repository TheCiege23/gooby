import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

// ─── Scan locations with the radii you specified ──────────────────────────────
const SCAN_LOCATIONS = [
  // New York — 200km radius anchor + dense city grid
  { lat: 40.7128, lng: -74.0060, radius: 50000, region: "New York City", state: "NY" },
  { lat: 40.6501, lng: -73.9496, radius: 30000, region: "Brooklyn, NY", state: "NY" },
  { lat: 40.7282, lng: -73.7949, radius: 30000, region: "Queens, NY", state: "NY" },
  { lat: 40.9176, lng: -73.8988, radius: 30000, region: "Bronx, NY", state: "NY" },
  { lat: 40.7282, lng: -73.0000, radius: 40000, region: "Long Island, NY", state: "NY" },
  { lat: 41.0534, lng: -74.1301, radius: 30000, region: "Rockland/Westchester, NY", state: "NY" },
  { lat: 42.6526, lng: -73.7562, radius: 40000, region: "Albany, NY", state: "NY" },
  { lat: 43.0481, lng: -76.1474, radius: 40000, region: "Syracuse, NY", state: "NY" },
  { lat: 43.1610, lng: -77.6109, radius: 40000, region: "Rochester, NY", state: "NY" },
  { lat: 42.8864, lng: -78.8784, radius: 40000, region: "Buffalo, NY", state: "NY" },
  // New Jersey — 100km radius split into sub-grids
  { lat: 40.0583, lng: -74.4057, radius: 35000, region: "Central NJ", state: "NJ" },
  { lat: 40.7357, lng: -74.1724, radius: 30000, region: "Newark, NJ", state: "NJ" },
  { lat: 39.3643, lng: -74.4229, radius: 30000, region: "South NJ / Atlantic City", state: "NJ" },
  { lat: 40.2206, lng: -74.0121, radius: 25000, region: "Shore NJ", state: "NJ" },
  // Connecticut — 100km radius split
  { lat: 41.6032, lng: -73.0877, radius: 40000, region: "Connecticut (East)", state: "CT" },
  { lat: 41.3083, lng: -72.9279, radius: 30000, region: "New Haven, CT", state: "CT" },
  { lat: 41.7658, lng: -72.6851, radius: 30000, region: "Hartford, CT", state: "CT" },
  { lat: 41.0534, lng: -73.5387, radius: 25000, region: "Stamford, CT", state: "CT" },
  // Pennsylvania — 200km radius split into sub-grids
  { lat: 41.2033, lng: -77.1945, radius: 50000, region: "Central PA", state: "PA" },
  { lat: 39.9526, lng: -75.1652, radius: 40000, region: "Philadelphia, PA", state: "PA" },
  { lat: 40.4406, lng: -79.9959, radius: 40000, region: "Pittsburgh, PA", state: "PA" },
  { lat: 40.2732, lng: -76.8867, radius: 35000, region: "Harrisburg, PA", state: "PA" },
  { lat: 41.2459, lng: -75.8813, radius: 35000, region: "Scranton/Wilkes-Barre, PA", state: "PA" },
  { lat: 40.5987, lng: -75.4702, radius: 30000, region: "Allentown, PA", state: "PA" },
];

const TARGET_STATES = new Set(["NY", "NJ", "CT", "PA"]);

// ─── Priority retail types (in order) ────────────────────────────────────────
const RETAIL_TYPES = [
  "department_store",
  "clothing_store",
  "electronics_store",
  "furniture_store",
  "home_goods_store",
  "shoe_store",
  "jewelry_store",
  "sporting_goods_store",
  "toy_store",
  "book_store",
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

function extractCityState(addressComponents = []) {
  let city = "", state = "", zip = "";
  for (const comp of addressComponents) {
    if (comp.types.includes("locality")) city = comp.long_name;
    if (comp.types.includes("administrative_area_level_1")) state = comp.short_name;
    if (comp.types.includes("postal_code")) zip = comp.long_name;
  }
  return { city, state, zip };
}

async function nearbySearch(type, lat, lng, radius) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.warn(`Nearby search error [${type} @ ${lat},${lng}]: ${data.status} ${data.error_message || ""}`);
  }
  return data.results || [];
}

async function getPlaceDetails(placeId) {
  const fields = "place_id,name,formatted_address,formatted_phone_number,geometry,business_status,address_components,types,rating,user_ratings_total";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK") {
    console.warn(`Place details error [${placeId}]: ${data.status}`);
    return null;
  }
  return data.result || null;
}

Deno.serve(async (req) => {
  try {
    if (!API_KEY) {
      return Response.json({ error: "GOOGLE_PLACES_API_KEY secret not set" }, { status: 500 });
    }

    const base44 = createClientFromRequest(req);

    // Allow admin or scheduled runner
    try {
      const user = await base44.auth.me();
      if (user && user.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (_) { /* scheduled — allow */ }

    const body = await req.json().catch(() => ({}));
    const filterStates = body.states
      ? new Set(body.states.map(s => s.toUpperCase()))
      : TARGET_STATES;
    const minStatus = body.minStatus || "closed"; // "closed" = only CLOSED_*, "all" = also OPERATIONAL

    // Deduplication: load existing place_ids
    const existing = await base44.asServiceRole.entities.ImportedStore.list("-created_date", 5000);
    const existingIds = new Set(existing.map(s => s.place_id));

    let imported = 0, skipped = 0, geoFiltered = 0, lowSignal = 0;

    const locations = SCAN_LOCATIONS.filter(l => filterStates.has(l.state));

    for (const loc of locations) {
      console.log(`\n📍 ${loc.region} (${loc.state}) r=${loc.radius}m`);

      for (const type of RETAIL_TYPES) {
        const places = await nearbySearch(type, loc.lat, loc.lng, loc.radius);
        console.log(`  ${type}: ${places.length} results`);

        for (const place of places) {
          // Skip already-imported
          if (existingIds.has(place.place_id)) { skipped++; continue; }

          const isClosed =
            place.business_status === "CLOSED_PERMANENTLY" ||
            place.business_status === "CLOSED_TEMPORARILY";

          // Only fetch details for closed or low-rated stores
          if (!isClosed) {
            if (minStatus === "closed") { lowSignal++; continue; }
            if (place.rating && place.rating >= 3.5) { lowSignal++; continue; }
          }

          const details = await getPlaceDetails(place.place_id);
          if (!details) continue;

          // Geo-filter: must resolve to a target state
          const { city, state, zip } = extractCityState(details.address_components || []);
          if (!filterStates.has(state)) { geoFiltered++; continue; }

          const bizStatus = details.business_status || place.business_status || "UNKNOWN";

          // Score confidence
          const scoreRes = await base44.asServiceRole.functions.invoke('scoreStoreConfidence', {
            storeName: details.name,
            city,
            state,
            category: mapCategory(details.types || []),
            businessStatus: bizStatus,
            sourceNote: details.name
          });

          const confidence = scoreRes?.confidence_score || "medium";

          // Auto-reject low-confidence entries
          if (confidence === "low") {
            lowSignal++;
            continue;
          }

          await base44.asServiceRole.entities.ImportedStore.create({
            place_id: details.place_id,
            name: details.name,
            address: details.formatted_address || "",
            city,
            state,
            zip_code: zip,
            phone: details.formatted_phone_number || "",
            latitude: details.geometry?.location?.lat ?? null,
            longitude: details.geometry?.location?.lng ?? null,
            business_status: bizStatus,
            category: mapCategory(details.types || []),
            types: details.types || [],
            status: "pending",
            email_sent: false,
            source_region: `${loc.region} (Google Places API)`,
            confidence_score: confidence,
            confidence_reason: scoreRes?.reason || "",
            closure_signals: scoreRes?.closure_signals || []
          });

          existingIds.add(details.place_id);
          imported++;
          console.log(`    ✅ ${details.name}, ${city}, ${state} [${bizStatus}]`);

          await new Promise(r => setTimeout(r, 150)); // rate limit
        }
      }
    }

    // Notify admins
    if (imported > 0) {
      try {
        const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
        for (const admin of admins) {
          if (admin.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: admin.email,
              subject: `GOOBY: ${imported} new closing stores detected (Google Places)`,
              body: `Hi ${admin.full_name || "Admin"},\n\n${imported} new potential closing retail stores were detected across NY, NJ, CT, and PA via Google Places API and added to the pending review queue.\n\nStats:\n• Imported: ${imported}\n• Skipped (already in DB): ${skipped}\n• Geo-filtered (outside target states): ${geoFiltered}\n• Low signal (operational/high-rated): ${lowSignal}\n\nLog in to Admin Imports to review.\n\n— GOOBY System`,
            });
          }
        }
      } catch (emailErr) {
        console.error("Admin email failed:", emailErr.message);
      }
    }

    console.log(`\n✅ Done: ${imported} imported | ${skipped} skipped | ${geoFiltered} geo-filtered | ${lowSignal} low-signal`);
    return Response.json({ success: true, imported, skipped, geoFiltered, lowSignal });
  } catch (error) {
    console.error("importClosingStores error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
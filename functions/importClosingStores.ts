import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") || "AIzaSyDg7MzjazFeTvgbDwEGKzdFQgu-5iKSxOE";

// ─── Target states ────────────────────────────────────────────────────────────
const TARGET_STATES = new Set(["NY", "NJ", "CT", "PA"]);

// ─── Search grid: multiple anchor points per state so 50km circles tile well ──
const SCAN_LOCATIONS = [
  // New York
  { lat: 40.7128, lng: -74.0060, region: "New York", state: "NY" },  // NYC
  { lat: 40.6501, lng: -73.9496, region: "Brooklyn, NY", state: "NY" },
  { lat: 40.7282, lng: -73.7949, region: "Queens, NY", state: "NY" },
  { lat: 40.9176, lng: -73.8988, region: "Bronx, NY", state: "NY" },
  { lat: 40.9176, lng: -72.9000, region: "Long Island, NY", state: "NY" },
  { lat: 42.6526, lng: -73.7562, region: "Albany, NY", state: "NY" },
  { lat: 43.0481, lng: -76.1474, region: "Syracuse, NY", state: "NY" },
  { lat: 43.1610, lng: -77.6109, region: "Rochester, NY", state: "NY" },
  { lat: 42.8864, lng: -78.8784, region: "Buffalo, NY", state: "NY" },
  // New Jersey
  { lat: 40.4594, lng: -74.3608, region: "Central NJ", state: "NJ" },
  { lat: 40.7357, lng: -74.1724, region: "Newark, NJ", state: "NJ" },
  { lat: 39.9526, lng: -75.1652, region: "South Jersey", state: "NJ" },
  { lat: 40.2206, lng: -74.0121, region: "Shore NJ", state: "NJ" },
  // Connecticut
  { lat: 41.3083, lng: -72.9279, region: "New Haven, CT", state: "CT" },
  { lat: 41.7658, lng: -72.6851, region: "Hartford, CT", state: "CT" },
  { lat: 41.0534, lng: -73.5387, region: "Stamford, CT", state: "CT" },
  // Pennsylvania
  { lat: 39.9526, lng: -75.1652, region: "Philadelphia, PA", state: "PA" },
  { lat: 40.4406, lng: -79.9959, region: "Pittsburgh, PA", state: "PA" },
  { lat: 40.2732, lng: -76.8867, region: "Harrisburg, PA", state: "PA" },
  { lat: 41.2033, lng: -77.1945, region: "Central PA", state: "PA" },
];

const RADIUS = 30000; // 30km — smaller radius = denser, more accurate geo coverage

// ─── Retail types: highest-value first ────────────────────────────────────────
const RETAIL_TYPES = [
  "department_store",    // highest priority: major chains
  "clothing_store",
  "shoe_store",
  "electronics_store",
  "furniture_store",
  "home_goods_store",
  "jewelry_store",
  "sporting_goods_store",
  "toy_store",
  "book_store",
];

// ─── Closure signal keywords — tiered by weight ───────────────────────────────
const HIGH_SIGNAL_KEYWORDS = [
  "going out of business", "store closing", "store is closing", "final days",
  "closing permanently", "last day", "closing sale", "liquidation sale",
  "everything must go", "all sales final", "out of business", "shutting down",
  "closing for good", "permanently closed", "closed for good",
];

const MED_SIGNAL_KEYWORDS = [
  "closing", "closed", "liquidating", "liquidation", "final sale",
  "bankruptcy", "last chance", "clearance", "going dark",
  "last week", "last month open", "closing soon",
];

function reviewSignalScore(reviews = []) {
  let score = 0;
  for (const review of reviews) {
    const text = (review.text || "").toLowerCase();
    let hit = false;
    for (const kw of HIGH_SIGNAL_KEYWORDS) {
      if (text.includes(kw)) { score += 20; hit = true; break; }
    }
    if (!hit) {
      for (const kw of MED_SIGNAL_KEYWORDS) {
        if (text.includes(kw)) { score += 10; break; }
      }
    }
  }
  return Math.min(score, 40); // cap review contribution at 40pts
}

// ─── Overall closure score (0-100) ───────────────────────────────────────────
function closureScore(quickStatus, details) {
  let score = 0;
  const status = details.business_status || quickStatus;
  if (status === "CLOSED_PERMANENTLY") score += 70;
  else if (status === "CLOSED_TEMPORARILY") score += 45;

  const rating = details.rating;
  if (rating) {
    if (rating < 2.0) score += 20;
    else if (rating < 2.5) score += 15;
    else if (rating < 3.0) score += 8;
  }

  score += reviewSignalScore(details.reviews || []);

  return Math.min(score, 100);
}

function mapCategory(types = []) {
  if (types.includes("clothing_store") || types.includes("shoe_store")) return "clothing";
  if (types.includes("electronics_store")) return "electronics";
  if (types.includes("furniture_store")) return "furniture";
  if (types.includes("home_goods_store")) return "home_goods";
  if (types.includes("sporting_goods_store")) return "sports";
  if (types.includes("toy_store")) return "toys";
  if (types.includes("book_store")) return "books";
  if (types.includes("jewelry_store")) return "jewelry";
  if (types.includes("department_store")) return "other";
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
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.warn(`Nearby search error (${type} @ ${lat},${lng}): ${data.status} ${data.error_message || ""}`);
  }
  return data.results || [];
}

async function getPlaceDetails(placeId) {
  const fields = "place_id,name,formatted_address,formatted_phone_number,geometry,business_status,address_components,types,rating,user_ratings_total,reviews";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK") {
    console.warn(`Place details error (${placeId}): ${data.status}`);
  }
  return data.result || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin users or automated scheduled calls
    try {
      const user = await base44.auth.me();
      if (user && user.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (_) { /* scheduled — allow */ }

    const body = await req.json().catch(() => ({}));
    // Allow targeting a specific state subset; default = all 4
    const targetStates = body.states
      ? new Set(body.states.map(s => s.toUpperCase()))
      : TARGET_STATES;
    const minScore = body.minScore ?? 40;

    // Load existing place_ids for deduplication (grab last 5000)
    const existing = await base44.asServiceRole.entities.ImportedStore.list("-created_date", 5000);
    const existingIds = new Set(existing.map(s => s.place_id));

    let imported = 0;
    let skipped = 0;
    let geoFiltered = 0;
    let lowConfidence = 0;

    const locations = SCAN_LOCATIONS.filter(l => targetStates.has(l.state));

    for (const loc of locations) {
      console.log(`\n📍 Scanning ${loc.region} (${loc.state})...`);

      for (const type of RETAIL_TYPES) {
        const places = await nearbySearch(type, loc.lat, loc.lng, RADIUS);
        console.log(`  ${type}: ${places.length} results`);

        for (const place of places) {
          if (existingIds.has(place.place_id)) { skipped++; continue; }

          const isClosed =
            place.business_status === "CLOSED_PERMANENTLY" ||
            place.business_status === "CLOSED_TEMPORARILY";

          // For operational stores, only investigate if rating is concerning
          if (!isClosed && (!place.rating || place.rating >= 3.5)) {
            skipped++;
            continue;
          }

          const details = await getPlaceDetails(place.place_id);
          if (!details) continue;

          // Geo-filter: must be in a target state
          const { city, state, zip } = extractCityState(details.address_components || []);
          if (!targetStates.has(state)) { geoFiltered++; continue; }

          const score = closureScore(place.business_status, details);
          console.log(`    ${details.name} (${state}): score=${score}, status=${details.business_status}`);

          if (score < minScore) { lowConfidence++; continue; }

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
            business_status: details.business_status || place.business_status,
            category: mapCategory(details.types || []),
            types: details.types || [],
            status: "pending",
            email_sent: false,
            source_region: `${loc.region} (Google Places)`,
          });

          existingIds.add(details.place_id);
          imported++;
        }

        await new Promise(r => setTimeout(r, 200)); // polite rate limiting
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
              body: `Hi ${admin.full_name || "Admin"},\n\n${imported} new potential closing retail stores were detected across NY, NJ, CT, and PA via Google Places and added to the pending import queue.\n\nStats:\n• Imported: ${imported}\n• Skipped (duplicates): ${skipped}\n• Geo-filtered (outside target states): ${geoFiltered}\n• Low confidence: ${lowConfidence}\n\nLog in to Admin Imports to review them.\n\n— GOOBY System`,
            });
          }
        }
      } catch (emailErr) {
        console.error("Admin email failed:", emailErr.message);
      }
    }

    console.log(`\n✅ Done: ${imported} imported | ${skipped} skipped | ${geoFiltered} geo-filtered | ${lowConfidence} low-confidence`);
    return Response.json({ success: true, imported, skipped, geoFiltered, lowConfidence });
  } catch (error) {
    console.error("importClosingStores error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
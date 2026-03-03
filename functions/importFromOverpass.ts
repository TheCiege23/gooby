import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Bounding boxes: [south, west, north, east]
const STATE_BOXES = {
  NY: [40.4774, -79.7624, 45.0153, -71.8562],
  NJ: [38.9285, -75.5594, 41.3574, -73.8948],
  CT: [40.9509, -73.7278, 42.0508, -71.7868],
  PA: [39.7198, -80.5199, 42.2699, -74.6895],
};

// OSM retail shop values — clothing (NAICS 4481), shoes (NAICS 4482), electronics (NAICS 443) only
const RETAIL_SHOP_TAGS = [
  "clothes", "shoes", "fashion", "boutique", "second_hand",
  "electronics", "mobile_phone", "computer", "hifi"
];

function mapOsmCategory(tags = {}) {
  const shop = (tags.shop || tags["disused:shop"] || tags["was:shop"] || "").toLowerCase();
  if (["clothes", "shoes", "fashion", "boutique"].includes(shop)) return "clothing";
  if (["electronics", "computer", "mobile_phone"].includes(shop)) return "electronics";
  if (["furniture", "interior_decoration"].includes(shop)) return "furniture";
  if (["houseware", "kitchen", "hardware", "doityourself", "home"].includes(shop)) return "home_goods";
  if (["sports", "outdoor", "bicycle"].includes(shop)) return "sports";
  if (["toys", "games"].includes(shop)) return "toys";
  if (["books", "stationery", "music"].includes(shop)) return "books";
  if (["jewelry", "watches", "gift"].includes(shop)) return "jewelry";
  return "other";
}

const SHOP_REGEX = "^(clothes|shoes|fashion|boutique|second_hand|electronics|mobile_phone|computer|hifi)$";

function buildQuery(bbox) {
  const [s, w, n, e] = bbox;
  // Only clothing, shoes, and electronics — NAICS 4481, 4482, 443
  return `
[out:json][timeout:60];
(
  node["disused:shop"~"${SHOP_REGEX}"](${s},${w},${n},${e});
  node["was:shop"~"${SHOP_REGEX}"](${s},${w},${n},${e});
  node["shop"="vacant"](${s},${w},${n},${e});
  way["disused:shop"~"${SHOP_REGEX}"](${s},${w},${n},${e});
  way["was:shop"~"${SHOP_REGEX}"](${s},${w},${n},${e});
);
out center tags;
`;
}

async function queryOverpass(query) {
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
  const data = await res.json();
  return data.elements || [];
}

function elementToStore(el, state) {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat ?? null;
  const lon = el.lon ?? el.center?.lon ?? null;
  const name = tags.name || tags["old_name"] || tags["disused:name"] || "";
  if (!name) return null;

  const shopType = tags["disused:shop"] || tags["was:shop"] || tags.shop || "";
  const placeId = `osm_${el.type}_${el.id}`;

  return {
    place_id: placeId,
    name,
    address: tags["addr:housenumber"]
      ? `${tags["addr:housenumber"]} ${tags["addr:street"] || ""}`.trim()
      : "",
    city: tags["addr:city"] || "",
    state,
    zip_code: tags["addr:postcode"] || "",
    phone: tags.phone || tags["contact:phone"] || "",
    latitude: lat,
    longitude: lon,
    business_status: "CLOSED_PERMANENTLY",
    category: mapOsmCategory(tags),
    types: shopType ? [shopType] : [],
    status: "pending",
    email_sent: false,
    source_region: `${state} (OpenStreetMap)`,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin or scheduled (no user) calls
    try {
      const user = await base44.auth.me();
      if (user && user.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (_) { /* scheduled call — allow */ }

    // Load existing place_ids for deduplication
    const existing = await base44.asServiceRole.entities.ImportedStore.list("-created_date", 2000);
    const existingIds = new Set(existing.map(s => s.place_id));

    let imported = 0;
    let skipped = 0;

    for (const [state, bbox] of Object.entries(STATE_BOXES)) {
      console.log(`Querying Overpass for closed retail in ${state}...`);
      let elements = [];
      try {
        elements = await queryOverpass(buildQuery(bbox));
      } catch (err) {
        console.error(`Overpass query failed for ${state}: ${err.message}`);
        continue;
      }

      console.log(`${state}: ${elements.length} OSM elements found`);

      for (const el of elements) {
        const placeId = `osm_${el.type}_${el.id}`;
        if (existingIds.has(placeId)) { skipped++; continue; }

        const store = elementToStore(el, state);
        if (!store) { skipped++; continue; }

        await base44.asServiceRole.entities.ImportedStore.create(store);
        existingIds.add(placeId);
        imported++;
      }

      // Small delay between states to be polite to Overpass
      await new Promise(r => setTimeout(r, 2000));
    }

    // Notify admins if anything was imported
    if (imported > 0) {
      try {
        const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
        for (const admin of admins) {
          if (admin.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: admin.email,
              subject: `GOOBY: ${imported} new closures from OpenStreetMap`,
              body: `Hi ${admin.full_name || "Admin"},\n\n${imported} new closed retail locations were detected across NY, NJ, CT, and PA via OpenStreetMap and added to the import queue.\n\nSkipped (duplicates/unnamed): ${skipped}\n\nLog in to Admin Imports to review them.\n\n— GOOBY System`,
            });
          }
        }
      } catch (emailErr) {
        console.error("Admin email failed:", emailErr.message);
      }
    }

    console.log(`Overpass import done: ${imported} imported, ${skipped} skipped`);
    return Response.json({ success: true, imported, skipped });
  } catch (error) {
    console.error("importFromOverpass error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
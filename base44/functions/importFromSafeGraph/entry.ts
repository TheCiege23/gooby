import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const API_KEY = Deno.env.get("SAFEGRAPH_API_KEY");

// SafeGraph GraphQL API endpoint
const SAFEGRAPH_API_URL = "https://api.safegraph.com/v2/graphql";

const TARGET_STATES = new Set(["NY", "NJ", "CT", "PA"]);

// NAICS 44-45 = Retail Trade
const RETAIL_NAICS_PREFIXES = ["44", "45"];

// Map NAICS codes to internal categories
function mapNaics(naicsCode = "", topCategory = "") {
  const n = String(naicsCode);
  const c = (topCategory || "").toLowerCase();
  if (n.startsWith("4481") || c.includes("cloth") || c.includes("apparel") || c.includes("shoe")) return "clothing";
  if (n.startsWith("4482") || c.includes("shoe")) return "clothing";
  if (n.startsWith("443") || c.includes("electron") || c.includes("computer")) return "electronics";
  if (n.startsWith("4421") || c.includes("furni")) return "furniture";
  if (n.startsWith("4422") || c.includes("home good") || c.includes("houseware")) return "home_goods";
  if (n.startsWith("4511") || c.includes("sport") || c.includes("outdoor")) return "sports";
  if (n.startsWith("45112") || c.includes("toy") || c.includes("hobby")) return "toys";
  if (n.startsWith("45121") || c.includes("book") || c.includes("music")) return "books";
  if (n.startsWith("4483") || c.includes("jewel")) return "jewelry";
  if (n.startsWith("44") || n.startsWith("45")) return "other";
  return null; // not retail
}

function isRetailNaics(naicsCode = "") {
  const n = String(naicsCode);
  return RETAIL_NAICS_PREFIXES.some(prefix => n.startsWith(prefix));
}

// SafeGraph GraphQL query for closed/low-activity retail POIs in target states
function buildQuery(state, afterCursor = null) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sinceDate = sixMonthsAgo.toISOString().split("T")[0];

  const afterArg = afterCursor ? `, after: "${afterCursor}"` : "";

  return {
    query: `
      query GetClosedRetailPOIs {
        search(
          filter: {
            address: { region: "${state}" }
            naics_code: { regex: "^4[45]" }
            closed_on: { gte: "${sinceDate}" }
          }
          first: 200
          ${afterArg}
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          results {
            safegraph_place_id
            placekey
            location_name
            brands { brand_name }
            naics_code
            top_category
            sub_category
            street_address
            city
            region
            postal_code
            phone_number
            latitude
            longitude
            closed_on
            open_hours
          }
        }
      }
    `
  };
}

// Fallback query: no closed_on filter but low raw_visit_counts signal
function buildFallbackQuery(state, afterCursor = null) {
  const afterArg = afterCursor ? `, after: "${afterCursor}"` : "";
  return {
    query: `
      query GetRetailPOIs {
        search(
          filter: {
            address: { region: "${state}" }
            naics_code: { regex: "^4[45]" }
          }
          first: 200
          ${afterArg}
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          results {
            safegraph_place_id
            placekey
            location_name
            brands { brand_name }
            naics_code
            top_category
            sub_category
            street_address
            city
            region
            postal_code
            phone_number
            latitude
            longitude
            closed_on
            open_hours
          }
        }
      }
    `
  };
}

async function safegraphQuery(queryBody) {
  const res = await fetch(SAFEGRAPH_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": API_KEY,
    },
    body: JSON.stringify(queryBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SafeGraph API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`SafeGraph GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data?.search || { results: [], pageInfo: { hasNextPage: false } };
}

async function fetchAllForState(state, useFallback = false) {
  const results = [];
  let cursor = null;
  let hasNext = true;
  let pages = 0;

  while (hasNext && pages < 20) { // max 4000 results per state
    const qBody = useFallback
      ? buildFallbackQuery(state, cursor)
      : buildQuery(state, cursor);

    const data = await safegraphQuery(qBody);
    results.push(...(data.results || []));
    hasNext = data.pageInfo?.hasNextPage || false;
    cursor = data.pageInfo?.endCursor || null;
    pages++;

    if (hasNext) await new Promise(r => setTimeout(r, 300)); // rate limit
  }

  return results;
}

Deno.serve(async (req) => {
  try {
    if (!API_KEY) {
      return Response.json({ error: "SAFEGRAPH_API_KEY secret not set. Add it via Dashboard → Settings → Environment Variables." }, { status: 500 });
    }

    const base44 = createClientFromRequest(req);

    // Auth: admin only or scheduled runner
    try {
      const user = await base44.auth.me();
      if (user && user.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (_) { /* scheduled — allow */ }

    const body = await req.json().catch(() => ({}));
    const filterStates = body.states
      ? body.states.map(s => s.toUpperCase()).filter(s => TARGET_STATES.has(s))
      : [...TARGET_STATES];

    // Deduplication: load existing place_ids
    const existing = await base44.asServiceRole.entities.ImportedStore.list("-created_date", 5000);
    const existingIds = new Set(existing.map(s => s.place_id));

    let imported = 0, skipped = 0, nonRetail = 0, noCloseSignal = 0;

    for (const state of filterStates) {
      console.log(`\n🏪 Querying SafeGraph for ${state}...`);

      let places = [];
      try {
        // Primary: query for places with closed_on date in last 6 months
        places = await fetchAllForState(state, false);
        console.log(`  ${state}: ${places.length} closed POIs returned`);
      } catch (err) {
        console.warn(`  Primary query failed for ${state}: ${err.message}`);
        // Fallback: broader query, filter by closed_on client-side
        try {
          places = await fetchAllForState(state, true);
          console.log(`  ${state} (fallback): ${places.length} total retail POIs`);
        } catch (fallbackErr) {
          console.error(`  Fallback also failed for ${state}: ${fallbackErr.message}`);
          continue;
        }
      }

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      for (const place of places) {
        // Must be retail NAICS
        if (!isRetailNaics(place.naics_code)) { nonRetail++; continue; }

        // Must be in target state
        const placeState = (place.region || "").toUpperCase();
        if (!TARGET_STATES.has(placeState)) { skipped++; continue; }

        // Must have a close signal: closed_on date
        const hasCloseSignal = !!place.closed_on;
        if (!hasCloseSignal) { noCloseSignal++; continue; }

        // Deduplicate by placekey or safegraph_place_id
        const pid = place.placekey || place.safegraph_place_id;
        if (!pid) { skipped++; continue; }
        if (existingIds.has(pid)) { skipped++; continue; }

        const category = mapNaics(place.naics_code, place.top_category || "") || "other";
        const brandName = place.brands?.[0]?.brand_name || "";
        const storeName = brandName ? `${place.location_name} (${brandName})` : place.location_name;

        await base44.asServiceRole.entities.ImportedStore.create({
          place_id: pid,
          name: storeName || place.location_name,
          address: place.street_address || "",
          city: place.city || "",
          state: placeState,
          zip_code: place.postal_code || "",
          phone: place.phone_number || "",
          latitude: place.latitude ?? null,
          longitude: place.longitude ?? null,
          business_status: "CLOSED_PERMANENTLY",
          category,
          types: [place.top_category || "", place.sub_category || "", place.naics_code || ""].filter(Boolean),
          status: "pending",
          email_sent: false,
          source_region: `${placeState} (SafeGraph API)`,
        });

        existingIds.add(pid);
        imported++;
        console.log(`  ✅ ${storeName || place.location_name}, ${place.city}, ${placeState} — closed ${place.closed_on}`);
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
              subject: `GOOBY: ${imported} retail closures imported (SafeGraph API)`,
              body: `Hi ${admin.full_name || "Admin"},\n\n${imported} new retail store closures were imported from the SafeGraph Places API for NY, NJ, CT, and PA.\n\nStats:\n• Imported: ${imported}\n• Duplicates skipped: ${skipped}\n• Non-retail filtered: ${nonRetail}\n• No closure signal: ${noCloseSignal}\n\nAll stores are in the Pending queue for your review.\n\n— GOOBY System`,
            });
          }
        }
      } catch (emailErr) {
        console.error("Admin email failed:", emailErr.message);
      }
    }

    console.log(`\n✅ Done: ${imported} imported | ${skipped} skipped | ${nonRetail} non-retail | ${noCloseSignal} no-close-signal`);
    return Response.json({ success: true, imported, skipped, nonRetail, noCloseSignal });

  } catch (error) {
    console.error("importFromSafeGraph error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
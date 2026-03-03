import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SEARCH_QUERIES = [
  { query: "retail store closures New York 2026", state: "NY", region: "New York" },
  { query: "store closing New York City 2026", state: "NY", region: "New York" },
  { query: "retail closures Long Island 2026", state: "NY", region: "New York" },
  { query: "store closures New Jersey 2026", state: "NJ", region: "New Jersey" },
  { query: "retail store closing NJ 2026", state: "NJ", region: "New Jersey" },
  { query: "store closures Connecticut 2026", state: "CT", region: "Connecticut" },
  { query: "retail closing Connecticut 2026", state: "CT", region: "Connecticut" },
  { query: "store closures Pennsylvania 2026", state: "PA", region: "Pennsylvania" },
  { query: "retail store closing Philadelphia 2026", state: "PA", region: "Pennsylvania" },
  { query: "department store closing northeast 2026", state: null, region: "Northeast" },
  { query: "mall store closings NY NJ CT PA 2026", state: null, region: "Northeast" },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin or scheduled calls
    try {
      const user = await base44.auth.me();
      if (user && user.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (_) { /* scheduled — allow */ }

    // Load existing records for deduplication
    const existing = await base44.asServiceRole.entities.ImportedStore.list("-created_date", 5000);
    const existingIds = new Set(existing.map(s => s.place_id));
    const existingNames = new Set(existing.map(s => `${s.name}|${s.city}|${s.state}`.toLowerCase()));

    let imported = 0;
    let skipped = 0;

    for (const { query, state, region } of SEARCH_QUERIES) {
      console.log(`\n🔍 Searching: "${query}"`);

      // Use InvokeLLM with internet context to find real store closures
      let result;
      try {
        result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Search for: "${query}"

Find specific retail store closures announced or happening in 2026 in ${region || "NY/NJ/CT/PA"}.
Use web search grounded in Google-indexed sources and federal/state sources when available (SEC EDGAR, bankruptcy dockets, state business registries, reputable local news).

For each store closure you find, extract:
- Store/brand name (e.g. "Macy's", "Gap", "Bed Bath & Beyond")
- Specific city and state (must be in NY, NJ, CT, or PA)
- Street address if available
- Zip code if available
- Category (clothing, electronics, shoes, accessories, food, furniture, home_goods, sports, toys, books, jewelry, or other)
- Closing date if mentioned (YYYY-MM-DD format)
- Source/context snippet (brief, 1 sentence max)

Return ONLY stores confirmed to be closing or already closed in 2026. Do NOT include speculative or rumored closures unless from a credible source. Prefer results with explicit source references. Do NOT include stores outside NY, NJ, CT, PA.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              closures: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    address: { type: "string" },
                    city: { type: "string" },
                    state: { type: "string", description: "2-letter state code: NY, NJ, CT, or PA" },
                    zip_code: { type: "string" },
                    category: { type: "string", enum: ["clothing", "electronics", "shoes", "accessories", "food", "furniture", "home_goods", "sports", "toys", "books", "jewelry", "other"] },
                    closing_date: { type: "string" },
                    source_note: { type: "string" },
                  },
                  required: ["name", "city", "state"],
                },
              },
            },
          },
        });
      } catch (err) {
        console.error(`LLM search failed for "${query}": ${err.message}`);
        continue;
      }

      const closures = result?.closures || [];
      console.log(`  Found ${closures.length} closures`);

      for (const store of closures) {
        // Geo-filter: must be NY, NJ, CT, or PA
        const storeState = (store.state || "").toUpperCase();
        if (!["NY", "NJ", "CT", "PA"].includes(storeState)) {
          console.log(`  Skipping ${store.name} — state "${storeState}" not in target`);
          skipped++;
          continue;
        }

        // Deduplicate by name+city+state
        const nameKey = `${store.name}|${store.city}|${storeState}`.toLowerCase();
        if (existingNames.has(nameKey)) {
          skipped++;
          continue;
        }

        const placeId = `web_${storeState}_${store.name.replace(/\s+/g, "_").toLowerCase()}_${store.city?.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}`;
        if (existingIds.has(placeId)) { skipped++; continue; }

        await base44.asServiceRole.entities.ImportedStore.create({
          place_id: placeId,
          name: store.name,
          address: store.address || "",
          city: store.city || "",
          state: storeState,
          zip_code: store.zip_code || "",
          phone: "",
          latitude: null,
          longitude: null,
          business_status: "CLOSED_PERMANENTLY",
          category: store.category || "other",
          types: [],
          status: "pending",
          email_sent: false,
          source_region: `${store.city || region}, ${storeState} (Web Search)${store.source_note ? " — " + store.source_note : ""}`,
        });

        existingIds.add(placeId);
        existingNames.add(nameKey);
        imported++;
        console.log(`  ✅ Imported: ${store.name}, ${store.city}, ${storeState}`);
      }

      // Polite delay between searches
      await new Promise(r => setTimeout(r, 1000));
    }

    // Notify admins
    if (imported > 0) {
      try {
        const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
        for (const admin of admins) {
          if (admin.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: admin.email,
              subject: `GOOBY: ${imported} new store closures found via web search`,
              body: `Hi ${admin.full_name || "Admin"},\n\n${imported} new retail store closures in NY, NJ, CT, and PA were found via automated web search and added to the pending import queue.\n\nSkipped (duplicates/out-of-state): ${skipped}\n\nLog in to Admin Imports to review them.\n\n— GOOBY System`,
            });
          }
        }
      } catch (emailErr) {
        console.error("Admin email failed:", emailErr.message);
      }
    }

    console.log(`\n✅ Web search import done: ${imported} imported, ${skipped} skipped`);
    return Response.json({ success: true, imported, skipped });
  } catch (error) {
    console.error("searchRetailClosures error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
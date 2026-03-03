import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SEARCH_QUERIES = [
  { query: "store closures 2026", state: "NY", region: "New York" },
  { query: "retail bankruptcy filings 2026", state: "NJ", region: "New Jersey" },
  { query: "going out of business sales 2026", state: "CT", region: "Connecticut" },
  { query: "store shutdowns Pennsylvania 2026", state: "PA", region: "Pennsylvania" },
  { query: "clothing store closures northeast 2026", state: null, region: "NY/NJ/CT/PA" },
  { query: "electronics retailer closures 2026", state: null, region: "NY/NJ/CT/PA" },
  { query: "shoe store bankruptcy 2026", state: null, region: "NY/NJ/CT/PA" },
  { query: "furniture store liquidation 2026", state: null, region: "NY/NJ/CT/PA" },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin check (optional for scheduled runs)
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

        // Deduplication by place_id (if available) and by name|city|state
        const nameKey = `${store.name}|${store.city}|${storeState}`.toLowerCase();
        if (existingNames.has(nameKey)) {
          console.log(`  Skipping ${store.name} — already exists`);
          skipped++;
          continue;
        }

        // Create new ImportedStore record
        const placeId = `search_${storeState}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        try {
          await base44.asServiceRole.entities.ImportedStore.create({
            place_id: placeId,
            name: store.name,
            address: store.address || "",
            city: store.city,
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
            source_region: store.source_note || "AI Web Search",
            confidence_score: "medium",
            confidence_reason: "AI-sourced from web search with region context",
            closure_signals: [],
          });

          existingIds.add(placeId);
          existingNames.add(nameKey);
          imported++;
          console.log(`  ✓ Imported ${store.name}`);
        } catch (err) {
          console.error(`  Failed to create ImportedStore for ${store.name}: ${err.message}`);
        }
      }
    }

    console.log(`\n✅ Complete. Imported: ${imported}, Skipped: ${skipped}`);
    return Response.json({ success: true, imported, skipped });
  } catch (error) {
    console.error('searchRetailClosures error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
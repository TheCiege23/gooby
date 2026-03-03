import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TARGET_STATES = new Set(["NY", "NJ", "CT", "PA"]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    try {
      const user = await base44.auth.me();
      if (user && user.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (_) {
      // allow scheduled run
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Find confirmed or active retail closure/bankruptcy filings tied to physical stores in NY, NJ, CT, and PA.

Research strategy:
1) Prioritize federal/state filing sources: SEC EDGAR, federal bankruptcy dockets, and state business registries.
2) Use Google-indexed coverage only to corroborate and locate specific affected cities/addresses.
3) Focus primarily on clothing, electronics, shoes (women's and men's), food, and accessories retailers.
4) Exclude non-retail entities, warehouses, and closures outside NY/NJ/CT/PA.

Return records with: brand/store name, city, state code, address if available, category, filing type, source note.
Only return reasonably verifiable closures.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          entities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                address: { type: "string" },
                city: { type: "string" },
                state: { type: "string" },
                zip_code: { type: "string" },
                category: { type: "string" },
                filing_type: { type: "string" },
                source_note: { type: "string" },
              },
              required: ["name", "state"],
            },
          },
        },
      },
    });

    const existing = await base44.asServiceRole.entities.ImportedStore.list("-created_date", 5000);
    const existingKeys = new Set(existing.map((s) => `${(s.name || "").toLowerCase()}|${(s.city || "").toLowerCase()}|${(s.state || "").toLowerCase()}`));

    let imported = 0;
    let skipped = 0;
    let outOfState = 0;

    for (const entity of result?.entities || []) {
      const state = String(entity.state || "").toUpperCase().trim();
      if (!TARGET_STATES.has(state)) {
        outOfState++;
        continue;
      }

      const key = `${(entity.name || "").toLowerCase()}|${(entity.city || "").toLowerCase()}|${state.toLowerCase()}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      await base44.asServiceRole.entities.ImportedStore.create({
        place_id: `gov_scan_${state}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: entity.name,
        address: entity.address || "",
        city: entity.city || "",
        state,
        zip_code: entity.zip_code || "",
        phone: "",
        latitude: null,
        longitude: null,
        business_status: "CLOSED_PERMANENTLY",
        category: entity.category || "other",
        types: [],
        status: "pending",
        email_sent: false,
        source_region: `Gov/Federal AI scan${entity.filing_type ? `: ${entity.filing_type}` : ""}${entity.source_note ? ` — ${entity.source_note}` : ""}`,
      });

      existingKeys.add(key);
      imported++;
    }

    return Response.json({ success: true, imported, skipped, out_of_state: outOfState });
  } catch (error) {
    console.error('scanGovernmentFilings error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
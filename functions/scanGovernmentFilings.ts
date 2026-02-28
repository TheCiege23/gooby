import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── Source definitions ───────────────────────────────────────────────────────
// Each source has a label, URL to fetch or LLM prompt, and the state scope.
// We use InvokeLLM with add_context_from_internet=true so the AI can fetch
// the live pages and extract structured retail entities from them.

const SOURCES = [
  // ── SEC EDGAR: Chapter 7/11 retail bankruptcies ──────────────────────────
  {
    label: "SEC EDGAR – Chapter 11 retail bankruptcies (NY/NJ/CT/PA 2026)",
    url: "https://efts.sec.gov/LATEST/search-index?q=%22going+out+of+business%22+%22retail%22&dateRange=custom&startdt=2026-01-01&enddt=2026-12-31&category=form-type",
    prompt: `Check SEC EDGAR full-text search at https://efts.sec.gov/LATEST/search-index?q=%22going+out+of+business%22+%22retail%22&dateRange=custom&startdt=2026-01-01&enddt=2026-12-31 AND search https://efts.sec.gov/LATEST/search-index?q=%22store+closures%22+%22retail%22&dateRange=custom&startdt=2026-01-01&enddt=2026-12-31 for any SEC filings (8-K, 10-K, 10-Q, 8-K/A) from 2026 mentioning retail store closings, going-out-of-business sales, or Chapter 11 bankruptcy affecting physical retail locations in New York, New Jersey, Connecticut, or Pennsylvania. Also check https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=8-K&dateb=&owner=include&count=40&search_text= for recent 8-K filings. Extract specific store locations.`,
    stateHint: null,
  },
  // ── PACER/US Bankruptcy Court – NY/NJ/CT/PA districts ──────────────────
  {
    label: "US Bankruptcy Court – Chapter 11 retail filings NY/NJ 2026",
    prompt: `Search for recent Chapter 11 and Chapter 7 bankruptcy filings in 2026 for retail businesses in New York and New Jersey. Check https://www.nysb.uscourts.gov/ (Southern District NY), https://www.nyeb.uscourts.gov/ (Eastern District NY), and https://www.njb.uscourts.gov/ (District of NJ) for any retail debtors filing in 2026. Also check https://pcl.uscourts.gov/ for retail bankruptcy cases. Find any retail chains or stores that filed for bankruptcy and list their store locations in NY, NJ, CT, or PA.`,
    stateHint: null,
  },
  {
    label: "US Bankruptcy Court – Chapter 11 retail filings CT/PA 2026",
    prompt: `Search for recent Chapter 11 and Chapter 7 bankruptcy filings in 2026 for retail businesses in Connecticut and Pennsylvania. Check https://www.ctb.uscourts.gov/ (District of CT) and https://www.paeb.uscourts.gov/ (Eastern District PA) and https://www.pawb.uscourts.gov/ (Western District PA) for any retail debtors in 2026. Find retail chains or stores that filed for bankruptcy and list their specific store locations in CT or PA.`,
    stateHint: null,
  },
  // ── NJ Division of Revenue – business dissolutions ──────────────────────
  {
    label: "NJ.gov – retail business dissolutions/closures 2026",
    prompt: `Check the New Jersey Division of Revenue and Enterprise Services business records at https://www.njportal.com/DOR/businessrecords and https://data.nj.gov for retail businesses that dissolved or closed in 2026. Also check https://www.njconsumeraffairs.gov/ for any retail business closure notices. Search for "retail" "clothing" "electronics" "furniture" "store" dissolved businesses in NJ in 2026. Extract store names, cities, and addresses.`,
    stateHint: "NJ",
  },
  // ── NY DOS – business dissolutions ──────────────────────────────────────
  {
    label: "NY DOS – retail business dissolutions 2026",
    prompt: `Check the New York Department of State Division of Corporations at https://apps.dos.ny.gov/publicInquiry/ for retail businesses that dissolved or became inactive in 2026. Also search https://data.ny.gov for any retail closure datasets. Look for dissolved retail stores, clothing shops, electronics stores, furniture stores in New York state in 2026. Also check https://ag.ny.gov/ for any retail fraud/closure consumer alerts in 2026.`,
    stateHint: "NY",
  },
  // ── CT SOTS – business dissolutions ─────────────────────────────────────
  {
    label: "CT Secretary of State – retail dissolutions 2026",
    prompt: `Check the Connecticut Secretary of State business registry at https://service.ct.gov/business/s/onlinebusinesssearch and https://data.ct.gov for retail businesses that dissolved or closed in 2026. Also check https://portal.ct.gov/DCP (Department of Consumer Protection) for any retail closure or going-out-of-business notices in Connecticut in 2026. Extract store names, cities, and closure details.`,
    stateHint: "CT",
  },
  // ── PA DOS – business dissolutions ──────────────────────────────────────
  {
    label: "PA DOS – retail business dissolutions 2026",
    prompt: `Check the Pennsylvania Department of State business entity search at https://www.corporations.pa.gov/search/corpsearch and https://data.pa.gov for retail businesses that dissolved or became inactive in 2026. Also check https://www.attorneygeneral.gov/protect-yourself/consumer-protection/ for any retail closure notices in Pennsylvania in 2026. Extract store names, cities, and details about closures.`,
    stateHint: "PA",
  },
  // ── Retail trade publications (Retail Dive, Chain Store Age) ────────────
  {
    label: "Retail Dive / Chain Store Age – bankruptcy & closure news 2026",
    prompt: `Check https://www.retaildive.com/topic/store-closures/ and https://www.chainstoreage.com/store-closures and https://www.businessinsider.com/retail-store-closures and https://www.forbes.com for articles published in 2026 about retail store closures, bankruptcies, and going-out-of-business sales specifically affecting locations in New York, New Jersey, Connecticut, or Pennsylvania. List every specific store location mentioned.`,
    stateHint: null,
  },
];

// ─── Schema for extracted entities ───────────────────────────────────────────
const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    entities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Store or brand name" },
          address: { type: "string" },
          city: { type: "string" },
          state: { type: "string", description: "2-letter: NY, NJ, CT, or PA" },
          zip_code: { type: "string" },
          category: {
            type: "string",
            enum: ["clothing", "electronics", "furniture", "home_goods", "sports", "toys", "books", "jewelry", "other"],
          },
          closing_date: { type: "string", description: "YYYY-MM-DD if known" },
          filing_type: { type: "string", description: "e.g. Chapter 11, Chapter 7, dissolution, closure notice" },
          source_note: { type: "string", description: "One-line source/context" },
        },
        required: ["name", "state"],
      },
    },
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: allow admin or scheduled runner
    try {
      const user = await base44.auth.me();
      if (user && user.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (_) { /* scheduled — allow */ }

    // Load existing for deduplication
    const existing = await base44.asServiceRole.entities.ImportedStore.list("-created_date", 5000);
    const existingNames = new Set(
      existing.map(s => `${(s.name || "").toLowerCase()}|${(s.city || "").toLowerCase()}|${(s.state || "").toLowerCase()}`)
    );

    let totalImported = 0;
    let totalSkipped = 0;
    const sourceResults = [];

    for (const source of SOURCES) {
      console.log(`\n📋 Scanning: ${source.label}`);

      let result;
      try {
        result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are a data extraction assistant for GOOBY, a marketplace for closing retail stores.

TASK: ${source.prompt}

IMPORTANT RULES:
- Only extract CONFIRMED retail store closures/bankruptcies in 2026 in NY, NJ, CT, or PA.
- Do NOT include speculative closures, corporate HQ closures, or warehouses — only consumer-facing retail stores.
- If a chain is closing multiple locations, list each city as a separate entity if possible.
- If no relevant entities are found on these pages, return an empty entities array.
- Retail categories: clothing, electronics, furniture, home_goods, sports, toys, books, jewelry, other.`,
          add_context_from_internet: true,
          response_json_schema: EXTRACTION_SCHEMA,
        });
      } catch (err) {
        console.error(`  LLM call failed: ${err.message}`);
        sourceResults.push({ source: source.label, imported: 0, skipped: 0, error: err.message });
        continue;
      }

      const entities = result?.entities || [];
      console.log(`  Extracted ${entities.length} entities`);

      let srcImported = 0;
      let srcSkipped = 0;

      for (const entity of entities) {
        const storeState = (entity.state || "").toUpperCase();
        if (!["NY", "NJ", "CT", "PA"].includes(storeState)) {
          srcSkipped++;
          continue;
        }

        const nameKey = `${(entity.name || "").toLowerCase()}|${(entity.city || "").toLowerCase()}|${storeState.toLowerCase()}`;
        if (existingNames.has(nameKey)) {
          srcSkipped++;
          continue;
        }

        const slug = entity.name.replace(/\s+/g, "_").toLowerCase().slice(0, 30);
        const citySlug = (entity.city || "unknown").replace(/\s+/g, "_").toLowerCase();
        const placeId = `gov_${storeState}_${slug}_${citySlug}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

        await base44.asServiceRole.entities.ImportedStore.create({
          place_id: placeId,
          name: entity.name,
          address: entity.address || "",
          city: entity.city || "",
          state: storeState,
          zip_code: entity.zip_code || "",
          phone: "",
          latitude: null,
          longitude: null,
          business_status: "CLOSED_PERMANENTLY",
          category: entity.category || "other",
          types: [],
          status: "pending",
          email_sent: false,
          source_region: `${entity.city || storeState}, ${storeState} (Gov Filing: ${entity.filing_type || "closure"})${entity.source_note ? " — " + entity.source_note : ""}`,
        });

        existingNames.add(nameKey);
        srcImported++;
        totalImported++;
        console.log(`  ✅ ${entity.name}, ${entity.city || "?"}, ${storeState} [${entity.filing_type || "closure"}]`);
      }

      srcSkipped += (entities.length - srcImported - (entities.length - srcImported - srcSkipped));
      totalSkipped += srcSkipped;
      sourceResults.push({ source: source.label, imported: srcImported, skipped: srcSkipped });

      // Polite delay
      await new Promise(r => setTimeout(r, 1500));
    }

    // Admin email notification
    if (totalImported > 0) {
      try {
        const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
        const breakdown = sourceResults
          .filter(s => s.imported > 0)
          .map(s => `  • ${s.source}: ${s.imported} imported`)
          .join("\n");

        for (const admin of admins) {
          if (admin.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: admin.email,
              subject: `GOOBY: ${totalImported} retail closures found via government filings scan`,
              body: `Hi ${admin.full_name || "Admin"},\n\n${totalImported} new retail store closures were found via government filing sources (SEC EDGAR, bankruptcy courts, state registries) and added to the pending import queue.\n\nBreakdown:\n${breakdown}\n\nTotal skipped (duplicates/out-of-state): ${totalSkipped}\n\nLog in to Admin Imports → Gov Filings tab to review.\n\n— GOOBY System`,
            });
          }
        }
      } catch (emailErr) {
        console.error("Admin email failed:", emailErr.message);
      }
    }

    console.log(`\n✅ Gov filings scan done: ${totalImported} imported, ${totalSkipped} skipped`);
    return Response.json({ success: true, imported: totalImported, skipped: totalSkipped, sources: sourceResults });
  } catch (error) {
    console.error("scanGovernmentFilings error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
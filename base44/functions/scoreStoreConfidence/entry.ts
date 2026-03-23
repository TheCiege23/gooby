import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CONFIDENCE_SCHEMA = {
  type: "object",
  properties: {
    confidence_score: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "Confidence in closure status"
    },
    reason: {
      type: "string",
      description: "Brief explanation of score"
    },
    closure_signals: {
      type: "array",
      items: { type: "string" },
      description: "Detected signals like 'bankruptcy', 'liquidation', 'dissolution', etc."
    },
    retail_category_match: {
      type: "boolean",
      description: "True if NAICS 44-45 or matches retail categories"
    }
  }
};

const RETAIL_KEYWORDS = ["clothing", "electronics", "furniture", "home", "sporting", "toys", "books", "jewelry", "apparel", "retail", "store", "shop"];
const CLOSURE_KEYWORDS = ["bankruptcy", "liquidation", "dissolution", "closed", "closing", "going out of business", "gob sale", "ceased operations"];
const NEGATIVE_KEYWORDS = ["headquarters", "warehouse", "distribution", "corporate office", "call center"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { storeName, city, state, category, businessStatus, sourceNote, closingDate } = await req.json();

    if (!storeName || !state) {
      return Response.json({ error: "Missing storeName or state" }, { status: 400 });
    }

    // Quick heuristic check first
    const lowerName = storeName.toLowerCase();
    const lowerSourceNote = (sourceNote || "").toLowerCase();
    const lowerCategory = (category || "").toLowerCase();

    const hasNegativeKeyword = NEGATIVE_KEYWORDS.some(k => lowerName.includes(k) || lowerSourceNote.includes(k));
    if (hasNegativeKeyword) {
      return Response.json({
        confidence_score: "low",
        reason: "Non-retail entity (HQ, warehouse, corporate)",
        closure_signals: ["non-retail-operation"],
        retail_category_match: false
      });
    }

    // Use AI for nuanced scoring
    const prompt = `You are a data quality analyst for a retail closure marketplace.

Store Details:
- Name: ${storeName}
- City: ${city || "N/A"}, ${state}
- Category: ${category || "Unknown"}
- Business Status: ${businessStatus || "Unknown"}
- Closing Date: ${closingDate || "Unknown"}
- Source/Note: ${sourceNote || "No notes"}

Task: Assess confidence that this is a CONFIRMED retail store closure in progress or completed.

Rules:
1. If ANY closure keywords present (bankruptcy, liquidation, going-out-of-business, dissolution, ceased operations): likely HIGH
2. If status is CLOSED_PERMANENTLY or business_status confirms closure: likely HIGH
3. If has recent date (within 6 months) AND closure signals: HIGH
4. If only indirect signals (address change, status unclear): MEDIUM
5. If no clear closure signals, only speculation: LOW
6. Non-retail (HQ, warehouse, corporate): always LOW

Return JSON with confidence_score (high/medium/low), reason, detected closure_signals array, and retail_category_match boolean.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: CONFIDENCE_SCHEMA
    });

    return Response.json({
      confidence_score: result?.confidence_score || "medium",
      reason: result?.reason || "Unable to determine",
      closure_signals: result?.closure_signals || [],
      retail_category_match: result?.retail_category_match !== false
    });
  } catch (error) {
    console.error("scoreStoreConfidence error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
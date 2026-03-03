import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TARGET_STATES = new Set(["NY", "NJ", "CT", "PA"]);

function matchesLocationText(value, locationHint) {
  if (!locationHint) return true;
  const haystack = `${value?.city || ""} ${value?.state || ""} ${value?.zip_code || ""}`.toLowerCase();
  return haystack.includes(locationHint.toLowerCase());
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const question = String(body.question || "").trim();
    const locationHint = String(body.locationHint || "").trim();

    if (!question) {
      return Response.json({ error: "question is required" }, { status: 400 });
    }

    let currentUser = null;
    try {
      currentUser = await base44.auth.me();
    } catch (_) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stores = await base44.asServiceRole.entities.Store.filter({ is_active: true }, "-updated_date", 300);
    const inScopeStores = stores.filter((s) => TARGET_STATES.has(String(s.state || "").toUpperCase()));

    const products = await base44.asServiceRole.entities.Product.filter({ is_available: true }, "-updated_date", 1000);
    const storeMap = Object.fromEntries(inScopeStores.map((s) => [s.id, s]));

    const visibleProducts = products
      .filter((p) => !!storeMap[p.store_id])
      .filter((p) => matchesLocationText(storeMap[p.store_id], locationHint));

    const recentIds = new Set((currentUser?.recently_viewed || []).slice(0, 40));
    const savedIds = new Set(currentUser?.saved_products || []);

    const rankedProducts = visibleProducts
      .map((p) => {
        const s = storeMap[p.store_id];
        let score = 0;
        if (recentIds.has(p.id)) score += 40;
        if (savedIds.has(p.id)) score += 25;
        if ((currentUser?.preferred_categories || []).includes(p.category)) score += 20;
        score += Math.min(Number(p.discount_percent || 0), 20);
        return { p, s, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 80);

    const productContext = rankedProducts.map(({ p, s }) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      sale_price: p.sale_price,
      discount_percent: p.discount_percent,
      store_id: p.store_id,
      store_name: s?.name,
      city: s?.city,
      state: s?.state,
      zip_code: s?.zip_code,
    }));

    const storeContext = inScopeStores
      .filter((s) => matchesLocationText(s, locationHint))
      .slice(0, 50)
      .map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        city: s.city,
        state: s.state,
        zip_code: s.zip_code,
        discount_range: s.discount_range,
      }));

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are GOOBY's shopping assistant.

Rules:
- Only answer using products/stores in the provided context.
- If user asks outside scope, politely say you can only help with listed products and stores.
- Prioritize recommendations by user behavior: recently viewed, saved, preferred categories.
- If locationHint is provided, prioritize items in that area.

User question: ${question}
Location hint: ${locationHint || "(none)"}

Return concise helpful guidance and recommendations.`,
      response_json_schema: {
        type: "object",
        properties: {
          answer: { type: "string" },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["product", "store"] },
                id: { type: "string" },
                name: { type: "string" },
                reason: { type: "string" },
              },
              required: ["type", "id", "name"],
            },
          },
        },
        required: ["answer"],
      },
    });

    return Response.json({
      answer: llm?.answer || "I can help with products and stores currently listed on GOOBY.",
      recommendations: llm?.recommendations || [],
      context_counts: { stores: storeContext.length, products: productContext.length },
    });
  } catch (error) {
    console.error('chatProductStoreAssistant error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
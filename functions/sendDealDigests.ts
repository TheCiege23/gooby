import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TARGET_STATES = new Set(["NY", "NJ", "CT", "PA"]);
const PRIORITY_CATEGORIES = new Set(["clothing", "electronics", "shoes", "accessories", "food"]);

const normalizeCategory = (value) => {
  const c = String(value || "").trim().toLowerCase();
  if (["apparel", "fashion"].includes(c)) return "clothing";
  if (["shoe", "footwear", "sneakers"].includes(c)) return "shoes";
  if (["accessory"].includes(c)) return "accessories";
  if (["grocery", "supermarket"].includes(c)) return "food";
  return c || "other";
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow both admin-triggered and scheduled calls
  let isScheduled = false;
  try {
    const body = await req.json().catch(() => ({}));
    isScheduled = body?.scheduled === true;
  } catch (_) {}

  if (!isScheduled) {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }
  }

  try {
    const allUsers = await base44.asServiceRole.entities.User.list();
    const buyers = allUsers.filter(u => u.role !== 'seller' && u.email_alerts !== false && u.email);

    const allStores = await base44.asServiceRole.entities.Store.filter({ is_active: true });
    const stores = allStores.filter((s) => TARGET_STATES.has(String(s.state || "").toUpperCase()));

    const storeMap = stores.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {});

    const allProducts = await base44.asServiceRole.entities.Product.filter({ is_available: true });
    const products = allProducts.filter((p) => storeMap[p.store_id]);

    let sent = 0;
    let skipped = 0;

    for (const buyer of buyers) {
      const prefs = (buyer.preferred_categories || []).map(normalizeCategory);
      const prefLoc = (buyer.preferred_location || "").toLowerCase();
      const savedIds = new Set(buyer.saved_products || []);
      const recentIds = new Set((buyer.recently_viewed || []).slice(0, 20));

      const scored = products.map(p => {
        const store = storeMap[p.store_id];
        const normalizedCategory = normalizeCategory(p.category);
        let score = 0;

        if (prefs.length === 0 || prefs.includes(normalizedCategory)) score += 35;
        if (PRIORITY_CATEGORIES.has(normalizedCategory)) score += 10;
        score += Math.min(p.discount_percent || 0, 40);
        if (savedIds.has(p.id)) score += 25;
        if (recentIds.has(p.id)) score += 15;
        if (prefLoc && (store?.city?.toLowerCase().includes(prefLoc) || store?.state?.toLowerCase().includes(prefLoc) || store?.zip_code?.includes(prefLoc))) score += 20;

        return { ...p, _score: score, _normalizedCategory: normalizedCategory };
      }).sort((a, b) => b._score - a._score).slice(0, 5);

      if (scored.length === 0) { 
        skipped++; 
        continue; 
      }

      const lines = scored.map((p, i) => {
        const store = storeMap[p.store_id];
        const disc = p.discount_percent ? ` — ${p.discount_percent}% off` : "";
        return `${i + 1}. ${p.name}${disc} at ${store?.name || "a closing store"} (${store?.city || ""}, ${store?.state || ""}) [${p._normalizedCategory}]`;
      }).join("\n");

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: buyer.email,
        subject: `🛍 Your GOOBY Daily Deals — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        body: `Hi ${buyer.full_name || "there"}!\n\nHere are today's top NY/NJ/CT/PA deals picked for you:\n\n${lines}\n\nYou can manage alert preferences in Settings → Preferences.\n\n— GOOBY`,
      });

      sent++;
      await new Promise(r => setTimeout(r, 120));
    }

    return Response.json({ success: true, sent, skipped, products_scored: products.length });
  } catch (error) {
    console.error('sendDealDigests error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
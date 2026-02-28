import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    // Fetch all active buyers with email alerts enabled
    const allUsers = await base44.asServiceRole.entities.User.list();
    const buyers = allUsers.filter(u => u.role !== 'seller' && u.email_alerts !== false && u.email);

    const products = await base44.asServiceRole.entities.Product.filter({ is_available: true });
    const stores = await base44.asServiceRole.entities.Store.filter({ is_active: true });

    const storeMap = stores.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});

    let sent = 0;
    let skipped = 0;

    for (const buyer of buyers) {
      const prefs = buyer.preferred_categories || [];
      const prefLoc = (buyer.preferred_location || "").toLowerCase();
      const savedIds = new Set(buyer.saved_products || []);
      const recentIds = new Set((buyer.recently_viewed || []).slice(0, 20));

      // Score products for this buyer
      const scored = products.map(p => {
        const store = storeMap[p.store_id];
        let score = 0;
        if (prefs.length === 0 || prefs.includes(p.category)) score += 30;
        score += Math.min(p.discount_percent || 0, 40);
        if (savedIds.has(p.id)) score += 25;
        if (recentIds.has(p.id)) score += 15;
        if (prefLoc && (store?.city?.toLowerCase().includes(prefLoc) || store?.state?.toLowerCase().includes(prefLoc))) score += 20;
        return { ...p, _score: score };
      }).sort((a, b) => b._score - a._score).slice(0, 5);

      if (scored.length === 0) { skipped++; continue; }

      const lines = scored.map((p, i) => {
        const store = storeMap[p.store_id];
        const disc = p.discount_percent ? ` — ${p.discount_percent}% off` : "";
        return `${i + 1}. ${p.name}${disc} at ${store?.name || "a closing store"} (${store?.city || ""}, ${store?.state || ""})`;
      }).join("\n");

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: buyer.email,
        subject: `🛍 Your GOOBY Daily Deals — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        body: `Hi ${buyer.full_name || "there"}!\n\nHere are today's top deals picked just for you:\n\n${lines}\n\n${savedIds.size > 0 ? `⭐ You have ${savedIds.size} saved item(s) — check if prices dropped!\n\n` : ""}Browse all deals and shop before stores close:\nhttps://gooby.com\n\nTo manage your alerts or update preferences, visit your Settings page.\n\nHappy deal hunting!\nThe GOOBY Team`,
      });

      sent++;
    }

    return Response.json({ success: true, sent, skipped, total: buyers.length });
  } catch (err) {
    console.error("Digest send error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
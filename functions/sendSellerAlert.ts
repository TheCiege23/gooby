import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TARGET_STATES = new Set(["NY", "NJ", "CT", "PA"]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { importedStoreId } = body;

    if (!importedStoreId) {
      return Response.json({ error: "importedStoreId required" }, { status: 400 });
    }

    const store = await base44.asServiceRole.entities.ImportedStore.get(importedStoreId);
    if (!store) {
      return Response.json({ error: "Store not found" }, { status: 404 });
    }

    const stateCode = String(store.state || "").toUpperCase();
    if (!TARGET_STATES.has(stateCode)) {
      return Response.json({ error: `Store state ${stateCode} is outside NY/NJ/CT/PA` }, { status: 422 });
    }

    const outreachEmail = store.email || user.email;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: outreachEmail,
      subject: `GOOBY seller invite for ${store.name} (${stateCode})`,
      body: `Hi there,\n\nWe noticed ${store.name} (${store.address || "address not provided"}, ${store.city || ""}, ${stateCode}) may be closing.\n\nGOOBY helps stores in NY/NJ/CT/PA liquidate inventory quickly in core demand categories: clothing, electronics, shoes, accessories, and food.\n\nWhy join:\n• Publish listings in minutes\n• Reach local shoppers fast\n• Receive buyer demand insights\n\nCreate your seller profile: https://gooby.app\n\n— GOOBY Team`,
    });

    await base44.asServiceRole.entities.ImportedStore.update(importedStoreId, {
      email_sent: true,
      outreach_email: outreachEmail,
      outreach_sent_at: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
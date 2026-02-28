import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Send email alert
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email, // In production, this would be the store owner's contact email
      subject: `Is ${store.name} closing? List your inventory on GOOBY`,
      body: `
Hi there,

We noticed that ${store.name} (${store.address}) may be closing${store.business_status === "CLOSED_PERMANENTLY" ? " permanently" : " temporarily"}.

If you're looking to sell your remaining inventory fast, GOOBY is the #1 platform connecting closing retail stores with motivated buyers.

✅ List your products in minutes
✅ Reach thousands of local shoppers
✅ Get paid quickly — no long-term commitments

👉 Sign up now at https://gooby.app and start listing today.

The GOOBY Team
      `.trim(),
    });

    // Mark email as sent
    await base44.asServiceRole.entities.ImportedStore.update(importedStoreId, { email_sent: true });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const storeId = String(body.storeId || "");
    const productId = String(body.productId || "");
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();

    if (!storeId || !subject || !message) {
      return Response.json({ error: "storeId, subject, and message are required" }, { status: 400 });
    }

    const store = await base44.asServiceRole.entities.Store.get(storeId);
    if (!store) return Response.json({ error: "Store not found" }, { status: 404 });

    const toEmail = store.email;
    if (!toEmail) {
      return Response.json({ error: "Store does not have a contact email" }, { status: 422 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: toEmail,
      subject: `[GOOBY] ${subject}`,
      body: `New message from GOOBY buyer\n\nFrom: ${user.full_name || "GOOBY user"} <${user.email || "no-email"}>\nStore: ${store.name}\n${productId ? `Product ID: ${productId}\n` : ""}\nMessage:\n${message}\n\nReply directly to this email to continue the conversation.`,
    });

    if (user.email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `Your GOOBY message to ${store.name} was sent`,
        body: `Hi ${user.full_name || "there"},\n\nYour message has been sent to ${store.name}.\n\nSubject: ${subject}\n\nMessage:\n${message}\n\n— GOOBY`,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('contactStoreMessage error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { storeId } = await req.json();
    if (!storeId) return Response.json({ error: 'Missing storeId' }, { status: 400 });

    const store = await base44.entities.Store.get(storeId);
    if (!store || store.owner_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const token = crypto.randomUUID();
    await base44.entities.Store.update(storeId, { verification_token: token });

    const appUrl = req.headers.get('origin') || 'https://app.base44.com';
    const verifyUrl = `${appUrl}?verify_store=${storeId}&token=${token}`;

    await base44.integrations.Core.SendEmail({
      to: store.email || user.email,
      subject: 'Verify your GOOBY seller account',
      body: `Hi ${user.full_name},

Please verify your seller email address by clicking the link below:

${verifyUrl}

This link is valid for 24 hours. If you didn't request this, you can ignore this email.

— The GOOBY Team`
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendVerificationEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
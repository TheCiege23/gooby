import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { storeId, token } = await req.json();

    if (!storeId || !token) return Response.json({ error: 'Missing params' }, { status: 400 });

    const store = await base44.asServiceRole.entities.Store.get(storeId);
    if (!store) return Response.json({ error: 'Store not found' }, { status: 404 });
    if (store.verification_token !== token) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const newStatus = store.verification_doc_url ? 'pending_doc_review' : 'email_verified';
    await base44.asServiceRole.entities.Store.update(storeId, {
      email_verified: true,
      verification_token: null,
      verification_status: newStatus,
    });

    return Response.json({ success: true, verification_status: newStatus });
  } catch (error) {
    console.error('verifySellerEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
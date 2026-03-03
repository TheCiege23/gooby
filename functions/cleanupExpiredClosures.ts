import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_) {}

    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

    const all = await base44.asServiceRole.entities.ImportedStore.list('-created_date', 5000);

    let deleted = 0;
    for (const store of all) {
      const age = now - new Date(store.created_date).getTime();
      const shouldDelete =
        (store.status === 'rejected' && age > THIRTY_DAYS_MS) ||
        (store.status === 'pending' && age > NINETY_DAYS_MS);

      if (shouldDelete) {
        await base44.asServiceRole.entities.ImportedStore.delete(store.id);
        deleted++;
      }
    }

    // Also remove inactive stores older than 90 days
    const allStores = await base44.asServiceRole.entities.Store.filter({ is_active: false });
    let storesDeleted = 0;
    for (const store of allStores) {
      const age = now - new Date(store.updated_date || store.created_date).getTime();
      if (age > NINETY_DAYS_MS) {
        await base44.asServiceRole.entities.Store.delete(store.id);
        storesDeleted++;
      }
    }

    console.log(`Cleanup: ${deleted} imported stores removed, ${storesDeleted} inactive stores removed`);
    return Response.json({ success: true, deleted, storesDeleted });
  } catch (error) {
    console.error('cleanupExpiredClosures error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
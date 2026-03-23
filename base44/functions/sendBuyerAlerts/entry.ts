import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin or scheduled (no user)
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_) {}

    const TARGET_CATEGORIES = ['clothing', 'electronics'];

    const [activeAlerts, stores, closures] = await Promise.all([
      base44.asServiceRole.entities.DealAlert.filter({ is_active: true }),
      base44.asServiceRole.entities.Store.filter({ is_active: true }),
      base44.asServiceRole.entities.ImportedStore.filter({ status: 'approved' }),
    ]);

    const allStores = [...stores, ...closures].filter(s =>
      TARGET_CATEGORIES.includes(s.category)
    );

    let sent = 0, skipped = 0;

    for (const alert of activeAlerts) {
      if (!alert.user_id) { skipped++; continue; }

      // Resolve user
      let userEmail = null, userName = 'there';
      if (alert.user_id.includes('@')) {
        userEmail = alert.user_id;
      } else {
        const users = await base44.asServiceRole.entities.User.filter({ id: alert.user_id });
        if (users[0]?.email) {
          userEmail = users[0].email;
          userName = users[0].full_name || 'there';
        }
      }
      if (!userEmail) { skipped++; continue; }

      const alertCategories = (alert.categories || []).filter(c => TARGET_CATEGORIES.includes(c));
      const targetCategories = alertCategories.length > 0 ? alertCategories : TARGET_CATEGORIES;

      const matchingStores = allStores.filter(s => {
        if (!targetCategories.includes(s.category)) return false;
        if (alert.location) {
          const loc = alert.location.toLowerCase();
          const match =
            s.city?.toLowerCase().includes(loc) ||
            s.state?.toLowerCase().includes(loc) ||
            s.zip_code?.includes(loc);
          if (!match) return false;
        }
        const minDisc = alert.min_discount || 0;
        return true;
      }).slice(0, 8);

      if (matchingStores.length === 0) { skipped++; continue; }

      const storeLines = matchingStores.map(s =>
        `• ${s.name} — ${s.city}, ${s.state}${s.discount_range ? ` (${s.discount_range} OFF)` : ''}`
      ).join('\n');

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: userEmail,
        subject: `GOOBY: ${matchingStores.length} new closing-store deals near you`,
        body: [
          `Hi ${userName},`,
          '',
          `We found ${matchingStores.length} closing-store deal${matchingStores.length > 1 ? 's' : ''} matching your preferences in clothing & electronics:`,
          '',
          storeLines,
          '',
          'Visit GOOBY to browse these deals and save your favorites!',
          '',
          '─────────────────────',
          'You are receiving this because you set up a Deal Alert on GOOBY.',
          'To manage your preferences or unsubscribe, log in and visit Deal Alerts settings.',
          '',
          '— The GOOBY Team',
        ].join('\n'),
      });

      sent++;
      console.log(`Alert sent to ${userEmail} — ${matchingStores.length} matches`);
    }

    console.log(`Buyer alerts done: ${sent} sent, ${skipped} skipped`);
    return Response.json({ success: true, sent, skipped });
  } catch (error) {
    console.error('sendBuyerAlerts error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { productId } = await req.json();
    if (!productId) return Response.json({ error: 'Missing productId' }, { status: 400 });

    const product = await base44.asServiceRole.entities.Product.get(productId);
    if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });

    const orig = product.original_price || 0;
    const sale = product.sale_price || 0;
    const discountPct = orig > 0 ? ((orig - sale) / orig) * 100 : 0;

    // AI analysis
    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a fraud detection system for a retail marketplace. Analyze this product listing for signs of scam or fraud:

Name: ${product.name}
Description: ${product.description || 'N/A'}
Original Price: $${orig}
Sale Price: $${sale}
Discount: ${discountPct.toFixed(0)}%
Category: ${product.category}
Condition: ${product.condition}

Red flags to check:
1. Unrealistically high discounts (>95% off is suspicious, >80% warrants scrutiny)
2. Price inconsistencies (e.g. sale price higher than original)
3. Vague or no description for expensive items
4. Extremely low prices for electronics/jewelry that defy market value
5. Misleading product name vs description

Return a JSON with:
- scam_score: 0-100 (0=clean, 100=definite scam)
- is_suspicious: true/false (true if score >= 60)
- reason: short explanation if suspicious, null otherwise`,
      response_json_schema: {
        type: "object",
        properties: {
          scam_score: { type: "number" },
          is_suspicious: { type: "boolean" },
          reason: { type: "string" }
        }
      }
    });

    console.log(`Scam scan for product ${productId}: score=${analysis.scam_score}, suspicious=${analysis.is_suspicious}`);

    const updates = {
      scam_score: analysis.scam_score,
    };

    if (analysis.is_suspicious) {
      updates.is_flagged = true;
      updates.flag_reason = analysis.reason;
      updates.is_available = false; // auto-hide

      // Notify admins
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      for (const admin of admins) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `⚠️ Suspicious listing auto-flagged: ${product.name}`,
          body: `A product listing has been automatically flagged by AI scam detection.

Product: ${product.name}
Category: ${product.category}
Original Price: $${orig}
Sale Price: $${sale}
Discount: ${discountPct.toFixed(0)}%

Scam Score: ${analysis.scam_score}/100
Reason: ${analysis.reason}

The listing has been auto-hidden. Please review it in the admin panel.`
        });
      }
    }

    await base44.asServiceRole.entities.Product.update(productId, updates);

    return Response.json({ 
      scam_score: analysis.scam_score, 
      is_suspicious: analysis.is_suspicious,
      reason: analysis.reason 
    });

  } catch (error) {
    console.error('scanProductForScam error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
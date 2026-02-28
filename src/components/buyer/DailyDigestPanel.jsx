import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Mail, Loader2, TrendingDown, Clock, Star, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DailyDigestPanel({ user, products, stores, savedProducts }) {
  const [loading, setLoading] = useState(false);
  const [digest, setDigest] = useState(null);
  const [emailSent, setEmailSent] = useState(false);

  const storeMap = stores.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});

  const generateDigest = async () => {
    setLoading(true);

    const savedItems = products.filter(p => savedProducts.includes(p.id)).map(p => ({
      name: p.name, category: p.category, price: p.sale_price, discount: p.discount_percent,
      store: storeMap[p.store_id]?.name,
    }));

    const recentlyViewed = (user?.recently_viewed || []).slice(0, 10);
    const viewedProducts = products.filter(p => recentlyViewed.includes(p.id)).map(p => ({
      name: p.name, category: p.category, price: p.sale_price, discount: p.discount_percent,
    }));

    const topDeals = products
      .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0))
      .slice(0, 10)
      .map(p => ({
        name: p.name, category: p.category, price: p.sale_price, discount: p.discount_percent,
        store: storeMap[p.store_id]?.name, city: storeMap[p.store_id]?.city,
      }));

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a personalized shopping assistant for GOOBY, a closing-store deals marketplace in NY/NJ/CT/PA.

User profile:
- Name: ${user?.full_name || "Shopper"}
- Preferred categories: ${(user?.preferred_categories || []).join(", ") || "all"}
- Preferred location: ${user?.preferred_location || "any"}
- Saved ${savedItems.length} items: ${JSON.stringify(savedItems)}
- Recently viewed: ${JSON.stringify(viewedProducts)}
- Purchase history categories: ${JSON.stringify(user?.purchase_history_categories || [])}

Top available deals right now:
${JSON.stringify(topDeals)}

Generate a concise, personalized daily deal digest. Focus on:
1. Price drops or great deals on items similar to what they've saved/viewed
2. New top deals in their preferred categories
3. A motivating tip about urgency (stores close soon)
Return structured JSON only.`,
      response_json_schema: {
        type: "object",
        properties: {
          headline: { type: "string", description: "Short punchy headline for the digest (e.g. '3 deals dropping fast in your area')" },
          summary: { type: "string", description: "2 sentences personalized to the user's tastes" },
          featured_deals: {
            type: "array",
            description: "Top 3 deal recommendations",
            items: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                store_name: { type: "string" },
                reason: { type: "string", description: "Why this matches the user (1 sentence)" },
                urgency: { type: "string", description: "Short urgency note e.g. 'Closing in 2 weeks'" },
              }
            }
          },
          tip: { type: "string", description: "One actionable shopping tip" },
          saved_item_alert: { type: "string", description: "Alert if any saved items have price drops or matching new arrivals (or null)" },
        }
      }
    });

    setDigest(result);
    setLoading(false);
  };

  const sendDigestEmail = async () => {
    if (!digest || !user?.email) return;
    setEmailSent(true);

    const dealsHtml = (digest.featured_deals || []).map((d, i) =>
      `${i + 1}. ${d.product_name} at ${d.store_name} — ${d.reason} (${d.urgency})`
    ).join("\n");

    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: `🛍 Your GOOBY Deal Digest: ${digest.headline}`,
      body: `Hi ${user?.full_name || "there"}!\n\n${digest.summary}\n\n🔥 TODAY'S TOP PICKS:\n${dealsHtml}\n\n💡 Tip: ${digest.tip}\n\n${digest.saved_item_alert ? `⚡ Saved Item Alert: ${digest.saved_item_alert}\n\n` : ""}View all deals: https://gooby.com\n\nHappy deal hunting!\nThe GOOBY Team`,
    });
  };

  return (
    <Card className="overflow-hidden mb-8">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Your Daily Digest</h2>
              <p className="text-amber-100 text-sm">AI-curated deals based on your activity</p>
            </div>
          </div>
          <Button
            onClick={generateDigest}
            disabled={loading}
            className="bg-white text-amber-600 hover:bg-amber-50 rounded-full"
            size="sm"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {loading ? "Generating..." : digest ? "Refresh Digest" : "Generate Today's Digest"}
          </Button>
        </div>
      </div>

      {digest ? (
        <div className="p-5 space-y-4">
          {/* Headline */}
          <div className="flex items-start gap-2">
            <TrendingDown className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900">{digest.headline}</p>
              <p className="text-gray-600 text-sm mt-1">{digest.summary}</p>
            </div>
          </div>

          {/* Saved item alert */}
          {digest.saved_item_alert && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
              <Star className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-blue-800"><span className="font-semibold">Saved Item Alert:</span> {digest.saved_item_alert}</p>
            </div>
          )}

          {/* Featured deals */}
          {digest.featured_deals?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Featured for You</p>
              {digest.featured_deals.map((deal, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{deal.product_name}</p>
                    {deal.store_name && <p className="text-xs text-gray-500">{deal.store_name}</p>}
                    <p className="text-xs text-gray-600 mt-0.5">{deal.reason}</p>
                  </div>
                  {deal.urgency && (
                    <Badge className="bg-red-100 text-red-700 text-xs flex-shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {deal.urgency}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tip */}
          {digest.tip && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
              <span className="text-base">💡</span>
              <p>{digest.tip}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-1">
            <Button
              onClick={sendDigestEmail}
              disabled={emailSent}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Mail className="w-4 h-4 mr-2" />
              {emailSent ? "Email Sent!" : "Email This Digest"}
            </Button>
            <Link to={createPageUrl("Browse")}>
              <Button size="sm" className="rounded-full bg-orange-500 hover:bg-orange-600 text-white">
                Shop All Deals <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-5 text-center text-gray-500 text-sm py-8">
          <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p>Click "Generate Today's Digest" for a personalized roundup based on your saved items and browsing history.</p>
        </div>
      )}
    </Card>
  );
}
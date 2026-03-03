import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, Loader2, RefreshCw, Navigation, X } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";

export default function AIMatchPanel({ user, products, stores, savedProducts, onSaveProduct }) {
  const [recommendations, setRecommendations] = useState([]);
  const [aiInsight, setAiInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const storeMap = stores.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});

  useEffect(() => {
    if (products.length > 0) generateRecommendations();
  }, [products, user, userLocation]);

  const detectLocation = () => {
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => {
        setLocationError("Could not detect location");
        setLocationLoading(false);
      }
    );
  };

  const distanceMiles = (lat1, lng1, lat2, lng2) => {
    const R = 3958.8;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const generateRecommendations = () => {
    const preferredCategories = user?.preferred_categories || [];
    const preferredLocation = user?.preferred_location?.toLowerCase() || "";

    let scored = products.map((product) => {
      const store = storeMap[product.store_id];
      let score = 0;

      // Category match
      if (preferredCategories.length === 0 || preferredCategories.includes(product.category)) score += 30;

      // Discount
      score += Math.min(product.discount_percent || 0, 50);

      // Location (geolocation)
      if (userLocation && store?.latitude && store?.longitude) {
        const dist = distanceMiles(userLocation.lat, userLocation.lng, store.latitude, store.longitude);
        if (dist < 10) score += 40;
        else if (dist < 25) score += 20;
        else if (dist < 50) score += 10;
      } else if (preferredLocation && store) {
        // Text-based location
        if (
          store.city?.toLowerCase().includes(preferredLocation) ||
          store.state?.toLowerCase().includes(preferredLocation) ||
          store.zip_code?.includes(preferredLocation)
        ) score += 25;
      }

      // Saved product in same store boosts similar items
      const savedInStore = (user?.saved_products || []).some(id =>
        products.find(p => p.id === id && p.store_id === product.store_id)
      );
      if (savedInStore) score += 15;

      return { ...product, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);
    setRecommendations(scored.slice(0, 6));
  };

  const fetchAIInsight = async () => {
    setLoading(true);
    const topProducts = recommendations.slice(0, 8).map(p => ({
      name: p.name,
      category: p.category,
      discount: p.discount_percent,
      price: p.sale_price,
      store: storeMap[p.store_id]?.name,
      city: storeMap[p.store_id]?.city,
    }));

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a concise shopping assistant for GOOBY, a closing store deals marketplace.
User preferences: categories=${JSON.stringify(user?.preferred_categories || [])}, location=${user?.preferred_location || "any"}, uses geolocation=${!!userLocation}.
Top matched products: ${JSON.stringify(topProducts)}.
Give a SHORT (2 sentences max) personalized tip about the best deal and why. Be specific about the product and savings.`,
      response_json_schema: {
        type: "object",
        properties: {
          tip: { type: "string" },
          highlight_product: { type: "string" }
        }
      }
    });
    setAiInsight(result);
    setLoading(false);
  };

  if (dismissed) return null;

  return (
    <div className="mb-8 rounded-2xl overflow-hidden border border-blue-100 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">AI-Matched Deals for You</span>
        </div>
        <div className="flex items-center gap-2">
          {!userLocation && (
            <Button
              size="sm"
              variant="ghost"
              onClick={detectLocation}
              disabled={locationLoading}
              className="text-white hover:bg-white/20 text-xs"
            >
              {locationLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Navigation className="w-3 h-3 mr-1" />}
              Use My Location
            </Button>
          )}
          {userLocation && (
            <Badge className="bg-white/20 text-white text-xs">
              <MapPin className="w-3 h-3 mr-1" /> Location active
            </Badge>
          )}
          <button onClick={() => setDismissed(true)} className="hover:bg-white/20 rounded p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white p-4">
        {/* AI Insight */}
        {(aiInsight || loading) && (
          <div className="mb-4 p-3 bg-blue-50 rounded-xl flex items-start gap-2 text-sm text-blue-800">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
            {loading ? (
              <span className="flex items-center gap-2 text-blue-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Getting AI insight...
              </span>
            ) : (
              <div>
                {aiInsight.highlight_product && <span className="font-medium">{aiInsight.highlight_product}: </span>}
                {aiInsight.tip}
              </div>
            )}
          </div>
        )}

        {locationError && (
          <p className="text-xs text-red-500 mb-3">{locationError}</p>
        )}

        {/* Recommended Products */}
        {recommendations.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {recommendations.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  store={storeMap[product.store_id]}
                  onSave={onSaveProduct}
                  isSaved={savedProducts.includes(product.id)}
                />
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAIInsight}
                disabled={loading}
                className="text-blue-600 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Get AI Insight
              </Button>
              <Link to={createPageUrl("Recommendations")} className="text-xs text-blue-600 hover:underline">
                See all recommendations →
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 py-4 text-center">
            No matches yet — update your <Link to={createPageUrl("Settings")} className="text-blue-600 underline">preferences</Link> for better recommendations.
          </p>
        )}
      </div>
    </div>
  );
}
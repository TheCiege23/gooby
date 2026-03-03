import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, Tag, Loader2, RefreshCw, ArrowRight } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import DailyDigestPanel from "@/components/buyer/DailyDigestPanel";

export default function Recommendations() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedProducts, setSavedProducts] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const authenticated = await base44.auth.isAuthenticated();
    if (!authenticated) {
      window.location.assign(`/login?from=${encodeURIComponent(window.location.href)}`);
      return;
    }

    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setSavedProducts(currentUser.saved_products || []);
    setLoading(false);
  };

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['allProducts'],
    queryFn: () => base44.entities.Product.filter({ is_available: true }),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['allStores'],
    queryFn: () => base44.entities.Store.filter({ is_active: true }),
  });

  const storeMap = stores.reduce((acc, store) => {
    acc[store.id] = store;
    return acc;
  }, {});

  const getRecommendedProducts = () => {
    if (!user) return [];

    const preferredCategories = user.preferred_categories || [];
    const preferredLocation = user.preferred_location?.toLowerCase() || "";

    return products
      .filter(product => {
        const store = storeMap[product.store_id];
        
        // Category match
        const categoryMatch = preferredCategories.length === 0 || 
          preferredCategories.includes(product.category);

        // Location match (if user has preferred location)
        const locationMatch = !preferredLocation || 
          store?.city?.toLowerCase().includes(preferredLocation) ||
          store?.state?.toLowerCase().includes(preferredLocation) ||
          store?.zip_code?.includes(preferredLocation);

        // High discount preference
        const hasGoodDiscount = (product.discount_percent || 0) >= 30;

        return categoryMatch && (locationMatch || hasGoodDiscount);
      })
      .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0))
      .slice(0, 12);
  };

  const fetchAIRecommendations = async () => {
    setLoadingAI(true);

    const userPrefs = {
      categories: user.preferred_categories || [],
      location: user.preferred_location || "",
      saved_count: savedProducts.length,
    };

    const availableProducts = products.slice(0, 20).map(p => ({
      name: p.name,
      category: p.category,
      discount: p.discount_percent,
      price: p.sale_price,
      store: storeMap[p.store_id]?.name,
      city: storeMap[p.store_id]?.city,
    }));

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a shopping recommendation assistant for GOOBY, a marketplace for closing store deals.

User preferences:
- Interested categories: ${userPrefs.categories.length > 0 ? userPrefs.categories.join(", ") : "all categories"}
- Preferred location: ${userPrefs.location || "any location"}
- Has saved ${userPrefs.saved_count} products

Available products:
${JSON.stringify(availableProducts, null, 2)}

Based on the user's preferences and the available products, provide personalized recommendations. Consider:
1. Matching categories to user interests
2. Best discount percentages
3. Location preferences if specified
4. Variety in recommendations

Respond with a JSON object.`,
      response_json_schema: {
        type: "object",
        properties: {
          greeting: {
            type: "string",
            description: "A personalized greeting for the user"
          },
          top_picks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                reason: { type: "string" }
              }
            },
            description: "Top 3 recommended products with reasons"
          },
          tip: {
            type: "string",
            description: "A shopping tip based on current deals"
          }
        }
      }
    });

    setAiRecommendations(response);
    setLoadingAI(false);
  };

  const recommendedProducts = getRecommendedProducts();

  const handleSaveProduct = async (productId) => {
    if (!user) return;

    const newSaved = savedProducts.includes(productId)
      ? savedProducts.filter(id => id !== productId)
      : [...savedProducts, productId];

    setSavedProducts(newSaved);
    await base44.auth.updateMe({ saved_products: newSaved });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">For You</h1>
        </div>
        <p className="text-gray-500">Personalized deals based on your preferences</p>
      </div>

      {/* AI Insights */}
      <Card className="mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h2 className="font-semibold">AI Shopping Assistant</h2>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchAIRecommendations}
              disabled={loadingAI}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              {loadingAI ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Get AI Tips
            </Button>
          </div>

          {aiRecommendations ? (
            <div className="space-y-4">
              <p className="text-lg">{aiRecommendations.greeting}</p>
              
              {aiRecommendations.top_picks?.length > 0 && (
                <div className="bg-white/10 rounded-xl p-4">
                  <h3 className="font-medium mb-3">🎯 Top Picks for You:</h3>
                  <ul className="space-y-2">
                    {aiRecommendations.top_picks.map((pick, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-medium">{pick.product_name}:</span>
                        <span className="text-white/80">{pick.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiRecommendations.tip && (
                <div className="flex items-start gap-2 bg-white/10 rounded-xl p-4">
                  <span className="text-xl">💡</span>
                  <p>{aiRecommendations.tip}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-white/80">
              Click "Get AI Tips" for personalized shopping recommendations based on current deals!
            </p>
          )}
        </div>
      </Card>

      {/* Daily Digest */}
      {products.length > 0 && (
        <DailyDigestPanel
          user={user}
          products={products}
          stores={stores}
          savedProducts={savedProducts}
        />
      )}

      {/* User Preferences Summary */}
      {(user?.preferred_categories?.length > 0 || user?.preferred_location) && (
        <Card className="mb-8 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-gray-500">Your preferences:</span>
            {user?.preferred_categories?.map(cat => (
              <Badge key={cat} variant="secondary" className="capitalize">
                <Tag className="w-3 h-3 mr-1" />
                {cat.replace("_", " ")}
              </Badge>
            ))}
            {user?.preferred_location && (
              <Badge variant="secondary">
                <MapPin className="w-3 h-3 mr-1" />
                {user.preferred_location}
              </Badge>
            )}
            <Link to={createPageUrl("Settings")} className="text-sm text-blue-600 hover:underline">
              Update preferences
            </Link>
          </div>
        </Card>
      )}

      {/* Recommended Products */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recommended for You</h2>
          <Link to={createPageUrl("Browse")}>
            <Button variant="outline" className="rounded-full">
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {loadingProducts ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : recommendedProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {recommendedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                store={storeMap[product.store_id]}
                onSave={handleSaveProduct}
                isSaved={savedProducts.includes(product.id)}
              />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No recommendations yet</h3>
            <p className="text-gray-500 mt-2 mb-6">
              Update your preferences to get personalized recommendations
            </p>
            <Link to={createPageUrl("Settings")}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Set Preferences
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
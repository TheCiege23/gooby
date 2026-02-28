import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Store, Tag, Loader2 } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import StoreCard from "@/components/ui/StoreCard";

export default function SavedDeals() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedProducts, setSavedProducts] = useState([]);
  const [savedStores, setSavedStores] = useState([]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const authenticated = await base44.auth.isAuthenticated();
    if (!authenticated) {
      base44.auth.redirectToLogin();
      return;
    }

    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setSavedProducts(currentUser.saved_products || []);
    setSavedStores(currentUser.saved_stores || []);
    setLoading(false);
  };

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['savedProducts', savedProducts],
    queryFn: async () => {
      if (savedProducts.length === 0) return [];
      const allProducts = await base44.entities.Product.filter({});
      return allProducts.filter(p => savedProducts.includes(p.id));
    },
    enabled: savedProducts.length > 0,
  });

  const { data: stores = [], isLoading: loadingStores } = useQuery({
    queryKey: ['savedStores', savedStores],
    queryFn: async () => {
      if (savedStores.length === 0) return [];
      const allStores = await base44.entities.Store.filter({});
      return allStores.filter(s => savedStores.includes(s.id));
    },
    enabled: savedStores.length > 0,
  });

  const { data: allStores = [] } = useQuery({
    queryKey: ['allStores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const storeMap = allStores.reduce((acc, store) => {
    acc[store.id] = store;
    return acc;
  }, {});

  const handleUnsaveProduct = async (productId) => {
    const newSaved = savedProducts.filter(id => id !== productId);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Saved Deals</h1>
        <p className="text-gray-500 mt-2">Your saved products and stores</p>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="products" className="rounded-lg">
            <Tag className="w-4 h-4 mr-2" />
            Products ({savedProducts.length})
          </TabsTrigger>
          <TabsTrigger value="stores" className="rounded-lg">
            <Store className="w-4 h-4 mr-2" />
            Stores ({savedStores.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          {loadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  store={storeMap[product.store_id]}
                  onSave={handleUnsaveProduct}
                  isSaved={true}
                />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">No saved products yet</h3>
              <p className="text-gray-500 mt-2 mb-6">
                Browse deals and save products you're interested in
              </p>
              <Link to={createPageUrl("Browse")}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Browse Deals
                </Button>
              </Link>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stores">
          {loadingStores ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : stores.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">No saved stores yet</h3>
              <p className="text-gray-500 mt-2 mb-6">
                Follow stores to stay updated on their deals
              </p>
              <Link to={createPageUrl("Browse")}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Find Stores
                </Button>
              </Link>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
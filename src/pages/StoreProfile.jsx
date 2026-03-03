import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Store,
  Heart,
  Share2,
  Navigation,
  Tag,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import ProductCard from "@/components/ui/ProductCard";

export default function StoreProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const storeId = urlParams.get('id');

  const [user, setUser] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savedProducts, setSavedProducts] = useState([]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const authenticated = await base44.auth.isAuthenticated();
    if (authenticated) {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsSaved(currentUser.saved_stores?.includes(storeId) || false);
      setSavedProducts(currentUser.saved_products || []);
    }
  };

  const { data: store, isLoading: loadingStore } = useQuery({
    queryKey: ['store', storeId],
    queryFn: async () => {
      const stores = await base44.entities.Store.filter({ id: storeId });
      return stores[0];
    },
    enabled: !!storeId,
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['storeProducts', storeId],
    queryFn: () => base44.entities.Product.filter({ store_id: storeId, is_available: true }),
    enabled: !!storeId,
  });

  const handleSaveStore = async () => {
    if (!user) return;

    const newSaved = isSaved
      ? (user.saved_stores || []).filter(id => id !== storeId)
      : [...(user.saved_stores || []), storeId];

    setIsSaved(!isSaved);
    await base44.auth.updateMe({ saved_stores: newSaved });
  };

  const handleSaveProduct = async (productId) => {
    if (!user) return;

    const newSaved = savedProducts.includes(productId)
      ? savedProducts.filter(id => id !== productId)
      : [...savedProducts, productId];

    setSavedProducts(newSaved);
    await base44.auth.updateMe({ saved_products: newSaved });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: store?.name,
        text: `Check out ${store?.name} on GOOBY - ${store?.discount_range} off!`,
        url: window.location.href,
      });
    }
  };

  if (loadingStore) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse mb-8" />
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Store not found</h1>
        <p className="text-gray-500 mt-2">This store may no longer be available</p>
        <Link to={createPageUrl("Browse")}>
          <Button className="mt-6">Browse Other Stores</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div className="relative h-48 md:h-72 bg-gradient-to-br from-blue-500 to-blue-600">
        {store.cover_image_url && (
          <img
            src={store.cover_image_url}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Back Button */}
        <Link to={createPageUrl("Browse")} className="absolute top-4 left-4">
          <Button variant="secondary" size="icon" className="rounded-full bg-white/90 hover:bg-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>

        {/* Actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleShare}
            className="rounded-full bg-white/90 hover:bg-white"
          >
            <Share2 className="w-5 h-5" />
          </Button>
          {user && (
            <Button
              variant="secondary"
              size="icon"
              onClick={handleSaveStore}
              className={`rounded-full bg-white/90 hover:bg-white ${isSaved ? 'text-red-500' : ''}`}
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Store Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-blue-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg flex-shrink-0 -mt-16 md:-mt-20">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-blue-600">{store.name?.[0]}</span>
              )}
            </div>

            {/* Details */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{store.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {store.category && (
                      <Badge variant="secondary" className="capitalize">
                        {store.category.replace("_", " ")}
                      </Badge>
                    )}
                    {store.discount_range && (
                      <Badge className="bg-red-500 hover:bg-red-500 text-white">
                        {store.discount_range}
                      </Badge>
                    )}
                  </div>
                </div>

                {store.closing_date && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Closing Date</p>
                    <p className="text-lg font-semibold text-red-600">
                      {format(new Date(store.closing_date), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}
              </div>

              {store.description && (
                <p className="text-gray-600 mt-4">{store.description}</p>
              )}

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 mt-6">
                {store.address && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>{store.address}, {store.city}, {store.state} {store.zip_code}</span>
                  </div>
                )}
                {store.phone && (
                  <a href={`tel:${store.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span>{store.phone}</span>
                  </a>
                )}
                {store.email && (
                  <a href={`mailto:${store.email}`} className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>{store.email}</span>
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                {store.latitude && store.longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Navigation className="w-4 h-4 mr-2" />
                      Get Directions
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="mt-8 pb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Available Products ({products.length})
            </h2>
          </div>

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
                  onSave={user ? handleSaveProduct : null}
                  isSaved={savedProducts.includes(product.id)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No products listed yet</h3>
              <p className="text-gray-500 mt-2">Check back soon for new items</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
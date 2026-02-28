import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Heart,
  Share2,
  MapPin,
  Store,
  Tag,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Navigation
} from "lucide-react";

export default function ProductDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  const [user, setUser] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const authenticated = await base44.auth.isAuthenticated();
    if (authenticated) {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsSaved(currentUser.saved_products?.includes(productId) || false);
    }
  };

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const products = await base44.entities.Product.filter({ id: productId });
      return products[0];
    },
    enabled: !!productId,
  });

  const { data: store } = useQuery({
    queryKey: ['productStore', product?.store_id],
    queryFn: async () => {
      const stores = await base44.entities.Store.filter({ id: product.store_id });
      return stores[0];
    },
    enabled: !!product?.store_id,
  });

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['relatedProducts', product?.category, product?.store_id],
    queryFn: () => base44.entities.Product.filter({ 
      store_id: product.store_id, 
      is_available: true 
    }),
    enabled: !!product?.store_id,
  });

  const handleSave = async () => {
    if (!user) return;

    const newSaved = isSaved
      ? (user.saved_products || []).filter(id => id !== productId)
      : [...(user.saved_products || []), productId];

    setIsSaved(!isSaved);
    await base44.auth.updateMe({ saved_products: newSaved });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: `Check out ${product?.name} - ${discountPercent}% off!`,
        url: window.location.href,
      });
    }
  };

  if (loadingProduct) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-gray-100 rounded animate-pulse" />
            <div className="h-6 w-1/2 bg-gray-100 rounded animate-pulse" />
            <div className="h-24 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
        <p className="text-gray-500 mt-2">This product may no longer be available</p>
        <Link to={createPageUrl("Browse")}>
          <Button className="mt-6">Browse Products</Button>
        </Link>
      </div>
    );
  }

  const discountPercent = product.discount_percent || 
    Math.round(((product.original_price - product.sale_price) / product.original_price) * 100);

  const images = product.images?.length > 0 ? product.images : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <Link to={createPageUrl("Browse")} className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Browse
      </Link>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden">
            {images.length > 0 ? (
              <img
                src={images[currentImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tag className="w-24 h-24 text-gray-300" />
              </div>
            )}

            {/* Discount Badge */}
            <div className="absolute top-4 left-4">
              <Badge className="bg-red-500 hover:bg-red-500 text-white font-bold px-4 py-2 text-lg shadow-lg">
                {discountPercent}% OFF
              </Badge>
            </div>

            {/* Image Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImage(prev => prev === 0 ? images.length - 1 : prev - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setCurrentImage(prev => prev === images.length - 1 ? 0 : prev + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImage(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                    currentImage === idx ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {/* Store Link */}
          {store && (
            <Link to={createPageUrl(`StoreProfile?id=${store.id}`)} className="inline-flex items-center gap-2 mb-4 text-gray-600 hover:text-blue-600">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                {store.logo_url ? (
                  <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <span className="font-medium">{store.name}</span>
              {store.city && (
                <span className="text-gray-400 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {store.city}
                </span>
              )}
            </Link>
          )}

          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

          {/* Price */}
          <div className="mt-4 flex items-baseline gap-4">
            <span className="text-4xl font-bold text-blue-600">
              ${product.sale_price?.toFixed(2)}
            </span>
            {product.original_price && (
              <span className="text-xl text-gray-400 line-through">
                ${product.original_price?.toFixed(2)}
              </span>
            )}
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              Save ${(product.original_price - product.sale_price).toFixed(2)}
            </Badge>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {product.category && (
              <Badge variant="secondary" className="capitalize">
                {product.category.replace("_", " ")}
              </Badge>
            )}
            {product.condition && (
              <Badge variant="outline" className="capitalize">
                {product.condition.replace("_", " ")}
              </Badge>
            )}
            {product.quantity > 0 && (
              <Badge variant="outline">
                {product.quantity} available
              </Badge>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            {user && (
              <Button
                variant="outline"
                onClick={handleSave}
                className={`rounded-xl ${isSaved ? 'text-red-500 border-red-200' : ''}`}
              >
                <Heart className={`w-5 h-5 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            )}
            <Button variant="outline" onClick={handleShare} className="rounded-xl">
              <Share2 className="w-5 h-5 mr-2" />
              Share
            </Button>
          </div>

          {/* Store Card */}
          {store && (
            <Card className="mt-8 p-6 bg-blue-50 border-blue-100">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{store.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{store.address}, {store.city}</p>
                  {store.discount_range && (
                    <Badge className="mt-2 bg-red-500 hover:bg-red-500">{store.discount_range}</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Link to={createPageUrl(`StoreProfile?id=${store.id}`)} className="flex-1">
                  <Button variant="outline" className="w-full bg-white">View Store</Button>
                </Link>
                {store.latitude && store.longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Navigation className="w-4 h-4 mr-2" />
                      Directions
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.filter(p => p.id !== productId).length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold text-gray-900 mb-6">More from this Store</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.filter(p => p.id !== productId).slice(0, 4).map((p) => (
              <Link key={p.id} to={createPageUrl(`ProductDetail?id=${p.id}`)}>
                <Card className="overflow-hidden hover:shadow-lg transition-all">
                  <div className="aspect-square bg-gray-100">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Tag className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 truncate">{p.name}</h3>
                    <p className="text-blue-600 font-bold">${p.sale_price?.toFixed(2)}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
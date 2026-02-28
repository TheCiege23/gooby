import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Tag } from "lucide-react";

export default function ProductCard({ product, store, onSave, isSaved }) {
  const discountPercent = product.discount_percent || 
    Math.round(((product.original_price - product.sale_price) / product.original_price) * 100);

  return (
    <Card className="group overflow-hidden bg-white hover:shadow-xl transition-all duration-300 border-0 shadow-md">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
            <Tag className="w-12 h-12 text-blue-300" />
          </div>
        )}
        
        {/* Discount Badge */}
        <div className="absolute top-3 left-3">
          <Badge className="bg-red-500 hover:bg-red-500 text-white font-bold px-3 py-1 text-sm shadow-lg">
            {discountPercent}% OFF
          </Badge>
        </div>

        {/* Save Button */}
        {onSave && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              onSave(product.id);
            }}
            className={`absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md ${
              isSaved ? "text-red-500" : "text-gray-400"
            }`}
          >
            <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
          </Button>
        )}
      </div>

      <Link to={createPageUrl(`ProductDetail?id=${product.id}`)}>
        <div className="p-4">
          {/* Store Info */}
          {store && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                {store.logo_url ? (
                  <img src={store.logo_url} alt={store.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-blue-600">{store.name?.[0]}</span>
                )}
              </div>
              <span className="text-xs text-gray-500 truncate">{store.name}</span>
              {store.city && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {store.city}
                </span>
              )}
            </div>
          )}

          {/* Product Info */}
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-blue-600">
              ${product.sale_price?.toFixed(2)}
            </span>
            {product.original_price && (
              <span className="text-sm text-gray-400 line-through">
                ${product.original_price?.toFixed(2)}
              </span>
            )}
          </div>

          {product.condition && product.condition !== "new" && (
            <Badge variant="outline" className="mt-2 text-xs capitalize">
              {product.condition.replace("_", " ")}
            </Badge>
          )}
        </div>
      </Link>
    </Card>
  );
}
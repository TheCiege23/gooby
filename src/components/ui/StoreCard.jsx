import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Store, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function StoreCard({ store, productCount }) {
  return (
    <Card className="group overflow-hidden bg-white hover:shadow-xl transition-all duration-300 border-0 shadow-md">
      {/* Cover Image */}
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600">
        {store.cover_image_url ? (
          <img
            src={store.cover_image_url}
            alt={store.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Store className="w-12 h-12 text-white/50" />
          </div>
        )}
        
        {/* Discount Badge */}
        {store.discount_range && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-red-500 hover:bg-red-500 text-white font-bold px-3 py-1 shadow-lg">
              {store.discount_range}
            </Badge>
          </div>
        )}

        {/* Logo */}
        <div className="absolute -bottom-6 left-4">
          <div className="w-14 h-14 rounded-xl bg-white shadow-lg flex items-center justify-center overflow-hidden border-2 border-white">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-blue-600">{store.name?.[0]}</span>
            )}
          </div>
        </div>
      </div>

      <Link to={createPageUrl(`StoreProfile?id=${store.id}`)}>
        <div className="p-4 pt-8">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                {store.name}
              </h3>
              
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <MapPin className="w-4 h-4" />
                <span>{store.city}, {store.state}</span>
              </div>
            </div>

            {store.category && (
              <Badge variant="secondary" className="capitalize text-xs">
                {store.category.replace("_", " ")}
              </Badge>
            )}
          </div>

          {store.description && (
            <p className="text-sm text-gray-600 mt-3 line-clamp-2">
              {store.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {store.closing_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Closes {format(new Date(store.closing_date), "MMM d")}
                </span>
              )}
              {productCount !== undefined && (
                <span>{productCount} items</span>
              )}
            </div>

            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 p-0 h-auto">
              View Store <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </Link>
    </Card>
  );
}
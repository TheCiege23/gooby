import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Navigation, Store, ArrowRight, Loader2 } from "lucide-react";

const GOOGLE_MAPS_API_KEY = "AIzaSyDg7MzjazFeTvgbDwEGKzdFQgu-5iKSxOE";

function loadGoogleMapsScript() {
  return new Promise((resolve) => {
    if (window.google && window.google.maps) return resolve();
    const existing = document.querySelector('script[data-gm-script]');
    if (existing) {
      existing.addEventListener('load', resolve);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=maps,marker&v=beta`;
    script.async = true;
    script.setAttribute('data-gm-script', 'true');
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

export default function MapView() {
  const [searchLocation, setSearchLocation] = useState("");
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]); // NYC default
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.filter({ is_active: true }),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ is_available: true }),
  });

  const categories = [
    { label: "All Categories", value: "" },
    { label: "Clothing", value: "clothing" },
    { label: "Electronics", value: "electronics" },
    { label: "Furniture", value: "furniture" },
    { label: "Home Goods", value: "home_goods" },
    { label: "Sports", value: "sports" },
  ];

  const filteredStores = stores.filter(store => {
    if (!store.latitude || !store.longitude) return false;
    if (selectedCategory && store.category !== selectedCategory) return false;
    return true;
  });

  const getProductCount = (storeId) => {
    return products.filter(p => p.store_id === storeId).length;
  };

  const getUserLocation = () => {
    setLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
          setLoadingLocation(false);
        },
        () => {
          setLoadingLocation(false);
        }
      );
    }
  };

  const customIcon = (color = '#3B82F6') => new L.DivIcon({
    html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.2);"></div>`,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Find Stores Near You</h1>
          
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by city or zip..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>

            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1 rounded-xl">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={getUserLocation}
                disabled={loadingLocation}
                className="rounded-xl"
              >
                {loadingLocation ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Navigation className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Store List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))
          ) : filteredStores.length > 0 ? (
            filteredStores.map((store) => (
              <Card
                key={store.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedStore?.id === store.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => {
                  setSelectedStore(store);
                  setMapCenter([store.latitude, store.longitude]);
                }}
              >
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      <Store className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{store.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {store.city}, {store.state}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {store.discount_range && (
                        <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                          {store.discount_range}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-400">
                        {getProductCount(store.id)} items
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No stores found in this area</p>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <ChangeView center={mapCenter} zoom={12} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {userLocation && (
            <Marker 
              position={userLocation}
              icon={new L.DivIcon({
                html: `<div style="background-color: #10B981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
                className: 'user-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              })}
            >
              <Popup>Your location</Popup>
            </Marker>
          )}

          {filteredStores.map((store) => (
            <Marker
              key={store.id}
              position={[store.latitude, store.longitude]}
              icon={customIcon(selectedStore?.id === store.id ? '#EF4444' : '#3B82F6')}
              eventHandlers={{
                click: () => setSelectedStore(store),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-gray-900">{store.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{store.address}</p>
                  {store.discount_range && (
                    <p className="text-sm font-semibold text-red-600 mt-2">
                      {store.discount_range} OFF
                    </p>
                  )}
                  <Link to={createPageUrl(`StoreProfile?id=${store.id}`)}>
                    <Button size="sm" className="w-full mt-3">
                      View Store <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Selected Store Card (Mobile) */}
        {selectedStore && (
          <div className="absolute bottom-4 left-4 right-4 md:hidden">
            <Card className="p-4 bg-white shadow-xl">
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  {selectedStore.logo_url ? (
                    <img src={selectedStore.logo_url} alt={selectedStore.name} className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <Store className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{selectedStore.name}</h3>
                  <p className="text-sm text-gray-500">{selectedStore.address}</p>
                  <Link to={createPageUrl(`StoreProfile?id=${selectedStore.id}`)}>
                    <Button size="sm" className="mt-2">
                      View Store <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <button 
                  onClick={() => setSelectedStore(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
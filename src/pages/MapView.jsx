import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Navigation, Store, ArrowRight, Loader2 } from "lucide-react";

const GOOGLE_MAPS_API_KEY = "AIzaSyDg7MzjazFeTvgbDwEGKzdFQgu-5iKSxOE";

function loadExtendedComponents() {
  return new Promise((resolve) => {
    // Inject API loader once
    if (!document.querySelector('gmpx-api-loader')) {
      const loader = document.createElement('gmpx-api-loader');
      loader.setAttribute('key', GOOGLE_MAPS_API_KEY);
      loader.setAttribute('solution-channel', 'GMP_GE_mapsandplacesautocomplete_v2');
      document.body.appendChild(loader);
    }

    if (customElements.get('gmp-map')) return resolve();
    const existing = document.querySelector('script[data-gmpx-script]');
    if (existing) {
      customElements.whenDefined('gmp-map').then(resolve);
      return;
    }
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.11/index.min.js";
    script.setAttribute('data-gmpx-script', 'true');
    document.head.appendChild(script);
    customElements.whenDefined('gmp-map').then(resolve);
  });
}

export default function MapView() {
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [ready, setReady] = useState(false);
  const gmpMapRef = useRef(null);
  const placePickerRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markersRef = useRef({});
  const clustersRef = useRef({});

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.filter({ is_active: true }),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ is_available: true }),
  });

  const { data: closures = [] } = useQuery({
    queryKey: ['imported-stores'],
    queryFn: () => base44.entities.ImportedStore.filter({ status: "approved" }, "-created_date", 500),
  });

  const categories = [
    { label: "All Categories", value: "" },
    { label: "Clothing & Fashion", value: "clothing" },
    { label: "Electronics", value: "electronics" },
  ];

  const STATE_COLORS = {
    NY: "#3B82F6",
    NJ: "#10B981",
    CT: "#A855F7",
    PA: "#F97316"
  };

  const filteredStores = stores.filter(store => {
    if (!store.latitude || !store.longitude) return false;
    if (selectedCategory && store.category !== selectedCategory) return false;
    return true;
  });

  const filteredClosures = closures.filter(c => {
    if (!c.latitude || !c.longitude) return false;
    if (selectedState && c.state !== selectedState) return false;
    return true;
  });

  const getProductCount = (storeId) => products.filter(p => p.store_id === storeId).length;

  // Load extended components
  useEffect(() => {
    loadExtendedComponents().then(() => setReady(true));
  }, []);

  // Setup place picker listener after ready
  useEffect(() => {
    if (!ready) return;

    const picker = placePickerRef.current;
    if (!picker) return;

    const handlePlaceChange = () => {
      const place = picker.value;
      const map = gmpMapRef.current;
      if (!map) return;

      if (!place.location) return;

      const innerMap = map.innerMap;
      if (place.viewport) {
        innerMap.fitBounds(place.viewport);
      } else {
        map.center = place.location;
        map.zoom = 14;
      }
    };

    picker.addEventListener('gmpx-placechange', handlePlaceChange);
    return () => picker.removeEventListener('gmpx-placechange', handlePlaceChange);
  }, [ready]);

  // Add/update markers when filtered stores/closures change
  useEffect(() => {
    if (!ready || !gmpMapRef.current) return;

    const map = gmpMapRef.current;
    const innerMap = map.innerMap;
    if (!innerMap) return;

    const { AdvancedMarkerElement } = window.google?.maps?.marker || {};
    if (!AdvancedMarkerElement) return;

    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    // Remove old markers
    Object.values(markersRef.current).forEach(m => (m.map = null));
    markersRef.current = {};

    // Add store markers
    filteredStores.forEach(store => {
      const pin = document.createElement('div');
      pin.style.cssText = `
        background: ${selectedStore?.id === store.id ? '#EF4444' : '#3B82F6'};
        width: 30px; height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        cursor: pointer;
      `;

      const marker = new AdvancedMarkerElement({
        map: innerMap,
        position: { lat: store.latitude, lng: store.longitude },
        content: pin,
        title: store.name,
      });

      marker.addListener('click', () => {
        setSelectedStore(store);
        innerMap.panTo({ lat: store.latitude, lng: store.longitude });
        const productCount = products.filter(p => p.store_id === store.id).length;
        infoWindowRef.current.setContent(`
          <div style="padding:8px; min-width:200px; font-family:sans-serif;">
            <h3 style="font-weight:700; margin:0 0 4px 0;">${store.name}</h3>
            <p style="color:#6B7280; margin:0 0 4px 0; font-size:13px;">${store.address || ''}</p>
            ${store.discount_range ? `<p style="color:#DC2626; font-weight:600; margin:4px 0; font-size:13px;">${store.discount_range} OFF</p>` : ''}
            <p style="color:#6B7280; font-size:12px; margin:4px 0;">${productCount} item${productCount !== 1 ? 's' : ''} available</p>
            <a href="/StoreProfile?id=${store.id}" style="display:block; margin-top:8px; background:#3B82F6; color:white; text-align:center; padding:6px 12px; border-radius:6px; text-decoration:none; font-size:13px;">View Store →</a>
          </div>
        `);
        infoWindowRef.current.open(innerMap, marker);
      });

      markersRef.current[store.id] = marker;
    });

    // Add closure markers (state-colored)
    filteredClosures.forEach(closure => {
      const stateColor = STATE_COLORS[closure.state] || "#6B7280";
      const pin = document.createElement('div');
      pin.style.cssText = `
        background: ${stateColor};
        width: 28px; height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        cursor: pointer;
        opacity: 0.8;
      `;

      const marker = new AdvancedMarkerElement({
        map: innerMap,
        position: { lat: closure.latitude, lng: closure.longitude },
        content: pin,
        title: closure.name,
      });

      marker.addListener('click', () => {
        infoWindowRef.current.setContent(`
          <div style="padding:8px; min-width:220px; font-family:sans-serif;">
            <h3 style="font-weight:700; margin:0 0 4px 0;">${closure.name}</h3>
            <p style="color:#6B7280; margin:0 0 4px 0; font-size:13px;">${closure.address || closure.city}</p>
            <p style="color:#999; font-size:12px; margin:4px 0;"><strong>${closure.state}</strong></p>
            ${closure.closure_signals?.length > 0 ? `<p style="color:#DC2626; font-size:12px; margin:4px 0;">Signals: ${closure.closure_signals.join(', ')}</p>` : ''}
            ${closure.confidence_score ? `<p style="color:#059669; font-size:12px; margin:4px 0;">Confidence: <strong>${closure.confidence_score}</strong></p>` : ''}
          </div>
        `);
        infoWindowRef.current.open(innerMap, marker);
      });

      markersRef.current[closure.id] = marker;
    });
  }, [filteredStores, filteredClosures, ready, selectedStore, products]);

  const getUserLocation = () => {
    setLoadingLocation(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const map = gmpMapRef.current;
        if (map) {
          map.center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          map.zoom = 13;
        }
        setLoadingLocation(false);
      },
      () => {
        // Default to Sayreville, NJ
        const map = gmpMapRef.current;
        if (map) {
          map.center = { lat: 40.4594, lng: -74.3608 };
          map.zoom = 11;
        }
        setLoadingLocation(false);
      }
    );
  };

  const handleStoreClick = (store) => {
    setSelectedStore(store);
    const map = gmpMapRef.current;
    if (map) {
      map.center = { lat: store.latitude, lng: store.longitude };
      map.zoom = 14;
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Find Stores & Closures</h1>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1 rounded-xl text-sm">
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

            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-full rounded-xl text-sm">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All States</SelectItem>
                <SelectItem value="NY">New York</SelectItem>
                <SelectItem value="NJ">New Jersey</SelectItem>
                <SelectItem value="CT">Connecticut</SelectItem>
                <SelectItem value="PA">Pennsylvania</SelectItem>
              </SelectContent>
            </Select>

            {/* State color legend */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
              {Object.entries(STATE_COLORS).map(([state, color]) => (
                <div key={state} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-gray-600">{state}</span>
                </div>
              ))}
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
                onClick={() => handleStoreClick(store)}
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

      {/* Map with built-in place picker slot */}
      <div className="flex-1 relative">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        )}

        {ready && (
          <gmp-map
            ref={gmpMapRef}
            center="40.7128,-74.006"
            zoom="10"
            map-id="DEMO_MAP_ID"
            style={{ width: '100%', height: '100%' }}
          >
            <div slot="control-block-start-inline-start" style={{ padding: '10px' }}>
              <gmpx-place-picker
                ref={placePickerRef}
                placeholder="Search for a city or address..."
                style={{ width: '320px' }}
              />
            </div>
            <gmp-advanced-marker></gmp-advanced-marker>
          </gmp-map>
        )}

        {/* Selected Store Card (Mobile) */}
        {selectedStore && (
          <div className="absolute bottom-4 left-4 right-4 md:hidden z-10">
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
                <button onClick={() => setSelectedStore(null)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
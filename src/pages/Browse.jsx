import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Search, 
  SlidersHorizontal, 
  X,
  Grid3X3,
  Store,
  MapPin,
  Flag
} from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import StoreCard from "@/components/ui/StoreCard";
import AIMatchPanel from "@/components/buyer/AIMatchPanel";
import ReportClosureModal from "@/components/crowdsource/ReportClosureModal";
import { EXTENDED_CATEGORIES, normalizeCategory, isTargetState } from "@/components/marketConfig";

export default function Browse() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialSearch = urlParams.get('search') || '';
  const initialCategory = urlParams.get('category') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedState, setSelectedState] = useState("");
  const [locationFilter, setLocationFilter] = useState(urlParams.get('location') || '');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [minDiscount, setMinDiscount] = useState(0);
  const [sortBy, setSortBy] = useState('proximity');
  const [viewMode, setViewMode] = useState('products');
  const [user, setUser] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [savedProducts, setSavedProducts] = useState([]);
  const [userLat, setUserLat] = useState(40.4594);
  const [userLng, setUserLng] = useState(-74.3608);

  useEffect(() => {
    loadUser();
    // Try to get user's actual location
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      () => {
        // Default to Sayreville, NJ
      }
    );
  }, []);

  const loadUser = async () => {
    const authenticated = await base44.auth.isAuthenticated();
    if (authenticated) {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setSavedProducts(currentUser.saved_products || []);
    }
  };

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ is_available: true }),
  });

  const { data: stores = [], isLoading: loadingStores } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const rows = await base44.entities.Store.filter({ is_active: true });
      return rows.filter((store) => isTargetState(store.state));
    },
  });

  const categories = [{ label: "All Categories", value: "" }, ...EXTENDED_CATEGORIES];

  const calculateDistance = (lat, lng) => {
    if (!lat || !lng) return Infinity;
    const R = 3959;
    const dLat = ((lat - userLat) * Math.PI) / 180;
    const dLng = ((lng - userLng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((userLat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || normalizeCategory(product.category) === selectedCategory;
    
    const matchesPrice = product.sale_price >= priceRange[0] && product.sale_price <= priceRange[1];
    
    const discount = product.discount_percent || 
      (product.original_price ? Math.round(((product.original_price - product.sale_price) / product.original_price) * 100) : 0);
    const matchesDiscount = discount >= minDiscount;

    // Location filter — match against store city/state/zip
    const store = storeMap[product.store_id];
    const loc = locationFilter.toLowerCase();
    const matchesLocation = !locationFilter || 
      store?.city?.toLowerCase().includes(loc) ||
      store?.state?.toLowerCase().includes(loc) ||
      store?.zip_code?.includes(loc);

    // State filter
    const matchesState = !selectedState || store?.state === selectedState;
    const matchesTargetState = isTargetState(store?.state);

    return matchesSearch && matchesCategory && matchesPrice && matchesDiscount && matchesLocation && matchesState && matchesTargetState;
  }).map(p => ({
    ...p,
    distance: calculateDistance(storeMap[p.store_id]?.latitude, storeMap[p.store_id]?.longitude)
  })).sort((a, b) => {
    switch (sortBy) {
      case 'proximity':
        return a.distance - b.distance;
      case 'price_low':
        return a.sale_price - b.sale_price;
      case 'price_high':
        return b.sale_price - a.sale_price;
      case 'discount':
        return (b.discount_percent || 0) - (a.discount_percent || 0);
      default:
        return new Date(b.created_date) - new Date(a.created_date);
    }
  });

  const filteredStores = stores.filter(store => {
    const matchesSearch = !searchQuery || 
      store.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.city?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || normalizeCategory(store.category) === selectedCategory;

    const loc = locationFilter.toLowerCase();
    const matchesLocation = !locationFilter ||
      store.city?.toLowerCase().includes(loc) ||
      store.state?.toLowerCase().includes(loc) ||
      store.zip_code?.includes(loc);

    const matchesState = !selectedState || store.state === selectedState;
    const matchesTargetState = isTargetState(store.state);

    return matchesSearch && matchesCategory && matchesLocation && matchesState && matchesTargetState;
  }).map(s => ({
    ...s,
    distance: calculateDistance(s.latitude, s.longitude)
  })).sort((a, b) => {
    if (sortBy === 'proximity') return a.distance - b.distance;
    return 0;
  });

  const storeMap = stores.reduce((acc, store) => {
    acc[store.id] = store;
    return acc;
  }, {});

  const handleSaveProduct = async (productId) => {
    if (!user) return;
    
    const newSaved = savedProducts.includes(productId)
      ? savedProducts.filter(id => id !== productId)
      : [...savedProducts, productId];
    
    setSavedProducts(newSaved);
    await base44.auth.updateMe({ saved_products: newSaved });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedState('');
    setLocationFilter('');
    setPriceRange([0, 1000]);
    setMinDiscount(0);
  };

  const hasActiveFilters = searchQuery || selectedCategory || selectedState || locationFilter || priceRange[0] > 0 || priceRange[1] < 1000 || minDiscount > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Browse Deals</h1>
          <p className="text-gray-500 mt-2">Find amazing discounts from closing stores</p>
        </div>
        <Button
          variant="outline"
          className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-full"
          onClick={() => setReportOpen(true)}
        >
          <Flag className="w-4 h-4 mr-2" />
          Report a Closure
        </Button>
      </div>

      <ReportClosureModal open={reportOpen} onClose={() => setReportOpen(false)} />

      {/* AI Match Panel (buyers only) */}
      {user && user.role !== 'seller' && products.length > 0 && (
        <AIMatchPanel
          user={user}
          products={products}
          stores={stores}
          savedProducts={savedProducts}
          onSaveProduct={handleSaveProduct}
        />
      )}

      {/* Search & Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search products or stores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl border-gray-200"
          />
        </div>

        <div className="relative md:w-48">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="City or zip..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="pl-10 h-12 rounded-xl border-gray-200"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-48 h-12 rounded-xl">
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

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48 h-12 rounded-xl">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="proximity">Nearest First</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price_low">Price: Low to High</SelectItem>
            <SelectItem value="price_high">Price: High to Low</SelectItem>
            <SelectItem value="discount">Biggest Discount</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedState} onValueChange={setSelectedState}>
          <SelectTrigger className="w-full md:w-40 h-12 rounded-xl">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All States</SelectItem>
            <SelectItem value="NY">New York</SelectItem>
            <SelectItem value="NJ">New Jersey</SelectItem>
            <SelectItem value="CT">Connecticut</SelectItem>
            <SelectItem value="PA">Pennsylvania</SelectItem>
          </SelectContent>
        </Select>

        {/* Mobile Filters */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-12 rounded-xl md:hidden">
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Price Range</label>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={1000}
                  step={10}
                  className="mt-4"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Minimum Discount</label>
                <Slider
                  value={[minDiscount]}
                  onValueChange={(v) => setMinDiscount(v[0])}
                  max={90}
                  step={10}
                  className="mt-4"
                />
                <p className="text-sm text-gray-500 mt-2">{minDiscount}% or more</p>
              </div>

              <Button onClick={clearFilters} variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* View Toggle & Active Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'products' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('products')}
            className="rounded-full"
          >
            <Grid3X3 className="w-4 h-4 mr-2" />
            Products
          </Button>
          <Button
            variant={viewMode === 'stores' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('stores')}
            className="rounded-full"
          >
            <Store className="w-4 h-4 mr-2" />
            Stores
          </Button>
        </div>

        {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedCategory && (
            <Badge variant="secondary" className="rounded-full pl-3">
              {categories.find(c => c.value === selectedCategory)?.label}
              <button onClick={() => setSelectedCategory('')} className="ml-2"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {selectedState && (
            <Badge variant="secondary" className="rounded-full pl-3">
              {selectedState}
              <button onClick={() => setSelectedState('')} className="ml-2"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {locationFilter && (
            <Badge variant="secondary" className="rounded-full pl-3">
              <MapPin className="w-3 h-3 mr-1" />{locationFilter}
              <button onClick={() => setLocationFilter('')} className="ml-2"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {minDiscount > 0 && (
            <Badge variant="secondary" className="rounded-full pl-3">
              {minDiscount}%+ off
              <button onClick={() => setMinDiscount(0)} className="ml-2"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-blue-600">
            Clear all
          </Button>
        </div>
        )}
      </div>

      {/* Desktop Sidebar Filters */}
      <div className="flex gap-8">
        <div className="hidden md:block w-64 flex-shrink-0">
          <div className="sticky top-24 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold mb-4">Filters</h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-3 block">Price Range</label>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={1000}
                  step={10}
                />
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">Minimum Discount</label>
                <Slider
                  value={[minDiscount]}
                  onValueChange={(v) => setMinDiscount(v[0])}
                  max={90}
                  step={10}
                />
                <p className="text-sm text-gray-500 mt-2">{minDiscount}% or more</p>
              </div>

              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1">
          {viewMode === 'products' ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {filteredProducts.length} products found
              </p>
              
              {loadingProducts ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      store={storeMap[product.store_id]}
                      onSave={user ? handleSaveProduct : null}
                      isSaved={savedProducts.includes(product.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">No products found</h3>
                  <p className="text-gray-500 mt-2">Try adjusting your filters or search terms</p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {filteredStores.length} stores found
              </p>
              
              {loadingStores ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredStores.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {filteredStores.map((store) => (
                    <StoreCard key={store.id} store={store} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Store className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">No stores found</h3>
                  <p className="text-gray-500 mt-2">Try adjusting your filters or search terms</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
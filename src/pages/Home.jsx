import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Tag, 
  Store, 
  Sparkles, 
  ArrowRight,
  TrendingDown,
  Flag
} from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import StoreCard from "@/components/ui/StoreCard";
import ReportClosureModal from "@/components/crowdsource/ReportClosureModal";
import NearbyClosure from "@/components/buyer/NearbyClosure";
import BetaSignupForm from "@/components/buyer/BetaSignupForm";
import GoobyWordmark from "@/components/brand/GoobyWordmark";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const authenticated = await base44.auth.isAuthenticated();
    if (authenticated) {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    }
  };

  const { data: featuredProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: () => base44.entities.Product.filter({ is_available: true }, '-created_date', 8),
  });

  const { data: stores = [], isLoading: loadingStores } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.filter({ is_active: true }, '-created_date', 6),
  });

  const { data: storeProducts = {} } = useQuery({
    queryKey: ['storeProducts', stores],
    queryFn: async () => {
      const storeMap = {};
      for (const store of stores) {
        storeMap[store.id] = store;
      }
      return storeMap;
    },
    enabled: stores.length > 0,
  });

  const categories = [
    { name: "Clothing", icon: "👕", value: "clothing" },
    { name: "Electronics", icon: "📱", value: "electronics" },
    { name: "Shoes", icon: "👟", value: "shoes" },
    { name: "Accessories", icon: "👜", value: "accessories" },
    { name: "Food", icon: "🍎", value: "food" },
    { name: "Home Goods", icon: "🏠", value: "home_goods" },
    { name: "Jewelry", icon: "💎", value: "jewelry" },
    { name: "Other", icon: "🛍️", value: "other" },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    window.location.href = createPageUrl(`Browse?search=${searchQuery}`);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-blue-500/80" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-32">
          <div className="max-w-3xl">
            <div className="mb-4"><GoobyWordmark large /></div>
            <Badge className="bg-white/20 text-white hover:bg-white/30 mb-6">
              <Sparkles className="w-3 h-3 mr-1" />
              Save up to 90% on amazing deals
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              Discover Amazing Deals from
              <span className="block text-blue-200">Closing Stores Near You</span>
            </h1>
            
            <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-xl">
              Find incredible discounts on quality merchandise from retail stores winding down. 
              Your next treasure is waiting.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-3 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search for products or stores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-lg rounded-2xl border-0 bg-white text-gray-900 placeholder:text-gray-400 shadow-2xl"
                />
              </div>
              <Button 
                type="submit"
                size="lg" 
                className="h-14 px-8 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white shadow-2xl"
              >
                Search
              </Button>
            </form>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-6 mt-10">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stores.length}+</p>
                  <p className="text-sm text-blue-200">Active Stores</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{featuredProducts.length}+</p>
                  <p className="text-sm text-blue-200">Products</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">70%</p>
                  <p className="text-sm text-blue-200">Avg Savings</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" className="w-full h-auto">
            <path d="M0 100V50C240 0 480 0 720 25C960 50 1200 100 1440 75V100H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.value}
              to={createPageUrl(`Browse?category=${cat.value}`)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white hover:bg-blue-50 hover:shadow-lg transition-all border border-gray-100 group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">{cat.icon}</span>
              <span className="text-xs font-medium text-gray-600 text-center">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Hot Deals</h2>
            <p className="text-gray-500 mt-1">Fresh discounts just added</p>
          </div>
          <Link to={createPageUrl("Browse")}>
            <Button variant="outline" className="rounded-full">
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {loadingProducts ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                store={stores.find(s => s.id === product.store_id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Nearby Closures */}
      <NearbyClosure />

      {/* Closing Soon Stores */}
      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Stores Closing Soon</h2>
            <p className="text-gray-500 mt-1">Don't miss these final sales</p>
          </div>
          <Link to={createPageUrl("Browse")}>
            <Button variant="outline" className="rounded-full">
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {loadingStores ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {stores.slice(0, 6).map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </section>

      {/* Beta Signup Section */}
      <section className="py-16 px-4 sm:px-6 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
              Now Expanding to More Areas
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Be First in Your Area
            </h2>
            <p className="text-lg text-gray-600">
              Join our free beta and discover incredible closing-store deals across NY, NJ, CT, and PA.
            </p>
          </div>

          <BetaSignupForm />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-blue-500 p-8 md:p-12 text-white text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Got a Store Closing Down?
              </h2>
              <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
                List your inventory on GOOBY and reach thousands of deal-hunters looking for your products.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to={createPageUrl("Settings")}>
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 rounded-full px-8">
                    <Store className="w-5 h-5 mr-2" />
                    Become a Seller
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white bg-transparent text-white hover:bg-white/15 rounded-full px-8"
                  onClick={() => setReportOpen(true)}
                >
                  <Flag className="w-5 h-5 mr-2" />
                  Report a Closure
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ReportClosureModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
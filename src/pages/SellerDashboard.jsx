import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Store, Package, BarChart3, Settings, CreditCard } from "lucide-react";
import SellerDashboardStats from "@/components/seller/SellerDashboardStats";
import CheckoutButton from "@/components/payments/CheckoutButton";
import PaymentNotification from "@/components/payments/PaymentNotification";

// Lazy-import the MyStore and MyProducts inline forms
import MyStoreForm from "@/components/seller/MyStoreForm";
import MyProductsList from "@/components/seller/MyProductsList";

export default function SellerDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const queryClient = useQueryClient();

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
    if (currentUser.role !== "seller") {
      window.location.href = createPageUrl("Settings");
      return;
    }
    setUser(currentUser);
    setLoading(false);
  };

  const { data: store, isLoading: loadingStore } = useQuery({
    queryKey: ["myStore", user?.id],
    queryFn: async () => {
      const stores = await base44.entities.Store.filter({ owner_id: user.id });
      return stores[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["myProducts", store?.id],
    queryFn: () => base44.entities.Product.filter({ store_id: store.id }),
    enabled: !!store?.id,
  });

  if (loading || loadingStore) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <PaymentNotification />
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {store ? `Managing ${store.name}` : "Set up your store to get started"}
          </p>
        </div>
        {store && (
          <Link to={createPageUrl(`StoreProfile?id=${store.id}`)}>
            <Button variant="outline">
              <Store className="w-4 h-4 mr-2" />
              View Public Store
            </Button>
          </Link>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg">
            <Package className="w-4 h-4 mr-2" />
            Inventory ({products.length})
          </TabsTrigger>
          <TabsTrigger value="store" className="rounded-lg">
            <Settings className="w-4 h-4 mr-2" />
            Store Details
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-lg">
            <CreditCard className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {store ? (
            <SellerDashboardStats
              store={store}
              products={products}
              onAddProduct={() => setActiveTab("products")}
            />
          ) : (
            <div className="text-center py-16">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">No store yet</h3>
              <p className="text-gray-500 mt-2 mb-6">Set up your store details first</p>
              <Button onClick={() => setActiveTab("store")} className="bg-blue-600 hover:bg-blue-700">
                Set Up Store
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products">
          <MyProductsList store={store} onStoreNeeded={() => setActiveTab("store")} />
        </TabsContent>

        <TabsContent value="store">
          <MyStoreForm user={user} onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["myStore"] });
            setActiveTab("overview");
          }} />
        </TabsContent>

        <TabsContent value="billing">
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Listing Fee</h2>
              <p className="text-gray-500 text-sm mb-4">
                Pay a one-time $9.99 fee to publish your store and start reaching buyers.
              </p>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 mb-4">
                <CreditCard className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900">$9.99 One-Time</p>
                  <p className="text-sm text-gray-500">Includes store listing + product uploads</p>
                </div>
              </div>
              <CheckoutButton
                type="listing_fee"
                label="Pay $9.99 Listing Fee"
                icon={CreditCard}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Commission Info</h2>
              <p className="text-gray-500 text-sm">
                A <strong>5% commission</strong> is applied on tracked sales made through GOOBY. No upfront cost — only pay when you sell.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
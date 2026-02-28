import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, 
  Store, 
  Bell, 
  MapPin, 
  Save,
  Loader2,
  CheckCircle,
  Upload,
  Star,
  CreditCard
} from "lucide-react";
import CheckoutButton from "@/components/payments/CheckoutButton";
import PaymentNotification from "@/components/payments/PaymentNotification";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [preferences, setPreferences] = useState({
    preferred_categories: [],
    preferred_location: "",
    max_distance_miles: 25,
    email_alerts: true,
  });

  const [becomeSellerMode, setBecomeSellerMode] = useState(false);

  const categories = [
    { label: "Clothing", value: "clothing" },
    { label: "Electronics", value: "electronics" },
    { label: "Furniture", value: "furniture" },
    { label: "Home Goods", value: "home_goods" },
    { label: "Sports", value: "sports" },
    { label: "Books", value: "books" },
    { label: "Jewelry", value: "jewelry" },
    { label: "Toys", value: "toys" },
  ];

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
    setPreferences({
      preferred_categories: currentUser.preferred_categories || [],
      preferred_location: currentUser.preferred_location || "",
      max_distance_miles: currentUser.max_distance_miles || 25,
      email_alerts: currentUser.email_alerts !== false,
    });
    setLoading(false);
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    await base44.auth.updateMe(preferences);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBecomeSeller = async () => {
    setSaving(true);
    await base44.auth.updateMe({ role: "seller" });
    await loadUser();
    setSaving(false);
    setBecomeSellerMode(false);
  };

  const toggleCategory = (category) => {
    setPreferences(prev => ({
      ...prev,
      preferred_categories: prev.preferred_categories.includes(category)
        ? prev.preferred_categories.filter(c => c !== category)
        : [...prev.preferred_categories, category]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-500 mb-8">Manage your account and preferences</p>

      <Tabs defaultValue="profile" className="space-y-8">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="profile" className="rounded-lg">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-lg">
            <Bell className="w-4 h-4 mr-2" />
            Preferences
          </TabsTrigger>
          {user?.role !== "seller" && (
            <TabsTrigger value="seller" className="rounded-lg">
              <Store className="w-4 h-4 mr-2" />
              Become a Seller
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your basic account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{user?.full_name}</h3>
                  <p className="text-gray-500">{user?.email}</p>
                  <Badge variant="secondary" className="mt-1 capitalize">
                    {user?.role || "buyer"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Deal Alerts</CardTitle>
                <CardDescription>Get notified about deals that match your interests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive deal alerts via email</p>
                  </div>
                  <Switch
                    checked={preferences.email_alerts}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, email_alerts: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categories of Interest</CardTitle>
                <CardDescription>Select categories you want to see deals for</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Badge
                      key={cat.value}
                      variant={preferences.preferred_categories.includes(cat.value) ? "default" : "outline"}
                      className="cursor-pointer px-4 py-2 text-sm"
                      onClick={() => toggleCategory(cat.value)}
                    >
                      {cat.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location Preferences</CardTitle>
                <CardDescription>Set your preferred search area</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>City or Zip Code</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Enter city or zip code"
                      value={preferences.preferred_location}
                      onChange={(e) => setPreferences(prev => ({ ...prev, preferred_location: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Maximum Distance</Label>
                  <Select
                    value={String(preferences.max_distance_miles)}
                    onValueChange={(val) => setPreferences(prev => ({ ...prev, max_distance_miles: parseInt(val) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 miles</SelectItem>
                      <SelectItem value="10">10 miles</SelectItem>
                      <SelectItem value="25">25 miles</SelectItem>
                      <SelectItem value="50">50 miles</SelectItem>
                      <SelectItem value="100">100 miles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleSavePreferences} 
              disabled={saving}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : saved ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saved ? "Saved!" : "Save Preferences"}
            </Button>
          </div>
        </TabsContent>

        {/* Become a Seller Tab */}
        {user?.role !== "seller" && (
          <TabsContent value="seller">
            <Card>
              <CardHeader>
                <CardTitle>Become a Seller</CardTitle>
                <CardDescription>
                  List your store's inventory and reach thousands of deal-seekers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50 text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                      <Store className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-semibold">Create Your Store</h4>
                    <p className="text-sm text-gray-600 mt-1">Set up your store profile with details and photos</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-semibold">Upload Inventory</h4>
                    <p className="text-sm text-gray-600 mt-1">Add products with photos and discount prices</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-semibold">Reach Buyers</h4>
                    <p className="text-sm text-gray-600 mt-1">Get discovered by local deal-seekers</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <p className="text-gray-600 mb-4">
                    Ready to start selling? Click below to upgrade your account to a seller account.
                  </p>
                  <Button 
                    onClick={handleBecomeSeller}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Store className="w-4 h-4 mr-2" />
                    )}
                    Become a Seller
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
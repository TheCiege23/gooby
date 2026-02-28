import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Store, 
  Save, 
  Loader2, 
  CheckCircle, 
  Upload,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Image,
  Package
} from "lucide-react";

export default function MyStore() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const queryClient = useQueryClient();

  const [storeData, setStoreData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    phone: "",
    email: "",
    category: "",
    closing_date: "",
    discount_range: "",
    logo_url: "",
    cover_image_url: "",
    latitude: null,
    longitude: null,
  });

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

  const { data: existingStore, isLoading: loadingStore } = useQuery({
    queryKey: ['myStore', user?.id],
    queryFn: async () => {
      const stores = await base44.entities.Store.filter({ owner_id: user.id });
      return stores[0] || null;
    },
    enabled: !!user?.id,
    onSuccess: (store) => {
      if (store) {
        setStoreData({
          name: store.name || "",
          description: store.description || "",
          address: store.address || "",
          city: store.city || "",
          state: store.state || "",
          zip_code: store.zip_code || "",
          phone: store.phone || "",
          email: store.email || "",
          category: store.category || "",
          closing_date: store.closing_date || "",
          discount_range: store.discount_range || "",
          logo_url: store.logo_url || "",
          cover_image_url: store.cover_image_url || "",
          latitude: store.latitude,
          longitude: store.longitude,
        });
      }
    },
  });

  useEffect(() => {
    if (existingStore) {
      setStoreData({
        name: existingStore.name || "",
        description: existingStore.description || "",
        address: existingStore.address || "",
        city: existingStore.city || "",
        state: existingStore.state || "",
        zip_code: existingStore.zip_code || "",
        phone: existingStore.phone || "",
        email: existingStore.email || "",
        category: existingStore.category || "",
        closing_date: existingStore.closing_date || "",
        discount_range: existingStore.discount_range || "",
        logo_url: existingStore.logo_url || "",
        cover_image_url: existingStore.cover_image_url || "",
        latitude: existingStore.latitude,
        longitude: existingStore.longitude,
      });
    }
  }, [existingStore]);

  const { data: productCount = 0 } = useQuery({
    queryKey: ['myProductCount', existingStore?.id],
    queryFn: async () => {
      const products = await base44.entities.Product.filter({ store_id: existingStore.id });
      return products.length;
    },
    enabled: !!existingStore?.id,
  });

  const categories = [
    { label: "Clothing", value: "clothing" },
    { label: "Electronics", value: "electronics" },
    { label: "Furniture", value: "furniture" },
    { label: "Home Goods", value: "home_goods" },
    { label: "Sports", value: "sports" },
    { label: "Books", value: "books" },
    { label: "Jewelry", value: "jewelry" },
    { label: "Toys", value: "toys" },
    { label: "Other", value: "other" },
  ];

  const handleUploadImage = async (file, type) => {
    if (type === "logo") setUploadingLogo(true);
    else setUploadingCover(true);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    setStoreData(prev => ({
      ...prev,
      [type === "logo" ? "logo_url" : "cover_image_url"]: file_url
    }));

    if (type === "logo") setUploadingLogo(false);
    else setUploadingCover(false);
  };

  const handleSave = async () => {
    setSaving(true);

    const dataToSave = {
      ...storeData,
      owner_id: user.id,
      is_active: true,
    };

    if (existingStore) {
      await base44.entities.Store.update(existingStore.id, dataToSave);
    } else {
      await base44.entities.Store.create(dataToSave);
    }

    queryClient.invalidateQueries({ queryKey: ['myStore'] });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading || loadingStore) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Store</h1>
          <p className="text-gray-500 mt-1">
            {existingStore ? "Manage your store profile" : "Set up your store to start selling"}
          </p>
        </div>
        
        {existingStore && (
          <div className="flex gap-3">
            <Link to={createPageUrl("MyProducts")}>
              <Button variant="outline">
                <Package className="w-4 h-4 mr-2" />
                Products ({productCount})
              </Button>
            </Link>
            <Link to={createPageUrl(`StoreProfile?id=${existingStore.id}`)}>
              <Button variant="outline">
                <Store className="w-4 h-4 mr-2" />
                View Store
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Store Images</CardTitle>
            <CardDescription>Add a logo and cover image for your store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cover Image */}
            <div>
              <Label className="mb-2 block">Cover Image</Label>
              <div className="relative h-40 bg-gray-100 rounded-xl overflow-hidden">
                {storeData.cover_image_url ? (
                  <img 
                    src={storeData.cover_image_url} 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  {uploadingCover ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-white" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files[0] && handleUploadImage(e.target.files[0], "cover")}
                  />
                </label>
              </div>
            </div>

            {/* Logo */}
            <div>
              <Label className="mb-2 block">Logo</Label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 bg-gray-100 rounded-xl overflow-hidden">
                  {storeData.logo_url ? (
                    <img 
                      src={storeData.logo_url} 
                      alt="Logo" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    {uploadingLogo ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files[0] && handleUploadImage(e.target.files[0], "logo")}
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500">Square image recommended (at least 200x200px)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Store Name *</Label>
                <Input
                  value={storeData.name}
                  onChange={(e) => setStoreData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your store name"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={storeData.category}
                  onValueChange={(val) => setStoreData(prev => ({ ...prev, category: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={storeData.description}
                onChange={(e) => setStoreData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Tell customers about your store and the closing sale"
                rows={4}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Closing Date</Label>
                <Input
                  type="date"
                  value={storeData.closing_date}
                  onChange={(e) => setStoreData(prev => ({ ...prev, closing_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Discount Range</Label>
                <Input
                  value={storeData.discount_range}
                  onChange={(e) => setStoreData(prev => ({ ...prev, discount_range: e.target.value }))}
                  placeholder="e.g., 20-70% off"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Street Address *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={storeData.address}
                  onChange={(e) => setStoreData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main St"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={storeData.city}
                  onChange={(e) => setStoreData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={storeData.state}
                  onChange={(e) => setStoreData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <Label>Zip Code</Label>
                <Input
                  value={storeData.zip_code}
                  onChange={(e) => setStoreData(prev => ({ ...prev, zip_code: e.target.value }))}
                  placeholder="12345"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude (optional)</Label>
                <Input
                  type="number"
                  step="any"
                  value={storeData.latitude || ""}
                  onChange={(e) => setStoreData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || null }))}
                  placeholder="40.7128"
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude (optional)</Label>
                <Input
                  type="number"
                  step="any"
                  value={storeData.longitude || ""}
                  onChange={(e) => setStoreData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || null }))}
                  placeholder="-74.0060"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={storeData.phone}
                    onChange={(e) => setStoreData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={storeData.email}
                    onChange={(e) => setStoreData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="store@email.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={handleSave} 
          disabled={saving || !storeData.name || !storeData.address || !storeData.city}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saved ? "Saved!" : existingStore ? "Save Changes" : "Create Store"}
        </Button>
      </div>
    </div>
  );
}
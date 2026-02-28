import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Store, Save, Loader2, CheckCircle, Upload, MapPin, Phone, Mail, Image, Navigation
} from "lucide-react";
import SellerVerificationCard from "@/components/moderation/SellerVerificationCard";
import SimpleCaptcha from "@/components/moderation/SimpleCaptcha";

const CATEGORIES = [
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

export default function MyStoreForm({ user, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [captchaOk, setCaptchaOk] = useState(false);

  const [storeData, setStoreData] = useState({
    name: "", description: "", address: "", city: "", state: "",
    zip_code: "", phone: "", email: "", category: "", closing_date: "",
    discount_range: "", logo_url: "", cover_image_url: "", latitude: null, longitude: null,
  });

  const { data: existingStore } = useQuery({
    queryKey: ["myStore", user?.id],
    queryFn: async () => {
      const stores = await base44.entities.Store.filter({ owner_id: user.id });
      return stores[0] || null;
    },
    enabled: !!user?.id,
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

  const set = (field, value) => setStoreData(prev => ({ ...prev, [field]: value }));

  const handleUploadImage = async (file, type) => {
    if (type === "logo") setUploadingLogo(true);
    else setUploadingCover(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set(type === "logo" ? "logo_url" : "cover_image_url", file_url);
    if (type === "logo") setUploadingLogo(false);
    else setUploadingCover(false);
  };

  const geocodeAddress = async () => {
    if (!storeData.address || !storeData.city) return;
    setGeocoding(true);
    const fullAddress = `${storeData.address}, ${storeData.city}, ${storeData.state} ${storeData.zip_code}`;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Return the latitude and longitude for this address: "${fullAddress}". Provide realistic coordinates.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          latitude: { type: "number" },
          longitude: { type: "number" }
        }
      }
    });
    if (result.latitude && result.longitude) {
      setStoreData(prev => ({ ...prev, latitude: result.latitude, longitude: result.longitude }));
    }
    setGeocoding(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const dataToSave = { ...storeData, owner_id: user.id, is_active: true };
    if (existingStore) {
      await base44.entities.Store.update(existingStore.id, dataToSave);
    } else {
      await base44.entities.Store.create(dataToSave);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onSaved?.(); }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle>Store Images</CardTitle>
          <CardDescription>Add a cover photo and logo to attract buyers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-2 block">Cover Image</Label>
            <div className="relative h-44 bg-gray-100 rounded-xl overflow-hidden">
              {storeData.cover_image_url ? (
                <img src={storeData.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center flex-col gap-2 text-gray-400">
                  <Image className="w-12 h-12" />
                  <span className="text-sm">Upload cover photo</span>
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                {uploadingCover ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Upload className="w-8 h-8 text-white" />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handleUploadImage(e.target.files[0], "cover")} />
              </label>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
              {storeData.logo_url ? (
                <img src={storeData.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Store className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                {uploadingLogo ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Upload className="w-5 h-5 text-white" />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handleUploadImage(e.target.files[0], "logo")} />
              </label>
            </div>
            <div>
              <p className="font-medium text-gray-700">Store Logo</p>
              <p className="text-sm text-gray-500">Square image, at least 200×200px</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle>Store Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Store Name *</Label>
              <Input value={storeData.name} onChange={(e) => set("name", e.target.value)} placeholder="Your store name" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={storeData.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={storeData.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Tell customers about your store and the closing sale. Be specific about what inventory you're selling."
              rows={4}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Closure Date</Label>
              <Input type="date" value={storeData.closing_date} onChange={(e) => set("closing_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Discount Range</Label>
              <Input value={storeData.discount_range} onChange={(e) => set("discount_range", e.target.value)} placeholder="e.g., 30-70% off" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Store Location</CardTitle>
          <CardDescription>Accurate location helps nearby buyers find you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Street Address *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input value={storeData.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St" className="pl-10" />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={storeData.city} onChange={(e) => set("city", e.target.value)} placeholder="City" />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={storeData.state} onChange={(e) => set("state", e.target.value)} placeholder="NY" />
            </div>
            <div className="space-y-2">
              <Label>Zip Code</Label>
              <Input value={storeData.zip_code} onChange={(e) => set("zip_code", e.target.value)} placeholder="12345" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button type="button" variant="outline" onClick={geocodeAddress} disabled={geocoding || !storeData.address || !storeData.city}>
              {geocoding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
              Auto-detect Coordinates
            </Button>
            {storeData.latitude && storeData.longitude && (
              <span className="text-sm text-green-600">
                ✓ {storeData.latitude.toFixed(4)}, {storeData.longitude.toFixed(4)}
              </span>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input type="number" step="any" value={storeData.latitude || ""} onChange={(e) => set("latitude", parseFloat(e.target.value) || null)} placeholder="40.7128" />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input type="number" step="any" value={storeData.longitude || ""} onChange={(e) => set("longitude", parseFloat(e.target.value) || null)} placeholder="-74.0060" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input value={storeData.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 123-4567" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input value={storeData.email} onChange={(e) => set("email", e.target.value)} placeholder="store@email.com" className="pl-10" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification */}
      {existingStore && (
        <SellerVerificationCard store={existingStore} onUpdated={() => {}} />
      )}

      {/* CAPTCHA on first save (new store) */}
      {!existingStore && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Security Check</p>
          <SimpleCaptcha onVerified={setCaptchaOk} />
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving || !storeData.name || !storeData.address || !storeData.city || (!existingStore && !captchaOk)}
        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
        size="lg"
      >
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
         saved ? <CheckCircle className="w-4 h-4 mr-2" /> :
         <Save className="w-4 h-4 mr-2" />}
        {saved ? "Saved!" : existingStore ? "Save Changes" : "Create Store"}
      </Button>
    </div>
  );
}
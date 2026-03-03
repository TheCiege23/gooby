import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  Bell, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  MapPin,
  Tag,
  Percent
} from "lucide-react";

export default function DealAlerts() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();

  const emptyAlert = {
    categories: [],
    min_discount: 20,
    location: "",
    max_distance_miles: 25,
    is_active: true,
  };

  const [alertData, setAlertData] = useState(emptyAlert);

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
    setLoading(false);
  };

  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['dealAlerts', user?.id],
    queryFn: () => base44.entities.DealAlert.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });

  const toggleCategory = (category) => {
    setAlertData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    const dataToSave = {
      ...alertData,
      user_id: user.id,
    };

    if (editingAlert) {
      await base44.entities.DealAlert.update(editingAlert.id, dataToSave);
    } else {
      await base44.entities.DealAlert.create(dataToSave);
    }

    queryClient.invalidateQueries({ queryKey: ['dealAlerts'] });
    setDialogOpen(false);
    setEditingAlert(null);
    setAlertData(emptyAlert);
    setSaving(false);
  };

  const handleEdit = (alert) => {
    setEditingAlert(alert);
    setAlertData({
      categories: alert.categories || [],
      min_discount: alert.min_discount || 20,
      location: alert.location || "",
      max_distance_miles: alert.max_distance_miles || 25,
      is_active: alert.is_active !== false,
    });
    setDialogOpen(true);
  };

  const handleToggle = async (alert) => {
    await base44.entities.DealAlert.update(alert.id, {
      is_active: !alert.is_active
    });
    queryClient.invalidateQueries({ queryKey: ['dealAlerts'] });
  };

  const handleDelete = async (alertId) => {
    await base44.entities.DealAlert.delete(alertId);
    queryClient.invalidateQueries({ queryKey: ['dealAlerts'] });
  };

  const openNewDialog = () => {
    setEditingAlert(null);
    setAlertData(emptyAlert);
    setDialogOpen(true);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deal Alerts</h1>
          <p className="text-gray-500 mt-1">Get notified when deals match your criteria</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingAlert ? "Edit Alert" : "Create Deal Alert"}</DialogTitle>
              <DialogDescription>
                Set your preferences to receive personalized deal notifications
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Categories */}
              <div className="space-y-3">
                <Label>Categories of Interest</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Badge
                      key={cat.value}
                      variant={alertData.categories.includes(cat.value) ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1.5"
                      onClick={() => toggleCategory(cat.value)}
                    >
                      {cat.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500">Leave empty for all categories</p>
              </div>

              {/* Minimum Discount */}
              <div className="space-y-3">
                <Label>Minimum Discount: {alertData.min_discount}%</Label>
                <Slider
                  value={[alertData.min_discount]}
                  onValueChange={(v) => setAlertData(prev => ({ ...prev, min_discount: v[0] }))}
                  max={90}
                  min={10}
                  step={5}
                />
                <p className="text-xs text-gray-500">Only notify me for deals with at least this discount</p>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Location (City or Zip)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={alertData.location}
                    onChange={(e) => setAlertData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Enter city or zip code"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Distance */}
              <div className="space-y-2">
                <Label>Maximum Distance</Label>
                <Select
                  value={String(alertData.max_distance_miles)}
                  onValueChange={(val) => setAlertData(prev => ({ ...prev, max_distance_miles: parseInt(val) }))}
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
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingAlert ? "Save Changes" : "Create Alert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loadingAlerts ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className={`${!alert.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alert.is_active ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <Bell className={`w-5 h-5 ${alert.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {alert.categories?.length > 0 
                            ? alert.categories.map(c => c.replace("_", " ")).join(", ")
                            : "All Categories"
                          }
                        </p>
                        <p className="text-sm text-gray-500">
                          {alert.min_discount}%+ discount
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {alert.location && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {alert.location} ({alert.max_distance_miles} mi)
                        </Badge>
                      )}
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        Min {alert.min_discount}% off
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={alert.is_active}
                      onCheckedChange={() => handleToggle(alert)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(alert)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(alert.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">No alerts yet</h3>
          <p className="text-gray-500 mt-2 mb-6">
            Create alerts to get notified about deals that match your interests
          </p>
          <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Alert
          </Button>
        </Card>
      )}
    </div>
  );
}
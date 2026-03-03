import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Upload,
  Package,
  Image,
  X,
  Store,
  ArrowLeft
} from "lucide-react";

export default function MyProducts() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const queryClient = useQueryClient();

  const emptyProduct = {
    name: "",
    description: "",
    category: "",
    original_price: "",
    sale_price: "",
    quantity: 1,
    condition: "new",
    images: [],
  };

  const [productData, setProductData] = useState(emptyProduct);

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
    queryKey: ['myStore', user?.id],
    queryFn: async () => {
      const stores = await base44.entities.Store.filter({ owner_id: user.id });
      return stores[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['myProducts', store?.id],
    queryFn: () => base44.entities.Product.filter({ store_id: store.id }),
    enabled: !!store?.id,
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
    { label: "Accessories", value: "accessories" },
    { label: "Other", value: "other" },
  ];

  const conditions = [
    { label: "New", value: "new" },
    { label: "Like New", value: "like_new" },
    { label: "Good", value: "good" },
    { label: "Fair", value: "fair" },
  ];

  const handleUploadImages = async (files) => {
    setUploadingImages(true);
    const newImages = [...productData.images];
    
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newImages.push(file_url);
    }
    
    setProductData(prev => ({ ...prev, images: newImages }));
    setUploadingImages(false);
  };

  const removeImage = (index) => {
    setProductData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    const originalPrice = parseFloat(productData.original_price) || 0;
    const salePrice = parseFloat(productData.sale_price) || 0;
    const discountPercent = originalPrice > 0 
      ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
      : 0;

    const dataToSave = {
      ...productData,
      store_id: store.id,
      original_price: originalPrice,
      sale_price: salePrice,
      discount_percent: discountPercent,
      quantity: parseInt(productData.quantity) || 1,
      is_available: true,
    };

    if (editingProduct) {
      await base44.entities.Product.update(editingProduct.id, dataToSave);
    } else {
      await base44.entities.Product.create(dataToSave);
    }

    queryClient.invalidateQueries({ queryKey: ['myProducts'] });
    setDialogOpen(false);
    setEditingProduct(null);
    setProductData(emptyProduct);
    setSaving(false);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setProductData({
      name: product.name || "",
      description: product.description || "",
      category: product.category || "",
      original_price: product.original_price?.toString() || "",
      sale_price: product.sale_price?.toString() || "",
      quantity: product.quantity || 1,
      condition: product.condition || "new",
      images: product.images || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (productId) => {
    await base44.entities.Product.delete(productId);
    queryClient.invalidateQueries({ queryKey: ['myProducts'] });
  };

  const openNewDialog = () => {
    setEditingProduct(null);
    setProductData(emptyProduct);
    setDialogOpen(true);
  };

  if (loading || loadingStore) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">No Store Found</h1>
        <p className="text-gray-500 mt-2">Please set up your store first</p>
        <Link to={createPageUrl("MyStore")}>
          <Button className="mt-6 bg-blue-600 hover:bg-blue-700">
            Set Up Store
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("MyStore")}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
            <p className="text-gray-500 mt-1">{products.length} products listed</p>
          </div>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>
                Add details about your product including photos and pricing
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Images */}
              <div className="space-y-2">
                <Label>Product Images</Label>
                <div className="flex flex-wrap gap-3">
                  {productData.images.map((img, idx) => (
                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <label className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                    {uploadingImages ? (
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files.length && handleUploadImages(Array.from(e.target.files))}
                    />
                  </label>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  value={productData.name}
                  onChange={(e) => setProductData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Product name"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={productData.description}
                  onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your product"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={productData.category}
                    onValueChange={(val) => setProductData(prev => ({ ...prev, category: val }))}
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
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select
                    value={productData.condition}
                    onValueChange={(val) => setProductData(prev => ({ ...prev, condition: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conditions.map(cond => (
                        <SelectItem key={cond.value} value={cond.value}>
                          {cond.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Original Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={productData.original_price}
                    onChange={(e) => setProductData(prev => ({ ...prev, original_price: e.target.value }))}
                    placeholder="$0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sale Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={productData.sale_price}
                    onChange={(e) => setProductData(prev => ({ ...prev, sale_price: e.target.value }))}
                    placeholder="$0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={productData.quantity}
                    onChange={(e) => setProductData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </div>

              {productData.original_price && productData.sale_price && (
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-green-700 font-medium">
                    {Math.round(((parseFloat(productData.original_price) - parseFloat(productData.sale_price)) / parseFloat(productData.original_price)) * 100)}% discount
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving || !productData.name || !productData.sale_price}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {editingProduct ? "Save Changes" : "Add Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loadingProducts ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {!product.is_available && (
                          <Badge variant="outline" className="text-xs">Unavailable</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {product.category?.replace("_", " ") || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-blue-600">${product.sale_price?.toFixed(2)}</p>
                      {product.original_price && (
                        <p className="text-xs text-gray-400 line-through">${product.original_price?.toFixed(2)}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.discount_percent ? (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                        {product.discount_percent}% off
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{product.quantity || 1}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">No products yet</h3>
          <p className="text-gray-500 mt-2 mb-6">Start adding products to your store</p>
          <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Product
          </Button>
        </Card>
      )}
    </div>
  );
}
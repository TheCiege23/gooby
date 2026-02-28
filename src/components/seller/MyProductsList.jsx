import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Upload, Package, X, Store } from "lucide-react";

const CATEGORIES = [
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

const CONDITIONS = [
  { label: "New", value: "new" },
  { label: "Like New", value: "like_new" },
  { label: "Good", value: "good" },
  { label: "Fair", value: "fair" },
];

const EMPTY = {
  name: "", description: "", category: "", original_price: "",
  sale_price: "", quantity: 1, condition: "new", images: [],
};

export default function MyProductsList({ store, onStoreNeeded }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["myProducts", store?.id],
    queryFn: () => base44.entities.Product.filter({ store_id: store.id }),
    enabled: !!store?.id,
  });

  if (!store) {
    return (
      <div className="text-center py-16">
        <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900">Set up your store first</h3>
        <p className="text-gray-500 mt-2 mb-6">You need a store before you can add products</p>
        <Button onClick={onStoreNeeded} className="bg-blue-600 hover:bg-blue-700">Set Up Store</Button>
      </div>
    );
  }

  const handleUploadImages = async (files) => {
    setUploadingImages(true);
    const newImages = [...form.images];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newImages.push(file_url);
    }
    set("images", newImages);
    setUploadingImages(false);
  };

  const removeImage = (idx) => set("images", form.images.filter((_, i) => i !== idx));

  const openNew = () => { setEditingProduct(null); setForm(EMPTY); setDialogOpen(true); };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || "", description: product.description || "",
      category: product.category || "", original_price: product.original_price?.toString() || "",
      sale_price: product.sale_price?.toString() || "", quantity: product.quantity || 1,
      condition: product.condition || "new", images: product.images || [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const orig = parseFloat(form.original_price) || 0;
    const sale = parseFloat(form.sale_price) || 0;
    const data = {
      ...form, store_id: store.id, original_price: orig, sale_price: sale,
      discount_percent: orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0,
      quantity: parseInt(form.quantity) || 1, is_available: true,
    };
    if (editingProduct) await base44.entities.Product.update(editingProduct.id, data);
    else await base44.entities.Product.create(data);
    queryClient.invalidateQueries({ queryKey: ["myProducts"] });
    setDialogOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Product.delete(id);
    queryClient.invalidateQueries({ queryKey: ["myProducts"] });
  };

  const discountPreview = form.original_price && form.sale_price
    ? Math.round(((parseFloat(form.original_price) - parseFloat(form.sale_price)) / parseFloat(form.original_price)) * 100)
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500">{products.length} products listed</p>
        <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
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
                      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <span className="font-medium truncate max-w-[180px]">{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {product.category?.replace("_", " ") || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-blue-600">${product.sale_price?.toFixed(2)}</p>
                    {product.original_price > 0 && (
                      <p className="text-xs text-gray-400 line-through">${product.original_price?.toFixed(2)}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.discount_percent > 0 ? (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{product.discount_percent}% off</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{product.quantity || 1}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(product.id)}>
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
          <Package className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No inventory yet</h3>
          <p className="text-gray-500 mt-2 mb-6">Start adding products with photos, categories, and discounts</p>
          <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add First Product
          </Button>
        </Card>
      )}

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>Fill in the details, upload photos, and set your discount</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Images */}
            <div className="space-y-2">
              <Label>Photos</Label>
              <div className="flex flex-wrap gap-3">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors text-gray-400">
                  {uploadingImages ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /><span className="text-xs mt-1">Upload</span></>}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files.length && handleUploadImages(Array.from(e.target.files))} />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g., Leather Sofa, iPhone 14, Women's Jacket" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the item — condition, size, brand, etc." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={(v) => set("condition", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Original Price</Label>
                <Input type="number" step="0.01" value={form.original_price} onChange={(e) => set("original_price", e.target.value)} placeholder="$0.00" />
              </div>
              <div className="space-y-2">
                <Label>Sale Price *</Label>
                <Input type="number" step="0.01" value={form.sale_price} onChange={(e) => set("sale_price", e.target.value)} placeholder="$0.00" />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="1" />
              </div>
            </div>

            {discountPreview !== null && discountPreview > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="font-semibold text-green-700">{discountPreview}% discount</p>
                  <p className="text-sm text-green-600">Buyers save ${(parseFloat(form.original_price) - parseFloat(form.sale_price)).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.sale_price || !form.category} className="bg-blue-600 hover:bg-blue-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingProduct ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
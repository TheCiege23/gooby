import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Eye, Clock, TrendingDown, Plus, ArrowRight } from "lucide-react";
import { differenceInDays } from "date-fns";

export default function SellerDashboardStats({ store, products, onAddProduct }) {
  const daysUntilClose = store?.closing_date
    ? differenceInDays(new Date(store.closing_date), new Date())
    : null;

  const totalValue = products.reduce((sum, p) => sum + (p.sale_price * (p.quantity || 1)), 0);
  const avgDiscount = products.length
    ? Math.round(products.reduce((sum, p) => sum + (p.discount_percent || 0), 0) / products.length)
    : 0;

  const stats = [
    {
      label: "Products Listed",
      value: products.length,
      icon: Package,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Avg. Discount",
      value: `${avgDiscount}%`,
      icon: TrendingDown,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "Inventory Value",
      value: `$${totalValue.toLocaleString()}`,
      icon: Eye,
      color: "bg-purple-100 text-purple-600",
    },
    {
      label: daysUntilClose !== null ? "Days Until Close" : "Closing Date",
      value: daysUntilClose !== null
        ? (daysUntilClose > 0 ? daysUntilClose : "Today!")
        : "Not set",
      icon: Clock,
      color: daysUntilClose !== null && daysUntilClose <= 7
        ? "bg-red-100 text-red-600"
        : "bg-orange-100 text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Alert if closing soon */}
      {daysUntilClose !== null && daysUntilClose <= 14 && daysUntilClose >= 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">
              {daysUntilClose === 0 ? "Your store closes today!" : `Only ${daysUntilClose} days left!`}
            </p>
            <p className="text-sm text-red-600">Make sure all your inventory is listed to maximize sales.</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer" onClick={onAddProduct}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Add New Product</p>
              <p className="text-sm text-gray-500">Upload items to your inventory</p>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-600 ml-auto" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">View Public Store</p>
              <p className="text-sm text-gray-500">See how customers see your store</p>
            </div>
            <Link to={createPageUrl(`StoreProfile?id=${store?.id}`)} className="ml-auto">
              <ArrowRight className="w-5 h-5 text-purple-600" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Products */}
      {products.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Recent Products</h3>
            <Link to={createPageUrl("MyProducts")} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Manage all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {products.slice(0, 5).map((product) => (
              <div key={product.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{product.category?.replace("_", " ")}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">${product.sale_price?.toFixed(2)}</p>
                  {product.discount_percent > 0 && (
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
                      {product.discount_percent}% off
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
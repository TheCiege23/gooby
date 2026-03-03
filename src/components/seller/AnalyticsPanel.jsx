import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Eye, ShoppingCart, Percent } from "lucide-react";

export default function AnalyticsPanel({ products }) {
  const [timeRange, setTimeRange] = useState("weekly");

  // Generate mock sales trend data
  const generateSalesTrends = () => {
    if (timeRange === "daily") {
      return [
        { date: "Mon", sales: 1200, views: 3400, orders: 8 },
        { date: "Tue", sales: 2800, views: 2210, orders: 12 },
        { date: "Wed", sales: 2000, views: 9290, orders: 10 },
        { date: "Thu", sales: 2780, views: 3908, orders: 14 },
        { date: "Fri", sales: 1890, views: 4800, orders: 11 },
        { date: "Sat", sales: 3390, views: 3800, orders: 18 },
        { date: "Sun", sales: 3490, views: 4300, orders: 16 },
      ];
    } else if (timeRange === "weekly") {
      return [
        { date: "Week 1", sales: 18000, views: 25000, orders: 72 },
        { date: "Week 2", sales: 22000, views: 28000, orders: 88 },
        { date: "Week 3", sales: 19500, views: 24000, orders: 78 },
        { date: "Week 4", sales: 25000, views: 32000, orders: 102 },
      ];
    } else {
      return [
        { date: "January", sales: 72000, views: 105000, orders: 288 },
        { date: "February", sales: 88000, views: 120000, orders: 352 },
        { date: "March", sales: 82000, views: 115000, orders: 328 },
      ];
    }
  };

  // Top selling products
  const topProducts = products
    .slice()
    .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0))
    .slice(0, 5)
    .map(p => ({
      name: p.name.substring(0, 20),
      sales: Math.floor(Math.random() * 50 + 10),
      revenue: (p.sale_price || 0) * Math.floor(Math.random() * 50 + 10),
    }));

  // Analytics metrics
  const salesData = generateSalesTrends();
  const totalSales = salesData.reduce((sum, d) => sum + d.sales, 0);
  const totalOrders = salesData.reduce((sum, d) => sum + d.orders, 0);
  const totalViews = salesData.reduce((sum, d) => sum + d.views, 0);
  const conversionRate = totalViews > 0 ? ((totalOrders / totalViews) * 100).toFixed(2) : 0;

  const metrics = [
    {
      label: "Total Sales",
      value: `$${totalSales.toLocaleString()}`,
      icon: TrendingUp,
      color: "bg-green-100 text-green-600",
      change: "+12%"
    },
    {
      label: "Total Orders",
      value: totalOrders,
      icon: ShoppingCart,
      color: "bg-blue-100 text-blue-600",
      change: "+8%"
    },
    {
      label: "Store Views",
      value: totalViews.toLocaleString(),
      icon: Eye,
      color: "bg-purple-100 text-purple-600",
      change: "+5%"
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: Percent,
      color: "bg-orange-100 text-orange-600",
      change: "+2%"
    },
  ];

  // Customer demographics mock data
  const demographicsData = [
    { name: "18-24", value: 25, fill: "#3b82f6" },
    { name: "25-34", value: 35, fill: "#10b981" },
    { name: "35-44", value: 20, fill: "#f59e0b" },
    { name: "45+", value: 20, fill: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Sales Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${metric.color}`}>
                <metric.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">{metric.label}</p>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {metric.change}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales & Orders Trend</CardTitle>
          <CardDescription>Revenue and order volume over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#3b82f6" name="Sales ($)" />
              <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10b981" name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Selling Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top-Selling Products</CardTitle>
          <CardDescription>Best performing items by sales volume</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#3b82f6" name="Units Sold" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Customer Demographics & Conversion */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Customer Demographics */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Demographics</CardTitle>
            <CardDescription>Age distribution of buyers</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={demographicsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {demographicsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Customer journey metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { stage: "Store Views", count: totalViews, percentage: 100 },
              { stage: "Product Views", count: Math.floor(totalViews * 0.65), percentage: 65 },
              { stage: "Add to Cart", count: Math.floor(totalViews * 0.35), percentage: 35 },
              { stage: "Completed Orders", count: totalOrders, percentage: parseFloat(conversionRate) },
            ].map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-900">{item.stage}</span>
                  <span className="text-sm text-gray-500">{item.count.toLocaleString()} ({item.percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
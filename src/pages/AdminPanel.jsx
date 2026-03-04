import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Store, Package, Users, AlertTriangle, Clock3, CheckCircle2, ArrowRight, Lock } from "lucide-react";

const ADMIN_PASSWORD = "admin123";

function StatCard({ icon: Icon, label, value, hint, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-green-50 text-green-700 border-green-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-700 border-red-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };

  return (
    <Card className={`p-4 border ${tones[tone]}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">{label}</p>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs opacity-80 mt-1">{hint}</p>}
    </Card>
  );
}

function AdminDashboard() {
  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: () => base44.entities.Store.list("-created_date", 1000),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => base44.entities.Product.list("-created_date", 1500),
  });

  const { data: importedStores = [] } = useQuery({
    queryKey: ["admin-imported-stores"],
    queryFn: () => base44.entities.ImportedStore.list("-created_date", 1000),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      try {
        return await base44.entities.User.list("-created_date", 1000);
      } catch (_) {
        return [];
      }
    },
  });

  const pendingImports = importedStores.filter((s) => s.status === "pending").length;
  const approvedImports = importedStores.filter((s) => s.status === "approved").length;
  const rejectedImports = importedStores.filter((s) => s.status === "rejected").length;
  const activeStores = stores.filter((s) => s.is_active !== false).length;
  const availableProducts = products.filter((p) => p.is_available !== false).length;
  const flaggedProducts = products.filter((p) => p.is_flagged).length;
  const sellers = users.filter((u) => u.role === "seller").length;

  const recentImports = importedStores.slice(0, 8);
  const recentProducts = products.slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Control Panel</h1>
          <p className="text-gray-500 mt-1">Track marketplace health, moderation, imports, and growth in one place.</p>
        </div>
        <Link to={createPageUrl("AdminImports")}>
          <Button className="bg-blue-600 hover:bg-blue-700">Open Admin Imports <ArrowRight className="w-4 h-4 ml-2" /></Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Store} label="Active Stores" value={activeStores} hint={`${stores.length} total stores`} tone="blue" />
        <StatCard icon={Package} label="Available Products" value={availableProducts} hint={`${products.length} total products`} tone="green" />
        <StatCard icon={Clock3} label="Pending Imports" value={pendingImports} hint={`${approvedImports} approved / ${rejectedImports} rejected`} tone="amber" />
        <StatCard icon={AlertTriangle} label="Flagged Products" value={flaggedProducts} hint="Needs moderation review" tone="red" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Users" value={users.length} hint={`${sellers} sellers`} tone="purple" />
        <StatCard icon={CheckCircle2} label="Approved Imports" value={approvedImports} hint="Moved to store pipeline" tone="green" />
        <StatCard icon={Clock3} label="Import Queue Size" value={importedStores.length} hint="All import statuses" tone="blue" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Imported Stores</h2>
            <Link to={createPageUrl("AdminImports")} className="text-sm text-blue-600 hover:underline">Manage</Link>
          </div>
          <div className="space-y-3">
            {recentImports.length === 0 ? (
              <p className="text-sm text-gray-500">No imported stores yet.</p>
            ) : recentImports.map((item) => (
              <div key={item.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                  <Badge className="text-xs capitalize">{item.status || "pending"}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">{item.city}, {item.state} {item.zip_code}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Inventory Added</h2>
            <Link to={createPageUrl("Browse")} className="text-sm text-blue-600 hover:underline">View in Browse</Link>
          </div>
          <div className="space-y-3">
            {recentProducts.length === 0 ? (
              <p className="text-sm text-gray-500">No products yet.</p>
            ) : recentProducts.map((item) => (
              <div key={item.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                  <Badge className="text-xs">${Number(item.sale_price || 0).toFixed(2)}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">{item.category || "other"} • {item.discount_percent || 0}% off</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("gooby_admin_unlocked") === "true");
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState(false);
  const navigate = useNavigate();

  const handleUnlock = (e) => {
    e.preventDefault();
    if (pwdInput === ADMIN_PASSWORD) {
      setUnlocked(true);
      sessionStorage.setItem("gooby_admin_unlocked", "true");
      setPwdError(false);
    } else {
      setPwdError(true);
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
        <Card className="max-w-sm w-full p-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-blue-100 mx-auto mb-3 flex items-center justify-center">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Admin Access</h1>
            <p className="text-sm text-gray-500 mt-1">Enter the admin password to continue.</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-3">
            <Input
              type="password"
              placeholder="Password"
              value={pwdInput}
              onChange={(e) => { setPwdInput(e.target.value); setPwdError(false); }}
              autoFocus
            />
            {pwdError && <p className="text-sm text-red-600">Incorrect password.</p>}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Unlock</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate(-1)}>Go Back</Button>
          </form>
        </Card>
      </div>
    );
  }

  return <AdminDashboard />;
}

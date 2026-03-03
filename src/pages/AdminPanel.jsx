import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { scannerService } from "@/api/services";
import {
  Shield,
  Loader2,
  RefreshCw,
  Activity,
  Clock,
  MapPin,
  Store,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Radar,
  BarChart3,
} from "lucide-react";

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [scanMode, setScanMode] = useState("full");
  const [scanTriggered, setScanTriggered] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.role !== "admin") {
        window.location.href = "/";
      }
    });
  }, []);

  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: () => base44.entities.Store.list("-created_date", 500),
    enabled: !!user,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => base44.entities.Product.list("-created_date", 500),
    enabled: !!user,
  });

  const { data: scannerStatus, refetch: refetchScanner } = useQuery({
    queryKey: ["scanner-status"],
    queryFn: () => scannerService.getStatus(),
    refetchInterval: 10000,
    enabled: !!user,
  });

  const { data: scanResults } = useQuery({
    queryKey: ["scanner-results"],
    queryFn: () => scannerService.getResults(),
    enabled: !!user,
  });

  const triggerScan = async () => {
    setScanTriggered(true);
    try {
      await scannerService.runScan(scanMode);
      setTimeout(() => refetchScanner(), 2000);
    } catch (err) {
      console.error("Scan trigger failed:", err);
    }
    setTimeout(() => setScanTriggered(false), 3000);
  };

  const activeStores = stores.filter(s => s.is_active);
  const stateBreakdown = {};
  activeStores.forEach(s => {
    const st = s.state || "Unknown";
    stateBreakdown[st] = (stateBreakdown[st] || 0) + 1;
  });

  const availableProducts = products.filter(p => p.is_available);
  const categoryBreakdown = {};
  availableProducts.forEach(p => {
    const cat = p.category || "other";
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Admin Panel
          </h1>
          <p className="text-gray-500 text-sm mt-1">Marketplace overview, scanner control, and platform stats</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Store className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeStores.length}</p>
              <p className="text-xs text-gray-500">Active Stores</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{availableProducts.length}</p>
              <p className="text-xs text-gray-500">Available Products</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stores.length}</p>
              <p className="text-xs text-gray-500">Total Stores</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Radar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{scannerStatus?.lastResultCount || 0}</p>
              <p className="text-xs text-gray-500">Last Scan Finds</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Radar className="w-5 h-5 text-blue-600" />
            Closure Scanner
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${scannerStatus?.isRunning ? "bg-yellow-400 animate-pulse" : "bg-green-500"}`} />
              <span className="text-sm font-medium">
                {scannerStatus?.isRunning ? "Scan in progress..." : "Idle"}
              </span>
            </div>

            {scannerStatus?.lastRun && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                Last run: {new Date(scannerStatus.lastRun).toLocaleString()}
              </div>
            )}

            <div className="flex items-center gap-2">
              <select
                value={scanMode}
                onChange={e => setScanMode(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white"
              >
                <option value="full">Full Scan</option>
                <option value="partial">Partial Scan</option>
              </select>
              <Button
                onClick={triggerScan}
                disabled={scannerStatus?.isRunning || scanTriggered}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                {scannerStatus?.isRunning || scanTriggered ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {scannerStatus?.isRunning ? "Running..." : scanTriggered ? "Triggered" : "Run Scan"}
              </Button>
            </div>

            <div className="text-xs text-gray-400">
              Schedule: Full scan daily at 7am EST, partial scan daily at 12pm EST
            </div>

            {scannerStatus?.history?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Scans</h3>
                <div className="space-y-1">
                  {scannerStatus.history.slice(-5).reverse().map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-gray-500 py-1 border-b border-gray-50">
                      <span>{new Date(h.timestamp).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <span>{h.total} found</span>
                        <div className="flex gap-1">
                          {h.sources?.news > 0 && <Badge variant="outline" className="text-[10px] px-1 py-0">News: {h.sources.news}</Badge>}
                          {h.sources?.x > 0 && <Badge variant="outline" className="text-[10px] px-1 py-0">X: {h.sources.x}</Badge>}
                          {h.sources?.facebook > 0 && <Badge variant="outline" className="text-[10px] px-1 py-0">FB: {h.sources.facebook}</Badge>}
                          {h.sources?.web > 0 && <Badge variant="outline" className="text-[10px] px-1 py-0">Web: {h.sources.web}</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Platform Breakdown
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Stores by State</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stateBreakdown).sort((a, b) => b[1] - a[1]).map(([state, count]) => (
                  <Badge key={state} variant="outline" className="px-3 py-1">
                    {state}: {count}
                  </Badge>
                ))}
                {Object.keys(stateBreakdown).length === 0 && (
                  <span className="text-sm text-gray-400">No active stores yet</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Products by Category</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([cat, count]) => (
                  <Badge key={cat} variant="outline" className="px-3 py-1 capitalize">
                    {cat.replace(/_/g, " ")}: {count}
                  </Badge>
                ))}
                {Object.keys(categoryBreakdown).length === 0 && (
                  <span className="text-sm text-gray-400">No products yet</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {scanResults?.closures?.length > 0 && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-600" />
            Last Scan Results ({scanResults.closures.length} closures found)
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {scanResults.closures.map((c, i) => (
              <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {c.city}, {c.state}
                  </p>
                  {c.closure_signals?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">Signals: {c.closure_signals.join(", ")}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {c.discovered_via?.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {c.category}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

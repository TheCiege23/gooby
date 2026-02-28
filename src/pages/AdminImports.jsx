import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Download,
  Check,
  X,
  Mail,
  Loader2,
  Store,
  AlertTriangle,
  Flag,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";
import FlaggedProductsPanel from "@/components/admin/FlaggedProductsPanel";
import SellerVerificationPanel from "@/components/admin/SellerVerificationPanel";
import CoresightImportPanel from "@/components/admin/CoresightImportPanel";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const BUSINESS_STATUS_COLORS = {
  CLOSED_PERMANENTLY: "bg-red-100 text-red-700",
  CLOSED_TEMPORARILY: "bg-orange-100 text-orange-700",
  OPERATIONAL: "bg-green-100 text-green-700",
};

export default function AdminImports() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("imports");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.role !== "admin") {
        window.location.href = "/";
      }
    });
  }, []);

  const { data: importedStores = [], isLoading } = useQuery({
    queryKey: ["imported-stores", statusFilter],
    queryFn: () =>
      statusFilter === "all"
        ? base44.entities.ImportedStore.list("-created_date", 100)
        : base44.entities.ImportedStore.filter({ status: statusFilter }, "-created_date", 100),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) =>
      base44.entities.ImportedStore.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["imported-stores"] }),
  });

  const approveStore = async (importedStore) => {
    // Create a real Store record from the imported data
    await base44.entities.Store.create({
      name: importedStore.name,
      address: importedStore.address,
      city: importedStore.city,
      state: importedStore.state,
      zip_code: importedStore.zip_code,
      phone: importedStore.phone,
      latitude: importedStore.latitude,
      longitude: importedStore.longitude,
      category: importedStore.category,
      is_active: true,
      description: `Closing sale — ${importedStore.business_status === "CLOSED_PERMANENTLY" ? "permanently closed" : "temporarily closed"} store.`,
    });
    updateStatus.mutate({ id: importedStore.id, status: "approved" });
  };

  const runImport = async () => {
    setImporting(true);
    setImportResult(null);
    const res = await base44.functions.invoke("importClosingStores", { region: "New Jersey" });
    setImportResult(res.data);
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ["imported-stores"] });
  };

  const sendAlert = async (store) => {
    setSendingEmail(store.id);
    await base44.functions.invoke("sendSellerAlert", { importedStoreId: store.id });
    setSendingEmail(null);
    queryClient.invalidateQueries({ queryKey: ["imported-stores"] });
  };

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
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            Admin Moderation
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage imports, flagged listings, and seller verification</p>
        </div>
        {activeSection === "imports" && (
          <Button onClick={runImport} disabled={importing} className="bg-blue-600 hover:bg-blue-700 gap-2">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {importing ? "Importing..." : "Run Import (New Jersey)"}
          </Button>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: "imports", label: "Store Imports", icon: Store },
          { id: "flagged", label: "Flagged Listings", icon: Flag },
          { id: "verification", label: "Seller Verification", icon: ShieldCheck },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeSection === id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {activeSection === "flagged" && <FlaggedProductsPanel />}
      {activeSection === "verification" && <SellerVerificationPanel />}

      {activeSection === "imports" && importResult && (
        <Card className="p-4 mb-6 bg-green-50 border-green-200">
          <p className="text-green-800 font-medium">
            ✅ Import complete — {importResult.imported} new stores added, {importResult.skipped} skipped (already imported or not closed).
          </p>
        </Card>
      )}

      {/* Filters - only for imports section */}
      {activeSection === "imports" && (
        <div className="flex gap-3 mb-4">
          {["pending", "approved", "rejected", "all"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Table - only for imports section */}
      {activeSection === "imports" && (
        isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : importedStores.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No {statusFilter !== "all" ? statusFilter : ""} imports found.</p>
            <p className="text-sm mt-1">Click "Run Import" to fetch closing stores from Google Places.</p>
          </div>
        ) : (
          <div className="space-y-3">
          {importedStores.map((store) => (
            <Card key={store.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{store.name}</h3>
                    <Badge className={STATUS_COLORS[store.status] || ""}>
                      {store.status}
                    </Badge>
                    {store.business_status && (
                      <Badge className={BUSINESS_STATUS_COLORS[store.business_status] || "bg-gray-100 text-gray-700"}>
                        {store.business_status.replace(/_/g, " ")}
                      </Badge>
                    )}
                    {store.email_sent && (
                      <Badge className="bg-purple-100 text-purple-700">Email Sent</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {store.address || `${store.city}, ${store.state}`}
                  </p>
                  {store.phone && (
                    <p className="text-sm text-gray-400">{store.phone}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1 capitalize">
                    Category: {store.category} · Region: {store.source_region}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {store.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => approveStore(store)}
                        className="bg-green-600 hover:bg-green-700 gap-1"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ id: store.id, status: "rejected" })}
                        className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                      >
                        <X className="w-4 h-4" /> Reject
                      </Button>
                    </>
                  )}
                  {!store.email_sent && store.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendAlert(store)}
                      disabled={sendingEmail === store.id}
                      className="gap-1"
                    >
                      {sendingEmail === store.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      Alert
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          </div>
        )
      )}
    </div>
  );
}
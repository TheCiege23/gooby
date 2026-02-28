import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Globe, Play, CheckCircle, AlertCircle, Loader2, Info, Clock } from "lucide-react";

export default function OverpassPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const runScan = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await base44.functions.invoke("importFromOverpass", {});
      if (res.data?.error) throw new Error(res.data.error);
      setResult(res.data);
      queryClient.invalidateQueries({ queryKey: ["imported-stores"] });
    } catch (err) {
      setError(err.message || "Scan failed");
    }
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 border-green-100 bg-green-50">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-semibold mb-1">OpenStreetMap Closure Scanner</p>
            <p className="text-green-700 mb-2">
              Scans <strong>NY, NJ, CT, and PA</strong> for retail locations tagged as <code className="bg-green-100 px-1 rounded">disused:shop</code>, <code className="bg-green-100 px-1 rounded">shop=vacant</code>, or <code className="bg-green-100 px-1 rounded">was:shop</code> by the OpenStreetMap community.
            </p>
            <div className="flex items-center gap-2 text-green-700">
              <Clock className="w-4 h-4" />
              <span>Runs automatically every week — or trigger manually below.</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-green-600" />
              Run OSM Scan Now
            </h3>
            <p className="text-sm text-gray-500 mt-1">Queries Overpass API across all 4 states — takes 30–60 seconds</p>
          </div>
          <Button
            onClick={runScan}
            disabled={running}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            {running ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</>
            ) : (
              <><Play className="w-4 h-4" /> Run Scan</>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {["New York", "New Jersey", "Connecticut", "Pennsylvania"].map(state => (
            <div key={state} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="font-medium text-gray-700">{state}</p>
              <p className="text-xs text-gray-400 mt-1">Retail closures</p>
            </div>
          ))}
        </div>
      </Card>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </Card>
      )}

      {result && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-800">Scan Complete</p>
          </div>
          <div className="flex gap-6 text-sm text-green-700">
            <span>✅ {result.imported} new stores imported</span>
            <span>⏭ {result.skipped} duplicates/unnamed skipped</span>
          </div>
          <p className="text-xs text-green-600 mt-2">New stores are in the Pending queue for review. Admins were notified by email.</p>
        </Card>
      )}
    </div>
  );
}
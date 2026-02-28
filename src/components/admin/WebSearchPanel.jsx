import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Play, CheckCircle, AlertCircle, Loader2, Info, Clock } from "lucide-react";

const QUERIES_PREVIEW = [
  "retail store closures New York 2026",
  "store closing New Jersey 2026",
  "store closures Connecticut 2026",
  "retail store closing Pennsylvania 2026",
  "department store closing northeast 2026",
  "mall store closings NY NJ CT PA 2026",
];

export default function WebSearchPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const runSearch = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await base44.functions.invoke("searchRetailClosures", {});
      if (res.data?.error) throw new Error(res.data.error);
      setResult(res.data);
      queryClient.invalidateQueries({ queryKey: ["imported-stores"] });
    } catch (err) {
      setError(err.message || "Search failed");
    }
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 border-blue-100 bg-blue-50">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Automated Web Search for Retail Closures</p>
            <p className="text-blue-700 mb-2">
              Runs <strong>11 targeted searches</strong> across NY, NJ, CT, and PA using live web data. AI extracts confirmed store closures and adds them to the pending queue.
            </p>
            <div className="flex items-center gap-2 text-blue-700">
              <Clock className="w-4 h-4" />
              <span>Runs automatically every Tuesday at 7am — or trigger manually below.</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Run Web Search Now
            </h3>
            <p className="text-sm text-gray-500 mt-1">Takes 1–2 minutes to run all queries with AI extraction</p>
          </div>
          <Button
            onClick={runSearch}
            disabled={running}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {running ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
            ) : (
              <><Play className="w-4 h-4" /> Run Search</>
            )}
          </Button>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Search queries</p>
          {QUERIES_PREVIEW.map((q, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
              <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />
              "{q}"
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-1 pl-1">+ 5 more state-specific queries</p>
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
            <p className="font-semibold text-green-800">Search Complete</p>
          </div>
          <div className="flex gap-6 text-sm text-green-700">
            <span>✅ {result.imported} new closures imported</span>
            <span>⏭ {result.skipped} duplicates/out-of-state skipped</span>
          </div>
          <p className="text-xs text-green-600 mt-2">New stores are in the Pending queue for admin review.</p>
        </Card>
      )}
    </div>
  );
}
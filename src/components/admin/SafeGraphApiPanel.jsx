import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2, Info, Play, Database } from "lucide-react";

const STATES = ["NY", "NJ", "CT", "PA"];

export default function SafeGraphApiPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedStates, setSelectedStates] = useState([...STATES]);
  const queryClient = useQueryClient();

  const toggleState = (s) => {
    setSelectedStates(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const runImport = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    const res = await base44.functions.invoke("importFromSafeGraph", { states: selectedStates });
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setResult(res.data);
      queryClient.invalidateQueries({ queryKey: ["imported-stores"] });
    }
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 border-purple-100 bg-purple-50">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-800">
            <p className="font-semibold mb-1">SafeGraph Places API — Live Query</p>
            <ul className="list-disc ml-4 space-y-1 text-purple-700">
              <li>Queries SafeGraph GraphQL API for NAICS 44–45 (Retail Trade) POIs</li>
              <li>Filters for <strong>closed_on</strong> dates in the last 6 months</li>
              <li>Geofilters to NY, NJ, CT, PA — deduplicates against existing imports</li>
              <li>All results land in the <strong>Pending</strong> queue for admin review</li>
              <li>Requires <code className="bg-purple-100 px-1 rounded">SAFEGRAPH_API_KEY</code> secret to be set</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-600" />
          Query SafeGraph Places API
        </h3>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2 font-medium">States to query:</p>
          <div className="flex gap-2 flex-wrap">
            {STATES.map(s => (
              <button
                key={s}
                onClick={() => toggleState(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selectedStates.includes(s)
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-purple-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={runImport}
          disabled={running || selectedStates.length === 0}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {running ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Querying SafeGraph API...</>
          ) : (
            <><Play className="w-4 h-4 mr-2" /> Run SafeGraph Import</>
          )}
        </Button>
      </Card>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 text-sm font-medium">Import failed</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            {error.includes("SAFEGRAPH_API_KEY") && (
              <p className="text-red-600 text-xs mt-2">Go to Dashboard → Settings → Environment Variables and add your SafeGraph API key.</p>
            )}
          </div>
        </Card>
      )}

      {result && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-800">SafeGraph Import Complete</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-green-700">
            <span>✅ {result.imported} new stores imported</span>
            <span>⏭ {result.skipped} duplicates skipped</span>
            <span>🚫 {result.nonRetail} non-retail filtered</span>
            <span>📭 {result.noCloseSignal} no closure signal</span>
          </div>
          <p className="text-xs text-green-600 mt-2">
            All new stores are in the Pending queue — only NAICS 44–45 retail with a <strong>closed_on</strong> date in the last 6 months were imported.
          </p>
        </Card>
      )}

      <Card className="p-4 bg-gray-50 border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-1">Compliance Note</p>
        <p className="text-xs text-gray-500">
          This integration queries SafeGraph's official GraphQL API using your licensed API key. No scraping or unauthorized data access is performed. Data is used only for identifying retail store closures within your licensed territory.
        </p>
      </Card>
    </div>
  );
}
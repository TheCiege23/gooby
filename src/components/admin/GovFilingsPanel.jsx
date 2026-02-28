import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Landmark, Play, CheckCircle, AlertCircle, Loader2, Info, Clock, ExternalLink } from "lucide-react";

const SOURCES = [
  { label: "SEC EDGAR", desc: "8-K/10-K filings mentioning store closures & going-out-of-business sales", url: "https://efts.sec.gov/LATEST/search-index?q=%22store+closures%22&dateRange=custom&startdt=2026-01-01&enddt=2026-12-31", color: "blue" },
  { label: "US Bankruptcy Courts", desc: "Chapter 7 & 11 filings from SDNY, EDNY, DNJ, CT, EDPA, WDPA districts", url: "https://www.nysb.uscourts.gov/", color: "red" },
  { label: "NJ Division of Revenue", desc: "Business dissolutions & closure notices from NJ.gov", url: "https://www.njportal.com/DOR/businessrecords", color: "green" },
  { label: "NY Dept of State", desc: "Dissolved/inactive retail entities from NY DOS", url: "https://apps.dos.ny.gov/publicInquiry/", color: "purple" },
  { label: "CT Secretary of State", desc: "Business dissolutions from CT SOTS registry", url: "https://service.ct.gov/business/s/onlinebusinesssearch", color: "orange" },
  { label: "PA Dept of State", desc: "Dissolved retail entities from PA DOS", url: "https://www.corporations.pa.gov/search/corpsearch", color: "indigo" },
  { label: "Retail Trade Press", desc: "Retail Dive, Chain Store Age, Forbes — closure & bankruptcy news", url: "https://www.retaildive.com/topic/store-closures/", color: "pink" },
];

const colorMap = {
  blue: "bg-blue-100 text-blue-700",
  red: "bg-red-100 text-red-700",
  green: "bg-green-100 text-green-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
  indigo: "bg-indigo-100 text-indigo-700",
  pink: "bg-pink-100 text-pink-700",
};

export default function GovFilingsPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const runScan = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await base44.functions.invoke("scanGovernmentFilings", {});
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
      <Card className="p-5 border-indigo-100 bg-indigo-50">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-800">
            <p className="font-semibold mb-1">Government Filings Scanner</p>
            <p className="text-indigo-700 mb-2">
              Scans <strong>SEC EDGAR</strong>, <strong>US Bankruptcy Courts</strong> (SDNY, EDNY, DNJ, CT, EDPA, WDPA), and <strong>state business registries</strong> (NY, NJ, CT, PA) for retail bankruptcies and dissolutions in 2026.
            </p>
            <div className="flex items-center gap-2 text-indigo-700">
              <Clock className="w-4 h-4" />
              <span>Runs automatically every Wednesday at 6am — or trigger manually below.</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Sources list */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-indigo-600" />
              Run Government Filings Scan
            </h3>
            <p className="text-sm text-gray-500 mt-1">Browses {SOURCES.length} live sources — takes 2–5 minutes</p>
          </div>
          <Button
            onClick={runScan}
            disabled={running}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            {running ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</>
            ) : (
              <><Play className="w-4 h-4" /> Run Scan</>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Data Sources</p>
          {SOURCES.map((s, i) => (
            <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2">
              <Badge className={`${colorMap[s.color]} text-xs flex-shrink-0 mt-0.5`}>{s.label}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
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
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-800">Scan Complete</p>
          </div>
          <div className="flex gap-6 text-sm text-green-700 mb-3">
            <span>✅ {result.imported} new retail entities imported</span>
            <span>⏭ {result.skipped} duplicates/out-of-state skipped</span>
          </div>
          {result.sources && result.sources.filter(s => s.imported > 0).length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-green-700 mb-1">Breakdown:</p>
              {result.sources.filter(s => s.imported > 0).map((s, i) => (
                <div key={i} className="text-xs text-green-600 flex gap-2">
                  <span className="font-medium">{s.imported} imported</span>
                  <span>—</span>
                  <span className="truncate">{s.source}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-green-600 mt-2">New stores are in the Pending queue for admin review.</p>
        </Card>
      )}
    </div>
  );
}
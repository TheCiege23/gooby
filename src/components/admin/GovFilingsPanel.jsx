import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Landmark, Upload, CheckCircle, AlertCircle, Loader2, Info, FileText, X, ExternalLink, Search
} from "lucide-react";

const TARGET_STATES = ["NY", "NJ", "CT", "PA"];

const ACCEPTED_SOURCES = [
  { label: "SEC EDGAR", desc: "8-K/10-K filings mentioning store closures", url: "https://efts.sec.gov/LATEST/search-index?q=%22store+closures%22", color: "bg-blue-100 text-blue-700" },
  { label: "Federal Bankruptcy Courts", desc: "Chapter 7 & 11 filings (SDNY, EDNY, DNJ, CT, EDPA, WDPA)", url: "https://www.pacer.gov/", color: "bg-red-100 text-red-700" },
  { label: "NY Dept of State", desc: "Dissolved/inactive retail entities", url: "https://apps.dos.ny.gov/publicInquiry/", color: "bg-purple-100 text-purple-700" },
  { label: "NJ Division of Revenue", desc: "Business dissolutions & closure notices", url: "https://www.njportal.com/DOR/businessrecords", color: "bg-green-100 text-green-700" },
  { label: "CT Secretary of State", desc: "Business dissolutions from CT SOTS registry", url: "https://service.ct.gov/business/s/onlinebusinesssearch", color: "bg-orange-100 text-orange-700" },
  { label: "PA Dept of State", desc: "Dissolved retail entities from PA DOS", url: "https://www.corporations.pa.gov/search/corpsearch", color: "bg-indigo-100 text-indigo-700" },
];

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    entities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          state: { type: "string", description: "2-letter: NY, NJ, CT, or PA" },
          zip_code: { type: "string" },
          category: {
            type: "string",
            enum: ["clothing", "electronics", "furniture", "home_goods", "sports", "toys", "books", "jewelry", "other"],
          },
          closing_date: { type: "string", description: "YYYY-MM-DD if known" },
          filing_type: { type: "string", description: "e.g. Chapter 11, Chapter 7, dissolution, closure notice" },
          source_note: { type: "string" },
        },
        required: ["name", "state"],
      },
    },
  },
};

export default function GovFilingsPanel() {
  const [files, setFiles] = useState([]);
  const [sourceLabel, setSourceLabel] = useState("");
  const [processing, setProcessing] = useState(false);
  const [scanningWeb, setScanningWeb] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selected]);
    setResult(null);
    setError(null);
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleScanWebSources = async () => {
    setScanningWeb(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("scanGovernmentFilings", {});
      if (res.data?.error) throw new Error(res.data.error);
      setResult({
        totalImported: res.data.imported || 0,
        totalSkipped: res.data.skipped || 0,
        totalOutOfState: res.data.out_of_state || 0,
        files: [],
      });
      queryClient.invalidateQueries({ queryKey: ["imported-stores"] });
    } catch (err) {
      setError(err.message || "Government web scan failed");
    }
    setScanningWeb(false);
  };

  const handleImport = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResult(null);
    setError(null);

    try {
      // Load existing for deduplication
      const existing = await base44.entities.ImportedStore.list("-created_date", 5000);
      const existingKeys = new Set(
        existing.map(s => `${(s.name || "").toLowerCase()}|${(s.city || "").toLowerCase()}|${(s.state || "").toLowerCase()}`)
      );

      let totalImported = 0;
      let totalSkipped = 0;
      let totalOutOfState = 0;
      const fileResults = [];

      for (const file of files) {
        // Upload file
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        // AI extraction
        const extracted = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a data extraction assistant for GOOBY, a retail closing-store marketplace.

Extract every retail store closure, bankruptcy, or dissolution record from this government filing document.
Only include consumer-facing physical retail stores (clothing, electronics, furniture, home goods, sports, toys, books, jewelry, etc.).
Do NOT include corporate HQ closures, warehouses, or non-retail businesses.
Target states: NY, NJ, CT, PA only.
If a chain is closing multiple locations, list each city as a separate record.
Source context: "${sourceLabel || file.name}"

Return all found entities as JSON.`,
          file_urls: [file_url],
          response_json_schema: EXTRACTION_SCHEMA,
        });

        const entities = extracted?.entities || [];
        let fileImported = 0;
        let fileSkipped = 0;
        let fileOOS = 0;

        for (const entity of entities) {
          const storeState = (entity.state || "").toUpperCase().trim();

          if (!TARGET_STATES.includes(storeState)) {
            fileOOS++;
            totalOutOfState++;
            continue;
          }

          const key = `${(entity.name || "").toLowerCase()}|${(entity.city || "").toLowerCase()}|${storeState.toLowerCase()}`;
          if (existingKeys.has(key)) {
            fileSkipped++;
            totalSkipped++;
            continue;
          }

          const slug = (entity.name || "").replace(/\s+/g, "_").toLowerCase().slice(0, 30);
          const citySlug = (entity.city || "unknown").replace(/\s+/g, "_").toLowerCase();
          const placeId = `gov_upload_${storeState}_${slug}_${citySlug}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

          await base44.entities.ImportedStore.create({
            place_id: placeId,
            name: entity.name,
            address: entity.address || "",
            city: entity.city || "",
            state: storeState,
            zip_code: entity.zip_code || "",
            phone: "",
            latitude: null,
            longitude: null,
            business_status: "CLOSED_PERMANENTLY",
            category: entity.category || "other",
            types: [],
            status: "pending",
            email_sent: false,
            source_region: `${entity.city || storeState}, ${storeState} — Gov Filing Upload: ${entity.filing_type || "closure"}${entity.source_note ? " — " + entity.source_note : ""}${sourceLabel ? ` (${sourceLabel})` : ""}`,
          });

          existingKeys.add(key);
          fileImported++;
          totalImported++;
        }

        // fileSkipped already tracked during dedupe checks
        fileResults.push({ name: file.name, extracted: entities.length, imported: fileImported, skipped: fileSkipped, out_of_state: fileOOS });
      }

      queryClient.invalidateQueries({ queryKey: ["imported-stores"] });
      setResult({ totalImported, totalSkipped, totalOutOfState, files: fileResults });
    } catch (err) {
      setError(err.message || "Import failed");
    }

    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      {/* Compliance notice */}
      <Card className="p-5 border-indigo-100 bg-indigo-50">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-800">
            <p className="font-semibold mb-1">Manual Upload + Optional AI Web Scan</p>
            <p className="text-indigo-700">
              Upload Excel/CSV/PDF filings, or run an AI-assisted scan that teaches the model to prioritize federal/state filings plus Google-indexed corroboration for <strong>NY, NJ, CT, PA</strong>. Results are imported as pending drafts for admin review.
            </p>
          </div>
        </div>
      </Card>

      <Button
        onClick={handleScanWebSources}
        disabled={scanningWeb || processing}
        className="bg-indigo-600 hover:bg-indigo-700 gap-2"
      >
        {scanningWeb ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning websites...</> : <><Search className="w-4 h-4" /> NEW: Scan federal + Google sources</>}
      </Button>

      {/* Accepted sources reference */}
      <Card className="p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Accepted Source Portals (download manually from these)</p>
        <div className="space-y-2">
          {ACCEPTED_SOURCES.map((s, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
              <Badge className={`${s.color} text-xs flex-shrink-0`}>{s.label}</Badge>
              <p className="text-sm text-gray-600 flex-1">{s.desc}</p>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </Card>

      {/* Upload area */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Landmark className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Upload Government Filing Files</h3>
        </div>

        {/* Optional source label */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-1">Source label (optional)</label>
          <input
            type="text"
            value={sourceLabel}
            onChange={e => setSourceLabel(e.target.value)}
            placeholder="e.g. SEC EDGAR 8-K Jan 2026, SDNY Chapter 11 Feb 2026"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {/* Drop zone */}
        <div
          className="border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center cursor-pointer hover:bg-indigo-50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
          <p className="font-medium text-gray-700">Click to upload or drag & drop</p>
          <p className="text-sm text-gray-500 mt-1">Excel (.xlsx), CSV, or PDF — multiple files accepted</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-1 truncate">{f.name}</span>
                <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={processing || files.length === 0}
          className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
        >
          {processing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Parsing & importing...</>
          ) : (
            <><Upload className="w-4 h-4" /> Parse & Import ({files.length} file{files.length !== 1 ? "s" : ""})</>
          )}
        </Button>
      </Card>

      {/* Error */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className="p-5 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-800">Import Complete</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-green-700 mb-3">
            <span>✅ {result.totalImported} new stores imported as pending</span>
            <span>⏭ {result.totalSkipped} duplicates skipped</span>
            {result.totalOutOfState > 0 && <span>🚫 {result.totalOutOfState} out-of-state filtered</span>}
          </div>
          {result.files?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-green-700 mb-1">Per file:</p>
              {result.files.map((f, i) => (
                <div key={i} className="text-xs text-green-700 flex gap-2">
                  <span className="font-medium truncate max-w-xs">{f.name}</span>
                  <span>— {f.extracted} found, {f.imported} imported, {f.skipped} dupes, {f.out_of_state} out-of-state</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-green-600 mt-2">All new stores are in the Pending queue for admin review, approval, and seller outreach.</p>
        </Card>
      )}
    </div>
  );
}
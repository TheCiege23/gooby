import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Info, X } from "lucide-react";

const TARGET_STATES = new Set(["NY", "NJ", "CT", "PA"]);

const SOURCE_OPTIONS = [
  { value: "coresight", label: "Coresight Research" },
  { value: "retailstat", label: "RetailStat" },
  { value: "sec_edgar", label: "SEC EDGAR Filing" },
  { value: "bls", label: "BLS / Government Data" },
  { value: "other", label: "Other Legal Source" },
];

function mapSector(sector = "") {
  const s = sector.toLowerCase();
  if (s.includes("apparel") || s.includes("cloth") || s.includes("fashion") || s.includes("footwear") || s.includes("shoe")) return "clothing";
  if (s.includes("electron") || s.includes("tech") || s.includes("computer") || s.includes("device")) return "electronics";
  if (s.includes("furni") || s.includes("home furnish") || s.includes("mattress")) return "furniture";
  if (s.includes("home good") || s.includes("houseware") || s.includes("kitchen") || s.includes("bed bath")) return "home_goods";
  if (s.includes("sport") || s.includes("outdoor") || s.includes("fitness") || s.includes("athletic")) return "sports";
  if (s.includes("toy") || s.includes("children") || s.includes("kids") || s.includes("hobby")) return "toys";
  if (s.includes("book") || s.includes("media") || s.includes("music") || s.includes("entertain")) return "books";
  if (s.includes("jewelry") || s.includes("jewel") || s.includes("accessory") || s.includes("watch")) return "jewelry";
  if (s.includes("department") || s.includes("general merch")) return "other";
  return "other";
}

function normalizeState(raw = "") {
  const s = raw.trim().toUpperCase();
  // Handle full state names
  const nameMap = {
    "NEW YORK": "NY", "NEW JERSEY": "NJ", "CONNECTICUT": "CT", "PENNSYLVANIA": "PA",
  };
  return nameMap[s] || s;
}

export default function DataBankImportPanel() {
  const [file, setFile] = useState(null);
  const [source, setSource] = useState("coresight");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [step, setStep] = useState(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    setPreview(null);
    setStep(null);
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setPreview(null);
    setStep(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    setPreview(null);

    setStep("Uploading file...");
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setStep("AI is parsing store closure data...");
    const sourceLabel = SOURCE_OPTIONS.find(s => s.value === source)?.label || source;

    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          closures: {
            type: "array",
            description: `Extract all retail store closures from this ${sourceLabel} file. Focus on physical retail locations (clothing, electronics, furniture, home goods, sports, toys, books, jewelry, department stores). Include any store with a closure date, announced closing, bankruptcy filing, or store count reduction.`,
            items: {
              type: "object",
              properties: {
                name:         { type: "string", description: "Store or brand name" },
                address:      { type: "string", description: "Street address if available" },
                city:         { type: "string", description: "City name" },
                state:        { type: "string", description: "US state as 2-letter code (NY, NJ, CT, PA) or full name" },
                zip_code:     { type: "string", description: "ZIP code if available" },
                sector:       { type: "string", description: "Retail sector, category, or type (e.g. Apparel, Electronics, Home Goods)" },
                closure_date: { type: "string", description: "Announced or actual closure date (any format)" },
                num_stores:   { type: "number", description: "Number of locations closing (for chain-level entries)" },
                notes:        { type: "string", description: "Filing type, bankruptcy chapter, or extra context" },
              },
              required: ["name"],
            },
          },
        },
      },
    });

    if (extracted.status !== "success" || !extracted.output?.closures?.length) {
      setError("Could not parse retail closure data from this file. Ensure it contains store name, location, or closure information.");
      setUploading(false);
      setStep(null);
      return;
    }

    const rows = extracted.output.closures;

    // Filter to target states if state info is available; keep state-unknown rows too for review
    const targetRows = rows.filter(row => {
      if (!row.state) return true; // no state = keep for manual review
      const st = normalizeState(row.state);
      return TARGET_STATES.has(st);
    });

    setPreview(targetRows.slice(0, 6));

    setStep("Deduplicating against existing imports...");
    const existing = await base44.entities.ImportedStore.list("-created_date", 2000);
    const existingKeys = new Set(existing.map(s => s.name?.toLowerCase().trim()));

    let imported = 0, skipped = 0, filteredOut = 0;

    for (const row of rows) {
      const st = normalizeState(row.state || "");
      // Filter out rows that have a state explicitly outside target states
      if (row.state && !TARGET_STATES.has(st)) {
        filteredOut++;
        continue;
      }

      const key = row.name?.toLowerCase().trim();
      if (!key) { skipped++; continue; }
      if (existingKeys.has(key)) { skipped++; continue; }

      await base44.entities.ImportedStore.create({
        place_id: `${source}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: row.name,
        address: row.address || "",
        city: row.city || "",
        state: TARGET_STATES.has(st) ? st : (row.state || ""),
        zip_code: row.zip_code || "",
        phone: "",
        latitude: null,
        longitude: null,
        business_status: "CLOSED_PERMANENTLY",
        category: mapSector(row.sector || row.notes || ""),
        types: [row.sector || "", row.notes || ""].filter(Boolean),
        status: "pending",
        email_sent: false,
        source_region: `${st || row.state || "US"} (${sourceLabel})`,
      });

      existingKeys.add(key);
      imported++;
    }

    setResult({ imported, skipped, filteredOut, total: rows.length });
    queryClient.invalidateQueries({ queryKey: ["imported-stores"] });
    setStep(null);
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 border-blue-100 bg-blue-50">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">General Databank Import — AI-Powered Parsing</p>
            <ol className="list-decimal ml-4 space-y-1 text-blue-700">
              <li>Download retail closure data from a legal source (Coresight, RetailStat, SEC EDGAR, BLS, etc.)</li>
              <li>Select the source type and upload the Excel or CSV file</li>
              <li>AI extracts store names, addresses, states, sectors, and closure dates</li>
              <li>Filtered to <strong>NY, NJ, CT, PA</strong> — deduplicated — queued as <strong>Pending</strong> for review</li>
            </ol>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          Upload Databank File
        </h3>

        {/* Source selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {SOURCE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* File drop area */}
        <label className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          file ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
        }`}>
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          {file ? (
            <div>
              <p className="font-medium text-blue-700">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-gray-600">Drop Excel, CSV, or PDF here</p>
              <p className="text-xs text-gray-400 mt-1">Supports .xlsx, .csv, .xls, .pdf</p>
            </div>
          )}
          <input type="file" accept=".csv,.xlsx,.xls,.pdf" className="hidden" onChange={handleFileChange} />
        </label>

        {file && (
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{step || "Processing..."}</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Import with AI</>
              )}
            </Button>
            {!uploading && (
              <Button variant="outline" size="icon" onClick={clearFile}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
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
            <p className="font-semibold text-green-800">Import Complete</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-green-700">
            <span>✅ {result.imported} new stores queued</span>
            <span>⏭ {result.skipped} duplicates skipped</span>
            <span>🗺 {result.filteredOut} outside NY/NJ/CT/PA</span>
            <span>📄 {result.total} total rows parsed</span>
          </div>
          <p className="text-xs text-green-600 mt-2">All new stores are in the <strong>Pending</strong> queue — go to Store Imports to approve, reject, or send seller alerts.</p>
        </Card>
      )}

      {preview && preview.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Preview — first rows matching NY/NJ/CT/PA</p>
          <div className="space-y-2">
            {preview.map((row, i) => (
              <div key={i} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded-lg flex-wrap">
                <span className="font-medium text-gray-900">{row.name}</span>
                {(row.city || row.state) && (
                  <span className="text-gray-500">{[row.city, normalizeState(row.state || "")].filter(Boolean).join(", ")}</span>
                )}
                {row.sector && <Badge variant="secondary" className="text-xs capitalize">{row.sector}</Badge>}
                {row.closure_date && <span className="text-xs text-red-600 font-medium">{row.closure_date}</span>}
                {row.notes && <span className="text-xs text-gray-400 italic truncate max-w-xs">{row.notes}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4 bg-gray-50 border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-1">Compliance Note</p>
        <p className="text-xs text-gray-500">
          Only upload files from legally licensed data sources. No scraping or unauthorized data access is performed. All imports are queued for manual admin review before any seller contact is made.
        </p>
      </Card>
    </div>
  );
}
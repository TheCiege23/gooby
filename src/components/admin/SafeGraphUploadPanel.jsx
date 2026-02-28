import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Database, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";

const TARGET_STATES = new Set(["NY", "NJ", "CT", "PA"]);

// NAICS 44-45 = retail trade — map to our categories
function mapNaics(naics = "", category = "") {
  const n = String(naics);
  const c = (category || "").toLowerCase();
  if (n.startsWith("4481") || c.includes("cloth") || c.includes("apparel") || c.includes("shoe")) return "clothing";
  if (n.startsWith("443") || c.includes("electron") || c.includes("computer")) return "electronics";
  if (n.startsWith("4421") || c.includes("furni")) return "furniture";
  if (n.startsWith("4422") || c.includes("home") || c.includes("houseware")) return "home_goods";
  if (n.startsWith("4511") || c.includes("sport") || c.includes("outdoor")) return "sports";
  if (n.startsWith("4512") || c.includes("toy") || c.includes("hobby")) return "toys";
  if (n.startsWith("4512") || c.includes("book") || c.includes("music")) return "books";
  if (n.startsWith("4483") || c.includes("jewel")) return "jewelry";
  if (n.startsWith("44") || n.startsWith("45")) return "other";
  return null; // not retail — skip
}

export default function SafeGraphUploadPanel() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    setPreview(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          places: {
            type: "array",
            items: {
              type: "object",
              properties: {
                placekey:       { type: "string", description: "SafeGraph Placekey identifier" },
                safegraph_id:   { type: "string", description: "SafeGraph place ID" },
                location_name:  { type: "string", description: "Business/store name" },
                street_address: { type: "string" },
                city:           { type: "string" },
                region:         { type: "string", description: "2-letter state code" },
                postal_code:    { type: "string" },
                phone_number:   { type: "string" },
                latitude:       { type: "number" },
                longitude:      { type: "number" },
                naics_code:     { type: "string", description: "NAICS code (should be 44xx or 45xx for retail)" },
                top_category:   { type: "string" },
                sub_category:   { type: "string" },
                closed_on:      { type: "string", description: "Closure date if available (YYYY-MM or YYYY-MM-DD)" },
                open_hours:     { type: "string" },
              },
              required: ["location_name"],
            },
          },
        },
      },
    });

    if (extracted.status !== "success" || !extracted.output?.places) {
      setError("Could not parse this file. Make sure it's a SafeGraph Places monthly export (CSV or Parquet converted to CSV/Excel).");
      setUploading(false);
      return;
    }

    const rows = extracted.output.places;

    // Filter: target states + retail NAICS only
    const retailRows = rows.filter(r => {
      const state = (r.region || "").toUpperCase();
      if (!TARGET_STATES.has(state)) return false;
      const cat = mapNaics(r.naics_code, r.top_category || r.sub_category);
      return cat !== null; // null = not retail
    });

    setPreview(retailRows.slice(0, 5));

    // Deduplicate against existing imports
    const existing = await base44.entities.ImportedStore.list("-created_date", 2000);
    const existingIds = new Set(existing.map(s => s.place_id));

    let imported = 0;
    let skipped = 0;
    let nonRetail = rows.length - retailRows.length;

    for (const row of retailRows) {
      const pid = row.placekey || row.safegraph_id || `sg_${row.location_name}_${row.postal_code}`;
      if (existingIds.has(pid)) { skipped++; continue; }

      const category = mapNaics(row.naics_code, row.top_category || row.sub_category) || "other";

      await base44.entities.ImportedStore.create({
        place_id: pid,
        name: row.location_name,
        address: row.street_address || "",
        city: row.city || "",
        state: (row.region || "").toUpperCase(),
        zip_code: row.postal_code || "",
        phone: row.phone_number || "",
        latitude: row.latitude || null,
        longitude: row.longitude || null,
        business_status: row.closed_on ? "CLOSED_PERMANENTLY" : "CLOSED_PERMANENTLY",
        category,
        types: [row.top_category || "", row.sub_category || ""].filter(Boolean),
        status: "pending",
        email_sent: false,
        source_region: `${(row.region || "").toUpperCase()} (SafeGraph)`,
      });

      existingIds.add(pid);
      imported++;
    }

    setResult({ imported, skipped, nonRetail, total: rows.length });
    queryClient.invalidateQueries({ queryKey: ["imported-stores"] });
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 border-purple-100 bg-purple-50">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-800">
            <p className="font-semibold mb-1">How to use SafeGraph Places bulk data</p>
            <ol className="list-decimal ml-4 space-y-1 text-purple-700">
              <li>Download monthly <strong>Places</strong> export from <strong>Dewey Data</strong> or your <strong>AWS S3</strong> bucket</li>
              <li>Convert Parquet → CSV if needed (use DBeaver, Python pandas, or AWS Athena)</li>
              <li>Upload the CSV here — AI filters NY/NJ/CT/PA retail (NAICS 44-45) and imports closed POIs</li>
              <li>All results land in the <strong>Pending</strong> queue for admin review</li>
            </ol>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-600" />
          Upload SafeGraph Places Export
        </h3>

        <label className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          file ? "border-purple-400 bg-purple-50" : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
        }`}>
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          {file ? (
            <div>
              <p className="font-medium text-purple-700">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB — ready to import</p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-gray-600">Drop SafeGraph CSV/Excel file here</p>
              <p className="text-xs text-gray-400 mt-1">Monthly Places export — .csv, .xlsx</p>
            </div>
          )}
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
        </label>

        {file && (
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing with AI...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Import Retail Closures</>
            )}
          </Button>
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
            <span>✅ {result.imported} new stores imported</span>
            <span>⏭ {result.skipped} duplicates skipped</span>
            <span>🚫 {result.nonRetail} non-retail filtered out</span>
            <span>📄 {result.total} total rows parsed</span>
          </div>
          <p className="text-xs text-green-600 mt-2">New stores are in the Pending queue — only NY, NJ, CT, PA retail (NAICS 44-45) were imported.</p>
        </Card>
      )}

      {preview && preview.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Preview (first 5 retail rows)</p>
          <div className="space-y-2">
            {preview.map((row, i) => (
              <div key={i} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded-lg flex-wrap">
                <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">{row.location_name}</span>
                <span className="text-gray-500 text-xs">{row.city}, {row.region}</span>
                {row.naics_code && <Badge variant="secondary" className="text-xs">NAICS {row.naics_code}</Badge>}
                {row.closed_on && <Badge className="text-xs bg-red-100 text-red-700">Closed {row.closed_on}</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";

// Map common sector/category strings from Coresight to our categories
function mapSector(sector = "") {
  const s = sector.toLowerCase();
  if (s.includes("apparel") || s.includes("cloth") || s.includes("fashion") || s.includes("footwear")) return "clothing";
  if (s.includes("electron") || s.includes("tech") || s.includes("computer")) return "electronics";
  if (s.includes("furni") || s.includes("home furnish")) return "furniture";
  if (s.includes("home") || s.includes("houseware") || s.includes("kitchen")) return "home_goods";
  if (s.includes("sport") || s.includes("outdoor") || s.includes("fitness")) return "sports";
  if (s.includes("toy") || s.includes("children") || s.includes("kids")) return "toys";
  if (s.includes("book") || s.includes("media") || s.includes("music")) return "books";
  if (s.includes("jewelry") || s.includes("jewel") || s.includes("accessory")) return "jewelry";
  if (s.includes("department")) return "other";
  return "other";
}

export default function CoresightImportPanel() {
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

    // Upload the file then extract structured data via AI
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          closures: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name:          { type: "string", description: "Store/brand name" },
                address:       { type: "string", description: "Full store address if available" },
                city:          { type: "string" },
                state:         { type: "string", description: "2-letter US state code" },
                zip_code:      { type: "string" },
                sector:        { type: "string", description: "Retail sector/category" },
                closure_date:  { type: "string", description: "Announced or actual closure date" },
                num_stores:    { type: "number", description: "Number of stores closing (if chain-level)" },
                notes:         { type: "string", description: "Any extra context about the closure" },
              },
              required: ["name"],
            },
          },
        },
      },
    });

    if (extracted.status !== "success" || !extracted.output?.closures) {
      setError("Could not parse the file. Make sure it's a Coresight closure export (Excel or CSV).");
      setUploading(false);
      return;
    }

    const rows = extracted.output.closures;
    setPreview(rows.slice(0, 5));

    // Deduplicate against existing imports
    const existing = await base44.entities.ImportedStore.list("-created_date", 500);
    const existingNames = new Set(existing.map(s => s.name?.toLowerCase().trim()));

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const key = row.name?.toLowerCase().trim();
      if (!key || existingNames.has(key)) {
        skipped++;
        continue;
      }

      await base44.entities.ImportedStore.create({
        place_id: `coresight_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: row.name,
        address: row.address || "",
        city: row.city || "",
        state: row.state || "",
        zip_code: row.zip_code || "",
        phone: "",
        latitude: null,
        longitude: null,
        business_status: "CLOSED_PERMANENTLY",
        category: mapSector(row.sector || ""),
        types: [],
        status: "pending",
        email_sent: false,
        source_region: row.state || "US",
      });

      existingNames.add(key);
      imported++;
    }

    setResult({ imported, skipped, total: rows.length });
    queryClient.invalidateQueries({ queryKey: ["imported-stores"] });
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 border-blue-100 bg-blue-50">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How to use Coresight Research data</p>
            <ol className="list-decimal ml-4 space-y-1 text-blue-700">
              <li>Download the retail closure tracker from <strong>Coresight Research Databank</strong> (Excel or CSV)</li>
              <li>Upload it here — the AI will extract store names, locations, sectors, and closure dates</li>
              <li>New entries are deduplicated and added as <strong>pending imports</strong> for admin review</li>
            </ol>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          Upload Coresight Closure File
        </h3>

        <label className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          file ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
        }`}>
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          {file ? (
            <div>
              <p className="font-medium text-blue-700">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB — ready to import</p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-gray-600">Drop Excel or CSV file here</p>
              <p className="text-xs text-gray-400 mt-1">Supports .xlsx, .csv, .xls</p>
            </div>
          )}
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
        </label>

        {file && (
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing with AI...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Import Closures</>
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
          <div className="flex gap-4 text-sm text-green-700">
            <span>✅ {result.imported} new stores added</span>
            <span>⏭ {result.skipped} duplicates skipped</span>
            <span>📄 {result.total} total rows parsed</span>
          </div>
          <p className="text-xs text-green-600 mt-2">New stores are now in the Pending queue for review.</p>
        </Card>
      )}

      {preview && preview.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Preview (first 5 rows parsed)</p>
          <div className="space-y-2">
            {preview.map((row, i) => (
              <div key={i} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900 flex-1">{row.name}</span>
                {row.city && <span className="text-gray-500">{row.city}, {row.state}</span>}
                {row.sector && <Badge variant="secondary" className="text-xs capitalize">{row.sector}</Badge>}
                {row.closure_date && <span className="text-xs text-red-600">{row.closure_date}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
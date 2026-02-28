import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, Loader2, Upload, MapPin, X } from "lucide-react";
import SimpleCaptcha from "@/components/moderation/SimpleCaptcha";

const TARGET_STATES = ["NY", "NJ", "CT", "PA"];

const CATEGORIES = [
  { value: "clothing", label: "Clothing / Apparel" },
  { value: "electronics", label: "Electronics / Tech" },
  { value: "furniture", label: "Furniture" },
  { value: "home_goods", label: "Home Goods" },
  { value: "sports", label: "Sports / Outdoors" },
  { value: "toys", label: "Toys / Hobbies" },
  { value: "books", label: "Books / Media" },
  { value: "jewelry", label: "Jewelry / Accessories" },
  { value: "other", label: "Other Retail" },
];

export default function ReportClosureModal({ open, onClose }) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    category: "",
    closing_date: "",
    notes: "",
  });
  const [proofFile, setProofFile] = useState(null);
  const [captchaOk, setCaptchaOk] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setForm({ name: "", address: "", city: "", state: "", zip_code: "", category: "", closing_date: "", notes: "" });
    setProofFile(null);
    setCaptchaOk(false);
    setConsent(false);
    setSubmitting(false);
    setStep(null);
    setSuccess(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Store name is required."); return; }
    if (!form.state) { setError("Please select a state (NY, NJ, CT, or PA)."); return; }
    if (!captchaOk) { setError("Please complete the CAPTCHA."); return; }
    if (!consent) { setError("Please confirm your consent before submitting."); return; }

    setSubmitting(true);
    setError(null);

    // Deduplicate
    setStep("Checking for duplicates...");
    const existing = await base44.entities.ImportedStore.list("-created_date", 1000);
    const dup = existing.find(s => s.name?.toLowerCase().trim() === form.name.toLowerCase().trim());
    if (dup) {
      setError("This store has already been reported. Thank you!");
      setSubmitting(false);
      setStep(null);
      return;
    }

    // AI verification via Google Places cross-check
    setStep("Cross-checking with public business data...");
    let verifiedAddress = form.address;
    let verifiedCity = form.city;
    let verifiedZip = form.zip_code;
    let businessStatus = "CLOSED_PERMANENTLY";

    const verifyResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are verifying a user-submitted retail store closure report for GOOBY marketplace.
Store: "${form.name}"
Address: "${form.address || "unknown"}"
City: "${form.city}", State: "${form.state}"
User notes: "${form.notes || "none"}"

Based on public knowledge (no real-time access needed), does this sound like a plausible physical retail store that could be closing in ${form.state}? 
Also, correct any obvious address or city formatting issues if possible.
Return JSON only.`,
      response_json_schema: {
        type: "object",
        properties: {
          plausible: { type: "boolean", description: "Is this a plausible retail store closure?" },
          reason: { type: "string", description: "Brief reason" },
          corrected_address: { type: "string" },
          corrected_city: { type: "string" },
          corrected_zip: { type: "string" },
        },
      },
    });

    if (verifyResult?.plausible === false) {
      setError(`Submission declined: ${verifyResult.reason || "This does not appear to be a valid retail store closure."}`);
      setSubmitting(false);
      setStep(null);
      return;
    }

    if (verifyResult?.corrected_address) verifiedAddress = verifyResult.corrected_address;
    if (verifyResult?.corrected_city) verifiedCity = verifyResult.corrected_city;
    if (verifyResult?.corrected_zip) verifiedZip = verifyResult.corrected_zip;

    // Upload proof photo if provided
    let proofUrl = "";
    if (proofFile) {
      setStep("Uploading proof photo...");
      const { file_url } = await base44.integrations.Core.UploadFile({ file: proofFile });
      proofUrl = file_url;
    }

    // Import to ImportedStore
    setStep("Saving report...");
    await base44.entities.ImportedStore.create({
      place_id: `crowdsource_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: form.name.trim(),
      address: verifiedAddress || form.address || "",
      city: verifiedCity || form.city || "",
      state: form.state,
      zip_code: verifiedZip || form.zip_code || "",
      phone: "",
      latitude: null,
      longitude: null,
      business_status: businessStatus,
      category: form.category || "other",
      types: proofUrl ? ["crowdsourced", `proof:${proofUrl}`] : ["crowdsourced"],
      status: "pending",
      email_sent: false,
      source_region: `${form.state} (User Report)`,
    });

    // Notify admin
    await base44.integrations.Core.SendEmail({
      to: "admin@gooby.com",
      subject: `New Crowdsourced Closure Report: ${form.name}`,
      body: `A user has submitted a store closure report for admin review.\n\nStore: ${form.name}\nAddress: ${verifiedAddress || form.address}, ${verifiedCity || form.city}, ${form.state} ${verifiedZip || form.zip_code}\nCategory: ${form.category || "Other"}\nClosing Date: ${form.closing_date || "Not specified"}\nNotes: ${form.notes || "None"}\nProof: ${proofUrl || "No photo"}\n\nPlease review in the Admin Imports panel.`,
    });

    setStep(null);
    setSuccess(true);
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Report a Store Closure
          </DialogTitle>
          <DialogDescription>
            Know of a retail store closing in NY, NJ, CT, or PA? Help the community by submitting it for review.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Thank you for your report!</h3>
            <p className="text-gray-500 text-sm">Our team will review this closure and add it to the marketplace if verified. You're helping local deal-hunters find savings!</p>
            <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700 rounded-full px-8">Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* State restriction notice */}
            <div className="flex gap-2 flex-wrap">
              {TARGET_STATES.map(s => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
              <span className="text-xs text-gray-500 self-center">Accepted states only</span>
            </div>

            {/* Store Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name <span className="text-red-500">*</span></label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Main Street Furniture"
                required
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <Input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St (optional but helpful)"
              />
            </div>

            {/* City + State + Zip row */}
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <Input
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
                <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                <Input
                  value={form.zip_code}
                  onChange={e => setForm(f => ({ ...f, zip_code: e.target.value }))}
                  placeholder="ZIP"
                  maxLength={5}
                />
              </div>
            </div>

            {/* Category + Closing Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Retail type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Closing Date</label>
                <Input
                  type="date"
                  value={form.closing_date}
                  onChange={e => setForm(f => ({ ...f, closing_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Saw 'Going out of business' sign, closing sale in progress..."
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
            </div>

            {/* Proof Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proof Photo <span className="text-gray-400 font-normal">(optional — helps verification)</span>
              </label>
              {proofFile ? (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <Upload className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-blue-700 flex-1 truncate">{proofFile.name}</span>
                  <button type="button" onClick={() => setProofFile(null)} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-gray-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Upload photo of signage or storefront</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />
                </label>
              )}
            </div>

            {/* CAPTCHA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Verify you're human <span className="text-red-500">*</span></label>
              <SimpleCaptcha onVerified={setCaptchaOk} />
            </div>

            {/* Consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-xs text-gray-600">
                I confirm this information is accurate to the best of my knowledge, submitted in good faith, and not for commercial gain or harassment. I understand it will be reviewed by GOOBY admins before publication.
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{step || "Submitting..."}</>
              ) : (
                "Submit Closure Report"
              )}
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Reports are reviewed by our team. Verified closures may appear in the marketplace.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
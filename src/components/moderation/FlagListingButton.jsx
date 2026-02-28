import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Flag, Loader2 } from "lucide-react";
import SimpleCaptcha from "./SimpleCaptcha";

const REASONS = [
  { value: "scam", label: "Scam / Fraud" },
  { value: "fake_discount", label: "Fake or misleading discount" },
  { value: "misleading", label: "Misleading description" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Other" },
];

export default function FlagListingButton({ productId, className = "" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [captchaOk, setCaptchaOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !captchaOk) return;
    setSubmitting(true);

    const user = await base44.auth.me().catch(() => null);

    await base44.entities.FlagReport.create({
      product_id: productId,
      reported_by: user?.email || "anonymous",
      reason,
      details,
    });

    // Increment flag count on product
    const product = await base44.entities.Product.get(productId);
    const newCount = (product.flag_count || 0) + 1;
    const updates = { flag_count: newCount };
    // Auto-flag if 3+ reports
    if (newCount >= 3 && !product.is_flagged) {
      updates.is_flagged = true;
      updates.is_available = false;
      updates.flag_reason = "Auto-flagged: multiple user reports";
    }
    await base44.entities.Product.update(productId, updates);

    setSubmitting(false);
    setDone(true);
    setTimeout(() => { setOpen(false); setDone(false); setReason(""); setDetails(""); setCaptchaOk(false); }, 1500);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors ${className}`}
      >
        <Flag className="w-3 h-3" /> Report
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" /> Report Listing
            </DialogTitle>
          </DialogHeader>

          {done ? (
            <p className="text-green-600 font-medium py-4 text-center">✓ Thank you, report submitted.</p>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason *</label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                  <SelectContent>
                    {REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Additional details (optional)</label>
                <Textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe why this listing seems suspicious..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Security check</label>
                <SimpleCaptcha onVerified={setCaptchaOk} />
              </div>
            </div>
          )}

          {!done && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !reason || !captchaOk}
                className="bg-red-600 hover:bg-red-700"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Submit Report
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
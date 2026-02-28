import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Upload, CheckCircle, ShieldCheck, ShieldAlert, Clock } from "lucide-react";

const STATUS_CONFIG = {
  unverified: { label: "Unverified", color: "bg-gray-100 text-gray-700", icon: ShieldAlert },
  email_verified: { label: "Email Verified", color: "bg-blue-100 text-blue-700", icon: Mail },
  pending_doc_review: { label: "Doc Under Review", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  verified: { label: "Fully Verified", color: "bg-green-100 text-green-700", icon: ShieldCheck },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: ShieldAlert },
};

export default function SellerVerificationCard({ store, onUpdated }) {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const status = store?.verification_status || "unverified";
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unverified;
  const Icon = cfg.icon;

  const handleSendVerification = async () => {
    setSendingEmail(true);
    await base44.functions.invoke("sendVerificationEmail", { storeId: store.id });
    setEmailSent(true);
    setSendingEmail(false);
  };

  const handleUploadDoc = async (file) => {
    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Store.update(store.id, {
      verification_doc_url: file_url,
      verification_status: store.email_verified ? "pending_doc_review" : store.verification_status,
    });
    setUploadingDoc(false);
    onUpdated?.();
  };

  return (
    <Card className="border-2 border-dashed border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Seller Verification
          </CardTitle>
          <Badge className={cfg.color}>
            <Icon className="w-3 h-3 mr-1" />
            {cfg.label}
          </Badge>
        </div>
        <CardDescription>Verified sellers get a trust badge and higher visibility</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Email */}
        <div className={`flex items-center justify-between p-3 rounded-xl ${store?.email_verified ? "bg-green-50 border border-green-200" : "bg-white border border-gray-200"}`}>
          <div className="flex items-center gap-3">
            {store?.email_verified
              ? <CheckCircle className="w-5 h-5 text-green-600" />
              : <Mail className="w-5 h-5 text-gray-400" />}
            <div>
              <p className="text-sm font-medium">Step 1: Email Verification</p>
              <p className="text-xs text-gray-500">{store?.email_verified ? "Email confirmed ✓" : "Verify your store email address"}</p>
            </div>
          </div>
          {!store?.email_verified && (
            <Button size="sm" variant="outline" onClick={handleSendVerification} disabled={sendingEmail || emailSent}>
              {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : emailSent ? "Sent!" : "Send Email"}
            </Button>
          )}
        </div>

        {/* Step 2: Document */}
        <div className={`flex items-center justify-between p-3 rounded-xl ${store?.verification_doc_url ? "bg-green-50 border border-green-200" : "bg-white border border-gray-200"}`}>
          <div className="flex items-center gap-3">
            {store?.verification_doc_url
              ? <CheckCircle className="w-5 h-5 text-green-600" />
              : <Upload className="w-5 h-5 text-gray-400" />}
            <div>
              <p className="text-sm font-medium">Step 2: Business Document</p>
              <p className="text-xs text-gray-500">
                {store?.verification_doc_url
                  ? status === "pending_doc_review" ? "Under review by admin" : "Document accepted ✓"
                  : "Upload a business license or lease agreement"}
              </p>
            </div>
          </div>
          {!store?.verification_doc_url && (
            <label className="cursor-pointer">
              <Button size="sm" variant="outline" asChild>
                <span>
                  {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                  Upload Doc
                </span>
              </Button>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => e.target.files[0] && handleUploadDoc(e.target.files[0])}
              />
            </label>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
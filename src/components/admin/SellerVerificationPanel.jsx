import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, FileText, CheckCircle, X } from "lucide-react";

export default function SellerVerificationPanel() {
  const queryClient = useQueryClient();

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["pending-verification"],
    queryFn: () => base44.entities.Store.filter({ verification_status: "pending_doc_review" }, "-updated_date", 50),
  });

  const approve = async (id) => {
    await base44.entities.Store.update(id, { verification_status: "verified" });
    queryClient.invalidateQueries({ queryKey: ["pending-verification"] });
  };

  const reject = async (id) => {
    await base44.entities.Store.update(id, { verification_status: "rejected" });
    queryClient.invalidateQueries({ queryKey: ["pending-verification"] });
  };

  if (isLoading) return <div className="h-32 bg-gray-100 animate-pulse rounded-xl" />;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-blue-500" />
        Seller Verification Queue ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No pending verifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((store) => (
            <Card key={store.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{store.name}</p>
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending Review</Badge>
                    {store.email_verified && <Badge className="bg-blue-100 text-blue-700 text-xs">Email ✓</Badge>}
                  </div>
                  <p className="text-sm text-gray-500">{store.address}, {store.city}, {store.state}</p>
                  {store.verification_doc_url && (
                    <a
                      href={store.verification_doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:underline"
                    >
                      <FileText className="w-4 h-4" /> View Document
                    </a>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" onClick={() => approve(store.id)} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reject(store.id)} className="text-red-600 border-red-200 hover:bg-red-50">
                    <X className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
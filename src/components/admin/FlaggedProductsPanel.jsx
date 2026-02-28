import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag, CheckCircle, Trash2, AlertTriangle } from "lucide-react";

export default function FlaggedProductsPanel() {
  const queryClient = useQueryClient();

  const { data: flagged = [], isLoading } = useQuery({
    queryKey: ["flagged-products"],
    queryFn: () => base44.entities.Product.filter({ is_flagged: true }, "-updated_date", 50),
  });

  const restore = async (id) => {
    await base44.entities.Product.update(id, { is_flagged: false, is_available: true, flag_reason: null });
    queryClient.invalidateQueries({ queryKey: ["flagged-products"] });
  };

  const remove = async (id) => {
    await base44.entities.Product.delete(id);
    queryClient.invalidateQueries({ queryKey: ["flagged-products"] });
  };

  if (isLoading) return <div className="h-32 bg-gray-100 animate-pulse rounded-xl" />;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Flag className="w-5 h-5 text-red-500" />
        Flagged Listings ({flagged.length})
      </h2>
      {flagged.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No flagged listings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flagged.map((p) => (
            <Card key={p.id} className="p-4 border-red-100 bg-red-50/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    {p.scam_score != null && (
                      <Badge className={`text-xs ${p.scam_score >= 70 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                        AI Score: {p.scam_score}/100
                      </Badge>
                    )}
                    <Badge className="bg-gray-100 text-gray-600 text-xs">{p.flag_count || 0} reports</Badge>
                  </div>
                  {p.flag_reason && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {p.flag_reason}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Original: ${p.original_price?.toFixed(2)} → Sale: ${p.sale_price?.toFixed(2)} ({p.discount_percent}% off)
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => restore(p.id)} className="text-green-700 border-green-200 hover:bg-green-50">
                    <CheckCircle className="w-4 h-4 mr-1" /> Restore
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(p.id)} className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-1" /> Remove
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
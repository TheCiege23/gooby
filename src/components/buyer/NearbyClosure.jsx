import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

const STATE_COLORS = {
  NY: "bg-blue-100 text-blue-800",
  NJ: "bg-green-100 text-green-800",
  CT: "bg-purple-100 text-purple-800",
  PA: "bg-orange-100 text-orange-800"
};

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function NearbyClosure() {
  const [userLat, setUserLat] = React.useState(40.4594); // Sayreville, NJ default
  const [userLng, setUserLng] = React.useState(-74.3608);

  React.useEffect(() => {
    // Try to get user's actual location
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      () => {
        // Default to Sayreville on error
      }
    );
  }, []);

  const { data: closures = [], isLoading } = useQuery({
    queryKey: ["nearby-closures", userLat, userLng],
    queryFn: async () => {
      const imported = await base44.entities.ImportedStore.filter({
        status: "approved"
      }, "-created_date", 500);

      return imported
        .filter(c => c.latitude && c.longitude && ["NY", "NJ", "CT", "PA"].includes(c.state))
        .map(c => ({
          ...c,
          distance: calculateDistance(userLat, userLng, c.latitude, c.longitude)
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 6);
    }
  });

  if (isLoading) {
    return (
      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (closures.length === 0) {
    return null;
  }

  return (
    <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            Nearby Closures
          </h2>
          <p className="text-gray-500 mt-1">Verified store closures in your area</p>
        </div>
        <Link to={createPageUrl("MapView")}>
          <button className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-full text-sm font-medium">
            View Map <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {closures.map((closure) => (
          <Card key={closure.id} className="p-4 hover:shadow-lg transition-all border-l-4 border-l-gray-300">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{closure.name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {closure.distance?.toFixed(1)} miles away
                </p>
              </div>
              <Badge className={STATE_COLORS[closure.state] || "bg-gray-100 text-gray-800"}>
                {closure.state}
              </Badge>
            </div>

            <p className="text-xs text-gray-600 mb-2">{closure.city}, {closure.state}</p>

            {closure.closure_signals?.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {closure.closure_signals.slice(0, 2).map((signal, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {signal}
                  </Badge>
                ))}
              </div>
            )}

            {closure.confidence_score && (
              <p className="text-xs text-gray-500 mb-3">
                Confidence: <span className="font-medium capitalize">{closure.confidence_score}</span>
              </p>
            )}

            <Link to={createPageUrl(`Browse?location=${closure.city},${closure.state}`)}>
              <button className="w-full text-center py-2 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                View Deals →
              </button>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
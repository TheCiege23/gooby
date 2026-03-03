import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Bell, Send, Users, CheckCircle, Trash2, RefreshCw } from "lucide-react";

function ResultBadge({ data }) {
  if (!data) return null;
  if (data.error) return <p className="text-xs text-red-600 mt-2">❌ {data.error}</p>;
  const parts = [];
  if (data.sent !== undefined) parts.push(`Sent: ${data.sent}`);
  if (data.skipped !== undefined) parts.push(`Skipped: ${data.skipped}`);
  if (data.imported !== undefined) parts.push(`Imported: ${data.imported}`);
  if (data.deleted !== undefined) parts.push(`Deleted: ${data.deleted}`);
  return (
    <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
      <CheckCircle className="w-3 h-3" /> {parts.join(' · ')}
    </p>
  );
}

export default function EmailSettingsPanel() {
  const [sending, setSending] = useState(null);
  const [results, setResults] = useState({});

  const trigger = async (key, fn) => {
    setSending(key);
    try {
      const res = await fn();
      setResults(prev => ({ ...prev, [key]: res.data }));
    } catch (err) {
      setResults(prev => ({ ...prev, [key]: { error: err.message } }));
    }
    setSending(null);
  };

  const actions = [
    {
      key: "buyer",
      title: "Buyer Deal Alerts",
      subtitle: "Runs daily via automation",
      icon: Users,
      color: "green",
      description: "Sends personalized emails to buyers with matching clothing & electronics closures. Includes unsubscribe link.",
      buttonLabel: "Send Now",
      fn: () => base44.functions.invoke("sendBuyerAlerts", {}),
    },
    {
      key: "cleanup",
      title: "DB Cleanup",
      subtitle: "Runs weekly via automation",
      icon: Trash2,
      color: "red",
      description: "Removes rejected imports after 30 days and stale pending entries after 90 days to keep the database clean.",
      buttonLabel: "Run Cleanup",
      fn: () => base44.functions.invoke("cleanupExpiredClosures", {}),
    },
    {
      key: "overpass",
      title: "Overpass OSM Scan",
      subtitle: "Manual trigger",
      icon: RefreshCw,
      color: "purple",
      description: "Scans OpenStreetMap for closed clothing & electronics stores in NY/NJ/CT/PA. Notifies admins on completion.",
      buttonLabel: "Run Scan",
      fn: () => base44.functions.invoke("importFromOverpass", {}),
    },
  ];

  const colorMap = {
    green: { bg: "bg-green-100", text: "text-green-600", btn: "bg-green-600 hover:bg-green-700" },
    red: { bg: "bg-red-100", text: "text-red-600", btn: "bg-red-600 hover:bg-red-700" },
    purple: { bg: "bg-purple-100", text: "text-purple-600", btn: "bg-purple-600 hover:bg-purple-700" },
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {actions.map(({ key, title, subtitle, icon: Icon, color, description, buttonLabel, fn }) => {
          const c = colorMap[color];
          return (
            <Card key={key} className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${c.text}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                  <p className="text-xs text-gray-500">{subtitle}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{description}</p>
              <Button
                size="sm"
                className={`w-full text-white ${c.btn}`}
                onClick={() => trigger(key, fn)}
                disabled={sending === key}
              >
                <Send className="w-4 h-4 mr-2" />
                {sending === key ? "Running..." : buttonLabel}
              </Button>
              <ResultBadge data={results[key]} />
            </Card>
          );
        })}
      </div>

      {/* Seller Outreach Note */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Seller Outreach</h3>
            <p className="text-xs text-gray-500">Triggered per store from the Imports tab</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Use the <strong>Alert</strong> button on individual store records in the Store Imports tab to send personalized outreach emails to potential sellers.
        </p>
      </Card>

      {/* Email Template Previews */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Email Template Previews</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <Badge className="mb-2 bg-green-100 text-green-700">Buyer Alert</Badge>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">
{`Hi [NAME],

We found 5 closing-store deals matching
your preferences in clothing & electronics:

• Zara — Newark, NJ (40–70% OFF)
• Best Buy — Trenton, NJ
• H&M — Brooklyn, NY (30% OFF)

Visit GOOBY to browse and save favorites!

─────────────────────
To unsubscribe, update your Deal Alerts.

— The GOOBY Team`}
            </div>
          </Card>

          <Card className="p-4">
            <Badge className="mb-2 bg-orange-100 text-orange-700">Seller Outreach</Badge>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">
{`Hi there,

We noticed [STORE NAME] at [ADDRESS]
may be going through a transition.

GOOBY is a marketplace for closing
retail stores in NY/NJ/CT/PA.

✓ Free to list inventory
✓ Reach local deal-seekers  
✓ Clothing & electronics buyers ready

List your inventory today:
[SIGNUP LINK]

— The GOOBY Team`}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
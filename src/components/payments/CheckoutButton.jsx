import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function CheckoutButton({ type, label, className, variant = "default", icon: Icon }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    // Block checkout in iframe (preview mode)
    if (window.self !== window.top) {
      alert("Checkout is only available from the published app. Please open the app in a new tab.");
      return;
    }

    setLoading(true);
    const res = await base44.functions.invoke("createCheckout", {
      type,
      success_url: window.location.href + (window.location.href.includes("?") ? "&" : "?") + `payment=success&type=${type}`,
      cancel_url: window.location.href + (window.location.href.includes("?") ? "&" : "?") + "payment=cancelled",
    });

    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      alert("Failed to start checkout: " + (res.data?.error || "Unknown error"));
    }
    setLoading(false);
  };

  return (
    <Button onClick={handleCheckout} disabled={loading} variant={variant} className={className}>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : Icon ? (
        <Icon className="w-4 h-4 mr-2" />
      ) : null}
      {label}
    </Button>
  );
}
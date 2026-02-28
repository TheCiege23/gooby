import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

export default function PaymentNotification() {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const type = params.get("type");

    if (payment === "success") {
      const messages = {
        listing_fee: "🎉 Listing fee paid! Your store is now live on GOOBY.",
        premium_subscription: "🎉 Welcome to Premium! Enjoy unlimited alerts and priority AI recommendations.",
      };
      setNotification({ success: true, message: messages[type] || "Payment successful!" });

      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("type");
      window.history.replaceState({}, "", url.toString());
    } else if (payment === "cancelled") {
      setNotification({ success: false, message: "Payment was cancelled. No charges were made." });

      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  if (!notification) return null;

  return (
    <div
      className={`fixed top-20 right-4 z-50 flex items-start gap-3 p-4 rounded-xl shadow-xl max-w-sm border ${
        notification.success
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-red-50 border-red-200 text-red-800"
      }`}
    >
      {notification.success ? (
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      )}
      <p className="text-sm font-medium flex-1">{notification.message}</p>
      <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
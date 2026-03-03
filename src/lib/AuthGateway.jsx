import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

export default function AuthGateway({ mode = "login" }) {
  useEffect(() => {
    const returnUrl = window.location.origin + createPageUrl("Home");
    if (mode === "signup") {
      base44.auth.redirectToLogin(returnUrl);
    } else {
      base44.auth.redirectToLogin(returnUrl);
    }
  }, [mode]);

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );
}

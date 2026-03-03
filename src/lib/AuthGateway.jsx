import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogIn } from "lucide-react";

export default function AuthGateway({ mode = "login" }) {
  const location = useLocation();

  const from = new URLSearchParams(location.search).get("from") || `${window.location.origin}/`;

  useEffect(() => {
    if (mode === "signup" && typeof base44.auth.redirectToSignup === "function") {
      base44.auth.redirectToSignup(from);
      return;
    }

    base44.auth.redirectToLogin(from);
  }, [from, mode]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center border-blue-100">
        <div className="w-14 h-14 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center">
          <LogIn className="w-6 h-6 text-blue-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Redirecting to {mode === "signup" ? "sign up" : "sign in"}…</h1>
        <p className="text-sm text-gray-600 mb-5">If you are not redirected automatically, use the button below.</p>
        <Button
          onClick={() => {
            if (mode === "signup" && typeof base44.auth.redirectToSignup === "function") {
              base44.auth.redirectToSignup(from);
            } else {
              base44.auth.redirectToLogin(from);
            }
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Continue
        </Button>
      </Card>
    </div>
  );
}

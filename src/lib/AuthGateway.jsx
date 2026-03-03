import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { LogIn, UserPlus } from "lucide-react";

const initialSignup = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  zipCode: "",
  password: "",
};

export default function AuthGateway({ mode = "login" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(initialSignup);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = useMemo(
    () => new URLSearchParams(location.search).get("from") || `${window.location.origin}${createPageUrl("Home")}`,
    [location.search],
  );

  const applyPostLoginProfile = async (payload) => {
    await base44.auth.updateMe({
      full_name: payload.fullName,
      username: payload.username,
      phone: payload.phone,
      zip_code: payload.zipCode,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(identifier.trim(), password);
      window.location.assign(from);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Sign in failed. Please check your credentials.");
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.register({ email: signup.email.trim(), password: signup.password });
      await base44.auth.loginViaEmailPassword(signup.email.trim(), signup.password);
      await applyPostLoginProfile(signup);
      window.location.assign(from);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Sign up failed. Please verify the form and try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-6 border-blue-100">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-100 mx-auto mb-3 flex items-center justify-center">
            {mode === "signup" ? <UserPlus className="w-6 h-6 text-blue-600" /> : <LogIn className="w-6 h-6 text-blue-600" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{mode === "signup" ? "Create your GOOBY account" : "Welcome back"}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {mode === "signup" ? "Sign up to save deals, follow stores, and get AI recommendations." : "Sign in using your email or username and password."}
          </p>
        </div>

        {mode === "signup" ? (
          <form className="space-y-3" onSubmit={handleSignup}>
            <Input placeholder="Full name" value={signup.fullName} onChange={(e) => setSignup((p) => ({ ...p, fullName: e.target.value }))} required />
            <Input placeholder="Username" value={signup.username} onChange={(e) => setSignup((p) => ({ ...p, username: e.target.value }))} required />
            <Input type="email" placeholder="Email" value={signup.email} onChange={(e) => setSignup((p) => ({ ...p, email: e.target.value }))} required />
            <Input placeholder="Phone number (for verification)" value={signup.phone} onChange={(e) => setSignup((p) => ({ ...p, phone: e.target.value }))} required />
            <Input placeholder="ZIP code" value={signup.zipCode} onChange={(e) => setSignup((p) => ({ ...p, zipCode: e.target.value.replace(/\D/g, "").slice(0, 5) }))} required />
            <Input type="password" placeholder="Password" value={signup.password} onChange={(e) => setSignup((p) => ({ ...p, password: e.target.value }))} required minLength={8} />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate(`/login?from=${encodeURIComponent(from)}`)}>
              Already have an account? Sign in
            </Button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handleLogin}>
            <Input placeholder="Email or username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate(`/signup?from=${encodeURIComponent(from)}`)}>
              New here? Create account
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

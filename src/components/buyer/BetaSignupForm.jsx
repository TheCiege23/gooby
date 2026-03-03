import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Check } from "lucide-react";

export default function BetaSignupForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await base44.entities.BetaSignup.create({
      email,
      name,
      zip_code: zipCode,
      interests: [],
      status: "pending"
    });

    setSubmitted(true);
    setEmail("");
    setName("");
    setZipCode("");
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {submitted ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to GOOBY Beta!</h3>
          <p className="text-gray-600 mb-4">
            Thanks for signing up. We'll notify you as soon as we launch in your area.
          </p>
          <Button
            variant="outline"
            onClick={() => setSubmitted(false)}
            className="rounded-full"
          >
            Sign up another email
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Full Name
            </label>
            <Input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl border-gray-200"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl border-gray-200"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Zip Code (optional)
            </label>
            <Input
              type="text"
              placeholder="08872"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="h-12 rounded-xl border-gray-200"
              maxLength="5"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || !email || !name}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold"
          >
            {loading ? "Signing up..." : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Join Beta
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            We'll only email you about GOOBY updates. No spam, ever.
          </p>
        </form>
      )}
    </div>
  );
}
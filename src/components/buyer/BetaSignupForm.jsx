import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Zap, Check } from "lucide-react";

const TARGET_STATES = ["NY", "NJ", "CT", "PA"];

const CORE_CATEGORIES = [
  { label: "Clothing", value: "clothing" },
  { label: "Electronics", value: "electronics" },
  { label: "Shoes", value: "shoes" },
  { label: "Furniture", value: "furniture" },
  { label: "Home Goods", value: "home_goods" },
  { label: "Sports", value: "sports" },
  { label: "Jewelry", value: "jewelry" },
  { label: "Accessories", value: "accessories" },
  { label: "Books", value: "books" },
  { label: "Toys", value: "toys" },
];

export default function BetaSignupForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [state, setState] = useState("NJ");
  const [interests, setInterests] = useState(["clothing", "electronics"]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const toggleInterest = (value) => {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!TARGET_STATES.includes(state)) {
      setError("GOOBY beta is currently available only in NY, NJ, CT, and PA.");
      return;
    }

    setLoading(true);

    try {
      await base44.entities.BetaSignup.create({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        zip_code: zipCode.trim(),
        state,
        interests,
        status: "pending",
      });

      setSubmitted(true);
      setEmail("");
      setName("");
      setZipCode("");
      setInterests(["clothing", "electronics"]);
    } catch (err) {
      setError(err.message || "Could not sign up right now.");
    }

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
            Thanks for signing up. We&apos;ll notify you when matching closures appear in NY/NJ/CT/PA.
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">State *</label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_STATES.map((stateCode) => (
                    <SelectItem key={stateCode} value={stateCode}>{stateCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Zip Code (optional)
              </label>
              <Input
                type="text"
                placeholder="08872"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                className="h-12 rounded-xl border-gray-200"
                maxLength="5"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Interests</label>
            <div className="flex flex-wrap gap-2">
              {CORE_CATEGORIES.map((cat) => (
                <Badge
                  key={cat.value}
                  variant={interests.includes(cat.value) ? "default" : "outline"}
                  onClick={() => toggleInterest(cat.value)}
                  className="cursor-pointer"
                >
                  {cat.label}
                </Badge>
              ))}
            </div>
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
        </form>
      )}
    </div>
  );
}
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";

export default function Landing() {
  const [zipCode, setZipCode] = useState("");
  const navigate = useNavigate();

  const sanitizedZip = zipCode.replace(/\D/g, "").slice(0, 5);

  const handleGuestSearch = (e) => {
    e.preventDefault();
    if (sanitizedZip.length !== 5) return;
    navigate(createPageUrl(`Browse?location=${sanitizedZip}`));
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-white to-blue-50">
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="mb-12 flex justify-center">
          <img 
            src="/gooby-logo.png"
            alt="GOOBY"
            className="h-48 w-auto object-contain"
          />
        </div>
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
          <Sparkles className="w-4 h-4" />
          AI-powered closure discovery and deal matching
        </div>

        <p className="text-lg text-gray-600 mb-8">
          Discover closing-store deals in NY, NJ, CT, and PA. Search by zip code, browse by category,
          and save on clothing, electronics, shoes, accessories, and food.
        </p>

        <form onSubmit={handleGuestSearch} className="max-w-lg mx-auto space-y-3 mb-6">
          <Input
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="Enter 5-digit zip code (e.g. 10001)"
            className="h-12 text-center"
            inputMode="numeric"
            maxLength={5}
          />
          <Button
            type="submit"
            className="w-full h-12 bg-blue-600 hover:bg-blue-700"
            disabled={sanitizedZip.length !== 5}
          >
            Explore Deals Near My Zip
          </Button>
        </form>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            className="bg-gray-900 hover:bg-black"
            onClick={() => window.location.assign(`/signup?from=${encodeURIComponent(window.location.origin + createPageUrl("Home"))}`)}
          >
            Sign up free
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.assign(`/login?from=${encodeURIComponent(window.location.origin + createPageUrl("Home"))}`)}
          >
            Sign in
          </Button>
          <Link to={createPageUrl("Terms")}>
            <Button variant="outline">Terms & Conditions</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

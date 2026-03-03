import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";

export default function AIChatBubble({ isAuthenticated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! Ask me about products and stores listed on GOOBY. I can recommend options based on your activity and area.",
      recommendations: [],
    },
  ]);

  const locationHint = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("location") || "";
  }, []);

  if (!isAuthenticated) return null;

  const askAssistant = async () => {
    const q = question.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await base44.functions.invoke("chatProductStoreAssistant", {
        question: q,
        locationHint,
      });

      if (res.data?.error) throw new Error(res.data.error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.data?.answer || "I couldn't find enough context for that. Try asking about a category or store near your zip.",
          recommendations: res.data?.recommendations || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: err.message || "Assistant request failed.", recommendations: [] }]);
    }

    setLoading(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {open ? (
        <Card className="w-[360px] h-[520px] shadow-2xl border-blue-100 overflow-hidden flex flex-col">
          <div className="p-3 bg-blue-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="w-4 h-4" /> GOOBY AI Assistant
            </div>
            <Button size="icon" variant="ghost" className="text-white hover:bg-blue-500" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-white to-blue-50">
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={`inline-block max-w-[90%] px-3 py-2 rounded-xl text-sm ${
                    m.role === "user" ? "bg-blue-600 text-white" : "bg-white border border-blue-100 text-gray-700"
                  }`}
                >
                  {m.text}
                </div>
                {m.role === "assistant" && m.recommendations?.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2">
                    {m.recommendations.slice(0, 4).map((r) => (
                      <Link
                        key={`${r.type}-${r.id}`}
                        to={createPageUrl(r.type === "product" ? `ProductDetail?id=${r.id}` : `StoreProfile?id=${r.id}`)}
                        className="text-xs px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200"
                      >
                        {r.name} {r.reason ? `— ${r.reason}` : ""}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 border-t bg-white flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askAssistant()}
              placeholder="Ask about products or stores..."
            />
            <Button onClick={askAssistant} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}
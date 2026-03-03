import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";

export default function AIChatBubble({ isAuthenticated }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Chat Bubble Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg z-40"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-40">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">AI Shopping Assistant</h3>
            <p className="text-xs text-gray-500">Ask me about deals and stores</p>
          </div>
          <div className="p-4 h-[calc(100%-120px)] overflow-y-auto">
            <p className="text-sm text-gray-500 text-center">Chat interface coming soon...</p>
          </div>
        </div>
      )}
    </>
  );
}
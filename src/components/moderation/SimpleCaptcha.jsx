import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";

function generateChallenge() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const ops = [
    { label: `${a} + ${b}`, answer: a + b },
    { label: `${a + b} - ${b}`, answer: a },
    { label: `${a} × ${Math.min(b, 5)}`, answer: a * Math.min(b, 5) },
  ];
  return ops[Math.floor(Math.random() * ops.length)];
}

export default function SimpleCaptcha({ onVerified }) {
  const [challenge, setChallenge] = useState(generateChallenge());
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [verified, setVerified] = useState(false);

  const refresh = () => {
    setChallenge(generateChallenge());
    setInput("");
    setError(false);
    setVerified(false);
    onVerified(false);
  };

  useEffect(() => {
    if (input === "") return;
    const isCorrect = parseInt(input) === challenge.answer;
    if (isCorrect) {
      setVerified(true);
      setError(false);
      onVerified(true);
    } else {
      setError(true);
      setVerified(false);
      onVerified(false);
    }
  }, [input]);

  return (
    <div className="flex items-center gap-3">
      <div className="bg-gray-100 px-4 py-2 rounded-lg font-mono text-base font-semibold text-gray-700 select-none min-w-[100px] text-center">
        {challenge.label} = ?
      </div>
      <Input
        type="number"
        placeholder="Answer"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className={`w-24 ${error ? "border-red-400" : verified ? "border-green-400" : ""}`}
      />
      <button type="button" onClick={refresh} className="text-gray-400 hover:text-gray-600 transition-colors">
        <RefreshCw className="w-4 h-4" />
      </button>
      {verified && <span className="text-green-600 text-sm font-medium">✓ Verified</span>}
      {error && <span className="text-red-500 text-sm">Try again</span>}
    </div>
  );
}
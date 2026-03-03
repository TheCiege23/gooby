import React from "react";

export default function GoobyWordmark({ className = "", large = false }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className={`relative ${large ? "h-16 w-16" : "h-10 w-10"}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-red-600" />
        <span className={`absolute inset-0 flex items-center justify-center text-white font-black ${large ? "text-3xl" : "text-xl"}`}>G</span>
      </div>
      <span className={`font-black tracking-tight bg-gradient-to-r from-sky-500 via-yellow-500 via-40% to-green-500 bg-clip-text text-transparent ${large ? "text-6xl" : "text-2xl"}`}>
        OOBY
      </span>
    </div>
  );
}
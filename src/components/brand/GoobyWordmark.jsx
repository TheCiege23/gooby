import React from "react";

export default function GoobyWordmark({ className = "", large = false }) {
  return (
    <img
      src="/gooby-logo.png"
      alt="GOOBY"
      className={`${large ? "h-32 md:h-40" : "h-12"} w-auto object-contain ${className}`}
    />
  );
}

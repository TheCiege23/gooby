import express from "express";
import cors from "cors";
import { chat, analyzeImage } from "./xai.js";
import { sendSMS } from "./twilio.js";
import { sendEmail } from "./resend.js";
import { searchNews, getTopHeadlines } from "./newsapi.js";

const app = express();

const allowedOrigins = process.env.REPLIT_DOMAINS
  ? process.env.REPLIT_DOMAINS.split(",").map(d => `https://${d}`)
  : [];
allowedOrigins.push("http://localhost:5000", "http://127.0.0.1:5000");

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o)) || origin.includes(".replit")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
}));
app.use(express.json());

function requireOrigin(req, res, next) {
  const origin = req.get("origin") || req.get("referer") || "";
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
  const isReplit = origin.includes(".replit");
  if (!origin || isLocal || isReplit) return next();
  return res.status(403).json({ error: "Forbidden" });
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", services: ["xai", "twilio", "resend", "newsapi"] });
});

app.post("/api/xai/chat", requireOrigin, async (req, res) => {
  try {
    const { messages, model, maxTokens, responseFormat } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }
    const result = await chat(messages, { model, maxTokens, responseFormat });
    res.json({ result });
  } catch (err) {
    console.error("xAI chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/xai/analyze-image", requireOrigin, async (req, res) => {
  try {
    const { imageUrl, prompt } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });
    const result = await analyzeImage(imageUrl, prompt);
    res.json({ result });
  } catch (err) {
    console.error("xAI vision error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/twilio/sms", requireOrigin, async (req, res) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) return res.status(400).json({ error: "to and body are required" });
    const result = await sendSMS(to, body);
    res.json({ result });
  } catch (err) {
    console.error("Twilio SMS error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/resend/email", requireOrigin, async (req, res) => {
  try {
    const { from, to, subject, html, text } = req.body;
    if (!to || !subject) return res.status(400).json({ error: "to and subject are required" });
    const result = await sendEmail({ from, to, subject, html, text });
    res.json({ result });
  } catch (err) {
    console.error("Resend email error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/news/search", requireOrigin, async (req, res) => {
  try {
    const { q, language, sortBy, pageSize, from, to } = req.query;
    if (!q) return res.status(400).json({ error: "q (query) is required" });
    const result = await searchNews(q, { language, sortBy, pageSize: Number(pageSize) || 10, from, to });
    res.json(result);
  } catch (err) {
    console.error("NewsAPI search error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/news/headlines", requireOrigin, async (req, res) => {
  try {
    const { country, category, q, pageSize } = req.query;
    const result = await getTopHeadlines({ country, category, q, pageSize: Number(pageSize) || 10 });
    res.json(result);
  } catch (err) {
    console.error("NewsAPI headlines error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV === "production") {
  const { fileURLToPath } = await import("url");
  const path = await import("path");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" });
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = process.env.PORT || 3001;
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
app.listen(PORT, HOST, () => {
  console.log(`Backend server running on http://${HOST}:${PORT}`);
});

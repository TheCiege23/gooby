import { chat } from "./xai.js";
import { searchNews } from "./newsapi.js";

const TARGET_STATES = ["NY", "NJ", "CT", "PA"];

const SEARCH_QUERIES = [
  "store closing sale New York 2025 2026",
  "retail store closing New Jersey 2025 2026",
  "going out of business sale Connecticut 2025 2026",
  "store liquidation Pennsylvania 2025 2026",
  "retail bankruptcy Northeast US 2025 2026",
  "clothing store closing NYC NJ 2025 2026",
  "electronics store shutting down NY NJ CT PA",
  "furniture store liquidation sale Northeast",
  "shoe store closing sale tri-state area",
  "small business closing permanently New York New Jersey",
];

const X_SEARCH_QUERIES = [
  "store closing sale NYC OR \"New York\" OR NJ OR \"New Jersey\" OR CT OR PA",
  "going out of business sale NYC OR NJ OR CT OR PA",
  "retail closing permanently tri-state area",
  "liquidation sale store closing NYC NJ",
  "shop shutting down New York New Jersey Connecticut Pennsylvania",
];

const EXTRACTION_PROMPT = `You are a retail closure intelligence analyst for the GOOBY platform.
Given the following raw text data (from news articles, social media posts, or web search results),
extract any retail store closures in NY, NJ, CT, or PA.

For each closure found, extract:
- name: store/business name
- city: city location
- state: two-letter state code (NY, NJ, CT, or PA only)
- category: one of clothing, electronics, shoes, furniture, home_goods, jewelry, food, accessories, sports, books, toys, other
- closure_signals: array of signals like "going out of business sign", "liquidation sale", "bankruptcy filing", "lease expired", etc.
- address: street address if available, otherwise empty string
- source_note: where this info came from (article title, tweet, etc.)

Rules:
- Only include stores in NY, NJ, CT, or PA
- Skip national chain announcements unless they specifically mention a local store location
- Skip stores that are just having a regular sale (not actually closing)
- Return empty array if no valid closures found

Return strict JSON: { "closures": [...] }`;

let scanResults = { lastRun: null, lastResults: [], isRunning: false, history: [] };

async function searchXPosts(query) {
  try {
    const prompt = `Search X (Twitter) for recent posts about: "${query}"

Look for posts from the last 30 days mentioning retail store closures, going-out-of-business sales,
liquidation events, or permanent store closings in New York, New Jersey, Connecticut, or Pennsylvania.

Provide the text content of any relevant posts you find, including the approximate date and any
location details mentioned. If you find no relevant posts, say "No relevant posts found."`;

    const result = await chat(
      [{ role: "user", content: prompt }],
      { model: "grok-3-mini-fast", maxTokens: 2000 }
    );
    return result;
  } catch (err) {
    console.error("X search error:", err.message);
    return null;
  }
}

async function searchNewsForClosures() {
  const allArticles = [];
  const newsQueries = [
    "store closing sale",
    "retail bankruptcy",
    "going out of business",
    "store liquidation",
    "retail store shutting down",
  ];

  for (const q of newsQueries) {
    try {
      const result = await searchNews(q, { pageSize: 5, sortBy: "publishedAt" });
      if (result.articles) {
        allArticles.push(...result.articles);
      }
    } catch (err) {
      console.error(`NewsAPI query "${q}" failed:`, err.message);
    }
  }

  return allArticles;
}

async function extractClosuresFromText(rawText) {
  try {
    const result = await chat(
      [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: rawText.slice(0, 12000) }
      ],
      {
        model: "grok-3-mini-fast",
        maxTokens: 3000,
        responseFormat: { type: "json_object" }
      }
    );

    const parsed = JSON.parse(result);
    return (parsed.closures || []).filter(
      c => c.name && c.city && TARGET_STATES.includes(c.state?.toUpperCase())
    ).map(c => ({ ...c, state: c.state.toUpperCase() }));
  } catch (err) {
    console.error("Extraction error:", err.message);
    return [];
  }
}

export async function runClosureScan({ mode = "full" } = {}) {
  if (scanResults.isRunning) {
    return { status: "already_running", message: "A scan is already in progress" };
  }

  scanResults.isRunning = true;
  const startTime = Date.now();
  const allClosures = [];
  const seenKeys = new Set();
  const sources = { news: 0, x: 0, web: 0 };

  const isPartial = mode === "partial";
  console.log(`[ClosureScanner] Starting ${isPartial ? "partial" : "full"} scan...`);

  try {
    const newsArticles = await searchNewsForClosures();
    if (newsArticles.length > 0) {
      const newsText = newsArticles.map(a =>
        `Title: ${a.title}\nSource: ${a.source?.name}\nDate: ${a.publishedAt}\nDescription: ${a.description || ""}\nContent: ${a.content || ""}`
      ).join("\n---\n");

      const newsClosures = await extractClosuresFromText(newsText);
      for (const c of newsClosures) {
        const key = `${c.name}|${c.city}|${c.state}`.toLowerCase();
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allClosures.push({ ...c, discovered_via: "news" });
          sources.news++;
        }
      }
      console.log(`[ClosureScanner] NewsAPI: found ${newsClosures.length} closures from ${newsArticles.length} articles`);
    }

    const xQueries = isPartial ? X_SEARCH_QUERIES.slice(0, 2) : X_SEARCH_QUERIES;
    for (const query of xQueries) {
      const xResult = await searchXPosts(query);
      if (xResult && !xResult.includes("No relevant posts found")) {
        const xClosures = await extractClosuresFromText(xResult);
        for (const c of xClosures) {
          const key = `${c.name}|${c.city}|${c.state}`.toLowerCase();
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            allClosures.push({ ...c, discovered_via: "x_twitter" });
            sources.x++;
          }
        }
      }
    }
    console.log(`[ClosureScanner] X/Twitter: found ${sources.x} unique closures`);

    const webQueries = isPartial ? SEARCH_QUERIES.slice(0, 2) : SEARCH_QUERIES.slice(0, 5);
    for (const query of webQueries) {
      try {
        const webPrompt = `Search the web for: "${query}"
Find specific retail stores that are closing, going out of business, or having liquidation sales.
Focus only on stores in New York, New Jersey, Connecticut, and Pennsylvania.
List the store names, cities, states, and any details about the closure.`;

        const webResult = await chat(
          [{ role: "user", content: webPrompt }],
          { model: "grok-3-mini-fast", maxTokens: 2000 }
        );

        if (webResult) {
          const webClosures = await extractClosuresFromText(webResult);
          for (const c of webClosures) {
            const key = `${c.name}|${c.city}|${c.state}`.toLowerCase();
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              allClosures.push({ ...c, discovered_via: "web_search" });
              sources.web++;
            }
          }
        }
      } catch (err) {
        console.error(`[ClosureScanner] Web query failed:`, err.message);
      }
    }
    console.log(`[ClosureScanner] Web search: found ${sources.web} unique closures`);

  } catch (err) {
    console.error("[ClosureScanner] Scan error:", err.message);
  } finally {
    scanResults.isRunning = false;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const result = {
    timestamp: new Date().toISOString(),
    duration_seconds: Number(duration),
    total_found: allClosures.length,
    sources,
    closures: allClosures,
  };

  scanResults.lastRun = result.timestamp;
  scanResults.lastResults = allClosures;
  scanResults.history.push({ timestamp: result.timestamp, total: allClosures.length, sources });
  if (scanResults.history.length > 50) scanResults.history = scanResults.history.slice(-50);

  console.log(`[ClosureScanner] Scan complete: ${allClosures.length} closures found in ${duration}s`);
  return result;
}

export function getScanStatus() {
  return {
    isRunning: scanResults.isRunning,
    lastRun: scanResults.lastRun,
    lastResultCount: scanResults.lastResults.length,
    history: scanResults.history.slice(-10),
  };
}

export function getLastResults() {
  return scanResults.lastResults;
}

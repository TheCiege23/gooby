const NEWSAPI_BASE = "https://newsapi.org/v2";

export async function searchNews(query, options = {}) {
  const params = new URLSearchParams({
    q: query,
    apiKey: process.env.NEWSAPI_KEY,
    language: options.language || "en",
    sortBy: options.sortBy || "publishedAt",
    pageSize: String(options.pageSize || 10),
    ...(options.from && { from: options.from }),
    ...(options.to && { to: options.to }),
  });

  const res = await fetch(`${NEWSAPI_BASE}/everything?${params}`);
  const data = await res.json();
  if (data.status !== "ok") throw new Error(data.message || "NewsAPI request failed");
  return data;
}

export async function getTopHeadlines(options = {}) {
  const params = new URLSearchParams({
    apiKey: process.env.NEWSAPI_KEY,
    country: options.country || "us",
    pageSize: String(options.pageSize || 10),
    ...(options.category && { category: options.category }),
    ...(options.q && { q: options.q }),
  });

  const res = await fetch(`${NEWSAPI_BASE}/top-headlines?${params}`);
  const data = await res.json();
  if (data.status !== "ok") throw new Error(data.message || "NewsAPI request failed");
  return data;
}

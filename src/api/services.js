const API_BASE = "/api";

export const xaiService = {
  async chat(messages, options = {}) {
    const res = await fetch(`${API_BASE}/xai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, ...options }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async analyzeImage(imageUrl, prompt) {
    const res = await fetch(`${API_BASE}/xai/analyze-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, prompt }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
};

export const twilioService = {
  async sendSMS(to, body) {
    const res = await fetch(`${API_BASE}/twilio/sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, body }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
};

export const resendService = {
  async sendEmail({ from, to, subject, html, text }) {
    const res = await fetch(`${API_BASE}/resend/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
};

export const scannerService = {
  async triggerScan() {
    const res = await fetch(`${API_BASE}/scanner/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async runScan(mode = "full") {
    const res = await fetch(`${API_BASE}/scanner/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async getStatus() {
    const res = await fetch(`${API_BASE}/scanner/status`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async getResults() {
    const res = await fetch(`${API_BASE}/scanner/results`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
};

export const newsService = {
  async search(query, options = {}) {
    const params = new URLSearchParams({ q: query, ...options });
    const res = await fetch(`${API_BASE}/news/search?${params}`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async headlines(options = {}) {
    const params = new URLSearchParams(options);
    const res = await fetch(`${API_BASE}/news/headlines?${params}`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
};

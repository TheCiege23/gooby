# GOOBY - Closing Store Marketplace

A marketplace platform for discovering and purchasing inventory from closing retail stores, focused on the NY, NJ, CT, and PA areas.

## Tech Stack

- **Frontend:** React 18 + Vite 6
- **Styling:** Tailwind CSS + shadcn/ui (Radix UI)
- **Routing:** React Router v6
- **State/Data Fetching:** TanStack Query v5
- **Backend/Auth/DB:** Base44 SDK (managed platform)
- **Backend API Server:** Express.js (port 3001)
- **AI:** xAI/Grok (via OpenAI-compatible API)
- **SMS:** Twilio
- **Email:** Resend
- **News:** NewsAPI
- **Scheduling:** node-cron (automated scans)
- **Maps:** React Leaflet
- **Payments:** Stripe
- **Animations:** Framer Motion

## Project Structure

```
├── server/              # Express.js backend server
│   ├── index.js         # Main server entry, API routes
│   ├── xai.js           # xAI/Grok integration (chat, vision)
│   ├── closureScanner.js # Automated store closure discovery (news, X, web)
│   ├── twilio.js        # Twilio SMS integration
│   ├── resend.js        # Resend email integration
│   └── newsapi.js       # NewsAPI integration
├── functions/           # Base44 serverless/edge functions (TypeScript)
├── src/
│   ├── api/
│   │   ├── base44Client.js   # Base44 SDK config
│   │   └── services.js       # Frontend API client for backend services
│   ├── components/      # React components (admin, buyer, seller, ui)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Auth context, query client, utils
│   ├── pages/           # Route-level page components
│   └── utils/           # Helper functions
├── public/              # Static assets (gooby-logo.png)
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## Development

- **Start:** `npm run dev` (runs backend on port 3001 + Vite frontend on port 5000)
- **Build:** `npm run build`
- Vite proxies `/api/*` requests to the backend server

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/xai/chat` - xAI/Grok chat (body: `{messages, model?, maxTokens?}`)
- `POST /api/xai/analyze-image` - xAI vision (body: `{imageUrl, prompt?}`)
- `POST /api/twilio/sms` - Send SMS (body: `{to, body}`)
- `POST /api/resend/email` - Send email (body: `{from?, to, subject, html?, text?}`)
- `GET /api/news/search?q=...` - Search news articles
- `GET /api/news/headlines` - Get top headlines
- `POST /api/scanner/run` - Trigger a manual closure scan
- `GET /api/scanner/status` - Get scanner status and history
- `GET /api/scanner/results` - Get last scan results

## Required Secrets

- `XAI_API_KEY` - xAI/Grok API key
- `GROK_API_KEY` - Grok API key (alias)
- `TWILIO_ACCOUNT_SID` - Twilio Account SID (must start with "AC")
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `RESEND_API_KEY` - Resend API key
- `NEWSAPI_KEY` - NewsAPI key

## Replit Configuration

- Frontend server: `0.0.0.0:5000` with `allowedHosts: true` for proxy compatibility
- Backend server: `localhost:3001`
- Workflow: "Start application" → `npm run dev`
- Deployment: Autoscale (build: `npm run build`, run: `node server/index.js`)

## Notes

- This app uses the Base44 platform for authentication, database entities, and serverless functions
- The Base44 SDK requires the app to be registered on the Base44 platform for full functionality
- 404 errors from the SDK in development are expected when not connected to a Base44 app context
- Twilio initialization is lazy - it only validates credentials when an SMS is actually sent
- Frontend uses `src/api/services.js` to call backend API endpoints
- Automated closure scanning runs on a schedule: Tue/Fri at 7am and Mon/Wed at 12pm
- Scanner searches NewsAPI, X (Twitter) via Grok, and general web for store closures in NY/NJ/CT/PA
- Discovered closures are returned via API (not auto-saved to DB — admin review step)

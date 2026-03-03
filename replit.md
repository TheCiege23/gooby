# GOOBY - Closing Store Marketplace

A marketplace platform for discovering and purchasing inventory from closing retail stores, focused on the NY, NJ, CT, and PA areas.

## Tech Stack

- **Frontend:** React 18 + Vite 6
- **Styling:** Tailwind CSS + shadcn/ui (Radix UI)
- **Routing:** React Router v6
- **State/Data Fetching:** TanStack Query v5
- **Backend/Auth/DB:** Base44 SDK (managed platform)
- **Maps:** React Leaflet
- **Payments:** Stripe
- **Animations:** Framer Motion

## Project Structure

```
├── functions/        # Serverless/edge functions (TypeScript)
├── src/
│   ├── api/          # Base44 SDK client config
│   ├── components/   # React components (admin, buyer, seller, ui)
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Auth context, query client, utils
│   ├── pages/        # Route-level page components
│   └── utils/        # Helper functions
├── public/           # Static assets
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## Development

- **Start:** `npm run dev` (runs on port 5000)
- **Build:** `npm run build`

## Replit Configuration

- Frontend server: `0.0.0.0:5000` with `allowedHosts: true` for proxy compatibility
- Workflow: "Start application" → `npm run dev`
- Deployment: Static site (`npm run build` → `dist/`)

## Notes

- This app uses the Base44 platform for authentication, database entities, and serverless functions
- The Base44 SDK requires the app to be registered on the Base44 platform for full functionality
- 404 errors from the SDK in development are expected when not connected to a Base44 app context

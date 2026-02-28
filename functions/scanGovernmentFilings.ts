import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// This function is intentionally disabled.
// Gov filings import is now upload-only via the Admin Imports UI.
// No automated scraping or external data pulls are performed.

Deno.serve(async (req) => {
  return Response.json({
    error: "Automated gov filings scanning is disabled. Use the manual upload feature in Admin Imports → Gov Filings tab."
  }, { status: 410 });
});
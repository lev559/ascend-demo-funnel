// Public IDs. These are visible in any site's code, so they can live in the repo.
// Environment variables override them; secrets (Stripe, Cloudflare token) are NEVER put here.
export const PUBLIC = {
  mixpanelToken: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "",
  mixpanelHost: process.env.NEXT_PUBLIC_MIXPANEL_API_HOST || "https://api-eu.mixpanel.com",
  growthbookKey: process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY || "",
  growthbookHost: process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST || "https://cdn.growthbook.io",
  gtmId: process.env.NEXT_PUBLIC_GTM_ID || "GTM-NMMVT58P",
};

// LLM endpoint for the coach chat (server only). Only LLM_API_KEY must come from the environment.
export const LLM = {
  baseUrl: process.env.LLM_BASE_URL || "https://api.cloudflare.com/client/v4/accounts/d83d9ac1518c0e87cfd527a30b1d8808/ai/v1",
  model: process.env.LLM_MODEL || "@cf/google/gemma-4-26b-a4b-it",
};

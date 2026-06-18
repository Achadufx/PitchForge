import { ApifyClient } from 'apify-client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log("🔑 API Token exists?", !!process.env.APIFY_API_TOKEN);

  try {
    if (!process.env.APIFY_API_TOKEN) {
      return res.status(500).json({ 
        error: 'APIFY_API_TOKEN is not configured. Please add it to Vercel environment variables.' 
      });
    }

    const client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });

    const actorId = "crawlerbros~pitchbook-investors-scraper";
    const searchQuery = req.body.sector || "venture capital";

    const input = {
      searchQuery: searchQuery,
      maxItems: 20,
    };

    console.log("🚀 Fetching investors from PitchBook...");
    console.log("🔍 Search query:", searchQuery);

    const run = await client.actor(actorId).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`✅ Found ${items.length} investors`);

    res.status(200).json({ 
      success: true, 
      investors: items,
      count: items.length 
    });

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ 
      error: 'Failed to fetch investors',
      details: error.message 
    });
  }
}

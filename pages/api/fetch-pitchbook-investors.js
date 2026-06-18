import { ApifyClient } from 'apify-client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sector, stage, region } = req.body;

  try {
    // Initialize Apify client with your token from Vercel env
    const client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });

    // PitchBook scraper Actor
    const actorId = "crawlerbros~pitchbook-investors-scraper";

    // Build search query
    let searchQuery = "venture capital";
    if (sector) {
      searchQuery = sector;
    }

    const input = {
      searchQuery: searchQuery,
      maxItems: 50,
    };

    console.log("🚀 Fetching investors from PitchBook...");

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
      error: 'Failed to fetch investors from PitchBook',
      details: error.message 
    });
  }
}

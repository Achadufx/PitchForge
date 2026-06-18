import { ApifyClient } from 'apify-client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sector } = req.body;

  try {
    // Check if API token exists
    if (!process.env.APIFY_API_TOKEN) {
      console.error("❌ APIFY_API_TOKEN is not set in environment variables");
      return res.status(500).json({ 
        error: 'APIFY_API_TOKEN is not configured. Please add it to Vercel environment variables.' 
      });
    }

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
      maxItems: 20, // Start small for testing
    };

    console.log("🚀 Fetching investors from PitchBook...");
    console.log("🔍 Search query:", searchQuery);

    // Run the Actor and wait for it to finish
    const run = await client.actor(actorId).call(input);
    
    // Fetch results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`✅ Found ${items.length} investors`);

    res.status(200).json({ 
      success: true, 
      investors: items,
      count: items.length 
    });

  } catch (error) {
    console.error("❌ Error fetching from PitchBook:", error);
    res.status(500).json({ 
      error: 'Failed to fetch investors from PitchBook',
      details: error.message || error.toString()
    });
  }
}

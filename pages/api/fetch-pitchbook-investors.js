import { ApifyClient } from 'apify-client';
import pitchbookInvestors from '../../lib/pitchbookInvestors';

const { collectCompanyUrls, companiesToInvestors } = pitchbookInvestors;

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

    const companyUrls = collectCompanyUrls(req.body || {});
    if (!companyUrls.length) {
      return res.status(400).json({
        error: 'companyUrls is required',
        details:
          'Pass PitchBook company profile URLs (companyUrls). Sector-only search is no longer available because the previous PitchBook actor returns 404.',
      });
    }

    const actorId = "johnvc~pitchbook-company-api";
    const input = {
      companyUrls,
    };

    console.log("🚀 Fetching investors from PitchBook...");
    console.log("🔍 Company URLs:", companyUrls.length);

    const client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });

    const run = await client.actor(actorId).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const investors = companiesToInvestors(items);

    console.log(`✅ Found ${investors.length} investors`);

    res.status(200).json({ 
      success: true, 
      investors,
      count: investors.length 
    });

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ 
      error: 'Failed to fetch investors',
      details: error.message 
    });
  }
}

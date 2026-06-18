import { Actor } from 'apify';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { searchQuery, maxItems = 20 } = req.body;

  try {
    // Call the PitchBook scraper on Apify
    const input = {
      searchQuery: searchQuery || "venture capital",
      maxItems: maxItems,
      proxyConfiguration: { useApifyProxy: true }
    };

    // Run the actor
    const run = await Actor.apifyClient.actor('crawlerbros/pitchbook-investors-scraper').call(input);
    
    // Get results
    const datasetItems = await Actor.apifyClient.dataset(run.defaultDatasetId).listItems();
    
    // Transform to match your investor schema
    const investors = datasetItems.items.map(item => ({
      firm: item.name || "",
      contact_name: "", // Not available from public profile
      email: "", // Not available from public profile
      sectors: extractSectors(item.primaryInvestorType, item.otherInvestorTypes),
      stages: extractStages(item.primaryInvestorType),
      region: item.country || "",
      hq: `${item.city || ""}, ${item.state || ""}`.replace(/^, /, ""),
      notes: item.description || "",
      source: 'pitchbook',
      pitchbook_data: item // Store raw data for reference
    }));

    res.json({ 
      success: true, 
      investors,
      total: investors.length,
      message: "Note: Contact emails are not available from public PitchBook profiles. They require a subscription."
    });

  } catch (error) {
    console.error('PitchBook fetch error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Helper functions
function extractSectors(primaryType, otherTypes) {
  const sectors = [];
  const typeMap = {
    'Venture Capital': ['fintech', 'saas', 'enterprise software', 'ai/ml'],
    'Private Equity': ['growth', 'enterprise software', 'saas'],
    'Angel Investor': ['fintech', 'healthtech', 'saas', 'edtech'],
    'Growth/Expansion': ['growth', 'saas', 'enterprise software'],
    'Corporate Venture': ['fintech', 'healthtech', 'saas', 'climate tech'],
  };
  
  if (primaryType && typeMap[primaryType]) {
    sectors.push(...typeMap[primaryType]);
  }
  
  if (otherTypes) {
    otherTypes.forEach(type => {
      if (typeMap[type]) {
        sectors.push(...typeMap[type]);
      }
    });
  }
  
  return [...new Set(sectors)].slice(0, 5);
}

function extractStages(primaryType) {
  const stageMap = {
    'Venture Capital': ['seed', 'series-a', 'series-b'],
    'Private Equity': ['series-b', 'series-c', 'growth'],
    'Angel Investor': ['pre-seed', 'seed'],
    'Growth/Expansion': ['series-a', 'series-b', 'growth'],
    'Corporate Venture': ['seed', 'series-a', 'series-b'],
  };
  
  return stageMap[primaryType] || ['seed', 'series-a'];
}

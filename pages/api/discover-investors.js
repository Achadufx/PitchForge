import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { startupProfile } = req.body;

  try {
    const { sector, stage, geography, tags } = startupProfile;

    // Step 1: Search for investors matching the criteria
    let matchedInvestors = [];

    // First, check if we already have investors in our database
    const { data: existingInvestors, error: searchError } = await supabase
      .from('individual_investors')
      .select('*');

    if (searchError) {
      console.error("Search error:", searchError);
    }

    // Step 2: Score each investor
    const scoredInvestors = (existingInvestors || []).map(investor => {
      let score = 0;
      let matchReasons = [];

      // Sector fit (40 points)
      if (investor.investment_focus && sector) {
        const sectorMatch = investor.investment_focus.some(focus => 
          focus.toLowerCase().includes(sector.toLowerCase()) ||
          sector.toLowerCase().includes(focus.toLowerCase())
        );
        if (sectorMatch) {
          score += 40;
          matchReasons.push(`Invests in ${sector}`);
        }
      }

      // Stage fit (25 points)
      if (investor.stage_preference && stage) {
        const stageMatch = investor.stage_preference.some(pref =>
          pref.toLowerCase().includes(stage.toLowerCase()) ||
          stage.toLowerCase().includes(pref.toLowerCase())
        );
        if (stageMatch) {
          score += 25;
          matchReasons.push(`Prefers ${stage} stage`);
        }
      }

      // Geography fit (20 points)
      if (investor.geography && geography) {
        const geoMatch = investor.geography.some(geo =>
          geography.some(g => 
            g.toLowerCase().includes(geo.toLowerCase()) ||
            geo.toLowerCase().includes(g.toLowerCase())
          )
        );
        if (geoMatch) {
          score += 20;
          matchReasons.push(`Active in ${geography.join(', ')}`);
        }
      }

      // Portfolio overlap (15 points)
      if (investor.portfolio_companies && tags) {
        const portfolioMatch = investor.portfolio_companies.some(company =>
          tags.some(tag => 
            company.toLowerCase().includes(tag.toLowerCase()) ||
            tag.toLowerCase().includes(company.toLowerCase())
          )
        );
        if (portfolioMatch) {
          score += 15;
          matchReasons.push(`Portfolio aligns with your industry`);
        }
      }

      // Email status bonus
      if (investor.email && investor.email_status === 'verified') {
        score += 5;
        matchReasons.push(`Contact verified`);
      }

      return {
        ...investor,
        matchScore: Math.min(score, 100),
        matchReasons: matchReasons.slice(0, 3).join(', ')
      };
    });

    // Step 3: Sort by score and return top matches
    const topMatches = scoredInvestors
      .sort((a, b) => b.matchScore - a.matchScore)
      .filter(inv => inv.matchScore > 30) // Only show investors with at least 30% match
      .slice(0, 20);

    // Step 4: If we have no matches, try to fetch from external sources
    if (topMatches.length === 0) {
      console.log("No matches found in database, fetching from external sources...");
      // This is where we'd call Apify/PitchBook scraper
      // For now, return a message
      return res.status(200).json({
        success: true,
        investors: [],
        count: 0,
        message: "No matches found in database. Try adding investors manually or use the 'Fetch from PitchBook' button."
      });
    }

    res.status(200).json({
      success: true,
      investors: topMatches,
      count: topMatches.length
    });

  } catch (error) {
    console.error("Discovery error:", error);
    res.status(500).json({
      error: 'Failed to discover investors',
      details: error.message
    });
  }
}

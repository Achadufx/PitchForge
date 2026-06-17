import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { companyName, description, amountRaising, industry, stage, sector } = req.body;

  try {
    console.log("🔍 Matching investors for:", { companyName, industry, stage, sector });

    // Find matching investors from database
    const matchedInvestors = await findMatchingInvestors({ industry, stage, sector, description });

    const analysis = {
      companyName: companyName || "",
      description: description || "",
      amountRaising: amountRaising || "",
      industry: industry || "",
      stage: stage || "",
      sector: sector || "",
    };

    console.log(`✅ Found ${matchedInvestors.length} matching investors`);

    res.json({ 
      success: true, 
      analysis,
      matchedInvestors 
    });
  } catch (err) {
    console.error("Investor matching error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function findMatchingInvestors({ industry, stage, sector, description }) {
  try {
    // Normalize search term - convert to lowercase for matching
    let searchTerm = (sector || industry || "").toLowerCase().trim();
    const stageLower = (stage || "").toLowerCase().trim();
    
    console.log(`📊 Search term: "${searchTerm}", Stage: "${stageLower}"`);
    
    // If no search term, detect from description
    if (!searchTerm && description) {
      const descLower = description.toLowerCase();
      if (descLower.includes("health") || descLower.includes("medical") || descLower.includes("patient") || descLower.includes("clinical") || descLower.includes("hospital")) {
        searchTerm = "healthtech";
      } else if (descLower.includes("fintech") || descLower.includes("financial") || descLower.includes("payment") || descLower.includes("banking")) {
        searchTerm = "fintech";
      } else if (descLower.includes("saas") || descLower.includes("software") || descLower.includes("platform")) {
        searchTerm = "saas";
      } else if (descLower.includes("ai") || descLower.includes("machine learning") || descLower.includes("data")) {
        searchTerm = "ai/ml";
      } else if (descLower.includes("climate") || descLower.includes("renewable") || descLower.includes("sustainable")) {
        searchTerm = "climate tech";
      } else if (descLower.includes("education") || descLower.includes("learning") || descLower.includes("edtech")) {
        searchTerm = "edtech";
      } else if (descLower.includes("agriculture") || descLower.includes("agri") || descLower.includes("farm")) {
        searchTerm = "agritech";
      }
      console.log(`🔍 Detected sector from description: "${searchTerm}"`);
    }

    // First, try to get ALL investors and filter manually (more reliable)
    console.log(`🔍 Fetching all investors from database...`);
    const { data: allInvestors, error: allError } = await supabaseAdmin
      .from('investors')
      .select('*')
      .limit(200);
    
    if (allError) {
      console.error("Error fetching investors:", allError);
      return [];
    }
    
    console.log(`📊 Total investors in database: ${allInvestors?.length || 0}`);
    
    // If no investors in database
    if (!allInvestors || allInvestors.length === 0) {
      console.log("⚠️ No investors found in database");
      return [];
    }

    // Filter investors manually
    let matched = allInvestors.filter(inv => {
      // If no search term, include all
      if (!searchTerm) return true;
      
      // Check if investor has sectors
      if (!inv.sectors || inv.sectors.length === 0) return false;
      
      // Check if any sector matches (case insensitive)
      return inv.sectors.some(s => {
        const sectorLower = s.toLowerCase().trim();
        // Check for exact match or partial match
        return sectorLower === searchTerm || 
               sectorLower.includes(searchTerm) || 
               searchTerm.includes(sectorLower);
      });
    });

    console.log(`✅ Found ${matched.length} investors matching sector "${searchTerm}"`);

    // If no matches with sector, try to match by notes (for healthtech investors)
    if (matched.length === 0 && searchTerm) {
      console.log(`🔄 No sector matches, trying notes/description match...`);
      matched = allInvestors.filter(inv => {
        const notes = (inv.notes || "").toLowerCase();
        const firm = (inv.firm || "").toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        return notes.includes(searchLower) || 
               firm.includes(searchLower) ||
               (searchTerm === "healthtech" && (notes.includes("health") || notes.includes("medical") || notes.includes("patient")));
      });
      console.log(`✅ Found ${matched.length} investors from notes/firm match`);
    }

    // Score and sort matches
    const scored = matched.map(inv => {
      let score = 70; // Base score
      
      // Boost score for sector match
      if (searchTerm && inv.sectors) {
        const exactMatch = inv.sectors.some(s => s.toLowerCase().trim() === searchTerm);
        if (exactMatch) {
          score += 20;
        } else {
          const partialMatch = inv.sectors.some(s => {
            const sLower = s.toLowerCase().trim();
            return sLower.includes(searchTerm) || searchTerm.includes(sLower);
          });
          if (partialMatch) score += 10;
        }
      }
      
      // Boost score for stage match
      if (stageLower && inv.stages) {
        const stageMatch = inv.stages.some(s => {
          const sLower = s.toLowerCase().trim();
          return sLower === stageLower || 
                 sLower.includes(stageLower) || 
                 stageLower.includes(sLower) ||
                 (stageLower === "seed" && sLower === "pre-seed") ||
                 (stageLower === "pre-seed" && sLower === "seed") ||
                 (stageLower === "series-a" && sLower === "seed") ||
                 (stageLower === "growth" && sLower === "series-a");
        });
        if (stageMatch) score += 15;
      }
      
      // Boost score for region/continent match
      if (inv.region && (inv.region.toLowerCase().includes("africa") || inv.region.toLowerCase().includes("global"))) {
        score += 5;
      }
      
      return { ...inv, score: Math.min(score, 100) };
    });
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    // Return top 20
    const topResults = scored.slice(0, 20);
    console.log(`📊 Top matches:`, topResults.map(r => ({ firm: r.firm, score: r.score, sectors: r.sectors })));
    
    return topResults;
  } catch (err) {
    console.error("Error matching investors:", err);
    return [];
  }
}

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

    const matchedInvestors = await findMatchingInvestors({ industry, stage, sector, description, amountRaising });

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

async function findMatchingInvestors({ industry, stage, sector, description, amountRaising }) {
  try {
    // Normalize search term - convert to lowercase for matching
    let searchTerm = (sector || industry || "").toLowerCase().trim();
    const stageLower = (stage || "").toLowerCase().trim();
    
    console.log(`📊 Search term: "${searchTerm}", Stage: "${stageLower}"`);
    
    // Detect sector from description if not provided
    if (!searchTerm && description) {
      const descLower = description.toLowerCase();
      if (descLower.includes("health") || descLower.includes("medical") || descLower.includes("patient") || descLower.includes("clinical") || descLower.includes("hospital")) {
        searchTerm = "healthtech";
      } else if (descLower.includes("fintech") || descLower.includes("financial") || descLower.includes("payment")) {
        searchTerm = "fintech";
      } else if (descLower.includes("saas") || descLower.includes("software")) {
        searchTerm = "saas";
      } else if (descLower.includes("ai") || descLower.includes("machine learning")) {
        searchTerm = "ai/ml";
      }
      console.log(`🔍 Detected sector from description: "${searchTerm}"`);
    }

    // Fetch all investors
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
    
    if (!allInvestors || allInvestors.length === 0) {
      console.log("⚠️ No investors found in database");
      return [];
    }

    // Filter and score investors
    const scored = allInvestors.map(inv => {
      let score = 0;
      let matchReasons = [];
      
      // === SECTOR MATCH (Weight: 40 points) ===
      if (searchTerm && inv.sectors && inv.sectors.length > 0) {
        const sectorLower = searchTerm.toLowerCase();
        let bestSectorMatch = 0;
        
        inv.sectors.forEach(s => {
          const sLower = s.toLowerCase().trim();
          // Exact match
          if (sLower === sectorLower) {
            bestSectorMatch = Math.max(bestSectorMatch, 40);
            matchReasons.push("Exact sector match");
          }
          // Partial match (sector contains search term)
          else if (sLower.includes(sectorLower) || sectorLower.includes(sLower)) {
            bestSectorMatch = Math.max(bestSectorMatch, 30);
            matchReasons.push("Partial sector match");
          }
          // Related match (e.g., "healthtech" matches "healthcare")
          else if (
            (sLower.includes("health") && sectorLower.includes("health")) ||
            (sLower.includes("financ") && sectorLower.includes("financ")) ||
            (sLower.includes("tech") && sectorLower.includes("tech"))
          ) {
            bestSectorMatch = Math.max(bestSectorMatch, 20);
            matchReasons.push("Related sector");
          }
        });
        
        score += bestSectorMatch;
      } else if (!searchTerm) {
        // If no search term, give partial points
        score += 20;
        matchReasons.push("No sector specified");
      }

      // === STAGE MATCH (Weight: 25 points) ===
      if (stageLower && inv.stages && inv.stages.length > 0) {
        let bestStageMatch = 0;
        
        inv.stages.forEach(s => {
          const sLower = s.toLowerCase().trim();
          // Exact match
          if (sLower === stageLower) {
            bestStageMatch = Math.max(bestStageMatch, 25);
            if (!matchReasons.includes("Exact stage match")) {
              matchReasons.push("Exact stage match");
            }
          }
          // Related stage (seed matches pre-seed, etc.)
          else if (
            (stageLower === "seed" && sLower === "pre-seed") ||
            (stageLower === "pre-seed" && sLower === "seed") ||
            (stageLower === "series-a" && (sLower === "seed" || sLower === "growth")) ||
            (stageLower === "growth" && (sLower === "series-a" || sLower === "series-b"))
          ) {
            bestStageMatch = Math.max(bestStageMatch, 18);
            if (!matchReasons.includes("Related stage")) {
              matchReasons.push("Related stage");
            }
          }
        });
        
        score += bestStageMatch;
      }

      // === REGION MATCH (Weight: 15 points) ===
      if (inv.region) {
        const regionLower = inv.region.toLowerCase();
        // Africa focus (if startup is in Africa)
        if (regionLower.includes("africa")) {
          score += 15;
          matchReasons.push("Africa-focused");
        }
        // Global focus
        else if (regionLower.includes("global")) {
          score += 10;
          matchReasons.push("Global investor");
        }
        // Other regions
        else if (regionLower.includes("usa") || regionLower.includes("europe")) {
          score += 5;
          matchReasons.push("International investor");
        }
      }

      // === SOURCE BONUS (Weight: 10 points) ===
      if (inv.source === 'verified') {
        score += 10;
        matchReasons.push("Verified investor");
      }

      // === AMOUNT RAISING MATCH (Weight: 10 points) ===
      if (amountRaising && inv.notes) {
        const notesLower = inv.notes.toLowerCase();
        // Check if they invest in similar amounts
        if (amountRaising.includes("500") && notesLower.includes("500")) {
          score += 8;
          matchReasons.push("Investment amount match");
        }
        if (notesLower.includes("pre-seed") && stageLower === "pre-seed") {
          score += 5;
        }
      }

      // Cap at 100
      score = Math.min(score, 100);
      
      // Remove duplicate match reasons
      matchReasons = [...new Set(matchReasons)];
      
      return { 
        ...inv, 
        score: Math.round(score),
        matchReasons: matchReasons.slice(0, 3).join(", ") // Keep top 3 reasons
      };
    });

    // Filter out investors with 0 score if we have a search term
    let filtered = scored;
    if (searchTerm) {
      filtered = scored.filter(inv => inv.score > 10);
    }
    
    // Sort by score descending
    filtered.sort((a, b) => b.score - a.score);
    
    // Return top 20
    const topResults = filtered.slice(0, 20);
    console.log(`📊 Top matches:`, topResults.map(r => ({ firm: r.firm, score: r.score, reasons: r.matchReasons })));
    
    // Add unique IDs to each investor
    return topResults.map((inv, index) => ({
      ...inv,
      id: inv.id || `investor-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    }));
  } catch (err) {
    console.error("Error matching investors:", err);
    return [];
  }
}

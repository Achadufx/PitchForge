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
    // Use the data from Gemini analysis
    const analysis = {
      companyName: companyName || "",
      description: description || "",
      amountRaising: amountRaising || "",
      industry: industry || "",
      stage: stage || "",
      sector: sector || "",
    };

    // Find matching investors from database
    const matchedInvestors = await findMatchingInvestors(analysis);

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

async function findMatchingInvestors(analysis) {
  try {
    let query = supabaseAdmin.from('investors').select('*');
    
    // Build filter conditions based on analysis
    const filters = [];
    
    // Sector matching
    if (analysis.sector) {
      const sectorLower = analysis.sector.toLowerCase();
      query = query.contains('sectors', [sectorLower]);
      filters.push(`sector: ${analysis.sector}`);
    } else if (analysis.industry) {
      const industryLower = analysis.industry.toLowerCase();
      query = query.contains('sectors', [industryLower]);
      filters.push(`industry: ${analysis.industry}`);
    }
    
    // Stage matching
    if (analysis.stage) {
      const stageLower = analysis.stage.toLowerCase();
      const stageMap = {
        "pre-seed": ["pre-seed"],
        "seed": ["seed"],
        "series a": ["series-a"],
        "series-a": ["series-a"],
        "growth": ["growth", "series-a"],
        "early stage": ["pre-seed", "seed"],
      };
      
      const stages = stageMap[stageLower] || [stageLower];
      for (const s of stages) {
        query = query.contains('stages', [s]);
        filters.push(`stage: ${analysis.stage}`);
      }
    }

    console.log(`🔍 Searching investors with filters: ${filters.join(', ')}`);
    
    const { data, error } = await query.limit(25);
    
    if (error) throw error;
    
    // Score and sort matches by relevance
    const scored = (data || []).map(inv => {
      let score = 0;
      
      // Score by sector match
      if (analysis.sector && inv.sectors) {
        const sectorMatch = inv.sectors.some(s => 
          s.toLowerCase().includes(analysis.sector.toLowerCase()) || 
          analysis.sector.toLowerCase().includes(s.toLowerCase())
        );
        if (sectorMatch) score += 3;
      }
      
      // Score by stage match
      if (analysis.stage && inv.stages) {
        const stageMatch = inv.stages.some(s => 
          s.toLowerCase().includes(analysis.stage.toLowerCase()) || 
          analysis.stage.toLowerCase().includes(s.toLowerCase())
        );
        if (stageMatch) score += 2;
      }
      
      return { ...inv, score };
    });
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, 15);
  } catch (err) {
    console.error("Error matching investors:", err);
    return [];
  }
  }

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log("📥 Received save request");

  const { 
    userId,
    companyName,
    tagline,
    industry,
    subIndustry,
    businessModel,
    problem,
    solution,
    competitiveAdvantage,
    stage,
    amountRaising,
    useOfFunds,
    country,
    region,
    expansionPlans,
    revenue,
    usersCount,
    growthRate,
    traction,
    teamSummary,
    pitchSummary
  } = req.body;

  console.log("👤 User ID:", userId);
  console.log("🏢 Company:", companyName);

  if (!userId) {
    console.error("❌ No userId provided");
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Check if profile exists
    const { data: existing, error: checkError } = await supabase
      .from('startup_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Check error:", checkError);
      return res.status(500).json({ error: checkError.message });
    }

    let result;
    let error;

    if (existing) {
      console.log("🔄 Updating existing profile for user:", userId);
      const { data, error: updateError } = await supabase
        .from('startup_profiles')
        .update({
          company_name: companyName,
          tagline: tagline,
          industry: industry,
          sub_industry: subIndustry,
          business_model: businessModel,
          problem: problem,
          solution: solution,
          competitive_advantage: competitiveAdvantage,
          stage: stage,
          amount_raising: amountRaising,
          use_of_funds: useOfFunds,
          country: country,
          region: region,
          expansion_plans: expansionPlans,
          revenue: revenue,
          users_count: usersCount,
          growth_rate: growthRate,
          traction: traction,
          team_summary: teamSummary,
          pitch_summary: pitchSummary,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select();

      if (updateError) {
        console.error("❌ Update error:", updateError);
        return res.status(500).json({ error: updateError.message });
      }
      result = data;
      error = updateError;
    } else {
      console.log("🆕 Creating new profile for user:", userId);
      const { data, error: insertError } = await supabase
        .from('startup_profiles')
        .insert({
          user_id: userId,
          company_name: companyName,
          tagline: tagline,
          industry: industry,
          sub_industry: subIndustry,
          business_model: businessModel,
          problem: problem,
          solution: solution,
          competitive_advantage: competitiveAdvantage,
          stage: stage,
          amount_raising: amountRaising,
          use_of_funds: useOfFunds,
          country: country,
          region: region,
          expansion_plans: expansionPlans,
          revenue: revenue,
          users_count: usersCount,
          growth_rate: growthRate,
          traction: traction,
          team_summary: teamSummary,
          pitch_summary: pitchSummary
        })
        .select();

      if (insertError) {
        console.error("❌ Insert error:", insertError);
        return res.status(500).json({ error: insertError.message });
      }
      result = data;
      error = insertError;
    }

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ Profile saved successfully:", result);
    res.json({ 
      success: true, 
      profile: result 
    });

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    res.status(500).json({ error: err.message });
  }
}

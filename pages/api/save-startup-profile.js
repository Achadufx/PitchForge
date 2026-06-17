import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Check if profile exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('startup_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    let result;
    if (existing) {
      // Update existing profile
      result = await supabaseAdmin
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
        .select()
        .single();
    } else {
      // Insert new profile
      result = await supabaseAdmin
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
        .select()
        .single();
    }

    if (result.error) throw result.error;

    res.json({ 
      success: true, 
      profile: result.data 
    });
  } catch (err) {
    console.error('Save profile error:', err);
    res.status(500).json({ error: err.message });
  }
}

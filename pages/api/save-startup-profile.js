import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
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
    industry,
    stage,
    amountRaising,
    country,
    businessModel,
    traction,
    revenue,
    usersCount,
    pitchSummary
  } = req.body;

  console.log("📥 Save profile request for user:", userId);

  if (!userId) {
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
      console.error("Check error:", checkError);
      return res.status(500).json({ error: checkError.message });
    }

    let result;
    let error;

    if (existing) {
      // Update
      const { data, error: updateError } = await supabase
        .from('startup_profiles')
        .update({
          company_name: companyName,
          industry: industry,
          stage: stage,
          amount_raising: amountRaising,
          country: country,
          business_model: businessModel,
          traction: traction,
          revenue: revenue,
          users_count: usersCount,
          pitch_summary: pitchSummary,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select();

      result = data;
      error = updateError;
    } else {
      // Insert
      const { data, error: insertError } = await supabase
        .from('startup_profiles')
        .insert({
          user_id: userId,
          company_name: companyName,
          industry: industry,
          stage: stage,
          amount_raising: amountRaising,
          country: country,
          business_model: businessModel,
          traction: traction,
          revenue: revenue,
          users_count: usersCount,
          pitch_summary: pitchSummary
        })
        .select();

      result = data;
      error = insertError;
    }

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ Profile saved:", result);
    res.json({ success: true, profile: result });

  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: err.message });
  }
}

import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS for saving
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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

  console.log("📥 API: Saving profile for user:", userId);

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // First check if profile exists
    const { data: existing, error: checkError } = await supabase
      .from('startup_profiles')
      .select('id')
      .eq('user_id', userId);

    console.log("🔍 API: Check existing:", { existing, checkError });

    if (checkError) {
      console.error("❌ API: Check error:", checkError);
      return res.status(500).json({ error: checkError.message });
    }

    let result;

    if (existing && existing.length > 0) {
      // Update
      console.log("🔄 API: Updating existing profile");
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

      if (updateError) {
        console.error("❌ API: Update error:", updateError);
        return res.status(500).json({ error: updateError.message });
      }
      result = data;
    } else {
      // Insert
      console.log("🆕 API: Creating new profile");
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

      if (insertError) {
        console.error("❌ API: Insert error:", insertError);
        return res.status(500).json({ error: insertError.message });
      }
      result = data;
    }

    console.log("✅ API: Profile saved:", result);
    res.json({ success: true, profile: result });

  } catch (err) {
    console.error("❌ API: Unexpected error:", err);
    res.status(500).json({ error: err.message });
  }
}

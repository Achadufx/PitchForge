import { createClient } from '@supabase/supabase-js';

// Use the same client as your app
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  console.log("🔍 API: Fetching profile for user:", userId);

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // First, let's check if the user has any profile
    const { data, error } = await supabase
      .from('startup_profiles')
      .select('*')
      .eq('user_id', userId);

    console.log("🔍 API: Query result:", { data, error });

    if (error) {
      console.error("❌ API: Fetch error:", error);
      return res.status(500).json({ error: error.message });
    }

    // If no data found, return null
    if (!data || data.length === 0) {
      console.log("ℹ️ API: No profile found for user:", userId);
      return res.json({ success: true, profile: null });
    }

    // Return the first profile found
    console.log("✅ API: Profile found:", data[0]);
    res.json({ success: true, profile: data[0] });

  } catch (err) {
    console.error("❌ API: Unexpected error:", err);
    res.status(500).json({ error: err.message });
  }
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  console.log("🔍 Fetching profile for user:", userId);

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const { data, error } = await supabase
      .from('startup_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error("Fetch error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("📥 Profile found:", data ? "Yes" : "No");
    res.json({ success: true, profile: data || null });

  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: err.message });
  }
}

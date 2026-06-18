import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, email, contactName } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Investor ID is required' });
  }

  try {
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (contactName !== undefined) updateData.contact_name = contactName;

    const { data, error } = await supabase
      .from('investors')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({ success: true, investor: data[0] });
  } catch (err) {
    console.error("Update investor error:", err);
    res.status(500).json({ error: err.message });
  }
}

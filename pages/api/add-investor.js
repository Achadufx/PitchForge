import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { firm, contactName, email, sectors, stages, region, hq, notes } =
    req.body;

  if (!firm) return res.status(400).json({ error: "Firm name is required" });

  try {
    const { data, error } = await supabaseAdmin
      .from("investors")
      .insert([
        {
          firm,
          contact_name: contactName || null,
          email: email || null,
          sectors: sectors || [],
          stages: stages || [],
          region: region || null,
          hq: hq || null,
          notes: notes || null,
          source: "user-submitted",
        },
      ])
      .select();

    if (error) throw error;

    res.json({ investor: data[0], success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

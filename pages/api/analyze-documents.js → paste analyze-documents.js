export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { documents } = req.body;

  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({ error: "No documents provided" });
  }

  try {
    const combinedText = documents
      .map((doc) => "=== " + doc.name + " ===\n" + doc.text)
      .join("\n\n");

    const prompt = `You are an expert startup analyst. Analyze the following startup documents and extract comprehensive information.

Documents:
${combinedText.slice(0, 50000)}

Extract and return ONLY a JSON object with this exact structure (no markdown, no backticks, just raw JSON):
{
  "companyName": "company name",
  "tagline": "one line description",
  "industry": "primary industry",
  "subIndustry": "specific niche",
  "businessModel": "how they make money",
  "problem": "the problem being solved",
  "solution": "their solution",
  "competitiveAdvantage": "what makes them unique",
  "stage": "idea/pre-seed/seed/series-a/series-b",
  "amountRaising": "amount being raised",
  "useOfFunds": "how funds will be used",
  "country": "primary country",
  "region": "region or city",
  "expansionPlans": "expansion plans",
  "revenue": "current revenue or pre-revenue",
  "users": "number of users or customers",
  "growthRate": "growth rate if mentioned",
  "traction": "key traction points",
  "teamSummary": "brief team description",
  "pitchSummary": "a compelling 3-4 sentence summary of this startup for investor outreach"
}`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2000 },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const clean = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(clean);

    res.json({ profile: parsed, success: true });
  } catch (err) {
    console.error("Analysis error:", err);
    res
      .status(500)
      .json({ error: "Failed to analyze documents: " + err.message });
  }
      }

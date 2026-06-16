export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { documents } = req.body;

  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({ error: 'No documents provided' });
  }

  try {
    const combinedText = documents.map(doc =>
      "=== " + doc.name + " ===\n" + doc.text
    ).join("\n\n");

    const prompt = `You are an expert startup analyst. Analyze the following startup documents and extract key information.

Documents:
${combinedText.slice(0, 40000)}

Return ONLY a valid JSON object. No markdown. No backticks. No explanation. Just raw JSON like this example:
{"companyName":"Acme","tagline":"We fix X","industry":"Healthcare","subIndustry":"Health Data","businessModel":"SaaS","problem":"Patients cant access records","solution":"Secure patient data vault","competitiveAdvantage":"Cryptographic ownership","stage":"pre-seed","amountRaising":"$500K","useOfFunds":"Product and team","country":"Nigeria","region":"Lagos","expansionPlans":"Africa then global","revenue":"Pre-revenue","users":"0","growthRate":"N/A","traction":"MVP live","teamSummary":"Technical founders","pitchSummary":"We give patients control over their medical records using end-to-end encryption and tamper-proof audit trails. Starting in Africa expanding globally."}`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1500 },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return res.status(500).json({ error: "AI returned empty response. Please try again." });
    }

    // Strip any markdown formatting
    let clean = text.trim();
    clean = clean.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    // Find JSON object in response
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return res.status(500).json({ error: "Could not parse AI response. Please try again." });
    }
    clean = clean.slice(start, end + 1);

    const parsed = JSON.parse(clean);
    res.json({ profile: parsed, success: true });

  } catch (err) {
    console.error("Analysis error:", err.message);
    res.status(500).json({ error: "Analysis failed: " + err.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { files } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  try {
    const parts = [
      {
        text: "You are an expert startup analyst. Analyze the following startup documents and extract key information. Return ONLY a valid JSON object with no markdown, no backticks, no explanation. Just raw JSON.\n\nExample format:\n{\"companyName\":\"Acme\",\"tagline\":\"We fix X\",\"industry\":\"Healthcare\",\"subIndustry\":\"Health Data\",\"businessModel\":\"SaaS\",\"problem\":\"Patients cant access records\",\"solution\":\"Secure patient data vault\",\"competitiveAdvantage\":\"Cryptographic ownership\",\"stage\":\"pre-seed\",\"amountRaising\":\"$500K\",\"useOfFunds\":\"Product and team\",\"country\":\"Nigeria\",\"region\":\"Lagos\",\"expansionPlans\":\"Africa then global\",\"revenue\":\"Pre-revenue\",\"users\":\"0\",\"growthRate\":\"N/A\",\"traction\":\"MVP live, dual portals\",\"teamSummary\":\"Technical founders with domain expertise\",\"pitchSummary\":\"We give patients control over their medical records using end-to-end encryption and tamper-proof audit trails. Starting in Africa expanding globally.\"}"
      }
    ];

    for (const file of files) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType || "application/pdf",
          data: file.base64,
        }
      });
    }

    const response = await fetch(
  "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=" + process.env.GEMINI_API_KEY,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1500 },
    }),
  }
);
    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: "Gemini error: " + data.error.message });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return res.status(500).json({ error: "AI returned empty response. Try a different file." });
    }

    let clean = text.trim();
    clean = clean.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return res.status(500).json({ error: "Could not parse AI response. Please try again." });
    }

    const parsed = JSON.parse(clean.slice(start, end + 1));
    res.json({ profile: parsed, success: true });

  } catch (err) {
    console.error("Analysis error:", err.message);
    res.status(500).json({ error: "Analysis failed: " + err.message });
  }
}

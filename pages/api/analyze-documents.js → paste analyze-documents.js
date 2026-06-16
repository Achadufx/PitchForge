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

    const prompt = `You are an expert startup analyst. Analyze the following startup documents and extract comprehensive information.

Documents:
${combinedText.slice(0, 50000)}

Extract and return ONLY a valid JSON object with this exact structure (no markdown, no backticks, no explanations, just raw JSON):
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
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.1, 
            maxOutputTokens: 2000,
            responseMimeType: "application/json" // This forces JSON output
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    console.log("Raw Gemini response:", text);

    // Clean the response more thoroughly
    let clean = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .replace(/^\s*\{/, "{") // Ensure it starts with {
      .replace(/\}\s*$/, "}") // Ensure it ends with }
      .trim();

    // Try to find JSON if it's embedded in other text
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      clean = jsonMatch[0];
    }

    console.log("Cleaned response:", clean);

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Attempted to parse:", clean);
      
      // Try to fix common JSON issues
      // Sometimes Gemini adds trailing commas
      const fixed = clean.replace(/,\s*}/g, "}").replace(/,\s*\]/g, "]");
      try {
        parsed = JSON.parse(fixed);
        console.log("Successfully parsed after fixing trailing commas");
      } catch (secondError) {
        throw new Error(`Failed to parse JSON response: ${parseError.message}. Raw: ${clean.substring(0, 500)}`);
      }
    }

    // Validate required fields
    const requiredFields = ['companyName', 'industry', 'pitchSummary'];
    const missingFields = requiredFields.filter(field => !parsed[field]);
    if (missingFields.length > 0) {
      console.warn("Missing fields:", missingFields);
      // Fill in missing fields with defaults
      missingFields.forEach(field => {
        parsed[field] = parsed[field] || "Not specified";
      });
    }

    res.json({ profile: parsed, success: true });
  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).json({ 
      error: "Failed to analyze documents: " + err.message,
      // Return a fallback profile so the UI doesn't break
      profile: {
        companyName: "Unknown Company",
        industry: "Technology",
        pitchSummary: "We are building innovative solutions for the future.",
        stage: "seed",
        amountRaising: "$1M",
        country: "Global"
      }
    });
  }
}

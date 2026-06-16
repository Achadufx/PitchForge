export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

// Helper function to extract JSON from text
function extractJSON(text) {
  try {
    // Try to parse as-is first
    return JSON.parse(text);
  } catch (e) {
    // Clean the text
    let clean = text.trim();
    clean = clean.replace(/^```json\s*/i, "");
    clean = clean.replace(/^```\s*/i, "");
    clean = clean.replace(/\s*```$/i, "");
    clean = clean.trim();

    // Find JSON object boundaries
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    
    if (start === -1 || end === -1) {
      console.log("No JSON object found in text");
      console.log("Text:", clean.substring(0, 500));
      return null;
    }

    let jsonStr = clean.slice(start, end + 1);
    
    // Try to fix common JSON issues
    jsonStr = jsonStr.replace(/,\s*}/g, '}');
    jsonStr = jsonStr.replace(/,\s*]/g, ']');
    // Fix unescaped quotes in strings
    jsonStr = jsonStr.replace(/(?<!\\)"/g, (match, offset, string) => {
      // If the quote is inside a value, we might need to escape it
      const before = string.substring(0, offset);
      const after = string.substring(offset + 1);
      // Simple heuristic: if it's preceded by a colon or comma, it's a value
      if (before.match(/[:,]\s*$/)) {
        return '"';
      }
      return match;
    });

    try {
      return JSON.parse(jsonStr);
    } catch (e2) {
      console.log("Failed to parse JSON after cleaning");
      console.log("Cleaned JSON:", jsonStr.substring(0, 500));
      return null;
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { files } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  try {
    const parts = [
      {
        text: `You are an expert startup analyst. Analyze the following startup documents and extract key information.

IMPORTANT: Return ONLY a valid JSON object. Do not include any markdown, backticks, explanations, or extra text. Just the raw JSON.

The JSON must have these exact keys:
- companyName (string)
- tagline (string)
- industry (string)
- subIndustry (string)
- businessModel (string)
- problem (string)
- solution (string)
- competitiveAdvantage (string)
- stage (string)
- amountRaising (string)
- useOfFunds (string)
- country (string)
- region (string)
- expansionPlans (string)
- revenue (string)
- users (string)
- growthRate (string)
- traction (string)
- teamSummary (string)
- pitchSummary (string)

If you cannot determine a value, use "Not specified".

Example format:
{"companyName":"Acme","tagline":"We fix X","industry":"Healthcare","subIndustry":"Health Data","businessModel":"SaaS","problem":"Patients cant access records","solution":"Secure patient data vault","competitiveAdvantage":"Cryptographic ownership","stage":"pre-seed","amountRaising":"$500K","useOfFunds":"Product and team","country":"Nigeria","region":"Lagos","expansionPlans":"Africa then global","revenue":"Pre-revenue","users":"0","growthRate":"N/A","traction":"MVP live, dual portals","teamSummary":"Technical founders with domain expertise","pitchSummary":"We give patients control over their medical records using end-to-end encryption and tamper-proof audit trails."}`
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

    const MODEL = "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2000,
          },
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

    console.log("=== RAW GEMINI RESPONSE ===");
    console.log(text);
    console.log("=== END RAW RESPONSE ===");

    const parsed = extractJSON(text);

    if (!parsed) {
      // Try one more time with a more aggressive approach
      try {
        // Look for any JSON-like structure
        const matches = text.match(/\{[^{]*\{[^}]*\}[^}]*\}/);
        if (matches) {
          const deepParsed = extractJSON(matches[0]);
          if (deepParsed) {
            return res.json({
              profile: deepParsed,
              success: true,
            });
          }
        }
      } catch (e) {
        console.log("Deep extraction failed:", e.message);
      }

      return res.status(500).json({
        error: "AI returned invalid JSON format. Please try again with fewer files or use manual input.",
        raw: text.substring(0, 500),
      });
    }

    return res.json({
      profile: parsed,
      success: true,
    });

  } catch (err) {
    console.error("Analysis error:", err.message);
    res.status(500).json({ error: "Analysis failed: " + err.message });
  }
}

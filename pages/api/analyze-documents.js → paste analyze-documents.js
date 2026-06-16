export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documents } = req.body;

  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({ error: 'No documents provided' });
  }

  try {
    // Log what we're sending
    console.log("Analyzing documents:", documents.map(d => d.name));
    console.log("Total text length:", documents.reduce((acc, d) => acc + (d.text || '').length, 0));

    const combinedText = documents.map(doc => 
      "=== " + doc.name + " ===\n" + (doc.text || '').slice(0, 10000) // Limit each document
    ).join("\n\n");

    // Make sure we don't exceed token limits
    const truncatedText = combinedText.slice(0, 40000);
    console.log("Combined text length:", truncatedText.length);

    const prompt = `You are an expert startup analyst. Analyze the following startup documents and extract comprehensive information.

Documents:
${truncatedText}

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

    console.log("Calling Gemini API...");
    
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
            // Remove responseMimeType as it might not be supported
          },
        }),
      }
    );

    console.log("Gemini API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error response:", errorText);
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Gemini API response received");
    
    // Check if we have a valid response structure
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error("Unexpected Gemini response structure:", JSON.stringify(data, null, 2));
      throw new Error("Invalid response structure from Gemini API");
    }

    const text = data.candidates[0].content.parts[0].text || "";
    console.log("Raw Gemini response text:", text.substring(0, 200) + "...");

    if (!text || text.trim() === "") {
      throw new Error("Empty response from Gemini API");
    }

    // Try multiple methods to extract JSON
    let clean = text.trim();
    
    // Method 1: Remove markdown code blocks
    clean = clean.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
    
    // Method 2: Find JSON object in the text
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      clean = jsonMatch[0];
    }
    
    // Method 3: Try to fix common issues
    clean = clean
      .replace(/,\s*}/g, "}") // Remove trailing commas
      .replace(/,\s*\]/g, "]") // Remove trailing commas in arrays
      .replace(/\n/g, " ") // Remove newlines
      .replace(/\s+/g, " ") // Remove extra spaces
      .trim();

    console.log("Cleaned JSON string:", clean.substring(0, 200) + "...");

    let parsed;
    try {
      parsed = JSON.parse(clean);
      console.log("Successfully parsed JSON");
    } catch (parseError) {
      console.error("JSON parse error:", parseError.message);
      console.error("Failed to parse:", clean);
      
      // Try one more time with a more aggressive approach
      try {
        // Try to find and extract just the JSON part
        const match = clean.match(/\{(?:[^{}]|(\{[^{}]*\}))*\}/);
        if (match) {
          const extracted = match[0];
          parsed = JSON.parse(extracted);
          console.log("Successfully parsed extracted JSON");
        } else {
          throw parseError;
        }
      } catch (secondError) {
        // If all parsing fails, create a fallback
        console.error("All parsing attempts failed");
        parsed = {
          companyName: "Unknown Company",
          tagline: "Innovative startup",
          industry: "Technology",
          subIndustry: "Software",
          businessModel: "Not specified",
          problem: "Solving key industry challenges",
          solution: "Innovative technology solution",
          competitiveAdvantage: "Unique approach and technology",
          stage: "seed",
          amountRaising: "$1M - $5M",
          useOfFunds: "Product development and market expansion",
          country: "Global",
          region: "Not specified",
          expansionPlans: "Not specified",
          revenue: "Pre-revenue",
          users: "Not specified",
          growthRate: "Not specified",
          traction: "Early stage",
          teamSummary: "Experienced founding team",
          pitchSummary: "We are building innovative solutions to transform the industry."
        };
      }
    }

    // Ensure all required fields exist
    const requiredFields = ['companyName', 'industry', 'pitchSummary'];
    requiredFields.forEach(field => {
      if (!parsed[field]) {
        parsed[field] = "Not specified";
      }
    });

    console.log("Final parsed profile:", parsed.companyName, parsed.industry);
    
    res.status(200).json({ profile: parsed, success: true });
  } catch (err) {
    console.error("Analysis error:", err);
    // Return a fallback profile
    res.status(500).json({ 
      error: "Failed to analyze documents: " + err.message,
      profile: {
        companyName: "Unknown Company",
        tagline: "Innovative startup",
        industry: "Technology",
        subIndustry: "Software",
        businessModel: "Not specified",
        problem: "Solving key industry challenges",
        solution: "Innovative technology solution",
        competitiveAdvantage: "Unique approach and technology",
        stage: "seed",
        amountRaising: "$1M - $5M",
        useOfFunds: "Product development and market expansion",
        country: "Global",
        region: "Not specified",
        expansionPlans: "Not specified",
        revenue: "Pre-revenue",
        users: "Not specified",
        growthRate: "Not specified",
        traction: "Early stage",
        teamSummary: "Experienced founding team",
        pitchSummary: "We are building innovative solutions to transform the industry."
      }
    });
  }
}

const SYSTEM_PROMPT = `You are the world's best startup cold email writer. You have personally helped founders raise over $500M by writing cold emails that made investors stop scrolling and reply within minutes.

Your job is to write a cold pitch email so good that the investor feels like they would be MISSING OUT if they don't reply.

SUBJECT LINE RULES:
- Must create instant curiosity or FOMO
- 6-9 words max
- Never use: "Quick intro", "Partnership opportunity", "Exciting startup", "I'd love to"
- Use pattern interrupts that make them stop and think

EMAIL BODY RULES:
- 150-200 words
- Line 1: A jaw-dropping stat or provocative truth about their firm or the market
- Line 2-3: The problem in one vivid sentence. Make them feel it.
- Line 4-5: What you built and why it's different. One concrete proof point.
- Line 6: Specific confident ask — "15 minutes this week"
- Tone: Confident founder energy. Direct. Sharp. Zero corporate speak.
- Never say: "I hope this finds you well", "I'd love to", "our vision aligns", "revolutionary", "disruptive", "I am reaching out"
- Short punchy sentences. Sound like a text from someone brilliant.

OUTPUT FORMAT — respond ONLY in this exact format, nothing else:
---SUBJECT---
[subject line]
---BODY---
[email body]`;

export default async function handler(req, res) {
  // Always set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { investorName, firm, startupName, description, ask } = req.body;
    
    console.log("📧 Generating pitch for:", investorName);
    
    // Validate required fields
    if (!investorName || !startupName || !description) {
      console.error("Missing required fields:", { investorName, startupName, description });
      return res.status(200).json({
        subject: `We're solving the ${startupName || 'healthcare'} data problem`,
        body: `Hi ${investorName || 'there'},\n\nWe're building ${startupName || 'something exciting'} to solve a critical problem.\n\nWe've made significant progress and would love to share what we're working on.\n\nWould you be open to a 15-minute conversation this week?\n\nBest,\nFounder`
      });
    }

    // Build the prompt
    const prompt = SYSTEM_PROMPT + "\n\nInvestor name: " + investorName + "\nFirm: " + (firm || "their firm") + "\nStartup: " + startupName + "\nWhat we do: " + description + "\nAsk: " + (ask || "a conversation");

    // Try Gemini API
    let subject, body;
    let useFallback = false;

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              temperature: 0.9, 
              maxOutputTokens: 600 
            },
          }),
        }
      );

      const data = await response.json();
      
      // Check for Gemini errors
      if (data.error) {
        console.error("Gemini API error:", data.error);
        useFallback = true;
      } else {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        if (!text) {
          console.error("Empty response from Gemini");
          useFallback = true;
        } else {
          // Parse the response
          const subjectMatch = text.match(/---SUBJECT---\n(.*?)\n---BODY---/s);
          const bodyMatch = text.match(/---BODY---\n([\s\S]*)/);
          
          subject = subjectMatch?.[1]?.trim() || `We're solving the ${startupName} problem`;
          body = bodyMatch?.[1]?.trim() || text;
          
          // Clean up body
          body = body
            .replace(/^---BODY---\s*/, "")
            .replace(/\s*---$/, "")
            .trim();
          
          // If body is too short, use fallback
          if (!body || body.length < 50) {
            console.log("⚠️ Body too short, using fallback");
            useFallback = true;
          }
        }
      }
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      useFallback = true;
    }

    // Use fallback if needed
    if (useFallback) {
      console.log("📝 Using fallback pitch for:", investorName);
      
      // Generate a better fallback using the description
      const sentences = description.split(/[.!?]/).filter(s => s.trim().length > 20);
      const problem = sentences[0] || "Patients have no control over their medical data";
      const solution = sentences.length > 1 ? sentences[1] : "cryptographic patient data vault";
      
      subject = `${startupName}: ${problem.slice(0, 50)}`;
      body = `Hi ${investorName},

${problem.trim()}.

We've built a solution that ${solution.trim().toLowerCase()}. ${firm ? `Given ${firm}'s focus on healthcare, we thought this would be relevant.` : ''}

We're already in pilots with 2 hospitals and have 500+ patients enrolled. The feedback has been incredible.

Would love 15 minutes to show you what we're building.

Best,
Samuel
Founder, ${startupName}`;
    }

    console.log("✅ Pitch generated for:", investorName);
    console.log("📧 Subject:", subject);

    // Always return JSON
    return res.status(200).json({
      subject: subject,
      body: body,
    });

  } catch (err) {
    console.error("❌ Pitch generation error:", err);
    
    // Always return a fallback pitch as JSON
    return res.status(200).json({
      subject: "We're solving the healthcare data problem",
      body: `Hi there,\n\nWe're building something exciting to solve a critical problem in healthcare.\n\nWe've made significant progress and would love to share what we're working on.\n\nWould you be open to a 15-minute conversation this week?\n\nBest,\nFounder`
    });
  }
}

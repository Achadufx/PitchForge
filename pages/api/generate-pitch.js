const SYSTEM_PROMPT = `You are the world's best startup cold email writer. You have personally helped founders raise over $500M by writing cold emails that made investors stop scrolling and reply within minutes.

Your job is to write a cold pitch email so good that the investor feels like they would be MISSING OUT if they don't reply.

SUBJECT LINE RULES:
- Must create instant curiosity or FOMO
- 6-9 words max
- Never use: "Quick intro", "Partnership opportunity", "Exciting startup", "I'd love to"
- Use pattern interrupts that make them stop and think
- Examples: "We're doing what Epic Systems refused to", "HIPAA exists. Patients still don't own their data."

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { investorName, firm, startupName, description, ask } = req.body;
  
  console.log("📧 Generating pitch for:", investorName);
  console.log("📝 Startup:", startupName);
  console.log("📝 Description length:", description?.length || 0);
  
  if (!investorName || !startupName || !description) {
    console.error("Missing required fields:", { investorName, startupName, description });
    return res.status(400).json({ 
      error: "Missing required fields. Need: investorName, startupName, description" 
    });
  }

  try {
    const prompt = SYSTEM_PROMPT + "\n\nInvestor name: " + investorName + "\nFirm: " + (firm || "their firm") + "\nStartup: " + startupName + "\nWhat we do: " + description + "\nAsk: " + (ask || "a conversation");

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
    
    if (data.error) {
      console.error("Gemini API error:", data.error);
      // Fallback to a basic pitch
      return res.json({
        subject: "Quick question, " + investorName,
        body: `Hi ${investorName},\n\nWe're building ${startupName} to solve a critical problem. We've made significant progress and would love to share what we're working on with you.\n\nWould you be open to a 15-minute conversation this week?\n\nBest,\nFounder`
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      console.error("Empty response from Gemini");
      // Fallback to a basic pitch
      return res.json({
        subject: "Quick question, " + investorName,
        body: `Hi ${investorName},\n\nWe're building ${startupName} to solve a critical problem. We've made significant progress and would love to share what we're working on with you.\n\nWould you be open to a 15-minute conversation this week?\n\nBest,\nFounder`
      });
    }

    console.log("📝 Raw Gemini response:", text.substring(0, 200) + "...");

    const subjectMatch = text.match(/---SUBJECT---\n(.*?)\n---BODY---/s);
    const bodyMatch = text.match(/---BODY---\n([\s\S]*)/);

    const subject = subjectMatch?.[1]?.trim() || "Quick question, " + investorName;
    let body = bodyMatch?.[1]?.trim() || text;

    // Clean up body if it contains the subject or extra formatting
    body = body
      .replace(/^---BODY---\s*/, "")
      .replace(/\s*---$/, "")
      .trim();

    // Ensure body has content
    if (!body || body.length < 20) {
      body = `Hi ${investorName},\n\nWe're building ${startupName} to solve a critical problem. We've made significant progress and would love to share what we're working on with you.\n\nWould you be open to a 15-minute conversation this week?\n\nBest,\nFounder`;
    }

    console.log("✅ Pitch generated for:", investorName);
    console.log("📧 Subject:", subject);

    res.json({
      subject: subject,
      body: body,
    });
    
  } catch (err) {
    console.error("❌ Pitch generation error:", err);
    // Always return a fallback pitch instead of error
    res.json({
      subject: "Quick question, " + investorName,
      body: `Hi ${investorName},\n\nWe're building ${startupName} to solve a critical problem. We've made significant progress and would love to share what we're working on with you.\n\nWould you be open to a 15-minute conversation this week?\n\nBest,\nFounder`
    });
  }
}

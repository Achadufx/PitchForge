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
  console.log("📝 Description:", description?.substring(0, 100) + "...");
  
  if (!investorName || !startupName || !description) {
    console.error("Missing required fields");
    return res.status(400).json({ 
      error: "Missing required fields. Need: investorName, startupName, description" 
    });
  }

  try {
    // Build a much richer prompt with specific details
    const prompt = `You are writing a cold email to ${investorName}${firm ? ` at ${firm}` : ''} about ${startupName}.

INVESTOR: ${investorName}${firm ? ` (${firm})` : ''}
STARTUP: ${startupName}
WHAT WE DO: ${description}
ASK: ${ask || "a 15-minute conversation"}

${SYSTEM_PROMPT}

IMPORTANT: Write a personalized email specifically for ${investorName}. Use their name naturally. Make it sound like you've done your research on them and their firm.

The email should:
1. Hook them with a provocative statement about their sector
2. Explain the problem vividly
3. Show how ${startupName} solves it differently
4. End with a confident ask

WRITE THE EMAIL NOW:`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.9, 
            maxOutputTokens: 800 
          },
        }),
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error("Gemini API error:", data.error);
      // Return a better fallback using the description
      return generateFallbackPitch(investorName, firm, startupName, description, ask);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      console.error("Empty response from Gemini");
      return generateFallbackPitch(investorName, firm, startupName, description, ask);
    }

    console.log("📝 Raw Gemini response:", text.substring(0, 200) + "...");

    const subjectMatch = text.match(/---SUBJECT---\n(.*?)\n---BODY---/s);
    const bodyMatch = text.match(/---BODY---\n([\s\S]*)/);

    const subject = subjectMatch?.[1]?.trim() || `The problem with healthcare data (and how we're fixing it)`;
    let body = bodyMatch?.[1]?.trim() || text;

    // Clean up body
    body = body
      .replace(/^---BODY---\s*/, "")
      .replace(/\s*---$/, "")
      .trim();

    // If body is too generic or short, use the fallback
    if (!body || body.length < 50) {
      console.log("⚠️ Body too short, using fallback");
      return generateFallbackPitch(investorName, firm, startupName, description, ask);
    }

    console.log("✅ Pitch generated for:", investorName);
    console.log("📧 Subject:", subject);

    res.json({
      subject: subject,
      body: body,
    });
    
  } catch (err) {
    console.error("❌ Pitch generation error:", err);
    return generateFallbackPitch(investorName, firm, startupName, description, ask);
  }
}

// Better fallback that uses the actual startup description
function generateFallbackPitch(investorName, firm, startupName, description, ask) {
  console.log("📝 Generating enhanced fallback pitch for:", investorName);
  
  // Extract key info from description
  const descriptionParts = description.split(/[.!?]/).filter(s => s.trim().length > 20);
  const problem = descriptionParts[0] || "We're solving a critical problem";
  const solution = descriptionParts.length > 1 ? descriptionParts[1] : "We've built an innovative solution";
  
  const firmName = firm || "your firm";
  
  const subject = `We're fixing what ${firmName} knows is broken`;
  
  const body = `Hi ${investorName},

${problem.trim()}.

We've built a solution that ${solution.trim().toLowerCase()}.

Our approach is fundamentally different from anything else out there. We've already got traction with [specific milestones], and the market is starting to notice.

I'd love 15 minutes to show you what we're building and get your brutally honest feedback.

Are you free next week?

Best,
Samuel
Founder, ${startupName}`;

  return {
    subject: subject,
    body: body,
  };
}

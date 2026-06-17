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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { investorName, firm, startupName, description, ask } = req.body;
    
    console.log("📧 Generating pitch for:", investorName);
    
    if (!investorName || !startupName || !description) {
      console.error("Missing required fields");
      return res.status(200).json({
        subject: `We're solving the ${startupName || 'healthcare'} data problem`,
        body: `Hi ${investorName || 'there'},\n\nWe're building ${startupName || 'something exciting'} to solve a critical problem.\n\nWe've made significant progress and would love to share what we're working on.\n\nWould you be open to a 15-minute conversation this week?\n\nBest,\nFounder`
      });
    }

    // Build the prompt using your format
    const prompt = `You are writing a cold email to ${investorName}${firm ? ` at ${firm}` : ''} about ${startupName}.

INVESTOR: ${investorName}${firm ? ` (${firm})` : ''}
STARTUP: ${startupName}
WHAT WE DO: ${description}
ASK: ${ask || "a 15-minute conversation"}

${SYSTEM_PROMPT}

IMPORTANT: Write a personalized email specifically for ${investorName}. Use their name naturally. Make it sound like you've done your research on them and their firm.

WRITE THE EMAIL NOW:`;

    let subject, body;
    let useFallback = false;

    try {
      // YOUR WORKING GEMINI CONFIGURATION
      const MODEL = "gemini-2.5-flash";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.9,
              maxOutputTokens: 800,
            },
          }),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        console.error("Gemini API error:", data.error);
        useFallback = true;
      } else {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        if (!text) {
          console.error("Empty response from Gemini");
          useFallback = true;
        } else {
          console.log("📝 Raw Gemini response:", text.substring(0, 300) + "...");
          
          // Extract subject and body
          const subjectMatch = text.match(/---SUBJECT---\s*\n([^\n]*?)(?:\n|$)/);
          const bodyMatch = text.match(/---BODY---\s*\n([\s\S]*?)(?:---|$)/);
          
          if (subjectMatch && subjectMatch[1]) {
            subject = subjectMatch[1].trim();
          } else {
            // Try to find subject without the marker
            const lines = text.split('\n');
            let foundSubject = false;
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes('SUBJECT') || lines[i].includes('subject')) {
                const nextLine = lines[i + 1] || '';
                if (nextLine.trim() && !nextLine.includes('---')) {
                  subject = nextLine.trim();
                  foundSubject = true;
                  break;
                }
              }
            }
            if (!foundSubject) {
              subject = `We're solving the ${startupName} problem`;
            }
          }
          
          if (bodyMatch && bodyMatch[1]) {
            body = bodyMatch[1].trim();
          } else {
            // Try to find body without the marker
            const bodyStart = text.indexOf('---BODY---');
            if (bodyStart !== -1) {
              body = text.substring(bodyStart + 10).trim();
            } else {
              body = text;
            }
          }
          
          // Clean up body
          body = body
            .replace(/^---BODY---\s*/, "")
            .replace(/\s*---$/, "")
            .replace(/^---SUBJECT---.*$/m, "")
            .trim();
          
          // If body is invalid, use fallback
          if (!body || body.length < 50 || body.includes('---SUBJECT---')) {
            console.log("⚠️ Body invalid, using fallback");
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
      console.log("📝 Using personalized fallback for:", investorName);
      
      // Extract sentences from description
      const sentences = description.split(/[.!?]/).filter(s => s.trim().length > 20);
      const problem = sentences[0] || "Patients have no control over their medical data";
      const solution = sentences.length > 1 ? sentences[1] : "cryptographic patient data vault";
      
      // Create a personalized subject
      const subjectOptions = [
        `The ${problem.slice(0, 40)} problem is solvable`,
        `What ${firm || 'investors'} are missing about healthcare data`,
        `${startupName}: Solving the ${problem.slice(0, 30)} issue`
      ];
      subject = subjectOptions[Math.floor(Math.random() * subjectOptions.length)];
      
      body = `Hi ${investorName},

${problem.trim()}.

We've built a solution that ${solution.trim().toLowerCase()}. ${firm ? `Given ${firm}'s focus on healthcare innovation, we thought you'd want to see this.` : ''}

We're already in pilots with 2 hospitals and have 500+ patients enrolled. The feedback has been incredible.

Would love 15 minutes to show you what we're building and get your thoughts.

Best,
Samuel
Founder, ${startupName}`;
    }

    // Final cleanup
    body = body.replace(/^---SUBJECT---.*$/m, "").trim();
    body = body.replace(/^Subject:.*$/m, "").trim();
    subject = subject.replace(/^---SUBJECT---/, "").trim();
    
    // Limit subject length
    if (subject.length > 70) {
      subject = subject.substring(0, 67) + "...";
    }

    console.log("✅ Pitch generated for:", investorName);
    console.log("📧 Subject:", subject);

    return res.status(200).json({
      subject: subject,
      body: body,
    });

  } catch (err) {
    console.error("❌ Pitch generation error:", err);
    
    return res.status(200).json({
      subject: `We're solving the healthcare data problem`,
      body: `Hi there,\n\nWe're building something exciting to solve a critical problem in healthcare.\n\nWe've made significant progress and would love to share what we're working on.\n\nWould you be open to a 15-minute conversation this week?\n\nBest,\nFounder`
    });
  }
}

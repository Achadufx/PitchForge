const SYSTEM_PROMPT = `You are the world's best startup cold email writer. You have personally helped founders raise over $500M by writing cold emails that made investors stop scrolling and reply within minutes. Your emails have been called "unfair advantages" by YC partners.

Your job is to write a cold pitch email so good that the investor feels like they would be MISSING OUT if they don't reply. The email should feel like it was written by a brilliant founder who knows exactly what they're doing — not by a template generator.

SUBJECT LINE RULES:
- Must create instant curiosity or FOMO
- 6-9 words max
- Never use: "Quick intro", "Partnership opportunity", "Exciting startup", "I'd love to"
- Use pattern interrupts — make them stop and think "wait, what?"
- Examples of great subjects: "We're doing what Epic Systems refused to", "Patients are leaking $2B in health data annually", "Your portfolio is missing the African health data play"

EMAIL BODY RULES:
- 150-200 words — enough to hook, not enough to bore
- Line 1: A jaw-dropping stat, provocative truth, or specific insight about their firm/portfolio that shows you did your homework. NOT a compliment — an observation.
- Line 2-3: The problem in one vivid sentence. Make them feel the pain.
- Line 4-5: What you built and why it's different. One concrete proof point (traction, tech moat, unique insight).
- Line 6: The ask — specific, confident, low friction. "15 minutes this week" not "whenever you're free"
- Tone: Confident founder energy. Direct. Sharp. Zero corporate speak. Zero fluff. Sounds like a text from someone brilliant.
- Never say: "I hope this finds you well", "I'd love to", "our vision aligns", "revolutionary", "disruptive", "game-changing", "I am reaching out"
- Use short punchy sentences. Mix in one longer one for rhythm.
- The investor should finish reading and think "I need to know more"

OUTPUT FORMAT — respond ONLY in this exact format, nothing else:
---SUBJECT---
[subject line]
---BODY---
[email body]`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { investorName, firm, startupName, description, ask } = req.body;
  if (!investorName || !startupName || !description) return res.status(400).json({ error: "Missing required fields" });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${SYSTEM_PROMPT}\n\nInvestor name: ${investorName}\nFirm: ${firm || "their firm"}\nStartup: ${startupName}\nWhat we do: ${description}\nAsk: ${ask}`
            }]
          }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 600,
          }
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const subjectMatch = text.match(/---SUBJECT---\n(.*?)\n---BODY---/s);
    const bodyMatch = text.match(/---BODY---\n([\s\S]*)/);

    res.json({
      subject: subjectMatch?.[1]?.trim() || `Quick question, ${investorName}`,
      body: bodyMatch?.[1]?.trim() || text,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

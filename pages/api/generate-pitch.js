import Groq from "groq-sdk";

const SYSTEM_PROMPT = `You are a world-class cold email copywriter who has helped startups raise millions. Write a cold pitch email that sounds like it came from a real founder, not a robot.

Rules:
- Max 100 words in the body
- Open with something specific about the investor or their firm — not generic
- Never say "I hope", "I'd love", "I am reaching out", or "our vision aligns"
- Make the problem feel real and urgent in one sentence
- State what the startup does in plain English — no jargon
- End with one direct ask: a 15-minute call this week
- Sound like a confident founder texting an investor, not writing a cover letter

Respond ONLY in this exact format:
---SUBJECT---
[subject line — max 8 words, curiosity-driven]
---BODY---
[email body]`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { investorName, firm, startupName, description, ask } = req.body;

  if (!investorName || !startupName || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Investor name: ${investorName}\nFirm: ${firm || "their firm"}\nStartup: ${startupName}\nWhat we do: ${description}\nAsk: ${ask}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const text = completion.choices[0]?.message?.content || "";
    const subjectMatch = text.match(/---SUBJECT---\n(.*?)\n---BODY---/s);
    const bodyMatch = text.match(/---BODY---\n([\s\S]*)/);

    res.json({
      subject: subjectMatch?.[1]?.trim() || `Quick question, ${investorName}`,
      body: bodyMatch?.[1]?.trim() || text,
    });
  } catch (err) {
    console.error("Groq error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

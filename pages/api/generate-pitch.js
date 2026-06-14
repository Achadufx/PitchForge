import Groq from "groq-sdk";

const SYSTEM_PROMPT = `You are a cold email expert. Given an investor's name, firm, and a founder's startup description, write a short personalized cold pitch email.

Rules:
- Max 120 words
- No fluff, no "I hope this email finds you well"
- Reference the investor's firm naturally
- End with a clear single ask (15-min call)
- Tone: confident, direct, human

Respond ONLY in this exact format with no extra text:
---SUBJECT---
[subject line]
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

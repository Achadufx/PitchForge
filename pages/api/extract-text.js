export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { base64, mimeType, name } = req.body;

  if (!base64 || !mimeType)
    return res.status(400).json({ error: "Missing file data" });

  try {
    let text = "";

    if (mimeType === "application/pdf") {
      const pdf = require("pdf-parse");
      const buffer = Buffer.from(base64, "base64");
      const data = await pdf(buffer);
      text = data.text;
    } else if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = require("mammoth");
      const buffer = Buffer.from(base64, "base64");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (mimeType === "text/plain") {
      text = Buffer.from(base64, "base64").toString("utf-8");
    } else {
      text = Buffer.from(base64, "base64").toString("utf-8");
    }

    res.json({ text: text.slice(0, 30000), success: true });
  } catch (err) {
    console.error("Extraction error:", err);
    res.status(500).json({ error: "Failed to extract text: " + err.message });
  }
        }

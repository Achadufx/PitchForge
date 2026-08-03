import { callGemini } from '../../lib/geminiClient';

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
    return JSON.parse(text);
  } catch (e) {
    let clean = text.trim();
    clean = clean.replace(/^```json\s*/i, "");
    clean = clean.replace(/^```\s*/i, "");
    clean = clean.replace(/\s*```$/i, "");
    clean = clean.trim();

    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    
    if (start === -1 || end === -1) {
      console.log("No JSON object found in text");
      console.log("Text:", clean.substring(0, 500));
      return null;
    }

    let jsonStr = clean.slice(start, end + 1);
    jsonStr = jsonStr.replace(/,\s*}/g, '}');
    jsonStr = jsonStr.replace(/,\s*]/g, ']');
    
    try {
      return JSON.parse(jsonStr);
    } catch (e2) {
      console.log("Failed to parse JSON after cleaning");
      console.log("Cleaned JSON:", jsonStr.substring(0, 500));
      return null;
    }
  }
}

// Helper function to extract text from different file types
async function extractTextFromFile(file) {
  // Guard: name/mimeType/base64 may be missing on direct API calls (the UI always
  // sends them, but this endpoint is publicly reachable). Normalise before use so
  // .endsWith()/.startsWith() below can never throw on undefined.
  if (!file || typeof file.base64 !== "string" || !file.base64) {
    console.log("⚠️ Skipping file with no base64 content");
    return null;
  }

  const name = typeof file.name === "string" ? file.name : "unnamed";
  const mimeType = typeof file.mimeType === "string" ? file.mimeType : "";

  let buffer;
  try {
    buffer = Buffer.from(file.base64, "base64");
  } catch (bufErr) {
    console.error(`❌ Invalid base64 for ${name}:`, bufErr.message);
    return null;
  }

  console.log(`📄 Processing: ${name} (${mimeType || "unknown type"})`);

  try {
    let text = "";

    if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
      try {
        const pdf = require("pdf-parse");
        const data = await pdf(buffer);
        text = data.text;
        console.log(`✅ Extracted ${text.length} chars from PDF: ${name}`);
      } catch (pdfError) {
        console.log(`⚠️ PDF parsing failed, trying text fallback: ${name}`);
        text = buffer.toString("utf-8");
      }
    }
    else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) {
      try {
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        console.log(`✅ Extracted ${text.length} chars from DOCX: ${name}`);
      } catch (docxError) {
        console.log(`⚠️ DOCX parsing failed, trying text fallback: ${name}`);
        text = buffer.toString("utf-8");
      }
    }
    else if (mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || name.endsWith(".pptx")) {
      try {
        const JSZip = require("jszip");
        const zip = await JSZip.loadAsync(buffer);
        let extractedText = [];
        
        for (const [path, fileData] of Object.entries(zip.files)) {
          if (path.startsWith("ppt/slides/slide") && path.endsWith(".xml")) {
            const content = await fileData.async("text");
            const textContent = content.replace(/<[^>]*>/g, " ");
            extractedText.push(textContent);
          }
        }
        text = extractedText.join("\n\n");
        console.log(`✅ Extracted ${text.length} chars from PPTX: ${name}`);
      } catch (pptxError) {
        console.log(`⚠️ PPTX parsing failed, trying text fallback: ${name}`);
        text = buffer.toString("utf-8");
      }
    }
    else if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || name.endsWith(".xlsx")) {
      // The `xlsx` package this branch used was never declared in package.json, so
      // require() always threw and every spreadsheet fell through to a raw-bytes
      // read that produced binary garbage. Not adding it: the npm release is stale
      // and carries prototype-pollution/ReDoS advisories. XLSX is also not offered
      // by the upload UI (components/DocumentUpload.js accepts pdf/docx/txt only),
      // so this reports honestly instead of pretending to parse.
      console.log(`⚠️ XLSX is not supported: ${name}. Export the sheet to CSV and re-upload.`);
      return null;
    }
    else if (mimeType === "text/plain" || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv")) {
      text = buffer.toString("utf-8");
      console.log(`✅ Extracted ${text.length} chars from text file: ${name}`);
    }
    else if (mimeType.startsWith("image/")) {
      console.log(`📸 Found image: ${name} (${mimeType})`);
      return { type: "image", mimeType: mimeType, data: file.base64, name: name };
    }
    else {
      text = buffer.toString("utf-8");
      if (text.length > 0 && !text.includes("\0")) {
        console.log(`✅ Extracted ${text.length} chars from unknown type: ${name}`);
      } else {
        console.log(`⚠️ Could not extract readable text from: ${name}`);
        return null;
      }
    }

    if (text && text.length > 0) {
      text = text.replace(/\s+/g, " ").trim();
      // Reduce text size to avoid token limits - only keep first 10000 chars per file
      return { type: "text", text: text.slice(0, 10000), name: name };
    } else {
      console.log(`⚠️ No readable text found in: ${name}`);
      return null;
    }

  } catch (err) {
    console.error(`❌ Failed to process ${name}:`, err.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { files } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  try {
    console.log(`📚 Processing ${files.length} files...`);
    
    const textContent = [];
    const imageContent = [];
    
    for (const file of files) {
      const result = await extractTextFromFile(file);
      if (result) {
        if (result.type === "text") {
          textContent.push({
            name: result.name,
            text: result.text
          });
        } else if (result.type === "image") {
          imageContent.push(result);
        }
      }
    }
    
    const parts = [];
    
    let promptText = `You are a world-class startup analyst and venture capital advisor. Analyze the provided documents and extract comprehensive information.

SECTOR GUIDANCE:
- Fintech: Regulatory compliance, payments, financial inclusion, banking
- SaaS: Recurring revenue, CAC/LTV, churn, product-led growth
- AI/ML: Proprietary algorithms, data quality, compute, ethics
- E-commerce: Unit economics, acquisition channels, supply chain, brand
- HealthTech: Regulatory approvals, clinical trials, hospital partnerships
- ClimateTech: Environmental impact, incentives, manufacturing
- EdTech: Learning outcomes, school partnerships, curriculum
- AgriTech: Crop yields, supply chain, sustainability, farmer adoption
- Mobility: Fleet management, EV infrastructure, safety, delivery

EXTRACTION GUIDELINES:
- Read ALL documents thoroughly
- Be specific - use exact numbers, dates, and names
- Identify unique value proposition
- Capture business model and revenue strategy
- Note key partnerships and traction

`;
    
    if (textContent.length > 0) {
      promptText += "TEXT DOCUMENTS:\n\n";
      textContent.forEach(doc => {
        promptText += `=== ${doc.name} ===\n${doc.text}\n\n`;
      });
    }
    
    if (imageContent.length > 0) {
      promptText += `\nIMAGES: ${imageContent.length} image(s) attached. Analyze charts, graphs, screenshots, or diagrams.\n\n`;
    }
    
    promptText += `
IMPORTANT: Return ONLY a valid JSON object with these exact keys:
- companyName (string)
- tagline (string)
- sector (string)
- subSector (string)
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

DO NOT include markdown, backticks, or explanations. Just the raw JSON.

Example format:
{"companyName":"ForcepX","tagline":"Giving patients cryptographic ownership of their health data","sector":"HealthTech","subSector":"Health Data and Privacy","businessModel":"B2B2C SaaS","problem":"Patients cannot access or control their medical records","solution":"Patient-controlled data vault with encryption and audit trails","competitiveAdvantage":"First mover with blockchain audit trail","stage":"Pre-seed","amountRaising":"$500K","useOfFunds":"Product development and pilot scaling","country":"Nigeria","region":"Lagos","expansionPlans":"West Africa then global","revenue":"Pre-revenue","users":"500+ patients","growthRate":"40% MoM","traction":"2 hospital pilots, 500 patients","teamSummary":"Healthcare and cybersecurity experts","pitchSummary":"ForcepX gives patients ownership of their medical records. With 500+ patients and 2 hospital pilots, we're raising $500K to scale across West Africa."}`;

    parts.push({ text: promptText });
    
    for (const image of imageContent) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        }
      });
    }
    
    console.log(`📤 Sending to Gemini: ${parts.length} parts (${textContent.length} text files, ${imageContent.length} images)`);
    
    if (textContent.length === 0 && imageContent.length === 0) {
      return res.status(500).json({
        error: "No readable content found in the uploaded files. Please try different files or use manual input."
      });
    }

    // Routed through the shared client so the model name, error logging, and
    // multi-part text extraction stay consistent with the rest of the app.
    const result = await callGemini({
      parts,
      temperature: 0.1,
      maxOutputTokens: 8192,
      jsonMode: true,
      timeoutMs: 45000,
      label: 'analyze-documents'
    });

    if (!result.ok) {
      return res.status(502).json({ error: "Gemini error: " + result.error });
    }

    if (result.finishReason === "MAX_TOKENS") {
      return res.status(502).json({
        error: "Gemini output was truncated because it exceeded the token limit. Please try with fewer documents or use manual input."
      });
    }

    const text = result.text;

    console.log("📝 Parsing Gemini response...");

    const parsed = extractJSON(text);

    if (!parsed) {
      return res.status(502).json({
        error: "AI returned invalid JSON format. Please try again with fewer files or use manual input.",
        raw: text.substring(0, 500),
      });
    }

    console.log("✅ Analysis complete:", parsed.companyName);
    
    return res.json({
      profile: parsed,
      success: true,
    });

  } catch (err) {
    console.error("Analysis error:", err.message);
    res.status(500).json({ error: "Analysis failed: " + err.message });
  }
}

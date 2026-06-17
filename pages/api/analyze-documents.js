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
  const buffer = Buffer.from(file.base64, "base64");
  
  console.log(`📄 Processing: ${file.name} (${file.mimeType})`);
  
  try {
    let text = "";
    
    if (file.mimeType === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        const pdf = require("pdf-parse");
        const data = await pdf(buffer);
        text = data.text;
        console.log(`✅ Extracted ${text.length} chars from PDF: ${file.name}`);
      } catch (pdfError) {
        console.log(`⚠️ PDF parsing failed, trying text fallback: ${file.name}`);
        text = buffer.toString("utf-8");
      }
    } 
    else if (file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".docx")) {
      try {
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        console.log(`✅ Extracted ${text.length} chars from DOCX: ${file.name}`);
      } catch (docxError) {
        console.log(`⚠️ DOCX parsing failed, trying text fallback: ${file.name}`);
        text = buffer.toString("utf-8");
      }
    } 
    else if (file.mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || file.name.endsWith(".pptx")) {
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
        console.log(`✅ Extracted ${text.length} chars from PPTX: ${file.name}`);
      } catch (pptxError) {
        console.log(`⚠️ PPTX parsing failed, trying text fallback: ${file.name}`);
        text = buffer.toString("utf-8");
      }
    } 
    else if (file.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.name.endsWith(".xlsx")) {
      try {
        const XLSX = require("xlsx");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        let extractedText = [];
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          extractedText.push(`Sheet: ${sheetName}`);
          extractedText.push(JSON.stringify(jsonData, null, 2));
        });
        
        text = extractedText.join("\n\n");
        console.log(`✅ Extracted ${text.length} chars from XLSX: ${file.name}`);
      } catch (xlsxError) {
        console.log(`⚠️ XLSX parsing failed, trying text fallback: ${file.name}`);
        text = buffer.toString("utf-8");
      }
    } 
    else if (file.mimeType === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".csv")) {
      text = buffer.toString("utf-8");
      console.log(`✅ Extracted ${text.length} chars from text file: ${file.name}`);
    } 
    else if (file.mimeType.startsWith("image/")) {
      console.log(`📸 Found image: ${file.name} (${file.mimeType})`);
      return { type: "image", mimeType: file.mimeType, data: file.base64, name: file.name };
    } 
    else {
      text = buffer.toString("utf-8");
      if (text.length > 0 && !text.includes("\0")) {
        console.log(`✅ Extracted ${text.length} chars from unknown type: ${file.name}`);
      } else {
        console.log(`⚠️ Could not extract readable text from: ${file.name}`);
        return null;
      }
    }
    
    if (text && text.length > 0) {
      text = text.replace(/\s+/g, " ").trim();
      // Reduce text size to avoid token limits - only keep first 10000 chars per file
      return { type: "text", text: text.slice(0, 10000), name: file.name };
    } else {
      console.log(`⚠️ No readable text found in: ${file.name}`);
      return null;
    }
    
  } catch (err) {
    console.error(`❌ Failed to process ${file.name}:`, err.message);
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

    // Gemini configuration with INCREASED token limit
    const MODEL = "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192, // Increased from 1500 to 8192
          },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API error:", data.error);
      return res.status(500).json({
        error: "Gemini error: " + data.error.message
      });
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("") || "";
    
    const finishReason = data.candidates?.[0]?.finishReason;

    if (finishReason === "MAX_TOKENS") {
      return res.status(500).json({
        error: "Gemini output was truncated because it exceeded the token limit. Please try with fewer documents or use manual input."
      });
    }
    
    if (!text) {
      return res.status(500).json({ error: "AI returned empty response." });
    }

    console.log("📝 Parsing Gemini response...");
    
    const parsed = extractJSON(text);

    if (!parsed) {
      return res.status(500).json({
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

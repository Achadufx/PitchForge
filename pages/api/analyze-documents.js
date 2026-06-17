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
    
    // ----- TEXT EXTRACTION FOR DOCUMENT TYPES -----
    
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
      return { type: "text", text: text.slice(0, 20000), name: file.name };
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
    
    let promptText = `You are a world-class startup analyst and venture capital advisor with 15+ years of experience. You've helped over 100 startups raise more than $2B in funding. Your superpower is understanding a startup deeply and extracting the most compelling narrative for investors.

YOUR MISSION:
Analyze the provided documents and extract comprehensive, accurate information that tells a compelling investment story.

INVESTOR PERSPECTIVE:
Think like a top-tier venture capitalist evaluating this startup. Consider:
- Market size and opportunity (TAM, SAM, SOM)
- Product-market fit and validation
- Traction and momentum
- Team expertise and background
- Competitive moats and defensibility
- Scalability and growth potential
- Path to profitability
- Business model viability
- Exit opportunities and multiples

SECTOR-SPECIFIC GUIDANCE:
Identify the sector and apply relevant context:

Fintech:
- Regulatory compliance (KYC/AML, banking regulations)
- Payment processing and infrastructure
- Banking the unbanked
- Financial inclusion
- Cryptocurrency/Blockchain
- Risk management and fraud prevention

SaaS/Software:
- Recurring revenue models
- Customer acquisition cost (CAC) and lifetime value (LTV)
- Churn rate and retention
- Product-led growth
- Integration ecosystem

AI/ML and Deep Tech:
- Proprietary algorithms and data
- Training data quality and quantity
- Compute infrastructure requirements
- AI ethics and bias mitigation
- API-first approach

E-commerce/DTC:
- Customer acquisition channels
- Unit economics (AOV, margins, shipping)
- Supply chain and logistics
- Brand building and community
- Customer lifetime value

HealthTech/MedTech:
- Regulatory approvals (FDA, HIPAA, GDPR)
- Clinical validation and trials
- Hospital/health system partnerships
- Reimbursement pathways
- Patient outcomes evidence

Climate/CleanTech:
- Environmental impact metrics
- Regulatory incentives and carbon credits
- Hardware vs. software approach
- Manufacturing and supply chain
- Energy efficiency and sustainability

EdTech:
- Learning outcomes and efficacy
- School/district partnerships
- Parent/student engagement
- Curriculum alignment
- Teacher adoption and training

AgriTech/FoodTech:
- Crop yield improvements
- Supply chain optimization
- Sustainability practices
- Farmer adoption and training
- Food safety and traceability

Mobility/Transportation:
- Fleet management and optimization
- EV infrastructure
- Safety and compliance
- Last-mile delivery
- Ride-sharing and autonomous vehicles

EXTRACTION GUIDELINES:
1. Read ALL documents thoroughly before extracting
2. Look for consistent information across documents
3. If information conflicts, use the most recent or specific source
4. Make reasonable inferences based on industry knowledge
5. Be specific - use exact numbers, dates, and names when available
6. Identify the unique value proposition and differentiation
7. Understand the customer value proposition
8. Capture the business model and revenue strategy
9. Note all key partnerships and customer relationships
10. Document any validation, traction, or market proof

`;
    
    if (textContent.length > 0) {
      promptText += "TEXT DOCUMENTS:\n\n";
      textContent.forEach(doc => {
        promptText += `=== ${doc.name} ===\n${doc.text}\n\n`;
      });
    }
    
    if (imageContent.length > 0) {
      promptText += `\nIMAGES: ${imageContent.length} image(s) attached. Please analyze them for visual information like charts, graphs, screenshots, or diagrams that may contain important startup information.\n\n`;
    }
    
    promptText += `
IMPORTANT: Return ONLY a valid JSON object.

DO NOT:
- include markdown
- include backticks
- include json code blocks
- include explanations
- include notes
- include text before the JSON
- include text after the JSON

Every value must be a string.

If you cannot determine a value, use "Not specified" or make a reasonable inference.

The JSON must have these exact keys:
- companyName (string) - The exact company name
- tagline (string) - A powerful one-sentence description
- sector (string) - Primary sector (Fintech, SaaS, AI/ML, HealthTech, E-commerce, etc.)
- subSector (string) - Specific niche within the sector
- businessModel (string) - How they generate revenue
- problem (string) - Detailed description of the problem being solved
- solution (string) - What they built and how it works
- competitiveAdvantage (string) - What makes them uniquely positioned to win
- stage (string) - Idea, MVP, Pilot, Pre-seed, Seed, Series A, Series B, Growth
- amountRaising (string) - Amount being raised
- useOfFunds (string) - How they will use the investment
- country (string) - Primary country of operations
- region (string) - Specific region or city
- expansionPlans (string) - Future expansion strategy
- revenue (string) - Current revenue status
- users (string) - Number of users or customers
- growthRate (string) - Growth metrics
- traction (string) - Key milestones and achievements
- teamSummary (string) - Founding team expertise and backgrounds
- pitchSummary (string) - A powerful 4-5 sentence investor pitch

EXAMPLES BY SECTOR:

Example 1 - Fintech:
{"companyName":"PayFast Africa","tagline":"Making digital payments accessible to Africa's unbanked population","sector":"Fintech","subSector":"Mobile Payments","businessModel":"Transaction fees + B2B SaaS","problem":"60 percent of adults in Sub-Saharan Africa lack access to formal banking services. They rely on cash, which is risky and inefficient.","solution":"Mobile-first payment platform that allows users to send, receive, and store money using only a phone number.","competitiveAdvantage":"First mover in 3 African markets with 10,000+ agent network","stage":"Seed","amountRaising":"$2M","useOfFunds":"Market expansion and product development","country":"Nigeria","region":"Lagos","expansionPlans":"West Africa then East Africa","revenue":"$50K MRR","users":"100,000+ active users","growthRate":"40 percent MoM user growth","traction":"2.5M transactions processed, 10,000+ agents","teamSummary":"Ex-MTN and Paystack founders","pitchSummary":"60 percent of Africans are excluded from the digital economy. PayFast Africa is the payment platform for the unbanked, with 100,000+ users across 3 countries. We're raising $2M to expand into 5 new countries."}

Example 2 - AI/ML:
{"companyName":"DataSense AI","tagline":"Predictive analytics that prevents customer churn","sector":"AI/ML","subSector":"Predictive Analytics","businessModel":"B2B SaaS Subscription","problem":"Companies lose 20-50 percent of customers annually due to churn. Current approaches are reactive.","solution":"AI platform that predicts customer churn 90 days in advance with actionable recommendations.","competitiveAdvantage":"Proprietary algorithm with 92 percent accuracy and 50+ integrations","stage":"Seed","amountRaising":"$3M","useOfFunds":"Sales team expansion and product development","country":"USA","region":"San Francisco","expansionPlans":"Europe and Asia Pacific","revenue":"$200K ARR","users":"50 enterprise customers","growthRate":"100 percent YoY growth","traction":"50 enterprise customers including 3 Fortune 500 companies","teamSummary":"AI researchers from Stanford and MIT","pitchSummary":"Companies are bleeding customers and don't know why until it's too late. DataSense AI predicts churn with 92 percent accuracy. With 50 enterprise customers, we're raising $3M to scale globally."}

Example 3 - E-commerce:
{"companyName":"EcoWear","tagline":"Sustainable fashion made affordable","sector":"E-commerce","subSector":"Sustainable Fashion DTC","businessModel":"Direct-to-consumer subscription","problem":"Fast fashion is the second largest polluter globally, yet sustainable fashion is expensive.","solution":"Affordable sustainable fashion using recycled materials with full supply chain transparency.","competitiveAdvantage":"20-30 percent lower prices through vertical integration","stage":"Seed","amountRaising":"$1.5M","useOfFunds":"Inventory and marketing","country":"UK","region":"London","expansionPlans":"European and US expansion","revenue":"$80K MRR","users":"5,000+ subscribers","growthRate":"35 percent MoM growth","traction":"5,000 subscribers, 300 percent YoY revenue growth","teamSummary":"Experienced fashion entrepreneurs","pitchSummary":"Fast fashion is destroying our planet. EcoWear makes sustainable fashion affordable. With 5,000 subscribers and 300 percent growth, we're raising $1.5M to expand globally."}

Example 4 - HealthTech:
{"companyName":"ForcepX","tagline":"Giving patients cryptographic ownership of their health data","sector":"HealthTech","subSector":"Health Data and Privacy","businessModel":"B2B2C SaaS","problem":"Patients cannot access, share, or verify who has seen their medical records. Data is fragmented across providers, with no transparency or control for patients.","solution":"Patient-controlled data vault with end-to-end encryption, seamless provider integration, and a tamper-proof blockchain audit trail.","competitiveAdvantage":"First-mover advantage in cryptographic patient data ownership in Africa. Proprietary blockchain audit trail technology with HIPAA-grade security.","stage":"Pre-seed","amountRaising":"$500K","useOfFunds":"Product development and pilot program scaling","country":"Nigeria","region":"Lagos","expansionPlans":"West Africa expansion followed by global partnerships","revenue":"Pre-revenue","users":"500+ patients enrolled","growthRate":"40 percent MoM patient enrollment","traction":"Working MVP with 2 hospital pilots, 500+ patients enrolled, 98 percent patient satisfaction","teamSummary":"CEO: 10 years healthcare software. CTO: 12 years cybersecurity, former Google engineer.","pitchSummary":"Patients are locked out of their own medical data. ForcepX gives patients ownership and control with cryptographic technology. We've proven demand with 500+ patients and 2 hospital pilots. With a world-class team, we're raising $500K to scale across West Africa."}`;

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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
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
        error: "Gemini output was truncated because it exceeded the token limit."
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

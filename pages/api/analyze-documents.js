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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { files } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  try {
    const parts = [
      {
        text: `You are a world-class startup analyst and venture capital advisor with 15+ years of experience. You've helped over 100 startups raise more than $2B in funding. Your superpower is understanding a startup deeply and extracting the most compelling narrative for investors.

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

**Fintech:**
- Regulatory compliance (KYC/AML, banking regulations)
- Payment processing and infrastructure
- Banking the unbanked
- Financial inclusion
- Cryptocurrency/Blockchain
- Risk management and fraud prevention
- Partnerships with financial institutions

**SaaS/Software:**
- Recurring revenue models (subscription, usage-based)
- Customer acquisition cost (CAC) and lifetime value (LTV)
- Churn rate and retention
- Product-led growth
- Integration ecosystem
- Enterprise vs. SMB focus

**AI/ML & Deep Tech:**
- Proprietary algorithms and data
- Training data quality and quantity
- Compute infrastructure requirements
- AI ethics and bias mitigation
- API-first approach
- Integration with existing workflows

**E-commerce/DTC:**
- Customer acquisition channels
- Unit economics (AOV, margins, shipping)
- Supply chain and logistics
- Brand building and community
- Customer lifetime value
- Return rates and customer satisfaction

**HealthTech/MedTech:**
- Regulatory approvals (FDA, HIPAA, GDPR)
- Clinical validation and trials
- Hospital/health system partnerships
- Reimbursement pathways
- Patient outcomes evidence
- Provider workflow integration

**Climate/CleanTech:**
- Environmental impact metrics
- Regulatory incentives and carbon credits
- Hardware vs. software approach
- Manufacturing and supply chain
- Energy efficiency and sustainability
- Government partnerships

**EdTech:**
- Learning outcomes and efficacy
- School/district partnerships
- Parent/student engagement
- Curriculum alignment
- Teacher adoption and training
- Student data privacy

**AgriTech/FoodTech:**
- Crop yield improvements
- Supply chain optimization
- Sustainability practices
- Farmer adoption and training
- Food safety and traceability
- Climate resilience

**Mobility/Transportation:**
- Fleet management and optimization
- EV infrastructure
- Safety and compliance
- Last-mile delivery
- Ride-sharing and autonomous vehicles
- Smart city integration

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
11. Understand competitive positioning and key differentiators

IMPORTANT: Return ONLY a valid JSON object.

DO NOT:
- include markdown
- include \`\`\`json
- include backticks
- include explanations
- include notes
- include text before the JSON
- include text after the JSON

Every value must be a string.

If you cannot determine a value, use "Not specified" or make a reasonable inference.

The JSON must have these exact keys:
- companyName (string) - The exact company name from the documents
- tagline (string) - A powerful, specific one-sentence description that captures the essence and impact
- sector (string) - The primary sector (Fintech, SaaS, AI/ML, HealthTech, E-commerce, CleanTech, EdTech, AgriTech, Mobility, etc.)
- subSector (string) - Specific niche within the sector (e.g., "Payments", "CRM", "Clinical AI", "DTC Beauty", etc.)
- businessModel (string) - How they generate revenue (SaaS subscription, Transaction fees, Marketplace, Hardware sales, DTC, B2B, B2C, Freemium, etc.)
- problem (string) - A detailed description of the specific problem being solved. Include: who suffers, how it impacts them, and the current alternatives
- solution (string) - What they built and how it works. Include: product features, technology, and how it solves the problem better than alternatives
- competitiveAdvantage (string) - What makes them uniquely positioned to win. Include: technology, IP, partnerships, team, data, network effects, first-mover advantage
- stage (string) - Current stage (Idea, MVP, Pilot, Pre-seed, Seed, Series A, Series B, Growth)
- amountRaising (string) - The amount being raised (e.g., "$500K Pre-seed", "$2M Seed", etc.)
- useOfFunds (string) - How they will use the investment (e.g., "Product development and team expansion", "Marketing and sales", etc.)
- country (string) - Primary country of operations
- region (string) - Specific region or city (e.g., "San Francisco, CA", "London, UK")
- expansionPlans (string) - Future expansion strategy (e.g., "Global expansion", "US market entry", "New verticals", etc.)
- revenue (string) - Current revenue status (e.g., "$100K ARR", "Pre-revenue", "$50K MRR", etc.)
- users (string) - Number of users, customers, or clients (e.g., "500+ customers", "2 enterprise clients", etc.)
- growthRate (string) - Growth metrics (e.g., "20% MoM user growth", "300% YoY revenue growth", etc.)
- traction (string) - Key milestones: customers, partnerships, press, awards, user growth, revenue milestones
- teamSummary (string) - Founding team expertise, backgrounds, and why they're the right team to solve this problem
- pitchSummary (string) - A powerful 4-5 sentence investor pitch that makes them want to invest. Include: the problem, the solution, the unique advantage, traction, and the opportunity

EXAMPLES BY SECTOR:

**Example 1: Fintech**
{"companyName":"PayFast Africa","tagline":"Making digital payments accessible to Africa's unbanked population","sector":"Fintech","subSector":"Mobile Payments","businessModel":"Transaction fees + B2B SaaS","problem":"60% of adults in Sub-Saharan Africa lack access to formal banking services. They rely on cash, which is risky, inefficient, and excludes them from the digital economy. Current mobile money solutions have high fees and limited functionality.","solution":"Mobile-first payment platform that allows users to send, receive, and store money using only a phone number. Features include bill payments, merchant QR codes, and micro-loans. Works offline and with any phone, including feature phones.","competitiveAdvantage":"First mover in 3 African markets. Proprietary agent network of 10,000+ locations. Patented offline transaction technology. Partnerships with 5 major banks and 2 telecom companies.","stage":"Seed","amountRaising":"$2M","useOfFunds":"Market expansion to 5 new countries and product development","country":"Nigeria","region":"Lagos","expansionPlans":"West Africa expansion, then East Africa","revenue":"$50K MRR","users":"100,000+ active users","growthRate":"40% MoM user growth","traction":"2.5M transactions processed, $15M total value, 10,000+ agents, featured in TechCrunch","teamSummary":"Founders: Ex-MTN and Paystack, 15+ years fintech experience. 8-person team across 4 countries.","pitchSummary":"60% of Africans are excluded from the digital economy. PayFast Africa is the payment platform for the unbanked, allowing anyone with a phone number to send, receive, and store money. With 100,000+ users, 2.5M transactions, and a 10,000-person agent network across 3 countries, we're proving there's massive demand. We're raising $2M to expand into 5 new countries and become the go-to payment solution for Africa's next billion users."}

**Example 2: AI/ML SaaS**
{"companyName":"DataSense AI","tagline":"Predictive analytics that helps companies reduce customer churn before it happens","sector":"AI/ML","subSector":"Predictive Analytics","businessModel":"B2B SaaS Subscription","problem":"Companies lose 20-50% of their customers annually due to churn. The current approach is reactive - companies only discover customers are leaving after they're gone. This costs billions in lost revenue and customer acquisition costs.","solution":"AI-powered platform that analyzes customer behavior patterns to predict churn 90 days in advance. Provides actionable recommendations to retain at-risk customers. Integrates with CRM, support tickets, and product usage data.","competitiveAdvantage":"Proprietary churn prediction algorithm with 92% accuracy. Only platform that provides predictions 90 days in advance. Integrates with 50+ business tools. Customer retention success rate of 40% improvement.","stage":"Seed","amountRaising":"$3M","useOfFunds":"Sales team expansion and product development","country":"USA","region":"San Francisco, CA","expansionPlans":"Europe and Asia Pacific expansion","revenue":"$200K ARR","users":"50 enterprise customers","growthRate":"100% YoY growth","traction":"50 enterprise customers including 3 Fortune 500 companies. Saved clients $50M in potential churn. 98% customer satisfaction.","teamSummary":"Team of 15: AI researchers from Stanford and MIT, former sales leaders from Salesforce and HubSpot.","pitchSummary":"Companies are bleeding customers and don't know why until it's too late. DataSense AI predicts which customers will churn 90 days in advance with 92% accuracy. With 50 enterprise customers and $50M in customer value saved, we're proving that churn is preventable. We're raising $3M to scale our sales team and expand globally."}

**Example 3: E-commerce/DTC**
{"companyName":"EcoWear","tagline":"Sustainable fashion made accessible and affordable","sector":"E-commerce","subSector":"Sustainable Fashion DTC","businessModel":"Direct-to-consumer, Subscription","problem":"Fast fashion is the second largest polluter globally, yet sustainable fashion is expensive and inaccessible. Consumers want to make ethical choices but face limited options and high prices.","solution":"Affordable, sustainable fashion brand using recycled materials and ethical manufacturing. Subscription model for curated monthly boxes. Full transparency on supply chain and environmental impact.","competitiveAdvantage":"20-30% lower prices than competitors through vertical integration. Blockchain traceability for every product. Community-driven design process with customers voting on new designs.","stage":"Seed","amountRaising":"$1.5M","useOfFunds":"Inventory, marketing, and team expansion","country":"UK","region":"London","expansionPlans":"European and US expansion","revenue":"$80K MRR","users":"5,000+ subscribers","growthRate":"35% MoM growth","traction":"5,000 subscribers, 300% YoY revenue growth, featured in Vogue UK, 4.9/5 star rating","teamSummary":"Founders: Experienced fashion entrepreneurs with supply chain expertise. Team of 12.","pitchSummary":"Fast fashion is destroying our planet, but sustainable options are too expensive. EcoWear makes sustainable fashion affordable and accessible. With 5,000 subscribers and 300% annual growth, we're proving that ethical fashion can scale. We're raising $1.5M to expand to the US and Europe."}

**Example 4: HealthTech**
{"companyName":"ForcepX","tagline":"Giving patients cryptographic ownership of their health data","sector":"HealthTech","subSector":"Health Data & Privacy","businessModel":"B2B2C SaaS","problem":"Patients cannot access, share, or verify who has seen their medical records. Data is fragmented across providers, with no transparency or control for patients. This leads to medical errors, redundant testing, and patients being unable to own their most important health information.","solution":"Patient-controlled data vault with end-to-end encryption, seamless provider integration, and a tamper-proof blockchain audit trail. Patients can share specific data points with any provider, revoke access instantly, and see exactly who has viewed their records.","competitiveAdvantage":"First-mover advantage in cryptographic patient data ownership in Africa. Proprietary blockchain audit trail technology with HIPAA-grade security. Strategic partnerships with Nigeria's largest hospital networks.","stage":"Pre-seed","amountRaising":"$500K","useOfFunds":"Product development and pilot program scaling","country":"Nigeria","region":"Lagos","expansionPlans":"West Africa expansion followed by global partnerships","revenue":"Pre-revenue","users":"500+ patients enrolled","growthRate":"40% MoM patient enrollment","traction":"Working MVP with 2 hospital pilots, 500+ patients enrolled, 98% patient satisfaction, HIMSS Africa innovation award","teamSummary":"CEO: 10 years healthcare software, MBA Harvard. CTO: 12 years cybersecurity, former Google engineer.","pitchSummary":"Patients are locked out of their own medical data. ForcepX gives patients ownership and control with cryptographic technology. We've proven demand with 500+ patients and 2 hospital pilots. With a world-class team, we're raising $500K to scale across West Africa."}`

### The JSON must have these exact keys:

- companyName
- tagline
- sector
- subSector
- businessModel
- problem
- solution
- competitiveAdvantage
- stage
- amountRaising
- useOfFunds
- country
- region
- expansionPlans
- revenue
- users
- growthRate
- traction
- teamSummary
- pitchSummary`
    }
    ];

    for (const file of files) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType || "application/pdf",
          data: file.base64,
        }
      });
    }

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
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
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
      return res.status(500).json({ error: "AI returned empty response. Try a different file." });
    }

    const parsed = extractJSON(text);

    if (!parsed) {
      try {
        const matches = text.match(/\{[^{]*\{[^}]*\}[^}]*\}/);
        if (matches) {
          const deepParsed = extractJSON(matches[0]);
          if (deepParsed) {
            return res.json({
              profile: deepParsed,
              success: true,
            });
          }
        }
      } catch (e) {
        console.log("Deep extraction failed:", e.message);
      }

      return res.status(500).json({
        error: "AI returned invalid JSON format. Please try again with fewer files or use manual input.",
        raw: text.substring(0, 500),
      });
    }

    return res.json({
      profile: parsed,
      success: true,
    });

  } catch (err) {
    console.error("Analysis error:", err.message);
    res.status(500).json({ error: "Analysis failed: " + err.message });
  }
}

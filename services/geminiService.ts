
import { GoogleGenAI } from "@google/genai";

const OPERATING_CHECKLIST = `
- Backlog Health: Prioritized, refined, actionable, clear BA vs PO ownership.
- Agile Roles: Strong PO-SM relationship, dev collaboration, early UX partnership.
- Prioritization: Force-rank (no ties), WSJF, Cost of Delay, Outcomes over Outputs.
- Customer Focus: User journey mapping, personas (Primary vs Anti-personas), empathy.
- Stories: INVEST principle, BDD (Given/When/Then), Definition of Ready (DoR), Definition of Done (DoD).
- Planning: Five levels (Vision, Roadmap, Release/PI, Sprint, Daily).
- Experiments: Discovery backlog, hypothesis statements, early validation (kill bad ideas).
- Metrics: Adoption, Lead Time, Cycle Time, CSAT, Flow Metrics, Value realization.
- Feedback: Fast loops (User/Team/Stakeholder), learning over perfection.
- Stakeholder Management: Transparent trade-offs, managing MVP expectations, saying "no" with data.
- Quality & Value: Outcome-driven, swarming to finish, technical debt visibility.
- Documentation: Lean, living docs (Vision, Goals, Epics, Decisions).
- Advanced: Managing uncertainty, risk-based ordering, scaling collaboration (SAFe/multi-team).
`;

export const generateProductGuide = async (domain: string, role: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Act as a World-Class Senior Product Coach. Generate a comprehensive "Operating Model" for a ${role} in the ${domain} domain.
    
    YOU MUST INTEGRATE ALL POINTS FROM THIS CHECKLIST:
    ${OPERATING_CHECKLIST}

    OUTPUT SECTIONS:
    1. ROLE DEFINITION: Strategic vs Tactical boundaries.
    2. DISCOVERY ENGINE: Running experiments and validating hypotheses in ${domain}.
    3. HIERARCHY & FLOW: From Vision to Story.
    4. QUALITY GATES: DoR and DoD benchmarks for ${domain} products.
    5. JIRA FIELD MANDATES: Essential fields to track value and flow.
    6. COACH'S EXAMPLES: Use :::EXAMPLE-START::: format to show ❌ Bad vs ✅ Good story/feature pairs for ${domain}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 30000 } }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Guide Error:", error);
    throw error;
  }
};

export const analyzeRFP = async (rfpText: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Analyze the following RFP/Requirement text as a Senior Business Analyst. 
    Focus on extracting critical intelligence for a Product Owner.

    REQUIRED OUTPUT:
    1. STRATEGIC OBJECTIVES: What is the customer really trying to achieve?
    2. NON-FUNCTIONAL REQUIREMENTS (NFRs): Specifically extract Security, Scalability, Performance, Compliance (e.g., GDPR, PCI-DSS), and Maintainability.
    3. MANDATORY CONSTRAINTS: Hard deadlines, budget caps, or specific technology stack requirements.
    4. RISKS & GAPS: What is missing or ambiguous in the request?
    
    RFP TEXT:
    ${rfpText}
  `;
  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: prompt 
    });
    return response.text;
  } catch (error) {
    console.error("RFP Analysis Error:", error);
    return "Failed to analyze RFP.";
  }
};

export const generateBAWBS = async (rfpText: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Act as a Senior Product Manager + Agile Coach + Delivery Estimation Expert.
    Transform the provided scope into a structured Delivery Backlog with PERT Estimations.

    REQUIREMENTS & DECOMPOSITION RULES:
    1. HIERARCHY: EPICS (Business Outcomes) -> FEATURES (PI/Release Capabilities) -> USER STORIES (Sprint-sized).
    2. USER STORIES: Use "As a... I want... So that..." format. Include 3-5 BDD Acceptance Criteria (Given/When/Then).
    3. PERT ESTIMATION TABLE: For EVERY story, provide:
       - Optimistic (O), Most Likely (M), Pessimistic (P).
       - Expected Value (E) = (O + 4M + P) / 6.
    4. AGGREGATION & FORECAST:
       - Aggregate story PERT values to Feature and Epic levels.
       - Provide a Delivery Forecast (estimated number of Sprints).
    5. RISK & VARIANCE ANALYSIS:
       - Highlight "High Variance" items (where P - O is large).
       - Suggest mitigation actions for these risks.
    6. PRIORITY: Assign MoSCoW (Must, Should, Could, Won't).

    SCOPE TEXT:
    ${rfpText}
  `;
  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-pro-preview", 
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 25000 } }
    });
    return response.text;
  } catch (error) {
    console.error("Decomposition Error:", error);
    return "Failed to generate decomposition.";
  }
};

export const generateMaturityAudit = async (domain: string, role: string, checkedItems: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Professional Audit: A ${role} in ${domain} claims proficiency in: [${checkedItems.join(", ")}].
    
    Compare this against the Master Product Checklist:
    ${OPERATING_CHECKLIST}

    AUDIT OUTPUT:
    1. MATURITY SCORE: A score from 1-10.
    2. CRITICAL GAPS: What missing skills pose the highest risk?
    3. 90-DAY GROWTH ROADMAP: Actionable steps to master the missing competencies.
    4. CASE STUDY: A brief scenario relevant to ${domain} where these skills make the difference.
  `;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });
    return response.text;
  } catch (error) {
    throw error;
  }
};

export const simulateExpertCritique = async (content: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Review this Agile Blueprint from 3 perspectives: 
    1. The Cynical Developer (Feasibility/Debt)
    2. The User-Obsessed Designer (UX/Accessibility)
    3. The Hard-Nosed Stakeholder (ROI/Business Value). 
    
    CONTENT: "${content.substring(0, 8000)}"`;
  const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
  return response.text;
};

export const refineBasedOnCritique = async (originalContent: string, critique: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Update the original Agile Blueprint by addressing all the criticisms provided. 
    CRITIQUE: ${critique} 
    ORIGINAL: ${originalContent}`;
  const response = await ai.models.generateContent({ model: "gemini-3-pro-preview", contents: prompt });
  return response.text;
};

export const chatWithCoach = async (history: any[], message: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = ai.chats.create({ model: 'gemini-3-flash-preview' });
  const response = await chat.sendMessage({ message });
  return response.text;
};

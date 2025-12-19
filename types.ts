
export type Domain = 'Banking' | 'Fintech' | 'E-commerce';
export type Role = 'Product Owner' | 'Business Analyst' | 'Product Manager';
export type Theme = 'neon' | 'art-fusion' | 'modern';

export type AppTab = 'guide' | 'chat' | 'rfp' | 'bawbs' | 'learning' | 'lab' | 'assessment';

export interface GuideState {
  isGenerating: boolean;
  content: string;
  domain: Domain;
  role: Role;
}

export interface LabState {
  isCritiquing: boolean;
  isRefining: boolean;
  critique: string;
  refinedContent: string;
}

export interface AssessmentState {
  isAnalyzing: boolean;
  selections: string[];
  results: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RFPState {
  isAnalyzing: boolean;
  rawText: string;
  analysisResult: string;
}

export interface BAWBSState {
  isGenerating: boolean;
  rfpText: string;
  result: string;
}

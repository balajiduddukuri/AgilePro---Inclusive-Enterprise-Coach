
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, MessageSquare, Settings, ChevronRight, CheckCircle2, 
  LayoutDashboard, ShieldCheck, TrendingUp, Loader2, FileSearch, 
  Target, Database, Award, BarChart4, Flag, Clock, Activity, FileText, Calculator, Zap, GraduationCap, Microscope, Sparkles, Clipboard, Check, User
} from 'lucide-react';
import { Domain, Role, Theme, GuideState, ChatMessage, AppTab, RFPState, BAWBSState, LabState, AssessmentState } from './types';
import { 
  generateProductGuide, chatWithCoach, analyzeRFP, 
  generateBAWBS, simulateExpertCritique, refineBasedOnCritique, generateMaturityAudit 
} from './services/geminiService';
import { marked } from 'marked';

// --- Enhanced RFP Samples ---
const RFP_SAMPLES = {
  Banking: `DOCUMENT: RETAIL CORE BANKING TRANSFORMATION (V1.2)
CLIENT: NEXUS GLOBAL BANK
OBJECTIVE: Replace legacy Cobol-based ledger with a cloud-native real-time engine.

FUNCTIONAL MANDATES:
- Real-time balances for 10M+ customers.
- Instant P2P internal transfers.
- Support for automated credit scoring via AI integration.

NFR CONSTRAINTS:
- Security: Must meet PCI-DSS Level 1 and SOC2 Type II.
- Availability: 99.999% (Five Nines).
- Performance: <50ms for ledger updates under peak load (50k TPS).
- Regulatory: Mandatory local data residency (Region: EU/GDPR).`,

  Fintech: `RFP: NEXT-GEN NEO-BANK CARD PLATFORM
CLIENT: SWIFTPAY TECHNOLOGIES
OBJECTIVE: Launch a virtual-first card issuance platform with real-time spend controls.

SCOPE:
- Instant virtual card generation (VISA/MC).
- Real-time geofencing and merchant-category blocking.
- Integrated crypto-to-fiat on-ramp for top-ups.

NFR CONSTRAINTS:
- Fraud Detection: Latency must be <15ms for transaction approvals.
- Scalability: Support flash-minting events (100k cards in 1 hour).
- Compliance: ISO 27001 and PSD2 Open Banking API mandates.`,

  "E-commerce": `PROJECT CHARTER: OMNI-CHANNEL PERSONALIZATION ENGINE
CLIENT: LUXURY-GLOBAL RETAIL
OBJECTIVE: Unify offline and online customer data for a 360-degree view and personalized rewards.

CORE REQUIREMENTS:
- Dynamic pricing engine based on inventory levels and user loyalty tier.
- Virtual Try-On AR integration for cosmetics/apparel.
- "One-Click" checkout with Apple Pay and Google Pay across all touchpoints.

NFR CONSTRAINTS:
- Accessibility: Must meet WCAG 2.1 Level AA.
- Mobile Perf: LCP (Largest Contentful Paint) < 1.5s on 3G networks.
- Privacy: GDPR Right to be Forgotten must be automated via API.`
};

const FULL_OPERATING_CHECKLIST = [
  { id: 'backlog', cat: 'Execution', text: 'Backlog Health & Ownership' },
  { id: 'roles', cat: 'People', text: 'Agile Roles & Collaboration' },
  { id: 'priority', cat: 'Strategy', text: 'Prioritization & Decision-Making' },
  { id: 'customer', cat: 'Discovery', text: 'Customer & User Focus' },
  { id: 'stories', cat: 'Execution', text: 'User Stories & Acceptance Criteria' },
  { id: 'planning', cat: 'Strategy', text: 'Agile Planning & Strategy' },
  { id: 'discovery', cat: 'Discovery', text: 'Experiments, Discovery & Learning' },
  { id: 'metrics', cat: 'Analysis', text: 'Metrics & Info Radiators' },
  { id: 'feedback', cat: 'Analysis', text: 'Feedback Loops & Continuous Improvement' },
  { id: 'stakeholder', cat: 'People', text: 'Stakeholder Management' },
  { id: 'quality', cat: 'Execution', text: 'Quality, Value & Outcome Focus' },
  { id: 'docs', cat: 'Execution', text: 'Documentation (Lean & Purposeful)' },
  { id: 'advanced', cat: 'Strategy', text: 'Advanced PO/BA Practices' },
];

const glossaryItems = [
  { term: 'PERT', icon: '⏱️', cat: 'Estimation', desc: 'Program Evaluation Review Technique. Calculates expected duration based on O, M, and P values.', tip: 'High variance (P-O) indicates risk.' },
  { term: 'NFR', icon: '🛡️', cat: 'Quality', desc: 'Non-Functional Requirements. Benchmarks for security, speed, and scale.', tip: 'Must be testable and measurable.' },
  { term: 'BDD', icon: '🥒', cat: 'Execution', desc: 'Behavior Driven Development. Uses Given/When/Then to bridge gaps between business and tech.', tip: 'Prevents requirement ambiguity.' },
  { term: 'INVEST', icon: '💎', cat: 'Execution', desc: 'Criteria for good User Stories: Independent, Negotiable, Valuable, Estimable, Small, Testable.', tip: 'Small stories flow faster.' },
  { term: 'WSJF', icon: '⚖️', cat: 'Prioritization', desc: 'Weighted Shortest Job First. Prioritizes items based on Cost of Delay / Job Size.', tip: 'Favors high-value, small items.' },
  { term: 'MoSCoW', icon: '🐮', cat: 'Prioritization', desc: 'Must have, Should have, Could have, Won\'t have.', tip: 'Use for MVP scoping.' },
];

const COMPREHENSIVE_GLOSSARY_MD = `
# Master Glossary for Product Leaders

## 🚀 Strategic Concepts
| Term | Detail | Focus |
| :--- | :--- | :--- |
| **PERT Table** | A table used to estimate work units with mathematical certainty using three-point estimates. | Estimation |
| **BDD (Behavior Driven Development)** | A software development process that encourages collaboration through Given/When/Then examples. | Quality |
| **NFR (Non-Functional Requirement)** | Systems attributes such as security, reliability, or performance. | Architecture |
| **Story Slicing** | Breaking large user behaviors into sprint-sized independent pieces. | Delivery |
`;

// --- Components ---

const NavItem: React.FC<{ 
  id: string, 
  activeId: string, 
  icon: any, 
  label: string, 
  onClick: (id: any) => void 
}> = ({ id, activeId, icon: Icon, label, onClick }) => (
  <button 
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-4 px-5 py-3 rounded-xl transition-all group relative ${
      activeId === id 
        ? 'bg-white/10 text-white shadow-inner' 
        : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon size={18} className={activeId === id ? 'text-[var(--brand-primary)]' : 'group-hover:text-[var(--brand-primary)]'} />
    <span className="font-semibold text-xs tracking-tight">{label}</span>
    {activeId === id && (
      <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] shadow-[0_0_8px_var(--brand-primary)]" />
    )}
  </button>
);

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const [html, setHtml] = useState('');
  useEffect(() => {
    const render = async () => {
      let processed = content;
      const exampleRegex = /:::EXAMPLE-START:::(.*?):::EXAMPLE-END:::/gs;
      processed = processed.replace(exampleRegex, (match, body) => {
        const pitfall = (body.match(/:::PITFALL:::(.*?)(\n|$)/) || [])[1] || '';
        const bad = (body.match(/:::BAD:::(.*?)(\n|$)/) || [])[1] || '';
        const correction = (body.match(/:::CORRECTION:::(.*?)(\n|$)/) || [])[1] || '';
        const insight = (body.match(/:::INSIGHT:::(.*?)(\n|$)/) || [])[1] || '';
        return `
          <div class="example-card border-l-4 border-[var(--brand-primary)] my-8 theme-card rounded-2xl overflow-hidden shadow-lg">
            <div class="p-4 bg-black/5 dark:bg-white/5 border-b border-[var(--card-border)] flex justify-between items-center">
              <span class="font-bold text-[10px] uppercase tracking-widest text-[var(--brand-primary)]">Coach Audit</span>
              <span class="px-2 py-0.5 rounded bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-[8px] font-black uppercase">Refined Artifact</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2">
              <div class="p-6 bg-red-500/10 border-r border-[var(--card-border)]">
                <p class="text-[10px] font-black text-red-500 uppercase mb-3">❌ Anti-Pattern</p>
                <div class="text-sm italic theme-text-secondary mb-3">${bad}</div>
                <p class="text-[9px] font-bold text-red-400 uppercase tracking-tighter">Pitfall: ${pitfall}</p>
              </div>
              <div class="p-6 bg-emerald-500/10">
                <p class="text-[10px] font-black text-emerald-500 uppercase mb-3">✅ Coach Correction</p>
                <div class="text-sm font-bold theme-text-main">${correction}</div>
              </div>
            </div>
            <div class="p-4 bg-blue-500/5 border-t border-[var(--card-border)] text-xs">
              <span class="font-black text-[var(--brand-primary)] mr-2 uppercase tracking-widest">Why it matters:</span> <span class="theme-text-secondary">${insight}</span>
            </div>
          </div>`;
      });
      const rawHtml = await marked.parse(processed);
      setHtml(rawHtml);
    };
    render();
  }, [content]);

  return <div className="markdown-content animate-in fade-in slide-in-from-top-4 duration-500" dangerouslySetInnerHTML={{ __html: html }} />;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('guide');
  const [theme, setTheme] = useState<Theme>('neon');
  const [guide, setGuide] = useState<GuideState>({ isGenerating: false, content: '', domain: 'Banking', role: 'Product Owner' });
  const [lab, setLab] = useState<LabState>({ isCritiquing: false, isRefining: false, critique: '', refinedContent: '' });
  const [assessment, setAssessment] = useState<AssessmentState>({ isAnalyzing: false, selections: [], results: '' });
  const [rfp, setRfp] = useState<RFPState>({ isAnalyzing: false, rawText: '', analysisResult: '' });
  const [bawbs, setBawbs] = useState<BAWBSState>({ isGenerating: false, rfpText: '', result: '' });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const audioContext = useRef<AudioContext | null>(null);

  useEffect(() => { document.body.setAttribute('data-theme', theme); }, [theme]);

  const playSfx = (type: 'click' | 'success') => {
    try {
      if (!audioContext.current) audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioContext.current.createOscillator();
      const gain = audioContext.current.createGain();
      osc.connect(gain); gain.connect(audioContext.current.destination);
      osc.frequency.setValueAtTime(type === 'click' ? 440 : 523.25, audioContext.current.currentTime);
      gain.gain.setValueAtTime(0.05, audioContext.current.currentTime);
      osc.start(); osc.stop(audioContext.current.currentTime + (type === 'click' ? 0.1 : 0.3));
    } catch (e) {}
  };

  const loadSample = (domain: keyof typeof RFP_SAMPLES, target: 'rfp' | 'bawbs') => {
    playSfx('click');
    if (target === 'rfp') setRfp(p => ({...p, rawText: RFP_SAMPLES[domain]}));
    else setBawbs(p => ({...p, rfpText: RFP_SAMPLES[domain]}));
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyingId(id);
      playSfx('success');
      setTimeout(() => setCopyingId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // --- Handlers ---

  const handleGenerateGuide = async () => {
    if (guide.isGenerating) return;
    setGuide(prev => ({ ...prev, isGenerating: true, content: '' }));
    playSfx('click');
    try {
      const res = await generateProductGuide(guide.domain, guide.role);
      setGuide(prev => ({ ...prev, isGenerating: false, content: res || '' }));
      playSfx('success');
    } catch (error) {
      console.error(error);
      setGuide(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const handleRunAudit = async () => {
    if (assessment.isAnalyzing || assessment.selections.length === 0) return;
    setAssessment(prev => ({ ...prev, isAnalyzing: true }));
    playSfx('click');
    try {
      const res = await generateMaturityAudit(guide.domain, guide.role, assessment.selections);
      setAssessment(prev => ({ ...prev, results: res || '', isAnalyzing: false }));
      playSfx('success');
    } catch (error) {
      console.error(error);
      setAssessment(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatting(true);
    playSfx('click');

    try {
      const response = await chatWithCoach(chatMessages, userMsg.content);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response || '' }]);
      playSfx('success');
    } catch (error) {
      console.error(error);
    } finally {
      setIsChatting(false);
    }
  };

  // Auto-critique in Lab when switched to via header button
  useEffect(() => {
    if (activeTab === 'lab' && guide.content && !lab.critique && !lab.isCritiquing) {
      const runCritique = async () => {
        setLab(p => ({ ...p, isCritiquing: true }));
        try {
          const res = await simulateExpertCritique(guide.content);
          setLab(p => ({ ...p, critique: res || '', isCritiquing: false }));
        } catch (e) {
          setLab(p => ({ ...p, isCritiquing: false }));
        }
      };
      runCritique();
    }
  }, [activeTab, guide.content, lab.critique, lab.isCritiquing]);

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-lg hover:bg-[var(--brand-primary)]/20 transition-all border border-[var(--brand-primary)]/20 shadow-sm"
      aria-label="Copy to clipboard"
    >
      {copyingId === id ? <Check size={14} className="text-emerald-500" /> : <Clipboard size={14} />}
      <span>{copyingId === id ? 'Copied!' : 'Copy for Jira/Confluence'}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden font-display">
      <aside className="w-full md:w-72 bg-[var(--bg-sidebar)] text-white flex flex-col flex-shrink-0 z-30 shadow-2xl border-r border-white/5">
        <div className="p-8 pb-4 flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] rounded-2xl shadow-lg ring-1 ring-white/20">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tighter text-white">AgilePro</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-0.5">Operating Engine</p>
            <div className="flex items-center gap-1.5 mt-2 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10">
              <User size={10} className="text-[var(--brand-primary)]" />
              <span className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-300">BalajiDuddukuri</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto custom-scrollbar">
          <NavItem id="guide" activeId={activeTab} icon={BookOpen} label="Strategy Hub" onClick={setActiveTab} />
          <NavItem id="assessment" activeId={activeTab} icon={Activity} label="Maturity Audit" onClick={setActiveTab} />
          <NavItem id="rfp" activeId={activeTab} icon={FileSearch} label="RFP Intel & NFRs" onClick={setActiveTab} />
          <NavItem id="bawbs" activeId={activeTab} icon={Calculator} label="PERT Architect" onClick={setActiveTab} />
          <NavItem id="lab" activeId={activeTab} icon={Microscope} label="Review Lab" onClick={setActiveTab} />
          <NavItem id="learning" activeId={activeTab} icon={GraduationCap} label="Knowledge Lab" onClick={setActiveTab} />
          <NavItem id="chat" activeId={activeTab} icon={MessageSquare} label="Consultation" onClick={setActiveTab} />
        </nav>

        <div className="p-6 mt-auto border-t border-white/5 bg-black/20">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2 block">Interface Theme</label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-xl">
            {['neon', 'art-fusion', 'modern'].map(t => (
              <button key={t} onClick={() => setTheme(t as Theme)} className={`py-2 rounded-lg text-[8px] font-bold uppercase ${theme === t ? 'bg-[var(--brand-primary)] text-white' : 'text-slate-500'}`}>{t.split('-')[0]}</button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen relative overflow-hidden bg-[var(--bg-main)]">
        <header className="h-16 bg-white/5 border-b border-[var(--card-border)] flex items-center justify-between px-8 flex-shrink-0 z-20 backdrop-blur-xl">
          <div className="flex items-center gap-3 text-[var(--text-muted)] text-xs font-black uppercase tracking-widest">
            <LayoutDashboard size={16} className="text-[var(--brand-primary)]" />
            <ChevronRight size={14} />
            <span className="theme-text-main">{activeTab.toUpperCase()}</span>
          </div>
          {activeTab === 'guide' && guide.content && (
            <button onClick={() => { playSfx('click'); setActiveTab('lab'); }} className="px-6 py-2 text-[10px] font-black uppercase bg-[var(--brand-secondary)] text-white rounded-full hover:opacity-90 shadow-xl transition-all">Audit Blueprint</button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 scroll-smooth">
          {activeTab === 'guide' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in">
              <section className="relative overflow-hidden rounded-[2.5rem] bg-[var(--bg-sidebar)] p-10 lg:p-16 text-white shadow-2xl">
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[var(--brand-primary)] text-[10px] font-black uppercase mb-6"><Sparkles size={12} /> Coach Insights</div>
                  <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6">Build the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]">Operating Model.</span></h2>
                  <p className="text-slate-400 text-lg mb-8 max-w-xl">Generate holistic Agile blueprints featuring BDD ACs, PERT estimations, and strict NFR extraction.</p>
                  <button onClick={handleGenerateGuide} disabled={guide.isGenerating} className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[var(--brand-primary)] hover:text-white transition-all">
                    {guide.isGenerating ? <Loader2 className="animate-spin" size={18} /> : "Generate Masterclass"}
                  </button>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="theme-card rounded-3xl p-8 border border-[var(--card-border)]">
                   <h3 className="text-[10px] font-black uppercase theme-text-muted mb-6 tracking-widest">Context Engine</h3>
                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase theme-text-muted">Target Domain</label>
                        <div className="flex flex-wrap gap-2">
                           {['Banking', 'Fintech', 'E-commerce'].map(d => (
                              <button key={d} onClick={() => setGuide(p => ({...p, domain: d as Domain}))} className={`px-4 py-2 rounded-xl border-2 text-[10px] font-black uppercase ${guide.domain === d ? 'border-[var(--brand-primary)] bg-[var(--selection-bg)]' : 'border-[var(--card-border)] theme-text-secondary opacity-60'}`}>{d}</button>
                           ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase theme-text-muted">Professional Role</label>
                        <div className="flex flex-wrap gap-2">
                           {['Product Owner', 'Business Analyst', 'Product Manager'].map(r => (
                              <button key={r} onClick={() => setGuide(p => ({...p, role: r as Role}))} className={`px-4 py-2 rounded-xl border-2 text-[10px] font-black uppercase ${guide.role === r ? 'border-[var(--brand-secondary)] bg-[var(--selection-bg)]' : 'border-[var(--card-border)] theme-text-secondary opacity-60'}`}>{r}</button>
                           ))}
                        </div>
                      </div>
                   </div>
                </section>
                <section className="theme-card rounded-3xl p-8 border border-[var(--card-border)] flex flex-col justify-center items-center text-center">
                   <Zap size={32} className="text-[var(--brand-primary)] mb-4" />
                   <h3 className="text-sm font-black uppercase tracking-widest theme-text-main mb-2">Automated Quality</h3>
                   <p className="text-xs theme-text-secondary leading-relaxed">AI analyzes 50+ checkpoints from the Operating Checklist to build your strategy.</p>
                </section>
              </div>

              {guide.content && (
                <div className="theme-card p-10 lg:p-16 rounded-[3rem] shadow-2xl border border-[var(--card-border)] relative group">
                  <div className="absolute right-10 top-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={guide.content} id="guide" />
                  </div>
                  <MarkdownRenderer content={guide.content} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'assessment' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in">
               <section className="theme-card rounded-[3rem] p-10 lg:p-14 border border-[var(--card-border)] shadow-xl">
                  <div className="flex items-center gap-6 mb-12">
                    <div className="p-4 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-3xl"><Activity size={32} /></div>
                    <div><h2 className="text-3xl font-black theme-text-main uppercase">Maturity Audit</h2><p className="theme-text-secondary text-sm">Gap analysis against the Product Operating Model.</p></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                     {FULL_OPERATING_CHECKLIST.map(item => (
                        <button key={item.id} onClick={() => setAssessment(prev => ({...prev, selections: prev.selections.includes(item.id) ? prev.selections.filter(i => i !== item.id) : [...prev.selections, item.id]}))} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${assessment.selections.includes(item.id) ? 'border-emerald-500 bg-emerald-500/5' : 'border-[var(--card-border)]'}`}>
                           <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${assessment.selections.includes(item.id) ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--text-muted)]'}`}>{assessment.selections.includes(item.id) && <CheckCircle2 size={14} className="text-white" />}</div>
                           <div className="text-left"><span className="text-[9px] font-black uppercase text-slate-400 block">{item.cat}</span><span className="text-sm font-bold theme-text-main">{item.text}</span></div>
                        </button>
                     ))}
                  </div>
                  <button onClick={handleRunAudit} disabled={assessment.isAnalyzing || assessment.selections.length === 0} className="w-full py-5 bg-[var(--bg-sidebar)] text-white rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center gap-3">
                    {assessment.isAnalyzing ? <Loader2 className="animate-spin" /> : "Run Professional Gap Analysis"}
                  </button>
               </section>
               {assessment.results && (
                 <div className="theme-card p-10 lg:p-16 rounded-[3rem] shadow-2xl relative group border border-[var(--card-border)]">
                    <div className="absolute right-10 top-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyButton text={assessment.results} id="assessment" />
                    </div>
                    <MarkdownRenderer content={assessment.results} />
                 </div>
               )}
            </div>
          )}

          {activeTab === 'rfp' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in">
              <section className="theme-card rounded-[3rem] p-10 lg:p-14 border border-[var(--card-border)] shadow-xl">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl"><FileSearch size={24} /></div>
                      <h2 className="text-2xl font-black theme-text-main uppercase">RFP Intelligence & NFRs</h2>
                    </div>
                    <div className="flex gap-2">
                      {['Banking', 'Fintech', 'E-commerce'].map(d => (
                        <button key={d} onClick={() => loadSample(d as any, 'rfp')} className="px-3 py-1 text-[8px] font-black uppercase border border-[var(--card-border)] rounded-lg hover:bg-[var(--brand-primary)] hover:text-white transition-all">{d}</button>
                      ))}
                    </div>
                 </div>
                 <textarea value={rfp.rawText} onChange={e => setRfp(p => ({...p, rawText: e.target.value}))} className="w-full h-64 p-6 rounded-2xl theme-bg-input theme-text-main text-sm focus:ring-2 ring-cyan-500 outline-none resize-none mb-6 placeholder:opacity-30" placeholder="Paste RFP/Requirement text..." />
                 <button onClick={async () => { setRfp(p => ({...p, isAnalyzing: true})); const res = await analyzeRFP(rfp.rawText); setRfp(p => ({...p, analysisResult: res || '', isAnalyzing: false})); playSfx('success'); }} disabled={rfp.isAnalyzing || !rfp.rawText.trim()} className="w-full py-5 bg-cyan-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center gap-3">
                   {rfp.isAnalyzing ? <Loader2 className="animate-spin" /> : <>Extract Intelligence & NFRs <FileText size={16}/></>}
                 </button>
              </section>
              {rfp.analysisResult && (
                <div className="theme-card p-10 lg:p-14 rounded-[3rem] shadow-2xl border border-[var(--card-border)] relative group">
                  <div className="absolute right-10 top-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={rfp.analysisResult} id="rfp" />
                  </div>
                  <MarkdownRenderer content={rfp.analysisResult} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'bawbs' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in">
              <section className="theme-card rounded-[3rem] p-10 lg:p-14 border border-[var(--card-border)] shadow-xl">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl"><Calculator size={24} /></div>
                      <h2 className="text-2xl font-black theme-text-main uppercase">PERT Architect</h2>
                    </div>
                    <div className="flex gap-2">
                      {['Banking', 'Fintech', 'E-commerce'].map(d => (
                        <button key={d} onClick={() => loadSample(d as any, 'bawbs')} className="px-3 py-1 text-[8px] font-black uppercase border border-[var(--card-border)] rounded-lg hover:bg-[var(--brand-primary)] hover:text-white transition-all">{d}</button>
                      ))}
                    </div>
                 </div>
                 <textarea value={bawbs.rfpText} onChange={e => setBawbs(p => ({...p, rfpText: e.target.value}))} className="w-full h-64 p-6 rounded-2xl theme-bg-input theme-text-main text-sm focus:ring-2 ring-indigo-500 outline-none resize-none mb-6 placeholder:opacity-30" placeholder="Paste scope for Epic -> Feature -> Story breakup..." />
                 <button onClick={async () => { setBawbs(p => ({...p, isGenerating: true})); const res = await generateBAWBS(bawbs.rfpText); setBawbs(p => ({...p, result: res || '', isGenerating: false})); playSfx('success'); }} disabled={bawbs.isGenerating || !bawbs.rfpText.trim()} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center gap-3">
                   {bawbs.isGenerating ? <Loader2 className="animate-spin" /> : <>Breakdown & PERT Estimation <TrendingUp size={16}/></>}
                 </button>
              </section>
              {bawbs.result && (
                <div className="theme-card p-10 lg:p-14 rounded-[3rem] shadow-2xl overflow-x-auto border border-[var(--card-border)] relative group">
                  <div className="absolute right-10 top-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={bawbs.result} id="bawbs" />
                  </div>
                  <MarkdownRenderer content={bawbs.result} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'lab' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in">
              <section className="theme-card rounded-[3rem] p-10 lg:p-14 border border-[var(--card-border)] shadow-xl relative group">
                 <div className="flex items-center gap-6 mb-12">
                   <div className="p-4 bg-amber-500/10 text-amber-500 rounded-3xl"><Microscope size={32} /></div>
                   <div><h2 className="text-3xl font-black theme-text-main uppercase">Review Lab</h2><p className="theme-text-secondary text-sm">Expert critique from Developer, Designer, and Stakeholder personas.</p></div>
                 </div>
                 {lab.critique && !lab.isCritiquing && (
                   <div className="absolute right-10 top-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyButton text={lab.critique} id="lab" />
                   </div>
                 )}
                 {lab.isCritiquing ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-[var(--brand-primary)]" /></div> : <MarkdownRenderer content={lab.critique || "Load a Blueprint to initiate an expert review session."} />}
              </section>
            </div>
          )}

          {activeTab === 'learning' && (
            <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in">
              <section className="theme-card rounded-[3rem] p-10 lg:p-16 border border-[var(--card-border)] shadow-sm">
                <div className="flex items-center gap-6 mb-16">
                  <div className="p-5 bg-[var(--brand-secondary)]/10 text-[var(--brand-secondary)] rounded-3xl"><GraduationCap size={44} /></div>
                  <div><h2 className="text-4xl font-black theme-text-main tracking-tighter">Knowledge Lab</h2><p className="theme-text-secondary text-lg">Master the artifacts of enterprise product delivery.</p></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                   {glossaryItems.map((item, idx) => (
                      <div key={idx} className="theme-card p-8 rounded-[2rem] hover:border-[var(--brand-primary)] transition-all">
                        <div className="flex items-center gap-3 mb-6"><span className="text-3xl">{item.icon}</span><span className="text-[9px] font-black uppercase theme-text-muted tracking-widest bg-[var(--input-bg)] px-2 py-1 rounded">{item.cat}</span></div>
                        <h3 className="text-xl font-black theme-text-main mb-3">{item.term}</h3>
                        <p className="text-sm theme-text-secondary leading-relaxed mb-8">{item.desc}</p>
                        <div className="pt-5 border-t border-[var(--card-border)] flex items-center gap-3"><Zap size={14} className="text-amber-500" /><span className="text-[10px] font-bold theme-text-muted italic">Coach: {item.tip}</span></div>
                      </div>
                   ))}
                </div>
              </section>
              <section className="bg-[var(--bg-sidebar)] p-12 lg:p-20 rounded-[4rem] text-white shadow-2xl relative group">
                 <div className="absolute right-10 top-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={COMPREHENSIVE_GLOSSARY_MD} id="glossary" />
                 </div>
                 <div className="prose prose-invert max-w-none"><MarkdownRenderer content={COMPREHENSIVE_GLOSSARY_MD} /></div>
              </section>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col animate-in fade-in">
              <div className="flex-1 overflow-y-auto space-y-6 mb-8 pr-4 custom-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 theme-text-muted opacity-50"><MessageSquare size={64} className="mb-6" /><h3 className="text-2xl font-black theme-text-main uppercase italic">Coach Consultation</h3><p className="text-sm max-w-sm">Ask about Agile scaling, PI planning readiness, or NFR validation strategies.</p></div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                         <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-[10px] ${msg.role === 'user' ? 'bg-[var(--card-border)]' : 'bg-[var(--brand-primary)] text-white shadow-lg'}`}>{msg.role === 'user' ? 'ME' : 'PRO'}</div>
                         <div className={`p-5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[var(--brand-secondary)] text-white' : 'theme-card border-[var(--card-border)]'}`}>{msg.content}</div>
                      </div>
                    </div>
                  ))
                )}
                {isChatting && <div className="flex gap-2 p-4 theme-text-muted italic text-xs animate-pulse"><Loader2 size={14} className="animate-spin" /> Analyzing strategy...</div>}
              </div>
              <form onSubmit={handleSendMessage} className="relative">
                {/* Fix: Wrap state update in an arrow function to correctly extract value from ChangeEvent */}
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask your coach anything..." className="w-full p-6 pr-20 rounded-3xl theme-bg-input border border-[var(--card-border)] theme-text-main text-sm focus:ring-4 ring-[var(--brand-primary)]/20 shadow-2xl outline-none" />
                <button type="submit" disabled={!chatInput.trim() || isChatting} className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-[var(--brand-primary)] text-white rounded-2xl shadow-lg hover:opacity-90 active:scale-95 transition-all"><ChevronRight size={20} /></button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

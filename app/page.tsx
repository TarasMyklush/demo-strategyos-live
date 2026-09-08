"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Scenario = string;
type Stage = "intake" | "building" | "studio";
type StudioView = "logic" | "configure";
type AgentChannel = "Inbound phone" | "Outbound phone" | "Website voice + text" | "Combination";
type VoiceGender = "Female" | "Male";
type PrimaryUseCase = "Answer incoming calls" | "Support customers" | "Qualify leads" | "Follow up and sell" | "Help website visitors" | "Help me choose";
type Notice = { kind: "success" | "info" | "error"; message: string };
type FlowKind = "entry" | "route" | "fallback";

type FlowNode = {
  id: string;
  kind: FlowKind;
  title: string;
  condition: string;
  action: string;
  test_utterance: string;
  icon: string;
};

type LiveMessage = { role: "user" | "assistant"; content: string };
type KnowledgeDocument = { name: string; text: string; status: string; characters?: number };

type GeneratedAgent = {
  agent_name: string;
  summary: string;
  opening_line: string;
  assumptions: string[];
  flow?: Array<Omit<FlowNode, "icon">>;
  source?: { url?: string; title?: string; excerpt?: string; read_at?: string };
};

type AgentConfig = {
  version: 1;
  owner: { name: string; email: string; phone: string };
  business: Business;
  companyName: string;
  websiteUrl: string;
  websiteKnowledge: string;
  websiteReadAt: string;
  companyDescription: string;
  additionalKnowledge: string;
  knowledgeDocuments: KnowledgeDocument[];
  primaryUseCase: PrimaryUseCase;
  agentChannel: AgentChannel;
  agentSubtype: string;
  optionalFeatures: string[];
  customFlows: string;
  languages: string[];
  primaryLanguage: string;
  otherLanguage: string;
  voiceGender: VoiceGender;
  voicePersona: string;
  avatarChoice: number;
  selectedVoiceURI: string;
  agentName: string;
  agentSummary: string;
  openingLine: string;
  assumptions: string[];
  flowNodes: FlowNode[];
  protectedRouteIds: string[];
  liveMessages: LiveMessage[];
};

type RecognitionResultLike = { isFinal: boolean; [index: number]: { transcript: string } };
type RecognitionEventLike = { resultIndex: number; results: { length: number; [index: number]: RecognitionResultLike } };
type RecognitionErrorLike = { error: string; message?: string };
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type Business = {
  brief: string;
  host: string;
  url: string;
  name: string;
  outcome: string;
};

const examples = [
  "spsoft.com — qualify inbound leads and book a discovery call",
  "nextlevel.ai — answer product questions and book a demo",
  "uxe.ai — explain the security offering and qualify partner conversations",
];

const buildSteps = [
  { title: "Reading the business", detail: "Mapping offers, language and customer intent" },
  { title: "Designing the conversation", detail: "Creating the opening, questions and boundaries" },
  { title: "Preparing actions", detail: "Drafting qualification, booking and handoff behavior" },
  { title: "Opening the test studio", detail: "Your first version is ready to challenge" },
];

const studioApi = "/api/agent";
const flowIcons: Record<FlowKind, string> = { entry: "ϟ", route: "↳", fallback: "⇢" };

const channelOptions: Array<{ name: AgentChannel; detail: string }> = [
  { name: "Inbound phone", detail: "Answer, qualify, book and escalate" },
  { name: "Outbound phone", detail: "Call leads, follow up and sell" },
  { name: "Website voice + text", detail: "Voice and chat widget for your site" },
  { name: "Combination", detail: "Multiple channels with shared memory" },
];

const primaryUseCaseOptions: Array<{ name: PrimaryUseCase; detail: string }> = [
  { name: "Answer incoming calls", detail: "Answer questions, capture details and route requests" },
  { name: "Support customers", detail: "Resolve routine issues and escalate safely" },
  { name: "Qualify leads", detail: "Discover needs and identify sales-ready conversations" },
  { name: "Follow up and sell", detail: "Re-engage leads and move opportunities forward" },
  { name: "Help website visitors", detail: "Guide visitors by voice or text and capture enquiries" },
  { name: "Help me choose", detail: "Let the AI recommend the best setup from your outcome" },
];

const languageOptions = ["English", "Español", "Français", "Deutsch", "Italiano", "Português", "中文", "日本語", "한국어", "हिन्दी", "العربية (MSA)", "العربية · Gulf", "العربية · Najdi", "Русский", "Türkçe", "Other"];
const languageLocales: Record<string, string> = {
  English: "en-US", Español: "es-ES", Français: "fr-FR", Deutsch: "de-DE", Italiano: "it-IT", Português: "pt-BR",
  中文: "zh-CN", 日本語: "ja-JP", 한국어: "ko-KR", हिन्दी: "hi-IN", "العربية (MSA)": "ar-SA", "العربية · Gulf": "ar-AE",
  "العربية · Najdi": "ar-SA", Русский: "ru-RU", Türkçe: "tr-TR",
};
const voicePersonas: Record<VoiceGender, Array<{ name: string; tone: string }>> = {
  Female: [
    { name: "Sara", tone: "Warm, professional · Gulf-tuned" },
    { name: "Yasmin", tone: "Crisp, clear · Najdi-tuned" },
    { name: "Jessica", tone: "Friendly, energetic · Generic" },
    { name: "Aria", tone: "Composed, formal · Generic" },
    { name: "Layla", tone: "Calm, conversational · Generic" },
  ],
  Male: [
    { name: "Khalid", tone: "Authoritative · Gulf-tuned" },
    { name: "Rashid", tone: "Reassuring · Najdi-tuned" },
    { name: "Marcus", tone: "Crisp, sales-trained · Generic" },
    { name: "Daniel", tone: "Calm, support-trained · Generic" },
    { name: "Omar", tone: "Friendly, conversational · Generic" },
  ],
};

const avatarOptions: Record<VoiceGender, Array<{ src: string; label: string }>> = {
  Female: [
    { src: "/agents/professional-woman-1.webp", label: "Female avatar 1" },
    { src: "/agents/professional-woman-2.webp", label: "Female avatar 2" },
    { src: "/agents/professional-woman-3.webp", label: "Female avatar 3" },
    { src: "/agents/professional-woman-4.webp", label: "Female avatar 4" },
    { src: "/agents/professional-woman-5.webp", label: "Female avatar 5" },
    { src: "/agents/jessica-hero.webp", label: "Female avatar 6" },
    { src: "/agents/bant-qualifier.webp", label: "Female avatar 7" },
    { src: "/agents/claims-manager.webp", label: "Female avatar 8" },
  ],
  Male: [
    { src: "/agents/professional-man-1.webp", label: "Male avatar 1" },
    { src: "/agents/professional-man-2.webp", label: "Male avatar 2" },
    { src: "/agents/customer-support.webp", label: "Male avatar 3" },
    { src: "/agents/table-of-benefits.webp", label: "Male avatar 4" },
  ],
};

function subtypesFor(channel: AgentChannel) {
  if (channel === "Outbound phone") return ["Lead qualification", "Outbound sales"];
  if (channel === "Combination") return ["Multichannel orchestration"];
  return ["Q&A", "Customer support", "Receptionist + sales", "Lead qualification"];
}

function makeFlow(business: Business): FlowNode[] {
  return [
    { id: "incoming", kind: "entry", title: "Incoming conversation", condition: "", action: "Greet the customer and ask what they want to accomplish.", test_utterance: "Hello, can you help me?", icon: "ϟ" },
    { id: "business-question", kind: "route", title: "Business question", condition: `Customer asks about ${business.name}`, action: `Answer only from approved knowledge at ${business.host}.`, test_utterance: "What can your company help me with?", icon: "↳" },
    { id: "desired-outcome", kind: "route", title: "Ready for the next step", condition: `Customer shows intent to ${business.outcome}`, action: "Qualify the request and move it to the agreed next step.", test_utterance: "I am interested. What is the next step?", icon: "↳" },
    { id: "existing-customer", kind: "route", title: "Existing customer", condition: "Customer needs help with an existing relationship", action: "Collect the essential context and route it to the right owner.", test_utterance: "I am already a customer and need help.", icon: "↳" },
    { id: "safe-handoff", kind: "fallback", title: "Uncertain or sensitive request", condition: "No route safely matches, facts are missing, or a person is requested", action: "Explain the limit, capture context, and offer a human handoff.", test_utterance: "I need to speak with a person about something unusual.", icon: "⇢" },
  ];
}

function parseBusiness(brief: string): Business {
  const match = brief.match(/(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s—–,]*)?/i);
  let host = "yourcompany.com";
  let url = "https://yourcompany.com";

  if (match) {
    try {
      const parsed = new URL(match[0].startsWith("http") ? match[0] : `https://${match[0]}`);
      host = parsed.hostname.replace(/^www\./, "");
      url = parsed.origin;
    } catch {
      host = match[0].replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      url = `https://${host}`;
    }
  }

  const rawName = host === "yourcompany.com" ? "Your business" : host.split(".")[0];
  const name = rawName
    .split(/[-_]/)
    .map((word) => word.length <= 2 ? word.toUpperCase() : `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ");
  const outcome = (match ? brief.replace(match[0], "") : brief)
    .replace(/^[\s—–:,-]+/, "")
    .trim() || "handle inbound conversations and move each customer to the right next step";

  return { brief, host, url, name, outcome };
}

function configurationFingerprint(input: {
  websiteUrl: string;
  outcome: string;
  primaryUseCase: PrimaryUseCase;
  agentChannel: AgentChannel;
  agentSubtype: string;
  companyDescription: string;
  additionalKnowledge: string;
  knowledgeDocuments: KnowledgeDocument[];
  optionalFeatures: string[];
  customFlows: string;
}) {
  return JSON.stringify({
    websiteUrl: input.websiteUrl.trim(), outcome: input.outcome.trim(), primaryUseCase: input.primaryUseCase,
    agentChannel: input.agentChannel, agentSubtype: input.agentSubtype, companyDescription: input.companyDescription.trim(),
    additionalKnowledge: input.additionalKnowledge.trim(), documents: input.knowledgeDocuments.map((document) => [document.name, document.text.length]),
    optionalFeatures: input.optionalFeatures, customFlows: input.customFlows.trim(),
  });
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("intake");
  const [brief, setBrief] = useState("");
  const [business, setBusiness] = useState<Business>(() => parseBusiness("nextlevel.ai — qualify inbound leads and book a consultation"));
  const [buildStep, setBuildStep] = useState(0);
  const [calling, setCalling] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [scenario, setScenario] = useState<Scenario>("opening");
  const [updates, setUpdates] = useState<string[]>([]);
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>(() => makeFlow(parseBusiness("nextlevel.ai — qualify inbound leads and book a consultation")));
  const [selectedNodeId, setSelectedNodeId] = useState("business-question");
  const [nodeTitleDraft, setNodeTitleDraft] = useState("Business question");
  const [nodeConditionDraft, setNodeConditionDraft] = useState("Customer asks about the business");
  const [nodeActionDraft, setNodeActionDraft] = useState("Answer only from approved knowledge.");
  const [nodeTestDraft, setNodeTestDraft] = useState("What can your company help me with?");
  const [activeNodeId, setActiveNodeId] = useState("");
  const [activeDecision, setActiveDecision] = useState("");
  const [agentName, setAgentName] = useState("Sara");
  const [agentSummary, setAgentSummary] = useState("");
  const [openingLine, setOpeningLine] = useState("Hello, how can I help today?");
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [generationError, setGenerationError] = useState("");
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [handoffQueued, setHandoffQueued] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [micSupported, setMicSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const callingRef = useRef(false);
  const customRouteCounterRef = useRef(1);
  const noticeTimerRef = useRef<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showLaunch, setShowLaunch] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [studioView, setStudioView] = useState<StudioView>("logic");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteKnowledge, setWebsiteKnowledge] = useState("");
  const [websiteReadAt, setWebsiteReadAt] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [additionalKnowledge, setAdditionalKnowledge] = useState("");
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocument[]>([]);
  const [knowledgeBusy, setKnowledgeBusy] = useState(false);
  const [primaryUseCase, setPrimaryUseCase] = useState<PrimaryUseCase>("Help me choose");
  const [agentChannel, setAgentChannel] = useState<AgentChannel>("Inbound phone");
  const [agentSubtype, setAgentSubtype] = useState("Receptionist + sales");
  const [optionalFeatures, setOptionalFeatures] = useState<string[]>(["Email orders to your inbox"]);
  const [customFlows, setCustomFlows] = useState("");
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [primaryLanguage, setPrimaryLanguage] = useState("English");
  const [otherLanguage, setOtherLanguage] = useState("");
  const [voiceGender, setVoiceGender] = useState<VoiceGender>("Female");
  const [voicePersona, setVoicePersona] = useState("Sara");
  const [avatarChoice, setAvatarChoice] = useState(1);
  const [protectedRouteIds, setProtectedRouteIds] = useState<string[]>([]);
  const [agentId, setAgentId] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [lastStructuralFingerprint, setLastStructuralFingerprint] = useState("");

  useEffect(() => {
    const requestedId = new URLSearchParams(window.location.search).get("agent");
    if (!requestedId) return;
    void fetch(`${studioApi}/load?id=${encodeURIComponent(requestedId)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || "The saved agent could not be loaded.");
        const config = payload.config as Partial<AgentConfig>;
        if (!config.business || !Array.isArray(config.flowNodes) || config.flowNodes.length < 5) throw new Error("The saved agent is incomplete.");
        const loadedFlow = config.flowNodes.map((node) => ({ ...node, icon: flowIcons[node.kind] || "✦" }));
        const firstRoute = loadedFlow.find((node) => node.kind === "route") || loadedFlow[0];
        setBusiness(config.business);
        setBrief(config.business.brief || `${config.websiteUrl || config.business.url} — ${config.business.outcome}`);
        setOwnerName(config.owner?.name || "");
        setOwnerEmail(config.owner?.email || "");
        setOwnerPhone(config.owner?.phone || "");
        setCompanyName(config.companyName || config.business.name);
        setWebsiteUrl(config.websiteUrl || config.business.url);
        setWebsiteKnowledge(config.websiteKnowledge || "");
        setWebsiteReadAt(config.websiteReadAt || "");
        setCompanyDescription(config.companyDescription || "");
        setAdditionalKnowledge(config.additionalKnowledge || "");
        setKnowledgeDocuments(config.knowledgeDocuments || []);
        setPrimaryUseCase(config.primaryUseCase || "Help me choose");
        setAgentChannel(config.agentChannel || "Inbound phone");
        setAgentSubtype(config.agentSubtype || "Receptionist + sales");
        setOptionalFeatures(config.optionalFeatures || []);
        setCustomFlows(config.customFlows || "");
        setLanguages(config.languages?.length ? config.languages : ["English"]);
        setPrimaryLanguage(config.primaryLanguage || config.languages?.[0] || "English");
        setOtherLanguage(config.otherLanguage || "");
        setVoiceGender(config.voiceGender || "Female");
        setVoicePersona(config.voicePersona || "Sara");
        setAvatarChoice(config.avatarChoice || 1);
        setSelectedVoiceURI(config.selectedVoiceURI || "");
        setAgentName(config.agentName || "Sara");
        setAgentSummary(config.agentSummary || "");
        setOpeningLine(config.openingLine || "Hello, how can I help today?");
        setAssumptions(config.assumptions || []);
        setFlowNodes(loadedFlow);
        setProtectedRouteIds(config.protectedRouteIds || []);
        setLiveMessages(config.liveMessages || []);
        setSelectedNodeId(firstRoute.id);
        setNodeTitleDraft(firstRoute.title);
        setNodeConditionDraft(firstRoute.condition);
        setNodeActionDraft(firstRoute.action);
        setNodeTestDraft(firstRoute.test_utterance);
        setAgentId(payload.id || requestedId);
        setSavedAt(payload.saved_at || "");
        setLastStructuralFingerprint(configurationFingerprint({
          websiteUrl: config.websiteUrl || config.business.url,
          outcome: config.business.outcome,
          primaryUseCase: config.primaryUseCase || "Help me choose",
          agentChannel: config.agentChannel || "Inbound phone",
          agentSubtype: config.agentSubtype || "Receptionist + sales",
          companyDescription: config.companyDescription || "",
          additionalKnowledge: config.additionalKnowledge || "",
          knowledgeDocuments: config.knowledgeDocuments || [],
          optionalFeatures: config.optionalFeatures || [],
          customFlows: config.customFlows || "",
        }));
        setStage("studio");
        setStudioView("logic");
        setNotice({ kind: "success", message: "Saved agent restored." });
      })
      .catch((error) => setNotice({ kind: "error", message: error instanceof Error ? error.message : "The saved agent could not be loaded." }));
  }, []);

  useEffect(() => {
    if (stage !== "building") return;
    const timers = [
      window.setTimeout(() => setBuildStep(1), 800),
      window.setTimeout(() => setBuildStep(2), 1600),
      window.setTimeout(() => setBuildStep(3), 2400),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [stage]);

  useEffect(() => {
    callingRef.current = calling;
    if (!calling) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [calling]);

  useEffect(() => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const capabilityCheck = window.requestAnimationFrame(() => {
      setMicSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
    });
    return () => {
      window.cancelAnimationFrame(capabilityCheck);
      recognitionRef.current?.abort();
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      setSelectedVoiceURI((current) => {
        if (current && voices.some((voice) => voice.voiceURI === current)) return current;
        const saved = window.localStorage.getItem("strategyos-voice") || "";
        if (saved && voices.some((voice) => voice.voiceURI === saved)) return saved;
        return voices.find((voice) => /^en[-_]/i.test(voice.lang))?.voiceURI || voices[0]?.voiceURI || "";
      });
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const callTime = useMemo(() => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remaining = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remaining}`;
  }, [seconds]);

  const activeLanguages = useMemo(() => {
    const ordered = languages.includes(primaryLanguage) ? [primaryLanguage, ...languages.filter((language) => language !== primaryLanguage)] : languages;
    return ordered.map((language) => language === "Other" ? otherLanguage.trim() || "Other" : language);
  }, [languages, primaryLanguage, otherLanguage]);
  const approvedKnowledge = useMemo(() => [
    websiteKnowledge ? `[Website snapshot: ${websiteUrl}]\n${websiteKnowledge}` : "",
    companyDescription ? `[Company description]\n${companyDescription}` : "",
    additionalKnowledge ? `[Additional approved knowledge]\n${additionalKnowledge}` : "",
    ...knowledgeDocuments.filter((document) => document.text).map((document) => `[${document.name}]\n${document.text}`),
  ].filter(Boolean).join("\n\n").slice(0, 22000), [websiteKnowledge, websiteUrl, companyDescription, additionalKnowledge, knowledgeDocuments]);
  const configuredContext = useMemo(() => [
    `Primary outcome: ${business.outcome}`,
    `Primary use case: ${primaryUseCase}`,
    `Agent channel: ${agentChannel}`,
    `Agent role: ${agentSubtype}`,
    `Languages: ${activeLanguages.join(", ")}`,
    `Persona: ${voicePersona} (${voiceGender})`,
    companyDescription ? `Company description: ${companyDescription}` : "",
    additionalKnowledge ? `Additional approved knowledge: ${additionalKnowledge}` : "",
    optionalFeatures.length ? `Enabled features: ${optionalFeatures.join(", ")}` : "",
    customFlows ? `Conversation rules: ${customFlows}` : "",
  ].filter(Boolean).join("\n"), [business.outcome, primaryUseCase, agentChannel, agentSubtype, activeLanguages, voicePersona, voiceGender, companyDescription, additionalKnowledge, optionalFeatures, customFlows]);
  const structuralFingerprint = useMemo(() => configurationFingerprint({
    websiteUrl, outcome: business.outcome, primaryUseCase, agentChannel, agentSubtype, companyDescription,
    additionalKnowledge, knowledgeDocuments, optionalFeatures, customFlows,
  }), [websiteUrl, business.outcome, primaryUseCase, agentChannel, agentSubtype, companyDescription, additionalKnowledge, knowledgeDocuments, optionalFeatures, customFlows]);

  const compatibleFeatureOptions = agentSubtype === "Customer support"
    ? ["Escalate to human operator"]
    : agentSubtype === "Receptionist + sales"
      ? ["Email orders to your inbox"]
      : [];

  const selectedAvatar = avatarOptions[voiceGender][avatarChoice - 1] || avatarOptions[voiceGender][0];
  const selectedNode = flowNodes.find((node) => node.id === selectedNodeId);
  const activeNode = flowNodes.find((node) => node.id === activeNodeId);
  const routeNodes = flowNodes.filter((node) => node.kind === "route");
  const nodeHasChanges = Boolean(nodeTitleDraft.trim() && nodeActionDraft.trim()) && Boolean(selectedNode) && (
    nodeTitleDraft.trim() !== selectedNode.title
    || nodeConditionDraft.trim() !== selectedNode.condition
    || nodeActionDraft.trim() !== selectedNode.action
    || nodeTestDraft.trim() !== selectedNode.test_utterance
  );

  function showNotice(message: string, kind: Notice["kind"] = "success") {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    setNotice({ message, kind });
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2800);
  }

  function buildConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
    return {
      version: 1,
      owner: { name: ownerName.trim(), email: ownerEmail.trim(), phone: ownerPhone.trim() },
      business,
      companyName: companyName.trim() || business.name,
      websiteUrl: websiteUrl.trim() || business.url,
      websiteKnowledge,
      websiteReadAt,
      companyDescription,
      additionalKnowledge,
      knowledgeDocuments,
      primaryUseCase,
      agentChannel,
      agentSubtype,
      optionalFeatures,
      customFlows,
      languages,
      primaryLanguage,
      otherLanguage,
      voiceGender,
      voicePersona,
      avatarChoice,
      selectedVoiceURI,
      agentName,
      agentSummary,
      openingLine,
      assumptions,
      flowNodes,
      protectedRouteIds,
      liveMessages: liveMessages.slice(-20),
      ...overrides,
    };
  }

  async function persistConfig(config: AgentConfig, announce = true) {
    setSaving(true);
    try {
      const response = await fetch(`${studioApi}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agentId || undefined, config }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "The agent could not be saved.");
      setAgentId(payload.id);
      setSavedAt(payload.saved_at);
      window.history.replaceState({}, "", `/?agent=${encodeURIComponent(payload.id)}`);
      if (announce) showNotice("Agent saved. This URL now restores the complete configuration.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "The agent could not be saved.", "error");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function requestGeneration(nextBusiness: Business, existingFlow: FlowNode[] = flowNodes): Promise<GeneratedAgent> {
    const response = await fetch(`${studioApi}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        website: nextBusiness.host === "yourcompany.com" ? "" : nextBusiness.url,
        outcome: nextBusiness.outcome,
        use_case: primaryUseCase,
        channel: agentChannel,
        subtype: agentSubtype,
        languages: activeLanguages,
        company_description: companyDescription,
        additional_knowledge: additionalKnowledge,
        documents: knowledgeDocuments,
        optional_features: optionalFeatures,
        custom_flows: customFlows,
        existing_flow: existingFlow.map((node) => ({ id: node.id, kind: node.kind, title: node.title, condition: node.condition, action: node.action, test_utterance: node.test_utterance })),
        protected_route_ids: protectedRouteIds,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "The agent could not be generated.");
    return payload as GeneratedAgent;
  }

  function changedRouteCount(before: FlowNode[], after: FlowNode[]): number {
    const previous = new Map(before.map((node) => [node.id, JSON.stringify(node)]));
    return after.filter((node) => previous.get(node.id) !== JSON.stringify(node)).length
      + before.filter((node) => !after.some((candidate) => candidate.id === node.id)).length;
  }

  async function regenerateAgent(nextBusiness: Business) {
    setRebuilding(true);
    try {
      const generated = await requestGeneration(nextBusiness);
      const nextFlow = generated.flow?.length
        ? generated.flow.map((node) => ({ ...node, icon: flowIcons[node.kind] || "✦" }))
        : flowNodes;
      const firstRoute = nextFlow.find((node) => node.kind === "route") || nextFlow[0];
      const nextWebsiteKnowledge = generated.source?.excerpt || websiteKnowledge;
      const nextWebsiteReadAt = generated.source?.read_at || websiteReadAt;
      const nextAgentName = generated.agent_name || agentName;
      const nextSummary = generated.summary || agentSummary;
      const nextOpening = generated.opening_line || openingLine;
      const nextAssumptions = generated.assumptions || assumptions;
      const changes = changedRouteCount(flowNodes, nextFlow);
      setBusiness(nextBusiness);
      setWebsiteKnowledge(nextWebsiteKnowledge);
      setWebsiteReadAt(nextWebsiteReadAt);
      setAgentName(nextAgentName);
      setAgentSummary(nextSummary);
      setOpeningLine(nextOpening);
      setAssumptions(nextAssumptions);
      setFlowNodes(nextFlow);
      setSelectedNodeId(firstRoute.id);
      setNodeTitleDraft(firstRoute.title);
      setNodeConditionDraft(firstRoute.condition);
      setNodeActionDraft(firstRoute.action);
      setNodeTestDraft(firstRoute.test_utterance);
      setLastStructuralFingerprint(structuralFingerprint);
      await persistConfig(buildConfig({
        business: nextBusiness,
        websiteKnowledge: nextWebsiteKnowledge,
        websiteReadAt: nextWebsiteReadAt,
        agentName: nextAgentName,
        agentSummary: nextSummary,
        openingLine: nextOpening,
        assumptions: nextAssumptions,
        flowNodes: nextFlow,
      }), false);
      setUpdates((current) => [`Configuration applied: ${changes} route${changes === 1 ? "" : "s"} changed`, ...current]);
      showNotice(changes ? `${changes} conversation routes updated; your manual edits were preserved.` : "Configuration updated; conversation routes were preserved.");
    } finally {
      setRebuilding(false);
    }
  }

  async function createAgent(event: FormEvent) {
    event.preventDefault();
    const cleanBrief = brief.trim();
    if (!cleanBrief) return;
    const nextBusiness = parseBusiness(cleanBrief);
    setBusiness(nextBusiness);
    setGenerationError("");
    setBuildStep(0);
    setStage("building");
    window.localStorage.setItem("strategyos-last-brief", cleanBrief);
    try {
      const [generated] = await Promise.all([
        requestGeneration(nextBusiness, []),
        new Promise((resolve) => window.setTimeout(resolve, 3000)),
      ]);
      const nextFlow = generated.flow?.length
        ? generated.flow.map((node) => ({ ...node, icon: flowIcons[node.kind] || "✦" }))
        : makeFlow(nextBusiness);
      const firstRoute = nextFlow.find((node) => node.kind === "route") || nextFlow[0];
      setFlowNodes(nextFlow);
      setSelectedNodeId(firstRoute.id);
      setNodeTitleDraft(firstRoute.title);
      setNodeConditionDraft(firstRoute.condition);
      setNodeActionDraft(firstRoute.action);
      setNodeTestDraft(firstRoute.test_utterance);
      setAgentName(generated.agent_name || "Sara");
      setAgentSummary(generated.summary || `Designed to ${nextBusiness.outcome}`);
      setOpeningLine(generated.opening_line || "Hello, how can I help today?");
      setAssumptions(generated.assumptions || []);
      setCompanyName(nextBusiness.name);
      setWebsiteUrl(nextBusiness.url);
      setWebsiteKnowledge(generated.source?.excerpt || "");
      setWebsiteReadAt(generated.source?.read_at || "");
      setCompanyDescription(generated.summary || `Designed to ${nextBusiness.outcome}`);
      setAdditionalKnowledge("");
      setKnowledgeDocuments([]);
      setProtectedRouteIds([]);
      setAgentId("");
      setSavedAt("");
      setLastStructuralFingerprint(configurationFingerprint({
        websiteUrl: nextBusiness.url,
        outcome: nextBusiness.outcome,
        primaryUseCase,
        agentChannel,
        agentSubtype,
        companyDescription: generated.summary || `Designed to ${nextBusiness.outcome}`,
        additionalKnowledge: "",
        knowledgeDocuments: [],
        optionalFeatures,
        customFlows,
      }));
      setStudioView("logic");
      setLiveMessages([]);
      setActiveNodeId("");
      setActiveDecision("");
      setStage("studio");
      void persistConfig(buildConfig({
        business: nextBusiness,
        companyName: nextBusiness.name,
        websiteUrl: nextBusiness.url,
        websiteKnowledge: generated.source?.excerpt || "",
        websiteReadAt: generated.source?.read_at || "",
        companyDescription: generated.summary || `Designed to ${nextBusiness.outcome}`,
        additionalKnowledge: "",
        knowledgeDocuments: [],
        agentName: generated.agent_name || "Sara",
        agentSummary: generated.summary || `Designed to ${nextBusiness.outcome}`,
        openingLine: generated.opening_line || "Hello, how can I help today?",
        assumptions: generated.assumptions || [],
        flowNodes: nextFlow,
        protectedRouteIds: [],
        liveMessages: [],
      }), false);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "The agent could not be generated.");
    }
  }

  function startOver() {
    callingRef.current = false;
    stopListening();
    window.speechSynthesis?.cancel();
    setStage("intake");
    setBrief("");
    setCalling(false);
    setUpdates([]);
    setGenerationError("");
    setLiveMessages([]);
    setActiveNodeId("");
    setActiveDecision("");
    setShowLaunch(false);
    setStudioView("logic");
    setAgentId("");
    setSavedAt("");
    setWebsiteUrl("");
    setWebsiteKnowledge("");
    setWebsiteReadAt("");
    setCompanyName("");
    setCompanyDescription("");
    setAdditionalKnowledge("");
    setKnowledgeDocuments([]);
    setPrimaryUseCase("Help me choose");
    setAgentChannel("Inbound phone");
    setAgentSubtype("Receptionist + sales");
    setOptionalFeatures(["Email orders to your inbox"]);
    setCustomFlows("");
    setLanguages(["English"]);
    setPrimaryLanguage("English");
    setOtherLanguage("");
    setAgentName("Sara");
    setAgentSummary("");
    setOpeningLine("Hello, how can I help today?");
    setAssumptions([]);
    setProtectedRouteIds([]);
    setLastStructuralFingerprint("");
    window.history.replaceState({}, "", "/");
  }

  function startCall() {
    callingRef.current = true;
    setCalling(true);
    setSeconds(0);
    setScenario("opening");
    setHandoffQueued(false);
    setLiveMessages([{ role: "assistant", content: openingLine }]);
    setActiveNodeId(flowNodes.find((node) => node.kind === "entry")?.id || "");
    setActiveDecision("Conversation opened; waiting for customer intent.");
    speak(openingLine);
    showNotice("Live test started. Type a message or tap Speak.", "info");
  }

  function endCall() {
    callingRef.current = false;
    setCalling(false);
    setSeconds(0);
    setActiveNodeId("");
    setActiveDecision("");
    setHandoffQueued(false);
    stopListening();
    window.speechSynthesis?.cancel();
    showNotice("Live test ended.", "info");
  }

  function speechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  }

  function startListening() {
    if (!callingRef.current) return;
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setChatError("Speech recognition is not available in this browser. Use typed chat instead.");
      return;
    }
    window.speechSynthesis?.cancel();
    recognitionRef.current?.abort();
    const recognition = new Recognition();
    let recognitionStarted = false;
    let startTimeout = 0;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    const recognitionLanguage = primaryLanguage === "Other" ? otherLanguage.trim() : primaryLanguage;
    recognition.lang = languageLocales[recognitionLanguage] || availableVoices.find((voice) => voice.voiceURI === selectedVoiceURI)?.lang || navigator.language || "en-US";
    recognition.onstart = () => {
      recognitionStarted = true;
      window.clearTimeout(startTimeout);
      setListening(true);
      setChatError("");
      setInterimTranscript("");
      showNotice("Microphone is listening now.", "info");
    };
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      setInterimTranscript(interimText);
      if (finalText.trim()) {
        setInterimTranscript("");
        recognition.stop();
        void sendAgentMessage(finalText);
      }
    };
    recognition.onerror = (event) => {
      window.clearTimeout(startTimeout);
      if (event.error === "aborted") return;
      const messages: Record<string, string> = {
        "not-allowed": "Microphone permission was denied. Allow it in the browser or use typed chat.",
        "service-not-allowed": "Browser speech recognition is disabled. Use typed chat instead.",
        "audio-capture": "No working microphone was found.",
        "no-speech": "No speech was detected. Tap the microphone and try again.",
        "network": "The browser speech service is unavailable. Use typed chat instead.",
      };
      setChatError(messages[event.error] || event.message || "The microphone could not start.");
      showNotice(messages[event.error] || event.message || "The microphone could not start.", "error");
    };
    recognition.onend = () => {
      window.clearTimeout(startTimeout);
      setListening(false);
      setInterimTranscript("");
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      startTimeout = window.setTimeout(() => {
        if (recognitionRef.current !== recognition || recognitionStarted) return;
        recognition.abort();
        recognitionRef.current = null;
        setChatError("The microphone did not start in this browser. Use typed chat or allow microphone access and try again.");
        showNotice("The microphone did not start. Typed chat remains available.", "error");
      }, 2500);
    } catch {
      setChatError("The microphone is already active. Try again in a moment.");
    }
  }

  function stopListening() {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
    setInterimTranscript("");
  }

  function toggleListening() {
    if (listening) stopListening();
    else startListening();
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    stopListening();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = availableVoices.find((voice) => voice.voiceURI === selectedVoiceURI) || null;
    utterance.rate = 0.96;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function chooseVoice(voiceURI: string) {
    setSelectedVoiceURI(voiceURI);
    window.localStorage.setItem("strategyos-voice", voiceURI);
    const voice = availableVoices.find((item) => item.voiceURI === voiceURI);
    const preview = new SpeechSynthesisUtterance(`Hi, I’m ${agentName}. This is how I’ll sound.`);
    preview.voice = voice || null;
    preview.rate = 0.96;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(preview);
    showNotice(`Playback voice changed to ${voice?.name || "browser default"}.`, "info");
    void persistConfig(buildConfig({ selectedVoiceURI: voiceURI }), false);
  }

  function testCurrentVoice() {
    if (!("speechSynthesis" in window)) {
      showNotice("This browser has no speech playback. Typed conversation still works.", "info");
      return;
    }
    speak(`Hi, I’m ${agentName}. I’m ready to help in ${activeLanguages.join(" and ")}.`);
    showNotice("Playing the selected browser voice.", "info");
  }

  function selectNode(id: string) {
    const node = flowNodes.find((item) => item.id === id);
    if (!node) return;
    setSelectedNodeId(id);
    setNodeTitleDraft(node.title);
    setNodeConditionDraft(node.condition);
    setNodeActionDraft(node.action);
    setNodeTestDraft(node.test_utterance);
    showNotice(`${node.title} selected. Edit its rule below.`, "info");
  }

  function saveNode(event: FormEvent) {
    event.preventDefault();
    if (!nodeHasChanges) return;
    const nextNode = {
      title: nodeTitleDraft.trim(),
      condition: nodeConditionDraft.trim(),
      action: nodeActionDraft.trim(),
      test_utterance: nodeTestDraft.trim() || "Can you help me?",
    };
    const nextFlow = flowNodes.map((node) => node.id === selectedNodeId ? { ...node, ...nextNode } : node);
    const nextProtected = protectedRouteIds.includes(selectedNodeId) ? protectedRouteIds : [...protectedRouteIds, selectedNodeId];
    setFlowNodes(nextFlow);
    setProtectedRouteIds(nextProtected);
    setUpdates((current) => [`${nextNode.title}: ${nextNode.action}`, ...current]);
    showNotice(`${nextNode.title} saved. The live test now routes through this rule.`);
    void persistConfig(buildConfig({ flowNodes: nextFlow, protectedRouteIds: nextProtected }), false);
  }

  function addRoute() {
    if (routeNodes.length >= 5) {
      showNotice("Keep this demo focused: a maximum of five primary routes is supported.", "info");
      return;
    }
    const id = `custom-route-${customRouteCounterRef.current}`;
    customRouteCounterRef.current += 1;
    const nextNode: FlowNode = {
      id,
      kind: "route",
      title: "New customer route",
      condition: "Customer expresses this intent",
      action: "Handle the request and move it to the right next step.",
      test_utterance: "I need help with this.",
      icon: flowIcons.route,
    };
    const fallbackIndex = flowNodes.findIndex((node) => node.kind === "fallback");
    const nextFlow = fallbackIndex < 0 ? [...flowNodes, nextNode] : [...flowNodes.slice(0, fallbackIndex), nextNode, ...flowNodes.slice(fallbackIndex)];
    const nextProtected = [...protectedRouteIds, id];
    setFlowNodes(nextFlow);
    setProtectedRouteIds(nextProtected);
    setSelectedNodeId(id);
    setNodeTitleDraft(nextNode.title);
    setNodeConditionDraft(nextNode.condition);
    setNodeActionDraft(nextNode.action);
    setNodeTestDraft(nextNode.test_utterance);
    setUpdates((current) => ["Added a new customer route", ...current]);
    showNotice("New route added. Define when it matches and what the agent should do.", "info");
    void persistConfig(buildConfig({ flowNodes: nextFlow, protectedRouteIds: nextProtected }), false);
  }

  function removeSelectedRoute() {
    if (selectedNode?.kind !== "route") return;
    if (routeNodes.length <= 3) {
      showNotice("Keep at least three primary customer routes.", "info");
      return;
    }
    const remaining = flowNodes.filter((node) => node.id !== selectedNodeId);
    const nextProtected = protectedRouteIds.filter((id) => id !== selectedNodeId);
    const nextSelection = remaining.find((node) => node.kind === "route") || remaining[0];
    setFlowNodes(remaining);
    setSelectedNodeId(nextSelection.id);
    setNodeTitleDraft(nextSelection.title);
    setNodeConditionDraft(nextSelection.condition);
    setNodeActionDraft(nextSelection.action);
    setNodeTestDraft(nextSelection.test_utterance);
    setProtectedRouteIds(nextProtected);
    setUpdates((current) => [`Removed route: ${selectedNode.title}`, ...current]);
    showNotice(`${selectedNode.title} removed.`);
    void persistConfig(buildConfig({ flowNodes: remaining, protectedRouteIds: nextProtected }), false);
  }

  function choosePrimaryUseCase(useCase: PrimaryUseCase) {
    setPrimaryUseCase(useCase);
    if (useCase === "Answer incoming calls") { setAgentChannel("Inbound phone"); setAgentSubtype("Receptionist + sales"); }
    if (useCase === "Support customers") { setAgentChannel("Inbound phone"); setAgentSubtype("Customer support"); }
    if (useCase === "Qualify leads") { setAgentSubtype("Lead qualification"); }
    if (useCase === "Follow up and sell") { setAgentChannel("Outbound phone"); setAgentSubtype("Outbound sales"); }
    if (useCase === "Help website visitors") { setAgentChannel("Website voice + text"); setAgentSubtype("Q&A"); }
  }

  function chooseChannel(channel: AgentChannel) {
    setAgentChannel(channel);
    const nextSubtype = subtypesFor(channel)[0];
    setAgentSubtype(nextSubtype);
    setOptionalFeatures([]);
  }

  function chooseSubtype(subtype: string) {
    setAgentSubtype(subtype);
    setOptionalFeatures([]);
  }

  function toggleFeature(feature: string) {
    setOptionalFeatures((current) => current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]);
  }

  function toggleLanguage(language: string) {
    if (languages.includes(language) && languages.length === 1) {
      showNotice("Your agent needs at least one language.", "info");
      return;
    }
    if (languages.includes(language)) {
      const next = languages.filter((item) => item !== language);
      setLanguages(next);
      if (primaryLanguage === language) setPrimaryLanguage(next[0]);
      return;
    }
    setLanguages((current) => [...current, language]);
    setPrimaryLanguage(language);
    const locale = language === "Other" ? "" : languageLocales[language];
    const voice = locale ? availableVoices.find((item) => item.lang.toLowerCase().startsWith(locale.slice(0, 2).toLowerCase())) : undefined;
    if (voice) setSelectedVoiceURI(voice.voiceURI);
  }

  async function attachKnowledge(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = Array.from(input.files || []).slice(0, Math.max(0, 8 - knowledgeDocuments.length));
    if (!files.length) return;
    setKnowledgeBusy(true);
    const processed: KnowledgeDocument[] = [];
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch(`${studioApi}/knowledge`, { method: "POST", body: form });
        const payload = await response.json();
        if (!response.ok) throw new Error(`${file.name}: ${payload.detail || "could not be processed"}`);
        processed.push({ name: payload.name, text: payload.text, status: payload.status, characters: payload.characters });
      }
      setKnowledgeDocuments((current) => [...current.filter((item) => !processed.some((next) => next.name === item.name)), ...processed].slice(-8));
      showNotice(`${processed.length} knowledge file${processed.length === 1 ? "" : "s"} processed and ready for the agent.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "The knowledge files could not be processed.", "error");
    } finally {
      setKnowledgeBusy(false);
      input.value = "";
    }
  }

  function removeKnowledge(name: string) {
    const nextDocuments = knowledgeDocuments.filter((document) => document.name !== name);
    setKnowledgeDocuments(nextDocuments);
    void persistConfig(buildConfig({ knowledgeDocuments: nextDocuments }), false);
    showNotice(`${name} removed from approved knowledge.`, "info");
  }

  async function saveConfiguration(event: FormEvent) {
    event.preventDefault();
    const urlBusiness = parseBusiness(`${websiteUrl || business.url} — ${business.outcome}`);
    const nextBusiness = {
      ...business,
      host: urlBusiness.host,
      url: urlBusiness.url,
      name: companyName.trim() || business.name,
    };
    setBusiness(nextBusiness);
    setUpdates((current) => [`Control Center: ${primaryUseCase}, ${agentChannel}, ${agentSubtype}, ${activeLanguages.join(" + ")}`, ...current]);
    try {
      if (structuralFingerprint !== lastStructuralFingerprint) await regenerateAgent(nextBusiness);
      else {
        await persistConfig(buildConfig({ business: nextBusiness }));
        setLastStructuralFingerprint(structuralFingerprint);
      }
      setStudioView("logic");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "The configuration could not be applied.", "error");
    }
  }

  async function openLaunch() {
    if (!ownerName.trim() || !/^\S+@\S+\.\S+$/.test(ownerEmail.trim())) {
      setStudioView("configure");
      showNotice("Add your name and a valid work email before connecting the agent.", "info");
      return;
    }
    try { await persistConfig(buildConfig(), false); }
    catch { return; }
    setShowLaunch(true);
  }

  async function openShareDialog() {
    if (!agentId) {
      try { await persistConfig(buildConfig(), false); }
      catch { return; }
    }
    setShareLink(window.location.href);
    setShowShare(true);
  }

  async function copyShareLink() {
    const link = shareLink || window.location.href;
    try {
      await navigator.clipboard.writeText(link);
      showNotice("Shareable agent link copied.");
    } catch {
      showNotice("Automatic copy is unavailable here. Select the link in the dialog and copy it.", "info");
    }
  }

  async function sendAgentMessage(message: string) {
    const clean = message.trim();
    if (!clean || chatBusy) return;
    const history = liveMessages[0]?.role === "assistant" ? liveMessages.slice(1) : [...liveMessages];
    // The opening line is UI state rather than a customer turn. Also drop an
    // unanswered user message after a failed request so provider history keeps
    // a valid user/assistant sequence on retry.
    if (history.at(-1)?.role === "user") history.pop();
    const nextUserMessage: LiveMessage = { role: "user", content: clean };
    setLiveMessages((current) => [...current, nextUserMessage]);
    setChatInput("");
    setChatBusy(true);
    setActiveNodeId(flowNodes.find((node) => node.kind === "entry")?.id || "");
    setActiveDecision("Classifying intent against the generated business routes.");
    setChatError("");
    try {
      const response = await fetch(`${studioApi}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: `${companyName || business.name}; agent name: ${agentName}`,
          outcome: configuredContext,
          approved_knowledge: approvedKnowledge,
          flow: flowNodes.map((node) => ({ id: node.id, kind: node.kind, title: node.title, condition: node.condition, action: node.action, test_utterance: node.test_utterance })),
          logic: [
            { id: "trigger", title: "Trigger", description: flowNodes.find((node) => node.kind === "entry")?.action || openingLine },
            { id: "understand", title: "Understand", description: routeNodes.map((node) => `${node.title}: ${node.condition}`).join(" | ").slice(0, 180) },
            { id: "retrieve", title: "Retrieve", description: `Use only approved knowledge for ${companyName || business.name}.` },
            { id: "decide", title: "Decide", description: routeNodes.map((node) => `${node.title}: ${node.action}`).join(" | ").slice(0, 180) },
            { id: "respond", title: "Respond", description: "Follow the matched customer route and ask at most one question at a time." },
            { id: "complete", title: "Complete", description: flowNodes.find((node) => node.kind === "fallback")?.action || "Offer a safe human handoff." },
          ],
          messages: history,
          user_message: clean,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "The agent did not answer.");
      const reply = String(payload.reply || "I’m sorry, I could not answer that.");
      setLiveMessages((current) => {
        const nextMessages: LiveMessage[] = [...current, { role: "assistant", content: reply }];
        void persistConfig(buildConfig({ liveMessages: nextMessages }), false);
        return nextMessages;
      });
      setActiveNodeId(String(payload.active_node_id || flowNodes.find((node) => node.kind === "fallback")?.id || ""));
      if (flowNodes.find((node) => node.id === String(payload.active_node_id))?.kind === "fallback") setHandoffQueued(false);
      setActiveDecision(String(payload.decision || "Matched the safest available route."));
      speak(reply);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "The agent did not answer.");
      showNotice(error instanceof Error ? error.message : "The agent did not answer.", "error");
    } finally {
      setChatBusy(false);
    }
  }

  function submitChat(event: FormEvent) {
    event.preventDefault();
    void sendAgentMessage(chatInput);
  }

  function runScenario(node: FlowNode) {
    setScenario(node.id);
    if (!calling) startCall();
    window.setTimeout(() => void sendAgentMessage(node.test_utterance), calling ? 0 : 80);
  }

  return (
    <main className={`studio-shell stage-${stage}`}>
      <header className="topbar">
        <button className="brand brand-button" type="button" onClick={startOver} aria-label="NextLevel Agent Studio home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>NEXTLEVEL.AI</span>
          <span className="studio-label">Agent Studio</span>
        </button>
        <div className="session-state" aria-label="Session status">
          <span className="status-dot" />
          <span>{stage === "studio" ? "Private live session" : "Interactive product concept"}</span>
        </div>
        {stage === "studio" ? (
          <div className="top-actions">
            <span className="save-state">{saving ? "Saving…" : savedAt ? "Saved ✓" : "Not saved"}</span>
            <button className="share-agent" type="button" onClick={() => void openShareDialog()}>Share</button>
            <button className="new-agent" type="button" onClick={startOver}>New agent</button>
            <button className="edit-agent-top" type="button" onClick={() => setStudioView("configure")}>✦ Edit agent</button>
            <button className="launch-top" type="button" onClick={() => void openLaunch()}>Connect &amp; go live</button>
          </div>
        ) : <span className="prototype-badge">2027 concept</span>}
      </header>

      {stage === "intake" && (
        <section className="intake" id="top">
          <div className="intake-orb orb-one" aria-hidden="true" />
          <div className="intake-orb orb-two" aria-hidden="true" />
          <div className="intake-content">
            <div className="eyebrow">Create from intent, not configuration</div>
            <h1>Describe the business.<br /><em>Meet the agent.</em></h1>
            <p className="intake-lead">No templates. No flowcharts. No twenty-step wizard. Give us the context and the outcome; the first working version comes next.</p>

            <form className="intake-form" onSubmit={createAgent}>
              <label htmlFor="business-brief">Enter your company website and describe the outcome you want.</label>
              <div className="brief-field">
                <textarea
                  id="business-brief"
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  placeholder="spsoft.com — qualify inbound leads and book a discovery call"
                  rows={3}
                />
                <button type="submit" disabled={!brief.trim()} aria-label="Create my agent">
                  <span>Create my agent</span><b aria-hidden="true">↗</b>
                </button>
              </div>
              <div className="intake-meta"><span>✦ One field</span><span>No account required</span><span>Secure server-side generation</span></div>
            </form>

            <div className="example-row" aria-label="Example prompts">
              <span>Try an example</span>
              {examples.map((example) => (
                <button type="button" key={example} onClick={() => setBrief(example)}>{example}</button>
              ))}
            </div>
          </div>
        </section>
      )}

      {stage === "building" && (
        <section className="building-screen" aria-live="polite">
          <div className="build-card">
            <div className="build-identity">
              <span className="build-domain">{business.host}</span>
              <h1>{generationError ? "Generation needs another try." : "Building the shortest path to your outcome."}</h1>
              <p>“{business.outcome}”</p>
            </div>
            {generationError ? (
              <div className="build-error"><span>!</span><strong>{generationError}</strong><p>Check that the website is public and try again.</p><button type="button" onClick={() => setStage("intake")}>Edit request</button></div>
            ) : <>
              <div className="build-progress">
                {buildSteps.map((step, index) => (
                  <div className={`build-step ${index < buildStep ? "done" : ""} ${index === buildStep ? "active" : ""}`} key={step.title}>
                    <span>{index < buildStep ? "✓" : index + 1}</span>
                    <div><strong>{step.title}</strong><small>{step.detail}</small></div>
                  </div>
                ))}
              </div>
              <div className="build-line"><i style={{ width: `${((buildStep + 1) / buildSteps.length) * 100}%` }} /></div>
            </>}
          </div>
        </section>
      )}

      {stage === "studio" && (
        <>
          <section className="flow-studio" id="top">
            <aside className="tool-rail" aria-label="Agent studio navigation">
              <button className={`rail-primary ${studioView === "configure" ? "active" : ""}`} type="button" aria-label="Edit agent" onClick={() => setStudioView("configure")}><i>✦</i><small>Edit agent</small></button>
              <button className={studioView === "logic" ? "active" : ""} type="button" aria-label="Conversation logic" onClick={() => setStudioView("logic")}><i>⌘</i><small>Logic</small></button>
              <span className="rail-spacer" />
            </aside>

            <section className={`logic-canvas ${studioView === "configure" ? "config-mode" : ""}`} aria-label={studioView === "logic" ? "Editable conversation logic" : "Complete agent configuration"}>
              <header className="canvas-header">
                <div><span className="canvas-kicker">Generated from {business.host} · {agentName}</span><h1>{studioView === "logic" ? "Your Voice AI Agent" : "Agent Control Center"}</h1><p className="agent-summary">{studioView === "logic" ? agentSummary : "Every wizard control, editable here without leaving the studio."}</p></div>
                {studioView === "logic" ? <div className="canvas-status"><span>LIVE</span><strong>{routeNodes.length} generated routes</strong><small>{assumptions.length} assumptions · every rule is editable</small></div> : <button className="back-to-logic" type="button" onClick={() => setStudioView("logic")}>View logic →</button>}
              </header>

              {studioView === "logic" ? <>
              <div className="edit-guidance" role="note"><span>✦</span><div><strong>This is the business logic—not generic AI plumbing.</strong><small><b>1</b> Select a route · <b>2</b> Edit when it matches · <b>3</b> Edit what happens · <b>4</b> Test that route</small></div><button type="button" onClick={() => setStudioView("configure")}>Edit full agent →</button></div>
              <div className="flow-map business-flow">
                <div className="entry-row">
                  {flowNodes.filter((node) => node.kind === "entry").map((node) => <button key={node.id} type="button" aria-pressed={selectedNodeId === node.id} className={`logic-node flow-entry ${selectedNodeId === node.id ? "selected" : ""} ${activeNodeId === node.id ? "executing" : ""}`} onClick={() => selectNode(node.id)}><i>{node.icon}</i><span><em>ENTRY</em><strong>{node.title}</strong><small>{node.action}</small></span><b>{activeNodeId === node.id ? "LIVE" : "●"}</b></button>)}
                </div>
                <div className="route-divider"><span>Route by customer intent</span></div>
                <div className="business-route-grid">
                  {routeNodes.map((node) => <button key={node.id} type="button" aria-pressed={selectedNodeId === node.id} className={`logic-node business-route ${selectedNodeId === node.id ? "selected" : ""} ${activeNodeId === node.id ? "executing" : ""}`} onClick={() => selectNode(node.id)}><i>{node.icon}</i><span><em>WHEN</em><strong>{node.title}</strong><small>{node.condition}</small><em>DO</em><small>{node.action}</small></span><b>{activeNodeId === node.id ? "LIVE" : "✓"}</b></button>)}
                </div>
                <div className="fallback-row">
                  {flowNodes.filter((node) => node.kind === "fallback").map((node) => <button key={node.id} type="button" aria-pressed={selectedNodeId === node.id} className={`logic-node flow-fallback ${selectedNodeId === node.id ? "selected" : ""} ${activeNodeId === node.id ? "executing" : ""}`} onClick={() => selectNode(node.id)}><i>{node.icon}</i><span><em>SAFE EXIT</em><strong>{node.title}</strong><small>{node.condition} → {node.action}</small></span><b>{activeNodeId === node.id ? "LIVE" : "✓"}</b></button>)}
                </div>
              </div>

              <form className="node-editor route-editor" onSubmit={saveNode}>
                <header><div><span>Editing {selectedNode?.kind === "route" ? "customer route" : selectedNode?.kind}</span><strong>{selectedNode?.title}</strong></div><div className="route-editor-actions"><button className="add-route" type="button" onClick={addRoute}>＋ Add route</button>{selectedNode?.kind === "route" && <button className="remove-route" type="button" onClick={removeSelectedRoute}>Remove</button>}</div></header>
                <div className="route-editor-grid">
                  <label><span>Route name</span><input value={nodeTitleDraft} onChange={(event) => setNodeTitleDraft(event.target.value)} /></label>
                  {selectedNode?.kind !== "entry" && <label><span>When this matches</span><input value={nodeConditionDraft} onChange={(event) => setNodeConditionDraft(event.target.value)} /></label>}
                  <label className="route-action-field"><span>What the agent does</span><textarea rows={2} value={nodeActionDraft} onChange={(event) => setNodeActionDraft(event.target.value)} /></label>
                  <label><span>One-click test message</span><input value={nodeTestDraft} onChange={(event) => setNodeTestDraft(event.target.value)} /></label>
                </div>
                <footer><small>Changes are used by the next live response.</small><button type="submit" disabled={!nodeHasChanges}>{nodeHasChanges ? "Save route" : "Saved ✓"}</button></footer>
              </form>
              </> : (
                <form className="control-center" onSubmit={saveConfiguration}>
                  <div className="control-intro"><span>One workspace · zero steps</span><strong>Change anything. Test the result immediately.</strong><small>{rebuilding ? "Refreshing knowledge and affected routes…" : structuralFingerprint !== lastStructuralFingerprint ? "Structural changes ready to apply; manual routes will be preserved." : "Everything shown here is used by the saved agent."}</small></div>

                  <section className="config-section">
                    <header><span>01</span><div><strong>Owner &amp; business</strong><small>Contact details from the original “You” step</small></div></header>
                    <div className="config-grid two">
                      <label><span>Full name</span><input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Jane Doe" /></label>
                      <label><span>Work email</span><input type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} placeholder="jane@company.com" /></label>
                      <label><span>Phone <i>optional</i></span><input type="tel" value={ownerPhone} onChange={(event) => setOwnerPhone(event.target.value)} placeholder="+1 555 123 4567" /></label>
                      <label><span>Company</span><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder={business.name} /></label>
                    </div>
                  </section>

                  <section className="config-section">
                    <header><span>02</span><div><strong>Knowledge</strong><small>Website context, editable description and documents</small></div></header>
                    <div className="config-grid">
                      <label><span>Website URL</span><input type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://yourcompany.com" /><small className="field-status">{websiteKnowledge ? `✓ ${websiteKnowledge.length.toLocaleString()} characters indexed${websiteReadAt ? ` · refreshed ${new Date(websiteReadAt).toLocaleString()}` : ""}` : "The site will be read when changes are applied."}</small></label>
                      <label><span>Primary outcome</span><input value={business.outcome} onChange={(event) => setBusiness((current) => ({ ...current, outcome: event.target.value }))} /></label>
                      <label><span>Company description</span><textarea value={companyDescription} onChange={(event) => setCompanyDescription(event.target.value)} rows={3} placeholder="Services, pricing, hours, locations and common questions…" /></label>
                      <label><span>Additional approved knowledge</span><textarea value={additionalKnowledge} onChange={(event) => setAdditionalKnowledge(event.target.value)} rows={4} placeholder="Paste FAQs, policies, pricing or training notes…" /></label>
                      <label className={`file-drop ${knowledgeBusy ? "is-busy" : ""}`}><span>Attach knowledge files</span><input type="file" accept=".pdf,.txt,.md,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple disabled={knowledgeBusy} onChange={attachKnowledge} /><b>{knowledgeBusy ? "Extracting readable content…" : "＋ Add PDF, TXT, MD or DOCX"}</b><small>Every supported file is parsed and becomes approved knowledge for generation and live answers.</small></label>
                      {knowledgeDocuments.length > 0 && <div className="file-chips">{knowledgeDocuments.map((file) => <span key={file.name}>✓ {file.name} · {(file.characters || file.text.length).toLocaleString()} chars<button type="button" onClick={() => removeKnowledge(file.name)} aria-label={`Remove ${file.name}`}>×</button></span>)}</div>}
                    </div>
                  </section>

                  <section className="config-section">
                    <header><span>03</span><div><strong>Agent type</strong><small>Channel, job and optional behavior</small></div></header>
                    <div className="config-subgroup"><span>Primary use case</span><div className="usecase-grid">{primaryUseCaseOptions.map((useCase) => <button type="button" key={useCase.name} className={primaryUseCase === useCase.name ? "selected" : ""} aria-pressed={primaryUseCase === useCase.name} onClick={() => choosePrimaryUseCase(useCase.name)}><strong>{useCase.name}</strong><small>{useCase.detail}</small></button>)}</div></div>
                    <div className="config-subgroup"><span>Channel</span></div>
                    <div className="channel-grid">
                      {channelOptions.map((channel) => <button type="button" key={channel.name} className={agentChannel === channel.name ? "selected" : ""} aria-pressed={agentChannel === channel.name} onClick={() => chooseChannel(channel.name)}><strong>{channel.name}</strong><small>{channel.detail}</small></button>)}
                    </div>
                    <div className="config-subgroup"><span>Sub-type</span><div className="choice-row">{subtypesFor(agentChannel).map((subtype) => <button type="button" key={subtype} className={agentSubtype === subtype ? "selected" : ""} aria-pressed={agentSubtype === subtype} onClick={() => chooseSubtype(subtype)}>{subtype}</button>)}</div></div>
                    {compatibleFeatureOptions.length > 0 && <div className="config-subgroup"><span>Optional features</span>{compatibleFeatureOptions.map((feature) => <div className="check-card" key={feature}><input type="checkbox" aria-label={feature} checked={optionalFeatures.includes(feature)} onChange={() => toggleFeature(feature)} /><div><strong>{feature}</strong><small>{feature.startsWith("Escalate") ? "Warm-transfer when the caller asks for a person or the agent cannot resolve the issue." : "Send committed order or service details to your team."}</small></div></div>)}</div>}
                  </section>

                  <section className="config-section">
                    <header><span>04</span><div><strong>Conversation flows</strong><small>Plain-English rules for specific scenarios</small></div></header>
                    <label className="full-field"><span>Custom flows</span><textarea value={customFlows} onChange={(event) => setCustomFlows(event.target.value)} rows={5} placeholder={'If user asks about pricing → explain the starting price, qualify budget, then route to sales.\nIf user is angry → stay calm, acknowledge the issue, then offer a human transfer.'} /></label>
                    <div className="pattern-hints"><span>Off-topic</span><span>Angry caller</span><span>Identity checks</span><span>Compliance</span><span>VIP customers</span></div>
                  </section>

                  <section className="config-section">
                    <header><span>05</span><div><strong>Voice &amp; persona</strong><small>Languages, gender, named voice, avatar and greeting</small></div></header>
                    <div className="config-subgroup"><span>Primary language &amp; additional languages <i>selecting a new language makes it primary</i></span><div className="language-grid">{languageOptions.map((language) => <button type="button" key={language} className={`${languages.includes(language) ? "selected" : ""} ${primaryLanguage === language ? "is-primary" : ""}`} aria-pressed={languages.includes(language)} onClick={() => toggleLanguage(language)}>{language}{primaryLanguage === language && <small>Primary</small>}</button>)}</div></div>
                    {languages.includes("Other") && <label className="full-field"><span>Other language</span><input value={otherLanguage} onChange={(event) => setOtherLanguage(event.target.value)} placeholder="Enter language and preferred locale" required /></label>}
                    <div className="config-subgroup"><span>Gender</span><div className="choice-row">{(["Female", "Male"] as VoiceGender[]).map((gender) => <button type="button" key={gender} className={voiceGender === gender ? "selected" : ""} aria-pressed={voiceGender === gender} onClick={() => { setVoiceGender(gender); setVoicePersona(voicePersonas[gender][0].name); setAvatarChoice(1); }}>{gender} voice + avatar</button>)}</div></div>
                    <div className="config-subgroup"><span>Voice persona</span><div className="persona-grid">{voicePersonas[voiceGender].map((persona) => <button type="button" key={persona.name} className={voicePersona === persona.name ? "selected" : ""} aria-pressed={voicePersona === persona.name} onClick={() => setVoicePersona(persona.name)}><strong>{persona.name}</strong><small>{persona.tone}</small></button>)}</div></div>
                    <div className="config-subgroup avatar-picker"><span>Choose a face</span><div>{avatarOptions[voiceGender].map((avatar, index) => <button type="button" key={avatar.src} className={avatarChoice === index + 1 ? "selected" : ""} onClick={() => setAvatarChoice(index + 1)} aria-label={avatar.label} aria-pressed={avatarChoice === index + 1}><img src={avatar.src} alt="" loading="lazy" /><i>✓</i></button>)}</div></div>
                    <div className="config-grid identity-grid">
                      <label><span>Agent name</span><input value={agentName} onChange={(event) => setAgentName(event.target.value)} placeholder="Sara from Acme" /></label>
                    </div>
                    <label className="full-field"><span>Opening line</span><textarea value={openingLine} onChange={(event) => setOpeningLine(event.target.value)} rows={2} /></label>
                  </section>

                  <footer className="control-actions"><span>{activeLanguages.length} languages · {knowledgeDocuments.length} processed files · {protectedRouteIds.length} protected manual edits</span><button type="submit" disabled={saving || rebuilding || knowledgeBusy}>{rebuilding ? "Updating affected routes…" : saving ? "Saving…" : structuralFingerprint !== lastStructuralFingerprint ? "Apply changes & update routes →" : "Save agent & return to logic →"}</button></footer>
                </form>
              )}
            </section>

            <aside className={`live-test ${calling ? "is-calling" : ""}`} aria-label="Live agent test">
              <header className="live-header"><div><span className="live-pulse">⌁</span><strong>Live test</strong><i /></div><span>{callTime}</span></header>
              <div className="test-context"><img src={selectedAvatar.src} alt="" /><div><span>{agentName} · {business.name}</span><small>{voicePersona} · {business.outcome}</small></div></div>
              <div className="voice-picker">
                <label htmlFor="agent-voice">Demo playback</label>
                <select id="agent-voice" value={selectedVoiceURI} onChange={(event) => chooseVoice(event.target.value)} disabled={availableVoices.length === 0}>
                  {availableVoices.length === 0 ? <option>Browser default</option> : availableVoices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}
                </select>
                <button type="button" onClick={testCurrentVoice}>Test voice</button>
                <small>{availableVoices.length ? `${availableVoices.length} device voices · recognition ${languageLocales[activeLanguages[0]] || activeLanguages[0]}` : "No device voice detected; typed conversation remains available."}</small>
              </div>
              <div className="voice-orb" aria-hidden="true"><span><i /><i /><i /><i /><i /><i /><i /><i /><i /></span></div>
              <div className="connected"><span>✓</span>{listening ? "Listening" : chatBusy ? "Agent is thinking" : calling ? "Test active" : "Ready to test"}</div>

              {calling && activeNode && <div className={`decision-trace ${chatBusy ? "routing" : ""}`} aria-live="polite"><span>{chatBusy ? "Routing intent…" : activeNode.kind === "entry" ? "Current step" : "Matched route"}</span><strong>{chatBusy ? "Finding the safest path" : activeNode.title}</strong><small>{activeDecision || activeNode.action}</small></div>}

              {calling ? (
                <div className="live-transcript" aria-live="polite">
                  {liveMessages.map((line, index) => <p className={line.role} key={`${line.content}-${index}`}><strong>{line.role === "assistant" ? agentName : "You"}</strong>{line.content}</p>)}
                  {interimTranscript && <p className="user is-interim"><strong>You · listening</strong>{interimTranscript}</p>}
                  {chatBusy && <p className="assistant is-thinking"><strong>{agentName}</strong>Thinking…</p>}
                  {chatError && <p className="chat-error"><strong>Connection</strong>{chatError}</p>}
                </div>
              ) : <div className="test-prompt"><strong>Test your edited agent here.</strong><span>Start a live test, or choose a ready-made scenario below.</span></div>}

              {calling && activeNode?.kind === "fallback" && <div className={`handoff-demo ${handoffQueued ? "is-queued" : ""}`}><div><strong>{handoffQueued ? "✓ Human follow-up queued" : "Human handoff available"}</strong><small>{handoffQueued ? "The transcript and caller context were captured in this demo session." : "Simulate the operational handoff configured by this route."}</small></div><button type="button" disabled={handoffQueued} onClick={() => { setHandoffQueued(true); setUpdates((current) => ["Human handoff queued from live test", ...current]); showNotice("Demo handoff queued with the conversation context."); }}>{handoffQueued ? "Queued" : "Queue handoff"}</button></div>}

              <span className="scenario-label">Test a generated route</span>
              <div className="scenario-buttons studio-scenarios" aria-label="Test scenarios">
                {flowNodes.filter((node) => node.kind !== "entry").map((node) => <button key={node.id} type="button" disabled={chatBusy} aria-pressed={scenario === node.id} onClick={() => runScenario(node)}>{node.title}</button>)}
              </div>
              {calling && <form className="live-chat-form" onSubmit={submitChat}><label className="sr-only" htmlFor="live-message">Talk to the agent</label><input id="live-message" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Type what you would say…" /><button type="submit" disabled={chatBusy || !chatInput.trim()}>{chatBusy ? "Waiting…" : "Send"}</button></form>}
              <div className="call-controls">{!calling ? <button className="start-test" type="button" onClick={startCall}>▶ Start live test</button> : <><button className={`mic-toggle ${listening ? "listening" : ""}`} type="button" onClick={toggleListening} disabled={!micSupported} aria-label={listening ? "Stop listening" : "Speak with microphone"}>{listening ? "■ Stop listening" : "🎙 Speak"}</button><button className="end-call" type="button" onClick={endCall}>End test</button></>}</div>
              <div className="mic-status">{!micSupported ? "Microphone unavailable in this browser — typed chat still works." : listening ? "Listening — speak now" : calling ? "Use Speak or type a message above." : "No microphone permission is requested until you tap Speak."}</div>
              <div className="test-foot"><span>{savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : `${updates.length} edits in this session`}</span><button type="button" onClick={() => void openLaunch()}>Approve agent →</button></div>
            </aside>
          </section>
          <footer className="site-footer"><span>Voice Agent Studio · 2027 concept</span><span>The product does the work. The human approves decisions.</span></footer>
        </>
      )}

      {showLaunch && (
        <div className="modal-backdrop">
          <section className="launch-modal" role="dialog" aria-modal="true" aria-labelledby="launch-title">
            <button className="modal-close" type="button" aria-label="Close deployment dialog" onClick={() => setShowLaunch(false)}>×</button><span className="modal-kicker">Just-in-time setup</span>
            <h2 id="launch-title">The prototype is approved. Now connect only what it needs.</h2><p>No credentials were requested before you experienced the product.</p>
            <div className="connection-list"><div><span>01</span><div><strong>Phone line</strong><small>Receive and transfer calls</small></div><b>Configured at launch</b></div><div><span>02</span><div><strong>Calendar</strong><small>Offer and book available slots</small></div><b>Configured at launch</b></div><div><span>03</span><div><strong>CRM</strong><small>Save context and outcomes</small></div><b>Optional</b></div></div>
            <button className="approve-launch" type="button" onClick={() => setShowLaunch(false)}>Close preview</button><small className="modal-footnote">Prototype only — no external systems will be connected.</small>
          </section>
        </div>
      )}
      {showShare && (
        <div className="modal-backdrop">
          <section className="launch-modal share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
            <button className="modal-close" type="button" aria-label="Close share dialog" onClick={() => setShowShare(false)}>×</button>
            <span className="modal-kicker">Saved agent</span>
            <h2 id="share-title">Share this working agent.</h2>
            <p>Anyone with this private link can open the same configuration, inspect its logic, and run a live test.</p>
            <label htmlFor="share-link">Shareable link</label>
            <div className="share-link-row"><input id="share-link" value={shareLink} readOnly onFocus={(event) => event.currentTarget.select()} /><button type="button" onClick={() => void copyShareLink()}>Copy link</button></div>
            <button className="approve-launch" type="button" onClick={() => setShowShare(false)}>Done</button>
          </section>
        </div>
      )}
      {notice && <div className={`studio-notice ${notice.kind}`} role="status" aria-live="polite"><span>{notice.kind === "success" ? "✓" : notice.kind === "error" ? "!" : "i"}</span>{notice.message}</div>}
    </main>
  );
}

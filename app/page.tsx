"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Scenario = "opening" | "pricing" | "human" | "arabic";
type Stage = "intake" | "building" | "studio";
type LogicId = "trigger" | "understand" | "retrieve" | "decide" | "respond" | "complete";

type LogicNode = {
  id: LogicId;
  title: string;
  description: string;
  icon: string;
};

type LiveMessage = { role: "user" | "assistant"; content: string };

type GeneratedAgent = {
  agent_name: string;
  summary: string;
  opening_line: string;
  assumptions: string[];
  logic: Array<{ id: LogicId; title: string; description: string }>;
};

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

const studioApi = "https://strategyos.live/public/agent-studio";
const logicIcons: Record<LogicId, string> = { trigger: "ϟ", understand: "◎", retrieve: "⌕", decide: "⌘", respond: "➤", complete: "✓" };

function makeLogic(business: Business): LogicNode[] {
  return [
    { id: "trigger", title: "Trigger", description: "Incoming voice conversation", icon: "ϟ" },
    { id: "understand", title: "Understand", description: "Extract intent, language and key details", icon: "◎" },
    { id: "retrieve", title: "Retrieve", description: `Use approved knowledge from ${business.host}`, icon: "⌕" },
    { id: "decide", title: "Decide", description: "Choose answer, action or human handoff", icon: "⌘" },
    { id: "respond", title: "Respond", description: `Guide the caller toward: ${business.outcome}`, icon: "➤" },
    { id: "complete", title: "Complete", description: "Save the outcome and next step", icon: "✓" },
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

export default function Home() {
  const [stage, setStage] = useState<Stage>("intake");
  const [brief, setBrief] = useState("");
  const [business, setBusiness] = useState<Business>(() => parseBusiness("nextlevel.ai — qualify inbound leads and book a consultation"));
  const [buildStep, setBuildStep] = useState(0);
  const [calling, setCalling] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [scenario, setScenario] = useState<Scenario>("opening");
  const [draft, setDraft] = useState("");
  const [updates, setUpdates] = useState<string[]>([]);
  const [logicNodes, setLogicNodes] = useState<LogicNode[]>(() => makeLogic(parseBusiness("nextlevel.ai — qualify inbound leads and book a consultation")));
  const [selectedNodeId, setSelectedNodeId] = useState<LogicId>("understand");
  const [nodeDraft, setNodeDraft] = useState("Extract intent, language and key details");
  const [agentName, setAgentName] = useState("Sara");
  const [agentSummary, setAgentSummary] = useState("");
  const [openingLine, setOpeningLine] = useState("Hello, how can I help today?");
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [generationError, setGenerationError] = useState("");
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [showLaunch, setShowLaunch] = useState(false);

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
    if (!calling) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [calling]);

  const callTime = useMemo(() => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remaining = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remaining}`;
  }, [seconds]);

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
      const [response] = await Promise.all([
        fetch(`${studioApi}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            website: nextBusiness.host === "yourcompany.com" ? "" : nextBusiness.url,
            outcome: nextBusiness.outcome,
          }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 3000)),
      ]);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "The agent could not be generated.");
      const generated = payload as GeneratedAgent;
      const nextLogic = generated.logic.map((node) => ({ ...node, icon: logicIcons[node.id] || "✦" }));
      setLogicNodes(nextLogic);
      setSelectedNodeId("understand");
      setNodeDraft(nextLogic.find((node) => node.id === "understand")?.description || "");
      setAgentName(generated.agent_name || "Sara");
      setAgentSummary(generated.summary || `Designed to ${nextBusiness.outcome}`);
      setOpeningLine(generated.opening_line || "Hello, how can I help today?");
      setAssumptions(generated.assumptions || []);
      setLiveMessages([]);
      setStage("studio");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "The agent could not be generated.");
    }
  }

  function startOver() {
    setStage("intake");
    setBrief("");
    setCalling(false);
    setUpdates([]);
    setGenerationError("");
    setLiveMessages([]);
    setShowLaunch(false);
  }

  function startCall() {
    setCalling(true);
    setSeconds(0);
    setScenario("opening");
    setLiveMessages([{ role: "assistant", content: openingLine }]);
    window.speechSynthesis?.speak(new SpeechSynthesisUtterance(openingLine));
  }

  function endCall() {
    setCalling(false);
    setSeconds(0);
    window.speechSynthesis?.cancel();
  }

  function applyChange(event: FormEvent) {
    event.preventDefault();
    const change = draft.trim();
    if (!change) return;
    setUpdates((current) => [change, ...current]);
    setLogicNodes((current) => current.map((node) => node.id === selectedNodeId ? { ...node, description: change } : node));
    setNodeDraft(change);
    setDraft("");
  }

  function selectNode(id: LogicId) {
    const node = logicNodes.find((item) => item.id === id);
    setSelectedNodeId(id);
    setNodeDraft(node?.description || "");
  }

  function saveNode(event: FormEvent) {
    event.preventDefault();
    const change = nodeDraft.trim();
    if (!change) return;
    setLogicNodes((current) => current.map((node) => node.id === selectedNodeId ? { ...node, description: change } : node));
    setUpdates((current) => [`${logicNodes.find((node) => node.id === selectedNodeId)?.title}: ${change}`, ...current]);
  }

  async function sendAgentMessage(message: string) {
    const clean = message.trim();
    if (!clean || chatBusy) return;
    const history = liveMessages;
    const nextUserMessage: LiveMessage = { role: "user", content: clean };
    setLiveMessages((current) => [...current, nextUserMessage]);
    setChatInput("");
    setChatBusy(true);
    setChatError("");
    try {
      const response = await fetch(`${studioApi}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: business.name,
          outcome: business.outcome,
          logic: logicNodes.map(({ id, title, description }) => ({ id, title, description })),
          messages: history,
          user_message: clean,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "The agent did not answer.");
      const reply = String(payload.reply || "I’m sorry, I could not answer that.");
      setLiveMessages((current) => [...current, { role: "assistant", content: reply }]);
      window.speechSynthesis?.speak(new SpeechSynthesisUtterance(reply));
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "The agent did not answer.");
    } finally {
      setChatBusy(false);
    }
  }

  function submitChat(event: FormEvent) {
    event.preventDefault();
    void sendAgentMessage(chatInput);
  }

  function runScenario(nextScenario: Scenario) {
    setScenario(nextScenario);
    if (!calling) startCall();
    const prompts: Record<Scenario, string> = {
      opening: "I’m interested, but I’m not sure where to start.",
      pricing: "What does it cost?",
      human: "I need to speak to a person.",
      arabic: "Can we continue in Arabic?",
    };
    window.setTimeout(() => void sendAgentMessage(prompts[nextScenario]), calling ? 0 : 80);
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
          <span>{stage === "studio" ? "Private prototype · autosaved" : "Interactive product concept"}</span>
        </div>
        {stage === "studio" ? (
          <div className="top-actions">
            <button className="new-agent" type="button" onClick={startOver}>New agent</button>
            <button className="launch-top" type="button" onClick={() => setShowLaunch(true)}>Connect &amp; go live</button>
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
                  autoFocus
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
              <button className="rail-primary" type="button" aria-label="AI builder">✦</button>
              <button className="active" type="button" aria-label="Conversation logic">⌘</button>
              <button type="button" aria-label="Knowledge">▤</button>
              <button type="button" aria-label="Data sources">◉</button>
              <button type="button" aria-label="Integrations">⌯</button>
              <span />
              <button type="button" aria-label="Settings">⚙</button>
            </aside>

            <section className="logic-canvas" aria-label="Editable conversation logic">
              <header className="canvas-header">
                <div><span className="canvas-kicker">Generated from {business.host} · {agentName}</span><h1>Your Voice AI Agent</h1><p className="agent-summary">{agentSummary}</p></div>
                <div className="canvas-status"><span>v1</span><strong>All logic visible</strong><small>{assumptions.length} assumptions · click any block to edit</small></div>
              </header>

              <div className="flow-map">
                <div className="flow-column top-flow">
                  {logicNodes.filter((node) => node.id === "trigger").map((node) => <button key={node.id} type="button" className={`logic-node ${selectedNodeId === node.id ? "selected" : ""}`} onClick={() => selectNode(node.id)}><i>{node.icon}</i><span><strong>{node.title}</strong><small>{node.description}</small></span><b>●</b></button>)}
                  <span className="flow-connector vertical" />
                  {logicNodes.filter((node) => node.id === "understand").map((node) => <button key={node.id} type="button" className={`logic-node wide ${selectedNodeId === node.id ? "selected" : ""}`} onClick={() => selectNode(node.id)}><i>{node.icon}</i><span><strong>{node.title}</strong><small>{node.description}</small></span><b>✓</b></button>)}
                </div>

                <div className="branch-connector" aria-hidden="true"><span /><i /><b /></div>
                <div className="branch-row">
                  {logicNodes.filter((node) => ["retrieve", "decide", "respond"].includes(node.id)).map((node) => <button key={node.id} type="button" className={`logic-node branch ${selectedNodeId === node.id ? "selected" : ""}`} onClick={() => selectNode(node.id)}><i>{node.icon}</i><span><strong>{node.title}</strong><small>{node.description}</small></span><b>✓</b></button>)}
                </div>
                <div className="merge-connector" aria-hidden="true"><span /><i /></div>
                <div className="complete-row">
                  {logicNodes.filter((node) => node.id === "complete").map((node) => <button key={node.id} type="button" className={`logic-node ${selectedNodeId === node.id ? "selected" : ""}`} onClick={() => selectNode(node.id)}><i>{node.icon}</i><span><strong>{node.title}</strong><small>{node.description}</small></span><b>✓</b></button>)}
                </div>
              </div>

              <form className="node-editor" onSubmit={saveNode}>
                <div className="editor-title"><span>Edit logic</span><strong>{logicNodes.find((node) => node.id === selectedNodeId)?.title}</strong></div>
                <label htmlFor="node-logic" className="sr-only">Behavior for selected logic block</label>
                <input id="node-logic" value={nodeDraft} onChange={(event) => setNodeDraft(event.target.value)} />
                <button type="submit">Save block</button>
              </form>

              <form className="canvas-command" onSubmit={applyChange}>
                <span aria-hidden="true">✦</span><label htmlFor="agent-change" className="sr-only">Change the selected logic block in plain language</label>
                <input id="agent-change" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Or tell AI how to change “${logicNodes.find((node) => node.id === selectedNodeId)?.title}”`} />
                <button type="submit">Apply with AI</button>
              </form>
            </section>

            <aside className={`live-test ${calling ? "is-calling" : ""}`} aria-label="Live agent test">
              <header className="live-header"><div><span className="live-pulse">⌁</span><strong>Live test</strong><i /></div><span>{callTime}</span></header>
              <div className="test-context"><span>{agentName} · {business.name}</span><small>{business.outcome}</small></div>
              <div className="voice-orb" aria-hidden="true"><span><i /><i /><i /><i /><i /><i /><i /><i /><i /></span></div>
              <div className="connected"><span>✓</span>{calling ? "Listening now" : "Connected"}</div>

              {calling ? (
                <div className="live-transcript" aria-live="polite">
                  {liveMessages.map((line, index) => <p className={line.role} key={`${line.content}-${index}`}><strong>{line.role === "assistant" ? agentName : "You"}</strong>{line.content}</p>)}
                  {chatBusy && <p className="assistant is-thinking"><strong>{agentName}</strong>Thinking…</p>}
                  {chatError && <p className="chat-error"><strong>Connection</strong>{chatError}</p>}
                </div>
              ) : <div className="test-prompt"><strong>Challenge the generated logic.</strong><span>Ask something unexpected, interrupt, or request a person.</span></div>}

              <div className="scenario-buttons studio-scenarios" aria-label="Test scenarios">
                <button type="button" disabled={chatBusy} aria-pressed={scenario === "pricing"} onClick={() => runScenario("pricing")}>Pricing</button>
                <button type="button" disabled={chatBusy} aria-pressed={scenario === "human"} onClick={() => runScenario("human")}>Human</button>
                <button type="button" disabled={chatBusy} aria-pressed={scenario === "arabic"} onClick={() => runScenario("arabic")}>Arabic</button>
              </div>
              {calling && <form className="live-chat-form" onSubmit={submitChat}><label className="sr-only" htmlFor="live-message">Talk to the agent</label><input id="live-message" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Type what you would say…" /><button type="submit" disabled={chatBusy || !chatInput.trim()}>Send</button></form>}
              <div className="call-controls"><button type="button" aria-label="Mute">♩</button><button type="button" aria-label="Keypad">⠿</button><button className="main-call" type="button" onClick={calling ? endCall : startCall} aria-label={calling ? "End test call" : "Start test call"}>{calling ? "■" : "●"}</button><button className="end-call" type="button" onClick={endCall} aria-label="End call">⌁</button></div>
              <div className="test-foot"><span>{updates.length} edits in this session</span><button type="button" onClick={() => setShowLaunch(true)}>Approve agent →</button></div>
            </aside>
          </section>
          <footer className="site-footer"><span>StrategyOS prototype · August 2026</span><span>The product does the work. The human approves decisions.</span></footer>
        </>
      )}

      {showLaunch && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowLaunch(false)}>
          <section className="launch-modal" role="dialog" aria-modal="true" aria-labelledby="launch-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close deployment dialog" onClick={() => setShowLaunch(false)}>×</button><span className="modal-kicker">Just-in-time setup</span>
            <h2 id="launch-title">The prototype is approved. Now connect only what it needs.</h2><p>No credentials were requested before you experienced the product.</p>
            <div className="connection-list"><button type="button"><span>01</span><div><strong>Phone line</strong><small>Receive and transfer calls</small></div><b>Connect →</b></button><button type="button"><span>02</span><div><strong>Calendar</strong><small>Offer and book available slots</small></div><b>Connect →</b></button><button type="button"><span>03</span><div><strong>CRM</strong><small>Save context and outcomes</small></div><b>Optional</b></button></div>
            <button className="approve-launch" type="button" onClick={() => setShowLaunch(false)}>Approve staged launch</button><small className="modal-footnote">Prototype only — no external systems will be connected.</small>
          </section>
        </div>
      )}
    </main>
  );
}

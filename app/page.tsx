"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Scenario = "opening" | "pricing" | "human" | "arabic";

const transcripts: Record<Scenario, { speaker: string; text: string }[]> = {
  opening: [
    { speaker: "Sara", text: "Hi, this is Sara from NextLevel.ai. How can I help today?" },
    { speaker: "You", text: "I want to understand whether this could handle our sales calls." },
    { speaker: "Sara", text: "Absolutely. I can qualify the caller, answer product questions, and book a consultation. What kind of call volume do you handle?" },
  ],
  pricing: [
    { speaker: "You", text: "What does it cost?" },
    { speaker: "Sara", text: "Plans start at $175 per month for 1,000 voice minutes. I can also arrange a tailored estimate based on your call volume." },
  ],
  human: [
    { speaker: "You", text: "I need to speak to a person." },
    { speaker: "Sara", text: "Of course. Before I transfer you, may I confirm your name and company so the specialist has the right context?" },
  ],
  arabic: [
    { speaker: "You", text: "Can we continue in Arabic?" },
    { speaker: "Sara", text: "بالتأكيد. يمكننا المتابعة بالعربية. كيف يمكنني مساعدتك اليوم؟" },
  ],
};

export default function Home() {
  const [calling, setCalling] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [scenario, setScenario] = useState<Scenario>("opening");
  const [draft, setDraft] = useState("");
  const [updates, setUpdates] = useState<string[]>([]);
  const [afterHours, setAfterHours] = useState(true);
  const [enterpriseTransfer, setEnterpriseTransfer] = useState(true);
  const [panel, setPanel] = useState<"evidence" | "activity">("evidence");
  const [showLaunch, setShowLaunch] = useState(false);

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

  function startCall() {
    setCalling(true);
    setSeconds(0);
    setScenario("opening");
  }

  function endCall() {
    setCalling(false);
    setSeconds(0);
  }

  function applyChange(event: FormEvent) {
    event.preventDefault();
    const change = draft.trim();
    if (!change) return;
    setUpdates((current) => [change, ...current]);
    setDraft("");
    setPanel("activity");
  }

  return (
    <main className="studio-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="NextLevel Agent Studio home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>NEXTLEVEL.AI</span>
          <span className="studio-label">Agent Studio</span>
        </a>
        <div className="session-state" aria-label="Session status">
          <span className="status-dot" />
          <span>Private prototype · autosaved</span>
        </div>
        <button className="launch-top" type="button" onClick={() => setShowLaunch(true)}>
          Connect &amp; go live
        </button>
      </header>

      <section className="workspace" id="top">
        <section className="builder">
          <div className="eyebrow">Outcome-first agent creation</div>
          <div className="hero-row">
            <div>
              <h1>Your Voice AI Agent is already built.</h1>
              <p className="hero-copy">
                No setup form. I researched the business, created a working first version,
                and surfaced only the decisions I could not safely infer.
              </p>
            </div>
            <div className="version-chip"><span>v1</span> Ready to test</div>
          </div>

          <article className="agent-message">
            <div className="agent-avatar" aria-hidden="true">N</div>
            <div className="agent-bubble">
              <div className="message-meta">NextLevel Builder · 18 seconds ago</div>
              <h2>I studied nextlevel.ai and built the first version.</h2>
              <p>
                Sara answers inbound calls, explains the three service packages,
                captures lead context, and offers a 30-minute consultation. English is
                primary; Arabic activates automatically when requested.
              </p>
              <div className="source-row" aria-label="Research summary">
                <button type="button" onClick={() => setPanel("evidence")}>12 pages read</button>
                <button type="button" onClick={() => setPanel("evidence")}>Pricing verified</button>
                <button type="button" onClick={() => setPanel("evidence")}>7 FAQs extracted</button>
              </div>
            </div>
          </article>

          <section className="decisions" aria-labelledby="decisions-title">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Needs your judgment</span>
                <h2 id="decisions-title">Two assumptions to confirm</h2>
              </div>
              <span className="section-count">2 decisions</span>
            </div>

            <div className="decision-row">
              <div>
                <strong>After-hours calls</strong>
                <p>Offer the next available consultation instead of transferring.</p>
              </div>
              <div className="segmented" aria-label="After-hours call behavior">
                <button type="button" aria-pressed={afterHours} onClick={() => setAfterHours(true)}>Keep</button>
                <button type="button" aria-pressed={!afterHours} onClick={() => setAfterHours(false)}>Change</button>
              </div>
            </div>

            <div className="decision-row">
              <div>
                <strong>Enterprise intent</strong>
                <p>Transfer qualified enterprise leads with the conversation summary.</p>
              </div>
              <div className="segmented" aria-label="Enterprise lead behavior">
                <button type="button" aria-pressed={enterpriseTransfer} onClick={() => setEnterpriseTransfer(true)}>Keep</button>
                <button type="button" aria-pressed={!enterpriseTransfer} onClick={() => setEnterpriseTransfer(false)}>Change</button>
              </div>
            </div>
          </section>

          <form className="command-bar" onSubmit={applyChange}>
            <span className="spark" aria-hidden="true">✦</span>
            <label htmlFor="agent-change" className="sr-only">Tell the agent what to change</label>
            <input
              id="agent-change"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder='Try “Make her warmer” or “Never quote prices”'
            />
            <button type="submit">Apply change</button>
          </form>
          <p className="command-hint">Changes are applied to the prototype immediately. Nothing goes live without approval.</p>
        </section>

        <aside className="prototype-panel" aria-label="Working agent prototype">
          <div className="panel-tabs" role="tablist" aria-label="Prototype details">
            <button role="tab" aria-selected={panel === "evidence"} onClick={() => setPanel("evidence")}>Evidence</button>
            <button role="tab" aria-selected={panel === "activity"} onClick={() => setPanel("activity")}>Activity</button>
          </div>

          {panel === "evidence" ? (
            <div className="evidence-list">
              <div className="evidence-intro"><span className="verified-mark">✓</span><div><strong>Source-backed configuration</strong><p>Every claim can be traced to the business website.</p></div></div>
              <article><span>01</span><div><strong>Service packages</strong><p>Q&amp;A Saver, Standard, Business</p><a href="https://nextlevel.ai" target="_blank" rel="noreferrer">nextlevel.ai/pricing ↗</a></div></article>
              <article><span>02</span><div><strong>Availability</strong><p>AI reception is positioned as 24/7.</p><a href="https://nextlevel.ai" target="_blank" rel="noreferrer">nextlevel.ai ↗</a></div></article>
              <article><span>03</span><div><strong>Language coverage</strong><p>English, Arabic and 30+ languages.</p><a href="https://nextlevel.ai" target="_blank" rel="noreferrer">nextlevel.ai/platform ↗</a></div></article>
            </div>
          ) : (
            <div className="activity-list" aria-live="polite">
              {updates.length === 0 ? (
                <div className="empty-activity"><span>✦</span><strong>No manual changes yet</strong><p>The prototype currently reflects researched defaults.</p></div>
              ) : updates.map((update, index) => (
                <article key={`${update}-${index}`}><span>v{updates.length - index + 1}</span><div><strong>Change applied</strong><p>“{update}”</p></div><time>now</time></article>
              ))}
            </div>
          )}

          <div className={`phone ${calling ? "is-calling" : ""}`}>
            <div className="phone-header">
              <div className="sara-avatar" aria-hidden="true">S</div>
              <div><strong>Sara</strong><span>AI receptionist · EN + AR</span></div>
              <div className="phone-state">{calling ? callTime : "Ready"}</div>
            </div>

            <div className="waveform" aria-hidden="true">
              {Array.from({ length: 17 }).map((_, index) => <i key={index} style={{ "--bar": index } as React.CSSProperties} />)}
            </div>

            {!calling ? (
              <div className="call-idle">
                <h3>Test before giving us your details.</h3>
                <p>Interrupt her, ask about pricing, request a human, or switch languages.</p>
              </div>
            ) : (
              <div className="call-live" aria-live="polite">
                <div className="scenario-buttons" aria-label="Test scenarios">
                  <button aria-pressed={scenario === "pricing"} onClick={() => setScenario("pricing")}>Ask pricing</button>
                  <button aria-pressed={scenario === "human"} onClick={() => setScenario("human")}>Request human</button>
                  <button aria-pressed={scenario === "arabic"} onClick={() => setScenario("arabic")}>Switch to Arabic</button>
                </div>
                <div className="transcript">
                  {transcripts[scenario].map((line, index) => (
                    <p key={`${line.text}-${index}`}><strong>{line.speaker}</strong>{line.text}</p>
                  ))}
                </div>
              </div>
            )}

            <button className={`call-button ${calling ? "end" : ""}`} type="button" onClick={calling ? endCall : startCall}>
              <span aria-hidden="true">{calling ? "■" : "●"}</span>
              {calling ? "End test" : "Run a test call"}
            </button>
          </div>
        </aside>
      </section>

      <footer className="site-footer">
        <span>StrategyOS prototype · August 2026</span>
        <span>The product does the work. The human approves decisions.</span>
      </footer>

      {showLaunch && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowLaunch(false)}>
          <section className="launch-modal" role="dialog" aria-modal="true" aria-labelledby="launch-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close deployment dialog" onClick={() => setShowLaunch(false)}>×</button>
            <span className="modal-kicker">Just-in-time setup</span>
            <h2 id="launch-title">The prototype is approved. Now connect only what it needs.</h2>
            <p>No credentials were requested before you experienced the product.</p>
            <div className="connection-list">
              <button type="button"><span>01</span><div><strong>Phone line</strong><small>Receive and transfer calls</small></div><b>Connect →</b></button>
              <button type="button"><span>02</span><div><strong>Calendar</strong><small>Offer and book available slots</small></div><b>Connect →</b></button>
              <button type="button"><span>03</span><div><strong>CRM</strong><small>Save lead context and outcomes</small></div><b>Optional</b></button>
            </div>
            <button className="approve-launch" type="button" onClick={() => setShowLaunch(false)}>Approve staged launch</button>
            <small className="modal-footnote">Prototype only — no external systems will be connected.</small>
          </section>
        </div>
      )}
    </main>
  );
}

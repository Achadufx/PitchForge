import { useState, useEffect } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

const API_URL = "";
const STEPS = ["upload", "describe", "review", "send"];
const FREE_LIMIT = 10;

function parseCsv(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  return lines.slice(1).filter(l => l.trim()).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const obj = {};
    headers.forEach((h, i) => (obj[h] = values[i] || ""));
    return obj;
  });
}

function StepIndicator({ current }) {
  const labels = ["Upload CSV", "Describe", "Review", "Send"];
  const currentIndex = STEPS.indexOf(current);
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
      {labels.map((label, i) => {
        const active = i === currentIndex;
        const done = currentIndex > i;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < labels.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "#10b981" : active ? "#6366f1" : "#1e293b", border: "2px solid " + (done ? "#10b981" : active ? "#6366f1" : "#334155"), color: done || active ? "#fff" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, transition: "all 0.2s" }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? "#6366f1" : done ? "#10b981" : "#475569", whiteSpace: "nowrap" }}>{label}</span>
            </div>
            {i < labels.length - 1 && <div style={{ flex: 1, height: 2, background: done ? "#10b981" : "#1e293b", margin: "0 6px", marginBottom: 16, transition: "all 0.3s" }} />}
          </div>
        );
      })}
    </div>
  );
}

function UploadStep({ onNext, pitchCount }) {
  const [investors, setInvestors] = useState([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (!file || !file.name.endsWith(".csv")) { setError("Please upload a .csv file"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCsv(e.target.result);
        if (!parsed[0]?.name || !parsed[0]?.email) { setError("CSV must have 'name' and 'email' columns"); return; }
        setInvestors(parsed); setError("");
      } catch { setError("Could not parse CSV."); }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: "#f1f5f9" }}>Upload your investor list</h2>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 13 }}>
        CSV needs: <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4, color: "#a5b4fc" }}>name</code>, <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4, color: "#a5b4fc" }}>email</code>, <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4, color: "#a5b4fc" }}>firm</code> (optional)
      </p>
      {pitchCount >= FREE_LIMIT && (
        <div style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 10, padding: 20, marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>🔒</div>
          <div style={{ fontWeight: 700, color: "#a78bfa", marginBottom: 6 }}>You've used your 10 free pitches</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Upgrade to keep sending personalized pitches to investors.</div>
          <button
  onClick={async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "starter", userId: session.user.id, userEmail: session.user.email }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }}
  style={{ background: "#7c3aed", color: "#fff", padding: "10px 24px", borderRadius: 8, fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}
>
  Upgrade — $19/mo →
</button>
<button
  onClick={async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "pro", userId: session.user.id, userEmail: session.user.email }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }}
  style={{ background: "transparent", color: "#a78bfa", padding: "10px 24px", borderRadius: 8, fontWeight: 700, fontSize: 14, border: "1px solid rgba(124,58,237,0.3)", cursor: "pointer", marginTop: 8 }}
>
  Go Pro — $49/mo →
</button>
        </div>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => document.getElementById("csv-input").click()}
        style={{ border: "2px dashed " + (dragging ? "#6366f1" : "#334155"), borderRadius: 12, padding: "44px 24px", textAlign: "center", cursor: "pointer", background: dragging ? "#1e1b4b" : "#0f172a", transition: "all 0.15s" }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
        <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>Drop CSV here or click to browse</div>
        <div style={{ fontSize: 12, color: "#475569" }}>Supports drag & drop</div>
        <input id="csv-input" type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
      </div>
      {error && <p style={{ color: "#f87171", marginTop: 12, fontSize: 13 }}>⚠ {error}</p>}
      {investors.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#4ade80", fontSize: 16 }}>✓</span>
            <span style={{ color: "#4ade80", fontWeight: 600, fontSize: 13 }}>{investors.length} investors ready</span>
          </div>
          <button onClick={() => onNext(investors)} disabled={pitchCount >= FREE_LIMIT} style={{ background: pitchCount >= FREE_LIMIT ? "#1e293b" : "#6366f1", color: pitchCount >= FREE_LIMIT ? "#475569" : "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: pitchCount >= FREE_LIMIT ? "not-allowed" : "pointer", width: "100%" }}>
            Continue with {investors.length} investors →
          </button>
        </div>
      )}
    </div>
  );
}

function DescribeStep({ onNext, onBack }) {
  const [startup, setStartup] = useState({ name: "", description: "", ask: "" });
  const valid = startup.name && startup.description && startup.ask;
  const fields = [
    { key: "name", label: "Startup name", placeholder: "e.g. ForcepX" },
    { key: "description", label: "What you do — be specific", placeholder: "e.g. We give patients cryptographic control over their medical records.", multiline: true },
    { key: "ask", label: "What you're raising", placeholder: "e.g. $500K pre-seed" },
  ];
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: "#f1f5f9" }}>Describe your startup</h2>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 13 }}>The more specific you are, the better the AI pitches.</p>
      {fields.map(({ key, label, placeholder, multiline }) => (
        <div key={key} style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
          {multiline
            ? <textarea value={startup[key]} onChange={(e) => setStartup({ ...startup, [key]: e.target.value })} placeholder={placeholder} rows={3} style={{ width: "100%", borderRadius: 8, border: "1px solid #1e293b", padding: "10px 12px", fontSize: 13, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: "#0f172a", color: "#e2e8f0" }} />
            : <input value={startup[key]} onChange={(e) => setStartup({ ...startup, [key]: e.target.value })} placeholder={placeholder} style={{ width: "100%", borderRadius: 8, border: "1px solid #1e293b", padding: "10px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#0f172a", color: "#e2e8f0" }} />
          }
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onBack} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 8, padding: "12px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>← Back</button>
        <button onClick={() => onNext(startup)} disabled={!valid} style={{ flex: 1, background: valid ? "#6366f1" : "#1e293b", color: valid ? "#fff" : "#475569", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: valid ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
          Generate Pitches ⚡
        </button>
      </div>
    </div>
  );
}

async function generateSingle(inv, startup) {
  const res = await fetch(API_URL + "/api/generate-pitch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ investorName: inv.name, firm: inv.firm || "", startupName: startup.name, description: startup.description, ask: startup.ask }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

function ReviewStep({ investors, startup, onNext, onBack, onPitchGenerated }) {
  const [pitches, setPitches] = useState([]);
  const [selected, setSelected] = useState([]);
  const [generating, setGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [regenerating, setRegenerating] = useState({});

  useEffect(() => {
    const generate = async () => {
      const results = [];
      for (let i = 0; i < investors.length; i++) {
        try {
          const data = await generateSingle(investors[i], startup);
          results.push({ ...investors[i], subject: data.subject, body: data.body, error: false });
          onPitchGenerated(1);
        } catch (err) {
          results.push({ ...investors[i], subject: "", body: "", error: err.message });
        }
        setProgress(i + 1);
      }
      setPitches(results);
      setSelected(results.map((_, i) => i));
      setGenerating(false);
    };
    generate();
  }, []);

  const handleRegenerate = async (i) => {
    setRegenerating(prev => ({ ...prev, [i]: true }));
    try {
      const data = await generateSingle(pitches[i], startup);
      setPitches(prev => { const u = [...prev]; u[i] = { ...u[i], subject: data.subject, body: data.body, error: false }; return u; });
    } catch (err) {
      setPitches(prev => { const u = [...prev]; u[i] = { ...u[i], error: err.message }; return u; });
    }
    setRegenerating(prev => ({ ...prev, [i]: false }));
  };

  if (generating) return (
    <div style={{ textAlign: "center", padding: "48px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
      <h3 style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>Crafting personalized pitches...</h3>
      <p style={{ color: "#475569", marginBottom: 28, fontSize: 13 }}>{progress} of {investors.length} done</p>
      <div style={{ background: "#1e293b", borderRadius: 99, height: 6, overflow: "hidden", maxWidth: 300, margin: "0 auto" }}>
        <div style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6)", height: "100%", borderRadius: 99, width: (investors.length ? (progress / investors.length) * 100 : 0) + "%", transition: "width 0.4s ease" }} />
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Review pitches</h2>
        <span style={{ fontSize: 12, color: "#475569" }}>{selected.length}/{pitches.length} selected</span>
      </div>
      <p style={{ color: "#64748b", marginBottom: 20, fontSize: 13 }}>Edit, regenerate, or deselect any pitch before sending.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20, maxHeight: 420, overflowY: "auto" }}>
        {pitches.map((pitch, i) => (
          <div key={i} style={{ border: "1px solid " + (selected.includes(i) ? "#4338ca" : "#1e293b"), borderRadius: 12, padding: 16, background: selected.includes(i) ? "#1e1b4b" : "#0f172a", transition: "all 0.15s" }}>
            <div style={{ display: "flex", gap: 12 }}>
              <input type="checkbox" checked={selected.includes(i)} onChange={() => setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])} style={{ marginTop: 2, accentColor: "#6366f1", width: 15, height: 15, flexShrink: 0, cursor: "pointer" }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>{pitch.name}</span>
                    <span style={{ color: "#475569", fontSize: 12, marginLeft: 8 }}>{pitch.firm || ""}</span>
                  </div>
                  <button onClick={() => handleRegenerate(i)} disabled={regenerating[i]} style={{ background: "none", border: "1px solid #334155", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: regenerating[i] ? "#475569" : "#94a3b8", cursor: regenerating[i] ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                    {regenerating[i] ? "..." : "🔄 Redo"}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "#475569", marginBottom: 10 }}>{pitch.email}</div>
                {pitch.error
                  ? <div style={{ color: "#f87171", fontSize: 12 }}>⚠ {pitch.error}</div>
                  : <>
                    <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 600, marginBottom: 8 }}>Subject: {pitch.subject}</div>
                    <div style={{ fontSize: 13, color: "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.6, background: "#0a0f1e", borderRadius: 8, padding: 12 }}>{pitch.body}</div>
                  </>
                }
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 8, padding: "12px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>← Back</button>
        <button onClick={() => onNext(pitches.filter((_, i) => selected.includes(i)))} disabled={selected.length === 0} style={{ flex: 1, background: selected.length > 0 ? "#6366f1" : "#1e293b", color: selected.length > 0 ? "#fff" : "#475569", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: selected.length > 0 ? "pointer" : "not-allowed" }}>
          Send {selected.length} Pitch{selected.length !== 1 ? "es" : ""} →
        </button>
      </div>
    </div>
  );
}

function SendStep({ pitches, onRestart }) {
  const [senderName, setSenderName] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);

  const handleSend = async () => {
    if (!senderName) return;
    setSending(true);
    try {
      const res = await fetch(API_URL + "/api/send-pitches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitches, senderName }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      setResults(pitches.map(p => ({ ...p, success: false, error: err.message })));
    }
    setSending(false);
    setDone(true);
  };

  if (done) {
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🚀</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", marginBottom: 8 }}>{succeeded} pitch{succeeded !== 1 ? "es" : ""} sent!</h2>
        {failed.length > 0 && failed.map((r, i) => <p key={i} style={{ color: "#f87171", fontSize: 13 }}>⚠ {r.name}: {r.error}</p>)}
        <p style={{ color: "#475569", marginBottom: 36, fontSize: 14 }}>Now sit back and let the replies come in.</p>
        <button onClick={onRestart} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Start new campaign</button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: "#f1f5f9" }}>Ready to launch</h2>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 13 }}>Your name will appear as the sender to investors.</p>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Your name</label>
        <input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="e.g. Samuel" style={{ width: "100%", borderRadius: 8, border: "1px solid #1e293b", padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#0f172a", color: "#e2e8f0" }} />
      </div>
      <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#4ade80", display: "flex", alignItems: "center", gap: 8 }}>
        <span>✓</span><span>{pitches.length} personalized pitch{pitches.length !== 1 ? "es" : ""} queued and ready</span>
      </div>
      <button onClick={handleSend} disabled={sending || !senderName} style={{ width: "100%", background: (sending || !senderName) ? "#1e293b" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: (sending || !senderName) ? "#475569" : "#fff", border: "none", borderRadius: 8, padding: "14px 28px", fontWeight: 700, fontSize: 15, cursor: (sending || !senderName) ? "not-allowed" : "pointer" }}>
        {sending ? "Sending..." : "🚀 Send " + pitches.length + " Pitch" + (pitches.length !== 1 ? "es" : "")}
      </button>
    </div>
  );
}

export default function App() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [pitchCount, setPitchCount] = useState(0);
  const [step, setStep] = useState("upload");
  const [investors, setInvestors] = useState([]);
  const [startup, setStartup] = useState(null);
  const [finalPitches, setFinalPitches] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
      const count = parseInt(localStorage.getItem("pitches_" + session.user.id) || "0");
      setPitchCount(count);
      setAuthChecking(false);
    });
  }, []);

  const incrementPitchCount = (n = 1) => {
    if (!user) return;
    const newCount = pitchCount + n;
    setPitchCount(newCount);
    localStorage.setItem("pitches_" + user.id, newCount.toString());
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const restart = () => { setStep("upload"); setInvestors([]); setStartup(null); setFinalPitches([]); };

  if (authChecking) return (
    <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, fontFamily: "Inter, system-ui" }}>Loading...</div>
    </div>
  );

  return (
    <>
      <Head>
        <title>PitchWire — AI investor outreach</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#020817", fontFamily: "'Inter', system-ui, sans-serif", padding: "40px 16px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>⚡</span>
              <span style={{ fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg,#6366f1,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.5px" }}>PitchWire</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: "#475569" }}>{FREE_LIMIT - pitchCount > 0 ? (FREE_LIMIT - pitchCount) + " free pitches left" : "Free limit reached"}</span>
              {user && (
                <button onClick={handleSignOut} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Sign out</button>
              )}
            </div>
          </div>
          <div style={{ background: "#0f172a", borderRadius: 16, padding: 28, border: "1px solid #1e293b", boxShadow: "0 0 40px rgba(99,102,241,0.08)" }}>
            <StepIndicator current={step} />
            {step === "upload" && <UploadStep onNext={(inv) => { setInvestors(inv); setStep("describe"); }} pitchCount={pitchCount} />}
            {step === "describe" && <DescribeStep onNext={(s) => { setStartup(s); setStep("review"); }} onBack={() => setStep("upload")} />}
            {step === "review" && <ReviewStep investors={investors} startup={startup} onNext={(p) => { setFinalPitches(p); setStep("send"); }} onBack={() => setStep("describe")} onPitchGenerated={incrementPitchCount} />}
            {step === "send" && <SendStep pitches={finalPitches} onRestart={restart} />}
          </div>
          <p style={{ textAlign: "center", color: "#1e293b", fontSize: 11, marginTop: 20 }}>Powered by Groq · PitchWire</p>
        </div>
      </div>
    </>
  );
}

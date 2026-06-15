import { useState, useEffect } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

const API_URL = "";
const STEPS = ["upload", "describe", "review", "send"];

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
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: done ? "#10b981" : active ? "#6366f1" : "#1e293b",
                border: `2px solid ${done ? "#10b981" : active ? "#6366f1" : "#334155"}`,
                color: done || active ? "#fff" : "#64748b",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, transition: "all 0.2s",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? "#6366f1" : done ? "#10b981" : "#475569", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? "#10b981" : "#1e293b", margin: "0 6px", marginBottom: 16, transition: "all 0.3s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function UploadStep({ onNext }) {
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
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 13 }}>CSV needs: <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4, color: "#a5b4fc" }}>name</code>, <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4, color: "#a5b4fc" }}>email</code>, <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4, color: "#a5b4fc" }}>firm</code> (optional)</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => document.getElementById("csv-input").click()}
        style={{
          border: `2px dashed ${dragging ? "#6366f1" : "#334155"}`,
          borderRadius: 12, padding: "44px 24px", textAlign: "center",
          cursor: "pointer", background: dragging ? "#1e1b4b" : "#0f172a",
          transition: "all 0.15s",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
        <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>Drop CSV here or click to browse</div>
        <div style={{ fontSize: 12, color: "#475569" }}>Supports drag & drop</div>
        <input id="csv-input" type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {error && <p style={{ color: "#f87171", marginTop: 12, fontSize: 13 }}>⚠️ {error}</p>}

      {investors.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#4ade80", fontSize: 16 }}>✓</span>
            <span style={{ color: "#4ade80", fontWeight: 600, fontSize: 13 }}>{investors.length} investors ready</span>
          </div>
          <div style={{ maxHeight: 160, overflowY: "auto", borderRadius: 8, border: "1px solid #1e293b", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {["Name", "Email", "Firm"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#475569", fontWeight: 600, borderBottom: "1px solid #1e293b" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {investors.map((inv, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #0f172a" }}>
                    <td style={{ padding: "7px 12px", color: "#e2e8f0" }}>{inv.name}</td>
                    <td style={{ padding: "7px 12px", color: "#64748b" }}>{inv.email}</td>
                    <td style={{ padding: "7px 12px", color: "#64748b" }}>{inv.firm || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => onNext(investors)} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", letterSpacing: "0.3px" }}>
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
    { key: "description", label: "What you do — be specific, no jargon", placeholder: "e.g. We give patients cryptographic control over their medical records. Doctors request access, patients approve it on their phone.", multiline: true },
    { key: "ask", label: "What you're raising", placeholder: "e.g. $500K pre-seed to onboard 10 hospitals in Nigeria" },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: "#f1f5f9" }}>Describe your startup</h2>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 13 }}>The more specific you are, the better the AI pitches.</p>

      {fields.map(({ key, label, placeholder, multiline }) => (
        <div key={key} style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
          {multiline
            ? <textarea value={startup[key]} onChange={(e) => setStartup({ ...startup, [key]: e.target.value })} placeholder={placeholder} rows={3}
                style={{ width: "100%", borderRadius: 8, border: "1px solid #1e293b", padding: "10px 12px", fontSize: 13, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: "#0f172a", color: "#e2e8f0" }} />
            : <input value={startup[key]} onChange={(e) => setStartup({ ...startup, [key]: e.target.value })} placeholder={placeholder}
                style={{ width: "100%", borderRadius: 8, border: "1px solid #1e293b", padding: "10px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#0f172a", color: "#e2e8f0" }} />
          }
        </div>
      ))}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onBack} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 8, padding: "12px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>← Back</button>
        <button onClick={() => onNext(startup)} disabled={!valid} style={{ flex: 1, background: valid ? "#6366f1" : "#1e293b", color: valid ? "#fff" : "#475569", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: valid ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
          Generate Pitches ⚡️
        </button>
      </div>
    </div>
  );
}

async function generateSingle(inv, startup) {
  const res = await fetch(`${API_URL}/api/generate-pitch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ investorName: inv.name, firm: inv.firm || "", startupName: startup.name, description: startup.description, ask: startup.ask }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

function ReviewStep({ investors, startup, onNext, onBack }) {
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

  const toggleSelect = (i) => setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  if (generating) return (
    <div style={{ textAlign: "center", padding: "48px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚡️</div>
      <h3 style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>Crafting personalized pitches...</h3>
      <p style={{ color: "#475569", marginBottom: 28, fontSize: 13 }}>{progress} of {investors.length} done</p>
      <div style={{ background: "#1e293b", borderRadius: 99, height: 6, overflow: "hidden", maxWidth: 300, margin: "0 auto" }}>
        <div style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)", height: "100%", borderRadius: 99, width: `${investors.length ? (progress / investors.length) * 100 : 0}%`, transition: "width 0.4s ease" }} />
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
          <div key={i} style={{
            border: `1px solid ${selected.includes(i) ? "#4338ca" : "#1e293b"}`,
            borderRadius: 12, padding: 16, background: selected.includes(i) ? "#1e1b4b" : "#0f172a",
            transition: "all 0.15s",
          }}>
            <div style={{ display: "flex", gap: 12 }}>
              <input type="checkbox" checked={selected.includes(i)} onChange={() => toggleSelect(i)}
                style={{ marginTop: 2, accentColor: "#6366f1", width: 15, height: 15, flexShrink: 0, cursor: "pointer" }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>{pitch.name}</span>
                    <span style={{ color: "#475569", fontSize: 12, marginLeft: 8 }}>{pitch.firm || ""}</span>
                  </div>
                  <button onClick={() => handleRegenerate(i)} disabled={regenerating[i]}
                    style={{ background: "none", border: "1px solid #334155", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: regenerating[i] ? "#475569" : "#94a3b8", cursor: regenerating[i] ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                    {regenerating[i] ? "..." : "🔄 Redo"}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "#475569", marginBottom: 10 }}>{pitch.email}</div>

                {pitch.error ? (
                  <div style={{ color: "#f87171", fontSize: 12 }}>⚠️ {pitch.error}</div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 600, marginBottom: 8 }}>
                      Subject: {pitch.subject}
                    </div>
                    <div style={{ fontSize: 13, color: "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.6, background: "#0a0f1e", borderRadius: 8, padding: 12 }}>
                      {pitch.body}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 8, padding: "12px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>← Back</button>
        <button onClick={() => onNext(pitches.filter((_, i) => selected.includes(i)))} disabled={selected.length === 0}
          style={{ flex: 1, background: selected.length > 0 ? "#6366f1" : "#1e293b", color: selected.length > 0 ? "#fff" : "#475569", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: selected.length > 0 ? "pointer" : "not-allowed" }}>
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
      const res = await fetch(`${API_URL}/api/send-pitches`, {
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
        {failed.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {failed.map((r, i) => <p key={i} style={{ color: "#f87171", fontSize: 13 }}>⚠️ {r.name}: {r.error}</p>)}
          </div>
        )}
        <p style={{ color: "#475569", marginBottom: 36, fontSize: 14 }}>Now sit back and let the replies come in.</p>
        <button onClick={onRestart} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Start new campaign
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: "#f1f5f9" }}>Ready to launch</h2>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 13 }}>Your name will appear as the sender to investors.</p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Your name</label>
        <input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="e.g. Samuel"
          style={{ width: "100%", borderRadius: 8, border: "1px solid #1e293b", padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#0f172a", color: "#e2e8f0" }} />
      </div>

      <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#4ade80", display: "flex", alignItems: "center", gap: 8 }}>
        <span>✓</span>
        <span>{pitches.length} personalized pitch{pitches.length !== 1 ? "es" : ""} queued and ready</span>
      </div>

      <button onClick={handleSend} disabled={sending || !senderName} style={{
        width: "100%", background: (sending || !senderName) ? "#1e293b" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: (sending || !senderName) ? "#475569" : "#fff", border: "none", borderRadius: 8,
        padding: "14px 28px", fontWeight: 700, fontSize: 15, cursor: (sending || !senderName) ? "not-allowed" : "pointer",
        letterSpacing: "0.3px",
      }}>
        {sending ? "Sending..." : `🚀 Send ${pitches.length} Pitch${pitches.length !== 1 ? "es" : ""}`}
      </button>
    </div>
  );
}

export default function PitchWire() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [pitchCount, setPitchCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session` } }) => {
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
      const count = parseInt(localStorage.getItem(`pitches_${session.user.id}) || "0");
      setPitchCount(count);
      setAuthChecking(false);
    });
  }, []);

  const incrementPitchCount = (n = 1) => {
    if (!user) return;
    const newCount = pitchCount + n;
    setPitchCount(newCount);
    localStorage.setItem(`pitches_${user.id}`, newCount.toString());
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authChecking) return (
    <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, fontFamily: "Inter, system-ui" }}>Loading...</div>
    </div>
  );

  const FREE_LIMIT = 10;
  const isAtLimit = pitchCount >= FREE_LIMIT;
  const [step, setStep] = useState("upload");
  const [investors, setInvestors] = useState([]);
  const [startup, setStartup] = useState(null);
  const [finalPitches, setFinalPitches] = useState([]);
  const restart = () => { setStep("upload"); setInvestors([]); setStartup(null); setFinalPitches([]); };

  return (
    <>
      <Head>
        <title>PitchWire — AI investor outreach</title>
        <meta name="description" content="Upload investors. Describe your startup. Send personalized pitches in minutes." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#020817", fontFamily: "'Inter', system-ui, sans-serif", padding: "40px 16px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.5px" }}>PitchWire</span>
            </a>
            <p style={{ color: "#475569", fontSize: 13 }}>AI-powered investor outreach for founders</p>
          </div>

          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "32px 28px" }}>
            <StepIndicator current={step} />

            {step === "upload" && (
              <UploadStep onNext={(inv) => { setInvestors(inv); setStep("describe"); }} />
            )}
            {step === "describe" && (
              <DescribeStep
                onNext={(s) => { setStartup(s); setStep("review"); }}
                onBack={() => setStep("upload")}
              />
            )}
            {step === "review" && (
              <ReviewStep
                investors={investors}
                startup={startup}
                onNext={(p) => { setFinalPitches(p); setStep("send"); }}
                onBack={() => setStep("describe")}
              />
            )}
            {step === "send" && (
              <SendStep pitches={finalPitches} onRestart={restart} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

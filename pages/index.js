import { useState, useEffect } from "react";
import Head from "next/head";

// Empty string = same-origin API routes on Vercel (no separate backend needed)
const API_URL = "";

const STEPS = ["upload", "describe", "review", "send"];

function parseCsv(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const obj = {};
    headers.forEach((h, i) => (obj[h] = values[i] || ""));
    return obj;
  });
}

function StepIndicator({ current }) {
  const labels = ["Upload CSV", "Describe Startup", "Review Pitches", "Send"];
  return (
    <div style={{ display: "flex", gap: 0, marginBottom: 40 }}>
      {labels.map((label, i) => {
        const active = i === STEPS.indexOf(current);
        const done = STEPS.indexOf(current) > i;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: done || active ? 1 : 0.35 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: done ? "#00C875" : active ? "#0057FF" : "#e2e8f0",
                  color: done || active ? "#fff" : "#94a3b8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {done ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? "#0057FF" : "#64748b" }}>
                  {label}
                </span>
              </div>
            </div>
            {i < labels.length - 1 && (
              <div style={{ width: 24, height: 1, background: done ? "#00C875" : "#e2e8f0", flexShrink: 0 }} />
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
        if (!parsed[0]?.name || !parsed[0]?.email) {
          setError("CSV must have 'name' and 'email' columns. Optional: 'firm'"); return;
        }
        setInvestors(parsed); setError("");
      } catch { setError("Could not parse CSV. Check the format."); }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>Upload your investor list</h2>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>
        CSV with columns:{" "}
        <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>name</code>,{" "}
        <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>email</code>,{" "}
        <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>firm</code> (optional)
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => document.getElementById("csv-input").click()}
        style={{
          border: `2px dashed ${dragging ? "#0057FF" : "#cbd5e1"}`, borderRadius: 12,
          padding: "48px 24px", textAlign: "center", cursor: "pointer",
          background: dragging ? "#eff6ff" : "#f8fafc", transition: "all 0.15s",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
        <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>Drop your CSV here</div>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>or click to browse</div>
        <input id="csv-input" type="file" accept=".csv" style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {error && <p style={{ color: "#ef4444", marginTop: 12, fontSize: 13 }}>{error}</p>}

      {investors.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8,
            padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
          }}>
            <span style={{ color: "#16a34a", fontSize: 18 }}>✓</span>
            <span style={{ color: "#15803d", fontWeight: 600 }}>{investors.length} investors loaded</span>
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Name", "Email", "Firm"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {investors.slice(0, 5).map((inv, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", color: "#0f172a" }}>{inv.name}</td>
                    <td style={{ padding: "8px 12px", color: "#64748b" }}>{inv.email}</td>
                    <td style={{ padding: "8px 12px", color: "#64748b" }}>{inv.firm || "—"}</td>
                  </tr>
                ))}
                {investors.length > 5 && (
                  <tr><td colSpan={3} style={{ padding: "8px 12px", color: "#94a3b8", fontSize: 12 }}>+{investors.length - 5} more</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <button onClick={() => onNext(investors)} style={{
            marginTop: 16, background: "#0057FF", color: "#fff", border: "none",
            borderRadius: 8, padding: "12px 28px", fontWeight: 600, fontSize: 15,
            cursor: "pointer", width: "100%",
          }}>Continue →</button>
        </div>
      )}
    </div>
  );
}

function DescribeStep({ onNext, onBack }) {
  const [startup, setStartup] = useState({ name: "", description: "", ask: "" });
  const valid = startup.name && startup.description && startup.ask;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>Tell us about your startup</h2>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>This is what the AI will personalize each pitch from.</p>

      {[
        { key: "name", label: "Startup name", placeholder: "e.g. ForcepX" },
        { key: "description", label: "What you do (2-3 sentences)", placeholder: "e.g. We are a patient-governed medical data infrastructure. Patients control who accesses their records using end-to-end encryption.", multiline: true },
        { key: "ask", label: "What you're raising / looking for", placeholder: "e.g. $500K pre-seed to expand to 10 hospitals" },
      ].map(({ key, label, placeholder, multiline }) => (
        <div key={key} style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 6 }}>{label}</label>
          {multiline ? (
            <textarea value={startup[key]} onChange={(e) => setStartup({ ...startup, [key]: e.target.value })}
              placeholder={placeholder} rows={3}
              style={{ width: "100%", borderRadius: 8, border: "1px solid #d1d5db", padding: "10px 12px", fontSize: 14, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          ) : (
            <input value={startup[key]} onChange={(e) => setStartup({ ...startup, [key]: e.target.value })}
              placeholder={placeholder}
              style={{ width: "100%", borderRadius: 8, border: "1px solid #d1d5db", padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          )}
        </div>
      ))}

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onBack} style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 8, padding: "12px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>← Back</button>
        <button onClick={() => onNext(startup)} disabled={!valid} style={{
          flex: 1, background: valid ? "#0057FF" : "#cbd5e1", color: "#fff", border: "none",
          borderRadius: 8, padding: "12px 28px", fontWeight: 600, fontSize: 15, cursor: valid ? "pointer" : "not-allowed",
        }}>Generate Pitches →</button>
      </div>
    </div>
  );
}

function ReviewStep({ investors, startup, onNext, onBack }) {
  const [pitches, setPitches] = useState([]);
  const [selected, setSelected] = useState([]);
  const [generating, setGenerating] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const generate = async () => {
      setGenerating(true);
      const results = [];
      for (let i = 0; i < investors.length; i++) {
        const inv = investors[i];
        try {
          const res = await fetch(`${API_URL}/api/generate-pitch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              investorName: inv.name,
              firm: inv.firm || "",
              startupName: startup.name,
              description: startup.description,
              ask: startup.ask,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          results.push({ ...inv, subject: data.subject, body: data.body });
        } catch (err) {
          results.push({ ...inv, subject: `Quick intro, ${inv.name}`, body: `Failed to generate: ${err.message}` });
        }
        setProgress(i + 1);
      }
      setPitches(results);
      setSelected(results.map((_, i) => i));
      setGenerating(false);
    };
    generate();
  }, []);

  const toggleSelect = (i) => setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  if (generating) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚡</div>
        <h3 style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Generating personalized pitches...</h3>
        <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>{progress} of {investors.length} done</p>
        <div style={{ background: "#e2e8f0", borderRadius: 99, height: 6, overflow: "hidden" }}>
          <div style={{ background: "#0057FF", height: "100%", borderRadius: 99, width: `${(progress / investors.length) * 100}%`, transition: "width 0.3s" }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>Review your pitches</h2>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>{selected.length} of {pitches.length} selected. Uncheck any you don't want to send.</p>

      <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {pitches.map((pitch, i) => (
          <div key={i} style={{
            border: `1px solid ${selected.includes(i) ? "#bfdbfe" : "#e2e8f0"}`, borderRadius: 10, padding: 16,
            background: selected.includes(i) ? "#eff6ff" : "#fafafa",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <input type="checkbox" checked={selected.includes(i)} onChange={() => toggleSelect(i)}
                style={{ marginTop: 3, accentColor: "#0057FF", width: 16, height: 16, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{pitch.name}</div>
<div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>{pitch.email}{pitch.firm ? ` · ${pitch.firm}` : ""}</div>
<div style={{ fontSize: 12, color: "#0057FF", fontWeight: 600, marginBottom: 4 }}>Subject: {pitch.subject}</div>
<div style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{pitch.body}</div>
<button
  onClick={async () => {
    const updated = [...pitches];
    updated[i] = { ...updated[i], body: "Regenerating...", subject: "..." };
    setPitches(updated);
    try {
      const res = await fetch(`${API_URL}/api/generate-pitch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorName: pitch.name, firm: pitch.firm || "", startupName: startup.name, description: startup.description, ask: startup.ask }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updated[i] = { ...updated[i], subject: data.subject, body: data.body };
    } catch (err) {
      updated[i] = { ...updated[i], body: `Failed: ${err.message}` };
    }
    setPitches([...updated]);
  }}
  style={{ marginTop: 8, background: "none", border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#64748b", cursor: "pointer" }}
>
  🔄 Regenerate
</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onBack} style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 8, padding: "12px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>← Back</button>
        <button onClick={() => onNext(pitches.filter((_, i) => selected.includes(i)))} disabled={selected.length === 0} style={{
          flex: 1, background: selected.length > 0 ? "#0057FF" : "#cbd5e1", color: "#fff", border: "none",
          borderRadius: 8, padding: "12px 28px", fontWeight: 600, fontSize: 15, cursor: selected.length > 0 ? "pointer" : "not-allowed",
        }}>Send {selected.length} Pitch{selected.length !== 1 ? "es" : ""} →</button>
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
      setResults(pitches.map(p => ({ name: p.name, email: p.email, success: false, error: err.message })));
    }
    setSending(false);
    setDone(true);
  };

  if (done) {
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{succeeded} pitch{succeeded !== 1 ? "es" : ""} sent!</h2>
        {failed > 0 && <p style={{ color: "#ef4444", marginBottom: 8, fontSize: 14 }}>{failed} failed to send.</p>}
        <p style={{ color: "#64748b", marginBottom: 32, fontSize: 14 }}>Now sit back and wait for replies.</p>
        <button onClick={onRestart} style={{ background: "#0057FF", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
          Start a new campaign
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>Ready to send</h2>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>Emails will be sent from your PitchBlast account. Just enter your name.</p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 6 }}>Your name (shown as sender)</label>
        <input value={senderName} onChange={(e) => setSenderName(e.target.value)}
          placeholder="e.g. Samuel"
          style={{ width: "100%", borderRadius: 8, border: "1px solid #d1d5db", padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
      </div>

      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#15803d" }}>
        ✓ {pitches.length} personalized pitch{pitches.length !== 1 ? "es" : ""} ready to go
      </div>

      <button onClick={handleSend} disabled={sending || !senderName} style={{
        width: "100%", background: (sending || !senderName) ? "#cbd5e1" : "#0057FF",
        color: "#fff", border: "none", borderRadius: 8, padding: "13px 28px",
        fontWeight: 700, fontSize: 15, cursor: (sending || !senderName) ? "not-allowed" : "pointer",
      }}>
        {sending ? "Sending..." : `Send ${pitches.length} Pitch${pitches.length !== 1 ? "es" : ""} 🚀`}
      </button>
    </div>
  );
}

export default function PitchBlast() {
  const [step, setStep] = useState("upload");
  const [investors, setInvestors] = useState([]);
  const [startup, setStartup] = useState(null);
  const [finalPitches, setFinalPitches] = useState([]);

  const restart = () => { setStep("upload"); setInvestors([]); setStartup(null); setFinalPitches([]); };

  return (
    <>
      <Head>
        <title>PitchWire — AI-powered investor outreach</title>
        <meta name="description" content="Upload investors. Describe your startup. Send personalized pitches in minutes." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif", padding: "40px 16px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>⚡</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>PitchWire</span>
            </div>
            <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Upload investors. Describe your startup. Send personalized pitches in minutes.</p>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
            <StepIndicator current={step} />
            {step === "upload" && <UploadStep onNext={(inv) => { setInvestors(inv); setStep("describe"); }} />}
            {step === "describe" && <DescribeStep onNext={(s) => { setStartup(s); setStep("review"); }} onBack={() => setStep("upload")} />}
            {step === "review" && <ReviewStep investors={investors} startup={startup} onNext={(p) => { setFinalPitches(p); setStep("send"); }} onBack={() => setStep("describe")} />}
            {step === "send" && <SendStep pitches={finalPitches} onRestart={restart} />}
          </div>

          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 20 }}>
            Powered by Groq AI · PitchWire
          </p>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";
import DocumentUpload from "../components/DocumentUpload";
import { useRouter } from "next/router";

const API_URL = "";
const STEPS = ["upload", "describe", "review", "send"];
const PLAN_LIMITS = { free: 10, starter: 100, pro: 500 };
const PLAN_DOC_LIMITS = { free: 3, starter: 999, pro: 999 };

function parseCsv(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const obj = {};
      headers.forEach((h, i) => (obj[h] = values[i] || ""));
      return obj;
    });
}

function Sidebar({ activeTab, setActiveTab, user, plan, pitchCount, onSignOut, }) {
  const limit = PLAN_LIMITS[plan] || 10;
  const pct = Math.min((pitchCount / limit) * 100, 100);
  const tabs = [
    { key: "campaign", icon: "⚡", label: "Campaign" },
    { key: "investors", icon: "🎯", label: "Investors" },
    { key: "account", icon: "👤", label: "Account" },
  ];
  return (
    <div style={{ width: 220, background: "#080808", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 50, }} > <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", }} > <div style={{ display: "flex", alignItems: "center", gap: 8 }}> <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, }} > ⚡ </div> <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.4px", }} > PitchWire </span> </div> </div> <nav style={{ padding: "12px 10px", flex: 1 }}> {tabs.map((tab) => ( <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: activeTab === tab.key ? "rgba(124,58,237,0.15)" : "transparent", color: activeTab === tab.key ? "#a78bfa" : "rgba(255,255,255,0.4)", fontFamily: "inherit", fontSize: 14, fontWeight: activeTab === tab.key ? 700 : 500, marginBottom: 2, transition: "all 0.15s", textAlign: "left", }} > <span style={{ fontSize: 16 }}>{tab.icon}</span> {tab.label} {activeTab === tab.key && ( <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "#a78bfa", }} /> )} </button> ))} </nav> <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.07)", }} > <div style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px", }} > <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, }} > <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", }} > {plan} plan </span> <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}> {pitchCount}/{limit} </span> </div> <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 4, overflow: "hidden", marginBottom: 12, }} > <div style={{ background: pct >= 90 ? "#f87171" : "linear-gradient(90deg,#7c3aed,#a78bfa)", height: "100%", borderRadius: 99, width: pct + "%", transition: "width 0.3s", }} /> </div> {plan === "free" && ( <button onClick={() => setActiveTab("account")} style={{ width: "100%", padding: "8px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#7c3aed", color: "#fff", border: "none", }} > Upgrade → </button> )} {plan === "starter" && ( <button onClick={() => setActiveTab("account")} style={{ width: "100%", padding: "8px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)", }} > Upgrade to Pro → </button> )} {plan === "pro" && ( <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, textAlign: "center", }} > ✓ Pro — Full access </div> )} </div> <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "8px 4px", }} > <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0, }} > {user?.email?.[0]?.toUpperCase() || "U"} </div> <div style={{ flex: 1, minWidth: 0 }}> <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", }} > {user?.user_metadata?.full_name || "Founder"} </div> <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", }} > {user?.email} </div> </div> <button onClick={onSignOut} title="Sign out" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", fontSize: 14, padding: 4, }} > → </button> </div> </div> </div>
  );
}

function StepIndicator({ current }) {
  const labels = ["Upload CSV", "Describe", "Review", "Send"];
  const currentIndex = STEPS.indexOf(current);
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}> {labels.map((label, i) => { const active = i === currentIndex; const done = currentIndex > i; return ( <div key={i} style={{ display: "flex", alignItems: "center", flex: i < labels.length - 1 ? 1 : "none", }} > <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, }} > <div style={{ width: 26, height: 26, borderRadius: "50%", background: done ? "#10b981" : active ? "#7c3aed" : "#1e293b", border: "2px solid " + (done ? "#10b981" : active ? "#7c3aed" : "#334155"), color: done || active ? "#fff" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, }} > {done ? "✓" : i + 1} </div> <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, color: active ? "#a78bfa" : done ? "#10b981" : "#475569", whiteSpace: "nowrap", }} > {label} </span> </div> {i < labels.length - 1 && ( <div style={{ flex: 1, height: 2, background: done ? "#10b981" : "#1e293b", margin: "0 6px", marginBottom: 14, }} /> )} </div> ); })} </div>
  );
}

function DocumentUpload({ onComplete, plan }) {
  const [docs, setDocs] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const docLimit = PLAN_DOC_LIMITS[plan] || 3;

  const ACCEPTED = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  const ACCEPTED_EXT = [".pdf", ".docx", ".txt"];

  const handleFiles = async (files) => {
    const arr = Array.from(files);
    if (docs.length + arr.length > docLimit) {
      setError(
        "You can upload up to " + docLimit + " documents on your current plan."
      );
      return;
    }
    const newDocs = [];
    for (const file of arr) {
      if (
        !ACCEPTED.includes(file.type) &&
        !ACCEPTED_EXT.some((ext) => file.name.endsWith(ext))
      ) {
        setError("Only PDF, DOCX, and TXT files are supported.");
        continue;
      }
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result.split(",")[1]);
        reader.readAsDataURL(file);
      });
      newDocs.push({
        name: file.name,
        base64,
        mimeType: file.type,
        status: "pending",
        text: "",
      });
    }
    setDocs((prev) => [...prev, ...newDocs]);
    setError("");
  };

  const removeDoc = (i) =>
    setDocs((prev) => prev.filter((_, idx) => idx !== i));

  const extractAndAnalyze = async () => {
    if (docs.length === 0) return;
    setAnalyzing(true);
    setError("");

    try {
      const extracted = [];
      const updated = [...docs];

      for (let i = 0; i < docs.length; i++) {
        updated[i] = { ...updated[i], status: "extracting" };
        setDocs([...updated]);

        const res = await fetch("/api/extract-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64: docs[i].base64,
            mimeType: docs[i].mimeType,
            name: docs[i].name,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        updated[i] = { ...updated[i], text: data.text, status: "done" };
        setDocs([...updated]);
        extracted.push({ name: docs[i].name, text: data.text });
      }

      const analysisRes = await fetch("/api/analyze-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: extracted }),
      });
      const analysisData = await analysisRes.json();
      if (!analysisRes.ok) throw new Error(analysisData.error);

      onComplete(analysisData.profile);
    } catch (err) {
      setError("Failed to analyze documents: " + err.message);
    }
    setAnalyzing(false);
  };

  return (
    <div> <div style={{ marginBottom: 20 }}> <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 4, }} > Upload your startup documents </h3> <p style={{ fontSize: 12, color: "#64748b" }}> PDF, DOCX, or TXT — pitch deck, whitepaper, executive summary, business plan, anything. {plan === "free" && ( <span style={{ color: "#f87171" }}> {" "} Free plan: up to 3 documents. </span> )} </p> </div> {/* Drop zone */} <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }} onClick={() => document.getElementById("doc-input").click()} style={{ border: "2px dashed #334155", borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: "#0a0f1e", transition: "all 0.15s", marginBottom: 12, }} > <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div> <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 13, marginBottom: 4, }} > Drop files here or click to browse </div> <div style={{ fontSize: 11, color: "#475569" }}> PDF · DOCX · TXT · Up to {docLimit} files </div> <input id="doc-input" type="file" multiple accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} /> </div> {/* File list */} {docs.length > 0 && ( <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, }} > {docs.map((doc, i) => ( <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", }} > <span style={{ fontSize: 16 }}> {doc.name.endsWith(".pdf") ? "📕" : doc.name.endsWith(".docx") ? "📘" : "📄"} </span> <div style={{ flex: 1, minWidth: 0 }}> <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", }} > {doc.name} </div> <div style={{ fontSize: 10, color: doc.status === "done" ? "#4ade80" : doc.status === "extracting" ? "#a78bfa" : "#475569", }} > {doc.status === "done" ? "✓ Extracted" : doc.status === "extracting" ? "⏳ Extracting..." : "Ready"} </div> </div> {!analyzing && ( <button onClick={() => removeDoc(i)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: 2, }} > × </button> )} </div> ))} </div> )} {error && ( <p style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}> ⚠ {error} </p> )} {docs.length > 0 && ( <button onClick={extractAndAnalyze} disabled={analyzing} style={{ width: "100%", padding: "11px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: analyzing ? "not-allowed" : "pointer", background: analyzing ? "#1e293b" : "#7c3aed", color: analyzing ? "#475569" : "#fff", border: "none", }} > {analyzing ? "⏳ Analyzing your documents..." : "Analyze Documents with AI →"} </button> )} </div>
  );
}

function DescribeStep({ onNext, onBack, plan }) {
  const [mode, setMode] = useState("upload");
  const [startup, setStartup] = useState({
    name: "",
    description: "",
    ask: "",
  });
  const [profile, setProfile] = useState(null);
  const valid = startup.name && startup.description && startup.ask;

  const handleProfileComplete = (p) => {
    setProfile(p);
    setStartup({
      name: p.companyName || "",
      description: p.pitchSummary || "",
      ask: p.amountRaising || "",
    });
    setMode("review");
  };

  if (mode === "review" && profile) {
    return (
      <div> <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#f1f5f9", }} > AI understood your startup </h2> <p style={{ color: "#64748b", marginBottom: 16, fontSize: 13 }}> Review and edit before generating pitches. </p> <div style={{ background: "#0a0f1e", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, padding: 16, marginBottom: 16, }} > <div style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, }} > AI Analysis </div> <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }} > {[ ["Industry", profile.industry], ["Stage", profile.stage], ["Raising", profile.amountRaising], ["Location", profile.country], ["Model", profile.businessModel], ["Traction", profile.traction], ] .filter(([, v]) => v) .map(([k, v], i) => ( <div key={i}> <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2, }} > {k} </div> <div style={{ fontSize: 12, color: "#cbd5e1" }}>{v}</div> </div> ))} </div> </div> {[ { key: "name", label: "Company name" }, { key: "description", label: "Pitch description (AI will use this)", multiline: true, }, { key: "ask", label: "Amount raising" }, ].map(({ key, label, multiline }) => ( <div key={key} style={{ marginBottom: 14 }}> <label style={{ display: "block", fontWeight: 600, fontSize: 11, color: "#94a3b8", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px", }} > {label} </label> {multiline ? ( <textarea value={startup[key]} onChange={(e) => setStartup({ ...startup, [key]: e.target.value }) } rows={4} style={{ width: "100%", borderRadius: 8, border: "1px solid #1e293b", padding: "10px 12px", fontSize: 13, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: "#0a0f1e", color: "#e2e8f0", }} /> ) : ( <input value={startup[key]} onChange={(e) => setStartup({ ...startup, [key]: e.target.value }) } style={{ width: "100%", borderRadius: 8, border: "1px solid #1e293b", padding: "10px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#0a0f1e", color: "#e2e8f0", }} /> )} </div> ))} <div style={{ display: "flex", gap: 10 }}> <button onClick={() => setMode("upload")} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 8, padding: "11px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", }} > ← Re-upload </button> <button onClick={onBack} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 8, padding: "11px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", }} > ← Back </button> <button onClick={() => onNext(startup)} disabled={!valid} style={{ flex: 1, background: valid ? "#7c3aed" : "#1e293b", color: valid ? "#fff" : "#475569", border: "none", borderRadius: 8, padding: "11px 20px", fontWeight: 700, fontSize: 14, cursor: valid ? "pointer" : "not-allowed", }} > Generate Pitches ⚡ </button> </div> </div>
    );
  }

  return (
    <div> <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#f1f5f9", }} > Describe your startup </h2> {/* Mode toggle */} <div style={{ display: "flex", gap: 0, background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 8, padding: 4, marginBottom: 20, }} > <button onClick={() => setMode("upload")} style={{ flex: 1, padding: "8px", borderRadius: 6, border: "none", cursor: "pointer", background: mode === "upload" ? "#7c3aed" : "transparent", color: mode === "upload" ? "#fff" : "#64748b", fontFamily: "inherit", fontSize: 13, fontWeight: 600, transition: "all 0.15s", }} > 📄 Upload Documents </button> <button onClick={() => setMode("manual")} style={{ flex: 1, padding: "8px", borderRadius: 6, border: "none", cursor: "pointer", background: mode === "manual" ? "#7c3aed" : "transparent", color: mode === "manual" ? "#fff" : "#64748b", fontFamily: "inherit", fontSize: 13, fontWeight: 600, transition: "all 0.15s", }} > ✏️ Type Manually </button> </div> {mode === "upload" && ( <DocumentUpload onComplete={handleProfileComplete} plan={plan} /> )} {mode === "manual" && ( <div> {[ { key: "name", label: "Startup name", placeholder: "e.g. ForcepX" }, { key: "description", label: "What you do", placeholder: "e.g. We give patients cryptographic control over their medical records. Every access is logged in a tamper-proof audit trail.", multiline: true, }, { key: "ask", label: "What you're raising", placeholder: "e.g. $500K pre-seed", }, ].map(({ key, label, placeholder, multiline }) => ( <div key={key} style={{ marginBottom: 16 }}> <label style={{ display: "block", fontWeight: 600, fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px", }} > {label} </label> {multiline ? ( <textarea value={startup[key]} onChange={(e) => setStartup({ ...startup, [key]: e.target.value }) } placeholder={placeholder} rows={3} style={{ width: "100%", borderRadius: 8, border: "1px solid #1e293b", padding: "10px 12px", fontSize: 13, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: "#0a0f1e", color: "#e2e8f0", }} /> ) : ( <input value={startup[key]} onChange={(e) => setStartup({ ...startup, [key]: e.target.value }) } placeholder={placeholder} style={{ width: "100%", borderRadius: 8, border: "1px solid #1e293b", padding: "10px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#0a0f1e", color: "#e2e8f0", }} /> )} </div> ))} <div style={{ display: "flex", gap: 10 }}> <button onClick={onBack} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 8, padding: "12px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", }} > ← Back </button> <button onClick={() => onNext(startup)} disabled={!valid} style={{ flex: 1, background: valid ? "#7c3aed" : "#1e293b", color: valid ? "#fff" : "#475569", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: valid ? "pointer" : "not-allowed", }} > Generate Pitches ⚡ </button> </div> </div> )} {mode === "upload" && ( <button onClick={onBack} style={{ background: "transparent", color: "#475569", border: "none", fontSize: 13, cursor: "pointer", marginTop: 12, padding: 0, }} > ← Back </button> )} </div>
  );
}

async function generateSingle(inv, startup) {
  const res = await fetch(API_URL + "/api/generate-pitch", {
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
          results.push({
            ...investors[i],
            subject: data.subject,
            body: data.body,
            error: false,
          });
          onPitchGenerated(1);
        } catch (err) {
          results.push({
            ...investors[i],
            subject: "",
            body: "",
            error: err.message,
          });
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
    setRegenerating((prev) => ({ ...prev, [i]: true }));
    try {
      const data = await generateSingle(pitches[i], startup);
      setPitches((prev) => {
        const u = [...prev];
        u[i] = {
          ...u[i],
          subject: data.subject,
          body: data.body,
          error: false,
        };
        return u;
      });
    } catch (err) {
      setPitches((prev) => {
        const u = [...prev];
        u[i] = { ...u[i], error: err.message };
        return u;
      });
    }
    setRegenerating((prev) => ({ ...prev, [i]: false }));
  };

  if (generating)
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}> <div style={{ fontSize: 36, marginBottom: 16 }}>⚡</div> <h3 style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}> Crafting personalized pitches... </h3> <p style={{ color: "#475569", marginBottom: 28, fontSize: 13 }}> {progress} of {investors.length} done </p> <div style={{ background: "#1e293b", borderRadius: 99, height: 6, overflow: "hidden", maxWidth: 300, margin: "0 auto", }} > <div style={{ background: "linear-gradient(90deg,#7c3aed,#a78bfa)", height: "100%", borderRadius: 99, width: (investors.length ? (progress / investors.length) * 100 : 0) + "%", transition: "width 0.4s ease", }} /> </div> </div>
    );

  return (
    <div> <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, }} > <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: 0 }} > Review pitches </h2> <span style={{ fontSize: 12, color: "#475569" }}> {selected.length}/{pitches.length} selected </span> </div> <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20, maxHeight: 400, overflowY: "auto", }} > {pitches.map((pitch, i) => ( <div key={i} style={{ border: "1px solid " + (selected.includes(i) ? "rgba(124,58,237,0.4)" : "#1e293b"), borderRadius: 10, padding: 14, background: selected.includes(i) ? "rgba(124,58,237,0.05)" : "#0a0f1e", }} > <div style={{ display: "flex", gap: 10 }}> <input type="checkbox" checked={selected.includes(i)} onChange={() => setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i] ) } style={{ marginTop: 2, accentColor: "#7c3aed", flexShrink: 0 }} /> <div style={{ flex: 1 }}> <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, }} > <div> <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 13, }} > {pitch.name} </span> <span style={{ color: "#475569", fontSize: 11, marginLeft: 6 }} > {pitch.firm || ""} </span> </div> <button onClick={() => handleRegenerate(i)} disabled={regenerating[i]} style={{ background: "none", border: "1px solid #334155", borderRadius: 5, padding: "2px 8px", fontSize: 10, color: "#64748b", cursor: "pointer", }} > {regenerating[i] ? "..." : "🔄 Redo"} </button> </div> <div style={{ fontSize: 10, color: "#475569", marginBottom: 8 }} > {pitch.email} </div> {pitch.error ? ( <div style={{ color: "#f87171", fontSize: 12 }}> ⚠ {pitch.error} </div> ) : ( <> <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 600, marginBottom: 6, }} > Subject: {pitch.subject} </div> <div style={{ fontSize: 12, color: "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.6, background: "#060a14", borderRadius: 6, padding: 10, }} > {pitch.body} </div> </> )} </div> </div> </div> ))} </div>
      <div style={{ display: "flex", gap: 10 }}> <button onClick={onBack} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 8, padding: "12px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", }} > ← Back </button> <button onClick={() => onNext(pitches.filter((_, i) => selected.includes(i)))} disabled={selected.length === 0} style={{ flex: 1, background: selected.length > 0 ? "#7c3aed" : "#1e293b", color: selected.length > 0 ? "#fff" : "#475569", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: selected.length > 0 ? "pointer" : "not-allowed", }} > Send {selected.length} Pitch{selected.length !== 1 ? "es" : ""} → </button> </div>
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
      setResults(
        pitches.map((p) => ({ ...p, success: false, error: err.message }))
      );
    }
    setSending(false);
    setDone(true);
  };

  if (done) {
    const succeeded = results.filter((r) => r.success).length;
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}> <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div> <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 8, }} > {succeeded} pitch{succeeded !== 1 ? "es" : ""} sent! </h2> <p style={{ color: "#475569", marginBottom: 32, fontSize: 14 }}> Now sit back and let the replies come in. </p> <button onClick={onRestart} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontWeight: 700, fontSize: 14, cursor: "pointer", }} > Start new campaign </button> </div>
    );
  }

  return (
    <div> <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#f1f5f9", }} > Ready to launch </h2> <p style={{ color: "#64748b", marginBottom: 20, fontSize: 13 }}> Your name will appear as the sender. </p> <div style={{ marginBottom: 16 }}> <label style={{ display: "block", fontWeight: 600, fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px", }} > Your name </label> <input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="e.g. Samuel" style={{ width: "100%", borderRadius: 8, border: "1px solid #1e293b", padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#0a0f1e", color: "#e2e8f0", }} /> </div> <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: "#4ade80", display: "flex", alignItems: "center", gap: 8, }} > <span>✓</span> <span> {pitches.length} pitch{pitches.length !== 1 ? "es" : ""} queued and ready </span> </div> <button onClick={handleSend} disabled={sending || !senderName} style={{ width: "100%", background: sending || !senderName ? "#1e293b" : "linear-gradient(135deg,#7c3aed,#4f46e5)", color: sending || !senderName ? "#475569" : "#fff", border: "none", borderRadius: 8, padding: "14px 28px", fontWeight: 700, fontSize: 15, cursor: sending || !senderName ? "not-allowed" : "pointer", }} > {sending ? "Sending..." : "🚀 Send " + pitches.length + " Pitch" + (pitches.length !== 1 ? "es" : "")} </button> </div>
  );
}

function CampaignTab({ pitchCount, plan, setPitchCount, user }) {
  const [step, setStep] = useState("upload");
  const [investors, setInvestors] = useState([]);
  const [startup, setStartup] = useState(null);
  const [finalPitches, setFinalPitches] = useState([]);
  const limit = PLAN_LIMITS[plan] || 10;
  const isAtLimit = pitchCount >= limit;

  const incrementPitchCount = (n = 1) => {
    if (!user) return;
    const newCount = pitchCount + n;
    setPitchCount(newCount);
    localStorage.setItem("pitches_" + user.id, newCount.toString());
  };

  const restart = () => {
    setStep("upload");
    setInvestors([]);
    setStartup(null);
    setFinalPitches([]);
  };

  return (
    <div> <div style={{ marginBottom: 24 }}> <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 4, }} > New Campaign </h1> <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}> Upload your investor list and send personalized pitches in minutes. </p> </div> {isAtLimit ? ( <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 14, padding: 32, textAlign: "center", }} > <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div> <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.5px", }} > {plan === "starter" ? "You've hit your Starter limit." : "You've used all 10 free pitches."} </h3> <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 24, lineHeight: 1.6, maxWidth: 400, margin: "0 auto 24px", }} > {plan === "starter" ? "Upgrade to Pro and unlock 500 pitches/month, Claude AI, deep investor research, and a full fundraising CRM." : "Upgrade to keep sending. Starter gives you 100 pitches/month. Pro gives you 500 plus Claude AI and deep investor research."} </p> <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", }} > {plan === "free" && ( <a href="/upgrade?plan=starter" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", padding: "11px 24px", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none", border: "1px solid rgba(124,58,237,0.25)", }} > Starter — $29/mo </a> )} <a href="/upgrade" style={{ background: "#7c3aed", color: "#fff", padding: "11px 24px", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none", }} > Upgrade to Pro — $79/mo → </a> </div> </div> ) : ( <div style={{ background: "#0f172a", borderRadius: 16, padding: 24, border: "1px solid #1e293b", }} > <StepIndicator current={step} /> {step === "upload" && ( <div> <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#f1f5f9", }} > Upload your investor list </h2> <p style={{ color: "#64748b", marginBottom: 20, fontSize: 13 }}> CSV with columns: name, email, firm (optional) </p> <div onClick={() => document.getElementById("csv-input").click()} style={{ border: "2px dashed #334155", borderRadius: 12, padding: "40px 24px", textAlign: "center", cursor: "pointer", background: "#0a0f1e", }} > <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div> <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: 4, fontSize: 14, }} > Drop CSV here or click to browse </div> <input id="csv-input" type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { try { const parsed = parseCsv(ev.target.result); if (parsed[0]?.name && parsed[0]?.email) { setInvestors(parsed); setStep("describe"); } } catch {} }; reader.readAsText(file); }} /> </div> </div> )} {step === "describe" && ( <DescribeStep onNext={(s) => { setStartup(s); setStep("review"); }} onBack={() => setStep("upload")} plan={plan} /> )} {step === "review" && ( <ReviewStep investors={investors} startup={startup} onNext={(p) => { setFinalPitches(p); setStep("send"); }} onBack={() => setStep("describe")} onPitchGenerated={incrementPitchCount} /> )} {step === "send" && ( <SendStep pitches={finalPitches} onRestart={restart} /> )} </div> )} </div>
  );
}

function InvestorsTab({ plan }) {
  return (
    <div> <div style={{ marginBottom: 28 }}> <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 4, }} > Investor Discovery </h1> <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}> Find investors that match your startup. </p> </div> <div style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "48px 32px", textAlign: "center", }} > <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div> <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8, }} > Investor database coming soon </h3> <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", maxWidth: 380, margin: "0 auto 24px", lineHeight: 1.6, }} > We're building a curated database of thousands of active investors with fit scoring, activity tracking, and deep AI research. For now, upload your list as CSV on the Campaign tab. </p> {plan === "free" && ( <a href="/upgrade" style={{ display: "inline-block", background: "#7c3aed", color: "#fff", padding: "10px 24px", borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: "none", }} > Upgrade to get early access → </a> )} </div> </div>
  );
}

function AccountTab({ user, plan, pitchCount, onSignOut }) {
  const [checkoutLoading, setCheckoutLoading] = useState("");
  const limit = PLAN_LIMITS[plan] || 10;

  const handleCheckout = async (p) => {
    setCheckoutLoading(p);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: p,
          userId: user.id,
          userEmail: user.email,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    }
    setCheckoutLoading("");
  };

  return (
    <div> <div style={{ marginBottom: 28 }}> <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 4, }} > Account </h1> <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}> Manage your plan and account settings. </p> </div> <div style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 24, marginBottom: 16, }} > <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16, }} > Profile </div> <div style={{ display: "flex", alignItems: "center", gap: 14 }}> <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", }} > {user?.email?.[0]?.toUpperCase() || "F"} </div> <div> <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 2, }} > {user?.user_metadata?.full_name || "Founder"} </div> <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}> {user?.email} </div> </div> </div> </div> <div style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 24, marginBottom: 16, }} > <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16, }} > Current Plan </div> <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, }} > <div> <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 2, textTransform: "capitalize", }} > {plan} </div> <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}> {pitchCount} of {limit} pitches used </div> </div> <div style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 99, background: plan === "pro" ? "rgba(74,222,128,0.1)" : plan === "starter" ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.06)", color: plan === "pro" ? "#4ade80" : plan === "starter" ? "#a78bfa" : "rgba(255,255,255,0.3)", textTransform: "uppercase", }} > {plan} </div> </div> <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 99, height: 6, overflow: "hidden", }} > <div style={{ background: pitchCount / limit >= 0.9 ? "#f87171" : "linear-gradient(90deg,#7c3aed,#a78bfa)", height: "100%", borderRadius: 99, width: Math.min((pitchCount / limit) * 100, 100) + "%", }} /> </div> </div> {plan !== "pro" && ( <div style={{ background: "#0f0f0f", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 14, padding: 24, marginBottom: 16, }} > <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16, }} > Upgrade </div> <div style={{ display: "flex", flexDirection: "column", gap: 10 }}> {plan === "free" && ( <button onClick={() => handleCheckout("starter")} disabled={checkoutLoading === "starter"} style={{ width: "100%", padding: "13px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)", }} > {checkoutLoading === "starter" ? "Loading..." : "Starter — $29/mo · 100 pitches/month →"} </button> )} <button onClick={() => handleCheckout("pro")} disabled={checkoutLoading === "pro"} style={{ width: "100%", padding: "13px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#7c3aed", color: "#fff", border: "none", }} > {checkoutLoading === "pro" ? "Loading..." : "Pro — $79/mo · 500 pitches + Claude AI + CRM →"} </button> </div> </div> )} <div style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 24, }} > <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16, }} > Danger Zone </div> <button onClick={onSignOut} style={{ background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", }} > Sign out </button> </div> </div>
  );
}

export default function App() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [pitchCount, setPitchCount] = useState(0);
  const [plan, setPlan] = useState("free");
  const [activeTab, setActiveTab] = useState("campaign");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      const count = parseInt(
        localStorage.getItem("pitches_" + session.user.id) || "0"
      );
      const savedPlan =
        localStorage.getItem("plan_" + session.user.id) || "free";
      setPitchCount(count);
      setPlan(savedPlan);
      setAuthChecking(false);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authChecking)
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", }} > <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, fontFamily: "Inter, system-ui", }} > Loading... </div> </div>
    );

  return (
    <> <Head> <title>PitchWire — Dashboard</title> <meta name="viewport" content="width=device-width, initial-scale=1" /> <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" /> </Head> <div style={{ display: "flex", minHeight: "100vh", background: "#000", fontFamily: "'Inter', system-ui, sans-serif", }} > <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} plan={plan} pitchCount={pitchCount} onSignOut={handleSignOut} /> <main style={{ marginLeft: 220, flex: 1, padding: "40px", overflowY: "auto", minHeight: "100vh", }} > <div style={{ maxWidth: 720, margin: "0 auto" }}> {activeTab === "campaign" && ( <CampaignTab pitchCount={pitchCount} plan={plan} setPitchCount={setPitchCount} user={user} /> )} {activeTab === "investors" && <InvestorsTab plan={plan} />} {activeTab === "account" && ( <AccountTab user={user} plan={plan} pitchCount={pitchCount} onSignOut={handleSignOut} /> )} </div> </main> </div> </>
  );
}

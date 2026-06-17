import { useState, useEffect } from "react";

const SECTORS = [
  "fintech",
  "healthtech",
  "saas",
  "enterprise software",
  "climate tech",
  "b2b",
  "ai/ml",
  "edtech",
  "agritech",
];
const STAGES = ["pre-seed", "seed", "series-a", "growth"];
const REGIONS = ["Africa", "USA", "Europe", "Global"];

export default function InvestorsTab({ plan, onStartCampaign }) {
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({ sector: "", stage: "", region: "" });
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchInvestors = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.sector) params.append("sector", filters.sector);
      if (filters.stage) params.append("stage", filters.stage);
      if (filters.region) params.append("region", filters.region);

      const res = await fetch("/api/get-investors?" + params.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInvestors(data.investors);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvestors();
  }, [filters]);

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleStartCampaign = () => {
    const chosen = investors.filter((inv) => selected.includes(inv.id));
    const asInvestorList = chosen.map((inv) => ({
      name: inv.contact_name || inv.firm,
      email: inv.email || "",
      firm: inv.firm,
    }));
    onStartCampaign(asInvestorList);
  };

  return (
    <div> <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12, }} > <div> <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 4, }} > Investor Discovery </h1> <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}> {investors.length} verified investors. Filter by sector, stage, and region. </p> </div> <button onClick={() => setShowAddForm(!showAddForm)} style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 8, padding: "9px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", }} > + Add Investor </button> </div> {showAddForm && ( <AddInvestorForm onClose={() => setShowAddForm(false)} onAdded={fetchInvestors} /> )} {/* Filters */} <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }} > <select value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })} style={{ background: "#0f172a", color: "#cbd5e1", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", cursor: "pointer", }} > <option value="">All sectors</option> {SECTORS.map((s) => ( <option key={s} value={s}> {s} </option> ))} </select> <select value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })} style={{ background: "#0f172a", color: "#cbd5e1", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", cursor: "pointer", }} > <option value="">All stages</option> {STAGES.map((s) => ( <option key={s} value={s}> {s} </option> ))} </select> <select value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })} style={{ background: "#0f172a", color: "#cbd5e1", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", cursor: "pointer", }} > <option value="">All regions</option> {REGIONS.map((r) => ( <option key={r} value={r}> {r} </option> ))} </select> {(filters.sector || filters.stage || filters.region) && ( <button onClick={() => setFilters({ sector: "", stage: "", region: "" })} style={{ background: "transparent", color: "#475569", border: "none", fontSize: 12, cursor: "pointer", padding: "8px 4px", }} > Clear filters Ã— </button> )} </div> {error && ( <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16 }}> âš  {error} </p> )} {loading ? ( <div style={{ textAlign: "center", padding: "48px 0", color: "#475569", fontSize: 13, }} > Loading investors... </div> ) : investors.length === 0 ? ( <div style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "40px 24px", textAlign: "center", }} > <div style={{ fontSize: 32, marginBottom: 12 }}>ðŸ”</div> <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}> No investors match these filters. Try widening your search. </p> </div> ) : ( <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 80, }} > {investors.map((inv) => ( <div key={inv.id} style={{ background: selected.includes(inv.id) ? "rgba(124,58,237,0.08)" : "#0f0f0f", border: "1px solid " + (selected.includes(inv.id) ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.08)"), borderRadius: 12, padding: 16, display: "flex", gap: 12, alignItems: "flex-start", transition: "all 0.15s", }} > <input type="checkbox" checked={selected.includes(inv.id)} onChange={() => toggleSelect(inv.id)} style={{ marginTop: 3, accentColor: "#7c3aed", width: 16, height: 16, cursor: "pointer", flexShrink: 0, }} /> <div style={{ flex: 1, minWidth: 0 }}> <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6, }} > <div> <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }} > {inv.firm} </div> <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }} > {inv.hq} </div> </div> {!inv.email && ( <span style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.1)", padding: "3px 8px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0, }} > Verify email </span> )} </div> <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 10, }} > {inv.notes} </p> <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}> {inv.sectors?.map((s, i) => ( <span key={i} style={{ fontSize: 10, fontWeight: 600, color: "#a78bfa", background: "rgba(124,58,237,0.1)", padding: "3px 8px", borderRadius: 99, }} > {s} </span> ))} {inv.stages?.map((s, i) => ( <span key={i} style={{ fontSize: 10, fontWeight: 600, color: "#64748b", background: "rgba(255,255,255,0.04)", padding: "3px 8px", borderRadius: 99, }} > {s} </span> ))} </div> </div> </div> ))} </div> )} {/* Floating action bar */} {selected.length > 0 && ( <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#0f0f0f", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 40px rgba(124,58,237,0.15)", zIndex: 100, }} > <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}> {selected.length} investor{selected.length !== 1 ? "s" : ""}{" "} selected </span> <button onClick={handleStartCampaign} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", }} > Start Campaign â†’ </button> <button onClick={() => setSelected([])} style={{ background: "transparent", color: "#475569", border: "none", fontSize: 18, cursor: "pointer", padding: 0, }} > Ã— </button> </div> )} </div>
  );
}

function AddInvestorForm({ onClose, onAdded }) {
  const [form, setForm] = useState({
    firm: "",
    contactName: "",
    email: "",
    sectors: "",
    stages: "",
    region: "",
    hq: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.firm) {
      setError("Firm name is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/add-investor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firm: form.firm,
          contactName: form.contactName,
          email: form.email,
          sectors: form.sectors
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
          stages: form.stages
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
          region: form.region,
          hq: form.hq,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAdded();
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  return (
    <div style={{ background: "#0a0f1e", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: 20, marginBottom: 20, }} > <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 14, }} > Add an investor to the database </div> <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10, }} > <input placeholder="Firm name *" value={form.firm} onChange={(e) => setForm({ ...form, firm: e.target.value })} style={inputStyle} /> <input placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} style={inputStyle} /> <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} /> <input placeholder="HQ location" value={form.hq} onChange={(e) => setForm({ ...form, hq: e.target.value })} style={inputStyle} /> <input placeholder="Sectors (comma separated)" value={form.sectors} onChange={(e) => setForm({ ...form, sectors: e.target.value })} style={inputStyle} /> <input placeholder="Stages (comma separated)" value={form.stages} onChange={(e) => setForm({ ...form, stages: e.target.value })} style={inputStyle} /> <input placeholder="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} style={{ ...inputStyle, gridColumn: "1 / -1" }} /> </div> <textarea placeholder="Notes (what do they look for?)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, width: "100%", resize: "vertical", marginBottom: 10, boxSizing: "border-box", }} /> {error && ( <p style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}> âš  {error} </p> )} <div style={{ display: "flex", gap: 8 }}> <button onClick={onClose} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", }} > Cancel </button> <button onClick={handleSubmit} disabled={submitting} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", }} > {submitting ? "Adding..." : "Add Investor"} </button> </div> </div>
  );
}

const inputStyle = {
  background: "#0f172a",
  color: "#e2e8f0",
  border: "1px solid #1e293b",
  borderRadius: 7,
  padding: "8px 10px",
  fontSize: 12.5,
  outline: "none",
  fontFamily: "inherit",
};

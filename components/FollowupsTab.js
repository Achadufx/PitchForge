export default function FollowupsTab() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 4 }}>
          Follow-ups
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          Never miss a follow-up with your investors.
        </p>
      </div>
      <div style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "48px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔔</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Follow-ups Coming Soon</h3>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", maxWidth: 380, margin: "0 auto" }}>
          Automated follow-up reminders and email sequences.
        </p>
      </div>
    </div>
  );
}

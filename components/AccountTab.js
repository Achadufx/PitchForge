import { useState } from "react";

const PLAN_LIMITS = { free: 10, starter: 100, pro: 500 };

const PLAN_META = {
  free: { label: "Free", color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.18)" },
  starter: { label: "Starter", color: "#a78bfa", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.25)" },
  pro: { label: "Pro", color: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.2)" },
};

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 18 }}>
      {children}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: "#0c0c0e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "26px 28px", marginBottom: 14, ...style }}>
      {children}
    </div>
  );
}

export default function AccountTab({ user, plan, pitchCount, onSignOut }) {
  const [checkoutLoading, setCheckoutLoading] = useState("");
  const limit = PLAN_LIMITS[plan] || 10;
  const pct = Math.min((pitchCount / limit) * 100, 100);
  const meta = PLAN_META[plan] || PLAN_META.free;
  const initial = (user?.user_metadata?.full_name || user?.email || "F")[0].toUpperCase();

  const handleCheckout = async (p) => {
    setCheckoutLoading(p);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: p, userId: user.id, userEmail: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) { console.error(err); }
    setCheckoutLoading("");
  };

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px", marginBottom: 5 }}>Account</h1>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.32)" }}>Manage your plan, usage, and account settings.</p>
      </div>

      {/* Profile */}
      <Card>
        <SectionLabel>Profile</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%",
            background: "linear-gradient(150deg, #8b5cf6, #6d28d9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, fontWeight: 600, color: "#fff",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 4px 14px rgba(124,58,237,0.25)",
            flexShrink: 0,
          }}>
            {initial}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "#fff", marginBottom: 2, letterSpacing: "-0.1px" }}>
              {user?.user_metadata?.full_name || "Founder"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.34)" }}>{user?.email}</div>
          </div>
        </div>
      </Card>

      {/* Current Plan */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <SectionLabel>Current Plan</SectionLabel>
          <span style={{
            fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
            background: meta.bg, color: meta.color, border: "1px solid " + meta.border,
            letterSpacing: "0.4px", textTransform: "uppercase",
          }}>
            {meta.label}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.6px" }}>{meta.label}</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.34)" }}>
            <span style={{ color: pct >= 90 ? "#f87171" : "rgba(255,255,255,0.7)", fontWeight: 600 }}>{pitchCount}</span> / {limit} pitches used
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 5, overflow: "hidden" }}>
          <div style={{
            background: pct >= 90 ? "linear-gradient(90deg,#ef4444,#f87171)" : "linear-gradient(90deg,#7c3aed,#a78bfa)",
            height: "100%", borderRadius: 99, width: pct + "%", transition: "width 0.4s ease",
          }} />
        </div>
      </Card>

      {/* Upgrade */}
      {plan !== "pro" && (
        <Card style={{ borderColor: "rgba(124,58,237,0.15)" }}>
          <SectionLabel>Upgrade your plan</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {plan === "free" && (
              <button
                onClick={() => handleCheckout("starter")}
                disabled={checkoutLoading === "starter"}
                style={{
                  width: "100%", textAlign: "left", padding: "16px 18px", borderRadius: 10,
                  background: "#111114", border: "1px solid rgba(255,255,255,0.08)",
                  cursor: checkoutLoading === "starter" ? "not-allowed" : "pointer",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 2 }}>Starter</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>100 pitches/month · document upload · no watermark</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa", whiteSpace: "nowrap", marginLeft: 16 }}>
                    {checkoutLoading === "starter" ? "..." : "$29/mo →"}
                  </div>
                </div>
              </button>
            )}

            <button
              onClick={() => handleCheckout("pro")}
              disabled={checkoutLoading === "pro"}
              style={{
                width: "100%", textAlign: "left", padding: "16px 18px", borderRadius: 10,
                background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(79,70,229,0.1))",
                border: "1px solid rgba(124,58,237,0.3)",
                cursor: checkoutLoading === "pro" ? "not-allowed" : "pointer",
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Pro</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: "#a78bfa", background: "rgba(124,58,237,0.18)", padding: "2px 7px", borderRadius: 5, letterSpacing: "0.3px", textTransform: "uppercase" }}>Recommended</span>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>500 pitches/month · Claude AI · full CRM pipeline</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", marginLeft: 16 }}>
                  {checkoutLoading === "pro" ? "..." : "$79/mo →"}
                </div>
              </div>
            </button>
          </div>
        </Card>
      )}

      {/* Danger Zone */}
      <Card style={{ borderColor: "rgba(248,113,113,0.12)", marginBottom: 0 }}>
        <SectionLabel>Session</SectionLabel>
        <button
          onClick={onSignOut}
          style={{
            background: "transparent", color: "rgba(248,113,113,0.85)",
            border: "1px solid rgba(248,113,113,0.18)", borderRadius: 8,
            padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          Sign out
        </button>
      </Card>
    </div>
  );
}

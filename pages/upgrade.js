import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function Upgrade() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
    });
  }, []);

  const handleCheckout = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", userId: user.id, userEmail: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Upgrade to Pro — PitchWire</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#000", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(124,58,237,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 560, width: "100%", position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.4px" }}>PitchWire</span>
            </div>
          </div>

          {/* Card */}
          <div style={{ background: "#0f0f0f", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 20, padding: "44px 40px", boxShadow: "0 0 80px rgba(124,58,237,0.08)" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-1px", marginBottom: 10 }}>
                You've hit your limit.
              </h1>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                Upgrade to Pro and keep your fundraising momentum going. Don't let your outreach stop right when it's working.
              </p>
            </div>

            {/* What you unlock */}
            <div style={{ background: "#080808", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "24px", marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16 }}>What you unlock with Pro</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  ["500 pitches/month", "5x more outreach capacity"],
                  ["Claude AI", "Night and day better pitch quality"],
                  ["Deep investor research", "AI reads their thesis, portfolio, and statements"],
                  ["Full CRM pipeline", "Track every investor conversation"],
                  ["AI follow-up suggestions", "Never let a warm lead go cold"],
                  ["Unlimited investor matches", "Full database access"],
                ].map(([title, desc], i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#a78bfa", flexShrink: 0, marginTop: 1 }}>✓</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{title}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-3px", color: "#fff", lineHeight: 1 }}>
                $79<span style={{ fontSize: 16, fontWeight: 500, letterSpacing: 0, color: "rgba(255,255,255,0.3)" }}>/mo</span>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Cancel anytime</div>
            </div>

            <button onClick={handleCheckout} disabled={loading} style={{ width: "100%", padding: "15px", borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", background: loading ? "#1a1a1a" : "linear-gradient(135deg,#7c3aed,#4f46e5)", color: loading ? "rgba(255,255,255,0.3)" : "#fff", border: "none", letterSpacing: "-0.3px", transition: "all 0.2s", boxShadow: loading ? "none" : "0 8px 32px rgba(124,58,237,0.4)" }}>
              {loading ? "Loading..." : "Upgrade to Pro →"}
            </button>

            <button onClick={() => router.push("/app")} style={{ width: "100%", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.25)", border: "none", marginTop: 12, transition: "color 0.2s" }}>
              Go back to app
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

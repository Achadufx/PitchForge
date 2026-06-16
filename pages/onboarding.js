import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function Onboarding() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState({});
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
      setChecking(false);
    });
  }, []);

  const handleCheckout = async (plan) => {
    setLoading(prev => ({ ...prev, [plan]: true }));
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId: user.id, userEmail: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) { console.error(err); }
    setLoading(prev => ({ ...prev, [plan]: false }));
  };

  if (checking) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, fontFamily: "Inter, system-ui" }}>Loading...</div>
    </div>
  );

  const plans = [
    {
      key: "free", name: "Free", price: "$0", period: "", desc: "Try the product. Experience the magic.",
      features: ["3 document uploads", "AI startup analysis", "20 investor matches", "Basic filters", "Investor Fit Score", "10 personalized pitches", "10 email sends", "Basic campaign tracking"],
      cta: "Start for free", action: () => router.push("/app"), outline: true,
    },
    {
      key: "starter", name: "Starter", price: "$29", period: "/mo", desc: "For founders beginning fundraising.",
      features: ["Unlimited document uploads", "200 investor matches/month", "Advanced filters (sector, geo, stage, check size)", "AI startup understanding", "Investor Fit + Activity Score", "100 personalized pitches/month", "Campaign dashboard", "Email open & reply tracking"],
      cta: "Get Starter", action: () => handleCheckout("starter"), hot: true,
    },
    {
      key: "pro", name: "Pro", price: "$79", period: "/mo", desc: "For founders actively raising.",
      features: ["Everything in Starter", "Unlimited investor matches", "Full investor database", "Deep AI investor research (thesis, portfolio, statements)", "Detailed Fit Analysis with explanations", "500 personalized pitches/month", "AI follow-up suggestions", "Full fundraising CRM", "Meeting tracking", "Campaign analytics"],
      cta: "Get Pro", action: () => handleCheckout("pro"), outline: true,
    },
  ];

  return (
    <>
      <Head>
        <title>Get started — PitchWire</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#000", fontFamily: "'Inter', system-ui, sans-serif", padding: "40px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: "radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Nav */}
        <div style={{ maxWidth: 1060, margin: "0 auto 48px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.4px" }}>PitchWire</span>
          </div>
          {user && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>{user.email}</span>}
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56, position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600, marginBottom: 16 }}>
            Welcome{user?.user_metadata?.full_name ? ", " + user.user_metadata.full_name.split(" ")[0] : ""}! 👋
          </div>
          <h1 style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.05, color: "#fff", marginBottom: 14 }}>
            Choose your plan<br />and start pitching.
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
            You can start free and upgrade anytime. No pressure.
          </p>
        </div>

        {/* Plans */}
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, position: "relative", zIndex: 1 }}>
          {plans.map((plan) => (
            <div key={plan.key} style={{ background: plan.hot ? "#0f0f0f" : "#0a0a0a", border: "1px solid " + (plan.hot ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.08)"), borderRadius: 16, padding: "32px 28px", display: "flex", flexDirection: "column", position: "relative", boxShadow: plan.hot ? "0 0 60px rgba(124,58,237,0.1)" : "none" }}>
              {plan.hot && (
                <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", background: "#7c3aed", color: "white", fontSize: 10, fontWeight: 700, padding: "4px 14px", borderRadius: "0 0 10px 10px", letterSpacing: "0.5px", textTransform: "uppercase", whiteSpace: "nowrap" }}>Most Popular</div>
              )}
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16 }}>{plan.name}</div>
              <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-2px", color: "#fff", lineHeight: 1, marginBottom: 6 }}>
                {plan.price}<span style={{ fontSize: 14, fontWeight: 500, letterSpacing: 0, color: "rgba(255,255,255,0.3)" }}>{plan.period}</span>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 28, lineHeight: 1.5 }}>{plan.desc}</div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 32, flex: 1 }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", display: "flex", gap: 8, lineHeight: 1.4 }}>
                    <span style={{ color: "#a78bfa", fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={plan.action} disabled={loading[plan.key]} style={{ width: "100%", padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading[plan.key] ? "not-allowed" : "pointer", background: plan.hot ? "#7c3aed" : "transparent", color: plan.hot ? "#fff" : "rgba(255,255,255,0.5)", border: plan.hot ? "none" : "1px solid rgba(255,255,255,0.12)", opacity: loading[plan.key] ? 0.6 : 1, transition: "all 0.2s" }}>
                {loading[plan.key] ? "Loading..." : plan.cta + (plan.key !== "free" ? " →" : "")}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", marginTop: 32, fontSize: 12, color: "rgba(255,255,255,0.2)", position: "relative", zIndex: 1 }}>
          No contracts · Cancel anytime · Secure payments via Stripe
        </p>
      </div>
    </>
  );
}

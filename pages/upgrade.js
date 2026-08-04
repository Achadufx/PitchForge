import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import GlobalStyles from "../components/GlobalStyles";
import tokens from "../lib/designTokens";

const PLAN_DATA = {
  starter: {
    name: "Starter",
    price: "29",
    title: "Keep your outreach going.",
    subtitle: "100 pitches a month — enough to run a real fundraising campaign without hitting a wall.",
    features: [
      ["100 pitches/month", "10x the free plan"],
      ["Document upload", "Unlimited decks, whitepapers, and business plans"],
      ["No watermark", "Every pitch looks fully professional"],
      ["Investor fit scoring", "Know exactly who to prioritise"],
      ["Campaign tracking", "See what is working as you send"],
    ],
  },
  pro: {
    name: "Pro",
    price: "79",
    title: "For a full raise.",
    subtitle: "500 pitches a month, deeper investor research, and the full CRM pipeline.",
    features: [
      ["500 pitches/month", "5x more outreach capacity"],
      ["Deep investor research", "Reads their thesis, portfolio, and public statements"],
      ["Full CRM pipeline", "Track every investor conversation"],
      ["Follow-up suggestions", "Never let a warm lead go cold"],
      ["Unlimited investor matches", "Full database access"],
    ],
  },
};

export default function Upgrade() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("pro");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
    });
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const planParam = router.query.plan;
    if (planParam === "starter" || planParam === "pro") {
      setSelectedPlan(planParam);
    }
  }, [router.isReady, router.query.plan]);

  const plan = PLAN_DATA[selectedPlan];

  const handleCheckout = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, userId: user.id, userEmail: user.email }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        // Previously this failed silently and the button just stopped doing
        // anything, which is indistinguishable from a broken page.
        setError(data.error || "Could not start checkout. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout failed:", err);
      setError("Could not reach the payment service. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Upgrade to {plan.name} — PitchWire</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <GlobalStyles />

      <div style={{
        minHeight: "100vh",
        background: tokens.colors.bg.base,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: tokens.spacing[6],
      }}>
        <div style={{ maxWidth: 520, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: tokens.spacing[8] }}>
            <span style={{
              fontSize: "17px",
              fontWeight: 600,
              color: tokens.colors.text.primary,
              letterSpacing: "-0.02em",
            }}>
              PitchWire
            </span>
          </div>

          {/* Plan switcher */}
          <div style={{
            display: "flex",
            gap: tokens.spacing[1],
            marginBottom: tokens.spacing[5],
            background: tokens.colors.bg.surface,
            border: "1px solid " + tokens.colors.border.default,
            borderRadius: tokens.radius.md,
            padding: 4,
          }}>
            {["starter", "pro"].map((key) => {
              const active = selectedPlan === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: tokens.radius.sm,
                    fontSize: "14px",
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    border: "none",
                    background: active ? tokens.colors.bg.card : "transparent",
                    color: active ? tokens.colors.text.primary : tokens.colors.text.secondary,
                    fontFamily: "inherit",
                    boxShadow: active ? tokens.shadows.xs : "none",
                    transition: "background " + tokens.transitions.fast,
                  }}
                >
                  {PLAN_DATA[key].name} · ${PLAN_DATA[key].price}/mo
                </button>
              );
            })}
          </div>

          <div style={{
            background: tokens.colors.bg.card,
            border: "1px solid " + tokens.colors.border.default,
            borderRadius: tokens.radius.lg,
            padding: tokens.spacing[10],
            boxShadow: tokens.shadows.sm,
          }}>
            <h1 className="pw-h2" style={{ marginBottom: tokens.spacing[3] }}>
              {plan.title}
            </h1>
            <p className="pw-body" style={{ marginBottom: tokens.spacing[8] }}>
              {plan.subtitle}
            </p>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: tokens.spacing[4],
              paddingBottom: tokens.spacing[8],
              marginBottom: tokens.spacing[8],
              borderBottom: "1px solid " + tokens.colors.border.default,
            }}>
              {plan.features.map(([title, desc], i) => (
                <div key={i} style={{ display: "flex", gap: tokens.spacing[3], alignItems: "flex-start" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={tokens.colors.accent.secondary} strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0, marginTop: 5 }}>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <div>
                    <div style={{
                      fontSize: "15px",
                      fontWeight: 550,
                      color: tokens.colors.text.primary,
                      lineHeight: 1.5,
                    }}>
                      {title}
                    </div>
                    <div style={{
                      fontSize: "14px",
                      color: tokens.colors.text.muted,
                      lineHeight: 1.6,
                    }}>
                      {desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: tokens.spacing[6] }}>
              <div style={{
                fontSize: "40px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: tokens.colors.text.primary,
                lineHeight: 1,
              }}>
                ${plan.price}
                <span style={{
                  fontSize: "16px",
                  fontWeight: 400,
                  letterSpacing: 0,
                  color: tokens.colors.text.muted,
                }}>
                  {" "}/month
                </span>
              </div>
              <div style={{
                fontSize: "14px",
                color: tokens.colors.text.muted,
                marginTop: tokens.spacing[1],
              }}>
                Cancel anytime
              </div>
            </div>

            {error && (
              <div style={{
                background: tokens.colors.status.errorBg,
                border: "1px solid " + tokens.colors.status.errorBorder,
                borderRadius: tokens.radius.md,
                padding: tokens.spacing[3],
                marginBottom: tokens.spacing[4],
                fontSize: "14px",
                color: tokens.colors.status.error,
                lineHeight: 1.6,
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading || !user}
              className="pw-btn-primary"
              style={{ width: "100%" }}
            >
              {loading ? "Starting checkout..." : "Upgrade to " + plan.name}
            </button>

            <button
              onClick={() => router.push("/app")}
              className="pw-btn-ghost"
              style={{ width: "100%", marginTop: tokens.spacing[2] }}
            >
              Back to app
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

// ============================================================
// DESIGN SYSTEM
// ============================================================

const tokens = {
  colors: {
    bg: {
      base: '#070b14',
      elevated: '#0c1120',
      surface: '#111827',
      surfaceLight: '#1a2332',
      input: '#0f1625',
    },
    accent: {
      primary: '#14b8a6',
      hover: '#2dd4bf',
      active: '#0d9488',
      light: '#5eead4',
      glow: 'rgba(20,184,166,0.12)',
      glowStrong: 'rgba(20,184,166,0.25)',
    },
    text: {
      primary: '#e8eaed',
      secondary: '#b0b6c4',
      tertiary: '#7a8194',
      muted: '#4a5166',
      inverse: '#ffffff',
    },
    border: {
      default: '#1e2a3a',
      hover: '#2a3a4a',
      active: '#14b8a6',
    },
    status: {
      error: '#f87171',
      success: '#34d399',
      warning: '#fbbf24',
    }
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    full: '999px',
  },
  shadows: {
    sm: '0 2px 8px rgba(0,0,0,0.35)',
    md: '0 4px 16px rgba(0,0,0,0.4)',
    lg: '0 8px 32px rgba(0,0,0,0.5)',
    xl: '0 12px 48px rgba(0,0,0,0.6)',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// ============================================================
// SVG ICONS
// ============================================================

const Icon = ({ children, size = 20, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const Icons = {
  Zap: () => <Icon><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>,
  Check: () => <Icon><path d="M20 6L9 17l-5-5" /></Icon>,
  ArrowRight: () => <Icon size={18}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Icon>,
};

// ============================================================
// ONBOARDING COMPONENT
// ============================================================

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
    <div style={{
      minHeight: "100vh",
      background: tokens.colors.bg.base,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ color: tokens.colors.text.muted, fontSize: 14 }}>Loading...</div>
    </div>
  );

  const plans = [
    {
      key: "free",
      name: "Free",
      price: "$0",
      period: "",
      desc: "Try the product. Experience the magic.",
      features: [
        "3 document uploads",
        "AI startup analysis",
        "20 investor matches",
        "Basic filters",
        "Investor Fit Score",
        "10 personalized pitches",
        "10 email sends",
        "Basic campaign tracking"
      ],
      cta: "Start for free",
      action: () => router.push("/app"),
    },
    {
      key: "starter",
      name: "Starter",
      price: "$29",
      period: "/mo",
      desc: "For founders beginning fundraising.",
      features: [
        "Unlimited document uploads",
        "200 investor matches/month",
        "Advanced filters (sector, geo, stage, check size)",
        "AI startup understanding",
        "Investor Fit + Activity Score",
        "100 personalized pitches/month",
        "Campaign dashboard",
        "Email open & reply tracking"
      ],
      cta: "Get Starter",
      action: () => handleCheckout("starter"),
      hot: true,
    },
    {
      key: "pro",
      name: "Pro",
      price: "$79",
      period: "/mo",
      desc: "For founders actively raising.",
      features: [
        "Everything in Starter",
        "Unlimited investor matches",
        "Full investor database",
        "Deep AI investor research (thesis, portfolio, statements)",
        "Detailed Fit Analysis with explanations",
        "500 personalized pitches/month",
        "AI follow-up suggestions",
        "Full fundraising CRM",
        "Meeting tracking",
        "Campaign analytics"
      ],
      cta: "Get Pro",
      action: () => handleCheckout("pro"),
    },
  ];

  return (
    <>
      <Head>
        <title>Get started — PitchWire</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        minHeight: "100vh",
        background: tokens.colors.bg.base,
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: `${tokens.spacing[6]} ${tokens.spacing[4]}`,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background Glow */}
        <div style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 400,
          background: `radial-gradient(ellipse, ${tokens.colors.accent.glow} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        {/* Nav */}
        <div style={{
          maxWidth: 1060,
          margin: `0 auto ${tokens.spacing[8]}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing[2] }}>
            <div style={{
              width: 32,
              height: 32,
              background: `linear-gradient(135deg, ${tokens.colors.accent.primary}, ${tokens.colors.accent.active})`,
              borderRadius: tokens.radius.sm,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Icons.Zap />
            </div>
            <span style={{
              fontSize: 18,
              fontWeight: 800,
              color: tokens.colors.text.primary,
              letterSpacing: "-0.02em",
            }}>
              PitchWire
            </span>
          </div>
          {user && (
            <span style={{
              fontSize: 13,
              color: tokens.colors.text.muted,
            }}>
              {user.email}
            </span>
          )}
        </div>

        {/* Header */}
        <div style={{
          textAlign: "center",
          marginBottom: tokens.spacing[10],
          position: "relative",
          zIndex: 1,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: tokens.colors.accent.light,
            marginBottom: tokens.spacing[4],
          }}>
            {user?.user_metadata?.full_name
              ? `Welcome, ${user.user_metadata.full_name.split(" ")[0]}! 👋`
              : "Welcome! 👋"}
          </div>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 52px)",
            fontWeight: 900,
            letterSpacing: "-2px",
            lineHeight: 1.05,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing[3],
          }}>
            Choose your plan<br />and start pitching.
          </h1>
          <p style={{
            fontSize: 16,
            color: tokens.colors.text.muted,
            maxWidth: 420,
            margin: "0 auto",
            lineHeight: 1.6,
          }}>
            You can start free and upgrade anytime. No pressure.
          </p>
        </div>

        {/* Plans - Mobile Responsive Grid */}
        <div style={{
          maxWidth: 1060,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: tokens.spacing[4],
          position: "relative",
          zIndex: 1,
          // Mobile: 1 column on small screens
          "@media (max-width: 768px)": {
            gridTemplateColumns: "1fr",
            gap: tokens.spacing[6],
          },
          // Tablet: 2 columns on medium screens
          "@media (min-width: 769px) and (max-width: 1024px)": {
            gridTemplateColumns: "1fr 1fr",
          },
        }}>
          {plans.map((plan) => (
            <div
              key={plan.key}
              style={{
                background: plan.hot
                  ? tokens.colors.bg.surface
                  : tokens.colors.bg.elevated,
                border: `1px solid ${
                  plan.hot
                    ? tokens.colors.accent.glowStrong
                    : tokens.colors.border.default
                }`,
                borderRadius: tokens.radius.lg,
                padding: `${tokens.spacing[6]} ${tokens.spacing[5]}`,
                display: "flex",
                flexDirection: "column",
                position: "relative",
                boxShadow: plan.hot ? tokens.shadows.lg : "none",
                transition: `all ${tokens.transitions.base}`,
                // Mobile: full width
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {plan.hot && (
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: tokens.colors.accent.primary,
                  color: tokens.colors.text.inverse,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: `${tokens.spacing[1]} ${tokens.spacing[4]}`,
                  borderRadius: `0 0 ${tokens.radius.md} ${tokens.radius.md}`,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}>
                  Most Popular
                </div>
              )}
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: tokens.colors.text.muted,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                marginBottom: tokens.spacing[4],
              }}>
                {plan.name}
              </div>
              <div style={{
                fontSize: "clamp(32px, 4vw, 40px)",
                fontWeight: 900,
                letterSpacing: "-2px",
                color: tokens.colors.text.primary,
                lineHeight: 1,
                marginBottom: tokens.spacing[2],
              }}>
                {plan.price}
                <span style={{
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: 0,
                  color: tokens.colors.text.muted,
                }}>
                  {plan.period}
                </span>
              </div>
              <div style={{
                fontSize: 13,
                color: tokens.colors.text.muted,
                marginBottom: tokens.spacing[6],
                lineHeight: 1.5,
              }}>
                {plan.desc}
              </div>
              <ul style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: tokens.spacing[3],
                marginBottom: tokens.spacing[8],
                flex: 1,
              }}>
                {plan.features.map((f, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: "clamp(12px, 1.2vw, 13px)",
                      color: tokens.colors.text.secondary,
                      display: "flex",
                      gap: tokens.spacing[2],
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{
                      color: tokens.colors.accent.light,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      <Icons.Check />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={plan.action}
                disabled={loading[plan.key]}
                style={{
                  width: "100%",
                  padding: tokens.spacing[3],
                  borderRadius: tokens.radius.md,
                  fontSize: "clamp(13px, 1.2vw, 14px)",
                  fontWeight: 700,
                  cursor: loading[plan.key] ? "not-allowed" : "pointer",
                  background: plan.hot
                    ? tokens.colors.accent.primary
                    : "transparent",
                  color: plan.hot
                    ? tokens.colors.text.inverse
                    : tokens.colors.text.secondary,
                  border: plan.hot
                    ? "none"
                    : `1px solid ${tokens.colors.border.default}`,
                  opacity: loading[plan.key] ? 0.6 : 1,
                  transition: `all ${tokens.transitions.fast}`,
                  minHeight: "48px",
                }}
                onMouseEnter={(e) => {
                  if (!plan.hot) {
                    e.currentTarget.style.borderColor = tokens.colors.accent.primary;
                    e.currentTarget.style.color = tokens.colors.text.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!plan.hot) {
                    e.currentTarget.style.borderColor = tokens.colors.border.default;
                    e.currentTarget.style.color = tokens.colors.text.secondary;
                  }
                }}
              >
                {loading[plan.key] ? "Loading..." : plan.cta + (plan.key !== "free" ? " →" : "")}
              </button>
            </div>
          ))}
        </div>

        <p style={{
          textAlign: "center",
          marginTop: tokens.spacing[8],
          fontSize: 12,
          color: tokens.colors.text.muted,
          position: "relative",
          zIndex: 1,
        }}>
          No contracts · Cancel anytime · Secure payments via Stripe
        </p>
      </div>
    </>
  );
}

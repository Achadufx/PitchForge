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
  checkUser();
}, []);

const checkUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) { 
    router.push("/login"); 
    return; 
  }

  // Check database if user already onboarded
action: async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await supabase.from('user_plans').upsert({
      user_id: session.user.id,
      plan: 'free',
      onboarded: true
    });
  }
  router.push("/app");
},
  setUser(session.user);
  setChecking(false);
};

  const handleFreeStart = async () => {
    // Save free plan to profiles before redirecting
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('profiles').upsert({
        id: session.user.id,
        plan: 'free',
        email: session.user.email,
      });
    }
    router.push("/app");
  };

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
      action: handleFreeStart,
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

      <style>{`
        /* Reset */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: #070b14;
          margin: 0;
          padding: 0;
        }

        /* Onboarding Container */
        .onboarding-page {
          min-height: 100vh;
          background: #070b14;
          font-family: 'Inter', system-ui, sans-serif;
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
        }

        /* Background Glow */
        .onboarding-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(20,184,166,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Nav */
        .onboarding-nav {
          max-width: 1060px;
          margin: 0 auto 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .onboarding-logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .onboarding-logo-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .onboarding-logo-icon img {
          width: 32px;
          height: 32px;
          object-fit: contain;
        }

        .onboarding-logo-text {
          font-size: 18px;
          font-weight: 800;
          color: #e8eaed;
          letter-spacing: -0.02em;
        }

        .onboarding-user-email {
          font-size: 13px;
          color: #4a5166;
        }

        /* Header */
        .onboarding-header {
          text-align: center;
          margin-bottom: 48px;
          position: relative;
          z-index: 1;
        }

        .onboarding-welcome {
          font-size: 13px;
          font-weight: 600;
          color: #5eead4;
          margin-bottom: 16px;
        }

        .onboarding-title {
          font-size: clamp(28px, 5vw, 52px);
          font-weight: 900;
          letter-spacing: -2px;
          line-height: 1.05;
          color: #e8eaed;
          margin-bottom: 12px;
        }

        .onboarding-subtitle {
          font-size: 16px;
          color: #4a5166;
          max-width: 420px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* Plans Grid */
        .onboarding-plans {
          max-width: 1060px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          position: relative;
          z-index: 1;
        }

        /* Plan Card */
        .onboarding-plan {
          background: #0c1120;
          border: 1px solid #1e2a3a;
          border-radius: 16px;
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: all 250ms ease;
          width: 100%;
          box-sizing: border-box;
        }

        .onboarding-plan.hot {
          background: #111827;
          border: 1px solid rgba(20,184,166,0.25);
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }

        .onboarding-plan-badge {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          background: #14b8a6;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 14px;
          border-radius: 0 0 10px 10px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .onboarding-plan-name {
          font-size: 11px;
          font-weight: 700;
          color: #4a5166;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 16px;
        }

        .onboarding-plan-price {
          font-size: clamp(32px, 4vw, 40px);
          font-weight: 900;
          letter-spacing: -2px;
          color: #e8eaed;
          line-height: 1;
          margin-bottom: 6px;
        }

        .onboarding-plan-price span {
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0;
          color: #4a5166;
        }

        .onboarding-plan-desc {
          font-size: 13px;
          color: #4a5166;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .onboarding-plan-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
          flex: 1;
        }

        .onboarding-plan-features li {
          font-size: clamp(12px, 1.2vw, 13px);
          color: #b0b6c4;
          display: flex;
          gap: 8px;
          line-height: 1.4;
        }

        .onboarding-plan-features li svg {
          flex-shrink: 0;
          color: #5eead4;
        }

        .onboarding-plan-btn {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          font-size: clamp(13px, 1.2vw, 14px);
          font-weight: 700;
          cursor: pointer;
          min-height: 48px;
          border: none;
          transition: all 150ms ease;
        }

        .onboarding-plan-btn.primary {
          background: #14b8a6;
          color: #ffffff;
        }

        .onboarding-plan-btn.primary:hover {
          background: #2dd4bf;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(20,184,166,0.25);
        }

        .onboarding-plan-btn.outline {
          background: transparent;
          color: #b0b6c4;
          border: 1px solid #1e2a3a;
        }

        .onboarding-plan-btn.outline:hover {
          border-color: #14b8a6;
          color: #e8eaed;
        }

        .onboarding-plan-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .onboarding-footer {
          text-align: center;
          margin-top: 32px;
          font-size: 12px;
          color: #4a5166;
          position: relative;
          z-index: 1;
        }

        /* MOBILE RESPONSIVE */
        @media (max-width: 768px) {
          .onboarding-page {
            padding: 16px 12px;
          }

          .onboarding-plans {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .onboarding-plan {
            padding: 24px 20px;
          }

          .onboarding-plan-features li {
            font-size: 13px;
          }

          .onboarding-plan-btn {
            font-size: 14px;
          }

          .onboarding-title {
            font-size: 28px;
          }

          .onboarding-subtitle {
            font-size: 14px;
          }

          .onboarding-nav {
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }

          .onboarding-user-email {
            font-size: 12px;
          }

          .onboarding-logo-icon {
            width: 28px;
            height: 28px;
          }

          .onboarding-logo-icon img {
            width: 28px;
            height: 28px;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .onboarding-plans {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (min-width: 1025px) {
          .onboarding-plans {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>

      <div className="onboarding-page">
        <div className="onboarding-glow" />

        {/* Nav */}
        <div className="onboarding-nav">
          <div className="onboarding-logo">
            <div className="onboarding-logo-icon">
              <img src="/logo.png" alt="PitchWire" />
            </div>
            <span className="onboarding-logo-text">PitchWire</span>
          </div>
          {user && (
            <span className="onboarding-user-email">{user.email}</span>
          )}
        </div>

        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-welcome">
            {user?.user_metadata?.full_name
              ? `Welcome, ${user.user_metadata.full_name.split(" ")[0]}! 👋`
              : "Welcome! 👋"}
          </div>
          <h1 className="onboarding-title">
            Choose your plan<br />and start pitching.
          </h1>
          <p className="onboarding-subtitle">
            You can start free and upgrade anytime. No pressure.
          </p>
        </div>

        {/* Plans */}
        <div className="onboarding-plans">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`onboarding-plan ${plan.hot ? 'hot' : ''}`}
            >
              {plan.hot && (
                <div className="onboarding-plan-badge">Most Popular</div>
              )}
              <div className="onboarding-plan-name">{plan.name}</div>
              <div className="onboarding-plan-price">
                {plan.price}
                <span>{plan.period}</span>
              </div>
              <div className="onboarding-plan-desc">{plan.desc}</div>
              <ul className="onboarding-plan-features">
                {plan.features.map((f, i) => (
                  <li key={i}>
                    <Icons.Check />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={plan.action}
                disabled={loading[plan.key]}
                className={`onboarding-plan-btn ${plan.hot ? 'primary' : 'outline'}`}
              >
                {loading[plan.key] ? "Loading..." : plan.cta + (plan.key !== "free" ? " →" : "")}
              </button>
            </div>
          ))}
        </div>

        <p className="onboarding-footer">
          No contracts · Cancel anytime · Secure payments via Stripe
        </p>
      </div>
    </>
  );
}

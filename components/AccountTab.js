import { useState } from "react";

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
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
    }
  },
  spacing: {
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
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
  },
  transitions: {
    fast: '150ms ease',
    base: '250ms ease',
  },
};

const PLAN_LIMITS = { free: 10, starter: 100, pro: 500 };

const PLAN_META = {
  free: { label: "Free", color: "#7a8194", bg: "rgba(122,129,148,0.08)", border: "rgba(122,129,148,0.18)" },
  starter: { label: "Starter", color: "#5eead4", bg: "rgba(20,184,166,0.1)", border: "rgba(20,184,166,0.25)" },
  pro: { label: "Pro", color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)" },
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
  User: () => <Icon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>,
  Check: () => <Icon><path d="M20 6L9 17l-5-5" /></Icon>,
  ArrowRight: () => <Icon size={18}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Icon>,
  LogOut: () => <Icon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Icon>,
  CreditCard: () => <Icon><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></Icon>,
  Zap: () => <Icon><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>,
};

// ============================================================
// COMPONENTS
// ============================================================

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10.5,
      fontWeight: 600,
      color: tokens.colors.text.muted,
      textTransform: "uppercase",
      letterSpacing: "1.2px",
      marginBottom: tokens.spacing[5],
    }}>
      {children}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: tokens.colors.bg.surface,
      border: `1px solid ${tokens.colors.border.default}`,
      borderRadius: tokens.radius.lg,
      padding: `${tokens.spacing[6]} ${tokens.spacing[6]}`,
      marginBottom: tokens.spacing[4],
      transition: `all ${tokens.transitions.base}`,
      width: '100%',
      boxSizing: 'border-box',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ============================================================
// ACCOUNT TAB
// ============================================================

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
    <div style={{
      maxWidth: 620,
      width: '100%',
      boxSizing: 'border-box',
      padding: tokens.spacing[2],
    }}>
      <div style={{
        marginBottom: tokens.spacing[8],
      }}>
        <h1 style={{
          fontSize: 'clamp(21px, 3vw, 28px)',
          fontWeight: 800,
          color: tokens.colors.text.primary,
          letterSpacing: '-0.4px',
          marginBottom: tokens.spacing[2],
        }}>
          Account
        </h1>
        <p style={{
          fontSize: 'clamp(13px, 1.5vw, 15px)',
          color: tokens.colors.text.muted,
        }}>
          Manage your plan, usage, and account settings.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <SectionLabel>Profile</SectionLabel>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing[4],
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: `linear-gradient(150deg, ${tokens.colors.accent.primary}, ${tokens.colors.accent.active})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 600,
            color: tokens.colors.text.inverse,
            boxShadow: `0 0 0 1px ${tokens.colors.accent.glowStrong}`,
            flexShrink: 0,
          }}>
            {initial}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 'clamp(14px, 1.5vw, 16px)',
              fontWeight: 600,
              color: tokens.colors.text.primary,
              marginBottom: tokens.spacing[1],
              letterSpacing: '-0.1px',
            }}>
              {user?.user_metadata?.full_name || "Founder"}
            </div>
            <div style={{
              fontSize: 'clamp(12px, 1.2vw, 13px)',
              color: tokens.colors.text.muted,
            }}>
              {user?.email}
            </div>
          </div>
        </div>
      </Card>

      {/* Current Plan */}
      <Card>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: tokens.spacing[5],
          flexWrap: 'wrap',
          gap: tokens.spacing[2],
        }}>
          <SectionLabel>Current Plan</SectionLabel>
          <span style={{
            fontSize: 10.5,
            fontWeight: 600,
            padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
            borderRadius: tokens.radius.sm,
            background: meta.bg,
            color: meta.color,
            border: `1px solid ${meta.border}`,
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
          }}>
            {meta.label}
          </span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: tokens.spacing[4],
          flexWrap: 'wrap',
          gap: tokens.spacing[2],
        }}>
          <div style={{
            fontSize: 'clamp(20px, 2.5vw, 24px)',
            fontWeight: 700,
            color: tokens.colors.text.primary,
            letterSpacing: '-0.6px',
          }}>
            {meta.label}
          </div>
          <div style={{
            fontSize: 'clamp(12px, 1.2vw, 13px)',
            color: tokens.colors.text.muted,
          }}>
            <span style={{
              color: pct >= 90 ? tokens.colors.status.error : tokens.colors.text.secondary,
              fontWeight: 600,
            }}>
              {pitchCount}
            </span> / {limit} pitches used
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: tokens.radius.full,
          height: 5,
          overflow: 'hidden',
        }}>
          <div style={{
            background: pct >= 90
              ? `linear-gradient(90deg, ${tokens.colors.status.error}, ${tokens.colors.status.warning})`
              : `linear-gradient(90deg, ${tokens.colors.accent.primary}, ${tokens.colors.accent.light})`,
            height: '100%',
            borderRadius: tokens.radius.full,
            width: pct + '%',
            transition: `width ${tokens.transitions.slow}`,
          }} />
        </div>
      </Card>

      {/* Upgrade */}
      {plan !== "pro" && (
        <Card style={{
          borderColor: tokens.colors.accent.glowStrong,
        }}>
          <SectionLabel>Upgrade your plan</SectionLabel>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[3],
          }}>
            {plan === "free" && (
              <button
                onClick={() => handleCheckout("starter")}
                disabled={checkoutLoading === "starter"}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: `${tokens.spacing[4]} ${tokens.spacing[5]}`,
                  borderRadius: tokens.radius.md,
                  background: tokens.colors.bg.elevated,
                  border: `1px solid ${tokens.colors.border.default}`,
                  cursor: checkoutLoading === "starter" ? "not-allowed" : "pointer",
                  transition: `all ${tokens.transitions.fast}`,
                  minHeight: '64px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = tokens.colors.accent.glowStrong;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = tokens.colors.border.default;
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: tokens.spacing[2],
                }}>
                  <div>
                    <div style={{
                      fontSize: 'clamp(13px, 1.3vw, 14px)',
                      fontWeight: 600,
                      color: tokens.colors.text.primary,
                      marginBottom: tokens.spacing[1],
                    }}>
                      Starter
                    </div>
                    <div style={{
                      fontSize: 'clamp(11px, 1.1vw, 12px)',
                      color: tokens.colors.text.muted,
                    }}>
                      100 pitches/month · document upload · no watermark
                    </div>
                  </div>
                  <div style={{
                    fontSize: 'clamp(13px, 1.3vw, 14px)',
                    fontWeight: 700,
                    color: tokens.colors.accent.light,
                    whiteSpace: 'nowrap',
                  }}>
                    {checkoutLoading === "starter" ? "..." : "$29/mo →"}
                  </div>
                </div>
              </button>
            )}

            <button
              onClick={() => handleCheckout("pro")}
              disabled={checkoutLoading === "pro"}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: `${tokens.spacing[4]} ${tokens.spacing[5]}`,
                borderRadius: tokens.radius.md,
                background: tokens.colors.accent.glow,
                border: `1px solid ${tokens.colors.accent.glowStrong}`,
                cursor: checkoutLoading === "pro" ? "not-allowed" : "pointer",
                transition: `all ${tokens.transitions.fast}`,
                minHeight: '64px',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: tokens.spacing[2],
              }}>
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing[2],
                    marginBottom: tokens.spacing[1],
                    flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontSize: 'clamp(13px, 1.3vw, 14px)',
                      fontWeight: 600,
                      color: tokens.colors.text.primary,
                    }}>
                      Pro
                    </span>
                    <span style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: tokens.colors.accent.light,
                      background: tokens.colors.accent.glow,
                      padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                      borderRadius: tokens.radius.sm,
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase',
                    }}>
                      Recommended
                    </span>
                  </div>
                  <div style={{
                    fontSize: 'clamp(11px, 1.1vw, 12px)',
                    color: tokens.colors.text.muted,
                  }}>
                    500 pitches/month · Claude AI · full CRM pipeline
                  </div>
                </div>
                <div style={{
                  fontSize: 'clamp(13px, 1.3vw, 14px)',
                  fontWeight: 700,
                  color: tokens.colors.text.inverse,
                  whiteSpace: 'nowrap',
                }}>
                  {checkoutLoading === "pro" ? "..." : "$79/mo →"}
                </div>
              </div>
            </button>
          </div>
        </Card>
      )}

      {/* Danger Zone */}
      <Card style={{
        borderColor: 'rgba(248,113,113,0.15)',
        marginBottom: 0,
      }}>
        <SectionLabel>Session</SectionLabel>
        <button
          onClick={onSignOut}
          style={{
            background: 'transparent',
            color: tokens.colors.status.error,
            border: `1px solid rgba(248,113,113,0.18)`,
            borderRadius: tokens.radius.md,
            padding: `${tokens.spacing[2]} ${tokens.spacing[5]}`,
            fontWeight: 600,
            fontSize: 'clamp(12px, 1.2vw, 13px)`,
            cursor: 'pointer',
            transition: `all ${tokens.transitions.fast}`,
            minHeight: '44px',
            minWidth: '44px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(248,113,113,0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Sign out
        </button>
      </Card>
    </div>
  );
}

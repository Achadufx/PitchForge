import { useState, useEffect, useCallback } from "react";
import tokens from "../lib/designTokens";
import { crmApi, ApiError } from "../lib/crm/api";

// ============================================================
// DESIGN SYSTEM
// Palette comes from lib/designTokens.js. This file previously carried its own
// duplicate token object, which is how the teal palette survived in two places.
// ============================================================

const PLAN_LIMITS = { free: 10, starter: 100, pro: 500 };

const PLAN_META = {
  free: {
    label: "Free",
    color: tokens.colors.text.muted,
    bg: "rgba(158,149,137,0.08)",
    border: "rgba(158,149,137,0.20)",
  },
  starter: {
    label: "Starter",
    color: tokens.colors.accent.secondary,
    bg: tokens.colors.accent.subtle,
    border: tokens.colors.accent.subtleBorder,
  },
  pro: {
    label: "Pro",
    color: tokens.colors.status.success,
    bg: tokens.colors.status.successBg,
    border: tokens.colors.status.successBorder,
  },
};

const GMAIL_CALLBACK_MESSAGES = {
  connected: { ok: true, message: '✓ Gmail connected successfully' },
  cancelled: { ok: false, message: 'Connection cancelled' },
  expired: { ok: false, message: 'Connection expired — try again' },
  no_refresh_token: { ok: false, message: 'Gmail connection incomplete — try again' },
  denied: { ok: false, message: 'Gmail access denied' },
  not_configured: { ok: false, message: 'Gmail is not configured on this deployment' },
  error: { ok: false, message: 'Connection failed — try again' },
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
      background: tokens.colors.bg.card,
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
  const [gmailStatus, setGmailStatus] = useState(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [callbackNotice, setCallbackNotice] = useState(null);
  const limit = PLAN_LIMITS[plan] || 10;
  const pct = Math.min((pitchCount / limit) * 100, 100);
  const meta = PLAN_META[plan] || PLAN_META.free;
  const initial = (user?.user_metadata?.full_name || user?.email || "F")[0].toUpperCase();

  const loadGmailStatus = useCallback(async () => {
    try {
      const data = await crmApi.get("/api/gmail/status");
      setGmailStatus(data);
    } catch (err) {
      console.error("Failed to load Gmail status:", err);
    } finally {
      setGmailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGmailStatus();
  }, [loadGmailStatus]);

  // /api/gmail/callback redirects back here with ?gmail=<status>#account. The
  // param is stripped once read so a refresh does not re-show a stale banner —
  // and so "connected" does not stay in the URL if the founder shares the link.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("gmail");
    if (!status) return;

    setCallbackNotice(GMAIL_CALLBACK_MESSAGES[status] || GMAIL_CALLBACK_MESSAGES.error);

    params.delete("gmail");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (query ? "?" + query : "") + window.location.hash
    );
  }, []);

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

  const handleGmailConnect = async () => {
    try {
      const data = await crmApi.post("/api/gmail/connect", {});
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Failed to start Gmail connection:", err);
    }
  };

  const handleGmailDisconnect = async () => {
    if (!window.confirm("Disconnect Gmail? PitchWire will stop checking for investor replies.")) return;
    try {
      await crmApi.post("/api/gmail/disconnect", {});
      await loadGmailStatus();
      setSyncResult(null);
    } catch (err) {
      console.error("Failed to disconnect Gmail:", err);
    }
  };

  const handleGmailSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const data = await crmApi.post("/api/gmail/sync", {});
      setSyncResult(data);
      await loadGmailStatus();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSyncResult({ error: "Gmail access expired. Reconnect your account." });
        await loadGmailStatus();
      } else {
        setSyncResult({ error: err instanceof ApiError ? err.message : "Sync failed" });
      }
    } finally {
      setSyncing(false);
    }
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
            background: tokens.colors.accent.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 600,
            color: tokens.colors.text.inverse,
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
          background: 'rgba(26,26,26,0.04)',
          borderRadius: tokens.radius.full,
          height: 5,
          overflow: 'hidden',
        }}>
          <div style={{
            background: pct >= 90
              ? tokens.colors.status.error
              : tokens.colors.accent.primary,
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
          borderColor: tokens.colors.accent.subtleBorder,
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
                  background: tokens.colors.bg.surface,
                  border: `1px solid ${tokens.colors.border.default}`,
                  cursor: checkoutLoading === "starter" ? "not-allowed" : "pointer",
                  transition: `all ${tokens.transitions.fast}`,
                  minHeight: '64px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = tokens.colors.accent.subtleBorder;
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
                    color: tokens.colors.accent.secondary,
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
                background: tokens.colors.accent.subtle,
                border: `1px solid ${tokens.colors.accent.subtleBorder}`,
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
                      color: tokens.colors.accent.secondary,
                      background: tokens.colors.accent.subtle,
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

      {/* Gmail Integration */}
      {!gmailLoading && gmailStatus && gmailStatus.available && gmailStatus.eligible && (
        <Card>
          <SectionLabel>Gmail Integration</SectionLabel>
          {callbackNotice && (
            <div style={{
              fontSize: 12,
              marginBottom: tokens.spacing[4],
              padding: tokens.spacing[2],
              borderRadius: tokens.radius.sm,
              background: callbackNotice.ok ? tokens.colors.status.successBg : tokens.colors.status.warningBg,
              border: `1px solid ${callbackNotice.ok ? tokens.colors.status.successBorder : tokens.colors.status.warningBorder}`,
              color: callbackNotice.ok ? tokens.colors.status.success : tokens.colors.status.warning,
            }}>
              {callbackNotice.message}
            </div>
          )}
          {gmailStatus.connection.connected ? (
            <>
              <div style={{ marginBottom: tokens.spacing[4] }}>
                <div style={{ fontSize: 13, color: tokens.colors.text.primary, marginBottom: tokens.spacing[2] }}>
                  <span style={{ fontWeight: 600 }}>Connected as:</span> {gmailStatus.connection.email}
                </div>
                {gmailStatus.connection.lastSyncedAt && (
                  <div style={{ fontSize: 12, color: tokens.colors.text.muted }}>
                    Last synced: {new Date(gmailStatus.connection.lastSyncedAt).toLocaleString()}
                  </div>
                )}
                {gmailStatus.connection.needsReconnect && (
                  <div style={{
                    fontSize: 12,
                    color: tokens.colors.status.warning,
                    marginTop: tokens.spacing[2],
                    padding: tokens.spacing[2],
                    background: tokens.colors.status.warningBg,
                    border: `1px solid ${tokens.colors.status.warningBorder}`,
                    borderRadius: tokens.radius.sm,
                  }}>
                    ⚠ {gmailStatus.connection.syncError || 'Reconnect required'}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                <button
                  onClick={handleGmailSync}
                  disabled={syncing}
                  style={{
                    background: tokens.colors.accent.primary,
                    color: tokens.colors.text.inverse,
                    border: 'none',
                    borderRadius: tokens.radius.md,
                    padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: syncing ? 'not-allowed' : 'pointer',
                    minHeight: '44px',
                    opacity: syncing ? 0.6 : 1,
                  }}
                >
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={handleGmailDisconnect}
                  style={{
                    background: 'transparent',
                    color: tokens.colors.text.muted,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.radius.md,
                    padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Disconnect
                </button>
              </div>
              {syncResult && (
                <div style={{
                  marginTop: tokens.spacing[3],
                  fontSize: 12,
                  padding: tokens.spacing[2],
                  borderRadius: tokens.radius.sm,
                  background: syncResult.error ? tokens.colors.status.errorBg : tokens.colors.status.successBg,
                  border: `1px solid ${syncResult.error ? tokens.colors.status.errorBorder : tokens.colors.status.successBorder}`,
                  color: syncResult.error ? tokens.colors.status.error : tokens.colors.status.success,
                }}>
                  {syncResult.error || `Found ${syncResult.repliesFound || 0} new ${syncResult.repliesFound === 1 ? 'reply' : 'replies'}`}
                </div>
              )}
              <div style={{
                fontSize: 11,
                color: tokens.colors.text.muted,
                marginTop: tokens.spacing[3],
                lineHeight: 1.5,
              }}>
                PitchWire checks your Gmail every 30 minutes for investor replies and automatically updates your CRM.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[4] }}>
                Connect your Gmail so PitchWire can automatically detect when investors reply.
              </div>
              <button
                onClick={handleGmailConnect}
                style={{
                  background: tokens.colors.accent.primary,
                  color: tokens.colors.text.inverse,
                  border: 'none',
                  borderRadius: tokens.radius.md,
                  padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Connect Gmail
              </button>
            </>
          )}
        </Card>
      )}

      {/* Danger Zone */}
      <Card style={{
        borderColor: 'rgba(139,26,26,0.15)',
        marginBottom: 0,
      }}>
        <SectionLabel>Session</SectionLabel>
        <button
          onClick={onSignOut}
          style={{
            background: 'transparent',
            color: tokens.colors.status.error,
            border: `1px solid rgba(139,26,26,0.18)`,
            borderRadius: tokens.radius.md,
            padding: `${tokens.spacing[2]} ${tokens.spacing[5]}`,
            fontWeight: 600,
            fontSize: `clamp(12px, 1.2vw, 13px)`,
            cursor: 'pointer',
            transition: `all ${tokens.transitions.fast}`,
            minHeight: '44px',
            minWidth: '44px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(139,26,26,0.06)';
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

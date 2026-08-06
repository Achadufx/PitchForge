import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import tokens from "../lib/designTokens";
import { crmApi, ApiError } from "../lib/crm/api";
import { eventMeta } from "../lib/crm/events";

// ============================================================
// DESIGN SYSTEM
// Palette comes from lib/designTokens.js. This file previously carried its own
// duplicate token object, which is how the teal palette survived in two places.
// ============================================================

const PLAN_LIMITS = { free: 10, starter: 100, pro: 500 };

// `glow` is the colour the badge shadow breathes in. Pro carries the warm
// brown, Starter the primary dark, Free the muted grey — the same ordering the
// rest of the palette uses to signal weight.
const PLAN_META = {
  free: {
    label: "Free",
    color: tokens.colors.text.muted,
    bg: "rgba(158,149,137,0.08)",
    border: "rgba(158,149,137,0.20)",
    glow: tokens.colors.text.muted,
  },
  starter: {
    label: "Starter",
    color: tokens.colors.accent.secondary,
    bg: tokens.colors.accent.subtle,
    border: tokens.colors.accent.subtleBorder,
    glow: tokens.colors.accent.primary,
  },
  pro: {
    label: "Pro",
    color: tokens.colors.status.success,
    bg: tokens.colors.status.successBg,
    border: tokens.colors.status.successBorder,
    glow: tokens.colors.accent.secondary,
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
// MOTION & FORMATTING HELPERS
// ============================================================

/**
 * Derives an rgba() string from a token colour so the pulse shadows can vary
 * opacity without a second hardcoded hex sitting next to the token. Accepts
 * both `#RRGGBB` and existing `rgb()/rgba()` token values.
 */
function withAlpha(color, alpha) {
  if (typeof color !== "string") return color;
  const value = color.trim();
  if (value.charAt(0) === "#") {
    const raw = value.slice(1);
    const hex = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
    const n = parseInt(hex, 16);
    if (Number.isNaN(n)) return color;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  const parts = value.match(/-?\d*\.?\d+/g);
  if (parts && parts.length >= 3) {
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
  }
  return color;
}

/**
 * Every animation in this file gates on this. GlobalStyles already clamps CSS
 * transitions under `prefers-reduced-motion`, but requestAnimationFrame loops
 * and keyframe animations are invisible to that rule, so they check here.
 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (event) => setReduced(event.matches);
    // Safari < 14 only has the deprecated listener API.
    if (mq.addEventListener) {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  return reduced;
}

/**
 * Counts 0 → target on an ease-out cubic curve. Returns the target immediately
 * when motion is reduced or the animation has not been armed yet, so callers
 * can render the honest number without branching.
 */
function useCountUp(target, { duration = 800, reduced = false, start = true } = {}) {
  const [value, setValue] = useState(target);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!start || reduced) {
      setValue(target);
      return;
    }
    let startTs = null;
    const tick = (ts) => {
      if (startTs === null) startTs = ts;
      const t = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    setValue(0);
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, reduced, start]);

  return value;
}

function relativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

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
  Send: ({ size = 18 }) => <Icon size={size}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Icon>,
  Columns: ({ size = 18 }) => <Icon size={size}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></Icon>,
  Upload: ({ size = 18 }) => <Icon size={size}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></Icon>,
  Camera: ({ size = 18 }) => <Icon size={size}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></Icon>,
  Refresh: ({ size = 14 }) => <Icon size={size}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></Icon>,
  Circle: ({ size = 14 }) => <Icon size={size}><circle cx="12" cy="12" r="9" /></Icon>,
  CheckCircle: ({ size = 14 }) => <Icon size={size}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>,
};

// The dot grid behind the tab — same construction as the landing page's tension
// section, dialled down for cream: dots only, no rules, no mask.
const DOT_GRID = {
  backgroundImage: `radial-gradient(circle at center, ${withAlpha(tokens.colors.accent.primary, 0.03)} 0 1.3px, transparent 1.5px)`,
  backgroundSize: "24px 24px",
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

// ------------------------------------------------------------
// Quick actions
// ------------------------------------------------------------

const QUICK_ACTIONS = [
  { key: "campaign", label: "New Campaign", icon: Icons.Send },
  { key: "crm", label: "View Pipeline", icon: Icons.Columns },
  { key: "investors", label: "Import Investors", icon: Icons.Upload },
];

function QuickActions({ onNavigate, reduced }) {
  return (
    <div
      className="pw-account-quick"
      style={{
        display: "flex",
        gap: tokens.spacing[3],
        marginBottom: tokens.spacing[6],
      }}
    >
      {QUICK_ACTIONS.map(({ key, label, icon: ActionIcon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onNavigate(key)}
          style={{
            flex: "1 1 0",
            minWidth: 132,
            display: "flex",
            alignItems: "center",
            gap: tokens.spacing[3],
            padding: `${tokens.spacing[4]} ${tokens.spacing[4]}`,
            background: tokens.colors.bg.card,
            border: `1px solid ${tokens.colors.border.default}`,
            borderRadius: tokens.radius.md,
            cursor: "pointer",
            textAlign: "left",
            color: tokens.colors.text.primary,
            boxShadow: tokens.shadows.xs,
            transition: `transform ${tokens.transitions.fast}, box-shadow ${tokens.transitions.fast}, border-color ${tokens.transitions.fast}`,
            minHeight: 56,
          }}
          onMouseEnter={(e) => {
            if (!reduced) e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = tokens.shadows.md;
            e.currentTarget.style.borderColor = tokens.colors.accent.subtleBorder;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = tokens.shadows.xs;
            e.currentTarget.style.borderColor = tokens.colors.border.default;
          }}
        >
          <span style={{ color: tokens.colors.accent.secondary, display: "flex", flexShrink: 0 }}>
            <ActionIcon />
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.1px" }}>
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Setup score
// ------------------------------------------------------------

/**
 * Five equally weighted checks, 20 points each. Everything here is derived from
 * props the tab already holds plus the one recent-activity round-trip — there is
 * no scoring endpoint to drift out of sync with.
 */
function buildScoreChecks({ gmailConnected, investorCount, pitchCount, profile, plan }) {
  const profileFields = ["company_name", "industry", "stage", "amount_raising", "pitch_summary"];
  const profileComplete = Boolean(profile) &&
    profileFields.every((field) => String(profile[field] || "").trim().length > 0);

  return [
    { key: "gmail", label: "Gmail connected", done: Boolean(gmailConnected) },
    { key: "investors", label: "10+ investors in your database", done: investorCount >= 10 },
    { key: "campaign", label: "At least one pitch sent", done: pitchCount > 0 },
    { key: "profile", label: "Startup profile complete", done: profileComplete },
    { key: "plan", label: "On the Pro plan", done: plan === "pro" },
  ];
}

function ScoreRing({ score, reduced }) {
  const animated = useCountUp(score, { duration: 800, reduced });
  const size = 96;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animated / 100);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={withAlpha(tokens.colors.accent.primary, 0.07)}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tokens.colors.accent.secondary}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}>
        <span style={{
          fontSize: 22,
          fontWeight: 700,
          color: tokens.colors.text.primary,
          letterSpacing: "-0.6px",
          lineHeight: 1,
        }}>
          {Math.round(animated)}
        </span>
        <span style={{ fontSize: 10, color: tokens.colors.text.muted, marginTop: 2 }}>
          / 100
        </span>
      </div>
    </div>
  );
}

function PitchIntelligence({ checks, reduced }) {
  const score = checks.filter((c) => c.done).length * 20;

  return (
    <Card>
      <SectionLabel>Pitch Intelligence</SectionLabel>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: tokens.spacing[5],
        flexWrap: "wrap",
      }}>
        <ScoreRing score={score} reduced={reduced} />
        <div style={{ minWidth: 180, flex: 1 }}>
          <div style={{
            fontSize: "clamp(14px, 1.5vw, 16px)",
            fontWeight: 600,
            color: tokens.colors.text.primary,
            letterSpacing: "-0.2px",
            marginBottom: tokens.spacing[1],
          }}>
            Your setup score
          </div>
          <div style={{ fontSize: 12.5, color: tokens.colors.text.muted, lineHeight: 1.5 }}>
            Complete your setup to send better pitches
          </div>
        </div>
      </div>

      <div style={{
        marginTop: tokens.spacing[5],
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacing[3],
      }}>
        {checks.map((check) => (
          <div key={check.key} style={{ display: "flex", alignItems: "center", gap: tokens.spacing[3] }}>
            <span style={{
              display: "flex",
              flexShrink: 0,
              color: check.done ? tokens.colors.status.success : tokens.colors.text.muted,
              opacity: check.done ? 1 : 0.5,
            }}>
              {check.done ? <Icons.CheckCircle size={15} /> : <Icons.Circle size={15} />}
            </span>
            <span style={{
              fontSize: 12.5,
              color: check.done ? tokens.colors.text.secondary : tokens.colors.text.muted,
            }}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------
// Activity feed
// ------------------------------------------------------------

function ActivityFeed({ events, loading }) {
  return (
    <Card>
      <SectionLabel>Recent Activity</SectionLabel>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing[4] }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: tokens.spacing[3] }}>
              <div className="pw-skeleton" style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="pw-skeleton" style={{ height: 11, width: `${68 - i * 12}%`, borderRadius: 4, marginBottom: 6 }} />
                <div className="pw-skeleton" style={{ height: 9, width: "32%", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && events.length === 0 && (
        <div style={{ fontSize: 12.5, color: tokens.colors.text.muted, lineHeight: 1.6 }}>
          No activity yet — send your first pitch to get started.
        </div>
      )}

      {!loading && events.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing[4] }}>
          {events.map((event) => {
            const meta = eventMeta(event.eventType);
            return (
              <div key={event.id} style={{ display: "flex", alignItems: "flex-start", gap: tokens.spacing[3] }}>
                <span style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  background: tokens.colors.bg.surface,
                  border: `1px solid ${tokens.colors.border.default}`,
                  color: tokens.colors.text.secondary,
                }}>
                  {meta.glyph}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: 12.5,
                    color: tokens.colors.text.primary,
                    lineHeight: 1.45,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {event.summary || `${meta.label} — ${event.investorFirm}`}
                  </div>
                  <div style={{ fontSize: 11, color: tokens.colors.text.muted, marginTop: 2 }}>
                    {relativeTime(event.occurredAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ============================================================
// ACCOUNT TAB
// ============================================================

export default function AccountTab({ user, plan, pitchCount, onSignOut, onNavigate, savedProfile }) {
  const [checkoutLoading, setCheckoutLoading] = useState("");
  const [gmailStatus, setGmailStatus] = useState(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncScanned, setSyncScanned] = useState(0);
  const [syncFlash, setSyncFlash] = useState(null);
  const [callbackNotice, setCallbackNotice] = useState(null);
  const [activity, setActivity] = useState([]);
  const [investorCount, setInvestorCount] = useState(0);
  const [activityLoading, setActivityLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);
  const [toast, setToast] = useState(null);

  const reduced = usePrefersReducedMotion();
  const limit = PLAN_LIMITS[plan] || 10;
  const pct = Math.min((pitchCount / limit) * 100, 100);
  const meta = PLAN_META[plan] || PLAN_META.free;
  const initial = (user?.user_metadata?.full_name || user?.email || "F")[0].toUpperCase();

  const animatedCount = useCountUp(pitchCount, { duration: 800, reduced });
  const animatedPct = useCountUp(pct, { duration: 800, reduced });

  const gmailConnected = Boolean(gmailStatus?.connection?.connected);
  const gmailEligible = Boolean(gmailStatus?.available && gmailStatus?.eligible);

  const scoreChecks = useMemo(
    () => buildScoreChecks({
      gmailConnected,
      investorCount,
      pitchCount,
      profile: savedProfile,
      plan,
    }),
    [gmailConnected, investorCount, pitchCount, savedProfile, plan]
  );

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

  // The activity feed and investor count arrive together. A failure here leaves
  // an empty feed and a score that under-counts investors, never a broken tab.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await crmApi.get("/api/crm/recent-activity");
        if (cancelled) return;
        setActivity(Array.isArray(data?.events) ? data.events : []);
        setInvestorCount(data?.investorCount || 0);
      } catch (err) {
        if (!cancelled) console.error("Failed to load recent activity:", err);
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Drives the fade-and-rise on first paint.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const showToast = useCallback((message) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

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

  // G key triggers Gmail connect when it is not yet connected. The hint disappears
  // once connected, so this is purely a first-run accelerator.
  useEffect(() => {
    if (gmailConnected || !gmailEligible) return;
    const onKey = (e) => {
      if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
        e.preventDefault();
        handleGmailConnect();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gmailConnected, gmailEligible]);

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
    setSyncFlash(null);
    setSyncScanned(0);

    // A visible counter while the request is in flight. The server does not
    // stream progress, so this ticks as an activity indicator and is replaced by
    // the real figure the moment the response lands — it never reports a total.
    let ticker = null;
    if (!reduced) {
      ticker = setInterval(() => {
        setSyncScanned((n) => n + 1 + (n % 3));
      }, 120);
    }

    try {
      const data = await crmApi.post("/api/gmail/sync", {});
      setSyncResult(data);
      const found = data.repliesFound || 0;
      setSyncFlash(
        found > 0
          ? `Found ${found} new ${found === 1 ? "reply" : "replies"}`
          : "All caught up"
      );
      await loadGmailStatus();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSyncResult({ error: "Gmail access expired. Reconnect your account." });
        await loadGmailStatus();
      } else {
        setSyncResult({ error: err instanceof ApiError ? err.message : "Sync failed" });
      }
    } finally {
      if (ticker) clearInterval(ticker);
      setSyncing(false);
    }
  };

  // The success flash is transient; the persistent syncResult banner stays.
  useEffect(() => {
    if (!syncFlash) return;
    const id = setTimeout(() => setSyncFlash(null), 3000);
    return () => clearTimeout(id);
  }, [syncFlash]);

  return (
    <div
      style={{
        ...DOT_GRID,
        maxWidth: 620,
        width: '100%',
        boxSizing: 'border-box',
        padding: tokens.spacing[2],
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(8px)',
        transition: reduced ? 'none' : `opacity ${tokens.transitions.slow}, transform ${tokens.transitions.slow}`,
      }}
    >
      {callbackNotice && (
        <div style={{
          padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
          marginBottom: tokens.spacing[5],
          borderRadius: tokens.radius.md,
          background: callbackNotice.ok ? tokens.colors.status.successBg : tokens.colors.status.errorBg,
          border: `1px solid ${callbackNotice.ok ? tokens.colors.status.successBorder : tokens.colors.status.errorBorder}`,
          color: callbackNotice.ok ? tokens.colors.status.success : tokens.colors.status.error,
          fontSize: 13,
        }}>
          {callbackNotice.message}
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: tokens.spacing[6],
          left: '50%',
          transform: 'translateX(-50%)',
          padding: `${tokens.spacing[3]} ${tokens.spacing[5]}`,
          background: tokens.colors.accent.primary,
          color: tokens.colors.text.inverse,
          borderRadius: tokens.radius.md,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: tokens.shadows.lg,
          zIndex: 9999,
          pointerEvents: 'none',
          animation: reduced ? 'none' : 'pw-toast-fade 2600ms ease-out',
        }}>
          {toast}
        </div>
      )}

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

      {onNavigate && <QuickActions onNavigate={onNavigate} reduced={reduced} />}

      {/* Profile */}
      <Card>
        <SectionLabel>Profile</SectionLabel>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing[4],
        }}>
          <div
            style={{
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
              position: 'relative',
              cursor: 'pointer',
              transition: `opacity ${tokens.transitions.fast}`,
            }}
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
            onClick={() => showToast('Photo upload coming soon')}
          >
            {initial}
            {avatarHover && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}>
                <Icons.Camera size={14} />
                <span style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Change
                </span>
              </div>
            )}
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
          <span
            className="pw-plan-badge"
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
              borderRadius: tokens.radius.sm,
              background: meta.bg,
              color: meta.color,
              border: `1px solid ${meta.border}`,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              animation: reduced ? 'none' : `pw-plan-glow 3s ease-in-out infinite`,
              '--glow-color': withAlpha(meta.glow, 0.3),
            }}
          >
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
              {Math.round(animatedCount)}
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
            width: animatedPct + '%',
            transition: reduced ? 'none' : `width ${tokens.transitions.slow}`,
          }} />
        </div>
      </Card>

      <PitchIntelligence checks={scoreChecks} reduced={reduced} />

      <ActivityFeed events={activity} loading={activityLoading} />

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
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing[2],
                  }}
                >
                  {syncing && !reduced && (
                    <span style={{
                      animation: 'pw-spin 1s linear infinite',
                      display: 'inline-flex',
                    }}>
                      <Icons.Refresh size={14} />
                    </span>
                  )}
                  {syncing ? `Checking ${syncScanned} emails...` : 'Sync Now'}
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
              {syncFlash && (
                <div style={{
                  marginTop: tokens.spacing[3],
                  fontSize: 12,
                  padding: tokens.spacing[2],
                  borderRadius: tokens.radius.sm,
                  background: tokens.colors.status.successBg,
                  border: `1px solid ${tokens.colors.status.successBorder}`,
                  color: tokens.colors.status.success,
                }}>
                  {syncFlash}
                </div>
              )}
              {syncResult && syncResult.error && (
                <div style={{
                  marginTop: tokens.spacing[3],
                  fontSize: 12,
                  padding: tokens.spacing[2],
                  borderRadius: tokens.radius.sm,
                  background: tokens.colors.status.errorBg,
                  border: `1px solid ${tokens.colors.status.errorBorder}`,
                  color: tokens.colors.status.error,
                }}>
                  {syncResult.error}
                </div>
              )}
              <div style={{
                fontSize: 11,
                color: tokens.colors.text.muted,
                marginTop: tokens.spacing[3],
                lineHeight: 1.5,
              }}>
                PitchWire checks your Gmail every 6 hours for investor replies and automatically updates your CRM.
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

      {!gmailConnected && gmailEligible && (
        <div style={{
          position: 'fixed',
          bottom: tokens.spacing[6],
          right: tokens.spacing[6],
          padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
          background: tokens.colors.bg.card,
          border: `1px solid ${tokens.colors.border.default}`,
          borderRadius: tokens.radius.md,
          fontSize: 12,
          color: tokens.colors.text.secondary,
          boxShadow: tokens.shadows.md,
          zIndex: 999,
        }}>
          Press <kbd style={{
            padding: '2px 6px',
            background: tokens.colors.bg.surface,
            border: `1px solid ${tokens.colors.border.default}`,
            borderRadius: tokens.radius.sm,
            fontWeight: 600,
            fontFamily: 'monospace',
          }}>G</kbd> to connect Gmail
        </div>
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

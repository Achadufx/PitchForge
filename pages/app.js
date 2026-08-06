import { useState, useEffect } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";
import DocumentUpload from "../components/DocumentUpload";
import { useRouter } from "next/router";
import AccountTab from "../components/AccountTab";
import CrmTab from "../components/crm/CrmTab";
import FollowupsTab from "../components/FollowupsTab";
import TemplatesTab from "../components/TemplatesTab";
import GlobalStyles from "../components/GlobalStyles";
import tokens from "../lib/designTokens";

// ============================================================
// DESIGN SYSTEM
// ============================================================
// DESIGN SYSTEM
// Palette lives in lib/designTokens.js so a colour change is one edit
// rather than a sweep across every component.
// ============================================================

// ============================================================
// SVG ICONS
// ============================================================

const Icon = ({ children, size = 20, color = 'currentColor', className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {children}
  </svg>
);

const Icons = {
  Target: (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Icon>,
  User: (p) => <Icon {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>,
  File: (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></Icon>,
  Rocket: (p) => <Icon {...p}><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></Icon>,
  Check: (p) => <Icon {...p}><path d="M20 6L9 17l-5-5" /></Icon>,
  X: (p) => <Icon {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>,
  Upload: (p) => <Icon {...p} size={24}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></Icon>,
  Link: (p) => <Icon {...p} size={16}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></Icon>,
  Linkedin: (p) => (
    <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  ArrowRight: (p) => <Icon {...p} size={18}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Icon>,
  ArrowLeft: (p) => <Icon {...p} size={18}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Icon>,
  Refresh: (p) => <Icon {...p} size={16}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></Icon>,
  Menu: (p) => <Icon {...p} size={24}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></Icon>,
  Close: (p) => <Icon {...p} size={24}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>,
  Sparkles: (p) => <Icon {...p}><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" /><path d="M12 14l1.5 4.5L18 20l-4.5-1.5L12 14z" /></Icon>,
  Building: (p) => <Icon {...p}><rect x="4" y="8" width="16" height="14" rx="1" /><path d="M12 22v-4" /><path d="M8 12h8" /><path d="M8 16h8" /></Icon>,
  Mail: (p) => <Icon {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7L12 13 2 7" /></Icon>,
};

// ============================================================
// STYLES
// ============================================================

const styles = {
  page: {
    minHeight: '100vh',
    background: tokens.colors.bg.base,
    color: tokens.colors.text.primary,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    paddingTop: '72px', // Space for fixed nav
  },
  main: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: `${tokens.spacing[8]} ${tokens.spacing[4]}`,
    width: '100%',
    boxSizing: 'border-box',
  },
};

const PLAN_LIMITS = { free: 10, starter: 100, pro: 500 };
const API_URL = "";

// ============================================================
// PARSE CSV
// ============================================================

function parseCsv(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const obj = {};
      headers.forEach((h, i) => (obj[h] = values[i] || ""));
      return obj;
    });
}

// ============================================================
// LOGO COMPONENT
// ============================================================

const Logo = ({ size = 28, alt = "PitchWire" }) => (
  <img
    src="/logo.png"
    alt={alt}
    loading="lazy"
    decoding="async"
    width={size}
    height={size} 
    style={{ 
      width: `${size}px`, 
      height: `${size}px`, 
      objectFit: 'contain',
      display: 'block',
    }} 
  />
);

// ============================================================
// SIDEBAR
// ============================================================

function Sidebar({ activeTab, setActiveTab, user, plan, pitchCount, onSignOut, mobileOpen, setMobileOpen }) {
  const limit = PLAN_LIMITS[plan] || 10;
  const pct = Math.min((pitchCount / limit) * 100, 100);
  
  const tabs = [
    { key: "campaign", icon: Icons.Rocket, label: "Campaign" },
    { key: "investors", icon: Icons.Target, label: "Investors" },
    { key: "crm", icon: Icons.Building, label: "CRM" },
    { key: "followups", icon: Icons.Mail, label: "Follow-ups" },
    { key: "templates", icon: Icons.File, label: "Templates" },
    { key: "account", icon: Icons.User, label: "Account" },
  ];

  return (
    <>
      {mobileOpen && <div className="pw-sidebar-overlay open" onClick={() => setMobileOpen(false)} />}

      <div className={`pw-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div style={{ 
          padding: `${tokens.spacing[5]} ${tokens.spacing[6]}`, 
          borderBottom: `1px solid ${tokens.colors.border.default}`,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing[3],
        }}>
          <Logo size={32} />
          <span style={{
            fontSize: '18px',
            fontWeight: 800,
            color: tokens.colors.text.primary,
            letterSpacing: '-0.02em',
          }}>
            PitchWire
          </span>
          {mobileOpen && (
            <button 
              onClick={() => setMobileOpen(false)}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: tokens.colors.text.secondary,
                cursor: 'pointer',
                padding: tokens.spacing[2],
                minHeight: '44px',
                minWidth: '44px',
              }}
            >
              <Icons.Close size={20} />
            </button>
          )}
        </div>

        <nav style={{ padding: `${tokens.spacing[3]} ${tokens.spacing[3]}`, flex: 1, overflowY: 'auto' }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  if (mobileOpen) setMobileOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[3],
                  padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
                  borderRadius: tokens.radius.md,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? tokens.colors.accent.subtle : 'transparent',
                  color: active ? tokens.colors.accent.secondary : tokens.colors.text.secondary,
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  fontWeight: active ? 600 : 500,
                  marginBottom: '2px',
                  transition: `all ${tokens.transitions.fast}`,
                  textAlign: 'left',
                  minHeight: '44px',
                }}
              >
                <Icon size={18} color={active ? tokens.colors.accent.secondary : tokens.colors.text.muted} />
                <span style={{ flex: 1 }}>{tab.label}</span>
                {active && (
                  <div style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: tokens.colors.accent.primary,
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ 
          padding: tokens.spacing[4], 
          borderTop: `1px solid ${tokens.colors.border.default}`,
        }}>
          <div className="pw-card" style={{ padding: tokens.spacing[4] }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: tokens.spacing[2],
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: tokens.colors.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {plan} plan
              </span>
              <span style={{
                fontSize: '11px',
                color: tokens.colors.text.muted,
              }}>
                {pitchCount}/{limit}
              </span>
            </div>
            <div className="pw-progress">
              <div className="pw-progress-fill" style={{
                width: pct + '%',
                // Solid fills only — the design system bans gradients.
                background: pct >= 90
                  ? tokens.colors.status.error
                  : tokens.colors.accent.primary,
              }} />
            </div>
            {plan === "free" && (
              <button 
                onClick={() => setActiveTab("account")}
                className="pw-btn-primary"
                style={{
                  width: '100%',
                  marginTop: tokens.spacing[3],
                  justifyContent: 'center',
                  padding: tokens.spacing[2],
                  fontSize: '12px',
                }}
              >
                Upgrade →
              </button>
            )}
            {plan === "starter" && (
              <button 
                onClick={() => setActiveTab("account")}
                className="pw-btn-primary"
                style={{
                  width: '100%',
                  marginTop: tokens.spacing[3],
                  justifyContent: 'center',
                  padding: tokens.spacing[2],
                  fontSize: '12px',
                  background: tokens.colors.accent.subtle,
                  color: tokens.colors.accent.secondary,
                  border: `1px solid ${tokens.colors.accent.subtleBorder}`,
                }}
              >
                Upgrade to Pro →
              </button>
            )}
            {plan === "pro" && (
              <div style={{
                marginTop: tokens.spacing[3],
                fontSize: '11px',
                color: tokens.colors.status.success,
                fontWeight: 600,
                textAlign: 'center',
              }}>
                ✓ Pro — Full access
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing[3],
            marginTop: tokens.spacing[3],
            padding: `${tokens.spacing[2]} ${tokens.spacing[2]}`,
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: tokens.colors.accent.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              color: tokens.colors.text.inverse,
              flexShrink: 0,
            }}>
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: tokens.colors.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user?.user_metadata?.full_name || "Founder"}
              </div>
              <div style={{
                fontSize: '11px',
                color: tokens.colors.text.muted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user?.email}
              </div>
            </div>
            <button
              onClick={onSignOut}
              title="Sign out"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: tokens.colors.text.muted,
                fontSize: '16px',
                padding: tokens.spacing[1],
                transition: `color ${tokens.transitions.fast}`,
                minHeight: '44px',
                minWidth: '44px',
              }}
            >
              →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// STEP INDICATOR
// ============================================================

function StepIndicator({ current }) {
  const labels = ["Upload Documents", "Review", "Send"];
  const STEPS = ["describe", "review", "send"];
  const currentIndex = STEPS.indexOf(current);

  return (
    <div className="pw-step-container" style={{
      display: 'flex',
      alignItems: 'center',
      marginBottom: tokens.spacing[6],
      gap: tokens.spacing[3],
      width: '100%',
    }}>
      {labels.map((label, i) => {
        const active = i === currentIndex;
        const done = currentIndex > i;
        const isLast = i === labels.length - 1;

        return (
          <div
            key={i}
            className="pw-step-gap"
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: isLast ? 'none' : 1,
              gap: tokens.spacing[3],
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: tokens.spacing[1],
            }}>
              <div className="pw-step-circle" style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: done 
                  ? tokens.colors.status.success 
                  : active 
                    ? tokens.colors.accent.primary 
                    : tokens.colors.bg.card,
                border: `2px solid ${
                  done 
                    ? tokens.colors.status.success 
                    : active 
                      ? tokens.colors.accent.primary 
                      : tokens.colors.border.default
                }`,
                color: done || active ? tokens.colors.text.inverse : tokens.colors.text.muted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                transition: `all ${tokens.transitions.base}`,
              }}>
                {done ? <Icons.Check size={14} /> : i + 1}
              </div>
              <span className="pw-step-label" style={{
                fontSize: '10px',
                fontWeight: active ? 600 : 400,
                color: active 
                  ? tokens.colors.accent.secondary 
                  : done 
                    ? tokens.colors.status.success 
                    : tokens.colors.text.muted,
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
            {!isLast && (
              <div style={{
                flex: 1,
                height: '2px',
                background: done ? tokens.colors.status.success : tokens.colors.border.default,
                transition: `background ${tokens.transitions.base}`,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// GENERATE SINGLE
// ============================================================

// Paces campaign requests. Gemini's free tier enforces a per-minute request
// quota, and a campaign fires 2 Gemini calls per investor, so an unthrottled
// 5-investor run bursts 10 calls in seconds and the later ones get 429s.
const CAMPAIGN_DELAY_MS = 8000;

// Client-side continuation of the 15s/30s/60s backoff schedule. The server can
// only execute the first step or so before Vercel kills the function at 60s, so
// the browser carries the rest — it has no execution limit. This is what makes a
// rate-limited investor recover instead of failing.
const RATE_LIMIT_RETRY_DELAYS_MS = [15000, 30000, 60000];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Throws on failure. It must NOT substitute a generic template: doing that made
// every backend failure look like a working-but-bland pitch, which is why the
// pipeline appeared to "work" while producing garbage.
async function generateSingle(inv, startup) {
  console.log('Generating pitch for: ' + inv.name);

  var res;
  try {
    // Optional: lets the route file the draft against the CRM. Generation works
    // without it.
    var pitchHeaders = { 'Content-Type': 'application/json' };
    try {
      var sess = await supabase.auth.getSession();
      if (sess && sess.data && sess.data.session && sess.data.session.access_token) {
        pitchHeaders.Authorization = 'Bearer ' + sess.data.session.access_token;
      }
    } catch (authErr) {
      console.error('Could not attach session to pitch generation:', authErr);
    }

    res = await fetch('/api/research-and-pitch', {
      method: 'POST',
      headers: pitchHeaders,
      body: JSON.stringify({
        investorName: inv.name,
        firm: inv.firm || '',
        startupName: startup.name,
        description: startup.description,
        ask: startup.ask,
        startupProfile: {
          sector: startup.sector || '',
          stage: startup.stage || '',
          geography: startup.geography || ['Global'],
        }
      })
    });
  } catch (err) {
    throw new Error('Could not reach the pitch service: ' + err.message);
  }

  var responseText = await res.text();
  var data = null;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    throw new Error('Pitch service returned a non-JSON response (HTTP ' + res.status + '): ' +
      responseText.substring(0, 200));
  }

  if (data.success && data.pitch && data.pitch.subject && data.pitch.body) {
    console.log('Pitch generated for ' + inv.name + ' | score: ' + (data.score || 'N/A') +
      ' | research: ' + (data.research ? 'yes' : 'no'));
    return { subject: data.pitch.subject, body: data.pitch.body };
  }

  var reason = data.error || 'Pitch generation failed (HTTP ' + res.status + ')';
  console.error('Pitch failed for ' + inv.name + ': ' + reason);
  var failure = new Error(reason);
  // Lets the campaign loop slow down instead of burning the remaining investors
  // against a quota that is already exhausted.
  failure.rateLimited = res.status === 429 || !!data.rateLimited;
  throw failure;
}
// ============================================================
// REVIEW STEP - FIXED (Pitch body fills the box)
// ============================================================

function ReviewStep({ investors, startup, onNext, onBack, onPitchGenerated }) {
  const [pitches, setPitches] = useState([]);
  const [selected, setSelected] = useState([]);
  const [generating, setGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [regenerating, setRegenerating] = useState({});
  const [editingPitch, setEditingPitch] = useState(null);
  const [editedBody, setEditedBody] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  // Explains a long pause during rate-limit backoff. Without it a 60s wait is
  // indistinguishable from the app hanging.
  const [rateLimitNotice, setRateLimitNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    const generate = async () => {
      const results = [];
      // Grows when the server reports a rate limit, so the rest of the campaign
      // paces itself instead of hammering an exhausted quota.
      let pacing = CAMPAIGN_DELAY_MS;

      for (let i = 0; i < investors.length; i++) {
        if (cancelled) return;

        // Space out requests. Skipped before the first call so a single-investor
        // campaign has no artificial wait.
        if (i > 0) {
          await delay(pacing);
          if (cancelled) return;
        }

        // Retry this investor through the full backoff schedule before giving up.
        // The server returns 429 quickly (it cannot afford to sleep), so without
        // this the investor would be abandoned the moment quota ran out.
        let outcome = null;
        let lastError = null;

        for (let attempt = 0; attempt <= RATE_LIMIT_RETRY_DELAYS_MS.length; attempt++) {
          if (cancelled) return;
          try {
            outcome = await generateSingle(investors[i], startup);
            break;
          } catch (err) {
            lastError = err;

            // Only quota failures are worth waiting on; anything else will fail
            // again identically.
            if (!err || !err.rateLimited || attempt === RATE_LIMIT_RETRY_DELAYS_MS.length) break;

            const waitMs = RATE_LIMIT_RETRY_DELAYS_MS[attempt];
            // Once quota is hit, every later investor needs more room too.
            pacing = Math.max(pacing, waitMs);
            console.warn(
              'Rate limited on ' + investors[i].name + '. Waiting ' + (waitMs / 1000) +
              's before retry ' + (attempt + 1) + ' of ' + RATE_LIMIT_RETRY_DELAYS_MS.length +
              '. Campaign spacing raised to ' + (pacing / 1000) + 's.'
            );
            setRateLimitNotice(
              'Rate limited — waiting ' + Math.round(waitMs / 1000) + 's to retry ' +
              investors[i].name + ' (attempt ' + (attempt + 1) + ' of ' +
              RATE_LIMIT_RETRY_DELAYS_MS.length + ')...'
            );
            await delay(waitMs);
            if (cancelled) return;
            setRateLimitNotice('');
          }
        }

        if (outcome) {
          results.push({
            ...investors[i],
            subject: outcome.subject,
            body: outcome.body,
            error: false,
          });
          onPitchGenerated(1);
        } else {
          const msg = lastError && lastError.rateLimited
            ? 'Rate limited — AI provider quota exhausted after ' +
              RATE_LIMIT_RETRY_DELAYS_MS.length +
              ' retries. Press Redo on this investor in a minute, or check the server logs for which provider.'
            : (lastError ? lastError.message : 'Pitch generation failed');
          console.error('Giving up on ' + investors[i].name + ': ' + msg);
          results.push({
            ...investors[i],
            subject: "",
            body: "",
            error: msg,
            rateLimited: !!(lastError && lastError.rateLimited),
          });
        }

        if (!cancelled) setProgress(i + 1);
      }

      if (cancelled) return;

      setRateLimitNotice('');
      setPitches(results);
      // Only preselect pitches that actually generated. Selecting everything
      // meant a failed pitch (empty body) could be sent to a real investor.
      setSelected(
        results
          .map((r, i) => (r.error ? -1 : i))
          .filter((i) => i !== -1)
      );
      setGenerating(false);
    };

    generate();

    // Prevents state updates after unmount if the user navigates mid-campaign.
    return () => { cancelled = true; };
  }, []);

  const handleRegenerate = async (i) => {
    setRegenerating((prev) => ({ ...prev, [i]: true }));

    let outcome = null;
    let lastError = null;

    // Same backoff schedule as the campaign loop. Without this, hitting Redo
    // during a quota window failed instantly with no explanation.
    for (let attempt = 0; attempt <= RATE_LIMIT_RETRY_DELAYS_MS.length; attempt++) {
      try {
        outcome = await generateSingle(pitches[i], startup);
        break;
      } catch (err) {
        lastError = err;
        if (!err || !err.rateLimited || attempt === RATE_LIMIT_RETRY_DELAYS_MS.length) break;

        const waitMs = RATE_LIMIT_RETRY_DELAYS_MS[attempt];
        const secs = Math.round(waitMs / 1000);

        // Visible on the pitch card itself, so the user knows it is waiting
        // rather than broken.
        setPitches((prev) => {
          const u = [...prev];
          u[i] = {
            ...u[i],
            error: 'Rate limited — waiting ' + secs + 's to retry (attempt ' +
              (attempt + 1) + ' of ' + RATE_LIMIT_RETRY_DELAYS_MS.length + ')...',
            rateLimited: true,
          };
          return u;
        });
        setRateLimitNotice('Rate limited — waiting ' + secs + 's to retry ' +
          (pitches[i].name || 'this investor') + '...');

        await delay(waitMs);
      }
    }

    if (outcome) {
      setPitches((prev) => {
        const u = [...prev];
        u[i] = {
          ...u[i],
          subject: outcome.subject,
          body: outcome.body,
          error: false,
          rateLimited: false,
        };
        return u;
      });
    } else {
      const msg = lastError && lastError.rateLimited
        ? 'Rate limited — AI provider quota exhausted after ' +
          RATE_LIMIT_RETRY_DELAYS_MS.length + ' retries. Wait a minute, then press Redo again.'
        : (lastError ? lastError.message : 'Pitch generation failed');
      setPitches((prev) => {
        const u = [...prev];
        u[i] = { ...u[i], error: msg, rateLimited: !!(lastError && lastError.rateLimited) };
        return u;
      });
    }

    setRateLimitNotice('');
    setRegenerating((prev) => ({ ...prev, [i]: false }));
  };

  const handleEdit = (index) => {
    setEditingPitch(index);
    setEditedBody(pitches[index].body);
    setEditedSubject(pitches[index].subject);
  };

  const handleSaveEdit = (index) => {
    setPitches((prev) => {
      const u = [...prev];
      u[index] = {
        ...u[index],
        subject: editedSubject,
        body: editedBody,
      };
      return u;
    });
    setEditingPitch(null);
    setEditedBody("");
    setEditedSubject("");
  };

  if (generating) {
    return (
      <div style={{ textAlign: "center", padding: tokens.spacing[12] }}>
        <div style={{ fontSize: 36, marginBottom: tokens.spacing[4] }}>⚡</div>
        <h3 className="pw-h3">Crafting personalized pitches...</h3>
        <p style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[6] }}>
          {progress} of {investors.length} done
        </p>
        {rateLimitNotice && (
          <p style={{
            color: tokens.colors.status.warning,
            fontSize: '13px',
            marginBottom: tokens.spacing[6],
            maxWidth: 420,
            margin: `0 auto ${tokens.spacing[6]}`,
            lineHeight: 1.6,
          }}>
            ⏳ {rateLimitNotice}
          </p>
        )}
        <div style={{ maxWidth: 240, margin: '0 auto' }}>
          <div className="pw-progress">
            <div className="pw-progress-fill" style={{ width: (investors.length ? (progress / investors.length) * 100 : 0) + "%" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: tokens.spacing[4],
        flexWrap: 'wrap',
        gap: tokens.spacing[2],
      }}>
        <h2 className="pw-h2">Review pitches</h2>
        <span style={{ fontSize: '13px', color: tokens.colors.text.secondary }}>
          {selected.length}/{pitches.length} selected
        </span>
      </div>
      <div className="pw-scroll-pitches">
        {pitches.map((pitch, i) => (
          <div key={i} className="pw-card" style={{
            border: `1px solid ${selected.includes(i) ? tokens.colors.accent.primary : tokens.colors.border.default}`,
            background: selected.includes(i) ? tokens.colors.accent.subtle : 'transparent',
          }}>
            <div style={{ display: 'flex', gap: tokens.spacing[3], flex: 1, alignItems: 'stretch' }}>
              <input
                type="checkbox"
                checked={selected.includes(i)}
                onChange={() => setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}
                style={{
                  marginTop: '2px',
                  accentColor: tokens.colors.accent.primary,
                  flexShrink: 0,
                  width: 18,
                  height: 18,
                  cursor: 'pointer',
                }}
              />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: tokens.spacing[2],
                  flexWrap: 'wrap',
                  gap: tokens.spacing[2],
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: tokens.colors.text.primary, fontSize: '14px' }}>{pitch.name}</span>
                    <span style={{ color: tokens.colors.text.muted, fontSize: '12px', marginLeft: tokens.spacing[2] }}>{pitch.firm || ""}</span>
                  </div>
                  <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleEdit(i)}
                      style={{
                        background: tokens.colors.accent.subtle,
                        border: `1px solid ${tokens.colors.accent.subtleBorder}`,
                        borderRadius: tokens.radius.sm,
                        padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
                        fontSize: '10px',
                        color: tokens.colors.accent.secondary,
                        cursor: 'pointer',
                        minHeight: '32px',
                        minWidth: '44px',
                        fontWeight: 600,
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleRegenerate(i)}
                      disabled={regenerating[i]}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${tokens.colors.border.default}`,
                        borderRadius: tokens.radius.sm,
                        padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
                        fontSize: '10px',
                        color: tokens.colors.text.muted,
                        cursor: 'pointer',
                        minHeight: '32px',
                        minWidth: '44px',
                      }}
                    >
                      {regenerating[i] ? "..." : "🔄 Redo"}
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: tokens.colors.text.muted, marginBottom: tokens.spacing[2] }}>{pitch.email}</div>
                {editingPitch === i ? (
                  <div>
                    <div style={{ marginBottom: tokens.spacing[2] }}>
                      <label className="pw-label" style={{ fontSize: '11px' }}>Subject</label>
                      <input
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        className="pw-input"
                        style={{ fontSize: '13px', padding: tokens.spacing[2] }}
                      />
                    </div>
                    <div style={{ marginBottom: tokens.spacing[2] }}>
                      <label className="pw-label" style={{ fontSize: '11px' }}>Body</label>
                      <textarea
                        value={editedBody}
                        onChange={(e) => setEditedBody(e.target.value)}
                        rows={8}
                        className="pw-textarea"
                        style={{
                          fontSize: '15px',
                          padding: tokens.spacing[3],
                          minHeight: '200px',
                          lineHeight: 1.8,
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleSaveEdit(i)}
                      className="pw-btn-primary"
                      style={{ padding: `${tokens.spacing[1]} ${tokens.spacing[4]}`, fontSize: '12px' }}
                    >
                      Save Changes
                    </button>
                  </div>
                ) : pitch.error ? (
                  // Rate limits are temporary and retryable, so they read as a
                  // warning with a next step rather than a hard failure.
                  <div style={{
                    color: pitch.rateLimited ? tokens.colors.status.warning : tokens.colors.status.error,
                    fontSize: '12px',
                    lineHeight: 1.6,
                    background: pitch.rateLimited ? 'rgba(251,191,36,0.08)' : 'transparent',
                    border: pitch.rateLimited ? '1px solid rgba(251,191,36,0.25)' : 'none',
                    borderRadius: pitch.rateLimited ? tokens.radius.sm : 0,
                    padding: pitch.rateLimited ? tokens.spacing[3] : 0,
                  }}>
                    {pitch.rateLimited ? '⏳' : '⚠'} {pitch.error}
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '13px', color: tokens.colors.accent.secondary, fontWeight: 600, marginBottom: tokens.spacing[2] }}>
                      Subject: {pitch.subject}
                    </div>
                    <div style={{
                      fontSize: '15px',
                      color: tokens.colors.text.secondary,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.9,
                      background: tokens.colors.bg.surface,
                      borderRadius: tokens.radius.md,
                      padding: tokens.spacing[4],
                      width: '100%',
                      boxSizing: 'border-box',
                      flex: 1,
                      overflow: 'auto',
                      minHeight: '250px',
                    }}>
                      {pitch.body}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{
        display: 'flex',
        gap: tokens.spacing[3],
      }}>
        <button onClick={onBack} className="pw-btn-secondary">← Back</button>
        <button
          onClick={() => onNext(pitches.filter((_, i) => selected.includes(i)))}
          disabled={selected.length === 0}
          className="pw-btn-primary"
          style={{
            flex: 1,
            justifyContent: 'center',
            opacity: selected.length > 0 ? 1 : 0.4,
            cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          Send {selected.length} Pitch{selected.length !== 1 ? "es" : ""} →
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SEND STEP
// ============================================================

function SendStep({ pitches, onRestart }) {
  const [senderName, setSenderName] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);

  const handleSend = async () => {
    if (!senderName) return;
    setSending(true);
    try {
      // The token is what lets /api/send-pitches mirror these sends into the
      // CRM. It is optional there by design — without it the emails still go
      // out, they just don't land on a timeline.
      const headers = { "Content-Type": "application/json" };
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.access_token) {
          headers.Authorization = "Bearer " + session.access_token;
        }
      } catch (authErr) {
        console.error("Could not attach session to send:", authErr);
      }

      const res = await fetch(API_URL + "/api/send-pitches", {
        method: "POST",
        headers,
        body: JSON.stringify({ pitches, senderName }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      setResults(pitches.map(p => ({ ...p, success: false, error: err.message })));
    }
    setSending(false);
    setDone(true);
  };

  if (done) {
    const succeeded = results.filter(r => r.success).length;
    return (
      <div style={{ textAlign: "center", padding: tokens.spacing[12] }}>
        <div style={{ fontSize: 48, marginBottom: tokens.spacing[4] }}>🚀</div>
        <h2 className="pw-h2">{succeeded} pitch{succeeded !== 1 ? "es" : ""} sent!</h2>
        <p className="pw-body" style={{ marginBottom: tokens.spacing[6] }}>Now sit back and let the replies come in.</p>
        <button onClick={onRestart} className="pw-btn-primary">Start new campaign</button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <h2 className="pw-h2">Ready to launch</h2>
      <p className="pw-body">Your name will appear as the sender.</p>
      <div style={{ marginBottom: tokens.spacing[4] }}>
        <label className="pw-label">Your name</label>
        <input
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          placeholder="e.g. Samuel"
          className="pw-input"
        />
      </div>
      <div style={{
        background: 'rgba(52, 211, 153, 0.08)',
        border: `1px solid ${tokens.colors.status.success}`,
        borderRadius: tokens.radius.md,
        padding: tokens.spacing[3],
        marginBottom: tokens.spacing[4],
        fontSize: '13px',
        color: tokens.colors.status.success,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing[2],
        flexWrap: 'wrap',
      }}>
        <Icons.Check size={16} />
        <span>{pitches.length} pitch{pitches.length !== 1 ? "es" : ""} queued and ready</span>
      </div>
      <button
        onClick={handleSend}
        disabled={sending || !senderName}
        className="pw-btn-primary"
        style={{
          width: '100%',
          justifyContent: 'center',
          opacity: (sending || !senderName) ? 0.4 : 1,
          cursor: (sending || !senderName) ? 'not-allowed' : 'pointer',
        }}
      >
        {sending ? "Sending..." : `🚀 Send ${pitches.length} Pitch${pitches.length !== 1 ? "es" : ""}`}
      </button>
    </div>
  );
}

// ============================================================
// DESCRIBE STEP
// ============================================================

function DescribeStep({ onNext, onBack, plan, preloadedInvestors, savedProfile, setSavedProfile }) {
  const [mode, setMode] = useState("upload");
  const [startup, setStartup] = useState({
    name: "",
    description: "",
    ask: "",
  });
  const [profile, setProfile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchedInvestors, setMatchedInvestors] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvInvestors, setCsvInvestors] = useState([]);
  const [shareWithDatabase, setShareWithDatabase] = useState(false);
  const valid = startup.name && startup.description && startup.ask && selectedIndices.length > 0;

  useEffect(() => {
    if (savedProfile) {
      setStartup({
        name: savedProfile.company_name || "",
        description: savedProfile.pitch_summary || "",
        ask: savedProfile.amount_raising || "",
      });
      setProfile({
        companyName: savedProfile.company_name,
        sector: savedProfile.industry,
        stage: savedProfile.stage,
        amountRaising: savedProfile.amount_raising,
        country: savedProfile.country,
        businessModel: savedProfile.business_model,
        traction: savedProfile.traction,
        revenue: savedProfile.revenue,
        users: savedProfile.users_count,
      });
      setMode("review");
      discoverInvestorsForProfile({
        sector: savedProfile.industry,
        stage: savedProfile.stage,
        country: savedProfile.country,
      });
    }
  }, [savedProfile]);

  useEffect(() => {
    if (preloadedInvestors && preloadedInvestors.length > 0) {
      const withScores = preloadedInvestors.map(inv => ({
        ...inv,
        firm: inv.firm || inv.name || 'Unknown Investor',
        score: 95,
        source: 'manual'
      }));
      setMatchedInvestors(withScores);
      setSelectedIndices(withScores.map((_, i) => i));
    }
  }, [preloadedInvestors]);

  const discoverInvestorsForProfile = async (profileData) => {
    setIsLoadingMatches(true);
    try {
      const startupProfile = {
        sector: profileData.sector || "",
        stage: profileData.stage || "",
        geography: [profileData.country || "Global"],
        tags: [profileData.sector || ""]
      };

      const res = await fetch("/api/discover-investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupProfile })
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.investors) && data.investors.length > 0) {
        const scoredInvestors = data.investors.map((inv, index) => ({
          ...inv,
          id: inv.id || `investor-${index}-${Date.now()}`,
          firm: inv.firm || inv.name || 'Unknown Investor',
          name: inv.name || inv.firm || 'Unknown Investor',
          score: inv.matchScore || Math.floor(Math.random() * 25) + 70,
          source: 'discovered',
          matchReasons: inv.matchReasons || "AI matched investor"
        }));
        setMatchedInvestors(prev => {
          const existing = prev.filter(inv => inv.source !== 'discovered');
          return [...existing, ...scoredInvestors];
        });
        setSelectedIndices([0, 1, 2, 3, 4].filter(i => i < scoredInvestors.length));
      }
    } catch (err) {
      console.error("Investor discovery failed:", err);
    }
    setIsLoadingMatches(false);
  };

  const handleCsvFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCsv(ev.target.result);
        if (parsed[0]?.name && parsed[0]?.email) {
          const formattedInvestors = parsed.map(inv => ({
            ...inv,
            firm: inv.firm || inv.name || 'Unknown Investor',
            name: inv.name || inv.firm || 'Unknown Investor',
            score: 100,
            source: 'csv'
          }));
          setCsvInvestors(formattedInvestors);
          setShowCsvUpload(false);
          
          setMatchedInvestors(prev => {
            const newList = [...prev, ...formattedInvestors];
            const newIndices = formattedInvestors.map((_, i) => prev.length + i);
            setSelectedIndices(prevIndices => [...prevIndices, ...newIndices]);
            return newList;
          });
          
          alert(`✅ Added ${formattedInvestors.length} investors from CSV!`);
        }
      } catch(err) {
        alert("Error parsing CSV. Make sure it has 'name' and 'email' columns.");
      }
    };
    reader.readAsText(file);
  };

  const handleProfileComplete = async (p) => {
    setProfile(p);
    setIsAnalyzing(true);
    
    try {
      const res = await fetch("/api/analyze-startup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: p.companyName || "",
          description: p.pitchSummary || p.description || "",
          amountRaising: p.amountRaising || "",
          industry: p.sector || p.industry || "",
          stage: p.stage || "",
          sector: p.sector || "",
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        const scoredInvestors = (data.matchedInvestors || []).map((inv, index) => ({
          ...inv,
          firm: inv.firm || inv.name || 'Unknown Investor',
          name: inv.name || inv.firm || 'Unknown Investor',
          score: inv.score || Math.floor(Math.random() * 25) + 70,
          source: 'auto'
        }));
        scoredInvestors.sort((a, b) => b.score - a.score);
        setMatchedInvestors(scoredInvestors);
        setSelectedIndices([0, 1, 2, 3, 4].filter(i => i < scoredInvestors.length));
        setStartup({
          name: data.analysis?.companyName || p.companyName || "",
          description: data.analysis?.description || p.pitchSummary || p.description || "",
          ask: data.analysis?.amountRaising || p.amountRaising || "",
        });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const profileData = {
              user_id: user.id,
              company_name: data.analysis?.companyName || p.companyName || "",
              industry: data.analysis?.industry || p.sector || "",
              stage: data.analysis?.stage || p.stage || "",
              amount_raising: data.analysis?.amountRaising || p.amountRaising || "",
              country: p.country || "",
              business_model: data.analysis?.businessModel || p.businessModel || "",
              traction: data.analysis?.traction || p.traction || "",
              revenue: data.analysis?.revenue || p.revenue || "",
              users_count: data.analysis?.users || p.users || "",
              pitch_summary: data.analysis?.pitchSummary || p.pitchSummary || p.description || "",
              updated_at: new Date().toISOString()
            };
            
            const { error } = await supabase
              .from('startup_profiles')
              .upsert(profileData, { onConflict: 'user_id' });
            
            if (error) {
              console.error("Supabase save error:", error);
            } else {
              if (setSavedProfile) {
                setSavedProfile({
                  company_name: profileData.company_name,
                  industry: profileData.industry,
                  stage: profileData.stage,
                  amount_raising: profileData.amount_raising,
                  country: profileData.country,
                  business_model: profileData.business_model,
                  traction: profileData.traction,
                  revenue: profileData.revenue,
                  users_count: profileData.users_count,
                  pitch_summary: profileData.pitch_summary,
                });
              }
            }
          }
        } catch (saveErr) {
          console.error("Failed to save profile:", saveErr);
        }

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const startupProfile = {
              sector: data.analysis?.industry || p.sector || "",
              stage: data.analysis?.stage || p.stage || "",
              geography: [p.country || "Global"],
              tags: [data.analysis?.sector || p.sector || ""]
            };

            const discoverRes = await fetch("/api/discover-investors", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ startupProfile })
            });

            const discoverData = await discoverRes.json();
            if (discoverData.success && Array.isArray(discoverData.investors) && discoverData.investors.length > 0) {
              const discoveredInvestors = discoverData.investors.map((inv, index) => ({
                ...inv,
                id: inv.id || `investor-${index}-${Date.now()}`,
                firm: inv.firm || inv.name || 'Unknown Investor',
                name: inv.name || inv.firm || 'Unknown Investor',
                score: inv.matchScore || Math.floor(Math.random() * 25) + 70,
                source: 'discovered',
                matchReasons: inv.matchReasons || "AI matched investor"
              }));
              setMatchedInvestors(prev => {
                const existing = prev.filter(inv => inv.source !== 'discovered');
                return [...existing, ...discoveredInvestors];
              });
            }
          }
        } catch (discoverErr) {
          console.error("Investor discovery failed:", discoverErr);
        }
      }
    } catch (err) {
      console.error("Investor matching failed:", err);
      setStartup({
        name: p.companyName || "",
        description: p.pitchSummary || p.description || "",
        ask: p.amountRaising || "",
      });
    }
    
    setIsAnalyzing(false);
    setMode("review");
  };

  const toggleInvestor = (index) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const isSelected = (index) => {
    return selectedIndices.includes(index);
  };

  const getSelectedInvestors = () => {
    return selectedIndices.map(i => matchedInvestors[i]).filter(Boolean);
  };

  const handleDiscoverInvestors = async () => {
    setIsLoadingMatches(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && profile) {
        const startupProfile = {
          sector: profile.sector || "",
          stage: profile.stage || "",
          geography: [profile.country || "Global"],
          tags: [profile.sector || ""]
        };
        
        const res = await fetch("/api/discover-investors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startupProfile })
        });
        
        const data = await res.json();
        if (data.success && data.investors.length > 0) {
          const scoredInvestors = data.investors.map((inv, index) => ({
            ...inv,
            id: inv.id || `investor-${index}-${Date.now()}`,
            firm: inv.firm || inv.name || 'Unknown Investor',
            name: inv.name || inv.firm || 'Unknown Investor',
            score: inv.matchScore || Math.floor(Math.random() * 25) + 70,
            source: 'discovered',
            matchReasons: inv.matchReasons || "AI matched investor"
          }));
          setMatchedInvestors(prev => {
            const existing = prev.filter(inv => inv.source !== 'discovered');
            return [...existing, ...scoredInvestors];
          });
          alert(`✅ Found ${data.count} matching investors!`);
        } else {
          alert('ℹ️ No matching investors found in the database.');
        }
      }
    } catch (err) {
      alert('Failed to discover investors');
      console.error(err);
    }
    setIsLoadingMatches(false);
  };

  if (mode === "review" && profile) {
    return (
      <div style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: tokens.spacing[4] }}>
          <h2 className="pw-h2">
            {isAnalyzing || isLoadingMatches ? 
              (isAnalyzing ? "Analyzing your documents..." : "Searching for investors...") : 
              savedProfile ? "Welcome back!" : "Startup profile ready"
            }
          </h2>
          <p className="pw-body">
            {savedProfile ? "Your saved startup profile is ready. Review and select investors." : 
             isAnalyzing || isLoadingMatches ? "This will take a moment..." :
             "Review your profile and select the best investors to pitch to."
            }
          </p>
        </div>

        {isAnalyzing || isLoadingMatches ? (
          <div style={{ textAlign: "center", padding: tokens.spacing[12] }}>
            <div style={{ fontSize: 48, marginBottom: tokens.spacing[4] }}>
              {isLoadingMatches ? <Icons.Target size={48} color={tokens.colors.accent.primary} /> : <Icons.Sparkles size={48} color={tokens.colors.accent.primary} />}
            </div>
            <p className="pw-body" style={{ marginBottom: tokens.spacing[6] }}>
              {isLoadingMatches ? "Finding the best investors for your startup..." : "Analyzing your documents..."}
            </p>
            <div style={{ maxWidth: 240, margin: '0 auto' }}>
              <div className="pw-progress">
                <div className="pw-progress-fill" style={{ width: '60%', animation: 'pulse 1.5s infinite' }} />
              </div>
              <style>{`
                @keyframes pulse {
                  0%, 100% { width: 60%; }
                  50% { width: 85%; }
                }
              `}</style>
            </div>
          </div>
        ) : (
          <>
            <div className="pw-card">
              <div style={{ 
                fontSize: '11px', 
                fontWeight: 600, 
                color: tokens.colors.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: tokens.spacing[4],
              }}>
                Startup Profile
              </div>
              <div className="pw-grid">
                {[
                  ["Company", profile.companyName],
                  ["Sector", profile.sector],
                  ["Stage", profile.stage],
                  ["Raising", profile.amountRaising],
                  ["Location", profile.country],
                  ["Model", profile.businessModel],
                  ["Traction", profile.traction],
                  ["Revenue", profile.revenue],
                  ["Users", profile.users],
                ]
                  .filter(([, v]) => v && v !== "undefined" && v !== "null" && v !== "")
                  .map(([k, v], i) => (
                    <div key={i}>
                      <div style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: tokens.colors.text.muted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: tokens.spacing[1],
                      }}>
                        {k}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: tokens.colors.text.primary,
                        fontWeight: 500,
                      }}>
                        {v}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div style={{ marginTop: tokens.spacing[4] }}>
              {[
                { key: "name", label: "Company name" },
                { key: "description", label: "Pitch description", multiline: true },
                { key: "ask", label: "Amount raising" },
              ].map(({ key, label, multiline }) => (
                <div key={key} style={{ marginBottom: tokens.spacing[4] }}>
                  <label className="pw-label">{label}</label>
                  {multiline ? (
                    <textarea
                      value={startup[key] || ""}
                      onChange={(e) => setStartup({ ...startup, [key]: e.target.value })}
                      rows={4}
                      className="pw-textarea"
                    />
                  ) : (
                    <input
                      value={startup[key] || ""}
                      onChange={(e) => setStartup({ ...startup, [key]: e.target.value })}
                      className="pw-input"
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={{ 
              borderTop: `1px solid ${tokens.colors.border.default}`,
              paddingTop: tokens.spacing[4],
              marginTop: tokens.spacing[4],
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: tokens.spacing[3],
                flexWrap: 'wrap',
                gap: tokens.spacing[3],
              }}>
                <div>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: tokens.colors.text.primary,
                  }}>
                    Matched Investors
                  </span>
                  <span style={{
                    fontSize: '13px',
                    color: tokens.colors.text.secondary,
                    marginLeft: tokens.spacing[3],
                  }}>
                    {selectedIndices.length} selected
                  </span>
                </div>
                <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                  <button
                    onClick={handleDiscoverInvestors}
                    className="pw-btn-primary"
                  >
                    <Icons.Refresh size={14} />
                    Discover
                  </button>
                </div>
              </div>

              <div className="pw-dropzone" style={{
                border: `2px dashed ${csvFile ? tokens.colors.accent.primary : tokens.colors.border.default}`,
                background: tokens.colors.bg.surface,
                marginBottom: tokens.spacing[4],
              }}
              onClick={() => document.getElementById('csv-upload-input').click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = tokens.colors.accent.primary;
                e.currentTarget.style.background = tokens.colors.accent.subtle;
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.border.default;
                e.currentTarget.style.background = 'transparent';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  const input = document.getElementById('csv-upload-input');
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  input.files = dt.files;
                  input.dispatchEvent(new Event('change'));
                }
              }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tokens.spacing[2] }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: csvFile ? tokens.colors.accent.subtle : 'rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {csvFile ? '✅' : '📂'}
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: tokens.colors.text.primary,
                  }}>
                    {csvFile ? csvFile.name : 'Upload your own investor CSV'}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: tokens.colors.text.muted,
                  }}>
                    {csvFile 
                      ? `${csvInvestors.length} investors loaded`
                      : 'Drop your CSV here or click to browse'
                    }
                  </div>
                  {csvFile && (
                    <div style={{ display: 'flex', gap: tokens.spacing[2], marginTop: tokens.spacing[2] }}>
                      <span className="pw-tag-accent">
                        {csvInvestors.length} investors added
                      </span>
                    </div>
                  )}
                  <input
                    id="csv-upload-input"
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={handleCsvFileSelect}
                  />
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing[3],
                padding: tokens.spacing[3],
                background: shareWithDatabase ? tokens.colors.accent.subtle : 'transparent',
                borderRadius: tokens.radius.md,
                border: `1px solid ${shareWithDatabase ? tokens.colors.accent.primary : tokens.colors.border.default}`,
                marginBottom: tokens.spacing[3],
                transition: `all ${tokens.transitions.base}`,
                width: '100%',
                boxSizing: 'border-box',
              }}>
                <input
                  type="checkbox"
                  checked={shareWithDatabase}
                  onChange={(e) => setShareWithDatabase(e.target.checked)}
                  style={{
                    accentColor: tokens.colors.accent.primary,
                    width: 18,
                    height: 18,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: tokens.colors.text.primary,
                  }}>
                    Share with PitchWire's investor database
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: tokens.colors.text.muted,
                  }}>
                    Help other founders find the right investors. Your investors will be anonymized.
                  </div>
                </div>
                {shareWithDatabase && (
                  <div className="pw-tag-accent">
                    ✓ Shared
                  </div>
                )}
              </div>

              <div className="pw-scroll">
                {matchedInvestors.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: tokens.spacing[8],
                    color: tokens.colors.text.muted,
                    fontSize: '14px',
                  }}>
                    No investors matched. Click "Discover" to find matches.
                  </div>
                ) : (
                  matchedInvestors.map((inv, index) => (
                    <div
                      key={index}
                      onClick={() => toggleInvestor(index)}
                      className="pw-card"
                      style={{
                        padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
                        border: `1px solid ${isSelected(index) ? tokens.colors.accent.primary : tokens.colors.border.default}`,
                        background: isSelected(index) ? tokens.colors.accent.subtle : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: tokens.spacing[3] }}>
                        <input
                          type="checkbox"
                          checked={isSelected(index)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleInvestor(index);
                          }}
                          style={{
                            marginTop: '2px',
                            accentColor: tokens.colors.accent.primary,
                            cursor: 'pointer',
                            flexShrink: 0,
                            width: 18,
                            height: 18,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: tokens.spacing[2],
                            flexWrap: 'wrap',
                          }}>
                            <div>
                              <div style={{
                                fontWeight: 600,
                                color: tokens.colors.text.primary,
                                fontSize: '14px',
                              }}>
                                {inv.name || inv.firm}
                                {inv.source === 'discovered' && (
                                  <span className="pw-tag-accent" style={{ fontSize: '10px', marginLeft: tokens.spacing[2] }}>
                                    🎯
                                  </span>
                                )}
                                {inv.source === 'csv' && (
                                  <span className="pw-tag" style={{ fontSize: '10px', marginLeft: tokens.spacing[2], color: tokens.colors.status.warning, background: 'rgba(251, 191, 36, 0.1)' }}>
                                    📄 CSV
                                  </span>
                                )}
                              </div>
                              <div style={{
                                fontSize: '13px',
                                color: tokens.colors.text.secondary,
                              }}>
                                {inv.title ? `${inv.title}${inv.firm ? ` @ ${inv.firm}` : ''}` : inv.firm || ''}
                              </div>
                            </div>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: inv.score >= 90 
                                ? tokens.colors.status.success 
                                : inv.score >= 70 
                                  ? tokens.colors.accent.secondary 
                                  : tokens.colors.text.muted,
                              background: inv.score >= 90 
                                ? 'rgba(52, 211, 153, 0.1)'
                                : inv.score >= 70 
                                  ? tokens.colors.accent.subtle
                                  : 'transparent',
                              padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
                              borderRadius: tokens.radius.full,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}>
                              {inv.score || 0}%
                            </div>
                          </div>
                          {inv.investment_focus && inv.investment_focus.length > 0 && (
                            <div style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: tokens.spacing[1],
                              marginTop: tokens.spacing[1],
                            }}>
                              {inv.investment_focus.slice(0, 3).map((tag, i) => (
                                <span key={i} className="pw-tag-accent">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {inv.matchReasons && (
                            <div style={{
                              fontSize: '12px',
                              color: tokens.colors.accent.secondary,
                              marginTop: tokens.spacing[1],
                              opacity: 0.7,
                            }}>
                              {inv.matchReasons}
                            </div>
                          )}
                          {inv.email && (
                            <div style={{
                              fontSize: '12px',
                              color: tokens.colors.status.success,
                              marginTop: tokens.spacing[1],
                            }}>
                              <Icons.Mail size={12} /> {inv.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: tokens.spacing[3],
              marginTop: tokens.spacing[6],
              alignItems: 'center',
              width: '100%',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={() => setMode("upload")}
                className="pw-btn-secondary"
                style={{
                  whiteSpace: 'nowrap',
                }}
              >
                <Icons.ArrowLeft size={16} />
                Re-upload
              </button>
              <div style={{ flex: 1, minWidth: '16px' }} />
              <button
                onClick={() => onNext({ startup, selectedInvestors: getSelectedInvestors() })}
                disabled={!valid}
                className="pw-btn-primary"
                style={{
                  padding: `${tokens.spacing[3]} ${tokens.spacing[8]}`,
                  justifyContent: 'center',
                  opacity: valid ? 1 : 0.4,
                  cursor: valid ? 'pointer' : 'not-allowed',
                  minWidth: '200px',
                  flex: '1 1 auto',
                }}
              >
                Generate Pitches
                <Icons.ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: tokens.spacing[4] }}>
        <h2 className="pw-h2">
          {savedProfile ? "Update your documents" : "Upload your documents"}
        </h2>
        <p className="pw-body">
          {savedProfile 
            ? "Upload new documents to update your startup profile."
            : "Upload your pitch deck, whitepaper, or executive summary."}
        </p>
      </div>

      <DocumentUpload onComplete={handleProfileComplete} plan={plan} />

      {savedProfile && (
        <button
          onClick={() => {
            setMode("review");
            discoverInvestorsForProfile({
              sector: savedProfile.industry,
              stage: savedProfile.stage,
              country: savedProfile.country,
            });
          }}
          className="pw-btn-primary"
          style={{
            width: '100%',
            marginTop: tokens.spacing[3],
            justifyContent: 'center',
          }}
        >
          Continue with saved profile
          <Icons.ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}

// ============================================================
// CAMPAIGN TAB
// ============================================================

function CampaignTab({ pitchCount, plan, setPitchCount, user, preloadedInvestors, clearPreload, savedProfile, setSavedProfile }) {
  const [step, setStep] = useState("describe");
  const [investors, setInvestors] = useState(preloadedInvestors || []);
  const [startup, setStartup] = useState(null);
  const [finalPitches, setFinalPitches] = useState([]);
  const limit = PLAN_LIMITS[plan] || 10;
  const isAtLimit = pitchCount >= limit;

  useEffect(() => {
    if (preloadedInvestors) {
      setInvestors(preloadedInvestors);
      clearPreload();
    }
  }, [preloadedInvestors]);

  const incrementPitchCount = (n = 1) => {
    if (!user) return;
    const newCount = pitchCount + n;
    setPitchCount(newCount);
    localStorage.setItem("pitches_" + user.id, newCount.toString());
  };

  const restart = () => {
    setStep("describe");
    setInvestors([]);
    setStartup(null);
    setFinalPitches([]);
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: tokens.spacing[6] }}>
        <h1 className="pw-h1">New Campaign</h1>
        <p className="pw-body">Upload your documents and we'll match you with the right investors.</p>
      </div>

      {isAtLimit ? (
        <div className="pw-card">
          <div style={{ textAlign: "center", padding: tokens.spacing[8] }}>
            <div style={{ fontSize: 48, marginBottom: tokens.spacing[4] }}>🔒</div>
            <h3 className="pw-h3">
              {plan === "starter" ? "You've hit your Starter limit." : "You've used all 10 free pitches."}
            </h3>
            <p className="pw-body" style={{ marginBottom: tokens.spacing[6] }}>
              {plan === "starter" 
                ? "Upgrade to Pro and unlock 500 pitches/month."
                : "Upgrade to keep sending. Starter gives you 100 pitches/month."}
            </p>
            <a href="/upgrade" className="pw-btn-primary">
              Upgrade →
            </a>
          </div>
        </div>
      ) : (
        <div className="pw-card">
          <StepIndicator current={step} />

          {step === "describe" && (
            <DescribeStep
              onNext={(data) => {
                setStartup(data.startup);
                setInvestors(data.selectedInvestors || []);
                setStep("review");
              }}
              onBack={() => {}}
              plan={plan}
              preloadedInvestors={investors}
              savedProfile={savedProfile}
              setSavedProfile={setSavedProfile}
            />
          )}

          {step === "review" && (
            <ReviewStep
              investors={investors}
              startup={startup}
              onNext={(p) => {
                setFinalPitches(p);
                setStep("send");
              }}
              onBack={() => setStep("describe")}
              onPitchGenerated={incrementPitchCount}
            />
          )}

          {step === "send" && (
            <SendStep
              pitches={finalPitches}
              onRestart={restart}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// INVESTORS TAB
// ============================================================

function InvestorsTab({ plan, onStartCampaign }) {
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({ sector: "", stage: "", region: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState(null);
  const [editEmail, setEditEmail] = useState("");
  const [editContactName, setEditContactName] = useState("");

  const SECTORS = ["fintech", "healthtech", "saas", "enterprise software", "climate tech", "b2b", "ai/ml", "edtech", "agritech"];
  const STAGES = ["pre-seed", "seed", "series-a", "growth"];
  const REGIONS = ["Africa", "USA", "Europe", "Global"];

  const fetchInvestors = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.sector) params.append("sector", filters.sector);
      if (filters.stage) params.append("stage", filters.stage);
      if (filters.region) params.append("region", filters.region);

      const res = await fetch("/api/get-investors?" + params.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInvestors(data.investors);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchInvestors(); }, [filters]);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleStartCampaign = () => {
    const chosen = investors.filter(inv => selected.includes(inv.id));
    const asInvestorList = chosen.map(inv => ({
      name: inv.contact_name || inv.firm,
      email: inv.email || "",
      firm: inv.firm,
    }));
    onStartCampaign(asInvestorList);
  };

  const handleEditClick = (investor) => {
    setEditingInvestor(investor);
    setEditEmail(investor.email || "");
    setEditContactName(investor.contact_name || "");
  };

  const handleSaveEdit = async () => {
    if (!editingInvestor) return;
    try {
      const res = await fetch("/api/update-investor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingInvestor.id,
          email: editEmail,
          contactName: editContactName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchInvestors();
      setEditingInvestor(null);
      setEditEmail("");
      setEditContactName("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: tokens.spacing[6] }}>
        <h1 className="pw-h1">Investor Discovery</h1>
        <p className="pw-body">
          {investors.length} investors in database. 
          <span style={{ color: tokens.colors.status.warning, marginLeft: tokens.spacing[2] }}>
            ⚠️ {investors.filter(i => !i.email).length} need email verification
          </span>
        </p>
      </div>

      <div style={{ display: 'flex', gap: tokens.spacing[3], flexWrap: 'wrap', marginBottom: tokens.spacing[4] }}>
        <button onClick={() => setShowAddForm(!showAddForm)} className="pw-btn-primary">
          + Add Investor
        </button>
      </div>

      {showAddForm && (
        <div className="pw-card" style={{ marginBottom: tokens.spacing[4] }}>
          <AddInvestorForm onClose={() => setShowAddForm(false)} onAdded={fetchInvestors} />
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        gap: tokens.spacing[3], 
        flexWrap: 'wrap', 
        marginBottom: tokens.spacing[4],
      }}>
        <select value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })} className="pw-input" style={{ minWidth: '120px', flex: 1 }}>
          <option value="">All sectors</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })} className="pw-input" style={{ minWidth: '120px', flex: 1 }}>
          <option value="">All stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })} className="pw-input" style={{ minWidth: '120px', flex: 1 }}>
          <option value="">All regions</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(filters.sector || filters.stage || filters.region) && (
          <button onClick={() => setFilters({ sector: "", stage: "", region: "" })} className="pw-btn-ghost">
            Clear filters ×
          </button>
        )}
      </div>

      {error && <p style={{ color: tokens.colors.status.error, fontSize: '14px', marginBottom: tokens.spacing[4] }}>⚠ {error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: tokens.spacing[12], color: tokens.colors.text.muted }}>Loading investors...</div>
      ) : investors.length === 0 ? (
        <div className="pw-card" style={{ textAlign: 'center', padding: tokens.spacing[12] }}>
          <div style={{ fontSize: 40, marginBottom: tokens.spacing[4] }}>🔍</div>
          <p className="pw-body">No investors match these filters. Try widening your search.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3], marginBottom: tokens.spacing[10] }}>
          {investors.map(inv => (
            <div key={inv.id} className="pw-card" style={{
              borderColor: selected.includes(inv.id) ? tokens.colors.accent.primary : tokens.colors.border.default,
              background: selected.includes(inv.id) ? tokens.colors.accent.subtle : 'transparent',
            }}>
              <div style={{ 
                display: 'flex', 
                gap: tokens.spacing[3], 
                alignItems: 'flex-start',
              }}>
                <input
                  type="checkbox"
                  checked={selected.includes(inv.id)}
                  onChange={() => toggleSelect(inv.id)}
                  style={{ 
                    marginTop: '3px', 
                    accentColor: tokens.colors.accent.primary, 
                    width: 18, 
                    height: 18, 
                    cursor: 'pointer', 
                    flexShrink: 0 
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    gap: tokens.spacing[2],
                    flexWrap: 'wrap',
                  }}>
                    <div>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 700, 
                        color: tokens.colors.text.primary,
                      }}>{inv.firm}</div>
                      <div style={{ 
                        fontSize: '13px', 
                        color: tokens.colors.text.secondary,
                      }}>{inv.hq}</div>
                    </div>
                    {!inv.email && (
                      <span className="pw-tag" style={{
                        color: tokens.colors.status.warning,
                        background: 'rgba(251, 191, 36, 0.1)',
                      }}>
                        Need email
                      </span>
                    )}
                  </div>
                  <p style={{ 
                    fontSize: '13px', 
                    color: tokens.colors.text.secondary, 
                    lineHeight: 1.5, 
                    marginBottom: tokens.spacing[3],
                  }}>{inv.notes}</p>
                  <div style={{ display: 'flex', gap: tokens.spacing[1], flexWrap: 'wrap' }}>
                    {inv.sectors?.map((s, i) => (
                      <span key={i} className="pw-tag-accent">{s}</span>
                    ))}
                    {inv.stages?.map((s, i) => (
                      <span key={i} className="pw-tag">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="pw-floating-bar">
          <span style={{ 
            fontSize: '14px', 
            color: tokens.colors.text.primary, 
            fontWeight: 600,
          }}>
            {selected.length} investor{selected.length !== 1 ? "s" : ""} selected
          </span>
          <button onClick={handleStartCampaign} className="pw-btn-primary">
            Start Campaign →
          </button>
          <button onClick={() => setSelected([])} style={{
            background: 'transparent',
            border: 'none',
            color: tokens.colors.text.muted,
            fontSize: '20px',
            cursor: 'pointer',
            padding: 0,
            minWidth: '44px',
            minHeight: '44px',
          }}>×</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ADD INVESTOR FORM
// ============================================================

function AddInvestorForm({ onClose, onAdded }) {
  const [form, setForm] = useState({ firm: "", contactName: "", email: "", sectors: "", stages: "", region: "", hq: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.firm) { setError("Firm name is required"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/add-investor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firm: form.firm,
          contactName: form.contactName,
          email: form.email,
          sectors: form.sectors.split(",").map(s => s.trim().toLowerCase()).filter(Boolean),
          stages: form.stages.split(",").map(s => s.trim().toLowerCase()).filter(Boolean),
          region: form.region,
          hq: form.hq,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAdded();
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  return (
    <div>
      <h3 className="pw-h3" style={{ marginBottom: tokens.spacing[4] }}>Add an investor to the database</h3>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: tokens.spacing[3],
      }}>
        <input placeholder="Firm name *" value={form.firm} onChange={(e) => setForm({ ...form, firm: e.target.value })} className="pw-input" />
        <input placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="pw-input" />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="pw-input" />
        <input placeholder="HQ location" value={form.hq} onChange={(e) => setForm({ ...form, hq: e.target.value })} className="pw-input" />
        <input placeholder="Sectors (comma separated)" value={form.sectors} onChange={(e) => setForm({ ...form, sectors: e.target.value })} className="pw-input" />
        <input placeholder="Stages (comma separated)" value={form.stages} onChange={(e) => setForm({ ...form, stages: e.target.value })} className="pw-input" />
        <input placeholder="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="pw-input" style={{ gridColumn: "1 / -1" }} />
      </div>
      <textarea placeholder="Notes (what do they look for?)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="pw-textarea" style={{ marginTop: tokens.spacing[3] }} />
      {error && <p style={{ color: tokens.colors.status.error, fontSize: '13px', marginTop: tokens.spacing[3] }}>⚠ {error}</p>}
      <div style={{ 
        display: 'flex', 
        gap: tokens.spacing[3], 
        marginTop: tokens.spacing[4],
      }}>
        <button onClick={onClose} className="pw-btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={submitting} className="pw-btn-primary" style={{ 
          opacity: submitting ? 0.4 : 1, 
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}>
          {submitting ? "Adding..." : "Add Investor"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// APP (Fixed navigation with persistent hamburger menu)
// ============================================================

const TABS = ["campaign", "investors", "crm", "followups", "templates", "account"];
const TAB_STORAGE_KEY = "pitchwire_active_tab";

// Resolves the tab to open on load: URL hash wins over localStorage, so a shared
// or bookmarked link always lands where it points. Runs before first paint via
// useState's lazy initializer, which avoids a flash of the campaign tab.
function resolveInitialTab() {
  if (typeof window === "undefined") return "campaign";
  try {
    const hash = (window.location.hash || "").replace(/^#/, "");
    if (TABS.indexOf(hash) !== -1) return hash;
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
    if (stored && TABS.indexOf(stored) !== -1) return stored;
  } catch (err) {
    // Private browsing can throw on localStorage access; fall through.
  }
  return "campaign";
}

// Matches the real dashboard layout so the swap to content does not reflow.
function AppSkeleton() {
  return (
    <div style={{ minHeight: "100vh", background: tokens.colors.bg.base }}>
      <div style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: tokens.spacing[10] + " " + tokens.spacing[4],
      }}>
        <div className="pw-skeleton" style={{ height: 36, width: "45%", marginBottom: tokens.spacing[3] }} />
        <div className="pw-skeleton" style={{ height: 18, width: "70%", marginBottom: tokens.spacing[10] }} />
        <div className="pw-skeleton" style={{ height: 132, width: "100%", marginBottom: tokens.spacing[4], borderRadius: 12 }} />
        <div className="pw-skeleton" style={{ height: 132, width: "100%", marginBottom: tokens.spacing[4], borderRadius: 12 }} />
        <div className="pw-skeleton" style={{ height: 44, width: "38%", borderRadius: 8 }} />
      </div>
    </div>
  );
}

export default function App() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [pitchCount, setPitchCount] = useState(0);
  const [plan, setPlan] = useState("free");
  const [activeTab, setActiveTab] = useState(resolveInitialTab);
  const [preloadedInvestors, setPreloadedInvestors] = useState(null);
  const [savedProfile, setSavedProfile] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Single entry point for tab changes: state, localStorage, and the URL hash
  // stay in lockstep so a refresh returns to the same place.
  const changeTab = (tab) => {
    if (TABS.indexOf(tab) === -1) return;
    setActiveTab(tab);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch (err) {
      // Non-fatal: the hash below still preserves the tab across a refresh.
    }
    if (typeof window !== "undefined" && window.location.hash !== "#" + tab) {
      // replaceState rather than assigning location.hash, so tab switching does
      // not stack history entries and hijack the browser back button.
      window.history.replaceState(null, "", "#" + tab);
    }
  };

  // Back/forward and manual hash edits should still move the tab.
  useEffect(() => {
    const onHashChange = () => {
      const hash = (window.location.hash || "").replace(/^#/, "");
      if (TABS.indexOf(hash) !== -1 && hash !== activeTab) {
        setActiveTab(hash);
        try {
          window.localStorage.setItem(TAB_STORAGE_KEY, hash);
        } catch (err) { /* non-fatal */ }
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [activeTab]);

  // Ensures the URL reflects the restored tab on first load.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#" + activeTab);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializeApp() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!session) {
          router.push("/login");
          setAuthChecking(false);
          return;
        }
        setUser(session.user);

        // localStorage is synchronous, so read it immediately and paint the real
        // plan/usage rather than waiting on the profile round-trip.
        try {
          localStorage.setItem("pitchwire_onboarded", "true");
          setPitchCount(parseInt(localStorage.getItem("pitches_" + session.user.id) || "0", 10) || 0);
          setPlan(localStorage.getItem("plan_" + session.user.id) || "free");
        } catch (err) {
          console.error("localStorage unavailable:", err);
        }

        // Auth is unblocked here: the profile fetch no longer gates first paint,
        // it resolves into the already-rendered dashboard. Previously this ran
        // sequentially and the user stared at a blank screen for both round-trips.
        setAuthChecking(false);

        supabase
          .from("startup_profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (cancelled) return;
            if (error) {
              console.error("Supabase profile fetch error:", error);
              setSavedProfile(null);
            } else {
              setSavedProfile(data || null);
            }
          }, (err) => {
            if (cancelled) return;
            console.error("Failed to fetch profile:", err);
            setSavedProfile(null);
          });
      } catch (error) {
        if (cancelled) return;
        console.error("Initialization error:", error);
        router.push("/login");
        setAuthChecking(false);
      }
    }

    initializeApp();

    // Keeps plan in sync when Stripe checkout completes in this tab or another.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled || !session) return;
      try {
        setPlan(localStorage.getItem("plan_" + session.user.id) || "free");
      } catch (err) { /* non-fatal */ }
    });

    return () => {
      cancelled = true;
      if (authListener && authListener.subscription) authListener.subscription.unsubscribe();
    };
  }, []);

  // Picks up the plan written by /success without needing a manual refresh.
  useEffect(() => {
    if (!user) return;
    const syncPlan = () => {
      try {
        const stored = localStorage.getItem("plan_" + user.id);
        if (stored && stored !== plan) {
          setPlan(stored);
          setPitchCount(parseInt(localStorage.getItem("pitches_" + user.id) || "0", 10) || 0);
        }
      } catch (err) { /* non-fatal */ }
    };
    window.addEventListener("storage", syncPlan);
    window.addEventListener("focus", syncPlan);
    syncPlan();
    return () => {
      window.removeEventListener("storage", syncPlan);
      window.removeEventListener("focus", syncPlan);
    };
  }, [user, plan]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authChecking) {
    // Skeleton rather than a blank screen or a bare "Loading..." string, so the
    // first paint already shows the shape of the dashboard.
    return (
      <>
        <Head>
          <title>PitchWire — Dashboard</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </Head>
        <GlobalStyles />
        <AppSkeleton />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>PitchWire — Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      <GlobalStyles />
      <div style={styles.page}>
        {/* Fixed Mobile Header */}
        <div className="pw-mobile-header" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: tokens.colors.bg.base,
          borderBottom: `1px solid ${tokens.colors.border.default}`,
          padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '72px',
        }}>
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: tokens.colors.text.primary,
              cursor: 'pointer',
              padding: tokens.spacing[2],
              minHeight: '44px',
              minWidth: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icons.Menu size={24} />
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing[3],
          }}>
            <Logo size={28} />
            <span style={{
              fontSize: '16px',
              fontWeight: 800,
              color: tokens.colors.text.primary,
              letterSpacing: '-0.02em',
            }}>
              PitchWire
            </span>
          </div>
          <div style={{ width: 44 }} />
        </div>

        <Sidebar
          activeTab={activeTab}
          setActiveTab={changeTab}
          user={user}
          plan={plan}
          pitchCount={pitchCount}
          onSignOut={handleSignOut}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <main className="pw-main-content">
          {/* 720px is the reading measure for the pitch flow. The CRM's
              pipeline board is columnar and needs the room, so it — and only
              it — gets the wider container. */}
          <div style={activeTab === "crm" ? { ...styles.main, maxWidth: "1180px" } : styles.main}>
            {activeTab === "campaign" && (
              <CampaignTab
                pitchCount={pitchCount}
                plan={plan}
                setPitchCount={setPitchCount}
                user={user}
                preloadedInvestors={preloadedInvestors}
                clearPreload={() => setPreloadedInvestors(null)}
                savedProfile={savedProfile}
                setSavedProfile={setSavedProfile}
              />
            )}
            {activeTab === "investors" && (
              <InvestorsTab
                plan={plan}
                onStartCampaign={(invs) => {
                  setPreloadedInvestors(invs);
                  changeTab("campaign");
                }}
              />
            )}
            {activeTab === "crm" && <CrmTab plan={plan} />}
            {activeTab === "followups" && <FollowupsTab plan={plan} />}
            {activeTab === "templates" && <TemplatesTab />}
            {activeTab === "account" && (
              <AccountTab
                user={user}
                plan={plan}
                pitchCount={pitchCount}
                onSignOut={handleSignOut}
                onNavigate={changeTab}
                savedProfile={savedProfile}
              />
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .pw-mobile-header {
          display: none;
        }
        
        @media (max-width: 768px) {
          .pw-mobile-header {
            display: flex !important;
          }
          
          .pw-main-content {
            padding-top: 72px;
          }
          
          .pw-sidebar {
            position: fixed;
            top: 72px;
            left: 0;
            bottom: 0;
            width: 300px;
            background: ${tokens.colors.bg.base};
            border-right: 1px solid ${tokens.colors.border.default};
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            z-index: 199;
            overflow-y: auto;
          }
          
          .pw-sidebar.open {
            transform: translateX(0);
          }
          
          .pw-sidebar-overlay {
            position: fixed;
            top: 72px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.6);
            z-index: 198;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }
          
          .pw-sidebar-overlay.open {
            opacity: 1;
            pointer-events: all;
          }
        }
      `}</style>
    </>
  );
}

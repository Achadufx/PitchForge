import { useState, useEffect } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";
import DocumentUpload from "../components/DocumentUpload";
import { useRouter } from "next/router";
import AccountTab from "../components/AccountTab";
import CrmTab from "../components/CrmTab";
import FollowupsTab from "../components/FollowupsTab";
import TemplatesTab from "../components/TemplatesTab";

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
      info: '#60a5fa',
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
    20: '80px',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    xl: '20px',
    full: '999px',
  },
  shadows: {
    xs: '0 1px 2px rgba(0,0,0,0.3)',
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
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  }
};

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
  Zap: (p) => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>,
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
// STYLED COMPONENTS (Design System Helpers)
// ============================================================

const styles = {
  page: {
    minHeight: '100vh',
    background: tokens.colors.bg.base,
    color: tokens.colors.text.primary,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  },
  main: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: `${tokens.spacing[8]} ${tokens.spacing[4]}`,
    width: '100%',
    boxSizing: 'border-box',
  },
  card: {
    background: tokens.colors.bg.surface,
    border: `1px solid ${tokens.colors.border.default}`,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing[6],
    boxShadow: tokens.shadows.sm,
    transition: `all ${tokens.transitions.base}`,
    width: '100%',
    boxSizing: 'border-box',
  },
  cardAccent: {
    background: tokens.colors.bg.surface,
    border: `1px solid ${tokens.colors.accent.primary}`,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing[6],
    boxShadow: `0 0 0 1px ${tokens.colors.accent.glow}`,
    width: '100%',
    boxSizing: 'border-box',
  },
  btnPrimary: {
    background: tokens.colors.accent.primary,
    color: tokens.colors.text.inverse,
    border: 'none',
    borderRadius: tokens.radius.md,
    padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: `all ${tokens.transitions.fast}`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing[2],
    whiteSpace: 'nowrap',
  },
  btnSecondary: {
    background: 'transparent',
    color: tokens.colors.text.secondary,
    border: `1px solid ${tokens.colors.border.default}`,
    borderRadius: tokens.radius.md,
    padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: `all ${tokens.transitions.fast}`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing[2],
    whiteSpace: 'nowrap',
  },
  btnGhost: {
    background: 'transparent',
    color: tokens.colors.text.tertiary,
    border: 'none',
    borderRadius: tokens.radius.md,
    padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: `all ${tokens.transitions.fast}`,
    whiteSpace: 'nowrap',
  },
  input: {
    width: '100%',
    background: tokens.colors.bg.input,
    border: `1px solid ${tokens.colors.border.default}`,
    borderRadius: tokens.radius.md,
    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
    color: tokens.colors.text.primary,
    fontSize: '14px',
    outline: 'none',
    transition: `all ${tokens.transitions.fast}`,
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    background: tokens.colors.bg.input,
    border: `1px solid ${tokens.colors.border.default}`,
    borderRadius: tokens.radius.md,
    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
    color: tokens.colors.text.primary,
    fontSize: '14px',
    outline: 'none',
    transition: `all ${tokens.transitions.fast}`,
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  h1: {
    fontSize: '35px',
    fontWeight: 800,
    color: tokens.colors.text.primary,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    margin: 0,
  },
  h2: {
    fontSize: '27px',
    fontWeight: 700,
    color: tokens.colors.text.primary,
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
    margin: 0,
  },
  h3: {
    fontSize: '21px',
    fontWeight: 700,
    color: tokens.colors.text.primary,
    lineHeight: 1.3,
    margin: 0,
  },
  body: {
    fontSize: '15px',
    fontWeight: 400,
    color: tokens.colors.text.secondary,
    lineHeight: 1.6,
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: tokens.colors.text.tertiary,
    marginBottom: tokens.spacing[2],
    letterSpacing: '0.01em',
  },
  tag: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: 500,
    padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
    borderRadius: tokens.radius.full,
    background: 'rgba(255,255,255,0.04)',
    color: tokens.colors.text.tertiary,
    border: `1px solid ${tokens.colors.border.default}`,
  },
  tagAccent: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: 500,
    padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
    borderRadius: tokens.radius.full,
    background: tokens.colors.accent.glow,
    color: tokens.colors.accent.light,
    border: `1px solid ${tokens.colors.accent.glowStrong}`,
  },
  progress: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: tokens.radius.full,
    height: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    background: `linear-gradient(90deg, ${tokens.colors.accent.primary}, ${tokens.colors.accent.light})`,
    height: '100%',
    borderRadius: tokens.radius.full,
    transition: `width ${tokens.transitions.slow}`,
  },
  dropzone: {
    border: `2px dashed ${tokens.colors.border.default}`,
    borderRadius: tokens.radius.lg,
    padding: `${tokens.spacing[10]} ${tokens.spacing[6]}`,
    textAlign: 'center',
    cursor: 'pointer',
    background: tokens.colors.bg.elevated,
    transition: `all ${tokens.transitions.base}`,
    width: '100%',
    boxSizing: 'border-box',
  },
};

const PLAN_LIMITS = { free: 10, starter: 100, pro: 500 };
const PLAN_DOC_LIMITS = { free: 3, starter: 999, pro: 999 };
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
// SIDEBAR
// ============================================================

function Sidebar({ activeTab, setActiveTab, user, plan, pitchCount, onSignOut, mobileOpen, setMobileOpen }) {
  const limit = PLAN_LIMITS[plan] || 10;
  const pct = Math.min((pitchCount / limit) * 100, 100);
  
  const tabs = [
    { key: "campaign", icon: Icons.Zap, label: "Campaign" },
    { key: "investors", icon: Icons.Target, label: "Investors" },
    { key: "crm", icon: Icons.Building, label: "CRM" },
    { key: "followups", icon: Icons.Mail, label: "Follow-ups" },
    { key: "templates", icon: Icons.File, label: "Templates" },
    { key: "account", icon: Icons.User, label: "Account" },
  ];

  return (
    <div style={{
      width: '240px',
      background: tokens.colors.bg.base,
      borderRight: `1px solid ${tokens.colors.border.default}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 50,
      transition: `transform ${tokens.transitions.base}`,
    }}>
      <div style={{ 
        padding: `${tokens.spacing[5]} ${tokens.spacing[6]}`, 
        borderBottom: `1px solid ${tokens.colors.border.default}`,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing[3],
      }}>
        <div style={{
          width: 32,
          height: 32,
          background: `linear-gradient(135deg, ${tokens.colors.accent.primary}, ${tokens.colors.accent.active})`,
          borderRadius: tokens.radius.sm,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icons.Zap size={16} color="#fff" />
        </div>
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
              color: tokens.colors.text.tertiary,
              cursor: 'pointer',
              padding: tokens.spacing[2],
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
                background: active ? tokens.colors.accent.glow : 'transparent',
                color: active ? tokens.colors.accent.light : tokens.colors.text.tertiary,
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: active ? 600 : 500,
                marginBottom: '2px',
                transition: `all ${tokens.transitions.fast}`,
                textAlign: 'left',
              }}
            >
              <Icon size={18} color={active ? tokens.colors.accent.light : tokens.colors.text.muted} />
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
        <div style={{
          background: tokens.colors.bg.elevated,
          border: `1px solid ${tokens.colors.border.default}`,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing[4],
        }}>
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
          <div style={styles.progress}>
            <div style={{
              ...styles.progressFill,
              width: pct + '%',
              background: pct >= 90 
                ? `linear-gradient(90deg, ${tokens.colors.status.error}, ${tokens.colors.status.warning})`
                : `linear-gradient(90deg, ${tokens.colors.accent.primary}, ${tokens.colors.accent.light})`,
            }} />
          </div>
          {plan === "free" && (
            <button 
              onClick={() => setActiveTab("account")}
              style={{
                width: '100%',
                marginTop: tokens.spacing[3],
                padding: tokens.spacing[2],
                borderRadius: tokens.radius.sm,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: tokens.colors.accent.primary,
                color: tokens.colors.text.inverse,
                border: 'none',
                transition: `all ${tokens.transitions.fast}`,
              }}
            >
              Upgrade →
            </button>
          )}
          {plan === "starter" && (
            <button 
              onClick={() => setActiveTab("account")}
              style={{
                width: '100%',
                marginTop: tokens.spacing[3],
                padding: tokens.spacing[2],
                borderRadius: tokens.radius.sm,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: tokens.colors.accent.glow,
                color: tokens.colors.accent.light,
                border: `1px solid ${tokens.colors.accent.glowStrong}`,
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
            background: `linear-gradient(135deg, ${tokens.colors.accent.primary}, ${tokens.colors.accent.active})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
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
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
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
    <div style={{
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
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: done 
                  ? tokens.colors.status.success 
                  : active 
                    ? tokens.colors.accent.primary 
                    : tokens.colors.bg.surface,
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
              <span style={{
                fontSize: '10px',
                fontWeight: active ? 600 : 400,
                color: active 
                  ? tokens.colors.accent.light 
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

async function generateSingle(inv, startup) {
  console.log(`📧 Generating pitch for: ${inv.name}`);
  
  try {
    const res = await fetch(API_URL + "/api/generate-pitch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        investorName: inv.name,
        firm: inv.firm || "",
        startupName: startup.name,
        description: startup.description,
        ask: startup.ask,
      }),
    });
    
    const responseText = await res.text();
    console.log(`📝 Response for ${inv.name}:`, responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`❌ Failed to parse JSON for ${inv.name}:`, parseError.message);
      return {
        subject: `We're fixing what investors know is broken`,
        body: `Hi ${inv.name},\n\nWe're building ${startup.name} to solve a critical problem. ${startup.description}\n\nWe're raising ${startup.ask} to scale our solution.\n\nWould love 15 minutes to show you what we're building.\n\nBest,\nFounder, ${startup.name}`
      };
    }
    
    if (!res.ok || data.error) {
      console.error(`❌ API error for ${inv.name}:`, data.error || `Status: ${res.status}`);
      return {
        subject: `We're fixing what investors know is broken`,
        body: `Hi ${inv.name},\n\nWe're building ${startup.name} to solve a critical problem. ${startup.description}\n\nWe're raising ${startup.ask} to scale our solution.\n\nWould love 15 minutes to show you what we're building.\n\nBest,\nFounder, ${startup.name}`
      };
    }
    
    if (!data.subject || !data.body) {
      console.warn(`⚠️ Missing subject or body for ${inv.name}, using fallback`);
      return {
        subject: `Investment opportunity: ${startup.name}`,
        body: `Hi ${inv.name},\n\nWe're building ${startup.name}. ${startup.description}\n\nWe're raising ${startup.ask}.\n\nWould love to connect.\n\nBest,\nFounder`
      };
    }
    
    console.log(`✅ Pitch generated for ${inv.name}`);
    return data;
    
  } catch (err) {
    console.error(`❌ Network error for ${inv.name}:`, err);
    return {
      subject: `Investment opportunity: ${startup.name}`,
      body: `Hi ${inv.name},\n\nWe're building ${startup.name}. ${startup.description}\n\nWe're raising ${startup.ask}.\n\nWould love to connect.\n\nBest,\nFounder`
    };
  }
}

// ============================================================
// REVIEW STEP
// ============================================================

function ReviewStep({ investors, startup, onNext, onBack, onPitchGenerated }) {
  const [pitches, setPitches] = useState([]);
  const [selected, setSelected] = useState([]);
  const [generating, setGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [regenerating, setRegenerating] = useState({});

  useEffect(() => {
    const generate = async () => {
      const results = [];
      for (let i = 0; i < investors.length; i++) {
        try {
          const data = await generateSingle(investors[i], startup);
          results.push({
            ...investors[i],
            subject: data.subject,
            body: data.body,
            error: false,
          });
          onPitchGenerated(1);
        } catch (err) {
          results.push({
            ...investors[i],
            subject: "",
            body: "",
            error: err.message,
          });
        }
        setProgress(i + 1);
      }
      setPitches(results);
      setSelected(results.map((_, i) => i));
      setGenerating(false);
    };
    generate();
  }, []);

  const handleRegenerate = async (i) => {
    setRegenerating((prev) => ({ ...prev, [i]: true }));
    try {
      const data = await generateSingle(pitches[i], startup);
      setPitches((prev) => {
        const u = [...prev];
        u[i] = {
          ...u[i],
          subject: data.subject,
          body: data.body,
          error: false,
        };
        return u;
      });
    } catch (err) {
      setPitches((prev) => {
        const u = [...prev];
        u[i] = { ...u[i], error: err.message };
        return u;
      });
    }
    setRegenerating((prev) => ({ ...prev, [i]: false }));
  };

  if (generating) {
    return (
      <div style={{ textAlign: "center", padding: tokens.spacing[12] }}>
        <div style={{ fontSize: 36, marginBottom: tokens.spacing[4] }}>⚡</div>
        <h3 style={styles.h3}>Crafting personalized pitches...</h3>
        <p style={{ color: tokens.colors.text.tertiary, marginBottom: tokens.spacing[6] }}>
          {progress} of {investors.length} done
        </p>
        <div style={{ maxWidth: 240, margin: '0 auto' }}>
          <div style={styles.progress}>
            <div style={{ ...styles.progressFill, width: (investors.length ? (progress / investors.length) * 100 : 0) + "%" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[4] }}>
        <h2 style={styles.h2}>Review pitches</h2>
        <span style={{ fontSize: '13px', color: tokens.colors.text.tertiary }}>
          {selected.length}/{pitches.length} selected
        </span>
      </div>
     <div style={{
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing[3],
  marginBottom: tokens.spacing[4],
  maxHeight: 400,
  overflowY: 'auto',
  paddingRight: tokens.spacing[3], // ADD THIS - prevents scrollbar overlap
  marginRight: '-4px', // Optional: keeps alignment clean
}}>
        {pitches.map((pitch, i) => (
          <div key={i} style={{
            border: `1px solid ${selected.includes(i) ? tokens.colors.accent.primary : tokens.colors.border.default}`,
            borderRadius: tokens.radius.md,
            padding: tokens.spacing[4],
            background: selected.includes(i) ? tokens.colors.accent.glow : 'transparent',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', gap: tokens.spacing[3] }}>
              <input
                type="checkbox"
                checked={selected.includes(i)}
                onChange={() => setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}
                style={{ marginTop: '2px', accentColor: tokens.colors.accent.primary, flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing[2] }}>
                  <div>
                    <span style={{ fontWeight: 600, color: tokens.colors.text.primary, fontSize: '14px' }}>{pitch.name}</span>
                    <span style={{ color: tokens.colors.text.muted, fontSize: '12px', marginLeft: tokens.spacing[2] }}>{pitch.firm || ""}</span>
                  </div>
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
                    }}
                  >
                    {regenerating[i] ? "..." : "🔄 Redo"}
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: tokens.colors.text.muted, marginBottom: tokens.spacing[2] }}>{pitch.email}</div>
                {pitch.error ? (
                  <div style={{ color: tokens.colors.status.error, fontSize: '12px' }}>⚠ {pitch.error}</div>
                ) : (
                  <>
                    <div style={{ fontSize: '12px', color: tokens.colors.accent.light, fontWeight: 600, marginBottom: tokens.spacing[2] }}>
                      Subject: {pitch.subject}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: tokens.colors.text.secondary,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                      background: tokens.colors.bg.elevated,
                      borderRadius: tokens.radius.sm,
                      padding: tokens.spacing[3],
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
      <div style={{ display: 'flex', gap: tokens.spacing[3] }}>
        <button onClick={onBack} style={styles.btnSecondary}>← Back</button>
        <button
          onClick={() => onNext(pitches.filter((_, i) => selected.includes(i)))}
          disabled={selected.length === 0}
          style={{
            ...styles.btnPrimary,
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
      const res = await fetch(API_URL + "/api/send-pitches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        <h2 style={styles.h2}>{succeeded} pitch{succeeded !== 1 ? "es" : ""} sent!</h2>
        <p style={{ ...styles.body, marginBottom: tokens.spacing[6] }}>Now sit back and let the replies come in.</p>
        <button onClick={onRestart} style={styles.btnPrimary}>Start new campaign</button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      <h2 style={styles.h2}>Ready to launch</h2>
      <p style={styles.body}>Your name will appear as the sender.</p>
      <div style={{ marginBottom: tokens.spacing[4] }}>
        <label style={styles.label}>Your name</label>
        <input
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          placeholder="e.g. Samuel"
          style={styles.input}
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
      }}>
        <Icons.Check size={16} />
        <span>{pitches.length} pitch{pitches.length !== 1 ? "es" : ""} queued and ready</span>
      </div>
      <button
        onClick={handleSend}
        disabled={sending || !senderName}
        style={{
          ...styles.btnPrimary,
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
            if (discoverData.success && discoverData.investors.length > 0) {
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
          <h2 style={styles.h2}>
            {isAnalyzing || isLoadingMatches ? 
              (isAnalyzing ? "Analyzing your documents..." : "Searching for investors...") : 
              savedProfile ? "Welcome back!" : "Startup profile ready"
            }
          </h2>
          <p style={styles.body}>
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
            <p style={{ color: tokens.colors.text.tertiary, marginBottom: tokens.spacing[6] }}>
              {isLoadingMatches ? "Finding the best investors for your startup..." : "Analyzing your documents..."}
            </p>
            <div style={{ maxWidth: 240, margin: '0 auto' }}>
              <div style={styles.progress}>
                <div style={{ ...styles.progressFill, width: '60%', animation: 'pulse 1.5s infinite' }} />
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
            <div style={styles.card}>
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
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr',
                gap: tokens.spacing[4],
              }}>
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
                  <label style={styles.label}>{label}</label>
                  {multiline ? (
                    <textarea
                      value={startup[key] || ""}
                      onChange={(e) => setStartup({ ...startup, [key]: e.target.value })}
                      rows={4}
                      style={styles.textarea}
                    />
                  ) : (
                    <input
                      value={startup[key] || ""}
                      onChange={(e) => setStartup({ ...startup, [key]: e.target.value })}
                      style={styles.input}
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
                    color: tokens.colors.text.tertiary,
                    marginLeft: tokens.spacing[3],
                  }}>
                    {selectedIndices.length} selected
                  </span>
                </div>
                <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                  <button
                    onClick={handleDiscoverInvestors}
                    style={styles.btnPrimary}
                  >
                    <Icons.Refresh size={14} />
                    Discover
                  </button>
                </div>
              </div>

              <div style={{
                background: tokens.colors.bg.elevated,
                border: `2px dashed ${csvFile ? tokens.colors.accent.primary : tokens.colors.border.default}`,
                borderRadius: tokens.radius.md,
                padding: tokens.spacing[4],
                marginBottom: tokens.spacing[4],
                transition: `all ${tokens.transitions.base}`,
                cursor: 'pointer',
                textAlign: 'center',
                width: '100%',
                boxSizing: 'border-box',
              }}
              onClick={() => document.getElementById('csv-upload-input').click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = tokens.colors.accent.primary;
                e.currentTarget.style.background = tokens.colors.accent.glow;
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
                    background: csvFile ? tokens.colors.accent.glow : 'rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {csvFile ? '✅' : '📂'}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: tokens.colors.text.primary }}>
                    {csvFile ? csvFile.name : 'Upload your own investor CSV'}
                  </div>
                  <div style={{ fontSize: '12px', color: tokens.colors.text.muted }}>
                    {csvFile 
                      ? `${csvInvestors.length} investors loaded`
                      : 'Drop your CSV here or click to browse'
                    }
                  </div>
                  {csvFile && (
                    <div style={{ display: 'flex', gap: tokens.spacing[2], marginTop: tokens.spacing[2] }}>
                      <span style={{
                        fontSize: '11px',
                        color: tokens.colors.accent.light,
                        background: tokens.colors.accent.glow,
                        padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
                        borderRadius: tokens.radius.full,
                      }}>
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
                background: shareWithDatabase ? tokens.colors.accent.glow : 'transparent',
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
                  <div style={{ fontSize: '13px', fontWeight: 500, color: tokens.colors.text.primary }}>
                    Share with PitchWire's investor database
                  </div>
                  <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>
                    Help other founders find the right investors. Your investors will be anonymized.
                  </div>
                </div>
                {shareWithDatabase && (
                  <div style={{
                    fontSize: '11px',
                    color: tokens.colors.accent.light,
                    background: tokens.colors.accent.glow,
                    padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
                    borderRadius: tokens.radius.full,
                  }}>
                    ✓ Shared
                  </div>
                )}
              </div>

              <div style={{
  maxHeight: 320,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing[2],
  paddingRight: tokens.spacing[2], // ADD THIS - prevents scrollbar overlap
  marginRight: '-4px', // Optional: keeps alignment clean
}}>
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
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: tokens.spacing[3],
                        padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
                        borderRadius: tokens.radius.md,
                        border: `1px solid ${isSelected(index) ? tokens.colors.accent.primary : tokens.colors.border.default}`,
                        background: isSelected(index) ? tokens.colors.accent.glow : 'transparent',
                        cursor: 'pointer',
                        transition: `all ${tokens.transitions.fast}`,
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
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
                          width: 16,
                          height: 16,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: tokens.spacing[2],
                        }}>
                          <div>
                            <div style={{
                              fontWeight: 600,
                              color: tokens.colors.text.primary,
                              fontSize: '14px',
                            }}>
                              {inv.name || inv.firm}
                              {inv.source === 'discovered' && (
                                <span style={{
                                  fontSize: '10px',
                                  color: tokens.colors.accent.light,
                                  marginLeft: tokens.spacing[2],
                                  background: tokens.colors.accent.glow,
                                  padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                                  borderRadius: tokens.radius.full,
                                }}>
                                  🎯
                                </span>
                              )}
                              {inv.source === 'csv' && (
                                <span style={{
                                  fontSize: '10px',
                                  color: tokens.colors.status.warning,
                                  marginLeft: tokens.spacing[2],
                                  background: 'rgba(251, 191, 36, 0.1)',
                                  padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                                  borderRadius: tokens.radius.full,
                                }}>
                                  📄 CSV
                                </span>
                              )}
                            </div>
                            <div style={{
                              fontSize: '13px',
                              color: tokens.colors.text.tertiary,
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
                                ? tokens.colors.accent.light 
                                : tokens.colors.text.muted,
                            background: inv.score >= 90 
                              ? 'rgba(52, 211, 153, 0.1)'
                              : inv.score >= 70 
                                ? tokens.colors.accent.glow
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
                              <span key={i} style={styles.tagAccent}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {inv.matchReasons && (
                          <div style={{
                            fontSize: '12px',
                            color: tokens.colors.accent.light,
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
            }}>
              <button
                onClick={() => setMode("upload")}
                style={{
                  ...styles.btnSecondary,
                  whiteSpace: 'nowrap',
                }}
              >
                <Icons.ArrowLeft size={16} />
                Re-upload
              </button>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => onNext({ startup, selectedInvestors: getSelectedInvestors() })}
                disabled={!valid}
                style={{
                  ...styles.btnPrimary,
                  padding: `${tokens.spacing[3]} ${tokens.spacing[8]}`,
                  justifyContent: 'center',
                  opacity: valid ? 1 : 0.4,
                  cursor: valid ? 'pointer' : 'not-allowed',
                  minWidth: '200px',
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
    <div style={{ width: '100%', maxWidth: '100%' }}>
      <div style={{ marginBottom: tokens.spacing[4] }}>
        <h2 style={styles.h2}>
          {savedProfile ? "Update your documents" : "Upload your documents"}
        </h2>
        <p style={styles.body}>
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
          style={{
            ...styles.btnPrimary,
            width: '100%',
            marginTop: tokens.spacing[3],
            justifyContent: 'center',
          }}
        >
          Continue with saved profile
          <Icons.ArrowRight size={16} />
        </button>
      )}

      <button
        onClick={onBack}
        style={{
          ...styles.btnGhost,
          marginTop: tokens.spacing[3],
          width: '100%',
          justifyContent: 'center',
        }}
      >
        ← Back
      </button>
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
        <h1 style={styles.h1}>New Campaign</h1>
        <p style={styles.body}>Upload your documents and we'll match you with the right investors.</p>
      </div>

      {isAtLimit ? (
        <div style={styles.card}>
          <div style={{ textAlign: "center", padding: tokens.spacing[8] }}>
            <div style={{ fontSize: 48, marginBottom: tokens.spacing[4] }}>🔒</div>
            <h3 style={styles.h3}>
              {plan === "starter" ? "You've hit your Starter limit." : "You've used all 10 free pitches."}
            </h3>
            <p style={{ ...styles.body, marginBottom: tokens.spacing[6] }}>
              {plan === "starter" 
                ? "Upgrade to Pro and unlock 500 pitches/month."
                : "Upgrade to keep sending. Starter gives you 100 pitches/month."}
            </p>
            <a href="/upgrade" style={styles.btnPrimary}>
              Upgrade →
            </a>
          </div>
        </div>
      ) : (
        <div style={styles.card}>
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
        <h1 style={styles.h1}>Investor Discovery</h1>
        <p style={styles.body}>
          {investors.length} investors in database. 
          <span style={{ color: tokens.colors.status.warning, marginLeft: tokens.spacing[2] }}>
            ⚠️ {investors.filter(i => !i.email).length} need email verification
          </span>
        </p>
      </div>

      <div style={{ display: 'flex', gap: tokens.spacing[3], flexWrap: 'wrap', marginBottom: tokens.spacing[4] }}>
        <button onClick={() => setShowAddForm(!showAddForm)} style={styles.btnPrimary}>
          + Add Investor
        </button>
      </div>

      {showAddForm && (
        <div style={{ ...styles.card, marginBottom: tokens.spacing[4] }}>
          <AddInvestorForm onClose={() => setShowAddForm(false)} onAdded={fetchInvestors} />
        </div>
      )}

      <div style={{ display: 'flex', gap: tokens.spacing[3], flexWrap: 'wrap', marginBottom: tokens.spacing[4] }}>
        <select value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })} style={styles.input}>
          <option value="">All sectors</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })} style={styles.input}>
          <option value="">All stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })} style={styles.input}>
          <option value="">All regions</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(filters.sector || filters.stage || filters.region) && (
          <button onClick={() => setFilters({ sector: "", stage: "", region: "" })} style={styles.btnGhost}>
            Clear filters ×
          </button>
        )}
      </div>

      {error && <p style={{ color: tokens.colors.status.error, fontSize: '14px', marginBottom: tokens.spacing[4] }}>⚠ {error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: tokens.spacing[12], color: tokens.colors.text.muted }}>Loading investors...</div>
      ) : investors.length === 0 ? (
        <div style={{ ...styles.card, textAlign: 'center', padding: tokens.spacing[12] }}>
          <div style={{ fontSize: 40, marginBottom: tokens.spacing[4] }}>🔍</div>
          <p style={styles.body}>No investors match these filters. Try widening your search.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3], marginBottom: tokens.spacing[10] }}>
          {investors.map(inv => (
            <div key={inv.id} style={{
              ...styles.card,
              borderColor: selected.includes(inv.id) ? tokens.colors.accent.primary : tokens.colors.border.default,
              background: selected.includes(inv.id) ? tokens.colors.accent.glow : 'transparent',
            }}>
              <div style={{ display: 'flex', gap: tokens.spacing[3], alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={selected.includes(inv.id)}
                  onChange={() => toggleSelect(inv.id)}
                  style={{ marginTop: '3px', accentColor: tokens.colors.accent.primary, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: tokens.spacing[2] }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: tokens.colors.text.primary }}>{inv.firm}</div>
                      <div style={{ fontSize: '13px', color: tokens.colors.text.tertiary }}>{inv.hq}</div>
                    </div>
                    {!inv.email && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: tokens.colors.status.warning,
                        background: 'rgba(251, 191, 36, 0.1)',
                        padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
                        borderRadius: tokens.radius.full,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}>
                        Need email
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: tokens.colors.text.secondary, lineHeight: 1.5, marginBottom: tokens.spacing[3] }}>{inv.notes}</p>
                  <div style={{ display: 'flex', gap: tokens.spacing[1], flexWrap: 'wrap' }}>
                    {inv.sectors?.map((s, i) => (
                      <span key={i} style={styles.tagAccent}>{s}</span>
                    ))}
                    {inv.stages?.map((s, i) => (
                      <span key={i} style={styles.tag}>{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: tokens.spacing[6],
          left: '50%',
          transform: 'translateX(-50%)',
          background: tokens.colors.bg.surface,
          border: `1px solid ${tokens.colors.accent.primary}`,
          borderRadius: tokens.radius.lg,
          padding: `${tokens.spacing[4]} ${tokens.spacing[6]}`,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing[4],
          boxShadow: tokens.shadows.xl,
          zIndex: 100,
        }}>
          <span style={{ fontSize: '14px', color: tokens.colors.text.primary, fontWeight: 600 }}>
            {selected.length} investor{selected.length !== 1 ? "s" : ""} selected
          </span>
          <button onClick={handleStartCampaign} style={styles.btnPrimary}>
            Start Campaign →
          </button>
          <button onClick={() => setSelected([])} style={{
            background: 'transparent',
            border: 'none',
            color: tokens.colors.text.muted,
            fontSize: '20px',
            cursor: 'pointer',
            padding: 0,
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

  const inputStyle = styles.input;

  return (
    <div>
      <h3 style={{ ...styles.h3, marginBottom: tokens.spacing[4] }}>Add an investor to the database</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[3] }}>
        <input placeholder="Firm name *" value={form.firm} onChange={(e) => setForm({ ...form, firm: e.target.value })} style={inputStyle} />
        <input placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} style={inputStyle} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
        <input placeholder="HQ location" value={form.hq} onChange={(e) => setForm({ ...form, hq: e.target.value })} style={inputStyle} />
        <input placeholder="Sectors (comma separated)" value={form.sectors} onChange={(e) => setForm({ ...form, sectors: e.target.value })} style={inputStyle} />
        <input placeholder="Stages (comma separated)" value={form.stages} onChange={(e) => setForm({ ...form, stages: e.target.value })} style={inputStyle} />
        <input placeholder="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} style={{ ...inputStyle, gridColumn: "1 / -1" }} />
      </div>
      <textarea placeholder="Notes (what do they look for?)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, width: '100%', resize: 'vertical', marginTop: tokens.spacing[3], boxSizing: 'border-box' }} />
      {error && <p style={{ color: tokens.colors.status.error, fontSize: '13px', marginTop: tokens.spacing[3] }}>⚠ {error}</p>}
      <div style={{ display: 'flex', gap: tokens.spacing[3], marginTop: tokens.spacing[4] }}>
        <button onClick={onClose} style={styles.btnSecondary}>Cancel</button>
        <button onClick={handleSubmit} disabled={submitting} style={{ ...styles.btnPrimary, opacity: submitting ? 0.4 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
          {submitting ? "Adding..." : "Add Investor"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// APP
// ============================================================

export default function App() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [pitchCount, setPitchCount] = useState(0);
  const [plan, setPlan] = useState("free");
  const [activeTab, setActiveTab] = useState("campaign");
  const [preloadedInvestors, setPreloadedInvestors] = useState(null);
  const [savedProfile, setSavedProfile] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function initializeApp() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          setAuthChecking(false);
          return;
        }
        setUser(session.user);
        const count = parseInt(localStorage.getItem("pitches_" + session.user.id) || "0");
        const savedPlan = localStorage.getItem("plan_" + session.user.id) || "free";
        setPitchCount(count);
        setPlan(savedPlan);

        try {
          const { data, error } = await supabase
            .from('startup_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (error) {
            console.error("Supabase fetch error:", error);
            setSavedProfile(null);
          } else if (data) {
            setSavedProfile(data);
          } else {
            setSavedProfile(null);
          }
        } catch (err) {
          console.error("Failed to fetch profile:", err);
          setSavedProfile(null);
        }
      } catch (error) {
        console.error("Initialization error:", error);
        router.push("/login");
      } finally {
        setAuthChecking(false);
      }
    }
    initializeApp();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authChecking) {
    return (
      <div style={styles.page}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}>
          <div style={{ color: tokens.colors.text.muted, fontSize: '14px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>PitchWire — Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      <div style={styles.page}>
        {/* Mobile Header */}
        <div style={{
          display: 'none',
          '@media (max-width: 768px)': {
            display: 'flex',
          },
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: tokens.spacing[4],
          borderBottom: `1px solid ${tokens.colors.border.default}`,
          background: tokens.colors.bg.base,
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: tokens.colors.text.primary,
              cursor: 'pointer',
              padding: tokens.spacing[2],
            }}
          >
            <Icons.Menu size={24} />
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing[3],
          }}>
            <div style={{
              width: 28,
              height: 28,
              background: `linear-gradient(135deg, ${tokens.colors.accent.primary}, ${tokens.colors.accent.active})`,
              borderRadius: tokens.radius.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icons.Zap size={14} color="#fff" />
            </div>
            <span style={{
              fontSize: '16px',
              fontWeight: 800,
              color: tokens.colors.text.primary,
              letterSpacing: '-0.02em',
            }}>
              PitchWire
            </span>
          </div>
          <div style={{ width: 40 }} />
        </div>

        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          plan={plan}
          pitchCount={pitchCount}
          onSignOut={handleSignOut}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <main style={{
          marginLeft: '240px',
          flex: 1,
          padding: tokens.spacing[8],
          overflowY: 'auto',
          minHeight: '100vh',
          '@media (max-width: 768px)': {
            marginLeft: 0,
            padding: tokens.spacing[4],
          }
        }}>
          <div style={styles.main}>
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
                  setActiveTab("campaign");
                }}
              />
            )}
            {activeTab === "crm" && <CrmTab />}
            {activeTab === "followups" && <FollowupsTab />}
            {activeTab === "templates" && <TemplatesTab />}
            {activeTab === "account" && (
              <AccountTab
                user={user}
                plan={plan}
                pitchCount={pitchCount}
                onSignOut={handleSignOut}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
}

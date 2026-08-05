import React from 'react';
import tokens from '@/lib/designTokens';

/**
 * CRM UI primitives.
 *
 * The existing app styles inline, so these do too rather than introducing a
 * second styling system alongside it. What they add is consistency: one Card,
 * one Button, one Badge, so the CRM reads as a single surface instead of a
 * dozen slightly different white boxes.
 *
 * Palette comes from lib/designTokens — no hex values are invented here.
 */

const c = tokens.colors;

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function Card({
  children,
  padding = 20,
  style,
  onClick,
  interactive,
}: {
  children: React.ReactNode;
  padding?: number | string;
  style?: React.CSSProperties;
  onClick?: () => void;
  interactive?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={interactive ? 'crm-card crm-card-interactive' : 'crm-card'}
      style={{
        background: c.bg.card,
        border: `1px solid ${c.border.default}`,
        borderRadius: tokens.radius.lg,
        padding,
        boxSizing: 'border-box',
        cursor: interactive ? 'pointer' : undefined,
        transition: `border-color ${tokens.transitions.fast}, box-shadow ${tokens.transitions.fast}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: c.accent.primary, color: c.text.inverse, border: '1px solid transparent' },
  secondary: { background: c.bg.card, color: c.text.primary, border: `1px solid ${c.border.default}` },
  ghost: { background: 'transparent', color: c.text.secondary, border: '1px solid transparent' },
  danger: { background: 'transparent', color: c.status.error, border: `1px solid ${c.status.errorBorder}` },
};

export function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled,
  type = 'button',
  style,
  title,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="crm-btn"
      style={{
        ...BUTTON_VARIANTS[variant],
        // 32px is fine for dense desktop toolbars; the media query in
        // CrmTab lifts every button to 44px on touch screens.
        padding: size === 'sm' ? '6px 10px' : '9px 14px',
        fontSize: size === 'sm' ? 13 : 14,
        fontWeight: 600,
        borderRadius: tokens.radius.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: `opacity ${tokens.transitions.fast}, background ${tokens.transitions.fast}`,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export function Badge({
  children,
  color,
  subtle = true,
}: {
  children: React.ReactNode;
  /** Any hex; the badge derives its own wash from it. */
  color?: string;
  subtle?: boolean;
}) {
  const base = color || c.accent.secondary;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12,
        fontWeight: 600,
        // 12px is the floor across the product, matching the landing page.
        lineHeight: 1.4,
        padding: '3px 9px',
        borderRadius: tokens.radius.full,
        color: subtle ? base : c.text.inverse,
        background: subtle ? hexWash(base, 0.1) : base,
        border: `1px solid ${hexWash(base, 0.22)}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/** Turns a #rrggbb into an rgba wash. Falls back to the input if it isn't hex. */
export function hexWash(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
      }}
    >
      <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text.primary, margin: 0, letterSpacing: '-0.01em' }}>
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: c.text.muted,
      }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center', color: c.text.muted, fontSize: 14 }}>
      <div className="crm-spinner" aria-hidden />
      <div style={{ marginTop: 12 }}>{label}…</div>
      <style jsx>{`
        .crm-spinner {
          width: 22px;
          height: 22px;
          margin: 0 auto;
          border: 2px solid ${c.border.default};
          border-top-color: ${c.accent.secondary};
          border-radius: 50%;
          animation: crm-spin 700ms linear infinite;
        }
        @keyframes crm-spin {
          to {
            transform: rotate(360deg);
          }
        }
        /* Respect the OS setting rather than spinning regardless — the same
           preference that governs the landing page's typewriter. */
        @media (prefers-reduced-motion: reduce) {
          .crm-spinner {
            animation: none;
            border-top-color: ${c.border.default};
          }
        }
      `}</style>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card padding="40px 24px" style={{ textAlign: 'center' }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text.primary, margin: '0 0 6px' }}>{title}</h3>
      {body && (
        <p style={{ fontSize: 14, color: c.text.secondary, margin: '0 auto', maxWidth: 380, lineHeight: 1.6 }}>
          {body}
        </p>
      )}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </Card>
  );
}

export function ErrorNote({ children, onRetry }: { children: React.ReactNode; onRetry?: () => void }) {
  return (
    <div
      style={{
        background: c.status.errorBg,
        border: `1px solid ${c.status.errorBorder}`,
        color: c.status.error,
        borderRadius: tokens.radius.md,
        padding: '12px 14px',
        fontSize: 14,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <span>{children}</span>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Shown where a feature is gated. Deliberately explains what the feature does
 * rather than only naming the plan — a lock with no reason to unlock it reads
 * as an obstacle instead of an offer.
 */
export function UpgradeGate({
  title,
  body,
  plan,
}: {
  title: string;
  body: string;
  plan: 'starter' | 'pro';
}) {
  return (
    <Card padding="36px 24px" style={{ textAlign: 'center' }}>
      <Badge>{plan === 'pro' ? 'Pro' : 'Starter'}</Badge>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: c.text.primary, margin: '14px 0 6px' }}>{title}</h3>
      <p style={{ fontSize: 14, color: c.text.secondary, margin: '0 auto 20px', maxWidth: 400, lineHeight: 1.6 }}>
        {body}
      </p>
      <a
        href="/upgrade"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
          padding: '0 20px',
          background: c.accent.primary,
          color: c.text.inverse,
          borderRadius: tokens.radius.md,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        See plans
      </a>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

const fieldStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: c.bg.input,
  border: `1px solid ${c.border.default}`,
  borderRadius: tokens.radius.md,
  padding: '10px 12px',
  fontSize: 15, // 16px would be safer against iOS zoom, but 15 matches the
  color: c.text.primary, // app's body scale; the app viewport disables zoom.
  fontFamily: 'inherit',
  outline: 'none',
};

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          color: c.text.secondary,
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ display: 'block', fontSize: 12, color: c.text.muted, marginTop: 5 }}>{hint}</span>
      )}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...fieldStyle, ...props.style }} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...fieldStyle, minHeight: 90, resize: 'vertical', lineHeight: 1.6, ...props.style }}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...fieldStyle, cursor: 'pointer', ...props.style }} />;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({
  title,
  onClose,
  children,
  width = 460,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  // Escape closes, and the body cannot scroll behind the sheet. Both are the
  // kind of thing that is invisible when present and glaring when missing.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,26,26,0.32)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '6vh 16px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          background: c.bg.card,
          border: `1px solid ${c.border.default}`,
          borderRadius: tokens.radius.xl,
          boxShadow: tokens.shadows.xl,
          width: '100%',
          maxWidth: width,
          padding: 22,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: c.text.primary, margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: c.text.muted,
              fontSize: 22,
              lineHeight: 1,
              cursor: 'pointer',
              padding: 4,
              minWidth: 32,
              minHeight: 32,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

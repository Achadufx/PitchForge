import React, { useEffect } from 'react';
import tokens from '@/lib/designTokens';

const c = tokens.colors;

/**
 * A right-hand drawer.
 *
 * The pipeline is the thing the founder is working, so opening an investor
 * should not take it away. The board stays visible and dimmed behind the panel,
 * which means closing one investor and opening the next never involves a
 * round-trip through a separate page.
 *
 * Below 720px there is no "beside" — the panel becomes a full-screen sheet.
 * Same component, same state, one layout that adapts rather than two that
 * drift.
 */
export default function SidePanel({
  title,
  onClose,
  children,
  width = 520,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // The page behind must not scroll while the panel owns the screen —
    // otherwise a flick on a phone scrolls the board, not the timeline.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,26,26,0.28)',
          zIndex: 190,
        }}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="crm-side-panel"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: width,
          background: c.bg.base,
          borderLeft: `1px solid ${c.border.default}`,
          boxShadow: tokens.shadows.xl,
          zIndex: 191,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 18px',
            borderBottom: `1px solid ${c.border.default}`,
            background: c.bg.card,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: c.text.muted,
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="Close panel"
            style={{
              background: 'transparent',
              border: 'none',
              color: c.text.secondary,
              fontSize: 22,
              lineHeight: 1,
              cursor: 'pointer',
              // 44px square: this is the one control that must never be
              // fiddly, because it is the only way out of the panel.
              minWidth: 44,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '-6px -8px -6px 0',
            }}
          >
            ×
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 18 }}>
          {children}
        </div>

        <style jsx>{`
          .crm-side-panel {
            animation: crm-panel-in 180ms ease-out;
          }
          @keyframes crm-panel-in {
            from {
              transform: translateX(24px);
              opacity: 0;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .crm-side-panel {
              animation: none;
            }
          }
        `}</style>
      </aside>
    </>
  );
}

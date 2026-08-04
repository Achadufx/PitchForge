export default function GlobalStyles() {
  return (
    <style jsx global>{`
      /* ============================================================
         PITCHWIRE DESIGN SYSTEM
         Warm monochromatic cream. No glows, no gradients, no neon.
         Shadows are neutral rgba(0,0,0,...) only.
         Palette mirrors lib/designTokens.js — keep the two in sync.
         ============================================================ */

      /* ============================================================
         RESET & BASE
         ============================================================ */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      html, body {
        background: #F5F0E8;
        margin: 0;
        padding: 0;
        min-height: 100vh;
        overflow-x: hidden;
        color: #1A1A1A;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 15px;
        line-height: 1.7;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      #__next {
        background: #F5F0E8;
        min-height: 100vh;
      }

      ::selection {
        background: rgba(139,115,85,0.18);
        color: #1A1A1A;
      }

      /* ============================================================
         CARD SYSTEM
         White on cream, hairline warm border, neutral shadow only.
         ============================================================ */
      .pw-card {
        background: #FFFFFF;
        border: 1px solid #D4CFC7;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        transition: box-shadow 220ms cubic-bezier(0.4, 0, 0.2, 1),
                    border-color 220ms cubic-bezier(0.4, 0, 0.2, 1);
        width: 100%;
        box-sizing: border-box;
      }

      .pw-card:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }

      /* Emphasis comes from a darker border, not a coloured ring. */
      .pw-card-accent {
        background: #FFFFFF;
        border: 1px solid #1A1A1A;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        width: 100%;
        box-sizing: border-box;
      }

      /* ============================================================
         SIDEBAR
         ============================================================ */
      .pw-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 240px;
        background: #EDE8DE;
        border-right: 1px solid #D4CFC7;
        z-index: 50;
        transform: translateX(0);
        transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      .pw-sidebar-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(26,26,26,0.32);
        z-index: 49;
      }

      .pw-sidebar-overlay.open {
        display: block;
      }

      /* ============================================================
         MAIN CONTENT
         ============================================================ */
      .pw-main-content {
        margin-left: 240px;
        flex: 1;
        padding: 40px;
        overflow-y: auto;
        min-height: 100vh;
        background: #F5F0E8;
        transition: margin-left 220ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* ============================================================
         MOBILE HEADER
         ============================================================ */
      .pw-mobile-header {
        display: none;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #D4CFC7;
        background: #F5F0E8;
        position: sticky;
        top: 0;
        z-index: 40;
      }

      /* ============================================================
         TYPOGRAPHY
         Editorial scale. Generous line height throughout.
         ============================================================ */
      .pw-display {
        font-size: clamp(40px, 7vw, 72px);
        font-weight: 700;
        color: #1A1A1A;
        letter-spacing: -0.035em;
        line-height: 1.05;
        margin: 0;
      }

      .pw-h1 {
        font-size: clamp(32px, 5vw, 48px);
        font-weight: 700;
        color: #1A1A1A;
        letter-spacing: -0.025em;
        line-height: 1.15;
        margin: 0;
      }

      .pw-h2 {
        font-size: clamp(24px, 3.5vw, 34px);
        font-weight: 650;
        color: #1A1A1A;
        letter-spacing: -0.02em;
        line-height: 1.25;
        margin: 0;
      }

      .pw-h3 {
        font-size: clamp(19px, 2.2vw, 23px);
        font-weight: 600;
        color: #1A1A1A;
        letter-spacing: -0.01em;
        line-height: 1.4;
        margin: 0;
      }

      .pw-body {
        font-size: 15px;
        font-weight: 400;
        color: #5C5248;
        line-height: 1.7;
      }

      .pw-body-lg {
        font-size: 17px;
        font-weight: 400;
        color: #5C5248;
        line-height: 1.7;
      }

      .pw-label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #5C5248;
        margin-bottom: 8px;
        letter-spacing: 0;
      }

      .pw-eyebrow {
        font-size: 12px;
        font-weight: 600;
        color: #9E9589;
        text-transform: uppercase;
        letter-spacing: 0.09em;
      }

      /* ============================================================
         BUTTONS
         Near-black primary. Hover shifts colour, never adds a glow.
         ============================================================ */
      .pw-btn-primary {
        background: #1A1A1A;
        color: #FFFFFF;
        border: 1px solid #1A1A1A;
        border-radius: 8px;
        padding: 12px 22px;
        font-size: 15px;
        font-weight: 550;
        cursor: pointer;
        transition: background 140ms cubic-bezier(0.4, 0, 0.2, 1),
                    border-color 140ms cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        white-space: nowrap;
        min-height: 44px;
        text-decoration: none;
        font-family: inherit;
        line-height: 1.4;
      }

      .pw-btn-primary:hover {
        background: #333333;
        border-color: #333333;
      }

      .pw-btn-primary:disabled {
        background: #BFB8AD;
        border-color: #BFB8AD;
        color: #FFFFFF;
        cursor: not-allowed;
      }

      .pw-btn-secondary {
        background: #FFFFFF;
        color: #1A1A1A;
        border: 1px solid #D4CFC7;
        border-radius: 8px;
        padding: 12px 22px;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        transition: border-color 140ms cubic-bezier(0.4, 0, 0.2, 1),
                    background 140ms cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        white-space: nowrap;
        min-height: 44px;
        text-decoration: none;
        font-family: inherit;
        line-height: 1.4;
      }

      .pw-btn-secondary:hover {
        border-color: #BFB8AD;
        background: #EDE8DE;
      }

      .pw-btn-ghost {
        background: transparent;
        color: #5C5248;
        border: none;
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: color 140ms cubic-bezier(0.4, 0, 0.2, 1),
                    background 140ms cubic-bezier(0.4, 0, 0.2, 1);
        white-space: nowrap;
        min-height: 44px;
        font-family: inherit;
      }

      .pw-btn-ghost:hover {
        color: #1A1A1A;
        background: #EDE8DE;
      }

      /* ============================================================
         INPUTS
         Focus ring is a neutral warm halo, not a coloured glow.
         ============================================================ */
      .pw-input {
        width: 100%;
        background: #FFFFFF;
        border: 1px solid #D4CFC7;
        border-radius: 8px;
        padding: 12px 14px;
        color: #1A1A1A;
        font-size: 15px;
        line-height: 1.6;
        outline: none;
        transition: border-color 140ms cubic-bezier(0.4, 0, 0.2, 1),
                    box-shadow 140ms cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
        min-height: 44px;
        font-family: inherit;
      }

      .pw-input::placeholder {
        color: #9E9589;
      }

      .pw-input:focus {
        border-color: #1A1A1A;
        box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
      }

      .pw-textarea {
        width: 100%;
        background: #FFFFFF;
        border: 1px solid #D4CFC7;
        border-radius: 8px;
        padding: 12px 14px;
        color: #1A1A1A;
        font-size: 15px;
        line-height: 1.7;
        outline: none;
        transition: border-color 140ms cubic-bezier(0.4, 0, 0.2, 1),
                    box-shadow 140ms cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
        resize: vertical;
        font-family: inherit;
        min-height: 44px;
      }

      .pw-textarea::placeholder {
        color: #9E9589;
      }

      .pw-textarea:focus {
        border-color: #1A1A1A;
        box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
      }

      .pw-select {
        background: #FFFFFF;
        color: #1A1A1A;
        border: 1px solid #D4CFC7;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 14px;
        outline: none;
        cursor: pointer;
        font-family: inherit;
        min-height: 44px;
      }

      .pw-select:focus {
        border-color: #1A1A1A;
      }

      /* ============================================================
         SCROLLABLE CONTAINERS
         ============================================================ */
      .pw-scroll {
        max-height: 320px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-right: 8px;
      }

      .pw-scroll-pitches {
        max-height: 460px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
        padding-right: 12px;
      }

      .pw-scroll::-webkit-scrollbar,
      .pw-scroll-pitches::-webkit-scrollbar {
        width: 6px;
      }

      .pw-scroll::-webkit-scrollbar-track,
      .pw-scroll-pitches::-webkit-scrollbar-track {
        background: transparent;
      }

      .pw-scroll::-webkit-scrollbar-thumb,
      .pw-scroll-pitches::-webkit-scrollbar-thumb {
        background: #D4CFC7;
        border-radius: 999px;
      }

      .pw-scroll::-webkit-scrollbar-thumb:hover,
      .pw-scroll-pitches::-webkit-scrollbar-thumb:hover {
        background: #BFB8AD;
      }

      /* ============================================================
         GRID
         ============================================================ */
      .pw-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      /* ============================================================
         DROPZONE
         ============================================================ */
      .pw-dropzone {
        border: 1px dashed #BFB8AD;
        border-radius: 12px;
        padding: 44px 24px;
        text-align: center;
        cursor: pointer;
        background: #FFFFFF;
        transition: border-color 220ms cubic-bezier(0.4, 0, 0.2, 1),
                    background 220ms cubic-bezier(0.4, 0, 0.2, 1);
        width: 100%;
        box-sizing: border-box;
      }

      .pw-dropzone:hover {
        border-color: #8B7355;
        background: #EDE8DE;
      }

      /* ============================================================
         PROGRESS
         Solid fill. The old version used a teal gradient.
         ============================================================ */
      .pw-progress {
        background: #E6E0D4;
        border-radius: 999px;
        height: 6px;
        overflow: hidden;
      }

      .pw-progress-fill {
        background: #1A1A1A;
        height: 100%;
        border-radius: 999px;
        transition: width 360ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* ============================================================
         TAGS
         ============================================================ */
      .pw-tag {
        display: inline-block;
        font-size: 12px;
        font-weight: 500;
        padding: 4px 10px;
        border-radius: 6px;
        background: #EDE8DE;
        color: #5C5248;
        border: 1px solid #D4CFC7;
        line-height: 1.5;
      }

      .pw-tag-accent {
        display: inline-block;
        font-size: 12px;
        font-weight: 500;
        padding: 4px 10px;
        border-radius: 6px;
        background: rgba(139,115,85,0.08);
        color: #8B7355;
        border: 1px solid rgba(139,115,85,0.22);
        line-height: 1.5;
      }

      /* ============================================================
         FLOATING BAR
         ============================================================ */
      .pw-floating-bar {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #FFFFFF;
        border: 1px solid #D4CFC7;
        border-radius: 12px;
        padding: 14px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.06);
        z-index: 100;
      }

      /* ============================================================
         STEP INDICATOR
         ============================================================ */
      .pw-step-container {
        display: flex;
        align-items: center;
        margin-bottom: 32px;
        gap: 12px;
        width: 100%;
      }

      .pw-step-gap {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .pw-step-circle {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        transition: background 220ms cubic-bezier(0.4, 0, 0.2, 1),
                    border-color 220ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      .pw-step-label {
        font-size: 11px;
        white-space: nowrap;
      }

      /* ============================================================
         SKELETON LOADER
         Shows immediately so the first paint is never a blank screen.
         Neutral warm shimmer, no colour.
         ============================================================ */
      .pw-skeleton {
        background: #E6E0D4;
        border-radius: 8px;
        position: relative;
        overflow: hidden;
      }

      .pw-skeleton::after {
        content: '';
        position: absolute;
        inset: 0;
        transform: translateX(-100%);
        background: linear-gradient(
          90deg,
          rgba(255,255,255,0) 0%,
          rgba(255,255,255,0.55) 50%,
          rgba(255,255,255,0) 100%
        );
        animation: pw-shimmer 1.4s ease-in-out infinite;
      }

      @keyframes pw-shimmer {
        100% { transform: translateX(100%); }
      }

      @media (prefers-reduced-motion: reduce) {
        .pw-skeleton::after { animation: none; }
        * { transition-duration: 0.01ms !important; }
      }

      /* ============================================================
         LINKS
         ============================================================ */
      .pw-link {
        color: #1A1A1A;
        text-decoration: none;
        border-bottom: 1px solid #D4CFC7;
        transition: border-color 140ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      .pw-link:hover {
        border-color: #1A1A1A;
      }

      .pw-link-muted {
        color: #5C5248;
        text-decoration: none;
        transition: color 140ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      .pw-link-muted:hover {
        color: #1A1A1A;
      }

      /* ============================================================
         DIVIDER
         ============================================================ */
      .pw-divider {
        height: 1px;
        background: #D4CFC7;
        border: none;
        width: 100%;
      }

      /* ============================================================
         MOBILE (<= 768px)
         ============================================================ */
      @media (max-width: 768px) {
        .pw-sidebar {
          transform: translateX(-100%);
          width: 280px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.06);
        }

        .pw-sidebar.open {
          transform: translateX(0);
        }

        .pw-sidebar-overlay {
          display: none;
        }

        .pw-sidebar-overlay.open {
          display: block;
        }

        .pw-mobile-header {
          display: flex !important;
        }

        .pw-main-content {
          margin-left: 0 !important;
          padding: 20px !important;
        }

        .pw-card {
          padding: 18px;
        }

        .pw-grid {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .pw-btn-primary,
        .pw-btn-secondary {
          padding: 12px 18px;
          width: 100%;
          justify-content: center;
        }

        .pw-floating-bar {
          padding: 12px 16px;
          gap: 12px;
          bottom: 16px;
          width: 92%;
          flex-wrap: wrap;
          justify-content: center;
        }

        .pw-dropzone {
          padding: 32px 16px;
        }

        .pw-step-container {
          gap: 8px;
          margin-bottom: 20px;
        }

        .pw-step-gap {
          gap: 6px;
        }

        .pw-step-circle {
          width: 24px;
          height: 24px;
          font-size: 10px;
        }

        .pw-step-label {
          font-size: 9px;
        }

        .pw-scroll-pitches {
          max-height: 340px;
        }
      }

      /* ============================================================
         SMALL MOBILE (<= 480px)
         ============================================================ */
      @media (max-width: 480px) {
        .pw-card {
          padding: 14px;
        }

        .pw-floating-bar {
          padding: 10px 12px;
          gap: 8px;
          width: 95%;
        }
      }
    `}</style>
  );
}

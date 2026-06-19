// components/GlobalStyles.js
export default function GlobalStyles() {
  return (
    <style jsx global>{`
      /* ============================================================
         PITCHWIRE - GLOBAL RESPONSIVE STYLES
         ============================================================ */

      /* --- Card System --- */
      .pw-card {
        background: #111827;
        border: 1px solid #1e2a3a;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        transition: all 250ms ease;
        width: 100%;
        box-sizing: border-box;
      }

      /* --- Typography --- */
      .pw-h1 {
        font-size: 35px;
        font-weight: 800;
        color: #e8eaed;
        letter-spacing: -0.02em;
        line-height: 1.2;
        margin: 0;
      }

      .pw-h2 {
        font-size: 27px;
        font-weight: 700;
        color: #e8eaed;
        letter-spacing: -0.01em;
        line-height: 1.2;
        margin: 0;
      }

      .pw-h3 {
        font-size: 21px;
        font-weight: 700;
        color: #e8eaed;
        line-height: 1.3;
        margin: 0;
      }

      .pw-body {
        font-size: 15px;
        font-weight: 400;
        color: #b0b6c4;
        line-height: 1.6;
      }

      .pw-label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #7a8194;
        margin-bottom: 8px;
        letter-spacing: 0.01em;
      }

      /* --- Buttons --- */
      .pw-btn-primary {
        background: #14b8a6;
        color: #ffffff;
        border: none;
        border-radius: 10px;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 150ms ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        min-height: 44px;
        text-decoration: none;
      }

      .pw-btn-primary:hover {
        background: #2dd4bf;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(20,184,166,0.25);
      }

      .pw-btn-secondary {
        background: transparent;
        color: #b0b6c4;
        border: 1px solid #1e2a3a;
        border-radius: 10px;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 150ms ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        min-height: 44px;
        text-decoration: none;
      }

      .pw-btn-secondary:hover {
        border-color: #2a3a4a;
        color: #e8eaed;
      }

      .pw-btn-ghost {
        background: transparent;
        color: #7a8194;
        border: none;
        border-radius: 10px;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 150ms ease;
        white-space: nowrap;
        min-height: 44px;
      }

      .pw-btn-ghost:hover {
        color: #e8eaed;
        background: rgba(255,255,255,0.03);
      }

      /* --- Inputs --- */
      .pw-input {
        width: 100%;
        background: #0f1625;
        border: 1px solid #1e2a3a;
        border-radius: 10px;
        padding: 12px 16px;
        color: #e8eaed;
        font-size: 14px;
        outline: none;
        transition: all 150ms ease;
        box-sizing: border-box;
        min-height: 44px;
      }

      .pw-input:focus {
        border-color: #14b8a6;
        box-shadow: 0 0 0 3px rgba(20,184,166,0.12);
      }

      .pw-textarea {
        width: 100%;
        background: #0f1625;
        border: 1px solid #1e2a3a;
        border-radius: 10px;
        padding: 12px 16px;
        color: #e8eaed;
        font-size: 14px;
        outline: none;
        transition: all 150ms ease;
        box-sizing: border-box;
        resize: vertical;
        font-family: inherit;
        min-height: 44px;
      }

      .pw-textarea:focus {
        border-color: #14b8a6;
        box-shadow: 0 0 0 3px rgba(20,184,166,0.12);
      }

      /* --- Tags --- */
      .pw-tag {
        display: inline-block;
        font-size: 11px;
        font-weight: 500;
        padding: 4px 12px;
        border-radius: 999px;
        background: rgba(255,255,255,0.04);
        color: #7a8194;
        border: 1px solid #1e2a3a;
      }

      .pw-tag-accent {
        display: inline-block;
        font-size: 11px;
        font-weight: 500;
        padding: 4px 12px;
        border-radius: 999px;
        background: rgba(20,184,166,0.12);
        color: #5eead4;
        border: 1px solid rgba(20,184,166,0.25);
      }

      /* --- Grid --- */
      .pw-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      /* --- Progress --- */
      .pw-progress {
        background: rgba(255,255,255,0.05);
        border-radius: 999px;
        height: 4px;
        overflow: hidden;
      }

      .pw-progress-fill {
        background: linear-gradient(90deg, #14b8a6, #5eead4);
        height: 100%;
        border-radius: 999px;
        transition: width 400ms ease;
      }

      /* --- Dropzone --- */
      .pw-dropzone {
        border: 2px dashed #1e2a3a;
        border-radius: 16px;
        padding: 40px 24px;
        text-align: center;
        cursor: pointer;
        background: #0c1120;
        transition: all 250ms ease;
        width: 100%;
        box-sizing: border-box;
      }

      .pw-dropzone:hover {
        border-color: #14b8a6;
        background: rgba(20,184,166,0.12);
      }

      /* --- Scrollable Containers --- */
      .pw-scroll {
        max-height: 320px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-right: 8px;
      }

      .pw-scroll-pitches {
        max-height: 400px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
        padding-right: 12px;
      }

      /* --- Custom Scrollbar --- */
      .pw-scroll::-webkit-scrollbar,
      .pw-scroll-pitches::-webkit-scrollbar {
        width: 4px;
      }

      .pw-scroll::-webkit-scrollbar-track,
      .pw-scroll-pitches::-webkit-scrollbar-track {
        background: transparent;
      }

      .pw-scroll::-webkit-scrollbar-thumb,
      .pw-scroll-pitches::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.1);
        border-radius: 10px;
      }

      /* --- Floating Action Bar --- */
      .pw-floating-bar {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #111827;
        border: 1px solid #14b8a6;
        border-radius: 16px;
        padding: 16px 24px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.6);
        z-index: 100;
      }

      /* --- Sidebar Overlay --- */
      .pw-sidebar-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        z-index: 49;
        backdrop-filter: blur(4px);
        display: none;
      }

      .pw-sidebar-overlay.open {
        display: block;
      }

      /* --- Sidebar --- */
      .pw-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 280px;
        background: #070b14;
        border-right: 1px solid #1e2a3a;
        z-index: 50;
        transform: translateX(-100%);
        transition: transform 250ms ease;
        box-shadow: 0 12px 48px rgba(0,0,0,0.6);
        overflow-y: auto;
      }

      .pw-sidebar.open {
        transform: translateX(0);
      }

      /* --- Mobile Header --- */
      .pw-mobile-header {
        display: none;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #1e2a3a;
        background: #070b14;
        position: sticky;
        top: 0;
        z-index: 40;
      }

      /* --- Main Content --- */
      .pw-main-content {
        margin-left: 240px;
        flex: 1;
        padding: 32px;
        overflow-y: auto;
        min-height: 100vh;
        transition: margin-left 250ms ease;
      }

      /* ============================================================
         MOBILE RESPONSIVE (<= 768px)
         ============================================================ */

      @media (max-width: 768px) {
        .pw-card {
          padding: 16px;
          border-radius: 12px;
        }

        .pw-h1 {
          font-size: 28px;
        }

        .pw-h2 {
          font-size: 22px;
        }

        .pw-h3 {
          font-size: 18px;
        }

        .pw-body {
          font-size: 14px;
        }

        .pw-label {
          font-size: 12px;
        }

        .pw-btn-primary,
        .pw-btn-secondary {
          padding: 12px 16px;
          font-size: 13px;
          width: 100%;
          justify-content: center;
        }

        .pw-btn-ghost {
          padding: 8px 12px;
          font-size: 12px;
        }

        .pw-input {
          padding: 12px 12px;
          font-size: 13px;
        }

        .pw-textarea {
          padding: 12px 12px;
          font-size: 13px;
        }

        .pw-grid {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .pw-dropzone {
          padding: 32px 16px;
          border-radius: 12px;
        }

        .pw-scroll {
          padding-right: 4px;
        }

        .pw-scroll-pitches {
          padding-right: 8px;
        }

        .pw-floating-bar {
          padding: 12px 16px;
          gap: 12px;
          bottom: 16px;
          width: 90%;
          flex-wrap: wrap;
          justify-content: center;
        }

        /* Sidebar - hidden by default on mobile */
        .pw-sidebar {
          transform: translateX(-100%);
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

        /* Mobile header - visible */
        .pw-mobile-header {
          display: flex !important;
        }

        /* Main content - no left margin on mobile */
        .pw-main-content {
          margin-left: 0 !important;
          padding: 16px !important;
        }

        /* Step indicator mobile */
        .pw-step-container {
          gap: 8px !important;
          margin-bottom: 16px !important;
        }

        .pw-step-circle {
          width: 24px !important;
          height: 24px !important;
          font-size: 9px !important;
        }

        .pw-step-label {
          font-size: 8px !important;
        }

        .pw-step-gap {
          gap: 4px !important;
        }
      }

      /* ============================================================
         SMALL MOBILE (<= 480px)
         ============================================================ */

      @media (max-width: 480px) {
        .pw-h1 {
          font-size: 24px;
        }

        .pw-h2 {
          font-size: 19px;
        }

        .pw-h3 {
          font-size: 16px;
        }

        .pw-body {
          font-size: 13px;
        }

        .pw-card {
          padding: 12px;
          border-radius: 10px;
        }

        .pw-btn-primary,
        .pw-btn-secondary {
          font-size: 13px;
          min-height: 44px;
        }

        .pw-tag,
        .pw-tag-accent {
          font-size: 10px;
          padding: 2px 8px;
        }

        .pw-floating-bar {
          padding: 8px 12px;
          gap: 8px;
          width: 95%;
        }

        .pw-dropzone {
          padding: 24px 12px;
        }

        .pw-input {
          font-size: 13px;
          padding: 10px 12px;
        }

        .pw-textarea {
          font-size: 13px;
          padding: 10px 12px;
        }
      }
    `}</style>
  );
}

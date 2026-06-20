import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

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
    }
  },
  spacing: {
    2: '8px',
    3: '12px',
    4: '16px',
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
    md: '0 4px 16px rgba(0,0,0,0.4)',
    xl: '0 12px 48px rgba(0,0,0,0.6)',
  },
  transitions: {
    fast: '150ms ease',
    base: '250ms ease',
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
  Google: () => (
    <svg width="20" height="20" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  ),
};

// ============================================================
// LOGIN COMPONENT
// ============================================================

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/app");
      else setChecking(false);
    });
  }, []);

const handleGoogle = async () => {
  setLoading(true);
  
  // Check if user exists before redirecting
  const { data: { session } } = await supabase.auth.getSession();
  
  // If they already have a session, they're returning
  if (session) {
    router.push("/app");
    return;
  }
  
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { 
      redirectTo: window.location.origin + "/onboarding"
    }
  });
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

  return (
    <>
      <Head>
        <title>Sign in — PitchWire</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
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

        .login-page {
          min-height: 100vh;
          background: #070b14;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .login-glow {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .login-container {
          width: 100%;
          max-width: 400px;
          position: relative;
          z-index: 1;
        }

        .login-logo {
          text-align: center;
          margin-bottom: 40px;
        }

        .login-logo-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }

        .login-logo-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-logo-icon img {
          width: 40px;
          height: 40px;
          object-fit: contain;
        }

        .login-logo-text {
          font-size: 22px;
          font-weight: 800;
          color: #e8eaed;
          letter-spacing: -0.4px;
        }

        .login-card {
          background: #111827;
          border: 1px solid #1e2a3a;
          border-radius: 16px;
          padding: 40px 32px;
          box-shadow: 0 12px 48px rgba(0,0,0,0.6);
        }

        .login-title {
          font-size: 24px;
          font-weight: 800;
          color: #e8eaed;
          letter-spacing: -0.8px;
          margin-bottom: 8px;
          text-align: center;
        }

        .login-subtitle {
          font-size: 14px;
          color: #4a5166;
          text-align: center;
          margin-bottom: 32px;
          line-height: 1.5;
        }

        .login-google-btn {
          width: 100%;
          padding: 14px 20px;
          border-radius: 10px;
          background: #ffffff;
          color: #111827;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 15px;
          font-family: 'Inter', system-ui;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 150ms ease;
          min-height: 52px;
        }

        .login-google-btn:hover {
          background: #f0f0f0;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255,255,255,0.1);
        }

        .login-google-btn:disabled {
          background: #1a1a1a;
          color: #4a5166;
          cursor: not-allowed;
          transform: none;
        }

        .login-terms {
          font-size: 12px;
          color: #4a5166;
          text-align: center;
          margin-top: 20px;
          line-height: 1.6;
        }

        .login-terms a {
          color: #7a8194;
          text-decoration: none;
        }

        .login-terms a:hover {
          color: #b0b6c4;
        }

        .login-back {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: #4a5166;
        }

        .login-back a {
          color: #4a5166;
          text-decoration: none;
        }

        .login-back a:hover {
          color: #7a8194;
        }

        /* MOBILE RESPONSIVE */
        @media (max-width: 480px) {
          .login-card {
            padding: 28px 20px;
          }

          .login-title {
            font-size: 20px;
          }

          .login-subtitle {
            font-size: 13px;
            margin-bottom: 24px;
          }

          .login-google-btn {
            font-size: 14px;
            padding: 12px 16px;
            min-height: 48px;
          }

          .login-logo-text {
            font-size: 18px;
          }

          .login-logo-icon {
            width: 36px;
            height: 36px;
          }

          .login-logo-icon img {
            width: 36px;
            height: 36px;
          }

          .login-container {
            max-width: 100%;
            padding: 0 4px;
          }
        }

        @media (max-width: 360px) {
          .login-card {
            padding: 20px 16px;
          }

          .login-title {
            font-size: 18px;
          }

          .login-google-btn {
            font-size: 13px;
            padding: 10px 14px;
          }
        }
      `}</style>

      <div className="login-page">
        <div className="login-glow" />

        <div className="login-container">
          {/* Logo */}
          <div className="login-logo">
            <a href="/" className="login-logo-link">
              <div className="login-logo-icon">
                <img src="/logo.png" alt="PitchWire" />
              </div>
              <span className="login-logo-text">PitchWire</span>
            </a>
          </div>

          {/* Card */}
          <div className="login-card">
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">
              Sign in to start sending personalized investor pitches
            </p>

            <button
              onClick={handleGoogle}
              disabled={loading}
              className="login-google-btn"
            >
              {!loading && <Icons.Google />}
              {loading ? "Redirecting..." : "Continue with Google"}
            </button>

            <p className="login-terms">
              By signing in you agree to our{" "}
              <a href="#">Terms</a>{" "}
              and{" "}
              <a href="#">Privacy Policy</a>
            </p>
          </div>

          <p className="login-back">
            <a href="/">← Back to PitchWire</a>
          </p>
        </div>
      </div>
    </>
  );
}

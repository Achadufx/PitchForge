import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "../lib/supabase";
import GlobalStyles from "../components/GlobalStyles";
import tokens from "../lib/designTokens";

export default function Success() {
  const router = useRouter();
  const { plan } = router.query;
  const [counting, setCounting] = useState(4);
  const [syncState, setSyncState] = useState("syncing");

  useEffect(() => {
    if (!plan) return;
    let cancelled = false;

    // Writes the new plan locally so /app reflects it immediately. The Stripe
    // webhook is the source of truth server-side, but it lands asynchronously —
    // without this the user returns to the dashboard still showing "free".
    async function syncPlan() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!session) {
          setSyncState("error");
          return;
        }

        localStorage.setItem("plan_" + session.user.id, plan);
        localStorage.setItem("pitches_" + session.user.id, "0");

        // Same-tab listeners do not fire the storage event, so dispatch it
        // explicitly. /app listens and updates the plan without a refresh.
        try {
          window.dispatchEvent(new StorageEvent("storage", {
            key: "plan_" + session.user.id,
            newValue: plan,
          }));
        } catch (err) {
          // StorageEvent construction is unsupported in some browsers; the
          // focus listener in /app covers that case.
        }

        setSyncState("done");
      } catch (err) {
        console.error("Plan sync failed:", err);
        if (!cancelled) setSyncState("error");
      }
    }

    syncPlan();
    return () => { cancelled = true; };
  }, [plan]);

  useEffect(() => {
    if (!plan) return;
    const timer = setInterval(() => {
      setCounting((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.push("/app#account");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [plan, router]);

  const planLabel = plan === "pro" ? "Pro" : "Starter";

  return (
    <>
      <Head>
        <title>Payment successful — PitchWire</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <GlobalStyles />

      <div style={{
        minHeight: "100vh",
        background: tokens.colors.bg.base,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: tokens.spacing[6],
      }}>
        <div style={{
          maxWidth: 440,
          width: "100%",
          background: tokens.colors.bg.card,
          border: "1px solid " + tokens.colors.border.default,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing[10],
          boxShadow: tokens.shadows.sm,
          textAlign: "center",
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: tokens.colors.status.successBg,
            border: "1px solid " + tokens.colors.status.successBorder,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto " + tokens.spacing[6],
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke={tokens.colors.status.success} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <h1 className="pw-h2" style={{ marginBottom: tokens.spacing[3] }}>
            You&apos;re on {planLabel}
          </h1>

          <p className="pw-body" style={{ marginBottom: tokens.spacing[2] }}>
            Your plan is active and your pitch allowance has been reset.
          </p>

          {syncState === "error" && (
            <p style={{
              fontSize: tokens.typography.small,
              color: tokens.colors.status.error,
              marginBottom: tokens.spacing[4],
              lineHeight: 1.6,
            }}>
              We could not refresh your session automatically. Open the app and sign in again
              if your plan still shows as Free.
            </p>
          )}

          <p style={{
            fontSize: tokens.typography.small,
            color: tokens.colors.text.muted,
            marginBottom: tokens.spacing[8],
          }}>
            Redirecting in {counting}s
          </p>

          <button
            onClick={() => router.push("/app#account")}
            className="pw-btn-primary"
            style={{ width: "100%" }}
          >
            Go to dashboard
          </button>
        </div>
      </div>
    </>
  );
}

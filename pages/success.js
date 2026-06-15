import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "../lib/supabase";

export default function Success() {
  const router = useRouter();
  const { plan } = router.query;
  const [counting, setCounting] = useState(5);

  useEffect(() => {
    if (!plan) return;
    // Clear pitch count on upgrade
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        localStorage.setItem("pitches_" + session.user.id, "0");
        localStorage.setItem("plan_" + session.user.id, plan);
      }
    });
    const timer = setInterval(() => {
      setCounting(c => {
        if (c <= 1) { clearInterval(timer); router.push("/app"); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [plan]);

  return (
    <>
      <Head>
        <title>Payment successful — PitchWire</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", padding: 24 }}>
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-1px", marginBottom: 12 }}>You're in.</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
            {plan === "pro" ? "PitchWire Pro is now active." : "PitchWire Starter is now active."}
          </p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginBottom: 40 }}>
            Redirecting you to the app in {counting}s...
          </p>
          <button onClick={() => router.push("/app")} style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "13px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            Go to app now →
          </button>
        </div>
      </div>
    </>
  );
}

import tokens from "../lib/designTokens";

const c = tokens.colors;

export default function TemplatesTab() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: c.text.primary,
            letterSpacing: "-0.5px",
            marginBottom: 4,
          }}
        >
          Templates
        </h1>
        <p style={{ fontSize: 13, color: c.text.secondary }}>
          Manage your email and pitch templates.
        </p>
      </div>
      <div
        style={{
          background: c.bg.card,
          border: `1px solid ${c.border.default}`,
          borderRadius: tokens.radius.xl,
          padding: "48px 32px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }} aria-hidden>
          📝
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: c.text.primary, marginBottom: 8 }}>
          Templates Coming Soon
        </h3>
        <p
          style={{
            fontSize: 14,
            color: c.text.secondary,
            maxWidth: 380,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Create and manage reusable pitch templates.
        </p>
      </div>
    </div>
  );
}

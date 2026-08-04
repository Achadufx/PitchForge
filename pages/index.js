import Head from 'next/head';
import Link from 'next/link';
import GlobalStyles from '../components/GlobalStyles';
import tokens from '../lib/designTokens';

// Editorial landing page. No hero animation, no particle effects, no scroll
// reveals, no gradient text. Confidence comes from typography, whitespace, and
// showing the actual product difference rather than claiming it.

// Marks the verified facts inside the good pitch, so "specific" is something the
// visitor sees rather than a word they have to take on faith.
function Anchor({ children }) {
  return (
    <span
      style={{
        color: tokens.colors.text.primary,
        fontWeight: 550,
        borderBottom: '2px solid ' + tokens.colors.accent.subtleBorder,
        paddingBottom: 1,
      }}
    >
      {children}
    </span>
  );
}

const CHECKS = [
  {
    title: 'Opens on a proper noun',
    body: 'A named deal, their fund, or a portfolio company. A restatement of their thesis is rejected and rewritten.',
  },
  {
    title: 'Never invents a quote',
    body: 'Nothing is put in an investor’s mouth. If a claim cannot be traced to the research, it does not ship.',
  },
  {
    title: 'Finishes the thought',
    body: 'Truncated drafts and leftover placeholders are caught before you ever see them.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Add your investors',
    body: 'Upload a CSV or pick from the built-in database. Name, firm, and email is all it needs.',
  },
  {
    n: '02',
    title: 'Describe your startup once',
    body: 'Drop in your deck or type a summary. It is reused across every pitch you send.',
  },
  {
    n: '03',
    title: 'Review, then send',
    body: 'Every draft arrives already checked. Edit anything, deselect anyone, then send the batch.',
  },
];

const TIERS = [
  {
    name: 'Free',
    price: '0',
    blurb: 'Try it on a handful of investors.',
    features: ['10 pitches per month', 'Investor database access', 'CSV import'],
    cta: 'Start free',
    href: '/login',
    featured: false,
  },
  {
    name: 'Starter',
    price: '29',
    blurb: 'Run a real raise.',
    features: [
      '100 pitches per month',
      'Document upload',
      'Investor fit scoring',
      'Campaign tracking',
    ],
    cta: 'Choose Starter',
    href: '/login?plan=starter',
    featured: true,
  },
  {
    name: 'Pro',
    price: '79',
    blurb: 'For a full fundraising cycle.',
    features: [
      '500 pitches per month',
      'Deep investor research',
      'Full CRM pipeline',
      'Follow-up suggestions',
    ],
    cta: 'Choose Pro',
    href: '/login?plan=pro',
    featured: false,
  },
];

// Inline recreation of the real review screen rather than stock imagery.
function ProductMockup() {
  const rows = [
    { name: 'Yemi Keri', firm: 'Rising Tide Africa', score: 86, active: true },
    { name: 'Eloho Omame', firm: 'TLcom Capital', score: 79, active: false },
    { name: 'Maya Horgan Famodu', firm: 'Ingressive Capital', score: 74, active: false },
  ];

  return (
    <div
      style={{
        background: tokens.colors.bg.card,
        border: '1px solid ' + tokens.colors.border.default,
        borderRadius: tokens.radius.lg,
        boxShadow: tokens.shadows.lg,
        overflow: 'hidden',
        width: '100%',
      }}
      aria-label="The PitchWire pitch review screen"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '13px 16px',
          borderBottom: '1px solid ' + tokens.colors.border.default,
          background: tokens.colors.bg.surface,
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4CFC7' }} />
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4CFC7' }} />
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4CFC7' }} />
        <span style={{ marginLeft: 12, fontSize: 12, color: tokens.colors.text.muted }}>
          Review pitches — 3 of 3 ready
        </span>
      </div>

      <div className="mock-body">
        <div className="mock-list">
          {rows.map((r) => (
            <div
              key={r.name}
              style={{
                padding: '13px 14px',
                borderRadius: tokens.radius.md,
                border:
                  '1px solid ' +
                  (r.active ? tokens.colors.text.primary : tokens.colors.border.default),
                background: r.active ? tokens.colors.bg.card : 'transparent',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: r.active ? 600 : 500,
                    color: r.active ? tokens.colors.text.primary : tokens.colors.text.secondary,
                  }}
                >
                  {r.name}
                </span>
                <span style={{ fontSize: 12, color: tokens.colors.text.muted }}>{r.score}</span>
              </div>
              <div style={{ fontSize: 12.5, color: tokens.colors.text.muted, marginTop: 2 }}>
                {r.firm}
              </div>
            </div>
          ))}
        </div>

        <div className="mock-pitch">
          <div
            style={{
              fontSize: 13,
              fontWeight: 550,
              color: tokens.colors.text.primary,
              marginBottom: 12,
            }}
          >
            Subject: rails not apps for clinical records
          </div>
          <div
            style={{
              background: tokens.colors.bg.surface,
              border: '1px solid ' + tokens.colors.border.default,
              borderRadius: tokens.radius.md,
              padding: 18,
              fontSize: 14,
              lineHeight: 1.8,
              color: tokens.colors.text.secondary,
            }}
          >
            Hi Yemi,
            <br />
            <br />
            Your <Anchor>Series A in Ilara Health</Anchor> said diagnostics fail on
            distribution, not on science. Clinical records fail the same way.
            <br />
            <br />
            A Lagos clinic loses a patient file every week. Paper, no backup, no audit
            trail.
            <br />
            <br />
            We built the encrypted vault patients actually own. Two hospital pilots
            signed.
            <br />
            <br />
            15 minutes Thursday?
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <Head>
        <title>PitchWire — Cold pitches investors actually read</title>
        <meta
          name="description"
          content="Generic openers are why investors do not reply. PitchWire researches each investor and opens every pitch on a verified fact about them."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <GlobalStyles />

      <style jsx>{`
        .wrap {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 28px;
        }
        .wrap-narrow {
          max-width: 880px;
          margin: 0 auto;
          padding: 0 28px;
        }
        .nav {
          border-bottom: 1px solid ${tokens.colors.border.default};
          background: ${tokens.colors.bg.base};
          position: sticky;
          top: 0;
          z-index: 40;
        }
        .nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 70px;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 34px;
        }

        /* HERO — larger than the shared display scale, this is the one place
           the type should feel oversized. */
        .hero {
          padding: 132px 0 88px;
        }
        .hero h1 {
          font-size: clamp(44px, 8vw, 88px);
          font-weight: 700;
          letter-spacing: -0.042em;
          line-height: 0.98;
          color: ${tokens.colors.text.primary};
          max-width: 16ch;
          margin: 0 0 32px;
        }
        .hero-sub {
          max-width: 52ch;
          margin-bottom: 40px;
          font-size: 19px;
          line-height: 1.65;
          color: ${tokens.colors.text.secondary};
        }
        .hero-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .hero-note {
          margin-top: 22px;
          font-size: 14px;
          color: ${tokens.colors.text.muted};
        }

        /* THE PROOF — the side-by-side sits directly under the hero, because it
           is the single most persuasive thing on the page. */
        .proof {
          padding: 0 0 112px;
        }
        .proof-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .proof-col {
          border: 1px solid ${tokens.colors.border.default};
          border-radius: ${tokens.radius.lg};
          padding: 30px;
          background: ${tokens.colors.bg.card};
        }
        .proof-col.dead {
          background: transparent;
          border-style: dashed;
        }
        .proof-tag {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          margin-bottom: 18px;
        }
        .proof-quote {
          font-size: 16px;
          line-height: 1.75;
        }
        .proof-verdict {
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid ${tokens.colors.border.default};
          font-size: 14px;
          line-height: 1.6;
        }

        .section {
          padding: 104px 0;
          border-top: 1px solid ${tokens.colors.border.default};
        }
        .section-head {
          max-width: 44ch;
          margin-bottom: 60px;
        }
        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 52px;
        }
        .checks {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .tiers {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: start;
        }

        .mock-body {
          display: grid;
          grid-template-columns: 230px 1fr;
          gap: 20px;
          padding: 20px;
        }
        .mock-list {
          border-right: 1px solid ${tokens.colors.border.default};
          padding-right: 18px;
        }

        .footer {
          border-top: 1px solid ${tokens.colors.border.default};
          padding: 44px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .footer-links {
          display: flex;
          gap: 28px;
        }

        @media (max-width: 900px) {
          .steps,
          .checks,
          .tiers,
          .proof-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .steps {
            gap: 32px;
          }
          .hero {
            padding: 76px 0 56px;
          }
          .proof {
            padding-bottom: 72px;
          }
          .section {
            padding: 68px 0;
          }
          .nav-links {
            display: none;
          }
          .mock-body {
            grid-template-columns: 1fr;
          }
          .mock-list {
            border-right: none;
            border-bottom: 1px solid ${tokens.colors.border.default};
            padding-right: 0;
            padding-bottom: 14px;
          }
        }
      `}</style>

      <div style={{ background: tokens.colors.bg.base, minHeight: '100vh' }}>
        {/* NAV */}
        <nav className="nav">
          <div className="wrap nav-inner">
            <span
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: tokens.colors.text.primary,
                letterSpacing: '-0.02em',
              }}
            >
              PitchWire
            </span>
            <div className="nav-links">
              <a href="#proof" className="pw-link-muted" style={{ fontSize: 15 }}>
                The difference
              </a>
              <a href="#how" className="pw-link-muted" style={{ fontSize: 15 }}>
                How it works
              </a>
              <a href="#pricing" className="pw-link-muted" style={{ fontSize: 15 }}>
                Pricing
              </a>
              <Link href="/login" className="pw-link-muted" style={{ fontSize: 15 }}>
                Sign in
              </Link>
            </div>
            <Link
              href="/login"
              className="pw-btn-primary"
              style={{ padding: '9px 18px', minHeight: 40 }}
            >
              Get started
            </Link>
          </div>
        </nav>

        {/* HERO */}
        <header className="wrap hero">
          <h1>Your opening line is why they didn&apos;t reply.</h1>
          <p className="hero-sub">
            Investors read the first sentence and know instantly whether you looked them
            up. PitchWire researches each one and opens every pitch on something only
            they could receive.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="pw-btn-primary">
              Start free
            </Link>
            <a href="#proof" className="pw-btn-secondary">
              See the difference
            </a>
          </div>
          <p className="hero-note">10 pitches free. No card required.</p>
        </header>

        {/* PROOF — same startup, same investor, two openings */}
        <section id="proof" className="wrap proof">
          <div className="proof-grid">
            <div className="proof-col dead">
              <div className="proof-tag" style={{ color: tokens.colors.text.muted }}>
                What everyone sends
              </div>
              <p className="proof-quote" style={{ color: tokens.colors.text.muted }}>
                &ldquo;Hi Yemi, I noticed your focus on African fintech and thought you
                might be interested in what we&apos;re building. We&apos;re a healthtech
                startup solving a big problem in the market.&rdquo;
              </p>
              <p className="proof-verdict" style={{ color: tokens.colors.text.muted }}>
                Send this to fifty investors without changing a word. They can tell. That
                is the whole reason it goes unanswered.
              </p>
            </div>

            <div className="proof-col">
              <div className="proof-tag" style={{ color: tokens.colors.accent.secondary }}>
                What PitchWire writes
              </div>
              <p className="proof-quote" style={{ color: tokens.colors.text.secondary }}>
                &ldquo;Hi Yemi, your <Anchor>Series A in Ilara Health</Anchor> said
                diagnostics fail on distribution, not on science. Clinical records fail the
                same way. A Lagos clinic loses a patient file every week.&rdquo;
              </p>
              <p className="proof-verdict" style={{ color: tokens.colors.text.secondary }}>
                Impossible to send to anyone else. Every draft is checked against that bar
                before it reaches you.
              </p>
            </div>
          </div>
        </section>

        {/* PRODUCT */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <p className="pw-eyebrow" style={{ marginBottom: 14 }}>
                The workspace
              </p>
              <h2 className="pw-h2">Review the whole batch before a single one sends.</h2>
            </div>
            <ProductMockup />
          </div>
        </section>

        {/* THE CHECKS — honest differentiation in place of invented metrics */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <p className="pw-eyebrow" style={{ marginBottom: 14 }}>
                Before you see it
              </p>
              <h2 className="pw-h2">Three checks run on every draft.</h2>
            </div>
            <div className="checks">
              {CHECKS.map((c) => (
                <div key={c.title} className="pw-card">
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: tokens.colors.text.primary,
                      marginBottom: 10,
                      lineHeight: 1.4,
                    }}
                  >
                    {c.title}
                  </h3>
                  <p style={{ fontSize: 14.5, lineHeight: 1.7, color: tokens.colors.text.secondary }}>
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="section">
          <div className="wrap">
            <div className="section-head">
              <p className="pw-eyebrow" style={{ marginBottom: 14 }}>
                How it works
              </p>
              <h2 className="pw-h2">Three steps, then you are sending.</h2>
            </div>
            <div className="steps">
              {STEPS.map((s) => (
                <div key={s.n}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: tokens.colors.accent.secondary,
                      marginBottom: 16,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {s.n}
                  </div>
                  <h3 className="pw-h3" style={{ marginBottom: 10 }}>
                    {s.title}
                  </h3>
                  <p className="pw-body">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="section">
          <div className="wrap">
            <div className="section-head">
              <p className="pw-eyebrow" style={{ marginBottom: 14 }}>
                Pricing
              </p>
              <h2 className="pw-h2">Start free. Upgrade when you are raising.</h2>
            </div>
            <div className="tiers">
              {TIERS.map((t) => (
                <div
                  key={t.name}
                  className={t.featured ? 'pw-card-accent' : 'pw-card'}
                  style={{ display: 'flex', flexDirection: 'column', minHeight: 412 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{ fontSize: 15, fontWeight: 600, color: tokens.colors.text.primary }}
                    >
                      {t.name}
                    </span>
                    {t.featured && <span className="pw-tag-accent">Most popular</span>}
                  </div>

                  <p style={{ fontSize: 14, color: tokens.colors.text.muted, marginBottom: 22 }}>
                    {t.blurb}
                  </p>

                  <div style={{ marginBottom: 26 }}>
                    <span
                      style={{
                        fontSize: 42,
                        fontWeight: 700,
                        letterSpacing: '-0.035em',
                        color: tokens.colors.text.primary,
                      }}
                    >
                      ${t.price}
                    </span>
                    <span style={{ fontSize: 15, color: tokens.colors.text.muted }}> /month</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      marginBottom: 30,
                    }}
                  >
                    {t.features.map((f) => (
                      <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={tokens.colors.accent.secondary}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ flexShrink: 0, marginTop: 5 }}
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        <span
                          style={{
                            fontSize: 14,
                            color: tokens.colors.text.secondary,
                            lineHeight: 1.6,
                          }}
                        >
                          {f}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={t.href}
                    className={t.featured ? 'pw-btn-primary' : 'pw-btn-secondary'}
                    style={{ marginTop: 'auto', width: '100%' }}
                  >
                    {t.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CLOSING */}
        <section className="section">
          <div className="wrap-narrow" style={{ textAlign: 'center' }}>
            <h2
              style={{
                fontSize: 'clamp(30px, 4.6vw, 46px)',
                fontWeight: 700,
                letterSpacing: '-0.032em',
                lineHeight: 1.12,
                color: tokens.colors.text.primary,
                marginBottom: 20,
              }}
            >
              Write one. You will know in ten seconds.
            </h2>
            <p
              className="pw-body-lg"
              style={{ maxWidth: '46ch', margin: '0 auto 36px' }}
            >
              Add a single investor and read the opening line it produces. If it could
              have been sent to anyone else, close the tab.
            </p>
            <Link href="/login" className="pw-btn-primary">
              Start free
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="wrap footer">
          <span style={{ fontSize: 14, color: tokens.colors.text.muted }}>
            &copy; {new Date().getFullYear()} PitchWire
          </span>
          <div className="footer-links">
            <a href="#proof" className="pw-link-muted" style={{ fontSize: 14 }}>
              The difference
            </a>
            <a href="#how" className="pw-link-muted" style={{ fontSize: 14 }}>
              How it works
            </a>
            <a href="#pricing" className="pw-link-muted" style={{ fontSize: 14 }}>
              Pricing
            </a>
            <Link href="/login" className="pw-link-muted" style={{ fontSize: 14 }}>
              Sign in
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}

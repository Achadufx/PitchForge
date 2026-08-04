import Head from 'next/head';
import Link from 'next/link';
import GlobalStyles from '../components/GlobalStyles';
import tokens from '../lib/designTokens';

// Editorial landing page. No hero animation, no particle effects, no scroll
// reveals, no gradient text — all of which the previous version used. Confidence
// comes from typography and whitespace, the Stripe/Linear approach.

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
    body: 'Each pitch opens on a verified fact about that specific investor. Edit anything before it goes out.',
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

// Inline mockup of the real review screen rather than stock imagery.
function ProductMockup() {
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
          padding: '12px 16px',
          borderBottom: '1px solid ' + tokens.colors.border.default,
          background: tokens.colors.bg.surface,
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4CFC7' }} />
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4CFC7' }} />
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4CFC7' }} />
        <span style={{ marginLeft: 12, fontSize: 12, color: tokens.colors.text.muted }}>
          Review pitches — 3 of 5 selected
        </span>
      </div>

      <div style={{ padding: tokens.spacing[6] }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: tokens.spacing[4],
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: tokens.colors.text.primary }}>
              Yemi Keri
            </div>
            <div style={{ fontSize: 13, color: tokens.colors.text.muted }}>Rising Tide Africa</div>
          </div>
          <span className="pw-tag-accent">Score 86</span>
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 550,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing[3],
          }}
        >
          Subject: rails not apps for clinical records
        </div>

        <div
          style={{
            background: tokens.colors.bg.surface,
            border: '1px solid ' + tokens.colors.border.default,
            borderRadius: tokens.radius.md,
            padding: tokens.spacing[4],
            fontSize: 14,
            lineHeight: 1.75,
            color: tokens.colors.text.secondary,
          }}
        >
          Hi Yemi,
          <br />
          <br />
          Your Series A in Ilara Health said diagnostics fail on distribution, not on
          science. Clinical records fail the same way.
          <br />
          <br />
          A Lagos clinic loses a patient file every week. Paper, no backup, no audit
          trail.
          <br />
          <br />
          We built the encrypted vault patients actually own. Two hospital pilots signed.
          <br />
          <br />
          15 minutes Thursday?
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
          content="PitchWire writes investor cold emails that open on a verified fact about that specific investor. Research, draft, review, send."
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
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 24px;
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
          height: 68px;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .hero {
          padding: 120px 0 96px;
        }
        .hero-title {
          max-width: 15ch;
          margin-bottom: 28px;
        }
        .hero-sub {
          max-width: 54ch;
          margin-bottom: 40px;
        }
        .hero-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .mockup-band {
          padding-bottom: 96px;
        }
        .section {
          padding: 96px 0;
          border-top: 1px solid ${tokens.colors.border.default};
        }
        .section-head {
          max-width: 46ch;
          margin-bottom: 56px;
        }
        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 48px;
        }
        .tiers {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: start;
        }
        .compare {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .footer {
          border-top: 1px solid ${tokens.colors.border.default};
          padding: 40px 0;
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
        @media (max-width: 860px) {
          .steps,
          .tiers,
          .compare {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .hero {
            padding: 72px 0 64px;
          }
          .section {
            padding: 64px 0;
          }
          .nav-links {
            display: none;
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
          <h1 className="pw-display hero-title">Cold pitches investors actually read.</h1>
          <p className="pw-body-lg hero-sub">
            Most outreach dies on the opening line because it could have been sent to
            anyone. PitchWire researches each investor and opens on something true and
            specific to them — a named deal, their fund, a company they backed.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="pw-btn-primary">
              Start free
            </Link>
            <a href="#how" className="pw-btn-secondary">
              See how it works
            </a>
          </div>
          <p style={{ marginTop: 20, fontSize: 14, color: tokens.colors.text.muted }}>
            10 pitches free. No card required.
          </p>
        </header>

        {/* PRODUCT MOCKUP */}
        <div className="wrap mockup-band">
          <ProductMockup />
        </div>

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
                      marginBottom: 14,
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

        {/* THE DIFFERENCE */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <p className="pw-eyebrow" style={{ marginBottom: 14 }}>
                The difference
              </p>
              <h2 className="pw-h2">Every pitch passes the portability test.</h2>
            </div>
            <div className="compare">
              <div className="pw-card">
                <p className="pw-eyebrow" style={{ marginBottom: 12 }}>
                  Generic outreach
                </p>
                <p
                  className="pw-body"
                  style={{ fontStyle: 'italic', color: tokens.colors.text.muted }}
                >
                  &ldquo;I noticed your focus on African fintech and thought you might be
                  interested in what we are building.&rdquo;
                </p>
                <p style={{ marginTop: 16, fontSize: 14, color: tokens.colors.text.muted }}>
                  Sendable to fifty investors unchanged. That is why it gets no reply.
                </p>
              </div>
              <div className="pw-card">
                <p
                  className="pw-eyebrow"
                  style={{ marginBottom: 12, color: tokens.colors.accent.secondary }}
                >
                  PitchWire
                </p>
                <p className="pw-body" style={{ fontStyle: 'italic' }}>
                  &ldquo;Your Series A in Ilara Health said diagnostics fail on
                  distribution, not on science. Clinical records fail the same way.&rdquo;
                </p>
                <p style={{ marginTop: 16, fontSize: 14, color: tokens.colors.text.secondary }}>
                  Impossible to send to anyone else. Every draft is checked for this before
                  you see it.
                </p>
              </div>
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
                  style={{ display: 'flex', flexDirection: 'column', minHeight: 400 }}
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

                  <p style={{ fontSize: 14, color: tokens.colors.text.muted, marginBottom: 20 }}>
                    {t.blurb}
                  </p>

                  <div style={{ marginBottom: 24 }}>
                    <span
                      style={{
                        fontSize: 40,
                        fontWeight: 700,
                        letterSpacing: '-0.03em',
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
                      marginBottom: 28,
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

        {/* CLOSING CTA */}
        <section className="section">
          <div className="wrap" style={{ textAlign: 'center' }}>
            <h2 className="pw-h2" style={{ marginBottom: 16 }}>
              Write the first one in two minutes.
            </h2>
            <p className="pw-body-lg" style={{ maxWidth: '48ch', margin: '0 auto 32px' }}>
              Add an investor, describe your startup once, and see what a pitch looks like
              when it could only have been sent to them.
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

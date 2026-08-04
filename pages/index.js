import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import GlobalStyles from '../components/GlobalStyles';
import tokens from '../lib/designTokens';

// ============================================================
// MOTION PRIMITIVES
// All motion is opt-out safe: every animation below is disabled under
// prefers-reduced-motion, and content renders visible by default so nothing
// depends on JS to be readable.
// ============================================================

// Reveals children on scroll. IntersectionObserver rather than scroll handlers,
// so it costs nothing on the main thread while idle.
function Reveal({ children, delay = 0, y = 22, className = '' }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSeen(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? 'translateY(0)' : 'translateY(' + y + 'px)',
        transition:
          'opacity 720ms cubic-bezier(0.16,1,0.3,1) ' + delay + 'ms, ' +
          'transform 720ms cubic-bezier(0.16,1,0.3,1) ' + delay + 'ms',
        willChange: seen ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

// Types a string character by character once scrolled into view. This is the
// centrepiece: the hero shows a generic opener being deleted and replaced by a
// researched one, which is the entire product thesis rendered as motion.
function useTypewriter(phases, active) {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setText(phases[phases.length - 1].text);
      setPhase(phases.length - 1);
      setDone(true);
      return;
    }

    let cancelled = false;
    let timer;

    async function run() {
      for (let p = 0; p < phases.length; p++) {
        if (cancelled) return;
        setPhase(p);
        const target = phases[p].text;
        const mode = phases[p].mode || 'type';

        if (mode === 'delete') {
          // Delete the previous phase's text before typing the next.
          const start = phases[p - 1] ? phases[p - 1].text : '';
          for (let i = start.length; i >= 0; i--) {
            if (cancelled) return;
            setText(start.slice(0, i));
            await new Promise((r) => { timer = setTimeout(r, 12); });
          }
          continue;
        }

        for (let i = 0; i <= target.length; i++) {
          if (cancelled) return;
          setText(target.slice(0, i));
          // Slight jitter reads as human rather than mechanical.
          const ch = target[i - 1] || '';
          const pause = ch === '.' || ch === ',' ? 90 : 18 + Math.random() * 26;
          await new Promise((r) => { timer = setTimeout(r, pause); });
        }

        if (p < phases.length - 1) {
          await new Promise((r) => { timer = setTimeout(r, phases[p].hold || 1100); });
        }
      }
      if (!cancelled) setDone(true);
    }

    run();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [active]);

  return { text: text, phase: phase, done: done };
}

// Counts up to a target when scrolled into view.
function CountUp({ to, suffix = '', duration = 1200 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(to);
      return;
    }

    let raf;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.unobserve(el);
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        // easeOutExpo
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        setVal(Math.round(eased * to));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.5 });

    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

// Marks a verified fact inside a pitch. Animates its underline in so the eye
// lands on exactly the thing that makes the pitch unsendable to anyone else.
function Anchor({ children, delay = 0 }) {
  const ref = useRef(null);
  const [lit, setLit] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLit(true);
      return;
    }
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) {
        setTimeout(() => setLit(true), delay);
        io.unobserve(el);
      }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <span ref={ref} style={{ position: 'relative', whiteSpace: 'nowrap', fontWeight: 550, color: tokens.colors.text.primary }}>
      {children}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -2,
          height: 6,
          background: tokens.colors.accent.subtle,
          borderBottom: '1.5px solid ' + tokens.colors.accent.secondary,
          transformOrigin: 'left',
          transform: lit ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 620ms cubic-bezier(0.16,1,0.3,1)',
        }}
      />
    </span>
  );
}

// ============================================================
// CONTENT
// ============================================================

const HERO_PHASES = [
  { text: 'Hi Yemi, I hope this finds you well. I came across your profile and noticed your focus on African fintech.', hold: 1500 },
  { text: '', mode: 'delete' },
  { text: 'Hi Yemi. Your Series A in Ilara Health said diagnostics fail on distribution, not on science. Clinical records fail the same way.', hold: 0 },
];

const CHECKS = [
  {
    k: '01',
    title: 'Opens on a proper noun',
    body: 'A named deal, their fund, or a company they backed. Restate their thesis instead and the draft is rejected and rewritten before it reaches you.',
  },
  {
    k: '02',
    title: 'Never puts words in their mouth',
    body: 'No invented quotes, ever. If a claim cannot be traced back to the research, it does not ship. A misattributed sentence is the fastest way to lose a reply.',
  },
  {
    k: '03',
    title: 'Finishes the thought',
    body: 'Truncated drafts, leftover [placeholders], and half-written sign-offs are caught automatically. You never send something that stops mid-sentence.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Add your investors',
    body: 'Upload a CSV or pull from the built-in database. Name, firm, email — that is the whole requirement.',
    detail: 'CSV · Database · Manual',
  },
  {
    n: '02',
    title: 'Describe your startup once',
    body: 'Drop in a deck and it is read for you, or type three sentences. Reused across every pitch from then on.',
    detail: 'PDF · DOCX · Plain text',
  },
  {
    n: '03',
    title: 'Review, then send the batch',
    body: 'Every draft arrives pre-checked. Edit any line, drop any investor, then send them all at once.',
    detail: 'Edit · Regenerate · Send',
  },
];

const FAQS = [
  {
    q: 'Where does the research come from?',
    a: 'Public information about the investor — their fund, announced deals, portfolio companies, and stated focus. If nothing verifiable turns up, the pitch says so by opening on the problem instead of faking familiarity. It will never invent a deal to fill the gap.',
  },
  {
    q: 'Will it sound like a template?',
    a: 'The opening line has to contain a proper noun specific to that investor, so by construction it cannot be sent to anyone else. If a draft fails that test it is rewritten automatically before you see it.',
  },
  {
    q: 'Can I edit before sending?',
    a: 'Every pitch is editable in place — subject and body — and you can regenerate any single one. Nothing sends until you select it and press send.',
  },
  {
    q: 'What if I only have a handful of investors?',
    a: 'The free tier covers ten pitches a month with no card. That is enough to judge the output on people you actually know.',
  },
];

const TIERS = [
  {
    name: 'Free',
    price: '0',
    blurb: 'Judge the output for yourself.',
    features: ['10 pitches per month', 'Investor database access', 'CSV import', 'Full editing'],
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
      'Deck and document upload',
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

// ============================================================
// HERO TYPEWRITER PANEL
// ============================================================

function HeroDemo() {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  const { text, phase, done } = useTypewriter(HERO_PHASES, active);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { setActive(true); io.unobserve(el); }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const isBad = phase === 0;
  const isFinal = phase === 2;

  return (
    <div ref={ref} className="demo">
      <div className="demo-chrome">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
        <span className="demo-chrome-label">
          {isBad ? 'Draft — generic' : isFinal ? 'Draft — researched' : 'Rewriting…'}
        </span>
        <span
          className="demo-verdict"
          style={{
            color: isFinal ? tokens.colors.status.success : tokens.colors.text.muted,
            borderColor: isFinal ? tokens.colors.status.successBorder : tokens.colors.border.default,
            background: isFinal ? tokens.colors.status.successBg : 'transparent',
            opacity: isBad || isFinal ? 1 : 0,
          }}
        >
          {isFinal ? 'Passes' : 'Portable'}
        </span>
      </div>

      <div className="demo-body">
        <p className="demo-text" style={{ color: isFinal ? tokens.colors.text.secondary : tokens.colors.text.muted }}>
          {/* While typing, render the raw string. Only once the phase is complete
              do we swap in the Anchor — splicing it mid-type would duplicate the
              prefix, because `text` already contains those characters. */}
          {isFinal && done ? (
            <>
              Hi Yemi. Your <Anchor delay={160}>Series A in Ilara Health</Anchor> said
              diagnostics fail on distribution, not on science. Clinical records fail the
              same way.
            </>
          ) : (
            text
          )}
          {!done && <span className="caret" aria-hidden="true" />}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// FAQ
// ============================================================

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq">
      <button className="faq-q" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{q}</span>
        <span className="faq-icon" style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>
          +
        </span>
      </button>
      <div className="faq-a" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div style={{ overflow: 'hidden' }}>
          <p>{a}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Head>
        <title>PitchWire — Your opening line is why they didn&apos;t reply</title>
        <meta
          name="description"
          content="Investors read one sentence and know whether you looked them up. PitchWire researches each investor and opens every pitch on a fact only they could receive."
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
        .wrap { max-width: 1140px; margin: 0 auto; padding: 0 28px; }
        .wrap-narrow { max-width: 760px; margin: 0 auto; padding: 0 28px; }

        /* NAV ---------------------------------------------------- */
        .nav {
          position: sticky; top: 0; z-index: 60;
          background: ${tokens.colors.bg.base};
          border-bottom: 1px solid transparent;
          transition: border-color 260ms ease, background 260ms ease;
        }
        .nav.is-scrolled {
          border-bottom-color: ${tokens.colors.border.default};
          background: rgba(245,240,232,0.86);
          backdrop-filter: saturate(1.4) blur(10px);
        }
        .nav-inner { display: flex; align-items: center; justify-content: space-between; height: 70px; }
        .nav-links { display: flex; align-items: center; gap: 34px; }
        .nav-link {
          position: relative; font-size: 15px; color: ${tokens.colors.text.secondary};
          text-decoration: none; transition: color 160ms ease;
        }
        .nav-link::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: -5px; height: 1.5px;
          background: ${tokens.colors.text.primary};
          transform: scaleX(0); transform-origin: left;
          transition: transform 320ms cubic-bezier(0.16,1,0.3,1);
        }
        .nav-link:hover { color: ${tokens.colors.text.primary}; }
        .nav-link:hover::after { transform: scaleX(1); }

        /* HERO --------------------------------------------------- */
        .hero { padding: 108px 0 40px; }
        .hero-grid {
          display: grid; grid-template-columns: 1.05fr 0.95fr;
          gap: 64px; align-items: center;
        }
        .hero h1 {
          font-size: clamp(46px, 6.6vw, 84px);
          font-weight: 700; letter-spacing: -0.043em; line-height: 0.97;
          color: ${tokens.colors.text.primary}; margin: 0 0 28px;
        }
        .hero h1 .strike {
          position: relative; display: inline-block;
          color: ${tokens.colors.text.muted};
        }
        .hero h1 .strike::after {
          content: ''; position: absolute; left: -2px; right: -2px; top: 52%; height: 4px;
          background: ${tokens.colors.accent.secondary};
          transform: scaleX(0); transform-origin: left;
          animation: strike 780ms cubic-bezier(0.16,1,0.3,1) 620ms forwards;
        }
        @keyframes strike { to { transform: scaleX(1); } }

        /* Motion opt-out. Every animated element resolves to its final state so
           the page is fully readable with no movement at all. */
        @media (prefers-reduced-motion: reduce) {
          .hero h1 .strike::after { animation: none; transform: scaleX(1); }
          .caret { animation: none; }
          .check:hover, .tier:hover { transform: none; }
          .nav-link::after { transition: none; }
        }

        .hero-sub {
          max-width: 46ch; font-size: 19px; line-height: 1.65;
          color: ${tokens.colors.text.secondary}; margin-bottom: 36px;
        }
        .hero-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .hero-note { margin-top: 20px; font-size: 14px; color: ${tokens.colors.text.muted}; }

        .cta-arrow { display: inline-block; transition: transform 240ms cubic-bezier(0.16,1,0.3,1); }
        .cta:hover .cta-arrow { transform: translateX(4px); }

        /* HERO DEMO ---------------------------------------------- */
        .demo {
          background: ${tokens.colors.bg.card};
          border: 1px solid ${tokens.colors.border.default};
          border-radius: ${tokens.radius.lg};
          box-shadow: ${tokens.shadows.lg};
          overflow: hidden;
        }
        .demo-chrome {
          display: flex; align-items: center; gap: 6px;
          padding: 13px 16px; background: ${tokens.colors.bg.surface};
          border-bottom: 1px solid ${tokens.colors.border.default};
        }
        .dot { width: 9px; height: 9px; border-radius: 50%; background: #D4CFC7; }
        .demo-chrome-label {
          margin-left: 12px; font-size: 12px; color: ${tokens.colors.text.muted};
        }
        .demo-verdict {
          margin-left: auto; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.07em;
          padding: 3px 9px; border-radius: 5px; border: 1px solid;
          transition: opacity 320ms ease, color 320ms ease, background 320ms ease, border-color 320ms ease;
        }
        .demo-body { padding: 26px; min-height: 210px; display: flex; align-items: center; }
        .demo-text {
          font-size: 16px; line-height: 1.85; margin: 0;
          transition: color 420ms ease;
        }
        .caret {
          display: inline-block; width: 2px; height: 1.05em; margin-left: 2px;
          background: ${tokens.colors.text.primary}; vertical-align: text-bottom;
          animation: blink 1s steps(2, start) infinite;
        }
        @keyframes blink { to { visibility: hidden; } }

        /* SECTIONS ----------------------------------------------- */
        .section { padding: 104px 0; border-top: 1px solid ${tokens.colors.border.default}; }
        .section-head { max-width: 46ch; margin-bottom: 56px; }
        .eyebrow-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .eyebrow-rule { height: 1px; width: 40px; background: ${tokens.colors.accent.secondary}; }

        /* STAT BAND ---------------------------------------------- */
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .stat { padding: 26px 0; }
        .stat-n {
          font-size: clamp(38px, 4.4vw, 54px); font-weight: 700;
          letter-spacing: -0.035em; line-height: 1; color: ${tokens.colors.text.primary};
        }
        .stat-l { margin-top: 10px; font-size: 14.5px; line-height: 1.6; color: ${tokens.colors.text.secondary}; }

        /* CHECKS ------------------------------------------------- */
        .checks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .check {
          background: ${tokens.colors.bg.card};
          border: 1px solid ${tokens.colors.border.default};
          border-radius: ${tokens.radius.lg};
          padding: 28px;
          transition: transform 380ms cubic-bezier(0.16,1,0.3,1), box-shadow 380ms ease, border-color 380ms ease;
        }
        .check:hover {
          transform: translateY(-4px);
          box-shadow: ${tokens.shadows.lg};
          border-color: ${tokens.colors.border.hover};
        }
        .check-k {
          font-size: 12px; font-weight: 600; letter-spacing: 0.09em;
          color: ${tokens.colors.accent.secondary}; margin-bottom: 18px;
        }

        /* STEPS -------------------------------------------------- */
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 44px; }
        .step-n {
          font-size: 13px; font-weight: 600; letter-spacing: 0.05em;
          color: ${tokens.colors.accent.secondary}; margin-bottom: 14px;
        }
        .step-detail {
          margin-top: 16px; padding-top: 14px;
          border-top: 1px solid ${tokens.colors.border.default};
          font-size: 13px; color: ${tokens.colors.text.muted}; letter-spacing: 0.01em;
        }

        /* FAQ ---------------------------------------------------- */
        .faq { border-bottom: 1px solid ${tokens.colors.border.default}; }
        .faq-q {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          gap: 20px; padding: 24px 0; background: none; border: none; cursor: pointer;
          font-family: inherit; font-size: 17px; font-weight: 550; text-align: left;
          color: ${tokens.colors.text.primary}; transition: color 160ms ease;
        }
        .faq-q:hover { color: ${tokens.colors.accent.secondary}; }
        .faq-icon {
          flex-shrink: 0; font-size: 20px; font-weight: 400; line-height: 1;
          color: ${tokens.colors.text.muted};
          transition: transform 340ms cubic-bezier(0.16,1,0.3,1);
        }
        .faq-a {
          display: grid; grid-template-rows: 0fr;
          transition: grid-template-rows 380ms cubic-bezier(0.16,1,0.3,1);
        }
        .faq-a p {
          font-size: 15.5px; line-height: 1.75; color: ${tokens.colors.text.secondary};
          padding-bottom: 24px; max-width: 68ch; margin: 0;
        }

        /* PRICING ------------------------------------------------ */
        .tiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: start; }
        .tier {
          background: ${tokens.colors.bg.card};
          border: 1px solid ${tokens.colors.border.default};
          border-radius: ${tokens.radius.lg};
          padding: 30px; display: flex; flex-direction: column; min-height: 440px;
          transition: transform 380ms cubic-bezier(0.16,1,0.3,1), box-shadow 380ms ease;
        }
        .tier:hover { transform: translateY(-4px); box-shadow: ${tokens.shadows.lg}; }
        .tier.featured { border-color: ${tokens.colors.text.primary}; box-shadow: ${tokens.shadows.md}; }

        /* CLOSER ------------------------------------------------- */
        .closer { text-align: center; }
        .closer h2 {
          font-size: clamp(32px, 5vw, 54px); font-weight: 700;
          letter-spacing: -0.036em; line-height: 1.08;
          color: ${tokens.colors.text.primary}; margin: 0 auto 20px; max-width: 22ch;
        }

        /* FOOTER ------------------------------------------------- */
        .footer {
          border-top: 1px solid ${tokens.colors.border.default}; padding: 44px 0;
          display: flex; justify-content: space-between; align-items: center;
          gap: 16px; flex-wrap: wrap;
        }
        .footer-links { display: flex; gap: 28px; }

        @media (max-width: 940px) {
          .hero-grid { grid-template-columns: 1fr; gap: 44px; }
          .hero { padding: 68px 0 24px; }
          .stats, .checks, .steps, .tiers { grid-template-columns: 1fr; gap: 22px; }
          .steps { gap: 34px; }
          .section { padding: 68px 0; }
          .nav-links { display: none; }
          .demo-body { min-height: 240px; }
        }
      `}</style>

      <div style={{ background: tokens.colors.bg.base, minHeight: '100vh' }}>
        {/* NAV */}
        <nav className={'nav' + (scrolled ? ' is-scrolled' : '')}>
          <div className="wrap nav-inner">
            <span style={{ fontSize: 17, fontWeight: 600, color: tokens.colors.text.primary, letterSpacing: '-0.02em' }}>
              PitchWire
            </span>
            <div className="nav-links">
              <a href="#checks" className="nav-link">What it checks</a>
              <a href="#how" className="nav-link">How it works</a>
              <a href="#faq" className="nav-link">FAQ</a>
              <a href="#pricing" className="nav-link">Pricing</a>
              <Link href="/login" className="nav-link">Sign in</Link>
            </div>
            <Link href="/login" className="pw-btn-primary cta" style={{ padding: '9px 18px', minHeight: 40 }}>
              Get started <span className="cta-arrow">→</span>
            </Link>
          </div>
        </nav>

        {/* HERO */}
        <header className="wrap hero">
          <div className="hero-grid">
            <Reveal y={26}>
              <h1>
                Your opening line is <span className="strike">why they didn&apos;t reply</span>.
              </h1>
              <p className="hero-sub">
                An investor reads one sentence and knows whether you looked them up.
                PitchWire researches each one, then opens on something only they could
                have received.
              </p>
              <div className="hero-actions">
                <Link href="/login" className="pw-btn-primary cta">
                  Start free <span className="cta-arrow">→</span>
                </Link>
                <a href="#checks" className="pw-btn-secondary">See what it checks</a>
              </div>
              <p className="hero-note">10 pitches free. No card. No trial timer.</p>
            </Reveal>

            <Reveal delay={140} y={26}>
              <HeroDemo />
            </Reveal>
          </div>
        </header>

        {/* STAT BAND */}
        <section className="wrap" style={{ paddingTop: 72, paddingBottom: 96 }}>
          <Reveal>
            <div className="stats">
              <div className="stat">
                <div className="stat-n"><CountUp to={3} /> checks</div>
                <div className="stat-l">
                  run on every draft before you see it. A pitch that fails is rewritten,
                  not shipped.
                </div>
              </div>
              <div className="stat">
                <div className="stat-n"><CountUp to={0} /> invented quotes</div>
                <div className="stat-l">
                  Nothing is attributed to an investor unless it traces back to the
                  research.
                </div>
              </div>
              <div className="stat">
                <div className="stat-n"><CountUp to={1} /> opening rule</div>
                <div className="stat-l">
                  Line one must name something only this investor could recognise.
                  Everything else follows from it.
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* CHECKS */}
        <section id="checks" className="section">
          <div className="wrap">
            <Reveal>
              <div className="section-head">
                <div className="eyebrow-row">
                  <span className="eyebrow-rule" />
                  <span className="pw-eyebrow">Before you see it</span>
                </div>
                <h2 className="pw-h2">Three checks, run on every single draft.</h2>
              </div>
            </Reveal>
            <div className="checks">
              {CHECKS.map((c, i) => (
                <Reveal key={c.k} delay={i * 110}>
                  <div className="check">
                    <div className="check-k">{c.k}</div>
                    <h3 style={{ fontSize: 17, fontWeight: 600, color: tokens.colors.text.primary, marginBottom: 12, lineHeight: 1.4 }}>
                      {c.title}
                    </h3>
                    <p style={{ fontSize: 14.5, lineHeight: 1.75, color: tokens.colors.text.secondary, margin: 0 }}>
                      {c.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="section">
          <div className="wrap">
            <Reveal>
              <div className="section-head">
                <div className="eyebrow-row">
                  <span className="eyebrow-rule" />
                  <span className="pw-eyebrow">How it works</span>
                </div>
                <h2 className="pw-h2">Set it up once. Then it is three clicks.</h2>
              </div>
            </Reveal>
            <div className="steps">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 110}>
                  <div>
                    <div className="step-n">{s.n}</div>
                    <h3 className="pw-h3" style={{ marginBottom: 10 }}>{s.title}</h3>
                    <p className="pw-body" style={{ margin: 0 }}>{s.body}</p>
                    <div className="step-detail">{s.detail}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="section">
          <div className="wrap-narrow">
            <Reveal>
              <div className="section-head">
                <div className="eyebrow-row">
                  <span className="eyebrow-rule" />
                  <span className="pw-eyebrow">Questions</span>
                </div>
                <h2 className="pw-h2">The things founders ask first.</h2>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div>
                {FAQS.map((f) => <Faq key={f.q} q={f.q} a={f.a} />)}
              </div>
            </Reveal>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="section">
          <div className="wrap">
            <Reveal>
              <div className="section-head">
                <div className="eyebrow-row">
                  <span className="eyebrow-rule" />
                  <span className="pw-eyebrow">Pricing</span>
                </div>
                <h2 className="pw-h2">Start free. Pay when you are actually raising.</h2>
              </div>
            </Reveal>
            <div className="tiers">
              {TIERS.map((t, i) => (
                <Reveal key={t.name} delay={i * 100}>
                  <div className={'tier' + (t.featured ? ' featured' : '')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: tokens.colors.text.primary }}>
                        {t.name}
                      </span>
                      {t.featured && <span className="pw-tag-accent">Most popular</span>}
                    </div>
                    <p style={{ fontSize: 14, color: tokens.colors.text.muted, marginBottom: 22 }}>{t.blurb}</p>
                    <div style={{ marginBottom: 26 }}>
                      <span style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.035em', color: tokens.colors.text.primary }}>
                        ${t.price}
                      </span>
                      <span style={{ fontSize: 15, color: tokens.colors.text.muted }}> /month</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 30 }}>
                      {t.features.map((f) => (
                        <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                            stroke={tokens.colors.accent.secondary} strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round"
                            style={{ flexShrink: 0, marginTop: 5 }}>
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span style={{ fontSize: 14, color: tokens.colors.text.secondary, lineHeight: 1.6 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Link href={t.href} className={t.featured ? 'pw-btn-primary' : 'pw-btn-secondary'}
                      style={{ marginTop: 'auto', width: '100%' }}>
                      {t.cta}
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CLOSER */}
        <section className="section">
          <div className="wrap-narrow closer">
            <Reveal>
              <h2>Write one. You will know in ten seconds.</h2>
              <p className="pw-body-lg" style={{ maxWidth: '46ch', margin: '0 auto 34px' }}>
                Add a single investor and read the first line it gives you. If it could
                have gone to anybody else, close the tab and keep your ten free pitches.
              </p>
              <Link href="/login" className="pw-btn-primary cta">
                Start free <span className="cta-arrow">→</span>
              </Link>
            </Reveal>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="wrap footer">
          <span style={{ fontSize: 14, color: tokens.colors.text.muted }}>
            &copy; {new Date().getFullYear()} PitchWire
          </span>
          <div className="footer-links">
            <a href="#checks" className="pw-link-muted" style={{ fontSize: 14 }}>What it checks</a>
            <a href="#how" className="pw-link-muted" style={{ fontSize: 14 }}>How it works</a>
            <a href="#faq" className="pw-link-muted" style={{ fontSize: 14 }}>FAQ</a>
            <a href="#pricing" className="pw-link-muted" style={{ fontSize: 14 }}>Pricing</a>
            <Link href="/login" className="pw-link-muted" style={{ fontSize: 14 }}>Sign in</Link>
          </div>
        </footer>
      </div>
    </>
  );
}

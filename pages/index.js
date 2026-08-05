import Head from 'next/head';
import Link from 'next/link';
import { Fragment, useEffect, useRef, useState } from 'react';
import GlobalStyles from '../components/GlobalStyles';
import tokens from '../lib/designTokens';

// ============================================================================
// PITCHWIRE — LANDING
//
// One argument, told once: investors can spot a generic pitch instantly, and
// PitchWire is the thing that stops yours from being one. Every section either
// proves that claim or removes a reason not to sign up.
//
// Constraints held throughout:
//   - No animation libraries, no image files. CSS and inline SVG only.
//   - Design tokens flow from lib/designTokens.js into CSS custom properties,
//     so the palette still has exactly one source of truth.
//   - Every effect cleans up. Every animation has a reduced-motion answer.
// ============================================================================

const C = tokens.colors;

// ----------------------------------------------------------------------------
// CONTENT
// ----------------------------------------------------------------------------

// The hero cycles three real-shaped pitches. Each opens on a proper noun that
// only that investor could receive — which is the entire product claim, shown
// rather than asserted.
const PITCHES = [
  {
    firm: 'TLcom Capital',
    to: 'm.caio@tlcomcapital.com',
    subject: 'TIDE Africa Fund II and a $300 problem worth fixing',
    body:
      'Closing $154M in TIDE Africa Fund II while most funds pulled back signals real conviction in African ' +
      'infrastructure. Right now in Lagos, a diabetes patient moving between clinics loses her entire diagnostic ' +
      'history because her paper file disappeared — forcing $300 in redundant tests her family cannot afford. ' +
      'We built ForcepX to end this. Blockchain-anchored records, patient-controlled permissions, cross-system ' +
      'compliant. Three hospital design partners already live. 15 minutes this Thursday?',
  },
  {
    firm: 'Novastar Ventures',
    to: 'partner@novastar.vc',
    subject: 'Novastar’s Ilara Health bet and what comes next',
    body:
      'Your Series A in Ilara Health shows you understand that African healthcare runs on broken data rails. ' +
      'Ilara solves the device layer. We are solving the trust layer underneath it. ForcepX gives patients ' +
      'cryptographic control over their health records — verifiable, portable, tamper-evident. Pilots underway ' +
      'with three Lagos teaching hospitals. The infrastructure Ilara needs to scale already exists in our stack. ' +
      '15 minutes Thursday to show you how they connect?',
  },
  {
    firm: 'Ventures Platform',
    to: 'hello@venturesplatform.com',
    subject: 'Ventures Platform thesis and healthcare data',
    body:
      'You back founders solving Nigeria’s infrastructure gaps from the ground up — SeamlessHR for HR, ' +
      'Brass for banking. We are doing the same for healthcare data. Nigerian patients lose medical records ' +
      'every time they switch hospitals. ForcepX makes those records patient-owned and cross-system readable. ' +
      'Pre-seed, two hospital pilots signed, raising $500K. 15 minutes this week?',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Drop in your deck',
    body:
      'Upload the deck you already have, or type three sentences about what you are building. ' +
      'It is read once and reused across every pitch you ever send.',
    visual: 'upload',
  },
  {
    n: '02',
    title: 'We research the investor',
    body:
      'Their fund, announced deals, portfolio, stated thesis, check size, and public quotes — ' +
      'pulled together into the handful of facts worth opening on.',
    visual: 'research',
  },
  {
    n: '03',
    title: 'Read it, then send it',
    body:
      'Every draft opens on something only that investor would recognise. Edit any line, ' +
      'drop any name, send the batch when it reads right.',
    visual: 'email',
  },
];

const RESEARCH = [
  { icon: 'briefcase', label: 'Recent deals and portfolio companies', line: 'What they have actually written cheques for this year.' },
  { icon: 'target', label: 'Stated investment thesis', line: 'In their words, from their site, memos, and fund announcements.' },
  { icon: 'coin', label: 'Typical check size and stage', line: 'So you never pitch a Series B fund on a pre-seed round.' },
  { icon: 'globe', label: 'Geography and sector focus', line: 'Lagos, Nairobi, Cairo, Accra — and what they avoid.' },
  { icon: 'quote', label: 'Public quotes and interviews', line: 'Never invented. Only what is traceable to a real source.' },
  { icon: 'network', label: 'Co-investors and warm intro paths', line: 'Who they syndicate with, and who already knows you.' },
];

const TIERS = [
  {
    name: 'Free',
    price: 0,
    annualPrice: 0,
    blurb: 'Judge the output for yourself.',
    features: ['10 pitches per month', 'Investor database access', 'CSV import', 'Full editing control'],
    cta: 'Start free',
    href: '/login',
    featured: false,
  },
  {
    name: 'Starter',
    price: 29,
    annualPrice: 276,
    blurb: 'Run a real raise.',
    features: ['100 pitches per month', 'Deck and document upload', 'Investor fit scoring', 'Campaign tracking', 'Email support'],
    cta: 'Choose Starter',
    href: '/login?plan=starter',
    featured: true,
  },
  {
    name: 'Pro',
    price: 79,
    annualPrice: 758,
    blurb: 'For a full fundraising cycle.',
    features: ['500 pitches per month', 'Deep investor research', 'Full CRM pipeline', 'Follow-up suggestions', 'Priority support'],
    cta: 'Choose Pro',
    href: '/login?plan=pro',
    featured: false,
  },
];

// Social card, generated rather than shipped as a binary. Crawlers that refuse
// data URIs simply fall back to the title and description.
const OG_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">',
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
  '<stop offset="0%" stop-color="#F7F3EC"/><stop offset="55%" stop-color="#EDE8DE"/>',
  '<stop offset="100%" stop-color="#DED6C7"/></linearGradient>',
  '<linearGradient id="h" x1="0" y1="0" x2="1" y2="0">',
  '<stop offset="0%" stop-color="#8B7355" stop-opacity="0.35"/>',
  '<stop offset="100%" stop-color="#8B7355" stop-opacity="0"/></linearGradient></defs>',
  '<rect width="1200" height="630" fill="url(#g)"/>',
  '<rect x="0" y="0" width="1200" height="6" fill="#1A1A1A"/>',
  '<rect x="88" y="214" width="420" height="2" fill="url(#h)"/>',
  '<text x="88" y="120" font-family="Inter,Helvetica,Arial,sans-serif" font-size="26" font-weight="700" letter-spacing="6" fill="#75604A">PITCHWIRE</text>',
  '<text x="88" y="300" font-family="Inter,Helvetica,Arial,sans-serif" font-size="76" font-weight="400" fill="#5C5248">Investors can tell a</text>',
  '<text x="88" y="386" font-family="Inter,Helvetica,Arial,sans-serif" font-size="76" font-weight="400" fill="#5C5248">generic pitch in</text>',
  '<text x="88" y="480" font-family="Inter,Helvetica,Arial,sans-serif" font-size="88" font-weight="800" fill="#1A1A1A">3 seconds.</text>',
  '<text x="88" y="556" font-family="Inter,Helvetica,Arial,sans-serif" font-size="27" font-weight="500" fill="#75604A">Investor pitch intelligence for founders</text>',
  '</svg>',
].join('');

const OG_IMAGE = 'data:image/svg+xml,' + encodeURIComponent(OG_SVG);

// ----------------------------------------------------------------------------
// MOTION PRIMITIVES
// ----------------------------------------------------------------------------

// Single source of truth for the motion opt-out. Listens for live changes so a
// user toggling the OS setting mid-session gets the right behaviour without a
// reload.
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  return reduced;
}

// One observer per revealed element, disconnected the moment it has fired.
// Threshold 0.12 across the page so reveals trigger at a consistent depth.
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // No IntersectionObserver (very old browsers, some test runners): show it.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setInView(true);
          io.unobserve(entry.target);
        });
      },
      { threshold: threshold, rootMargin: '0px 0px -6% 0px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, inView];
}

// Fades and lifts a block into place on scroll. `y` is exposed as a custom
// property so the mobile breakpoint can shorten every travel distance at once.
// `immediate` opts a block out of scroll gating and plays its entrance on mount.
// Used for the hero, which is above the fold by definition — and where a
// below-the-fold observer would otherwise hold the compose card at opacity 0
// while its typewriter ran unseen.
function Reveal({ children, delay = 0, y = 24, className = '', style, immediate = false }) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!immediate) return undefined;
    // rAF, not a 0ms timeout: guarantees the pre-transition frame is painted so
    // the entrance actually animates instead of snapping to its end state.
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [immediate]);

  const shown = reduced || (immediate ? mounted : inView);

  return (
    <div
      ref={immediate ? undefined : ref}
      className={'lp-reveal' + (shown ? ' is-in' : '') + (className ? ' ' + className : '')}
      style={Object.assign({ '--ry': y + 'px', '--rd': delay + 'ms' }, style)}
    >
      {children}
    </div>
  );
}

// Reveals a sentence one word at a time. Used only where the sentence *is* the
// content — the hero headline and the tension statement — so the stagger reads
// as emphasis rather than decoration.
function WordReveal({ text, stagger = 70, delay = 0, className = '', threshold = 0.12 }) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView(threshold);
  const shown = reduced || inView;
  const words = text.split(' ');

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <Fragment key={word + i}>
          <span
            className={'lp-word' + (shown ? ' is-in' : '')}
            style={{ transitionDelay: (delay + i * stagger) + 'ms' }}
          >
            {word}
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>
  );
}

// ----------------------------------------------------------------------------
// CUSTOM CURSOR
// Fine pointers only, and never when reduced motion is requested — replacing
// the system cursor is exactly the kind of movement that setting opts out of.
// ----------------------------------------------------------------------------

function CustomCursor() {
  const dotRef = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [big, setBig] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    setEnabled(true);
    document.body.classList.add('lp-cursor-on');

    let raf = 0;
    let x = -100;
    let y = -100;

    // Position is written straight to the node inside rAF. Routing it through
    // React state would re-render the page on every mousemove.
    const paint = () => {
      raf = 0;
      const el = dotRef.current;
      if (el) el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
    };

    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      setVisible(true);
      if (!raf) raf = requestAnimationFrame(paint);
    };

    const onOver = (e) => {
      const t = e.target;
      setBig(Boolean(t && t.closest && t.closest('a, button, input, summary, [data-cursor]')));
    };

    const onOut = (e) => {
      if (!e.relatedTarget && !e.toElement) setVisible(false);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseout', onOut, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      if (raf) cancelAnimationFrame(raf);
      document.body.classList.remove('lp-cursor-on');
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      className={'lp-cursor' + (big ? ' is-big' : '') + (visible ? ' is-visible' : '')}
    />
  );
}

// ----------------------------------------------------------------------------
// LOGO
// Mark plus wordmark. If the image 404s or is blocked, the <img> is removed and
// the wordmark alone carries the brand — so the nav never renders a broken-image
// glyph next to it.
// ----------------------------------------------------------------------------

function Logo() {
  const [failed, setFailed] = useState(false);

  return (
    <Link href="/" className="lp-logo" aria-label="PitchWire home">
      {failed ? null : (
        <img
          src="/logo.png"
          alt=""
          width={30}
          height={30}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      <span>PitchWire</span>
    </Link>
  );
}

// ----------------------------------------------------------------------------
// ICONS — all inline, all stroke-based, all inherit currentColor.
// ----------------------------------------------------------------------------

function Icon({ name }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  if (name === 'briefcase') {
    return (
      <svg {...common}>
        <rect x="2.5" y="6.5" width="15" height="11" rx="2" />
        <path d="M7 6.5V5A1.5 1.5 0 0 1 8.5 3.5h3A1.5 1.5 0 0 1 13 5v1.5" />
        <path d="M2.5 11h15" />
      </svg>
    );
  }
  if (name === 'target') {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="7" />
        <circle cx="10" cy="10" r="3.2" />
        <circle cx="10" cy="10" r="0.7" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === 'coin') {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="7" />
        <path d="M10 5.8v8.4" />
        <path d="M12.1 8c0-.85-.94-1.5-2.1-1.5s-2.1.65-2.1 1.5.94 1.5 2.1 1.5 2.1.65 2.1 1.5-.94 1.5-2.1 1.5-2.1-.65-2.1-1.5" />
      </svg>
    );
  }
  if (name === 'globe') {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="7" />
        <path d="M3 10h14" />
        <path d="M10 3c1.9 2 2.9 4.4 2.9 7s-1 5-2.9 7c-1.9-2-2.9-4.4-2.9-7s1-5 2.9-7z" />
      </svg>
    );
  }
  if (name === 'quote') {
    return (
      <svg {...common}>
        <path d="M17 12.4a2 2 0 0 1-2 2H7.4L3.5 17.2V5.6a2 2 0 0 1 2-2H15a2 2 0 0 1 2 2z" />
        <path d="M6.8 8.1h6.4" />
        <path d="M6.8 11.1h4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="5" cy="5.8" r="2" />
      <circle cx="15" cy="5.8" r="2" />
      <circle cx="10" cy="15" r="2" />
      <path d="M6.5 7.3 9 13M13.5 7.3 11 13M7 5.8h6" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// HERO — EMAIL COMPOSE WINDOW
// ----------------------------------------------------------------------------

// Types the current pitch, holds, fades, advances. One timer chain, one cancel
// flag, cleared on every re-run and on unmount — so a fast unmount can never
// leave a setState firing against a dead component.
function useTypewriterCycle(pitches, reduced) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(true);
  const [visible, setVisible] = useState(true);

  // Gates the first keystroke to 500ms after mount, and nothing else. Not tied
  // to scroll position: the card is the hero's proof, so it must be mid-type by
  // the time anyone looks at it, on every viewport. An IntersectionObserver here
  // meant a desktop viewport that placed the card below the fold never started
  // it at all.
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!started) return undefined;

    const body = pitches[index].body;

    // Reduced motion: the finished pitch, immediately, no cycling. The point of
    // the card is the copy, and the copy is fully intact without the motion.
    if (reduced) {
      setText(body);
      setTyping(false);
      setVisible(true);
      return undefined;
    }

    let cancelled = false;
    let timer = 0;
    let i = 0;

    setText('');
    setTyping(true);
    setVisible(true);

    const step = () => {
      if (cancelled) return;
      i += 1;
      setText(body.slice(0, i));

      if (i < body.length) {
        timer = setTimeout(step, 18);
        return;
      }

      setTyping(false);
      timer = setTimeout(() => {
        if (cancelled) return;
        setVisible(false);
        timer = setTimeout(() => {
          if (cancelled) return;
          setIndex((n) => (n + 1) % pitches.length);
        }, 400);
      }, 2500);
    };

    // The first keystroke is already delayed by the mount gate above, so this
    // only spaces out the transition between pitches on subsequent cycles.
    timer = setTimeout(step, index === 0 ? 0 : 420);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [index, started, reduced, pitches]);

  return { index: index, text: text, typing: typing, visible: visible };
}

function ComposeWindow() {
  const reduced = useReducedMotion();
  const { index, text, typing, visible } = useTypewriterCycle(PITCHES, reduced);
  const pitch = PITCHES[index];

  return (
    <div className="lp-compose-outer">
      <div className="lp-compose-float">
        <div className="lp-compose">
          <div className="lp-compose-bar">
            <span className="lp-dot" />
            <span className="lp-dot" />
            <span className="lp-dot" />
            <span className="lp-compose-title">New message</span>
            <span className="lp-compose-firm">{pitch.firm}</span>
          </div>

          <div className={'lp-compose-fields' + (visible ? '' : ' is-out')}>
            <div className="lp-field">
              <span className="lp-field-k">To</span>
              <span className="lp-field-v lp-field-mono">{pitch.to}</span>
            </div>
            <div className="lp-field">
              <span className="lp-field-k">Subject</span>
              <span className="lp-field-v lp-field-strong">{pitch.subject}</span>
            </div>
          </div>

          <div className={'lp-compose-body' + (visible ? '' : ' is-out')}>
            <p className="lp-compose-text">
              {text}
              {typing ? <span className="lp-caret" aria-hidden="true" /> : null}
            </p>
          </div>

          <div className="lp-compose-foot">
            <span className="lp-send">Send</span>
            <span className="lp-compose-meta">
              {PITCHES.map((p, i) => (
                <span key={p.firm} className={'lp-tick' + (i === index ? ' is-on' : '')} aria-hidden="true" />
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// STEP VISUALS — small, honest mockups of the three real screens.
// ----------------------------------------------------------------------------

function StepVisual({ kind }) {
  if (kind === 'upload') {
    return (
      <div className="lp-mock" aria-hidden="true">
        <div className="lp-mock-drop">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2.5H7A1.5 1.5 0 0 0 5.5 4v16A1.5 1.5 0 0 0 7 21.5h10a1.5 1.5 0 0 0 1.5-1.5V7z" />
            <path d="M14 2.5V7h4.5" />
            <path d="M12 17v-6M9.6 13.2 12 10.8l2.4 2.4" />
          </svg>
          <span className="lp-mock-drop-t">Drop your deck</span>
          <span className="lp-mock-drop-s">PDF, DOCX, or plain text</span>
        </div>
        <div className="lp-mock-file">
          <span className="lp-mock-file-n">forcepx-seed-deck.pdf</span>
          <span className="lp-mock-file-s">2.4 MB</span>
        </div>
        <div className="lp-mock-bar"><span className="lp-mock-bar-f" /></div>
      </div>
    );
  }

  if (kind === 'research') {
    return (
      <div className="lp-mock" aria-hidden="true">
        <div className="lp-mock-head">
          <span className="lp-mock-avatar">TL</span>
          <span>
            <span className="lp-mock-head-t">TLcom Capital</span>
            <span className="lp-mock-head-s">Lagos · Nairobi · London</span>
          </span>
        </div>
        <div className="lp-mock-rows">
          <div className="lp-mock-row"><span>Thesis</span><span>Tech for Africa, Series A</span></div>
          <div className="lp-mock-row"><span>Fund</span><span>TIDE Africa II · $154M</span></div>
          <div className="lp-mock-row"><span>Portfolio</span><span>Ilara, Andela, uLesson</span></div>
          <div className="lp-mock-row"><span>Check</span><span>$1M – $10M</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="lp-mock" aria-hidden="true">
      <div className="lp-mock-mail">
        <span className="lp-mock-mail-to">m.caio@tlcomcapital.com</span>
        <span className="lp-mock-mail-sub">TIDE Africa Fund II and the $300 problem</span>
        <span className="lp-mock-line" style={{ width: '96%' }} />
        <span className="lp-mock-line" style={{ width: '88%' }} />
        <span className="lp-mock-line" style={{ width: '92%' }} />
        <span className="lp-mock-line" style={{ width: '54%' }} />
      </div>
      <div className="lp-mock-sent">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Ready to send
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// PAGE
// ----------------------------------------------------------------------------

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [annual, setAnnual] = useState(false);

  // Nav state flips at 40px. Coalesced into rAF so a fast scroll cannot queue
  // more state updates than the browser can paint.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrolled(window.scrollY > 40);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // The mobile menu covers the viewport, so the page behind it must not scroll.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const [diffRef, diffIn] = useInView();
  const reduced = useReducedMotion();
  const diffShown = reduced || diffIn;

  return (
    <>
      <Head>
        <title>PitchWire — Investors can tell a generic pitch in 3 seconds</title>
        <meta
          name="description"
          content="PitchWire researches every investor and writes emails that open with something only they would recognise. Built for founders raising pre-seed and seed rounds globally."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#F5F0E8" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pitchwire.app/" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PitchWire" />
        <meta property="og:title" content="Investors can tell a generic pitch in 3 seconds" />
        <meta
          property="og:description"
          content="PitchWire researches every investor and writes emails that open with something only they would recognise. Built for founders raising pre-seed and seed rounds globally."
        />
        <meta property="og:url" content="https://pitchwire.app/" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="PitchWire — investor pitch intelligence for founders" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Investors can tell a generic pitch in 3 seconds" />
        <meta
          name="twitter:description"
          content="Researched investor emails that open on something only they would recognise. For founders raising pre-seed and seed rounds globally."
        />
        <meta name="twitter:image" content={OG_IMAGE} />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <GlobalStyles />

      {/* Without JS there are no observers, so nothing would ever be revealed.
          Force every animated element to its resting state instead. */}
      <noscript>
        <style>{`
          .lp-reveal, .lp-word, .lp-diff-card { opacity: 1 !important; transform: none !important; }
          .lp-compose-body .lp-compose-text::after { content: none; }
        `}</style>
      </noscript>

      <style jsx global>{`
        /* ==========================================================
           TOKENS
           Interpolated from lib/designTokens.js so the palette keeps
           exactly one source of truth.
           ========================================================== */
        .lp-root {
          --cream: ${C.bg.base};
          --cream-deep: ${C.bg.surface};
          --cream-hover: ${C.bg.hover};
          --white: ${C.bg.card};
          --ink: ${C.accent.primary};
          --ink-soft: ${C.accent.hover};
          --brown: ${C.accent.secondary};
          --brown-text: ${C.accent.secondaryHover};
          --brown-wash: ${C.accent.subtle};
          --brown-line: ${C.accent.subtleBorder};
          --text-1: ${C.text.primary};
          --text-2: ${C.text.secondary};
          --text-3: ${C.text.muted};
          --on-dark: ${C.text.onDark};
          --line: ${C.border.default};
          --line-strong: ${C.border.hover};
          --ok: ${C.status.success};
          --ok-bg: ${C.status.successBg};
          --ok-line: ${C.status.successBorder};
          --bad: ${C.status.error};
          --bad-bg: ${C.status.errorBg};
          --bad-line: ${C.status.errorBorder};

          --r-sm: ${tokens.radius.sm};
          --r-md: ${tokens.radius.md};
          --r-lg: ${tokens.radius.lg};
          --r-xl: ${tokens.radius.xl};
          --r-full: ${tokens.radius.full};

          --sh-sm: ${tokens.shadows.sm};
          --sh-md: ${tokens.shadows.md};
          --sh-lg: ${tokens.shadows.lg};
          --sh-xl: ${tokens.shadows.xl};

          --font: ${tokens.typography.fontFamily};
          --ease: cubic-bezier(0.16, 1, 0.3, 1);
          --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);

          --shell: 1180px;
          --gutter: 32px;
          --section: 132px;

          --t-hero: 88px;
          --t-section: 52px;
          --t-body: 17px;

          background: var(--cream);
          color: var(--text-1);
          font-family: var(--font);
          -webkit-font-smoothing: antialiased;
          /* Belt and braces against a stray wide child on small screens: nothing
             in the layout should exceed the viewport, but if it ever does the page
             must not become horizontally scrollable. */
          overflow-x: hidden;
          max-width: 100vw;
        }

        .lp-root ::selection {
          background: var(--brown-wash);
          color: var(--text-1);
        }

        .lp-shell {
          max-width: var(--shell);
          margin: 0 auto;
          padding: 0 var(--gutter);
          width: 100%;
        }

        .lp-section { padding: var(--section) 0; }

        /* In-page anchors must clear the fixed nav, or the section title lands
           underneath it. Smooth scrolling is opted out of below with the rest
           of the motion. */
        html:has(.lp-root) { scroll-behavior: smooth; }
        #how, #difference, #research, #pricing { scroll-margin-top: 100px; }

        /* ==========================================================
           MOTION PRIMITIVES
           ========================================================== */
        .lp-reveal {
          opacity: 0;
          transform: translateY(var(--ry, 24px));
          transition:
            opacity 600ms var(--ease-out) var(--rd, 0ms),
            transform 600ms var(--ease-out) var(--rd, 0ms);
          will-change: opacity, transform;
        }
        .lp-reveal.is-in {
          opacity: 1;
          transform: none;
          will-change: auto;
        }

        .lp-word {
          display: inline-block;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 560ms var(--ease-out), transform 560ms var(--ease-out);
        }
        .lp-word.is-in { opacity: 1; transform: none; }

        /* ==========================================================
           CUSTOM CURSOR
           White under difference blending, so it renders near-black on
           cream and near-cream on the dark section — which is the
           inversion the design calls for.
           ========================================================== */
        body.lp-cursor-on,
        body.lp-cursor-on * { cursor: none !important; }

        .lp-cursor {
          position: fixed;
          top: 0;
          left: 0;
          width: 8px;
          height: 8px;
          border-radius: var(--r-full);
          background: #FFFFFF;
          mix-blend-mode: difference;
          pointer-events: none;
          z-index: 999;
          opacity: 0;
          transition: width 150ms var(--ease-out), height 150ms var(--ease-out), opacity 150ms linear;
        }
        .lp-cursor.is-visible { opacity: 1; }
        .lp-cursor.is-big { width: 20px; height: 20px; }

        /* ==========================================================
           NAV
           ========================================================== */
        .lp-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 200;
          background: transparent;
          border-bottom: 1px solid transparent;
          transition: background 200ms ease, border-color 200ms ease, backdrop-filter 200ms ease;
        }
        .lp-nav.is-scrolled {
          background: rgba(245, 240, 232, 0.82);
          border-bottom-color: var(--line);
          -webkit-backdrop-filter: blur(12px) saturate(1.4);
          backdrop-filter: blur(12px) saturate(1.4);
        }
        .lp-nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 76px;
        }
        .lp-logo {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.035em;
          color: var(--text-1);
          text-decoration: none;
        }
        /* logo.png is a centred mark on an opaque white square (no alpha
           channel), which would otherwise read as a white card floating on the
           cream. Multiply drops pure white into the background so only the mark
           survives. */
        .lp-logo img {
          width: 30px;
          height: 30px;
          object-fit: contain;
          mix-blend-mode: multiply;
        }
        .lp-nav-mid {
          display: flex;
          align-items: center;
          gap: 36px;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }
        .lp-nav-a {
          position: relative;
          font-size: 15px;
          font-weight: 500;
          color: var(--text-2);
          text-decoration: none;
          transition: color 160ms ease;
        }
        .lp-nav-a::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -6px;
          height: 1.5px;
          background: var(--text-1);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 320ms var(--ease);
        }
        .lp-nav-a:hover { color: var(--text-1); }
        .lp-nav-a:hover::after { transform: scaleX(1); }

        .lp-nav-right { display: flex; align-items: center; gap: 10px; }

        .lp-ghost {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-2);
          text-decoration: none;
          padding: 12px 14px;
          border-radius: var(--r-full);
          transition: color 160ms ease, background 160ms ease;
        }
        .lp-ghost:hover { color: var(--text-1); background: var(--cream-hover); }

        .lp-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--ink);
          color: var(--white);
          border: 1px solid var(--ink);
          border-radius: var(--r-full);
          padding: 11px 22px;
          font-family: var(--font);
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.01em;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
          transition: background 180ms ease, border-color 180ms ease, transform 260ms var(--ease);
        }
        .lp-pill:hover { background: var(--ink-soft); border-color: var(--ink-soft); }
        .lp-pill.is-lg { padding: 16px 30px; font-size: 16.5px; }
        .lp-arrow { display: inline-block; transition: transform 260ms var(--ease); }
        .lp-pill:hover .lp-arrow, .lp-textlink:hover .lp-arrow { transform: translateX(4px); }

        .lp-textlink {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 550;
          color: var(--text-1);
          text-decoration: none;
          padding: 12px 4px;
          border-bottom: 1.5px solid transparent;
          transition: border-color 200ms ease;
        }
        .lp-textlink:hover { border-bottom-color: var(--text-1); }

        .lp-burger {
          display: none;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .lp-burger span {
          display: block;
          position: relative;
          width: 20px;
          height: 1.5px;
          background: var(--text-1);
          transition: transform 240ms var(--ease), opacity 160ms linear;
        }
        .lp-burger span::before,
        .lp-burger span::after {
          content: '';
          position: absolute;
          left: 0;
          width: 20px;
          height: 1.5px;
          background: var(--text-1);
          transition: transform 240ms var(--ease);
        }
        .lp-burger span::before { top: -6px; }
        .lp-burger span::after { top: 6px; }
        .lp-burger.is-open span { background: transparent; }
        .lp-burger.is-open span::before { transform: translateY(6px) rotate(45deg); }
        .lp-burger.is-open span::after { transform: translateY(-6px) rotate(-45deg); }

        .lp-mobile-menu {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--cream);
          border-bottom: 1px solid var(--line);
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          transition: max-height 320ms var(--ease), opacity 200ms ease;
        }
        .lp-mobile-menu.is-open { max-height: 380px; opacity: 1; }
        .lp-mobile-menu-inner {
          padding: 12px var(--gutter) 28px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .lp-mobile-a {
          font-size: 18px;
          font-weight: 550;
          color: var(--text-1);
          text-decoration: none;
          padding: 15px 0;
          border-bottom: 1px solid var(--line);
        }
        .lp-mobile-cta { margin-top: 20px; justify-content: center; }

        /* ==========================================================
           HERO
           ========================================================== */
        .lp-hero {
          padding: 190px 0 var(--section);
          text-align: center;
        }
        .lp-label {
          display: inline-block;
          /* 12px is the floor everywhere on the page, including these uppercase
             eyebrow labels. Tracking carries the label look instead of size. */
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--brown-text);
        }
        .lp-h1 {
          margin: 26px auto 0;
          max-width: 15ch;
          font-size: var(--t-hero);
          line-height: 1.05;
          letter-spacing: -0.04em;
          color: var(--text-1);
        }
        .lp-h1-a {
          display: block;
          font-weight: 400;
          color: var(--text-2);
        }
        .lp-h1-b {
          display: block;
          font-weight: 800;
          color: var(--text-1);
        }
        .lp-hero-sub {
          margin: 30px auto 0;
          max-width: 520px;
          font-size: 19px;
          line-height: 1.65;
          color: var(--brown-text);
        }
        .lp-hero-cta {
          margin-top: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 22px;
          flex-wrap: wrap;
        }
        .lp-hero-note {
          margin-top: 72px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-3);
        }

        /* ---- compose window ---- */
        .lp-compose-outer { margin: 18px auto 0; max-width: 640px; }
        .lp-compose-float { animation: lp-float 5s ease-in-out infinite; }
        @keyframes lp-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .lp-compose {
          text-align: left;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--r-xl);
          box-shadow: var(--sh-xl);
          overflow: hidden;
        }
        .lp-compose-bar {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 14px 18px;
          background: var(--cream-deep);
          border-bottom: 1px solid var(--line);
        }
        .lp-dot { width: 9px; height: 9px; border-radius: var(--r-full); background: var(--line); }
        .lp-compose-title {
          margin-left: 12px;
          font-size: 12.5px;
          font-weight: 550;
          color: var(--text-2);
        }
        .lp-compose-firm {
          margin-left: auto;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--brown-text);
          background: var(--brown-wash);
          border: 1px solid var(--brown-line);
          border-radius: var(--r-sm);
          padding: 3px 9px;
        }
        .lp-compose-fields, .lp-compose-body {
          transition: opacity 400ms ease;
        }
        .lp-compose-fields.is-out, .lp-compose-body.is-out { opacity: 0; }
        .lp-field {
          display: flex;
          gap: 14px;
          align-items: baseline;
          padding: 13px 20px;
          border-bottom: 1px solid var(--line);
        }
        .lp-field-k {
          flex: 0 0 58px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--text-3);
        }
        .lp-field-v { font-size: 14.5px; color: var(--text-2); line-height: 1.5; }
        .lp-field-mono { font-variant-ligatures: none; letter-spacing: -0.005em; }
        .lp-field-strong { font-weight: 600; color: var(--text-1); letter-spacing: -0.012em; }

        .lp-compose-body {
          padding: 22px 20px 8px;
          min-height: 236px;
        }
        .lp-compose-text {
          margin: 0;
          font-size: 14.5px;
          line-height: 1.78;
          color: var(--text-2);
        }
        .lp-caret {
          display: inline-block;
          width: 1.5px;
          height: 1.05em;
          margin-left: 2px;
          background: var(--text-1);
          vertical-align: text-bottom;
          animation: lp-blink 1s steps(2, start) infinite;
        }
        @keyframes lp-blink { to { visibility: hidden; } }

        .lp-compose-foot {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          border-top: 1px solid var(--line);
        }
        .lp-send {
          background: var(--ink);
          color: var(--white);
          font-size: 13px;
          font-weight: 600;
          padding: 8px 20px;
          border-radius: var(--r-full);
        }
        .lp-compose-meta { margin-left: auto; display: flex; gap: 6px; }
        .lp-tick {
          width: 16px;
          height: 3px;
          border-radius: var(--r-full);
          background: var(--line);
          transition: background 400ms ease;
        }
        .lp-tick.is-on { background: var(--brown); }

        /* ==========================================================
           TENSION — the one dark section
           ========================================================== */
        .lp-tension {
          position: relative;
          isolation: isolate;
          background: var(--ink);
          color: var(--on-dark);
          padding: 168px 0;
          text-align: center;
          overflow: hidden;
        }
        /* Engraved-plate texture: a fine rule grid, a finer diagonal hatch, and
           a dot lattice on the intersections — three layers at different pitches
           so it reads as printed tone rather than a visible screen. Everything
           is one flat cream at 0.06, so nothing competes with the type. */
        .lp-tension::before {
          content: '';
          position: absolute;
          inset: -1px;
          z-index: -1;
          pointer-events: none;
          opacity: 0.06;
          background-image:
            repeating-linear-gradient(90deg, var(--on-dark) 0 1px, transparent 1px 88px),
            repeating-linear-gradient(0deg, var(--on-dark) 0 1px, transparent 1px 88px),
            repeating-linear-gradient(45deg, var(--on-dark) 0 0.5px, transparent 0.5px 14px),
            radial-gradient(circle at center, var(--on-dark) 0 1.4px, transparent 1.6px);
          background-size: 88px 88px, 88px 88px, 28px 28px, 88px 88px;
          background-position: 0 0, 0 0, 0 0, 44px 44px;
          /* Thinned out behind the headline, densest toward the edges — the
             pattern frames the statement instead of sitting under it. */
          -webkit-mask-image: radial-gradient(ellipse 62% 68% at 50% 50%, transparent 0%, #000 78%);
          mask-image: radial-gradient(ellipse 62% 68% at 50% 50%, transparent 0%, #000 78%);
        }
        /* A single hairline of warm brown across the top edge — the one place
           colour appears on the dark band, and it marks the section boundary. */
        .lp-tension::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          z-index: -1;
          pointer-events: none;
          background: linear-gradient(90deg, transparent, var(--brown) 32%, var(--brown) 68%, transparent);
          opacity: 0.5;
        }
        .lp-tension-h {
          margin: 0 auto;
          max-width: 18ch;
          font-size: clamp(38px, 5.6vw, 68px);
          font-weight: 700;
          letter-spacing: -0.035em;
          line-height: 1.1;
          color: var(--on-dark);
        }
        .lp-tension-p {
          margin: 34px auto 0;
          max-width: 46ch;
          font-size: 19px;
          line-height: 1.7;
          color: rgba(245, 240, 232, 0.62);
        }

        /* ==========================================================
           SECTION HEADS
           ========================================================== */
        .lp-head { max-width: 22ch; margin-bottom: 76px; }
        .lp-head.is-center { max-width: 26ch; margin-left: auto; margin-right: auto; text-align: center; }
        .lp-h2 {
          margin: 18px 0 0;
          font-size: var(--t-section);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.1;
          color: var(--text-1);
        }
        .lp-body {
          font-size: var(--t-body);
          line-height: 1.75;
          color: var(--text-2);
        }

        /* ==========================================================
           HOW IT WORKS
           ========================================================== */
        .lp-step {
          display: grid;
          grid-template-columns: 168px 1fr 300px;
          gap: 48px;
          align-items: center;
          padding: 56px 0;
          border-top: 1px solid var(--line);
        }
        .lp-step:last-child { border-bottom: 1px solid var(--line); }
        .lp-step-n {
          font-size: 120px;
          font-weight: 800;
          letter-spacing: -0.055em;
          line-height: 0.8;
          color: var(--brown);
          opacity: 0.42;
        }
        .lp-step-t {
          font-size: 27px;
          font-weight: 700;
          letter-spacing: -0.025em;
          line-height: 1.25;
          color: var(--text-1);
          margin: 0 0 14px;
        }
        .lp-step-b {
          margin: 0;
          max-width: 44ch;
          font-size: 16px;
          line-height: 1.72;
          color: var(--text-2);
        }

        .lp-mock {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--r-lg);
          padding: 16px;
          box-shadow: var(--sh-md);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .lp-mock-drop {
          border: 1px dashed var(--line-strong);
          border-radius: var(--r-md);
          padding: 22px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: var(--brown);
        }
        .lp-mock-drop-t { font-size: 13px; font-weight: 600; color: var(--text-1); }
        .lp-mock-drop-s { font-size: 12px; color: var(--text-3); }
        .lp-mock-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--cream-deep);
          border-radius: var(--r-sm);
          padding: 9px 12px;
        }
        .lp-mock-file-n { font-size: 12.5px; font-weight: 550; color: var(--text-1); }
        .lp-mock-file-s { font-size: 12px; color: var(--text-3); }
        .lp-mock-bar { height: 4px; border-radius: var(--r-full); background: var(--cream-hover); overflow: hidden; }
        .lp-mock-bar-f { display: block; height: 100%; width: 72%; border-radius: var(--r-full); background: var(--ink); }

        .lp-mock-head { display: flex; align-items: center; gap: 11px; }
        .lp-mock-avatar {
          flex: 0 0 34px;
          height: 34px;
          border-radius: var(--r-md);
          background: var(--ink);
          color: var(--white);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lp-mock-head-t { display: block; font-size: 13.5px; font-weight: 650; color: var(--text-1); }
        .lp-mock-head-s { display: block; font-size: 12px; color: var(--text-3); }
        .lp-mock-rows { display: flex; flex-direction: column; }
        .lp-mock-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 9px 0;
          border-top: 1px solid var(--line);
          font-size: 12px;
        }
        .lp-mock-row span:first-child { color: var(--text-3); }
        .lp-mock-row span:last-child { color: var(--text-1); font-weight: 550; text-align: right; }

        .lp-mock-mail { display: flex; flex-direction: column; gap: 7px; }
        .lp-mock-mail-to { font-size: 12px; color: var(--text-3); }
        .lp-mock-mail-sub {
          font-size: 13px;
          font-weight: 650;
          color: var(--text-1);
          letter-spacing: -0.012em;
          line-height: 1.4;
          margin-bottom: 5px;
        }
        .lp-mock-line { display: block; height: 6px; border-radius: var(--r-full); background: var(--cream-hover); }
        .lp-mock-sent {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          align-self: flex-start;
          font-size: 12px;
          font-weight: 600;
          color: var(--ok);
          background: var(--ok-bg);
          border: 1px solid var(--ok-line);
          border-radius: var(--r-full);
          padding: 4px 11px;
        }

        /* ==========================================================
           BEFORE / AFTER
           ========================================================== */
        .lp-diff {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          align-items: stretch;
        }
        .lp-diff-card {
          position: relative;
          border-radius: var(--r-xl);
          padding: 30px 30px 34px;
          opacity: 0;
          transition: opacity 640ms var(--ease-out) var(--dd, 0ms), transform 640ms var(--ease-out) var(--dd, 0ms);
        }
        .lp-diff-card.is-before { background: #E8E6E1; border: 1px solid #D8D4CD; transform: translateX(-36px); }
        .lp-diff-card.is-after { background: var(--white); border: 1px solid var(--line); box-shadow: var(--sh-xl); transform: translateX(36px); }
        .lp-diff-card.is-in { opacity: 1; transform: none; }

        .lp-badge {
          position: absolute;
          top: 22px;
          right: 22px;
          width: 26px;
          height: 26px;
          border-radius: var(--r-full);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lp-badge.is-x { background: var(--bad-bg); border: 1px solid var(--bad-line); color: var(--bad); }
        .lp-badge.is-check { background: var(--ok-bg); border: 1px solid var(--ok-line); color: var(--ok); }

        .lp-diff-k {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-3);
        }
        .lp-diff-sub {
          margin: 18px 0 16px;
          font-size: 17px;
          font-weight: 650;
          letter-spacing: -0.018em;
          line-height: 1.4;
          padding-right: 30px;
        }
        .lp-diff-card.is-before .lp-diff-sub { color: #6E6A63; }
        .lp-diff-card.is-after .lp-diff-sub { color: var(--text-1); }
        .lp-diff-body {
          margin: 0;
          font-size: 14.5px;
          line-height: 1.8;
        }
        .lp-diff-card.is-before .lp-diff-body { color: #86827A; }
        .lp-diff-card.is-after .lp-diff-body { color: var(--text-2); }
        .lp-mark { color: var(--text-1); font-weight: 600; box-shadow: inset 0 -0.55em 0 var(--brown-wash); }
        .lp-diff-foot {
          margin-top: 56px;
          text-align: center;
          font-size: 19px;
          line-height: 1.6;
          color: var(--text-2);
        }
        .lp-diff-foot strong { color: var(--text-1); font-weight: 650; }

        /* ==========================================================
           RESEARCH GRID
           ========================================================== */
        .lp-research { display: grid; grid-template-columns: 1fr 1fr; column-gap: 64px; }
        .lp-res-item {
          display: flex;
          gap: 18px;
          padding: 30px 0;
          border-top: 1px solid var(--line);
        }
        .lp-research > div:nth-last-child(-n + 2) .lp-res-item { border-bottom: 1px solid var(--line); }
        .lp-res-icon { flex: 0 0 auto; color: var(--brown); margin-top: 2px; }
        .lp-res-label {
          margin: 0 0 6px;
          font-size: 16.5px;
          font-weight: 650;
          letter-spacing: -0.015em;
          color: var(--text-1);
          line-height: 1.4;
        }
        .lp-res-line { margin: 0; font-size: 14.5px; line-height: 1.65; color: var(--text-2); }

        /* ==========================================================
           PRICING
           ========================================================== */
        .lp-toggle {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin: 30px auto 0;
          padding: 4px;
          background: var(--cream-deep);
          border: 1px solid var(--line);
          border-radius: var(--r-full);
        }
        .lp-toggle button {
          font-family: var(--font);
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-2);
          background: transparent;
          border: none;
          border-radius: var(--r-full);
          padding: 9px 20px;
          cursor: pointer;
          transition: background 200ms ease, color 200ms ease;
        }
        .lp-toggle button.is-on { background: var(--ink); color: var(--white); }
        .lp-toggle-save { font-size: 12px; font-weight: 600; color: var(--brown-text); padding-right: 12px; }

        .lp-tiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: start; }
        .lp-tier {
          display: flex;
          flex-direction: column;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--r-xl);
          padding: 32px;
          min-height: 520px;
          transition: transform 380ms var(--ease), box-shadow 380ms ease;
        }
        .lp-tier:hover { transform: translateY(-4px); box-shadow: var(--sh-lg); }
        .lp-tier.is-featured {
          border-color: var(--ink);
          box-shadow: var(--sh-xl);
          transform: translateY(-12px);
        }
        .lp-tier.is-featured:hover { transform: translateY(-16px); }
        .lp-tier-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .lp-tier-n { font-size: 16px; font-weight: 650; color: var(--text-1); }
        .lp-tier-pop {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--brown-text);
          background: var(--brown-wash);
          border: 1px solid var(--brown-line);
          border-radius: var(--r-full);
          padding: 4px 11px;
        }
        .lp-tier-blurb { margin: 8px 0 26px; font-size: 14.5px; color: var(--text-3); }
        .lp-price-row { display: flex; align-items: baseline; gap: 10px; }
        .lp-price-was {
          font-size: 22px;
          font-weight: 500;
          color: var(--text-3);
          text-decoration: line-through;
          text-decoration-thickness: 1.5px;
        }
        .lp-price {
          font-size: 50px;
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1;
          color: var(--text-1);
        }
        .lp-price-per { font-size: 15px; color: var(--text-3); }
        .lp-price-note { margin-top: 10px; font-size: 12.5px; color: var(--brown-text); min-height: 19px; }
        .lp-feat { display: flex; flex-direction: column; gap: 13px; margin: 28px 0 32px; }
        .lp-feat-i { display: flex; gap: 11px; align-items: flex-start; font-size: 14.5px; color: var(--text-2); line-height: 1.6; }
        .lp-feat-i svg { flex: 0 0 auto; margin-top: 5px; color: var(--brown); }
        .lp-tier-cta {
          margin-top: auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 20px;
          border-radius: var(--r-full);
          font-family: var(--font);
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: background 180ms ease, border-color 180ms ease, color 180ms ease;
        }
        .lp-tier-cta.is-dark { background: var(--ink); border: 1px solid var(--ink); color: var(--white); }
        .lp-tier-cta.is-dark:hover { background: var(--ink-soft); border-color: var(--ink-soft); }
        .lp-tier-cta.is-plain { background: transparent; border: 1px solid var(--line); color: var(--text-1); }
        .lp-tier-cta.is-plain:hover { border-color: var(--ink); }

        /* ==========================================================
           PROOF · CLOSER · FOOTER
           ========================================================== */
        .lp-proof {
          padding: 96px 0;
          text-align: center;
        }
        .lp-proof p {
          margin: 0 auto;
          max-width: 62ch;
          font-size: 19px;
          line-height: 1.8;
          color: var(--text-2);
        }
        .lp-proof strong { color: var(--text-1); font-weight: 600; }

        .lp-closer { padding: 150px 0 160px; text-align: center; }
        .lp-closer h2 {
          margin: 0 auto;
          max-width: 16ch;
          font-size: clamp(40px, 5.4vw, 66px);
          font-weight: 800;
          letter-spacing: -0.038em;
          line-height: 1.06;
          color: var(--text-1);
        }
        .lp-closer p {
          margin: 26px auto 42px;
          font-size: 18px;
          color: var(--text-2);
        }

        .lp-footer {
          border-top: 1px solid var(--line);
          padding: 40px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .lp-footer-mid { display: flex; gap: 30px; }
        .lp-footer-a {
          font-size: 14px;
          color: var(--text-2);
          text-decoration: none;
          transition: color 160ms ease;
        }
        .lp-footer-a:hover { color: var(--text-1); }
        .lp-footer-c { font-size: 14px; color: var(--text-3); }

        /* ==========================================================
           RESPONSIVE
           ========================================================== */
        @media (max-width: 1080px) {
          .lp-root { --section: 104px; --t-hero: 68px; --t-section: 42px; }
          .lp-step { grid-template-columns: 130px 1fr 260px; gap: 32px; }
          .lp-step-n { font-size: 92px; }
          .lp-research { column-gap: 44px; }
        }

        @media (max-width: 900px) {
          .lp-nav-mid { display: none; }
          .lp-nav-right { display: none; }
          .lp-burger { display: flex; }
          .lp-mobile-menu { display: block; }
        }

        @media (max-width: 760px) {
          .lp-root {
            --gutter: 20px;
            --section: 60px;
            --t-hero: 44px;
            --t-section: 36px;
            --t-body: 16px;
          }
          /* Shorter travel on small screens keeps reveals from feeling laggy. */
          .lp-reveal { --ry: 16px !important; }
          .lp-word { transform: translateY(12px); }

          .lp-nav-inner { height: 66px; }
          .lp-hero { padding: 128px 0 var(--section); }
          .lp-h1 { max-width: 100%; font-weight: 800; }
          .lp-h1-a { font-weight: 400; }
          .lp-hero-sub { font-size: 17px; margin-top: 24px; }
          .lp-hero-cta { gap: 12px; flex-direction: column; }
          .lp-hero-cta .lp-pill { width: 100%; justify-content: center; }
          .lp-hero-note { margin-top: 48px; }

          /* Card is width-capped by the shell gutter rather than its own 640px
             max, so it can never be the thing that causes horizontal scroll. */
          .lp-compose-outer { max-width: 100%; }
          .lp-compose { border-radius: var(--r-lg); }
          .lp-compose-float { animation: none; }
          .lp-compose-firm { display: none; }
          .lp-compose-body { min-height: 300px; padding: 18px 16px 6px; }
          .lp-field { padding: 12px 16px; gap: 10px; }
          .lp-field-k { flex-basis: 52px; font-size: 12px; }
          .lp-field-v { font-size: 15px; }
          /* Long unbroken addresses and subjects are the one thing here that can
             exceed 390px; break them rather than letting them push the layout. */
          .lp-field-mono { word-break: break-all; }
          .lp-field-strong { overflow-wrap: anywhere; }
          .lp-compose-text { font-size: 15px; line-height: 1.72; }

          .lp-tension { padding: 72px 0; }
          .lp-head { margin-bottom: 40px; max-width: 100%; }

          .lp-step {
            grid-template-columns: 1fr;
            gap: 22px;
            padding: 40px 0;
          }
          .lp-step-n { font-size: 64px; line-height: 1; }
          .lp-step-t { font-size: 23px; }

          /* Body copy floor: 14.5px reads fine at desktop measure but is under
             the 15px minimum for phones, so every prose-carrying class is
             lifted here rather than at the base. */
          .lp-diff-body,
          .lp-res-line,
          .lp-feat-i,
          .lp-tier-blurb { font-size: 15px; }

          .lp-diff { grid-template-columns: 1fr; gap: 18px; }
          .lp-diff-card { padding: 24px 22px 28px; }
          .lp-diff-card.is-before, .lp-diff-card.is-after { transform: translateY(16px); }
          /* Must follow the two rules above: equal specificity, so source order
             is what lets a revealed card settle back to its resting position. */
          .lp-diff-card.is-in { transform: none; }
          .lp-diff-foot { margin-top: 36px; font-size: 17px; }

          .lp-research { grid-template-columns: 1fr; }
          .lp-research > div:nth-last-child(-n + 2) .lp-res-item { border-bottom: none; }
          .lp-research > div:last-child .lp-res-item { border-bottom: 1px solid var(--line); }
          .lp-res-item { padding: 24px 0; }

          .lp-tiers { grid-template-columns: 1fr; gap: 16px; }
          .lp-tier { min-height: 0; padding: 26px; }
          .lp-tier.is-featured, .lp-tier.is-featured:hover, .lp-tier:hover { transform: none; }

          .lp-proof { padding: 68px 0; }
          .lp-proof p { font-size: 17px; }
          .lp-closer { padding: 92px 0 100px; }
          .lp-closer p { font-size: 16.5px; }

          .lp-footer { flex-direction: column; gap: 26px; text-align: center; }
          .lp-footer-mid { flex-wrap: wrap; justify-content: center; gap: 20px; }

          /* Touch targets. Every tappable thing gets a 44px minimum box on
             touch screens, expressed as min-height plus centring rather than
             extra padding so none of it shifts the surrounding layout. The
             text links and footer links are the ones that actually needed it —
             the pills and tier CTAs already cleared 44px from padding alone,
             and are pinned here so a later padding tweak cannot regress them. */
          .lp-pill,
          .lp-ghost,
          .lp-textlink,
          .lp-tier-cta,
          .lp-toggle button {
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          /* Inline-level links inside centred text: padding would break the
             line box, so grow the hit area with min-height on a flex box that
             still sits in the normal flow. */
          .lp-footer-a {
            display: inline-flex;
            align-items: center;
            min-height: 44px;
          }
          .lp-mobile-a { padding: 0; min-height: 52px; display: flex; align-items: center; }
        }

        /* Tablet: research grid to single column */
        @media (max-width: 600px) {
          .lp-research { grid-template-columns: 1fr; }
        }

        /* Extra-small screens: tighten hero headline further */
        @media (max-width: 400px) {
          .lp-root { --t-hero: 36px; --gutter: 16px; }
        }

        /* ==========================================================
           MOTION OPT-OUT
           Every animated element resolves to its final state. Nothing
           moves, nothing is hidden, nothing is lost.
           ========================================================== */
        @media (prefers-reduced-motion: reduce) {
          html:has(.lp-root) { scroll-behavior: auto; }
          .lp-reveal,
          .lp-word,
          .lp-diff-card {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
          .lp-compose-float { animation: none !important; }
          .lp-caret { animation: none !important; }
          .lp-tier:hover, .lp-tier.is-featured, .lp-tier.is-featured:hover { transform: none !important; }
          .lp-nav-a::after { transition: none !important; }
          .lp-cursor { display: none !important; }
        }
      `}</style>

      <div className="lp-root">
        <CustomCursor />

        {/* ---------- NAV ---------- */}
        <header className={'lp-nav' + (scrolled ? ' is-scrolled' : '')}>
          <div className="lp-shell lp-nav-inner">
            <Logo />

            <nav className="lp-nav-mid" aria-label="Primary">
              <a href="#how" className="lp-nav-a">How it works</a>
              <a href="#pricing" className="lp-nav-a">Pricing</a>
              <a href="#research" className="lp-nav-a">For founders</a>
            </nav>

            <div className="lp-nav-right">
              <Link href="/login" className="lp-ghost">Log in</Link>
              <Link href="/login" className="lp-pill">
                Start free <span className="lp-arrow">→</span>
              </Link>
            </div>

            <button
              type="button"
              className={'lp-burger' + (menuOpen ? ' is-open' : '')}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span />
            </button>
          </div>

          <div className={'lp-mobile-menu' + (menuOpen ? ' is-open' : '')}>
            <div className="lp-mobile-menu-inner">
              <a href="#how" className="lp-mobile-a" onClick={() => setMenuOpen(false)}>How it works</a>
              <a href="#pricing" className="lp-mobile-a" onClick={() => setMenuOpen(false)}>Pricing</a>
              <a href="#research" className="lp-mobile-a" onClick={() => setMenuOpen(false)}>For founders</a>
              <Link href="/login" className="lp-mobile-a" onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link href="/login" className="lp-pill lp-mobile-cta" onClick={() => setMenuOpen(false)}>
                Start free <span className="lp-arrow">→</span>
              </Link>
            </div>
          </div>
        </header>

        {/* ---------- HERO ---------- */}
        <section className="lp-shell lp-hero">
          <Reveal y={12} immediate>
            <span className="lp-label">Investor pitch intelligence</span>
          </Reveal>

          <h1 className="lp-h1">
            <WordReveal className="lp-h1-a" text="Investors can tell a generic pitch" stagger={70} />
            <WordReveal className="lp-h1-b" text="in 3 seconds." stagger={70} delay={490} />
          </h1>

          <Reveal delay={380} y={16} immediate>
            <p className="lp-hero-sub">
              PitchWire researches every investor and writes emails that open with something only
              they would recognise. Built for founders raising pre-seed and seed rounds globally.
            </p>
          </Reveal>

          <Reveal delay={520} y={16} immediate>
            <div className="lp-hero-cta">
              <Link href="/login" className="lp-pill is-lg">
                Get 10 free pitches
              </Link>
              <a href="#difference" className="lp-textlink">
                See a real pitch <span className="lp-arrow">→</span>
              </a>
            </div>
          </Reveal>

          <Reveal delay={640} y={16} immediate>
            <p className="lp-hero-note">↑ Real pitch generated by PitchWire</p>
          </Reveal>

          <Reveal delay={700} y={28} immediate>
            <ComposeWindow />
          </Reveal>
        </section>

        {/* ---------- TENSION ---------- */}
        <section className="lp-tension">
          <div className="lp-shell">
            <h2 className="lp-tension-h">
              <WordReveal text="Every investor gets 50 pitches a week." stagger={60} />
            </h2>
            <p className="lp-tension-p">
              <WordReveal
                text={'Most open with “I hope this email finds you well.” Yours won’t.'}
                stagger={60}
                delay={420}
              />
            </p>
          </div>
        </section>

        {/* ---------- HOW IT WORKS ---------- */}
        <section id="how" className="lp-section">
          <div className="lp-shell">
            <Reveal>
              <div className="lp-head">
                <span className="lp-label">The process</span>
                <h2 className="lp-h2">From deck to sent in minutes</h2>
              </div>
            </Reveal>

            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 200} y={40}>
                <div className="lp-step">
                  <div className="lp-step-n">{step.n}</div>
                  <div>
                    <h3 className="lp-step-t">{step.title}</h3>
                    <p className="lp-step-b">{step.body}</p>
                  </div>
                  <StepVisual kind={step.visual} />
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- BEFORE / AFTER ---------- */}
        <section id="difference" className="lp-section">
          <div className="lp-shell">
            <Reveal>
              <div className="lp-head is-center">
                <span className="lp-label">The difference</span>
                <h2 className="lp-h2">What investors actually read</h2>
              </div>
            </Reveal>

            <div className="lp-diff" ref={diffRef}>
              {/* Before slides in from the left first; after follows 500ms later
                  from the right, so the eye reads them in argument order. */}
              <div
                className={'lp-diff-card is-before' + (diffShown ? ' is-in' : '')}
                style={{ '--dd': '0ms' }}
              >
                <span className="lp-badge is-x" aria-hidden="true">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </span>
                <span className="lp-diff-k">Before</span>
                <p className="lp-diff-sub">Investment opportunity &mdash; HealthTech Startup</p>
                <p className="lp-diff-body">
                  Dear Investor, I hope this email finds you well. We are building a revolutionary
                  platform that leverages cutting-edge technology to disrupt the healthcare space in
                  emerging markets. Our solution addresses a massive addressable market with strong
                  tailwinds. We are currently raising our seed round and would love to schedule a call
                  at your earliest convenience to discuss synergies. Please find our deck attached.
                </p>
              </div>

              <div
                className={'lp-diff-card is-after' + (diffShown ? ' is-in' : '')}
                style={{ '--dd': '500ms' }}
              >
                <span className="lp-badge is-check" aria-hidden="true">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <span className="lp-diff-k">After</span>
                <p className="lp-diff-sub">
                  TIDE Africa Fund II and the $300 problem in Nigerian hospitals
                </p>
                <p className="lp-diff-body">
                  Your <span className="lp-mark">$154M TIDE Africa Fund II</span> close while most
                  funds pulled back says something about conviction. In Lagos right now a diabetes
                  patient moving between clinics loses her entire diagnostic history because her paper
                  file disappeared &mdash; forcing <span className="lp-mark">$300 in redundant
                  bloodwork</span>. We built ForcepX to eliminate this. Blockchain-anchored patient
                  records, patient-controlled permissions, cross-system compliant. Three hospital
                  design partners in Lagos already. 15 minutes Thursday?
                </p>
              </div>
            </div>

            <Reveal delay={200}>
              <p className="lp-diff-foot">
                The difference is research. <strong>PitchWire does it automatically.</strong>
              </p>
            </Reveal>
          </div>
        </section>

        {/* ---------- WHAT IT RESEARCHES ---------- */}
        <section id="research" className="lp-section">
          <div className="lp-shell">
            <Reveal>
              <div className="lp-head">
                <span className="lp-label">Investor intelligence</span>
                <h2 className="lp-h2">We find what they actually care about</h2>
              </div>
            </Reveal>

            <div className="lp-research">
              {RESEARCH.map((item, i) => (
                <Reveal key={item.label} delay={i * 100} y={20}>
                  <div className="lp-res-item">
                    <span className="lp-res-icon"><Icon name={item.icon} /></span>
                    <div>
                      <p className="lp-res-label">{item.label}</p>
                      <p className="lp-res-line">{item.line}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- PRICING ---------- */}
        <section id="pricing" className="lp-section">
          <div className="lp-shell">
            <Reveal>
              <div className="lp-head is-center">
                <span className="lp-label">Pricing</span>
                <h2 className="lp-h2">Start free. Upgrade when you&rsquo;re ready.</h2>
                <div className="lp-toggle" role="group" aria-label="Billing period">
                  <button
                    type="button"
                    className={annual ? '' : 'is-on'}
                    aria-pressed={!annual}
                    onClick={() => setAnnual(false)}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    className={annual ? 'is-on' : ''}
                    aria-pressed={annual}
                    onClick={() => setAnnual(true)}
                  >
                    Annual
                  </button>
                  <span className="lp-toggle-save">Save 20%</span>
                </div>
              </div>
            </Reveal>

            <div className="lp-tiers">
              {TIERS.map((tier, i) => {
                // Monthly = show tier.price | Annual = show monthly equivalent (annualPrice / 12)
                const monthlyDisplay = annual && tier.annualPrice > 0
                  ? Math.round(tier.annualPrice / 12)
                  : tier.price;
                const showDiscount = annual && tier.annualPrice > 0;

                // Build the "billed as X/year" note for annual
                let billingNote = '';
                if (tier.price === 0) {
                  billingNote = 'Free forever';
                } else if (showDiscount) {
                  billingNote = `Billed as $${tier.annualPrice}/year`;
                } else {
                  billingNote = '';
                }

                return (
                  <Reveal key={tier.name} delay={i * 120} y={28}>
                    <div className={'lp-tier' + (tier.featured ? ' is-featured' : '')}>
                      <div className="lp-tier-top">
                        <span className="lp-tier-n">{tier.name}</span>
                        {tier.featured ? <span className="lp-tier-pop">Most popular</span> : null}
                      </div>
                      <p className="lp-tier-blurb">{tier.blurb}</p>

                      <div className="lp-price-row">
                        {showDiscount ? <span className="lp-price-was">${tier.price}</span> : null}
                        <span className="lp-price">${monthlyDisplay}</span>
                        <span className="lp-price-per">/month</span>
                      </div>
                      <p className="lp-price-note">{billingNote}</p>

                      <div className="lp-feat">
                        {tier.features.map((f) => (
                          <span key={f} className="lp-feat-i">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            {f}
                          </span>
                        ))}
                      </div>

                      <Link
                        href={tier.href + (annual && tier.annualPrice > 0 ? '&interval=annual' : '')}
                        className={'lp-tier-cta ' + (tier.featured ? 'is-dark' : 'is-plain')}
                      >
                        {tier.cta}
                      </Link>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- SOCIAL PROOF ---------- */}
        <section className="lp-shell lp-proof">
          <Reveal y={16}>
            <p>
              Founders have used PitchWire to pitch <strong>TLcom Capital</strong>,{' '}
              <strong>Novastar Ventures</strong>, <strong>Ventures Platform</strong>,{' '}
              <strong>Founders Factory</strong>, and 40+ other investors.
            </p>
          </Reveal>
        </section>

        {/* ---------- FINAL CTA ---------- */}
        <section className="lp-shell lp-closer">
          <Reveal>
            <h2>Your next investor reply starts here.</h2>
            <p>10 free pitches. No credit card. Cancel anytime.</p>
            <Link href="/login" className="lp-pill is-lg">
              Start pitching free <span className="lp-arrow">→</span>
            </Link>
          </Reveal>
        </section>

        {/* ---------- FOOTER ---------- */}
        <footer className="lp-shell">
          <div className="lp-footer">
            <Logo />
            <nav className="lp-footer-mid" aria-label="Footer">
              <a href="#how" className="lp-footer-a">How it works</a>
              <a href="#difference" className="lp-footer-a">The difference</a>
              <a href="#research" className="lp-footer-a">For founders</a>
              <a href="#pricing" className="lp-footer-a">Pricing</a>
              <Link href="/login" className="lp-footer-a">Log in</Link>
            </nav>
            <span className="lp-footer-c">&copy; {new Date().getFullYear()} PitchWire</span>
          </div>
        </footer>
      </div>
    </>
  );
}

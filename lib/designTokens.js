// PitchWire design system — single source of truth.
//
// Every component imports from here rather than redeclaring hex values, so a
// palette change is one edit instead of a sweep across a dozen files.
//
// Principles:
//   - Warm monochromatic cream. No neon, no teal, no gradients.
//   - Shadows are neutral rgba(0,0,0,...) only. Never a coloured glow.
//   - Contrast comes from weight and spacing, not from luminous accents.
//   - Reads like Linear / Notion / Stripe: confident, quiet, premium.

export const colors = {
  bg: {
    base: '#F5F0E8',      // warm cream page background
    surface: '#EDE8DE',   // slightly darker cream for recessed areas
    card: '#FFFFFF',      // cards sit above the cream on white
    input: '#FFFFFF',
    hover: '#E6E0D4',     // subtle warm hover wash
  },
  accent: {
    primary: '#1A1A1A',   // near black — primary actions
    hover: '#333333',
    secondary: '#8B7355', // warm brown — secondary emphasis
    secondaryHover: '#75604A',
    subtle: 'rgba(139,115,85,0.08)',  // warm brown wash, not a glow
    subtleBorder: 'rgba(139,115,85,0.22)',
  },
  text: {
    primary: '#1A1A1A',
    secondary: '#5C5248',
    muted: '#9E9589',
    inverse: '#FFFFFF',
    onDark: '#F5F0E8',
  },
  border: {
    default: '#D4CFC7',   // soft warm gray
    hover: '#BFB8AD',
    active: '#1A1A1A',
  },
  status: {
    success: '#2D5016',   // dark green, deliberately not neon
    successBg: 'rgba(45,80,22,0.07)',
    successBorder: 'rgba(45,80,22,0.20)',
    error: '#8B1A1A',     // dark red
    errorBg: 'rgba(139,26,26,0.06)',
    errorBorder: 'rgba(139,26,26,0.18)',
    warning: '#8B7355',   // warm brown stands in for amber
    warningBg: 'rgba(139,115,85,0.08)',
    warningBorder: 'rgba(139,115,85,0.22)',
  },
};

// Neutral only. A coloured shadow is what made the old UI feel cheap.
export const shadows = {
  xs: '0 1px 2px rgba(0,0,0,0.04)',
  sm: '0 1px 3px rgba(0,0,0,0.06)',
  md: '0 2px 8px rgba(0,0,0,0.06)',
  lg: '0 4px 16px rgba(0,0,0,0.06)',
  xl: '0 8px 32px rgba(0,0,0,0.06)',
};

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
};

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '999px',
};

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  baseSize: '15px',
  baseLineHeight: 1.7,
  // Editorial scale — large headings, generous whitespace.
  display: 'clamp(40px, 7vw, 72px)',
  h1: 'clamp(32px, 5vw, 48px)',
  h2: 'clamp(24px, 3.5vw, 34px)',
  h3: 'clamp(19px, 2.2vw, 23px)',
  body: '15px',
  small: '14px',
  tiny: '13px',
};

export const transitions = {
  fast: '140ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '220ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '360ms cubic-bezier(0.4, 0, 0.2, 1)',
};

// Combined default export mirrors the shape the components already destructure
// as `tokens`, so existing `tokens.colors.text.primary` call sites keep working.
export const tokens = {
  colors: colors,
  shadows: shadows,
  spacing: spacing,
  radius: radius,
  typography: typography,
  transitions: transitions,
};

export default tokens;

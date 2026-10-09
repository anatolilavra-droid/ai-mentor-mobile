/**
 * Raw palette. Do not use directly in components — use semantic `colors`.
 */
const palette = {
  graphite950: '#0F1012',
  graphite900: '#141518',
  graphite850: '#17181B',
  graphite800: '#1E2024',
  graphite750: '#24262B',
  graphite700: '#26282D',
  graphite600: '#34373D',
  ivory100: '#F4EFE6',
  ivory300: '#B5AFA5',
  ivory500: '#948E85',
  lime400: '#C8F250',
  violet400: '#8B7CFF',
  mint400: '#6FD3A0',
  amber400: '#F2C063',
  coral400: '#F2756A',
} as const;

export const colors = {
  background: {
    primary: palette.graphite950,
    secondary: palette.graphite900,
  },
  surface: {
    default: palette.graphite850,
    elevated: palette.graphite800,
    pressed: palette.graphite750,
  },
  border: {
    subtle: palette.graphite700,
    strong: palette.graphite600,
  },
  text: {
    primary: palette.ivory100,
    secondary: palette.ivory300,
    muted: palette.ivory500,
    onAccent: palette.graphite950,
  },
  accent: {
    primary: palette.lime400,
    primarySoft: 'rgba(200, 242, 80, 0.12)',
    secondary: palette.violet400,
    secondarySoft: 'rgba(139, 124, 255, 0.14)',
  },
  status: {
    success: palette.mint400,
    warning: palette.amber400,
    error: palette.coral400,
    errorSoft: 'rgba(242, 117, 106, 0.12)',
  },
  overlay: 'rgba(15, 16, 18, 0.72)',
} as const;

export type Colors = typeof colors;

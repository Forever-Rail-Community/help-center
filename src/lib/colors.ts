// Colors from the dashboard's Admin > Appearance > Help site: the accent (links, icons, highlights in both modes,
// and the light mode header) and the dark mode header color. The accent is used as is for tints and borders. For text and icons, a darker (light mode)
// or lighter (dark mode) shade is worked out at build time, so they stay readable whatever color is picked:
// 4.5:1 contrast for text and 3:1 for icons, the WCAG AA levels.

type Rgb = [number, number, number]

const LIGHT_BACKGROUND: Rgb = [255, 255, 255]
const DARK_BACKGROUND: Rgb = [9, 9, 11]
const TEXT_CONTRAST = 4.5
const ICON_CONTRAST = 3

const HEX = /^#[0-9a-f]{6}$/i
const toRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const mix = (from: Rgb, to: Rgb, amount: number): Rgb => from.map((c, i) => c + (to[i]! - c) * amount) as Rgb

// The closest shade of `color` (moving toward `toward`) with at least `ratio` contrast against every background.
function readable(color: Rgb, backgrounds: Rgb[], toward: Rgb, ratio: number): string {
  for (let amount = 0; amount <= 1; amount += 0.01) {
    const shade = toHex(mix(color, toward, amount)) // checked after rounding to a hex color
    if (backgrounds.every((bg) => contrast(toRgb(shade), bg) >= ratio)) return shade
  }
  return toHex(toward)
}

export interface AccentShades {
  base: string // the accent color
  text: string // links and colored text
  icon: string // icons and other shapes that carry meaning
  band: string // the colored band behind the header (and the home page search)
  bandText: string // text on the band
  heroOverlay: number // how strongly the band color covers the home page image, in percent
}

interface Mode {
  background: Rgb // the page background
  readableToward: Rgb // text and icon shades move this way until they read clearly on the background
  bandText: Rgb // text color on the band
  bandContrast: number // the band shifts toward the page background until its text reaches this contrast
}

// Light mode: dark text on the band, at the usual 4.5:1. Dark mode: light text, and the band is kept deep
// enough for 7:1 so a bright color doesn't glare at night (an already deep color, like Sapphire, stays as is).
const LIGHT: Mode = { background: LIGHT_BACKGROUND, readableToward: [0, 0, 0], bandText: [9, 9, 11], bandContrast: TEXT_CONTRAST }
const DARK: Mode = { background: DARK_BACKGROUND, readableToward: [255, 255, 255], bandText: [250, 250, 250], bandContrast: 7 }

// Over the home page image the band color is laid on top at some strength. The image could be anything, so the
// strength must keep band text readable over both an all-black and an all-white image (and so over any image).
const WORST_IMAGES: Rgb[] = [[0, 0, 0], [255, 255, 255]]

// The requested strength (0 to 100), raised to the weakest one that keeps band text at 4.5:1 over any image.
function heroOverlay(band: Rgb, bandText: Rgb, requested: number): number {
  for (let percent = Math.max(0, Math.min(100, Math.round(requested))); percent < 100; percent++) {
    const covered = WORST_IMAGES.map((image) => toRgb(toHex(mix(image, band, percent / 100))))
    if (covered.every((bg) => contrast(bg, bandText) >= TEXT_CONTRAST)) return percent
  }
  return 100
}

// Accent text and icons sit on the plain background and on tints of the accent (tags, icon squares),
// at most 18% strong, so shades are checked against both.
const STRONGEST_TINT = 0.18

function shades(accentHex: string, bandHex: string, mode: Mode, requestedOverlay: number): AccentShades {
  const color = toRgb(accentHex)
  const tinted = mix(mode.background, color, STRONGEST_TINT)
  const band = readable(toRgb(bandHex), [mode.bandText], mode.background, mode.bandContrast)
  return {
    base: toHex(color),
    text: readable(color, [mode.background, tinted], mode.readableToward, TEXT_CONTRAST),
    icon: readable(color, [mode.background, tinted], mode.readableToward, ICON_CONTRAST),
    band,
    bandText: toHex(mode.bandText),
    heroOverlay: heroOverlay(toRgb(band), mode.bandText, requestedOverlay)
  }
}

export interface Accents {
  light: AccentShades
  dark: AccentShades
}

// The dashboard stores the accent as helpLightAccent and the dark mode header as helpDarkAccent.
// Falls back to `fallback` (the main color) when a setting is missing, for dashboards without these settings yet.
export function accents(accent: string | undefined, darkBand: string | undefined, fallback: string, heroOverlay = 80): Accents {
  const pick = (value: string | undefined) => (value && HEX.test(value) ? value : fallback)
  return {
    light: shades(pick(accent), pick(accent), LIGHT, heroOverlay),
    dark: shades(pick(accent), pick(darkBand), DARK, heroOverlay)
  }
}

// CSS custom properties for <html>, like "--light-accent-text: #8f681f"; global.css uses the light or dark set.
export function accentStyle({ light, dark }: Accents): string {
  const vars = (mode: string, s: AccentShades) => [
    `--${mode}-accent: ${s.base}`, `--${mode}-accent-text: ${s.text}`, `--${mode}-accent-icon: ${s.icon}`,
    `--${mode}-band: ${s.band}`, `--${mode}-band-text: ${s.bandText}`, `--${mode}-hero-overlay: ${s.heroOverlay}%`
  ]
  return [...vars('light', light), ...vars('dark', dark)].join('; ')
}

// Accent colors for light and dark mode, from the dashboard's Admin > Appearance > Help site colors.
// The chosen color is used as is for tints, borders, and highlights. For text and icons, a darker (light mode)
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
  base: string // the chosen color
  text: string // links and colored text
  icon: string // icons and other shapes that carry meaning
}

// Accent text and icons sit on the plain background and on tints of the accent (tags, icon squares),
// at most 18% strong, so shades are checked against both.
const STRONGEST_TINT = 0.18

function shades(hex: string, background: Rgb, toward: Rgb): AccentShades {
  const color = toRgb(hex)
  const tinted = mix(background, color, STRONGEST_TINT)
  return {
    base: toHex(color),
    text: readable(color, [background, tinted], toward, TEXT_CONTRAST),
    icon: readable(color, [background, tinted], toward, ICON_CONTRAST)
  }
}

export interface Accents {
  light: AccentShades
  dark: AccentShades
}

// Falls back to `fallback` (the main color) when a setting is missing, for dashboards without these settings yet.
export function accents(light: string | undefined, dark: string | undefined, fallback: string): Accents {
  const pick = (value: string | undefined) => (value && HEX.test(value) ? value : fallback)
  return {
    light: shades(pick(light), LIGHT_BACKGROUND, [0, 0, 0]),
    dark: shades(pick(dark), DARK_BACKGROUND, [255, 255, 255])
  }
}

// CSS custom properties for <html>; global.css uses the light or dark set depending on the mode.
export function accentStyle({ light, dark }: Accents): string {
  return [
    `--light-accent: ${light.base}`, `--light-accent-text: ${light.text}`, `--light-accent-icon: ${light.icon}`,
    `--dark-accent: ${dark.base}`, `--dark-accent-text: ${dark.text}`, `--dark-accent-icon: ${dark.icon}`
  ].join('; ')
}

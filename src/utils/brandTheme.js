// Per-organization accent + dark-sidebar colors, keyed by Organization.type
// (see the server's ORG_TYPES). Values are "R G B" triples matching
// Tailwind's CSS-variable alpha-value convention (see tailwind.config.js
// `brand` and `sidebar`).
//
// 600/700 (buttons, links, the active nav highlight) are sourced from each
// brand's own site:
// - courier (AJCL): the live site's amber accent (#FFB100) is too light for
//   white button text to pass contrast, so this uses the nearest accessible
//   amber (Tailwind's amber-700/800) instead of the literal hex.
// - logistics (QuickShipAfrica): exact accent + hover already used on their
//   site (#f55b1f / #d94a0f).
// - marketplace (9jaTradiesPages): exact --color-primary / --color-primary-dark
//   from their own design tokens (#1E7A34 / #166B2C).
//
// 900/800 (the sidebar's own background + its hover/border) are Tailwind's
// 950/900-weight shades in the same hue — dark and desaturated enough to
// keep white nav text readable across a large surface, unlike the bright
// 600/700 accent.
const BRAND_COLORS = {
  courier: { 600: "180 83 9", 700: "146 64 14", 900: "69 26 3", 800: "120 53 15" },
  logistics: { 600: "245 91 31", 700: "217 74 15", 900: "67 20 7", 800: "124 45 18" },
  marketplace: { 600: "30 122 52", 700: "22 107 44", 900: "5 46 22", 800: "20 83 45" },
};

const DEFAULT_BRAND = { 600: "29 78 216", 700: "30 64 175", 900: "15 23 42", 800: "30 41 59" };

/** Swap the app's accent + sidebar colors for the signed-in organization's brand. */
export function applyBrandTheme(organizationType) {
  const colors = BRAND_COLORS[organizationType] || DEFAULT_BRAND;
  const root = document.documentElement.style;
  root.setProperty("--brand-600", colors[600]);
  root.setProperty("--brand-700", colors[700]);
  root.setProperty("--brand-900", colors[900]);
  root.setProperty("--brand-800", colors[800]);
}

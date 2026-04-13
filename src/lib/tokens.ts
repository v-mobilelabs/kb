/**
 * Design tokens — single source of truth for spacing, radii, and colour theme.
 * Mirrors the CSS custom properties in globals.css.
 * No inline overrides permitted (Constitution IV).
 */

export const colors = {
  /** 60 % — primary base (background) */
  base: "#ffffff",
  baseDark: "#0a0a0a",

  /** 30 % — secondary surface (cards, panels) */
  surface: "#f4f4f5",
  surfaceDark: "#18181b",

  /** 10 % — accent (interactive, brand) */
  accent: "#006fee",
} as const;

export const spacing = {
  xs: "0.25rem", // 4px
  sm: "0.5rem", // 8px
  md: "1rem", // 16px
  lg: "1.5rem", // 24px
  xl: "2rem", // 32px
  "2xl": "3rem", // 48px
} as const;

export const radii = {
  sm: "0.375rem", // 6px
  md: "0.5rem", // 8px
  lg: "0.75rem", // 12px
  xl: "1rem", // 16px
  full: "9999px",
} as const;

/**
 * Colour classes for file kind badges — WCAG AA compliant (4.5:1 ratio)
 * Maps FileKind to Tailwind colour utility classes
 */
export const fileKindColorMap = {
  image: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  pdf: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  doc: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  sheet: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  video:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  audio:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  text: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  other: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
} as const satisfies Record<string, string>;

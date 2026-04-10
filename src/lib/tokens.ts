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

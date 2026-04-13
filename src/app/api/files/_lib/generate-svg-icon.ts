import type { FileKind } from "@/data/files/models/file.model";

/**
 * SVG markup templates for each non-image FileKind.
 * Each is a 48×48 coloured rectangle with a short label.
 */
const SVG_MARKUP: Record<Exclude<FileKind, "image">, string> = {
  pdf: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="6" fill="#FF6363"/>
  <text x="24" y="30" text-anchor="middle" font-size="13" font-weight="700" font-family="system-ui,sans-serif" fill="white">PDF</text>
</svg>`,
  doc: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="6" fill="#2196F3"/>
  <text x="24" y="30" text-anchor="middle" font-size="13" font-weight="700" font-family="system-ui,sans-serif" fill="white">DOC</text>
</svg>`,
  sheet: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="6" fill="#34A853"/>
  <text x="24" y="30" text-anchor="middle" font-size="11" font-weight="700" font-family="system-ui,sans-serif" fill="white">SHEET</text>
</svg>`,
  video: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="6" fill="#FF9800"/>
  <text x="24" y="30" text-anchor="middle" font-size="13" font-weight="700" font-family="system-ui,sans-serif" fill="white">VID</text>
</svg>`,
  audio: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="6" fill="#9C27B0"/>
  <text x="24" y="30" text-anchor="middle" font-size="13" font-weight="700" font-family="system-ui,sans-serif" fill="white">AUD</text>
</svg>`,
  text: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="6" fill="#6376D5"/>
  <text x="24" y="30" text-anchor="middle" font-size="13" font-weight="700" font-family="system-ui,sans-serif" fill="white">TXT</text>
</svg>`,
  other: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="6" fill="#9E9E9E"/>
  <text x="24" y="30" text-anchor="middle" font-size="11" font-weight="700" font-family="system-ui,sans-serif" fill="white">FILE</text>
</svg>`,
};

/**
 * Generate a data: URL containing an SVG icon for the given FileKind.
 * Returns a base64-encoded data URL suitable for use as an img src.
 * Image kind is not handled here — use a signed Storage URL for images instead.
 */
export function generateSvgIcon(kind: FileKind): string {
  const markup = kind === "image" ? SVG_MARKUP.other : SVG_MARKUP[kind];
  const encoded = Buffer.from(markup).toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

import type { DocumentKind, FileContext } from "@/data/stores/models/store-document.model";

export function inferDocumentKind(mimeType: string): DocumentKind {
  // All files are now kind: "file", with the type stored in context
  return "file";
}

export function inferFileContextType(
  mimeType: string,
): FileContext["type"] {
  const lowerMime = mimeType.toLowerCase();
  if (/^image\//i.test(lowerMime)) return "image";
  if (/^application\/pdf$/i.test(lowerMime)) return "pdf";
  if (
    /^application\/(msword|vnd\.openxmlformats-officedocument\.wordprocessingml)/i.test(
      lowerMime,
    )
  )
    return "doc";
  if (
    /^application\/(vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml|vnd\.oasis\.opendocument\.spreadsheet)|text\/csv$/i.test(
      lowerMime,
    )
  )
    return "csv";
  return "pdf"; // default fallback
}

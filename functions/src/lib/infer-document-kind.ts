export type DocumentKind = "file" | "data" | "node";

export type FileContextType = "image" | "pdf" | "csv" | "doc";

const MIME_MAP: ReadonlyArray<[RegExp, FileContextType]> = [
  [/^image\//i, "image"],
  [/^application\/pdf$/i, "pdf"],
  [
    /^application\/(msword|vnd\.openxmlformats-officedocument\.wordprocessingml)/i,
    "doc",
  ],
  [
    /^application\/(vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml)/i,
    "csv",
  ],
  [/^(application\/vnd\.oasis\.opendocument\.spreadsheet|text\/csv)$/i, "csv"],
  [/^text\//i, "csv"],
];

export function inferFileContextType(mimeType: string): FileContextType {
  for (const [pattern, kind] of MIME_MAP) {
    if (pattern.test(mimeType)) return kind;
  }
  return "pdf"; // default fallback
}

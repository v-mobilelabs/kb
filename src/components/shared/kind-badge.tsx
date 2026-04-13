'use client'

import { fileKindColorMap } from "@/lib/tokens";
import type { FileKind } from "@/data/files/models/file.model";

const KIND_LABELS: Record<FileKind, string> = {
    image: "Image",
    pdf: "PDF",
    doc: "Document",
    sheet: "Spreadsheet",
    video: "Video",
    audio: "Audio",
    text: "Text",
    other: "File",
};

interface KindBadgeProps {
    kind: FileKind;
    className?: string;
}

export function KindBadge({ kind, className = "" }: Readonly<KindBadgeProps>) {
    const colorClass = fileKindColorMap[kind] ?? fileKindColorMap.other;
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass} ${className}`}
        >
            {KIND_LABELS[kind]}
        </span>
    );
}

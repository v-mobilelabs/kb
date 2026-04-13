'use client'

import type { FileKind } from "@/data/files/models/file.model";
import { fileKindColorMap } from "@/lib/tokens";

const ALL_KINDS: Array<{ kind: FileKind; label: string }> = [
    { kind: "image", label: "Images" },
    { kind: "pdf", label: "PDFs" },
    { kind: "doc", label: "Documents" },
    { kind: "sheet", label: "Spreadsheets" },
    { kind: "video", label: "Videos" },
    { kind: "audio", label: "Audio" },
    { kind: "text", label: "Text" },
    { kind: "other", label: "Other" },
];

interface FileKindFilterProps {
    selected: string[]; // selected FileKind values (OR logic)
    onChange: (kinds: string[]) => void;
}

export function FileKindFilter({
    selected,
    onChange,
}: Readonly<FileKindFilterProps>) {
    function toggle(kind: string) {
        if (selected.includes(kind)) {
            onChange(selected.filter((k) => k !== kind));
        } else {
            onChange([...selected, kind]);
        }
    }

    return (
        <div className="flex flex-wrap gap-2">
            {ALL_KINDS.map(({ kind, label }) => {
                const isSelected = selected.includes(kind);
                const colorClass = fileKindColorMap[kind];
                return (
                    <label
                        key={kind}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors select-none
              ${isSelected ? colorClass + " border-transparent" : "border-foreground/10 text-foreground/60 hover:border-foreground/30"}`}
                    >
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggle(kind)}
                            className="sr-only"
                            aria-label={label}
                        />
                        {label}
                    </label>
                );
            })}
            {selected.length > 0 && (
                <button
                    type="button"
                    onClick={() => onChange([])}
                    className="text-xs text-foreground/40 underline hover:text-foreground/60"
                >
                    Clear
                </button>
            )}
        </div>
    );
}

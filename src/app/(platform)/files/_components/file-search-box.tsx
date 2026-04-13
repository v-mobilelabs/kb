'use client'

import { useRef, useCallback } from "react";

interface FileSearchBoxProps {
    value: string;
    onChange: (value: string) => void;
}

export function FileSearchBox({ value, onChange }: Readonly<FileSearchBoxProps>) {
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleChange = useCallback(
        (newValue: string) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => onChange(newValue), 300);
        },
        [onChange],
    );

    return (
        <input
            type="search"
            placeholder="Search files…"
            defaultValue={value}
            onChange={(e) => handleChange(e.target.value)}
            className="flex-1 max-w-xs rounded-lg border border-foreground/10 bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
            aria-label="Search files"
        />
    );
}

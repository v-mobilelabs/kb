'use client'

import { Select, ListBox, ListBoxItem } from "@heroui/react";

type SortKey = "name_asc" | "name_desc" | "createdAt_desc" | "createdAt_asc" | "size_asc" | "size_desc";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
    { key: "createdAt_desc", label: "Date — Newest first" },
    { key: "createdAt_asc", label: "Date — Oldest first" },
    { key: "name_asc", label: "Name — A → Z" },
    { key: "name_desc", label: "Name — Z → A" },
    { key: "size_asc", label: "Size — Smallest first" },
    { key: "size_desc", label: "Size — Largest first" },
];

interface FileSortControlsProps {
    sort: string;
    order: string;
    onChange: (sort: string, order: string) => void;
}

export function FileSortControls({
    sort,
    order,
    onChange,
}: Readonly<FileSortControlsProps>) {
    const currentKey = `${sort}_${order}` as SortKey;

    function handleChange(key: string) {
        const parts = key.split("_");
        const newOrder = parts.at(-1) ?? "desc";
        const newSort = parts.slice(0, -1).join("_");
        onChange(newSort, newOrder);
    }

    return (
        <Select.Root
            value={currentKey}
            onChange={(key) => handleChange(key as string)}
            aria-label="Sort files"
        >
            <Select.Trigger className="min-w-[200px]">
                <Select.Value />
                <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
                <ListBox>
                    {SORT_OPTIONS.map((opt) => (
                        <ListBoxItem key={opt.key} id={opt.key} textValue={opt.label}>
                            {opt.label}
                        </ListBoxItem>
                    ))}
                </ListBox>
            </Select.Popover>
        </Select.Root>
    );
}

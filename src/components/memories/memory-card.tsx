"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import type { Memory } from "@/data/memories/types";
import { MemoryFormModal } from "./memory-form-modal";
import { DeleteMemoryModal } from "./delete-memory-modal";

interface MemoryCardProps {
    memory: Memory;
    orgId: string;
}

function formatDate(d: Date): string {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
        new Date(d),
    );
}

export function MemoryCard({ memory, orgId }: Readonly<MemoryCardProps>) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const truncatedDesc =
        memory.description && memory.description.length > 120
            ? memory.description.slice(0, 120) + "…"
            : memory.description;

    return (
        <>
            <div className="rounded-xl border border-foreground/10 bg-surface p-5 flex flex-col gap-2 hover:border-foreground/20 transition-colors">
                <Link href={`/memories/${memory.id}`} className="block">
                    <h3 className="font-semibold text-xs text-foreground/50 truncate uppercase tracking-wide">
                        Memory
                    </h3>
                    <p className="text-xs text-foreground/40 font-mono truncate mt-1">
                        {memory.id}
                    </p>
                    {truncatedDesc && (
                        <p className="text-sm text-foreground/80 mt-2 line-clamp-2">{truncatedDesc}</p>
                    )}
                    <div className="flex gap-4 mt-3 text-xs text-foreground/50">
                        <span>
                            {memory.documentCount} / {memory.documentCapacity} document
                            {memory.documentCapacity === 1 ? "" : "s"}
                        </span>
                    </div>
                    <p className="text-xs text-foreground/40 mt-1">
                        Created {formatDate(memory.createdAt)}
                    </p>
                </Link>
                <div className="flex gap-2 pt-3 mt-auto border-t border-foreground/10">
                    <Button
                        size="sm"
                        variant="outline"
                        onPress={() => setEditOpen(true)}
                    >
                        Edit
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        onPress={() => setDeleteOpen(true)}
                    >
                        Delete
                    </Button>
                </div>
            </div>

            {editOpen && (
                <MemoryFormModal
                    memory={memory}
                    orgId={orgId}
                    onClose={() => setEditOpen(false)}
                />
            )}

            {deleteOpen && (
                <DeleteMemoryModal
                    memory={memory}
                    orgId={orgId}
                    onClose={() => setDeleteOpen(false)}
                />
            )}
        </>
    );
}

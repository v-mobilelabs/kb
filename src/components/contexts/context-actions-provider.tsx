"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { Context } from "@/data/contexts/models/context.model";

interface ContextActionsState {
    editTarget: Context | null;
    deleteTarget: Context | null;
    openEdit: (ctx: Context) => void;
    openDelete: (ctx: Context) => void;
    closeEdit: () => void;
    closeDelete: () => void;
}

const ContextActionsCtx = createContext<ContextActionsState | null>(null);

export function useContextActions() {
    const ctx = useContext(ContextActionsCtx);
    if (!ctx) throw new Error("useContextActions must be used within ContextActionsProvider");
    return ctx;
}

export function ContextActionsProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [editTarget, setEditTarget] = useState<Context | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Context | null>(null);

    const openEdit = useCallback((ctx: Context) => setEditTarget(ctx), []);
    const openDelete = useCallback((ctx: Context) => setDeleteTarget(ctx), []);
    const closeEdit = useCallback(() => setEditTarget(null), []);
    const closeDelete = useCallback(() => setDeleteTarget(null), []);

    const value = useMemo(
        () => ({ editTarget, deleteTarget, openEdit, openDelete, closeEdit, closeDelete }),
        [editTarget, deleteTarget, openEdit, openDelete, closeEdit, closeDelete],
    );

    return (
        <ContextActionsCtx.Provider value={value}>
            {children}
        </ContextActionsCtx.Provider>
    );
}

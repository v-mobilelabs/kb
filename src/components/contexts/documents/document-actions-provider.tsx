"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ContextDocument } from "@/data/contexts/models/context-document.model";

interface DocumentActionsState {
    editTarget: ContextDocument | null;
    deleteTarget: ContextDocument | null;
    openEdit: (doc: ContextDocument) => void;
    openDelete: (doc: ContextDocument) => void;
    closeEdit: () => void;
    closeDelete: () => void;
}

const DocumentActionsCtx = createContext<DocumentActionsState | null>(null);

export function useDocumentActions() {
    const ctx = useContext(DocumentActionsCtx);
    if (!ctx) throw new Error("useDocumentActions must be within DocumentActionsProvider");
    return ctx;
}

export function DocumentActionsProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [editTarget, setEditTarget] = useState<ContextDocument | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ContextDocument | null>(null);

    const openEdit = useCallback((doc: ContextDocument) => setEditTarget(doc), []);
    const openDelete = useCallback((doc: ContextDocument) => setDeleteTarget(doc), []);
    const closeEdit = useCallback(() => setEditTarget(null), []);
    const closeDelete = useCallback(() => setDeleteTarget(null), []);

    const value = useMemo(
        () => ({ editTarget, deleteTarget, openEdit, openDelete, closeEdit, closeDelete }),
        [editTarget, deleteTarget, openEdit, openDelete, closeEdit, closeDelete],
    );

    return (
        <DocumentActionsCtx.Provider value={value}>
            {children}
        </DocumentActionsCtx.Provider>
    );
}

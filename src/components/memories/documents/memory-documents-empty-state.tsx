"use client";

export function MemoryDocumentsEmptyState() {
    return (
        <div className="text-center py-16 text-foreground/50">
            <p className="text-lg font-medium">No documents yet</p>
            <p className="text-sm mt-1">
                Documents can be added via the API.
            </p>
        </div>
    );
}

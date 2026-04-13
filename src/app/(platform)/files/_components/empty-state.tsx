interface EmptyStateProps {
    hasFilters: boolean;
}

export function EmptyState({ hasFilters }: Readonly<EmptyStateProps>) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-default-100">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="size-8 text-default-400"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                </svg>
            </div>
            {hasFilters ? (
                <>
                    <p className="text-base font-medium text-foreground">No files match your filters.</p>
                    <p className="text-sm text-default-400">Try adjusting your search or filter criteria.</p>
                </>
            ) : (
                <>
                    <p className="text-base font-medium text-foreground">No files yet.</p>
                    <p className="text-sm text-default-400">
                        Upload your first file via the API to get started.
                    </p>
                    <code className="mt-1 rounded bg-default-100 px-3 py-1.5 text-xs text-default-600">
                        POST /api/files
                    </code>
                </>
            )}
        </div>
    );
}

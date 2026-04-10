'use client'

import { Button } from '@heroui/react'

export default function PlatformError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-foreground/60 max-w-xs">
                {error.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <Button onPress={reset} variant="secondary">Try again</Button>
        </div>
    )
}

'use client'

import { Button } from '@heroui/react'

export default function AuthError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-foreground/60 max-w-xs">
                {error.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <Button onPress={reset} variant="secondary">Try again</Button>
        </div>
    )
}

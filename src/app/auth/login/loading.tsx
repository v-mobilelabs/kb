export default function LoginLoading() {
    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-surface rounded-xl p-8 flex flex-col gap-4 animate-pulse">
                {/* Title */}
                <div className="h-6 bg-foreground/10 rounded-md w-3/4 mx-auto" />
                {/* Subtitle */}
                <div className="h-4 bg-foreground/10 rounded-md w-5/6 mx-auto" />
                {/* Input */}
                <div className="h-12 bg-foreground/10 rounded-lg w-full" />
                {/* Button */}
                <div className="h-10 bg-foreground/10 rounded-lg w-full" />
            </div>
        </main>
    )
}

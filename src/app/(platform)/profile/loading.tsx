export default function ProfileLoading() {
    return (
        <div className="flex flex-col gap-8 animate-pulse">
            {/* Title */}
            <div className="h-8 bg-foreground/10 rounded-md w-32" />
            {/* Name section */}
            <div className="flex flex-col gap-4">
                <div className="h-5 bg-foreground/10 rounded-md w-36" />
                <div className="h-12 bg-foreground/10 rounded-lg w-full" />
                <div className="h-9 bg-foreground/10 rounded-lg w-28" />
            </div>
            {/* Danger zone */}
            <div className="border-t border-foreground/10 pt-6 flex flex-col gap-4">
                <div className="h-5 bg-foreground/10 rounded-md w-28" />
                <div className="h-4 bg-foreground/10 rounded-md w-full" />
                <div className="h-9 bg-foreground/10 rounded-lg w-36" />
            </div>
        </div>
    )
}

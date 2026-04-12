'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button, Avatar } from '@heroui/react'
import { ReusableConfirmModal } from '@/components/shared/reusable-confirm-modal'

interface PlatformNavProps {
    displayName: string
}

const navLinks = [
    {
        href: '/dashboard',
        label: 'Dashboard',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        href: '/query',
        label: 'Query',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
    },
    {
        href: '/stores',
        label: 'Stores',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
        ),
    },
    {
        href: '/memories',
        label: 'Memories',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
        ),
    },
    {
        href: '/profile',
        label: 'Profile',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
    {
        href: '/settings',
        label: 'Settings',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
]

function getInitials(name: string): string {
    if (!name || typeof name !== 'string') return '?'
    const trimmed = name.trim()
    if (!trimmed) return '?'
    const parts = trimmed.split(/\s+/)
    if (parts.length >= 2) {
        const first = parts[0]?.at(0) ?? ''
        const last = parts.at(-1)?.at(0) ?? ''
        return (first + last).toUpperCase() || '?'
    }
    return trimmed.substring(0, 2).toUpperCase()
}

export function PlatformNav({ displayName }: Readonly<PlatformNavProps>) {
    const pathname = usePathname()
    const router = useRouter()
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const initials = getInitials(displayName)

    async function handleSignOut() {
        setIsPending(true)
        await fetch('/api/auth/signout', { method: 'POST' })
        router.push('/login')
    }

    const sidebarContent = (
        <>
            {/* Logo */}
            <div className="px-5 py-5 border-b border-foreground/10">
                <span className="font-bold text-accent tracking-tight">CosmoOps</span>
                <span className="block text-[10px] text-foreground/40 mt-0.5 uppercase tracking-widest">Knowledge Base</span>
            </div>

            {/* Nav links */}
            <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4">
                {navLinks.map(link => {
                    const active = link.href === '/stores' || link.href === '/memories'
                        ? pathname.startsWith(link.href)
                        : pathname === link.href
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${active
                                ? 'bg-accent/10 text-accent font-medium'
                                : 'text-foreground/65 hover:text-foreground hover:bg-foreground/5'
                                }`}
                        >
                            {link.icon}
                            {link.label}
                        </Link>
                    )
                })}
            </nav>

            {/* User + sign out */}
            <div className="px-4 py-4 border-t border-foreground/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar size='sm'>
                        <Avatar.Fallback className="border-none bg-linear-to-br from-pink-500 to-purple-500 text-white text-sm font-semibold">
                            {initials}
                        </Avatar.Fallback>
                    </Avatar>
                    <span className="text-xs truncate text-foreground">{displayName}</span>
                </div>
                <Button
                    isIconOnly
                    variant="ghost"
                    size="sm"
                    onPress={() => { setSidebarOpen(false); setConfirmOpen(true) }}
                    className="shrink-0"
                    aria-label="Sign out"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </Button>
            </div>
        </>
    )

    return (
        <>
            {/* Mobile top bar — hidden on md+ */}
            <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center gap-3 px-4 border-b border-foreground/10 bg-surface">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-1.5 rounded-md text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
                    aria-label="Open navigation"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <span className="font-bold text-accent tracking-tight text-sm">CosmoOps</span>
            </div>

            {/* Mobile backdrop */}
            {sidebarOpen && (
                <button
                    className="md:hidden fixed inset-0 z-40 bg-black/40"
                    onClick={() => setSidebarOpen(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setSidebarOpen(false)
                    }}
                    aria-label="Close navigation"
                />
            )}

            {/* Sidebar — drawer on mobile, sticky on md+ */}
            <aside className={`
                fixed md:sticky top-0 z-50 md:z-auto
                w-56 shrink-0 flex flex-col
                border-r border-foreground/10 bg-surface
                h-screen
                transition-transform duration-200 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
            `}>
                {sidebarContent}
            </aside>

            <ReusableConfirmModal
                isOpen={confirmOpen}
                title="Sign out?"
                message="You will be signed out of your account."
                confirmLabel="Sign out"
                onConfirm={handleSignOut}
                onDismiss={() => setConfirmOpen(false)}
                isPending={isPending}
            />
        </>
    )
}
